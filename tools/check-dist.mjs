// Fails if the built library imports RxJS or declares it as a dependency (ADR-0001).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist/jsonforms-spartan';
const forbidden =
  /(?:from\s*|import\s*\(?\s*)['"](rxjs(?:\/[^'"]*)?|@angular\/core\/rxjs-interop|@jsonforms\/angular[^'"]*)['"]/g;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
    } else if (/\.(m?js|d\.ts)$/.test(name)) {
      for (const match of readFileSync(path, 'utf8').matchAll(forbidden)) {
        problems.push(`${path}: imports '${match[1]}'`);
      }
    } else if (name === 'package.json') {
      const pkg = JSON.parse(readFileSync(path, 'utf8'));
      for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const dep of Object.keys(pkg[field] ?? {})) {
          if (dep === 'rxjs' || dep.startsWith('@jsonforms/angular')) {
            problems.push(`${path}: lists '${dep}' in ${field}`);
          }
        }
      }
    }
  }
}

walk(dist);
if (problems.length) {
  console.error(`Forbidden dependencies in ${dist}:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`${dist}: no RxJS or @jsonforms/angular imports or dependencies.`);
