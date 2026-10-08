# ADR-0001: Signals only, built on `@jsonforms/core`

- Status: Accepted (2026-10-08). Point 4 verified in M1 (see below).
- Context owner: Giovanni Piccolo

## Context

The package must use signals and Angular Signal Forms throughout, with no RxJS.

`@jsonforms/angular` 3.8 (the official Angular binding) is RxJS-based. `JsonFormsAbstractControl` subscribes to
`jsonFormsService.$state` in `ngOnInit`, drives a reactive-forms `FormControl`, and the package declares `rxjs`
as a peer dependency.

`@jsonforms/core` 3.8 is framework-agnostic. Its dependencies are `ajv`, `ajv-formats`, `lodash` and
`@types/json-schema`, with no RxJS. The React and Vue bindings are thin layers over it.

Angular Signal Forms (`@angular/forms/signals`: `form()`, `FormField` / `[formField]`, `FormValueControl`) has
been stable since Angular 22.0. spartan/ui helm components (input, textarea, select, checkbox, radio-group,
switch) support `[formField]`.

## Decision

1. Do not depend on `@jsonforms/angular`. Build a signal-based binding on `@jsonforms/core` and ship it as the
   secondary entry point `jsonforms-spartan/core`. It contains:
   - the `<jf-form>` host
   - `<jf-dispatch>`, which picks a renderer by tester rank
   - a renderer registry
   - `injectJfControl()` / `injectJfLayout()` / `injectJfArray()`, which return state as signals
2. Reuse the pure functions from `@jsonforms/core`: testers, `Generate.uiSchema`, `Resolve`, path helpers,
   `createAjv`, rule evaluation, label/required/description derivation, and i18n helpers.
3. The form data is a `signal()`, and `form()` turns it into a `FieldTree`. Control renderers bind
   `[formField]` to the field at their data path.
4. JSON Schema is the only validation contract. AJV is wrapped as a Standard Schema object and attached with
   `validateStandardSchema`. No Signal Forms validators are generated from the schema.
   - AJV `instancePath` maps to path segments. A `required` error is moved to the child field named in
     `params.missingProperty`.
   - Fallback if nested routing fails: `validateTree` with explicit field targets.
5. Control-level ENABLE/DISABLE rules map to Signal Forms `disabled()`. SHOW/HIDE rules become a `computed()`
   in the renderer, because layouts carry rules too and have no data path. Hidden fields are still validated,
   as in JSON Forms.
6. "No RxJS" means:
   - the library never imports `rxjs` or `@angular/core/rxjs-interop`
   - its public API exposes no Observables
   - `rxjs` is not in its `dependencies` or `peerDependencies`
   - lint rules and a CI check on `dist/` enforce this

   `rxjs` stays installed in apps, because `@angular/core` 22 requires it as a peer and the CDK uses it.

## Verified in M1

- Standard Schema issues reach nested object and array fields through `validateStandardSchema`, so the
  `validateTree` fallback isn't needed.
- Signal Forms has no field for an absent property, so the model given to `form()` can't be the raw
  JSON Forms data. ADR-0003 describes the form model that `<jf-form>` builds instead.

## Consequences

- Requires Angular 22 or later; Angular 21 isn't supported.
- Not compatible with `<jsonforms>` from `@jsonforms/angular`, or with its renderers (e.g. Angular Material).
  Custom renderers use this package's API.
- About 5 extra sessions to build dispatch, state and i18n wiring.
- No adapter around RxJS base classes. The `/core` binding is UI-agnostic and could be offered upstream later.
- Known gaps for 0.1: no middleware and no `additionalErrors` input.
