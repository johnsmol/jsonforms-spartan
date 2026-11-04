import { JsonPipe } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { spartanRenderers } from 'jsonforms-spartan';
import { JfForm } from 'jsonforms-spartan/core';

@Component({
  selector: 'app-dates-page',
  imports: [JfForm, HlmButton, JsonPipe],
  template: `
    <section class="flex flex-col gap-6">
      <header class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold">Date controls</h2>
        <p class="text-muted-foreground text-sm">
          "Birth date" is a required <code>format: date</code> picker. The value is a
          <code>YYYY-MM-DD</code> string. "Signed on" is read-only.
        </p>
      </header>

      <jf-form [schema]="schema" [uischema]="uischema" [renderers]="renderers" [(data)]="data" />

      <div class="flex items-center gap-3">
        <button hlmBtn type="button" (click)="save()">Save</button>
        @if (saved()) {
          <p class="text-sm" role="status">Saved.</p>
        }
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-sm font-medium">Data</h3>
        <pre class="bg-muted rounded-md p-3 text-sm">{{ data() | json }}</pre>
      </div>
    </section>
  `,
})
export class DatesPage {
  protected readonly renderers = spartanRenderers;
  protected readonly data = signal<unknown>({ signed: '2026-03-09' });
  protected readonly saved = signal(false);
  private readonly jf = viewChild.required(JfForm);

  protected readonly schema: JsonSchema = {
    type: 'object',
    properties: {
      birth: {
        type: 'string',
        format: 'date',
        title: 'Birth date',
        description: 'Choose a day from the calendar.',
      },
      signed: { type: 'string', format: 'date', title: 'Signed on', readOnly: true },
    },
    required: ['birth'],
  };

  protected readonly uischema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/birth' },
      { type: 'Control', scope: '#/properties/signed' },
    ],
  } as UISchemaElement;

  protected async save(): Promise<void> {
    this.saved.set(await this.jf().submit(() => undefined));
  }
}
