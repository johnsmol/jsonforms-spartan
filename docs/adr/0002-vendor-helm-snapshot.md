# ADR-0002: Vendor a pinned spartan/ui helm snapshot

- Status: Accepted (2026-10-08)

## Context

spartan/ui ships two layers:

- **brain:** unstyled, accessible primitives, published on npm as `@spartan-ng/brain` and versioned with semver.
- **helm:** styled components that the spartan CLI copies into each app. There is no `@spartan-ng/helm` npm
  package. `@spartan-ng/helm/<name>` is only an import alias (`importAlias` in `components.json`) that points at
  the app's copies.

Requirement: a spartan update in a consuming app must not break the renderers unannounced.

## Options

- (a) Import `@spartan-ng/helm/*` and let it resolve to the app's own copies. Every app would then have a
  different helm version, and the app must use the default alias.
- (b) Vendor a pinned helm snapshot inside the package.

## Decision

Option (b).

- Location: `projects/jsonforms-spartan/src/lib/ui/`.
- The snapshot is internal: it is not exported, and its imports are rewritten to relative paths so they never
  collide with an app's `@spartan-ng/helm` alias.
- `src/lib/ui/SNAPSHOT.md` records the spartan CLI version and style variant used.
- `tools/helm-diff` generates fresh helm with the latest CLI and diffs it against the snapshot. Updates happen
  deliberately, in their own PR.
- MIT attribution goes in `THIRD_PARTY_NOTICES.md`.
- The only spartan dependency outside `src/lib/ui/` is `@spartan-ng/brain`, declared as a peer with a tested
  range.

## Consequences

- The style variant is fixed. Helm styles use spartan CSS variables, so the app's theme (colours, radius) still
  applies.
- Some code may be duplicated when an app also has helm.
- Helm sync is a manual task, triggered by spartan releases and the weekly early-warning CI job.
- Apps must add `@source "../node_modules/jsonforms-spartan";` to their CSS, because Tailwind v4 doesn't scan
  `node_modules`.
