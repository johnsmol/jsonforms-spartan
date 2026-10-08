import { Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { isStringControl, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmFieldImports } from '../../ui/field/src';
import { HlmInput } from '../../ui/input/src';

/** A single-line text input for string properties. */
@Component({
  selector: 'jfs-text-control',
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
          [id]="control.id"
          [formField]="field"
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
export class TextControlRenderer {
  protected readonly control = injectJfControl<string>();
}

export const textControlTester = rankWith(1, isStringControl);
