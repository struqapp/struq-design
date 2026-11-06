# Changelog

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
