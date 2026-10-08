# ADR-0003: Empty values

- Status: **Proposed**. To be decided in M1.

## Context

Native inputs bound with `[formField]` write `''` when cleared. In JSON Forms the convention is to remove the
property (`undefined`), so that the JSON Schema `required` keyword fails as expected and the emitted data
contains no empty strings.

## Options

1. Normalise in the AJV Standard Schema adapter: treat `''` as missing during validation, and strip empty
   strings from the data emitted by `<jf-form>`.
2. Wrap each text-like control in a thin `FormValueControl<string | undefined>` that writes `undefined` for
   empty input.

## To decide in M1

Try option 1 first, since it needs no wrapper components. Check how it behaves with `minLength`, enums, number
inputs and arrays of primitives, then record the outcome here.
