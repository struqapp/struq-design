// lib/site.ts: every fact and every line of copy on the site, in one place. The scenes read from here; no component
// holds its own copy. To adapt the site to another business, start in this file.
//
// What the brief gave: the name, the city (Utrecht), the family business, the work (roof repairs, new pitched and flat
// roofs, gutters and leadwork) and the language (Dutch). What it did not give, and so is not here: years in business,
// reviews, counts, certifications, prices, an address, an area served, opening hours. The phone number, the quote door
// and the web address are placeholders until the client gives real ones (STRUQ.md, Assumptions).
//
// The photos are generated (deck-image, FLUX 3 Klein): their captions describe the scene, never this company's work.
import type { Door, OrderItem } from "@/components/struq/kit/quiet/Close";
import type { SiteFacts } from "@/components/struq/kit/brand";
import type { RoofLayer } from "@/components/struq/kit/drawn";

/** The two ways in. Placeholders until the client sends the real number and address. */
const phone = { kind: "phone", href: "tel:+31300000000", label: "030 000 00 00", placeholder: true } satisfies Door;
const quote = { kind: "quote", href: "mailto:offerte@example.nl", label: "Offerte aanvragen", placeholder: true } satisfies Door;

export const site = {
  name: "Van Rijn Dakwerk",
  place: "Utrecht",
  locale: "nl-NL",
  lang: "nl",
  /** Placeholder: the client's domain replaces it before launch (the canonical, the sitemap, the link preview). */
  url: "https://vanrijndakwerk.example",
  trade: "Familiebedrijf in Utrecht voor dakreparaties, hellende en platte daken, dakgoten en lood.",
  meta: {
    title: "Van Rijn Dakwerk: dakdekker in Utrecht",
    description: "Familiebedrijf in Utrecht voor dakreparaties, nieuwe hellende en platte daken, dakgoten en loodwerk. Bel of vraag een offerte aan.",
  },
  preloader: "Van Rijn Dakwerk",

  /** The mark (references/identity/van-rijn.svg): the rain stopped by the roof. Four bars of rain end above a tile
   *  layer at the site's 40 degree pitch; the home is the dry space beneath, never drawn. The tiles in the accent. */
  brand: {
    symbol: {
      viewBox: "0 0 48 48",
      paths: [
        { d: "M6 6H12.38V28.25L6 33.6ZM15.88 6H22.25V19.97L15.88 25.32ZM25.75 6H32.13V25.32L25.75 19.97ZM35.63 6H42V33.6L35.63 28.25Z" },
        { d: "M24 21L42 36.1V41.6L24 26.5L6 41.6V36.1Z", tone: "accent" },
      ],
    },
    /** The image files' colours (the tokens surface-0, ink and accent as hex). */
    colors: { ground: "#f4efe9", ink: "#1b1512", accent: "#9b2f1f" },
    face: { family: "Schibsted Grotesk", weight: 400 },
  } satisfies SiteFacts["brand"],
  /** The JSON-LD: a local business, a roofing contractor. No address, hours or prices: the brief gave none. */
  kind: "local" as const,
  schemaType: "RoofingContractor",
  /** The footer's "Gemaakt met Struq" line; false removes it. */
  credit: true,

  nav: {
    links: [
      { label: "Lagen", href: "#lagen" },
      { label: "Plat", href: "#plat" },
      { label: "Lekkage", href: "#lek" },
      { label: "Offerte", href: "#offerte" },
    ],
    menu: "Menu",
    menuHref: "#menu",
    label: "Hoofdmenu",
    chapters: "Hoofdstukken",
  },

  /** The phone door. Not `phone`: the JSON-LD reads that field as a real number, and this one is a placeholder. */
  call: phone,
  quote,
  /** The one way to act, for llms.txt: the quote. */
  door: quote,
  /** The fixed bar on a phone: the two doors in a thumb's reach. */
  callBar: { label: "Bellen of een offerte", call: "Bellen", quote: "Offerte" },

  opening: {
    title: "Droog, laag voor laag.",
    lead: "Dakreparaties, nieuwe hellende en platte daken, dakgoten en lood. Een familiebedrijf in Utrecht.",
    call: `Bel ${phone.label}`,
  },

  /** The layers of a pitched tile roof, bottom up, as the drawing builds them. */
  lagen: {
    title: "Wat onder de pannen zit.",
    lead: "Een lekkage zit zelden waar de vlek zit. Water zoekt zijn weg door de lagen eronder.",
    drawing: "Doorsnede van een pannendak bij de goot: muur, sporen, folie, latten, pannen en goot",
    layers: [
      { key: "rafters", name: "Sporen", text: "Het houten geraamte. Daar rust de rest op." },
      { key: "membrane", name: "Folie", text: "Wat onder een pan door waait, loopt hierover naar beneden, de goot in." },
      { key: "battens", name: "Latten", text: "Tengels langs de sporen, panlatten erover: lucht onder de pannen en een vaste plek voor elke pan." },
      { key: "cover", name: "Pannen", text: "Van de goot naar de nok, elke rij over de vorige." },
      { key: "gutter", name: "Goot", text: "Al het water van het dak komt hier samen." },
    ] satisfies { key: RoofLayer; name: string; text: string }[],
  },

  /** Generated stills (public/images): what each shows, as a caption. Never this company's own roofs. */
  daken: {
    line: "Pannen, leien, zink en lood.",
    photos: [
      { src: "/images/pannen.webp", width: 1344, height: 768, ratio: "16:9", alt: "Handen leggen een rode dakpan op de panlatten van een hellend dak", caption: "Een pan op de lat, rij over rij", description: "A roofer's hands laying a clay tile on the battens of a pitched roof" },
      { src: "/images/leien.webp", width: 1344, height: 768, ratio: "16:9", alt: "Een nat leien dak na een regenbui, met daken en een kerktoren in de mist erachter", caption: "Leien na een bui", description: "A wet slate roof after rain, rooftops and a church tower in mist behind" },
      { src: "/images/goot.webp", width: 1344, height: 768, ratio: "16:9", alt: "Een zinken goot aan een bakstenen huis, met regenwater en een gesoldeerde naad", caption: "Zinken goot, gesoldeerde naad", description: "A zinc half-round gutter on a brick house, rain water, a soldered seam" },
      { src: "/images/daken.webp", width: 1344, height: 768, ratio: "16:9", alt: "Steile daken van grachtenpanden in Utrecht met dakkapellen, schoorstenen en natte pannen", caption: "Daken in de binnenstad", description: "Steep tiled roofs of old town houses with dormers, chimneys and wet tiles" },
    ],
  },

  plat: {
    title: "Plat dak, andere lagen.",
    text: "Geen pannen maar dakbedekking, tot in de randen. Daaronder het beschot en de isolatie, op de balklaag.",
    drawing: "Doorsnede van een plat dak bij de rand: muur, balklaag, dakbeschot, isolatie, bitumen en goot",
    labels: { rafters: "Balklaag", membrane: "Dakbeschot", battens: "Isolatie", cover: "Bitumen", gutter: "Goot" } satisfies Record<RoofLayer, string>,
  },

  lek: {
    title: "Lekt het nu?",
    text: "Bel. Hoe eerder het dak dicht is, hoe kleiner de schade.",
  },

  offerte: {
    title: "Vertel wat er met je dak is.",
    services: [
      { name: "Reparaties", text: "Een lekkage, een verschoven pan, een losse nok." },
      { name: "Hellende daken", text: "Een nieuw dak, van de sporen tot de nok." },
      { name: "Platte daken", text: "Nieuwe dakbedekking, tot in de randen." },
      { name: "Dakgoten", text: "Nieuwe goten, en reparaties aan de oude." },
      { name: "Loodwerk", text: "Lood rond de schoorsteen, de dakkapel en elke aansluiting." },
    ] satisfies OrderItem[],
  },
};
