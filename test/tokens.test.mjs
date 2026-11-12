// why: a block is judged in Struq's lab in one exact set of colours and faces. canon.mjs must give a client project
// the same token block and the same font requests, or every block drifts from what was admitted. The golden file is
// the lab's own output (lib/lab/tokens.ts) at the snapshot's commit; regenerate it with the canon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontHrefs, paletteTokens } from '../skills/struq/scripts/tokens.mjs';
import { approvedProject } from './treatment.mjs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const CANON = JSON.parse(read('../skills/struq/canon/canon.json'));
const GOLDEN = JSON.parse(read('./fixtures/lab-tokens.json'));
const CANON_CLI = fileURLToPath(new URL('../skills/struq/scripts/canon.mjs', import.meta.url));

test('the token block and font URLs match the lab, value for value', () => {
  for (const g of GOLDEN.combos) {
    const p = CANON.palettes.find((x) => x.id === g.palette);
    const t = CANON.pairings.find((x) => x.id === g.pairing);
    const mine = Object.fromEntries(paletteTokens(p, t).map(([k, v]) => [k === 'color-scheme' ? 'colorScheme' : k, v]));
    assert.deepEqual(mine, g.tokens, `${g.palette} + ${g.pairing}`);
    assert.deepEqual(fontHrefs(t, CANON), g.hrefs, `${g.pairing} fonts`);
  }
});

test('the canon snapshot carries the palette values the lab used', () => {
  for (const g of GOLDEN.combos) {
    const p = CANON.palettes.find((x) => x.id === g.palette);
    assert.equal(p.colors.background, g.tokens['--surface-0']);
    assert.equal(p.colors.text, g.tokens['--ink']);
    assert.equal(p.colors.accent, g.tokens['--accent']);
  }
});

test('every pairing face has a provider and asks Google only for weights it ships', () => {
  for (const t of CANON.pairings) {
    for (const href of fontHrefs(t, CANON)) {
      const range = href.match(/wght@(?:1,)?(\d+)\.\.(\d+)/);
      if (!range) continue;
      const family = decodeURIComponent(href.match(/family=([^:&]+)/)[1]).replace(/\+/g, ' ');
      assert.deepEqual([Number(range[1]), Number(range[2])], CANON.fontWeights[family], family);
    }
  }
});

test('canon.mjs palette and type rewrite the one block and write the font links', () => {
  const dir = mkdtempSync(join(tmpdir(), 'struq-canon-'));
  mkdirSync(join(dir, 'app'));
  approvedProject(dir); // palette and type wait for a passing plan and the logged reply
  writeFileSync(join(dir, 'app', 'globals.css'), read('../skills/struq/recipes/app/globals.css'));
  const run = (...a) => spawnSync(process.execPath, [CANON_CLI, ...a, '--dir', dir], { encoding: 'utf8' });
  assert.match(run('palette', 'frontier-olea-flour-terracotta').stdout, /OK palette written/);
  assert.match(run('type', 'condensed-poster').stdout, /OK type written/);
  const css = readFileSync(join(dir, 'app', 'globals.css'), 'utf8');
  assert.equal(css.match(/STRUQ TOKENS/g).length, 1);
  assert.match(css, /palette frontier-olea-flour-terracotta, type condensed-poster/);
  const golden = GOLDEN.combos.find((g) => g.pairing === 'condensed-poster');
  for (const [k, v] of Object.entries(golden.tokens)) assert.ok(css.includes(`${k === 'colorScheme' ? 'color-scheme' : k}: ${v};`), k);
  const fonts = readFileSync(join(dir, 'app', 'fonts.ts'), 'utf8');
  for (const h of golden.hrefs) assert.ok(fonts.includes(h), h);
  assert.equal(run('palette', 'no-such-palette').status, 1);
});
