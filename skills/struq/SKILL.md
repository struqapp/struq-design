---
name: struq
description: "Award-tier studio websites for coding agents, built from Struq's catalogue of admitted blocks and directed as one film: one idea, one motion language, one motif and one centerpiece, cast into a storyboard before a block is installed. Preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with real variants, judged at FWA level and shipped as files. Struq's palettes and type pairings as one token block, art-directed CC0 photos from the Struq beeldbank, Lenis on one GSAP clock, and a self-check against the AI tells. Works offline from its own copy; uses the Struq MCP (struq_richting, struq_blokken, struq_blok, struq_controle) when connected. Use when designing, building, redesigning, animating or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url> | direct <brief>"
---

# Struq

A site looks like a template when every choice is the likeliest one, and like a showreel when every slot gets the
loudest block. Struq casts studio blocks into one film; your job is the treatment, the copy and the seams, never a
rebuild of what a block does. `<skill-dir>` is this file's folder; the catalogue is [blocks/CATALOG.md](blocks/CATALOG.md),
a worked treatment per language [references/film.md](references/film.md), the craft [references/craft.md](references/craft.md).

| Invocation | Mode |
|---|---|
| `/struq <brief>` | **Build**: the checklist below, start to finish. |
| `/struq redesign <path>` | Keep the brand, copy and components ([references/triage.md](references/triage.md)); write a treatment of the page as it will be (kept sections as own scenes) and stop once as in step 2, then swap in blocks where the page is weakest and run the checklist from step 3. |
| `/struq audit <path-or-url>` | Change nothing. Run `check.mjs` (and `struq_controle` when connected), report every FAIL and WARN and the three fixes with the most visual payoff. Never a numeric score. |
| `/struq direct <brief>` | One continuous WebGL experience across chapters: steps 1 to 4, then [cinematic/README.md](cinematic/README.md). |

For a dashboard or product UI keep the tokens, faces and tells; drop the preloader, Lenis and the pinned pieces.

## Rules that never bend

1. **Never an empty frame.** Every image slot holds a real photo: the client's, else the beeldbank pack (free, CC0,
   no permission needed). Pack photos are mood: the world around the client, never their own room, team, work or
   product. So never set one under a first-person claim ("our oven", "every piece we make", "my plates"), and where
   the work is the product (a portfolio, a shop, a collection) build the frame for their work and ask for it at the
   stop. A caption is copy you write for this client, never the alt read back.
2. **Never invent, never stand in.** No testimonials, logos, stats, awards, prices, addresses, hours, bios, quotes,
   product features, programme, process, equipment (a wood oven) or name the brief did not give. A missing fact
   leaves no trace: no "to follow", "to be announced", "Your Name", example.com, and no button for an action with no
   real destination (shop, booking, contact, sign-up), no "come by" without the address. Drop the line, the field or
   the button and list it under
   Assumptions in STRUQ.md. The self-check fails stand-ins and links to anchors that do not exist.
3. **Never the tells** ([references/tells.md](references/tells.md)): no eyebrows, pills, gradients or gradient text,
   glow, mono on marketing, Inter or the other generator faces, default purple or blue, numbered steps, icon grids,
   stat banners, generic CTAs, em or en dashes.
4. **Copy in the client's market language**, which may differ from the brief's (a plumber in Utrecht reads Dutch).
   Say which on the Brief line and under Assumptions. Write it as a native copywriter would, never a translation.

## The MCP, or the skill's own copy

Same blocks, same derivation: use the MCP tool when it is connected, else the offline column from the skill's copy.

| Need | MCP connected | Offline |
|---|---|---|
| A direction: palette, pairing, photo pack as tokens and fonts | `struq_richting(brief)` (or with `palette`, `type` ids) | `canon.mjs list`, then `canon.mjs palette <id>` and `canon.mjs type <id>`; `images.mjs --brief` |
| What blocks exist | `struq_blokken(kind?, query?)` | `blocks.mjs list [kind]`, [blocks/CATALOG.md](blocks/CATALOG.md) |
| A block as files | `struq_blok(slug, variant?)` | `blocks.mjs add <slug>` |
| The tell check | `struq_controle()`: run its detectors on your own files | `check.mjs` |

`struq_richting`'s token block replaces STRUQ TOKENS in `app/globals.css`, its font URLs go in `app/fonts.ts`;
`struq_blok`'s files go into `components/struq/` at their paths. Log each call:
`node <skill-dir>/scripts/log.mjs mcp <tool> --note "<what you took>"`. Run `check.mjs` either way.

## Build checklist

Copy this into `STRUQ.md` under the plan and tick each line as you finish it. Keep `STRUQ-LOG.md` from the first
step: append only, one entry per step (`node <skill-dir>/scripts/log.mjs "Step N Name" "what" "why"`; the scripts log
their own). `check.mjs` fails while a line is open or a ticked step has no entry.

```
## Build checklist
- [ ] 1 Project: Next.js App Router + Tailwind v4; blocks.mjs init printed OK
- [ ] 2 Treatment and approval: the treatment in STRUQ.md, the plan check at PLAN: PASS; the one stop sent and answered
- [ ] 3 Canon: the token block and fonts written (canon.mjs palette and type, or struq_richting)
- [ ] 4 Images: images.mjs --brief printed OK; only photos whose alt fits the client
- [ ] 5 Scenes: frames and the centerpiece installed, every other scene built as the storyboard says, composed in app/page.tsx with real copy
- [ ] 6 Build: npm run build passes
- [ ] 7 Look: 390 and 1440 screenshots and one full scroll, fixes made (or "Verify: not seen, no browser")
- [ ] 8 Check: check.mjs prints RESULT: PASS
```

**1 Project.** Empty folder: `npx create-next-app@latest . --ts --tailwind --app --eslint --yes`, then
`node <skill-dir>/scripts/blocks.mjs init`: the kit in `components/struq/kit/`, the layout (`sq-js` before paint,
font links, `data-blocks` on `<body>`, `SmoothScroll`), `globals.css` (kit import, theme names, STRUQ TOKENS),
`fonts.ts`, gsap, @gsap/react and lenis. It never overwrites your layout or stylesheet: merge from `recipes/app/`.

**2 Treatment and the one stop.** Pick from the canon, never invent a palette or pairing while one fits: palette by
mood, then sector; a "kept out" palette (blue, purple, teal) only for a brand of that colour, declared as `Cool hue:
declared because <brand colour>`; the brand's own colours and faces beat the canon, in the same token names. Pairing
by temperament: Fraunces (serif-editorial) warm and premium, Newsreader literate, Sora calm and architectural,
Urbanist soft and current, Bodoni Moda for fashion, Big Shoulders (condensed-poster) for a campaign at poster scale,
Unbounded for a wide agency voice. Write the Idea first, then the Unlike line: the site any agent would build for this
brief, and Struq's own reflex too (a framed photo in the middle with the name small beside it, the photo growing to
full screen), in one line, and what this site does instead. Pick the language (The film, below), then run
`node <skill-dir>/scripts/blocks.mjs arc <language>` and paste the Tone arc and Storyboard it prints into the
treatment at the top of STRUQ.md. Nothing in it is picked for you: cast every scene from the idea and the motif, one
pick per line with its reason after "because", and delete the options. The Opening and the Centerpiece choose from the
whole catalogue, since none of them belongs to one language; they are this site's two signatures, so choose the pair
that could only be this client's. The middle scenes are yours to rename, reorder, add or drop within the budgets, and
an own scene is welcome wherever the idea needs a moment no block gives. A block the user names goes in first.

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where>
Idea: <a point of view in one sentence, never a description of the client: what a visitor believes when they leave>
Unlike: <the likeliest site for this brief, and Struq's own reflex, in one line> -> <what this one does instead>
Language: <weight | cut | curtain> (<the tempo the idea needs>; not <each of the other two>, because <why not>)
Motif: <line | frame | aperture | cut | word | field>: <what it is in this client's world and how it changes down the page>
Lexicon: <three to five working words of the client's trade (a material, a part, a tool, a unit), never the brief repeated; every label, counter and caption uses these, no film or studio jargon the client does not own>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body>
Images: pack <slug> (or the client's photos, then pack <slug>)
Centerpiece: <block>: <why this is this site's one moment>
Tone arc: <as blocks.mjs arc printed it>
Storyboard:
1. Arrival   (frame)  <preloader of the language> | lands on: <what>
2. Opening   (loud)   <block:variant> | on screen: <...> | enters: <...> | hands over: <...>
3. <scene>   (quiet)  <block:variant or kit scene> | on screen: <...> | enters: <...> | hands over: <...>
...
N. Close     (quiet)  <block or kit scene> | echoes the opening: <how> | footer: <block>
Assumptions: <every drafted line and every fact left out>
Verify: <filled in at step 7>
```

Run `node <skill-dir>/scripts/check.mjs --plan` and fix every FAIL and every `quiet-is-quiet`, `loud-adjacent` and
`quiet-share` warning until it prints `PLAN: PASS` without them. `canon.mjs` and `blocks.mjs add` refuse until the
plan passes and the reply is logged. Then **stop once**, in the user's language, and show the treatment, never block
slugs: idea, language, motif and centerpiece in plain words; the storyboard as numbered lines, one sentence each of
what the visitor sees; palette, type and pack on one line; then "Akkoord? Heb je een logo, foto's of echte cijfers,
stuur ze nu." (English: "Approve? If you have a logo, photos or real numbers, send them now."). The build request is
not the approval. Log the reply word for word: `log.mjs "Step 2 Approval" "Asked: ..." "Reply: \"<their words>\""`.
Any yes builds the treatment; what they send replaces the matching pick; a veto changes only what it names. Never
ask twice. Ask in the same message for what only the client has and the page needs: their name when the brief gave
none, how visitors reach them (address, phone or mail; the shop, booking or sign-up link), and their own photos when
the work is the product ("Ik heb geen foto's van je <product>: stuur ze, dan komen ze in de hero."). Whatever stays
unanswered is left out, never stood in for.

**3 Canon.** `canon.mjs palette <id>` and `canon.mjs type <id>` rewrite the one STRUQ TOKENS block and `app/fonts.ts`.

**4 Images.** `node <skill-dir>/scripts/images.mjs --brief "<the brief, in the user's words>"` keeps only the pack's
photos whose alt fits the client, verifies them into `public/images/` and writes `lib/struq-images.ts` (`images.hero`,
`.band`, `.card`, `.column`, `.detail`, `.backdrop`, `imageCredit`, `imageFit`). Never widen the brief to make a pack
fit; read the alts and look at a photo before you place it, and leave out any that shows another place or trade (a
farm for a city lot, a building site for a plumber). With `imageFit` "none" a background block carries the hero. Title and `lang` go in the layout.

**5 Scenes.** Install the frames and the centerpiece first (`blocks.mjs add <slug>:<variant>` or `struq_blok`), then
each scene as its storyboard line says, the quiet ones with the kit's four (The film, below). Read each file header
for its props and how it mounts; fill every label, counter and caption from the lexicon; wrap the tone arc's ink or
field scenes in `scene-inverse` or `scene-field` (a kit scene takes it as `className`). Glue and an own scene use
`Reveal`, `MediaFrame` and `SplitHeadline`, and an own scene's root carries `data-scene="<name>"`.

**6 to 8.** `npm run build` passes (fix your code; never delete a block for green). View `npx next start -p 4321` at
390 and 1440, scroll once: the preloader lands on the hero, every frame fills, each pin engages and lets go without a
jump, nothing overflows, scrolling back reverses. No browser to hand? `npx -y playwright install chromium`, then
`npx -y playwright screenshot --viewport-size=390,844 --full-page http://localhost:4321 phone.png` (and 1440,900);
read the images. "Not seen" only after that fails. Never claim what you did not see. Then `check.mjs` to
`RESULT: PASS`; a FAIL you are sure is false goes in the final report with the reason, never worked around.

## The film

One film, not a showreel: every frame from one language, one arc, one centerpiece, one motif seen at the arrival,
the opening, the centerpiece and the close. A loud scene moves with the scroll (a pin, a scrub, a reveal to full
bleed); a quiet scene is type and a photo that enter once and sit still. Two tags only: `(loud)` when the block's
energy in the catalogue is 2 or more, `(quiet)` at 1 or less, for a kit scene or for an own scene.

| Language | For | Feel | Frames: preloader, page transition, menu | Motif |
|---|---|---|---|---|
| weight | architecture, hotels, craft, interiors | photographic and slow; a print grows into place; long holds | `preloader-stack`, `page-transition-stack`, `menu-curtain:stack` | frame |
| cut | fashion, agencies, portfolios, music | hard cuts, short masks, no fades, short holds | `preloader-slices`, `page-transition-slices`, `menu-curtain:slices` | cut or word |
| curtain | campaigns, launches, events, culture | a light line, panels part, a long hold before the reveal | `preloader-gate` or `preloader-wordmark:split`, `page-transition-gate`, `menu-curtain:gate` | line or aperture |

Pick the language by the tempo the idea needs: slow and settled (weight), sharp and decisive (cut), or held and then
revealed (curtain). The For column only gives examples; a trade that is not in it (a law firm, a plumber, a software
product, a restaurant) takes whichever tempo its idea has, and any of the three can fit it. Weight is the easy
reflex, because calm reads as tasteful: on the `Language:` line give the reason for your pick and why not each of the
other two. The idea may pick another motif of the six.
`preloader-gate` and `page-transition-gate` show a neutral hairline ring; the film leader (a dial counting 3, 2, 1)
only for a film client, through `dial="leader"` and `marks`. The header is `header-bar:quiet` or `:settle`; every
section says its ground with `data-bar-tone`, the hero too ("photo" only where the bar sits over the photo, "ground"
over paper), and the bar never repeats a name the hero already sets at poster scale. Each arc is loud only at the opening, the centerpiece and at most one gentle
scene with a quiet scene on each side. The arcs below show each language's shape and the picks that suit it; none is a
default, and the Opening and the Centerpiece may come from anywhere in the catalogue.

**Quiet scenes** are the kit's four, imported from `@/components/struq/kit/quiet` (props in each file's header):
- `Statement`: the one sentence and the page's first type moment, with an `accent` word and a margin `label` or a
  small `image`, so it is composed, never a lone line.
- `PhotoText`: a photo and a short text side by side on the grid.
- `Rows`: three to six hairline rows, a term and one sentence each, never numbered.
- `Close`: the closing line and its one link, echoing the opening; `frame` when the motif is the frame.
- An own scene whenever the idea asks for something the four do not give: your type and photos composed for this
  client with `SplitHeadline`, `MediaFrame` and `Reveal`, entering once, its root marked `data-scene="<name>"` (the
  check warns `own-scene-unmarked` without it). The craft rules below hold for it as for any block.

**weight.** Paper throughout, ink at the centerpiece.
1. Arrival (frame): `preloader-stack`; the print lands on the hero photo.
2. Opening (loud, short hold): `hero-framed:wand`, `hero-framed:portret` or `hero-still:frame`; calmer, `hero-still:still` (quiet).
3. Statement (quiet): `Statement`.
4. About (loud, the gentle one): `about-studio:wandeling` or `about-studio:plaat` (a full-bleed reveal); quiet, `PhotoText`.
5. Approach (quiet): `approach:schuif` or `Rows`.
6. Centerpiece (loud, ink): `image-to-fullbleed`, `grid-assembly`, `zoom-through` or `project-stack` (real projects).
7. Release (quiet): `PhotoText`.
8. Close (quiet): `Close`, type only after a full-bleed centerpiece. Footer: `wordmark-finale`.

**cut.** Paper and ink in hard alternation, never a fade.
1. Arrival (frame): `preloader-slices`, its caption from the lexicon.
2. Opening (loud): `hero-poster`; quiet, `hero-index:lijst`, `hero-index:venster`, `hero-split:naad` or `hero-split:liggend`.
3. Work (quiet): `hover-list` or `image-trail`; after `hero-index`, already a list, `reveals:clip`.
4. Statement (quiet): `Statement`.
5. Centerpiece (loud, ink): `split-pair`, `panel-wipe`, `project-stack`, `fanned-cards` or `film-strip` (film clients).
6. Release (quiet): `fill-rows` or `Rows`.
7. Close (quiet): `Close`, type only, or `cta-closing:pointer`. Footer: `footer-contact`.

**curtain.** Field or ink at the opening, paper between, ink at the centerpiece.
1. Arrival (frame): `preloader-gate`, the ring fills and the gate parts; or `preloader-wordmark:split`.
2. Opening (loud): `hero-opener`, `background-aurora`, `background-silk` or `background-facets`, the line at poster scale; calmer, `hero-still:horizon` (quiet).
3. Statement (quiet): `Statement`.
4. Details (loud, the gentle one): `sticky-chapters`, or quiet `panel-accordion`: the programme, places and dates given.
5. Build (quiet): `PhotoText`, who makes it.
6. Centerpiece (loud, ink): `scrub-connector`, `zoom-through`, `manifesto-scrub` or `panel-wipe`.
7. Release (quiet): `PhotoText`.
8. Close (quiet): `cta-closing:pointer`, the line returning. Footer: `footer-reveal`, the curtain closing.

**Budgets.** Hard rules: a storyboard that breaks one is rewritten before the stop.
- Exactly one centerpiece; nothing pins after it. The opening holds at most 1.5 screens, all pins together about 4.5.
  Screens pinned: `hero-opener` 1, `hero-framed` and `hero-poster` 1.5, `manifesto-scrub` 2, `image-to-fullbleed`
  2.2, `grid-assembly` 2.5, `panel-wipe` 1.7 (2.6 when it closes), `film-strip` up to 3, `fanned-cards`, `split-pair`,
  `zoom-through` and `scrub-connector` 3, `project-stack` 1.1 per project after the first. Pinned in one variant, so
  never quiet: `hero-still:frame`, `hero-split:opening`, `hero-index:doorlopen`, `about-studio:doorkijk`,
  `approach:zin`, `manifesto:writes` and `:split`.
- Never two loud scenes side by side. At least four in ten scenes are quiet.
- Every frame from the site's language. A page transition only when the site has more than one route.
- Install only what the storyboard names, plus the header and the language's menu.
- One motif on the page. At most two full-bleed photo reveals, built the same way: `hero-framed:wand` and `:portret`,
  `hero-poster`, `hero-still:frame`, `image-to-fullbleed`, `zoom-through`, `grid-assembly`, `about-studio:plaat` and
  `cta-closing:photo` each count one.
- At most one marquee (`cta-closing:marquee`, `velocity-type`) and one custom cursor. One accent word, set in the
  accent face through the `accent` prop: in the opening's headline, in `Statement` and again in `Close`.
- No clock unless the lexicon is about time; then one, turned on by its prop (`clock`, `timeZone` on `wordmark-finale`).
- Two or three type moments at poster scale (12 to 20vw) on the page; everything else from the scale.
- Labels: no eyebrows above headings, no mono, no uppercase labels, no numbered steps. A small sentence-case label in
  the body face may sit beside a headline in the margin column or under a photo, in words from the lexicon.

## What makes it feel high end

The blocks hold this already; your glue must too. Detail in [references/craft.md](references/craft.md).

- Reveals clip from numbers, never scale a box; whole pixels; photos decoded before they show, cut or swap.
- Scroll effects are scroll-tied and reverse when the visitor scrolls back; key frames hold.
- The gate: `sq-js` on `<html>` before paint hides only what will animate, and shows it anyway after 3 s.
- Type on a photo sits on the measured calm side over the lightest flat veil that reaches 3:1.
- Display runs light (300, or the poster pairing's weight); fitted lines measured after `document.fonts.ready`.
- Never clip a descender: the kit's masks already keep them; never `overflow-hidden` on a heading of your own, and
  look at a line with a g and a j before calling type done.
- Tokens only, mixes in oklab, a surface step and a hairline instead of a shadow, one accent.
- Icons: Struq Icons (`@struq/icons`), functional only ([references/iconography.md](references/iconography.md)).

## When something goes wrong

- **Nothing scrolls:** an overlay called `getLenis()?.stop()` without `start()`, or `SmoothScroll` is not mounted.
- **Content stays invisible for 3 s:** the block never set `data-ready`; usually it threw. Read the console.
- **Wrong colours or faces:** `data-blocks` is missing on `<body>`, or STRUQ TOKENS sits before the kit import.
- **A fitted line overflows or jumps:** the face did not load (check `app/fonts.ts` and the links in the layout).
- **Vite:** [references/stack-targets.md](references/stack-targets.md).
