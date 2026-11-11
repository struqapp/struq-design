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
- [ ] 2 Treatment and approval: the treatment and storyboard in STRUQ.md within the budgets; the one stop sent and answered
- [ ] 3 Canon: struq_richting's token block and fonts written
- [ ] 4 Images: only photos whose alt fits the client, placed with their alt and calm side
- [ ] 5 Scenes: frames and the centerpiece taken with struq_blok, every other scene built as the storyboard says, composed in app/page.tsx with real copy
- [ ] 6 Build: the project's production build passes
- [ ] 7 Look: 390 and 1440 screenshots and one full scroll, fixes made (or "Verify: not seen, no browser")
- [ ] 8 Check: struq_controle's detectors find no FAIL
```

**1 Project.** Work in the user's Next.js App Router project with Tailwind v4. In an empty folder, ask the user to
create one (create-next-app with TypeScript, Tailwind and the App Router) or create it with their approval. Your own
layout and stylesheet stay; merge the setup lines from `struq_blok` into them.

**2 Treatment and the one stop.** Call `struq_richting` with the brief in the user's words; never invent a palette or
pairing while the canon has one that fits. Palette by the brief's mood, then its sector; a cool palette (blue, purple,
teal) only for a brand that is that colour, declared as `Cool hue: declared because <brand colour>`. The brand's own
colours and faces beat the canon: write them into the same token names. Pairing by temperament: Fraunces
(serif-editorial) warm and premium, Newsreader literate, Sora calm and architectural, Urbanist soft and current, Bodoni
Moda for fashion, Big Shoulders (condensed-poster) for a campaign at poster scale, Unbounded for a wide agency voice;
ask again with `palette` or `type` to change one. Then pick the language, cast the brief into its arc (The film,
below; swap at most one scene; a block the user names goes in first) and write the treatment at the top of STRUQ.md,
every line filled:

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where>
Idea: <one sentence the whole site is about>
Language: <weight | cut | curtain>
Motif: <line | frame | aperture | cut | word | field>: <what it is in this client's world and how it changes down the page>
Lexicon: <three to five words or numbers from the client's own world; every label, counter and caption uses these, never film or studio jargon the client does not own>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body>
Images: pack <id> (or the client's photos, then pack <id>)
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
the reply word for word. Any yes builds the treatment; what they send replaces the matching pick; a veto changes only
what it names. Never ask twice. When no pack shows the client's product, add: "Ik heb geen foto's van je <product>:
stuur ze, dan komen ze in de hero."

**3 Canon.** Write `struq_richting`'s token block after the `blocks.css` import in `app/globals.css`, in place of any
earlier token block, and load every font URL it returns in the layout. Never drop a weight it asks for: each URL
carries the face's real range. It is the block Struq's lab judged every block in.

**4 Images.** Read the alts of the pack `struq_richting` returned and keep only the photos that fit the client. Save
the ones you use under `public/images/` (or allow the host in `images.remotePatterns`) and keep each photo's src, alt,
width, height and calm side together in `lib/struq-images.ts`, in the shape the blocks read (`StruqImage` in
`components/struq/kit/images.ts`). With no fitting pack, use no stock photos and let a background block carry the
hero. Set the title, description and `lang` in the layout.

**5 Scenes.** Take the language's frames and the centerpiece first with `struq_blok(slug, variant)`, then each scene
as its storyboard line says; install the packages each names and read its props and usage. Fill every label, counter
and caption from the lexicon; wrap the tone arc's ink or field scenes in `scene-inverse` or `scene-field`. When
several blocks each bring `blocks.css`, keep one file with the kit base once and every block's marked sections. Own
scenes and glue use the kit (`Reveal`, `MediaFrame`, `SplitHeadline`) and the craft rules.

**6 to 8.** The production build passes (fix your code, never delete a block to get green). Look at the production
build at 390 and 1440 and scroll it once: the preloader lands on the hero, every frame fills, each pin engages and
releases without a jump, nothing overflows at 390, scrolling back reverses. Never claim you saw what you did not. Then
run `struq_controle`'s detectors on your files until nothing fails.

## The film

One film, not a showreel: every frame from one language, one arc, one centerpiece, one motif seen at the arrival,
the opening, the centerpiece and the close. A loud scene moves with the scroll (a pin, a scrub, a reveal to full
bleed); a quiet scene is type and a photo that enter once and sit still. Two tags only: `(loud)` when the block's
energy in the catalogue is 2 or more, `(quiet)` at 1 or less or for an own scene (your type and photo with the kit's
`Reveal`, `SplitHeadline` and `MediaFrame`, entering once).

| Language | For | Feel | Frames: preloader, page transition, menu | Motif |
|---|---|---|---|---|
| weight | architecture, hotels, craft, interiors | photographic and slow; a print grows into place; long holds | `preloader-stack`, `page-transition-stack`, `menu-curtain:stack` | frame |
| cut | fashion, agencies, portfolios, music | hard cuts, short masks, no fades, short holds | `preloader-slices`, `page-transition-slices`, `menu-curtain:slices` | cut or word |
| curtain | campaigns, launches, events, culture | a light line, panels part, a long hold before the reveal | `preloader-wordmark:split`, `page-transition-gate`, `menu-curtain:gate` | line or aperture |

Pick the language by the client's sector in the For column. Another language only when the brief asks for that feel
in its own words; then quote those words on the `Language:` line. The idea may pick another motif of the six.
`preloader-gate` is a film leader (a dial counting 3, 2, 1): film clients only. The header is `header-bar:quiet` or
`:settle`; sections say their ground with `data-bar-tone`. Each arc is loud only at the opening, the centerpiece and
at most one gentle scene with a quiet scene on each side. The Statement is the first type moment: an own scene, one
sentence at 12 to 16vw with `SplitHeadline`, still. Only the Statement and the Close are type alone: every other own
scene sets a photo (`MediaFrame`) beside its type on the 12 column grid, so a quiet scene is composed, never empty.

**weight.** Paper throughout, ink at the centerpiece.
1. Arrival (frame): `preloader-stack`; the print lands on the hero photo.
2. Opening (loud, short hold): `hero-framed:wand` or `:portret`, `hero-still:frame`; calmer, `hero-still:still` (quiet).
3. Statement (quiet): own scene.
4. About (loud, the gentle one): `about-studio:wandeling` (`:plaat` is a full-bleed reveal), or a quiet own scene.
5. Approach (quiet): `approach:schuif`, or an own scene of hairline rows.
6. Centerpiece (loud, ink): `image-to-fullbleed`, `grid-assembly`, `zoom-through`, or `project-stack` (real projects).
7. Release (quiet): own scene, a photo and a short text.
8. Close (quiet): own scene echoing the opening, type only after a full-bleed centerpiece. Footer: `wordmark-finale`.

**cut.** Paper and ink in hard alternation, never a fade.
1. Arrival (frame): `preloader-slices`, its caption from the lexicon.
2. Opening (loud): `hero-poster` in poster type; quiet: `hero-index:lijst`, `:venster`, `hero-split:naad`, `:liggend`.
3. Work (quiet): `hover-list` or `image-trail`; after `hero-index`, already a list, `reveals:clip`.
4. Statement (quiet): own scene.
5. Centerpiece (loud, ink): `split-pair`, `panel-wipe`, `project-stack`, `fanned-cards`, `film-strip` (film clients).
6. Release (quiet): `fill-rows`, or an own scene of hairline rows.
7. Close (quiet): type only in an own scene, or `cta-closing:pointer`. Footer: `footer-contact`.

**curtain.** Field or ink at the opening, paper between, ink at the centerpiece.
1. Arrival (frame): `preloader-wordmark:split`; the name parts on its line onto the opening.
2. Opening (loud): `hero-opener` or a background block, the line at poster scale; calmer, `hero-still:horizon` (quiet).
3. Statement (quiet): own scene.
4. Details (loud, the gentle one): `sticky-chapters`, or quiet `panel-accordion`: the programme, places and dates given.
5. Build (quiet): own scene, who makes it.
6. Centerpiece (loud, ink): `scrub-connector`, `zoom-through`, `manifesto-scrub` or `panel-wipe`.
7. Release (quiet): own scene, a photo and a short text.
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
- Install only what the storyboard names, plus the header and the language's menu.
- One motif on the page. At most two full-bleed photo reveals, built the same way: `hero-framed:wand` and `:portret`,
  `hero-poster`, `hero-still:frame`, `image-to-fullbleed`, `zoom-through`, `grid-assembly`, `about-studio:plaat` and
  `cta-closing:photo` each count one.
- At most one marquee (`cta-closing:marquee`, `velocity-type`) and one custom cursor. An accent face, if loaded, sets
  one word of the h1 and returns in the close.
- A block with a live clock goes without it unless the lexicon is about time: `wordmark-finale` without `timeZone`,
  `header-bar:quiet` or `:settle`, never `:split`. `hero-still`, `footer-contact` and `menu-curtain` always tick: at
  most one of them on the page, and it is the one clock.
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
