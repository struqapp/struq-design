// Struq's one stop, held by the scripts instead of by advice. Nothing goes into a project before its treatment passes
// the plan check (film-check.mjs planCheck, the same rules as check.mjs --plan) and the user's reply to it is logged in
// STRUQ-LOG.md. blocks.mjs add and canon.mjs palette and type call these before they touch a file; blocks.mjs add also
// installs only what the storyboard names, in the site's language, and a page transition only once there are routes.
//
// A refusal is two lines: the reason, then exactly what to do next. The caller prints them and exits 1.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { planCheck, readTreatment, resolveBlock } from "./film-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CATALOG = JSON.parse(readFileSync(join(here, "..", "blocks", "catalog.json"), "utf8")).blocks;
const BY_SLUG = new Map(CATALOG.map((b) => [b.slug, b]));

const CHECK_CMD = `node "${join(here, "check.mjs")}" --plan`;
const LOG_CMD = `node "${join(here, "log.mjs")}"`;

/** The approval entry check.mjs asks for too: a Step 2 Approval heading with the user's words on a Reply: line. */
export function hasApproval(log) {
  const entry = String(log ?? "").match(/^## Step 2 Approval[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  return Boolean(entry && /^Reply:\s*["“‘'].+["”’']\s*$/m.test(entry[1]));
}

/** The page files under app/ (or src/app/): one per route. */
export function routeCount(root) {
  const app = ["app", join("src", "app")].map((d) => join(root, d)).find((d) => existsSync(d));
  if (!app) return 0;
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      if (name === "node_modules" || name.startsWith(".")) return [];
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : /^page\.(tsx|jsx|js)$/.test(name) ? [full] : [];
    });
  return walk(app).length;
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

/** null when STRUQ.md holds a plan that passes the plan check, else the refusal. */
function planRefusal(root) {
  const plan = read(join(root, "STRUQ.md"));
  const next = `Write the treatment in STRUQ.md and run ${CHECK_CMD} until PLAN: PASS, then run this again.`;
  if (!plan.trim()) return { reason: `No STRUQ.md in ${root}, so there is no treatment to build from.`, next };
  const { findings } = planCheck({ plan, catalog: CATALOG, routes: Math.max(1, routeCount(root)) });
  const failed = findings.filter((f) => f.severity === "fail");
  if (!failed.length) return null;
  return { reason: `The plan in STRUQ.md does not pass: ${failed.map((f) => `${f.id} (${f.detail.replace(/\.$/, "")})`).join("; ")}.`, next };
}

/** null when STRUQ-LOG.md carries the user's reply to the treatment, else the refusal. */
function approvalRefusal(root) {
  if (hasApproval(read(join(root, "STRUQ-LOG.md")))) return null;
  return {
    reason: "The treatment is not approved yet: STRUQ-LOG.md has no Step 2 Approval entry with the user's reply.",
    next: `Send the treatment to the user and stop; when they reply, log it with ${LOG_CMD} "Step 2 Approval" "Asked: ..." "Reply: \\"<their words>\\"" and run this again.`,
  };
}

/** The plan gate and the approval gate, in that order: null when both hold, else the first refusal. */
export function stopRefusal(root) {
  return planRefusal(root) ?? approvalRefusal(root);
}

const SLUG = /(?<![A-Za-z0-9-])([a-z0-9]+(?:-[a-z0-9]+)*)(?::([a-z0-9]+(?:-[a-z0-9]+)*))?(?![A-Za-z0-9-])/g;

/** Every catalogue block the storyboard names, read as the plan check reads a line: after the (tone) tag, and after footer:. */
export function namedBlocks(plan) {
  const treatment = readTreatment(plan);
  const named = [];
  (treatment.storyboard ?? []).forEach((text, at) => {
    const head = text.split("|")[0];
    const tag = /\(([^)]*)\)/.exec(head);
    const scene = `${at + 1} ${(tag ? head.slice(0, tag.index) : "").trim()}`.trim();
    const zones = [tag ? head.slice(tag.index + tag[0].length) : head];
    const footer = /\bfooter\s*:([^|]*)/i.exec(text);
    if (footer) zones.push(footer[1]);
    for (const zone of zones) {
      for (const m of zone.matchAll(SLUG)) if (BY_SLUG.has(m[1])) named.push({ slug: m[1], variant: m[2] ?? null, scene });
    }
  });
  if (treatment.centerpiece && BY_SLUG.has(treatment.centerpiece)) named.push({ slug: treatment.centerpiece, variant: null, scene: "Centerpiece" });
  return { language: treatment.language, named };
}

/** The variant a block goes in: the one asked for, else the storyboard's, else the one of the site's language. */
function chosenVariant(block, asked, named, language) {
  if (asked) return asked;
  const fromBoard = named.find((n) => n.slug === block.slug && n.variant)?.variant;
  if (fromBoard) return fromBoard;
  const own = block.variants.find((v) => resolveBlock(CATALOG, block.slug, v.id)?.home === language);
  return own?.id ?? null;
}

/**
 * The refusal for `blocks.mjs add`, or null when every requested block may go in. `requests` is [{ slug, variant }]
 * with known slugs. Every refused slug is listed with its reason; nothing is installed when one is refused.
 */
export function addRefusal(root, requests) {
  const stop = stopRefusal(root);
  if (stop) return stop;
  const { language, named } = namedBlocks(read(join(root, "STRUQ.md")));
  const routes = routeCount(root);
  const refused = [];
  const unnamed = [];
  const nexts = new Set();
  for (const { slug, variant } of requests) {
    const block = BY_SLUG.get(slug);
    const chosen = chosenVariant(block, variant, named, language);
    const film = resolveBlock(CATALOG, slug, chosen);
    const shown = chosen ? `${slug}:${chosen}` : slug;
    const reasons = [];
    const exempt = slug === "header-bar" || (slug === "menu-curtain" && film.home === language);
    if (!exempt && !named.some((n) => n.slug === slug)) {
      reasons.push("the storyboard does not name it");
      unnamed.push(slug);
    }
    if (film.home && film.home !== language) {
      reasons.push(`it belongs to the ${film.home} language and the site's Language is ${language}`);
      nexts.add(`Take the variant or block of the ${language} language (blocks.mjs list shows them).`);
    }
    if (block.kind === "page-transition" && routes < 2) {
      reasons.push(`a page transition needs two routes and app/ holds ${routes} page.tsx`);
      nexts.add("Leave the page transition out until app/ holds a second page.tsx.");
    }
    if (reasons.length) refused.push(`${shown} (${reasons.join("; ")})`);
  }
  if (!refused.length) return null;
  if (unnamed.length) {
    const asked = unnamed.join(" or ");
    nexts.add(`Install only what the storyboard names; if the user asked for ${asked}, put it on a scene line in STRUQ.md first and run ${CHECK_CMD}.`);
  }
  const shown = named.filter((n, at) => n.scene !== "Centerpiece" || !named.slice(0, at).some((m) => m.slug === n.slug));
  const board = shown.length ? shown.map((n) => `${n.scene}: ${n.variant ? `${n.slug}:${n.variant}` : n.slug}`).join(", ") : "nothing";
  return {
    reason: `Refused, nothing installed: ${refused.join("; ")}. The storyboard names ${board}.`,
    next: `${[...nexts].reverse().join(" ")} Then run add again.`,
  };
}

/** Print a refusal as its two lines and set exit code 1. */
export function refuse(what, refusal) {
  console.error(`FAIL ${what}: ${refusal.reason}`);
  console.error(`Next: ${refusal.next}`);
  process.exitCode = 1;
}
