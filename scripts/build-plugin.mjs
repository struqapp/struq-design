// Release step: build plugin/, the lean Claude plugin for the plugin directory.
//
//   node scripts/build-plugin.mjs           writes plugin/ from the full skill
//   node scripts/build-plugin.mjs --check   exits 1 when plugin/ is out of step with the full skill
//
// The directory takes only Markdown, text, JSON, YAML and a few image types from an unverified organisation: no
// scripts, no CSS, no fonts, no SVG, no package manager files. So plugin/ is the MCP-first skill: the Struq MCP serves
// the blocks, the kit, the directions and the check, and this folder carries the instructions around them. Everything
// in it is generated from the full skill (skills/struq/) and scripts/plugin/, so it moves with each release:
//
//   plugin/.claude-plugin/plugin.json   the manifest, documented fields only
//   plugin/.mcp.json                    the Struq MCP at its production URL; OAuth, so no keys
//   plugin/icon.png                     the listing icon
//   plugin/skills/struq/SKILL.md        scripts/plugin/SKILL.template.md with the shared sections of the full SKILL.md
//   plugin/skills/struq/catalog.json    the block catalogue, without the file lists struq_blok hands over
//   plugin/skills/struq/references/     the full skill's references, with every script step rewritten to a tool call
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PLUGIN_DIR = join(repo, "plugin");
const SKILL = join(repo, "skills", "struq");
const SOURCE = join(repo, "scripts", "plugin");

export const MCP_URL = "https://struq.nl/api/mcp";

// The fields the manifest may carry: the Claude Code plugins reference's metadata fields plus the directory listing
// fields. The test holds plugin/ to this list.
export const MANIFEST_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "icon",
  "privacyPolicyUrl",
];

const REFERENCES = ["craft.md", "iconography.md", "stack-targets.md", "tells.md", "triage.md"];

// Each script step in a reference, rewritten to the tool that does the same. A rewrite whose text is gone throws, so
// a changed reference cannot slip through with a script step in it.
const REWRITES = {
  "craft.md": [["`canon.mjs type` requests each face's real range.", "`struq_richting`'s font URLs carry each face's real range."]],
  "tells.md": [
    [
      "`check.mjs` detects the marked ones (and `struq_controle` returns the same rules when the MCP is\nconnected)",
      "`struq_controle` returns detectors for the marked ones, to run on your own\nfiles",
    ],
  ],
  "triage.md": [["with check.mjs (and struq_controle when connected) and", "with `struq_controle`'s detectors and"]],
  "stack-targets.md": [
    [
      "`blocks.mjs` refuses a project without `next`: copy the files by hand instead, keeping the layout of `blocks/` under\n`src/components/struq/` so the relative imports hold (each block's files are listed in `blocks/catalog.json`).",
      "Put the files `struq_blok` returns under `src/components/struq/` instead of `components/struq/`, keeping their\npaths so the relative imports hold.",
    ],
    ["per URL that `canon.mjs print <palette> <pairing>` prints;", "per font URL `struq_richting` returns;"],
    [
      "the kit import, the `@theme inline` names and the STRUQ TOKENS block from\n  `recipes/app/globals.css` (the block comes from `canon.mjs print`).",
      "the kit import (`src/components/struq/kit/blocks.css`) and the token block from\n  `struq_richting`.",
    ],
    [
      "`check.mjs` reads `app/layout.tsx` for the gate; on Vite it reports that line as missing. Check `index.html` by eye\nand note it under Verify in STRUQ.md.",
      "On Vite the gate lives in `index.html`: check it by eye and note it under Verify in STRUQ.md.",
    ],
  ],
};

// What may not reach the plugin's text: a script of the full skill, its folders, or a path only it has.
const SCRIPT_TRACE = /\.mjs\b|<skill-dir>|recipes\/|canon\.json|blocks\/catalog\.json|CATALOG\.md/;

const readText = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

function section(skill, title) {
  const parts = skill.split(/^(?=## )/m);
  const found = parts.find((p) => p.startsWith(`## ${title}\n`));
  if (!found) throw new Error(`skills/struq/SKILL.md has no section "## ${title}"`);
  return found.trimEnd();
}

function rewrite(name, text) {
  let out = text;
  for (const [from, to] of REWRITES[name] ?? []) {
    if (!out.includes(from)) throw new Error(`references/${name} no longer holds the text to rewrite: ${from.split("\n")[0]}`);
    out = out.replaceAll(from, to);
  }
  return out;
}

/** Every file of plugin/, as relative path (forward slashes) to content. */
export function buildPlugin() {
  const pkg = JSON.parse(readText(join(repo, "package.json")));
  const files = new Map();

  const manifest = {
    name: "struq",
    version: pkg.version,
    description:
      "Award-tier studio sites for coding agents, built through the Struq MCP from Struq's admitted blocks: preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, on Struq's palettes and type pairings, with a check against the AI tells.",
    author: { name: "Struq", url: "https://struq.nl" },
    homepage: "https://struq.nl",
    repository: "https://github.com/struqnl/struq-design",
    license: pkg.license,
    keywords: ["design", "web-design", "gsap", "lenis", "three.js", "awwwards", "mcp", "skill"],
    icon: "./icon.png",
    privacyPolicyUrl: "https://struq.nl/privacy-policy",
  };
  for (const key of Object.keys(manifest)) if (!MANIFEST_FIELDS.includes(key)) throw new Error(`plugin.json field ${key} is not allowed`);
  files.set(".claude-plugin/plugin.json", `${JSON.stringify(manifest, null, 2)}\n`);

  files.set(".mcp.json", `${JSON.stringify({ mcpServers: { struq: { type: "http", url: MCP_URL } } }, null, 2)}\n`);
  files.set("icon.png", readFileSync(join(SOURCE, "icon.png")));

  const full = readText(join(SKILL, "SKILL.md"));
  const skill = readText(join(SOURCE, "SKILL.template.md")).replace(/<!-- section: (.+?) -->/g, (_, title) => section(full, title));
  files.set("skills/struq/SKILL.md", skill);

  const catalog = JSON.parse(readText(join(SKILL, "blocks", "catalog.json")));
  const blocks = catalog.blocks.map(({ slug, kind, title, does, reference, variants, packages }) => ({ slug, kind, title, does, reference, variants, packages }));
  files.set("skills/struq/catalog.json", `${JSON.stringify({ source: catalog.source, tool: "struq_blok(slug, variant)", blocks }, null, 2)}\n`);

  for (const name of REFERENCES) files.set(`skills/struq/references/${name}`, rewrite(name, readText(join(SKILL, "references", name))));

  for (const [path, body] of files) {
    if (typeof body !== "string") continue;
    const trace = body.match(SCRIPT_TRACE);
    if (trace) throw new Error(`plugin/${path} still points at the full skill's scripts: "${trace[0]}"`);
  }
  return files;
}

/** The files plugin/ holds on disk now, as relative path to bytes. */
export function readPlugin(dir = PLUGIN_DIR) {
  const out = new Map();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.set(relative(dir, p).split(sep).join("/"), readFileSync(p));
    }
  };
  walk(dir);
  return out;
}

export function writePlugin() {
  const files = buildPlugin();
  rmSync(PLUGIN_DIR, { recursive: true, force: true });
  for (const [path, body] of files) {
    const to = join(PLUGIN_DIR, path);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, body);
  }
  return files;
}

/** The paths whose content differs between a fresh build and plugin/ on disk, plus extra or missing files. */
export function pluginDrift() {
  const want = buildPlugin();
  let have;
  try {
    have = readPlugin();
  } catch {
    return [...want.keys()];
  }
  const drift = [];
  for (const [path, body] of want) {
    const got = have.get(path);
    if (!got || !Buffer.from(body).equals(got)) drift.push(path);
  }
  for (const path of have.keys()) if (!want.has(path)) drift.push(path);
  return drift;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--check")) {
    const drift = pluginDrift();
    if (drift.length) {
      console.error(`plugin/ is out of step with the skill: ${drift.join(", ")}. Run node scripts/build-plugin.mjs.`);
      process.exit(1);
    }
    console.log("plugin/ is in step with the skill.");
  } else {
    const files = writePlugin();
    console.log(`plugin/: ${files.size} files for Struq ${JSON.parse(readText(join(repo, "package.json"))).version}.`);
  }
}
