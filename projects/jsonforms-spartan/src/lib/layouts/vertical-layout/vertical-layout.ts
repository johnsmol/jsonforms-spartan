import { Component } from '@angular/core';
import { rankWith, uiTypeIs } from '@jsonforms/core';
import { injectJfLayout, JfDispatch } from 'jsonforms-spartan/core';

/** Stacks its elements vertically. */
@Component({
  selector: 'jfs-vertical-layout',
  imports: [JfDispatch],
  template: `
    <div class="flex flex-col gap-6">
      @for (element of layout.elements(); track $index) {
        <jf-dispatch [uischema]="element" [schema]="layout.schema()" [path]="layout.path()" />
      }
    </div>
  `,
})
export class VerticalLayoutRenderer {
  protected readonly layout = injectJfLayout();
}

export const verticalLayoutTester = rankWith(1, uiTypeIs('VerticalLayout'));
