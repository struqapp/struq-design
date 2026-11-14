// why: the arcs used to live only in SKILL.md prose, so an agent copied a storyboard by hand and small models dropped
// the quiet scenes or doubled a loud one. blocks.mjs arc prints the arc from film.json, the product's own data. Since
// 2026-11-14 it prints no picks: a pre-filled default made every site open the same way, so the printed arc fails the
// plan check until the agent casts it, and a cast arc must pass. The kit's quiet scenes (Statement, PhotoText, Rows, Close)
// stand where a block would on that storyboard, so add, the gate and init must all treat them as known kit parts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedProject } from './treatment.mjs';

const BLOCKS_DIR = fileURLToPath(new URL('../skills/struq/blocks/', import.meta.url));
const CLI = fileURLToPath(new URL('../skills/struq/scripts/blocks.mjs', import.meta.url));
const CHECK = fileURLToPath(new URL('../skills/struq/scripts/check.mjs', import.meta.url));
const SKILL = fileURLToPath(new URL('../skills/struq/SKILL.md', import.meta.url));
const film = JSON.parse(readFileSync(join(BLOCKS_DIR, 'film.json'), 'utf8'));
const LANGUAGES = film.FILM_LANGUAGES.map((l) => l.id);

const blocks = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8' });
const tmp = (name) => mkdtempSync(join(tmpdir(), `struq-${name}-`));
function nextProject() {
  const dir = tmp('arc');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { next: '16.0.0' } }));
  return dir;
}

/** The printed Tone arc and numbered Storyboard lines, as they would be pasted into STRUQ.md. */
function printedBoard(language) {
  // A fresh project each time: arc deals the opening and centerpiece hands into <project>/.struq/draw.json.
  const r = blocks('arc', language, '--dir', tmp('board'));
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n');
  const tone = lines.find((l) => l.startsWith('Tone arc: '));
  const board = lines.filter((l) => /^\d+\.\s/.test(l));
  return { out: r.stdout, tone, board };
}

/**
 * The printed lines as an agent casts them: each `<cast: ...>` replaced by the arc's own suggestion for that scene with
 * its tag and a reason, the options list deleted, the footer picked. The printed lines carry no pick of their own.
 */
function castBoard(language) {
  const { board } = printedBoard(language);
  const arc = film.FILM_ARCS.find((a) => a.language === language);
  return board.map((line, at) => {
    const scene = arc.scenes[at];
    const pick = scene.own && scene.kit ? scene.kit : scene.blocks[0] ?? scene.kit ?? 'own scene';
    return line
      .replace(/\(<loud\|quiet>\) <cast: [^>]*>/, `(${scene.tag}) ${pick} because the fixture says so`)
      .replace(/ \| options: [^|]*/, '')
      .replace(/footer: <([^|>]+)[^>]*>/, (_, first) => `footer: ${first.trim()}`);
  });
}

/** A minimal treatment head above a cast storyboard; the centerpiece is the arc's own centerpiece suggestion. */
function planFor(language) {
  const { tone } = printedBoard(language);
  const board = castBoard(language);
  const spec = film.FILM_LANGUAGES.find((l) => l.id === language);
  const centerpiece = film.FILM_ARCS.find((a) => a.language === language).scenes.find((s) => s.name === 'Centerpiece').blocks[0];
  return `# STRUQ.md: arc fixture
Brief: a client in the ${spec.for[0]} sector
Idea: The work is the proof.
Unlike: the sector's template -> one shape that returns
Language: ${language}
Motif: ${spec.motifs[0]}: one shape that returns down the page
Lexicon: werk, plaats, maat
Palette: frontier-mizu-greige-bronze (calm)
Type: serif-editorial: Fraunces + Urbanist
Images: pack vitrine
Centerpiece: ${centerpiece}: the one moment
${tone}
Storyboard:
${board.join('\n')}
Assumptions: none
`;
}

test('film.json carries the three languages and an arc for each, as arcs.ts exports them', () => {
  assert.deepEqual(LANGUAGES, ['weight', 'cut', 'curtain']);
  assert.deepEqual(film.FILM_ARCS.map((a) => a.language), LANGUAGES);
  for (const key of ['FILM_HEADER', 'ARC_RULES', 'FILM_BUDGETS']) assert.ok(film[key].length, key);
  for (const arc of film.FILM_ARCS) {
    for (const s of arc.scenes) {
      assert.ok(['frame', 'loud', 'quiet'].includes(s.tag), `${arc.language} ${s.name}`);
      assert.ok(s.blocks.length || s.own, `${arc.language} ${s.name} has no block and no own scene`);
    }
  }
});

// why: SKILL.md keeps one short arc per language for the agent that never runs `arc`. Written by hand, it drifted from
// the data before: a block the data had dropped stayed in the prose, and a small model built from the prose.
/** SKILL.md's arc for a language: its numbered lines under the bold `**<language>.**` line. */
function skillArc(language, text = readFileSync(SKILL, 'utf8')) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith(`**${language}.**`));
  if (at < 0) return [];
  const arc = [];
  for (const line of lines.slice(at + 1)) {
    if (/^\d+\.\s/.test(line)) arc.push(line);
    else if (/^\s+\S/.test(line) && arc.length) arc[arc.length - 1] += ` ${line.trim()}`;
    else break;
  }
  return arc;
}

/** The backticked names on an arc line, a bare `:variant` read against the slug before it. */
function namesOn(line) {
  const names = [];
  for (const [, token] of line.matchAll(/`([^`]+)`/g)) {
    const last = names.at(-1);
    names.push(token.startsWith(':') && last ? `${last.split(':')[0]}${token}` : token);
  }
  return names;
}

/** Every way a hand-written arc departs from film.json's arc for that language, as readable lines. */
function arcProblems(language, lines) {
  const arc = film.FILM_ARCS.find((a) => a.language === language);
  if (lines.length !== arc.scenes.length) return [`${language}: ${lines.length} scenes, film.json has ${arc.scenes.length}`];
  const known = new Set(arc.scenes.flatMap((s) => [...s.blocks, ...(s.footer ?? []), ...(s.kit ? [s.kit] : [])]));
  const bases = new Set([...known].map((b) => b.split(':')[0]));
  const problems = [];
  arc.scenes.forEach((scene, i) => {
    const line = lines[i];
    if (!new RegExp(`^${i + 1}\\. ${scene.name} \\(${scene.tag}\\b`).test(line)) problems.push(`${language}: line ${i + 1} is not ${scene.name} (${scene.tag})`);
    const names = namesOn(line);
    for (const name of names) {
      if (!(known.has(name) || (!name.includes(':') && bases.has(name)))) problems.push(`${language} ${scene.name}: ${name} is not in film.json's ${language} arc`);
    }
    // The scene's own picks keep the order arc prints: blocks first, or the kit scene first where the data says so.
    const own = scene.own && scene.kit ? [scene.kit] : [];
    const options = scene.own && (scene.ownFirst || !scene.blocks.length) ? [...own, ...scene.blocks] : [...scene.blocks, ...own];
    const picks = names.filter((n) => options.includes(n));
    if (picks[0] !== options[0]) problems.push(`${language} ${scene.name}: the first pick is ${options[0]} in film.json, not ${picks[0]}`);
    if (picks.join() !== options.filter((o) => picks.includes(o)).join()) problems.push(`${language} ${scene.name}: picks out of film.json's order`);
    for (const footer of scene.footer ?? []) if (!names.includes(footer)) problems.push(`${language} ${scene.name}: footer ${footer} missing`);
  });
  return problems;
}

// exp/b-compact: the compact SKILL.md drops the hand-written arcs on purpose; blocks.mjs arc prints them.
test.skip('every block and kit scene a SKILL.md arc names is in that language\'s arc in film.json, in its order', () => {
  for (const language of LANGUAGES) {
    const lines = skillArc(language);
    assert.ok(lines.length, `SKILL.md has no **${language}.** arc`);
    assert.deepEqual(arcProblems(language, lines), [], language);
  }
});

test.skip('the arc comparison fails a block the language\'s arc does not hold, a swapped default and a dropped scene', () => {
  const weight = skillArc('weight');
  const foreign = weight.map((l, i) => (i === 0 ? l.replace('`preloader-stack`', '`preloader-gate`') : l));
  assert.match(arcProblems('weight', foreign).join('\n'), /preloader-gate is not in film\.json's weight arc/);
  const swapped = weight.map((l, i) => (i === 4 ? '5. Approach (quiet): `Rows` or `approach:schuif`.' : l));
  assert.match(arcProblems('weight', swapped).join('\n'), /the first pick is approach:schuif/);
  assert.match(arcProblems('weight', weight.slice(1)).join('\n'), /7 scenes, film\.json has 8/);
  assert.deepEqual(namesOn('`hero-framed:wand` or `:portret`'), ['hero-framed:wand', 'hero-framed:portret']);
});

test('arc with no language lists the three with their sectors', () => {
  const r = blocks('arc');
  assert.equal(r.status, 0, r.stderr);
  for (const l of film.FILM_LANGUAGES) assert.match(r.stdout, new RegExp(`^${l.id}\\s+${l.for.join(', ')}$`, 'm'));
  assert.equal(blocks('arc', 'film').status, 1);
});

test('arc prints one storyboard line per scene, the frames and how to use it', () => {
  for (const language of LANGUAGES) {
    const { out, tone, board } = printedBoard(language);
    const arc = film.FILM_ARCS.find((a) => a.language === language);
    assert.equal(board.length, arc.scenes.length, language);
    assert.equal(tone, `Tone arc: ${arc.scenes.map((s) => s.tone[0]).join(', ')}`);
    arc.scenes.forEach((s, at) => {
      // why: with a pick pre-filled, 11 of 12 proof sites on two unrelated briefs opened the same way (2026-11-14).
      // Only the arrival, a frame of the language, comes filled; every other scene is left to the agent to cast.
      if (s.tag === 'frame') assert.match(board[at], new RegExp(`^${at + 1}\\.\\s+${s.name}\\s+\\(frame\\)\\s+\\S`), board[at]);
      else assert.match(board[at], new RegExp(`^${at + 1}\\.\\s+${s.name}\\s+\\(<loud\\|quiet>\\) <cast: `), board[at]);
      if (s.footer) assert.match(board[at], new RegExp(`\\| footer: <${s.footer[0]}`));
    });
    assert.match(board[0], /\| lands on: <what>$/);
    assert.match(board.at(-1), /\| echoes the opening: <how>/);
    const frames = film.FILM_LANGUAGES.find((l) => l.id === language).frames;
    assert.ok(out.includes(`preloader ${frames.preloader}`) && out.includes(frames.pageTransition) && out.includes(frames.menu), out);
    assert.match(out, /^Use: .*check\.mjs --plan\.$/m);
  }
  // why: listing the whole catalogue, even shuffled, still drew most sites to two or three openings (2026-11-14). The
  // Opening and the Centerpiece offer a hand of five blocks of their role, from any language, dealt per project.
  const catalog = JSON.parse(readFileSync(join(BLOCKS_DIR, 'catalog.json'), 'utf8'));
  const list = Array.isArray(catalog) ? catalog : catalog.blocks;
  for (const language of LANGUAGES) {
    const { board } = printedBoard(language);
    const at = (name) => board.find((l) => new RegExp(`^\\d+\\.\\s+${name}\\s`).test(l));
    for (const [name, role] of [['Opening', 'opening'], ['Centerpiece', 'centerpiece']]) {
      const options = at(name).match(/options: ([^|]*)/)[1].split(', ').map((o) => o.split(/[: ]/)[0]);
      const slugs = new Set(options);
      assert.equal(slugs.size, 5, `${language} ${name}: ${[...slugs].join(', ')}`);
      for (const slug of slugs) assert.equal(list.find((b) => b.slug === slug)?.role, role, `${slug} is not an ${role}`);
    }
  }
});

test('the printed storyboard fails the plan check until every scene is cast', () => {
  const dir = tmp('arc-uncast');
  const { tone, board } = printedBoard('weight');
  writeFileSync(join(dir, 'STRUQ.md'), planFor('weight').replace(/Storyboard:\n[\s\S]*?\nAssumptions/, `Storyboard:\n${board.join('\n')}\nAssumptions`).replace(/Tone arc: .*/, tone));
  const r = spawnSync(process.execPath, [CHECK, '--plan'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /^FAIL uncast-slot: /m);
});

test('a plan without an Unlike line warns', () => {
  const dir = tmp('arc-unlike');
  writeFileSync(join(dir, 'STRUQ.md'), planFor('cut').replace(/^Unlike: .*\n/m, ''));
  const r = spawnSync(process.execPath, [CHECK, '--plan'], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout, /^WARN no-unlike: /m);
});

test('a cast storyboard of every language passes check.mjs --plan without a quiet or loud warning', () => {
  for (const language of LANGUAGES) {
    const dir = tmp('arc-plan');
    writeFileSync(join(dir, 'STRUQ.md'), planFor(language));
    mkdirSync(join(dir, 'app'));
    writeFileSync(join(dir, 'app', 'page.tsx'), 'export default function Page() { return null; }\n');
    const r = spawnSync(process.execPath, [CHECK, '--plan'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, `${language}\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /^PLAN: PASS$/m, language);
    assert.ok(!/^FAIL /m.test(r.stdout), `${language}\n${r.stdout}`);
    for (const id of ['quiet-is-quiet', 'loud-adjacent', 'quiet-share']) assert.ok(!r.stdout.includes(id), `${language}: ${id}\n${r.stdout}`);
  }
});

test('init brings the quiet scenes to components/struq/kit/quiet, importable from its index', () => {
  const dir = nextProject();
  const r = blocks('init', '--dir', dir, '--no-install');
  assert.equal(r.status, 0, r.stderr);
  const quiet = join(dir, 'components', 'struq', 'kit', 'quiet');
  for (const f of ['Statement.tsx', 'PhotoText.tsx', 'Rows.tsx', 'Close.tsx', 'sheet.ts', 'index.ts']) assert.ok(existsSync(join(quiet, f)), f);
  const index = readFileSync(join(quiet, 'index.ts'), 'utf8');
  for (const name of ['Statement', 'PhotoText', 'Rows', 'Close']) assert.match(index, new RegExp(`export \\{ ${name} \\} from "\\./${name}"`));
  // Everything a quiet scene imports from the kit arrives with it.
  for (const f of ['MediaFrame.tsx', 'Reveal.tsx', 'SplitHeadline.tsx', 'gsap.ts', 'images.ts']) assert.ok(existsSync(join(dir, 'components', 'struq', 'kit', f)), f);
  const css = readFileSync(join(dir, 'components', 'struq', 'kit', 'blocks.css'), 'utf8');
  assert.match(css, /\.struq-line-mask/);
  assert.match(css, /\.struq-char-mask/);
});

test('add <kit scene> says it is in the kit and how to import it, installs nothing, and exits 0', () => {
  const dir = nextProject();
  for (const name of ['Statement', 'PhotoText', 'Rows', 'Close']) {
    const r = blocks('add', name, '--dir', dir, '--no-install');
    assert.equal(r.status, 0, r.stderr);
    const lines = r.stdout.trim().split('\n');
    assert.equal(lines.length, 1, r.stdout);
    assert.equal(lines[0], `${name} is a kit quiet scene, already in components/struq/kit/quiet/ (blocks.mjs init): import { ${name} } from "@/components/struq/kit/quiet";`);
  }
  // No plan and no approval in this project: a kit scene never reaches the gate, and nothing was written.
  assert.ok(!existsSync(join(dir, 'components')));
});

test('the gate takes a storyboard that names kit quiet scenes, and add installs the blocks beside them', () => {
  const dir = nextProject();
  writeFileSync(join(dir, 'STRUQ.md'), planFor('weight'));
  approvedProject(dir, { plan: null });
  const r = blocks('add', 'Statement', 'preloader-stack', 'hero-framed', '--dir', dir, '--no-install');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^Statement is a kit quiet scene/m);
  assert.match(r.stdout, /OK blocks added/);
  // A kit scene that is not on the storyboard is no unnamed block either: it was copied by init, never by add.
  const other = blocks('add', 'Rows', '--dir', dir, '--no-install');
  assert.equal(other.status, 0, other.stderr);
  assert.ok(!/storyboard does not name/.test(other.stderr));
});
