import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { textControlTester } from './text-control';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name', description: 'As on your passport', minLength: 3 },
    nickname: { type: 'string' },
    locked: { type: 'boolean' },
    age: { type: 'integer' },
  },
  required: ['name'],
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
    label: () => el.querySelector<HTMLLabelElement>('label'),
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

describe('textControlTester', () => {
  const test = (scope: string) =>
    textControlTester(control(scope), schema, { rootSchema: schema, config: {} });

  it('matches string controls with rank 1', () => {
    expect(test('#/properties/name')).toBe(1);
  });

  it('does not match other types', () => {
    expect(test('#/properties/age')).toBe(NOT_APPLICABLE);
    expect(test('#/properties/locked')).toBe(NOT_APPLICABLE);
  });
});

describe('TextControlRenderer', () => {
  it('renders a label linked to the input', async () => {
    const { input, label } = await setup(control('#/properties/nickname'));
    expect(label()!.textContent!.trim()).toBe('Nickname');
    expect(label()!.htmlFor).toBe(input()!.id);
    expect(input()!.id).not.toBe('');
  });

  it('shows the value from the data and writes edits back', async () => {
    const { host, input, type } = await setup(control('#/properties/nickname'), {
      nickname: 'Al',
    });
    expect(input()!.value).toBe('Al');
    await type('Ally');
    expect(host.data()).toEqual({ nickname: 'Ally' });
    await type('');
    expect(host.data()).toEqual({});
  });

  it('marks required controls visually and for assistive technology', async () => {
    const { input, label } = await setup(control('#/properties/name'));
    expect(label()!.querySelector('[aria-hidden="true"]')?.textContent).toBe('*');
    expect(input()!.getAttribute('aria-required')).toBe('true');
  });

  it('does not mark optional controls as required', async () => {
    const { input, label } = await setup(control('#/properties/nickname'));
    expect(label()!.textContent).not.toContain('*');
    expect(input()!.hasAttribute('aria-required')).toBe(false);
  });

  it('shows the description as help text connected to the input', async () => {
    const { el, input } = await setup(control('#/properties/name'));
    const description = el.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(description.textContent).toBe('As on your passport');
    expect(input()!.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
  });

  it('shows errors once the control is touched, and connects them to the input', async () => {
    const { error, input, type } = await setup(control('#/properties/name'));
    expect(input()!.getAttribute('aria-invalid')).toBe('true');
    expect(error()!.hidden).toBe(true);

    await type('Al');
    expect(error()!.hidden).toBe(false);
    expect(error()!.textContent).toContain('must NOT have fewer than 3 characters');
    expect(input()!.getAttribute('aria-describedby')?.split(' ')).toContain(error()!.id);

    await type('Alice');
    expect(input()!.hasAttribute('aria-invalid')).toBe(false);
    expect(error()!.hidden).toBe(true);
  });

  it('shows all errors after submit', async () => {
    const { fixture, host, error } = await setup(control('#/properties/name'));
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    expect(error()!.hidden).toBe(false);
    expect(error()!.textContent).toContain("must have required property 'name'");
  });

  it('is disabled by a rule', async () => {
    const { fixture, host, input } = await setup(
      control('#/properties/nickname', {
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/locked', schema: { const: true } },
        },
      }),
      { locked: true },
    );
    expect(input()!.disabled).toBe(true);
    expect(input()!.closest('[data-slot="field"]')!.getAttribute('data-disabled')).toBe('true');

    host.data.set({ locked: false });
    await fixture.whenStable();
    expect(input()!.disabled).toBe(false);
  });

  it('is hidden by a rule', async () => {
    const { fixture, host, input } = await setup(
      control('#/properties/nickname', {
        rule: {
          effect: RuleEffect.HIDE,
          condition: { scope: '#/properties/locked', schema: { const: true } },
        },
      }),
      { locked: true },
    );
    expect(input()).toBeNull();

    host.data.set({});
    await fixture.whenStable();
    expect(input()).not.toBeNull();
  });

  it('keeps a hidden label available to assistive technology', async () => {
    const { label } = await setup(control('#/properties/nickname', { label: false }));
    expect(label()!.classList).toContain('sr-only');
    expect(label()!.textContent!.trim()).toBe('Nickname');
  });
});
