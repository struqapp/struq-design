// why: look.mjs is the gate that opens the page a model built. The source check never saw a header printing over
// text, a descender cut by a line mask, a word running off inside an overflow-hidden section, pale text or a
// screen of nothing; these static pages pin each one, and a clean page that must pass. The proof round of 2026-11-15
// added four more: a blank screen after a panel wipe, white text unreadable on a pale photo, a total broken over two
// lines and a face that never loaded, each with a page where it must not fire.
//
// It needs Playwright and a cached Chromium. It installs playwright once into a shared folder in the temp dir (or
// uses STRUQ_PLAYWRIGHT), and never downloads a browser: without one the suite is skipped with the reason.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LOOK = fileURLToPath(new URL('../skills/struq/scripts/look.mjs', import.meta.url));
const SHARED = join(tmpdir(), 'struq-look-test');
const PLAYWRIGHT = 'playwright@1.64.1';

const page = (body, css = '') => `<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>fixture</title>
<style>
  html, body { margin: 0; background: #f4f1ea; color: #1a1a1a; font-family: Arial, sans-serif; }
  section { padding: 120px 24px; min-height: 60vh; box-sizing: border-box; }
  h1 { font-size: 64px; line-height: 1.2; margin: 0; }
  h2 { font-size: 40px; line-height: 1.2; margin: 0 0 24px; }
  p { font-size: 18px; line-height: 1.5; max-width: 40ch; margin: 0 0 16px; }
  footer { padding: 80px 24px; background: #1a1a1a; color: #f4f1ea; }
  ${css}
</style></head><body>${body}</body></html>`;

const HEADER = '<header style="position:fixed;top:0;left:0;right:0;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:#f4f1ea;z-index:10"><a href="/" data-wordmark style="color:#1a1a1a;text-decoration:none;font-size:20px">Noord</a><nav><a href="#werk" style="color:#1a1a1a">Werk</a></nav></header>';
const FILL = ['Een huis aan het water.', 'Wij bouwen wat blijft.', 'Hout, steen en licht.', 'Elk detail telt mee.', 'Bel ons op maandag.']
  .map((t) => `<section><h2>${t}</h2><p>De ruimte vraagt om rust en om materiaal dat ouder mag worden.</p></section>`)
  .join('');
const FOOTER = '<footer><p>Noord, Utrecht</p></footer>';
const HERO = '<section style="padding-top:140px"><h1>Huizen die blijven</h1><p>Een architect in Utrecht.</p></section>';
// A photo as an SVG data image (an <img>, so look treats it as a photo), and a heading set over it in white.
const svg = (ground, spot) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23${ground}'/%3E%3Ccircle cx='120' cy='90' r='70' fill='%23${spot}'/%3E%3Ccircle cx='300' cy='210' r='90' fill='%23${spot}'/%3E%3C/svg%3E`;
const PALE = svg('efe8da', 'e2d6c0');
const DARK = svg('1f1a15', '2e261e');
const photo = (src, line) => `<section style="position:relative;padding:0;min-height:70vh"><img src="${src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><h2 style="position:relative;color:#ffffff;margin:0;padding:160px 24px">${line}</h2></section>`;

const PAGES = {
  clean: page(`${HEADER}<main>${HERO}${FILL}</main>${FOOTER}`),
  // A transparent header, and a heading set right under its wordmark.
  collision: page(`${HEADER.replace('background:#f4f1ea;', '')}<main><section style="padding-top:12px"><h1>Rustig wonen</h1><p>Een architect in Utrecht.</p></section>${FILL}</main>${FOOTER}`),
  // A line mask at a leading tighter than the glyphs: the descenders of g, p and y are cut.
  descender: page(`${HEADER}<main>${HERO}<section><span style="display:block;overflow:hidden;font-size:96px;line-height:0.8">gypsy</span></section>${FILL}</main>${FOOTER}`),
  // A display word wider than its half of an overflow-hidden section: the page does not scroll sideways, the word is cut.
  offedge: page(`${HEADER}<main>${HERO}<section style="overflow:hidden;padding:0"><div style="width:50%;display:flex"><span style="display:block;white-space:nowrap;font-size:20vw;line-height:1.2">Vernieuwen</span></div></section>${FILL}</main>${FOOTER}`),
  // Pale grey body text on white.
  contrast: page(`${HEADER}<main>${HERO}<section style="background:#ffffff"><p style="color:#bdbdbd">Deze zin is bijna niet te lezen op het witte vlak.</p></section>${FILL}</main>${FOOTER}`),
  // Two and a half screens of nothing between two sections.
  empty: page(`${HEADER}<main>${HERO}<section><h2>Eerst dit.</h2></section><div style="height:2400px"></div><section><h2>Dan pas dit.</h2></section></main>${FOOTER}`),
  // Rows that look like links and point at the section they sit in (proof run 2026-11-15).
  selflink: page(`${HEADER}<main>${HERO}<section id="werk"><a href="#werk">Badkamers</a><p>Wat we doen.</p></section>${FILL}</main>${FOOTER}`),
  // A panel wipe that leaves two screens of flat beige and nothing on them (proof run 2026-11-15: a closed curtain).
  blank: page(`${HEADER}<main>${HERO}<section><h2>Eerst dit.</h2></section><section style="height:220vh;padding:0;background:#d9cbb3"></section>${FILL}</main>${FOOTER}`),
  // White display text over a pale photo: no scrim, and the pixels behind it are nearly as light as the letters.
  unreadable: page(`${HEADER}<main>${HERO}${photo(PALE, 'Een avond aan tafel')}${FILL}</main>${FOOTER}`),
  // A total set at display size in a narrow column: it wraps at its group space, "3" on one line and "900.00" on the next.
  number: page(`${HEADER}<main>${HERO}<section><p style="font-size:56px;max-width:4ch;line-height:1.2">Totaal 3 900.00</p></section>${FILL}</main>${FOOTER}`),
  // A face asked for first that the page never loads: the heading reads in Georgia.
  font: page(`${HEADER}<main>${HERO}<section><h2 style='font-family:"Struq Absent Face", Georgia, serif'>Een letter die niet laadt</h2></section>${FILL}</main>${FOOTER}`),
  // A word in the accent on its paper ground with a hairline seam standing through its middle, under the letters
  // (split-pair, proof run 2026-11-16): the seam is not the word's ground, so the word passes on the paper.
  seam: page(`${HEADER}<main>${HERO}<section style="position:relative"><span style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:#1a1a1a"></span><h2 style="position:relative;font-size:160px;line-height:1.2;color:#bb0916;text-align:center;margin:0">Stil</h2></section>${FILL}</main>${FOOTER}`),
  // A title a script is scaling up through an overflow-hidden stage (zoom-through mid-zoom, lab of 2026-11-18): its
  // letters fall away past the edges by design. The same scale from a stylesheet is no zoom and still runs off.
  zoom: page(`${HEADER}<main>${HERO}<section style="position:relative;overflow:hidden;height:100vh;padding:0"><div style="position:absolute;inset:0;transform:scale(2.6)"><p style="position:absolute;left:10%;top:40%;margin:0;font-size:120px;line-height:1.2;white-space:nowrap">Stil werk</p></div></section>${FILL}</main>${FOOTER}`),
  zoomcss: page(`${HEADER}<main>${HERO}<section style="position:relative;overflow:hidden;height:100vh;padding:0"><div class="big" style="position:absolute;inset:0"><p style="position:absolute;left:10%;top:40%;margin:0;font-size:120px;line-height:1.2;white-space:nowrap">Stil werk</p></div></section>${FILL}</main>${FOOTER}`, '.big { transform: scale(2.6); }'),
  // Callout numbers caught mid-fade by a scrubbed stagger (an opacity set inline by the script, trial-centerpiece of
  // 2026-11-18 measured 1.39 to 3.70): judged at the colours they settle to. The same opacity from a class is pale.
  midfade: page(`${HEADER}<main>${HERO}<section><p style="opacity:0.25">Een tekst die nog binnenkomt.</p></section>${FILL}</main>${FOOTER}`),
  faint: page(`${HEADER}<main>${HERO}<section><p class="faint">Een tekst die altijd vaag blijft.</p></section>${FILL}</main>${FOOTER}`, '.faint { opacity: 0.25; }'),
  // A split screen whose headline runs under its own 3D panel (proof run 2026-11-25, Halden: "Lyset er i gl").
  covered: page(`${HEADER}<main>${HERO}<section style="position:relative;height:100vh;padding:0"><h2 style="position:absolute;left:24px;top:40%;margin:0;font-size:64px;white-space:nowrap">Lyset er i glasset hele kvelden</h2><canvas style="position:absolute;right:0;top:0;width:50%;height:100%;background:#2b2b2b"></canvas></section>${FILL}</main>${FOOTER}`),
  // The same panel sliding in over the headline, moved by a script: a transition in progress, not a defect.
  coverslide: page(`${HEADER}<main>${HERO}<section style="position:relative;height:100vh;padding:0;overflow:hidden"><h2 style="position:absolute;left:24px;top:40%;margin:0;font-size:64px;white-space:nowrap">Lyset er i glasset hele kvelden</h2><div style="position:absolute;right:0;top:0;width:50%;height:100%;background:#2b2b2b;transform:translateX(30%)"></div></section>${FILL}</main>${FOOTER}`),
  // A middle scene that is one long paragraph at poster scale, and three display lines after the first screen.
  wall: page(`${HEADER}<main>${HERO}<section><p style="font-size:min(120px,12vw);line-height:1.05;max-width:none">Vi tegner og blåser hver lampe for hånd i Bergen, én om gangen, og den er ikke ferdig før den henger over bordet og lyser om kvelden for dem som bor der.</p></section>${FILL}</main>${FOOTER}`),
  ladder: page(`${HEADER}<main>${HERO}<section><h2 style="font-size:min(128px,13vw)">Lyset først.</h2></section><section><h2 style="font-size:min(128px,13vw)">Så formen.</h2></section><section><h2 style="font-size:min(128px,13vw)">Så glasset.</h2></section><section><h2 style="font-size:min(128px,13vw)">Så rommet.</h2></section>${FILL}</main>${FOOTER}`),
  // None of the four may fire here: a quiet pinned scene with one sentence on its flat ground, white text over a dark
  // photo, a total kept whole by a no-break space beside running text with numbers that wrap between them, and a face
  // that loads.
  kept: page(
    `${HEADER}<main>${HERO}<section style="height:250vh;padding:0;background:#d9cbb3"><p style="position:sticky;top:45vh;margin:0 auto;text-align:center">Hier is het stil.</p></section>`
      + `${photo(DARK, 'Een avond aan tafel')}`
      + '<section><p style="font-size:56px;max-width:9ch;line-height:1.2">Totaal 3&nbsp;900.00</p><p>Sinds 1998 bouwen wij huizen aan het water, 120 in totaal, voor 12% minder dan een nieuw huis kost.</p></section>'
      + `<section><h2 style='font-family:"Struq Local Face", serif'>Een letter die wel laadt</h2></section>${FILL}</main>${FOOTER}`,
    '@font-face { font-family: "Struq Local Face"; src: local("Arial"), local("Liberation Sans"), local("Helvetica"), local("DejaVu Sans"); }',
  ),
};

let server;
let base;
let skip = false;
const env = { ...process.env };

function resolvePlaywright(dir) {
  try {
    return createRequire(join(dir, 'noop.js')).resolve('playwright');
  } catch {
    return null;
  }
}

before(async () => {
  mkdirSync(SHARED, { recursive: true });
  if (!existsSync(join(SHARED, 'package.json'))) writeFileSync(join(SHARED, 'package.json'), JSON.stringify({ name: 'struq-look-test', private: true }));
  let entry = resolvePlaywright(SHARED) ?? (env.STRUQ_PLAYWRIGHT ? resolvePlaywright(env.STRUQ_PLAYWRIGHT) : null);
  if (!entry) {
    spawnSync(`npm install -D ${PLAYWRIGHT} --no-audit --no-fund`, { cwd: SHARED, stdio: 'ignore', shell: true });
    entry = resolvePlaywright(SHARED);
  }
  if (!entry) {
    skip = `${PLAYWRIGHT} could not be installed`;
    return;
  }
  env.STRUQ_PLAYWRIGHT = join(entry, '..', '..', '..');
  const mod = await import(pathToFileURL(entry).href);
  const chromium = mod.chromium ?? mod.default.chromium;
  if (!existsSync(chromium.executablePath())) {
    skip = `no cached Chromium for ${PLAYWRIGHT} (npx playwright install chromium)`;
    return;
  }
  server = createServer((req, res) => {
    const html = PAGES[req.url.replace(/^\/|\/$/g, '')];
    res.writeHead(html ? 200 : req.url === '/favicon.ico' ? 204 : 404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html ?? '');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

/** Run look.mjs on one fixture page, in its own project folder; resolves with the exit code and look.json. */
function look(name) {
  const dir = join(SHARED, 'cases', name);
  rmSync(join(dir, '.struq'), { recursive: true, force: true });
  mkdirSync(join(dir, 'app'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, private: true }));
  writeFileSync(join(dir, 'app', 'page.tsx'), `// ${name}\n`);
  return new Promise((done) => {
    const child = spawn(process.execPath, [LOOK, '--url', `${base}/${name}`, '--dir', dir, '--no-install', '--no-log'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      const file = join(dir, '.struq', 'look.json');
      done({ code, out, json: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

// Four pages at a time: each run is its own Chromium, and a dozen at once makes captures fail on a busy machine.
const runs = {};
let running = 0;
const queue = [];
const slot = () => (running < 4 ? (running++, Promise.resolve()) : new Promise((r) => queue.push(r)));
const free = () => (queue.length ? queue.shift()() : running--);
const result = (name) => (runs[name] ??= slot().then(() => look(name)).finally(free));
const kinds = (r, severity) => r.json.findings.filter((f) => !severity || f.severity === severity).map((f) => f.kind);

test('look: a clean page passes, with screenshots and a source stamp', async (t) => {
  if (skip) return t.skip(skip);
  // Start every page at once; each test below awaits its own.
  for (const name of Object.keys(PAGES)) result(name);
  const r = await result('clean');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /LOOK: PASS/);
  assert.deepEqual(r.json.findings, [], r.out);
  assert.ok(r.json.steps.phone >= 2 && r.json.steps.desktop >= 2, 'it scrolls through the page');
  assert.ok(existsSync(join(SHARED, 'cases', 'clean', '.struq', 'look', 'desktop-00.png')));
  assert.ok(existsSync(join(SHARED, 'cases', 'clean', '.struq', 'look', 'phone-00.png')));
  assert.match(r.json.source.hash, /^[0-9a-f]{40}$/);
});

test('look: text under a see-through header fails as a collision', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('collision');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /LOOK: FAIL/);
  assert.ok(kinds(r, 'FAIL').includes('collision'), r.out);
});

test('look: descenders cut by a line mask fail as clipped', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('descender');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.find((x) => x.kind === 'clipped');
  assert.ok(f, r.out);
  assert.equal(f.text, 'gypsy');
  assert.deepEqual([...new Set(kinds(r))], ['clipped'], r.out);
});

test('look: a word running off inside an overflow-hidden section fails as clipped, with no page overflow', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('offedge');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.find((x) => x.kind === 'clipped');
  assert.ok(f && f.text === 'Vernieuwen' && /past the right/.test(f.detail), r.out);
  assert.ok(!kinds(r).includes('overflow'), r.out);
});

test('look: pale text on a solid ground fails as contrast', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('contrast');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.find((x) => x.kind === 'contrast');
  assert.ok(f && f.severity === 'FAIL' && /needs 4.5/.test(f.detail), r.out);
  assert.deepEqual([...new Set(kinds(r))], ['contrast'], r.out);
});

test('look: a hairline seam under a word is not its ground; the word is measured on the paper it stands on', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('seam');
  assert.ok(!kinds(r).includes('contrast'), r.out);
  assert.equal(r.code, 0, r.out);
});

test('look: type a script is zooming past the edges is a zoom in progress; the same scale from CSS is clipped', async (t) => {
  if (skip) return t.skip(skip);
  const [zoom, css] = await Promise.all([result('zoom'), result('zoomcss')]);
  assert.ok(!kinds(zoom).includes('clipped'), zoom.out);
  assert.ok(css.json.findings.some((f) => f.kind === 'clipped' && f.text === 'Stil werk'), css.out);
});

test('look: text a script is fading in is judged at its settled colours; a faint text from a stylesheet still fails', async (t) => {
  if (skip) return t.skip(skip);
  const [mid, faint] = await Promise.all([result('midfade'), result('faint')]);
  assert.ok(!kinds(mid).includes('contrast'), mid.out);
  assert.ok(faint.json.findings.some((f) => f.kind === 'contrast' && /vaag/.test(f.text)), faint.out);
});

test('look: a line partly under a canvas that holds still fails as covered; a panel a script slides in does not', async (t) => {
  if (skip) return t.skip(skip);
  const [hit, slide] = await Promise.all([result('covered'), result('coverslide')]);
  const f = hit.json.findings.find((x) => x.kind === 'covered');
  assert.ok(f && f.severity === 'FAIL' && /canvas/.test(f.detail) && /Lyset er i glasset/.test(f.text), hit.out);
  assert.equal(hit.code, 1, hit.out);
  assert.ok(!kinds(slide).includes('covered'), slide.out);
  assert.ok(!kinds(await result('clean')).includes('covered'));
});

test('look: a paragraph at poster scale fails as a wall; three display lines warn on the scale ladder', async (t) => {
  if (skip) return t.skip(skip);
  const [wall, ladder] = await Promise.all([result('wall'), result('ladder')]);
  const w = wall.json.findings.find((x) => x.kind === 'type-wall');
  assert.ok(w && w.severity === 'FAIL' && w.viewport === 'desktop' && /words at 120px/.test(w.detail), wall.out);
  const l = ladder.json.findings.find((x) => x.kind === 'type-scale');
  assert.ok(l && l.severity === 'WARN' && /3 lines at poster scale/.test(l.detail), ladder.out);
  assert.ok(!kinds(ladder).includes('type-wall'), ladder.out);
});

test('look: a stretch of nothing is empty, and fails from a whole screen', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('empty');
  // Two and a half screens of nothing also hold a scroll stop that is one flat colour: that stop fails as blank.
  assert.deepEqual([...new Set(kinds(r))].sort(), ['blank', 'empty'], r.out);
  // Dead stretches were the most common hole in the proof builds of 2026-11-25: from a whole screen it fails.
  assert.ok(r.json.findings.filter((f) => f.kind === 'empty').every((f) => f.severity === 'FAIL'));
  assert.match(r.out, /FAIL empty/);
});

test('look: a scroll stop of one flat colour fails as blank; a quiet scene with a sentence does not', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('blank');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.filter((x) => x.kind === 'blank');
  assert.ok(f.length && f.every((x) => x.severity === 'FAIL' && /one flat colour \(#d9cbb3\)/.test(x.detail)), r.out);
  // A run of blank stops is one finding per size.
  assert.ok(f.length <= 2, r.out);
  assert.ok(!kinds(await result('kept')).includes('blank'), (await result('kept')).out);
});

test('look: text over a photo is measured: unreadable fails, readable passes without a warning', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('unreadable');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.find((x) => x.kind === 'unreadable');
  assert.ok(f && f.severity === 'FAIL' && f.text === 'Een avond aan tafel' && /needs 3/.test(f.detail), r.out);
  assert.ok(Number(f.detail.match(/^([\d.]+)/)[1]) < 1.5, f.detail);
  assert.ok(!kinds(r).includes('contrast'), r.out);
  const kept = await result('kept');
  assert.ok(!kinds(kept).includes('unreadable') && !kinds(kept).includes('contrast'), kept.out);
});

test('look: a number broken over two lines fails; a number kept whole does not', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('number');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.find((x) => x.kind === 'broken-number');
  assert.ok(f && f.severity === 'FAIL' && f.text === '3 900.00' && /2 lines/.test(f.detail), r.out);
  assert.ok(!kinds(await result('kept')).includes('broken-number'), (await result('kept')).out);
});

test('look: a face asked for first that never loads fails once; a loaded face does not', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('font');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.filter((x) => x.kind === 'font-missing');
  assert.equal(f.length, 1, r.out);
  assert.ok(f[0].severity === 'FAIL' && /"Struq Absent Face"/.test(f[0].detail) && f[0].text === 'Een letter die niet laadt', r.out);
  const kept = await result('kept');
  assert.ok(!kinds(kept).includes('font-missing'), kept.out);
});

test('look: a link to the section it sits in fails as a self-link', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('selflink');
  assert.equal(r.code, 1, r.out);
  const f = r.json.findings.find((x) => x.kind === 'self-link');
  assert.ok(f && f.text === 'Badkamers' && f.severity === 'FAIL', r.out);
});

test('look: nothing served means exit 2 and how to start it', () => {
  const dir = join(SHARED, 'cases', 'none');
  mkdirSync(dir, { recursive: true });
  const r = spawnSync(process.execPath, [LOOK, '--url', 'http://127.0.0.1:9', '--dir', dir, '--no-install', '--no-log'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /npx next start -p 4321/);
});
