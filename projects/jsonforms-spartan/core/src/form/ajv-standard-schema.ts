import { createAjv, decode, type JsonSchema } from '@jsonforms/core';
import { isPlainObject, prune } from './empty-values';

/** The AJV instance type used by `@jsonforms/core`. */
export type JfAjv = ReturnType<typeof createAjv>;
type AjvError = NonNullable<ReturnType<JfAjv['compile']>['errors']>[number];

/** A Standard Schema v1 issue (https://standardschema.dev), declared here to avoid a dependency. */
export interface JfSchemaIssue {
  readonly message: string;
  readonly path?: readonly PropertyKey[];
  /** The AJV error the issue was created from. */
  readonly error?: AjvError;
}

/** The subset of Standard Schema v1 that `validateStandardSchema` needs. */
export interface JfStandardSchema {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      | { readonly value: unknown; readonly issues?: undefined }
      | { readonly issues: readonly JfSchemaIssue[] };
  };
}

const compiled = new WeakMap<JfAjv, WeakMap<JsonSchema, ReturnType<JfAjv['compile']>>>();

function compile(ajv: JfAjv, schema: JsonSchema) {
  let bySchema = compiled.get(ajv);
  if (!bySchema) {
    bySchema = new WeakMap();
    compiled.set(ajv, bySchema);
  }
  let validate = bySchema.get(schema);
  if (!validate) {
    validate = ajv.compile(schema);
    bySchema.set(schema, validate);
  }
  return validate;
}

/**
 * Wraps AJV as a Standard Schema so Signal Forms can route each error to the field at its path
 * (ADR-0001). The form model is pruned before validation, so `required` sees empty values as missing
 * (ADR-0003).
 */
export function createAjvStandardSchema(
  schema: JsonSchema,
  ajv: JfAjv = createAjv(),
): JfStandardSchema {
  const validate = compile(ajv, schema);
  return {
    '~standard': {
      version: 1,
      vendor: 'jsonforms-spartan',
      validate(model) {
        const data = prune(model);
        if (validate(data)) {
          return { value: data };
        }
        return { issues: toIssues(validate.errors ?? [], model) };
      },
    },
  };
}

/**
 * Maps AJV errors to Standard Schema issues whose path points at an existing field of `model`.
 *
 * - `required` and `dependencies` errors move to the missing child property, as in JSON Forms.
 * - Errors from inside `oneOf` / `anyOf` branches are dropped. The combinator's own error stays, so the
 *   form is still invalid.
 * - A path that leaves the model (for example a property not declared in the schema) is shortened to
 *   the deepest existing field, because Signal Forms cannot route to a field that doesn't exist.
 */
export function toIssues(errors: readonly AjvError[], model: unknown): JfSchemaIssue[] {
  return errors
    .filter((error) => !isInsideCombinatorBranch(error))
    .map((error) => ({
      message: error.message ?? error.keyword,
      path: existingPath(model, errorPath(error)),
      error,
    }));
}

function errorPath(error: AjvError): string[] {
  const segments =
    error.instancePath === '' ? [] : error.instancePath.split('/').slice(1).map(decode);
  const missing = (error.params as { missingProperty?: unknown }).missingProperty;
  if (
    (error.keyword === 'required' || error.keyword === 'dependencies') &&
    typeof missing === 'string'
  ) {
    segments.push(missing);
  }
  return segments;
}

function existingPath(model: unknown, segments: readonly string[]): PropertyKey[] {
  const path: PropertyKey[] = [];
  let current = model;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || current[index] === undefined) {
        break;
      }
      path.push(index);
      current = current[index];
    } else if (isPlainObject(current) && current[segment] !== undefined) {
      path.push(segment);
      current = current[segment];
    } else {
      break;
    }
  }
  return path;
}

function isInsideCombinatorBranch(error: AjvError): boolean {
  return /\/(?:oneOf|anyOf)\/\d+\//.test(error.schemaPath);
}
