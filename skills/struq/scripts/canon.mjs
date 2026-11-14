#!/usr/bin/env node
// Struq canon, offline: Struq's palettes and type pairings, written into the project as the one token block the
// blocks read. The same block, derivation and font requests as Struq's block lab and the MCP's struq_richting
// (scripts/tokens.mjs), from the snapshot in canon/canon.json that the skill's release copies from Struq.
//
//   node <skill-dir>/scripts/canon.mjs list                       every palette and pairing
//   node <skill-dir>/scripts/canon.mjs palette <id>               writes the STRUQ TOKENS block in app/globals.css
//   node <skill-dir>/scripts/canon.mjs type <id>                  the same block with the pairing, and app/fonts.ts
//   node <skill-dir>/scripts/canon.mjs print <palette> <pairing>  prints the block and the font URLs, writes nothing
//   add --dir <project> to run from elsewhere
//
// palette and type refuse, writing nothing, until STRUQ.md passes the plan check and STRUQ-LOG.md holds the user's
// reply to the treatment (gate.mjs). list and print never ask.
//
// Node 18 or later, no network, no dependencies.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { refuse, stopRefusal } from "./gate.mjs";
import { appendLog } from "./log.mjs";
import { fontHrefs, headFamily, lightness, paletteTokens } from "./tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CANON = JSON.parse(readFileSync(join(here, "..", "canon", "canon.json"), "utf8"));
const args = process.argv.slice(2);
const dirAt = args.indexOf("--dir");
const root = resolve(dirAt >= 0 ? args[dirAt + 1] : process.cwd());
const [cmd, a, b] = args.filter((_, i) => dirAt < 0 || (i !== dirAt && i !== dirAt + 1));

const palette = (id) => {
  const p = CANON.palettes.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown palette "${id}". Run: canon.mjs list`);
  return p;
};
const pairing = (id) => {
  const t = CANON.pairings.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown pairing "${id}". Run: canon.mjs list`);
  return t;
};
const faces = (t) => [t.display, t.body, t.accentItalic].filter(Boolean).map(headFamily);

export function tokenBlock(p, t) {
  const lines = paletteTokens(p, t).map(([k, v]) => `  ${k}: ${v};`);
  return `/* STRUQ TOKENS: palette ${p.id}, type ${t.id}. Written by canon.mjs, the block Struq's lab and struq_richting give. */\n[data-blocks] {\n${lines.join("\n")}\n}`;
}

const BLOCK = /\/\* STRUQ TOKENS[^*]*\*\/\s*\[data-blocks\]\s*\{[\s\S]*?\n\}/;

function cssFile() {
  const path = ["app/globals.css", "src/app/globals.css"].map((f) => join(root, f)).find(existsSync);
  if (!path) throw new Error("No app/globals.css. Run blocks.mjs init first.");
  return path;
}

function write(p, t) {
  const path = cssFile();
  const css = readFileSync(path, "utf8");
  if (!BLOCK.test(css)) throw new Error(`No STRUQ TOKENS block in ${path}. Run blocks.mjs init, or copy the block from recipes/app/globals.css.`);
  writeFileSync(path, css.replace(BLOCK, tokenBlock(p, t)));
  return path;
}

function current() {
  const css = readFileSync(cssFile(), "utf8");
  const m = css.match(/STRUQ TOKENS: palette (\S+), type (\S+?)\./);
  return { palette: m?.[1] ?? CANON.palettes[0].id, type: m?.[2] ?? CANON.pairings[0].id };
}

function writeFonts(t) {
  const hrefs = fontHrefs(t, CANON);
  const file = join(root, existsSync(join(root, "src", "app")) ? "src/app" : "app", "fonts.ts");
  writeFileSync(
    file,
    `// app/fonts.ts: written by the Struq skill (canon.mjs type ${t.id}): ${faces(t).join(", ")}.
// Each Google face is asked for its real weight range, then as the bare family as a fallback, because Google refuses a
// request for a weight the family lacks. The layout puts one <link> per URL in <head>; the token block in globals.css
// names the faces (--face-display, --face-body, --face-accent), so the blocks measure with the real face.
export const fontHrefs: string[] = ${JSON.stringify(hrefs, null, 2)};
`,
  );
  return { file, hrefs };
}

const commands = {
  list() {
    // Random order on every call: the first line is never a recommendation.
    const shuffled = (list) => list.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(([, x]) => x);
    console.log(`PALETTES (${CANON.palettes.length}), in random order: id, mood, ground. "kept out" means kept for a brand that asks, never picked unasked.`);
    for (const p of shuffled(CANON.palettes)) {
      const ground = lightness(p.colors.background) < 0.5 ? "dark" : "light";
      console.log(`  ${p.id.padEnd(40)} ${(p.mood ?? "").padEnd(44)} ${ground}${p.autoPick === false ? "  kept out" : ""}`);
    }
    console.log(`\nPAIRINGS (${CANON.pairings.length}), in random order: id, display + body (+ italic accent), display weight`);
    for (const t of shuffled(CANON.pairings)) {
      const [d, bo, ac] = [t.display, t.body, t.accentItalic].map((s) => (s ? headFamily(s) : null));
      console.log(`  ${t.id.padEnd(26)} ${d} + ${bo}${ac ? ` (+ ${ac} italic)` : ""}, ${t.displayScale?.weight ?? 300}${t.autoPick === false ? "  kept out" : ""}`);
    }
    console.log(`\nSnapshot: Struq ${CANON.source.ref} ${CANON.source.commit}.`);
  },
  palette() {
    const p = palette(a);
    const t = pairing(current().type);
    const path = write(p, t);
    console.log(`Wrote palette ${p.id} (${p.mood}) to ${path.replace(root, ".")}, with type ${t.id}.`);
    console.log(`STRUQ.md line:  Palette: ${p.id} (${p.mood})`);
    appendLog(root, "Step 3 Canon palette", [`canon.mjs wrote palette ${p.id} (${p.mood}) into the STRUQ TOKENS block.`]);
    console.log("OK palette written");
  },
  type() {
    const t = pairing(a);
    const p = palette(current().palette);
    const path = write(p, t);
    const { file, hrefs } = writeFonts(t);
    console.log(`Wrote type ${t.id} (${faces(t).join(" + ")}) to ${path.replace(root, ".")} and ${file.replace(root, ".")} (${hrefs.length} font URLs).`);
    console.log(`STRUQ.md line:  Type: ${t.id}: ${faces(t).join(" + ")}`);
    appendLog(root, "Step 3 Canon type", [`canon.mjs wrote type ${t.id}: ${faces(t).join(" + ")}, display weight ${t.displayScale?.weight ?? 300}.`]);
    console.log("OK type written");
  },
  print() {
    const p = palette(a);
    const t = pairing(b ?? CANON.pairings[0].id);
    console.log(tokenBlock(p, t));
    console.log("");
    for (const h of fontHrefs(t, CANON)) console.log(h);
  },
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = commands[cmd];
  if (!run || (cmd !== "list" && !a)) {
    console.error("Usage: canon.mjs list | palette <id> | type <id> | print <palette> [pairing]   [--dir <project>]");
    process.exit(2);
  }
  try {
    // palette and type write into the project, so they wait for the one stop: a passing plan and the logged reply.
    const refusal = cmd === "palette" || cmd === "type" ? stopRefusal(root) : null;
    if (refusal) refuse(`canon.mjs ${cmd}, nothing written`, refusal);
    else run();
  } catch (e) {
    console.error(`FAIL ${e.message}`);
    process.exitCode = 1;
  }
}
