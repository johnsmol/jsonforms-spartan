import { Component, computed } from '@angular/core';
import { and, isEnumControl, isOneOfEnumControl, not, optionIs, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmFieldImports } from '../../ui/field/src';
import { HlmNativeSelectImports } from '../../ui/native-select/src';
import { JfsEnumA11y } from '../enum-a11y';
import { enumOptions, enumPlaceholder } from '../enum-options';

/**
 * A native select for `enum` and `oneOf` enum properties. Options are matched by index, so values of
 * any JSON type round-trip. The first, empty option clears the property.
 */
@Component({
  selector: 'jfs-enum-control',
  imports: [HlmFieldImports, HlmNativeSelectImports, JfsEnumA11y],
  template: `
    @if (control.field(); as field) {
      <div
        hlmField
        [jfsEnumA11y]="control.readonly()"
        [invalid]="invalid()"
        [describedBy]="describedBy()"
        [attr.data-disabled]="control.enabled() ? null : 'true'"
      >
        <label hlmFieldLabel [for]="control.id" [class.sr-only]="!control.showLabel()">
          {{ control.label() }}
          @if (control.required()) {
            <span aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          }
        </label>
        <hlm-native-select
          [selectId]="control.id"
          [value]="selected()"
          [disabled]="!control.enabled()"
          [forceInvalid]="invalid()"
          (valueChange)="choose($event)"
          (focusout)="field().markAsTouched()"
        >
          <option value=""></option>
          @for (option of options(); track $index) {
            <option hlmNativeSelectOption [value]="'' + $index">{{ option.label }}</option>
          }
        </hlm-native-select>
        @if (control.description()) {
          <p hlmFieldDescription [id]="control.id + '-description'">{{ control.description() }}</p>
        }
        <hlm-field-error [id]="control.id + '-error'" [forceShow]="invalid()">
          @for (error of field().errors(); track $index) {
            <span class="block">{{ error.message }}</span>
          }
        </hlm-field-error>
      </div>
    }
  `,
})
export class EnumControlRenderer {
  protected readonly control = injectJfControl<unknown>();
  protected readonly options = computed(() => enumOptions(this.control.schema()));
  /** The index of the chosen option, or `''` for none. */
  protected readonly selected = computed(() => {
    const value = this.control.field()?.().value();
    const index = this.options().findIndex((option) => option.value === value);
    return index < 0 ? '' : String(index);
  });
  /** Errors show once the control is touched, and submitting touches every control. */
  protected readonly invalid = computed(() => {
    const state = this.control.field()?.();
    return !!state && state.touched() && state.errors().length > 0;
  });
  protected readonly describedBy = computed(
    () =>
      [
        this.control.description() ? `${this.control.id}-description` : null,
        this.invalid() ? `${this.control.id}-error` : null,
      ]
        .filter(Boolean)
        .join(' ') || null,
  );

  protected choose(index: string | null | undefined): void {
    const state = this.control.field()?.();
    if (!state) return;
    const options = this.options();
    const option = index ? options[Number(index)] : undefined;
    state.value.set(option ? option.value : enumPlaceholder(options));
    state.markAsTouched();
  }
}

export const enumControlTester = rankWith(2, and(isEnumControl, not(optionIs('format', 'radio'))));
export const oneOfEnumControlTester = rankWith(
  5,
  and(isOneOfEnumControl, not(optionIs('format', 'radio'))),
);
