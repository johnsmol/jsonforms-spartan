import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JfForm } from './jf-form';

const person: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: {
      type: 'object',
      properties: { street: { type: 'string' }, city: { type: 'string' } },
      required: ['city'],
    },
  },
  required: ['name'],
};

@Component({
  imports: [JfForm],
  template: `<jf-form [schema]="schema()" [uischema]="uischema()" [(data)]="data" />`,
})
class Host {
  readonly schema = signal<JsonSchema | undefined>(person);
  readonly uischema = signal<UISchemaElement | undefined>(undefined);
  readonly data = signal<unknown>({});
  readonly jf = viewChild.required(JfForm);
}

async function setup(data: unknown = {}) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.data.set(data);
  await fixture.whenStable();
  const host = fixture.componentInstance;
  // Field navigation by property name; renderers will do this by data path.
  const tree = () => host.jf().form() as any;
  const messages = (field: any) =>
    field()
      .errors()
      .map((e: { message: string }) => e.message);
  return { fixture, host, tree, messages };
}

describe('JfForm', () => {
  it('creates a field for every schema property, even when the data is empty', async () => {
    const { tree } = await setup();
    expect(tree().name().value()).toBe('');
    expect(tree().address.city().value()).toBe('');
  });

  it('routes a required error to the missing field', async () => {
    const { tree, messages } = await setup();
    expect(messages(tree().name)).toEqual(["must have required property 'name'"]);
    expect(tree()().valid()).toBe(false);
  });

  it('routes a nested required error to the missing child field', async () => {
    const { tree, messages } = await setup({ name: 'Ann', address: { street: 'Via Roma' } });
    expect(messages(tree().address.city)).toEqual(["must have required property 'city'"]);
    expect(messages(tree().name)).toEqual([]);
  });

  it('writes edits to the data, without empty values', async () => {
    const { fixture, host, tree } = await setup();
    tree().name().value.set('Ann');
    await fixture.whenStable();
    expect(host.data()).toEqual({ name: 'Ann' });

    tree().address.street().value.set('Via Roma');
    await fixture.whenStable();
    expect(host.data()).toEqual({ name: 'Ann', address: { street: 'Via Roma' } });

    tree().name().value.set('');
    tree().address.street().value.set('');
    await fixture.whenStable();
    expect(host.data()).toEqual({});
    expect(messages(tree().name)).toEqual(["must have required property 'name'"]);

    function messages(field: any) {
      return field()
        .errors()
        .map((e: { message: string }) => e.message);
    }
  });

  it('becomes valid when the required data is there', async () => {
    const { tree } = await setup({ name: 'Ann' });
    expect(tree()().valid()).toBe(true);
  });

  it('picks up data set from outside', async () => {
    const { fixture, host, tree } = await setup();
    host.data.set({ name: 'Bob', address: { city: 'Padova' } });
    await fixture.whenStable();
    expect(tree().name().value()).toBe('Bob');
    expect(tree().address.city().value()).toBe('Padova');
    expect(tree()().valid()).toBe(true);
  });

  it('normalises incoming empty values once', async () => {
    const { host } = await setup({ name: 'Ann', address: { street: '' }, note: null });
    expect(host.data()).toEqual({ name: 'Ann' });
  });

  it('keeps the same field tree while editing', async () => {
    const { fixture, tree } = await setup();
    const before = tree();
    before.name().value.set('Ann');
    await fixture.whenStable();
    expect(tree()).toBe(before);
  });

  it('rebuilds the form when the schema changes', async () => {
    const { fixture, host, tree } = await setup({ name: 'Ann' });
    const before = tree();
    host.schema.set({
      type: 'object',
      properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' } },
      required: ['email'],
    });
    await fixture.whenStable();
    expect(tree()).not.toBe(before);
    expect(tree().name().value()).toBe('Ann');
    expect(tree().email().errors().length).toBe(1);
  });

  it('generates a vertical layout when no UI schema is given', async () => {
    const { host } = await setup();
    expect(host.jf().resolvedUischema()).toMatchObject({
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/name' },
        { type: 'Control', scope: '#/properties/address' },
      ],
    });
  });

  it('generates a schema from the data when none is given', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.schema.set(undefined);
    fixture.componentInstance.data.set({ name: 'Ann', age: 3 });
    await fixture.whenStable();
    expect(fixture.componentInstance.jf().resolvedSchema()).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
    });
  });

  it('runs the submit action with the data only when valid', async () => {
    const { fixture, host, tree } = await setup();
    const action = vi.fn();
    expect(await host.jf().submit(action)).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(tree().name().touched()).toBe(true);

    tree().name().value.set('Ann');
    await fixture.whenStable();
    expect(await host.jf().submit(action)).toBe(true);
    expect(action).toHaveBeenCalledWith({ name: 'Ann' });
  });
});
