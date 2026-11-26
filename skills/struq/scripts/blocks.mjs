#!/usr/bin/env node
// Struq blocks, offline: the skill's own copy of Struq's admitted blocks (blocks/, catalog.json), installed into a
// Next.js App Router project. The same files the MCP's struq_block returns.
//
//   node <skill-dir>/scripts/blocks.mjs list [kind]          the catalogue, one line per block with its variants
//   node <skill-dir>/scripts/blocks.mjs init                 the kit, the app shell (on a starter) and the base packages
//   node <skill-dir>/scripts/blocks.mjs add <slug>[:<variant>] [...]  a block and every file it imports, plus its packages
//   node <skill-dir>/scripts/blocks.mjs arc [language]      a language's storyboard skeleton (film.json); none: the three
//   node <skill-dir>/scripts/blocks.mjs finish               the files every site ships, from lib/site.ts: favicon and app
//                                                            icons, link preview, metadata and JSON-LD in the layout,
//                                                            sitemap, robots, manifest, llms.txt, the 404 (never replaces
//                                                            a file of the same convention the site already has)
//   flags: --dir <project>, --force (replace files you already have), --no-install
//
// add refuses, installing nothing, until STRUQ.md passes the plan check and STRUQ-LOG.md holds the user's reply to the
// treatment, and then takes only blocks the storyboard names, in the site's language (gate.mjs). list, init and arc
// never ask. The kit's quiet scenes (Statement, PhotoText, Rows, Close) come with init, so add only says how to import
// one.
//
// Everything lands under components/struq/ in the layout of Struq's blocks/ (kit/, heroes/, sections/ ...), so the
// relative imports between them hold. A layout or stylesheet you wrote yourself is never overwritten.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectHand } from "./draw.mjs";
import { addRefusal, refuse } from "./gate.mjs";
import { appendLog } from "./log.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BLOCKS = join(here, "..", "blocks");
const RECIPES = join(here, "..", "recipes");
const CATALOG = JSON.parse(readFileSync(join(BLOCKS, "catalog.json"), "utf8")).blocks;
const FILM = join(BLOCKS, "film.json");
/** The kit's composed quiet scenes, one file each in kit/quiet/: a storyboard names them where a block would stand. */
const KIT_SCENES = readdirSync(join(BLOCKS, "kit", "quiet"))
  .filter((n) => /^[A-Z]\w*\.tsx$/.test(n))
  .map((n) => n.replace(/\.tsx$/, ""));
const kitScene = (name) => KIT_SCENES.find((k) => k.toLowerCase() === name.split(":")[0].toLowerCase()) ?? null;
/** The kit's middle scenes (kit/middle/): designed middles with variants, imported and filled, never rewritten. A
 *  scene round on 2026-11-15 saw an agent plan ServicesList and then write its own rows, because add said nothing. */
const MIDDLE_DIR = join(BLOCKS, "kit", "middle");
const MIDDLE_SCENES = existsSync(MIDDLE_DIR)
  ? readdirSync(MIDDLE_DIR).filter((n) => /^[A-Z]\w*\.tsx$/.test(n)).map((n) => n.replace(/\.tsx$/, ""))
  : [];
const middleScene = (name) => MIDDLE_SCENES.find((k) => k.toLowerCase() === name.split(":")[0].toLowerCase()) ?? null;
/** The variant ids a middle scene's header lists on its "- variant:" line. */
function middleVariants(name) {
  const head = readFileSync(join(MIDDLE_DIR, `${name}.tsx`), "utf8").split(/\r?\n/).slice(0, 80);
  // Some headers carry tone and className on the same line; only the part before them names variants.
  const line = (head.find((l) => /^\/\/\s*-\s*variant:/.test(l)) ?? "").split(/\.\s+\w+:/)[0];
  return [...line.matchAll(/"([a-z][\w-]*)"/g)].map((m) => m[1]);
}

/**
 * The language's temperament on <body> in app/layout.tsx, beside data-blocks, written here so it is never left out
 * (two Haiku builds of 2026-11-16 ended without it). A temperament already set is kept: the neighbour, chosen with its
 * reason on the Language line, is the agent's call. Returns the line to print.
 */
function temperament(value, id) {
  const file = join(root, src, "app", "layout.tsx");
  const where = relative(root, file).split("\\").join("/");
  const want = `data-temperament="${value}"`;
  if (!existsSync(file)) return `Temperament of ${id}: ${value}. Set <body data-blocks="" ${want}> in ${where}.`;
  const text = readFileSync(file, "utf8");
  const body = text.match(/<body\b[^>]*>/);
  if (!body) return `Temperament of ${id}: ${value}. ${where} has no <body>: set <body data-blocks="" ${want}>.`;
  const has = body[0].match(/\bdata-temperament=(?:["']([^"']*)["']|\{\s*["'`]([^"'`]*)["'`]\s*\})/);
  if (has) {
    const set = has[1] ?? has[2];
    return set === value
      ? `Temperament of ${id}: ${value}, already on <body> in ${where}.`
      : `Temperament of ${id}: ${value}. <body> in ${where} has data-temperament="${set}": keep it only as the neighbour, with the reason on the Language line, or set ${want}.`;
  }
  const tag = body[0].replace(/^<body\b/, `<body ${want}`).replace(/^<body (data-temperament="[^"]*") (data-blocks=(?:"[^"]*"|'[^']*'|\{[^}]*\}))/, "<body $2 $1");
  writeFileSync(file, text.replace(body[0], tag));
  return `Temperament of ${id}: wrote ${want} on <body> in ${where}. A neighbour goes there instead only with its reason on the Language line.`;
}

/** create-next-app's favicon.ico, by size: 15086 (2025 on) and 25931 (before). Neither is a site's own icon. */
const DEFAULT_FAVICONS = new Set([15086, 25931]);

/**
 * finish, in app/layout.tsx: the metadata from site.ts (metadataBase, title template, description, Open Graph, X,
 * canonical), the theme colour, html lang from site.lang and the JSON-LD script in <body>. Each is a small, exact edit;
 * one that does not fit the file's shape is left to the agent with a note saying what to add. Returns the notes.
 */
function finishLayout(appDir) {
  const file = ["layout.tsx", "layout.jsx"].map((n) => join(appDir, n)).find((p) => existsSync(p));
  if (!file) return ["No app/layout.tsx: write it from recipes/app/layout.tsx."];
  const out = [];
  let text = readFileSync(file, "utf8");
  const before = text;
  const imports = [];
  if (!/siteMetadata\(/.test(text)) {
    const m = text.match(/export const metadata(?:\s*:\s*Metadata)?\s*=\s*\{[\s\S]*?\n?\};?\n/);
    if (m && !/\{[\s\S]*\{[\s\S]*\{/.test(m[0])) {
      text = text.replace(m[0], "export const metadata: Metadata = siteMetadata(site);\nexport const viewport: Viewport = siteViewport(site);\n");
      imports.push("siteMetadata", "siteViewport");
    } else if (!m) {
      text = text.replace(/(\nexport default function)/, "\nexport const metadata: Metadata = siteMetadata(site);\nexport const viewport: Viewport = siteViewport(site);\n$1");
      imports.push("siteMetadata", "siteViewport");
    } else out.push("app/layout.tsx: set export const metadata = siteMetadata(site) and export const viewport = siteViewport(site) (components/struq/kit/brand).");
  }
  if (imports.length) {
    if (/import type \{ Metadata \} from "next";/.test(text)) text = text.replace('import type { Metadata } from "next";', 'import type { Metadata, Viewport } from "next";');
    else if (!/\bViewport\b.*from "next"/.test(text)) text = `import type { Metadata, Viewport } from "next";\n${text}`;
  }
  if (!/<JsonLd\b/.test(text)) {
    const body = inCode(text, /<body\b[^>]*>/g);
    if (body) {
      const end = body.index + body[0].length;
      const indent = text.slice(0, body.index).split("\n").pop().match(/^\s*/)[0];
      text = `${text.slice(0, end)}\n${indent}  <JsonLd site={site} />${text.slice(end)}`;
      imports.push("JsonLd");
    } else out.push("app/layout.tsx: put <JsonLd site={site} /> inside <body>.");
  }
  const html = inCode(text, /<html\b[^>]*>/g);
  if (html) {
    const tag = /\blang=/.test(html[0]) ? html[0].replace(/\blang="[^"]*"/, "lang={site.lang}") : html[0].replace(/^<html\b/, "<html lang={site.lang}");
    text = text.slice(0, html.index) + tag + text.slice(html.index + html[0].length);
  }
  if (imports.length) {
    // After the last import that binds a name, so the stylesheet imports stay last.
    const line = `import { ${imports.join(", ")} } from "@/components/struq/kit/brand";\n`;
    const binds = [...text.matchAll(/^import\s+(?!["'])[\s\S]*?\sfrom\s+["'][^"']+["'];?[^\S\n]*\n/gm)].pop();
    text = binds ? text.slice(0, binds.index + binds[0].length) + line + text.slice(binds.index + binds[0].length) : line + text;
  }
  if (!/from "@\/lib\/site"/.test(text) && /\bsite\./.test(text)) text = text.replace(/((?:^import[^\n]*\n)+)/m, `$1import { site } from "@/lib/site";\n`);
  if (text !== before) {
    writeFileSync(file, text);
    copied.push(`${relative(root, file).split("\\").join("/")} (metadata, viewport, JSON-LD, lang)`);
  }
  return out;
}

/** The first match of a global pattern that does not stand on a comment line. */
function inCode(text, re) {
  for (const m of text.matchAll(re)) {
    const line = text.slice(text.lastIndexOf("\n", m.index) + 1, m.index);
    if (!/^\s*(?:\/\/|\*|\/\*)/.test(line)) return m;
  }
  return null;
}

/** init: Struq Icons' three stylesheets before globals.css in the layout, and the accent wiring in globals.css. */
function wireIcons(appDir) {
  const layout = join(appDir, "layout.tsx");
  if (existsSync(layout)) {
    const text = readFileSync(layout, "utf8");
    if (!text.includes("@struq/icons/") && text.includes('import "./globals.css";')) {
      writeFileSync(layout, text.replace('import "./globals.css";', 'import "@struq/icons/tokens.css";\nimport "@struq/icons/icons.css";\nimport "@struq/icons/states.css";\nimport "./globals.css";'));
    } else if (!text.includes("@struq/icons/")) notes.push('app/layout.tsx: import "@struq/icons/tokens.css", "@struq/icons/icons.css" and "@struq/icons/states.css" before globals.css (references/iconography.md).');
  }
  const css = join(appDir, "globals.css");
  if (existsSync(css)) {
    const text = readFileSync(css, "utf8");
    if (!text.includes("--icon-accent")) {
      writeFileSync(css, `${text.trimEnd()}\n\n/* Struq Icons: the set's accent follows the palette (references/iconography.md). */\nbody {\n  --icon-base: currentColor;\n  --icon-accent: var(--accent);\n  --icon-accent-live: var(--accent);\n}\n`);
    }
  }
}

const args = process.argv.slice(2);
const dirAt = args.indexOf("--dir");
const root = resolve(dirAt >= 0 ? args[dirAt + 1] : process.cwd());
const force = args.includes("--force");
const install = !args.includes("--no-install");
const [cmd, ...rest] = args.filter((x, i) => !x.startsWith("--") && (dirAt < 0 || i !== dirAt + 1));

const src = existsSync(join(root, "src", "app")) ? "src" : "";
const target = (...p) => join(root, src, "components", "struq", ...p);
const copied = [];
const kept = [];
const notes = [];

function place(from, to, overwrite = force) {
  if (existsSync(to) && !overwrite) return kept.push(relative(root, to));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied.push(relative(root, to).split("\\").join("/"));
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

function project() {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    console.error(`FAIL no package.json in ${root}. Scaffold first: npx create-next-app@latest . --ts --tailwind --app --eslint --yes`);
    process.exit(2);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.next) {
    console.error("FAIL not a Next.js project. The blocks use next/image and next/link; for Vite read references/stack-targets.md.");
    process.exit(2);
  }
  return deps;
}

function installMissing(deps, wanted) {
  const need = [...wanted].filter((d) => !deps[d]);
  const dev = need.filter((d) => d.startsWith("@types/"));
  const runtime = need.filter((d) => !d.startsWith("@types/"));
  for (const [list, flag] of [[runtime, ""], [dev, "-D "]]) {
    if (!list.length) continue;
    const line = `npm install ${flag}${list.join(" ")}`;
    if (!install) {
      notes.push(`Run: ${line}`);
      continue;
    }
    console.log(`> ${line}`);
    if (spawnSync(line, { cwd: root, stdio: "inherit", shell: true }).status !== 0) notes.push(`The install failed. Run it yourself: ${line}`);
  }
}

function report(step, what) {
  console.log(`\nCopied ${copied.length} file(s)${copied.length ? ":" : "."}`);
  for (const f of copied) console.log(`  ${f}`);
  if (kept.length) console.log(`Kept ${kept.length} existing file(s) (--force replaces them).`);
  for (const n of notes) console.log(`NOTE ${n}`);
  appendLog(root, step, [what, ...(notes.length ? [`Notes: ${notes.join(" ")}`] : [])]);
}

/** A copy of a list in random order: the printed options carry no ranking, so their order must not suggest one. */
function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * This site's five openings or centerpieces, from the project's hand (draw.mjs: dealt once by Struq's hand.mjs and kept
 * in .struq/draw.json), so printing the arc again shows the same hand. Every opening hand holds one that needs no photo.
 */
function hand(role) {
  const { hand: dealt } = projectHand(root);
  return new Set(role === "opening" ? dealt.openings : dealt.centerpieces);
}

/** The blocks of a role in this site's hand, each with its variants and that variant's energy, e.g. `hero-poster:window E3`. */
function pool(role) {
  const dealt = hand(role);
  return shuffled(CATALOG.filter((b) => b.role === role && !b.home && dealt.has(b.slug))).flatMap((b) => {
    const variants = b.variants?.length ? b.variants.map((v) => v.id) : [null];
    return variants.map((v) => {
      const energy = (v && b.byVariant?.[v]?.energy) ?? b.energy ?? 0;
      return `${b.slug}${v ? `:${v}` : ""} E${energy}`;
    });
  });
}

/**
 * A language's arc as STRUQ.md lines: the Tone arc, then one numbered Storyboard line per scene with no pick filled in.
 * There is no default on purpose (proof runs of 2026-11-14: with the first option pre-filled, 11 of 12 sites on two
 * unrelated briefs opened with the same hero and all 12 had the same centerpiece). Every slot says `<cast: ...>`, which
 * the plan check refuses until it is replaced. The Opening and the Centerpiece list the whole catalogue of their role,
 * since no opening or centerpiece belongs to one language; the middle scenes list what suits the language, plus an own
 * scene. The arc's own suggestions are not ranked above the rest.
 */
function arcLines(arc, footers = []) {
  const last = arc.scenes.length - 1;
  // The middle scenes carry no name of their own: names like Statement and Release read as a script, and every site
  // that followed them came out with the same middle (Roy, 2026-11-15: the middle is composed per client).
  const nameOf = (scene, at) => (scene.tag === "frame" || at === last || ["Opening", "Centerpiece"].includes(scene.name) ? scene.name : "Scene");
  const width = Math.max(...arc.scenes.map((s, at) => nameOf(s, at).length));
  const lines = [`Tone arc: ${arc.scenes.map((s) => s.tone[0]).join(", ")}`, "Storyboard:"];
  arc.scenes.forEach((scene, at) => {
    const role = scene.name === "Opening" ? "opening" : scene.name === "Centerpiece" ? "centerpiece" : null;
    // An own scene first, then the language's blocks. The kit's quiet scenes are no longer offered.
    const options = scene.tag === "frame" ? scene.blocks : role ? pool(role) : ["own scene", ...shuffled(scene.blocks)];
    const tag = scene.tag === "frame" ? "frame" : "<loud|quiet>";
    const cast = scene.tag === "frame" ? options[0] : at === last ? "<cast: how this site ends, and why>" : role ? "<cast: what this idea needs here, and why>" : "<cast: name this scene, what it shows of this client, and why>";
    const head = `${`${at + 1}.`.padEnd(at + 1 >= 10 ? 4 : 3)}${nameOf(scene, at).padEnd(width)} (${tag}) ${cast}`;
    const parts = [head];
    if (scene.tag === "frame") parts.push("lands on: <what>");
    else if (at === last) parts.push("ends on: <what the visitor is left with>");
    else parts.push("on screen: <...>", "enters: <...>", "hands over: <...>");
    if (scene.tag !== "frame" && options.length) parts.push(`options: ${options.join(", ")}`);
    if (scene.footer?.length) parts.push(`footer: <${shuffled([...new Set([...scene.footer, ...footers])]).join(" | ")}>`);
    lines.push(parts.join(" | "));
  });
  return lines;
}

const commands = {
  list() {
    const kind = rest[0];
    const rows = CATALOG.filter((b) => !kind || b.kind === kind);
    if (!rows.length) throw new Error(`No blocks of kind "${kind}". Kinds: ${[...new Set(CATALOG.map((b) => b.kind))].join(", ")}`);
    // The film facts of the default variant, so a storyboard can be cast from this list alone.
    const film = (b) => (b.role ? `  film: ${b.role} · energy ${b.energy ?? 0} · pins ${b.pins ? b.scroll : 0}` : "");
    for (const b of rows) {
      console.log(`${b.kind.padEnd(16)} ${b.slug.padEnd(24)} ${b.title}${b.variants.length ? `  [${b.variants.map((v) => v.id).join(", ")}]` : ""}${film(b)}`);
    }
    console.log(`\n${rows.length} block(s). What each does, its variants and their film lines: blocks/CATALOG.md.`);
  },

  init() {
    const deps = project();
    // The kit, minus what needs three: HeroCanvas and its scenes come with hero-opener, the real-time kit (gl/) with
    // `blocks.mjs add gl`, so a site without 3D never installs three.
    for (const f of walk(join(BLOCKS, "kit"))) {
      const r = relative(join(BLOCKS, "kit"), f).split("\\").join("/");
      if (r === "HeroCanvas.tsx" || r.startsWith("scenes/") || r.startsWith("gl/")) continue;
      place(f, target("kit", r));
    }
    const appDir = join(root, src, "app");
    const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
    const layout = read(join(appDir, "layout.tsx"));
    if (!layout || /Create Next App|Geist/.test(layout) || force) place(join(RECIPES, "app", "layout.tsx"), join(appDir, "layout.tsx"), true);
    else if (!/data-blocks/.test(layout)) {
      notes.push("app/layout.tsx is your own: add the sq-js script, the font links, data-blocks on <body> and <SmoothScroll> (recipes/app/layout.tsx).");
    }
    const css = read(join(appDir, "globals.css"));
    if (!css || (!css.includes("STRUQ TOKENS") && /--background|--foreground|Arial|prefers-color-scheme/.test(css)) || force) {
      place(join(RECIPES, "app", "globals.css"), join(appDir, "globals.css"), true);
    } else if (!css.includes("STRUQ TOKENS")) notes.push("app/globals.css is your own: add the kit import and the STRUQ TOKENS block from recipes/app/globals.css.");
    place(join(RECIPES, "app", "fonts.ts"), join(appDir, "fonts.ts"));
    for (const starter of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) rmSync(join(root, "public", starter), { force: true });
    wireIcons(appDir);
    installMissing(deps, ["gsap", "@gsap/react", "lenis", "@struq/icons"]);
    report("Step 1 Project", `blocks.mjs init copied the kit and ${copied.length} file(s) in all, kept ${kept.length}.`);
    console.log("OK init ready");
  },

  finish() {
    project();
    const appDir = join(root, src, "app");
    const siteFile = ["lib/site.ts", "src/lib/site.ts", "lib/site.tsx"].map((p) => join(root, p)).find((p) => existsSync(p));
    if (!siteFile) {
      console.error("FAIL no lib/site.ts. Every fact and line of the site lives there; finish reads it (fields: components/struq/kit/brand/facts.ts).");
      process.exitCode = 1;
      return;
    }
    // The brand kit first: the finishing files import it.
    for (const f of walk(join(BLOCKS, "kit", "brand"))) place(f, target("kit", relative(join(BLOCKS, "kit"), f).split("\\").join("/")));
    // Each finishing file once; a file of the same convention the site already has (any extension) is kept.
    const FINISH = join(RECIPES, "app", "finish");
    for (const f of walk(FINISH)) {
      const r = relative(FINISH, f).split("\\").join("/");
      const stem = r.replace(/\.(tsx?|jsx?)$/, "");
      const has = ["tsx", "ts", "jsx", "js", "png", "jpg", "svg", "ico", "xml", "txt", "json", "webmanifest"].some((ext) => existsSync(join(appDir, `${stem}.${ext}`)));
      const other = stem === "llms.txt/route" && existsSync(join(root, "public", "llms.txt"));
      if (has || other) kept.push(`app/${r}`);
      else place(f, join(appDir, r), false);
    }
    // create-next-app's favicon is no favicon of this site: app/icon.tsx draws the real one.
    for (const ico of [join(appDir, "favicon.ico"), join(root, "public", "favicon.ico")]) {
      if (existsSync(ico) && DEFAULT_FAVICONS.has(statSync(ico).size)) {
        rmSync(ico);
        notes.push(`Removed the starter ${relative(root, ico).split("\\").join("/")}: app/icon.tsx is the favicon now.`);
      }
    }
    notes.push(...finishLayout(appDir));
    const siteText = readFileSync(siteFile, "utf8");
    const missing = ["brand", "lang", "meta"].filter((k) => !new RegExp(`\\b${k}\\s*:`).test(siteText));
    if (missing.length) {
      notes.push(`lib/site.ts lacks ${missing.join(", ")}: the finishing files read them. brand is { symbol, colors: { ground, ink, accent } } (references/identity.md designs the symbol; components/struq/kit/brand/facts.ts lists every field).`);
    }
    if (!/\burl\s*:/.test(siteText)) notes.push("lib/site.ts has no url: set it, or NEXT_PUBLIC_SITE_URL on the host, so the canonical, the sitemap and the link preview carry the real address.");
    report("Finish", `blocks.mjs finish wrote ${copied.length} file(s) and kept ${kept.length}: icons, link preview, metadata, JSON-LD, sitemap, robots, manifest, llms.txt, 404.`);
    console.log("Put the logo in the header: <HeaderBar ... mark={<Mark symbol={site.brand.symbol} />} /> or <Logo> in your own bar, and the credit on the footer's last line (<Credit lang={site.lang} off={site.credit === false} />, or credit= on a footer block).");
    console.log("OK finish ready");
  },

  arc() {
    const film = JSON.parse(readFileSync(FILM, "utf8"));
    const languages = film.FILM_LANGUAGES;
    const id = rest[0];
    if (!id) {
      const width = Math.max(...languages.map((l) => l.id.length)) + 2;
      for (const l of languages) console.log(`${l.id.padEnd(width)}${l.for.join(", ")}`);
      console.log(`\nPrint one: blocks.mjs arc <${languages.map((l) => l.id).join(" | ")}>`);
      return;
    }
    const language = languages.find((l) => l.id === id);
    const arc = film.FILM_ARCS.find((a) => a.language === id);
    if (!language || !arc) throw new Error(`No language "${id}". The languages: ${languages.map((l) => l.id).join(", ")}.`);
    for (const line of arcLines(arc, film.FILM_ARCS.flatMap((a) => a.scenes.flatMap((s) => s.footer ?? [])))) console.log(line);
    const f = language.frames;
    console.log(`\nFrames of ${id}: preloader ${f.preloader}, page transition ${f.pageTransition} (only with a second route), menu ${f.menu}. Header: ${film.FILM_HEADER.join(" or ")}.`);
    console.log(temperament(language.temperament, id));
    console.log(`The Opening and the Centerpiece options are this site's hand, dealt once (.struq/draw.json): cast from it; a block the client named goes outside it, marked (named) on its line.`);
    console.log(`Use: paste the Tone arc and the Storyboard into STRUQ.md under your treatment head. Cast every <cast: ...> from the Idea, the Motif and the Unlike line, not from the order of the options: each option is a different first screen or moment (blocks/CATALOG.md says what each does). Write one pick per line with its reason after "because", delete the options list, set (loud) for E2 or more and (quiet) for E1 or less, and change, add or drop middle scenes as the idea needs (7 to 9 scenes, the budgets in SKILL.md hold). Then run check.mjs --plan.`);
  },

  add() {
    if (!rest.length) throw new Error("Usage: blocks.mjs add <slug>[:<variant>] [...]. The slugs: blocks.mjs list");
    // A kit quiet scene is no block: init already copied it, so say how to import it and install nothing for it.
    for (const arg of rest.filter(kitScene)) {
      const name = kitScene(arg);
      console.log(`${name} is a kit quiet scene, already in components/struq/kit/quiet/ (blocks.mjs init): import { ${name} } from "@/components/struq/kit/quiet";`);
    }
    // A middle scene is no block either: init copied it; say how to import it and which variants it has.
    for (const arg of rest.filter(middleScene)) {
      const name = middleScene(arg);
      const variants = middleVariants(name);
      const pick = arg.includes(":") ? ` variant="${arg.split(":")[1]}"` : "";
      console.log(
        `${name} is a middle scene, already in components/struq/kit/middle/ (blocks.mjs init): import { ${name} } from "@/components/struq/kit/middle"; then <${name}${pick} ... />.` +
          (variants.length ? ` Variants: ${variants.join(", ")}.` : "") +
          ` Fill its props from the brief (the file header lists them and what renders when one is empty); never rewrite it.`,
      );
    }
    // The real-time kit: Stage, TurnedObject, ScrollCamera, Backdrop and the scroll signals, with three and the React
    // Three packages. It is kit, not a block, so it needs no storyboard line of its own; the scene built with it does.
    if (rest.some((arg) => arg.toLowerCase() === "gl")) {
      const deps = project();
      for (const f of walk(join(BLOCKS, "kit", "gl"))) place(f, target("kit", relative(join(BLOCKS, "kit"), f).split("\\").join("/")));
      installMissing(deps, ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing", "postprocessing", "@types/three"]);
      console.log('\ngl: import { World, BeatCamera, Framed, useBeats, Pendant, LeverMachine, Vessel, TurnedObject, Stage } from "@/components/struq/kit/gl";');
      console.log("  Load your scene file with next/dynamic and ssr: false. The craft and a worked example: references/realtime.md.");
      report("Step 5 Blocks", "blocks.mjs added the real-time kit (kit/gl).");
      rest.splice(0, rest.length, ...rest.filter((arg) => arg.toLowerCase() !== "gl"));
    }
    rest.splice(0, rest.length, ...rest.filter((arg) => !kitScene(arg) && !middleScene(arg)));
    if (!rest.length) return;
    const requests = rest.map((arg) => {
      const [slug, variant = null] = arg.split(":");
      const b = CATALOG.find((x) => x.slug === slug);
      if (!b) throw new Error(`Unknown block "${slug}". Run: blocks.mjs list`);
      if (variant && !b.variants.some((v) => v.id === variant)) {
        throw new Error(`${slug} has no variant "${variant}". Its variants: ${b.variants.map((v) => v.id).join(", ") || "none"}.`);
      }
      return { slug, variant };
    });
    const deps = project();
    // The one stop: a passing plan, the user's logged reply, and only blocks the storyboard names (gate.mjs).
    const refusal = addRefusal(root, requests);
    if (refusal) return refuse("blocks.mjs add", refusal);
    const wanted = new Set();
    const added = [];
    for (const { slug } of requests) {
      const b = CATALOG.find((x) => x.slug === slug);
      for (const f of b.files) place(join(BLOCKS, f), target(f));
      for (const p of b.packages) wanted.add(p);
      added.push(b);
    }
    installMissing(deps, wanted);
    for (const b of added) {
      const from = `@/components/struq/${b.file.replace(/\.tsx?$/, "")}`;
      console.log(`\n${b.slug}: import { ${b.exports.join(", ")} } from "${from}";`);
      if (b.variants.length) console.log(`  variant: ${b.variants.map((v) => `"${v.id}"`).join(" | ")} (default "${b.variants[0].id}")`);
    }
    report("Step 5 Blocks", `blocks.mjs added ${added.map((b) => b.slug).join(", ")}.`);
    console.log("OK blocks added");
  },
};

const run = commands[cmd];
if (!run) {
  console.error("Usage: blocks.mjs list [kind] | init | add <slug>[:<variant>] [...] | arc [language] | finish   [--dir <project>] [--force] [--no-install]");
  process.exit(2);
}
try {
  run();
} catch (e) {
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
}
