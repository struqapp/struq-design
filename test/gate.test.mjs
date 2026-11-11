// why: six small-model runs showed the approval stop was advice: three ran canon.mjs and blocks.mjs add straight
// through, once before STRUQ.md existed, and one installed a menu it never used. The stop is the product's one veto,
// so the scripts hold it: nothing is installed or written before the plan passes and the reply is logged, and add
// takes only what the storyboard names, in the site's language. A refusal is two lines: the reason, then what next.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEIGHT_BOARD, approvedProject, treatment } from './treatment.mjs';

const BLOCKS = fileURLToPath(new URL('../skills/struq/scripts/blocks.mjs', import.meta.url));
const CANON = fileURLToPath(new URL('../skills/struq/scripts/canon.mjs', import.meta.url));
const RECIPE_CSS = fileURLToPath(new URL('../skills/struq/recipes/app/globals.css', import.meta.url));

function project(options) {
  const dir = mkdtempSync(join(tmpdir(), 'struq-gate-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { next: '16.0.0' } }));
  approvedProject(dir, options);
  writeFileSync(join(dir, 'app', 'globals.css'), readFileSync(RECIPE_CSS, 'utf8'));
  return dir;
}
const add = (dir, ...slugs) => spawnSync(process.execPath, [BLOCKS, 'add', ...slugs, '--dir', dir, '--no-install'], { encoding: 'utf8' });
const canon = (dir, ...a) => spawnSync(process.execPath, [CANON, ...a, '--dir', dir], { encoding: 'utf8' });
const installed = (dir) => existsSync(join(dir, 'components', 'struq'));

/** A refusal: exit 1, nothing on stdout, exactly two lines on stderr (the reason, then Next:). */
function refused(r, reason, next) {
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const lines = r.stderr.trim().split('\n');
  assert.equal(lines.length, 2, r.stderr);
  assert.match(lines[0], /^FAIL /);
  assert.match(lines[0], reason);
  assert.match(lines[1], /^Next: /);
  assert.match(lines[1], next);
}

test('add refuses without STRUQ.md, and with a plan that fails the plan check', () => {
  const none = project({ plan: null });
  refused(add(none, 'preloader-stack'), /No STRUQ\.md/, /check\.mjs" --plan until PLAN: PASS/);
  assert.ok(!installed(none));

  const two = WEIGHT_BOARD.map((s) => (s.startsWith('Approach') ? 'Approach (loud) film-strip | on screen: the steps' : s));
  const failing = project({ plan: treatment({ board: two }) });
  refused(add(failing, 'preloader-stack'), /does not pass: one-centerpiece/, /until PLAN: PASS/);
  assert.ok(!installed(failing));
});

test('add refuses until the reply to the treatment is logged', () => {
  const dir = project({ approved: false });
  refused(add(dir, 'preloader-stack'), /no Step 2 Approval entry/, /send the treatment to the user and stop.*"Step 2 Approval"/i);
  writeFileSync(join(dir, 'STRUQ-LOG.md'), '# log\n\n## Step 2 Approval (1 Nov 2026, 10:02)\nAsked: Akkoord?\n');
  refused(add(dir, 'preloader-stack'), /no Step 2 Approval entry/, /Reply:/);
  assert.ok(!installed(dir));
});

test('add refuses every block the storyboard does not name, installs none of the call, and names the scene lines', () => {
  const dir = project();
  const r = add(dir, 'preloader-stack', 'hover-list', 'image-trail');
  refused(r, /hover-list \(the storyboard does not name it\); image-trail \(the storyboard does not name it\)/, /asked for hover-list or image-trail, put it on a scene line/);
  assert.match(r.stderr, /The storyboard names 1 Arrival: preloader-stack, 2 Opening: hero-framed:wand, .*6 Centerpiece: image-to-fullbleed/);
  assert.ok(!installed(dir), 'nothing goes in when one slug is refused');
});

test('add refuses a block of another language, the menu included', () => {
  const board = WEIGHT_BOARD.map((s) => (s.startsWith('Arrival') ? 'Arrival (frame) preloader-wordmark:settle | lands on: the print' : s));
  const dir = project({ plan: treatment({ board }) });
  refused(add(dir, 'preloader-wordmark:drop'), /preloader-wordmark:drop \(it belongs to the cut language and the site's Language is weight\)/, /of the weight language/);
  refused(add(dir, 'menu-curtain:gate'), /menu-curtain:gate \(the storyboard does not name it; it belongs to the curtain language/, /weight language/);
  assert.ok(!installed(dir));
});

test('add refuses a page transition until the site has a second route', () => {
  const board = WEIGHT_BOARD.map((s) => (s.startsWith('Arrival') ? 'Arrival (frame) preloader-stack, page-transition-stack | lands on: the print' : s));
  const one = project({ plan: treatment({ board }) });
  refused(add(one, 'page-transition-stack'), /a page transition needs two routes and app\/ holds 1 page\.tsx/, /second page\.tsx/);
  const two = project({ plan: treatment({ board }), pages: 2 });
  assert.equal(add(two, 'page-transition-stack').status, 0);
});

test('add installs what the storyboard names, plus the header and the menu of the language', () => {
  const dir = project();
  const r = add(dir, 'preloader-stack', 'hero-framed:wand', 'image-to-fullbleed', 'wordmark-finale', 'header-bar', 'menu-curtain');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK blocks added/);
  for (const f of ['preloaders/preloader-stack.tsx', 'heroes/hero-framed.tsx', 'headers/menu-curtain.tsx']) {
    assert.ok(existsSync(join(dir, 'components', 'struq', f)), f);
  }
});

test('canon.mjs palette and type wait for the same stop; list never asks', () => {
  const none = project({ plan: null });
  refused(canon(none, 'palette', 'frontier-mizu-greige-bronze'), /canon\.mjs palette, nothing written: No STRUQ\.md/, /until PLAN: PASS/);
  const waiting = project({ approved: false });
  refused(canon(waiting, 'type', 'serif-editorial'), /canon\.mjs type, nothing written: The treatment is not approved/, /"Step 2 Approval"/);
  assert.ok(!existsSync(join(waiting, 'app', 'fonts.ts')));
  assert.equal(canon(none, 'list').status, 0);
  assert.match(canon(project(), 'palette', 'frontier-mizu-greige-bronze').stdout, /OK palette written/);
});

test('blocks.mjs init and list never ask for the plan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'struq-gate-init-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { next: '16.0.0' } }));
  mkdirSync(join(dir, 'app'));
  assert.equal(spawnSync(process.execPath, [BLOCKS, 'init', '--dir', dir, '--no-install']).status, 0);
  assert.equal(spawnSync(process.execPath, [BLOCKS, 'list', '--dir', dir]).status, 0);
});
