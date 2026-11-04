import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RuleEffect, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JfForm } from 'jsonforms-spartan/core';
import { spartanRenderers } from '../../renderers';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    a: { type: 'string', title: 'A' },
    b: { type: 'string', title: 'B', readOnly: true },
    flag: { type: 'boolean' },
  },
};

@Component({
  imports: [JfForm],
  template: `<jf-form
    [schema]="schema"
    [uischema]="uischema()"
    [renderers]="renderers"
    [readonly]="readonly()"
    [(data)]="data"
  />`,
})
class Host {
  readonly schema = schema;
  readonly renderers = spartanRenderers;
  readonly uischema = signal<UISchemaElement | undefined>(undefined);
  readonly readonly = signal(false);
  readonly data = signal<unknown>({});
  readonly jf = viewChild.required(JfForm);
}

const control = (scope: string, extra: object = {}) =>
  ({ type: 'Control', scope, ...extra }) as UISchemaElement;
const layout = (elements: UISchemaElement[], extra: object = {}) =>
  ({ type: 'VerticalLayout', elements, ...extra }) as UISchemaElement;

async function setup(uischema: UISchemaElement, data: unknown = {}) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.uischema.set(uischema);
  fixture.componentInstance.data.set(data);
  await fixture.whenStable();
  const inputs = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input'));
  return { fixture, host: fixture.componentInstance, inputs };
}

describe('read-only mode', () => {
  it('follows the form-level input', async () => {
    const { fixture, host, inputs } = await setup(layout([control('#/properties/a')]));
    expect(inputs()[0].readOnly).toBe(false);
    host.readonly.set(true);
    await fixture.whenStable();
    expect(inputs()[0].readOnly).toBe(true);
    expect(inputs()[0].disabled).toBe(false);
  });

  it('follows the schema readOnly keyword', async () => {
    const { inputs } = await setup(layout([control('#/properties/a'), control('#/properties/b')]));
    expect(inputs().map((i) => i.readOnly)).toEqual([false, true]);
  });

  it('lets a control option override the schema', async () => {
    const { inputs } = await setup(
      layout([control('#/properties/b', { options: { readonly: false } })]),
    );
    expect(inputs()[0].readOnly).toBe(false);
  });

  it('inherits options.readonly from an enclosing layout, and a control can override it', async () => {
    const { inputs } = await setup(
      layout(
        [control('#/properties/a'), control('#/properties/b', { options: { readonly: false } })],
        { options: { readonly: true } },
      ),
    );
    expect(inputs().map((i) => i.readOnly)).toEqual([true, false]);
  });

  it('applies READONLY and WRITABLE rules', async () => {
    const condition = { scope: '#/properties/flag', schema: { const: true } };
    const { fixture, host, inputs } = await setup(
      layout([
        control('#/properties/a', { rule: { effect: RuleEffect.READONLY, condition } }),
        control('#/properties/b', { rule: { effect: RuleEffect.WRITABLE, condition } }),
      ]),
    );
    expect(inputs().map((i) => i.readOnly)).toEqual([false, true]);
    host.data.set({ flag: true });
    await fixture.whenStable();
    expect(inputs().map((i) => i.readOnly)).toEqual([true, false]);
  });

  it('still includes read-only values in the data', async () => {
    const { host } = await setup(layout([control('#/properties/b')]), { b: 'kept' });
    expect(host.data()).toEqual({ b: 'kept' });
  });
});
