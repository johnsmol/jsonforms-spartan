import type { JfRendererEntry } from 'jsonforms-spartan/core';
import {
  BooleanControlRenderer,
  booleanControlTester,
} from './controls/boolean-control/boolean-control';
import {
  ToggleControlRenderer,
  toggleControlTester,
} from './controls/toggle-control/toggle-control';
import { DateControlRenderer, dateControlTester } from './controls/date-control/date-control';
import {
  EnumControlRenderer,
  enumControlTester,
  oneOfEnumControlTester,
} from './controls/enum-control/enum-control';
import {
  EnumRadioControlRenderer,
  enumRadioControlTester,
} from './controls/enum-radio-control/enum-radio-control';
import {
  MultilineControlRenderer,
  multilineControlTester,
} from './controls/multiline-control/multiline-control';
import {
  NumberControlRenderer,
  numberControlTester,
} from './controls/number-control/number-control';
import { TextControlRenderer, textControlTester } from './controls/text-control/text-control';
import {
  VerticalLayoutRenderer,
  verticalLayoutTester,
} from './layouts/vertical-layout/vertical-layout';

/** The spartan renderer set. Pass it to `<jf-form [renderers]>`. */
export const spartanRenderers: JfRendererEntry[] = [
  { tester: textControlTester, renderer: TextControlRenderer },
  { tester: multilineControlTester, renderer: MultilineControlRenderer },
  { tester: numberControlTester, renderer: NumberControlRenderer },
  { tester: booleanControlTester, renderer: BooleanControlRenderer },
  { tester: toggleControlTester, renderer: ToggleControlRenderer },
  { tester: dateControlTester, renderer: DateControlRenderer },
  { tester: enumControlTester, renderer: EnumControlRenderer },
  { tester: oneOfEnumControlTester, renderer: EnumControlRenderer },
  { tester: enumRadioControlTester, renderer: EnumRadioControlRenderer },
  { tester: verticalLayoutTester, renderer: VerticalLayoutRenderer },
];
