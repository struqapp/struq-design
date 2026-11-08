---
name: struq
description: "Award-tier studio websites for coding agents, composed from Struq's admitted blocks through the Struq MCP: preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with real variants and judged at FWA level. struq_richting gives the palette, type pairing and photo pack as tokens, fonts and photos; struq_blok hands over each block and its kit as files; struq_controle returns the check against the AI tells. Use when designing, building, redesigning or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url>"
---

# Struq

A site looks like a template because every choice in it is the likeliest one. Struq replaces those choices with
blocks a studio would ship: each one built, reviewed against a named award-tier reference and admitted by hand. Your
job is the direction, the order, the copy and the seams between blocks. Do not rebuild what a block already does.

This plugin works through the Struq MCP, which it connects for you (sign in once through `/mcp`). The catalogue is
`struq_blokken`, or [catalog.json](catalog.json) in this folder when you only need to read it; the craft that makes the
blocks feel high end is [references/craft.md](references/craft.md); the tell list is
[references/tells.md](references/tells.md). The full offline version, with the blocks, canon and scripts on disk, is
`npx @struq/skill`.

| Invocation | Mode |
|---|---|
| `/struq:struq <brief>` | **Build**: the checklist below, start to finish. |
| `/struq:struq redesign <path>` | Keep the brand, copy and components ([references/triage.md](references/triage.md)); swap in blocks where the page is weakest, then run the checklist from step 3. |
| `/struq:struq audit <path-or-url>` | Change nothing. Run `struq_controle`'s detectors on the files, report every FAIL and WARN and the three fixes with the most visual payoff. Never a numeric score. |

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

## The four tools

| Need | Tool | What comes back |
|---|---|---|
| A direction | `struq_richting(brief)`, or with `palette` and `type` ids, or `light` | The palette and pairing, the token block as CSS, the font stylesheet URLs, the photo pack with every photo's alt, size and calm side, the icon set, and the reason in plain words. |
| What blocks exist | `struq_blokken(kind?, query?)` | Every admitted block with its variants. [catalog.json](catalog.json) is the same list at this plugin's release. |
| A block as files | `struq_blok(slug, variant?)` | The block, every file it imports, the kit and its `blocks.css`, each with its target path; the packages to install, the props, a usage example and the one-time setup. |
| The tell check | `struq_controle()` | The detectors and rules. Run them on your own files; Struq never reads your code. |

Put every file `struq_blok` returns at its target under `components/struq/`, exactly as given, so the relative imports
hold. Follow its setup lines once per project. Put `struq_richting`'s token block in `app/globals.css` after the
`blocks.css` import and its font URLs in the layout. Note each tool call in `STRUQ-LOG.md`: the tool, what you asked
for, what you took.

## Build checklist

Copy this into `STRUQ.md` under the plan and tick each line as you finish it. Keep `STRUQ-LOG.md` from the first
step: append only, one entry per step with what you did and why.

```
## Build checklist
- [ ] 1 Project: Next.js App Router + Tailwind v4
- [ ] 2 Direction and approval: palette, pairing, pack and the block order in STRUQ.md; the one stop sent and answered
- [ ] 3 Canon: struq_richting's token block and fonts written
- [ ] 4 Images: only photos whose alt fits the client, placed with their alt and calm side
- [ ] 5 Blocks: every block on the order taken with struq_blok and composed in app/page.tsx with real copy
- [ ] 6 Build: the project's production build passes
- [ ] 7 Look: 390 and 1440 screenshots and one full scroll, fixes made (or "Verify: not seen, no browser")
- [ ] 8 Check: struq_controle's detectors find no FAIL
```

**1 Project.** Work in the user's Next.js App Router project with Tailwind v4. In an empty folder, ask the user to
create one (create-next-app with TypeScript, Tailwind and the App Router) or create it with their approval. Your own
layout and stylesheet stay; merge the setup lines from `struq_blok` into them.

**2 Direction and the one stop.** Call `struq_richting` with the brief in the user's words; never invent a palette or
pairing while the canon has one that fits. Palette by the brief's mood, then its sector; a cool palette (blue, purple,
teal) only for a brand that is that colour, declared as `Cool hue: declared because <brand colour>`. The brand's own
colours and faces beat the canon: write them into the same token names. Pairing by temperament: Fraunces
(serif-editorial) warm and premium, Newsreader literate, Sora calm and architectural, Urbanist soft and current, Bodoni
Moda for fashion, Big Shoulders (condensed-poster) for a campaign at poster scale, Unbounded for a wide agency voice;
ask again with `palette` or `type` to change one. Then choose the order (below) and write the top of STRUQ.md:

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where>
Idea: <the one idea the site is about>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body>
Images: pack <id> (or the client's photos, then pack <id>)
Order: <block slug:variant>, <block slug:variant>, ...
Assumptions: <every drafted line and every fact left out>
Verify: <filled in at step 7>
```

Then **stop once**, in the user's language: the plan in five lines (idea, palette, type, pack, order) and
"Akkoord? Heb je een logo, foto's of echte cijfers, stuur ze nu." (English: "Approve? If you have a logo, photos or
real numbers, send them now."). The build request is not the approval. Log the reply word for word. Any yes builds
the plan; what they send replaces the matching pick; a veto changes only what it names. Never ask a second time. When
no pack shows the client's own product, add: "Ik heb geen foto's van je <product>: stuur ze, dan komen ze in de hero."

**3 Canon.** Write `struq_richting`'s token block after the `blocks.css` import in `app/globals.css`, in place of any
earlier token block, and load every font URL it returns in the layout. Never drop a weight it asks for: each URL
carries the face's real range. It is the block Struq's lab judged every block in.

**4 Images.** Read the alts of the pack `struq_richting` returned and keep only the photos that fit the client. Save
the ones you use under `public/images/` (or allow the host in `images.remotePatterns`) and keep each photo's src, alt,
width, height and calm side together in `lib/struq-images.ts`, in the shape the blocks read (`StruqImage` in
`components/struq/kit/images.ts`). With no fitting pack, use no stock photos and let a background block carry the
hero. Set the title, description and `lang` in the layout.

**5 Blocks.** Take each block on the order with `struq_blok(slug, variant)`, install the packages it names, read its
props and usage, and compose `app/page.tsx` with the brief's real copy. When several blocks each bring `blocks.css`,
keep one file with the kit base once and every block's marked sections. Glue between blocks uses the kit (`Reveal`,
`MediaFrame`, `SplitHeadline`, `MagneticButton`) and the craft rules, never a fresh motion system.

**6 to 8.** The production build passes (fix your code, never delete a block to get green). Look at the production
build at 390 and 1440 and scroll it once: the preloader lands on the hero, every frame fills, each pin engages and
releases without a jump, nothing overflows at 390, scrolling back reverses. Never claim you saw what you did not. Then
run `struq_controle`'s detectors on your files until nothing fails.

## The order of a studio site

Read top to bottom; each line is a slot with the blocks that fill it. Seven to nine slots, not all of them every time.

1. **Arrival, once:** a preloader on the first visit (`preloader-wordmark`, `-slices`, `-gate`, `-stack`) and the
   page transition of the same language on every navigation (`page-transition-slices`, `-gate`, `-stack`; mount it in
   the layout). Slices with slices, gate with gate, stack with stack: they share one handover.
2. **Header:** `header-bar` (quiet, settle, split) or `menu-curtain` for a full-screen menu. Sections under it say
   their ground with `data-bar-tone`.
3. **Hero:** `hero-still` (one photo, calm side measured), `hero-framed` (the print on the wall), `hero-split` (a
   seam), `hero-index` (the work list as the first screen), `hero-poster` (type as poster), `hero-opener` (full bleed
   with the WebGL layer), or a background block (`background-aurora`, `-silk`, `-facets`) when the hero is type on a
   live field.
4. **Manifesto:** `manifesto`, `manifesto-scrub`, `velocity-type` or `reveals`: the one statement, given a screen.
5. **About:** `about-studio` or `split-pair`.
6. **Approach:** `approach`, `sticky-chapters`, `panel-accordion` or `fill-rows`. Never numbered steps.
7. **Work:** `project-stack`, `hover-list`, `image-trail`, `film-strip`, `grid-assembly`, `fanned-cards`, or a scene
   move (`image-to-fullbleed`, `panel-wipe`, `zoom-through`, `scrub-connector`, `pixel-resolve`) between two slots.
8. **Closing call to action:** `cta-closing`, with `contact-form` when the site asks for input.
9. **Footer:** `footer-reveal`, `footer-contact` or `wordmark-finale`.

**Picking.** One lead move per page, the hero or a work piece, and the rest quieter around it. Never two pinned
pieces back to back: a plain slot breathes between them. One contrast scene, at most two: wrap a slot in
`scene-inverse` or `scene-field`. Choose the variant by the brief and the photos, not by novelty: a variant is a
different composition of the same idea, and every variant works light and dark. Name a block the user asks for first.
A studio with real project photos leads with work (`hero-index`, `project-stack`); a studio without them leads with
type and one photo (`hero-poster`, `hero-still`, `manifesto`).

## What makes it feel high end

The blocks hold this already; your glue must too. Detail in [references/craft.md](references/craft.md).

- Reveals clip from numbers (inset values tweened as numbers), never scale a box; positions in whole pixels.
- Photos are decoded before they show, cut or swap.
- Scroll effects are scroll-tied and reverse when the visitor scrolls back; key frames hold.
- The gate: `sq-js` on `<html>` before paint hides only what will animate, and shows it anyway after 3 s.
- Type on a photo sits on the measured calm side over the lightest flat veil that reaches 3:1.
- Display faces run light (300, or the poster pairing's own weight); fitted lines are measured with the real face
  after `document.fonts.ready`.
- Tokens only, mixes in oklab, a surface step and a hairline instead of a shadow, one accent.
- Icons: Struq Icons (`@struq/icons`), functional only ([references/iconography.md](references/iconography.md)).

## When something goes wrong

- **Nothing scrolls:** an overlay called `getLenis()?.stop()` without `start()`, or `SmoothScroll` is not mounted.
- **Content stays invisible for 3 s:** the block never set `data-ready`; usually it threw. Read the console.
- **Blocks render in the wrong colours or faces:** `data-blocks` is missing on `<body>`, or the STRUQ TOKENS block
  sits before the kit import in `globals.css`.
- **A fitted line overflows or jumps:** the face did not load (check `app/fonts.ts` and the links in the layout).
- **Vite:** [references/stack-targets.md](references/stack-targets.md).
