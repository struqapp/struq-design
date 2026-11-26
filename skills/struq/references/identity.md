# Identity: the client's mark

Every site ships with a logo designed for this client, never the name typed in a font and never a stock icon. It is
the cherry on top: the one small object a visitor carries away, on their tab, their home screen and every shared
link. Give it the time a studio gives it. A mark you would not put on the client's invoice does not ship.

The finished shape is data in `lib/site.ts` (`brand.symbol`, see `components/struq/kit/brand/symbol.ts`); the kit
draws it in the header (`<Mark>` or `<Logo>`), as the favicon and app icons, and in the link preview
(`blocks.mjs finish`).

## The method

1. **Derive it from the site's idea, never from the trade.** Read the treatment: the Idea, the Motif, the
   centerpiece, the signature scene. The mark is that idea reduced to one drawing. Halden's site draws a pendant in
   half section before it is blown, so its mark is that half section. A potter's site turns a lump into a vase on the
   wheel, so the mark is the lump with the vase drawn out of it. A trade alone (a lamp, a vase, a house) gives the
   generic icon; the idea gives the one nobody else has.
2. **Sketch at least three constructions** as SVG on the grid below, each a different idea, not three styles of one.
   Name each in one line: what it is built from and why.
3. **Reduce to one memorable construction.** One or two primitives in one relation (a circle split by its axis, a
   field cut once at an exact angle, a line and the profile it revolves). If it takes a sentence with "and" twice,
   it is two marks.
4. **Build it on a fixed grid.** A 48 unit square, a live area of about 5 to 43, keylines of 2 units (a 2 unit
   stroke, a 2 or 3 unit gap). Every coordinate on the grid or derived from a stated rule (a 19.47 degree wake angle,
   a radius of 15.25 to overshoot a 15 circle).
5. **Correct it optically.**
   - Round and pointed forms overshoot the flat ones by about 2 percent (a circle of r 15.25 against a square of 30).
   - A square reads larger than a circle of the same width: set the square a little smaller.
   - Centre on the visual mass, not the bounding box: a mark that is heavy on one side moves 1 to 3 units the other
     way. Shift the `viewBox` origin, never the paths.
   - Stroke contrast is a choice: one weight reads technical, a thin and a heavy part read crafted. Keep to one or
     two weights.
6. **Colour from the palette.** The ink, and at most one part in the accent (the part that carries the meaning:
   the glass half, the clay wall, the moving part). Flat colour only.
7. **The wordmark.** The name in the site's display face, at the weight the site sets its display type, with tracking
   tuned for its size (about -0.02 to 0.01 em at header size; looser only for small caps). Kern the pairs that gap
   (Va, rt, LT). One considered detail at most (a ligature, a cut terminal), and only if it serves the idea. The
   symbol stands left of the name, about 1.2 times the cap height, centred on the x-height plus caps, a gap of about
   0.4 em. Stacked: the symbol at twice that, centred over the name.

## Where it must hold

- **16 px**, the browser tab: the shape still reads as itself. Hairlines under 1 px vanish; a 2 unit keyline is
  0.67 px there, so the mass must carry the idea. Draw a heavier small-size version only if the 16 px render fails.
- **32 px**, the favicon at retina, and **180 px**, the Apple touch icon: full bleed, iOS rounds it. The kit keeps
  the symbol inside 70 percent.
- **512 px**, the manifest icon, and the **maskable** 512: Android may cut it to a circle of 80 percent, so the kit
  keeps the symbol inside a 60 percent box.
- **Light and dark**: the ink on the light ground and the dark one, and the tile in the palette's ground.
- **The header**, beside the wordmark, in the bar's ink over every ground the page has.

## Never

- A monogram in a disc, initials in a circle or a square, by default.
- A stock or icon-set glyph as the mark (a leaf, a house outline, a swoosh, a lightbulb, a globe, a spark, a heart).
- A gradient, a shadow, a glow, a bevel, a 3D render, a photo.
- A shape that already means something else at 16 px (a power button, a person, a play arrow, a well-known logo).
- Three or more colours, more than two weights, text inside the symbol.
- The same construction for two clients. Check `references/identity/` and the examples first.

Two marks Struq shipped failed this list and were redrawn: Leirvik's axis beside one wall read as the letters "LS",
and Vaart's square cut by a slash was competent but safe, one of a hundred marks like it; render every candidate and
reject the one that spells letters or that any studio could have drawn without reading the brief.

## Self-review before it ships

Render every candidate at 16 (real pixels, zoomed), 32, 64, a 180 tile and 512, on the light and the dark ground,
and in the header lockup. Look at the renders, then ask:

- Does it read as itself at 16 px, and as nothing else?
- Would it stand on a business card next to work by Pentagram, Koto or Collins? Compare the rigour and the restraint,
  never copy a form.
- Can you say its construction in one line, and does that line come from this site's idea?
- Is it centred on its mass inside the tile?
- Would you put it on the client's invoice?

Keep only the one that passes. A contact sheet of each mark Struq designed lives in `references/identity/`: Halden,
Leirvik, Vaart Studio and Van Rijn, as SVG and one PNG sheet each.

## The references

- **Halden** (glass pendants, Bergen): the pendant in half section, the left half drawn as a 2 unit contour, the
  right half filled as glass in the accent, on a 2 unit cord. From the site's Formen scene, "drawn before it is
  blown". Bodoni Moda 500.
- **Leirvik** (ceramics, Rotterdam): the lump with the vase drawn out of it. A disc of r 15.25, the clay before the
  wheel, with the vase as its counter: the lip opens through the top of the lump, the foot stands on 4 units of clay
  that is left. One shape in terracotta, before and after in one drawing, from the site's throw. Fraunces 400.
- **Vaart Studio** (web design, invented): a still field parted by the bend onto a course, an S of
  cubic-bezier(0.65, 0, 0.35, 1) from corner to corner with a 3 unit channel. It is the turn a boat makes into a
  vaart and the easing curve every move on a site follows; the water side in the accent. Urbanist 600.
- **Van Rijn Dakwerk** (roofer, Utrecht): the rain stopped by the roof. Four bars of rain end 2.5 units above a tile
  layer at the site's 40 degree pitch, and the home is the dry space beneath, never drawn. The tile layer in the
  brick accent. Schibsted Grotesk 400.
