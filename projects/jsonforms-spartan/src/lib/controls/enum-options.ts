import type { JsonSchema } from '@jsonforms/core';

/** One choice of an enum: the value written to the data, and the text shown. */
export interface EnumOption {
  readonly value: unknown;
  readonly label: string;
}

/** The choices of an `enum`, or of a `oneOf` of `const`s, where `title` is the label. */
export function enumOptions(schema: JsonSchema): EnumOption[] {
  if (schema.oneOf) {
    return schema.oneOf
      .filter((entry) => entry.const !== undefined)
      .map((entry) => ({ value: entry.const, label: entry.title ?? String(entry.const) }));
  }
  return (schema.enum ?? []).map((value) => ({ value, label: String(value) }));
}

/** What an empty enum holds in the form model (ADR-0003): `''` for string enums, else `null`. */
export function enumPlaceholder(options: readonly EnumOption[]): '' | null {
  return typeof options[0]?.value === 'string' ? '' : null;
}
