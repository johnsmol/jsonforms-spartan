import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';

/**
 * Fills gaps in spartan's native select, radio group and date picker trigger. Put it on an element that wraps the component.
 *
 * - **Read-only.** Neither has a read-only mode, and a disabled one can't be focused. With `readonly`
 *   true, clicks, presses and every key but Tab are swallowed before the component sees them, and
 *   `aria-readonly` is set.
 * - **Invalid and described by.** Set on the `select` or `radiogroup` element itself, which spartan's
 *   wrappers don't do reliably.
 */
@Directive({ selector: '[jfsEnumA11y]' })
export class JfsEnumA11y {
  readonly readonly = input.required<boolean>({ alias: 'jfsEnumA11y' });
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const swallow = (event: Event) => {
      if (this.readonly() && !(event instanceof KeyboardEvent && event.key === 'Tab')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const events = ['click', 'mousedown', 'keydown'];
    for (const name of events) this.host.addEventListener(name, swallow, true);
    inject(DestroyRef).onDestroy(() => {
      for (const name of events) this.host.removeEventListener(name, swallow, true);
    });

    effect(() => {
      const target = this.host.querySelector(
        'select, [role="radiogroup"], [data-slot="date-picker-trigger"] button',
      );
      set(target, 'aria-readonly', this.readonly() ? 'true' : null);
      set(target, 'aria-invalid', this.invalid() ? 'true' : null);
      set(target, 'aria-describedby', this.describedBy());
    });
  }
}

function set(element: Element | null, name: string, value: string | null): void {
  if (value === null) {
    element?.removeAttribute(name);
  } else {
    element?.setAttribute(name, value);
  }
}
