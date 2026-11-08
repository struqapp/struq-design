---
name: struq
description: "Award-tier studio websites for coding agents, built from Struq's catalogue of admitted blocks: preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with three real variants, judged at FWA level and shipped as files. Struq's palettes and type pairings as one token block, art-directed CC0 photos from the Struq beeldbank, Lenis on one GSAP clock, and a self-check against the AI tells. Works offline from its own copy; uses the Struq MCP (struq_richting, struq_blokken, struq_blok, struq_controle) when connected. Use when designing, building, redesigning, animating or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url> | direct <brief>"
---

# Struq

A site looks like a template because every choice in it is the likeliest one. Struq replaces those choices with
blocks a studio would ship: each one built, reviewed against a named award-tier reference and admitted by hand. Your
job is the direction, the order, the copy and the seams between blocks. Do not rebuild what a block already does.

`<skill-dir>` is the folder this file is in. The catalogue is [blocks/CATALOG.md](blocks/CATALOG.md); the craft that
makes the blocks feel high end is [references/craft.md](references/craft.md); the tell list is
[references/tells.md](references/tells.md).

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

Put `struq_richting`'s token block in `app/globals.css` in place of the STRUQ TOKENS block and its font URLs in
`app/fonts.ts`; drop `struq_blok`'s files into `components/struq/` at the paths it gives. Log each tool call:
`node <skill-dir>/scripts/log.mjs mcp <tool> --note "<what you took>"`. Run `check.mjs` either way.

## Build checklist

Copy this into `STRUQ.md` under the plan and tick each line as you finish it. Keep `STRUQ-LOG.md` from the first
step: append only, one entry per step (`node <skill-dir>/scripts/log.mjs "Step N Name" "what" "why"`; the scripts log
their own). `check.mjs` fails while a line is open or a ticked step has no entry.

```
## Build checklist
- [ ] 1 Project: Next.js App Router + Tailwind v4; blocks.mjs init printed OK
- [ ] 2 Direction and approval: palette, pairing, pack and the block order in STRUQ.md; the one stop sent and answered
- [ ] 3 Canon: the token block and fonts written (canon.mjs palette and type, or struq_richting)
- [ ] 4 Images: images.mjs --brief printed OK; only photos whose alt fits the client
- [ ] 5 Blocks: every block on the order installed and composed in app/page.tsx with real copy
- [ ] 6 Build: npm run build passes
- [ ] 7 Look: 390 and 1440 screenshots and one full scroll, fixes made (or "Verify: not seen, no browser")
- [ ] 8 Check: check.mjs prints RESULT: PASS
```

**1 Project.** Empty folder: `npx create-next-app@latest . --ts --tailwind --app --eslint --yes`, then
`node <skill-dir>/scripts/blocks.mjs init`. It copies the kit to `components/struq/kit/`, writes the layout (the
`sq-js` script before paint, the font links, `data-blocks` on `<body>`, `SmoothScroll`), `globals.css` (the kit
import, the theme names, the STRUQ TOKENS block) and `fonts.ts` over a starter, and installs gsap, @gsap/react and
lenis. Your own layout or stylesheet is never overwritten: merge from `recipes/app/`.

**2 Direction and the one stop.** Pick from the canon, never invent a palette or pairing while one fits. Palette by
the brief's mood, then its sector; a palette marked "kept out" (blue, purple, teal) only for a brand that is that
colour, declared as `Cool hue: declared because <brand colour>`. The brand's own colours and faces beat the canon:
write them into the same token names. Pairing by temperament: Fraunces (serif-editorial) warm and premium, Newsreader
literate, Sora calm and architectural, Urbanist soft and current, Bodoni Moda for fashion, Big Shoulders
(condensed-poster) for a campaign at poster scale, Unbounded for a wide agency voice. Then choose the order (below)
and write the top of STRUQ.md:

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where>
Idea: <the one idea the site is about>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body>
Images: pack <slug> (or the client's photos, then pack <slug>)
Order: <block slug:variant>, <block slug:variant>, ...
Assumptions: <every drafted line and every fact left out>
Verify: <filled in at step 7>
```

Then **stop once**, in the user's language: the plan in five lines (idea, palette, type, pack, order) and
"Akkoord? Heb je een logo, foto's of echte cijfers, stuur ze nu." (English: "Approve? If you have a logo, photos or
real numbers, send them now."). The build request is not the approval. Log the reply word for word:
`log.mjs "Step 2 Approval" "Asked: ..." "Reply: \"<their words>\""`. Any yes builds the plan; what they send replaces
the matching pick; a veto changes only what it names. Never ask a second time. When no pack shows the client's own
product, add: "Ik heb geen foto's van je <product>: stuur ze, dan komen ze in de hero."

**3 Canon.** `canon.mjs palette <id>` and `canon.mjs type <id>` rewrite the one STRUQ TOKENS block and `app/fonts.ts`:
the surface ladder, the field and inverse roles, `--photo-ground`, the accent's ink, the pairing's display weight and
faces, and each Google face asked for its real weights. It is the block Struq's lab judged every block in.

**4 Images.** `node <skill-dir>/scripts/images.mjs --brief "<the brief, in the user's words>"` picks the pack, keeps
only the photos whose alt fits the client, downloads and verifies them to `public/images/` and writes
`lib/struq-images.ts` (`images.hero`, `.band`, `.card`, `.column`, `.detail`, `.backdrop`, `imageCredit`, `imageFit`).
`images.mjs --list` shows every pack. Read the alts before you place a photo; with `imageFit` "none" use no photos and
let a background block carry the hero. Offline it writes plates graded to the palette. Set the title, description and
`lang` in the layout.

**5 Blocks.** Install the order with `blocks.mjs add <slug> ...` (or `struq_blok`), read each block's file header for
its props, variants and how it mounts, and compose `app/page.tsx` with the brief's real copy. Glue between blocks uses
the kit (`Reveal`, `MediaFrame`, `SplitHeadline`, `MagneticButton`) and the craft rules, never a fresh motion system.

**6 to 8.** `npm run build` passes (fix your code, never delete a block to get green). Look at the production build
(`npx next start -p 4321`) at 390 and 1440 and scroll it once: the preloader lands on the hero, every frame fills, each
pin engages and releases without a jump, nothing overflows at 390, scrolling back reverses. Never claim you saw what
you did not. Then `check.mjs` until `RESULT: PASS`.

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
