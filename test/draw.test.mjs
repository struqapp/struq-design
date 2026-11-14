// why: shuffling the lists and naming the reflex did not stop the reflex: 8 of 10 trial runs then fled Fraunces to the
// same grotesk. The draw deals each site its own hand of pairings and palettes, and the plan check holds the
// treatment to it, so two sites start from different places while the agent still makes the choice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = fileURLToPath(new URL('../skills/struq/scripts/', import.meta.url));
const run = (script, args, cwd) => spawnSync(process.execPath, [join(SCRIPTS, script), ...args, '--dir', cwd], { encoding: 'utf8' });
const CANON = JSON.parse(readFileSync(fileURLToPath(new URL('../skills/struq/canon/canon.json', import.meta.url)), 'utf8'));

test('draw deals three open pairings and four open palettes, and saves the hand', () => {
  const dir = mkdtempSync(join(tmpdir(), 'struq-draw-'));
  const out = run('canon.mjs', ['draw'], dir);
  assert.equal(out.status, 0, out.stderr);
  const hand = JSON.parse(readFileSync(join(dir, '.struq', 'draw.json'), 'utf8'));
  assert.equal(hand.pairings.length, 3);
  assert.equal(hand.palettes.length, 4);
  const kept = new Set([...CANON.palettes, ...CANON.pairings].filter((x) => x.autoPick === false).map((x) => x.id));
  for (const id of [...hand.pairings, ...hand.palettes]) assert.ok(!kept.has(id), `${id} is kept out`);
});

test('the plan check fails a Palette or Type outside the hand, and passes the hand or a brand line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'struq-draw-'));
  mkdirSync(join(dir, '.struq'));
  writeFileSync(join(dir, '.struq', 'draw.json'), JSON.stringify({ palettes: ['terracotta-sand'], pairings: ['newsreader-classic'] }));
  writeFileSync(join(dir, 'STRUQ.md'), 'Palette: stone-forest (x)\nType: serif-editorial: Fraunces + Urbanist\n');
  const off = run('check.mjs', ['--plan'], dir).stdout;
  assert.match(off, /off-draw: Palette stone-forest/);
  assert.match(off, /off-draw: Type serif-editorial/);
  writeFileSync(join(dir, 'STRUQ.md'), 'Palette: terracotta-sand (x)\nType: serif-editorial (brand): Fraunces + Urbanist\n');
  assert.doesNotMatch(run('check.mjs', ['--plan'], dir).stdout, /off-draw/);
});
