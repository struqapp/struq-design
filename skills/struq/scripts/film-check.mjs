// blocks/film/film-check.mjs
//
// The film check: is a page built from Struq blocks one film or a showreel? It reads the treatment in STRUQ.md, finds
// the blocks in the site's own source, resolves each block's film fields for the variant it uses, and holds the page
// to the film grammar's budgets. Counts and fixes, never a score.
//
// `planCheck` holds the same budgets earlier, on the storyboard alone, so a plan that breaks them is refused before a
// single block is installed. Both run one shared set of rules, so the two cannot drift.
//
// A plain ES module with no imports at all: it is copied as is into the public skill and served as a file by the MCP,
// so it has to run on bare Node 18 wherever it lands.

/** One entry per rule: FAIL breaks the film, WARN bends it. `fix` tells an agent what to change. */
export const FILM_RULES = [
  {
    id: 'no-treatment',
    severity: 'fail',
    title: 'The plan carries a treatment',
    fix: 'Write the treatment head in STRUQ.md: Idea, Language, Motif, Lexicon, Centerpiece, Tone arc and a numbered Storyboard with one line per scene.',
  },
  {
    id: 'uncast-slot',
    severity: 'fail',
    title: 'Every scene is cast',
    fix: 'Replace every <cast: ...> and <loud|quiet> that blocks.mjs arc printed with one pick and its reason after "because", chosen from the Idea and the Motif, and delete the options list.',
  },
  {
    id: 'no-unlike',
    severity: 'warn',
    title: 'The plan says what it is unlike',
    fix: 'Add an Unlike: line under the Idea: the likeliest site for this brief, and Struq\'s own reflex (a framed photo with the name beside it, growing to full screen), then what this site does instead. Cast the Opening and the Centerpiece against it.',
  },
  {
    id: 'one-centerpiece',
    severity: 'fail',
    title: 'Exactly one centerpiece',
    fix: 'Keep one centerpiece block on the page and replace the others with quieter blocks or own scenes, or add one if there is none.',
  },
  {
    id: 'no-pin-after-centerpiece',
    severity: 'fail',
    title: 'No pin after the centerpiece',
    fix: 'Move each pinned block before the centerpiece, or pick a variant of it that does not pin.',
  },
  {
    id: 'frames-one-language',
    severity: 'fail',
    title: "Every framed block speaks the plan's language",
    fix: "Swap each listed block for the variant or block whose home is the plan's Language.",
  },
  {
    id: 'one-clock',
    severity: 'fail',
    title: 'At most one live clock',
    fix: 'Keep one live clock: leave out the prop that turns the others on (clock, or timeZone on wordmark-finale); every clock is off without it.',
  },
  {
    id: 'one-marquee',
    severity: 'fail',
    title: 'At most one marquee',
    fix: 'Keep one marquee band on the page and pick a variant or block without one for the others.',
  },
  {
    id: 'pinned-screens',
    severity: 'fail',
    title: 'At most 4.5 pinned screens, at most 1.5 in the opening',
    fix: 'Pick variants that do not pin, or pin shorter, until the page holds 4.5 screens or fewer and the opening 1.5 or fewer.',
  },
  {
    id: 'transition-needs-routes',
    severity: 'fail',
    title: 'A page transition needs more than one route',
    fix: 'Remove the page transition: a site with one route never navigates, so the preloader alone frames the arrival.',
  },
  {
    id: 'centerpiece-is-planned',
    severity: 'fail',
    title: 'The planned centerpiece is the one on the page',
    fix: "Make the plan's Centerpiece line name the centerpiece block on the page, or put the planned one on the page.",
  },
  {
    id: 'scene-count',
    severity: 'fail',
    title: 'The storyboard has seven to nine scenes (plan check only)',
    fix: 'Write seven to nine numbered storyboard lines: merge scenes that say the same thing, or add a quiet scene where the film needs a breath.',
  },
  {
    id: 'unknown-block',
    severity: 'fail',
    title: 'Every block the storyboard names is in the catalogue (plan check only)',
    fix: 'Name a block slug and variant exactly as the catalogue lists them, or write the scene as an own scene.',
  },
  {
    id: 'loud-adjacent',
    severity: 'warn',
    title: 'No two loud scenes side by side',
    fix: 'Put a quiet scene (energy 1 or less) between the two, or pick a quieter variant for one of them.',
  },
  {
    id: 'quiet-share',
    severity: 'warn',
    title: 'At least 40 percent of the scenes are quiet',
    fix: 'Swap loud scenes for quiet variants or own scenes until at least 40 percent of the scenes have energy 1 or less.',
  },
  {
    id: 'quiet-is-quiet',
    severity: 'warn',
    title: 'A scene tagged quiet names a quiet block (plan check only)',
    fix: 'Pick the quieter variant the detail names, write the scene as an own scene, or tag it loud and keep a quiet scene beside it.',
  },
  {
    id: 'full-bleed-reveals',
    severity: 'warn',
    title: 'At most two full-bleed reveals',
    fix: 'Keep two full-bleed reveals at most and pick variants that hold the photo in a frame for the rest.',
  },
  {
    id: 'foreign-metaphor',
    severity: 'warn',
    title: "No metaphor from outside the client's world",
    fix: "Fill the block's words, labels and counters from the plan's Lexicon, or pick a block without a metaphor.",
  },
  {
    id: 'one-motif',
    severity: 'warn',
    title: 'One motif on the page',
    fix: "Pick a variant or block whose motif is the plan's Motif or neutral.",
  },
  {
    id: 'storyboard-matches-page',
    severity: 'warn',
    title: 'The page follows the storyboard',
    fix: 'Build the storyboard\'s blocks in its order, or rewrite the storyboard to match the page that was built.',
  },
  {
    id: 'own-scene-unmarked',
    severity: 'warn',
    title: 'Every quiet own scene on the storyboard is marked on the page',
    fix: "Build the quiet scenes with the kit's Statement, PhotoText, Rows and Close, or put data-scene=\"<name>\" (and data-energy when it is not 1) on the root of each own scene, so the check can see it.",
  },
  {
    id: 'easing-values',
    severity: 'warn',
    title: 'At most two cubic-bezier curves',
    fix: 'Use at most two cubic-bezier curves in your own files, or the eases the blocks already carry.',
  },
];

const RULE = new Map(FILM_RULES.map((rule, order) => [rule.id, { ...rule, order }]));

const FIELDS = ['role', 'home', 'motif', 'metaphor', 'energy', 'pins', 'scroll', 'fullBleed', 'interactions', 'clockProp'];

/**
 * Interactions that only run when the page passes a prop. The catalogue tags the block with the interaction it can
 * have and names the prop that turns its clock on (`clockProp`: `clock`, or `timeZone` for wordmark-finale). This
 * table is the fallback for a catalogue from before that field.
 */
const PROP_GATED = { 'wordmark-finale': { clock: 'timeZone' } };

/**
 * The kit's composed quiet scenes. On a page they count only when imported from a path ending in kit/quiet or
 * kit/quiet/<Name>; on a storyboard their name stands where a block's slug would.
 */
const KIT_SCENES = ['Statement', 'PhotoText', 'Rows', 'Close'];
const KIT_NAME = /^[^A-Za-z0-9]*(Statement|PhotoText|Rows|Close)(?![A-Za-z0-9-])/;

const PINNED_CAP = 4.5;
const OPENING_CAP = 1.5;

// ---------------------------------------------------------------------------------------------------------------------
// The catalogue

function pascal(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Index the catalogue by slug. An entry with a string `variant` is a flattened entry (one row per block and variant);
 * any other entry is the block itself, whose base values describe its default variant.
 */
function indexCatalog(catalog) {
  const index = new Map();
  for (const entry of Array.isArray(catalog) ? catalog : []) {
    if (!entry || typeof entry !== 'object' || typeof entry.slug !== 'string' || !entry.slug) continue;
    let item = index.get(entry.slug);
    if (!item) {
      item = { slug: entry.slug, base: null, flat: new Map() };
      index.set(entry.slug, item);
    }
    if (typeof entry.variant === 'string') item.flat.set(entry.variant, entry);
    else item.base = entry;
  }
  return index;
}

function variantIds(item) {
  const listed = item.base && Array.isArray(item.base.variants) ? item.base.variants : [];
  const ids = listed.map((variant) => variant && variant.id).filter((id) => typeof id === 'string');
  for (const id of item.flat.keys()) if (!ids.includes(id)) ids.push(id);
  return ids;
}

/** A block's effective film fields for one variant: the base, then `byVariant`, then any flattened values on top. */
function resolveItem(item, variant) {
  const ids = variantIds(item);
  const given = typeof variant === 'string' && variant ? variant : null;
  const id = given && ids.includes(given) ? given : ids[0];
  const base = item.base || (id !== undefined && item.flat.get(id)) || {};
  const layers = [base];
  if (id !== undefined) {
    layers.push(base.byVariant && typeof base.byVariant === 'object' ? base.byVariant[id] : undefined);
    layers.push(Array.isArray(base.variants) ? base.variants.find((entry) => entry && entry.id === id) : undefined);
    layers.push(item.flat.get(id));
  }
  const film = {};
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') continue;
    for (const field of FIELDS) {
      if (Object.prototype.hasOwnProperty.call(layer, field) && layer[field] !== undefined) film[field] = layer[field];
    }
  }
  const kind = base.kind !== undefined ? base.kind : (item.flat.get(id) || {}).kind;
  return {
    slug: item.slug,
    variant: given || (id !== undefined ? id : null),
    kind: typeof kind === 'string' ? kind : null,
    role: typeof film.role === 'string' ? film.role : null,
    home: typeof film.home === 'string' ? film.home : null,
    motif: typeof film.motif === 'string' ? film.motif : null,
    metaphor: typeof film.metaphor === 'string' && film.metaphor ? film.metaphor : null,
    energy: typeof film.energy === 'number' ? film.energy : 0,
    pins: film.pins === true,
    scroll: typeof film.scroll === 'number' ? film.scroll : 0,
    fullBleed: film.fullBleed === true,
    interactions: Array.isArray(film.interactions) ? film.interactions.slice() : [],
    clockProp: typeof film.clockProp === 'string' && film.clockProp ? film.clockProp : null,
  };
}

/** The effective film fields of one block in one variant (the default variant when none is given). */
export function resolveBlock(catalog, slug, variant) {
  const item = indexCatalog(catalog).get(slug);
  return item ? resolveItem(item, variant) : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The treatment

const KEY_LINE = /^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/;

function firstWord(value) {
  const match = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*/i.exec(value || '');
  return match ? match[0].toLowerCase() : null;
}

/**
 * The treatment head of STRUQ.md: the Language, Motif and Centerpiece as their first word, the Lexicon as written,
 * and the Storyboard as the text of its numbered lines (null when the plan has no Storyboard line).
 */
export function readTreatment(plan) {
  const raw = (typeof plan === 'string' ? plan : '').split(/\r?\n/);
  const lines = raw.map((line) => line.replace(/\*\*|__/g, '').trim());
  const fields = new Map();
  let storyboardAt = -1;
  lines.forEach((line, at) => {
    const match = KEY_LINE.exec(line);
    if (!match) return;
    const key = match[1].trim().toLowerCase();
    if (fields.has(key)) return;
    fields.set(key, match[2].trim());
    if (key === 'storyboard') storyboardAt = at;
  });
  let storyboard = null;
  if (storyboardAt >= 0) {
    storyboard = [];
    for (let at = storyboardAt + 1; at < lines.length; at++) {
      const line = lines[at];
      if (!line) continue;
      const scene = /^\d+[.)]\s+(.*)$/.exec(line);
      if (scene) {
        storyboard.push(scene[1]);
        continue;
      }
      // An unindented key line or a heading ends the storyboard; anything else is a scene's continuation.
      if (line.startsWith('#') || (/^[A-Za-z]/.test(raw[at]) && KEY_LINE.test(line))) break;
    }
  }
  return {
    language: fields.has('language') ? firstWord(fields.get('language')) : null,
    motif: fields.has('motif') ? firstWord(fields.get('motif')) : null,
    centerpiece: fields.has('centerpiece') ? firstWord(fields.get('centerpiece')) : null,
    lexicon: fields.has('lexicon') ? fields.get('lexicon') || null : null,
    hasLanguage: fields.has('language'),
    storyboard,
  };
}

const SLUG_TOKEN = /(?<![A-Za-z0-9-])([a-z0-9]+(?:-[a-z0-9]+)*)(?::([a-z0-9]+(?:-[a-z0-9]+)*))?(?![A-Za-z0-9-])/g;

/** The kit quiet scene a line names first after its `(tone)` tag, such as `Statement`, or null. */
function kitAfterTag(head) {
  const tag = TONE_TAG.exec(head);
  if (!tag) return null;
  const match = KIT_NAME.exec(head.slice(tag.index + tag[0].length));
  return match ? match[1] : null;
}

/**
 * One storyboard line: an own scene, a kit quiet scene named after its `(tone)` tag, or the block it names (looked
 * for after the `(tone)` group first).
 */
function readScene(text, index) {
  const head = text.split('|')[0];
  const own = /\bown scene\b/i.test(head);
  if (own) return { own, kit: null, item: null, variant: null };
  const kit = kitAfterTag(head);
  if (kit) return { own, kit, item: null, variant: null };
  const close = head.lastIndexOf(')');
  const zones = close >= 0 ? [head.slice(close + 1), head] : [head];
  for (const zone of zones) {
    for (const match of zone.matchAll(SLUG_TOKEN)) {
      const item = index.get(match[1]);
      if (item) return { own, kit: null, item, variant: match[2] || null };
    }
  }
  return { own, kit: null, item: null, variant: null };
}

const TONE_TAG = /\(([^)]*)\)/;
const OWN_SCENE = /^[^A-Za-z0-9]*own scene\b/i;
const FOOTER = /\bfooter\s*:([^|]*)/i;
/** A clock asked for in words: a timeZone, or the word clock or klok (never a variant id such as footer-contact:clock). */
const CLOCK_ASK = /timezone|(?<![:\w-])(?:clock|klok)\b/gi;
const NEGATED = /\b(?:zonder|geen|no|not|without)\s+(?:(?:a|an|the|een|de)\s+)?$/i;

/** True when the line asks for a clock, and not as "zonder timeZone", "geen klok" or "no clock". */
function asksClock(text) {
  for (const match of text.matchAll(CLOCK_ASK)) if (!NEGATED.test(text.slice(0, match.index))) return true;
  return false;
}

/**
 * One storyboard line as the plan check reads it, strictly: the scene's name before the `(tone)` tag, the tone, and
 * the first slug after the tag (or `own scene`, or a kit quiet scene such as `Statement`); the block after `footer:` comes along as a second block. A line with
 * no tag falls back to the first slug the catalogue knows, as the page check reads it.
 */
function readPlanLine(text) {
  const head = text.split('|')[0];
  const tag = TONE_TAG.exec(head);
  const name = (tag ? head.slice(0, tag.index) : '').trim() || null;
  const tone = tag ? tag[1].trim().toLowerCase() : null;
  const after = tag ? head.slice(tag.index + tag[0].length) : head;
  const own = OWN_SCENE.test(after);
  const kitMatch = own ? null : KIT_NAME.exec(after);
  const kit = kitMatch ? kitMatch[1] : null;
  let block = null;
  if (!own && !kit) {
    const match = after.match(new RegExp(SLUG_TOKEN.source));
    if (match) block = { slug: match[1], variant: match[2] || null };
  }
  let footer = null;
  const footerAt = FOOTER.exec(text);
  if (footerAt) {
    const match = footerAt[1].match(new RegExp(SLUG_TOKEN.source));
    if (match) footer = { slug: match[1], variant: match[2] || null };
  }
  return { name, tone, tagged: Boolean(tag), own, kit, block, footer, clock: asksClock(text) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The page

const PAGE_FILE = /(^|\/)page\.(tsx|jsx|js)$/;
const LAYOUT_FILE = /(^|\/)layout\.(tsx|jsx|js)$/;
const ROOT_PAGE = /(^|\/)app\/page\.(tsx|jsx|js)$/;
const ROOT_LAYOUT = /(^|\/)app\/layout\.(tsx|jsx|js)$/;
const SCRIPT_FILE = /\.(tsx|jsx|ts|js|mjs)$/;
const STRUQ_COPY = /(^|\/)components\/struq\//;

/** A path without its route groups, so app/(site)/page.tsx reads as the root page. */
function routePath(path) {
  return path.replace(/\/\([^/]*\)(?=\/)/g, '');
}

/** The site's own files in page order: root layouts (outermost first), the root page, then shared non-route files. */
function orderFiles(files) {
  const own = (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file.text === 'string')
    .map((file) => ({ path: String(file.path || '').replace(/\\/g, '/').replace(/^\.\//, ''), text: file.text }))
    .filter((file) => !STRUQ_COPY.test(file.path));
  const layouts = own
    .filter((file) => ROOT_LAYOUT.test(routePath(file.path)))
    .sort((a, b) => a.path.length - b.path.length);
  const pages = own.filter((file) => ROOT_PAGE.test(routePath(file.path)));
  const shared = own.filter((file) => !PAGE_FILE.test(file.path) && !LAYOUT_FILE.test(file.path));
  return {
    own,
    ordered: [...layouts, ...pages, ...shared],
    routes: own.filter((file) => PAGE_FILE.test(file.path)).length,
  };
}

/** Block comments anywhere and line comments that open a line; a page that comments a block out does not use it. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, '');
}

/** The index just past the `>` that closes a JSX opening tag, skipping strings and `{...}` expressions. */
function tagEnd(source, from) {
  let depth = 0;
  let quote = null;
  for (let at = from; at < source.length; at++) {
    const char = source[at];
    if (quote) {
      if (char === '\\') at++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth++;
    else if (char === '}') depth = Math.max(0, depth - 1);
    else if (char === '>' && depth === 0) return at + 1;
  }
  return source.length;
}

const VARIANT_PROP = /(?:^|\s)variant\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\})/;
const JSX_TAG = /(?<![\w$.])<([A-Z][A-Za-z0-9]*)(?=[\s/>])/g;
const PROP_START = /[A-Za-z_$]/;
const PROP_CHAR = /[\w$-]/;

/** The end of a quoted string that starts at `from`. */
function stringEnd(text, from) {
  const quote = text[from];
  for (let at = from + 1; at < text.length; at++) {
    if (text[at] === '\\') at++;
    else if (text[at] === quote) return at + 1;
  }
  return text.length;
}

/** The end of a `{...}` group that starts at `from`, strings inside it skipped. */
function braceEnd(text, from) {
  let depth = 0;
  for (let at = from; at < text.length; at++) {
    const char = text[at];
    if (char === '"' || char === "'" || char === '`') at = stringEnd(text, at) - 1;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return at + 1;
  }
  return text.length;
}

/**
 * The props a tag passes: `name=...` and a bare `name` (true). `name={false}` is left out, and a spread cannot be
 * read, so it adds nothing. Words inside string and expression values are never read as props.
 */
function propNames(attributes) {
  const names = new Set();
  let at = 0;
  while (at < attributes.length) {
    const char = attributes[at];
    if (char === '{') {
      at = braceEnd(attributes, at);
      continue;
    }
    if (!PROP_START.test(char)) {
      at++;
      continue;
    }
    let end = at;
    while (end < attributes.length && PROP_CHAR.test(attributes[end])) end++;
    const name = attributes.slice(at, end);
    at = end;
    while (at < attributes.length && /\s/.test(attributes[at])) at++;
    if (attributes[at] !== '=') {
      names.add(name);
      continue;
    }
    at++;
    while (at < attributes.length && /\s/.test(attributes[at])) at++;
    const from = at;
    if (attributes[at] === '"' || attributes[at] === "'") at = stringEnd(attributes, at);
    else if (attributes[at] === '{') at = braceEnd(attributes, at);
    if (!/^\{\s*false\s*\}$/.test(attributes.slice(from, at))) names.add(name);
  }
  return names;
}

function readVariant(attributes) {
  const match = VARIANT_PROP.exec(attributes);
  if (!match) return null;
  const value = match.slice(1).find((group) => group !== undefined);
  return value ? value.trim() : null;
}

const IMPORT_FROM = /\bimport\s+(?!type\b)([\w$]+\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g;
const KIT_PATH = /(?:^|\/)kit\/quiet(?:\/(Statement|PhotoText|Rows|Close))?(?:\/index)?(?:\.(?:tsx|ts|jsx|js))?$/;
const ANY_TAG = /(?<![\w$.])<([A-Za-z][\w.]*)(?=[\s/>])/g;
const DATA_SCENE = /(?:^|\s)data-scene\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`|([^}]*))\s*\})/;
const DATA_ENERGY = /(?:^|\s)data-energy\s*=\s*(?:"\s*(\d+(?:\.\d+)?)\s*"|'\s*(\d+(?:\.\d+)?)\s*'|\{\s*["'`]?\s*(\d+(?:\.\d+)?)\s*["'`]?\s*\})/;

/**
 * The local names a file gives the kit's quiet scenes, mapped to the kit name: a named import from a path ending in
 * kit/quiet or kit/quiet/<Name> (aliases followed), or a default import from kit/quiet/<Name>.
 */
function kitImports(source) {
  const local = new Map();
  for (const match of source.matchAll(IMPORT_FROM)) {
    const path = KIT_PATH.exec(match[3]);
    if (!path) continue;
    const fallback = match[1] ? match[1].replace(/[\s,]/g, '') : '';
    if (fallback && path[1]) local.set(fallback, path[1]);
    for (const part of (match[2] || '').split(',')) {
      const names = /^\s*(?:type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/.exec(part);
      if (!names || /^\s*type\s/.test(part)) continue;
      const kit = names[1];
      if (KIT_SCENES.includes(kit) && (!path[1] || path[1] === kit)) local.set(names[2] || kit, kit);
    }
  }
  return local;
}

function firstGroup(match) {
  return match ? match.slice(1).find((group) => group !== undefined) : undefined;
}

/**
 * Every scene tag in the ordered files, in source order: block tags, the kit's quiet scenes where the file imports
 * them from the kit, and any element that marks itself with `data-scene`. Other components are ignored.
 */
function findBlocks(ordered, components) {
  const found = [];
  for (const file of ordered) {
    if (!SCRIPT_FILE.test(file.path)) continue;
    const source = stripComments(file.text);
    const kits = kitImports(source);
    ANY_TAG.lastIndex = 0;
    let match;
    while ((match = ANY_TAG.exec(source))) {
      const name = match[1];
      const item = /^[A-Z]/.test(name) ? components.get(name) : undefined;
      const kit = item ? null : kits.get(name) || null;
      const start = match.index + match[0].length;
      if (item || kit) {
        const end = tagEnd(source, start);
        const attributes = source.slice(start, end);
        if (item) found.push({ item, file: file.path, variant: readVariant(attributes), props: propNames(attributes) });
        else found.push({ marked: { slug: `quiet:${kit}`, energy: 1 }, file: file.path });
        ANY_TAG.lastIndex = end;
        continue;
      }
      // Any other tag is a scene only when it carries data-scene; otherwise the scan goes on inside it.
      const end = tagEnd(source, start);
      const attributes = source.slice(start, end);
      const scene = DATA_SCENE.exec(attributes);
      if (!scene) continue;
      const value = (firstGroup(scene) || '').trim() || 'scene';
      const energy = Number(firstGroup(DATA_ENERGY.exec(attributes)) ?? 1);
      found.push({ marked: { slug: `own:${value}`, energy: Number.isFinite(energy) ? energy : 1 }, file: file.path });
      ANY_TAG.lastIndex = end;
    }
  }
  return found;
}

/** A scene the page marks itself (a kit quiet scene or a `data-scene` element), shaped like a resolved block. */
function markedScene({ slug, energy }) {
  return {
    slug,
    variant: null,
    kind: 'own-scene',
    role: energy <= 1 ? 'quiet' : 'scene',
    home: null,
    motif: null,
    metaphor: null,
    energy,
    pins: false,
    scroll: 0,
    fullBleed: false,
    interactions: [],
    clockProp: null,
    own: true,
    marked: true,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The check

function label(block) {
  if (block.own && block.slug) return block.slug;
  if (block.own) return block.name ? `own scene (${block.name})` : 'own scene';
  return block.variant ? `${block.slug}:${block.variant}` : block.slug;
}

function list(blocks) {
  return blocks.map(label).join(', ');
}

function screens(value) {
  return String(Math.round(value * 100) / 100);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** cubic-bezier(.16, 1, .3, 1) and cubic-bezier(0.16,1,0.3,1) are one curve. */
function curveKey(args) {
  return args
    .split(',')
    .map((part) => {
      const value = part.trim();
      return value !== '' && Number.isFinite(Number(value)) ? String(Number(value)) : value;
    })
    .join(',');
}

/** An `add(id, count, detail)` that pushes a finding with the rule's severity and fix. */
function collector(findings) {
  return (id, count, detail) => {
    const rule = RULE.get(id);
    findings.push({ id, severity: rule.severity, count, detail, fix: rule.fix });
  };
}

function missingTreatment(treatment) {
  const missing = [!treatment.hasLanguage && 'Language:', treatment.storyboard === null && 'Storyboard:'].filter(Boolean);
  return `The plan has no ${missing.join(' and no ')} line, so the plan-dependent rules were skipped.`;
}

/** Drop the interactions that only run when a prop is passed and the prop is not among `props`. */
function gateInteractions(block, props) {
  const gates = { ...(PROP_GATED[block.slug] || {}) };
  if (block.clockProp) gates.clock = block.clockProp;
  block.interactions = block.interactions.filter((interaction) => !gates[interaction] || props.has(gates[interaction]));
  return block;
}

/**
 * The budgets that hold for a page and a storyboard alike. `used` is every block in order (frames included, and own
 * scenes in a storyboard), `scenes` the ones whose role is not a frame, `extraOwn` own scenes known only from the
 * storyboard (the built page cannot see them), `where` names what was read in the details: page or storyboard.
 */
function holdBudgets(add, { used, scenes, extraOwn, treatment, planned, routes, where }) {
  // FAIL

  const centerpieces = used.filter((block) => block.role === 'centerpiece');
  if (centerpieces.length === 0) add('one-centerpiece', 1, `No centerpiece on the ${where}.`);
  else if (centerpieces.length > 1) {
    add('one-centerpiece', centerpieces.length, `${plural(centerpieces.length, 'centerpiece')}: ${list(centerpieces)}.`);
  }

  if (centerpieces.length) {
    const after = used.slice(used.indexOf(centerpieces[0]) + 1).filter((block) => block.pins);
    if (after.length) {
      add('no-pin-after-centerpiece', after.length, `Pinned after ${label(centerpieces[0])}: ${list(after)}.`);
    }
  }

  if (planned) {
    const off = used.filter((block) => block.home && block.home !== treatment.language);
    if (off.length) {
      const parts = off.map((block) => `${label(block)} is ${block.home}`).join(', ');
      add('frames-one-language', off.length, `The plan's Language is ${treatment.language || 'empty'}; ${parts}.`);
    }
  }

  for (const [id, interaction] of [['one-clock', 'clock'], ['one-marquee', 'marquee']]) {
    const live = used.filter((block) => block.interactions.includes(interaction));
    if (live.length > 1) add(id, live.length, `${plural(live.length, interaction)}: ${list(live)}.`);
  }

  {
    const pinned = used.filter((block) => block.scroll > 0);
    const total = pinned.reduce((sum, block) => sum + block.scroll, 0);
    const problems = [];
    if (total > PINNED_CAP + 1e-9) {
      problems.push(`${screens(total)} pinned screens in all, the cap is ${PINNED_CAP} (${list(pinned)})`);
    }
    for (const block of used) {
      if (block.role === 'opening' && block.scroll > OPENING_CAP + 1e-9) {
        problems.push(`the opening ${label(block)} holds ${screens(block.scroll)} screens, the cap is ${OPENING_CAP}`);
      }
    }
    if (problems.length) add('pinned-screens', problems.length, `${problems.join('; ')}.`);
  }

  {
    const transitions = used.filter((block) =>
      block.kind ? block.kind === 'page-transition' : block.slug.startsWith('page-transition'),
    );
    if (transitions.length && routes <= 1) {
      add('transition-needs-routes', transitions.length, `${list(transitions)} on a site with ${plural(routes, 'route')}.`);
    }
  }

  if (planned) {
    const named = treatment.centerpiece;
    if (!named) add('centerpiece-is-planned', 1, 'The plan has no Centerpiece line.');
    else if (!centerpieces.some((block) => block.slug === named)) {
      const onPage = centerpieces.length ? `the ${where} has ${list(centerpieces)}` : `it is not on the ${where}`;
      add('centerpiece-is-planned', 1, `The plan names ${named}; ${onPage}.`);
    }
  }

  // WARN

  {
    const pairs = [];
    for (let at = 0; at + 1 < scenes.length; at++) {
      if (scenes[at].energy >= 2 && scenes[at + 1].energy >= 2) {
        pairs.push(`${label(scenes[at])} (${scenes[at].energy}) then ${label(scenes[at + 1])} (${scenes[at + 1].energy})`);
      }
    }
    if (pairs.length) add('loud-adjacent', pairs.length, `${plural(pairs.length, 'loud pair')}: ${pairs.join('; ')}.`);
  }

  {
    const ownScenes = scenes.filter((block) => block.own).length + extraOwn;
    const total = scenes.length + extraOwn;
    const quiet = scenes.filter((block) => block.energy <= 1).length + extraOwn;
    if (total > 0 && quiet * 10 < total * 4) {
      const counted = ownScenes ? `, ${plural(ownScenes, 'own scene')} counted as quiet` : '';
      add(
        'quiet-share',
        Math.ceil((total * 4) / 10) - quiet,
        `${quiet} of ${total} scenes are quiet (energy 1 or less${counted}); 40 percent needs ${Math.ceil((total * 4) / 10)}.`,
      );
    }
  }

  {
    const reveals = used.filter((block) => block.fullBleed);
    if (reveals.length > 2) add('full-bleed-reveals', reveals.length, `${plural(reveals.length, 'full-bleed reveal')}: ${list(reveals)}.`);
  }

  {
    const carried = used.filter((block) => block.metaphor);
    if (carried.length) {
      const parts = carried.map((block) => `${label(block)} carries ${block.metaphor}`).join(', ');
      add('foreign-metaphor', carried.length, `${parts}.`);
    }
  }

  if (planned) {
    const speaking = scenes.filter((block) => block.motif && block.motif !== 'neutral');
    if (treatment.motif) {
      const off = speaking.filter((block) => block.motif !== treatment.motif);
      if (off.length) {
        const parts = off.map((block) => `${label(block)} speaks ${block.motif}`).join(', ');
        add('one-motif', off.length, `The plan's Motif is ${treatment.motif}; ${parts}.`);
      }
    } else {
      const families = [...new Set(speaking.map((block) => block.motif))];
      if (families.length > 1) {
        add('one-motif', speaking.length, `The plan names no Motif and the scenes speak ${families.join(', ')}.`);
      }
    }
  }
}

/**
 * Check one site against the film grammar.
 * `plan` is the text of STRUQ.md, `files` the site's own source files (never components/struq/**), `catalog` the
 * block catalogue. Returns the findings in rule order and every block found on the page, in page order, with the
 * scenes the page marks itself between them: the kit's quiet scenes as `quiet:<Name>` (Statement, PhotoText, Rows,
 * Close, imported from kit/quiet) and any element with `data-scene="<name>"` as `own:<name>`, energy 1 unless its
 * `data-energy` says otherwise.
 */
export function filmCheck({ plan, files, catalog } = {}) {
  const index = indexCatalog(catalog);
  const components = new Map([...index.values()].map((item) => [pascal(item.slug), item]));
  const { own, ordered, routes } = orderFiles(files);

  const used = findBlocks(ordered, components).map(({ item, marked, file, variant, props }) => {
    const block = marked ? markedScene(marked) : gateInteractions(resolveItem(item, variant), props);
    block.file = file;
    return block;
  });
  const scenes = used.filter((block) => block.role && block.role !== 'frame');
  const markedOnPage = scenes.filter((block) => block.marked);

  const treatment = readTreatment(plan);
  const planned = treatment.hasLanguage && treatment.storyboard !== null;
  const storyboard = planned ? treatment.storyboard.map((line) => readScene(line, index)) : [];

  const findings = [];
  const add = collector(findings);
  if (!planned) add('no-treatment', 1, missingTreatment(treatment));
  // Own and kit scenes the storyboard plans but the page does not mark still count as quiet; marked ones are scenes.
  const plannedOwn = storyboard.filter((scene) => scene.own || scene.kit).length;
  const extraOwn = Math.max(0, plannedOwn - markedOnPage.length);
  holdBudgets(add, { used, scenes, extraOwn, treatment, planned, routes, where: 'page' });

  if (planned) {
    // A block or a kit scene must stand at its place; a plain own scene matches a marked scene there, and is passed
    // over when the page marks none (own-scene-unmarked says so).
    const story = [];
    for (const scene of storyboard) {
      if (scene.own) story.push({ key: 'own scene', any: true });
      else if (scene.kit) story.push({ key: `quiet:${scene.kit}`, any: false });
      else if (scene.item) {
        const block = resolveItem(scene.item, scene.variant);
        if (block.role && block.role !== 'frame') story.push({ key: block.slug, any: false });
      }
    }
    const page = scenes.map((block) => ({ key: block.slug, marked: block.marked === true }));
    let differ = 0;
    for (let s = 0, p = 0; s < story.length || p < page.length; ) {
      const want = story[s];
      const have = page[p];
      if (want && want.any && !(have && have.marked)) {
        s++;
        continue;
      }
      if (!want || !have || (!want.any && want.key !== have.key)) differ++;
      s++;
      p++;
    }
    if (differ) {
      add(
        'storyboard-matches-page',
        differ,
        `Storyboard scenes: ${story.map((scene) => scene.key).join(', ') || 'none'}. Page scenes: ${page.map((scene) => scene.key).join(', ') || 'none'}.`,
      );
    }

    if (plannedOwn > markedOnPage.length) {
      const shown = markedOnPage.length ? ` (${list(markedOnPage)})` : '';
      add(
        'own-scene-unmarked',
        plannedOwn - markedOnPage.length,
        `The storyboard has ${plural(plannedOwn, 'quiet own or kit scene')}; the page marks ${markedOnPage.length}${shown}.`,
      );
    }
  }

  {
    const curves = new Set();
    for (const file of own) {
      for (const match of file.text.matchAll(/cubic-bezier\(([^)]*)\)/gi)) curves.add(curveKey(match[1]));
    }
    if (curves.size > 2) {
      const parts = [...curves].map((curve) => `cubic-bezier(${curve})`).join(', ');
      add('easing-values', curves.size, `${plural(curves.size, 'distinct curve')}: ${parts}.`);
    }
  }

  findings.sort((a, b) => RULE.get(a.id).order - RULE.get(b.id).order);
  return {
    findings,
    scenes: used.map((block) => ({
      slug: block.slug,
      variant: block.variant,
      file: block.file,
      role: block.role,
      energy: block.energy,
      pins: block.pins,
      scroll: block.scroll,
    })),
  };
}

const SCENE_MIN = 7;
const SCENE_MAX = 9;

/** The quietest variant of a block with energy 1 or less, as `slug:variant`, or null when it has none. */
function quieterVariant(item) {
  const quiet = variantIds(item)
    .map((id) => resolveItem(item, id))
    .filter((block) => block.energy <= 1)
    .sort((a, b) => a.energy - b.energy);
  return quiet.length ? label(quiet[0]) : null;
}

/**
 * Check a storyboard before anything is built: the same budgets as `filmCheck`, read from the numbered Storyboard
 * lines of STRUQ.md alone. Each line gives the first block after its `(tone)` tag (or an own scene: quiet, energy 1,
 * no block; or a kit quiet scene, Statement, PhotoText, Rows or Close, read as `quiet:<Name>` with energy 1) and the
 * block after `footer:`. `routes` is the number of routes the site will have. Returns the findings
 * in rule order and the scenes the rules read, in storyboard order.
 */
export function planCheck({ plan, catalog, routes = 1 } = {}) {
  const index = indexCatalog(catalog);
  const treatment = readTreatment(plan);
  const findings = [];
  const add = collector(findings);
  const done = (used) => {
    findings.sort((a, b) => RULE.get(a.id).order - RULE.get(b.id).order);
    return {
      findings,
      scenes: used.map((block) => ({
        scene: block.scene,
        tone: block.tone,
        own: block.own === true,
        slug: block.slug,
        variant: block.variant,
        role: block.role,
        energy: block.energy,
        pins: block.pins,
        scroll: block.scroll,
      })),
    };
  };

  if (treatment.storyboard === null) {
    add('no-treatment', 1, missingTreatment(treatment));
    return done([]);
  }
  const planned = treatment.hasLanguage;
  if (!planned) add('no-treatment', 1, missingTreatment(treatment));

  const count = treatment.storyboard.length;
  if (count < SCENE_MIN || count > SCENE_MAX) {
    add('scene-count', 1, `The storyboard has ${plural(count, 'scene')}; it needs ${SCENE_MIN} to ${SCENE_MAX}.`);
  }
  // blocks.mjs arc prints no picks on purpose (2026-11-14); a slot left as printed was never cast.
  const uncast = treatment.storyboard
    .map((text, at) => (/<cast\b|<loud\|quiet>/i.test(text) ? at + 1 : 0))
    .filter(Boolean);
  if (uncast.length) add('uncast-slot', uncast.length, `Scene ${uncast.join(', ')} still ${uncast.length === 1 ? 'reads' : 'read'} as blocks.mjs arc printed ${uncast.length === 1 ? 'it' : 'them'}.`);
  if (!/^Unlike:\s*\S/m.test(String(plan ?? ''))) add('no-unlike', 1, 'The plan has no Unlike: line.');

  const used = [];
  const unknown = [];
  const loudQuiet = [];
  treatment.storyboard.forEach((text, at) => {
    const scene = at + 1;
    const line = readPlanLine(text);
    const where = `scene ${scene}${line.name ? ` (${line.name})` : ''}`;
    // A line that asks for a clock (a timeZone, clock or klok) passes whichever prop turns its block's clock on.
    const props = new Set(line.clock ? ['timeZone', 'clock'] : []);
    const place = (named) => {
      const item = index.get(named.slug);
      const shown = named.variant ? `${named.slug}:${named.variant}` : named.slug;
      if (!item) {
        unknown.push(`${where} names ${shown}, which is not a block`);
        return null;
      }
      if (named.variant && !variantIds(item).includes(named.variant)) {
        const ids = variantIds(item);
        const has = ids.length ? `its variants are ${ids.join(', ')}` : 'it has no variants';
        unknown.push(`${where} names ${shown}; ${has}`);
      }
      const block = gateInteractions(resolveItem(item, named.variant), props);
      Object.assign(block, { scene, tone: line.tone });
      used.push(block);
      return { item, block };
    };

    let main = null;
    if (!line.tagged) {
      // No tag: read the line the way the page check does and name nothing as unknown.
      const loose = readScene(text, index);
      if (loose.own) line.own = true;
      else if (loose.kit) line.kit = loose.kit;
      else if (loose.item) main = place({ slug: loose.item.slug, variant: loose.variant });
    } else if (!line.own && !line.kit) {
      if (line.block) main = place(line.block);
      else unknown.push(`${where} names no block and is not an own scene`);
    }
    if (line.kit) {
      // A kit quiet scene: a known own scene, composed from the kit, energy 1.
      used.push({
        ...markedScene({ slug: `quiet:${line.kit}`, energy: 1 }),
        scene,
        tone: line.tone,
        name: line.name,
        marked: false,
      });
    }
    if (line.own) {
      used.push({
        scene,
        tone: line.tone,
        own: true,
        name: line.name,
        slug: null,
        variant: null,
        kind: 'own-scene',
        role: 'scene',
        home: null,
        motif: null,
        metaphor: null,
        energy: 1,
        pins: false,
        scroll: 0,
        fullBleed: false,
        interactions: [],
      });
    }
    if (line.footer && !(main && main.block.slug === line.footer.slug)) place(line.footer);

    const tones = (line.tone || '').split(',').map((word) => word.trim());
    if (main && tones.includes('quiet') && main.block.energy >= 2) {
      const quieter = quieterVariant(main.item);
      const hint = quieter ? `, ${quieter} is quieter` : ', the block has no variant with energy 1 or less';
      loudQuiet.push(`${where} is tagged quiet and names ${label(main.block)} (energy ${main.block.energy})${hint}`);
    }
  });

  if (unknown.length) add('unknown-block', unknown.length, `${unknown.join('; ')}.`);
  if (loudQuiet.length) add('quiet-is-quiet', loudQuiet.length, `${loudQuiet.join('; ')}.`);

  const scenes = used.filter((block) => block.role && block.role !== 'frame');
  const sites = typeof routes === 'number' && Number.isFinite(routes) ? routes : 1;
  holdBudgets(add, { used, scenes, extraOwn: 0, treatment, planned, routes: sites, where: 'storyboard' });
  return done(used);
}
