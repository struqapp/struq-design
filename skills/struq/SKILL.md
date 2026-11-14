---
name: struq
description: "Award-tier studio websites for coding agents, built from Struq's catalogue of admitted blocks and directed as one film: one idea, one motion language, one motif and one centerpiece, cast into a storyboard before a block is installed. Preloaders, page transitions, headers, heroes, WebGL backgrounds, showpieces, sections and footers, each with real variants, judged at FWA level and shipped as files. Struq's palettes and type pairings as one token block, art-directed CC0 photos from the Struq beeldbank, Lenis on one GSAP clock, and a self-check against the AI tells. Works offline from its own copy; uses the Struq MCP (struq_richting, struq_blokken, struq_blok, struq_controle) when connected. Use when designing, building, redesigning, animating or auditing a marketing, studio, agency or portfolio site that must feel cinematic and custom instead of templated. Stack: Next.js App Router + Tailwind v4."
argument-hint: "[brief] | redesign <path> | audit <path-or-url> | direct <brief>"
---

# Struq

You are the director. Struq gives you a catalogue of studio-grade blocks ([blocks/CATALOG.md](blocks/CATALOG.md)),
a canon of palettes and pairings, a photo library and a self-check. They are a toolbox, not a menu: the site should
look like it could only belong to this one client, and like nothing Struq built before. `<skill-dir>` is this file's
folder. Worked treatments: [references/film.md](references/film.md); craft: [references/craft.md](references/craft.md).

| Invocation | Mode |
|---|---|
| `/struq <brief>` | **Build**: the checklist below. |
| `/struq redesign <path>` | Keep brand, copy and components ([references/triage.md](references/triage.md)); write the treatment of the page as it will be, stop once, then swap in blocks where it is weakest and run the checklist from step 3. |
| `/struq audit <path-or-url>` | Change nothing. Run `check.mjs` (or `struq_controle`), report every FAIL and WARN and the three fixes with the most payoff. Never a score. |
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
   real destination (shop, booking, contact, sign-up). Drop the line, the field or the button and list it under
   Assumptions in STRUQ.md. The self-check fails stand-ins and links to anchors that do not exist.
3. **Never the tells** ([references/tells.md](references/tells.md)): no eyebrows, pills, gradients or gradient text,
   glow, mono on marketing, Inter or the other generator faces, default purple or blue, numbered steps, icon grids,
   stat banners, generic CTAs, em or en dashes.
4. **Copy in the client's market language**, which may differ from the brief's (a plumber in Utrecht reads Dutch).
   Say which on the Brief line and under Assumptions. Write it as a native copywriter would, never a translation.

## Tools: the MCP, or the skill's own copy

| Need | MCP connected | Offline |
|---|---|---|
| Palette, pairing, photo pack as tokens and fonts | `struq_richting(brief)` | `canon.mjs draw` (this site's hand), `canon.mjs palette <id>`, `canon.mjs type <id>`; `images.mjs --brief` |
| What blocks exist | `struq_blokken(kind?, query?)` | `blocks.mjs list [kind]` |
| A block as files | `struq_blok(slug, variant?)` | `blocks.mjs add <slug>` |
| The self-check | `struq_controle()` | `check.mjs` |

Log each MCP call: `node <skill-dir>/scripts/log.mjs mcp <tool> --note "<what you took>"`.

## Build checklist

Copy this into `STRUQ.md` under the plan and tick each line when done. Log every step in `STRUQ-LOG.md`
(`node <skill-dir>/scripts/log.mjs "Step N Name" "what" "why"`); `check.mjs` fails while a line is open or a ticked
step has no entry.

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

**1 Project.** `npx create-next-app@latest . --ts --tailwind --app --eslint --yes`, then
`node <skill-dir>/scripts/blocks.mjs init` (the kit, layout, tokens, fonts, gsap and lenis; it never overwrites your
files, merge from `recipes/app/`).

**2 Treatment, then stop once.** Think like a studio pitching this client. First run
`node <skill-dir>/scripts/canon.mjs draw`: it deals this site a hand, two languages, three type pairings and four
palettes, the way a creative director hands a team its constraints. Every site gets a different hand, so no two start
from the same place; your craft is choosing well within it. Write the Idea (a point of view, not a description), then
the Unlike line: the site any agent would build, and Struq's own reflexes, which you must also avoid (a framed photo
with the name small beside it; one italic word in every headline; a middle of one-word rows, a sentence with a small
photo and a photo beside text; an echo close over a full-width wordmark). Pick the language from the hand, run
`node <skill-dir>/scripts/blocks.mjs arc <language>`, and cast every line of the storyboard it prints, each pick with
its reason after "because": the Opening and the Centerpiece from the five each it deals. Invent own scenes wherever the
idea wants a moment no block gives. Outside the hand only what the client gave: their brand colours or faces, marked
`(brand)`, or a block they named, marked `(named)`.

```
# STRUQ.md: <name>
Brief: <one line: what, for whom, where, in which language>
Idea: <a point of view in one sentence: what a visitor believes when they leave>
Unlike: <the likeliest site, and Struq's reflexes> -> <what this one does instead>
Language: <weight | cut | curtain> (<the tempo the idea needs>; not <each of the other two>, because <why not>)
Motif: <line | frame | aperture | cut | word | field>: <what it is in this client's world and how it changes down the page>
Lexicon: <three to five working words of the trade; every label and caption uses them>
Palette: <id> (<mood>)
Type: <pairing id>: <display> + <body> (not <the pairing you passed over>, because <why>)
Images: pack <slug> (or the client's photos, then pack <slug>)
Centerpiece: <block>: <why this is this site's one moment>
Tone arc: <as blocks.mjs arc printed it>
Storyboard: <as blocks.mjs arc printed it, every line cast>
Assumptions: <every drafted line, every fact left out, the copy language>
Verify: <filled in at step 7>
```

Run `node <skill-dir>/scripts/check.mjs --plan` until `PLAN: PASS` with no `quiet-is-quiet`, `loud-adjacent` or
`quiet-share` warning. Then stop once, in the user's language: the treatment in plain words (never slugs), the
storyboard as one sentence per scene, palette, type and pack on one line, and ask for what only the client has and
the page needs: their name if the brief gave none, how visitors reach them (address, phone or mail; the shop, booking
or sign-up link), their own photos when the work is the product. End with "Akkoord?" or "Approve?". The build request
is not the approval. Log the reply word for word: `log.mjs "Step 2 Approval" "Asked: ..." "Reply: \"<their words>\""`.
Any yes builds it; what they send replaces the matching pick; whatever stays unanswered is left out. Never ask twice.

**3 Canon.** `canon.mjs palette <id>` and `canon.mjs type <id>` write the one STRUQ TOKENS block and `app/fonts.ts`.

**4 Images.** `node <skill-dir>/scripts/images.mjs --brief "<the user's words>"` writes the pack's fitting photos to
`public/images/` and `lib/struq-images.ts`. Never widen the brief to make a pack fit; look at each photo before you
place it and leave out any that shows another place or trade. With `imageFit` "none" the hero is type or WebGL.

**5 Scenes.** Install the frames and the centerpiece (`blocks.mjs add <slug>:<variant>`), then build each scene as the
storyboard says: blocks, the kit's quiet scenes (`Statement`, `PhotoText`, `Rows`, `Close` from
`@/components/struq/kit/quiet`, each at most once) or your own scenes from `SplitHeadline`, `MediaFrame` and `Reveal`
with `data-scene="<name>"` on the root. Read each file header for its props. Wrap ink or field scenes in
`scene-inverse` or `scene-field`. Every section, the hero too, says its ground with `data-bar-tone` ("photo" only
where the bar sits over the photo); the bar never repeats a name the hero sets at poster scale.

**6 to 8.** `npm run build` passes (fix your code; never delete a block for green). Serve with
`npx next start -p 4321` and look at 390 and 1440 with one full scroll: the preloader lands, every pin engages and lets
go, nothing overflows or collides, scrolling back reverses. No browser to hand? `npx -y playwright install chromium`,
then `npx -y playwright screenshot --viewport-size=390,844 --full-page http://localhost:4321 phone.png` (and
1440,900) and read the images; "not seen" only after that fails. Then `check.mjs` to `RESULT: PASS`; a FAIL you are
sure is false goes in the final report with the reason, never worked around.

## The film

One film, not a showreel: one language, one motif (seen at the arrival, the opening, the centerpiece and the close),
one centerpiece. A loud scene moves with the scroll; a quiet scene enters once and sits still.

| Language | Feel | Frames: preloader, page transition, menu |
|---|---|---|
| weight | slow and settled; a print grows into place; long holds | `preloader-stack`, `page-transition-stack`, `menu-curtain:stack` |
| cut | sharp and decisive; hard cuts, short masks, no fades | `preloader-slices`, `page-transition-slices`, `menu-curtain:slices` |
| curtain | held, then revealed; panels part after a long hold | `preloader-gate` or `preloader-wordmark:split`, `page-transition-gate`, `menu-curtain:gate` |

Pick by the tempo the idea needs, never by trade; calm and the held reveal are both reflexes. The Opening and the
Centerpiece may come from anywhere in the catalogue: choose the pair that could only be this client's.

Budgets the plan check enforces: exactly one centerpiece and nothing pinned after it; never two loud scenes side by
side; at least four in ten scenes quiet; pins together about 4.5 screens; every frame from the language; at most two
full-bleed photo reveals, one marquee, one custom cursor, one accent device (an italic word, a weight shift, a
coloured word, a jump in scale, or none); two or three type moments at poster scale; no eyebrows, mono, uppercase
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
