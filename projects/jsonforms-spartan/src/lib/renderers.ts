import type { JfRendererEntry } from 'jsonforms-spartan/core';
import { TextControlRenderer, textControlTester } from './controls/text-control/text-control';
import {
  VerticalLayoutRenderer,
  verticalLayoutTester,
} from './layouts/vertical-layout/vertical-layout';

/** The spartan renderer set. Pass it to `<jf-form [renderers]>`. */
export const spartanRenderers: JfRendererEntry[] = [
  { tester: textControlTester, renderer: TextControlRenderer },
  { tester: verticalLayoutTester, renderer: VerticalLayoutRenderer },
];
