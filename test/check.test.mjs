// why: check.mjs is the gate a model must pass before it may say done. These fixtures pin what a block-built site
// owes its blocks (the gate, the tokens, a hero with its photo, a header, a footer, one contrast scene) and the tells
// the earlier rounds showed slip through: the approval stop as a logged reply, generic CTAs, stat banners, eyebrows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK = fileURLToPath(new URL('../skills/struq/scripts/check.mjs', import.meta.url));

const LOG_OK = `# STRUQ-LOG.md: fixture

## Step 1 Project (1 Nov 2026, 10:00)
Brief received.

## Step 2 Direction (1 Nov 2026, 10:01)
Canon picks written.

## Step 2 Approval (1 Nov 2026, 10:02)
Asked: Akkoord? Heb je een logo, foto's of echte cijfers, stuur ze nu.
Reply: "akkoord, bouw maar"
`;

const LAYOUT_OK = `import { SmoothScroll } from "../components/struq/kit/SmoothScroll";
export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <head><script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('sq-js')" }} /></head>
      <body data-blocks=""><SmoothScroll>{children}</SmoothScroll></body>
    </html>
  );
}
`;

const PAGE_OK = `import { HeaderBar } from "@/components/struq/headers/header-bar";
import { HeroStill } from "@/components/struq/heroes/hero-still";
import { FooterReveal } from "@/components/struq/footers/footer-reveal";
import { images } from "@/lib/struq-images";
export default function Page() {
  return (
    <>
      <HeaderBar name="Zout" />
      <HeroStill image={images.hero[0]} lines={["Vis en groente,", "van het seizoen."]} />
      <section className="scene-inverse"><p>Een zaal aan het water.</p></section>
      <FooterReveal />
    </>
  );
}
`;

const SMOOTH = 'import Lenis from "lenis";\nconst l = new Lenis({ autoRaf: false });\ngsap.ticker.add(() => l.raf(0));\nconst q = "(prefers-reduced-motion: reduce)";\n';
const SCENES = [
  'Arrival (frame) preloader-stack | lands on: the hero photo',
  'Opening (loud) hero-still:still | on screen: the dining room at dusk',
  'Statement (quiet) own scene | on screen: one sentence at 14vw',
  'About (quiet) about-studio:wandeling | on screen: who cooks here',
  'Approach (quiet) own hairline rows | on screen: the four seasons',
  'Centerpiece (loud) image-to-fullbleed | on screen: the room opening',
  'Release (quiet) own scene | on screen: a photo and two sentences',
  'Close (quiet) own scene | echoes the opening | footer: footer-reveal',
];
const board = (n) => SCENES.slice(0, n).map((s, i) => `${i + 1}. ${s}`).join('\n');
const PLAN = `# STRUQ.md: fixture
Idea: Een zaal aan het water, waar het seizoen het menu schrijft.
Language: weight
Motif: frame: the window onto the harbour
Lexicon: getij, seizoen, kade
Palette: midnight-brass
Type: serif-editorial
Images: pack proof
Centerpiece: image-to-fullbleed: the room opens onto the water
Tone arc: paper, paper, paper, paper, paper, ink, paper, paper
Storyboard:
${board(8)}
Assumptions: none

## Build checklist
- [x] 1 Project
- [x] 2 Treatment and approval
`;

function fixture({ log = LOG_OK, page = PAGE_OK, extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'struq-check-'));
  const files = {
    'package.json': JSON.stringify({ name: 'fixture', dependencies: { next: '16.0.0', gsap: '3.13.0', '@gsap/react': '2.1.2', lenis: '1.3.0' } }),
    'STRUQ.md': PLAN,
    'app/layout.tsx': LAYOUT_OK,
    'app/page.tsx': page,
    'components/struq/kit/SmoothScroll.tsx': SMOOTH,
    ...extra,
  };
  if (log !== null) files['STRUQ-LOG.md'] = log;
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

const run = (dir) => spawnSync(process.execPath, [CHECK, '--dir', dir, '--no-log'], { encoding: 'utf8' }).stdout;
const fails = (out, text) => out.split('\n').some((l) => l.includes('FAIL') && l.includes(text));
const warns = (out, text) => out.split('\n').some((l) => l.includes('WARN') && l.includes(text));

test('STRUQ.md carries the treatment: idea, language, motif, lexicon, centerpiece and a storyboard of seven to nine scenes', () => {
  const ok = run(fixture());
  assert.ok(!fails(ok, 'treatment in STRUQ.md lacks'));
  assert.ok(!fails(ok, 'numbered scene'));
  assert.ok(!fails(ok, 'does not record'));
  assert.ok(fails(run(fixture({ extra: { 'STRUQ.md': PLAN.replace(/^Lexicon:.*\n/m, '') } })), 'lacks: Lexicon:'));
  assert.ok(fails(run(fixture({ extra: { 'STRUQ.md': PLAN.replace(/^Centerpiece:.*\n/m, '') } })), 'lacks: Centerpiece:'));
  assert.ok(fails(run(fixture({ extra: { 'STRUQ.md': PLAN.replace('Language: weight', 'Language: cinematic') } })), 'lacks: Language:'));
  assert.ok(!fails(run(fixture({ extra: { 'STRUQ.md': PLAN.replace('Language: weight', 'Language: Curtain') } })), 'treatment in STRUQ.md lacks'));
  assert.ok(fails(run(fixture({ extra: { 'STRUQ.md': PLAN.replace(board(8), board(5)) } })), 'has 5 numbered scene'));
  assert.ok(!fails(run(fixture({ extra: { 'STRUQ.md': PLAN.replace(board(8), board(7)) } })), 'numbered scene'));
  const crlf = PLAN.replace(/\n/g, '\r\n');
  assert.ok(!fails(run(fixture({ extra: { 'STRUQ.md': crlf } })), 'numbered scene'));
});

test('a plan from before the treatment keeps its Order: line but fails the treatment', () => {
  const old = '# STRUQ.md: fixture\nPalette: midnight-brass\nType: serif-editorial\nImages: pack proof\nOrder: header-bar, hero-still, footer-reveal\n\n## Build checklist\n- [x] 1 Project\n';
  const out = run(fixture({ extra: { 'STRUQ.md': old } }));
  assert.ok(!fails(out, 'does not record'));
  assert.ok(fails(out, 'lacks: Idea:, Motif:, Lexicon:, Centerpiece:, Language:, Storyboard:'));
  assert.ok(fails(run(fixture({ extra: { 'STRUQ.md': old.replace(/^Order:.*\n/m, '') } })), 'does not record: Storyboard:'));
});

test('the approval stop must be logged with the user\'s own reply', () => {
  assert.ok(!fails(run(fixture()), 'Step 2 Approval'));
  const noEntry = LOG_OK.replace(/## Step 2 Approval[\s\S]*$/, '');
  assert.ok(fails(run(fixture({ log: noEntry })), 'Step 2 Approval'));
  const noReply = LOG_OK.replace('Reply: "akkoord, bouw maar"', 'Approval read as given by the build request.');
  assert.ok(fails(run(fixture({ log: noReply })), 'Step 2 Approval'));
});

test('the blocks need the gate in the layout and at least one block on the page', () => {
  const ok = run(fixture());
  assert.ok(!fails(ok, 'motion gate'));
  assert.ok(!fails(ok, 'No Struq block'));
  const noGate = LAYOUT_OK.replace("classList.add('sq-js')", "classList.add('js')");
  assert.ok(fails(run(fixture({ extra: { 'app/layout.tsx': noGate } })), 'motion gate'));
  const noScope = LAYOUT_OK.replace(' data-blocks=""', '');
  assert.ok(fails(run(fixture({ extra: { 'app/layout.tsx': noScope } })), 'motion gate'));
  const handBuilt = 'export default function Page() { return <section><h1 className="text-[16vw]">Zout</h1></section>; }\n';
  assert.ok(fails(run(fixture({ page: handBuilt })), 'No Struq block'));
});

test('a photo hero gets its photo, and a hand-built hero shows one at poster size', () => {
  assert.ok(!fails(run(fixture()), 'without its photo'));
  const bare = PAGE_OK.replace(' image={images.hero[0]}', '');
  assert.ok(fails(run(fixture({ page: bare })), 'without its photo'));
  const hand = 'import { MediaFrame } from "@/components/struq/kit/MediaFrame";\nexport default function Page() { return <section><h1 className="text-[16vw]">Zout</h1><MediaFrame image={images.hero[0]} /></section>; }\n';
  assert.ok(!fails(run(fixture({ page: hand })), 'Hero without a photo'));
  assert.ok(!fails(run(fixture({ page: hand })), 'under 10vw'));
  assert.ok(fails(run(fixture({ page: hand.replace('<MediaFrame image={images.hero[0]} />', '') })), 'Hero without a photo'));
  assert.ok(fails(run(fixture({ page: hand.replace('text-[16vw]', 'font-display text-display') })), 'under 10vw'));
});

test('every page has a header', () => {
  assert.ok(!fails(run(fixture()), 'No header'));
  const none = PAGE_OK.replace('      <HeaderBar name="Zout" />\n', '').replace(/^import \{ HeaderBar \}.*\n/m, '');
  assert.ok(fails(run(fixture({ page: none })), 'No header'));
  const own = none.replace('<>', '<><header><a href="/" data-wordmark="">Zout</a></header>');
  assert.ok(!fails(run(fixture({ page: own })), 'No header'));
});

test('the product is never modelled from primitives, also not in a scene beside the kit', () => {
  assert.ok(!fails(run(fixture()), 'Hand-built product geometry'));
  const bike = 'import * as THREE from "three";\nexport const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2));\nexport const wheel = new THREE.TorusGeometry(1, 0.1);\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Bike.tsx': bike } })), 'Hand-built product geometry'));
  assert.ok(fails(run(fixture({ extra: { 'components/struq/kit/scenes/bakfiets.ts': bike } })), 'Hand-built product geometry'));
});

test('generic CTAs and stat banners fail', () => {
  assert.ok(!fails(run(fixture()), 'Generic CTAs'));
  const cta = 'export const C = () => <a href="#contact">Neem contact op</a>;\nexport const D = () => <a href="#m">Meer informatie</a>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Cta.tsx': cta } })), 'Generic CTAs'));
  assert.ok(!fails(run(fixture()), 'Stat rows'));
  const stats = 'export const S = () => <div><span>20+</span><span>51+</span><span> 99% </span></div>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Stats.tsx': stats } })), 'Stat rows'));
});

test('glow fails; the shipped blocks are not scanned for tells', () => {
  const glow = 'export const G = () => <div className="shadow-[0_0_40px_var(--accent)]">x</div>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Glow.tsx': glow } })), 'Glow'));
  // A shipped block at its own path is trusted as admitted, even where its code would read as a tell out of context.
  const shipped = 'export const H = () => <span className="uppercase">NOORD</span>;\n';
  assert.ok(!fails(run(fixture({ extra: { 'components/struq/headers/header-bar.tsx': shipped } })), 'Eyebrows'));
});

test('a page without a contrast scene warns, more than two still fail', () => {
  assert.ok(!fails(run(fixture()), 'contrast scene'));
  const none = PAGE_OK.replace(' className="scene-inverse"', '');
  const out = run(fixture({ page: none }));
  assert.ok(!fails(out, 'contrast scene'));
  assert.ok(warns(out, 'No contrast scene'));
  const three = 'export const S = () => <><section className="scene-inverse" /><section className="scene-field" /></>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Scene.tsx': three } })), 'contrast scene'));
});

test('a heavy display weight passes only at its poster pairing', () => {
  const css = (w) => `html { font-size: clamp(1rem, 0.92rem + 0.2vw, 1.125rem); }\n[data-blocks] { --display-weight: ${w}; }\n`;
  assert.ok(!fails(run(fixture({ extra: { 'app/globals.css': css(300) } })), 'Display weight'));
  assert.ok(fails(run(fixture({ extra: { 'app/globals.css': css(800) } })), 'Display weight'));
  const poster = PLAN.replace('Type: serif-editorial', 'Type: condensed-poster');
  assert.ok(!fails(run(fixture({ extra: { 'app/globals.css': css(800), 'STRUQ.md': poster } })), 'Display weight'));
});

const moduleWith = (fit, entries) => `export const imagePack = "vitrine";\nexport const imageFit = "${fit}";\nexport const images = {\n  hero: [\n${entries.map((e) => `    { src: "${e.src}", alt: "${e.alt}", width: 10, height: 10, ratio: "16:9", description: "" },`).join("\n")}\n  ],\n  band: [], card: [], column: [], detail: [], backdrop: [],\n};\n`;

test('with no fitting photo a hero without one passes, and off-topic photos fail', () => {
  const bare = PAGE_OK.replace(' image={images.hero[0]}', '');
  const none = run(fixture({ page: bare, extra: { 'lib/struq-images.ts': moduleWith('none', []) } }));
  assert.ok(!fails(none, 'without its photo'));
  assert.ok(!fails(none, 'image placement'));
  const plan = PLAN.replace('# STRUQ.md: fixture\n', '# STRUQ.md: b\nBrief: lancering van een elektrische bakfiets in Utrecht\n');
  const off = run(fixture({ extra: { 'STRUQ.md': plan, 'lib/struq-images.ts': moduleWith('full', [{ src: '/images/hero-1.webp', alt: 'Ongeglazuurde vaas op kalksteen' }]) } }));
  assert.ok(fails(off, 'Off-topic photos'));
  const on = run(fixture({ extra: { 'STRUQ.md': plan, 'lib/struq-images.ts': moduleWith('full', [{ src: '/images/hero-1.webp', alt: 'Bakfiets op een natte straat in Utrecht' }]) } }));
  assert.ok(!fails(on, 'Off-topic photos'));
});

test('a display heading never sits in an overflow-hidden box', () => {
  const clipped = 'export const S = () => <div className="relative overflow-hidden"><h2 className="font-display text-h2">Fabriekspanden</h2></div>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Clip.tsx': clipped } })), 'Display heading clipped'));
  assert.ok(!fails(run(fixture()), 'Display heading clipped'));
});

// why: Roy's second gate build clipped descenders in many places. The kit's masks keep them now, so what is left is the
// agent's own heading: a clip on it, or on a box held to its line, cuts g, j, p and y with no error anywhere.
test('a heading of your own that clips its descenders fails, with SplitHeadline as the fix', () => {
  const cuts = (tsx) => fails(run(fixture({ extra: { 'components/Scene.tsx': tsx } })), 'Heading that cuts descenders');
  const out = run(fixture({ extra: { 'components/Scene.tsx': 'export const S = () => <h3 className="leading-tight overflow-hidden">Glazuur</h3>;\n' } }));
  assert.ok(fails(out, 'Heading that cuts descenders'), out);
  assert.match(out, /SplitHeadline or the \.struq-line-mask class/);
  assert.match(out, /components\/Scene\.tsx:1 /);
  assert.ok(cuts('export const S = () => <SplitHeadline as="h2" className="overflow-clip" text="Gegroeid" />;\n'));
  assert.ok(cuts('export const S = () => (\n  <div className="h-[1.1em] overflow-hidden">\n    <h2 className="text-h3">Jaargang</h2>\n  </div>\n);\n'));
  assert.ok(cuts('export const S = () => <span className="block overflow-hidden leading-none"><h4>Oven</h4></span>;\n'));
  // A clip on a tall box is no cut: a full-screen hero leaves its heading room. A clip on a plain box is the clipped
  // check's business, not this one's, and a box held to the line without a clip cuts nothing.
  assert.ok(!cuts('export const S = () => <section className="relative h-screen overflow-hidden"><h1 className="text-h3">Zout</h1></section>;\n'));
  assert.ok(!cuts('export const S = () => <div className="h-[100vh] overflow-hidden"><h1 className="text-h3">Zout</h1></div>;\n'));
  assert.ok(!cuts('export const S = () => <div className="overflow-hidden"><h3 className="text-h3">Glazuur</h3></div>;\n'));
  assert.ok(!cuts('export const S = () => <div className="h-12 leading-none"><h3>Glazuur</h3></div>;\n'));
  assert.ok(!cuts('export const S = () => <header className="h-16 overflow-hidden"><a href="/">Zout</a></header>;\n'));
  // The kit is never scanned: its SplitHeadline clips on purpose, inside a mask that leaves room under the baseline.
  const kit = 'export const SplitHeadline = () => <h2 className="overflow-hidden">x</h2>;\n';
  assert.ok(!fails(run(fixture({ extra: { 'components/struq/kit/SplitHeadline.tsx': kit } })), 'Heading that cuts descenders'));
  assert.ok(!fails(run(fixture()), 'Heading that cuts descenders'));
});

test('a heading of your own set under a leading of 0.9 warns', () => {
  const leading = (value) => run(fixture({ extra: { 'components/Scene.tsx': `export const S = () => <h1 className="text-display leading-[${value}]">Gevlochten</h1>;\n` } }));
  for (const value of ['0.8', '0.85', '.88']) assert.ok(warns(leading(value), 'Heading leading under 0.9'), value);
  for (const value of ['0.9', '0.95', '1']) assert.ok(!warns(leading(value), 'Heading leading under 0.9'), value);
  assert.ok(!warns(run(fixture()), 'Heading leading under 0.9'));
});

test('an image reference past the pack fails', () => {
  const mod = moduleWith('partial', [{ src: '/images/hero-1.webp', alt: 'Bakfiets in de stad' }]);
  const past = 'import { images } from "@/lib/struq-images";\nexport const M = () => <ManifestoScrub text="a {0} b" images={[images.hero[0], images.card[3]]} />;\n';
  assert.ok(fails(run(fixture({ extra: { 'lib/struq-images.ts': mod, 'components/M.tsx': past } })), 'past the pack'));
});

test('media captions may be small caps; section eyebrows may not', () => {
  const caption = 'export const F = () => <figure><img src="/x.webp" alt="" /><figcaption className="text-small uppercase tracking-[0.14em]">Klant, Woningbouw, 2025</figcaption></figure>;\n';
  assert.ok(!fails(run(fixture({ extra: { 'components/Cap.tsx': caption } })), 'Eyebrows'));
  const eyebrow = 'export const E = () => <><p className="text-small uppercase tracking-[0.14em]">Onze diensten</p><h2>Wat we doen</h2></>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/Eye.tsx': eyebrow } })), 'Eyebrows'));
});

test('a photo left by an earlier pack fails under this pack\'s caption', () => {
  const photo = 'x'.repeat(9000);
  const pack = (bytes) => JSON.stringify({ pack: 'datum', images: [{ file: 'public/images/band-2.webp', slot: 'band', source: 'https://struq.app/media/packs/datum/b.webp', bytes }] });
  const stale = { 'public/images/band-2.webp': photo, 'public/images/struq-pack.json': pack(12345) };
  assert.ok(fails(run(fixture({ extra: stale })), 'not the ones their alt and caption describe'));
  const fresh = { 'public/images/band-2.webp': photo, 'public/images/struq-pack.json': pack(photo.length) };
  assert.ok(!fails(run(fixture({ extra: fresh })), 'not the ones their alt and caption describe'));
});

test('a note to the client never reaches the page', () => {
  const note = 'export const F = () => <footer><p>Het e-mailadres en telefoonnummer volgen zodra de studio ze aanlevert.</p></footer>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/F.tsx': note } })), 'Notes to the client'));
  const bracket = 'export const F = () => <footer><a href="tel:">[telefoon]</a></footer>;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/F.tsx': bracket } })), 'Notes to the client'));
  assert.ok(!fails(run(fixture()), 'Notes to the client'));
});

test('manifesto chips show a subject, never a texture', () => {
  const texture = 'export const M = () => <ManifestoScrub text="a {0} b" images={[images.detail[0], images.card[1]]} />;\n';
  assert.ok(fails(run(fixture({ extra: { 'components/M.tsx': texture } })), 'Inline manifesto photo'));
  const scene = 'export const M = () => <ManifestoScrub text="a {0} b" images={[images.card[0], images.column[1]]} />;\n';
  assert.ok(!fails(run(fixture({ extra: { 'components/M.tsx': scene } })), 'Inline manifesto photo'));
});

test('too few image placements warn instead of failing', () => {
  // The fixture page places one photo, under the floor of four.
  const out = run(fixture());
  assert.ok(!fails(out, 'image placement'));
  assert.ok(warns(out, 'Only 1 image placement'));
});

// why: --plan is the film check on the storyboard alone, run before a single block is installed, so it must work in a
// folder that holds nothing but STRUQ.md and app/, and refuse the plan that breaks the one-centerpiece budget.
const GOOD_BOARD = [
  'Arrival (frame) preloader-stack | lands on: the hero photo',
  'Opening (loud) hero-still:still | on screen: the dining room at dusk',
  'Statement (quiet) own scene | on screen: one sentence at 14vw',
  'About (quiet) reveals:lines | on screen: who cooks here',
  'Approach (quiet) approach:schuif | on screen: the four seasons',
  'Centerpiece (loud) image-to-fullbleed | on screen: the room opening',
  'Release (quiet) own scene | on screen: a photo and two sentences',
  'Close (quiet) own scene | echoes the opening | footer: footer-reveal',
];
const planWith = (scenes) => PLAN.replace(board(8), scenes.map((s, i) => `${i + 1}. ${s}`).join('\n'));

function planOnly(plan) {
  const dir = mkdtempSync(join(tmpdir(), 'struq-plan-'));
  writeFileSync(join(dir, 'STRUQ.md'), plan);
  mkdirSync(join(dir, 'app'));
  writeFileSync(join(dir, 'app', 'page.tsx'), 'export default function Page() { return null; }\n');
  return spawnSync(process.execPath, [CHECK, '--plan'], { cwd: dir, encoding: 'utf8' });
}

test('--plan passes a good storyboard with nothing but STRUQ.md and app/', () => {
  const r = planOnly(planWith(GOOD_BOARD));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PLAN: PASS$/m);
  assert.ok(!/^FAIL /m.test(r.stdout), r.stdout);
});

test('--plan fails a storyboard with two centerpieces, naming the rule and the fix', () => {
  const two = GOOD_BOARD.map((s) => (s.startsWith('Approach') ? 'Approach (loud) film-strip | on screen: the four seasons' : s));
  const r = planOnly(planWith(two));
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /^FAIL one-centerpiece: 2 centerpieces: film-strip, image-to-fullbleed\. Fix: Keep one centerpiece/m);
  assert.match(r.stdout, /^PLAN: FAIL$/m);
});

test('the FILM group fails a page transition on a site with one route', () => {
  const layout = LAYOUT_OK.replace('<SmoothScroll>{children}</SmoothScroll>', '<PageTransitionStack /><SmoothScroll>{children}</SmoothScroll>');
  const one = run(fixture({ extra: { 'app/layout.tsx': layout } }));
  assert.ok(fails(one, 'transition-needs-routes: page-transition-stack on a site with 1 route'), one);
  const two = run(fixture({ extra: { 'app/layout.tsx': layout, 'app/werk/page.tsx': 'export default function Werk() { return null; }\n' } }));
  assert.ok(!fails(two, 'transition-needs-routes'));
  assert.ok(!fails(run(fixture()), 'transition-needs-routes'));
});
