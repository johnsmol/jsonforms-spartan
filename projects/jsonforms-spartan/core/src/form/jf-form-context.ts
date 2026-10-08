import type { Signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import type { JsonSchema } from '@jsonforms/core';
import type { JfRendererEntry } from '../registry';
import type { JfAjv } from './ajv-standard-schema';

/** What `<jf-form>` shares with the dispatchers and renderers inside it. */
export abstract class JfFormContext {
  /** The root JSON Schema. */
  abstract readonly rootSchema: Signal<JsonSchema>;
  /** The renderers to choose from. */
  abstract readonly renderers: Signal<readonly JfRendererEntry[]>;
  /** The field tree of the whole form. */
  abstract readonly form: Signal<FieldTree<unknown>>;
  /** The current data, with empty values removed (ADR-0003). Rules are evaluated against it. */
  abstract readonly value: Signal<unknown>;
  /** The AJV instance used for validation and rule conditions. */
  abstract readonly ajvInstance: Signal<JfAjv>;
}
