import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { enumRadioControlTester } from '../enum-radio-control/enum-radio-control';
import { enumControlTester, oneOfEnumControlTester } from './enum-control';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    color: { type: 'string', enum: ['red', 'green'], title: 'Colour', description: 'Pick one' },
    size: { type: 'integer', enum: [1, 2, 3] },
    plan: {
      type: 'string',
      oneOf: [
        { const: 'free', title: 'Free plan' },
        { const: 'pro', title: 'Pro plan' },
      ],
    },
    name: { type: 'string' },
    fixed: { type: 'string', enum: ['a', 'b'], readOnly: true },
  },
  required: ['color'],
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
const radio = { options: { format: 'radio' } };

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
    select: () => el.querySelector<HTMLSelectElement>('select'),
    group: () => el.querySelector<HTMLElement>('[role="radiogroup"]'),
    radios: () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]')),
    choose: async (label: string) => {
      const select = el.querySelector<HTMLSelectElement>('select')!;
      const option = Array.from(select.options).find((o) => o.text.trim() === label)!;
      select.value = option.value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    },
  };
}

describe('enum testers', () => {
  const run = (tester: typeof enumControlTester, scope: string, extra: object = {}) =>
    tester(control(scope, extra), schema, { rootSchema: schema, config: {} });

  it('ranks the select 2, oneOf 5 and radio 20', () => {
    expect(run(enumControlTester, '#/properties/color')).toBe(2);
    expect(run(oneOfEnumControlTester, '#/properties/plan')).toBe(5);
    expect(run(enumRadioControlTester, '#/properties/color', radio)).toBe(20);
    expect(run(enumRadioControlTester, '#/properties/plan', radio)).toBe(20);
  });

  it('does not match other controls, or the select when radio is asked for', () => {
    expect(run(enumControlTester, '#/properties/name')).toBe(NOT_APPLICABLE);
    expect(run(enumControlTester, '#/properties/color', radio)).toBe(NOT_APPLICABLE);
    expect(run(oneOfEnumControlTester, '#/properties/plan', radio)).toBe(NOT_APPLICABLE);
    expect(run(enumRadioControlTester, '#/properties/color')).toBe(NOT_APPLICABLE);
  });
});

describe('EnumControlRenderer', () => {
  it('renders a select named by its label, with the description linked', async () => {
    const { el, select } = await setup(control('#/properties/color'));
    expect(el.querySelector('label')!.textContent).toContain('Colour');
    expect(el.querySelector('label')!.htmlFor).toBe(select()!.id);
    const description = el.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(select()!.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
    expect(Array.from(select()!.options).map((o) => o.text.trim())).toEqual(['', 'red', 'green']);
  });

  it('writes the chosen value, and removes the property when cleared', async () => {
    const { host, choose } = await setup(control('#/properties/color'));
    await choose('green');
    expect(host.data()).toEqual({ color: 'green' });
    await choose('');
    expect(host.data()).toEqual({});
  });

  it('keeps the type of non-string values', async () => {
    const { host, choose } = await setup(control('#/properties/size'));
    await choose('2');
    expect(host.data()).toEqual({ size: 2 });
    await choose('');
    expect(host.data()).toEqual({});
  });

  it('shows the value from the data', async () => {
    const { select } = await setup(control('#/properties/size'), { size: 3 });
    expect(select()!.selectedOptions[0].text).toBe('3');
  });

  it('uses oneOf titles as labels and the const as value', async () => {
    const { host, select, choose } = await setup(control('#/properties/plan'));
    expect(Array.from(select()!.options).map((o) => o.text.trim())).toEqual([
      '',
      'Free plan',
      'Pro plan',
    ]);
    await choose('Pro plan');
    expect(host.data()).toEqual({ plan: 'pro' });
  });

  it('marks required controls for assistive technology', async () => {
    const { el } = await setup(control('#/properties/color'));
    expect(el.querySelector('label .sr-only')!.textContent).toBe('(required)');
  });

  it('reports a required enum left empty after submit, linked to the select', async () => {
    const { fixture, host, el, select } = await setup(control('#/properties/color'));
    expect(select()!.hasAttribute('aria-invalid')).toBe(false);
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    const error = el.querySelector<HTMLElement>('hlm-field-error')!;
    expect(error.textContent).toContain("must have required property 'color'");
    expect(select()!.getAttribute('aria-invalid')).toBe('true');
    expect(select()!.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  });

  it('is disabled by a rule', async () => {
    const { select } = await setup(
      control('#/properties/color', {
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/name', schema: { minLength: 1 } },
        },
      }),
      { name: 'x' },
    );
    expect(select()!.disabled).toBe(true);
  });

  it('is hidden by a rule', async () => {
    const { select } = await setup(
      control('#/properties/color', {
        rule: {
          effect: RuleEffect.HIDE,
          condition: { scope: '#/properties/name', schema: { minLength: 1 } },
        },
      }),
      { name: 'x' },
    );
    expect(select()).toBeNull();
  });

  it('does not accept keys or clicks when read-only, but stays focusable', async () => {
    const { host, select } = await setup(control('#/properties/fixed'), { fixed: 'a' });
    expect(select()!.getAttribute('aria-readonly')).toBe('true');
    expect(select()!.disabled).toBe(false);
    const down = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    select()!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    select()!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(host.data()).toEqual({ fixed: 'a' });
  });
});

describe('EnumRadioControlRenderer', () => {
  it('renders a radio group named by its label, one radio per option', async () => {
    const { el, group, radios } = await setup(control('#/properties/color', radio));
    const label = el.querySelector<HTMLElement>('[data-slot="field-label"]')!;
    expect(group()!.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.textContent).toContain('Colour');
    expect(radios().length).toBe(2);
    expect(el.textContent).toContain('red');
    expect(el.textContent).toContain('green');
  });

  it('writes the chosen value, with its type', async () => {
    const { host, radios, fixture } = await setup(control('#/properties/size', radio));
    radios()[1].click();
    await fixture.whenStable();
    expect(host.data()).toEqual({ size: 2 });
    expect(radios()[1].checked).toBe(true);
  });

  it('uses oneOf titles as labels', async () => {
    const { el, host, radios, fixture } = await setup(control('#/properties/plan', radio));
    expect(el.textContent).toContain('Pro plan');
    radios()[1].click();
    await fixture.whenStable();
    expect(host.data()).toEqual({ plan: 'pro' });
  });

  it('shows the value from the data', async () => {
    const { radios } = await setup(control('#/properties/color', radio), { color: 'green' });
    expect(radios().map((r) => r.checked)).toEqual([false, true]);
  });

  it('reports a required enum left empty after submit, linked to the group', async () => {
    const { fixture, host, el, group } = await setup(control('#/properties/color', radio));
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    const error = el.querySelector<HTMLElement>('hlm-field-error')!;
    expect(error.textContent).toContain("must have required property 'color'");
    expect(group()!.getAttribute('aria-invalid')).toBe('true');
    expect(group()!.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  });

  it('is disabled by a rule', async () => {
    const { radios } = await setup(
      control('#/properties/color', {
        ...radio,
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/name', schema: { minLength: 1 } },
        },
      }),
      { name: 'x' },
    );
    expect(radios().every((r) => r.disabled)).toBe(true);
  });

  it('does not change the data when read-only', async () => {
    const { host, group, radios, fixture } = await setup(control('#/properties/fixed', radio), {
      fixed: 'a',
    });
    expect(group()!.getAttribute('aria-readonly')).toBe('true');
    radios()[1].click();
    await fixture.whenStable();
    expect(host.data()).toEqual({ fixed: 'a' });
  });
});
