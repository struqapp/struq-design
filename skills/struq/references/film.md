# The film: treatments, worked

SKILL.md holds the rules: the treatment template, the three languages, their arcs and the budgets. This file shows
them filled in. Read it once before you write your first treatment.

## The words

**Treatment.** The head of STRUQ.md: the idea, the language, the motif, the lexicon, the centerpiece and the
storyboard. It is the script of the site. Every block you install answers to a line of it; a block no line asks for
does not go on the page.

**Language.** How the whole site moves: the preloader, the page transition and the menu come from one family, so
every cut between scenes is made the same way. weight is slow and photographic, cut is hard and short, curtain parts
and holds. Pick it by the client's world, not by the block you like best.

**Motif.** One visual device from a closed set (line, frame, aperture, cut, word, field) that stands for something in
the client's world: the window frame of a canal house, the seam of a knitted garment, the horizon over the sea at
night. It shows at four places (arrival, opening, centerpiece, close) and changes a little each time, so the visitor
feels the page is about one thing.

**Lexicon.** Three to five words or numbers from the client's own world. Every label, counter, caption and margin
note on the site is written with them. A preloader counts in the client's units, never in film frames; a caption
names the client's material, never "Scene 01". Numbers come from the brief only.

**Arc.** The order of scenes for a language, with the loud and quiet beats already placed. You cast the brief into
it: each scene gets this client's content. You may swap one scene for another of the same energy, never add a second
loud one.

## How a motif travels

| Motif | Arrival | Opening | Centerpiece | Close |
|---|---|---|---|---|
| line | the cover opens on a hairline | the headline stands on a horizon or seam | a rule or slab is drawn through the words | the rule draws under the closing link |
| frame | the small print of the preloader | the print on the wall | the grid of prints, one opening into a room | an empty hairline frame round the last line |
| aperture | the cover opens through a slit | a window cut in the type | the window the camera pushes through | the footer uncovered through a growing slit |
| cut | the slices drop away | a slit through the poster type | a hard seam between two photos | the page ends on a cut, no fade |
| word | the name set across the screen | one word at poster scale | a word that fills, splits or shears | the name again, edge to edge |
| field | the cover in the field colour | a live field behind the type | the one field scene | the field returning under the footer |

## A quiet scene, in words

Paper ground. A single photograph of a stairwell sits in the right seven columns at 4:5. In the left columns, two
sentences in the body face, and under the photo a small sentence-case caption in the lexicon: "Trap, schaal 1:20".
As the scene comes in, the lines rise once through their masks and the photo opens once from its bottom edge. Then
nothing moves until the visitor scrolls on: no pin, no scrub, no parallax, no hover, no counter. Quiet scenes are
what make the centerpiece read as the moment.

## weight: Atelier Kade

```
# STRUQ.md: Atelier Kade
Brief: architectenbureau voor woonhuizen en verbouwingen aan de Utrechtse grachten, voor eigenaren van oude panden
Idea: Elk huis begint bij de maat van wat er al staat.
Language: weight
Motif: frame: the window frame of a canal house; a small upright print at arrival, the print on the wall at the opening, a whole room opening out of the grid at the centerpiece, an empty frame round the last line
Lexicon: schaal 1:50, kavel, gevel, bouwjaar
Palette: stone-forest (quiet confidence)
Type: editorial-sans-precision: Sora + Public Sans
Images: pack datum
Centerpiece: grid-assembly: the houses lie like drawings on a table and come together into one plan sheet, then one opens into a room at full size; drawing becomes house, which is the idea
Tone arc: paper, paper, paper, paper, paper, ink, paper, paper
Storyboard:
1. Arrival   (frame)  preloader-stack, "Atelier Kade" under the frame | lands on: the hero print
2. Opening   (loud)   hero-framed:wand | on screen: one facade as a small print, its label "Gevel, schaal 1:50", the h1 "Elk huis begint bij wat er al staat." | enters: the line rises beside the print | hands over: the first scroll walks up to the print until it fills the screen
3. Statement (quiet)  own scene, SplitHeadline | on screen: "We tekenen eerst wat er is." at 14vw on paper | enters: lines rise once | hands over: plain scroll
4. About     (quiet)  about-studio:wandeling | on screen: who works here and since when, as the brief says, beside two columns of facades | enters: once | hands over: plain scroll
5. Approach  (quiet)  own hairline rows | on screen: opmeten, schetsen, bestek, oplevering, one sentence each, no numbers | enters: each row once | hands over: plain scroll
6. Centerpiece (loud) grid-assembly | on screen: nine houses into one plan, then one room at full size with "Een kamer op schaal 1:1." | enters: pinned 2.5 screens | hands over: the photo drifts off slower than the page
7. Release   (quiet)  own scene | on screen: a stairwell photo and two sentences on the first visit | enters: once | hands over: plain scroll
8. Close     (quiet)  own scene | echoes the opening: an empty hairline frame the size of the arrival print round "Stuur ons de tekening van uw huis." and the mail link | footer: wordmark-finale
```

Budgets: pins 1.5 + 2.5 = 4 screens; full-bleed reveals two (the wand and the end of the grid); clocks none, so no
`timeZone` on the finale; five of eight scenes quiet. `approach:draad` was left out: it draws a line, and this
site's motif is a frame.

## cut: Vaar, a knitwear label

```
# STRUQ.md: Vaar
Brief: kleine oplagen merinotruien uit een Amsterdams atelier, voor mensen die liever één goede trui hebben dan vijf
Idea: Eén naad, en die zit waar je hem ziet.
Language: cut
Motif: cut: the seam of a knitted garment; the slices at arrival, a slit through the poster type at the opening, the hard seam between two photos at the centerpiece, the page ending on a cut
Lexicon: naad, steek, merino, oplage
Palette: frontier-seve-bone-oxblood (restrained fashion editorial)
Type: fashion-contrast: Bodoni Moda + Urbanist
Images: pack bolt
Centerpiece: split-pair: two garments meet on one seam and the word "Naad" shears along it; the idea made physical
Tone arc: paper, paper, paper, paper, ink, paper, paper
Storyboard:
1. Arrival   (frame)  preloader-slices, name "Vaar", caption "Merino, kleine oplage, Amsterdam" | lands on: the poster
2. Opening   (loud)   hero-poster:column | on screen: "Langzaam / gebreid" fitted to the width, a slit of folded wool through it | enters: the slices uncover it | hands over: the slit opens sideways into the full photo
3. Work      (quiet)  hover-list | on screen: the pieces of this oplage, name and colour | enters: rows rise once | hands over: plain scroll
4. Statement (quiet)  reveals:clip | on screen: a photo opening from a slit, "Elke trui heeft één naad." | enters: once | hands over: plain scroll
5. Centerpiece (loud) split-pair | on screen: the word "Naad", two photos meeting on it | enters: pinned 3 screens | hands over: the halves leave at their own speeds
6. Release   (quiet)  fill-rows | on screen: the three yarns, a detail on hover | enters: once | hands over: a hard cut to paper
7. Close     (quiet)  type only | echoes the opening: "Uit deze oplage, zolang hij er is." cut off at the seam line, a link to the shop | footer: footer-contact:address
```

Budgets: pins 1.5 + 3 = 4.5; one full-bleed reveal; one clock (the footer); no marquee, so the close is type only.

## curtain: Nachtwerk, a night festival

```
# STRUQ.md: Nachtwerk
Brief: driedaags kunstfestival op de boulevard van Vlissingen, alleen na zonsondergang, voor wie de stad bij nacht wil zien
Idea: De stad begint pas als het donker is.
Language: curtain
Motif: line: the horizon over the water at night; the name parts on it at arrival, a low band of light on it at the opening, a slab that becomes the rising line at the centerpiece, the rule under the closing link
Lexicon: eb, vloed, de pier, drie nachten
Palette: frontier-marrow-bone-blood-orange (studio theatrical warm bone)
Type: condensed-poster: Big Shoulders Display + Figtree
Images: pack assembly
Centerpiece: scrub-connector: "Eb" and "Vloed" far apart, joined by one slab that seats as a rising line; the tide as the festival's clock
Tone arc: field, field, paper, paper, paper, ink, paper, paper
Storyboard:
1. Arrival   (frame)  preloader-wordmark:split, "Nachtwerk" | lands on: the field, the halves parting on its middle line
2. Opening   (loud)   background-aurora:horizon | on screen: "Drie nachten aan zee." at 16vw on the calm side, a low band of light along the foot | enters: lines rise as the band brightens | hands over: the band rises as the hero scrolls away
3. Statement (quiet)  reveals:lines | on screen: one sentence on why the festival starts at dusk, a photo of an empty stage | enters: once | hands over: plain scroll
4. Details   (quiet)  sticky-chapters | on screen: the three nights as chapters, with the places the brief names | enters: each chapter once | hands over: plain scroll
5. Build     (quiet)  about-studio:plaat | on screen: who makes it, the plate of the pier | enters: the plate opens once | hands over: plain scroll
6. Centerpiece (loud) scrub-connector | on screen: "Eb" and "Vloed" | enters: pinned 3 screens | hands over: the joined pair scrolls away whole
7. Release   (quiet)  own scene | on screen: one photo of the boulevard, the dates and place from the brief | enters: once | hands over: plain scroll
8. Close     (quiet)  cta-closing:pointer | echoes the opening: the line drawn under "Kom kijken als het donker wordt." | footer: footer-reveal:lift
```

Budgets: pins 3 screens; one full-bleed reveal (the plate); no clock; two contrast scenes (the field and the ink).
`preloader-gate` was left out: its film leader counts 3, 2, 1, and this client is not a film.

## Before the stop

Read the storyboard once as a visitor would. If two scenes in a row move with the scroll, one becomes quiet. If a
scene carries a metaphor from outside the client's world (a film leader, a slate, a typewriter, a clock nobody asked
for), it goes or its words come from the lexicon. If the centerpiece could sit on any other client's site, the idea
is not in it yet.
