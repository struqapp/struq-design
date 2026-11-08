#!/usr/bin/env node
// Release step: copy Struq's admitted blocks, their kit and the canon into the skill.
//
//   node scripts/release-blocks.mjs                       reads the Struq repo next to this one, ref "staging"
//   node scripts/release-blocks.mjs --struq <path> --ref <git ref>
//
// Struq's blocks/ is the only source. This is a copy, never an import: the skill must work in a project that has
// never seen Struq. Only entries with status "admitted" in blocks/catalog.ts come over, with every file they import
// by relative path (the kit, a helper in another folder, a sibling block), the whole kit, and blocks.css without the
// CSS sections that belong only to blocks that are not admitted. It writes:
//
//   skills/struq/blocks/            the files, laid out as in Struq, so the relative imports hold
//   skills/struq/blocks/catalog.json and CATALOG.md   the generated catalogue the skill reads
//   skills/struq/canon/canon.json   palettes, pairings, font weights and providers, for canon.mjs offline
//   plugin/                         the lean Claude plugin, through scripts/build-plugin.mjs
//
// Files are read from the git ref (never the working tree), so another branch checked out in the Struq repo does not
// leak into a release. Needs Node 22.18 or later: catalog.ts and the canon are TypeScript, loaded by type stripping.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const struq = resolve(opt("--struq", join(repo, "..", "StruqMain", "StruqVisual")));
const ref = opt("--ref", "staging");
const OUT = join(repo, "skills", "struq", "blocks");
const CANON_OUT = join(repo, "skills", "struq", "canon");

const git = (...a) => execFileSync("git", ["-C", struq, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const show = (path) => git("show", `${ref}:${path}`);
const commit = git("rev-parse", "--short", ref).trim();
const tree = new Set(git("ls-tree", "-r", "--name-only", ref, "blocks/").split("\n").filter(Boolean));

// --- load the TypeScript sources by type stripping ------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "struq-release-"));
async function load(path) {
  const file = join(tmp, path.replaceAll("/", "__"));
  writeFileSync(file, show(path));
  return import(pathToFileURL(file).href);
}
const { BLOCKS } = await load("blocks/catalog.ts");
const { CANON_PALETTES } = await load("lib/canon/palettes.ts");
const { CANON_TYPOGRAPHY } = await load("lib/canon/typography.ts");
const { FONT_WEIGHTS, FONT_SOURCES } = await load("lib/canon/font-sources.ts");
rmSync(tmp, { recursive: true, force: true });

// --- the closure of a block: every file it reaches by relative import -------------------------------------------
const RELATIVE = /(?:from\s*|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+)["']/g;
const BARE = /(?:from\s*|import\s*\(\s*|import\s+)["']([^."'/][^"']*)["']/g;

function resolveImport(fromFile, spec) {
  const base = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (tree.has(candidate)) return candidate;
  }
  throw new Error(`${fromFile} imports "${spec}", which is not in blocks/ at ${ref}`);
}

const text = new Map();
const read = (path) => {
  if (!text.has(path)) text.set(path, show(path));
  return text.get(path);
};

function closure(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(tsx?|mjs|js)$/.test(file)) continue;
    const src = read(file);
    if (/from\s*["']@\//.test(src)) throw new Error(`${file} imports through an alias; blocks must import by relative path`);
    for (const m of src.matchAll(RELATIVE)) queue.push(resolveImport(file, m[1]));
  }
  return [...seen].sort();
}

const packageOf = (spec) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
const IMPLICIT = new Set(["react", "react-dom", "next"]);
function packagesOf(files) {
  const found = new Set();
  for (const f of files) {
    if (!/\.(tsx?|mjs|js)$/.test(f)) continue;
    for (const m of read(f).matchAll(BARE)) {
      const name = packageOf(m[1]);
      if (!IMPLICIT.has(name) && !name.startsWith("node:")) found.add(name);
    }
  }
  if (found.has("three")) found.add("@types/three");
  return found;
}

// --- the admitted set -----------------------------------------------------------------------------------------
const admitted = BLOCKS.filter((b) => b.status === "admitted");
const notAdmitted = new Set(BLOCKS.filter((b) => b.status !== "admitted").map((b) => b.slug));
const kitFiles = [...tree].filter((f) => f.startsWith("blocks/kit/"));

const KIND_ORDER = ["preloader", "page-transition", "header", "hero", "background", "showpiece", "transition", "section", "footer", "cursor"];
const entries = admitted
  .map((b) => {
    const files = closure(`blocks/${b.file}`);
    const packages = new Set([...b.packages, ...packagesOf(files)]);
    if (files.some((f) => f.startsWith("blocks/kit/")) || b.kit.includes("blocks.css")) files.push("blocks/kit/blocks.css");
    const exports = [...read(`blocks/${b.file}`).matchAll(/export\s+(?:function|const)\s+([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)\b/g)].map((m) => m[1]);
    return {
      slug: b.slug,
      kind: b.kind,
      title: b.title,
      does: b.does,
      reference: b.reference ?? null,
      variants: (b.variants ?? []).map(({ id, title, does }) => ({ id, title, does })),
      packages: [...packages].sort(),
      exports: [...new Set(exports)],
      file: b.file,
      files: [...new Set(files)].map((f) => f.slice("blocks/".length)).sort(),
    };
  })
  .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

for (const e of entries) if (!KIND_ORDER.includes(e.kind)) throw new Error(`Unknown kind ${e.kind} for ${e.slug}`);

// --- blocks.css without the sections of blocks that are not admitted -------------------------------------------
function trimCss(css) {
  const parts = css.split(/(?=^\/\* --- .+ --- \*\/$)/m);
  return parts
    .filter((part) => {
      const label = part.match(/^\/\* --- (.+) --- \*\/$/m)?.[1];
      if (!label || !part.startsWith("/* ---")) return true;
      const names = label.replace(/ variants$/, "").split(/ and |, /).map((s) => s.trim());
      return !names.every((n) => notAdmitted.has(n));
    })
    .join("");
}

// --- write -------------------------------------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
const everyFile = new Set([...kitFiles, ...entries.flatMap((e) => e.files.map((f) => `blocks/${f}`))]);
for (const path of [...everyFile].sort()) {
  const to = join(OUT, path.slice("blocks/".length));
  mkdirSync(dirname(to), { recursive: true });
  const body = path === "blocks/kit/blocks.css" ? trimCss(read(path)) : read(path);
  writeFileSync(to, body.replace(/\r\n/g, "\n"));
}

const source = { repo: "Struq blocks/", ref, commit };
writeFileSync(join(OUT, "catalog.json"), `${JSON.stringify({ source, blocks: entries }, null, 2)}\n`);

const LABEL = {
  preloader: "Preloaders",
  "page-transition": "Page transitions",
  header: "Headers",
  hero: "Heroes",
  background: "Backgrounds",
  showpiece: "Showpieces",
  transition: "Scene transitions",
  section: "Sections",
  footer: "Footers",
  cursor: "Cursors",
};
const md = [
  "# Block catalogue",
  "",
  `Generated by scripts/release-blocks.mjs from Struq ${ref} at ${commit}. Do not edit: run the release script again.`,
  `${entries.length} admitted blocks. Install one with \`node <skill-dir>/scripts/blocks.mjs add <slug>\`; read its file for the props.`,
  "Every block works light and dark; a variant is a different composition of the same idea, passed as `variant`.",
  "",
];
for (const kind of KIND_ORDER) {
  const group = entries.filter((e) => e.kind === kind);
  if (!group.length) continue;
  md.push(`## ${LABEL[kind]}`, "");
  for (const e of group) {
    md.push(`### ${e.slug}`, "", `${e.title}. ${e.does}`, "");
    if (e.variants.length) {
      md.push(`Variants (\`variant\`, the first is the default):`);
      for (const v of e.variants) md.push(`- \`${v.id}\`: ${v.does}`);
      md.push("");
    }
    md.push(`Exports: ${e.exports.map((x) => `\`${x}\``).join(", ") || "(see file)"}. Packages: ${e.packages.join(", ") || "none"}.`);
    md.push(`Files: ${e.files.map((f) => `\`${f}\``).join(", ")}.`, "");
  }
}
writeFileSync(join(OUT, "CATALOG.md"), md.join("\n"));

// --- the canon, for canon.mjs offline ------------------------------------------------------------------------------
const families = new Set();
const head = (stack) => (stack ?? "").split(",")[0].trim().replace(/^["']|["']$/g, "");
for (const t of CANON_TYPOGRAPHY) for (const s of [t.display, t.body, t.accentItalic]) if (s) families.add(head(s));
const providers = Object.fromEntries([...families].sort().map((f) => [f, FONT_SOURCES[f]?.provider ?? null]));
for (const [f, p] of Object.entries(providers)) if (!p) throw new Error(`No font source for ${f} in font-sources.ts`);
mkdirSync(CANON_OUT, { recursive: true });
writeFileSync(
  join(CANON_OUT, "canon.json"),
  `${JSON.stringify({ source: { repo: "Struq lib/canon", ref, commit }, palettes: CANON_PALETTES, pairings: CANON_TYPOGRAPHY, fontWeights: FONT_WEIGHTS, fontProviders: providers }, null, 2)}\n`,
);

const byKind = KIND_ORDER.map((k) => [k, entries.filter((e) => e.kind === k).length]).filter(([, n]) => n);
console.log(`Struq ${ref} ${commit}: ${entries.length} admitted blocks (${byKind.map(([k, n]) => `${n} ${k}`).join(", ")}), ${everyFile.size} files.`);
console.log(`Left out (not admitted): ${[...notAdmitted].join(", ") || "none"}.`);
console.log(`Canon: ${CANON_PALETTES.length} palettes, ${CANON_TYPOGRAPHY.length} pairings.`);

// --- plugin/, the lean Claude plugin, rebuilt from the catalogue and the skill just written ----------------------
const { writePlugin } = await import("./build-plugin.mjs");
console.log(`plugin/: ${writePlugin().size} files.`);
