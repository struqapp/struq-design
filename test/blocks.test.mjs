// why: the skill's blocks are a copy of Struq's admitted set, dropped into a client's components/struq/. A missing
// helper, an alias import or a candidate that slipped in breaks a build the agent cannot fix from the catalogue, so
// every shipped file must resolve by relative path and blocks.mjs add must bring everything a block imports.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOCKS = fileURLToPath(new URL('../skills/struq/blocks/', import.meta.url));
const CLI = fileURLToPath(new URL('../skills/struq/scripts/blocks.mjs', import.meta.url));
const { blocks } = JSON.parse(readFileSync(join(BLOCKS, 'catalog.json'), 'utf8'));
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const code = walk(BLOCKS).filter((f) => /\.(tsx?|mjs)$/.test(f));

test('every shipped import resolves inside the copy, by relative path only', () => {
  for (const file of code) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/from\s*["']@\//.test(text), `${file} imports through an alias`);
    for (const m of text.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const base = join(dirname(file), m[1]);
      assert.ok(['', '.ts', '.tsx'].some((ext) => existsSync(base + ext)), `${relative(BLOCKS, file)} imports ${m[1]}`);
    }
  }
});

test('the catalogue lists only admitted blocks, each with its files, and CATALOG.md names them all', () => {
  const md = readFileSync(join(BLOCKS, 'CATALOG.md'), 'utf8');
  assert.ok(blocks.length >= 40);
  for (const b of blocks) {
    assert.ok(b.files.includes(b.file), b.slug);
    for (const f of b.files) assert.ok(existsSync(join(BLOCKS, f)), `${b.slug}: ${f}`);
    assert.ok(md.includes(`### ${b.slug}`), b.slug);
    assert.ok(b.exports.length, `${b.slug} exports a component`);
  }
  for (const out of ['before-after', 'cursor-dot-ring', 'cursor-label']) assert.ok(!blocks.some((b) => b.slug === out), out);
});

test('blocks.mjs add copies a block with everything it imports, layout intact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'struq-blocks-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { next: '16.0.0' } }));
  const r = spawnSync(process.execPath, [CLI, 'add', 'hero-poster', 'hero-opener', '--dir', dir, '--no-install'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  for (const slug of ['hero-poster', 'hero-opener']) {
    for (const f of blocks.find((b) => b.slug === slug).files) assert.ok(existsSync(join(dir, 'components', 'struq', ...f.split(posix.sep))), f);
  }
  // hero-poster reaches hero-still and the curtain helper; hero-opener reaches the WebGL scenes and needs three.
  assert.ok(existsSync(join(dir, 'components/struq/heroes/hero-still.tsx')));
  assert.ok(existsSync(join(dir, 'components/struq/preloaders/preloader-slices-uncovered.ts')));
  assert.ok(existsSync(join(dir, 'components/struq/kit/scenes/ripple.ts')));
  assert.match(r.stdout, /npm install [^\n]*three/);
  assert.equal(spawnSync(process.execPath, [CLI, 'add', 'before-after', '--dir', dir, '--no-install']).status, 1);
});

test('blocks.mjs init leaves the WebGL layer out until a block needs it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'struq-init-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { next: '16.0.0' } }));
  const r = spawnSync(process.execPath, [CLI, 'init', '--dir', dir, '--no-install'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(dir, 'components/struq/kit/SmoothScroll.tsx')));
  assert.ok(existsSync(join(dir, 'components/struq/kit/blocks.css')));
  assert.ok(!existsSync(join(dir, 'components/struq/kit/HeroCanvas.tsx')));
  const layout = readFileSync(join(dir, 'app/layout.tsx'), 'utf8');
  assert.match(layout, /sq-js/);
  assert.match(layout, /data-blocks/);
  assert.match(readFileSync(join(dir, 'app/globals.css'), 'utf8'), /STRUQ TOKENS/);
});
