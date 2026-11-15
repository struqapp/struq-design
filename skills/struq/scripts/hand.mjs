// blocks/film/hand.mjs
//
// The hand: what one site chooses its direction from. Proof runs of 2026-11-14 (struq-showcases, proof/phase-1) showed
// why it exists. With a pre-filled storyboard 11 of 12 sites opened the same way; naming the reflex only moved it to
// the next one. Dealing each site a random hand and holding its plan to it gave real variety while the agent still
// chooses. A hand is two of the three motion languages, three type pairings, four palettes (two light, two dark),
// five openings, five centerpieces and three lenses. A lens is where the idea starts looking: the round of 2026-11-15
// showed that asking for three ideas still gave each brief the same idea on every run, so the starting points are
// dealt too, and the plan's Idea line names the lens it came from.
//
// A hand has a short id, and the id is the whole state: the same id deals the same hand from the same pools, so the
// MCP (which keeps nothing between calls) and a check running on the client's machine both rebuild it from the
// `Hand: <id>` line in STRUQ.md. Each item is ranked by a hash of the id and the item's own name (rendezvous hashing)
// and the lowest ranks are dealt, so a block admitted or a palette added later changes a dealt hand only where the
// newcomer outranks a card in it, never the whole hand.
//
// `checkHand` holds a plan's Idea, Language, Palette, Type, Opening and Centerpiece lines to a hand: anything else is
// `off-draw`, except the client's own brand colours or faces, marked (brand), and a block or language the client
// named, marked (named).
//
// A plain ES module with no imports at all, like film-check.mjs: the skill copies it verbatim on release and the MCP
// serves it as a file, so it has to run on bare Node 18 wherever it lands.

/** The motion languages a hand deals from. */
export const HAND_LANGUAGES = ['weight', 'cut', 'curtain'];

/**
 * Where an idea can start looking. Each is a way into any client's world, never a style: the agent turns it on this
 * client and writes the point of view it finds there.
 */
export const HAND_LENSES = [
  { id: 'material', prompt: 'the stuff the work is made of, seen close enough to touch' },
  { id: 'hour', prompt: "one hour of the client's day, and what is true only then" },
  { id: 'first-minute', prompt: "the visitor's first minute with the thing itself" },
  { id: 'number', prompt: 'one number this trade lives by, and what it means to the visitor' },
  { id: 'tool', prompt: "the tool in the maker's hand and the mark it leaves" },
  { id: 'place', prompt: 'the street, room or city where the work happens' },
  { id: 'mistake', prompt: 'the mistake this client saves the visitor from' },
  { id: 'ritual', prompt: 'a gesture the trade repeats every day' },
  { id: 'before-after', prompt: 'the state of things before the work and after it' },
  { id: 'leftover', prompt: 'what is left when the work is done: offcuts, crumbs, receipts, rings on a table' },
  { id: 'scale', prompt: 'the work at a scale nobody sees it: one stitch, one bolt, the whole city' },
  { id: 'sound', prompt: 'what the work sounds like, carried by type and motion' },
  { id: 'season', prompt: 'how the work changes across a year' },
  { id: 'name', prompt: "the client's name taken apart and used as material" },
];

/** How many of each a hand holds. */
export const HAND_SIZE = { languages: 2, lightPalettes: 2, darkPalettes: 2, pairings: 3, openings: 5, centerpieces: 5, lenses: 3 };

const ID_LENGTH = 6;
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** True for a hand id: six lower-case letters and digits, without the look-alikes l, o, 0 and 1. */
export function isHandId(value) {
  return typeof value === 'string' && new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`).test(value);
}

/** A fresh hand id from a random source in [0, 1), Math.random by default. */
export function newHandId(random = Math.random) {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length) % ID_ALPHABET.length];
  return id;
}

/** The `Hand: <id>` line of a plan, or null. */
export function readHandId(plan) {
  const id = String(plan ?? '').match(/^Hand:\s*([a-z0-9]+)\s*$/m)?.[1] ?? null;
  return isHandId(id) ? id : null;
}

/**
 * The pools a hand deals from, out of the canon and the catalogue. Palettes and pairings marked `autoPick: false` are
 * kept for a brand that asks and never dealt; a palette says whether its ground is light. Openings and centerpieces
 * are the catalogue's blocks of that role with no home language (a block with a home is a frame of its language).
 *
 * @param {{ palettes: Array<{ id: string, light: boolean, autoPick?: boolean }>, pairings: Array<{ id: string, autoPick?: boolean }>, catalog: Array<{ slug: string, role?: string, home?: string | null }> }} input
 */
export function handPools({ palettes = [], pairings = [], catalog = [] } = {}) {
  const open = (list) => list.filter((entry) => entry.autoPick !== false);
  const role = (name) => catalog.filter((block) => block.role === name && !block.home).map((block) => block.slug);
  return {
    languages: [...HAND_LANGUAGES],
    lightPalettes: open(palettes).filter((p) => p.light).map((p) => p.id),
    darkPalettes: open(palettes).filter((p) => !p.light).map((p) => p.id),
    pairings: open(pairings).map((t) => t.id),
    openings: role('opening'),
    centerpieces: role('centerpiece'),
    lenses: HAND_LENSES.map((lens) => lens.id),
  };
}

/** A 53-bit hash of a string (cyrb53): spreads well enough to rank a few dozen names fairly. */
function hash(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** The n names of a pool that rank lowest for this id, in rank order (which is random, so it suggests no favourite). */
function deal(id, pool, name, n) {
  return [...new Set(pool)]
    .map((item) => [hash(`${id}:${name}:${item}`), item])
    .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1))
    .slice(0, n)
    .map(([, item]) => item);
}

/**
 * An opening that needs no photo: a WebGL background or hero-opener. Every hand holds one, so a site whose photo pack
 * shows nothing of the client can still open well (Roy, 2026-11-15: a type-led or WebGL first screen when no photo
 * fits, never an off-topic one).
 */
export const isPhotolessOpening = (slug) => slug.startsWith('background-') || slug === 'hero-opener';

/** The opening hand: the five that rank lowest for this id, the last swapped for the best photoless one if none is in. */
function openingsFor(id, pool) {
  const ranked = deal(id, pool, 'opening', pool.length);
  const hand = ranked.slice(0, HAND_SIZE.openings);
  if (hand.some(isPhotolessOpening)) return hand;
  const photoless = ranked.find(isPhotolessOpening);
  return photoless ? [...hand.slice(0, -1), photoless] : hand;
}

/**
 * Deal a hand from the pools (handPools). `source` is a hand id, to rebuild a hand already dealt, or a random source in
 * [0, 1) for a new one (Math.random when left out). Returns the id with the dealt names, in the shape of the skill's
 * .struq/draw.json: { id, languages, palettes, pairings, openings, centerpieces, lenses }, the palettes two light then
 * two dark.
 */
export function dealHand(pools, source = Math.random) {
  const id = typeof source === 'string' ? source : newHandId(source);
  if (!isHandId(id)) throw new Error(`"${id}" is not a hand id.`);
  return {
    id,
    languages: deal(id, pools.languages ?? HAND_LANGUAGES, 'language', HAND_SIZE.languages),
    palettes: [
      ...deal(id, pools.lightPalettes ?? [], 'palette', HAND_SIZE.lightPalettes),
      ...deal(id, pools.darkPalettes ?? [], 'palette', HAND_SIZE.darkPalettes),
    ],
    pairings: deal(id, pools.pairings ?? [], 'pairing', HAND_SIZE.pairings),
    openings: openingsFor(id, pools.openings ?? []),
    centerpieces: deal(id, pools.centerpieces ?? [], 'centerpiece', HAND_SIZE.centerpieces),
    lenses: deal(id, pools.lenses ?? HAND_LENSES.map((lens) => lens.id), 'lens', HAND_SIZE.lenses),
  };
}

/** One line of the treatment head, `Field: value`, or an empty string. */
function headLine(plan, field) {
  return plan.match(new RegExp(`^${field}:\\s*(.*)$`, 'm'))?.[1] ?? '';
}

/** The numbered storyboard line of a scene, `3. Opening (loud) hero-poster ...`, or an empty string. */
function sceneLine(plan, scene) {
  return plan.match(new RegExp(`^\\s*\\d+\\.\\s*${scene}\\b[^\\n]*$`, 'm'))?.[0] ?? '';
}

const BRAND = /\(brand\b|\bbrand\)/i;
const NAMED = /\(named\b|\bnamed\)/i;

/**
 * Hold a plan to a hand: the Idea line opens with a dealt lens (`Idea: hour: <point of view>`), unless the client gave
 * the idea, marked (named); the Language, Palette and Type lines and the Opening and Centerpiece scenes of the storyboard
 * each come from it. A Palette or Type line marked (brand) is the client's own and passes; a Language line or an
 * Opening or Centerpiece scene marked (named) is what the client asked for by name and passes. An own scene passes.
 * A line not written yet is no finding here: the film check reports a missing treatment. A hand without a list (an
 * older .struq/draw.json) skips that list.
 *
 * @returns {Array<{ severity: 'fail', id: 'off-draw', detail: string, fix: string }>}
 */
export function checkHand(plan, hand) {
  const text = String(plan ?? '');
  const findings = [];
  const off = (field, name, ids, fix) =>
    findings.push({ severity: 'fail', id: 'off-draw', detail: `${field} ${name} is not in this site's hand (${ids.join(', ')})`, fix });
  if (hand?.lenses) {
    const idea = headLine(text, 'Idea');
    const lens = idea.match(/^([a-z][\w-]*)\s*:/)?.[1];
    if (idea && !(lens && hand.lenses.includes(lens)) && !NAMED.test(idea)) {
      off('Idea', lens ? `lens ${lens}` : 'without a lens', hand.lenses, 'open the Idea line with the dealt lens it started from (Idea: <lens>: <point of view>), or mark an idea the client gave with (named)');
    }
  }
  for (const [field, ids] of [['Language', hand?.languages], ['Palette', hand?.palettes], ['Type', hand?.pairings]]) {
    if (!ids) continue;
    const line = headLine(text, field);
    const name = line.match(/^[\w-]+/)?.[0];
    if (!name || ids.includes(name)) continue;
    if (field === 'Language' ? NAMED.test(line) : BRAND.test(line)) continue;
    off(
      field,
      name,
      ids,
      field === 'Language'
        ? 'pick the language from the two the hand dealt, or mark one the client asked for by name with (named)'
        : `choose the ${field} from the hand, or mark the client's own brand ${field === 'Type' ? 'faces' : 'colours'} with (brand)`,
    );
  }
  for (const [scene, ids] of [['Opening', hand?.openings], ['Centerpiece', hand?.centerpieces]]) {
    if (!ids) continue;
    const line = sceneLine(text, scene);
    const slug = line.match(/\)\s*([a-z][\w-]*)/)?.[1];
    if (!slug || slug === 'own' || ids.includes(slug) || NAMED.test(line)) continue;
    off(scene, slug, ids, `cast the ${scene} from the hand, or mark a block the client named with (named)`);
  }
  return findings;
}
