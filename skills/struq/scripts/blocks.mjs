#!/usr/bin/env node
// Struq blocks, offline: the skill's own copy of Struq's admitted blocks (blocks/, catalog.json), installed into a
// Next.js App Router project. The same files the MCP's struq_blok returns.
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
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

/** Every block of a role with each of its variants and that variant's energy, e.g. `hero-poster:window E3`. */
function pool(role) {
  return CATALOG.filter((b) => b.role === role && !b.home).flatMap((b) => {
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
function arcLines(arc) {
  const width = Math.max(...arc.scenes.map((s) => s.name.length));
  const last = arc.scenes.length - 1;
  const lines = [`Tone arc: ${arc.scenes.map((s) => s.tone[0]).join(", ")}`, "Storyboard:"];
  arc.scenes.forEach((scene, at) => {
    const role = scene.name === "Opening" ? "opening" : scene.name === "Centerpiece" ? "centerpiece" : null;
    const options = role
      ? pool(role)
      : [...scene.blocks, ...(scene.kit ? [scene.kit] : []), ...(scene.own || !scene.blocks.length ? ["own scene"] : [])];
    const tag = scene.tag === "frame" ? "frame" : "<loud|quiet>";
    const cast = scene.tag === "frame" ? options[0] : "<cast: what this idea needs here, and why>";
    const head = `${`${at + 1}.`.padEnd(at + 1 >= 10 ? 4 : 3)}${scene.name.padEnd(width)} (${tag}) ${cast}`;
    const parts = [head];
    if (scene.tag === "frame") parts.push("lands on: <what>");
    else if (at === last) parts.push("echoes the opening: <how>");
    else parts.push("on screen: <...>", "enters: <...>", "hands over: <...>");
    if (scene.tag !== "frame" && options.length) parts.push(`options: ${options.join(", ")}`);
    if (scene.footer?.length) parts.push(`footer: <${scene.footer.join(" | ")}>`);
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
    for (const line of arcLines(arc)) console.log(line);
    const f = language.frames;
    console.log(`\nFrames of ${id}: preloader ${f.preloader}, page transition ${f.pageTransition} (only with a second route), menu ${f.menu}. Header: ${film.FILM_HEADER.join(" or ")}.`);
    console.log(`Use: paste the Tone arc and the Storyboard into STRUQ.md under your treatment head. Cast every <cast: ...> from the Idea, the Motif and the Unlike line, not from the order of the options: each option is a different first screen or moment (blocks/CATALOG.md says what each does). Write one pick per line with its reason after "because", delete the options list, set (loud) for E2 or more and (quiet) for E1 or less, and change, add or drop middle scenes as the idea needs (7 to 9 scenes, the budgets in SKILL.md hold). Then run check.mjs --plan.`);
  },

  add() {
    if (!rest.length) throw new Error("Usage: blocks.mjs add <slug>[:<variant>] [...]. The slugs: blocks.mjs list");
    // A kit quiet scene is no block: init already copied it, so say how to import it and install nothing for it.
    for (const arg of rest.filter(kitScene)) {
      const name = kitScene(arg);
      console.log(`${name} is a kit quiet scene, already in components/struq/kit/quiet/ (blocks.mjs init): import { ${name} } from "@/components/struq/kit/quiet";`);
    }
    rest.splice(0, rest.length, ...rest.filter((arg) => !kitScene(arg)));
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
