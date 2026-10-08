import { computed, inject, type Signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import {
  composePaths,
  createLabelDescriptionFrom,
  decode,
  Resolve,
  toDataPath,
  type ControlElement,
  type JsonSchema,
} from '@jsonforms/core';
import { JfDispatch } from '../dispatch/jf-dispatch';

let nextId = 0;

/** The state of a control, as signals. Returned by `injectJfControl()`. */
export interface JfControl<T> {
  /** The control's UI schema element. */
  readonly uischema: Signal<ControlElement>;
  /** The schema of the controlled value (the control's scope resolved). */
  readonly schema: Signal<JsonSchema>;
  /** The data path, in JSON Forms dot notation (`address.city`). */
  readonly path: Signal<string>;
  /**
   * The Signal Forms field to bind with `[formField]`. `undefined` only when the data has no field at
   * this path, for example an absent array.
   */
  readonly field: Signal<FieldTree<T> | undefined>;
  /** A unique element id for the input, to connect it with its label. */
  readonly id: string;
  /** The label text, from the UI schema, the schema `title`, or the property name. */
  readonly label: Signal<string>;
  /** `false` when the UI schema hides the label (`label: false`). Keep it for assistive technology. */
  readonly showLabel: Signal<boolean>;
  /** The schema `description`, for help text. */
  readonly description: Signal<string | undefined>;
  /** Whether the enclosing object schema lists the property as required. */
  readonly required: Signal<boolean>;
  /** `false` when a DISABLE/ENABLE rule on the control or an enclosing layout disables it. */
  readonly enabled: Signal<boolean>;
}

/**
 * Gives a control renderer its state. Call it in the renderer's injection context:
 *
 * ```ts
 * protected readonly control = injectJfControl<string>();
 * ```
 */
export function injectJfControl<T = unknown>(): JfControl<T> {
  const dispatch = inject(JfDispatch);
  const form = dispatch.form;

  const uischema = computed(() => dispatch.uischema() as ControlElement);
  const schema = computed(
    () => Resolve.schema(dispatch.schema(), uischema().scope, form.rootSchema()) ?? {},
  );
  const path = computed(() => composePaths(dispatch.path(), toDataPath(uischema().scope)));
  const field = computed(() => fieldAt<T>(form.form(), path()));
  const labelDescription = computed(() => createLabelDescriptionFrom(uischema(), schema()));

  return {
    uischema,
    schema,
    path,
    field,
    id: `jf-control-${++nextId}`,
    label: computed(() => labelDescription().text ?? ''),
    showLabel: computed(() => labelDescription().show ?? true),
    description: computed(() => schema().description),
    required: computed(() => isRequired(dispatch.schema(), uischema().scope, form.rootSchema())),
    enabled: computed(() => {
      const state = field();
      return state ? !state().disabled() : dispatch.enabled();
    }),
  };
}

function fieldAt<T>(root: FieldTree<unknown>, path: string): FieldTree<T> | undefined {
  let current: unknown = root;
  for (const segment of path === '' ? [] : path.split('.')) {
    current = (current as Record<string, unknown> | undefined)?.[segment];
  }
  return current as FieldTree<T> | undefined;
}

// As in @jsonforms/core, which doesn't export it: the parent object schema lists the property as required.
function isRequired(schema: JsonSchema, scope: string, rootSchema: JsonSchema): boolean {
  const segments = scope.split('/');
  const property = decode(segments[segments.length - 1]);
  const parent = Resolve.schema(schema, segments.slice(0, -2).join('/'), rootSchema);
  return parent?.required?.includes(property) ?? false;
}
