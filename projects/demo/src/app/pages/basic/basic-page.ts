import { JsonPipe } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { spartanRenderers } from 'jsonforms-spartan';
import { JfForm } from 'jsonforms-spartan/core';

@Component({
  selector: 'app-basic-page',
  imports: [JfForm, HlmButton, JsonPipe],
  template: `
    <section class="flex flex-col gap-6">
      <header class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold">Text controls and rules</h2>
        <p class="text-muted-foreground text-sm">
          "Name" and "Email" are required. "How did you hear about us?" is enabled once a name is
          entered. "VAT number" appears once a company is entered.
        </p>
      </header>

      <jf-form
        #jf="jfForm"
        [schema]="schema"
        [uischema]="uischema"
        [renderers]="renderers"
        [(data)]="data"
      />

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
export class BasicPage {
  protected readonly renderers = spartanRenderers;
  protected readonly data = signal<unknown>({});
  protected readonly saved = signal(false);
  private readonly jf = viewChild.required(JfForm);

  protected readonly schema: JsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name', minLength: 2 },
      email: {
        type: 'string',
        title: 'Email',
        format: 'email',
        description: 'We only use it to reply to you.',
      },
      referral: { type: 'string', title: 'How did you hear about us?' },
      company: { type: 'string', title: 'Company' },
      vat: { type: 'string', title: 'VAT number', pattern: '^[A-Z]{2}[0-9A-Z]{8,12}$' },
    },
    required: ['name', 'email'],
  };

  private readonly nameEntered = {
    scope: '#/properties/name',
    schema: { minLength: 1 },
    failWhenUndefined: true,
  };

  protected readonly uischema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/name' },
      { type: 'Control', scope: '#/properties/email' },
      {
        type: 'Control',
        scope: '#/properties/referral',
        rule: { effect: 'ENABLE', condition: this.nameEntered },
      },
      { type: 'Control', scope: '#/properties/company' },
      {
        type: 'Control',
        scope: '#/properties/vat',
        rule: {
          effect: 'SHOW',
          condition: {
            scope: '#/properties/company',
            schema: { minLength: 1 },
            failWhenUndefined: true,
          },
        },
      },
    ],
  } as UISchemaElement;

  protected async save(): Promise<void> {
    this.saved.set(await this.jf().submit(() => undefined));
  }
}
