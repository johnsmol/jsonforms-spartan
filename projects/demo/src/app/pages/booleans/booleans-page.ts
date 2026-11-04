import { JsonPipe } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { spartanRenderers } from 'jsonforms-spartan';
import { JfForm } from 'jsonforms-spartan/core';

@Component({
  selector: 'app-booleans-page',
  imports: [JfForm, HlmButton, JsonPipe],
  template: `
    <section class="flex flex-col gap-6">
      <header class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold">Boolean controls</h2>
        <p class="text-muted-foreground text-sm">
          "I accept the terms" is a required checkbox. "Newsletter" is a switch
          (<code>options.toggle</code>). "Confirmed" is read-only, and "Beta features" is disabled
          until the newsletter is on.
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
export class BooleansPage {
  protected readonly renderers = spartanRenderers;
  protected readonly data = signal<unknown>({ confirmed: true });
  protected readonly saved = signal(false);
  private readonly jf = viewChild.required(JfForm);

  protected readonly schema: JsonSchema = {
    type: 'object',
    properties: {
      terms: {
        type: 'boolean',
        title: 'I accept the terms',
        description: 'You must accept to continue.',
      },
      newsletter: { type: 'boolean', title: 'Newsletter' },
      beta: { type: 'boolean', title: 'Beta features' },
      confirmed: { type: 'boolean', title: 'Confirmed', readOnly: true },
    },
    required: ['terms'],
  };

  protected readonly uischema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/terms' },
      { type: 'Control', scope: '#/properties/newsletter', options: { toggle: true } },
      {
        type: 'Control',
        scope: '#/properties/beta',
        rule: {
          effect: 'ENABLE',
          condition: { scope: '#/properties/newsletter', schema: { const: true } },
        },
      },
      { type: 'Control', scope: '#/properties/confirmed' },
    ],
  } as UISchemaElement;

  protected async save(): Promise<void> {
    this.saved.set(await this.jf().submit(() => undefined));
  }
}
