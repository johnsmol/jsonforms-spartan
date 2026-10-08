import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { verticalLayoutTester } from './vertical-layout';

const schema: JsonSchema = {
  type: 'object',
  properties: { first: { type: 'string' }, last: { type: 'string' } },
};

@Component({
  imports: [JfForm],
  template: `<jf-form [schema]="schema" [uischema]="uischema()" [renderers]="renderers" />`,
})
class Host {
  readonly schema = schema;
  readonly renderers = spartanRenderers;
  readonly uischema = signal<UISchemaElement | undefined>(undefined);
}

describe('verticalLayoutTester', () => {
  const context = { rootSchema: schema, config: {} };

  it('matches vertical layouts with rank 1', () => {
    expect(
      verticalLayoutTester({ type: 'VerticalLayout' } as UISchemaElement, schema, context),
    ).toBe(1);
  });

  it('does not match other layouts', () => {
    expect(
      verticalLayoutTester({ type: 'HorizontalLayout' } as UISchemaElement, schema, context),
    ).toBe(NOT_APPLICABLE);
  });
});

describe('VerticalLayoutRenderer', () => {
  it('renders its elements in order', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.uischema.set({
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/last' },
        { type: 'Control', scope: '#/properties/first' },
      ],
    } as UISchemaElement);
    await fixture.whenStable();
    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label')];
    expect(labels.map((label) => label.textContent!.trim())).toEqual(['Last', 'First']);
  });

  it('renders the generated default layout', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('input').length).toBe(2);
  });
});
