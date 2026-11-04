import { JsonPipe } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { spartanRenderers } from 'jsonforms-spartan';
import { JfForm } from 'jsonforms-spartan/core';

@Component({
  selector: 'app-enums-page',
  imports: [JfForm, HlmButton, JsonPipe],
  template: `
    <section class="flex flex-col gap-6">
      <header class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold">Enum controls</h2>
        <p class="text-muted-foreground text-sm">
          "Country" is a required select, "Plan" a <code>oneOf</code> select whose labels come from
          <code>title</code>, and "Priority" an integer select. "Size" is a radio group (<code
            >options.format: 'radio'</code
          >). "Region" is read-only.
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
export class EnumsPage {
  protected readonly renderers = spartanRenderers;
  protected readonly data = signal<unknown>({ region: 'eu' });
  protected readonly saved = signal(false);
  private readonly jf = viewChild.required(JfForm);

  protected readonly schema: JsonSchema = {
    type: 'object',
    properties: {
      country: {
        type: 'string',
        title: 'Country',
        description: 'Where you live.',
        enum: ['Italy', 'France', 'Spain'],
      },
      plan: {
        type: 'string',
        title: 'Plan',
        oneOf: [
          { const: 'free', title: 'Free' },
          { const: 'pro', title: 'Pro' },
        ],
      },
      priority: { type: 'integer', title: 'Priority', enum: [1, 2, 3] },
      size: { type: 'string', title: 'Size', enum: ['small', 'medium', 'large'] },
      region: { type: 'string', title: 'Region', enum: ['eu', 'us'], readOnly: true },
    },
    required: ['country'],
  };

  protected readonly uischema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/country' },
      { type: 'Control', scope: '#/properties/plan' },
      { type: 'Control', scope: '#/properties/priority' },
      { type: 'Control', scope: '#/properties/size', options: { format: 'radio' } },
      { type: 'Control', scope: '#/properties/region' },
    ],
  } as UISchemaElement;

  protected async save(): Promise<void> {
    this.saved.set(await this.jf().submit(() => undefined));
  }
}
