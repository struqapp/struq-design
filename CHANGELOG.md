# Changelog

## 0.4.1 (2026-11-08)

### Blocks
- Refreshed from Struq main: page-transition-stack, menu-curtain and footer-reveal list `lenis` among their packages (they reach it through the kit's SmoothScroll), and a corrected comment in `kit/HeroCanvas.tsx`.

### Plugin
- `plugin/`: a lean Claude plugin for the plugin directory, Markdown and JSON only plus one PNG icon. It connects the Struq MCP (`https://struq.nl/api/mcp`, OAuth) and carries an MCP-first SKILL.md, the block catalogue as JSON and the references, with every script step rewritten to a tool call. Not in the npm package.
- `scripts/build-plugin.mjs` builds it from the full skill and `scripts/plugin/`; `release-blocks.mjs` runs it at every release, and `--check` reports drift.
- `test/plugin.test.mjs` fails on a file type the directory refuses, a `#!` first line, a package manager file, text that is not clean UTF-8, a manifest field off the allowlist, credentials in `.mcp.json`, or a stale `plugin/`.
- The root `plugin.json` drops `displayName`, `documentationUrl` and `supportUrl`, which the directory reported as unrecognised.

## 0.4.0 (2026-11-08)

The skill is rebuilt around Struq's admitted block catalogue. The agent sets the direction and the order and writes the copy; the blocks carry the motion.

### Blocks
- `skills/struq/blocks/`: the 44 admitted blocks from Struq staging 3680053 (4 preloaders, 3 page transitions, 2 headers, 5 heroes, 3 WebGL backgrounds, 9 showpieces, 1 scene transition, 15 sections, 2 footers), each with the files it imports and its three variants, plus the kit. Candidates (the two cursors, before-after) stay out.
- `blocks/CATALOG.md` and `catalog.json`: slug, kind, title, what it does, variants, packages, exports and files, generated.
- `scripts/release-blocks.mjs` (repo only, not shipped): copies the admitted set, the kit and the canon from a Struq git ref at release. A copy, never an import.
- `blocks.mjs list | init | add <slug>` replaces `recipes.mjs`: a block lands in `components/struq/` with everything it imports, in Struq's layout, and its packages are installed. `init` leaves the WebGL hero layer out until a block needs three.
- The nine 0.3 toonstuk files and the 0.3 recipe components are gone: all nine showpieces were admitted as blocks, and every recipe component lives on in the kit.

### Direction
- `canon.mjs` works offline from `canon/canon.json` (33 palettes with the sixteen values nudged on 2026-11-08, 10 pairings, each face's real weight range) and writes the token block Struq's lab and `struq_richting` give: the surface ladder held on the ground's hue, oklab mixes, `--photo-ground`, the field and inverse roles, the accent's ink by contrast, the pairing's display weight and faces. `app/fonts.ts` carries the lab's own Google Fonts requests. A test holds the output to the lab's, value for value.
- The design systems, arcs and niche packets are gone; the order of a studio site is taught in SKILL.md.

### Instructions
- SKILL.md is rewritten lean: the four MCP tools (`struq_richting`, `struq_blokken`, `struq_blok`, `struq_controle`) beside their offline equivalents, an eight-step checklist, the order of a studio site with the blocks for each slot, how to pick blocks and variants, and the lessons that make the blocks feel high end.
- `references/craft.md` (clip from numbers, whole pixels, decode before show, scroll-tied and reversing, the `.sq-js` gate with its 3 s fallback, the measured calm side under a light veil, light display weights, real faces measured) and `references/tells.md` (the combined tell list) replace 35 references.
- Struq Icons is the default; Phosphor light is the one fallback.

### Check
- `check.mjs` checks what a page owes its blocks: the `sq-js` gate and `data-blocks` scope in the layout, at least one block, a hero with its photo, a header, a footer, one contrast scene, and a heavy display weight only at a poster pairing. Tells scan your own files, not the admitted blocks; glow joins the list. The build line checks are gone.

## 0.3.0 (2026-11-06)

The skill is rebuilt around one critical path a small model can follow: a Build checklist ticked in STRUQ.md, tested components instead of hand-written plumbing, and scripts that check the result.

### The critical path
- One Build checklist in SKILL.md, ticked in STRUQ.md; `check.mjs` fails while a line is open.
- Exactly one stop for approval, with the materials request ("Akkoord? Heb je een logo, foto's of echte cijfers, stuur ze nu."). The build request is not the approval: the user's reply is logged word for word as `Step 2 Approval` with a `Reply:` line, and `check.mjs` fails without it.
- Every site keeps STRUQ-LOG.md (append only), written by the agent with `log.mjs` and by the scripts themselves.

### Struq's canon and the beeldbank
- `canon.mjs`: Struq's palettes, pairings and design systems written into the project (OKLCH tokens, Google and Fontshare fonts), with Struq's overrides (no Inter, free stand-ins for commercial faces).
- `images.mjs`: a beeldbank pack downloaded and verified, graded fallback plates when struq.nl is unreachable, so no frame is ever empty.
- `packs.mjs`: the pack rule Struq's MCP uses. A sector word picks its pack (whole words), a product launch without one gets `vitrine` with the hero scene carrying the product, vehicle words never pull a brief to freight (`transit` is logistics only), anything else gets `halide`.
- `images.mjs --brief`: picks the pack by that rule and leaves out the photos whose alt names a subject the client does not do (a fish restaurant gets no flour and dough from `proof`), best fits first. Captions are written from the alts.
- `STRUQ_API_BASE` points the scripts at staging for tests; users never set it.

### Recipes
- Lenis on the GSAP ticker, SplitText hero, Reveal, MediaFrame (curtain reveal and parallax), HorizontalGallery and PinnedZoom showpieces, MagneticButton, Cursor.
- HeroCanvas with three scenes (contours, ripple, dots) at the ambient-backdrop bar: quiet zones behind `[data-quiet]` copy, pointer presence, a slow clock, a DPR cap and pixel budget, a still frame on phones and under reduced motion. Contours runs two passes and drifts at Vapor's pace.
- The cursor stays hidden until a real pointer travels, rests out of sight when the pointer rests, and never shows on touch or under reduced motion.

### Showpieces (toonstuk)
- Eight award-tier showpieces in `cinematic/showpieces/`, named by stable slug: image-to-fullbleed, panel-wipe, scrub-connector, project-stack, manifesto-scrub, fill-rows, wordmark-finale and pixel-resolve. Each pins and scrubs on the one clock, holds on its key frames, and has a composed still for phones and reduced motion.
- SKILL.md picks one lead showpiece and at most one supporting move by the kind of client, honours a showpiece the user names, and closes every site with the wordmark finale. The direction rules: two or three full-strength canon colours, display type at 12 to 20vw, one italic accent, full-bleed photography, one idea per screen, scale, mask and clip transitions.
- The cursor becomes a round accent label ("Bekijk") over anything marked `data-cursor`.
- images.mjs reads Dutch compounds in the alt (meelsporen, broodkorst) when it leaves out off-subject photos.

### The opener and the contrast scene
- toonstuk-hero-opener: the first screen is the beeldbank photo edge to edge (the ripple layer in it, a flat scrim), with the display line at 16 to 19vw across it or as a split wordmark, one short lead and a large rectangular CTA. On scroll it pins, scales down and darkens while the next section slides over it.
- Every site has one contrast scene, at most two: scene-inverse or scene-field remaps the tokens inside a section. canon.mjs writes the palette's inverse and field roles, or swaps text and ground until the canon has them.
- check.mjs fails a hand-built hero line under 10vw, and a site with no contrast scene or more than two.

### Round two fixes
- canon.mjs resolves every staging pairing: a canon face Google lists under its family ("Big Shoulders Display" as "Big Shoulders") is found, and a pairing's italic accent face loads as the third face (italic only). fontVariables carries every face to the layout.
- No photos that pretend: when the brief's sector words point at no pack, images.mjs keeps only the photos whose alt names something the brief is about, writes imageFit, and the opener goes typographic over the WebGL scene when none fit. The approval stop asks for the client's photos. check.mjs fails off-topic photos.
- check.mjs fails a display heading in an overflow-hidden box and an image reference past the pack; media captions (figcaption, data-caption) may be small and tracked, section eyebrows still may not.
- The scrub connector sizes its words and bar with one clamp(), no breakpoint ladder and no px.
- A long display word in a narrow column beside a lifted image is flagged as clipped; manifesto chips load eagerly and must show a subject, not a texture.

### The MCP build line
- With the Struq MCP connected, SKILL.md runs an explicit build line: bouwplan, the one approval stop with the plan's needs, projectschil, motion, achtergrond, and one sectiespec per arc row before that row is written. log.mjs mcp records each call; check.mjs fails fewer sectiespec calls than arc rows, and an approval stop outside bouwplan to projectschil.
- A pack or photos from the plan that do not fit the brief go through the same photo rule: none ship off-topic.
- The dots and contours scenes have a visibility floor on dark grounds, so a photo-less opener still carries the screen.

### Rules and the check
- One combined tell list (Struq's tells 1.2.0, the slop audit, Roy's rules), with `check.mjs` as its executable form: eyebrows and uppercase labels, gradients, tinted fills, pills and live dots, mono, default faces, blue and purple, dashes, Struq's generic CTAs ("Neem contact op", "Meer informatie", "Aan de slag" and the rest) stat rows (20+, 51+, 99%) and more.
- The hero carries a pack photo; the WebGL field is atmosphere beside or behind the copy, held by the quiet zone; every page has a header wordmark (`data-wordmark`); the client's product is never modelled from primitives. `check.mjs` fails each.
- No eyebrows anywhere in the references; the niche packets are back from deck-design with Struq's overrides.
