---
name: struq
description: "Websites at the level of an Awwwards Site of the Day or an FWA of the Day, for coding agents: one strong idea, confident art direction, choreographed motion and real-time 3D that serves the concept, the bar set by studios like Active Theory, Lusion, Resn, Immersive Garden, Locomotive, Obys and Basement Studio. Composed from Struq's hardened blocks through the Struq MCP (preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with real variants) plus recipes for glass, light, shaders and scroll choreography. struq_direction gives the palette, type pairing and photo pack as tokens, fonts and photos; struq_block hands over each block and its kit as files; struq_check returns the check against the AI tells. Use when designing, building, redesigning or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url>"
---

# Struq

## The bar

Design and build this site at the level of an Awwwards Site of the Day or an FWA of the Day winner. Think of the work
of studios like Active Theory, Lusion, Resn, Immersive Garden, Locomotive, Obys and Basement Studio: one strong idea,
confident art direction, choreographed motion, and real-time 3D that serves the concept. Those studios are a quality
bar only. Copy no existing site's layout, name, assets or signature effect; the concept must be original.

You are creative director, designer and creative developer in one. Sites at this level do not win on effects. They
win because every element, from the typeface to the easing curve, serves a single idea. Hold yourself to that
standard: make decisive choices instead of safe ones, and know when to hold back.

**And it sells.** This is a client's site, not a showreel. A visitor knows within the first screen what this is, who it
is for and what to do next; every scene after it moves them closer to that door. The copy reads like a senior
copywriter wrote it: concrete, in the client's own words, a headline with a point of view and a line under it that
says plainly what they make or do ([references/copy.md](references/copy.md)). Professional, never gimmicky: an effect
earns its place by showing the product, the craft or the idea better than a still would. If it only shows off, cut
it.

**One world, one scale ladder.** A studio site feels whole because the middle is the same film as the opening, not
a stack of type cards after it. Poster-scale type is for the opening and at most two other moments; every other
scene sets its heading a clear step down (about 2.5 to 4.5rem on a desktop) and its body at reading size, and leads
with something to look at: the object closer or in another light, the material, the subject piece, a photo of this
client's world, a drawing at scale, the way to buy. A sentence of more than about twelve words never runs at display
size, and a scene that is only a sentence is a breath, at most one per page. When the brief is thin, the middle shows
rather than tells: the craft, the form in detail, the place, never more sentences at a larger size. With a real-time
signature the scene carries on down the page ([references/realtime.md](references/realtime.md), "One world"). Every
screen of scroll changes something: no stretch of a screen sits empty.

Work in this order:

1. **The idea**: a point of view on this client that a visitor leaves believing, not a description of the business.
2. **The signature element**: the one moment a juror remembers tomorrow. Everything else makes room for it. It
   lives on the first screen or starts there: the opening is where a visitor decides to stay, so never hide the best
   moment halfway down a page of type. **The first screen is the signature, full-bleed and moving from the first
   second** (a band of drawing above a line of type is not it), with display type on or beside it, arriving after a
   preloader whose ending is the signature's own first beat (the lights come on, the door opens), and one page
   transition and one menu curtain in the same motion language and eases. On a one-page site the transition is the
   handover between scenes. The test: would a juror stop scrolling on frame one; is the signature full-bleed and
   moving within the first second; are the preloader, the transition and the menu curtain one motion language? A
   calm editorial page of small serif lines on a pale ground is what every agent makes; it is the reflex to beat.
3. **The system**: type, palette, motion language, easing curves and grid, each chosen because of the idea.
4. **The build**: Struq's blocks first, because they are hardened and already at this level. **3D is a choice, never
   a default.** Use it only when the subject is an object that real-time light makes more beautiful (glass, metal,
   ceramic, a product) and the render can stand beside a studio's; a scene that looks like a game (blocky tiles,
   toy houses, procedural props, flat plastic) is worse than none. A roofer, a lawyer, a restaurant or a portfolio
   mostly wins on type, photography, a drawn piece and motion. When 3D is unsure, the one stop asks. For a real-time
   signature start from the 3D kit (`kit/gl`: a Stage with studio light and post-processing, real glass,
   ceramic and metal, an inner light, a scroll camera). Adapt or fork any of it, or write your own scenes and shaders,
   wherever the idea needs a moment the kit does not have.

**Speak the craft and use it.** Art direction, editorial grid, display typography, kinetic typography, signature
element, motion language, easing curve, stagger, mask reveal, split text, scroll-driven animation, scrubbing, pinning,
smooth scroll, lerp, inertia, scroll velocity, parallax, page transition, preloader, micro-interaction, magnetic
button, custom cursor, marquee, theme shift; GLSL, vertex and fragment shaders, simplex noise, FBM, curl noise,
displacement, fresnel, iridescence, matcap, PBR, environment map, post-processing (bloom, chromatic aberration, film
grain, tone mapping), particles, GPGPU, instancing, SDF, raymarching, DOM-to-WebGL sync, glTF with Draco, WebGPU.
These are the tools of the studios above; reach for the one the idea needs, by name, in the plan and in the code.

**Hard lines and defaults.** The rules that never bend, below, are hard lines: they protect the client's trust, not
taste. Everything else in this skill is a strong default from studio practice: the dealt hand, the budgets (quiet
share, pins, one centerpiece, one cursor, one marquee), `feel()` easing, the motif list, "display runs light". Override
any default when the idea demands it and write one line in STRUQ.md under `Overrides:` saying which and why. The checks
then report it as a WARN, which is advice; only a hard line or a broken page FAILs.

This plugin works through the Struq MCP, which it connects for you (sign in once through `/mcp`). The catalogue is
`struq_blocks`, or [catalog.json](catalog.json) in this folder when you only need to read it; the craft that makes the
blocks feel high end is [references/craft.md](references/craft.md); real-time 3D, shaders and choreography are
[references/realtime.md](references/realtime.md); the tell list is [references/tells.md](references/tells.md). The full offline version, with the blocks, canon and scripts on disk, is
`npx @struq/skill`.

| Invocation | Mode |
|---|---|
| `/struq:struq <brief>` | **Build**: the checklist below, start to finish. |
| `/struq:struq redesign <path>` | Keep the brand, copy and components ([references/triage.md](references/triage.md)); swap in blocks where the page is weakest, then run the checklist from step 3. |
| `/struq:struq audit <path-or-url>` | Change nothing. Run `struq_check`'s detectors on the files, report every FAIL and WARN and the three fixes with the most visual payoff. Never a numeric score. |

For a dashboard or product UI keep the tokens, faces and tells; drop the preloader, Lenis and the pinned pieces.

## Rules that never bend

1. **Never an empty frame.** Every image slot holds a real photo: the client's, else the beeldbank pack (free, CC0,
   no permission needed). Pack photos are mood: the world around the client, never their own room, team, work or
   product. So never set one under a first-person claim ("our oven", "every piece we make", "my plates"), and where
   the work is the product (a portfolio, a shop, a collection) build the frame for their work and ask for it at the
   stop. A caption is copy you write for this client, never the alt read back.
2. **Never invent, never stand in.** No testimonials, logos, stats, awards, prices, addresses, hours, bios, quotes,
   product features, programme, process, equipment (a wood oven) or name the brief did not give. A missing fact
   leaves no trace: no "to follow", "to be announced", "Your Name", example.com in the copy, no button with no
   destination (the placeholder door below is the one exception), and no "come by" without
   the address. Drop the line or the field and list it under Assumptions in STRUQ.md. A site that sells or takes
   enquiries ends on the order close (`Close` shape `order`): what it sells or takes on, the prices the brief gives,
   and the one way to buy or ask. With no door (no address, phone, mail, booking, shop or quote link from the brief or
   the one stop) it uses the placeholder door, `door: { kind: "email", href: "mailto:post@example.com", label: "...",
   placeholder: true }` in lib/site.ts, listed under Assumptions; the self-check warns until the client replaces it. The
   placeholder is the only stand-in allowed, and only as that door. A site that neither sells nor takes enquiries,
   with no door, ends on the idea, never on an invitation. With no name in the brief the header shows no
   wordmark and the opener and the close carry none (or ask for the name at the one stop); the trade word ("Yoga",
   "Bakery") is never a name. The self-check fails stand-ins, links to anchors that do not exist, calls with no door,
   a selling site with no way to buy, and a trade word as the name.
3. **Never the tells** ([references/tells.md](references/tells.md)): no eyebrows, pills, CSS gradients or gradient
   text, glow shadows behind cards or words, mono on marketing, Inter or the other generator faces, default purple or
   blue, numbered steps, icon grids, stat banners, generic CTAs, em or en dashes. Light inside a WebGL scene (bloom,
   fresnel, iridescence, an emissive filament, a falloff in a shader) is not a tell: it is how the studios light a
   scene.
4. **Copy in the client's market language**, which may differ from the brief's (a plumber in Utrecht reads Dutch).
   Say which on the Brief line and under Assumptions. Write it as a native copywriter would, never a translation.

## The four tools

| Need | Tool | What comes back |
|---|---|---|
| A direction | `struq_direction(brief)`, or with `palette` and `type` ids, or `light` | The palette and pairing, the token block as CSS, the font stylesheet URLs, the photo pack with every photo's alt, size and calm side, the icon set, and the reason in plain words. |
| What blocks exist | `struq_blocks(kind?, query?)` | Every admitted block with its variants. [catalog.json](catalog.json) is the same list at this plugin's release. |
| A block as files | `struq_block(slug, variant?)` | The block, every file it imports, the kit and its `blocks.css`, each with its target path; the packages to install, the props, a usage example and the one-time setup. |
| The tell check | `struq_check()` | The detectors and rules. Run them on your own files; Struq never reads your code. |

Put every file `struq_block` returns at its target under `components/struq/`, exactly as given, so the relative imports
hold. Follow its setup lines once per project. Put `struq_direction`'s token block in `app/globals.css` after the
`blocks.css` import and its font URLs in the layout. Note each tool call in `STRUQ-LOG.md`: the tool, what you asked
for, what you took.

## Build checklist

Copy this into `STRUQ.md` under the plan and tick each line as you finish it. Keep `STRUQ-LOG.md` from the first
step: append only, one entry per step with what you did and why.

```
## Build checklist
- [ ] 1 Project: Next.js App Router + Tailwind v4
- [ ] 2 Treatment and approval: the treatment and storyboard in STRUQ.md within the budgets; the one stop sent and answered
- [ ] 3 Canon: struq_direction's token block and fonts written
- [ ] 4 Images: only photos whose alt fits the client, placed with their alt and calm side
- [ ] 5 Scenes: frames and the centerpiece taken with struq_block, every other scene built as the storyboard says, composed in app/page.tsx with real copy
- [ ] 6 Build: the project's production build passes
- [ ] 7 Look: 390 and 1440 screenshots and one full scroll, fixes made (or "Verify: not seen, no browser")
- [ ] 8 Check: struq_check's detectors find no FAIL
```

**1 Project.** Work in the user's Next.js App Router project with Tailwind v4. In an empty folder, ask the user to
create one (create-next-app with TypeScript, Tailwind and the App Router) or create it with their approval. Your own
layout and stylesheet stay; merge the setup lines from `struq_block` into them.

**2 Treatment and the one stop.** Call `struq_direction` with the brief in the user's words; never invent a palette or
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

**3 Canon.** Write `struq_direction`'s token block after the `blocks.css` import in `app/globals.css`, in place of any
earlier token block, and load every font URL it returns in the layout. Never drop a weight it asks for: each URL
carries the face's real range. It is the block Struq's lab judged every block in.

**4 Images.** Read the alts of the pack `struq_direction` returned and keep only the photos that fit the client. Save
the ones you use under `public/images/` (or allow the host in `images.remotePatterns`) and keep each photo's src, alt,
width, height and calm side together in `lib/struq-images.ts`, in the shape the blocks read (`StruqImage` in
`components/struq/kit/images.ts`). With no fitting pack, use no stock photos and let a background block carry the
hero. Set the title, description and `lang` in the layout.

**5 Scenes.** Take the language's frames and the centerpiece first with `struq_block(slug, variant)`, then each scene
as its storyboard line says; install the packages each names and read its props and usage. Fill every label, counter
and caption from the lexicon; wrap the tone arc's ink or field scenes in `scene-inverse` or `scene-field`. When
several blocks each bring `blocks.css`, keep one file with the kit base once and every block's marked sections. Own
scenes and glue use the kit (`Reveal`, `MediaFrame`, `SplitHeadline`) and the craft rules.

**6 to 8.** The production build passes (fix your code, never delete a block to get green). Look at the production
build at 390 and 1440 and scroll it once: the preloader lands on the hero, every frame fills, each pin engages and
releases without a jump, nothing overflows at 390, scrolling back reverses. Never claim you saw what you did not. Then
run `struq_check`'s detectors on your files until nothing fails.

## The film

One film, not a showreel: one language, one motif (seen at the arrival, the opening, the centerpiece and the close),
one centerpiece. A loud scene moves with the scroll; a quiet scene enters once and sits still.

| Language | Feel | Temperament | Frames: preloader, page transition, menu |
|---|---|---|---|
| weight | slow and settled; a print grows into place; long holds | weighted | `preloader-stack`, `page-transition-stack`, `menu-curtain:stack` |
| cut | sharp and decisive; hard cuts, short masks, no fades | crisp | `preloader-slices`, `page-transition-slices`, `menu-curtain:slices` |
| curtain | held, then revealed; panels part after a long hold | slow | `preloader-gate` or `preloader-wordmark:split`, `page-transition-gate`, `menu-curtain:gate` |

Set the temperament once, as `data-temperament` on `<body>` beside `data-blocks`: the language's default, or its
neighbour (weighted beside crisp or slow) with the reason on the Language line. Every primitive and `feel()` read it.

Pick by the tempo the idea needs, never by trade; calm and the held reveal are both reflexes. The Opening and the
Centerpiece may come from anywhere in the catalogue: choose the pair that could only be this client's.

Defaults the plan check warns on (override with a reason under `Overrides:`): exactly one centerpiece and nothing pinned after it; never two loud scenes side by
side; at least four in ten scenes quiet; pins together about 4.5 screens; every frame from the language; at most two
full-bleed photo reveals, one marquee, one custom cursor, one accent device (an italic word, a weight shift, a
coloured word, a jump in scale, or none); the opening plus at most two type moments at poster scale; no eyebrows, mono, uppercase
labels or numbered steps.

## What makes it feel high end

The blocks hold this already; your glue must too. Detail in [references/craft.md](references/craft.md).

- Reveals clip from numbers, never scale a box; whole pixels; photos decoded before they show.
- Scroll effects are scroll-tied and reverse; key frames hold.
- `sq-js` on `<html>` before paint hides only what will animate, and shows it anyway after 3 s.
- Type on a photo sits on its calm side over the lightest veil that reaches 3:1.
- Display runs light unless the pairing says otherwise; fitted lines measured after `document.fonts.ready`.
- Never clip a descender; never `overflow-hidden` on a heading of your own.
- Tokens only, a surface step and a hairline instead of a shadow, one accent colour.
- Icons: `@struq/icons`, functional only ([references/iconography.md](references/iconography.md)).

## When something goes wrong

- **Nothing scrolls:** an overlay called `getLenis()?.stop()` without `start()`, or `SmoothScroll` is not mounted.
- **Content stays invisible for 3 s:** the block never set `data-ready`; usually it threw. Read the console.
- **Wrong colours or faces:** `data-blocks` is missing on `<body>`, or STRUQ TOKENS sits before the kit import.
- **A fitted line overflows or jumps:** the face did not load (check `app/fonts.ts` and the layout links).
- **Vite:** [references/stack-targets.md](references/stack-targets.md).
