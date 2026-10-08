import {
  Component,
  computed,
  createEnvironmentInjector,
  DestroyRef,
  effect,
  EnvironmentInjector,
  inject,
  input,
  linkedSignal,
  model,
  untracked,
  type InputSignal,
  type Signal,
} from '@angular/core';
import {
  form,
  submit as submitForm,
  validateStandardSchema,
  type FieldTree,
} from '@angular/forms/signals';
import { createAjv, Generate, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import type { JfRendererEntry } from '../registry';
import { createAjvStandardSchema, type JfAjv } from './ajv-standard-schema';
import { jsonEqual, materialize, prune } from './empty-values';

/**
 * Hosts a JSON Forms form. The data is a two-way bound signal; validation comes from the JSON Schema
 * through AJV.
 *
 * ```html
 * <jf-form #jf="jfForm" [schema]="schema" [renderers]="renderers" [(data)]="data" />
 * ```
 */
@Component({
  selector: 'jf-form',
  exportAs: 'jfForm',
  template: '',
})
export class JfForm {
  /** The JSON Schema. When omitted, one is generated from the initial data. */
  readonly schema = input<JsonSchema>();
  /** The UI schema. When omitted, a vertical layout of all properties is generated. */
  readonly uischema = input<UISchemaElement>();
  /** The renderers to choose from, by tester rank. */
  readonly renderers = input<readonly JfRendererEntry[]>([]);
  /** A custom AJV instance, for example with extra formats. Defaults to `createAjv()` from JSON Forms. */
  readonly ajv: InputSignal<JfAjv | undefined> = input<JfAjv>();
  /** The form data. Empty values are absent properties (ADR-0003). */
  readonly data = model<unknown>({});

  /** The schema in use: the `schema` input, or one generated from the initial data. */
  readonly resolvedSchema: Signal<JsonSchema> = computed(
    () => this.schema() ?? Generate.jsonSchema((untracked(this.data) ?? {}) as object),
  );
  /** The UI schema in use: the `uischema` input, or the generated default. */
  readonly resolvedUischema: Signal<UISchemaElement> = computed(
    () => this.uischema() ?? Generate.uiSchema(this.resolvedSchema()),
  );

  // The form model has every schema property in place (ADR-0003). It is rebuilt when the schema
  // changes or when new data arrives from outside, but not when `data` is just our own update echoed back.
  private readonly formModel = linkedSignal<{ schema: JsonSchema; data: unknown }, unknown>({
    source: () => ({ schema: this.resolvedSchema(), data: this.data() }),
    computation: (source, previous) =>
      previous !== undefined &&
      previous.source.schema === source.schema &&
      jsonEqual(prune(previous.value), source.data)
        ? previous.value
        : materialize(source.schema, source.data),
  });

  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly defaultAjv = createAjv();
  private formInjector?: EnvironmentInjector;

  /** The Signal Forms field tree of the whole form. Rebuilt when the schema or the AJV instance changes. */
  readonly form: Signal<FieldTree<unknown>> = computed(() => {
    const validator = createAjvStandardSchema(this.resolvedSchema(), this.ajv() ?? this.defaultAjv);
    return untracked(() => {
      this.formInjector?.destroy();
      this.formInjector = createEnvironmentInjector([], this.parentInjector);
      return form(
        this.formModel,
        (root) =>
          validateStandardSchema(root, validator as Parameters<typeof validateStandardSchema>[1]),
        { injector: this.formInjector },
      );
    });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.formInjector?.destroy());
    effect(() => {
      const data = prune(this.formModel());
      if (!jsonEqual(data, untracked(this.data))) {
        this.data.set(data);
      }
    });
  }

  /**
   * Marks every field as touched and, if the form is valid, calls `action` with the data.
   * Resolves to `true` when the action ran.
   */
  submit(action: (data: unknown) => unknown): Promise<boolean> {
    return submitForm(this.form(), async () => {
      await action(prune(this.formModel()));
      return undefined;
    });
  }
}
