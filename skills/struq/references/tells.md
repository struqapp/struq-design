# The tell list

One list: Struq's tells, the slop audit and Roy's rules. Each is something a generator does by reflex and a studio
never does. `check.mjs` detects the marked ones (and `struq_controle` returns the same rules when the MCP is
connected); the rest are judged by eye. The fix is beside each.

## Type and labels

- **Eyebrows:** a small label above a heading ("OUR APPROACH", "PREMIUM SERVICE"), any uppercase tracked label or
  marquee. Fix: the heading carries itself; wayfinding is a hairline, a change of surface step, a jump in scale. A
  caption under or on an image (`<figcaption>` or `data-caption`) is media metadata and allowed. (check)
- **Numbered steps** (01 / 02 / 03) and section numbers. Fix: hairline rows or a sequence the layout makes obvious. (check)
- **Mono on marketing:** monospace as a design face. Fix: mono only for literal code. (check)
- **The generator faces:** Inter, Roboto, Arial, Helvetica, Open Sans, Poppins, Montserrat, Lato, Geist, Space
  Grotesk, and Playfair, Anton, Oswald, Cormorant or Manrope as a display. Fix: a canon pairing. (check)
- **Heavy display** outside the poster pairings, `font-bold` on headings, raw sizes (`text-5xl`) and breakpoint size
  ladders. Fix: the type roles and `--display-weight`. (check)

## Colour and surface

- **Gradients of any kind,** gradient text, glass, tinted translucent fills. Fix: flat tokens; a flat veil over a
  photo is the only translucent layer. (check)
- **Glow:** coloured shadows, neon edges, blurred light behind a card. Fix: none. (check)
- **Default purple or blue:** an indigo or violet accent nobody chose. Fix: a canon palette; blue only when the brand
  is blue, declared in STRUQ.md as `Cool hue: declared because <the brand colour>`. (check)
- **Pills,** above all a pill with a dot; pulsing live dots; pastel status badges. Fix: a text link or a rectangular
  button. (check)
- **Drop-shadow elevation** and side-stripe borders. Fix: a surface step and a hairline.

## Layout and motion

- **Icon grids:** three or six identical cards, each an icon, a heading and two grey lines. Fix: hairline rows,
  `hover-list`, `panel-accordion`, or one statement. (check)
- **Stat banners** ("20+", "99%", "51+") the brief did not give. Fix: leave them out. (check)
- Uniform section padding, the same hover on everything, opacity-only entrances, single-layer parallax. Fix: the
  craft rules in [craft.md](craft.md).
- An empty or placeholder frame, a grey box, "photo to come". Fix: a beeldbank photo. (check)

## Copy and icons

- **Em and en dashes** in any form, in copy, comments and alt text. Fix: restructure the sentence: a comma, a colon, a
  full stop. (check)
- Generic CTAs ("Learn more", "Get started", "Lees meer"), generic headings ("Our Services", "Over ons"), hype words
  ("seamless", "naadloos", "next-level"), lorem, Acme, leftover template text. Fix: specific words from the brief. (check)
- Emoji and the cliche icons (sparkles, rocket, lightning, bulb, wand). Fix: Struq Icons, functional only. (check)
- Invented facts: testimonials, client logos, stats, awards, prices, addresses, hours, bios, quotes the brief did not
  give. Fix: leave them out and list them under Assumptions.
- **Notes to the client on the page:** "het e-mailadres volgt zodra de studio het aanlevert", "coming soon", "[telefoon]",
  "to be confirmed". Honest, but a visitor reads it as an unfinished site. Fix: leave the missing fact out of the page
  (drop the line, the column or the link) and list it under Assumptions in STRUQ.md. (check)

## Judged by eye

The hero-metric template (big number, small label, three times), category-reflex colours (green for eco, blue for
finance), a heading the paragraph restates, a page that reads as a SaaS template in a studio's palette.
