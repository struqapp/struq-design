#!/usr/bin/env node
// Struq self-check: run it from the project root before you report a build as done.
//
//   node <skill-dir>/scripts/check.mjs
//   node <skill-dir>/scripts/check.mjs --dir ./my-site
//   node <skill-dir>/scripts/check.mjs --plan     the storyboard in STRUQ.md alone, before anything is built
//
// It needs no browser and no dependencies. It reads the source and the public folder and prints
// PASS, WARN or FAIL per check, in groups: images, AI tells, the motion floor, the hero, the film
// (film-check.mjs, the budgets Struq's MCP holds too), typography, plus the plan in STRUQ.md, the
// look look.mjs took of the rendered page (.struq/look.json, which must pass and be newer than the source), and the
// art director's asks (.struq/art-direction.md: each answered Built: or Refused:, never on the storyboard). Every
// FAIL names the file and line and the fix. Exit code 1 while any FAIL remains. Fix, run again, and
// only report done on "RESULT: PASS".
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { appendLog, syncChecklist } from "./log.mjs";
import { altFitsBrief, packSignalForBrief } from "./packs.mjs";
import { savedHand } from "./draw.mjs";
import { filmCheck, planCheck } from "./film-check.mjs";
import { checkHand } from "./hand.mjs";
import { hasApproval } from "./gate.mjs";
import { sourceStamp } from "./stamp.mjs";

const CANON = JSON.parse(readFileSync(new URL("../canon/canon.json", import.meta.url), "utf8"));
const CATALOG = JSON.parse(readFileSync(new URL("../blocks/catalog.json", import.meta.url), "utf8")).blocks;

const args = process.argv.slice(2);
const dirFlag = args.indexOf("--dir");
const root = resolve(dirFlag >= 0 ? args[dirFlag + 1] : process.cwd());

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "dist", "build", ".turbo", ".vercel", "public", ".claude", ".agents", ".cursor", "coverage"]);
const CODE_EXT = /\.(tsx|ts|jsx|js|mjs|css|mdx)$/;

function walk(dir, acc = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (CODE_EXT.test(name) && !/\.(config|d)\.(ts|js|mjs)$/.test(name) && !name.endsWith(".d.ts")) acc.push(full);
  }
  return acc;
}

const rel = (p) => relative(root, p).split(sep).join("/");

/* -------------------------------------------------------------- PLAN ONLY */
// --plan holds the storyboard in STRUQ.md to the film budgets before anything is built: no package.json, no build, no
// checklist and no log needed. The routes are the page files under app/ (at least one).
if (args.includes("--plan")) {
  const planText = existsSync(join(root, "STRUQ.md")) ? readFileSync(join(root, "STRUQ.md"), "utf8") : "";
  if (!planText) {
    console.log(`FAIL no-plan: No STRUQ.md in ${root}. Fix: write the treatment head and the Storyboard first (SKILL.md step 2).`);
    console.log("PLAN: FAIL");
    process.exit(1);
  }
  const appDir = ["app", "src/app"].map((d) => join(root, d)).find((d) => existsSync(d));
  const routes = Math.max(1, appDir ? walk(appDir).filter((p) => /(^|[\\/])page\.(tsx|jsx|js)$/.test(p)).length : 0);
  const { findings } = planCheck({ plan: planText, catalog: CATALOG, routes });
  // The plan holds to the site's hand (canon.mjs draw), checked by Struq's hand.mjs, the same rule the MCP runs.
  const hand = savedHand(root);
  if (hand) findings.push(...checkHand(planText, hand));
  else {
    findings.push({ severity: "warn", id: "no-draw", detail: "No hand dealt for this site", fix: "run canon.mjs draw and choose the Palette and Type from it" });
  }
  for (const f of findings) console.log(`${f.severity === "fail" ? "FAIL" : "WARN"} ${f.id}: ${f.detail.replace(/\.$/, "")}. Fix: ${f.fix}`);
  const failed = findings.some((f) => f.severity === "fail");
  console.log(`PLAN: ${failed ? "FAIL" : "PASS"}`);
  process.exit(failed ? 1 : 0);
}
// A shipped file is one the skill installs under components/struq/ at the same path as in its blocks/ copy (or the
// images module images.mjs writes); anything else there, a scene or section you added, counts as your own.
const SHIPPED = new URL("../blocks/", import.meta.url);
const isRecipe = (p) => {
  const r = rel(p);
  if (/(^|\/)lib\/struq-images\.ts$/.test(r)) return true;
  const m = r.match(/(?:^|\/)components\/struq\/(.+)$/);
  return Boolean(m && existsSync(new URL(m[1], SHIPPED)));
};
const files = walk(root)
  .filter((p) => !/^(scripts|test|tests|e2e)\//.test(rel(p)))
  .map((p) => ({ path: p, rel: rel(p), recipe: isRecipe(p), text: readFileSync(p, "utf8") }));
const own = files.filter((f) => !f.recipe);
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : "");

const results = [];
const add = (group, status, message, where = []) => results.push({ group, status, message, where });

/** Every non-comment line matching a pattern, as "file:line  snippet". */
function hits(pattern, { scope = files, exclude = null } = {}) {
  const out = [];
  for (const f of scope) {
    const lines = f.text.split(/\r?\n/);
    lines.forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("{/*")) return;
      if (pattern.test(line) && !(exclude && exclude.test(line))) {
        out.push(`${f.rel}:${i + 1}  ${t.slice(0, 120)}`);
      }
    });
  }
  return out;
}
const uses = (pattern) => own.some((f) => pattern.test(f.text));

function isImageFile(path) {
  try {
    const buf = readFileSync(path);
    if (buf.length < 8000) return false;
    const a = (s, e) => buf.subarray(s, e).toString("latin1");
    return (
      (a(0, 4) === "RIFF" && a(8, 12) === "WEBP") ||
      (buf[0] === 0xff && buf[1] === 0xd8) ||
      (buf[0] === 0x89 && a(1, 4) === "PNG") ||
      a(4, 12) === "ftypavif"
    );
  } catch {
    return false;
  }
}

if (!existsSync(join(root, "package.json"))) {
  console.error(`FAIL no package.json in ${root}. Run from the project root or pass --dir.`);
  process.exit(2);
}
const pkg = JSON.parse(read("package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
// A step the log already holds is ticked before the plan is read (log.mjs, syncChecklist).
syncChecklist(root);
const plan = read("STRUQ.md");

/** "file:line" for an index into a file's text. */
const lineOf = (f, index) => `${f.rel}:${f.text.slice(0, index).split("\n").length}`;

/**
 * The names a site shows: the wordmark props of its header, preloader, hero and footer blocks, a data-wordmark element,
 * the name and title in lib/site.ts or a file like it, and the page title. Each with where it stands.
 */
const SHOWN_NAMES = (() => {
  const shown = [];
  const seen = (name, where) => name.trim() && shown.push({ name: name.trim(), where });
  for (const f of own.filter((x) => !x.rel.endsWith(".css"))) {
    for (const m of f.text.matchAll(/<(?:Header|MenuCurtain|Preloader|Footer|Wordmark|Hero|PageTransition|SiteHeader)\w*\b[^>]*?\bname=\{?\s*["'`]([^"'`]+)["'`]/g)) seen(m[1], lineOf(f, m.index));
    for (const m of f.text.matchAll(/<\w+\b[^>]*\bdata-wordmark\b[^>]*>([^<{]+)</g)) seen(m[1], lineOf(f, m.index));
    if (/(?:^|\/)(?:lib|src\/lib|config|src\/config|data|app)\/(?:site|brand|identity|config|constants|metadata)\.(?:ts|tsx|js|mjs)$/.test(f.rel)) {
      for (const m of f.text.matchAll(/\b(?:name|siteName|brandName|title)\s*:\s*["'`]([^"'`]+)["'`]/g)) seen(m[1], lineOf(f, m.index));
    }
    if (/(?:^|\/)app\/layout\.(?:tsx|jsx|ts|js)$/.test(f.rel)) {
      for (const m of f.text.matchAll(/\b(?:title|default)\s*:\s*["'`]([^"'`]+)["'`]/g)) seen(m[1], lineOf(f, m.index));
    }
  }
  return shown;
})();

/** The plan's Brief line. A name it gives stands in it capitalised, never as its first word. */
const BRIEF = plan.match(/^Brief:\s*(.+)$/m)?.[1] ?? "";
function namedInBrief(name) {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu");
  return [...BRIEF.matchAll(re)].some((m) => m.index > 0);
}

/* ------------------------------------------------------------------ IMAGES */
{
  const G = "IMAGES";
  const libFile = ["lib/struq-images.ts", "src/lib/struq-images.ts"].find((p) => existsSync(join(root, p)));
  const pub = join(root, "public");
  const listPublic = (dir, acc = []) => {
    if (!existsSync(dir)) return acc;
    for (const n of readdirSync(dir)) {
      const full = join(dir, n);
      if (statSync(full).isDirectory()) listPublic(full, acc);
      else if (/\.(webp|jpe?g|png|avif|svg)$/i.test(n)) acc.push(full);
    }
    return acc;
  };
  const all = listPublic(pub);
  const realPhotos = all.filter((p) => !p.endsWith(".svg") && isImageFile(p));
  const brokenPhotos = all.filter((p) => !p.endsWith(".svg") && !isImageFile(p));

  const mod = libFile ? read(libFile) : "";
  const imageFit = mod.match(/imageFit[^=]*=\s*"(full|partial|none)"/)?.[1] ?? "full";
  // The photos per slot in the pack module, for references that point past what was downloaded.
  const slotCount = Object.fromEntries(
    ["hero", "band", "card", "column", "detail", "backdrop"].map((s) => [s, (mod.match(new RegExp(`\\b${s}:\\s*\\[([^\\]]*)\\]`))?.[1].match(/src:/g) ?? []).length]),
  );
  if (libFile) {
    const srcs = [...mod.matchAll(/src: "([^"]+)"/g)].map((m) => m[1]);
    const missing = srcs.filter((s) => !existsSync(join(pub, s)));
    const plates = srcs.filter((s) => s.endsWith(".svg"));
    const pack = mod.match(/imagePack = "([^"]+)"/)?.[1] ?? "?";
    if (imageFit === "none" && !srcs.length) add(G, "PASS", `No photo of pack "${pack}" fits this brief (imageFit none): the opener carries the first screen, and the approval stop asks for photos`);
    else if (missing.length) add(G, "FAIL", `${missing.length} image(s) in ${libFile} are not on disk. Run images.mjs ${pack} again.`, missing);
    else if (plates.length === srcs.length) add(G, "WARN", `Struq was unreachable: all ${srcs.length} images are fallback plates. Run images.mjs ${pack} again when online.`);
    else if (plates.length) add(G, "WARN", `${plates.length} fallback plate(s) among the pack images. Run images.mjs ${pack} again when online.`, plates);
    else add(G, "PASS", `${srcs.length} beeldbank images from pack "${pack}", each a verified image file`);
    // An off-topic photo is worse than no photo: a pack the brief does not point at must show
    // something the brief is about in at least one alt. A module images.mjs --brief already fitted is trusted: its
    // Dutch alts never match an English brief word for word, which made this a false fail (proof run 2026-11-14).
    const brief = plan.match(/^Brief:\s*(.+)$/m)?.[1];
    const fitted = /Fitted to the brief/.test(mod);
    if (brief && srcs.length && !fitted && packSignalForBrief(brief) !== pack) {
      const alts = [...mod.matchAll(/alt: "([^"]*)"/g)].map((m) => m[1]);
      if (!alts.some((alt) => altFitsBrief(alt, brief))) {
        add(G, "FAIL", `Off-topic photos: none of the "${pack}" photos shows anything the brief is about. Run images.mjs --brief "<the brief>" (it leaves them out) and let the opener carry the first screen.`, alts.slice(0, 4));
      }
    }
  } else if (realPhotos.length >= 3) {
    add(G, "PASS", `${realPhotos.length} image files of the project's own in public/`);
  } else {
    add(G, "FAIL", "No images. Run: node <skill-dir>/scripts/images.mjs --brief \"<the brief>\" (the pack table is in SKILL.md). The images are free and CC0: no permission needed.");
  }
  if (brokenPhotos.length) add(G, "FAIL", "These image files are not real images (an error page saved as .webp?). Delete them and run images.mjs again.", brokenPhotos.map(rel));

  // A file whose size differs from the one images.mjs recorded is not the photo its alt and caption
  // describe: a run of another pack, or a hand copy, left it under the same name.
  const manifestFile = join(pub, "images", "struq-pack.json");
  if (existsSync(manifestFile)) {
    let recorded = [];
    try {
      recorded = JSON.parse(readFileSync(manifestFile, "utf8")).images ?? [];
    } catch {
      add(G, "WARN", "public/images/struq-pack.json is not readable JSON. Run images.mjs again.");
    }
    const mismatched = recorded
      .filter((m) => typeof m.bytes === "number" && existsSync(join(root, m.file)) && statSync(join(root, m.file)).size !== m.bytes)
      .map((m) => m.file);
    if (mismatched.length) add(G, "FAIL", "These photos are not the ones their alt and caption describe (left by an earlier pack or copied by hand). Run images.mjs again with the pack you chose.", mismatched);
  }

  // Each pack reference (images.card[2], images.card.slice(0, 5)) or own image tag counts once.
  const used = own.reduce((n, f) => n + (f.text.match(/images\.(hero|band|card|column|detail|backdrop)\b|<img\b|src=["'{`]\/images\//g) ?? []).length, 0);
  const total = Object.values(slotCount).reduce((a, b) => a + b, 0);
  const floor = libFile ? Math.min(4, total) : 4;
  if (libFile && imageFit !== "full" && total === 0) add(G, "PASS", "No image placements needed: no pack photo fits");
  else if (used >= floor) add(G, "PASS", `${used} image placements in the page code`);
  // A floor, not a law: a quiet film may hold fewer photos, so a short count asks for a look rather than blocking.
  else add(G, "WARN", `Only ${used} image placement(s). A Struq site carries a hero image and at least three more: use <MediaFrame image={images.card[0]} />.`);
  // References past what the pack holds render as empty swatches (an inline manifesto image, a card).
  if (libFile) {
    const past = [];
    for (const f of own) {
      for (const m of f.text.matchAll(/images\.(hero|band|card|column|detail|backdrop)\[(\d+)\]/g)) {
        if (Number(m[2]) >= slotCount[m[1]]) past.push(`${f.rel}  images.${m[1]}[${m[2]}] (the pack holds ${slotCount[m[1]]})`);
      }
    }
    if (past.length) add(G, "FAIL", "Image references past the pack: they render as empty swatches. Use only the photos lib/struq-images.ts lists.", past);
  }
  // Inline manifesto photos are a word's size: a texture (detail, backdrop) reads as a grey swatch.
  const textures = [];
  for (const f of own) {
    for (const m of f.text.matchAll(/<ManifestoScrub\b[\s\S]*?\/>/g)) {
      if (/images\.(detail|backdrop)\[/.test(m[0])) textures.push(`${f.rel}:${f.text.slice(0, m.index).split("\n").length}`);
    }
  }
  if (textures.length) add(G, "FAIL", "Inline manifesto photo is a texture: at word size a detail or backdrop photo reads as a grey swatch. Use photos with a subject (card, column, hero).", textures);

  const localSrc = [];
  for (const f of own) {
    for (const m of f.text.matchAll(/(?:src=|src:\s*)["'`](\/[^"'`?#]+\.(?:webp|jpe?g|png|avif|svg|gif))["'`]/g)) {
      if (!existsSync(join(pub, m[1]))) localSrc.push(`${f.rel}  ${m[1]}`);
    }
  }
  if (localSrc.length) add(G, "FAIL", "Image paths that point at no file in public/:", localSrc);

  const placeholders = hits(
    /\b(Image|Media|Photo|Img)?Placeholder\b|Planned image|placehold\.co|via\.placeholder|picsum\.photos|source\.unsplash|nog te fotograferen|te maken:|foto volgt|beeld volgt|to be shot|image coming soon|photo coming soon/i,
    { scope: own, exclude: /placeholder=["'{]/ },
  );
  const emptyFrames = hits(/<(div|figure|span)\b[^>]*(aspect-|aspectRatio)[^>]*(\/>|>\s*<\/(div|figure|span)>)/, { scope: own });
  // Both domains: struq.app is home, and struq.nl still serves the media for older installs.
  const hotlinks = hits(/https?:\/\/(www\.)?struq\.(app|nl)\/media\//, { scope: own });
  if (placeholders.length || emptyFrames.length) {
    add(G, "FAIL", "Placeholder or empty frames. A Struq site never ships an empty frame: put a MediaFrame with a pack image in each.", [...placeholders, ...emptyFrames]);
  } else add(G, "PASS", "No placeholder or empty image frames");
  if (hotlinks.length) add(G, "FAIL", "Hotlinked Struq images: download them with images.mjs and use the local /images/ path.", hotlinks);

  const credit = uses(/imageCredit|struq\.app\/photos|struq\.nl\/beeldbank/);
  if (libFile && !credit) add(G, "WARN", "No image credit. Put imageCredit ('Photos: Struq', 'Beeld: Struq' on a Dutch site) in the footer as one quiet text-small link.");
}

/* ------------------------------------------------------------------- TELLS */
// The combined tell list: Struq's tells (StruqVisual lib/consistentie/tells.ts), the deck-slop-audit
// patterns and Roy's own rules, as one list. references/tells.md has the why and the fix for
// each; this is its executable form. FAIL blocks done; WARN asks for a look.
{
  const G = "TELLS";
  const tell = (name, pattern, fix, opts = {}) => {
    // Your own files only: the blocks under components/struq/ passed Struq's gate as they are.
    const found = hits(pattern, { scope: own, ...opts });
    if (found.length) add(G, opts.warn ? "WARN" : "FAIL", `${name}: ${fix}`, found);
    else if (!opts.quietPass) add(G, "PASS", `No ${name.toLowerCase()}`);
  };
  const ownOnly = { scope: own };

  // Copy
  tell("Notes to the client on the page",
    /volg(?:t|en) zodra|zodra (?:de studio|de klant|je|jullie|we)\b[^"'<>]{0,40}(?:aanlever|doorgeef|doorgeven|binnen)|nog aan te leveren|wordt nog aangevuld|(?:telefoon|e-?mail|adres|reserveren|gegevens|openingstijden|data|datum|prijzen)[^.<>"'{}]{0,30}\bvolg(?:t|en)\b|\bvolg(?:t|en) (?:nog|later|binnenkort)\b|lorem ipsum|\bcoming soon\b|to be (?:confirmed|announced)|will be announced|details to (?:follow|come)|\bto follow\)|\bTB[AC]\b|\byour (?:name|company|logo|photo|text) here\b|\bYour Name\b|\bexample\.(?:com|org|net)\b|\b(?:John|Jane) Doe\b|\[(?:naam|adres|telefoon|e-?mail|name|phone|address)\]/i,
    "a line written to the client or the developer, or a stand-in (Your Name, example.com, to be announced), is not copy. A missing fact leaves no line on the page: drop the sentence, the field or the button, and list it under Assumptions: in STRUQ.md.");

  // The visible copy of your own files: string literals and JSX text, line by line, comments left out. Class lists,
  // paths and identifiers hold no sentences, so the honesty phrases below match the words a reader sees.
  const copy = [];
  for (const f of own.filter((x) => !x.rel.endsWith(".css"))) {
    f.text.split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("{/*")) return;
      const segs = [];
      for (const m of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) segs.push(m[2]);
      for (const m of line.matchAll(/>([^<>{}]+)(?=<|$)/g)) segs.push(m[1]);
      // A line of JSX text between an opening and a closing tag on lines of their own.
      if (/^[^<>{}=;()[\]]+$/.test(t)) segs.push(t);
      const words = segs.map((s) => s.trim()).filter((s) => /[\p{L}\p{N}]/u.test(s));
      if (words.length) copy.push({ where: `${f.rel}:${i + 1}`, line: t, segs: words });
    });
  }
  const copyHits = (re) => copy.filter((c) => c.segs.some((s) => re.test(s))).map((c) => `${c.where}  ${c.line.slice(0, 120)}`);

  // Copy that promises what is not there yet. Bare "not yet" and "nog niet" are common in a factual sentence, so they
  // count only with an availability word after them, or closing the line.
  const soon = copyHits(
    /\bcoming soon\b|\b(?:is|are|we're|we are|now|soon) launching\b|\blaunching (?:soon|in|on|this|next|later|early|late|spring|summer|autumn|fall|winter|\d)|\blaunching[.!]?$|\bon (?:its|their) way\b|\bsoon available\b|\bavailable soon\b|\bnot yet (?:available|live|open|ready|online|launched|released|public|bookable|for sale|on sale|in stock)\b|\bnot yet[.!]?$|\bbinnenkort\b|\bvolg(?:t|en) snel\b|\bnog niet (?:beschikbaar|live|open|online|klaar|te koop|verkrijgbaar|bekend|te boeken|te reserveren|gepubliceerd|af)\b|\bnog niet[.!]?$|\bin de maak\b/i,
  );
  if (soon.length) add(G, "FAIL", "Coming-soon copy: a line that promises what is not there yet (coming soon, launching, on its way, binnenkort, volgt snel, nog niet beschikbaar, in de maak) is not copy. The site shows what exists today: drop the line, and list what is missing under Assumptions: in STRUQ.md.", soon);
  else add(G, "PASS", "No coming-soon copy");

  // An invitation needs a door: an address, a phone number, an email, a mailto or tel link, or an external booking or
  // shop link somewhere on the page. Two kinds are held to it: the "come by" wording (tonight, see you, kom langs), and
  // the imperative call in the trade's own words (Schuif aan, Pick up a mug, Book a class, Reserveer, Shop the collection)
  // in a heading, a button, a link or a closing line. A statement that merely mentions the trade is no call: the verb
  // opens a short line, and the line is the call.
  const COME_BY = /\btonight\b|\bsee you\b|\bcome by\b|\bdrop in\b|\bcall us\b|\bvanavond\b|\btot straks\b|\bkom langs\b|\bloop (?:even )?binnen\b|\bbel ons\b|\bwaarvoor u ons belt\b/i;
  const END = "(?:\\s|[.!,]|$)";
  const CALL = new RegExp(
    `^[\\s"'(\\[\\u2018\\u201C]*(?:${[
      // English
      `visit${END}`, "come\\s+(?:and|in|eat|taste|try|see|join|sit|visit|hungry|by|over|along)\\b", "(?:eat|dine|taste)\\s+(?:with|at|here|in|the|our|your|something|a|some)\\b",
      "book\\s+(?:a|an|your|the|now|online|tickets?|ahead|with|today)\\b", `buy${END}`, "order\\s+(?:a|an|your|the|now|online|ahead|here|today|one|it)\\b",
      "shop\\s+(?:the|our|all|now|online|this|new|with)\\b", `join${END}`, "try\\s+(?:a|an|one|it|the|our|us|this|some|your)\\b", "sit\\s+(?:down|with|at|in)\\b",
      "pick\\s+up\\b", "roll\\s+out\\b", "grab\\s+(?:a|an|your|the|some|one)\\b", "reserve\\s+(?:a|an|your|the|now|online|seats?|tickets?|today)\\b",
      "save\\s+(?:the\\s+date|your\\s+(?:seat|spot|place))\\b", "take\\s+a\\s+(?:seat|class|lesson)\\b", "pull\\s+up\\s+a\\s+chair\\b", "step\\s+(?:in|inside|up)\\b",
      "stop\\s+by\\b", "walk\\s+in\\b", "get\\s+(?:your\\s+|a\\s+|an\\s+)?(?:tickets?|quote|table|seat|spot)\\b", "enrol{1,2}\\s+(?:now|today|in|for)\\b", "find\\s+us\\b",
      // Dutch
      "kom\\s+(?:proeven|eten|binnen|langs|kijken|naar|bij|eens|gerust|erbij|meedoen|kennismaken|mee|zitten)\\b", "schuif\\s+(?:even\\s+|gerust\\s+|gezellig\\s+)?aan\\b",
      `bestel${END}`, `reserveer${END}`, "boek\\s+(?:een|je|jouw|uw|nu|online|tickets?|alvast|plek|plaats)\\b", `koop${END}`,
      "neem\\s+(?:een\\s+)?(?:plaats|zitplaats|stoel)\\b", "ga\\s+zitten\\b", "proef\\s+(?:het|de|een|ons|onze|wat|zelf|mee)\\b", "probeer\\s+(?:een|het|de|ons|onze|eens|zelf|wat)\\b",
      "doe\\s+mee\\b", "sluit\\s+(?:je|u)\\s+aan\\b", "meld\\s+(?:je|u)\\s+aan\\b", "schrijf\\s+(?:je|u)\\s+in\\b", "stap\\s+(?:gerust\\s+)?binnen\\b",
      "loop\\s+(?:gerust\\s+|even\\s+)?(?:naar\\s+)?binnen\\b", "pak\\s+(?:een|je|uw)\\b", "bezoek\\s+(?:ons|onze|de)\\b", "vind\\s+ons\\b", "eet\\s+(?:mee|met|bij)\\b",
    ].join("|")})`,
    "i",
  );
  const isCall = (s) => {
    const words = s.trim().split(/\s+/);
    if (words.length > 8 || s.length > 80 || !CALL.test(s)) return false;
    // A lone lowercase word is a class name or an identifier, not a button.
    return words.length > 1 || /^[^\p{L}]*\p{Lu}/u.test(s);
  };
  const calls = copy.filter((c) => {
    // A class list is no copy: the strings of className and class attributes are left out.
    const classes = new Set([...c.line.matchAll(/\b(?:className|class)\s*=\s*\{?\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2].trim()));
    const segs = c.segs.filter((s) => !classes.has(s));
    const wholeLine = segs.length > 1 && segs.length <= 4 && segs.every((s) => s.split(/\s+/).length <= 5) ? [segs.join(" ")] : [];
    return [...segs, ...wholeLine].some(isCall);
  }).map((c) => `${c.where}  ${c.line.slice(0, 120)}`);
  const invites = [...new Set([...copyHits(COME_BY), ...calls])];
  if (invites.length) {
    const DOORS = [
      /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/,
      /(?:\+|\b00)\d{1,3}[\s.-]?\(?\d[\d\s.()-]{6,}\d|\b0\d{1,3}[\s.-]?\d{3}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4})?\b/,
      /\b\p{Lu}[\p{L}'-]*(?:straat|weg|laan|plein|gracht|kade|dijk|singel|markt|steeg|dreef|hof|pad|haven|wal|baan|burgwal|straße|strasse|gasse|platz)\s+\d+[a-z]?\b/u,
      /\b[1-9]\d{3}\s?[A-Z]{2}\b/,
      /\b\d{1,5}\s+(?:\p{Lu}[\p{L}'-]+\s+){1,3}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Way|Square|Place|Boulevard|Drive|Court|Row|Terrace)\b/u,
      /\b[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}\b/,
    ];
    // An external link is a door only to a booking or shop: not Struq's own credit, a font host, or a social profile.
    const EXTERNAL = /\b(?:href|action)\s*[:=]\s*\{?\s*["'`]https?:\/\/(?!(?:www\.)?(?:struq\.(?:app|nl)|localhost|schema\.org|w3\.org|fonts\.(?:googleapis|gstatic)\.com|api\.fontshare\.com|(?:instagram|facebook|twitter|x|linkedin|tiktok|youtube|pinterest|github|behance|dribbble)\.com)\b)[^"'`\s]+/i;
    const door = copy.some((c) => c.segs.some((s) => DOORS.some((re) => re.test(s)))) || own.some((f) => /\b(?:tel|mailto):[^"'`\s{}]{4,}/.test(f.text) || EXTERNAL.test(f.text));
    if (door) add(G, "PASS", "The invitations on the page have a door: an address, a phone number, an email or a booking or shop link is on it");
    else add(G, "FAIL", "Invitation without a door: the copy asks the reader to act (come by, call, eat, book, buy, order, join, sit down, pick up: tonight, kom langs, Schuif aan, Pick up a mug, Reserveer, Shop the collection), but the page shows no address, phone number, mailto or tel link, or external booking or shop link. With no door the site ends on the idea, never on an invitation: drop the line, the button or the link, and list the door the client must add under Assumptions: in STRUQ.md.", invites);
  } else add(G, "PASS", "No invitation without a door");

  // A stand-in name: the trade word shown as the business's name (a yoga studio called "Yoga"). The names a site shows are
  // the wordmark props of its header, preloader, hero and footer blocks, a data-wordmark element, the name and title in
  // lib/site.ts or a file like it, and the page title. A name that is only the trade or a generic word for the business
  // is a stand-in, unless the Brief line itself gives that name (capitalised, and not as the first word of the line).
  {
    const GENERIC = new Set(
      "yoga pilates bakery bakkerij bakker studio restaurant resto cafe café koffiebar bar pub brasserie plumbing plumber loodgieter loodgieters loodgietersbedrijf ceramics ceramic pottery keramiek aardewerk conference conferentie congres fashion label atelier salon kapper barbershop gym fitness dentist tandarts clinic praktijk shop store winkel webshop boutique gallery galerie agency bureau consultancy workshop hotel hostel guesthouse garden tuin hovenier cleaning schoonmaak electrician elektricien painter schilder builder aannemer lawyer advocaat accountant photography fotografie photographer fotograaf design ontwerp school academy academie club app software invoicing florist bloemist butcher slager".split(" "),
    );
    const STOP = new Set("the a an de het een my mijn our onze your jouw and en of van voor for by in at".split(" "));
    const tokens = (name) => name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const isStandIn = (name) => {
      const t = tokens(name);
      return t.length > 0 && t.every((w) => GENERIC.has(w) || STOP.has(w)) && t.some((w) => GENERIC.has(w));
    };
    const shown = SHOWN_NAMES;
    const named = namedInBrief;
    const standIns = shown.filter((s) => isStandIn(s.name) && !named(s.name));
    if (standIns.length) {
      const names = [...new Set(standIns.map((s) => `"${s.name}"`))].join(", ");
      add(G, "FAIL", `Stand-in name: the site is called ${names}, which is the trade or a generic word, not the client's name, and the Brief line does not give it. With no name in the brief the header shows no wordmark and the opener and the close carry no name; ask for the name at the one stop, and list it under Assumptions: in STRUQ.md.`, standIns.map((s) => `${s.where}  "${s.name}"`));
    } else add(G, "PASS", "No stand-in name: the name the site shows is not a bare trade word");
  }

  // A link to an anchor nothing on the page carries: a button that goes nowhere.
  {
    const ids = new Set(files.flatMap((f) => [...f.text.matchAll(/\bid=\{?\s*["'`]([\w-]+)["'`]/g)].map((m) => m[1])));
    const dead = [];
    for (const f of own) {
      for (const m of f.text.matchAll(/\b(?:href|menuHref)\s*[:=]\s*\{?\s*["'`]#([\w-]+)["'`]/g)) {
        if (!ids.has(m[1])) dead.push(`${f.rel}  #${m[1]}`);
      }
    }
    if (dead.length) add(G, "FAIL", "Links to an anchor nothing on the page carries: give the section that id, or drop the link.", [...new Set(dead)]);
    else add(G, "PASS", "Every in-page link lands on an id");
  }

  // Type and labels
  tell("Eyebrows and uppercase labels", /\buppercase\b|text-transform:\s*uppercase|\b(eyebrow|kicker|overline)\b/i,
    "small uppercase labels above headings, uppercase marquees and tracked caps are AI tells. Delete the label; the heading, a hairline rule or a jump in scale does the wayfinding. A deliberate all-caps wordmark passes when its element carries data-wordmark.",
    { exclude: /data-wordmark|<figcaption\b|data-caption/ });
  tell("Monospace as a design face", /font-mono|monospace|_Mono\b|\bMono\(|JetBrains|Fira_Code|Space_Mono/,
    "mono is for literal code only. Labels, stats and dates use the text face with tabular-nums.", { exclude: /<(code|pre)\b/ });
  tell("Default faces", /(next\/font|font-family|--font-|--face-|import\s*\{)[^\n]*\b(Inter|Roboto|Arial|Helvetica|Open[ _]Sans|Poppins|Montserrat|Lato|Geist|Space[ _]Grotesk)\b/,
    "set a canon or SKILL.md pairing with canon.mjs type (Inter, Roboto, Arial, Geist and friends read as nobody chose).");
  tell("Heavy display", /(<h1|<h2|font-display|text-display|text-h2|SplitHeadline)[^\n]*font-(bold|extrabold|black|semibold)|font-(bold|extrabold|black|semibold)[^\n]*(<h1|<h2|font-display|text-display|text-h2)/,
    "display runs light (300 to 400); hierarchy from scale, not weight.");
  // A display heading cut off by a clipping box (overflow hidden on it or on its direct parent).
  {
    const DISPLAY = /font-display|text-display|text-h2|text-\[\d+(?:\.\d+)?vw\]/;
    const clipped = [];
    for (const f of own.filter((x) => !x.rel.endsWith(".css"))) {
      for (const m of f.text.matchAll(/<(h1|h2)\b[^>]*>/g)) {
        const tag = m[0];
        const before = f.text.slice(0, m.index);
        const parent = before.slice(before.lastIndexOf("<")).replace(/\s+$/, "");
        const parentClips = /overflow-hidden/.test(parent) && parent.endsWith(">") && !parent.startsWith("</");
        if (DISPLAY.test(tag) && (/overflow-hidden/.test(tag) || parentClips)) {
          clipped.push(`${f.rel}:${before.split("\n").length}  ${tag.slice(0, 100)}`);
        }
      }
    }
    // A long display word in a narrow column runs out of it, under the image beside it.
    for (const f of own.filter((x) => !x.rel.endsWith(".css"))) {
      for (const m of f.text.matchAll(/<(h1|h2|SplitHeadline)\b([^>]*)>([^<]*)</g)) {
        if (!DISPLAY.test(m[2])) continue;
        const before = f.text.slice(Math.max(0, m.index - 400), m.index);
        const span = [...before.matchAll(/col-span-(\d+)/g)].pop();
        const longest = Math.max(0, ...m[3].split(/\s+/).map((w) => w.length));
        const after = f.text.slice(m.index, m.index + 700);
        const lifted = /\bz-(10|20|30)\b[^>]*>[\s\S]{0,200}<(MediaFrame|Image|img)\b/.test(after);
        if (span && Number(span[1]) <= 4 && (longest >= 11 || lifted)) {
          clipped.push(`${f.rel}:${f.text.slice(0, m.index).split("\n").length}  "${m[3].trim().slice(0, 40)}" in col-span-${span[1]}${lifted ? " beside a lifted image" : ""}`);
        }
      }
    }
    if (clipped.length) add(G, "FAIL", "Display heading clipped: a large heading sits in an overflow-hidden box (or on top of an image box) and loses its letters. Give it its own grid cell beside the image, never under or behind it.", clipped);

    // A heading of your own that cuts its descenders: overflow hidden or clip on the heading itself, or on the element
    // that wraps it directly when that box is held to the line (a fixed height or leading-none). A tall wrapper such as
    // a full-screen hero (h-screen, h-full, h-[100vh]) leaves the heading room and is not counted. Headings the clipped
    // check above already names are left to it, so one heading is reported once.
    const CLIPS = /\boverflow-(?:hidden|clip)\b|overflow:\s*["']?(?:hidden|clip)\b/;
    const HELD = /(?:^|[\s"'`{])(?:h-(?:\d+(?:\.\d+)?|px)|h-\[(?![^\]]*(?:vh|vw|%))[^\]]+\]|leading-none)(?=[\s"'`}]|$)/;
    const TIGHT = /\bleading-\[0?\.[0-8]\d*\]/;
    const named = new Set(clipped.map((c) => c.split("  ")[0]));
    const cut = [];
    const tight = [];
    for (const f of own.filter((x) => !x.rel.endsWith(".css"))) {
      for (const m of f.text.matchAll(/<(h[1-6]|SplitHeadline)\b[^>]*>/g)) {
        const tag = m[0];
        const before = f.text.slice(0, m.index);
        const where = `${f.rel}:${before.split("\n").length}`;
        const open = before.slice(before.lastIndexOf("<")).replace(/\s+$/, "");
        const wrapper = /^<[A-Za-z]/.test(open) && open.endsWith(">") && !open.endsWith("/>") ? open : "";
        const cuts = CLIPS.test(tag) || (wrapper && CLIPS.test(wrapper) && HELD.test(wrapper));
        if (cuts && !named.has(where)) cut.push(`${where}  ${(CLIPS.test(tag) ? tag : `${wrapper} ${tag}`).replace(/\s+/g, " ").slice(0, 110)}`);
        if (TIGHT.test(tag)) tight.push(`${where}  ${tag.match(TIGHT)[0]}`);
      }
    }
    if (cut.length) add(G, "FAIL", "Heading that cuts descenders: overflow-hidden or overflow-clip on a heading of your own (or on a box held to its line by a fixed height or leading-none) cuts g, j, p and y. Drop the clip, and set big type with SplitHeadline or the .struq-line-mask class, whose mask leaves room under the baseline.", cut);
    if (tight.length) add(G, "WARN", "Heading leading under 0.9: descenders of one line run into the next line's capitals. Keep a leading of 1 in a serif, 0.95 in a sans, and look at a line with a g and a j.", tight);
  }
  tell("Numbered sections", />\s*0[1-9]\s*[<./]|['"`]0[1-9]['"`]|`0\$\{/,
    "01, 02, 03 stamped on sections or rows is a tell; keep at most one deliberate oversized numeral.", ownOnly);
  tell("Stat rows", />\s*\d{1,4}\s*[+%]\s*</,
    "a banner of big numbers (20+, 51+, 99%) is a template tell, and usually invented. A real figure from the brief goes inside a sentence.", ownOnly);
  tell("Raw text sizes", /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/, "use the role tokens: text-display, text-h2, text-h3, text-lead, text-body, text-small.", { ...ownOnly, warn: true, quietPass: true });
  tell("Breakpoint size ladders", /text-\w+\s+md:text-\w+\s+lg:text-\w+|p[xy]-\d+\s+md:p[xy]-\d+\s+lg:p[xy]-\d+/, "one fluid root-rem knob; breakpoints change layout, never size.", { ...ownOnly, warn: true, quietPass: true });

  // Colour and surface
  tell("Gradients", /bg-gradient-|bg-linear-|bg-radial|bg-conic|(linear|radial|conic)-gradient\(|\b(from|via|to)-(?!transparent\b)[a-z]+-\d{1,3}\b/,
    "flat surface steps (bg-surface-1, bg-surface-2) and a hairline; never a gradient.", { exclude: /mask/i });
  tell("Gradient text", /bg-clip-text|background-clip:\s*text/, "headlines are ink; hierarchy comes from scale.");
  tell("Tinted translucent fills and glass", /backdrop-blur|backdrop-filter|\bbg-(accent|white|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|surface-\d)(-\d+)?\/\d+/,
    "an opaque surface step. A flat black scrim over a photo is the only translucent fill.");
  tell("Status badges", /\bbg-(green|red|blue|yellow|emerald|amber|lime|sky)-(50|100|200)\b/, "no pastel status chips; say it in the copy.");
  tell("Pills", /rounded-full[^"'`]*\bpx-|\bpx-[^"'`]*rounded-full/, "buttons and labels take the site radius (0 to 4px), never a pill.");
  tell("Live dots", /animate-(ping|pulse)/, "no pulsing dot, above all not in a pill.");
  tell("Blue and purple utilities", /\b(text|bg|border|fill|stroke|ring|outline|decoration|shadow|accent)-(blue|indigo|violet|purple|fuchsia|sky)-\d/,
    "the palette tokens carry every colour; blue and purple only when the brand is that, declared in STRUQ.md.");
  tell("Glow", /shadow-\[0_0_|drop-shadow-\[0_0_|(box|text)-shadow:\s*0(px)?\s+0(px)?\s+\d+px|\bblur-(2xl|3xl)\b/, "no coloured light behind a card or a word; elevation is a surface step.");
  tell("Drop-shadow elevation", /\bshadow-(md|lg|xl|2xl)\b/, "elevation is a tonal surface step plus a hairline.");
  tell("Side-stripe borders", /\bborder-[lr]-([2-9]|\[[2-9])/, "no coloured stripe down a card edge; a hairline or nothing.");

  // Layout and motion
  tell("Identical card grids", /grid-cols-3\b/, "three equal cards in a row read as a template; asymmetric 5/7 splits or hairline rows.", { ...ownOnly, warn: true, quietPass: true });
  tell("Uniform section padding", /\bpy-(16|24)\b/, "padding varies by role (dense 6 to 8rem, breathers 12 to 20rem).", { ...ownOnly, warn: true, quietPass: true });
  tell("Opacity-only entrances", /initial=\{\{\s*opacity:\s*0\s*\}\}|whileInView=\{\{\s*opacity:[^,}]*\}\}/, "every entrance moves AND fades: <Reveal>, or y with autoAlpha.");
  tell("Uniform hovers", /hover:scale-1\d\d\b|transition-all\b/, "one designed hover per element type; never scale-105 plus transition-all on everything.", { ...ownOnly, warn: true, quietPass: true });
  tell("Single-layer parallax", /background-attachment:\s*fixed|\bbg-fixed\b/, "depth needs relative rates: MediaFrame parallax inside its frame.");
  tell("anticipatePin with smooth scroll", /anticipatePin/, "remove it; scrub: 1. With Lenis it jerks the pin on engage.");

  // Icons and content
  tell("Cliche icons and emoji", /<(Sparkles|Rocket|Zap|Lightbulb|Wand|Flame)\b|\b(Sparkles|Rocket|Zap)Icon\b|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, "no emoji, no sparkle, rocket, lightning, bulb, wand or flame icons.");
  tell("Filler content", /Lorem ipsum|\bAcme\b|John Doe|Jane Doe|SITE_TITLE|SITE_DESCRIPTION|Your journey starts here/i, "real copy for the brief; replace the layout's SITE_TITLE and SITE_DESCRIPTION.");
  tell("Dashes", /[\u2012\u2013\u2014\u2015\u2E3A\u2E3B]|&(mdash|ndash|horbar);|&#(821[0-3]);|&#x201[2-5];/i,
    "em and en dashes read as machine-written copy. Restructure the sentence: a comma, a colon, a full stop, or \"to\" for a range.");
  tell("Generic CTAs", />\s*(Learn more|Get started|Read more|Click here|Submit|Sign up|Contact us|Get in touch|Discover more|Find out more|Join now|Lees meer|Meer informatie|Meer weten|Klik hier|Neem contact op|Aan de slag|Ontdek meer)\s*</i, "name the action and its result, verb first: \"Reserveer een tafel voor vanavond\", \"Bekijk de projecten\", \"Plan een kennismaking\" (Struq tells 1.2.0, generic-ctas).", ownOnly);
  tell("Generic section headings", />\s*(Features|About Us|Our Services|Why Choose Us|What We Do|Our Story|Capabilities|Onze diensten|Over ons|Waarom kiezen voor ons)\s*</i, "a heading that says something only this business could say.", { ...ownOnly, warn: true, quietPass: true });
  tell("Hype copy", /\b(Unleash|Supercharge|Next-?gen|Seamless|Elevate your|Revolutioni[sz]e|Game-?changer|Cutting-?edge|State-of-the-art|Unparalleled|Next-level|Turbocharge|naadloos|ontgrendel|revolutionair|toekomstbestendig)\b/i, "plain, specific claims from the brief.", { ...ownOnly, warn: true, quietPass: true });

  // Palette hues: blue and purple only when STRUQ.md declares it. Hex and oklch() tokens.
  const css = files.filter((f) => f.rel.endsWith(".css")).map((f) => f.text).join("\n");
  const coolDeclared = /cool hue:\s*declared/i.test(plan);
  const cool = [];
  for (const m of css.matchAll(/--(?:color-)?(surface-\d|ink|ink-muted|accent|accent-ink|accent-2)\s*:\s*(#[0-9a-f]{6}\b|oklch\([^)]*\))/gi)) {
    const v = m[2];
    const o = v.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i);
    if (o) {
      const L = o[2] ? parseFloat(o[1]) / 100 : parseFloat(o[1]);
      const C = parseFloat(o[3]);
      const H = parseFloat(o[4]);
      if (C > 0.06 && H >= 220 && H <= 320 && L > 0.12 && L < 0.92) cool.push(`--${m[1]}: ${v}`);
      continue;
    }
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) continue;
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (h >= 200 && h <= 320 && s > 0.3 && l > 0.12 && l < 0.88) cool.push(`--${m[1]}: ${v} (hue ${Math.round(h)})`);
  }
  // Purple or blue written straight into components, outside the tokens.
  for (const f of own.filter((x) => !x.rel.endsWith(".css"))) {
    for (const m of f.text.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d < 0.25) continue;
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
      if (h >= 220 && h <= 320) cool.push(`${f.rel}: #${m[1]} (hue ${Math.round(h)})`);
    }
  }
  if (cool.length && !coolDeclared) add(G, "FAIL", "Blue or purple in the palette. Pick a canon palette that fits (canon.mjs list), or write \"Cool hue: declared because <the brand's own colour>\" in STRUQ.md.", cool);
  else add(G, "PASS", cool.length ? "Cool hue declared in STRUQ.md" : "Palette free of default blue and purple");
}

/* ------------------------------------------------------------------ MOTION */
// The blocks (components/struq/<kind>/) carry their own motion; this checks what the site around them owes them.
const BLOCK_IMPORT = /from\s*["'][^"']*components\/struq\/(preloaders|page-transitions|headers|heroes|backgrounds|showpieces|transitions|sections|footers)\/([\w-]+)["']/g;
const usedBlocks = new Set(own.flatMap((f) => [...f.text.matchAll(BLOCK_IMPORT)].map((m) => `${m[1]}/${m[2]}`)));
const usesKind = (kind) => [...usedBlocks].some((b) => b.startsWith(`${kind}/`));
{
  const G = "MOTION";
  const all = files.map((f) => f.text).join("\n");
  const missing = ["gsap", "@gsap/react", "lenis"].filter((d) => !deps[d]);
  const needsThree = usedBlocks.has("showpieces/hero-opener") || own.some((f) => /from\s*["']three["']|HeroCanvas/.test(f.text));
  if (needsThree && !deps.three) missing.push("three");
  if (missing.length) add(G, "FAIL", `Missing packages: npm install ${missing.join(" ")}`);
  else add(G, "PASS", "The block packages are installed");

  const layout = files.find((f) => /(^|\/)app\/layout\.(tsx|jsx)$/.test(f.rel))?.text ?? "";
  const lenis = /new Lenis\(|ReactLenis/.test(all) && /gsap\.ticker\.add/.test(all);
  if (lenis && /<SmoothScroll|<ReactLenis/.test(layout)) add(G, "PASS", "Lenis on the GSAP ticker, mounted in the layout");
  else add(G, "FAIL", lenis ? "Lenis is not mounted: wrap {children} in <SmoothScroll> in app/layout.tsx." : "No Lenis on gsap.ticker: run blocks.mjs init and mount <SmoothScroll> in app/layout.tsx.");

  if (/classList\.add\(\s*["']sq-js["']\s*\)/.test(layout) && /data-blocks/.test(layout)) add(G, "PASS", "The motion gate: sq-js before paint, data-blocks on <body>");
  else add(G, "FAIL", "The motion gate is missing: the layout puts sq-js on <html> in an inline script before paint and data-blocks on <body> (recipes/app/layout.tsx). Without them the blocks lose their tokens and their first frame.");

  if (usedBlocks.size) add(G, "PASS", `${usedBlocks.size} Struq block(s) on the page: ${[...usedBlocks].join(", ")}`);
  else add(G, "FAIL", "No Struq block on the page: pick the hero, the sections and the footer from blocks/CATALOG.md (or struq_blocks) and install them with blocks.mjs add.");

  if (/prefers-reduced-motion/.test(all)) add(G, "PASS", "prefers-reduced-motion respected");
  else add(G, "FAIL", "Nothing reads prefers-reduced-motion.");

  // The primitives (components/struq/kit/motion) and the feel (kit/feel.ts) carry the house moves and their timing.
  // Your own scenes under app/ and components/ (not components/struq/) compose them before writing GSAP by hand.
  const site = files.filter((f) => /^(?:src\/)?(?:app|components)\//.test(f.rel) && !/(?:^|\/)components\/struq\//.test(f.rel) && !f.rel.endsWith(".css"));
  const gsapFiles = site.filter((f) => /from\s*["'](?:gsap(?:\/[\w/]+)?|@gsap\/react|[^"']*components\/struq\/kit\/gsap)["']|\bgsap\./.test(f.text));

  const split = hits(/\bSplitText\b/, { scope: site });
  if (split.length) add(G, "WARN", "SplitText of your own: fine for kinetic type the kit cannot do. For a plain line or word reveal RevealText (@/components/struq/kit/motion) is already descender-safe; if you keep your own, give each mask line room below the baseline (padding-bottom about 0.15em) so no g, j, p or y is clipped.", split);
  else add(G, "PASS", "Text reveals go through the kit");

  const inlineStyle = /style=\{\{/;
  const clip = hits(/\bclipPath\s*:|["']clip-path["']\s*:|\binset\(/, { scope: gsapFiles, exclude: inlineStyle });
  if (clip.length) add(G, "WARN", "A clip-path tween of your own: MaskWipe wipes an element or photo in, ImageCurtain uncovers a photo, both on the feel's curtain ease.", clip);
  const draw = hits(/\bstrokeDashoffset\s*:|\bdrawSVG\s*:/, { scope: gsapFiles, exclude: inlineStyle });
  if (draw.length) add(G, "WARN", "A stroke drawn by hand: ScrubLine draws a rule or a path with the scroll at an even pace.", draw);
  // A literal ease or duration in a GSAP call. ease "none" passes, and so does a duration beside it: a scrub is linear
  // in every temperament, and a scrubbed timeline's durations only set proportions.
  const timing = hits(/\bease\s*:\s*["'`](?!none["'`])|\bduration\s*:\s*\d/, { scope: gsapFiles, exclude: /style=\{\{|\bease\s*:\s*["'`]none["'`]/ });
  if (timing.length) add(G, "WARN", "Ease or duration written into a GSAP call: take them from feel() (@/components/struq/kit/feel), so the scene moves in the site's temperament.", timing);
  if (!clip.length && !draw.length && !timing.length) add(G, "PASS", "Own GSAP takes its timing from the feel and leaves wipes and drawn lines to the kit");

  // The temperament: one on <body>, from the language's default or its neighbour.
  const bodies = files
    .filter((f) => /(?:^|\/)app\/layout\.(?:tsx|jsx)$/.test(f.rel))
    .flatMap((f) =>
      [...f.text.matchAll(/<body\b[^>]*>/g)]
        .filter((m) => !/^\s*(?:\/\/|\/?\*|\{\/\*)/.test(f.text.slice(f.text.lastIndexOf("\n", m.index) + 1, m.index + 1)))
        .map((m) => ({ tag: m[0], where: lineOf(f, m.index) })),
    );
  const TEMPERAMENTS = ["crisp", "weighted", "slow"];
  const badBody = bodies.filter(({ tag }) => {
    const value = tag.match(/\bdata-temperament=(?:["']([^"']*)["']|\{\s*["'`]([^"'`]*)["'`]\s*\})/);
    return !value || !TEMPERAMENTS.includes(value[1] ?? value[2]);
  });
  if (!bodies.length) add(G, "FAIL", "No <body> in app/layout: set <body data-blocks=\"\" data-temperament=\"weighted\"> (crisp, weighted or slow, the language's default).");
  else if (badBody.length) add(G, "FAIL", "<body> without a temperament: set data-temperament to crisp, weighted or slow, the language's default (cut crisp, weight weighted, curtain slow) or its neighbour with the reason on the Language line.", badBody.map((b) => `${b.where}  ${b.tag.slice(0, 100)}`));
  else add(G, "PASS", `The temperament is set on <body>: ${bodies.map((b) => b.tag.match(/data-temperament=\{?\s*["'`]([^"'`]*)/)[1]).join(", ")}`);

  // The close is never the site's name at full width. What this reads: each page file's footer (a footer element, a
  // Footer* block or WordmarkFinale), the scene just before it (or the last section passed into the footer as its
  // children), followed one step into a local component. It fails when that scene's display-size text (text-display,
  // text-sheet-moment, text-6xl to 9xl, text-[Nvw] at 8vw or more, text-[Nrem] at 6rem or more) is only a name the
  // site shows or the Brief gives, and when wordmark-finale follows a block or loud scene directly, so the name at
  // full width is the page's last scene. What it cannot read: a name passed as an expression ({site.name}), a size set
  // in CSS or inline style, and a close built in a component more than one import away.
  {
    const DISPLAY = /\btext-(?:display|sheet-moment|poster|[6-9]xl)\b|\btext-\[(?:[^\]]*?[\s,(])?(\d+(?:\.\d+)?)(vw|rem)\b[^\]]*\]/;
    const isDisplay = (cls) => {
      const m = cls.match(DISPLAY);
      if (!m) return false;
      if (!m[1]) return true;
      return m[2] === "vw" ? Number(m[1]) >= 8 : Number(m[1]) >= 6;
    };
    const norm = (s) => s.toLowerCase().replace(/&apos;|&amp;/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const names = new Set(SHOWN_NAMES.map((s) => norm(s.name)).filter(Boolean));
    const isName = (text) => {
      const t = norm(text);
      if (!t) return false;
      if (names.has(t)) return true;
      return t.split(" ").length <= 3 && /^\p{Lu}/u.test(text.trim()) && namedInBrief(text.trim());
    };
    /** Display-size elements whose whole text is a name: `<tag class="...">Name</tag>`. */
    const nameAtDisplay = (markup) =>
      [...markup.matchAll(/<([\w.]+)\b([^>]*)>([^<{}]+)<\/\1>/g)]
        .filter((m) => isDisplay(m[2].match(/className=(?:["'`]([^"'`]*)["'`]|\{\s*["'`]([^"'`]*)["'`]\s*\})/)?.slice(1).find(Boolean) ?? "") && isName(m[3]))
        .map((m) => m[3].trim());
    const importOf = (text, tag) => text.match(new RegExp(`import\\s*(?:\\{[^}]*\\b${tag}\\b[^}]*\\}|${tag})\\s*from\\s*["']([^"']+)["']`))?.[1] ?? "";
    const localFile = (from, spec) => {
      if (!spec || !(spec.startsWith(".") || spec.startsWith("@/"))) return null;
      const base = spec.startsWith("@/") ? spec.slice(2) : join(from.rel, "..", spec).split(sep).join("/");
      return files.find((f) => [".tsx", ".jsx", ".ts", ".js", "/index.tsx", "/index.ts"].some((ext) => f.rel === `${base}${ext}` || f.rel === `src/${base}${ext}`)) ?? null;
    };
    const FOOTER = /<(WordmarkFinale|Footer\w*|footer)\b/;
    const fullWidth = [];
    for (const page of files.filter((f) => /(?:^|\/)app\/(?:.*\/)?page\.(?:tsx|jsx)$/.test(f.rel))) {
      const body = page.text.slice(Math.max(0, page.text.search(/\breturn\s*\(/)));
      const offset = page.text.length - body.length;
      const foot = body.match(FOOTER);
      if (!foot) continue;
      const before = body.slice(0, foot.index);
      const end = body.indexOf(`</${foot[1]}>`, foot.index);
      const inside = end > 0 ? body.slice(foot.index, end) : "";
      // The candidate close: the last section passed into the footer, else the last section or component before it.
      let markup = "";
      let kind = "";
      const innerSection = inside.lastIndexOf("<section");
      if (innerSection >= 0) {
        markup = inside.slice(innerSection, inside.indexOf("</section>", innerSection) + 10 || undefined);
        kind = "own";
      } else {
        const tags = [...before.matchAll(/<(section\b|[A-Z][\w.]*)/g)].filter((m) => !/^(?:Header\w*|SiteHeader|MenuCurtain\w*|Fragment|SmoothScroll|Reveal|main)$/.test(m[1]));
        const last = tags.at(-1);
        if (!last) continue;
        if (last[1].startsWith("section")) {
          markup = before.slice(last.index, before.indexOf("</section>", last.index) + 10 || undefined);
          kind = /data-energy=["']?[2-9]/.test(markup.slice(0, 300)) ? "loud" : "own";
        } else {
          const spec = importOf(page.text, last[1]);
          if (/components\/struq\/kit\/quiet(?:\/Close)?$/.test(spec)) kind = "kit";
          else if (/components\/struq\//.test(spec)) kind = "block";
          else {
            const file = localFile(page, spec);
            markup = file?.text ?? before.slice(last.index);
            kind = "own";
          }
        }
      }
      // One step into the local components the close renders.
      for (const m of [...markup.matchAll(/<([A-Z]\w*)/g)]) {
        const file = localFile(page, importOf(page.text, m[1]));
        if (file) markup += `\n${file.text}`;
      }
      const hit = nameAtDisplay(markup);
      if (hit.length) fullWidth.push(`${lineOf(page, offset + foot.index)}  the scene before the footer sets "${hit[0]}" at display size`);
      else if (foot[1] === "WordmarkFinale" && (kind === "block" || kind === "loud")) {
        fullWidth.push(`${lineOf(page, offset + foot.index)}  wordmark-finale follows a block directly, so the name at full width is the page's last scene`);
      }
    }
    if (fullWidth.length) add(G, "FAIL", "The close is the site's name at full width: end on the idea, an echo of the opening or the real doors instead, with the kit's Close (shape idea, echo or door), and keep a wordmark there at text size.", fullWidth);
    else add(G, "PASS", "The close is not the name at full width");
  }
}

/* -------------------------------------------------------------------- TYPE */
{
  const G = "TYPE";
  const fams = new Set();
  let italicAccent = false;
  for (const f of own) {
    for (const m of f.text.matchAll(/fonts\.googleapis\.com\/css2\?family=([A-Za-z0-9+]+)(:[^&"'\s]*)?/g)) {
      fams.add(m[1].replace(/\+/g, " "));
      if (/ital@1|ital,wght@1/.test(m[2] ?? "")) italicAccent = true;
    }
    for (const m of f.text.matchAll(/api\.fontshare\.com\/v2\/css\?f\[\]=([a-z0-9-]+)/g)) fams.add(m[1]);
    for (const m of f.text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g)) {
      m[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => fams.add(s.replace(/_/g, " ")));
    }
    if (/from\s*["']next\/font\/local["']/.test(f.text)) for (const m of f.text.matchAll(/(\w+)\s*=\s*localFont\(/g)) fams.add(`local:${m[1]}`);
  }
  if (fams.size === 2 || (fams.size === 3 && italicAccent)) add(G, "PASS", `Faces: ${[...fams].join(" + ")}`);
  else if (fams.size === 1) add(G, "WARN", `One face (${[...fams][0]}). A display and a text face, unless the pairing is one family.`);
  else if (fams.size === 0) add(G, "FAIL", "No web fonts loaded: canon.mjs type <pairing> writes app/fonts.ts, and the layout links each URL.");
  else add(G, "FAIL", `${fams.size} faces loaded (${[...fams].join(", ")}). One display, one text, at most one italic accent.`);

  const css = files.filter((f) => f.rel.endsWith(".css")).map((f) => f.text).join("\n");
  const ownCss = own.filter((f) => f.rel.endsWith(".css")).map((f) => f.text).join("\n");
  const weight = (ownCss.match(/--display-weight:\s*(\d{3})/) ?? css.match(/--display-weight:\s*(\d{3})/))?.[1];
  const typeId = plan.match(/^Type:\s*([\w-]+)/m)?.[1];
  const poster = CANON.pairings.find((t) => t.id === typeId && String(t.displayScale?.weight) === weight && Number(weight) > 400);
  if (weight && Number(weight) <= 400) add(G, "PASS", `Display runs light (${weight})`);
  else if (poster) add(G, "PASS", `Display at ${poster.id}'s poster weight (${weight})`);
  else if (weight) add(G, "FAIL", `Display weight ${weight}: run it light (300, or 400 for a face that starts there); heavier only at a poster pairing's own weight.`);
  else add(G, "WARN", "No --display-weight found: the STRUQ TOKENS block sets it (canon.mjs type).");

  if (/html\s*\{[^}]*font-size:\s*clamp\(/.test(css)) add(G, "PASS", "One fluid root-rem knob");
  else add(G, "FAIL", "No fluid root font size: html { font-size: clamp(1rem, 0.92rem + 0.2vw, 1.125rem); }");

  const h1 = files.reduce((n, f) => n + (f.text.match(/<h1\b|<SplitHeadline(?![^>]*as=["'](h2|h3|p)["'])[^>]*>/g) ?? []).length, 0);
  if (h1 >= 1) add(G, "PASS", "The page has its h1");
  else add(G, "FAIL", "No h1 on the page.");
}

/* -------------------------------------------------------------------- PLAN */
{
  const G = "PLAN";
  if (!plan) add(G, "FAIL", "No STRUQ.md in the project root: write the plan and the Build checklist (SKILL.md).");
  else {
    const open = plan.split(/\r?\n/).filter((l) => /^\s*[-*]\s*\[\s\]/.test(l) && !/check\.mjs/.test(l));
    const done = plan.split(/\r?\n/).filter((l) => /^\s*[-*]\s*\[[xX]\]/.test(l)).length;
    if (open.length) add(G, "FAIL", `${open.length} Build checklist item(s) not ticked in STRUQ.md. Do each, then log it with log.mjs "Step <N> ...", which ticks its line (step 7 also needs .struq/art-direction.md).`, open.map((l) => l.trim()));
    else if (done >= 7) add(G, "PASS", `Build checklist ticked (${done} items)`);
    else add(G, "FAIL", "STRUQ.md has no Build checklist: copy it from SKILL.md and tick each step as you finish it.");
    const has = (k) => new RegExp(`^${k}:\\s*\\S`, "mi").test(plan);
    // The storyboard is the order now; a plan from before the treatment may still carry an Order: line.
    const need = ["Palette", "Type", "Images"].filter((k) => !has(k));
    if (!/^Storyboard:/mi.test(plan) && !has("Order")) need.push("Storyboard");
    if (need.length) add(G, "FAIL", `STRUQ.md does not record: ${need.map((k) => `${k}:`).join(", ")} (SKILL.md, the treatment).`);
    else add(G, "PASS", "Direction and order recorded (palette, type, images, storyboard)");

    // The treatment: the film the site is cast into (SKILL.md, The film).
    const missing = ["Idea", "Motif", "Lexicon", "Centerpiece"].filter((k) => !has(k));
    const language = plan.match(/^Language:\s*(\S+)/mi)?.[1]?.toLowerCase().replace(/[^a-z]/g, "");
    if (!["weight", "cut", "curtain"].includes(language)) missing.push("Language");
    const board = plan.match(/^Storyboard:[^\n]*\n((?:[ \t]*(?:\d+\.|\.\.\.)[^\n]*\n?)*)/mi);
    const scenes = board ? (board[1].match(/^[ \t]*\d+\.\s+\S/gm) ?? []).length : 0;
    if (!board) missing.push("Storyboard");
    if (missing.length) add(G, "FAIL", `The treatment in STRUQ.md lacks: ${missing.map((k) => `${k}:`).join(", ")}. Write the head of STRUQ.md from the template in SKILL.md step 2 (Language: is weight, cut or curtain; the storyboard numbers its scenes).`);
    else if (scenes < 7 || scenes > 9) add(G, "FAIL", `The storyboard has ${scenes} numbered scene(s): seven to nine, cast from the language's arc (SKILL.md, The film).`);
    else add(G, "PASS", `Treatment recorded: language ${language}, ${scenes} scenes in the storyboard`);
  }
}

/* -------------------------------------------------------------------- HERO */
{
  const G = "HERO";
  // A WebGL background opener (background-silk, -aurora, -facets) is a hero too: the catalogue casts it as an opening.
  const heroBlock = usesKind("heroes") || usesKind("backgrounds") || usedBlocks.has("showpieces/hero-opener");
  // No fitting photo (imageFit none), or no hero photo on purpose (images.mjs --no-hero): a type-led first screen.
  const imageModule = read("lib/struq-images.ts") + read("src/lib/struq-images.ts");
  const noFit = /imageFit[^=]*=\s*"none"/.test(imageModule) || /\bhero:\s*\[\s*\]/.test(imageModule);
  if (heroBlock) {
    add(G, "PASS", "A hero block opens the page");
    const heroUse = own.flatMap((f) => [...f.text.matchAll(/<(Hero[A-Z]\w*)\b[^>]*?\/?>/gs)].map((m) => ({ f, tag: m[0] })));
    // Comments never count: a prop written inside /* */ is not a prop. HeroSplit takes its photos through items.
    const bare = noFit ? [] : heroUse.filter(({ tag }) => { const t = tag.replace(/\/\*[\s\S]*?\*\//g, ""); return /<Hero(Framed|Split|Index|Still|Poster)\b/.test(t) && !/\b(?:images?|items)=\{/.test(t); });
    if (bare.length) add(G, "FAIL", "A photo hero without its photo: pass image={images.hero[0]} (or the client's photo).", bare.map(({ f }) => f.rel));
  } else {
    // A hand-built hero: a photo in it and a display line at poster size.
    const heroFile = own.find((f) => /<h1\b|<SplitHeadline\b/.test(f.text));
    if (!heroFile) add(G, "FAIL", "No hero: open the page with a hero block (blocks/CATALOG.md, Heroes).");
    else {
      const at = heroFile.text.search(/<h1\b|<SplitHeadline\b/);
      const slice = heroFile.text.slice(Math.max(0, heroFile.text.lastIndexOf("<section", at)), heroFile.text.indexOf("</section>", at) + 1 || undefined);
      // A real-time scene (a Canvas, a shader, a model) is a subject of its own: the hero needs no photo then.
      const realtime = /<Canvas\b|<View\b|ShaderMaterial|useFrame\b|WebGL|data-gl\b/.test(slice) || own.some((f) => /<Canvas\b/.test(f.text));
      if (!noFit && !realtime && !/images\.hero\b|<MediaFrame\b|\bimage=\{/.test(slice)) add(G, "WARN", "Hero without a photo or a real-time scene: show the subject, as images.hero[0], the client's photo, or a WebGL scene of it.", [heroFile.rel]);
      const vw = [...(slice.match(/<(?:h1|SplitHeadline)\b[^>]*>/)?.[0] ?? "").matchAll(/text-\[(\d+(?:\.\d+)?)vw\]/g)].map((m) => Number(m[1]));
      if (!vw.length || Math.max(...vw) < 10) add(G, "WARN", "Hand-built hero line under 10vw: display type at poster scale (12 to 20vw) is the default; a quieter line is fine when the scene beside it is the signature.", [heroFile.rel]);
      else add(G, "PASS", "The hand-built hero line runs at poster size");
    }
  }
  // A brief with no name gets a header with no wordmark (the stand-in rule), so an own <header> passes on its own.
  if (usesKind("headers") || own.some((f) => /data-wordmark/.test(f.text))) add(G, "PASS", "A header with the wordmark");
  else if (own.some((f) => /<header\b/.test(f.text))) add(G, "PASS", "An own header (no wordmark: the brief gives no name, or mark it data-wordmark)");
  else add(G, "FAIL", "No header: use header-bar or menu-curtain, or build your own <header> (its name marked data-wordmark when the brief gives one).");
  if (usesKind("footers") || usedBlocks.has("showpieces/wordmark-finale")) add(G, "PASS", "A designed footer block closes the page");
  else add(G, "WARN", "No footer block: close with footer-reveal, footer-contact or wordmark-finale, or design your own as hard as the hero.");

  const scenes = own.filter((f) => !f.rel.endsWith(".css")).reduce((n, f) => n + (f.text.match(/\bscene-(inverse|field)\b/g) ?? []).length, 0);
  // The tone arc in the treatment decides where the ground turns; a page without a turn is a choice to look at.
  if (scenes === 0) add(G, "WARN", "No contrast scene: wrap one section in scene-inverse or scene-field, so the page does not stay on one ground.");
  else if (scenes > 2) add(G, "WARN", `${scenes} contrast scenes: one, at most two, or the contrast stops being a moment.`);
  else add(G, "PASS", `${scenes} contrast scene${scenes > 1 ? "s" : ""}`);

  const geometry = hits(/new\s+THREE\.(Box|Cylinder|Torus|Sphere|Capsule|Cone|Tube|Lathe|Extrude|Tetrahedron|Octahedron|Icosahedron)Geometry\b|<(box|cylinder|torus|sphere|capsule|cone|tube|lathe|extrude)Geometry\b/, { scope: own });
  // Real-time 3D is welcome. A raw primitive with a flat material reads as a toy, so the check asks for craft, not
  // for its removal: a physical material, an environment and light, or a glTF of the real object.
  const crafted = own.some((f) => /meshPhysicalMaterial|MeshPhysicalMaterial|MeshTransmissionMaterial|<Environment\b|RoomEnvironment|PMREMGenerator|useGLTF|GLTFLoader|ShaderMaterial|shaderMaterial/.test(f.text));
  if (geometry.length && !crafted) add(G, "WARN", "3D from bare primitives with no physical material, environment or shader: it will read as plastic. Use a lathe or a glTF for the form, MeshPhysicalMaterial (transmission, ior, thickness) or MeshTransmissionMaterial, an environment map, and post-processing (references/realtime.md).", geometry);
  else if (geometry.length) add(G, "PASS", "Real-time 3D with a physical material or shader");
  else add(G, "PASS", "No 3D built from bare primitives");
}

/* -------------------------------------------------------------------- FILM */
// film-check.mjs, Struq's own module: the blocks on the page, in page order, held to the film grammar's budgets (one
// centerpiece, no pin after it, one language, one clock, one marquee, the pinned screens ...). Your own files only;
// the copies under components/struq/ are the blocks themselves, not the page.
{
  const G = "FILM";
  const pageFiles = own
    .filter((f) => !/(^|\/)components\/struq\//.test(f.rel))
    .map((f) => ({ path: f.rel, text: f.text }));
  const { findings, scenes } = filmCheck({ plan, files: pageFiles, catalog: CATALOG });
  for (const f of findings) {
    add(G, f.severity === "fail" ? "FAIL" : "WARN", `${f.id}: ${f.detail.replace(/\.$/, "")}. Fix: ${f.fix}`);
  }
  if (!findings.some((f) => f.severity === "fail")) {
    add(G, "PASS", `The page holds the film budgets (${scenes.length} block${scenes.length === 1 ? "" : "s"} in page order)`);
  }
}

/* -------------------------------------------------------------------- LOOK */
// look.mjs renders the built page and writes .struq/look.json with what it measured and a stamp of the source. The
// check holds to it: no look, a failing look, or a look of an older page than the source on disk all fail.
{
  const G = "LOOK";
  const again = "Serve the build (npx next build && npx next start -p 4321) and run node <skill-dir>/scripts/look.mjs.";
  let look = null;
  try {
    look = JSON.parse(readFileSync(join(root, ".struq", "look.json"), "utf8"));
  } catch {
    look = null;
  }
  if (!look) add(G, "FAIL", `No look at the rendered page (.struq/look.json missing). ${again}`);
  else {
    const now = sourceStamp(root);
    const fails = (look.findings ?? []).filter((f) => f.severity === "FAIL");
    const stale = look.source?.hash ? look.source.hash !== now.hash : !(now.newest.mtime <= Date.parse(look.at));
    if (stale) add(G, "FAIL", `The look is older than the source: ${now.newest.file ?? "a file under app/ or components/"} changed after it. Rebuild, restart the server and run look.mjs again.`);
    else if (look.result !== "PASS" || fails.length) {
      add(G, "FAIL", `look.mjs found ${fails.length} fail(s) on the rendered page. Open the screenshots it names, fix, rebuild and run it again.`, fails.map((f) => `${f.kind} ${f.viewport ?? ""}: ${f.text ? `"${f.text.slice(0, 50)}" ` : ""}${f.detail}${f.shot ? `  ${f.shot}` : ""}`));
    } else {
      const warns = (look.findings ?? []).length;
      add(G, "PASS", `look.mjs passed on the current source${warns ? ` (${warns} warn in .struq/look.json: open their screenshots)` : ""}`);
    }
  }
}

/* --------------------------------------------------------------------- ART */
// The art director's asks are binding. .struq/art-direction.md lists each ask as a numbered item, and the builder writes
// an answer line under it: "Built: <what changed>" or "Refused: <reason>". An ask with no answer fails. A refusal whose
// reason only cites the storyboard, the plan, a budget or a block fails too: the storyboard is rewritten for a good ask,
// a budget is kept by dropping something else, a block is swapped or restyled. A refusal stands on a rule that never
// bends (SKILL.md, Rules that never bend) or on a fact the brief did not give, and says which.
{
  const G = "ART";
  const file = join(root, ".struq", "art-direction.md");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!text) add(G, "FAIL", "No .struq/art-direction.md: hand the stills to a fresh subagent (SKILL.md, Art direction), save its asks there as numbered items, and answer each with Built: or Refused:.");
  else {
    const asks = [];
    let cur = null;
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) {
        cur = null;
        continue;
      }
      const ask = line.match(/^\s{0,3}\d+[.)]\s+(\S.*)$/);
      if (ask) {
        cur = { ask: ask[1], answer: null, reason: "" };
        asks.push(cur);
        continue;
      }
      if (!cur) continue;
      const ans = line.match(/^\s*(?:[-*]\s+)?\*{0,2}(Built|Refused)\*{0,2}:\*{0,2}\s*(.*)$/i);
      if (ans) {
        cur.answer = ans[1].toLowerCase();
        cur.reason = ans[2];
        // An ask can be partly built and partly refused; keep the Built line for the leftover check below.
        if (cur.answer === "built") cur.built = ans[2];
      } else if (cur.answer === "refused" && line.trim()) cur.reason += ` ${line.trim()}`;
    }
    const shortAsk = (a) => `${a.ask.slice(0, 90)}${a.ask.length > 90 ? "..." : ""}`;
    const unanswered = asks.filter((a) => !a.answer);
    const EMPTY = /^[\s.:;,…-]*$/;
    // What a refusal may stand on: a rule that never bends, or a fact the brief did not give.
    const GROUND = /\b(?:invent\w*|made[- ]up|fabricat\w*|never bends|rule\s*[1-4]|honesty|stand-in|empty frame|eyebrow\w*|tells?|dash(?:es)?|the brief\s+(?:gave|gives|did not|does not|never|has no|names no|says nothing)|brief gave|not (?:given|in the brief)|no (?:photo|pack photo|address|phone|number|name|programme|program|dates?|price|prices|shop|booking|testimonial|product)\b|reduced.motion|copyright|licen[cs]e)/i;
    // What is not a ground: the plan, the storyboard, a budget, or a block.
    const NOT_GROUND = /\b(?:story-?board|(?:the |our |approved |agreed )?plan\b|budgets?|quiet share|pin(?:s| budget)?\b|one centerpiece|centerpiece|blocks?\b|block-owned|owns? (?:its|the)|fixed (?:layout|crop|composition)|the film|loud scene)/i;
    const weak = asks.filter((a) => a.answer === "refused" && (EMPTY.test(a.reason) || (NOT_GROUND.test(a.reason) && !GROUND.test(a.reason))));
    const bare = asks.filter((a) => a.answer === "built" && EMPTY.test(a.reason));
    // A Built answer that says a quoted text was removed is checked against the files: trial-prim fashion logged
    // 'the "Photos: Struq" credit is removed' and the credit was still on the page (2026-11-15).
    const leftovers = [];
    const isComment = (line) => /^(\/\/|\/?\*|\{\/\*)/.test(line.trim());
    for (const a of asks.filter((x) => x.built)) {
      for (const m of a.built.matchAll(/["“]([^"”]{3,160})["”]/g)) {
        const after = a.built.slice(m.index + m[0].length, m.index + m[0].length + 50);
        const before = a.built.slice(Math.max(0, m.index - 40), m.index);
        const gone = /^\s*(?:[\w-]+\s+){0,2}(?:is|are|was|were|has been|have been|now)?\s*(?:removed|gone|deleted|dropped|cut)\b/i.test(after) || /\b(?:removed|deleted|dropped)\s+(?:the\s+)?(?:[\w-]+\s+)?$/i.test(before);
        if (!gone) continue;
        const words = m[1].trim().replace(/[.,;:!?]+$/, "");
        if (words.length < 3) continue;
        // Found in a shipped file (lib/struq-images.ts holds the credit as a constant), it counts only when the site's
        // own files still use that export; found in an own file, it counts as it stands.
        const hitIn = (f) => f.text.split(/\r?\n/).findIndex((line) => !isComment(line) && line.includes(words));
        let where = null;
        for (const f of files) {
          if (f.rel.startsWith(".struq/") || /\.md$/i.test(f.rel)) continue;
          const i = hitIn(f);
          if (i < 0) continue;
          if (!f.recipe) {
            where = `${f.rel}:${i + 1}`;
            break;
          }
          const name = f.text.split(/\r?\n/)[i].match(/export\s+const\s+(\w+)/)?.[1];
          const user = name && own.find((o) => !/\.md$/i.test(o.rel) && new RegExp(`\\b${name}\\b`).test(o.text));
          if (user) {
            where = `${f.rel}:${i + 1}, used by ${user.rel}`;
            break;
          }
        }
        if (where) leftovers.push(`${shortAsk(a)}  "${words}" is still in ${where}`);
      }
    }
    if (leftovers.length) add(G, "FAIL", `${leftovers.length} art-direction answer(s) say a text was removed that is still in the site. Remove it, or correct the Built line.`, leftovers);
    if (!asks.length && /ship it/i.test(text)) add(G, "PASS", "The art director said ship it: no asks to answer");
    else if (!asks.length) add(G, "FAIL", ".struq/art-direction.md holds no numbered asks. Write each ask as a numbered item (1. 2. 3.) with the still it names, and answer each with Built: or Refused:.");
    else {
      if (unanswered.length) add(G, "FAIL", `${unanswered.length} art-direction ask(s) with no answer. Under each ask write "Built: <what changed>" or "Refused: <reason>"; every ask is built unless it breaks a rule that never bends or a fact of the brief.`, unanswered.map(shortAsk));
      if (weak.length) add(G, "FAIL", `${weak.length} art-direction ask(s) refused with no ground. The storyboard, the plan, a budget or a block is never a reason: rewrite the storyboard for a good ask, keep a budget by dropping something else, swap or restyle the block. Refuse only an ask that breaks a rule that never bends (SKILL.md) or a fact the brief did not give, and say which.`, weak.map((a) => `${shortAsk(a)}  Refused: ${a.reason.slice(0, 100)}`));
      if (bare.length) add(G, "FAIL", `${bare.length} art-direction ask(s) marked Built with nothing said. Write what changed.`, bare.map(shortAsk));
      if (!unanswered.length && !weak.length && !bare.length && !leftovers.length) {
        const built = asks.filter((a) => a.answer === "built").length;
        add(G, "PASS", `Every art-direction ask is answered: ${built} built, ${asks.length - built} refused on a rule or a fact of the brief`);
      }
    }
  }
}

/* --------------------------------------------------------------------- LOG */
// Every site keeps STRUQ-LOG.md: an entry for each completed checklist step. Step 8 (this check) writes its own entry
// when this run ends, so it is not required beforehand.
{
  const G = "LOG";
  const log = read("STRUQ-LOG.md");
  if (!log) add(G, "FAIL", "No STRUQ-LOG.md. Start it at the first step: node <skill-dir>/scripts/log.mjs \"Step 1 Project\" \"<what>\" \"<why>\".");
  else {
    const ticked = (plan.match(/^\s*[-*]\s*\[[xX]\]\s*(\d+)/gm) ?? []).map((l) => Number(l.match(/(\d+)\s*$/)[1])).filter((n) => n !== 8);
    const missing = ticked.filter((n) => !new RegExp(`^## Step ${n}\\b`, "m").test(log));
    const entries = (log.match(/^## /gm) ?? []).length;
    // The same test blocks.mjs add and canon.mjs hold before they write a file (gate.mjs).
    if (!hasApproval(log)) {
      add(G, "FAIL", 'No Step 2 Approval entry with the user\'s own reply. The build request is not the approval: stop once, ask "Akkoord? Heb je een logo, foto\'s of echte cijfers, stuur ze nu.", then log the answer word for word: node <skill-dir>/scripts/log.mjs "Step 2 Approval" "Asked: Akkoord? ..." "Reply: \"<their words>\"".');
    } else add(G, "PASS", "The approval stop is logged with the user's reply");
    if (missing.length) add(G, "FAIL", `STRUQ-LOG.md has no entry for ticked step(s) ${missing.join(", ")}. Add one per step with log.mjs: what was done and why.`);
    else add(G, "PASS", `STRUQ-LOG.md has ${entries} entries, one or more for every ticked step`);
  }
}

/* ------------------------------------------------------------------ REPORT */
const order = ["IMAGES", "TELLS", "MOTION", "HERO", "FILM", "TYPE", "PLAN", "LOOK", "ART", "LOG"];
console.log(`Struq check: ${root}\n`);
for (const g of order) {
  const rows = results.filter((r) => r.group === g);
  if (!rows.length) continue;
  console.log(g);
  for (const r of rows) {
    console.log(`  ${r.status.padEnd(4)}  ${r.message}`);
    for (const w of r.where.slice(0, 8)) console.log(`          ${w}`);
    if (r.where.length > 8) console.log(`          ... and ${r.where.length - 8} more`);
  }
  console.log("");
}
const fails = results.filter((r) => r.status === "FAIL").length;
const warns = results.filter((r) => r.status === "WARN").length;
if (!args.includes("--no-log")) {
  const names = (status) => results.filter((r) => r.status === status).map((r) => `${r.group} ${r.message.split(":")[0].replace(/[.(].*$/, "").trim()}`);
  const passed = results.filter((r) => r.status === "PASS").length;
  appendLog(root, "Step 8 Check", [
    `check.mjs: RESULT ${fails ? "FAIL" : "PASS"}, ${passed} pass, ${fails} fail, ${warns} warn.`,
    ...(fails ? [`Fail: ${names("FAIL").join("; ")}.`] : []),
    ...(warns ? [`Warn: ${names("WARN").join("; ")}.`] : []),
  ]);
}
if (fails) {
  console.log(`RESULT: FAIL (${fails} fail, ${warns} warn). Fix every FAIL, run the check again, and only then report done.`);
  process.exit(1);
}
console.log(`RESULT: PASS${warns ? ` (${warns} warn: read them, fix what applies)` : ""}`);
