# jsonforms-spartan

> Unofficial, community-maintained renderer set that lets [JSON Forms](https://jsonforms.io) draw forms with [spartan/ui](https://spartan.ng) components in Angular.

One JSON Schema (plus an optional UI Schema) produces the form, its validation and its layout, with no Angular Material required.

> **Status: pre-alpha.** The scope below is the plan for v0.1. Nothing is published to npm yet and the API may change.

This project is not affiliated with or endorsed by EclipseSource (JSON Forms) or the spartan/ui project.

## Why

- Official Angular renderers for JSON Forms exist only for Angular Material (`@jsonforms/angular-material`), plus a community Ionic set.
- spartan/ui reached 1.0 in June 2026, and Angular teams that avoid Material currently have no option for schema-driven forms.
- Schema-driven forms are a good fit for metadata-heavy applications, where forms are generated from JSON Schema (for example from LinkML models).

## Compatibility

Targets the versions below (checked 2026-10-07). A full compatibility matrix will be maintained as the project evolves.

| Package | Version | Angular peer |
|---|---|---|
| `@jsonforms/core` | 3.8.0 | – |
| `@jsonforms/angular` | 3.8.0 | ^20 / ^21 / ^22 |
| `@spartan-ng/brain` | 1.6.1 | >=21 <23 |

In practice this means Angular 21 or 22.

## Installation

Not yet published. Planned:

```bash
npm install @<scope>/jsonforms-spartan @jsonforms/core @jsonforms/angular @spartan-ng/brain
```

## Usage (planned API)

The renderers follow the same structure as `@jsonforms/angular-material`: one standalone component per renderer, each with a tester and a rank, exported as a single array.

```ts
import { Component } from '@angular/core';
import { JsonForms } from '@jsonforms/angular';
import { spartanRenderers } from '@<scope>/jsonforms-spartan';

@Component({
  selector: 'app-record-form',
  standalone: true,
  imports: [JsonForms],
  template: `
    <jsonforms
      [data]="data"
      [schema]="schema"
      [uischema]="uischema"
      [renderers]="renderers"
      (dataChange)="data = $event"
    />
  `,
})
export class RecordFormComponent {
  renderers = spartanRenderers;
  schema = { /* your JSON Schema */ };
  uischema = { /* optional UI Schema */ };
  data = {};
}
```

The exact component and module names depend on the `@jsonforms/angular` version and will be confirmed once the first prototype is in place.

## Roadmap: scope for v0.1

**Controls**

- [ ] Text (string) and multiline (textarea)
- [ ] Number / integer
- [ ] Boolean (checkbox, switch variant)
- [ ] Enum (select, radio-group variant), `oneOf` enum with titles
- [ ] Date, time, date-time
- [ ] Range / slider
- [ ] Autocomplete (enum with many values)

**Complex types**

- [ ] Object (nested group)
- [ ] Array of primitives
- [ ] Array of objects (list/table with add, remove, reorder)
- [ ] `oneOf` / `anyOf` (tabs or select)

**Layouts**

- [ ] VerticalLayout, HorizontalLayout, Group
- [ ] Categorization (tabs, stepper variant)
- [ ] Label

**Cross-cutting**

- [ ] Validation messages (AJV errors, i18n-ready, English and Italian)
- [ ] Rules: show/hide, enable/disable
- [ ] Required markers, descriptions as help text
- [ ] Read-only mode (display a record with the same schema)

## Design principles

- **Standalone components, signals and OnPush** throughout; tested zoneless.
- **Theming through Tailwind CSS variables.** spartan/ui "helm" components are copied into apps rather than imported from npm, so this package ships its own helm copies for simpler installation. Packaging details are still being decided.
- **Accessibility first.** spartan's `brain` primitives handle ARIA and keyboard behaviour. On top of that, the renderers aim for correct labels, error announcement (`aria-describedby`, live region) and focus on the first invalid field. Target: WCAG 2.2 AA, checked with axe-core in CI.
- **Domain-specific renderers stay out of this package** (for example ORCID, ROR, ontology term lookup, units of measure). Custom renderers are supported through the standard JSON Forms tester mechanism, and a guide will be added.

## Quality

- [ ] Unit tests per renderer (tester and rendering)
- [ ] axe-core accessibility tests in CI
- [ ] Demo app (or Storybook) using the JSON Forms example schemas
- [ ] Compatibility matrix for Angular / JSON Forms / spartan versions

## Contributing

Contributions are welcome once the repository is public. Please open an issue to discuss larger changes first. A `CONTRIBUTING.md` with development setup and the renderer checklist will follow.

## Maintenance

The goal is to track new releases of JSON Forms and spartan/ui. Compatibility updates are prioritised over new features.

## Acknowledgements

Built on [JSON Forms](https://jsonforms.io) by EclipseSource and [spartan/ui](https://spartan.ng). The structure of this package is modelled on `@jsonforms/angular-material`.

## License

[MIT](./LICENSE) © <year> <copyright holder>
