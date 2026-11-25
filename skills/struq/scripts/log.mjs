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
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasApproval } from "./gate.mjs";

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
  syncChecklist(root);
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
    // The Dutch names are what servers before the English rename call these tools.
    const STEP = { struq_direction: 2, struq_blocks: 2, struq_block: 5, struq_check: 8, struq_richting: 2, struq_blokken: 2, struq_blok: 5, struq_controle: 8 };
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
  const n = Number(step.match(/^Step ([0-9]+)/)[1]);
  const plan = existsSync(join(root, "STRUQ.md")) ? readFileSync(join(root, "STRUQ.md"), "utf8") : "";
  if (new RegExp(`^\\s*[-*]\\s*\\[[xX]\\]\\s*${n}\\b`, "m").test(plan)) console.log(`Step ${n} is ticked in STRUQ.md.`);
  else if (n === 7 && /^\s*[-*]\s*\[\s\]\s*7\b/m.test(plan)) {
    console.log("Step 7 stays open in STRUQ.md until .struq/art-direction.md holds a fresh subagent's asks, each answered Built: or Refused: (SKILL.md, Art direction).");
  }
}

/**
 * Tick every open Build checklist line in STRUQ.md whose step STRUQ-LOG.md already holds, so logging a step and
 * ticking it are one move (two Haiku builds of 2026-11-16 logged their steps and left the lines open). Step 2 waits
 * for the logged approval, step 7 for .struq/art-direction.md with the subagent's asks, and step 8 is check.mjs's
 * own. Every log entry runs it, the scripts' own entries too. Returns the steps it ticked.
 */
export function syncChecklist(root) {
  const planFile = join(root, "STRUQ.md");
  const logFile = join(root, "STRUQ-LOG.md");
  if (!existsSync(planFile) || !existsSync(logFile)) return [];
  const log = readFileSync(logFile, "utf8");
  let plan = readFileSync(planFile, "utf8");
  const ticked = [];
  for (let n = 1; n <= 7; n++) {
    const line = new RegExp(`^(\\s*[-*]\\s*\\[)\\s(\\]\\s*${n}\\b)`, "m");
    if (!line.test(plan) || !new RegExp(`^## Step ${n}\\b`, "m").test(log)) continue;
    if (n === 2 && !hasApproval(log)) continue;
    if (n === 7 && !existsSync(join(root, ".struq", "art-direction.md"))) continue;
    plan = plan.replace(line, "$1x$2");
    ticked.push(n);
  }
  if (ticked.length) writeFileSync(planFile, plan);
  return ticked;
}
