import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { spartanRenderers } from 'jsonforms-spartan';
import { JfForm } from 'jsonforms-spartan/core';

@Component({
  selector: 'app-numbers-page',
  imports: [JfForm, JsonPipe],
  template: `
    <section class="flex flex-col gap-6">
      <header class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold">Number controls and read-only</h2>
        <p class="text-muted-foreground text-sm">
          "Quantity" is an integer and "Price" a required number between 0 and 1000. "Reference" is
          read-only through the schema, and everything under "Locked section" through a UI schema
          option.
        </p>
      </header>

      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" (change)="readonly.set(!readonly())" />
        Make the whole form read-only
      </label>

      <jf-form
        [schema]="schema"
        [uischema]="uischema"
        [renderers]="renderers"
        [readonly]="readonly()"
        [(data)]="data"
      />

      <div class="flex flex-col gap-2">
        <h3 class="text-sm font-medium">Data</h3>
        <pre class="bg-muted rounded-md p-3 text-sm">{{ data() | json }}</pre>
      </div>
    </section>
  `,
})
export class NumbersPage {
  protected readonly renderers = spartanRenderers;
  protected readonly readonly = signal(false);
  protected readonly data = signal<unknown>({ reference: 42, locked: 7 });

  protected readonly schema: JsonSchema = {
    type: 'object',
    properties: {
      quantity: { type: 'integer', title: 'Quantity', minimum: 1 },
      price: {
        type: 'number',
        title: 'Price',
        description: 'In euro, between 0 and 1000.',
        minimum: 0,
        maximum: 1000,
      },
      reference: { type: 'number', title: 'Reference', readOnly: true },
      locked: { type: 'integer', title: 'Locked count' },
    },
    required: ['price'],
  };

  protected readonly uischema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/quantity' },
      { type: 'Control', scope: '#/properties/price' },
      { type: 'Control', scope: '#/properties/reference' },
      {
        type: 'VerticalLayout',
        options: { readonly: true },
        elements: [{ type: 'Control', scope: '#/properties/locked' }],
      },
    ],
  } as UISchemaElement;
}
