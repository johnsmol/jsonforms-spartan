import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NOT_APPLICABLE, RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';
import { textControlTester } from '../text-control/text-control';
import { dateControlTester } from './date-control';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    birth: { type: 'string', format: 'date', title: 'Birth date', description: 'Day of birth' },
    start: { type: 'string', format: 'date' },
    fixed: { type: 'string', format: 'date', readOnly: true },
    name: { type: 'string' },
    flag: { type: 'boolean' },
  },
  required: ['birth'],
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
    trigger: () => el.querySelector<HTMLButtonElement>('[data-slot="date-picker-trigger"] button'),
  };
}

describe('dateControlTester', () => {
  const run = (tester: typeof dateControlTester, scope: string) =>
    tester(control(scope), schema, { rootSchema: schema, config: {} });

  it('matches format date with rank 2, above the text control', () => {
    expect(run(dateControlTester, '#/properties/birth')).toBe(2);
    expect(run(textControlTester, '#/properties/birth')).toBe(1);
  });

  it('does not match other strings or types', () => {
    expect(run(dateControlTester, '#/properties/name')).toBe(NOT_APPLICABLE);
    expect(run(dateControlTester, '#/properties/flag')).toBe(NOT_APPLICABLE);
  });
});

describe('DateControlRenderer', () => {
  it('renders a button named by the label, with the description linked', async () => {
    const { el, trigger } = await setup(control('#/properties/birth'));
    const label = el.querySelector('label')!;
    expect(label.textContent).toContain('Birth date');
    expect(label.htmlFor).toBe(trigger()!.id);
    const description = el.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(trigger()!.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
    expect(label.querySelector('.sr-only')!.textContent).toBe('(required)');
  });

  it('shows the date from the data, and a prompt when there is none', async () => {
    const empty = await setup(control('#/properties/start'));
    expect(empty.trigger()!.textContent).toContain('Pick a date');
    const filled = await setup(control('#/properties/start'), { start: '2026-03-09' });
    expect(filled.trigger()!.textContent).toContain('2026');
    expect(filled.trigger()!.textContent).toContain('9');
  });

  it('writes a YYYY-MM-DD string when a day is picked, and removes it when cleared', async () => {
    const { fixture, host, trigger } = await setup(control('#/properties/start'), {
      start: '2026-03-09',
    });
    trigger()!.click();
    await fixture.whenStable();
    const days = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(
      (b) => b.textContent!.trim() === '15' && b.closest('hlm-calendar'),
    );
    expect(days.length).toBe(1);
    days[0].click();
    await fixture.whenStable();
    expect(host.data()).toEqual({ start: '2026-03-15' });

    trigger()!.click();
    await fixture.whenStable();
    const clear = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent!.trim() === 'Clear',
    )!;
    clear.click();
    await fixture.whenStable();
    expect(host.data()).toEqual({});
  });

  it('reports a required date left empty after submit, linked to the button', async () => {
    const { fixture, host, el, trigger } = await setup(control('#/properties/birth'));
    expect(trigger()!.hasAttribute('aria-invalid')).toBe(false);
    await host.jf().submit(() => undefined);
    await fixture.whenStable();
    const error = el.querySelector<HTMLElement>('hlm-field-error')!;
    expect(error.textContent).toContain("must have required property 'birth'");
    expect(trigger()!.getAttribute('aria-invalid')).toBe('true');
    expect(trigger()!.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  });

  it('shows a read-only date in a read-only input, labelled', async () => {
    const { el, trigger } = await setup(control('#/properties/fixed'), { fixed: '2026-03-09' });
    const input = el.querySelector<HTMLInputElement>('input')!;
    expect(trigger()).toBeNull();
    expect(input.readOnly).toBe(true);
    expect(input.disabled).toBe(false);
    expect(input.value).toContain('2026');
    expect(el.querySelector('label')!.htmlFor).toBe(input.id);
  });

  it('is disabled by a rule', async () => {
    const { trigger } = await setup(
      control('#/properties/start', {
        rule: {
          effect: RuleEffect.DISABLE,
          condition: { scope: '#/properties/flag', schema: { const: true } },
        },
      }),
      { flag: true },
    );
    expect(trigger()!.disabled).toBe(true);
  });

  it('is hidden by a rule', async () => {
    const { trigger } = await setup(
      control('#/properties/start', {
        rule: {
          effect: RuleEffect.HIDE,
          condition: { scope: '#/properties/flag', schema: { const: true } },
        },
      }),
      { flag: true },
    );
    expect(trigger()).toBeNull();
  });
});
