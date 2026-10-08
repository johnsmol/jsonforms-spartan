# ADR-0003: Empty values and the form model

- Status: Accepted (2026-10-08, M1). Supersedes the proposal of the same date.

## Context

Native inputs bound with `[formField]` write `''` when cleared. In JSON Forms the convention is to remove the
property (`undefined`), so that the JSON Schema `required` keyword fails as expected and the emitted data
contains no empty strings.

The M1 spike (now `core/src/form/signal-forms-assumptions.spec.ts`) found three Signal Forms behaviours that
turn this into a question about the shape of the form model, not just about `''`:

1. Signal Forms creates a field only for a property whose value is not `undefined`. An absent property has no
   field, so a control can't bind `[formField]` to it, and a Standard Schema issue for it lands on the root.
   In JSON Forms, absent properties are the normal case (`data = {}`).
2. An issue whose path goes through an absent parent object makes Signal Forms throw.
3. A native text input bound to `null` doesn't write back what the user types. A number input bound to
   `null` works, and writes `null` again when cleared.

Issues for paths that exist are routed correctly, including nested objects and array items, so the
`validateTree` fallback from ADR-0001 isn't needed.

## Options

1. Normalise in the AJV Standard Schema adapter: treat `''` as missing during validation, and strip empty
   strings from the data emitted by `<jf-form>`.
2. Wrap each text-like control in a thin `FormValueControl<string | undefined>` that writes `undefined` for
   empty input.

Option 2 alone doesn't help: a field for an absent property still wouldn't exist. Option 1 alone doesn't
either, for the same reason.

## Decision

Option 1, extended with a *materialised* form model. `<jf-form>` keeps two views of the same data:

- **The form model** (internal, given to `form()`): the data with every property declared in the schema
  present, recursively for nested objects and for the object items of existing arrays. Absent properties
  get a placeholder that their control can edit: `''` for strings (and untyped string enums), `null` for
  numbers, integers, booleans and other primitives. Values already present are never changed. Recursive
  schemas are expanded one level at a time, only where data exists.
- **The data** (the `data` model input, and what AJV validates): the form model *pruned*. Object properties
  that are `''`, `null`, `undefined`, or objects that are empty once pruned, are removed. Array items are
  kept as they are (objects inside them are pruned). The root object is never removed.

Rules that follow from this:

- AJV validates the pruned data, so `required` fails for an empty field and `minLength` etc. don't fire
  on placeholders.
- Every issue path is shortened to the deepest field that exists in the form model, so a path never goes
  through an absent parent.
- An object property that isn't required and whose fields are all empty is absent, so it isn't validated.
  This is stricter than JSON Forms, which keeps `{}` once a nested field has been edited and cleared.
- Data that comes in with empty values (`''`, `null`, `{}`) is normalised once: `<jf-form>` emits the
  pruned data.
- New data from outside rebuilds the form model, unless it equals the pruned current model (our own
  update coming back through two-way binding).

## Consequences

- No wrapper components are needed for text, number, enum or date inputs.
- An explicit `null` is never kept, even when the schema allows `type: ['string', 'null']`, and `''` can't be
  submitted as a value. Both match JSON Forms' controls, which write `undefined` for empty input. Revisit
  if someone needs either.
- Absent arrays get no placeholder, so they have no field. The array renderers (M4) create the array when
  the first item is added.
- Booleans start as `null`. M2 checks that the checkbox and switch accept that; if not, they get a
  `FormValueControl` wrapper.
- The Signal Forms behaviours above are pinned by tests. If an Angular release changes them, revisit
  `materialize()` and the adapter first.
