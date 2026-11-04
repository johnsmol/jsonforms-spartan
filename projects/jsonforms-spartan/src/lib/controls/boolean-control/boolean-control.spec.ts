import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { booleanControlTester } from './boolean-control';
import { toggleControlTester } from '../toggle-control/toggle-control';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    agree: { type: 'boolean', title: 'I agree', description: 'Terms apply' },
    news: { type: 'boolean' },
    name: { type: 'string' },
    fixed: { type: 'boolean', readOnly: true },
  },
  required: ['agree'],
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
    box: () => el.querySelector<HTMLElement>('[role="checkbox"], [role="switch"]'),
    click: async () => {
      el.querySelector<HTMLElement>('[role="checkbox"], [role="switch"]')!.click();
      await fixture.whenStable();
    },
  };
}

describe('boolean testers', () => {
  const run = (tester: typeof booleanControlTester, scope: string, extra: object = {}) =>
    tester(control(scope, extra), schema, { rootSchema: schema, config: {} });

  it('matches boolean controls with rank 2, and with options.toggle with rank 3', () => {
    expect(run(booleanControlTester, '#/properties/agree')).toBe(2);
    expect(run(toggleControlTester, '#/properties/agree')).toBe(NOT_APPLICABLE);
    expect(run(toggleControlTester, '#/properties/agree', { options: { toggle: true } })).toBe(3);
  });

  it('does not match other types', () => {
    expect(run(booleanControlTester, '#/properties/name')).toBe(NOT_APPLICABLE);
  });
});

describe('BooleanControlRenderer', () => {
  it('renders a checkbox named by its label, with the description linked', async () => {
    const { el, box } = await setup(control('#/properties/agree'));
    expect(box()!.getAttribute('role')).toBe('checkbox');
    expect(el.querySelector('label')!.textContent).toContain('I agree');
    expect(el.querySelector('label')!.htmlFor).toBe(box()!.id);
    const description = el.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(box()!.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
  });

  it('writes true and false, and leaves the property absent until touched', async () => {
    const { host, box, click } = await setup(control('#/properties/news'));
    expect(host.data()).toEqual({});
    await click();
    expect(host.data()).toEqual({ news: true });
    expect(box()!.getAttribute('aria-checked')).toBe('true');
    await click();
    expect(host.data()).toEqual({ news: false });
  });

  it('shows the value from the data', async () => {
    const { box } = await setup(control('#/properties/news'), { news: true });
    expect(box()!.getAttribute('aria-checked')).toBe('true');
  });

  it('reports a required boolean never set, after submit, linked to the checkbox', async () => {
    const { fixture, host, el, box } = await setup(control('#/properties/agree'));
    expect(box()!.hasAttribute('aria-invalid')).toBe(false);
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    const error = el.querySelector<HTMLElement>('hlm-field-error')!;
    expect(error.textContent).toContain("must have required property 'agree'");
    expect(box()!.getAttribute('aria-invalid')).toBe('true');
    expect(box()!.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  });

  it('marks required controls for assistive technology', async () => {
    const { el } = await setup(control('#/properties/agree'));
    expect(el.querySelector('label .sr-only')!.textContent).toBe('(required)');
  });

  it('is disabled by a rule', async () => {
    const { box } = await setup(
      control('#/properties/news', {
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/name', schema: { minLength: 1 } },
        },
      }),
      { name: 'x' },
    );
    expect(
      box()!.hasAttribute('data-disabled') || box()!.getAttribute('aria-disabled') === 'true',
    ).toBe(true);
  });

  it('is hidden by a rule', async () => {
    const { box } = await setup(
      control('#/properties/news', {
        rule: {
          effect: RuleEffect.HIDE,
          condition: { scope: '#/properties/name', schema: { minLength: 1 } },
        },
      }),
      { name: 'x' },
    );
    expect(box()).toBeNull();
  });

  it('does not change the data when read-only', async () => {
    const { host, box, click } = await setup(control('#/properties/fixed'), { fixed: false });
    expect(box()!.getAttribute('aria-readonly')).toBe('true');
    await click();
    expect(host.data()).toEqual({ fixed: false });
  });
});

describe('ToggleControlRenderer', () => {
  it('renders a switch for options.toggle', async () => {
    const { box, click, host } = await setup(
      control('#/properties/news', { options: { toggle: true } }),
    );
    expect(box()!.getAttribute('role')).toBe('switch');
    await click();
    expect(host.data()).toEqual({ news: true });
  });
});

describe('BooleanControlRenderer after a failed submit', () => {
  it('can still be checked', async () => {
    const { fixture, host, click, box } = await setup(control('#/properties/agree'));
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    await click();
    expect(box()!.getAttribute('aria-checked')).toBe('true');
    expect(host.data()).toEqual({ agree: true });
  });
});
