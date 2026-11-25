// why: two Haiku builds of 2026-11-16 (plumber, skill 0.5.4) logged their steps and left the Build checklist open, so
// check.mjs failed on lines whose work was done. Logging a step now ticks its line; step 2 waits for the user's own
// reply, step 7 for the art-direction asks, and step 8 stays check.mjs's own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG = fileURLToPath(new URL('../skills/struq/scripts/log.mjs', import.meta.url));
const CHECK = fileURLToPath(new URL('../skills/struq/scripts/check.mjs', import.meta.url));

const CHECKLIST = `# STRUQ.md: fixture

## Build checklist
- [ ] 1 Project: Next.js App Router + Tailwind v4; blocks.mjs init printed OK
- [ ] 2 Treatment and approval: the treatment in STRUQ.md, the plan check at PLAN: PASS; the one stop sent and answered
- [ ] 3 Canon: the token block and fonts written (canon.mjs palette and type, or struq_direction)
- [ ] 4 Images: images.mjs --brief printed OK; only photos whose alt fits the client
- [ ] 5 Scenes: frames and the centerpiece installed
- [ ] 6 Build: npm run build passes
- [ ] 7 Look: LOOK: PASS on the served build; a fresh subagent's asks in .struq/art-direction.md each answered
- [ ] 8 Check: check.mjs prints RESULT: PASS
`;

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'struq-log-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', dependencies: { next: '16.0.0' } }));
  writeFileSync(join(dir, 'STRUQ.md'), CHECKLIST);
  return dir;
}
const log = (dir, ...a) => spawnSync(process.execPath, [LOG, ...a, '--dir', dir], { encoding: 'utf8' });
const open = (dir) => [...readFileSync(join(dir, 'STRUQ.md'), 'utf8').matchAll(/^- \[ \] (\d)/gm)].map((m) => Number(m[1]));

test('logging a step ticks its checklist line and says so', () => {
  const dir = project();
  const r = log(dir, 'Step 3 Canon', 'palette and type written', 'from the hand');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Step 3 is ticked in STRUQ\.md\./);
  assert.deepEqual(open(dir), [1, 2, 4, 5, 6, 7, 8]);
  // A step logged earlier, before STRUQ.md held the checklist (init writes Step 1), is ticked by the next entry.
  writeFileSync(join(dir, 'STRUQ.md'), CHECKLIST);
  log(dir, 'Step 6 Build', 'npm run build passes');
  assert.deepEqual(open(dir), [1, 2, 4, 5, 7, 8]);
});

test('step 2 waits for the reply, step 7 for the art-direction asks, step 8 is never ticked', () => {
  const dir = project();
  log(dir, 'Step 2 Treatment', 'the treatment in STRUQ.md');
  assert.ok(open(dir).includes(2), 'a treatment alone is not the approval');
  log(dir, 'Step 2 Approval', 'Asked: Akkoord?', 'Reply: "Ja, bouw maar."');
  assert.ok(!open(dir).includes(2));
  const seven = log(dir, 'Step 7 Look', 'LOOK: PASS');
  assert.ok(open(dir).includes(7));
  assert.match(seven.stdout, /Step 7 stays open in STRUQ\.md until \.struq\/art-direction\.md/);
  mkdirSync(join(dir, '.struq'), { recursive: true });
  writeFileSync(join(dir, '.struq', 'art-direction.md'), '1. Larger opener.\n   Built: the opener at poster size.\n');
  log(dir, 'Step 7 Art direction', 'round 1 answered');
  assert.ok(!open(dir).includes(7));
  log(dir, 'Step 8 Check', 'RESULT: PASS');
  assert.ok(open(dir).includes(8));
});

test('check.mjs ticks the steps the log already holds before it reads the plan', () => {
  const dir = project();
  writeFileSync(join(dir, 'STRUQ-LOG.md'), '# STRUQ-LOG.md: fixture\n\n## Step 1 Project (1 Nov 2026, 10:00)\nblocks.mjs init.\n\n## Step 4 Images (1 Nov 2026, 10:05)\nimages.mjs --brief printed OK.\n');
  const out = spawnSync(process.execPath, [CHECK, '--dir', dir, '--no-log'], { encoding: 'utf8' }).stdout;
  assert.deepEqual(open(dir), [2, 3, 5, 6, 7, 8]);
  const line = out.split('\n').find((l) => l.includes('Build checklist item(s) not ticked'));
  assert.match(line, /5 Build checklist item\(s\) not ticked/, out);
});
