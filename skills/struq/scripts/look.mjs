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
//   overflow   the document wider than the screen                                                        FAIL
//   contrast   text against its solid ground under 4.5 (3 from 24px); text over a photo or canvas      FAIL, WARN
//   empty      a screen-high stretch without text or image between the hero and the footer            WARN
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
import { appendLog } from "./log.mjs";
import { sourceStamp } from "./stamp.mjs";

const PLAYWRIGHT = "playwright@1.64.1";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];
const MAX_STEPS = 60;
const SEVERITY = { collision: "FAIL", clipped: "FAIL", overflow: "FAIL", contrast: "FAIL", error: "FAIL", "self-link": "FAIL", empty: "WARN" };

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
      texts.push({ node, el, lines, ink, color, o, fontSize, font: ctx.font, transform: s.textTransform, asc, desc, text: node.data.replace(/\s+/g, " ").trim() });
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
          for (let a = t.el; a && a !== c.byY; a = a.parentElement) if (Math.abs(translation(a).y) > 0.5) moving = true;
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
            if (Math.abs(translation(a).x) > 0.5 && a !== t.el) {
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
    if (opts.first && header) {
      const pick = (sel) => [...bars].map((b) => b.querySelector(sel)).find((e) => e && opacity(e) > 0.05 && /\S/.test(e.textContent ?? ""));
      const mark = pick("[data-wordmark]") ?? pick('a[href="/"]') ?? headerTexts[0]?.el;
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
      for (let k = at; k < stack.length; k++) {
        const e = stack[k];
        if (k > at && t.el.contains(e)) continue;
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
      const ink = [t.color[0], t.color[1], t.color[2], t.color[3] * t.o];
      const need = t.fontSize >= 24 ? 3 : 4.5;
      const flatten = (base) => {
        let g = base;
        for (let k = layers.length - 1; k >= 0; k--) g = over(layers[k], g);
        return g;
      };
      if (image) {
        // Over a photo the pixels decide; a scrim that holds against both black and white settles it here.
        const worst = Math.min(...[[0, 0, 0, 1], [255, 255, 255, 1]].map((p) => {
          const g = flatten(p);
          return ratio(over(ink, g), g);
        }));
        if (worst < need) {
          add({ kind: "contrast", image: true, text: t.text, selector: path(t.el), detail: "text over a photo or canvas: look at the crop", key: `contrast|${path(t.el)}|${t.text.slice(0, 40)}`, rect: { x: lr.left, y: lr.top, w: lr.width, h: lr.height } });
        }
        continue;
      }
      const g = flatten(ground ?? [255, 255, 255, 1]);
      const r = ratio(over(ink, g), g);
      if (r < need) {
        add({ kind: "contrast", text: t.text, selector: path(t.el), detail: `${r.toFixed(2)} against its ground, needs ${need} at ${Math.round(t.fontSize)}px`, key: `contrast|${path(t.el)}|${t.text.slice(0, 40)}` });
      }
    }

    /* --- 5. what holds content on this screen, in document coordinates. Chrome that rides along with the scroll
       (the header, a small fixed button or cursor) is on every screen, so it holds nothing. A pinned scene does. */
    const chromeCache = new Map();
    const chrome = (el) => {
      if (!el || el === document.body) return false;
      if (chromeCache.has(el)) return chromeCache.get(el);
      const p = cs(el).position;
      const v = (header && header.contains(el)) || ((p === "fixed" || p === "sticky") && el.getBoundingClientRect().height < 0.35 * vh) || chrome(el.parentElement);
      chromeCache.set(el, v);
      return v;
    };
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
    };
  } finally {
    force.remove();
  }
}

/* -------------------------------------------------------------- THE RUN */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const stepPx = Math.round(vp.height * 0.6);
  let extra = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    const first = step === 0;
    let m = await page.evaluate(measurePage, { first, last: false, stepPx, known: [...seen] });
    if (m.findings.length) {
      // Measure once more after a pause: only what holds still is a defect, not an animation passing through.
      await wait(1200);
      const again = await page.evaluate(measurePage, { first, last: false, stepPx, known: [...seen] });
      const before = new Map(m.findings.map((f) => [f.key, f]));
      again.findings = again.findings.filter((f) => before.has(f.key) && (f.x === undefined || Math.abs(f.x - before.get(f.key).x) < 2));
      m = again;
    }
    const shot = join(outDir, `${vp.name}-${String(step).padStart(2, "0")}.png`);
    await page.screenshot({ path: shot });
    steps.push({ step, scrollY: m.scrollY, shot });
    content.push(...m.content);
    docHeight = Math.max(docHeight, m.docHeight);
    if (m.footerTop !== null) footerTop = m.footerTop;
    if (!overflow && m.docWidth > m.viewport.width + 1) {
      overflow = { kind: "overflow", viewport: vp.name, step, scrollY: m.scrollY, text: "", selector: "html", detail: `the page is ${m.docWidth}px wide on a ${m.viewport.width}px screen`, shot };
    }
    for (const f of m.findings) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      const out = { kind: f.kind, viewport: vp.name, step, scrollY: Math.round(f.scrollY), text: f.text.slice(0, 120), selector: f.selector, detail: f.detail, shot };
      if (f.image) {
        out.severity = "WARN";
        if (f.rect && crops < 12) {
          const pad = 16;
          const x = Math.max(0, f.rect.x - pad);
          const y = Math.max(0, f.rect.y - pad);
          const clip = { x, y, width: Math.min(vp.width - x, f.rect.w + 2 * pad), height: Math.min(vp.height - y, f.rect.h + 2 * pad) };
          if (clip.width > 4 && clip.height > 4) {
            const crop = join(outDir, `${vp.name}-${String(step).padStart(2, "0")}-contrast-${++crops}.png`);
            await page.screenshot({ path: crop, clip });
            out.crop = crop;
          }
        }
      }
      findings.push(out);
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
  const last = await page.evaluate(measurePage, { first: false, last: true, stepPx });
  for (const b of last.broken) errors.add(`image did not load: ${b.src} (${b.selector})`);
  if (overflow) findings.push(overflow);

  // 5. Empty stretches: a screen-high window without content, below the first screen and above the footer.
  const start = vp.height;
  const end = footerTop ?? docHeight - vp.height / 2;
  const spans = content.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  let reach = start;
  const gaps = [];
  for (const [a, b] of spans) {
    if (a > reach && Math.min(a, end) - reach >= vp.height) gaps.push([reach, Math.min(a, end)]);
    reach = Math.max(reach, b);
    if (reach >= end) break;
  }
  if (end - reach >= vp.height) gaps.push([reach, end]);
  for (const [a, b] of gaps) {
    const near = steps.reduce((best, s) => (Math.abs(s.scrollY - a) < Math.abs(best.scrollY - a) ? s : best), steps[0]);
    findings.push({ kind: "empty", viewport: vp.name, step: near.step, scrollY: Math.round(a), text: "", selector: "", detail: `${Math.round(b - a)}px without text or image, from ${Math.round(a)}px down`, shot: near.shot });
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
  // One error shows at both sizes: say it once.
  const out = [];
  const errorSeen = new Set();
  for (const f of findings) {
    if (f.kind === "error") {
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
