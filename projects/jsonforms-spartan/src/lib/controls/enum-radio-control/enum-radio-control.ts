import { Component, computed } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { and, isEnumControl, isOneOfEnumControl, optionIs, or, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmFieldImports } from '../../ui/field/src';
import { HlmLabel } from '../../ui/label/src';
import { HlmRadioGroupImports } from '../../ui/radio-group/src';
import { JfsEnumA11y } from '../enum-a11y';
import { enumOptions } from '../enum-options';

/** A radio group for `enum` and `oneOf` enum properties with `options.format: 'radio'`. */
@Component({
  selector: 'jfs-enum-radio-control',
  imports: [FormField, HlmFieldImports, HlmLabel, HlmRadioGroupImports, JfsEnumA11y],
  template: `
    @if (control.field(); as field) {
      <div
        hlmField
        [jfsEnumA11y]="control.readonly()"
        [invalid]="invalid()"
        [describedBy]="describedBy()"
        [attr.data-disabled]="control.enabled() ? null : 'true'"
      >
        <span hlmFieldLabel [id]="control.id + '-label'" [class.sr-only]="!control.showLabel()">
          {{ control.label() }}
          @if (control.required()) {
            <span aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          }
        </span>
        <hlm-radio-group [formField]="field" [attr.aria-labelledby]="control.id + '-label'">
          @for (option of options(); track $index) {
            <label hlmLabel class="flex items-center gap-x-3" [for]="control.id + '-' + $index">
              <hlm-radio [value]="option.value" [inputId]="control.id + '-' + $index"
                ><hlm-radio-indicator indicator
              /></hlm-radio>
              {{ option.label }}
            </label>
          }
        </hlm-radio-group>
        @if (control.description()) {
          <p hlmFieldDescription [id]="control.id + '-description'">{{ control.description() }}</p>
        }
        <hlm-field-error [id]="control.id + '-error'">
          @for (error of field().errors(); track $index) {
            <span class="block">{{ error.message }}</span>
          }
        </hlm-field-error>
      </div>
    }
  `,
})
export class EnumRadioControlRenderer {
  protected readonly control = injectJfControl<unknown>();
  protected readonly options = computed(() => enumOptions(this.control.schema()));
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
}

export const enumRadioControlTester = rankWith(
  20,
  and(or(isEnumControl, isOneOfEnumControl), optionIs('format', 'radio')),
);
