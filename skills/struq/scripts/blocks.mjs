#!/usr/bin/env node
// Struq blocks, offline: the skill's own copy of Struq's admitted blocks (blocks/, catalog.json), installed into a
// Next.js App Router project. The same files the MCP's struq_block returns.
//
//   node <skill-dir>/scripts/blocks.mjs list [kind]          the catalogue, one line per block with its variants
//   node <skill-dir>/scripts/blocks.mjs init                 the kit, the app shell (on a starter) and the base packages
//   node <skill-dir>/scripts/blocks.mjs add <slug>[:<variant>] [...]  a block and every file it imports, plus its packages
//   node <skill-dir>/scripts/blocks.mjs arc [language]      a language's storyboard skeleton (film.json); none: the three
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
    // The kit, minus the WebGL hero layer: HeroCanvas and its scenes need three, so they come with hero-opener.
    for (const f of walk(join(BLOCKS, "kit"))) {
      const r = relative(join(BLOCKS, "kit"), f).split("\\").join("/");
      if (r === "HeroCanvas.tsx" || r.startsWith("scenes/")) continue;
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
    installMissing(deps, ["gsap", "@gsap/react", "lenis"]);
    report("Step 1 Project", `blocks.mjs init copied the kit and ${copied.length} file(s) in all, kept ${kept.length}.`);
    console.log("OK init ready");
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
  console.error("Usage: blocks.mjs list [kind] | init | add <slug>[:<variant>] [...] | arc [language]   [--dir <project>] [--force] [--no-install]");
  process.exit(2);
}
try {
  run();
} catch (e) {
  console.error(`FAIL ${e.message}`);
  process.exitCode = 1;
}
