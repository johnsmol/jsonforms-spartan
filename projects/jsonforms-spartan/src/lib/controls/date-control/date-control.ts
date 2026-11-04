import { Component, computed } from '@angular/core';
import { isDateControl, rankWith } from '@jsonforms/core';
import { injectJfControl } from 'jsonforms-spartan/core';
import { HlmButtonImports } from '../../ui/button/src';
import { HlmDatePickerImports } from '../../ui/date-picker/src';
import { HlmFieldImports } from '../../ui/field/src';
import { HlmInput } from '../../ui/input/src';
import { JfsEnumA11y } from '../enum-a11y';
import { formatDateValue, parseDateValue } from './date-value';

const display = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

/**
 * A date picker for `format: date` string properties. The value is a `YYYY-MM-DD` string (see
 * `date-value.ts`). Read-only shows the date in a read-only text input, so assistive technology can
 * announce it.
 */
@Component({
  selector: 'jfs-date-control',
  imports: [HlmFieldImports, HlmDatePickerImports, HlmButtonImports, HlmInput, JfsEnumA11y],
  template: `
    @if (control.field(); as field) {
      <div
        hlmField
        [jfsEnumA11y]="false"
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
        @if (control.readonly()) {
          <input
            hlmInput
            readonly
            [id]="control.id"
            [value]="formatted()"
            [attr.aria-describedby]="describedBy()"
          />
        } @else {
          <hlm-date-picker
            [date]="date()"
            [disabled]="!control.enabled()"
            [autoCloseOnSelect]="true"
            [formatDate]="formatDate"
            (dateChange)="choose($event)"
            (focusout)="touchIfClosed($event)"
          >
            <!-- The expanded button's background is too light for the placeholder colour (axe). -->
            <hlm-date-picker-trigger
              [buttonId]="control.id"
              [forceInvalid]="invalid()"
              class="aria-expanded:data-placeholder:text-foreground"
            >
              Pick a date
            </hlm-date-picker-trigger>
            <div hlmDatePickerFooter class="flex justify-end border-t p-2">
              <button hlmBtn type="button" variant="ghost" size="sm" (click)="choose(null)">
                Clear
              </button>
            </div>
          </hlm-date-picker>
        }
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
export class DateControlRenderer {
  protected readonly control = injectJfControl<string | null>();
  protected readonly formatDate = (date: Date) => display.format(date);
  protected readonly date = computed(() => parseDateValue(this.control.field()?.().value()));
  protected readonly formatted = computed(() => {
    const date = this.date();
    return date ? display.format(date) : '';
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

  /**
   * Leaving the button touches the control, but opening the calendar moves focus into it, which must not
   * show the errors yet.
   */
  protected touchIfClosed(event: FocusEvent): void {
    const button = event.target as HTMLElement;
    if (button.getAttribute('aria-expanded') !== 'true') {
      this.control.field()?.().markAsTouched();
    }
  }

  protected choose(date: Date | null | undefined): void {
    const state = this.control.field()?.();
    if (!state) return;
    state.value.set(date ? formatDateValue(date) : '');
    state.markAsTouched();
  }
}

export const dateControlTester = rankWith(2, isDateControl);
