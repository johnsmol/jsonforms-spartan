# ADR-0004: ControlValueAccessor and ng-icons in the vendored helm

- Status: Accepted (2026-11-04, M2)

## Context

The helm `checkbox` and `switch` that the spartan CLI generates implement `ControlValueAccessor` from
`@angular/forms`, and `checkbox` draws its tick with `@ng-icons/core` and `@ng-icons/lucide`. This clashes
with two rules:

- the library may not import `@angular/forms` (ADR-0001, enforced by lint);
- ADR-0002 keeps the vendored helm identical to the CLI output, so patching these files out would need
  a patch step in `tools/helm-diff`.

## Decision

- Keep the helm as generated.
- Lint allows `@angular/forms` imports **only inside `src/lib/ui/`**, and only the accessor interface is
  used there. No `FormControl`, `FormGroup` or `ReactiveFormsModule`, and nothing outside `ui/` may import
  `@angular/forms`. Renderers still bind with `[formField]` from `@angular/forms/signals`, which drives a
  `ControlValueAccessor` as well as a `FormValueControl`.
- `@ng-icons/core` and `@ng-icons/lucide` become `dependencies` of the package, with the range the spartan CLI
  writes (`>=32.0.0 <34.0.0`). Add further icon dependencies only when a vendored component needs one.

## Consequences

- No RxJS enters the library's own code or API. `@ng-icons/core` lists `rxjs` as a peer, which apps already
  have through `@angular/core`. `npm run check:dist` still guards the output.
- The package's install size grows by the two icon packages. The lucide package is tree-shakeable, and only
  the icons that are registered end up in the bundle.
- If Signal Forms stops supporting accessors, the boolean controls need `FormValueControl` wrappers.
