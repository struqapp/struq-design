// lib/site.ts: every fact and every line of copy on the site, in one place. The scenes and the world read from here;
// no component holds its own copy. To adapt the site to another business, start in this file.
//
// What the brief gave: the name, the place (Bergen), the trade (hand-blown glass pendant lights) and the language
// (Norwegian bokmål). What it did not give, and so is not here: product names, prices, sizes, delivery terms, an
// address, a phone number, a shop. The four shapes are the forms the site draws, named in plain words; the door is
// the skill's placeholder until the client gives a real one (STRUQ.md, Assumptions).
import type { PendantShape } from "@/components/struq/kit/gl";
import type { Door, OrderItem } from "@/components/struq/kit/quiet/Close";
import type { SiteFacts } from "@/components/struq/kit/brand";

export type Product = OrderItem & { shape: PendantShape; tint: string };

export const site = {
  name: "Halden",
  place: "Bergen",
  locale: "nb-NO",
  lang: "nb",
  trade: "Munnblåste pendellamper fra Bergen.",
  meta: {
    title: "Halden: munnblåste pendellamper fra Bergen",
    description: "Pendellamper tegnet og munnblåst for hånd i Bergen. Hver lampe er formet av et pust, og ingen to er like.",
  },
  preloader: "Halden, Bergen",

  /** The mark (references/identity.md): the pendant in half section, the left half drawn, the right half glass, as the
   *  Formen scene draws it. On the 48 grid, the origin shifted 1.5 left and 1 up to centre on the visual mass. */
  brand: {
    symbol: {
      viewBox: "1.5 1 48 48",
      paths: [
        { d: "M23 5h2v11.25h-2z" },
        { d: "M24 44.75A14.25 14.25 0 0 1 24 16.25", stroke: 2 },
        { d: "M24 15.25A15.25 15.25 0 0 1 24 45.75Z", tone: "accent" },
      ],
    },
    /** The image files' colours (the tokens surface-0, ink and accent as hex). */
    colors: { ground: "#002323", ink: "#f3eee1", accent: "#eba941" },
    face: { family: "Bodoni Moda", weight: 500 },
  } satisfies SiteFacts["brand"],
  /** The JSON-LD: a shop of lamps. No address, phone or prices: the brief gave none. */
  kind: "shop" as const,
  schemaType: "HomeGoodsStore",
  /** The footer's "Laget med Struq" line; false removes it. */
  credit: true,

  nav: {
    links: [
      { label: "Formen", href: "#formen" },
      { label: "Veggen", href: "#veggen" },
      { label: "Rommene", href: "#rommene" },
      { label: "Bestill", href: "#bestill" },
    ],
    menu: "Meny",
    menuHref: "#meny",
    label: "Hovedmeny",
    chapters: "Kapitler",
  },

  /** The one way to buy. The brief gave none: the placeholder the client replaces before launch. */
  door: { kind: "email", href: "mailto:post@example.no", label: "Bestill på e-post", placeholder: true } satisfies Door,

  /** What is for sale: the four blown shapes the world can show. No prices: the brief gave none. */
  products: [
    { name: "Klode", shape: "globe", tint: "#f0c48c", text: "Rund og rolig, over spisebordet." },
    { name: "Dråpe", shape: "drop", tint: "#bfc9c0", text: "Smal og høy, over kjøkkenøya." },
    { name: "Klokke", shape: "bell", tint: "#d9c3a0", text: "Åpen nederst, så lyset faller rett ned." },
    { name: "Kjegle", shape: "cone", tint: "#a9b8b4", text: "Stram og lett, i lang ledning i trapperommet." },
  ] satisfies Product[],

  world: {
    label: "En munnblåst glasspendel som følger siden, blir til en rad av fem og tennes i blåtimen",
  },

  opening: {
    title: "Et pust, holdt i glass.",
    lead: "Pendellamper tegnet og munnblåst for hånd i Bergen.",
  },
  formen: {
    title: "Tegnet før den blåses.",
    lines: ["Hver pendel begynner som en tegning i studioet i Bergen.", "Så blåses den for hånd, til glasset når formen på papiret."],
    caption: "Pendel i halvt snitt",
    drawing: "Pendelen i halvt snitt, tegnet og fylt med glass",
  },
  veggen: {
    title: "Ingen to er like.",
    text: "Hver pendel blåses for hånd, én om gangen. Pusten setter spor i glassveggen, og det sporet er bare ditt.",
  },
  rommene: {
    title: "Der den henger.",
    rooms: [
      { name: "Over spisebordet", text: "Lavt nok til at lyset samler bordet, høyt nok til at dere ser hverandre." },
      { name: "Over kjøkkenøya", text: "To eller tre på rad, så lyset faller der hendene arbeider." },
      { name: "I trapperommet", text: "Én pendel i lang ledning, som lyser hele høyden." },
    ],
  },
  blatimen: {
    title: "Lyset er det du kjøper.",
    body: "Glasset bestemmer hvordan det faller. En munnblåst glassvegg er aldri helt jevn, så lyset brytes litt ulikt i hver lampe.",
  },
  order: {
    line: "Fire former, blåst for hånd i Bergen.",
  },
};
