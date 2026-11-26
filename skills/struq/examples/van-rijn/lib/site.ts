// lib/site.ts: every fact and every line of copy on the site, in one place. The scenes and the world read from here;
// no component holds its own copy. To adapt the site to another business, start in this file.
//
// What the brief gave: the name, the city (Utrecht), the family business, the work (roof repairs, new pitched and flat
// roofs, gutters and leadwork) and the language (Dutch). What it did not give, and so is not here: years in business,
// reviews, counts, certifications, prices, an address, an area served, opening hours. The phone number and the quote
// door are the skill's placeholders until the client gives real ones (STRUQ.md, Assumptions).
//
// Each service carries `roof`: what the world shows while its row is active (the cover, the pitch, a lifted tile, the
// rain, a turn). It is the same roof the whole page, so a row changes the roof, never swaps in a picture.
import type { RoofCover } from "@/components/struq/kit/gl";
import type { Door, OrderItem } from "@/components/struq/kit/quiet/Close";

/** What the roof does for a service: its cover and pitch, a tile lifted, rain, a turn, and a closer look (zoom, with
 *  the point brought to the middle, in roof units). */
export type RoofState = { cover: RoofCover; pitch: number; lift?: number; rain?: number; turn?: number; zoom?: number; focus?: [number, number, number] };
export type Service = OrderItem & { text: string; roof: RoofState };

/** The two ways in. Placeholders until the client sends the real number and address. */
const phone = { kind: "phone", href: "tel:+31300000000", label: "030 000 00 00", placeholder: true } satisfies Door;
const quote = { kind: "quote", href: "mailto:offerte@example.nl", label: "Offerte aanvragen", placeholder: true } satisfies Door;

export const site = {
  name: "Van Rijn Dakwerk",
  place: "Utrecht",
  locale: "nl-NL",
  lang: "nl",
  trade: "Familiebedrijf in Utrecht voor dakreparaties, hellende en platte daken, dakgoten en lood.",
  meta: {
    title: "Van Rijn Dakwerk: dakdekker in Utrecht",
    description: "Familiebedrijf in Utrecht voor dakreparaties, nieuwe hellende en platte daken, dakgoten en loodwerk. Bel of vraag een offerte aan.",
  },

  nav: {
    links: [
      { label: "Lagen", href: "#lagen" },
      { label: "Werk", href: "#werk" },
      { label: "Lekkage", href: "#lek" },
      { label: "Offerte", href: "#offerte" },
    ],
    menu: "Menu",
    menuHref: "#menu",
    label: "Hoofdmenu",
    chapters: "Hoofdstukken",
  },

  phone,
  quote,
  /** The fixed bar on every screen: the two doors in a thumb's reach. */
  callBar: { label: "Bellen of een offerte", call: "Bellen", quote: "Offerte" },

  world: {
    label: "Een dak dat in de regen staat, laag voor laag wordt opgebouwd en het water naar de goot afvoert",
  },

  opening: {
    title: "Droog, laag voor laag.",
    lead: "Dakreparaties, nieuwe hellende en platte daken, dakgoten en lood. Een familiebedrijf in Utrecht.",
    call: `Bel ${phone.label}`,
  },

  /** The layers of a pitched tile roof, bottom up: the same order as roofLayers("tile") in the kit. */
  lagen: {
    title: "Wat onder de pannen zit.",
    lead: "Een lekkage zit zelden waar de vlek zit. Water zoekt zijn weg door de lagen eronder.",
    label: "De lagen van een pannendak",
    layers: [
      { name: "Sporen", text: "Het houten geraamte. Daar rust de rest op." },
      { name: "Folie", text: "Wat onder een pan door waait, loopt hierover naar beneden." },
      { name: "Latten", text: "Tengels langs de sporen, panlatten erover: lucht onder de pannen en een vaste plek voor elke pan." },
      { name: "Pannen", text: "Van de goot naar de nok, elke rij over de vorige." },
      { name: "Goot", text: "Al het water van het dak komt hier samen." },
    ],
  },

  werk: {
    // A no-break space keeps "Van lekkage" together, so "Van" never stands alone on a line.
    title: "Van lekkage tot nieuw dak.",
    services: [
      { name: "Reparaties", text: "Een lekkage, een verschoven pan, een losse nok.", roof: { cover: "tile", pitch: 40, lift: 1, zoom: 1.3, focus: [0.25, 0, 0.3] } },
      { name: "Hellende daken", text: "Een nieuw dak, van de sporen tot de nok.", roof: { cover: "tile", pitch: 46 } },
      { name: "Platte daken", text: "Nieuwe dakbedekking, tot in de randen.", roof: { cover: "bitumen", pitch: 3 } },
      { name: "Dakgoten", text: "Nieuwe goten, en reparaties aan de oude.", roof: { cover: "tile", pitch: 40, rain: 0.8, turn: 0.35, zoom: 1.35, focus: [-0.3, -0.3, 0.8] } },
      { name: "Loodwerk", text: "Lood rond de schoorsteen, de dakkapel en elke aansluiting.", roof: { cover: "tile", pitch: 40, turn: -0.45, zoom: 1.4, focus: [-0.42, 0.15, 0.2] } },
    ] satisfies Service[],
  },

  lek: {
    title: "Lekt het nu?",
    text: "Bel. Hoe eerder het dak dicht is, hoe kleiner de schade.",
  },

  offerte: {
    title: "Vertel wat er met je dak is.",
  },
};
