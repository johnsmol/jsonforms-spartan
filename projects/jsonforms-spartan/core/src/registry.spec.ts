import { Component } from '@angular/core';
import { NOT_APPLICABLE, rankWith, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { findRenderer, type JfRendererEntry } from './registry';

@Component({ template: '' })
class A {}
@Component({ template: '' })
class B {}

const uischema: UISchemaElement = { type: 'Control' } as UISchemaElement;
const schema: JsonSchema = {};
const context = { rootSchema: schema, config: {} };
const always = (rank: number): JfRendererEntry['tester'] => rankWith(rank, () => true);

describe('findRenderer', () => {
  it('returns the renderer with the highest rank', () => {
    const renderers = [
      { tester: always(1), renderer: A },
      { tester: always(3), renderer: B },
    ];
    expect(findRenderer(renderers, uischema, schema, context)).toBe(B);
  });

  it('returns the first renderer on a tie', () => {
    const renderers = [
      { tester: always(2), renderer: A },
      { tester: always(2), renderer: B },
    ];
    expect(findRenderer(renderers, uischema, schema, context)).toBe(A);
  });

  it('returns undefined when no tester applies', () => {
    const renderers = [{ tester: () => NOT_APPLICABLE, renderer: A }];
    expect(findRenderer(renderers, uischema, schema, context)).toBeUndefined();
    expect(findRenderer([], uischema, schema, context)).toBeUndefined();
  });
});
