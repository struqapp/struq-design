# The film: treatments, worked

SKILL.md holds the rules: the treatment template, the three languages, their arcs and the budgets. This file shows
them filled in. Read it once before you write your first treatment.

## The words

**Treatment.** The head of STRUQ.md: the idea, the language, the motif, the lexicon, the centerpiece and the
storyboard. It is the script of the site. Every block you install answers to a line of it; a block no line asks for
does not go on the page.

**Idea.** A point of view, not a description. "Duin is a small hotel behind the dunes" describes the client and
gives the site nothing to do. "Hier hoor je de zee voordat je haar ziet" is an idea: it tells you what the opening
withholds and what the centerpiece gives. Test it: if the sentence could open the client's Wikipedia page, it is a
description.

**Language.** How the whole site moves: the preloader, the page transition and the menu come from one family, so
every cut between scenes is made the same way. weight is slow and photographic, cut is hard and short, curtain parts
and holds. Pick it by the client's world, not by the block you like best.

**Motif.** One visual device from a closed set (line, frame, aperture, cut, word, field) that stands for something in
the client's world: the window frame of a canal house, the seam of a knitted garment, the horizon over the sea at
night. It shows at four places (arrival, opening, centerpiece, close) and changes a little each time, so the visitor
feels the page is about one thing.

**Lexicon.** Three to five working words of the client's trade: a material, a part, a tool, a unit. Not the brief
repeated: "twaalf kamers, Bergen aan Zee" are facts for the copy, while "helmgras, zout, vloed, sleutel" is a
lexicon for a hotel behind the dunes. Every label, counter, caption and margin note on the site is written with
them. A caption names the client's material, never "Scene 01". Trade words are not facts, so they need no source;
numbers still come from the brief only.

The three treatments below are examples of the form. Their palettes, pairings, packs and centerpieces belong to
those clients: pick yours from the canon and the arc by your own brief, and pick the language by the client's
world (a fashion label is cut, not weight, unless the brief says slow).

**Arc.** The order of scenes for a language, with the loud and quiet beats already placed. You cast the brief into
it: each scene gets this client's content. You may swap one scene for another with the same tag; the loud scenes are
the opening, the centerpiece and at most one gentle one, never side by side.

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

## weight: Atelier Sloot, a ceramics studio

```
# STRUQ.md: Atelier Sloot
Brief: keramiekatelier in Deventer dat servies in kleine series draait, voor restaurants en voor thuis
Idea: Een kom is pas af als hij gebruikt wordt.
Language: weight
Motif: frame: one object alone on its plank; a small upright print at arrival, the print on the wall at the opening, the object grown to the whole screen at the centerpiece, an empty frame round the last line
Lexicon: klei, glazuur, oven, serie
Palette: frontier-mizu-greige-bronze (slow ceramic restraint)
Type: serif-editorial: Fraunces + Urbanist
Images: pack vitrine
Centerpiece: image-to-fullbleed: one bowl grows from a print on the wall to the size of the screen; you see it the way you would hold it, which is the idea
Tone arc: paper, paper, paper, paper, paper, ink, paper, paper
Storyboard:
1. Arrival   (frame)  preloader-stack, "Atelier Sloot" under the frame | lands on: the hero print
2. Opening   (loud)   hero-framed:wand | on screen: one bowl as a small print, its label "Kom, mat glazuur", the h1 "Gemaakt om te gebruiken." | enters: the line rises beside the print | hands over: the first scroll walks up to the print until it fills the screen
3. Statement (quiet)  own scene, SplitHeadline | on screen: "Eerst de hand, dan de oven." at 14vw on paper | enters: lines rise once | hands over: plain scroll
4. About     (loud)   about-studio:wandeling | on screen: who makes it and where, as the brief says, beside two columns of objects | enters: the columns drift with the scroll | hands over: plain scroll
5. Approach  (quiet)  own scene, hairline rows | on screen: draaien, drogen, glazuren, stoken, one sentence each, no numbers | enters: each row once | hands over: plain scroll
6. Centerpiece (loud) image-to-fullbleed | on screen: one bowl on stone, from print to full screen, with "Op ware grootte." | enters: pinned 2.2 screens | hands over: the photo lets go and scrolls away whole
7. Release   (quiet)  own scene | on screen: a photo of the drying rack and two sentences on ordering a series | enters: once | hands over: plain scroll
8. Close     (quiet)  own scene | echoes the opening: an empty hairline frame the size of the arrival print round "Vraag een serie aan." and the mail link | footer: wordmark-finale
```

Budgets: pins 1.5 + 2.2 = 3.7 screens; full-bleed reveals two, built the same way (a print growing to the screen);
clocks none, so no `timeZone` on the finale; four of the seven scenes after the arrival quiet, and the one gentle
loud scene (the walk past the objects) has a quiet scene on each side. `approach:draad` was left out: it draws a
line, and this site's motif is a frame.

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
7. Close     (quiet)  own scene, type only | echoes the opening: "Uit deze oplage, zolang hij er is." cut off at the seam line, a link to the shop | footer: footer-contact:address
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
4. Details   (loud)   sticky-chapters | on screen: the three nights as chapters, with the places the brief names | enters: one photo holds while the nights scroll past, each night's photo rising over the last | hands over: plain scroll
5. Build     (quiet)  own scene | on screen: who makes it, a photo of the pier | enters: once | hands over: plain scroll
6. Centerpiece (loud) scrub-connector | on screen: "Eb" and "Vloed" | enters: pinned 3 screens | hands over: the joined pair scrolls away whole
7. Release   (quiet)  own scene | on screen: one photo of the boulevard, the dates and place from the brief | enters: once | hands over: plain scroll
8. Close     (quiet)  cta-closing:pointer | echoes the opening: the line drawn under "Kom kijken als het donker wordt." | footer: footer-reveal:lift
```

Budgets: pins 3 screens; no full-bleed reveal; no clock; two contrast scenes (the field and the ink); the chapters
are the one gentle loud scene, a quiet scene on each side.
`preloader-gate` was left out: its film leader counts 3, 2, 1, and this client is not a film.

## Before the stop

Read the storyboard once as a visitor would. If two scenes in a row move with the scroll, one becomes quiet. If a
scene carries a metaphor from outside the client's world (a film leader, a slate, a typewriter, a clock nobody asked
for), it goes or its words come from the lexicon. If the centerpiece could sit on any other client's site, the idea
is not in it yet.
