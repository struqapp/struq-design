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
      <body data-blocks="" data-temperament="weighted"><SmoothScroll>{children}</SmoothScroll></body>
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

// The photo and poster-size rules for a hand-built hero are defaults (WARN): a real-time scene is a subject too.
test('a photo hero gets its photo; a hand-built hero warns without a photo, a scene or poster size', () => {
  assert.ok(!fails(run(fixture()), 'without its photo'));
  const bare = PAGE_OK.replace(' image={images.hero[0]}', '');
  assert.ok(fails(run(fixture({ page: bare })), 'without its photo'));
  const hand = 'import { MediaFrame } from "@/components/struq/kit/MediaFrame";\nexport default function Page() { return <section><h1 className="text-[16vw]">Zout</h1><MediaFrame image={images.hero[0]} /></section>; }\n';
  assert.ok(!fails(run(fixture({ page: hand })), 'Hero without a photo'));
  assert.ok(!fails(run(fixture({ page: hand })), 'under 10vw'));
  assert.ok(warns(run(fixture({ page: hand.replace('<MediaFrame image={images.hero[0]} />', '') })), 'Hero without a photo'));
  assert.ok(!warns(run(fixture({ page: hand.replace('<MediaFrame image={images.hero[0]} />', '<Canvas />') })), 'Hero without a photo'));
  assert.ok(warns(run(fixture({ page: hand.replace('text-[16vw]', 'font-display text-display') })), 'under 10vw'));
});

test('every page has a header', () => {
  assert.ok(!fails(run(fixture()), 'No header'));
  const none = PAGE_OK.replace('      <HeaderBar name="Zout" />\n', '').replace(/^import \{ HeaderBar \}.*\n/m, '');
  assert.ok(fails(run(fixture({ page: none })), 'No header'));
  const own = none.replace('<>', '<><header><a href="/" data-wordmark="">Zout</a></header>');
  assert.ok(!fails(run(fixture({ page: own })), 'No header'));
});

// Real-time 3D is welcome; bare primitives with no physical material, environment or shader warn that they read as plastic.
test('3D from bare primitives warns, and passes once it has a physical material or shader', () => {
  assert.ok(!warns(run(fixture()), 'bare primitives'));
  const bike = 'import * as THREE from "three";\nexport const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2));\nexport const wheel = new THREE.TorusGeometry(1, 0.1);\n';
  assert.ok(warns(run(fixture({ extra: { 'components/Bike.tsx': bike } })), '3D from bare primitives'));
  assert.ok(warns(run(fixture({ extra: { 'components/struq/kit/scenes/bakfiets.ts': bike } })), '3D from bare primitives'));
  const glass = `${bike}export const m = new THREE.MeshPhysicalMaterial({ transmission: 1 });\n`;
  assert.ok(!warns(run(fixture({ extra: { 'components/Bike.tsx': glass } })), '3D from bare primitives'));
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

test('a page without a contrast scene warns, and so do more than two', () => {
  assert.ok(!fails(run(fixture()), 'contrast scene'));
  const none = PAGE_OK.replace(' className="scene-inverse"', '');
  const out = run(fixture({ page: none }));
  assert.ok(!fails(out, 'contrast scene'));
  assert.ok(warns(out, 'No contrast scene'));
  const three = 'export const S = () => <><section className="scene-inverse" /><section className="scene-field" /></>;\n';
  assert.ok(warns(run(fixture({ extra: { 'components/Scene.tsx': three } })), 'contrast scenes'));
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

// why: the proof round of 2026-11-15 shipped "Binnenkort" and "launching in spring" lines, and a restaurant that said
// "Tot vanavond." with no address or number anywhere: copy that promises or invites what the page cannot deliver.
test('coming-soon copy fails, in English and in Dutch; a factual "not yet" or "nog niet" does not', () => {
  const soon = (copy) => fails(run(fixture({ extra: { 'components/S.tsx': `export const S = () => <section><p>${copy}</p></section>;\n` } })), 'Coming-soon copy');
  for (const copy of ['The app is launching in spring.', 'Online booking is on its way.', 'Gift cards: not yet available.', 'Binnenkort meer.', 'De wijnkaart volgt snel.', 'Reserveren kan nog niet.', 'De nieuwe kaart is in de maak.', 'Coming soon']) {
    assert.ok(soon(copy), copy);
  }
  // A JSX text line on its own and a string prop count as copy too.
  assert.ok(fails(run(fixture({ extra: { 'components/S.tsx': 'export const S = () => (\n  <p>\n    Verschijnt binnenkort in de winkel.\n  </p>\n);\n' } })), 'Coming-soon copy'));
  assert.ok(fails(run(fixture({ extra: { 'components/S.tsx': 'export const S = () => <Statement line="Our shop is launching soon." />;\n' } })), 'Coming-soon copy'));
  // A factual sentence, a code name and a comment are not a promise.
  assert.ok(!soon('We do not yet know a better oven than this one, so we kept it.'));
  assert.ok(!soon('Wie nog niet weet wat hij wil eten, vraagt het de kok.'));
  const code = 'const notYetLoaded = true;\n// the shop is coming soon, says the client\nexport const S = () => <p className="soon">Een zaal aan het water.</p>;\n';
  assert.ok(!fails(run(fixture({ extra: { 'components/S.tsx': code } })), 'Coming-soon copy'));
  assert.ok(!fails(run(fixture()), 'Coming-soon copy'));
});

test('an invitation to come by or call fails without an address, phone number or email on the page', () => {
  const invite = (copy, more = '') => run(fixture({ extra: { 'components/C.tsx': `export const C = () => <section><h2>${copy}</h2>${more}</section>;\n` } }));
  for (const copy of ['Tot vanavond.', 'Kom langs op de kade.', 'Bel ons voor een tafel.', 'See you tonight.', 'Drop in after work.', 'Call us for a table.']) {
    assert.ok(fails(invite(copy), 'Invitation without a door'), copy);
  }
  // A door anywhere on the page settles it: a street and number, a postcode, a phone number, an email or a tel: link.
  for (const door of ['<p>Nieuwe Binnenweg 74, Rotterdam</p>', '<p>3015 BB Rotterdam</p>', '<p>010 412 34 56</p>', '<p>tafel@osteriavera.nl</p>', '<a href="tel:+31104123456">Reserveer</a>', '<p>12 Market Street, Leeds</p>']) {
    const out = invite('Tot vanavond.', door);
    assert.ok(!fails(out, 'Invitation without a door'), door);
    assert.ok(out.includes('have a door'), door);
  }
  assert.ok(!fails(run(fixture()), 'Invitation without a door'));
});

// why: proof round 6 (2026-11-15): "Schuif aan." on a restaurant with no address or booking and "Pick up a mug." on a
// ceramics site with no shop passed every check, because the invitation rule knew only "come by" wording. An imperative
// call to act, in the trade's own words, needs the same door.
test('an imperative call to act fails without a door, in English and in Dutch', () => {
  const page = (copy, more = '') => run(fixture({ extra: { 'components/C.tsx': `export const C = () => <section>${copy}${more}</section>;\n` } }));
  const calls = [
    '<h2>Schuif aan.</h2>',
    '<Poster heading={["Schuif", "aan."]} />',
    '<Hero lead="Pick up a" items={[{ word: "mug." }]} />',
    '<a href="#shelf">Shop the collection</a>',
    '<a href="#book">Book a class</a>',
    '<button>Roll out your mat</button>',
    '<p>Kom proeven.</p>',
    '<a href="#menu">Reserveer</a>',
    '<Cta label="Bestel" />',
    '<Poster link={{ label: "Loop naar binnen", href: "#osteria" }} />',
    '<h2>Sit down. Eat well.</h2>',
    '<h2>Neem plaats aan tafel</h2>',
  ];
  for (const copy of calls) assert.ok(fails(page(copy), 'Invitation without a door'), copy);
  // The failing line is named, with the door to add.
  const out = page('<h2>Schuif aan.</h2>');
  assert.match(out, /components\/C\.tsx:1 /);
  assert.match(out, /With no door the site ends on the idea/);
  // Headlines that are statements, not calls, pass.
  const statements = [
    '<h2>Bread, baked at five.</h2>',
    '<h2>Een tafel in Rotterdam</h2>',
    '<h2>The kiln runs hot.</h2>',
    '<p>Order is restored once the glaze has set.</p>',
    '<p>Book of hours, bound by hand.</p>',
    '<p>Pick-ups happen on Saturdays and the glaze sets overnight, so nothing ships.</p>',
    '<p>Try as we might, the loaf never rose the same way twice.</p>',
    '<h2>Visitors welcome in spring</h2>',
    '<p className="join flex items-center">Een zaal aan het water.</p>',
    '<h2>Het brood van de buurt</h2>',
  ];
  for (const copy of statements) assert.ok(!fails(page(copy), 'Invitation without a door'), copy);
  // A real door settles it: an address, an email, a mailto or tel link, or an external booking or shop link.
  for (const door of ['<p>Nieuwe Binnenweg 74, Rotterdam</p>', '<a href="mailto:tafel@osteriavera.nl">Mail</a>', '<a href="tel:+31104123456">Bel</a>', '<a href="https://www.resengo.com/osteria-vera">Reserveer</a>', '<a href="https://kilnandco.myshopify.com">Shop</a>']) {
    const withDoor = page('<h2>Schuif aan.</h2>', door);
    assert.ok(!fails(withDoor, 'Invitation without a door'), door);
    assert.ok(withDoor.includes('have a door'), door);
  }
  // Struq's own photo credit, a font host and a social profile are no door.
  for (const link of ['<a href="https://struq.app/photos">Beeld: Struq</a>', '<link href="https://fonts.googleapis.com/css2?family=Urbanist" />', '<a href="https://instagram.com/kilnandco">Instagram</a>']) {
    assert.ok(fails(page('<h2>Pick up a mug.</h2>', link), 'Invitation without a door'), link);
  }
  assert.ok(!fails(run(fixture()), 'Invitation without a door'));
});

// why: the Halden build (2026-11-26) sold glass pendants and ended on its idea with no price, no product and no way to
// buy, because the rule said a brief with no door renders no door. A selling site now ends on the order close; with no
// door from the brief it carries a placeholder door, which counts as a door but warns until the client replaces it.
const withBrief = (brief) => PLAN.replace('# STRUQ.md: fixture\n', `# STRUQ.md: b\nBrief: ${brief}\n`);
const PLACEHOLDER_SITE = 'export const site = {\n  name: "Halden",\n  door: { kind: "email", href: "mailto:post@example.com", label: "Bestill på e-post", placeholder: true },\n} as const;\n';

test('a placeholder door counts as a door but warns until it is replaced', () => {
  const page = (site) => run(fixture({ extra: { 'components/C.tsx': 'export const C = () => <section><h2>Shop the collection</h2></section>;\n', 'lib/site.ts': site } }));
  const out = page(PLACEHOLDER_SITE);
  assert.ok(!fails(out, 'Invitation without a door'), out);
  assert.ok(!fails(out, 'Notes to the client'), out);
  assert.ok(warns(out, 'Placeholder door:'), out);
  assert.match(out, /replace before launch \(Assumptions\)/);
  assert.match(out, /lib\/site\.ts:3 /);
  // An example.no or example.nl address is a placeholder too, with or without the flag.
  for (const addr of ['post@example.no', 'hallo@example.nl']) {
    const o = page(`export const site = { door: { kind: "email", href: "mailto:${addr}", label: "Mail" } } as const;\n`);
    assert.ok(warns(o, 'Placeholder door:'), addr);
    assert.ok(!fails(o, 'Invitation without a door'), addr);
  }
  // A real door does not warn.
  assert.ok(!warns(page('export const site = { door: { kind: "email", href: "mailto:post@halden.no", label: "Mail" } } as const;\n'), 'Placeholder door:'));
  assert.ok(!warns(run(fixture()), 'Placeholder door:'));
});

test('a site the brief says sells fails with no order close, no shop door and no door at all', () => {
  const sells = (brief, extra = {}) => run(fixture({ extra: { 'STRUQ.md': withBrief(brief), ...extra } }));
  for (const brief of ['Halden, a glass studio in Bergen that sells pendant lamps', 'een webshop voor keramiek', 'Halden lager og selger glasslamper', 'Kiln, mugs to order', 'Vuur verkoopt houtovens']) {
    assert.ok(fails(sells(brief), 'The site sells but has no way to buy'), brief);
  }
  const out = sells('Halden sells pendant lamps');
  assert.match(out, /Close shape="order"/);
  // The order close, a ProductRow with a shop door, a door of any kind, or the placeholder door settles it.
  const settled = [
    { 'components/O.tsx': 'export const O = () => <Close shape="order" items={[{ name: "Dråpe" }]} doors={site.doors} />;\n' },
    { 'components/O.tsx': 'export const O = () => <ProductRow items={items} shop={{ label: "Nettbutikk", href: "https://halden.no/butikk" }} />;\n' },
    { 'components/O.tsx': 'export const O = () => <a href="mailto:post@halden.no">post@halden.no</a>;\n' },
    { 'lib/site.ts': PLACEHOLDER_SITE },
  ];
  for (const extra of settled) assert.ok(!fails(sells('Halden sells pendant lamps', extra), 'The site sells but has no way to buy'), JSON.stringify(extra));
  // A brief that sells nothing, or no brief, is not held to it.
  assert.ok(!fails(sells('a yoga studio in Deventer'), 'The site sells'));
  assert.ok(!fails(run(fixture()), 'The site sells'));
});

// why: proof round 6 shipped a yoga studio called "Yoga" (header, opener, finale): the trade word standing in for a name
// the brief never gave, and no check read it.
test('a site named only by the trade word fails, unless the brief gives that name', () => {
  const named = (name, { brief, site = true } = {}) => {
    const extra = {
      'app/page.tsx': PAGE_OK.replace('name="Zout"', `name="${name}"`),
      ...(site ? { 'lib/site.ts': `export const site = {\n  name: "${name}",\n  title: "${name}",\n} as const;\n` } : {}),
    };
    if (brief) extra['STRUQ.md'] = PLAN.replace('# STRUQ.md: fixture\n', `# STRUQ.md: b\nBrief: ${brief}\n`);
    return run(fixture({ extra }));
  };
  for (const name of ['Yoga', 'Bakery', 'Bakkerij', 'Studio', 'Restaurant', 'Plumbing', 'Loodgieter', 'Ceramics', 'Conference', 'Yoga Studio', 'De Bakkerij', 'The Bakery']) {
    assert.ok(fails(named(name), 'Stand-in name'), name);
  }
  const out = named('Yoga', { brief: "a website for the client's yoga studio; place and name not given" });
  assert.ok(fails(out, 'Stand-in name'), out);
  assert.match(out, /lib\/site\.ts:2 {2}"Yoga"/);
  assert.match(out, /app\/page\.tsx:\d+ {2}"Yoga"/);
  // The header alone, the data-wordmark element alone and the page title alone are each enough.
  assert.ok(fails(named('Yoga', { site: false }), 'Stand-in name'));
  const own = PAGE_OK.replace('      <HeaderBar name="Zout" />\n', '').replace(/^import \{ HeaderBar \}.*\n/m, '').replace('<>', '<><header><a href="/" data-wordmark="">Bakery</a></header>');
  assert.ok(fails(run(fixture({ page: own })), 'Stand-in name'));
  const meta = LAYOUT_OK.replace('export default', 'export const metadata = { title: "Yoga", description: "x" };\nexport default');
  assert.ok(fails(run(fixture({ extra: { 'app/layout.tsx': meta } })), 'Stand-in name'));
  // A real name passes, also one that contains a trade word, and so does a brief that gives the trade word as the name.
  for (const name of ['Zout', 'Bakkerij Zoet', 'Kiln and Co', 'Dekker', 'Frame Conf', 'Osteria Vera', 'Yoga Mind']) {
    assert.ok(!fails(named(name), 'Stand-in name'), name);
  }
  assert.ok(!fails(named('Studio', { brief: 'A site for Studio, a design office in Ghent' }), 'Stand-in name'));
  assert.ok(!fails(run(fixture()), 'Stand-in name'));
});

// why: proof round 6: the art director named the real reflexes, and the builder refused most structural asks by citing the
// storyboard, the budgets or block ownership. An ask is now built, or refused on a rule that never bends or a fact of the
// brief; every ask carries its answer line.
test('every art-direction ask carries a Built or Refused line, and a refusal never rests on the plan, a budget or a block', () => {
  const art = (text) => run(fixture({ extra: { '.struq/art-direction.md': text } }));
  const good = '# Art direction, round 1\n\n1. desktop-00: the opener could open any restaurant. Build a first screen with the room in the letterbox.\n   Built: HeroPoster now carries the room photo in the letterbox.\n2. desktop-09: "Schuif aan." invites to a door the site never gives.\n   Refused: the brief gave no address, booking or phone, so there is no door; the line is dropped instead.\n';
  const ok = art(good);
  assert.ok(!fails(ok, 'art-direction'), ok);
  assert.match(ok, /PASS {2}Every art-direction ask is answered: 1 built, 1 refused/);
  // No file, no asks in the numbered form, and an ask with no answer all fail.
  assert.ok(fails(run(fixture()), 'No .struq/art-direction.md'));
  assert.ok(fails(art('The opener is generic and the middle is a glossary.\n'), 'holds no numbered asks'));
  const missing = art('# Round 1\n1. desktop-02: the middle is a glossary of the trade. Rebuild it.\n2. desktop-05: the close repeats the name. End on the idea.\n   Built: the close ends on the sentence.\n');
  assert.ok(fails(missing, '1 art-direction ask(s) with no answer'), missing);
  assert.match(missing, /desktop-02: the middle is a glossary/);
  // The old format, a free summary of what was and was not built, answers nothing.
  assert.ok(fails(art('1. The mat is empty.\n2. The opening does not hold.\n\nBuilt in round 1:\n- 1: the mat is a surface now.\nNot changed: 2 (the block owns it).\n'), '2 art-direction ask(s) with no answer'));
  // "Ship it." is an answer of its own.
  assert.ok(!fails(art('Ship it.\n'), 'art-direction'));
  // A refusal that only cites the storyboard, the plan, a budget or a block fails.
  const refusals = [
    'Refused: breaks the approved storyboard.',
    'Refused: a second loud scene breaks the budget and the plan.',
    'Refused: the pin budget of about 4.5 screens is spent.',
    'Refused: the hero block owns its own crop.',
    'Refused: the centerpiece is a block and fixed, and the quiet share would fall under four in ten.',
    'Refused:',
  ];
  for (const refusal of refusals) {
    const out = art(`# Round 1\n1. desktop-03: end on the idea, not the name.\n   ${refusal}\n`);
    assert.ok(fails(out, 'refused with no ground'), refusal);
  }
  // A continuation line is part of the reason, and a ground beside the plan is a ground.
  assert.ok(fails(art('1. desktop-03: change the order.\n   Refused: the storyboard fixes the order\n   and the budget allows no second pin.\n'), 'refused with no ground'));
  const grounded = [
    'Refused: it needs a price, and the brief gave none; invented prices fail rule 2.',
    'Refused: the brief names no address, so there is no door to point at.',
    'Refused: no pack photo shows a conference, and an empty frame never ships.',
    'Refused: it needs an eyebrow, which is a tell; the plan stays as it is.',
  ];
  for (const refusal of grounded) {
    const out = art(`# Round 1\n1. desktop-03: show the prices.\n   ${refusal}\n`);
    assert.ok(!fails(out, 'art-direction'), refusal);
  }
  // Built with nothing said is no answer; a bold or bulleted answer line still counts.
  assert.ok(fails(art('1. desktop-03: drop the clock.\n   Built:\n'), 'marked Built with nothing said'));
  assert.ok(!fails(art('1. desktop-03: drop the clock.\n   - **Built:** the clock is gone.\n'), 'art-direction'));
  assert.ok(!fails(art('1. desktop-03: drop the clock.\r\n   Built: the clock is gone.\r\n'), 'art-direction'));
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

// The budgets are defaults: two centerpieces warn with the rule and the fix, and the plan still passes.
test('--plan warns on a storyboard with two centerpieces, naming the rule and the fix', () => {
  const two = GOOD_BOARD.map((s) => (s.startsWith('Approach') ? 'Approach (loud) film-strip | on screen: the four seasons' : s));
  const r = planOnly(planWith(two));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /^WARN one-centerpiece: 2 centerpieces: film-strip, image-to-fullbleed\. Fix: Keep one centerpiece/m);
  assert.match(r.stdout, /^PLAN: PASS$/m);
});

test('the FILM group fails a page transition on a site with one route', () => {
  const layout = LAYOUT_OK.replace('<SmoothScroll>{children}</SmoothScroll>', '<PageTransitionStack /><SmoothScroll>{children}</SmoothScroll>');
  const one = run(fixture({ extra: { 'app/layout.tsx': layout } }));
  assert.ok(fails(one, 'transition-needs-routes: page-transition-stack on a site with 1 route'), one);
  const two = run(fixture({ extra: { 'app/layout.tsx': layout, 'app/werk/page.tsx': 'export default function Werk() { return null; }\n' } }));
  assert.ok(!fails(two, 'transition-needs-routes'));
  assert.ok(!fails(run(fixture()), 'transition-needs-routes'));
});

test('the LOOK group fails without a look, on a failing look and on a look older than the source', async () => {
  const { sourceStamp } = await import('../skills/struq/scripts/stamp.mjs');
  const dir = fixture();
  assert.ok(fails(run(dir), '.struq/look.json missing'));
  const write = (result, findings = []) => {
    mkdirSync(join(dir, '.struq'), { recursive: true });
    writeFileSync(join(dir, '.struq', 'look.json'), JSON.stringify({ at: new Date().toISOString(), result, findings, source: sourceStamp(dir) }));
  };
  write('PASS', [{ kind: 'empty', severity: 'WARN', detail: 'a stretch' }]);
  const ok = run(dir);
  assert.ok(!fails(ok, 'look'), ok);
  assert.match(ok, /PASS {2}look\.mjs passed on the current source \(1 warn/);
  write('FAIL', [{ kind: 'collision', severity: 'FAIL', viewport: 'desktop', text: 'Breath', detail: 'under the header', shot: '.struq/look/desktop-15.png' }]);
  const bad = run(dir);
  assert.ok(fails(bad, 'look.mjs found 1 fail'), bad);
  assert.match(bad, /collision desktop: "Breath" under the header {2}\.struq\/look\/desktop-15\.png/);
  write('PASS');
  writeFileSync(join(dir, 'app', 'page.tsx'), `${PAGE_OK}// changed after the look\n`);
  assert.ok(fails(run(dir), 'The look is older than the source: app/page.tsx'));
});

// why: proof round 6 found most own scenes written in raw GSAP (hand-rolled SplitText, clip-path wipes, dash-offset
// draws, literal eases) and six of eight sites closing on the name at full width. The kit's motion primitives, the
// feel's temperaments and the kit's Close replace each.
test('MOTION: own SplitText, wipes, drawn strokes and literal timing warn; the kit is not scanned', () => {
  const scene = (body) => ({
    'components/scenes/Cut.tsx': `"use client";\nimport { gsap } from "gsap";\nexport function Cut() {\n  ${body}\n  return null;\n}\n`,
  });
  const clean = run(fixture());
  assert.ok(!warns(clean, 'SplitText of your own'));
  assert.ok(!warns(clean, 'clip-path tween'));
  assert.ok(!warns(clean, 'Ease or duration'));
  const split = run(fixture({ extra: scene('const s = SplitText.create("h2", { type: "lines" });') }));
  assert.ok(warns(split, 'SplitText of your own'), split);
  assert.match(split, /components\/scenes\/Cut\.tsx:4 {2}const s = SplitText/);
  assert.ok(warns(run(fixture({ extra: scene('gsap.to(el, { clipPath: "inset(0% 0% 0% 0%)" });') })), 'clip-path tween'));
  assert.ok(warns(run(fixture({ extra: scene('gsap.to(path, { strokeDashoffset: 0 });') })), 'stroke drawn by hand'));
  assert.ok(warns(run(fixture({ extra: scene('gsap.to(path, { drawSVG: "100%" });') })), 'stroke drawn by hand'));
  assert.ok(warns(run(fixture({ extra: scene('gsap.to(el, { y: 0, ease: "power3.out" });') })), 'Ease or duration'));
  assert.ok(warns(run(fixture({ extra: scene('gsap.to(el, { y: 0, duration: 1.2 });') })), 'Ease or duration'));
  // Timing from the feel, a linear scrub and an inline style pass.
  const fromFeel = scene('const f = feel(el); gsap.to(el, { y: 0, ease: f.ease.enter, duration: f.duration.enter });');
  assert.ok(!warns(run(fixture({ extra: fromFeel })), 'Ease or duration'));
  assert.ok(!warns(run(fixture({ extra: scene('gsap.timeline({ defaults: { ease: "none", duration: 1 } });') })), 'Ease or duration'));
  assert.ok(!warns(run(fixture({ extra: scene('const x = <div style={{ clipPath: "inset(0)" }} />;') })), 'clip-path tween'));
  // The kit itself is never scanned.
  const kit = { 'components/struq/kit/motion/RevealText.tsx': 'import { gsap, SplitText } from "../gsap";\ngsap.to(el, { clipPath: "inset(0%)", ease: "expo.out", duration: 1 });\n' };
  const kitOut = run(fixture({ extra: kit }));
  assert.ok(!warns(kitOut, 'SplitText of your own'));
  assert.ok(!warns(kitOut, 'clip-path tween'));
});

test('MOTION: <body> carries data-temperament, crisp, weighted or slow', () => {
  assert.ok(!fails(run(fixture()), 'without a temperament'));
  for (const t of ['crisp', 'slow']) {
    assert.ok(!fails(run(fixture({ extra: { 'app/layout.tsx': LAYOUT_OK.replace('weighted', t) } })), 'without a temperament'), t);
  }
  const none = LAYOUT_OK.replace(' data-temperament="weighted"', '');
  const out = run(fixture({ extra: { 'app/layout.tsx': none } }));
  assert.ok(fails(out, 'without a temperament'), out);
  assert.match(out, /app\/layout\.tsx:6 {2}<body data-blocks="">/);
  assert.ok(fails(run(fixture({ extra: { 'app/layout.tsx': LAYOUT_OK.replace('weighted', 'calm') } })), 'without a temperament'));
  // A <body> named in a comment is not the body.
  const comment = `// data-blocks on <body> is the scope.\n${LAYOUT_OK}`;
  assert.ok(!fails(run(fixture({ extra: { 'app/layout.tsx': comment } })), 'without a temperament'));
});

test('MOTION: the close is never the site name at full width', () => {
  const page = (close, footer = '<FooterReveal />') =>
    PAGE_OK.replace('      <section className="scene-inverse"><p>Een zaal aan het water.</p></section>\n      <FooterReveal />', `${close}\n      ${footer}`).replace(
      'import { images }',
      'import { WordmarkFinale } from "@/components/struq/showpieces/wordmark-finale";\nimport { PanelWipe } from "@/components/struq/showpieces/panel-wipe";\nimport { Close } from "@/components/struq/kit/quiet";\nimport { images }',
    );
  const name = (out) => fails(out, "The close is the site's name at full width");
  assert.ok(!name(run(fixture())));
  // A section whose display text is the header's name, or the Brief's name.
  const big = '      <section className="scene-inverse"><h2 className="font-display text-[18vw]">Zout</h2></section>';
  const out = run(fixture({ page: page(big) }));
  assert.ok(name(out), out);
  assert.ok(name(run(fixture({ page: page(big.replace('text-[18vw]', 'text-display')) }))));
  const brief = PLAN.replace('# STRUQ.md: fixture\n', '# STRUQ.md: b\nBrief: a site for Haven Zeven, a fish restaurant\n');
  const briefName = big.replace('>Zout<', '>Haven Zeven<');
  assert.ok(name(run(fixture({ page: page(briefName), extra: { 'STRUQ.md': brief } }))));
  // The idea at display size, the name at text size and a small 4vw name pass.
  assert.ok(!name(run(fixture({ page: page(big.replace('>Zout<', '>Vis van het getij.<')) }))));
  assert.ok(!name(run(fixture({ page: page(big.replace('font-display text-[18vw]', 'text-body')) }))));
  assert.ok(!name(run(fixture({ page: page(big.replace('text-[18vw]', 'text-[4vw]')) }))));
  // A local close component is read one step deep.
  const own = { 'components/scenes/Slot.tsx': 'export function Slot() { return <section><p className="text-sheet-moment">Zout</p></section>; }\n' };
  const ownPage = page('      <Slot />').replace('import { images }', 'import { Slot } from "@/components/scenes/Slot";\nimport { images }');
  assert.ok(name(run(fixture({ page: ownPage, extra: own }))));
  // wordmark-finale straight after a block is the name as the last scene; after the kit's Close it is the footer.
  const finale = '<WordmarkFinale name="Zout" />';
  assert.ok(name(run(fixture({ page: page('      <PanelWipe left="Vis" right="Zee" />', finale) }))));
  assert.ok(!name(run(fixture({ page: page('      <PanelWipe left="Vis" right="Zee" />\n      <Close shape="idea" line="Vis van het getij." />', finale) }))));
});
