// lib/site.ts: every fact and every line of copy on the site, in one place. The scenes read from here; no component
// holds its own copy.
//
// What the brief gave: the name (Oostwerk), the place (Amsterdam), the trade (designs and builds websites), who for
// (cultural institutions and ambitious brands), and that the studio is small and independent. What it did not give,
// and so is not here: an address, a phone number, a mail address, projects, clients, a team, years, awards. The door is
// the skill's placeholder until the studio gives a real one (STRUQ.md, Assumptions). The example pages are drawn as
// examples of the trade and labelled so; none of them is a client.
import type { SiteFacts } from "@/components/struq/kit/brand";
import type { Door } from "@/components/struq/kit/quiet/Close";

/** A drawn example page: what a cultural or brand website can look like, never a client's. */
export type SamplePage = {
  time: string;
  moment: string;
  path: string;
  kind: string;
  site: string;
  nav: string[];
  title: string;
  sub: string;
  tone: "oat" | "ink" | "amber" | "clay";
  layout: "poster" | "grid" | "list" | "product";
};

export const site = {
  name: "Oostwerk",
  place: "Amsterdam",
  locale: "en-GB",
  lang: "en",
  trade: "Websites for cultural institutions and ambitious brands, designed and built in Amsterdam.",
  meta: {
    title: "Oostwerk: websites for cultural institutions and ambitious brands",
    description:
      "Oostwerk is a small, independent studio in Amsterdam that designs and builds websites for cultural institutions and ambitious brands.",
  },

  /** The mark (references/identity.md): the door left ajar. A doorway on the 48 grid with its leaf swung in from the
   *  left hinge, and the lit room behind it in the accent: always open. Centred on its mass by the viewBox origin. */
  brand: {
    symbol: {
      viewBox: "0 0.6 48 48",
      paths: [
        { d: "M13.25 42V7.25h21.5V42", stroke: 2.5 },
        { d: "M24 10.5L33.5 8.5V42H24Z", tone: "accent" },
        { d: "M14.5 8.5L24 10.5V39L14.5 42Z" },
      ],
    },
    colors: { ground: "#fcf6ee", ink: "#36281d", accent: "#b94834" },
    face: { family: "Newsreader", weight: 300 },
  } satisfies SiteFacts["brand"],
  kind: "service" as const,
  schemaType: "ProfessionalService",
  credit: true,

  nav: {
    links: [
      { label: "The craft", href: "#drawn" },
      { label: "Studio", href: "#studio" },
      { label: "A day", href: "#entrances" },
    ],
    /** The menu curtain's chapters: the page's scenes in order, then the way in. */
    menuItems: [
      { label: "The craft", href: "#drawn" },
      { label: "Studio", href: "#studio" },
      { label: "A day", href: "#entrances" },
      { label: "Enquiries", href: "#contact" },
    ],
    menu: "Menu",
    close: "Close",
    menuHref: "#site-index",
    label: "Main menu",
    chapters: "On this page",
  },

  /** The one way in. The brief gave none: the placeholder the studio replaces before launch. */
  door: { kind: "email", href: "mailto:post@example.com", label: "Mail the studio", placeholder: true } satisfies Door,

  opening: {
    title: "Always open.",
    lead: "Oostwerk designs and builds websites for cultural institutions and ambitious brands. A small, independent studio in Amsterdam.",
    cta: "Mail the studio",
    facade: "A row of Amsterdam canal houses at night, every window dark except the front door of the middle house, lit, with a web page in its light",
    /** The readout beside the street: the visitor's own time, and the building's state in a word. */
    hours: { open: "Open", closed: "After closing" },
  },

  drawn: {
    heading: "From drawing to doorway.",
    text: "Scroll, and a museum's visit page goes from its first sketch to the page a visitor opens. Design and build sit in one studio, so nothing gets lost between the two.",
    caption: "An example visit page, at a wide screen and on a phone",
    sample: {
      site: "Museum",
      nav: ["Visit", "Exhibitions", "Collection", "Tickets"],
      path: "/visit",
      title: "Plan your visit",
      sub: "Tickets, getting here and what to see first",
      cta: "Book tickets",
    },
    sketch: {
      first: "Come and see us",
      notes: ["name and the way around", "one line, says what this page is for", "the one action", "a photo, full height"],
    },
  },

  studio: {
    line: "Small, on purpose: the people you brief are the people who draw your site and build it.",
    label: "An independent studio in Amsterdam.",
    drawing: "A narrow Amsterdam canal house in elevation, drawn line by line and then built, one window under the gable lit",
  },

  entrances: {
    heading: "Open when the building isn't.",
    text: "An institution's site works every hour its doors are shut. One ordinary day, drawn as four example pages: kinds of entrance Oostwerk designs and builds, not client work.",
    pages: [
      { time: "07:40", moment: "A teacher checks whether the museum opens early enough for a class trip.", kind: "An exhibition", site: "Museum", path: "/exhibitions", nav: ["Visit", "Exhibitions", "Collection"], title: "Light from the North", sub: "Painters of the northern coast", tone: "ink", layout: "poster" },
      { time: "13:10", moment: "Someone on a lunch break buys two tickets for Saturday night.", kind: "A season programme", site: "Theatre", path: "/programme", nav: ["Programme", "Tickets", "The house"], title: "The new season", sub: "Drama, dance and music, night after night", tone: "clay", layout: "list" },
      { time: "20:00", moment: "A brand's new collection goes live, and the first visitors arrive.", kind: "A launch", site: "Brand", path: "/shop", nav: ["Shop", "Journal", "About"], title: "The first edition", sub: "Made in small runs", tone: "amber", layout: "product" },
      { time: "23:55", moment: "A visitor reads about the painting they stood in front of that afternoon.", kind: "A collection", site: "Archive", path: "/collection", nav: ["Search", "Themes", "Stories"], title: "The whole collection", sub: "Open to search from anywhere", tone: "oat", layout: "grid" },
    ] satisfies SamplePage[],
  },

  close: {
    line: "Your doors close at six. Your site doesn't.",
    street: "The same street, still dark, the front door still lit at the hour where you are now",
    items: [
      { name: "For cultural institutions", text: "A new website, designed and built, for a museum, a theatre, an archive or a festival." },
      { name: "For ambitious brands", text: "A new website, designed and built, for a brand with a launch ahead of it." },
    ],
  },
};
