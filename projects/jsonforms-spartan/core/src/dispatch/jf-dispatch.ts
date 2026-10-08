import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input, type Signal, type Type } from '@angular/core';
import { isEnabled, isVisible, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfFormContext } from '../form/jf-form-context';
import { findRenderer } from '../registry';

/**
 * Renders a UI schema element with the renderer whose tester ranks highest. Layout renderers use it for
 * their children:
 *
 * ```html
 * @for (element of layout.elements(); track $index) {
 *   <jf-dispatch [uischema]="element" [schema]="layout.schema()" [path]="layout.path()" />
 * }
 * ```
 *
 * An element hidden by a HIDE/SHOW rule isn't rendered at all.
 */
@Component({
  selector: 'jf-dispatch',
  imports: [NgComponentOutlet],
  host: { style: 'display: contents' },
  template: `
    @if (visible()) {
      @if (renderer(); as renderer) {
        <ng-container *ngComponentOutlet="renderer" />
      } @else {
        <p>No applicable renderer found.</p>
      }
    }
  `,
})
export class JfDispatch {
  /** The UI schema element to render. */
  readonly uischema = input.required<UISchemaElement>();
  /** The schema that the element's scope is resolved against. */
  readonly schema = input.required<JsonSchema>();
  /** The data path of the enclosing object, in JSON Forms dot notation (`''` at the root). */
  readonly path = input('');

  /** The form this element belongs to. */
  readonly form = inject(JfFormContext);
  private readonly parent = inject(JfDispatch, { skipSelf: true, optional: true });

  /** Whether the element's own rules show it. Hidden elements aren't rendered. */
  readonly visible: Signal<boolean> = computed(() =>
    isVisible(this.uischema(), this.form.value(), this.path(), this.form.ajvInstance(), undefined),
  );

  /** Whether the element and every enclosing layout are enabled by their rules. */
  readonly enabled: Signal<boolean> = computed(
    () =>
      (this.parent?.enabled() ?? true) &&
      isEnabled(
        this.uischema(),
        this.form.value(),
        this.path(),
        this.form.ajvInstance(),
        undefined,
      ),
  );

  protected readonly renderer: Signal<Type<unknown> | undefined> = computed(() =>
    findRenderer(this.form.renderers(), this.uischema(), this.schema(), {
      rootSchema: this.form.rootSchema(),
      config: {},
    }),
  );
}
