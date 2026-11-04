import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { numberControlTester } from './number-control';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    price: { type: 'number', title: 'Price', description: 'In euro', minimum: 0, maximum: 100 },
    count: { type: 'integer' },
    fixed: { type: 'number', readOnly: true },
    name: { type: 'string' },
    locked: { type: 'boolean' },
  },
  required: ['price'],
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

const control = (scope: string, extra: object = {}) =>
  ({ type: 'Control', scope, ...extra }) as UISchemaElement;

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
    input: () => el.querySelector<HTMLInputElement>('input'),
    error: () => el.querySelector<HTMLElement>('hlm-field-error'),
    type: async (value: string) => {
      const input = el.querySelector<HTMLInputElement>('input')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    },
  };
}

describe('numberControlTester', () => {
  const test = (scope: string) =>
    numberControlTester(control(scope), schema, { rootSchema: schema, config: {} });

  it('matches number and integer controls with rank 1', () => {
    expect(test('#/properties/price')).toBe(1);
    expect(test('#/properties/count')).toBe(1);
  });

  it('does not match other types', () => {
    expect(test('#/properties/name')).toBe(NOT_APPLICABLE);
    expect(test('#/properties/locked')).toBe(NOT_APPLICABLE);
  });
});

describe('NumberControlRenderer', () => {
  it('renders a labelled number input', async () => {
    const { el, input } = await setup(control('#/properties/price'));
    expect(input()!.type).toBe('number');
    expect(el.querySelector('label')!.htmlFor).toBe(input()!.id);
    expect(input()!.step).toBe('any');
  });

  it('steps integers by 1', async () => {
    const { input } = await setup(control('#/properties/count'));
    expect(input()!.step).toBe('1');
  });

  it('shows the value and writes numbers, not strings, back', async () => {
    const { host, input, type } = await setup(control('#/properties/price'), { price: 5 });
    expect(input()!.value).toBe('5');
    await type('12.5');
    expect(host.data()).toEqual({ price: 12.5 });
  });

  it('removes the property when cleared', async () => {
    const { host, type } = await setup(control('#/properties/count'), { count: 3 });
    await type('');
    expect(host.data()).toEqual({});
  });

  it('shows required and schema errors, connected to the input', async () => {
    const { fixture, host, error, input, type } = await setup(control('#/properties/price'));
    expect(input()!.getAttribute('aria-required')).toBe('true');
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    expect(error()!.textContent).toContain("must have required property 'price'");
    await type('101');
    expect(error()!.hidden).toBe(false);
    expect(error()!.textContent).toContain('must be <= 100');
    expect(input()!.getAttribute('aria-invalid')).toBe('true');
    expect(input()!.getAttribute('aria-describedby')?.split(' ')).toContain(error()!.id);
  });

  it('shows the description as help text', async () => {
    const { el, input } = await setup(control('#/properties/price'));
    const description = el.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(description.textContent).toBe('In euro');
    expect(input()!.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
  });

  it('is disabled by a rule', async () => {
    const { input } = await setup(
      control('#/properties/count', {
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/locked', schema: { const: true } },
        },
      }),
      { locked: true },
    );
    expect(input()!.disabled).toBe(true);
  });

  it('is hidden by a rule', async () => {
    const { input } = await setup(
      control('#/properties/count', {
        rule: {
          effect: RuleEffect.HIDE,
          condition: { scope: '#/properties/locked', schema: { const: true } },
        },
      }),
      { locked: true },
    );
    expect(input()).toBeNull();
  });

  it('is read-only through the schema, but stays focusable', async () => {
    const { input } = await setup(control('#/properties/fixed'), { fixed: 3 });
    expect(input()!.readOnly).toBe(true);
    expect(input()!.disabled).toBe(false);
  });
});
