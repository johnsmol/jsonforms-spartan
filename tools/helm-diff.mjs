// Compares the vendored helm snapshot (ADR-0002) with the reference helm that the spartan CLI generated in
// the demo app, after rewriting `@spartan-ng/helm/<name>` imports to relative paths.
//
//   node tools/helm-diff.mjs                 report differences; exit 1 if there are any
//   node tools/helm-diff.mjs --write         make the snapshot match the reference
//   node tools/helm-diff.mjs --write <name>  also vendor a component that isn't in the snapshot yet
//
// See projects/jsonforms-spartan/src/lib/ui/SNAPSHOT.md for the update procedure.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';

const reference = 'projects/demo/src/ui';
const snapshot = 'projects/jsonforms-spartan/src/lib/ui';
const snapshotDocs = new Set(['SNAPSHOT.md']);

const args = process.argv.slice(2);
const write = args.includes('--write');
const added = args.filter((arg) => !arg.startsWith('--'));

const components = [
  ...new Set([
    ...readdirSync(snapshot).filter((name) => statSync(join(snapshot, name)).isDirectory()),
    ...added,
  ]),
].sort();

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** Rewrites `@spartan-ng/helm/<name>` to a relative import of that component's entry point. */
function vendor(source, file) {
  return source.replace(/(['"])@spartan-ng\/helm\/([\w-]+)\1/g, (_, quote, name) => {
    let target = relative(dirname(file), join(snapshot, name, 'src'))
      .split(sep)
      .join('/');
    if (!target.startsWith('.')) target = `./${target}`;
    return `${quote}${target}${quote}`;
  });
}

// Build the expected snapshot in a temporary directory.
const expected = mkdtempSync(join(tmpdir(), 'helm-diff-'));
const missing = [];
for (const name of components) {
  const sourceDir = join(reference, name);
  if (!existsSync(sourceDir)) {
    missing.push(name);
    continue;
  }
  for (const file of files(sourceDir)) {
    const snapshotFile = join(snapshot, relative(reference, file));
    const out = join(expected, relative(snapshot, snapshotFile));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, vendor(readFileSync(file, 'utf8'), snapshotFile));
  }
  for (const file of files(join(snapshot, name))) {
    // Check that every vendored import resolves inside the snapshot.
    for (const match of readFileSync(file, 'utf8').matchAll(/@spartan-ng\/helm\/([\w-]+)/g)) {
      console.error(`${file}: still imports @spartan-ng/helm/${match[1]}`);
    }
  }
}
if (missing.length) {
  console.error(
    `No reference helm for: ${missing.join(', ')}. Generate it first:\n` +
      missing.map((name) => `  npx ng g @spartan-ng/cli:ui --name=${name}`).join('\n'),
  );
  rmSync(expected, { recursive: true, force: true });
  process.exit(2);
}

// Every helm import in the expected files must point at a component we vendor.
for (const file of files(expected)) {
  for (const match of readFileSync(file, 'utf8').matchAll(/from '(\.[^']*)'/g)) {
    const component = match[1].split('/').find((segment) => components.includes(segment));
    if (match[1].includes('/src') && !component) {
      console.error(
        `${relative(expected, file)} imports ${match[1]}, which isn't vendored. Add it with --write <name>.`,
      );
      process.exitCode = 2;
    }
  }
}

if (write) {
  for (const name of components) {
    rmSync(join(snapshot, name), { recursive: true, force: true });
    cpSync(join(expected, name), join(snapshot, name), { recursive: true });
  }
  rmSync(expected, { recursive: true, force: true });
  console.log(
    `Snapshot updated: ${components.join(', ')}. Update SNAPSHOT.md and review the diff.`,
  );
  process.exit(process.exitCode ?? 0);
}

// Show the differences with git's diff, ignoring the snapshot's own docs.
const actual = mkdtempSync(join(tmpdir(), 'helm-actual-'));
for (const name of components) {
  if (existsSync(join(snapshot, name)))
    cpSync(join(snapshot, name), join(actual, name), { recursive: true });
}
for (const doc of snapshotDocs) rmSync(join(actual, doc), { force: true });
const diff = spawnSync('git', ['diff', '--no-index', '--stat', '--patch', actual, expected], {
  encoding: 'utf8',
});
rmSync(expected, { recursive: true, force: true });
rmSync(actual, { recursive: true, force: true });
if (diff.status === 0) {
  console.log(`Helm snapshot matches the reference (${components.join(', ')}).`);
} else {
  process.stdout.write(diff.stdout);
  console.error(
    'Helm snapshot differs from the reference. Run `npm run helm:diff -- --write` to sync it.',
  );
  process.exitCode = 1;
}
