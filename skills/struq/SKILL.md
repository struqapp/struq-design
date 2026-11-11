---
name: struq
description: "Award-tier studio websites for coding agents, built from Struq's catalogue of admitted blocks and directed as one film: one idea, one motion language, one motif and one centerpiece, cast into a storyboard before a block is installed. Preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with real variants, judged at FWA level and shipped as files. Struq's palettes and type pairings as one token block, art-directed CC0 photos from the Struq beeldbank, Lenis on one GSAP clock, and a self-check against the AI tells. Works offline from its own copy; uses the Struq MCP (struq_richting, struq_blokken, struq_blok, struq_controle) when connected. Use when designing, building, redesigning, animating or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url> | direct <brief>"
---

# Struq

A site looks like a template when every choice is the likeliest one, and like a showreel when every slot gets the
loudest block. Struq casts blocks a studio would ship into one film. Your job is the treatment (one idea, language,
motif and centerpiece), the copy and the seams. Do not rebuild what a block already does. `<skill-dir>` is this
file's folder; the catalogue is [blocks/CATALOG.md](blocks/CATALOG.md), a worked treatment per language
[references/film.md](references/film.md), the craft [references/craft.md](references/craft.md).

| Invocation | Mode |
|---|---|
| `/struq <brief>` | **Build**: the checklist below, start to finish. |
| `/struq redesign <path>` | Keep the brand, copy and components ([references/triage.md](references/triage.md)); swap in blocks where the page is weakest, then run the checklist from step 3. |
| `/struq audit <path-or-url>` | Change nothing. Run `check.mjs` (and `struq_controle` when connected), report every FAIL and WARN and the three fixes with the most visual payoff. Never a numeric score. |
| `/struq direct <brief>` | One continuous WebGL experience across chapters: steps 1 to 4, then [cinematic/README.md](cinematic/README.md). |

For a dashboard or product UI keep the tokens, faces and tells; drop the preloader, Lenis and the pinned pieces.

## Three rules that never bend

1. **Never an empty frame.** Every image slot holds a real photo: the client's, else the beeldbank pack (free, CC0,
   no permission needed). A photo shows the world around the client, never their own room, team or product unless it
   is theirs; captions are written from the alt.
2. **Never invent facts.** No testimonials, logos, stats, awards, prices, addresses, hours, bios or quotes the brief
   did not give. Leave them out and list them under Assumptions in STRUQ.md.
3. **Never the tells** ([references/tells.md](references/tells.md)): no eyebrows, pills, gradients or gradient text,
   glow, mono on marketing, Inter or the other generator faces, default purple or blue, numbered steps, icon grids,
   stat banners, generic CTAs, em or en dashes.

## The MCP, or the skill's own copy

The Struq MCP and this skill serve the same blocks and the same derivation. Use the tool when it is connected; the
offline column does the same from the skill's copy.

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
- [ ] 2 Treatment and approval: the treatment and storyboard in STRUQ.md within the budgets; the one stop sent and answered
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
`fonts.ts`, and gsap, @gsap/react and lenis. It never overwrites your own layout or stylesheet: merge from
`recipes/app/`.

**2 Treatment and the one stop.** Pick from the canon, never invent a palette or pairing while one fits: palette by
mood, then sector; a "kept out" palette (blue, purple, teal) only for a brand of that colour, declared as `Cool hue:
declared because <brand colour>`; the brand's own colours and faces beat the canon, in the same token names. Pairing
by temperament: Fraunces (serif-editorial) warm and premium, Newsreader literate, Sora calm and architectural,
Urbanist soft and current, Bodoni Moda for fashion, Big Shoulders (condensed-poster) for a campaign at poster scale,
Unbounded for a wide agency voice. Then pick the language, cast the brief into its arc (The film, below; swap at most
one scene; a block the user names goes in first) and write the treatment at the top of STRUQ.md, every line filled:

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where>
Idea: <a point of view in one sentence, never a description of the client: what a visitor believes when they leave>
Language: <weight | cut | curtain>
Motif: <line | frame | aperture | cut | word | field>: <what it is in this client's world and how it changes down the page>
Lexicon: <three to five working words of the client's trade (a material, a part, a tool, a unit), never the brief repeated; every label, counter and caption uses these, no film or studio jargon the client does not own>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body>
Images: pack <slug> (or the client's photos, then pack <slug>)
Centerpiece: <block>: <why this is this site's one moment>
Tone arc: <ground per scene, for example paper, paper, paper, ink, paper, field>
Storyboard:
1. Arrival   (frame)  <preloader of the language> | lands on: <what>
2. Opening   (loud)   <block:variant> | on screen: <...> | enters: <...> | hands over: <...>
3. <scene>   (quiet)  <block:variant or "own scene"> | on screen: <...> | enters: <...> | hands over: <...>
...
N. Close     (quiet)  <block or own scene> | echoes the opening: <how> | footer: <block>
Assumptions: <every drafted line and every fact left out>
Verify: <filled in at step 7>
```

Then **stop once**, in the user's language, and show the treatment, never a list of block slugs: idea, language,
motif and centerpiece in plain words; the storyboard as numbered lines, one sentence each of what the visitor sees;
palette, type and pack on one line; then "Akkoord? Heb je een logo, foto's of echte cijfers, stuur ze nu." (English:
"Approve? If you have a logo, photos or real numbers, send them now."). The build request is not the approval. Log
the reply word for word: `log.mjs "Step 2 Approval" "Asked: ..." "Reply: \"<their words>\""`. Any yes builds the
treatment; what they send replaces the matching pick; a veto changes only what it names. Never ask twice. When no
pack shows the client's product, add: "Ik heb geen foto's van je <product>: stuur ze, dan komen ze in de hero."

**3 Canon.** `canon.mjs palette <id>` and `canon.mjs type <id>` rewrite the one STRUQ TOKENS block and `app/fonts.ts`
(surfaces, field and inverse roles, `--photo-ground`, display weight, each face at its real weights): the lab's block.

**4 Images.** `node <skill-dir>/scripts/images.mjs --brief "<the brief, in the user's words>"` keeps only the pack's
photos whose alt fits the client, verifies them into `public/images/` and writes `lib/struq-images.ts` (`images.hero`,
`.band`, `.card`, `.column`, `.detail`, `.backdrop`, `imageCredit`, `imageFit`). Read the alts before you place a
photo; with `imageFit` "none" a background block carries the hero. Title and `lang` go in the layout.

**5 Scenes.** Install the language's frames and the centerpiece first (`blocks.mjs add <slug> ...` or `struq_blok`),
then each scene as its storyboard line says. Read each block's file header for its props and how it mounts; fill
every label, counter and caption from the lexicon; wrap the tone arc's ink or field scenes in `scene-inverse` or
`scene-field`. Own scenes and glue use the kit (`Reveal`, `MediaFrame`, `SplitHeadline`) and the craft rules.

**6 to 8.** `npm run build` passes (fix your code, never delete a block to get green). Look at
`npx next start -p 4321` at 390 and 1440 and scroll once: the preloader lands on the hero, every frame fills, each pin
engages and lets go without a jump, nothing overflows, scrolling back reverses. Never claim you saw what you did not.
Then `check.mjs` until `RESULT: PASS`.

## The film

One film, not a showreel: every frame from one language, one arc, one centerpiece, one motif seen at the arrival,
the opening, the centerpiece and the close. A loud scene moves with the scroll (a pin, a scrub, a reveal to full
bleed); a quiet scene is type and a photo that enter once and sit still.

| Language | For | Feel | Frames: preloader, page transition, menu | Motif |
|---|---|---|---|---|
| weight | architecture, hotels, craft, interiors | photographic and slow; a print grows into place; long holds | `preloader-stack`, `page-transition-stack`, `menu-curtain:stack` | frame |
| cut | fashion, agencies, portfolios, music | hard cuts, short masks, no fades, short holds | `preloader-slices`, `page-transition-slices`, `menu-curtain:slices` | cut or word |
| curtain | campaigns, launches, events, culture | a light line, panels part, a long hold before the reveal | `preloader-wordmark:split`, `page-transition-gate`, `menu-curtain:gate` | line or aperture |

The idea may pick another motif of the six. `preloader-gate` is a fixed film leader (a dial counting 3, 2, 1): film
clients only. The header is `header-bar:quiet` or `:settle`; sections say their ground with `data-bar-tone`.

**weight.** Paper throughout, ink at the centerpiece.
1. Arrival (frame): `preloader-stack`; the print lands on the hero photo.
2. Opening (loud, a short hold): `hero-still:still` or `hero-framed`.
3. Statement (quiet): one sentence set very large and still: `manifesto:quote`, or an own scene with `SplitHeadline`.
4. About (quiet): `about-studio:wandeling` or an own scene (`:plaat` counts as a full-bleed reveal).
5. Approach (quiet): `approach:draad` (it draws a line) or hairline rows of your own.
6. Centerpiece (loud, ink): `grid-assembly`, `image-to-fullbleed`, `zoom-through`, or `project-stack` (real projects).
7. Release (quiet): one plain scene, a photo and a short text, no pin, no scrub.
8. Close (quiet): echoes the opening, type only after a full-bleed centerpiece. Footer: `wordmark-finale`.

**cut.** Paper and ink in hard alternation, never a fade.
1. Arrival (frame): `preloader-slices`, its caption from the lexicon.
2. Opening (loud): `hero-poster`, `hero-index:lijst` or `:venster`, `hero-split:naad` or `:liggend`; poster type.
3. Work (quiet): `hover-list` or `image-trail`; after `hero-index`, already a list, `reveals:clip`.
4. Statement (quiet): `reveals:lines` or `manifesto:quote`.
5. Centerpiece (loud, ink): `split-pair`, `panel-wipe`, `project-stack`, `fanned-cards`, `film-strip` (film clients).
6. Release (quiet): `fill-rows` or hairline rows of your own.
7. Close (quiet): `cta-closing:marquee` (the page's only marquee) or type only. Footer: `footer-contact`.

**curtain.** Field or ink at the opening, paper between, ink at the centerpiece.
1. Arrival (frame): `preloader-wordmark:split`; the name parts on its line onto the opening.
2. Opening (loud): `hero-opener`, a background block with the line at poster scale, or `hero-still:horizon`.
3. Statement (quiet): `reveals:lines` or `manifesto:quote`.
4. Details (quiet): `sticky-chapters` or `panel-accordion`: the programme, places and dates the brief gave.
5. Build (quiet): `about-studio:wandeling` or `:plaat`, or an own scene.
6. Centerpiece (loud, ink): `zoom-through`, `scrub-connector`, `manifesto-scrub` or `panel-wipe`.
7. Release (quiet): one plain scene, a photo and a short text.
8. Close (quiet): `cta-closing:pointer`, the line returning. Footer `footer-reveal`, the curtain closing.

**Budgets.** Hard rules: a storyboard that breaks one is rewritten before the stop.
- Exactly one centerpiece; nothing pins after it. The opening holds at most 1.5 screens, all pins together about 4.5.
  Screens pinned: `hero-opener` 1, `hero-framed` and `hero-poster` 1.5, `manifesto-scrub` 2, `image-to-fullbleed`
  2.2, `grid-assembly` 2.5, `panel-wipe` 1.7 (2.6 when it closes), `film-strip` up to 3, `fanned-cards`, `split-pair`,
  `zoom-through` and `scrub-connector` 3, `project-stack` 1.1 per project after the first. Pinned in one variant, so
  never quiet: `hero-still:frame`, `hero-split:opening`, `hero-index:doorlopen`, `about-studio:doorkijk`,
  `approach:zin`, `manifesto:writes` and `:split`.
- Never two loud scenes side by side. At least four in ten scenes are quiet.
- Every frame from the site's language. A page transition only when the site has more than one route.
- One motif on the page. At most two full-bleed photo reveals, built the same way: `hero-framed:wand` and `:portret`,
  `hero-poster`, `hero-still:frame`, `image-to-fullbleed`, `zoom-through`, `grid-assembly`, `about-studio:plaat` and
  `cta-closing:photo` each count one.
- At most one live clock, one marquee and one custom cursor. Clocks: `hero-still` (its caption), `footer-contact`,
  `header-bar:split`, `menu-curtain`, `wordmark-finale` given a `timeZone`. Marquees: `cta-closing:marquee`,
  `velocity-type`. An accent face, if loaded, sets one word of the h1 and returns in the close.
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
- Tokens only, mixes in oklab, a surface step and a hairline instead of a shadow, one accent.
- Icons: Struq Icons (`@struq/icons`), functional only ([references/iconography.md](references/iconography.md)).

## When something goes wrong

- **Nothing scrolls:** an overlay called `getLenis()?.stop()` without `start()`, or `SmoothScroll` is not mounted.
- **Content stays invisible for 3 s:** the block never set `data-ready`; usually it threw. Read the console.
- **Blocks render in the wrong colours or faces:** `data-blocks` is missing on `<body>`, or the STRUQ TOKENS block
  sits before the kit import in `globals.css`.
- **A fitted line overflows or jumps:** the face did not load (check `app/fonts.ts` and the links in the layout).
- **Vite:** [references/stack-targets.md](references/stack-targets.md).
