import type { JsonSchema } from '@jsonforms/core';
import { jsonEqual, materialize, prune } from './empty-values';

describe('materialize', () => {
  it('adds type-aware placeholders for absent properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        height: { type: 'number' },
        active: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    };
    expect(materialize(schema, {})).toEqual({
      name: '',
      age: null,
      height: null,
      active: null,
    });
  });

  it('keeps values that are present, including properties not in the schema', () => {
    const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
    expect(materialize(schema, { name: 'Ann', extra: 1 })).toEqual({ name: 'Ann', extra: 1 });
  });

  it('creates nested objects', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        address: { type: 'object', properties: { street: { type: 'string' } } },
      },
    };
    expect(materialize(schema, undefined)).toEqual({ address: { street: '' } });
    expect(materialize(schema, { address: { street: 'Via Roma' } })).toEqual({
      address: { street: 'Via Roma' },
    });
  });

  it('fills the object items of existing arrays', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        pets: {
          type: 'array',
          items: { type: 'object', properties: { kind: { type: 'string' } } },
        },
      },
    };
    expect(materialize(schema, { pets: [{}, { kind: 'cat' }] })).toEqual({
      pets: [{ kind: '' }, { kind: 'cat' }],
    });
  });

  it('infers placeholders for untyped enums and oneOf consts', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        colour: { enum: ['red', 'green'] },
        size: { oneOf: [{ const: 1 }, { const: 2 }] },
      },
    };
    expect(materialize(schema, {})).toEqual({ colour: '', size: null });
  });

  it('uses the non-null type of a nullable property', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { note: { type: ['null', 'string'] } },
    };
    expect(materialize(schema, {})).toEqual({ note: '' });
  });

  it('resolves $ref and stops at recursive schemas', () => {
    const schema: JsonSchema = {
      definitions: {
        person: {
          type: 'object',
          properties: { name: { type: 'string' }, parent: { $ref: '#/definitions/person' } },
        },
      },
      $ref: '#/definitions/person',
    };
    expect(materialize(schema, {})).toEqual({ name: '' });
    expect(materialize(schema, { parent: {} })).toEqual({ name: '', parent: { name: '' } });
  });

  it('leaves values of the wrong type for validation to report', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { address: { type: 'object', properties: { street: { type: 'string' } } } },
    };
    expect(materialize(schema, { address: 'nowhere' })).toEqual({ address: 'nowhere' });
  });
});

describe('prune', () => {
  it('removes empty strings, null, undefined and empty objects', () => {
    expect(prune({ a: '', b: null, c: undefined, d: { e: '' }, f: 'x', g: 0, h: false })).toEqual({
      f: 'x',
      g: 0,
      h: false,
    });
  });

  it('keeps array items and empty arrays, pruning objects inside them', () => {
    expect(prune({ list: ['', null, { a: '', b: 1 }, {}], empty: [] })).toEqual({
      list: ['', null, { b: 1 }, {}],
      empty: [],
    });
  });

  it('keeps an empty root object', () => {
    expect(prune({ a: '' })).toEqual({});
  });

  it('undoes materialize', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'object', properties: { street: { type: 'string' } } },
      },
    };
    expect(prune(materialize(schema, {}))).toEqual({});
  });
});

describe('jsonEqual', () => {
  it('compares JSON values structurally', () => {
    expect(jsonEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(jsonEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
    expect(jsonEqual(null, {})).toBe(false);
  });
});
