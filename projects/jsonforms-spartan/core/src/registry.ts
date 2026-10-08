import type { Type } from '@angular/core';
import type { RankedTester } from '@jsonforms/core';

/** A renderer and the tester that decides when it applies. */
export interface JfRendererEntry {
  tester: RankedTester;
  renderer: Type<unknown>;
}
