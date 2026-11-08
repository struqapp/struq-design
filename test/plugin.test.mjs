// why: the Claude plugin directory refuses an unverified organisation's plugin that ships anything beyond Markdown,
// text, JSON, YAML and a few image types, a file that starts with #!, a package manager file, text that is not clean
// UTF-8, or a manifest field it does not know. plugin/ is the folder that goes to the directory, so every one of those
// refusals is checked here, and plugin/ must match a fresh build so a release cannot ship it stale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginDrift, readPlugin } from '../scripts/build-plugin.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PLUGIN = fileURLToPath(new URL('../plugin/', import.meta.url));

const TEXT = new Set(['.md', '.txt', '.json', '.yaml', '.yml']);
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);
const PACKAGE_FILES = new Set([
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  '.yarnrc',
  '.yarnrc.yml',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'bun.lock',
  'bun.lockb',
  '.npmrc',
  'deno.json',
  'deno.lock',
  'composer.json',
  'composer.lock',
  'requirements.txt',
  'Pipfile',
  'Pipfile.lock',
]);
// The Claude Code plugins reference's metadata fields that Struq uses, plus the directory listing fields. Kept here on
// its own, not imported from the build script, so a field added there fails until it is added here on purpose.
const MANIFEST_FIELDS = new Set([
  'name',
  'version',
  'description',
  'author',
  'homepage',
  'repository',
  'license',
  'keywords',
  'icon',
  'privacyPolicyUrl',
]);

const files = readPlugin(PLUGIN);
const ext = (path) => posix.extname(path).toLowerCase();
const isText = (path) => TEXT.has(ext(path));

test('plugin/ holds a manifest, the MCP config and the skill', () => {
  for (const path of ['.claude-plugin/plugin.json', '.mcp.json', 'skills/struq/SKILL.md']) assert.ok(files.has(path), path);
});

test('plugin/ holds only Markdown, text, JSON, YAML and at most one image', () => {
  const images = [];
  for (const path of files.keys()) {
    const e = ext(path);
    assert.ok(TEXT.has(e) || IMAGE.has(e), `${path}: ${e || 'no extension'} is not allowed`);
    if (IMAGE.has(e)) images.push(path);
  }
  assert.ok(images.length <= 1, `more than one image: ${images.join(', ')}`);
});

test('plugin/ holds no package manager file', () => {
  for (const path of files.keys()) assert.ok(!PACKAGE_FILES.has(posix.basename(path)), `${path} is a package manager file`);
});

test('no file in plugin/ starts with #!', () => {
  for (const [path, body] of files) assert.ok(!(body[0] === 0x23 && body[1] === 0x21), `${path} starts with #!`);
});

test('every text file in plugin/ is UTF-8 without NUL bytes', () => {
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  for (const [path, body] of files) {
    if (!isText(path)) continue;
    assert.ok(!body.includes(0), `${path} holds a NUL byte`);
    assert.doesNotThrow(() => utf8.decode(body), `${path} is not valid UTF-8`);
  }
});

test('the image is what its extension says', () => {
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (const [path, body] of files) {
    if (ext(path) === '.png') assert.deepEqual([...body.subarray(0, 8)], PNG, `${path} is not a PNG`);
  }
});

test('the manifests carry only allowed fields', () => {
  for (const file of [`${PLUGIN}.claude-plugin/plugin.json`, `${ROOT}.claude-plugin/plugin.json`]) {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    for (const key of Object.keys(manifest)) assert.ok(MANIFEST_FIELDS.has(key), `${file}: field "${key}" is not on the allowlist`);
  }
  const manifest = JSON.parse(files.get('.claude-plugin/plugin.json').toString('utf8'));
  assert.equal(manifest.name, 'struq');
  assert.equal(manifest.version, JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')).version);
  if (manifest.icon) assert.ok(files.has(posix.normalize(manifest.icon)), `icon ${manifest.icon} is not in plugin/`);
});

test('the MCP config connects by URL and carries no credentials', () => {
  const { mcpServers } = JSON.parse(files.get('.mcp.json').toString('utf8'));
  assert.ok(Object.keys(mcpServers).length > 0);
  for (const [name, server] of Object.entries(mcpServers)) {
    assert.deepEqual(Object.keys(server).sort(), ['type', 'url'], `${name}: only type and url`);
    assert.equal(server.type, 'http');
    assert.match(server.url, /^https:\/\/struq\.nl\//);
  }
});

test('the plugin text names no script of the full skill and no dash', () => {
  for (const [path, body] of files) {
    if (!isText(path)) continue;
    const text = body.toString('utf8');
    assert.doesNotMatch(text, /\.mjs\b|<skill-dir>/, `${path} points at a script`);
    assert.doesNotMatch(text, /[–—―]/, `${path} holds an em or en dash`);
  }
});

test('every relative link in the plugin Markdown resolves inside plugin/', () => {
  for (const [path, body] of files) {
    if (ext(path) !== '.md') continue;
    for (const [, target] of body.toString('utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
      const resolved = posix.normalize(posix.join(posix.dirname(path), target.split('#')[0]));
      assert.ok(files.has(resolved), `${path} links ${target}, which is not in plugin/`);
    }
  }
});

test('plugin/ is in step with the full skill', () => {
  assert.deepEqual(pluginDrift(), [], 'run node scripts/build-plugin.mjs');
});

test('the npm package leaves plugin/ out', () => {
  const { files: shipped } = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
  assert.ok(!shipped.some((f) => f === 'plugin' || f.startsWith('plugin/')), 'package.json files includes plugin/');
  assert.ok(existsSync(PLUGIN));
});
