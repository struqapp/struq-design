---
name: struq
description: "Websites at the level of an Awwwards Site of the Day or an FWA of the Day, for coding agents: one strong idea, confident art direction, choreographed motion and real-time 3D that serves the concept, the bar set by studios like Active Theory, Lusion, Resn, Immersive Garden, Locomotive, Obys and Basement Studio. Built on Struq's catalogue of hardened blocks (preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with real variants, shipped as files) plus recipes for glass, light, shaders, post-processing and scroll choreography. Struq's palettes and type pairings as one token block, art-directed CC0 photos from the Struq beeldbank, Lenis on one GSAP clock, and a self-check against the AI tells. Works offline from its own copy; uses the Struq MCP (struq_direction, struq_blocks, struq_block, struq_check) when connected. Use when designing, building, redesigning, animating or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url> | direct <brief>"
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
   moment halfway down a page of type. The first screen is bold: the signature filling the frame, or display type
   at poster scale, or both. A calm editorial page of small serif lines on a pale ground is what every agent makes;
   it is the reflex to beat, not the bar.
3. **The system**: type, palette, motion language, easing curves and grid, each chosen because of the idea.
4. **The build**: Struq's blocks first, because they are hardened and already at this level. For a real-time
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

## The toolbox

Struq gives you a catalogue of studio-grade blocks ([blocks/CATALOG.md](blocks/CATALOG.md)), a canon of palettes and
pairings, a photo library, a real-time 3D kit with its recipes ([references/realtime.md](references/realtime.md)),
the copy craft ([references/copy.md](references/copy.md)) and a self-check. They are a toolbox, not a menu: the site should look like it could only belong to this one client, and
like nothing Struq built before. `<skill-dir>` is this file's folder. Worked treatments:
[references/film.md](references/film.md); craft: [references/craft.md](references/craft.md).

| Invocation | Mode |
|---|---|
| `/struq <brief>` | **Build**: the checklist below. |
| `/struq redesign <path>` | Keep brand, copy and components ([references/triage.md](references/triage.md)); write the treatment of the page as it will be, stop once, then swap in blocks where it is weakest and run the checklist from step 3. |
| `/struq audit <path-or-url>` | Change nothing. Run `check.mjs` (or `struq_check`), report every FAIL and WARN and the three fixes with the most payoff. Never a score. |
| `/struq direct <brief>` | One continuous WebGL experience: steps 1 to 4, then [cinematic/README.md](cinematic/README.md). |

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
   Assumptions in STRUQ.md. With no door (no address, phone, mail, booking or shop link from the brief or the stop) the
   site ends on the idea, never on an invitation: no "Schuif aan", "Pick up a mug", "Book a class" or "Shop the
   collection", and Assumptions names the door the client must add. With no name in the brief the header shows no
   wordmark and the opener and the close carry none (or ask for the name at the one stop); the trade word ("Yoga",
   "Bakery") is never a name. The self-check fails stand-ins, links to anchors that do not exist, calls with no door
   and a trade word as the name.
3. **Never the tells** ([references/tells.md](references/tells.md)): no eyebrows, pills, CSS gradients or gradient
   text, glow shadows behind cards or words, mono on marketing, Inter or the other generator faces, default purple or
   blue, numbered steps, icon grids, stat banners, generic CTAs, em or en dashes. Light inside a WebGL scene (bloom,
   fresnel, iridescence, an emissive filament, a falloff in a shader) is not a tell: it is how the studios light a
   scene.
4. **Copy in the client's market language**, which may differ from the brief's (a plumber in Utrecht reads Dutch).
   Say which on the Brief line and under Assumptions. Write it as a native copywriter would, never a translation.

## Tools: the MCP, or the skill's own copy

| Need | MCP connected | Offline |
|---|---|---|
| Palette, pairing, photo pack as tokens and fonts | `struq_direction(brief)` | `canon.mjs draw` (this site's hand), `canon.mjs palette <id>`, `canon.mjs type <id>`; `images.mjs --brief` |
| What blocks exist | `struq_blocks(kind?, query?)` | `blocks.mjs list [kind]` |
| A block as files | `struq_block(slug, variant?)` | `blocks.mjs add <slug>` |
| The self-check | `struq_check()` | `check.mjs` |

An older Struq server names these tools `struq_richting`, `struq_blokken`, `struq_blok` and `struq_controle`; they do
the same. Log each MCP call: `node <skill-dir>/scripts/log.mjs mcp <tool> --note "<what you took>"`.

## Build checklist

Copy this into `STRUQ.md` under the plan. Log every step in `STRUQ-LOG.md`
(`node <skill-dir>/scripts/log.mjs "Step N Name" "what" "why"`); logging a step ticks its line. `check.mjs` fails
while a line is open or a ticked step has no entry.

```
## Build checklist
- [ ] 1 Project: Next.js App Router + Tailwind v4; blocks.mjs init printed OK
- [ ] 2 Treatment and approval: the treatment in STRUQ.md, the plan check at PLAN: PASS; the one stop sent and answered
- [ ] 3 Canon: the token block and fonts written (canon.mjs palette and type, or struq_direction)
- [ ] 4 Images: images.mjs --brief printed OK; only photos whose alt fits the client
- [ ] 5 Scenes: frames and the centerpiece installed, every other scene built as the storyboard says, composed in app/page.tsx with real copy
- [ ] 6 Build: npm run build passes
- [ ] 7 Look: LOOK: PASS on the served build, its screenshots read; a fresh subagent's asks in .struq/art-direction.md each answered Built: or Refused:, then LOOK: PASS again
- [ ] 8 Check: check.mjs prints RESULT: PASS
```

**1 Project.** `npx create-next-app@latest . --ts --tailwind --app --eslint --yes`, then
`node <skill-dir>/scripts/blocks.mjs init` (the kit, layout, tokens, fonts, gsap and lenis; it never overwrites your
files, merge from `recipes/app/`).

**2 Treatment, then stop once.** Think like a studio pitching this client for a Site of the Day. First run
`node <skill-dir>/scripts/canon.mjs draw`: it deals this site a hand, two languages, two type pairings, two
palettes (one light, one dark) and three lenses, so no two sites start from the same place. The hand is a spark, not
a fence: start from it, and cast outside it when the idea earns it, with the reason under `Overrides:`. Write three
ideas, one from each lens (each a point of view on this client, not a description), take the one a rival studio would
least expect that still fits this client, and note the other two as Passed over. Then name the Signature: the one
moment a juror remembers (the glass cools as you scroll, the menu is set like a departure board), and how it is built:
a block, a block you fork, or your own scene or shader ([references/realtime.md](references/realtime.md)). Write its
beats against the scroll, 0 to 1, so the camera, the object, the type and the ground move as one. Name the Subject: what the brief is about
that a visitor must see (the app, the event, the garment, the cup, the bread); the site shows it (step 5). Then
the Unlike line: the site any agent would build, and Struq's own reflexes, which you must also avoid (a framed photo
with the name small beside it; one italic word in every headline; a middle of one-word rows, a sentence with a small
photo and a photo beside text; an echo close over a full-width wordmark). Pick the language from the hand, run
`node <skill-dir>/scripts/blocks.mjs arc <language>` (it also sets the language's temperament on `<body>`), and cast
every line of the storyboard it prints, each pick with its reason after "because": the Opening and the Centerpiece from the five each it deals (look at the photos first,
step 4), the middle scenes named and designed for this client, the close ending where the idea ends. Invent own scenes wherever the
idea wants a moment no block gives. Outside the hand only what the client gave: their brand colours or faces, marked
`(brand)`, or a block they named, marked `(named)`.

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where, in which language>
Hand: <the id canon.mjs draw printed>
Idea: <lens>: <a point of view in one sentence: what a visitor believes when they leave>
Passed over: <your two other ideas, one line>
Signature: <the one moment> -> <how it is built: block, forked block, own scene or shader> -> <its beats, 0 to 1>
Subject: <what the visitor must see> -> <shown by: the client's photo, a pack photo that shows it, or drawn in code>
Unlike: <the likeliest site, and Struq's reflexes> -> <what this one does instead>
Language: <weight | cut | curtain> (<the tempo the idea needs>; not <each of the other two>, because <why not>; temperament: <the language's default, or its neighbour and why>)
Motif: <line | frame | aperture | cut | word | field>: <what it is in this client's world and how it changes down the page>
Lexicon: <three to five working words of the trade; every label and caption uses them>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body> (not <the pairing you passed over>, because <why>)
Images: pack <slug> (or the client's photos, then pack <slug>)
Centerpiece: <block>: <why this is this site's one moment>
Tone arc: <as blocks.mjs arc printed it>
Storyboard: <as blocks.mjs arc printed it, every line cast>
Overrides: <each default you broke and why, one line each; or none>
Assumptions: <every drafted line, every fact left out, the copy language>
Verify: <filled in at step 7>
```

Run `node <skill-dir>/scripts/check.mjs --plan` until `PLAN: PASS`; answer each WARN by fixing it or by a line under
`Overrides:`. Then stop once, in the user's language: the treatment in plain words (never slugs), the
storyboard as one sentence per scene, palette, type and pack on one line, and ask for what only the client has and
the page needs: their name if the brief gave none, how visitors reach them (address, phone or mail; the shop, booking
or sign-up link), their own photos when the work is the product. End with "Akkoord?" or "Approve?". The build request
is not the approval. Log the reply word for word: `log.mjs "Step 2 Approval" "Asked: ..." "Reply: \"<their words>\""`.
Any yes builds it; what they send replaces the matching pick; whatever stays unanswered is left out. Never ask twice.

**3 Canon.** `canon.mjs palette <id>` and `canon.mjs type <id>` write the one STRUQ TOKENS block and `app/fonts.ts`.

**4 Images, done before you cast the Opening.** In step 2, before the storyboard, run
`node <skill-dir>/scripts/images.mjs --brief "<the user's words>"` and open the hero photos it wrote
(`public/images/hero-*.webp`) with your image reader. A photo opens the site only if it shows this client's own
subject: a tap or a bathroom for a plumber, a mug for a mug shop, a city lot for a city garden. A photo that only
sets a mood (paper for a conference, cloth for a label, a room for a studio you have never seen) never opens a site.
If none shows the subject, run it again with `--no-hero`, and the Opening is type-led or WebGL (the hand always holds
one). Never widen the brief to
make a pack fit; the other photos serve the middle only where they show this client's world, never under a
first-person claim.

**5 Scenes.** Install the frames and the footer, and the opening and the centerpiece where a block carries them
(`blocks.mjs add <slug>:<variant>`): hardened blocks, already at the bar. Where the Signature is your own scene, build
it here as carefully as a block: a poster first, the reduced-motion still frame, then the choreography. The middle is
yours. Compose each middle scene for this client from the
primitives (`SplitHeadline` for fitted type, `Reveal`, `MediaFrame`, the grid and the tokens), from what only this
trade has: a price board for a bakery, a tide table for a guesthouse, a joint drawn to scale for a plumber, a menu set
like a chalkboard for a restaurant. No two middle scenes share a layout, and none is a one-word list, a big sentence
with a small photo, or a photo beside text unless the idea truly asks for it. Hold the scale ladder (the bar,
above): each middle scene is a heading a step below display, a line or two at reading size, and the thing itself,
large; never a paragraph at poster scale. Where text and a canvas or photo panel share a screen, the type keeps to
its own column and never runs under the panel; check every split at 1440 and 390.

When no photo shows the Subject and the client makes a physical object (a lamp, a machine, a bottle, a chair), show
the object itself in real-time 3D with the kit (`kit/gl`: a lathe form or a few turned and machined parts in real
glass, metal or ceramic, lit by the Stage), on the first screen when it is the signature. A line drawing or a
technical section is a supporting scene, never the way a visitor first meets the product. For everything else, design
the subject in code as a scene of its own, often the centerpiece's neighbour: the app's real screen or document (the invoice of an invoicing app) built in HTML with the tokens, the event's identity (a
poster system, a badge, a programme grid with only the slots the brief gives), the label's lookbook frame, a menu
board. Sample content inside it reads as an example of the trade (an invoice for "Studio Noord, identity, round 2"),
never as a fact about the client: no customer names, no figures they would quote, no feature the brief did not give.
Start from the kit's designed pieces in `@/components/struq/kit/subject` before drawing your own: `Document` (an
invoice, quote, receipt, menu or label), `AppScreen` (a window or phone with the app's real screen), `Ticket` (a
ticket, badge or poster), `PatternPaper` (a sewing pattern) and `SectionDrawing` (a technical section). Fill them with
this client's content and palette; read each file header for its props and its scroll motion.

For the middle of the page, start from the designed scenes in `@/components/struq/kit/middle` before composing your
own: `ServicesList` (what the business does, as rows, photo panels or a pair; never an icon grid), `ProcessStrip` (how
the work goes, as a drawn thread, sticky chapters or rows; never numbered steps), `PlaceHours` (where to find the
business and when, as a timetable, a photo plate or one line), `WorkIndex` (projects, rooms or a collection to look at
one by one), `GalleryRun` (a run of photos that sets the place), `ProductRow` (things for sale with no cart and no
price you were not given), `Programme` (an event's parts with no times you were not given) and `SubjectPlate` (a
subject piece from `kit/subject` set with its text). Each has variants and fills only what the brief gives:
a slot left empty changes the layout, it never shows a placeholder, and there is no slot for a price, an hour or a
duration you would have to guess. In the storyboard write one as an own scene that names it (`own scene: ServicesList
rows`), then import it and fill it, never rewrite it: `blocks.mjs add ServicesList` prints the import and its variants.
It marks its own root. Read each file header for its props, its fallbacks and its motion.

Own scenes may move. Give at least two of them a motion of their own, tied to the scroll and reversing (a line that
draws as you read, a document that assembles, a grid that sorts itself), never a pin over one screen; mark the root
`data-scene="<name>" data-energy="2"`, tag it (loud) in the storyboard, and keep the budgets. Compose them from
`@/components/struq/kit/motion` first (`RevealText`, `MaskWipe`, `ImageCurtain`, `ScrubLine`, `HoverLink`,
`Pressable`), and write your own `gsap`, `SplitText`, shaders or R3F scenes from `@/components/struq/kit/gsap` for
everything they cannot do. Time it by `feel()` from `@/components/struq/kit/feel` by default; a custom easing curve
is welcome when the idea has its own (a glass that sags, a press that snaps), named in the plan. The signature is
usually your own code: build it with [references/realtime.md](references/realtime.md), choreographed on one scroll
value, never a model that sits still while text scrolls past. A still own scene is `data-scene="<name>"` alone.
The kit's `Statement`, `PhotoText` and `Rows` (`@/components/struq/kit/quiet`) remain for a plain moment, at most one
per page. Build the close with `Close`: shape `idea` (the idea's last line and the motif drawn), `echo` (the opening
returns smaller) or `door` (the brief's real address, phone, mail or booking link, set large). The name at full width
is never the close; a wordmark there stays at text size. Read each file header for its props. Wrap ink or field scenes in
`scene-inverse` or `scene-field`. Every section, the hero too, says its ground with `data-bar-tone` ("photo" only
where the bar sits over the photo); the bar never repeats a name the hero sets at poster scale.

**6 to 8.** `npm run build` passes (fix your code; never delete a block for green). Serve it with
`npx next start -p 4321` (or a free port when that one is taken, then `look.mjs --url http://localhost:<port>`),
leave it running, and run `node <skill-dir>/scripts/look.mjs` (the first run installs Playwright into the project).
Never stop a server you did not start. It scrolls the page at 390 and 1440 with motion on, saves every step to
`.struq/look/`, and fails on text under the header, the site name twice on the first screen, letters cut by a mask
or the screen edge, a page wider than the screen, low contrast on a solid ground or measured over a photo, a blank
screen, a number broken across lines, a font that never loaded, a line partly under a canvas or panel that holds
still, a paragraph at poster scale, an empty stretch of a whole screen, and console or image errors; it warns on more
than two poster-scale lines after the first screen and on an empty stretch of six tenths of a screen. Open the screenshots and crops it names and read
them as a studio's art director would: the preloader lands, every pin engages and lets go, the first screen is bold
enough to stop a visitor. Fix, rebuild, restart the server and run it again until `LOOK: PASS`. A centerpiece that
fails the look is fixed or swapped for another centerpiece from the hand (or an own loud scene), with the Centerpiece
line rewritten. It is never removed.

**Art direction.** Then hand the site to a fresh pair of eyes: start a subagent (the Agent tool in Claude Code, or your
host's equivalent) and give it only the brief, the Idea line, the paths of the stills in `.struq/look/` and
[references/art-direction.md](references/art-direction.md), never your plan or your reasoning. Save its answer to
`.struq/art-direction.md` as numbered asks, and write an answer line under each: `Built: <what changed>` or
`Refused: <reason>`. The asks are binding. Build every one. When an ask needs another order, opening or centerpiece,
rewrite the storyboard in STRUQ.md and swap the blocks (the storyboard serves the site); when it breaks a budget, keep
the budget by dropping something else. Refuse only an ask that breaks a rule that never bends or a fact of the brief
(a price, an address, a programme nobody gave), and say which. A refusal that cites the storyboard, the plan, a budget
or a block is no refusal: `check.mjs` fails it, and fails an ask with no answer. Rebuild, run `look.mjs` again, and ask
a new subagent once more; two rounds at most, each logged with `log.mjs`. A host without subagents: reread only the
brief, then read the stills against that file yourself. The run is not over until `check.mjs` prints
`RESULT: PASS`; it fails while `.struq/look.json` is missing, failing or older than app/ and components/. On a FAIL,
keep fixing; only a FAIL you are sure is false, with its reason, may stand. Stop the server when done.

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
