import { computed, inject, type Signal } from '@angular/core';
import type { JsonSchema, Layout, UISchemaElement } from '@jsonforms/core';
import { JfDispatch } from '../dispatch/jf-dispatch';

/** The state of a layout, as signals. Returned by `injectJfLayout()`. */
export interface JfLayout {
  /** The layout's UI schema element. */
  readonly uischema: Signal<Layout>;
  /** The child elements, to render with `<jf-dispatch>`. */
  readonly elements: Signal<readonly UISchemaElement[]>;
  /** The schema to pass on to the children's `<jf-dispatch>`. */
  readonly schema: Signal<JsonSchema>;
  /** The data path to pass on to the children's `<jf-dispatch>`. */
  readonly path: Signal<string>;
  /** The layout's label, for example a Group's legend. */
  readonly label: Signal<string | undefined>;
  /** `false` when a DISABLE/ENABLE rule on the layout or an enclosing layout disables it. */
  readonly enabled: Signal<boolean>;
}

/**
 * Gives a layout renderer its state. Call it in the renderer's injection context:
 *
 * ```ts
 * protected readonly layout = injectJfLayout();
 * ```
 */
export function injectJfLayout(): JfLayout {
  const dispatch = inject(JfDispatch);
  const uischema = computed(() => dispatch.uischema() as Layout);
  return {
    uischema,
    elements: computed(() => uischema().elements ?? []),
    schema: dispatch.schema,
    path: dispatch.path,
    label: computed(() => (uischema() as Layout & { label?: string }).label),
    enabled: dispatch.enabled,
  };
}
