import type { Signal } from '@angular/core';
import { disabled, readonly, type SchemaPathTree } from '@angular/forms/signals';
import {
  hasReadonlyRule,
  isControl,
  isEnabled,
  isReadonly,
  Resolve,
  toDataPathSegments,
  type JsonSchema,
  type Layout,
  type UISchemaElement,
} from '@jsonforms/core';
import type { JfAjv } from './ajv-standard-schema';

/**
 * Adds Signal Forms `disabled()` logic for the ENABLE/DISABLE rules in `uischema` (ADR-0001). A control
 * is disabled when its own rule or a rule on any enclosing layout says so. Signal Forms then disables the
 * field and its children, and the bound inputs follow.
 *
 * Covers the root UI schema. UI schemas that renderers create at runtime (array items) are handled by
 * their renderers.
 */
export function applyEnablementRules(
  root: SchemaPathTree<unknown>,
  uischema: UISchemaElement,
  value: Signal<unknown>,
  ajv: Signal<JfAjv>,
): void {
  visit(uischema, []);

  function visit(element: UISchemaElement, enclosing: readonly UISchemaElement[]): void {
    const withRules = element.rule ? [...enclosing, element] : enclosing;
    if (isControl(element)) {
      const target = schemaPathAt(root, toDataPathSegments(element.scope));
      if (target && withRules.length > 0) {
        disabled(target, () =>
          withRules.some((ruled) => !isEnabled(ruled, value(), '', ajv(), undefined)),
        );
      }
      return;
    }
    for (const child of (element as Layout).elements ?? []) {
      visit(child, withRules);
    }
  }
}

function schemaPathAt(
  root: SchemaPathTree<unknown>,
  segments: readonly string[],
): SchemaPathTree<unknown> | undefined {
  let current = root as unknown as Record<string, unknown>;
  for (const segment of segments) {
    current = current[segment] as Record<string, unknown>;
    if (current === undefined) {
      return undefined;
    }
  }
  return current as unknown as SchemaPathTree<unknown>;
}

/**
 * Adds Signal Forms `readonly()` logic to every control in `uischema`. Unlike a disabled field, a
 * read-only one stays focusable and is still submitted. The first of these that applies decides, as in
 * JSON Forms:
 *
 * 1. the form-level `formReadonly` flag: always read-only
 * 2. a READONLY/WRITABLE rule, then `options.readonly`, on the control
 * 3. the schema's `readOnly: true`
 * 4. a rule, then `options.readonly`, on the nearest enclosing layout that has one
 */
export function applyReadonlyRules(
  root: SchemaPathTree<unknown>,
  uischema: UISchemaElement,
  rootSchema: JsonSchema,
  value: Signal<unknown>,
  ajv: Signal<JfAjv>,
  formReadonly: Signal<boolean>,
): void {
  visit(uischema, []);

  function visit(element: UISchemaElement, enclosing: readonly UISchemaElement[]): void {
    if (isControl(element)) {
      const target = schemaPathAt(root, toDataPathSegments(element.scope));
      if (!target) {
        return;
      }
      const schema = Resolve.schema(rootSchema, element.scope, rootSchema) as
        (JsonSchema & { readOnly?: boolean }) | undefined;
      // The element's own verdict first, then the layouts from the innermost outwards.
      const own = decide(element, () => schema?.readOnly === true || undefined);
      const chain = [own, ...[...enclosing].reverse().map((layout) => decide(layout))];
      readonly(target, {
        when: () => {
          if (formReadonly()) {
            return true;
          }
          for (const verdict of chain) {
            const result = verdict();
            if (result !== undefined) {
              return result;
            }
          }
          return false;
        },
      });
      return;
    }
    for (const child of (element as Layout).elements ?? []) {
      visit(child, [...enclosing, element]);
    }
  }

  // `undefined` means "no opinion"; the next level up decides.
  function decide(
    element: UISchemaElement,
    fallback: () => boolean | undefined = () => undefined,
  ): () => boolean | undefined {
    return () => {
      if (hasReadonlyRule(element)) {
        return isReadonly(element, value(), '', ajv(), undefined);
      }
      const options = element.options as { readonly?: unknown; readOnly?: unknown } | undefined;
      for (const flag of [options?.readonly, options?.readOnly]) {
        if (typeof flag === 'boolean') {
          return flag;
        }
      }
      return fallback();
    };
  }
}
