import type { Type } from '@angular/core';
import {
  NOT_APPLICABLE,
  type JsonSchema,
  type RankedTester,
  type TesterContext,
  type UISchemaElement,
} from '@jsonforms/core';

/** A renderer and the tester that decides when it applies. */
export interface JfRendererEntry {
  tester: RankedTester;
  renderer: Type<unknown>;
}

/**
 * Returns the renderer whose tester gives the highest rank, or `undefined` when none applies.
 * On a tie, the entry listed first wins.
 */
export function findRenderer(
  renderers: readonly JfRendererEntry[],
  uischema: UISchemaElement,
  schema: JsonSchema,
  context: TesterContext,
): Type<unknown> | undefined {
  let best: JfRendererEntry | undefined;
  let bestRank = NOT_APPLICABLE;
  for (const entry of renderers) {
    const rank = entry.tester(uischema, schema, context);
    if (rank > bestRank) {
      best = entry;
      bestRank = rank;
    }
  }
  return best?.renderer;
}
