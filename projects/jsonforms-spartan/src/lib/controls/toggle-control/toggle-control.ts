import { Component, computed } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { and, isBooleanControl, optionIs, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmSwitch } from '../../ui/switch/src';
import { JfsToggleA11y } from '../toggle-a11y';
import { HlmFieldImports } from '../../ui/field/src';

/** A switch for boolean properties with `options.toggle`. An untouched switch leaves the property absent. */
@Component({
  selector: 'jfs-toggle-control',
  imports: [FormField, HlmFieldImports, HlmSwitch, JfsToggleA11y],
  template: `
    @if (control.field(); as field) {
      <div
        hlmField
        orientation="horizontal"
        [jfsToggleA11y]="control.readonly()"
        [invalid]="invalid()"
        [attr.data-disabled]="control.enabled() ? null : 'true'"
      >
        <hlm-switch
          [inputId]="control.id"
          [formField]="field"
          [aria-describedby]="describedBy()"
          [forceInvalid]="invalid()"
        />
        <div hlmFieldContent>
          <label hlmFieldLabel [for]="control.id" [class.sr-only]="!control.showLabel()">
            {{ control.label() }}
            @if (control.required()) {
              <span aria-hidden="true">*</span>
              <span class="sr-only">(required)</span>
            }
          </label>
          @if (control.description()) {
            <p hlmFieldDescription [id]="control.id + '-description'">
              {{ control.description() }}
            </p>
          }
          <hlm-field-error [id]="control.id + '-error'">
            @for (error of field().errors(); track $index) {
              <span class="block">{{ error.message }}</span>
            }
          </hlm-field-error>
        </div>
      </div>
    }
  `,
})
export class ToggleControlRenderer {
  protected readonly control = injectJfControl<boolean | null>();
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
}

export const toggleControlTester = rankWith(3, and(isBooleanControl, optionIs('toggle', true)));
