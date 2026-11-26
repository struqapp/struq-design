#!/usr/bin/env node
// Struq look: render the built site and measure what a reader would see, at a phone and at a desktop.
//
//   npx next build && npx next start -p 4321      first, in the project, and leave it running
//   node <skill-dir>/scripts/look.mjs             then this, from the project root
//   node <skill-dir>/scripts/look.mjs --url http://localhost:4321 --dir ./my-site
//
// check.mjs reads the source; this one opens the page. At 390x844 and 1440x900, motion on, it waits for the fonts and
// the blocks' own ready signals, then scrolls top to bottom with real wheel events (Lenis follows those, not
// scrollTo) in steps of 60 percent of the screen, settles, screenshots and measures every step:
//
//   collision  the fixed header's text over other text; the site name twice on the first screen       FAIL
//   clipped    glyphs cut by an overflow mask (descenders under a line mask, a word past the edge)     FAIL
//   overflow   the document wider than the screen (also measured at 1024 and 1280 wide)                 FAIL
//   contrast   text against its solid ground under 4.5 (3 from 24px)                                    FAIL
//   unreadable text over a photo, video or canvas: the glyphs hidden, the worse quartile of the pixels  FAIL
//              behind them under 3 (24px, 18.66px bold, a wordmark in the header or nav) or 4.5; WARN as
//              contrast where the pixels cannot be read
//   blank      a scroll stop with no text seen and the screen one flat colour (header and cursor aside) FAIL
//   broken-number  a number ("3 900.00", "EUR 1.250,00", "12%") whose glyphs sit on two lines           FAIL
//   font-missing   a face the visible text asks for first that never loaded (a fallback shows)          FAIL
//   covered    a line partly under a canvas, photo or opaque panel above it that holds still          FAIL
//   over-object  a line with a canvas under it (the world behind the page) that draws an object, not   FAIL
//              a smooth wall or glow, inside the line's box (the glyphs hidden, held still)
//   tap-target phone: a link or button under 44 by 44 (inline links in a sentence aside)               WARN
//              (the page's door [data-door] or the menu button                                        FAIL)
//   small-text phone: running text (ten words or more) under 15px                                      FAIL
//   input-zoom phone: a field under 16px (iOS zooms in on tap)                                        WARN
//   fixed-cover phone: fixed or sticky chrome covering more than a quarter of the screen              WARN
//   type-wall  desktop: more than 20 words in one block at display size (72px and 7vw)              FAIL
//   type-scale desktop: more than two blocks at display size after the first screen                  WARN
//   empty      six tenths of a screen without text or image between the hero and the footer          WARN
//              (a whole screen or more                                                                FAIL)
//   error      console errors, page errors and images that did not load                                 FAIL
//
// Screenshots go to .struq/look/ (desktop-NN.png, phone-NN.png): open the ones a finding names and look. The findings
// and a stamp of the source go to .struq/look.json, which check.mjs holds to: a look older than the source fails.
// Playwright comes from the project; when it is missing, look installs it as a pinned devDependency (or set
// STRUQ_PLAYWRIGHT to a folder that has it). Flags: --no-install, --no-log. Exit 0 on LOOK: PASS, 1 on FAIL, 2 when
// it cannot look at all.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { appendLog } from "./log.mjs";
import { sourceStamp } from "./stamp.mjs";

const PLAYWRIGHT = "playwright@1.64.1";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];
const MAX_STEPS = 60;
const SEVERITY = { collision: "FAIL", clipped: "FAIL", overflow: "FAIL", contrast: "FAIL", unreadable: "FAIL", blank: "FAIL", "broken-number": "FAIL", "font-missing": "FAIL", error: "FAIL", "self-link": "FAIL", covered: "FAIL", "over-object": "FAIL", "type-wall": "FAIL", "type-scale": "WARN", empty: "WARN", "tap-target": "WARN", "small-text": "FAIL", "input-zoom": "WARN", "fixed-cover": "WARN" };

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const root = resolve(flag("--dir", process.cwd()));
const url = flag("--url", "http://localhost:4321").replace(/\/$/, "") || "http://localhost:4321";
const install = !args.includes("--no-install");
const outDir = join(root, ".struq", "look");
const relOut = (file) => relative(root, file).split(sep).join("/");

/* ------------------------------------------------------------- PLAYWRIGHT */
function resolveFrom(base) {
  try {
    return createRequire(join(resolve(base), "noop.js")).resolve("playwright");
  } catch {
    return null;
  }
}

async function loadChromium() {
  let entry = resolveFrom(root) ?? (process.env.STRUQ_PLAYWRIGHT ? resolveFrom(process.env.STRUQ_PLAYWRIGHT) : null);
  if (!entry) {
    const line = `npm install -D ${PLAYWRIGHT}`;
    if (!install || !existsSync(join(root, "package.json"))) {
      console.log(`Playwright is not installed in ${root}. Run: ${line}   (then run look.mjs again)`);
      process.exit(2);
    }
    console.log(`Installing Playwright into the project, once: ${line}`);
    if (spawnSync(line, { cwd: root, stdio: "inherit", shell: true }).status !== 0) {
      console.log(`The install failed. Run it yourself: ${line}`);
      process.exit(2);
    }
    entry = resolveFrom(root);
    if (!entry) {
      console.log(`Playwright still does not resolve from ${root}. Run: ${line}`);
      process.exit(2);
    }
  }
  const mod = await import(pathToFileURL(entry).href);
  const chromium = mod.chromium ?? mod.default?.chromium;
  const launch = () => chromium.launch({ headless: true });
  try {
    return { browser: await launch() };
  } catch (err) {
    if (!/Executable doesn't exist|playwright install/i.test(String(err?.message))) throw err;
    let cli = join(dirname(entry), "cli.js");
    if (!existsSync(cli)) cli = null;
    const line = cli ? `"${process.execPath}" "${cli}" install chromium` : "npx playwright install chromium";
    if (!install) {
      console.log("Playwright has no Chromium yet. Run: npx playwright install chromium   (then run look.mjs again)");
      process.exit(2);
    }
    console.log("Installing Playwright's Chromium, once: npx playwright install chromium");
    if (spawnSync(line, { cwd: root, stdio: "inherit", shell: true }).status !== 0) {
      console.log("The browser install failed. Run it yourself: npx playwright install chromium");
      process.exit(2);
    }
    return { browser: await launch() };
  }
}

/* --------------------------------------------------------- IN THE PAGE */
// Runs inside the page (serialised by Playwright, so it must not close over anything). Returns the step's findings,
// the document stretches that hold content, and the page metrics.
function measurePage(opts) {
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = innerHeight;
  const sy = scrollY;
  const force = document.createElement("style");
  force.textContent = "*,*::before,*::after{pointer-events:auto!important}";
  document.head.appendChild(force);
  const findings = [];
  const content = [];
  try {
    const csCache = new Map();
    const cs = (el) => {
      let s = csCache.get(el);
      if (!s) csCache.set(el, (s = getComputedStyle(el)));
      return s;
    };
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const colorCache = new Map();
    const rgba = (str) => {
      if (colorCache.has(str)) return colorCache.get(str);
      let out = [0, 0, 0, 0];
      if (str && str !== "transparent") {
        const m = str.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
        if (m) {
          const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
          out = [+m[1], +m[2], +m[3], a];
        } else {
          // oklch(), color(), hex: let the canvas turn it into sRGB, then read the alpha from the syntax.
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = "#000";
          ctx.fillStyle = str;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          const alpha = d[3] / 255;
          out = alpha > 0 ? [d[0] / alpha, d[1] / alpha, d[2] / alpha, alpha] : [0, 0, 0, 0];
        }
      }
      colorCache.set(str, out);
      return out;
    };
    const over = (top, base) => {
      const a = top[3];
      return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a), 1];
    };
    const lum = (c) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const opacityCache = new Map();
    const opacity = (el) => {
      if (!el || el.nodeType !== 1) return 1;
      if (opacityCache.has(el)) return opacityCache.get(el);
      const s = cs(el);
      let o = s.visibility === "hidden" || s.visibility === "collapse" || s.display === "none" ? 0 : parseFloat(s.opacity);
      if (o > 0) o *= opacity(el.parentElement);
      opacityCache.set(el, o);
      return o;
    };
    // The opacity a text settles at: an opacity a script set inline (a fade or a scrubbed stagger caught between its
    // ends, such as a drawing's callout numbers setting in one by one) counts as whole, so contrast judges the colours
    // the reader is left with. An opacity from a stylesheet, and a hidden element, still count as they are.
    const settled = (el) => {
      if (!el || el.nodeType !== 1) return 1;
      const s = cs(el);
      if (s.visibility === "hidden" || s.visibility === "collapse" || s.display === "none") return 0;
      const own = parseFloat(s.opacity);
      return (el.style?.opacity !== "" && own > 0 ? 1 : own) * settled(el.parentElement);
    };
    const translation = (el) => {
      const t = cs(el).transform;
      if (!t || t === "none") return { x: 0, y: 0 };
      try {
        const m = new DOMMatrixReadOnly(t);
        return { x: m.m41, y: m.m42 };
      } catch {
        return { x: 0, y: 0 };
      }
    };
    // A layer a script is scaling up (an inline transform past 1) is a zoom in progress: its type falls away past the
    // edges by design (zoom-through), the way a sliding track does. A scale set in a stylesheet is not exempt.
    const zooming = (el) => {
      if (!el.style?.transform) return false;
      const t = cs(el).transform;
      if (!t || t === "none") return false;
      try {
        const m = new DOMMatrixReadOnly(t);
        return Math.hypot(m.m11, m.m12) > 1.02;
      } catch {
        return false;
      }
    };
    const isMedia = (el) => /^(IMG|VIDEO|CANVAS|PICTURE|IFRAME)$/.test(el.tagName) || (el.tagName === "image" && el.ownerSVGElement);
    const hasImageGround = (el) => {
      const b = cs(el).backgroundImage;
      return b && b !== "none";
    };
    const path = (el) => {
      const parts = [];
      for (let e = el; e && e.nodeType === 1 && e !== document.body && parts.length < 4; e = e.parentElement) {
        let p = e.tagName.toLowerCase();
        if (e.id) {
          parts.unshift(`${p}#${e.id}`);
          break;
        }
        const data = [...e.attributes].find((a) => a.name.startsWith("data-") && !/^data-(ready|shown|live|motion|armed|t0)$/.test(a.name));
        if (data) p += data.value && data.value.length < 30 ? `[${data.name}="${data.value}"]` : `[${data.name}]`;
        else if (e.parentElement) {
          const same = [...e.parentElement.children].filter((c) => c.tagName === e.tagName);
          if (same.length > 1) p += `:nth-of-type(${same.indexOf(e) + 1})`;
        }
        parts.unshift(p);
      }
      return parts.join(" > ");
    };
    const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    const add = (f) => findings.push({ scrollY: sy, ...f });

    /* --- every visible text node, line by line, with its ink box */
    const texts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!/\S/.test(node.data)) continue;
      const el = node.parentElement;
      if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION|TEXTAREA)$/.test(el.tagName) || el.closest("svg")) continue;
      range.selectNodeContents(node);
      const lines = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5 && r.bottom > 0 && r.top < vh);
      if (!lines.length) continue;
      const o = opacity(el);
      if (o < 0.05) continue;
      const s = cs(el);
      const color = rgba(s.webkitTextFillColor || s.color);
      if (color[3] * o < 0.05) continue;
      const fontSize = parseFloat(s.fontSize) || 16;
      let str = node.data.trim();
      if (s.textTransform === "uppercase") str = str.toUpperCase();
      else if (s.textTransform === "lowercase") str = str.toLowerCase();
      ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const m = ctx.measureText(str);
      const asc = m.fontBoundingBoxAscent;
      const desc = m.fontBoundingBoxDescent;
      const ink = lines.map((r) => {
        if (!(asc + desc > 0)) return { l: r.left, r: r.right, t: r.top, b: r.bottom + 0.25 * fontSize };
        const k = r.height / (asc + desc);
        const base = r.top + asc * k;
        return { l: r.left, r: r.right, t: base - m.actualBoundingBoxAscent * k, b: base + Math.max(m.actualBoundingBoxDescent, 0) * k };
      });
      texts.push({ node, el, lines, ink, color, o, fontSize, weight: parseFloat(s.fontWeight) || 400, family: s.fontFamily, font: ctx.font, transform: s.textTransform, asc, desc, text: node.data.replace(/\s+/g, " ").trim() });
    }
    /** The ink of each glyph of a text that falls inside a box: a line box is mostly air, its letters are not. */
    const glyphsIn = (t, box) => {
      const out = [];
      ctx.font = t.font;
      for (let i = 0; i < t.node.data.length; i++) {
        let ch = t.node.data[i];
        if (!/\S/.test(ch)) continue;
        range.setStart(t.node, i);
        range.setEnd(t.node, i + 1);
        for (const r of range.getClientRects()) {
          if (r.right < box.l || r.left > box.r || r.bottom < box.t - t.fontSize || r.top > box.b + t.fontSize) continue;
          if (t.transform === "uppercase") ch = ch.toUpperCase();
          const m = ctx.measureText(ch);
          const k = t.asc + t.desc > 0 ? r.height / (t.asc + t.desc) : 1;
          const base = r.top + t.asc * k;
          const g = { l: r.left, r: r.right, t: base - m.actualBoundingBoxAscent * k, b: base + Math.max(m.actualBoundingBoxDescent, 0) * k };
          if (Math.min(g.r, box.r) - Math.max(g.l, box.l) >= 2 && Math.min(g.b, box.b) - Math.max(g.t, box.t) >= 2) out.push(g);
        }
      }
      return out;
    };

    /* --- the clip rect each text sits in: overflow hidden or clip ancestors, and the screen's sides */
    const clipOf = (el) => {
      const c = { l: 0, r: vw, t: -Infinity, b: Infinity, byX: null, byY: null, tiny: false };
      // Only the containing-block chain clips: an absolute box skips static ancestors, a fixed one all but transformed.
      const flowOf = (s) => (s.position === "absolute" ? "abs" : s.position === "fixed" ? "fixed" : "flow");
      let flow = "flow";
      for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        const s = cs(a);
        if (a !== el) {
          if (flow === "fixed" && s.transform === "none") continue;
          if (flow === "abs" && s.position === "static" && s.transform === "none") continue;
        }
        flow = flowOf(s);
        const cx = s.overflowX === "hidden" || s.overflowX === "clip";
        const cy = s.overflowY === "hidden" || s.overflowY === "clip";
        if (!cx && !cy) continue;
        const r = a.getBoundingClientRect();
        if (r.width <= 2 || r.height <= 2) c.tiny = true;
        const bl = parseFloat(s.borderLeftWidth) || 0;
        const bt = parseFloat(s.borderTopWidth) || 0;
        if (cx && r.left + bl > c.l) [c.l, c.byX] = [r.left + bl, a];
        if (cx && r.left + bl + a.clientWidth < c.r) [c.r, c.byX] = [r.left + bl + a.clientWidth, a];
        if (cy && r.top + bt > c.t) [c.t, c.byY] = [r.top + bt, a];
        if (cy && r.top + bt + a.clientHeight < c.b) [c.b, c.byY] = [r.top + bt + a.clientHeight, a];
      }
      return c;
    };

    for (const t of texts) {
      t.clip = clipOf(t.el);
      if (t.clip.tiny) {
        t.hidden = true;
        continue;
      }
      // Lines wholly outside their clip are hidden on purpose (a mask before its reveal, a slide off screen).
      t.shown = t.ink.map((k) => k.r > t.clip.l + 1 && k.l < t.clip.r - 1 && k.b > t.clip.t + 1 && k.t < t.clip.b - 1);
      if (!t.shown.some(Boolean)) t.hidden = true;
    }
    const shown = texts.filter((t) => !t.hidden);

    /* --- 2. clipped glyphs */
    for (const t of shown) {
      const tol = Math.max(1.5, 0.03 * t.fontSize);
      t.ink.forEach((k, i) => {
        if (!t.shown[i]) return;
        const c = t.clip;
        const cutB = k.b - c.b;
        const cutT = c.t - k.t;
        const cutL = c.l - k.l;
        const cutR = k.r - c.r;
        if (cutB > tol || cutT > tol) {
          const inkH = k.b - k.t;
          const seen = (Math.min(k.b, c.b) - Math.max(k.t, c.t)) / inkH;
          // A line still travelling through its mask is a reveal in progress, not a cut.
          let moving = false;
          for (let a = t.el; a && a !== c.byY; a = a.parentElement) if (Math.abs(translation(a).y) > 0.5 || zooming(a)) moving = true;
          if (!moving && seen >= 0.5) {
            const where = cutB > tol ? `the bottom ${Math.round(cutB)}px (descenders)` : `the top ${Math.round(cutT)}px`;
            add({ kind: "clipped", text: t.text, selector: path(t.el), detail: `${where} cut by the overflow of ${c.byY ? path(c.byY) : "the screen"}`, key: `clipped|${path(t.el)}|${t.text.slice(0, 40)}|v`, x: k.l });
          }
        }
        if (cutL > tol || cutR > tol) {
          // A text that fits every box up to the clip is a card or belt partly off screen, by design. A text wider than
          // a box that holds it, with no sliding track in between, runs off the edge.
          let verdict = "fits";
          for (let a = t.el; a && a !== document.body; a = a.parentElement) {
            if ((Math.abs(translation(a).x) > 0.5 && a !== t.el) || zooming(a)) {
              verdict = "track";
              break;
            }
            const r = a.getBoundingClientRect();
            if (k.l < r.left - tol || k.r > r.right + tol) {
              verdict = "overflows";
              break;
            }
            if (a === c.byX) break;
          }
          if (verdict === "overflows") {
            const side = cutR > tol ? `${Math.round(cutR)}px past the right` : `${Math.round(cutL)}px past the left`;
            add({ kind: "clipped", text: t.text, selector: path(t.el), detail: `runs ${side} edge of ${c.byX ? path(c.byX) : "the screen"}`, key: `clipped|${path(t.el)}|${t.text.slice(0, 40)}|h`, x: k.l });
          }
        }
      });
    }

    /* --- 1. the header: fixed or sticky, across the top, holding text */
    // A header may be drawn more than once (header-bar and menu-curtain paint a copy per ground), and may sit inside a
    // full-screen fixed layer (the closed menu): every outermost fixed or sticky bar across the top counts.
    const bars = new Set();
    for (const x of [0.08, 0.3, 0.5, 0.7, 0.92]) {
      for (const y of [4, 16, 32, 56]) {
        for (const e of document.elementsFromPoint(x * vw, y)) {
          let bar = null;
          for (let a = e; a && a !== document.body; a = a.parentElement) {
            const p = cs(a).position;
            if (p !== "fixed" && p !== "sticky") continue;
            const r = a.getBoundingClientRect();
            if (r.top < 0.15 * vh && r.bottom >= 0 && r.height < 0.35 * vh && r.width >= 0.5 * vw) bar = a;
          }
          if (bar) bars.add(bar);
        }
      }
    }
    for (const b of [...bars]) for (const o of bars) if (o !== b && o.contains(b)) bars.delete(b);
    const header = bars.size ? { contains: (el) => [...bars].some((b) => b.contains(el)) } : null;
    const inHeader = (t) => header && header.contains(t.el);
    const headerTexts = header ? shown.filter(inHeader) : [];
    const coveredBetween = (stack, a, b) => {
      for (let i = Math.min(a, b) + 1; i < Math.max(a, b); i++) {
        const e = stack[i];
        const s = cs(e);
        if (isMedia(e) || rgba(s.backgroundColor)[3] * opacity(e) >= 0.9 || (s.backdropFilter && s.backdropFilter !== "none") || hasImageGround(e)) return true;
      }
      return false;
    };
    for (const h of headerTexts) {
      h.lines.forEach((hr, i) => {
        if (!h.shown[i]) return;
        for (const b of shown) {
          if (inHeader(b)) continue;
          b.lines.forEach((br, j) => {
            if (!b.shown[j]) return;
            const l = Math.max(hr.left, br.left, 0);
            const r = Math.min(hr.right, br.right, vw);
            const t = Math.max(hr.top, br.top, 0);
            const bt = Math.min(hr.bottom, br.bottom, vh);
            if (r - l < 2 || bt - t < 2) return;
            // The boxes meet; now the letters: the header's ink against the glyphs of the text under it.
            const hk = h.ink[i];
            const hit = glyphsIn(b, { l: Math.max(hk.l, 0), r: Math.min(hk.r, vw), t: Math.max(hk.t, 0), b: Math.min(hk.b, vh) })[0];
            if (!hit) return;
            const cx = (Math.max(hit.l, hk.l) + Math.min(hit.r, hk.r)) / 2;
            const cy = (Math.max(hit.t, hk.t, 0) + Math.min(hit.b, hk.b, vh)) / 2;
            const stack = document.elementsFromPoint(cx, cy);
            const ih = stack.findIndex((e) => e === h.el || h.el.contains(e));
            const ib = stack.findIndex((e) => e === b.el || b.el.contains(e));
            if (ih < 0 || ib < 0 || coveredBetween(stack, ih, ib)) return;
            add({ kind: "collision", text: b.text, selector: path(b.el), detail: `under the header's "${h.text.slice(0, 40)}"`, key: `collision|${path(b.el)}|${b.text.slice(0, 40)}` });
          });
        }
      });
    }

    // A short heading can slip under the header between two steps (running text has lines enough to be caught). Text in the page's flow moves exactly with the scroll,
    // so find the first scroll distance within the next step where its letters would meet a see-through header's: the
    // run stops there too and measures it for real.
    let next = null;
    const known = new Set(opts.known ?? []);
    const rides = (el) => {
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const p = cs(a).position;
        if (p === "fixed" || p === "sticky") return true;
      }
      return false;
    };
    for (const h of headerTexts) {
      h.ink.forEach((hk, i) => {
        if (!h.shown[i] || hk.b <= 0 || hk.t >= vh) return;
        const stack = document.elementsFromPoint(Math.min(Math.max((hk.l + hk.r) / 2, 0), vw - 1), Math.min(Math.max((hk.t + hk.b) / 2, 0), vh - 1));
        const ih = stack.findIndex((e) => e === h.el || h.el.contains(e));
        const below = stack.findIndex((e, k) => k > ih && !header.contains(e));
        if (ih < 0 || below < 0 || coveredBetween(stack, ih, below)) return;
        for (const b of shown) {
          if (b.fontSize < 20 || inHeader(b) || rides(b.el) || known.has(`collision|${path(b.el)}|${b.text.slice(0, 40)}`)) continue;
          if (!b.lines.some((r) => r.top < hk.b + opts.stepPx && r.bottom > hk.b && r.right > hk.l && r.left < hk.r)) continue;
          for (const g of glyphsIn(b, { l: hk.l, r: hk.r, t: hk.b, b: hk.b + opts.stepPx })) {
            const lo = g.t - hk.b + 2;
            const hi = g.b - hk.t - 2;
            const d = Math.round((Math.max(lo, 0) + hi) / 2);
            if (hi > lo && d >= 40 && d < opts.stepPx && (next === null || d < next)) next = d;
          }
        }
      });
    }

    /* --- 1b. the site name twice on the first screen */
    const MARK = "[data-wordmark],[data-hb-word]";
    const pick = (sel) => [...bars].map((b) => b.querySelector(sel)).find((e) => e && opacity(e) > 0.05 && /\S/.test(e.textContent ?? ""));
    const homeMark = header ? (pick(MARK) ?? pick('a[href="/"]') ?? headerTexts[0]?.el ?? null) : null;
    if (opts.first && header) {
      const mark = homeMark;
      const name = mark && opacity(mark) > 0.05 ? norm(mark.innerText || mark.textContent || "") : "";
      if (name.length >= 2) {
        const seen = new Set();
        for (const t of shown) {
          if (inHeader(t)) continue;
          for (let a = t.el, n = 0; a && a !== document.body && n < 4; a = a.parentElement, n++) {
            if (seen.has(a)) break;
            seen.add(a);
            const r = a.getBoundingClientRect();
            if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= vh) continue;
            if (norm(a.innerText || "") === name) {
              add({ kind: "collision", text: a.innerText.trim(), selector: path(a), detail: "the site name shows twice on the first screen: in the header and here", key: `name|${path(a)}` });
              break;
            }
          }
        }
      }
    }

    /* --- 4. contrast against the ground under the text */
    const done = new Set();
    const photo = [];
    for (const t of shown) {
      if (done.has(t.el)) continue;
      done.add(t.el);
      let blend = false;
      for (let a = t.el; a; a = a.parentElement) if (cs(a).mixBlendMode !== "normal") blend = true;
      if (blend) continue;
      const i = t.shown.findIndex(Boolean);
      const lr = t.lines[i];
      const px = Math.min(Math.max((lr.left + lr.right) / 2, 1), vw - 1);
      const py = Math.min(Math.max((lr.top + lr.bottom) / 2, 1), vh - 1);
      const stack = document.elementsFromPoint(px, py);
      const at = stack.findIndex((e) => e === t.el || t.el.contains(e));
      if (at < 0) continue;
      const layers = [];
      let ground = null;
      let image = false;
      // A box under the line's centre that covers less than half the line is no ground: a hairline seam standing
      // through a word (split-pair) read as the word's ground once, so the accent measured 2.88 against the seam.
      const lineArea = Math.max(1, lr.width * lr.height);
      const underLine = (e) => {
        const r = e.getBoundingClientRect();
        const w = Math.min(r.right, lr.right) - Math.max(r.left, lr.left);
        const h = Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top);
        return w > 0 && h > 0 && w * h >= 0.5 * lineArea;
      };
      for (let k = at; k < stack.length; k++) {
        const e = stack[k];
        if (k > at && t.el.contains(e)) continue;
        if (k > at && !isMedia(e) && !underLine(e)) continue;
        if (k > at && isMedia(e)) {
          image = true;
          break;
        }
        if (hasImageGround(e)) {
          image = true;
          break;
        }
        const bg = rgba(cs(e).backgroundColor);
        const a = bg[3] * parseFloat(cs(e).opacity);
        if (a <= 0.01) continue;
        if (a >= 0.99) {
          ground = [bg[0], bg[1], bg[2], 1];
          break;
        }
        layers.push([bg[0], bg[1], bg[2], a]);
      }
      const ink = [t.color[0], t.color[1], t.color[2], t.color[3] * settled(t.el)];
      const need = t.fontSize >= 24 ? 3 : 4.5;
      const flatten = (base) => {
        let g = base;
        for (let k = layers.length - 1; k >= 0; k--) g = over(layers[k], g);
        return g;
      };
      if (image) {
        // Over a photo the pixels decide; a scrim that holds against both black and white settles it here. Large text
        // (24px, or 18.66px bold) and the wordmark in the header or nav need 3, smaller text 4.5.
        const large = t.fontSize >= 24 || (t.fontSize >= 18.66 && t.weight >= 700);
        const mark = Boolean(t.el.closest(MARK) || (homeMark && homeMark.contains(t.el)) || ((inHeader(t) || t.el.closest("nav")) && t.el.closest('a[href="/"]')));
        const needOnPhoto = large || mark ? 3 : 4.5;
        const worst = Math.min(...[[0, 0, 0, 1], [255, 255, 255, 1]].map((p) => {
          const g = flatten(p);
          return ratio(over(ink, g), g);
        }));
        if (worst < needOnPhoto) {
          // The run hides the text, screenshots the ground and reads these boxes (the ink of each line on screen).
          const g = t.el.closest(`a,button,h1,h2,h3,h4,h5,h6,p,li,label,figcaption,blockquote,${MARK}`) ?? t.el;
          // Points across the ink of each line on screen, kept only where nothing opaque lies over the text (a panel
          // sliding over a hero title covers part of it; those pixels are not its ground).
          const boxes = t.ink
            .map((k, j) => (t.shown[j] ? { l: Math.max(k.l, t.clip.l, 0), r: Math.min(k.r, t.clip.r, vw), t: Math.max(k.t, t.clip.t, 0), b: Math.min(k.b, t.clip.b, vh) } : null))
            .filter((b) => b && b.r - b.l >= 1 && b.b - b.t >= 1);
          const area = boxes.reduce((n, b) => n + (b.r - b.l) * (b.b - b.t), 0);
          const gap = Math.max(3, Math.sqrt(area / 80));
          const points = [];
          for (const b of boxes) {
            for (let y = b.t + gap / 2; y < b.b; y += gap) {
              for (let x = b.l + gap / 2; x < b.r; x += gap) {
                const stack = document.elementsFromPoint(Math.min(x, vw - 1), Math.min(y, vh - 1));
                const at = stack.findIndex((e) => e === t.el || t.el.contains(e));
                if (at >= 0 && !coveredBetween(stack, -1, at)) points.push([Math.round(x), Math.round(y)]);
              }
            }
          }
          photo.push({
            group: path(g),
            // A word set twice for a hover roll reads once.
            text: (g.innerText || t.text).replace(/\s+/g, " ").trim().replace(/^(.+?)(?: \1)+$/, "$1").slice(0, 120),
            selector: path(t.el),
            own: t.text,
            ink,
            points,
            need: needOnPhoto,
            mark,
            size: Math.round(t.fontSize),
            rect: { x: lr.left, y: lr.top, w: lr.width, h: lr.height },
          });
        }
        continue;
      }
      const g = flatten(ground ?? [255, 255, 255, 1]);
      const r = ratio(over(ink, g), g);
      if (r < need) {
        add({ kind: "contrast", text: t.text, selector: path(t.el), detail: `${r.toFixed(2)} against its ground, needs ${need} at ${Math.round(t.fontSize)}px`, key: `contrast|${path(t.el)}|${t.text.slice(0, 40)}` });
      }
    }

    const chromeCache = new Map();
    const chrome = (el) => {
      if (!el || el === document.body) return false;
      if (chromeCache.has(el)) return chromeCache.get(el);
      const p = cs(el).position;
      const v = (header && header.contains(el)) || ((p === "fixed" || p === "sticky") && el.getBoundingClientRect().height < 0.35 * vh) || chrome(el.parentElement);
      chromeCache.set(el, v);
      return v;
    };

    /* --- 3b. covered: a line partly under a canvas, a photo or an opaque panel that sits above it and holds still
       (proof run 2026-11-25: a split screen's headline ran under its own 3D panel and read "Lyset er i gl"). A cover
       a script is moving (a panel sliding over the hero, a zoom) is a transition in progress; a line wholly under a
       cover is hidden on purpose (stacked cards); the header and small fixed chrome are on every screen. */
    const coverOf = (stack, at, el) => {
      for (let i = 0; i < at; i++) {
        const e = stack[i];
        if (el.contains(e)) continue;
        const s = cs(e);
        const solid = (isMedia(e) && opacity(e) >= 0.5) || rgba(s.backgroundColor)[3] * opacity(e) >= 0.9 || (hasImageGround(e) && opacity(e) >= 0.5);
        if (!solid || chrome(e)) continue;
        return e;
      }
      return null;
    };
    const sliding = (el) => {
      for (let a = el; a && a !== document.body; a = a.parentElement) if ((a.style?.transform && (Math.abs(translation(a).x) > 0.5 || Math.abs(translation(a).y) > 0.5)) || zooming(a)) return true;
      return false;
    };
    const coveredDone = new Set();
    for (const t of shown) {
      if (t.fontSize < 14 || inHeader(t) || chrome(t.el) || coveredDone.has(t.el)) continue;
      let total = 0;
      let under = 0;
      let by = null;
      t.ink.forEach((k, i) => {
        if (!t.shown[i]) return;
        const l = Math.max(k.l, t.clip.l, 0);
        const r = Math.min(k.r, t.clip.r, vw - 1);
        const y = Math.min(Math.max((k.t + k.b) / 2, 0), vh - 1);
        if (r - l < 4 || y <= 0 || y >= vh - 1) return;
        const n = Math.min(16, Math.max(4, Math.round((r - l) / 24)));
        for (let j = 0; j < n; j++) {
          const x = l + ((j + 0.5) * (r - l)) / n;
          const stack = document.elementsFromPoint(x, y);
          const at = stack.findIndex((e) => e === t.el || t.el.contains(e));
          if (at < 0) continue;
          total++;
          const c = coverOf(stack, at, t.el);
          if (c) {
            under++;
            by ??= c;
          }
        }
      });
      if (!by || total < 4) continue;
      const share = under / total;
      // A canvas is see-through where nothing is drawn, so a line wholly under one still shows, and the object paints
      // over it wherever it passes (proof run 2026-11-26: a fixed world canvas sat above the page and its lamp hung
      // across "Lyset er det du kjoper."). Under a canvas no share is hidden on purpose.
      const canvas = by.tagName === "CANVAS";
      if (share < 0.12 || (share > 0.92 && !canvas) || sliding(by)) continue;
      coveredDone.add(t.el);
      const what = isMedia(by) ? `the ${by.tagName.toLowerCase()} ${path(by)}` : path(by);
      const fix = canvas
        ? "the 3D sits above the type and paints over it wherever the object passes: put the world canvas behind the page (-z-10 on a fixed Stage), or raise the type above it (relative z-10)"
        : "move the type to the calm side of the panel, give it the panel's width, or raise it above (z-index)";
      add({ kind: "covered", text: t.text, selector: path(t.el), detail: `${Math.round(share * 100)}% of the line sits under ${what}: ${fix}`, key: `covered|${path(t.el)}|${t.text.slice(0, 40)}` });
    }

    /* --- 3b'. over the object: a line with a canvas UNDER it in the stack (the world behind the page, at -z-10), so
       covered never sees it (proof run 2026-11-26, Leirvik: the centerpiece sentence sat on the vase). The page only
       knows the canvas is there; the run hides the glyphs and reads what the canvas draws inside the line's box. */
    const overs = new Map();
    const propagated = rgba(cs(document.documentElement).backgroundColor)[3] === 0 && cs(document.documentElement).backgroundImage === "none";
    for (const t of shown) {
      if (t.fontSize < 14 || inHeader(t) || chrome(t.el)) continue;
      t.ink.forEach((k, i) => {
        if (!t.shown[i]) return;
        const box = { l: Math.max(k.l, t.clip.l, 0), r: Math.min(k.r, t.clip.r, vw - 1), t: Math.max(k.t, t.clip.t, 0), b: Math.min(k.b, t.clip.b, vh - 1) };
        if (box.r - box.l < 8 || box.b - box.t < 4) return;
        const y = (box.t + box.b) / 2;
        let hits = 0;
        for (const f of [0.2, 0.5, 0.8]) {
          const stack = document.elementsFromPoint(box.l + f * (box.r - box.l), y);
          const at = stack.findIndex((e) => e === t.el || t.el.contains(e));
          if (at < 0) continue;
          const c = stack.findIndex((e, j) => j > at && e.tagName === "CANVAS" && opacity(e) >= 0.3);
          // The body's ground is the viewport's when <html> has none: it is painted under a -z-10 canvas, not over it.
          if (c < 0) continue;
          const between = stack.slice(at, c + 1).filter((e) => !(propagated && e === document.body));
          if (!coveredBetween(between, 0, between.length - 1)) hits++;
        }
        if (hits < 2) return;
        const g = t.el.closest("a,button,h1,h2,h3,h4,h5,h6,p,li,label,figcaption,blockquote") ?? t.el;
        const text = (g.innerText || t.text).replace(/\s+/g, " ").trim().slice(0, 120);
        const key = `object|${path(g)}|${text.slice(0, 40)}`;
        const o = overs.get(key) ?? { key, text, selector: path(g), size: t.fontSize, boxes: [] };
        o.size = Math.max(o.size, t.fontSize);
        o.boxes.push(box);
        overs.set(key, o);
      });
    }

    /* --- 3e. the phone: what a thumb and an eye need at 390 wide. Half the visitors read the site here. */
    if (opts.phone) {
      const words = (s) => s.split(/\s+/).filter(Boolean).length;
      const inView = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      // Tap targets: 44 by 44 CSS px. A link inside a running sentence is exempt (it is part of the text). The page's
      // door and the menu button are how a phone visitor goes anywhere: those fail.
      const TAPS = 'a[href],button,[role="button"],input[type="submit"],input[type="button"],summary';
      for (const e of document.querySelectorAll(TAPS)) {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || !inView(r) || opacity(e) < 0.3 || e.closest('[aria-hidden="true"],[inert]')) continue;
        if (r.width >= 44 && r.height >= 44) continue;
        if (cs(e).display === "inline") {
          const block = e.parentElement?.closest("p,li,dd,td,blockquote,figcaption,label");
          const own = norm(e.textContent ?? "").length;
          if (block && norm(block.textContent ?? "").length >= own + 12) continue;
        }
        const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
        const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
        const stack = document.elementsFromPoint(cx, cy);
        const at = stack.findIndex((x) => x === e || e.contains(x));
        if (at < 0 || coveredBetween(stack, -1, at)) continue;
        // A hover roll sets its word twice ("MenuMenu"), so the text is read from its start.
        const menu = e.matches("[data-menu-toggle],[aria-expanded],[aria-haspopup]") || /\bmen(u|y|ü)\b/i.test(e.getAttribute("aria-label") ?? "") || /^\s*men(u|y|ü)/i.test(e.textContent ?? "") || /#men(u|y)$/i.test(e.getAttribute("href") ?? "");
        const door = e.matches("[data-door],[data-door-placeholder]") || Boolean(e.closest("[data-door],[data-door-placeholder]"));
        const name = (e.getAttribute("aria-label") || e.textContent || e.getAttribute("href") || "").replace(/\s+/g, " ").trim().slice(0, 60);
        const what = door ? "the page's door" : menu ? "the menu button" : "a tap target";
        add({
          kind: "tap-target",
          severity: door || menu ? "FAIL" : "WARN",
          text: name,
          selector: path(e),
          detail: `${what} is ${Math.round(r.width)} by ${Math.round(r.height)}px on a phone, under 44 by 44: give it padding or a min-h-11 min-w-11 hit area${door ? ", and set the door large, filled and full width on a phone" : ""}`,
          key: `tap|${path(e)}|${name.slice(0, 30)}`,
        });
      }
      // Running text under 15px on a phone is read with a squint. Labels and captions of a few words may be small.
      const small = new Set();
      for (const t of shown) {
        if (t.fontSize >= 15 || inHeader(t) || chrome(t.el)) continue;
        const block = t.el.closest("p,li,dd,blockquote,td");
        if (!block || small.has(block) || words(t.text) < 4 || words(block.innerText || "") < 10) continue;
        small.add(block);
        add({ kind: "small-text", text: (block.innerText || t.text).replace(/\s+/g, " ").trim().slice(0, 120), selector: path(block), detail: `running text at ${Math.round(t.fontSize * 10) / 10}px on a phone: body text is 15px or more (text-body), never a squeezed desktop size`, key: `small|${path(block)}` });
      }
      // A field under 16px makes iOS zoom the page in when it is tapped.
      for (const e of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="range"]):not([type="color"]):not([type="file"]),select,textarea')) {
        const r = e.getBoundingClientRect();
        const size = parseFloat(cs(e).fontSize) || 16;
        if (size >= 16 || r.width < 4 || r.height < 4 || !inView(r) || opacity(e) < 0.3) continue;
        add({ kind: "input-zoom", text: e.getAttribute("name") || e.getAttribute("placeholder") || e.tagName.toLowerCase(), selector: path(e), detail: `a field at ${Math.round(size)}px: iOS zooms the page in when it is tapped; set fields at 16px or more on a phone`, key: `input|${path(e)}` });
      }
      // Chrome that rides with the screen (a header, a bar, a banner) and eats more than a quarter of it. A pinned or
      // sticky scene and a full-screen layer (an open menu, the world) are the page, not chrome.
      for (const e of document.querySelectorAll("body *")) {
        const s = cs(e);
        if (s.position !== "fixed" && s.position !== "sticky") continue;
        if (s.position === "sticky" && e.closest("main,section,article,[data-scene],[data-beat]")) continue;
        if (e.parentElement?.classList.contains("pin-spacer") || (e.parentElement && rides(e.parentElement)) || parseInt(s.zIndex, 10) < 0 || opacity(e) < 0.3) continue;
        const r = e.getBoundingClientRect();
        const w = Math.min(r.right, vw) - Math.max(r.left, 0);
        const h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (w <= 0 || h <= 0 || r.height >= 0.9 * vh) continue;
        const share = (w * h) / (vw * vh);
        if (share <= 0.25) continue;
        add({ kind: "fixed-cover", text: (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60), selector: path(e), detail: `a ${s.position} element covers ${Math.round(share * 100)}% of the phone screen on every scroll: keep fixed chrome to a slim bar (under a quarter of the screen) on a phone`, key: `fixed|${path(e)}` });
      }
    }

    /* --- 3c. type at display size after the first screen, for the page's scale ladder. A display moment is a block
       of text at poster scale (at least 72px and 7vw); a wall is one with more than 20 words. */
    const display = [];
    {
      const big = Math.max(72, 0.07 * vw);
      const blocks = new Map();
      for (const t of shown) {
        if (t.fontSize < big || inHeader(t) || chrome(t.el)) continue;
        if (!t.lines.some((r, i) => t.shown[i] && r.bottom > 0 && r.top < vh)) continue;
        const g = t.el.closest("h1,h2,h3,h4,h5,h6,p,blockquote,li,figcaption,[data-scene]") ?? t.el;
        if (g.closest("footer")) continue;
        const top = Math.min(...t.lines.map((r) => r.top)) + sy;
        const b = blocks.get(g) ?? { key: path(g), text: (g.innerText || t.text).replace(/\s+/g, " ").trim(), top, size: t.fontSize };
        b.top = Math.min(b.top, top);
        b.size = Math.max(b.size, t.fontSize);
        blocks.set(g, b);
      }
      for (const b of blocks.values()) display.push({ ...b, words: b.text.split(/\s+/).filter(Boolean).length, text: b.text.slice(0, 120) });
    }

    /* --- 4b. a number broken over two lines: "3 900.00" wrapping at its group space reads as two numbers. Every token
       (an optional currency, digits with thousands groups, decimals, a percent or a unit) gets its own Range, and the
       centres of its client rects say how many line boxes its glyphs sit on. */
    const NUMBER = /(?<![\p{L}\p{N}])(?:(?:[€$£¥]|EUR|USD|GBP|CHF)[   ]?)?[+-]?(?:\d{1,3}(?:[   .,'’]\d{3})+|\d+)(?:[.,]\d+)?(?:,-)?(?:[   ]?(?:%|‰|€|EUR|USD|km|kg|m²|m2|m³|cm|mm|ml|uur|min|mln|mld))?(?![\p{L}\p{N}])/gu;
    for (const t of shown) {
      if (!/\d/.test(t.node.data)) continue;
      for (const m of t.node.data.matchAll(NUMBER)) {
        if (m[0].length < 2) continue;
        range.setStart(t.node, m.index);
        range.setEnd(t.node, m.index + m[0].length);
        const rs = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
        if (rs.length < 2) continue;
        const h = Math.min(...rs.map((r) => r.height));
        const mids = rs.map((r) => r.top + r.height / 2).sort((a, b) => a - b);
        let boxes = 1;
        for (let i = 1; i < mids.length; i++) if (mids[i] - mids[i - 1] > h / 2) boxes++;
        if (boxes < 2) continue;
        const top = rs.reduce((a, b) => (b.top < a.top ? b : a));
        if (top.bottom <= 0 || top.top >= vh) continue;
        add({ kind: "broken-number", text: m[0], selector: path(t.el), detail: `the number breaks over ${boxes} lines: keep it whole (a no-break space between its groups, or white-space: nowrap on it)`, key: `number|${path(t.el)}|${m[0]}` });
      }
    }

    /* --- 4c. for the blank-screen test: is any text on this screen actually seen (not under a curtain or a panel)?
       The header is on every screen and does not count; its bars, small fixed or sticky chrome and the cursor are left
       out of the pixels. */
    const seenText = shown.some((t) => !inHeader(t) && t.lines.some((r, i) => {
      if (!t.shown[i]) return false;
      const stack = document.elementsFromPoint(Math.min(Math.max((r.left + r.right) / 2, 0), vw - 1), Math.min(Math.max((r.top + r.bottom) / 2, 0), vh - 1));
      const at = stack.findIndex((e) => e === t.el || t.el.contains(e));
      return at >= 0 && !coveredBetween(stack, -1, at);
    }));
    const mask = [];
    if (!seenText) {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom };
      };
      for (const b of bars) mask.push(box(b));
      for (const e of document.querySelectorAll("body *")) {
        const p = cs(e).position;
        if (p !== "fixed" && p !== "sticky") continue;
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.height < 0.35 * vh && r.bottom > 0 && r.top < vh) mask.push(box(e));
      }
    }

    /* --- 4d. the faces the visible text asks for first; the run asks document.fonts about them at the end */
    const families = {};
    for (const t of shown) {
      const first = (t.family.match(/^\s*("[^"]*"|'[^']*'|[^,]+)/)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
      if (first && !(first in families)) families[first] = t.text.slice(0, 60);
    }

    /* --- 5. what holds content on this screen, in document coordinates. Chrome that rides along with the scroll
       (the header, a small fixed button or cursor) is on every screen, so it holds nothing. A pinned scene does. */
    const hold = (e) => {
      const r = e.getBoundingClientRect();
      const w = Math.min(r.right, vw) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (w < 48 || h < 48 || opacity(e) < 0.05 || chrome(e)) return;
      content.push([Math.max(r.top, 0) + sy, Math.min(r.bottom, vh) + sy]);
    };
    for (const t of shown) {
      if ((t.text.length <= 3 && t.fontSize < 20) || chrome(t.el)) continue;
      t.lines.forEach((r, i) => t.shown[i] && content.push([r.top + sy, r.bottom + sy]));
    }
    for (const e of document.querySelectorAll("img,video,canvas,picture,svg,iframe")) hold(e);
    for (const e of document.querySelectorAll("body *")) if (hasImageGround(e)) hold(e);

    const footer = [...document.querySelectorAll("footer")].pop();
    const broken = opts.last
      ? [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src)).map((i) => ({ src: i.currentSrc || i.src, selector: path(i) }))
      : [];
    return {
      findings,
      content,
      scrollY: sy,
      viewport: { width: vw, height: vh },
      docWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      docHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      footerTop: footer ? footer.getBoundingClientRect().top + sy : null,
      broken,
      next,
      photo,
      over: [...overs.values()],
      quiet: !seenText,
      mask,
      families,
      display,
    };
  } finally {
    force.remove();
  }
}

/* ------------------------------------------------------------- PIXELS */
// Playwright's screenshots are 8-bit, non-interlaced PNGs; this reads one into raw pixels without a dependency.
function decodePng(buf) {
  let pos = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let type = -1;
  let interlace = 0;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const name = buf.toString("latin1", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (name === "IHDR") [w, h, depth, type, interlace] = [data.readUInt32BE(0), data.readUInt32BE(4), data[8], data[9], data[12]];
    else if (name === "IDAT") idat.push(data);
    else if (name === "IEND") break;
    pos += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (depth !== 8 || interlace || !ch || !w || !h) return null;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const cur = y * stride;
    const prev = cur - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[cur + x - ch] : 0;
      const b = y ? out[prev + x] : 0;
      const c = x >= ch && y ? out[prev + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[cur + x] = v & 255;
    }
  }
  const gray = ch < 3;
  return { width: w, height: h, at: (x, y) => { const i = (y * w + x) * ch; return gray ? [out[i], out[i], out[i]] : [out[i], out[i + 1], out[i + 2]]; } };
}

const LINEAR = Array.from({ length: 256 }, (_, v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
const lumOf = (c) => 0.2126 * LINEAR[Math.round(c[0])] + 0.7152 * LINEAR[Math.round(c[1])] + 0.0722 * LINEAR[Math.round(c[2])];
const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Blank: 8px blocks over the screen (chrome left out); one flat colour when no block strays from the median, or only
 *  thin runs of them do (a seam, a hairline, the slit of a curtain opening) and at most a few loose ones. */
function flatScreen(img, mask) {
  const B = 8;
  const cols = Math.floor(img.width / B);
  const rows = Math.floor(img.height / B);
  const means = new Array(cols * rows).fill(null);
  let kept = 0;
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const [l, t] = [bx * B, by * B];
      if (mask.some((m) => l < m.r && l + B > m.l && t < m.b && t + B > m.t)) continue;
      const s = [0, 0, 0];
      for (let y = t; y < t + B; y++) {
        for (let x = l; x < l + B; x++) {
          const p = img.at(x, y);
          s[0] += p[0];
          s[1] += p[1];
          s[2] += p[2];
        }
      }
      means[by * cols + bx] = s.map((v) => v / (B * B));
      kept++;
    }
  }
  if (!kept || kept < 0.4 * cols * rows) return { blank: false };
  const blocks = means.filter(Boolean);
  const med = [0, 1, 2].map((k) => blocks.map((v) => v[k]).sort((a, b) => a - b)[blocks.length >> 1]);
  const off = means.map((v) => Boolean(v) && Math.max(...v.map((c, k) => Math.abs(c - med[k]))) > 14);
  // Strays that touch form shapes; a shape three blocks (24px) thin or less across is a line, not content.
  let solid = 0;
  const seen = new Uint8Array(off.length);
  for (let i = 0; i < off.length; i++) {
    if (!off[i] || seen[i]) continue;
    const queue = [i];
    seen[i] = 1;
    let [x0, x1, y0, y1, n] = [cols, -1, rows, -1, 0];
    while (queue.length) {
      const j = queue.pop();
      const [x, y] = [j % cols, Math.floor(j / cols)];
      [x0, x1, y0, y1, n] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y), n + 1];
      for (const k of [x > 0 ? j - 1 : -1, x < cols - 1 ? j + 1 : -1, j - cols, j + cols]) {
        if (k >= 0 && k < off.length && off[k] && !seen[k]) {
          seen[k] = 1;
          queue.push(k);
        }
      }
    }
    if (Math.min(x1 - x0 + 1, y1 - y0 + 1) > 3) solid += n;
  }
  const strays = off.filter(Boolean).length;
  return { blank: solid <= 16 && strays <= 0.08 * kept, color: hex(med) };
}

/** The worse quartile of the contrast between a text's colour and the pixels behind its ink (3x3 around each uncovered
 *  point), per group. */
function groundRatios(img, groups) {
  const out = new Map();
  for (const g of groups) {
    const ratios = [];
    for (const item of g.items) {
      const [ir, ig, ib, ia] = item.ink;
      for (const [px, py] of item.points) {
        for (let y = Math.max(0, py - 1); y <= Math.min(img.height - 1, py + 1); y++) {
          for (let x = Math.max(0, px - 1); x <= Math.min(img.width - 1, px + 1); x++) {
            const p = img.at(x, y);
            const text = [ir * ia + p[0] * (1 - ia), ig * ia + p[1] * (1 - ia), ib * ia + p[2] * (1 - ia)];
            const [hi, lo] = [lumOf(text), lumOf(p)].sort((a, b) => b - a);
            ratios.push((hi + 0.05) / (lo + 0.05));
          }
        }
      }
    }
    ratios.sort((a, b) => a - b);
    out.set(g.key, { n: ratios.length, ratio: ratios.length ? ratios[Math.floor(0.25 * (ratios.length - 1))] : null });
  }
  return out;
}

const MIN_PIXELS = 27;

/** Group the texts over a photo by the link, heading or paragraph they belong to (a word split into letters is one). */
function photoGroups(photo, seen) {
  const groups = new Map();
  for (const c of photo) {
    const key = `unreadable|${c.group}|${c.text.slice(0, 40)}`;
    if (seen.has(key)) continue;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, group: c.group, text: c.text, need: c.need, mark: c.mark, size: c.size, rect: c.rect, warn: c, items: [] }));
    g.items.push({ ink: c.ink, points: c.points });
    g.need = Math.min(g.need, c.need);
    g.mark ||= c.mark;
    g.size = Math.max(g.size, c.size);
  }
  return [...groups.values()];
}

/** Hide every glyph (color transparent, no transition), screenshot the ground, show them again, and measure. */
async function behind(page, groups) {
  if (!groups.length) return new Map();
  const img = await groundShot(page);
  return img ? groundRatios(img, groups) : new Map();
}

/**
 * Over the object: what the canvas draws inside a line's box (padded by a third of the type size), with the glyphs
 * hidden. The box is read in 4px blocks (grain averages out) and a smooth ground is fitted to them: a quadratic in x
 * and y per channel, refitted on the closer 60 percent, so a lit wall, a pool of light or a vignette is all ground.
 * Blocks more than 28 levels off that ground are something drawn there: an object, its edge, its shadow. A tenth of
 * the box or more is the object under the line.
 */
function objectUnder(img, boxes, size) {
  const B = 4;
  const pad = Math.round(size / 3);
  const blocks = [];
  const seen = new Set();
  for (const b of boxes) {
    const l = Math.max(0, Math.floor((b.l - pad) / B));
    const r = Math.min(Math.floor(img.width / B) - 1, Math.floor((b.r + pad) / B));
    const t = Math.max(0, Math.floor((b.t - pad) / B));
    const bt = Math.min(Math.floor(img.height / B) - 1, Math.floor((b.b + pad) / B));
    for (let by = t; by <= bt; by++) {
      for (let bx = l; bx <= r; bx++) {
        if (seen.has(by * 100000 + bx)) continue;
        seen.add(by * 100000 + bx);
        const s = [0, 0, 0];
        for (let y = by * B; y < by * B + B; y++) {
          for (let x = bx * B; x < bx * B + B; x++) {
            const p = img.at(x, y);
            s[0] += p[0];
            s[1] += p[1];
            s[2] += p[2];
          }
        }
        blocks.push({ x: bx, y: by, c: s.map((v) => v / (B * B)) });
      }
    }
  }
  if (blocks.length < 24) return { share: 0 };
  const xs = blocks.map((k) => k.x);
  const ys = blocks.map((k) => k.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const nx = (x) => (x1 > x0 ? (2 * (x - x0)) / (x1 - x0) - 1 : 0);
  const ny = (y) => (y1 > y0 ? (2 * (y - y0)) / (y1 - y0) - 1 : 0);
  const feat = (k) => {
    const [x, y] = [nx(k.x), ny(k.y)];
    return [1, x, y, x * x, x * y, y * y];
  };
  const fit = (set) => {
    // Normal equations, one solve for the three channels, a touch of ridge so a flat row stays solvable.
    const A = Array.from({ length: 6 }, () => new Array(9).fill(0));
    for (const k of set) {
      const f = feat(k);
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) A[i][j] += f[i] * f[j];
        for (let c = 0; c < 3; c++) A[i][6 + c] += f[i] * k.c[c];
      }
    }
    for (let i = 0; i < 6; i++) A[i][i] += 1e-6 * set.length;
    for (let i = 0; i < 6; i++) {
      let p = i;
      for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]];
      const d = A[i][i] || 1e-9;
      for (let j = i; j < 9; j++) A[i][j] /= d;
      for (let r = 0; r < 6; r++) {
        if (r === i || !A[r][i]) continue;
        const m = A[r][i];
        for (let j = i; j < 9; j++) A[r][j] -= m * A[i][j];
      }
    }
    return [0, 1, 2].map((c) => A.map((row) => row[6 + c]));
  };
  const off = (coef, k) => {
    const f = feat(k);
    return Math.hypot(...[0, 1, 2].map((c) => k.c[c] - f.reduce((s, v, i) => s + v * coef[c][i], 0)));
  };
  let coef = fit(blocks);
  const kept = blocks.map((k) => [off(coef, k), k]).sort((a, b) => a[0] - b[0]).slice(0, Math.ceil(0.6 * blocks.length)).map((p) => p[1]);
  coef = fit(kept);
  const share = blocks.filter((k) => off(coef, k) > 28).length / blocks.length;
  return { share };
}

const OBJECT_SHARE = 0.1;

/** The page with every glyph hidden (color transparent, no transition), as pixels; the glyphs come back after. */
async function groundShot(page) {
  let png = null;
  try {
    await page.evaluate(() => {
      const s = document.createElement("style");
      s.id = "struq-look-hide";
      s.textContent = "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-decoration-color:transparent!important;caret-color:transparent!important;transition:none!important}";
      document.head.appendChild(s);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    png = await capture(page);
  } catch {
    png = null;
  } finally {
    await page.evaluate(() => document.getElementById("struq-look-hide")?.remove()).catch(() => {});
  }
  return png ? decodePng(png) : null;
}

const GENERIC_FACES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "inherit", "initial", "unset", "-apple-system", "blinkmacsystemfont"]);
const SYSTEM_FACES = /^(arial|helvetica|helvetica neue|segoe ui|times|times new roman|georgia|verdana|tahoma|trebuchet ms|courier|courier new|menlo|monaco|consolas|lucida grande|lucida console|lucida sans unicode|calibri|cambria|impact|comic sans ms|palatino|palatino linotype|book antiqua|ubuntu|cantarell|oxygen|sf pro.*|sf mono|new york|apple color emoji|segoe ui (emoji|symbol)|noto color emoji|liberation .*|dejavu .*)$/i;
const prettyFace = (f) => f.replace(/^__(.+?)_[0-9a-f]{5,}$/i, "$1").replace(/_/g, " ");

/* -------------------------------------------------------------- THE RUN */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A screenshot, tried again twice: a busy machine sometimes refuses one capture ("Unable to capture screenshot"). */
async function capture(page, opts = {}) {
  for (let i = 0; ; i++) {
    try {
      // A shared machine with a WebGL page can take longer than the default 30s to hand over a frame.
      return await page.screenshot({ timeout: 90000, ...opts });
    } catch (err) {
      if (i >= 2 || !/capture|screenshot/i.test(String(err?.message))) throw err;
      await wait(400);
    }
  }
}

async function settle(page) {
  // Lenis eases toward its target: wait until the scroll position holds still, then give the reveals time to land.
  let last = -1;
  let still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {
    await wait(100);
    const y = await page.evaluate(() => scrollY);
    still = Math.abs(y - last) < 0.5 ? still + 1 : 0;
    last = y;
  }
  await wait(900);
}

async function ready(page) {
  await page.evaluate(() => document.fonts?.ready.then(() => true)).catch(() => {});
  // A preloader keeps <html data-curtain="closed"> while it covers the page.
  await page.waitForFunction(() => document.documentElement.dataset.curtain !== "closed", null, { timeout: 8000 }).catch(() => {});
  // The blocks set data-ready once their start state is live; the kit's CSS lets go after three seconds regardless.
  await page
    .waitForFunction(() => {
      const vh = innerHeight;
      return ![...document.querySelectorAll("[data-split]:not([data-ready]),[data-reveal]:not([data-ready]),[data-hero-still]:not([data-ready]),[data-hero-split]:not([data-ready]),[data-hero-index]:not([data-ready])")].some((e) => {
        const r = e.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh;
      });
    }, null, { timeout: 4000 })
    .catch(() => {});
  await wait(800);
}

async function lookAt(browser, vp, errors) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "no-preference", deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const where = msg.location()?.url ?? "";
    if (/favicon\.ico/.test(where)) return;
    errors.add(`console: ${msg.text().slice(0, 200)}${where && !msg.text().includes(where) ? ` (${where})` : ""}`);
  });
  page.on("pageerror", (err) => errors.add(`page error: ${String(err?.message ?? err).slice(0, 200)}`));
  page.on("response", (res) => {
    if (res.request().resourceType() === "image" && res.status() >= 400) errors.add(`image ${res.status()}: ${res.url()}`);
  });
  page.on("requestfailed", (req) => {
    if (req.resourceType() === "image" && !/ERR_ABORTED/.test(req.failure()?.errorText ?? "")) errors.add(`image failed: ${req.url()} (${req.failure()?.errorText})`);
  });

  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await ready(page);
  await page.mouse.move(vp.width / 2, vp.height / 2);

  const findings = [];
  // A link that points at the section it sits in looks clickable and goes nowhere (proof run 2026-11-15: every row of
  // a list linked to its own section). Only the rendered page knows where a link ends up, so it is measured here.
  const selfLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#"]')]
      .filter((a) => {
        const id = decodeURIComponent(a.getAttribute("href").slice(1));
        const target = id && id !== "top" ? document.getElementById(id) : null;
        return Boolean(target && target.contains(a));
      })
      .map((a) => ({ text: (a.textContent ?? "").trim().slice(0, 60), href: a.getAttribute("href") })),
  );
  for (const s of selfLinks) {
    findings.push({ kind: "self-link", viewport: vp.name, step: 0, scrollY: 0, text: s.text, selector: `a[href="${s.href}"]`, detail: `links to ${s.href}, the section it sits in: point it somewhere real or make it plain text`, shot: null });
  }
  const seen = new Set();
  const content = [];
  const steps = [];
  let overflow = null;
  let footerTop = null;
  let docHeight = 0;
  let crops = 0;
  let blankRun = null;
  const faces = new Map();
  const displays = new Map();
  const measured = new Set();
  const stepPx = Math.round(vp.height * 0.6);
  const phone = vp.width < 768;
  let extra = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    const first = step === 0;
    let m = await page.evaluate(measurePage, { first, last: false, stepPx, phone, known: [...seen] });
    if (m.findings.length) {
      // Measure once more after a pause: only what holds still is a defect, not an animation passing through.
      await wait(1200);
      const again = await page.evaluate(measurePage, { first, last: false, stepPx, phone, known: [...seen] });
      const before = new Map(m.findings.map((f) => [f.key, f]));
      again.findings = again.findings.filter((f) => before.has(f.key) && (f.x === undefined || Math.abs(f.x - before.get(f.key).x) < 2));
      m = again;
    }
    const shot = join(outDir, `${vp.name}-${String(step).padStart(2, "0")}.png`);
    let png = await capture(page, { path: shot });
    steps.push({ step, scrollY: m.scrollY, shot });
    content.push(...m.content);
    for (const d of m.display) if (!displays.has(d.key)) displays.set(d.key, { ...d, step, shot });
    for (const [face, text] of Object.entries(m.families)) if (!faces.has(face)) faces.set(face, { text, step, scrollY: m.scrollY, shot });
    docHeight = Math.max(docHeight, m.docHeight);
    if (m.footerTop !== null) footerTop = m.footerTop;
    if (!overflow && m.docWidth > m.viewport.width + 1) {
      overflow = { kind: "overflow", viewport: vp.name, step, scrollY: m.scrollY, text: "", selector: "html", detail: `the page is ${m.docWidth}px wide on a ${m.viewport.width}px screen`, shot };
    }
    const crop = async (rect, tag) => {
      if (!rect || crops >= 12) return undefined;
      const pad = 16;
      const x = Math.max(0, rect.x - pad);
      const y = Math.max(0, rect.y - pad);
      const clip = { x, y, width: Math.min(vp.width - x, rect.w + 2 * pad), height: Math.min(vp.height - y, rect.h + 2 * pad) };
      if (clip.width <= 4 || clip.height <= 4) return undefined;
      const file = join(outDir, `${vp.name}-${String(step).padStart(2, "0")}-${tag}-${++crops}.png`);
      await capture(page, { path: file, clip });
      return file;
    };
    for (const f of m.findings) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      findings.push({ kind: f.kind, ...(f.severity ? { severity: f.severity } : {}), viewport: vp.name, step, scrollY: Math.round(f.scrollY), text: f.text.slice(0, 120), selector: f.selector, detail: f.detail, shot });
    }

    // Blank: no text seen on this screen and the pixels one flat colour. Held for a moment longer, so a panel passing
    // through is not one; a run of blank stops is one finding.
    if (m.quiet) {
      const cx = vp.width / 2;
      const cy = vp.height / 2;
      const cursor = { l: cx - 60, r: cx + 60, t: cy - 60, b: cy + 60 };
      let flat = flatScreen(decodePng(png) ?? { width: 0, height: 0 }, [...m.mask, cursor]);
      if (flat.blank) {
        await wait(1200);
        const again = await page.evaluate(measurePage, { first, last: false, stepPx, phone, known: [...seen] });
        png = await capture(page, { path: shot });
        flat = again.quiet ? flatScreen(decodePng(png) ?? { width: 0, height: 0 }, [...again.mask, cursor]) : { blank: false };
      }
      if (flat.blank && blankRun && blankRun.step === step - 1) {
        blankRun.step = step;
        blankRun.more++;
        blankRun.finding.detail = `the whole screen is one flat colour (${flat.color}), with nothing to read or see, for ${blankRun.more + 1} scroll stops in a row`;
      } else if (flat.blank) {
        const finding = { kind: "blank", viewport: vp.name, step, scrollY: Math.round(m.scrollY), text: "", selector: "", detail: `the whole screen is one flat colour (${flat.color}), with nothing to read or see`, shot };
        findings.push(finding);
        blankRun = { step, more: 0, finding };
      }
    }

    // Text over a photo, a video or a canvas: hide the glyphs, read the pixels behind each line and hold the worse
    // quartile to the text colour. A fail is read once more after a pause; what cannot be read keeps the old warning.
    const groups = photoGroups(m.photo, seen);
    if (groups.length) {
      const read = await behind(page, groups);
      let failing = groups.filter((g) => read.get(g.key)?.n >= MIN_PIXELS && read.get(g.key).ratio < g.need);
      const unmeasured = groups.filter((g) => !(read.get(g.key)?.n >= MIN_PIXELS));
      if (failing.length) {
        await wait(1200);
        const again = await page.evaluate(measurePage, { first: false, last: false, stepPx, phone, known: [...seen] });
        const regroup = photoGroups(again.photo, seen).filter((g) => failing.some((f) => f.key === g.key));
        const second = await behind(page, regroup);
        failing = regroup.filter((g) => second.get(g.key)?.n >= MIN_PIXELS && second.get(g.key).ratio < g.need).map((g) => ({ ...g, ratio: second.get(g.key).ratio }));
      }
      for (const g of failing) {
        seen.add(g.key);
        const who = g.mark ? "the wordmark" : `${g.size}px text`;
        findings.push({ kind: "unreadable", viewport: vp.name, step, scrollY: Math.round(m.scrollY), text: g.text, selector: g.group, detail: `${g.ratio.toFixed(2)} against the photo behind it (its worse quarter), ${who} needs ${g.need}: a scrim, a calmer crop or another place for the text`, shot, crop: await crop(g.rect, "unreadable") });
      }
      for (const g of groups) if (read.get(g.key)?.n >= MIN_PIXELS) measured.add(g.key);
      for (const g of unmeasured) {
        // Read at an earlier stop already (a line leaving the screen is mostly gone): nothing to warn about.
        const key = `contrast|${g.warn.selector}|${g.warn.own.slice(0, 40)}`;
        if (seen.has(key) || measured.has(g.key)) continue;
        seen.add(key);
        findings.push({ kind: "contrast", severity: "WARN", viewport: vp.name, step, scrollY: Math.round(m.scrollY), text: g.warn.own, selector: g.warn.selector, detail: "text over a photo or canvas that could not be measured: look at the crop", shot, crop: await crop(g.rect, "contrast") });
      }
    }

    // Over the object: a line with the world's canvas under it. Hide the glyphs, read what the canvas draws in each
    // line's box, and read it again after a pause: only an object that holds under the line is a defect.
    let objects = m.over.filter((o) => !seen.has(o.key));
    if (objects.length) {
      let img = await groundShot(page);
      objects = objects.map((o) => ({ ...o, share: img ? objectUnder(img, o.boxes, o.size).share : 0 })).filter((o) => o.share >= OBJECT_SHARE);
      if (objects.length) {
        await wait(1200);
        const again = await page.evaluate(measurePage, { first: false, last: false, stepPx, phone, known: [...seen] });
        img = await groundShot(page);
        objects = again.over
          .filter((o) => objects.some((x) => x.key === o.key))
          .map((o) => ({ ...o, share: img ? objectUnder(img, o.boxes, o.size).share : 0 }))
          .filter((o) => o.share >= OBJECT_SHARE);
      }
      for (const o of objects) {
        seen.add(o.key);
        const r = o.boxes.reduce((a, b) => ({ l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) }));
        findings.push({ kind: "over-object", viewport: vp.name, step, scrollY: Math.round(m.scrollY), text: o.text, selector: o.selector, detail: `the line sits over the 3D object (${Math.round(o.share * 100)}% of the ground under it is the object, not the wall): move the type to the side the object leaves free, set Framed's side for this beat away from the type (and its phone framing), or give the line its own band of ground`, shot, crop: await crop({ x: r.l, y: r.t, w: r.r - r.l, h: r.b - r.t }, "object") });
      }
    }

    const before = m.scrollY;
    if (before + m.viewport.height >= m.docHeight - 2) break;
    // A full step, or less where a word is about to slip under the header.
    const dy = m.next && extra < 25 ? m.next : stepPx;
    if (dy !== stepPx) extra++;
    await page.mouse.wheel(0, dy);
    await settle(page);
    let after = await page.evaluate(() => scrollY);
    if (Math.abs(after - before) < 1) {
      // Nothing moved: a scroll lock or a page without Lenis that ignores the wheel. Nudge it directly once.
      await page.evaluate((dy) => window.scrollBy(0, dy), dy);
      await settle(page);
      after = await page.evaluate(() => scrollY);
      if (Math.abs(after - before) < 1) break;
    }
  }
  const last = await page.evaluate(measurePage, { first: false, last: true, stepPx, phone });
  for (const b of last.broken) errors.add(`image did not load: ${b.src} (${b.selector})`);
  if (overflow) findings.push(overflow);
  // The widths between the two sizes: a laptop and a small desktop. A canvas or a wide row that fits at 1440 and on a
  // phone can still push the page sideways at 1024 (proof run 2026-11-26: a 3D machine set past the right edge).
  if (!overflow && vp.name === "desktop") {
    for (const width of [1024, 1280]) {
      await page.setViewportSize({ width, height: vp.height });
      await settle(page);
      const wide = await page.evaluate(() => ({ doc: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), vw: document.documentElement.clientWidth }));
      if (wide.doc > wide.vw + 1) {
        const shot = join(outDir, `desktop-${width}.png`);
        await capture(page, { path: shot });
        findings.push({ kind: "overflow", viewport: vp.name, step: 0, scrollY: 0, text: "", selector: "html", detail: `the page is ${wide.doc}px wide on a ${wide.vw}px screen (at ${width} wide; it fits at ${vp.width})`, shot });
        break;
      }
    }
    await page.setViewportSize({ width: vp.width, height: vp.height });
  }

  // A face the visible text asks for first that never loaded: the page reads in a fallback. A loaded face of that
  // family settles it; otherwise the face is missing when text set in it measures exactly as the fallback alone.
  const asked = [...faces.keys()].filter((f) => !GENERIC_FACES.has(f.toLowerCase()) && !SYSTEM_FACES.test(f));
  const missing = asked.length
    ? await page.evaluate(async (list) => {
        await document.fonts?.ready;
        const strip = (s) => s.trim().replace(/^["']|["']$/g, "");
        const ctx = document.createElement("canvas").getContext("2d");
        const probe = "mmmmmmmmmmlli0O@#WwQqgjy";
        return list.filter((face) => {
          if ([...document.fonts].some((f) => strip(f.family) === face && f.status === "loaded")) return false;
          const quoted = `"${face.replace(/["\\]/g, "")}"`;
          return ["monospace", "serif", "sans-serif"].every((base) => {
            ctx.font = `72px ${base}`;
            const alone = ctx.measureText(probe).width;
            ctx.font = `72px ${quoted}, ${base}`;
            return Math.abs(ctx.measureText(probe).width - alone) < 0.5;
          });
        });
      }, asked).catch(() => [])
    : [];
  for (const face of missing) {
    const at = faces.get(face);
    findings.push({ kind: "font-missing", viewport: vp.name, step: at.step, scrollY: Math.round(at.scrollY), text: at.text, selector: "", detail: `the face "${prettyFace(face)}" is asked for first but never loaded, so this text shows a fallback: load it (next/font, or an @font-face that answers) or name a face that does`, shot: at.shot });
  }

  // 4e. The scale ladder: display type (72px and 7vw or more) after the first screen. A paragraph at poster scale is a
  // wall the visitor scrolls through instead of reading (proof runs 2026-11-25: three of five middle scenes were one
  // sentence at 10vw); more than two such moments flattens the page into one loud register.
  if (vp.width >= 1024) {
    const later = [...displays.values()].filter((d) => d.top >= vp.height * 0.9);
    for (const d of [...displays.values()].filter((d) => d.words > 20)) {
      findings.push({ kind: "type-wall", viewport: vp.name, step: d.step, scrollY: Math.round(d.top), text: d.text, selector: d.key, detail: `${d.words} words at ${Math.round(d.size)}px: display size is for a line of up to about twelve words; set this at heading or lead size and give the scene something to look at`, shot: d.shot });
    }
    if (later.length > 2) {
      const d = later[2];
      findings.push({ kind: "type-scale", viewport: vp.name, step: d.step, scrollY: Math.round(d.top), text: later.map((x) => x.text.slice(0, 40)).join(" / "), selector: d.key, detail: `${later.length} lines at poster scale after the first screen: keep display size for the opening and one or two moments, and set the other scenes a step down (heading size) beside a visual`, shot: d.shot });
    }
  }

  // 5. Empty stretches: a screen-high window without content, below the first screen and above the footer.
  const start = vp.height;
  const end = footerTop ?? docHeight - vp.height / 2;
  const spans = content.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  let reach = start;
  const gaps = [];
  for (const [a, b] of spans) {
    if (a > reach && Math.min(a, end) - reach >= vp.height * 0.6) gaps.push([reach, Math.min(a, end)]);
    reach = Math.max(reach, b);
    if (reach >= end) break;
  }
  if (end - reach >= vp.height * 0.6) gaps.push([reach, end]);
  for (const [a, b] of gaps) {
    const near = steps.reduce((best, s) => (Math.abs(s.scrollY - a) < Math.abs(best.scrollY - a) ? s : best), steps[0]);
    // A dead stretch of a whole screen is a hole in the film, not a breath: it fails. Six tenths of one warns.
    const dead = b - a >= vp.height;
    findings.push({ kind: "empty", severity: dead ? "FAIL" : "WARN", viewport: vp.name, step: near.step, scrollY: Math.round(a), text: "", selector: "", detail: `${Math.round(b - a)}px without text or image, from ${Math.round(a)}px down${dead ? ": every screen of scroll must change something; shorten the pin or the padding, or give the stretch its beat" : ""}`, shot: near.shot });
  }
  await context.close();
  return { findings, steps: steps.length };
}

async function main() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok && res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.log(`Nothing answers at ${url} (${err?.cause?.code ?? err?.message ?? err}).`);
    console.log("Build and serve the site first, from the project root, and leave it running:");
    console.log("  npx next build && npx next start -p 4321");
    console.log(`Then: node ${relative(process.cwd(), process.argv[1]) || "look.mjs"}${root !== process.cwd() ? ` --dir ${root}` : ""}`);
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (f.endsWith(".png")) rmSync(join(outDir, f), { force: true });

  const stamp = sourceStamp(root);
  const notes = [];
  const buildId = join(root, ".next", "BUILD_ID");
  if (existsSync(buildId) && stamp.newest.mtime > statSync(buildId).mtimeMs + 1000) {
    notes.push(`${stamp.newest.file} changed after the last next build: rebuild and restart the server, or this look shows the old page.`);
  }

  const { browser } = await loadChromium();
  const findings = [];
  const steps = {};
  try {
    // Both sizes at once, each in its own context: half the wait.
    const runs = await Promise.all(VIEWPORTS.map(async (vp) => {
      const errors = new Set();
      return { vp, errors, ...(await lookAt(browser, vp, errors)) };
    }));
    for (const { vp, errors, steps: n, findings: found } of runs) {
      steps[vp.name] = n;
      findings.push(...found);
      for (const e of errors) findings.push({ kind: "error", viewport: vp.name, step: null, scrollY: null, text: "", selector: "", detail: e, shot: null });
    }
  } finally {
    await browser.close();
  }

  for (const f of findings) f.severity ??= SEVERITY[f.kind];
  // One error or one missing face shows at both sizes: say it once.
  const out = [];
  const errorSeen = new Set();
  for (const f of findings) {
    if (f.kind === "error" || f.kind === "font-missing") {
      if (errorSeen.has(f.detail)) continue;
      errorSeen.add(f.detail);
    }
    out.push({ ...f, shot: f.shot ? relOut(f.shot) : null, ...(f.crop ? { crop: relOut(f.crop) } : {}) });
  }
  const result = out.some((f) => f.severity === "FAIL") ? "FAIL" : "PASS";
  const report = { url, at: new Date().toISOString(), result, steps, findings: out, notes, source: stamp };
  writeFileSync(join(root, ".struq", "look.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Struq look: ${url}, ${steps.phone ?? 0} phone and ${steps.desktop ?? 0} desktop screens in ${relOut(outDir)}/\n`);
  // Five lines per kind and size; look.json keeps them all.
  const shown = new Map();
  for (const f of out) {
    const group = `${f.severity} ${f.kind} ${f.viewport ?? ""}`;
    shown.set(group, (shown.get(group) ?? 0) + 1);
    if (shown.get(group) > 5) continue;
    const what = [f.text ? `"${f.text.slice(0, 60)}"` : "", f.selector ? `(${f.selector})` : ""].filter(Boolean).join(" ");
    const where = f.viewport ? `${f.viewport}${f.step !== null && f.step !== undefined ? ` step ${f.step}` : ""}` : "";
    console.log(`${f.severity} ${f.kind} ${where}: ${what ? `${what} ` : ""}${f.detail}${f.crop ? `  ${f.crop}` : f.shot ? `  ${f.shot}` : ""}`);
  }
  for (const [group, n] of shown) if (n > 5) console.log(`${group}: and ${n - 5} more in .struq/look.json`);
  for (const n of notes) console.log(`NOTE ${n}`);
  const fails = out.filter((f) => f.severity === "FAIL").length;
  const warns = out.length - fails;
  if (!args.includes("--no-log")) {
    const kinds = (sev) => [...new Set(out.filter((f) => f.severity === sev).map((f) => f.kind))].join(", ");
    appendLog(root, "Step 7 Look", [
      `look.mjs: LOOK ${result}, ${fails} fail, ${warns} warn, ${steps.phone ?? 0} phone and ${steps.desktop ?? 0} desktop screens.`,
      ...(fails ? [`Fail: ${kinds("FAIL")}.`] : []),
      ...(warns ? [`Warn: ${kinds("WARN")}.`] : []),
    ]);
  }
  console.log(`\nLOOK: ${result}${fails || warns ? ` (${fails} fail, ${warns} warn)` : ""}${result === "FAIL" ? ". Open the screenshots named above, fix, rebuild, and run look.mjs again." : ""}`);
  process.exit(result === "FAIL" ? 1 : 0);
}

main().catch((err) => {
  console.log(`look.mjs could not finish: ${err?.stack ?? err}`);
  process.exit(2);
});
