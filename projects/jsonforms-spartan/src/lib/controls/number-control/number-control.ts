import { Component, computed } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { isIntegerControl, isNumberControl, or, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmFieldImports } from '../../ui/field/src';
import { HlmInput } from '../../ui/input/src';

/** A numeric input for `number` and `integer` properties. Clearing it removes the property. */
@Component({
  selector: 'jfs-number-control',
  imports: [FormField, HlmFieldImports, HlmInput],
  template: `
    @if (control.field(); as field) {
      <div hlmField [attr.data-disabled]="control.enabled() ? null : 'true'">
        <label hlmFieldLabel [for]="control.id" [class.sr-only]="!control.showLabel()">
          {{ control.label() }}
          @if (control.required()) {
            <span aria-hidden="true">*</span>
          }
        </label>
        <input
          hlmInput
          type="number"
          inputmode="decimal"
          [id]="control.id"
          [formField]="field"
          [attr.step]="step()"
          [attr.aria-required]="control.required() ? 'true' : null"
        />
        @if (control.description()) {
          <p hlmFieldDescription>{{ control.description() }}</p>
        }
        <hlm-field-error>
          @for (error of field().errors(); track $index) {
            <span class="block">{{ error.message }}</span>
          }
        </hlm-field-error>
      </div>
    }
  `,
})
export class NumberControlRenderer {
  protected readonly control = injectJfControl<number | null>();
  /** Integers step by 1; numbers accept any decimal, unless the schema says `multipleOf`. */
  protected readonly step = computed(() => {
    const { type, multipleOf } = this.control.schema();
    return multipleOf ?? (type === 'integer' ? 1 : 'any');
  });
}

export const numberControlTester = rankWith(1, or(isNumberControl, isIntegerControl));
