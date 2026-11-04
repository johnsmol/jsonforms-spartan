import { Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { and, isStringControl, optionIs, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmFieldImports } from '../../ui/field/src';
import { HlmTextarea } from '../../ui/textarea/src';

/** A multi-line text area for string properties with `options.multi`. */
@Component({
  selector: 'jfs-multiline-control',
  imports: [FormField, HlmFieldImports, HlmTextarea],
  template: `
    @if (control.field(); as field) {
      <div hlmField [attr.data-disabled]="control.enabled() ? null : 'true'">
        <label hlmFieldLabel [for]="control.id" [class.sr-only]="!control.showLabel()">
          {{ control.label() }}
          @if (control.required()) {
            <span aria-hidden="true">*</span>
          }
        </label>
        <textarea
          hlmTextarea
          [id]="control.id"
          [formField]="field"
          [attr.aria-required]="control.required() ? 'true' : null"
        ></textarea>
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
export class MultilineControlRenderer {
  protected readonly control = injectJfControl<string>();
}

export const multilineControlTester = rankWith(2, and(isStringControl, optionIs('multi', true)));
