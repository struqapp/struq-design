// The README points at its art with relative paths (assets/readme/...), so GitHub always shows the files of the
// branch you are looking at, with no CDN cache in between. npm cannot resolve those paths, so for the tarball only
// they become jsDelivr URLs pinned to this version's tag, which never change once published.
//
//   node scripts/readme-urls.mjs pack      before npm pack/publish (prepack)
//   node scripts/readme-urls.mjs restore   after it (postpack)

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const readme = join(root, 'README.md');
const backup = join(root, '.README.repo.md');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const cdn = `https://cdn.jsdelivr.net/gh/struqapp/struq-design@v${version}/`;

const mode = process.argv[2];
if (mode === 'pack') {
  if (existsSync(backup)) throw new Error('.README.repo.md exists: a previous pack did not restore. Restore it first.');
  const source = readFileSync(readme, 'utf8');
  writeFileSync(backup, source);
  const packed = source.replace(/(src|srcset|href)="(assets\/readme\/[^"]+)"/g, (_, attr, p) => `${attr}="${cdn}${p}"`);
  writeFileSync(readme, packed);
  console.log(`README art pinned to ${cdn}`);
} else if (mode === 'restore') {
  if (existsSync(backup)) renameSync(backup, readme);
} else {
  console.error('Usage: node scripts/readme-urls.mjs pack|restore');
  process.exitCode = 1;
}
