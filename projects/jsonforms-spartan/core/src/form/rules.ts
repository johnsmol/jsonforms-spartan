import type { Signal } from '@angular/core';
import { disabled, type SchemaPathTree } from '@angular/forms/signals';
import {
  isControl,
  isEnabled,
  toDataPathSegments,
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
