import { spartanRenderers } from './renderers';

describe('spartanRenderers', () => {
  it('is an array of renderer entries', () => {
    expect(Array.isArray(spartanRenderers)).toBe(true);
  });
});
