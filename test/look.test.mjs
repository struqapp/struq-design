// why: look.mjs is the gate that opens the page a model built. The source check never saw a header printing over
// text, a descender cut by a line mask, a word running off inside an overflow-hidden section, pale text or a
// screen of nothing; these static pages pin each one, and a clean page that must pass.
//
// It needs Playwright and a cached Chromium. It installs playwright once into a shared folder in the temp dir (or
// uses STRUQ_PLAYWRIGHT), and never downloads a browser: without one the suite is skipped with the reason.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const runs = {};
const result = (name) => (runs[name] ??= look(name));
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

test('look: a screen-high stretch of nothing warns as empty', async (t) => {
  if (skip) return t.skip(skip);
  const r = await result('empty');
  assert.deepEqual([...new Set(kinds(r))], ['empty'], r.out);
  assert.ok(r.json.findings.every((f) => f.severity === 'WARN'));
  assert.match(r.out, /WARN empty/);
});

test('look: nothing served means exit 2 and how to start it', () => {
  const dir = join(SHARED, 'cases', 'none');
  mkdirSync(dir, { recursive: true });
  const r = spawnSync(process.execPath, [LOOK, '--url', 'http://127.0.0.1:9', '--dir', dir, '--no-install', '--no-log'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /npx next start -p 4321/);
});
