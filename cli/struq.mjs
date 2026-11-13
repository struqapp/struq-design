#!/usr/bin/env node
// npx @struq/skill@latest: copies the Struq skill into every AI coding tool found on this machine.
// No dependencies, no prompts (an agent can run it unattended), and nothing is fetched beyond
// this package: the skill ships inside it, in skills/struq.

import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(PACKAGE_ROOT, 'skills', 'struq');
const { version } = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
const NAME = 'struq';

// Where each tool reads skills, matching the open skills CLI (github.com/vercel-labs/skills,
// docs/agents.md). `home` is the folder whose presence means the tool is installed.
const TOOLS = [
  { flag: 'claude', label: 'Claude Code', home: '.claude', global: '.claude/skills', project: '.claude/skills', use: '/struq <brief>' },
  { flag: 'cursor', label: 'Cursor', home: '.cursor', global: '.cursor/skills', project: '.agents/skills', use: 'ask for the struq skill by name' },
  { flag: 'codex', label: 'Codex', home: '.codex', global: '.agents/skills', project: '.agents/skills', use: '$struq <brief>' },
  { flag: 'opencode', label: 'OpenCode', home: '.config/opencode', global: '.config/opencode/skills', project: '.agents/skills', use: 'ask for the struq skill by name' },
  { flag: 'gemini', label: 'Gemini CLI', home: '.gemini', global: '.gemini/skills', project: '.agents/skills', use: 'ask for the struq skill by name' },
  { flag: 'copilot', label: 'GitHub Copilot', home: '.copilot', global: '.copilot/skills', project: '.agents/skills', use: 'ask for the struq skill by name' },
  { flag: 'windsurf', label: 'Windsurf', home: '.codeium/windsurf', global: '.codeium/windsurf/skills', project: '.windsurf/skills', use: 'ask for the struq skill by name' },
];

const HELP = `Struq skill ${version}: websites at the level of a design studio, built by your own AI.

Usage
  npx @struq/skill@latest              install for every AI tool found on this machine
  npx @struq/skill@latest --claude     only for one tool: ${TOOLS.map((t) => `--${t.flag}`).join(', ')}
  npx @struq/skill@latest --project    into this project instead of your home folder
  npx @struq/skill@latest remove       remove the skill again (takes the same flags)
  npx @struq/skill@latest --help       show this

Run it again at any time to update. More: https://struq.app/skill
`;

function parse(argv) {
  const options = { command: 'install', project: false, only: [] };
  for (const arg of argv) {
    if (arg === 'remove' || arg === 'uninstall') options.command = 'remove';
    else if (arg === 'install' || arg === 'add') options.command = 'install';
    else if (arg === '--help' || arg === '-h' || arg === 'help') options.command = 'help';
    else if (arg === '--version' || arg === '-v') options.command = 'version';
    else if (arg === '--project' || arg === '-p') options.project = true;
    else if (arg === '--global' || arg === '-g') options.project = false;
    else {
      const tool = TOOLS.find((t) => arg === `--${t.flag}`);
      if (!tool) throw new Error(`Unknown option "${arg}". Run npx @struq/skill@latest --help.`);
      options.only.push(tool);
    }
  }
  return options;
}

/** The tools to install for, each with the folder its copy goes to. Two tools can share one folder. */
function targets({ project, only }) {
  const home = homedir();
  const base = project ? process.cwd() : home;
  let picked = only.length ? only : TOOLS.filter((t) => existsSync(join(home, t.home)));
  // Nothing detected: Claude Code is the most common host, and its folder is the one the
  // skill's own docs point at, so that is where a first install goes.
  const guessed = !picked.length;
  if (guessed) picked = [TOOLS[0]];
  return { guessed, list: picked.map((tool) => ({ tool, dir: join(base, project ? tool.project : tool.global, NAME) })) };
}

const shown = (path) => {
  const fromHome = relative(homedir(), path);
  return fromHome && !fromHome.startsWith('..') ? `~${sep}${fromHome}` : path;
};

/** Removes our folder or the link to it, never anything else: a link is unlinked, its target left alone. */
function clear(dir) {
  if (!existsSync(dir) && !isLink(dir)) return false;
  rmSync(dir, { recursive: !isLink(dir), force: true });
  return true;
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function run(argv) {
  const options = parse(argv);
  if (options.command === 'help') return void process.stdout.write(HELP);
  if (options.command === 'version') return void process.stdout.write(`${version}\n`);

  const { guessed, list } = targets(options);
  const done = new Set();
  const lines = [];

  for (const { tool, dir } of list) {
    if (options.command === 'remove') {
      const removed = done.has(dir) || clear(dir);
      done.add(dir);
      lines.push(`  ${removed ? '-' : ' '} ${tool.label.padEnd(15)}${removed ? shown(dir) : 'was not installed'}`);
      continue;
    }
    if (!done.has(dir)) {
      clear(dir);
      mkdirSync(dirname(dir), { recursive: true });
      cpSync(SOURCE, dir, { recursive: true });
      done.add(dir);
    }
    lines.push(`  ✓ ${tool.label.padEnd(15)}${shown(dir)}`);
  }

  const out = [`Struq skill ${version}`, '', ...lines, ''];
  if (options.command === 'install') {
    if (guessed) out.push('No AI tool found, so it went to Claude Code. Use --cursor, --codex and so on for another tool.', '');
    out.push('Restart your AI tool, then start with:');
    for (const tool of new Map(list.map(({ tool }) => [tool.label, tool])).values()) {
      out.push(`  ${tool.label.padEnd(15)}${tool.use}`);
    }
    out.push('', 'Run this again at any time to update. More: https://struq.app/skill');
  }
  process.stdout.write(`${out.join('\n')}\n`);
}

try {
  run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`struq: ${error.message}\n`);
  process.exit(1);
}
