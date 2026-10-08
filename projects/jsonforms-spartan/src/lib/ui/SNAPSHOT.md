# Vendored helm snapshot

Internal copy of spartan/ui helm components (ADR-0002). Nothing here is exported, and nothing here is edited
by hand: `npm run helm:diff` (also run in CI) fails if this folder differs from the reference helm that the
spartan CLI generated in `projects/demo/src/ui`.

| | |
|---|---|
| Generated with | `@spartan-ng/cli` 1.6.3 |
| Brain at generation | `@spartan-ng/brain` 1.6.3 |
| Style | the CLI's default (spartan 1.x has a single helm style) |
| Generated on | 2026-10-08 |
| Components | `field`, `input`, `label`, `separator` (used by `field`), `utils` |

The only change from the CLI output is that `@spartan-ng/helm/<name>` imports become relative imports of
`<name>/src`, so they never resolve to an app's own helm.

## Updating

Do this in a PR of its own.

1. Update `@spartan-ng/cli` (and `@spartan-ng/brain` if needed) in the root `package.json`.
2. Regenerate the reference helm in the demo: delete `projects/demo/src/ui/<name>` for each component
   listed above, then run `npx ng g @spartan-ng/cli:ui --name=<name>`.
3. `npm run helm:diff` shows what changed. Read it: class changes alter the renderers' look, and API
   changes may need renderer updates.
4. `npm run helm:diff -- --write` copies the reference into this folder.
5. Update the table above, run the tests, and check the demo.

To vendor a new component, generate it in the demo first, then run
`npm run helm:diff -- --write <name>`.
