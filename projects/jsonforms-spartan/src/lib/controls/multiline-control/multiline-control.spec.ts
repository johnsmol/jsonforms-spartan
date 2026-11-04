import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { textControlTester } from '../text-control/text-control';
import { multilineControlTester } from './multiline-control';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    bio: { type: 'string', title: 'Biography', description: 'A few lines', minLength: 5 },
    note: { type: 'string', readOnly: true },
    flag: { type: 'boolean' },
    age: { type: 'integer' },
  },
  required: ['bio'],
};

@Component({
  imports: [JfForm],
  template: `<jf-form
    [schema]="schema"
    [uischema]="uischema()"
    [renderers]="renderers"
    [(data)]="data"
  />`,
})
class Host {
  readonly schema = schema;
  readonly renderers = spartanRenderers;
  readonly uischema = signal<UISchemaElement | undefined>(undefined);
  readonly data = signal<unknown>({});
  readonly jf = viewChild.required(JfForm);
}

const multi = { options: { multi: true } };
const control = (scope: string, extra: object = {}) =>
  ({ type: 'Control', scope, ...multi, ...extra }) as UISchemaElement;

async function setup(uischema: UISchemaElement, data: unknown = {}) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.uischema.set(uischema);
  fixture.componentInstance.data.set(data);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    area: () => el.querySelector<HTMLTextAreaElement>('textarea'),
    type: async (value: string) => {
      const area = el.querySelector<HTMLTextAreaElement>('textarea')!;
      area.value = value;
      area.dispatchEvent(new Event('input'));
      area.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    },
  };
}

describe('multilineControlTester', () => {
  const run = (scope: string, extra: object = multi) =>
    multilineControlTester({ type: 'Control', scope, ...extra } as UISchemaElement, schema, {
      rootSchema: schema,
      config: {},
    });

  it('matches string controls with options.multi, above the text control', () => {
    expect(run('#/properties/bio')).toBe(2);
    expect(
      textControlTester({ type: 'Control', scope: '#/properties/bio' } as UISchemaElement, schema, {
        rootSchema: schema,
        config: {},
      }),
    ).toBe(1);
  });

  it('does not match without options.multi, or other types', () => {
    expect(run('#/properties/bio', {})).toBe(NOT_APPLICABLE);
    expect(run('#/properties/age')).toBe(NOT_APPLICABLE);
    expect(run('#/properties/flag')).toBe(NOT_APPLICABLE);
  });
});

describe('MultilineControlRenderer', () => {
  it('renders a textarea named by its label, with the description linked', async () => {
    const { el, area } = await setup(control('#/properties/bio'));
    const label = el.querySelector('label')!;
    expect(label.textContent).toContain('Biography');
    expect(label.htmlFor).toBe(area()!.id);
    const description = el.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(area()!.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
    expect(area()!.getAttribute('aria-required')).toBe('true');
  });

  it('keeps line breaks, and removes the property when cleared', async () => {
    const { host, area, type } = await setup(control('#/properties/bio'), { bio: 'one' });
    expect(area()!.value).toBe('one');
    await type('first line\nsecond line');
    expect(host.data()).toEqual({ bio: 'first line\nsecond line' });
    await type('');
    expect(host.data()).toEqual({});
  });

  it('shows errors once touched, linked to the textarea', async () => {
    const { el, area, type } = await setup(control('#/properties/bio'));
    const error = el.querySelector<HTMLElement>('hlm-field-error')!;
    expect(error.hidden).toBe(true);
    await type('abc');
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain('must NOT have fewer than 5 characters');
    expect(area()!.getAttribute('aria-invalid')).toBe('true');
    expect(area()!.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  });

  it('is read-only for a readOnly schema, and still focusable', async () => {
    const { area } = await setup(control('#/properties/note'), { note: 'fixed' });
    expect(area()!.readOnly).toBe(true);
    expect(area()!.disabled).toBe(false);
  });

  it('is disabled by a rule', async () => {
    const { area } = await setup(
      control('#/properties/bio', {
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/flag', schema: { const: true } },
        },
      }),
      { flag: true },
    );
    expect(area()!.disabled).toBe(true);
  });

  it('is hidden by a rule', async () => {
    const { area } = await setup(
      control('#/properties/bio', {
        rule: {
          effect: RuleEffect.HIDE,
          condition: { scope: '#/properties/flag', schema: { const: true } },
        },
      }),
      { flag: true },
    );
    expect(area()).toBeNull();
  });
});
