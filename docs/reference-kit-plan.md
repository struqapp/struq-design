# Reference kit plan (started 2026-11-26)

The skill's checks now hold the floor (no giant middle type, no empty screens, no sideways scroll, no covered type).
The ceiling comes from what a model can copy, not from more rules. Every model copies good code well; it turns prose
into craft badly. So the skill moves from telling to showing: finished kit pieces and finished reference builds that
the agent assembles and adjusts to the business, with SKILL.md kept to the core moves.

The bar: Lusion, Active Theory, Resn. A one-shot never matches a dedicated studio site; the aim is to come as close as
an agent can, on Opus and on Haiku.

## Steps

1. **Craft as code in the kit.**
   - `kit/gl/world/`: `World` (the fixed Stage behind the page), `useBeats` (section shares read from `[data-beat]`
     sections, kept current on resize), `BeatCamera` (camera keys named by beat, arriving a little ahead of each
     section's line) and `Framed` (keeps the object whole in frame and on the side the type leaves free, at 390, 1024
     and 1440).
   - `kit/gl/objects/`: three modelled hero objects with props for the business: `Pendant`, `LeverMachine`, `Vessel`.
   - `kit/quiet/Close` shape `order`: the things for sale (names, prices when given) and the one door to buy.
2. **Reference builds.** Halden, cleaned up, becomes the first reference in `skills/struq/examples/halden/`: the page
   source, a README that says what to copy and what to change per business, and screenshots. Two more follow (a
   service business and a place people visit), each built from the kit, so the examples show the kit in use.
3. **The reviewer sees motion and the bar.** The art director round gets frames mid-scroll and the reference's
   screenshots beside the build, and answers "where is this below the reference".
4. **Selling at the source.** The one stop asks for products, prices and a door. With none, the page still ends on
   the order close with a placeholder door from `lib/site.ts`; check.mjs warns until it is replaced.
   **The reference set covers every kind of business at the same bar** (Roy, 2026-11-26: portfolios, agencies,
   restaurants, real companies and constructors alike). Six references, each a different archetype and a different
   signature, all on one skeleton (content in `lib/site.ts`, one page composing scenes, one signature, one close),
   so a model learns the structure and swaps the business:

   | Reference | Archetype | Signature | Close |
   | --- | --- | --- | --- |
   | Halden, glass pendants | maker or product shop | a modelled object in one world (Pendant) | order |
   | a restaurant | a place people visit | photo-led cinematic: full-bleed stills, image transitions, the room at night | book a table |
   | a construction company | real company, trade, B2B | the building assembles: a 3D massing model or a blueprint that draws and fills | request a quote |
   | a design or creative agency | agency or studio | kinetic type and a work index with WebGL image distortion | start a project |
   | a photographer or designer | portfolio | the work full screen: a gallery with directed transitions | enquire or commission |
   | a law firm or consultancy | professional services | type-led trust: editorial type, a drawn diagram of how they work | book a call |

   Each README names the structure, the signature, and the swaps for other businesses of that archetype (the
   restaurant reference also serves a hotel or a bakery; the construction one a plumber or an architect). The kit
   grows with each signature (Massing or Blueprint for construction, image transitions for the restaurant and the
   portfolio, kinetic type for the agency), always finished code with props, never only prose. The 12 standing
   briefs (struq-showcases `proof/phase-1/BRIEFS.md`) already span these archetypes and stay the measure.
5. **Trim SKILL.md.** Core moves only; detail moves into references and the examples.
6. **Measure on the fixed set.** The 12 one-line briefs of the main plan, once, on Haiku and on Opus medium.

## Working rules

- One branch per piece off `feat/bar-first`, each in its own worktree on D:, merged back with `--no-ff`.
- Each kit piece is proven in a lab app (D:\StruqRuns\lab\<piece>) with look.mjs screenshots at 390 and 1440.
- Every kit change is mirrored into StruqVisual (`blocks/kit`) so the MCP hands out the same parts.
