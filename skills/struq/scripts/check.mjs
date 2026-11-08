#!/usr/bin/env node
// Struq self-check: run it from the project root before you report a build as done.
//
//   node <skill-dir>/scripts/check.mjs
//   node <skill-dir>/scripts/check.mjs --dir ./my-site
//
// It needs no browser and no dependencies. It reads the source and the public folder and prints
// PASS, WARN or FAIL per check, in four groups: images, AI tells, the motion floor, typography,
// plus the plan in STRUQ.md. Every FAIL names the file and line and the fix. Exit code 1 while any
// FAIL remains. Fix, run again, and only report done on "RESULT: PASS".
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { appendLog } from "./log.mjs";
import { altFitsBrief, packSignalForBrief } from "./packs.mjs";

const CANON = JSON.parse(readFileSync(new URL("../canon/canon.json", import.meta.url), "utf8"));

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
const plan = read("STRUQ.md");

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
    else if (plates.length === srcs.length) add(G, "WARN", `struq.nl was unreachable: all ${srcs.length} images are fallback plates. Run images.mjs ${pack} again when online.`);
    else if (plates.length) add(G, "WARN", `${plates.length} fallback plate(s) among the pack images. Run images.mjs ${pack} again when online.`, plates);
    else add(G, "PASS", `${srcs.length} beeldbank images from pack "${pack}", each a verified image file`);
    // An off-topic photo is worse than no photo: a pack the brief does not point at must show
    // something the brief is about in at least one alt.
    const brief = plan.match(/^Brief:\s*(.+)$/m)?.[1];
    if (brief && srcs.length && packSignalForBrief(brief) !== pack) {
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

  // Each pack reference (images.card[2], images.card.slice(0, 5)) or own image tag counts once.
  const used = own.reduce((n, f) => n + (f.text.match(/images\.(hero|band|card|column|detail|backdrop)\b|<img\b|src=["'{`]\/images\//g) ?? []).length, 0);
  const total = Object.values(slotCount).reduce((a, b) => a + b, 0);
  const floor = libFile ? Math.min(4, total) : 4;
  if (libFile && imageFit !== "full" && total === 0) add(G, "PASS", "No image placements needed: no pack photo fits");
  else if (used >= floor) add(G, "PASS", `${used} image placements in the page code`);
  else add(G, "FAIL", `Only ${used} image placement(s). A Struq site carries a hero image and at least three more: use <MediaFrame image={images.card[0]} />.`);
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
  const hotlinks = hits(/https?:\/\/(www\.)?struq\.nl\/media\//, { scope: own });
  if (placeholders.length || emptyFrames.length) {
    add(G, "FAIL", "Placeholder or empty frames. A Struq site never ships an empty frame: put a MediaFrame with a pack image in each.", [...placeholders, ...emptyFrames]);
  } else add(G, "PASS", "No placeholder or empty image frames");
  if (hotlinks.length) add(G, "FAIL", "Hotlinked struq.nl images: download them with images.mjs and use the local /images/ path.", hotlinks);

  const credit = uses(/imageCredit|struq\.nl\/beeldbank/);
  if (libFile && !credit) add(G, "WARN", "No image credit. Put imageCredit (\"Beeld: Struq\") in the footer as one quiet text-small link.");
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
  else add(G, "FAIL", "No Struq block on the page: pick the hero, the sections and the footer from blocks/CATALOG.md (or struq_blokken) and install them with blocks.mjs add.");

  if (/prefers-reduced-motion/.test(all)) add(G, "PASS", "prefers-reduced-motion respected");
  else add(G, "FAIL", "Nothing reads prefers-reduced-motion.");
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
    if (open.length) add(G, "FAIL", `${open.length} Build checklist item(s) not ticked in STRUQ.md. Do them, then tick them.`, open.map((l) => l.trim()));
    else if (done >= 7) add(G, "PASS", `Build checklist ticked (${done} items)`);
    else add(G, "FAIL", "STRUQ.md has no Build checklist: copy it from SKILL.md and tick each step as you finish it.");
    const need = ["Palette", "Type", "Images", "Order"].filter((k) => !new RegExp(`^${k}:\\s*\\S`, "mi").test(plan));
    if (need.length) add(G, "FAIL", `STRUQ.md does not record: ${need.map((k) => `${k}:`).join(", ")} (SKILL.md, the plan).`);
    else add(G, "PASS", "Direction and order recorded (palette, type, images, order)");
  }
}

/* -------------------------------------------------------------------- HERO */
{
  const G = "HERO";
  const heroBlock = usesKind("heroes") || usedBlocks.has("showpieces/hero-opener");
  const noFit = /imageFit[^=]*=\s*"none"/.test(read("lib/struq-images.ts") + read("src/lib/struq-images.ts"));
  if (heroBlock) {
    add(G, "PASS", "A hero block opens the page");
    const heroUse = own.flatMap((f) => [...f.text.matchAll(/<(Hero[A-Z]\w*)\b[^>]*?\/?>/gs)].map((m) => ({ f, tag: m[0] })));
    const bare = noFit ? [] : heroUse.filter(({ tag }) => /<Hero(Framed|Split|Index|Still|Poster)\b/.test(tag) && !/\bimages?=\{|\bimage=\{/.test(tag));
    if (bare.length) add(G, "FAIL", "A photo hero without its photo: pass image={images.hero[0]} (or the client's photo).", bare.map(({ f }) => f.rel));
  } else {
    // A hand-built hero: a photo in it and a display line at poster size.
    const heroFile = own.find((f) => /<h1\b|<SplitHeadline\b/.test(f.text));
    if (!heroFile) add(G, "FAIL", "No hero: open the page with a hero block (blocks/CATALOG.md, Heroes).");
    else {
      const at = heroFile.text.search(/<h1\b|<SplitHeadline\b/);
      const slice = heroFile.text.slice(Math.max(0, heroFile.text.lastIndexOf("<section", at)), heroFile.text.indexOf("</section>", at) + 1 || undefined);
      if (!noFit && !/images\.hero\b|<MediaFrame\b|\bimage=\{/.test(slice)) add(G, "FAIL", "Hero without a photo: a hand-built hero shows images.hero[0] (or the client's photo). Or use a hero block.", [heroFile.rel]);
      const vw = [...(slice.match(/<(?:h1|SplitHeadline)\b[^>]*>/)?.[0] ?? "").matchAll(/text-\[(\d+(?:\.\d+)?)vw\]/g)].map((m) => Number(m[1]));
      if (!vw.length || Math.max(...vw) < 10) add(G, "FAIL", "Hand-built hero line under 10vw: set it at 12 to 20vw, or use a hero block.", [heroFile.rel]);
      else add(G, "PASS", "The hand-built hero line runs at poster size");
    }
  }
  if (usesKind("headers") || own.some((f) => /data-wordmark/.test(f.text))) add(G, "PASS", "A header with the wordmark");
  else add(G, "FAIL", "No header: use header-bar or menu-curtain, or mark your own header's name data-wordmark.");
  if (usesKind("footers") || usedBlocks.has("showpieces/wordmark-finale")) add(G, "PASS", "A designed footer block closes the page");
  else add(G, "WARN", "No footer block: close with footer-reveal, footer-contact or wordmark-finale, or design your own as hard as the hero.");

  const scenes = own.filter((f) => !f.rel.endsWith(".css")).reduce((n, f) => n + (f.text.match(/\bscene-(inverse|field)\b/g) ?? []).length, 0);
  if (scenes === 0) add(G, "FAIL", "No contrast scene: wrap one section in scene-inverse or scene-field, so the page does not stay on one ground.");
  else if (scenes > 2) add(G, "FAIL", `${scenes} contrast scenes: one, at most two, or the contrast stops being a moment.`);
  else add(G, "PASS", `${scenes} contrast scene${scenes > 1 ? "s" : ""}`);

  const geometry = hits(/new\s+THREE\.(Box|Cylinder|Torus|Sphere|Capsule|Cone|Tube|Lathe|Extrude|Tetrahedron|Octahedron|Icosahedron)Geometry\b|<(box|cylinder|torus|sphere|capsule|cone|tube|lathe|extrude)Geometry\b/, { scope: own });
  if (geometry.length) add(G, "FAIL", "Hand-built product geometry: never model the client's product from primitives. Show the product photography.", geometry);
  else add(G, "PASS", "No product modelled from primitives");
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
    const approval = log.match(/^## Step 2 Approval[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
    if (!approval || !/^Reply:\s*["“‘'].+["”’']\s*$/m.test(approval[1])) {
      add(G, "FAIL", 'No Step 2 Approval entry with the user\'s own reply. The build request is not the approval: stop once, ask "Akkoord? Heb je een logo, foto\'s of echte cijfers, stuur ze nu.", then log the answer word for word: node <skill-dir>/scripts/log.mjs "Step 2 Approval" "Asked: Akkoord? ..." "Reply: \"<their words>\"".');
    } else add(G, "PASS", "The approval stop is logged with the user's reply");
    if (missing.length) add(G, "FAIL", `STRUQ-LOG.md has no entry for ticked step(s) ${missing.join(", ")}. Add one per step with log.mjs: what was done and why.`);
    else add(G, "PASS", `STRUQ-LOG.md has ${entries} entries, one or more for every ticked step`);
  }
}

/* ------------------------------------------------------------------ REPORT */
const order = ["IMAGES", "TELLS", "MOTION", "HERO", "TYPE", "PLAN", "LOG"];
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
