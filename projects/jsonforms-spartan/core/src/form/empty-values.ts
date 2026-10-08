import { Resolve, type JsonSchema } from '@jsonforms/core';

// ADR-0003. Signal Forms only creates a field for a property whose value is not `undefined`, and a native
// text input bound to `null` never writes back. So the form model holds every property declared in the
// schema, with a placeholder that its control can edit, while the data seen by validation and by the app
// follows the JSON Forms convention: an empty value is an absent property.

type JsonObject = Record<string, unknown>;

export function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns a copy of `data` in which every property declared in `schema` exists, recursively for nested
 * objects and for the object items of existing arrays. Absent properties get a placeholder: `''` for
 * strings, `null` for other primitives. Absent arrays and values that are present are left as they are.
 */
export function materialize(
  schema: JsonSchema,
  data: unknown,
  rootSchema: JsonSchema = schema,
): unknown {
  return fill(schema, data, rootSchema, new Set());
}

function fill(
  schema: JsonSchema,
  value: unknown,
  rootSchema: JsonSchema,
  ancestors: ReadonlySet<JsonSchema>,
): unknown {
  const resolved = resolve(schema, rootSchema);
  if (Array.isArray(value)) {
    const items = resolved.items;
    if (items === undefined || Array.isArray(items)) {
      return value;
    }
    return value.map((item) =>
      isPlainObject(item) ? fill(items, item, rootSchema, ancestors) : item,
    );
  }
  if (!isObjectSchema(resolved)) {
    return value === undefined ? placeholderFor(resolved) : value;
  }
  if (value !== undefined && value !== null && !isPlainObject(value)) {
    return value; // Wrong type: keep it, and let validation report it.
  }
  if (!isPlainObject(value) && ancestors.has(resolved)) {
    return undefined; // Recursive schema: create the next level only once it has data.
  }
  const nextAncestors = new Set(ancestors).add(resolved);
  const result: JsonObject = { ...(value as JsonObject | null | undefined) };
  for (const [key, child] of Object.entries(resolved.properties ?? {})) {
    const filled = fill(child, result[key], rootSchema, nextAncestors);
    if (filled !== undefined) {
      result[key] = filled;
    }
  }
  return result;
}

/**
 * Returns a copy of `value` without empty object properties: `''`, `null`, `undefined`, and objects that
 * are empty once pruned. Array items are kept (their nested objects are pruned), and the root is never
 * removed.
 */
export function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (isPlainObject(item) ? prune(item) : item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    const pruned = prune(child);
    if (!isEmpty(pruned)) {
      result[key] = pruned;
    }
  }
  return result;
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (isPlainObject(value) && Object.keys(value).length === 0)
  );
}

/** Structural equality for JSON values. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, i) => jsonEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && jsonEqual(a[key], b[key]))
    );
  }
  return false;
}

function resolve(schema: JsonSchema, rootSchema: JsonSchema): JsonSchema {
  let current = schema;
  const seen = new Set<string>();
  while (current.$ref !== undefined && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    const target = Resolve.schema(rootSchema, current.$ref, rootSchema);
    if (target === undefined) {
      break;
    }
    current = target;
  }
  return current;
}

function primaryType(schema: JsonSchema): string | undefined {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  return types.find((type) => type !== undefined && type !== 'null');
}

function isObjectSchema(schema: JsonSchema): boolean {
  const type = primaryType(schema);
  return type === 'object' || (type === undefined && schema.properties !== undefined);
}

function placeholderFor(schema: JsonSchema): unknown {
  switch (primaryType(schema)) {
    case 'string':
      return '';
    case 'array':
      return undefined; // Arrays are handled by the array renderers (M4).
    case undefined: {
      // Untyped enum or oneOf of consts: follow the type of the first option.
      const first = schema.enum?.[0] ?? schema.oneOf?.[0]?.const ?? schema.const;
      return typeof first === 'string' ? '' : null;
    }
    default:
      return null;
  }
}
