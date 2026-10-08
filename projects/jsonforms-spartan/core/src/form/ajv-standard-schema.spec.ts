import type { JsonSchema } from '@jsonforms/core';
import { createAjvStandardSchema } from './ajv-standard-schema';
import { materialize } from './empty-values';

function issuesFor(schema: JsonSchema, data: unknown) {
  const model = materialize(schema, data);
  const result = createAjvStandardSchema(schema)['~standard'].validate(model);
  return (result.issues ?? []).map((issue) => ({
    path: issue.path,
    keyword: issue.error?.keyword,
  }));
}

describe('createAjvStandardSchema', () => {
  const person: JsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 3 },
      address: {
        type: 'object',
        properties: { street: { type: 'string' }, city: { type: 'string' } },
        required: ['city'],
      },
      pets: {
        type: 'array',
        items: { type: 'object', properties: { kind: { type: 'string' } }, required: ['kind'] },
      },
    },
    required: ['name'],
  };

  it('returns the pruned data when valid', () => {
    const model = materialize(person, { name: 'Ann', address: { city: 'Padova' } });
    expect(createAjvStandardSchema(person)['~standard'].validate(model)).toEqual({
      value: { name: 'Ann', address: { city: 'Padova' } },
    });
  });

  it('treats empty strings as missing, so required fails on the child field', () => {
    expect(issuesFor(person, { address: { city: 'Padova' } })).toEqual([
      { path: ['name'], keyword: 'required' },
    ]);
  });

  it('routes nested required errors to the missing child', () => {
    expect(issuesFor(person, { name: 'Ann', address: { street: 'Via Roma' } })).toEqual([
      { path: ['address', 'city'], keyword: 'required' },
    ]);
  });

  it('treats an object that is not required and left empty as absent', () => {
    expect(issuesFor(person, { name: 'Ann' })).toEqual([]);
  });

  it('routes errors inside array items with numeric indexes', () => {
    expect(
      issuesFor(person, { name: 'Ann', address: { city: 'Padova' }, pets: [{ kind: 'cat' }, {}] }),
    ).toEqual([{ path: ['pets', 1, 'kind'], keyword: 'required' }]);
  });

  it('routes value errors to the field', () => {
    expect(issuesFor(person, { name: 'Al', address: { city: 'Padova' } })).toEqual([
      { path: ['name'], keyword: 'minLength' },
    ]);
  });

  it('shortens paths that leave the model to the deepest existing field', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { a: { type: 'object', properties: {} } },
      required: ['undeclared'],
    };
    expect(issuesFor(schema, {})).toEqual([{ path: [], keyword: 'required' }]);
  });

  it('decodes JSON Pointer segments', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { 'a/b': { type: 'string', minLength: 2 } },
    };
    expect(issuesFor(schema, { 'a/b': 'x' })).toEqual([{ path: ['a/b'], keyword: 'minLength' }]);
  });

  it('keeps the oneOf error and drops the noise from its branches', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        size: {
          oneOf: [
            { const: 's', title: 'Small' },
            { const: 'l', title: 'Large' },
          ],
        },
      },
    };
    expect(issuesFor(schema, { size: 'm' })).toEqual([{ path: ['size'], keyword: 'oneOf' }]);
  });

  it('keeps the form invalid when only combinator branches fail', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        contact: {
          anyOf: [
            { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
            { type: 'object', properties: { phone: { type: 'string' } }, required: ['phone'] },
          ],
        },
      },
    };
    expect(issuesFor(schema, { contact: { fax: '1' } })).toEqual([
      { path: ['contact'], keyword: 'anyOf' },
    ]);
  });

  it('checks formats with ajv-formats, as JSON Forms does', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { born: { type: 'string', format: 'date' } },
    };
    expect(issuesFor(schema, { born: '2026-13-45' })).toEqual([
      { path: ['born'], keyword: 'format' },
    ]);
    expect(issuesFor(schema, { born: '2026-10-08' })).toEqual([]);
  });
});
