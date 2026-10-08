# Roadmap and implementation plan

Living document. Last updated 2026-10-08.

**Status:** M1 in progress: the `/core` binding, ADR-0003, vendored helm, the text control and vertical layout,
and the first demo page landed on 2026-10-08. Next: §6. Decisions are recorded in [`docs/adr/`](./docs/adr/).
Tick the checkboxes here as work lands.

Planning assumptions:

- **Pace:** 2–4 hours a week. Work is sized in *sessions* of about 3 hours; one session a week is the baseline.
- **Tooling:** Angular CLI workspace (library + demo app), ng-packagr, Vitest, Playwright.
- **Signals only:** signals and Angular Signal Forms throughout, and no RxJS in this package's code or API.
- **Stability goal:** upstream releases of spartan/ui must not break the package unannounced.

---

## 1. Key decisions

### 1.1 Build on `@jsonforms/core`, not `@jsonforms/angular`

`@jsonforms/angular` 3.8 is RxJS-based. Its renderer base classes subscribe to `jsonFormsService.$state` and
drive a reactive-forms `FormControl`, and it declares `rxjs` as a peer dependency. A signals-only package can't
build on it.

`@jsonforms/core` is framework-agnostic: pure functions plus AJV, with no RxJS. The React and Vue bindings are
thin layers over it, and this package adds a third, signal-based one.

**Reused from `@jsonforms/core`** (pure functions):

- testers and ranking (`rankWith`, `isStringControl`, `isEnumControl`, `optionIs`, …)
- UI schema generation (`Generate.uiSchema`), schema resolution and path helpers (`Resolve`, `composePaths`,
  `toDataPath`)
- AJV setup (`createAjv`, formats)
- rule evaluation (`isVisible`, `isEnabled`)
- label, description and required derivation, and i18n key/translation helpers

**Written here** (the signal binding):

- the form host component, the renderer dispatcher and the renderer registry
- `inject…()` helpers that hand each renderer its state as signals
- the bridge between JSON Schema validation and Signal Forms (§1.2)

**Trade-offs, accepted:**

- Not compatible with the `<jsonforms>` component or renderers from `@jsonforms/angular`. You can't mix in
  `@jsonforms/angular-material` renderers, and custom renderers use this package's API instead.
- About 5 extra sessions to build what `@jsonforms/angular` would have provided (dispatch, state, i18n wiring).
- In exchange there's no adapter layer around RxJS base classes, and the binding is UI-agnostic. It ships as a
  separate entry point (`/core`) and could be useful beyond spartan.

**What "no RxJS" means in practice.** The library never imports `rxjs` or `@angular/core/rxjs-interop`, and
exposes no Observables. `rxjs` is not in its `dependencies` or `peerDependencies`, and a lint rule plus a CI check
enforce all of this. Apps will still have `rxjs` installed: `@angular/core` 22 lists it as a required peer
dependency, and the CDK uses it internally.

### 1.2 Data and validation: one source of truth

- **Data:** the form data lives in a `signal()`. `form(model, schemaFn)` from `@angular/forms/signals` turns it
  into a `FieldTree`. Each control renderer binds `[formField]` to the field at its data path.
- **Validation:** JSON Schema stays the only validation contract. AJV (configured like JSON Forms) is wrapped
  as a **Standard Schema** object and attached with `validateStandardSchema(root, …)`. Signal Forms then routes
  each issue to the field at its path. Signal Forms' own validators (`required()`, `min()`, …) are *not*
  generated from the schema, so there aren't two sets of rules that could disagree.
  - Map AJV `instancePath` to path segments. For `required` errors, append `params.missingProperty` so the
    error lands on the missing child field, as JSON Forms core does.
  - Verified in M1: issues reach nested object and array fields, so no `validateTree` fallback is needed.
    Paths are shortened to the deepest existing field, because Signal Forms throws on a path through an
    absent parent.
- **Rules:**
  - Control-level ENABLE/DISABLE → Signal Forms `disabled(path, …)` logic, so control state and ARIA follow
    automatically.
  - SHOW/HIDE → evaluated by `<jf-dispatch>`, which doesn't render a hidden element at all. Layouts can have
    rules too, and a layout has no data path.
  - Rules in the root UI schema are applied when the form is built; UI schemas that renderers create at
    runtime (array items, M4) need their own handling.
  - Hidden fields are still validated, as in JSON Forms. Document this.
- **Empty values and the form model** (ADR-0003): Signal Forms has no field for an absent property, so
  `<jf-form>` gives `form()` a *materialised* model in which every schema property exists (`''` for
  strings, `null` for other primitives). The `data` it emits, and what AJV validates, is that model with
  empty values pruned, following the JSON Forms convention.
- **Validation mode:** `ValidateAndShow` / `ValidateAndHide` / `NoValidation`, as in JSON Forms. Error
  visibility follows spartan's `ErrorStateMatcher` (shown once touched by default, and everywhere after submit).
- **Schema changes:** the Signal Forms schema function runs once, so the form is rebuilt when the `schema` or
  `uischema` input changes.

### 1.3 Helm packaging: vendor a pinned snapshot

spartan/ui ships two layers. **Brain** is unstyled primitives on npm (`@spartan-ng/brain`, semver). **Helm** is
styled components copied into each app. There is no helm npm package: `@spartan-ng/helm/<name>` is just an
import alias that points at the app's copies.

Importing the app's helm would let any spartan update in the app break the renderers. So the package
**vendors a pinned helm snapshot** in `src/lib/ui/`:

- internal and not exported, with imports rewritten to relative paths so they never collide with the app's alias
- styled through spartan's CSS variables, so the app's theme still applies
- CLI version and style variant recorded in `src/lib/ui/SNAPSHOT.md`
- `tools/helm-diff` compares the snapshot with fresh CLI output, so you update it deliberately in its own PR
- MIT attribution in `THIRD_PARTY_NOTICES.md`

The only spartan dependency outside `src/lib/ui/` is `@spartan-ng/brain`.

### 1.4 Package identity and compatibility

- npm name: `jsonforms-spartan`, unscoped (decided in M0 on 2026-10-08; free on npm that day). Matches the repo and
  the entry points `jsonforms-spartan` and `jsonforms-spartan/core`.
- Peer dependencies:
  - `@angular/core|common|forms|cdk` `^22`. Signal Forms is stable from 22.0, so Angular 21 is dropped.
  - `@jsonforms/core` `~3.8.0`. Pin the minor, because 3.9 is in alpha.
  - `@spartan-ng/brain` `^1.6.0`. Verified in M0: 1.6.3 declares Angular `>=21 <23` peers; 1.6 is the oldest
    minor tested here. Narrow it if a 1.x minor breaks the renderers.
  - Set in M0 (2026-10-08) against Angular 22.2.1, `@jsonforms/core` 3.8.0, `@spartan-ng/brain` 1.6.3,
    Tailwind 4.3.
- Generated helm imports `class-variance-authority`, `clsx` and `tailwind-merge` at runtime, so these are
  `dependencies` of the package since M1. The vendored components so far (`field`, `input`, `label`) don't use
  brain's `luxon` or `tw-animate-css` peers; recheck when the date picker is vendored (M2).
- `@jsonforms/core` brings CommonJS modules (`lodash`, `ajv`, `ajv-formats`); the README tells apps to list
  them in `allowedCommonJsDependencies`.
- App prerequisites: Tailwind CSS v4 and a spartan theme. Users must add
  `@source "../node_modules/jsonforms-spartan";` to their CSS, because Tailwind v4 doesn't scan `node_modules`.

---

## 2. Architecture

```
projects/jsonforms-spartan/
  core/                    # secondary entry point "jsonforms-spartan/core": UI-agnostic signal binding
    src/form/              # <jf-form> host: data model, form(), AJV Standard Schema adapter
    src/dispatch/          # <jf-dispatch>: picks the best renderer by tester rank (NgComponentOutlet)
    src/inject/            # injectJfControl(), injectJfLayout(), injectJfArray()
    src/registry.ts        # JfRendererEntry = { tester: RankedTester; renderer: Type<unknown> }
  src/lib/                 # primary entry point "jsonforms-spartan": spartan renderers
    ui/                    # vendored helm snapshot (internal)
    controls/ layouts/ complex/ i18n/
    renderers.ts           # export const spartanRenderers: JfRendererEntry[]
projects/demo/             # demo app (JSON Forms example schemas + own), deployed to GitHub Pages
```

**Tentative public API** (to be confirmed in M1):

```ts
@Component({
  imports: [JfForm],
  template: `
    <jf-form #jf="jfForm"
      [schema]="schema" [uischema]="uischema"
      [renderers]="renderers" [(data)]="data" />
    <button (click)="jf.submit(save)" [disabled]="jf.form().invalid()">Save</button>
  `,
})
export class RecordFormComponent {
  renderers = spartanRenderers;
  data = signal<Record>({});
}
```

**A renderer** (sketch; the core API exists since M1, the helm markup is still to be checked). It has no base
class and no RxJS; all state arrives as signals.

```ts
@Component({
  selector: 'jfs-text-control',
  imports: [FormField, HlmFieldImports, HlmInput],
  template: `
    @if (c.field(); as field) {
      <div hlmField>
        <label hlmFieldLabel [for]="c.id">{{ c.label() }}</label>
        <input hlmInput [id]="c.id" [formField]="field" />
        @if (c.description()) { <p hlmFieldDescription>{{ c.description() }}</p> }
        @for (e of field().errors(); track e) {
          <hlm-field-error [validator]="e.kind">{{ e.message }}</hlm-field-error>
        }
      </div>
    }
  `,
})
export class TextControlRenderer {
  protected readonly c = injectJfControl<string>();
}
export const textControlTester = rankWith(1, isStringControl);
```

`injectJfControl<T>()` returns `field` (the `FieldTree<T>` at the control's path, `undefined` only where the
data has no field, such as an absent array) plus `label`, `showLabel`, `description`, `required`, `enabled`,
`schema`, `uischema` and `path` as signals, and a unique `id`. Visibility is handled by `<jf-dispatch>`.
`injectJfLayout()` returns `elements`, `schema`, `path`, `label` and `enabled` for passing on to child
`<jf-dispatch>` elements.

**Definition of done for every renderer:**

- [ ] Tester unit tests (matches / doesn't match / rank)
- [ ] Render test: label, value in, value out (data signal updated), error shown, disabled by rule, hidden by rule
- [ ] Required marker and description as help text
- [ ] Read-only mode
- [ ] `aria-invalid`, `aria-describedby` → description + error; keyboard operable
- [ ] axe check passes on its demo page
- [ ] Demo entry with schema + UI schema

---

## 3. Milestones

Session estimates are for one person at about 3 hours a session.

### M0: Foundations (≈ 3 sessions)

- [x] Housekeeping: fix the README licence line (`© 2026 Giovanni Piccolo`)
- [x] Add `.gitattributes` (`* text=auto eol=lf`). The working copy is on Windows and has CRLF files.
- [x] Angular 22 workspace: `ng new --no-create-application`, library, `core` secondary entry point, demo app
- [x] Tailwind v4, the spartan theme and the spartan CLI in the **demo app**, which is also where reference helm
      comes from
- [x] Verify versions and set the peer ranges (§1.4)
- [x] Vitest, angular-eslint, Prettier. ESLint `no-restricted-imports` in the library for `rxjs`,
      `@angular/core/rxjs-interop`, `@jsonforms/angular` and reactive forms (`@angular/forms`; only
      `@angular/forms/signals` is allowed)
- [x] GitHub Actions: lint, test, build on PRs
- [x] Decide the npm name; `CONTRIBUTING.md`
- [x] `docs/adr/` with ADR-0001 (signals only, on core), ADR-0002 (helm vendoring), ADR-0003 (empty values, proposed)

### M1: Signal binding tracer bullet (≈ 5 sessions). Proves the architecture end to end.

- [x] `<jf-form>`: data model signal, `form()`, rebuild on schema change, UI schema generation when none is given
- [x] AJV → Standard Schema adapter + unit tests (nested paths, `required` → child field, `oneOf` noise)
- [x] Spike: confirm issues reach nested fields through `validateStandardSchema`; otherwise use `validateTree`
- [x] `<jf-dispatch>` + registry + `injectJfControl()` / `injectJfLayout()`
- [x] Vendor helm `field`, `label`, `input`; text control + VerticalLayout
- [x] Demo schema with a required field, a HIDE rule and a DISABLE rule; runs zoneless, all components OnPush
- [x] Decide ADR-0003 (empty-value handling)
- [ ] `ng build`, `npm pack`, install the tarball in a **fresh** Angular 22 app. This checks the packaging, the
      peers, the `@source` instruction and that no `rxjs` import appears in `dist/`
- [ ] Optional: publish `0.0.1` under the npm `next` tag to reserve the name

### M2: Primitive controls (≈ 6 sessions)

| Control | spartan building block | Signal Forms binding | Notes |
|---|---|---|---|
| Text, multiline | Input, Textarea | native `[formField]` | `options.multi` → textarea |
| Number, integer | Input `type=number` | native `[formField]` | check empty → `undefined` and integer step |
| Boolean | Checkbox; Switch | `hlm-checkbox` / `hlm-switch` support `[formField]` | `options.toggle` → switch |
| Enum, oneOf enum | Select or Native Select; Radio Group | `hlm-select` / `hlm-radio-group` support `[formField]` | `options.format: 'radio'`; labels from `title` |
| Date | Date Picker | own `FormValueControl<string \| null>` wrapper | value is a `YYYY-MM-DD` string; convert with local date parts, never `toISOString()` |
| Time, date-time | Input `type=time` / `datetime-local` | native `[formField]` | spartan has no time picker |
| Range | Slider | check `[formField]`; else a `FormValueControl` wrapper | needs `minimum`, `maximum`, `default` |

Order: number → boolean → enum → date/time → range. Cheapest first; date last because of conversion.

### M3: Layouts and object (≈ 3 sessions) → **release 0.1.0**

- [ ] HorizontalLayout (stacks on small screens), Group (`fieldset` + `legend`), Label
- [ ] Object control (nested group via generated UI schema)
- [ ] Release prep (≈ 2 sessions): demo on GitHub Pages, compatibility matrix, CHANGELOG, npm publish with
      provenance from CI, announcement (JSON Forms community forum, spartan Discord)

### M4: Collections (≈ 6 sessions) → **release 0.2.0**

- [ ] `injectJfArray()`: add / remove / move through `model.update`; stable item tracking
- [ ] Array of primitives
- [ ] Array of objects as a list of cards: add, remove (with confirmation), move up/down from the keyboard;
      focus moves sensibly after add and remove
- [ ] Categorization as Tabs
- [ ] Guide: "Writing a custom renderer" (tester + `injectJfControl()`)

### M5: Polish (≈ 6 sessions) → **release 0.3.0**

- [ ] i18n: `i18n` input with a translate function (JSON Forms key conventions); AJV error messages translated
      in the adapter; English and Italian bundles
- [ ] Autocomplete for large enums (`options.autocomplete`)
- [ ] Focus the first invalid field on submit (Signal Forms `focus()`), and a polite live region for an error summary
- [ ] Categorization stepper variant (`options.variant: 'stepper'`)

### Later (unscheduled)

- oneOf / anyOf / allOf combinator renderers
- Array as table, master-detail
- Additional errors input, validation of hidden fields as an option
- Offer the `/core` signal binding to the JSON Forms project as a discussion or contribution
- 1.0.0 once the package has survived at least one JSON Forms minor and one spartan minor upgrade

Rough calendar at one session a week: **0.1.0 ≈ 4.5–5 months**, 0.2.0 ≈ +1.5 months, 0.3.0 ≈ +1.5 months.

---

## 4. Quality and upstream tracking

- **Unit/render tests:** Vitest, with tests next to each renderer. The AJV adapter gets its own test suite.
- **Accessibility:** Playwright + `@axe-core/playwright` on every demo page in CI. Target WCAG 2.2 AA. Manual
  keyboard and NVDA pass before each minor release.
- **No-RxJS guard:** the lint rule above, plus a CI step that fails if `dist/` imports `rxjs` or if the built
  `package.json` lists it.
- **Compatibility CI:** Angular 22 (latest minor) on every PR; add 23 when it ships.
- **Early-warning job:** a weekly scheduled workflow installs the *latest* `@spartan-ng/brain`, `@jsonforms/core`
  and Angular and runs the full suite. A failure opens an issue.
- **Dependabot/Renovate** for dev dependencies. Widen the peer ranges only after the matrix passes.
- **Helm sync:** run `tools/helm-diff` on each spartan release.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Signal Forms changes how it creates fields or routes issues | Errors on the wrong field, unbindable controls | Behaviour pinned by `signal-forms-assumptions.spec.ts`; weekly job |
| `''` vs missing property mismatch between inputs and JSON Schema `required` | Required fields look valid | Settled by ADR-0003; adapter and `<jf-form>` tests |
| Re-implementing `@jsonforms/angular` misses behaviours (middleware, additional errors) | Feature gaps | Listed as non-goals for 0.1; added on request |
| Signal Forms is young (stable since 22.0) | API polish in minors | Signal Forms usage stays in `/core` and the renderers; early-warning job |
| `@spartan-ng/brain` breaking change despite semver | Build/runtime errors | Caret range from the oldest tested minor (`^1.6.0`); the weekly job tests the latest; narrow the range if a minor breaks |
| Large schemas: whole-tree AJV validation on every change | Typing lag | Measure in the demo; debounce in the adapter if needed |
| Scope creep at 2–4 h/week | Never ships | 0.1.0 = primitives + layouts; everything else after |

---

## 6. Next three sessions

1. M1: `npm pack` check in a fresh Angular 22 app; publish `0.0.1` under `next` to reserve the name.
   Playwright + axe on the demo page.
2. M2: number control, and the Definition-of-done items still open for text: read-only mode.
3. M2: boolean control (check that checkbox/switch accept a `null` placeholder, ADR-0003).
