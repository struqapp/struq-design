#!/usr/bin/env node
// Struq site log: STRUQ-LOG.md in the project root, one per site, append only, human first.
// STRUQ.md is the plan and the contract; STRUQ-LOG.md is what happened, in order.
//
// From the shell, at every checklist step:
//   node <skill-dir>/scripts/log.mjs "Step 5 Blocks" "hero-still, variant frame, in app/page.tsx." "Why: one calm photo for an architect."
//   add --dir <project> to run from elsewhere
//
// From a script: import { appendLog } from "./log.mjs"; appendLog(root, "Step 5 Images", ["...", "..."]);
//
// Entry shape: a heading with the step name and the local time, then two to five short lines.
// Earlier entries are never rewritten: the file is only ever opened for appending.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DASHES = /[\u2012\u2013\u2014\u2015]/g;

function stamp(date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function projectName(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (pkg.name) return pkg.name;
  } catch {
    // no package.json yet: the folder name will do
  }
  return basename(root);
}

/** Append one entry to <root>/STRUQ-LOG.md, creating the file with its header the first time. */
export function appendLog(root, step, lines) {
  const file = join(root, "STRUQ-LOG.md");
  const clean = (s) => String(s).replace(DASHES, ",").replace(/\s+/g, " ").trim();
  const body = (Array.isArray(lines) ? lines : [lines]).map(clean).filter(Boolean).slice(0, 8);
  let text = "";
  if (!existsSync(file)) {
    text += `# STRUQ-LOG.md: ${projectName(root)}\n\nThe build log of this site, oldest first. Append only: never edit or remove an entry. The plan and the contract are in STRUQ.md.\n`;
  }
  text += `\n## ${clean(step)} (${stamp()})\n${body.map((l) => `${l}\n`).join("")}`;
  appendFileSync(file, text);
  return file;
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--dir");
  const root = resolve(i >= 0 ? args[i + 1] : process.cwd());
  const rest = i >= 0 ? args.filter((_, j) => j !== i && j !== i + 1) : args;
  // MCP calls: node log.mjs mcp <struq_tool> [--note "<what it returned or what you took from it>"]
  if (rest[0] === "mcp") {
    const tool = rest[1];
    const k = rest.indexOf("--note");
    const STEP = { struq_richting: 2, struq_blokken: 2, struq_blok: 5, struq_controle: 8 };
    if (!tool || !/^struq_/.test(tool)) {
      console.error('Usage: node log.mjs mcp <struq_tool> [--note "<text>"]');
      process.exit(2);
    }
    const file = appendLog(root, `Step ${STEP[tool] ?? 5} MCP ${tool}`, [k >= 0 ? rest[k + 1] : "Called."]);
    console.log(`Logged ${tool} in ${file}`);
    process.exit(0);
  }
  const [step, ...lines] = rest;
  if (!step || !lines.length || !/^Step [0-9]+/.test(step)) {
    console.error('Usage: node log.mjs "Step <N> <Name>" "<what>" ["<why>" ...]   [--dir <project>]. The step starts with Step and its checklist number.');
    process.exit(2);
  }
  const file = appendLog(root, step, lines);
  console.log(`Logged "${step}" in ${file}`);
}
