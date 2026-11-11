// Struq beeldbank: which pack fits a brief, and which photos inside a pack fit this client.
//
// The pack rule mirrors Struq's MCP (public canon logic), in order:
//   1. A sector word in the brief picks that sector's pack. A stem of four letters or more also
//      matches its inflections and the compounds that hold it (architectenstudio, boetiekhotel);
//      a shorter one only matches whole. Neighbouring words are also tried joined, so "e-bike"
//      matches "ebike". Most matches wins; table order breaks a tie.
//   2. No sector word, but the brief launches or sells a product: vitrine (product photography),
//      and the hero scene carries the product.
//   3. Anything else: halide, because a wrong photograph is worse than an abstract one.
// Vehicle and mobility words are not freight words: transit is for logistics, never for a bike.
// The vocabulary is the MCP's Dutch list plus the English words a brief may use.
//
// Inside a pack, fitImages drops the photos whose alt names a subject this client does not do
// (a fish restaurant gets no flour and dough from the bakery half of proof) and puts the photos
// whose alt shares words with the brief first in each slot.

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const PACK_SIGNALS = [
  ["proof", ["restaurant", "restaurants", "visrestaurant", "bistro", "brasserie", "eetcafe", "horeca", "keuken", "chef", "kok", "koken", "kookt", "bakkerij", "bakker", "patisserie", "lunchroom", "koffiebar", "koffie", "bakery", "cafe", "wine", "wijnbar", "pizzeria", "catering", "kitchen", "dining"]],
  ["datum", ["architect", "architecten", "architectenbureau", "architectuur", "architectuurbureau", "woningbouw", "fabriekspand", "fabriekspanden", "stedenbouw", "vastgoed", "makelaar", "makelaardij", "projectontwikkelaar", "architects", "architecture", "realestate", "property"]],
  // No bare "bouw": nearly every brief opens with it as a verb ("Bouw een website voor ...").
  ["mortar", ["bouwbedrijf", "aannemer", "aannemersbedrijf", "renovatie", "verbouwing", "timmerman", "dakdekker", "loodgieter", "installateur", "installatiebedrijf", "elektricien", "construction", "contractor", "builder", "plumber", "renovation"]],
  ["portico", ["hotel", "hotels", "resort", "vakantie", "vakantiehuis", "vakantiepark", "gastenverblijf", "reisbureau", "reizen", "travel", "holiday", "villa"]],
  ["transit", ["logistiek", "logistieke", "vracht", "vrachtvervoer", "distributie", "distributiecentrum", "transport", "transportbedrijf", "transporteur", "expeditie", "magazijn", "container", "containers", "depot", "pallets", "logistics", "freight", "warehouse", "haulage", "shipping"]],
  ["cadence", ["sport", "sportschool", "sportclub", "gym", "fitness", "crossfit", "boksen", "atletiek", "hardlopen", "wielrennen", "running", "boxing", "athletics"]],
  ["vessel", ["yoga", "yogastudio", "pilates", "fysio", "fysiotherapie", "fysiotherapeut", "wellness", "sauna", "massage", "physio", "spa"]],
  ["sable", ["kapper", "kapsalon", "barbier", "barbershop", "beauty", "schoonheidssalon", "nagelstudio", "salon", "hairdresser", "barber"]],
  ["bolt", ["mode", "kleding", "kledingmerk", "boetiek", "textiel", "stoffen", "maatpak", "naaiatelier", "fashion", "clothing", "textile", "tailor"]],
  ["linen", ["therapie", "therapeut", "coach", "coaching", "psycholoog", "praktijk", "zorg", "tandarts", "huisarts", "kliniek", "therapy", "therapist", "care", "clinic"]],
  ["ledger", ["advocaat", "advocaten", "advocatenkantoor", "notaris", "accountant", "boekhouder", "consultancy", "juridisch", "verzekering", "financieel", "lawyer", "law", "accounting", "finance", "consulting"]],
  ["forge", ["smid", "smederij", "metaal", "metaalbewerking", "lassen", "ambacht", "meubelmaker", "werkplaats", "blacksmith", "metalwork", "furniture", "workshop"]],
  ["vitrine", ["webshop", "winkel", "etalage", "retail", "ecommerce", "sieraden", "keramiek", "cosmetica", "shop", "store", "jewellery", "jewelry", "ceramics", "cosmetics"]],
  ["loam", ["boerderij", "kwekerij", "tuinderij", "landbouw", "akkerbouw", "oogst", "teler", "telers", "bloemen", "farm", "grower", "agriculture"]],
  ["primer", ["school", "basisschool", "kinderopvang", "onderwijs", "creche", "bso", "childcare", "kindergarten"]],
  ["quire", ["portfolio", "ontwerper", "designer", "illustrator", "fotograaf", "grafisch", "ontwerpstudio", "creatief", "photographer", "studio", "agency"]],
  ["circuit", ["hardware", "elektronica", "sensor", "sensoren", "robotica", "iot", "electronics", "robotics"]],
  ["assembly", ["festival", "festivals", "muziekfestival", "evenement", "evenementen", "congres", "conferentie", "theater", "podium", "poppodium", "concert", "concerten", "event", "events", "conference", "venue"]],
  ["brume", ["natuur", "landschap", "kust", "zee", "strand", "wandelen", "nature", "landscape", "coast", "hiking"]],
  ["halide", ["software", "saas", "softwarebedrijf", "app", "platform"]],
];

export const PRODUCT_LAUNCH_WORDS = ["lancering", "lanceren", "lanceert", "gelanceerd", "productlancering", "launch", "launches", "launching", "introductie", "product", "producten", "products"];

// Endings that only inflect a word (architect-en, verbouwing-en, renovatie-s, makelaar-s).
const INFLECTIONS = new Set(["s", "e", "n", "en", "es", "er", "ers", "ing", "ingen", "ies"]);

/**
 * True when a brief word is a sector stem, an inflection of it or a compound that holds it.
 * A stem under four letters only matches whole (so "art" never matches "smart"). A longer stem
 * matches at the start of the word when the rest is an inflection or a word of its own (five
 * letters or more: architect-enstudio, mode-label, keramiek-atelier, but not mode-rn), and at the
 * end when a modifier of three letters or more comes before it (boetiek-hotel, tandarts-praktijk).
 */
export function wordMatches(word, stem) {
  if (word === stem) return true;
  if (stem.length < 4) return false;
  if (word.startsWith(stem)) {
    const rest = word.slice(stem.length);
    return INFLECTIONS.has(rest) || rest.length >= 5;
  }
  return word.endsWith(stem) && word.length - stem.length >= 3;
}

/**
 * A matcher for one brief: its words match by stem, neighbours joined only whole ("e bike" reads
 * as "ebike", but "modern design" never reads as a compound of "mode").
 */
function briefMatcher(brief) {
  const words = normalize(brief).split(" ").filter(Boolean);
  const joined = new Set();
  for (let i = 0; i < words.length - 1; i++) joined.add(`${words[i]}${words[i + 1]}`);
  return (stem) => joined.has(stem) || words.some((w) => wordMatches(w, stem));
}

/** True when the brief says one of this pack's sector words (the pack shows the client's world). */
export function packMatchesBrief(pack, brief) {
  const says = briefMatcher(brief);
  return (PACK_SIGNALS.find(([p]) => p === pack)?.[1] ?? []).some(says);
}

/** The pack a brief's own sector words point at, or null. */
export function packSignalForBrief(brief) {
  const says = briefMatcher(brief);
  let best = null;
  for (const [pack, signals] of PACK_SIGNALS) {
    const score = signals.filter(says).length;
    if (score > 0 && (!best || score > best.score)) best = { pack, score };
  }
  return best?.pack ?? null;
}

/** The pack for a brief, with the stated fallbacks. */
export function packForBrief(brief) {
  const matched = packSignalForBrief(brief);
  if (matched) return matched;
  const words = new Set(normalize(brief).split(" ").filter(Boolean));
  return PRODUCT_LAUNCH_WORDS.some((w) => words.has(w)) ? "vitrine" : "halide";
}

/** Why a pack was picked, in one line for the log. */
export function packReason(brief) {
  const matched = packSignalForBrief(brief);
  if (matched) return `sector words in the brief point at ${matched}`;
  const words = new Set(normalize(brief).split(" ").filter(Boolean));
  return PRODUCT_LAUNCH_WORDS.some((w) => words.has(w))
    ? "no sector word, a product launch: vitrine, and the hero scene carries the product"
    : "no sector word: halide, a wrong photograph is worse than an abstract one";
}

// Per pack: photos whose alt names one of `terms` only fit a brief that says one of `unless`.
export const IMAGE_RULES = {
  proof: [
    {
      subject: "bakery",
      terms: ["meel", "meelafdrukken", "meelstof", "bestoven", "deeg", "deegbol", "brood", "broden", "desem", "desembroden", "zuurdesem", "zuurdesembrood", "bakker", "kruim", "korst", "bakproces", "bloem"],
      unless: ["bakkerij", "bakker", "brood", "patisserie", "bakery", "bread", "lunchroom", "desem", "zuurdesem", "deeg", "meel", "pizzeria", "pizza"],
    },
  ],
  vitrine: [
    { subject: "cosmetics", terms: ["flessen", "flacons", "fles", "parfum", "cosmetica"], unless: ["cosmetica", "cosmetics", "parfum", "skincare", "huidverzorging", "fles", "flessen", "glas", "drank", "drink", "olie"] },
  ],
  transit: [
    { subject: "freight", terms: ["containers", "zeecontainers", "container", "laadperron", "pallets", "heftruck", "depot"], unless: PACK_SIGNALS.find(([p]) => p === "transit")[1] },
  ],
};

const words = (text) => new Set(normalize(text).split(" ").filter((w) => w.length >= 4));

// Words that say nothing about a subject, in a brief or an alt.
const STOP = new Set([
  "voor", "naar", "door", "deze", "onze", "jouw", "maar", "ook", "wordt", "worden", "zijn", "heeft", "hebben", "alle", "meer", "veel", "waar", "wat", "welke", "tussen", "onder", "boven", "over", "zonder", "rond", "langs",
  "with", "from", "that", "this", "your", "into", "about", "over", "under", "their", "every",
  "lancering", "launch", "nieuwe", "nieuw", "website", "pagina", "site", "page", "landing", "landingspagina", "merk", "brand", "bedrijf", "company",
  "elektrische", "elektrisch", "electric", "groot", "grote", "klein", "kleine", "mooi", "mooie", "spectaculair", "spectacular",
]);
/** The words of a text that name a subject: four letters or more, no filler. */
export const contentWords = (text) => new Set([...words(text)].filter((w) => !STOP.has(w)));

/** True when a photo's alt names something the brief is about (compounds count: stadsstraat holds stad). */
export function altFitsBrief(alt, brief) {
  const b = [...contentWords(brief)];
  return [...contentWords(alt ?? "")].some((w) => b.some((x) => w === x || (x.length >= 4 && w.includes(x))));
}

/**
 * Keep the photos that fit this client, best fit first per slot.
 * images: [{ slot, alt, description, ... }]. Returns { keep, dropped, fit } in slot order.
 *
 * When the brief names one of this pack's sector words, its photos show the client's world and
 * only off-subject ones are left out (fit "full"). When they do not (a product launch handed
 * vitrine, a pack named by hand), a photo is kept only if its alt names something the brief is
 * about: the material, the city, the street. Otherwise none: an off-topic photo is worse than no
 * photo (fit "partial" or "none").
 */
export function fitImages(pack, brief, images) {
  const b = words(brief);
  const says = briefMatcher(brief);
  // Strict only when the brief names none of this pack's sector words: a pack named by hand for
  // an architect is the client's world even when another sector scores higher.
  const strict = !packMatchesBrief(pack, brief);
  const rules = IMAGE_RULES[pack] ?? [];
  const keep = [];
  const dropped = [];
  for (const img of images) {
    const altWords = words(img.alt ?? "");
    // Dutch compounds carry the subject inside them (meelsporen, broodkorst), so a term counts
    // when an alt word contains it; the brief's own words still have to match whole.
    const names = (t) => [...altWords].some((w) => w.includes(t));
    const offSubject = rules.find((r) => r.terms.some(names) && !r.unless.some(says));
    if (offSubject) dropped.push({ ...img, reason: `shows ${offSubject.subject}, which the brief does not name` });
    else if (strict && !altFitsBrief(img.alt, brief)) dropped.push({ ...img, reason: "shows nothing this brief is about" });
    else keep.push(img);
  }
  const fit = !strict ? "full" : keep.length ? "partial" : "none";
  const score = (img) => {
    const w = words(`${img.alt ?? ""} ${img.description ?? ""}`);
    let n = 0;
    for (const x of b) if (w.has(x)) n++;
    return n;
  };
  const order = [];
  const slots = [...new Set(keep.map((i) => i.slot))];
  for (const slot of slots) {
    order.push(...keep.filter((i) => i.slot === slot).map((img, i) => ({ img, i, s: score(img) })).sort((x, y) => y.s - x.s || x.i - y.i).map((x) => x.img));
  }
  return { keep: order, dropped, fit };
}
