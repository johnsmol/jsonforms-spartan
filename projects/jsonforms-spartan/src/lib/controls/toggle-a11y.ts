import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';

/**
 * Fills two gaps in spartan's checkbox and switch. Put it on an element that wraps the component.
 *
 * - **Read-only.** Neither component has a read-only mode, and a disabled one can't be focused. With
 *   `jfsToggleA11y` true, clicks (including the one a keyboard Space press produces) are swallowed
 *   before the component sees them, and `aria-readonly` is set on the control.
 * - **Invalid.** spartan sets `aria-invalid` on its wrapper element, not on the element with the
 *   checkbox or switch role, so `invalid` sets it there.
 */
@Directive({ selector: '[jfsToggleA11y]' })
export class JfsToggleA11y {
  /** Whether the control is read-only. */
  readonly jfsToggleA11y = input.required<boolean>();
  /** Whether the control is invalid. */
  readonly invalid = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const swallow = (event: Event) => {
      if (this.jfsToggleA11y()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    this.host.addEventListener('click', swallow, true);
    inject(DestroyRef).onDestroy(() => this.host.removeEventListener('click', swallow, true));

    effect(() => {
      const readonly = this.jfsToggleA11y();
      const invalid = this.invalid();
      const target = this.host.querySelector('[role="checkbox"], [role="switch"]');
      set(target, 'aria-readonly', readonly);
      set(target, 'aria-invalid', invalid);
    });
  }
}

function set(element: Element | null, name: string, on: boolean): void {
  if (on) {
    element?.setAttribute(name, 'true');
  } else {
    element?.removeAttribute(name);
  }
}
