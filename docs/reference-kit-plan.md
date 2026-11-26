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
   The reference set covers every kind of business at the same bar: one reference per group below, all on one
   skeleton (content in lib/site.ts, one page composing scenes, one signature, one close). Each README names the
   neighbours it also serves, and each signature becomes a finished kit piece with props.
5. **Trim SKILL.md.** Core moves only; detail moves into references and the examples.
6. **Measure on the fixed set.** The 12 one-line briefs of the main plan, once, on Haiku and on Opus medium.

## The ten groups (Roy, 2026-11-26)

Grouped by what the site must get a visitor to do, not by industry. One reference per group, built in this order:
1. Product brands and shops (Halden): buy. 2. Local trades and home services: call or quote. 3. Food and
hospitality: book or visit. 4. Agencies and studios: start a project. Then, in the order the 12-brief run shows is
weakest: health, beauty and wellness practices (book an appointment); professional services (book a call);
established companies and B2B (enquire, tender); personal portfolios (commission); software and apps (sign up);
events, venues, causes and education (tickets, donate, join, enrol). Brief set version 2 adds a practice brief and a
construction or engineering brief so every group is measured.

## Spending it well

- One agent per reference, and that agent also builds the reference's signature kit piece: no separate kit and
  reference runs for the same group. At most two at once.
- Halden is not rebuilt from scratch: the existing Opus build is moved onto the new kit parts and cleaned up.
- Every reference after the first starts from the shared skeleton of the one before, so agents adjust instead of
  inventing.
- Opus at medium for the reference builds only; Sonnet for ports, READMEs and wording; Haiku for proof runs.
- Agents report in a few lines; the orchestrator reviews from look screenshots at half scale and one Chrome pass,
  never from transcripts.
- A reference is done when it passes look and check and one review round; no open-ended polishing.

## Working rules

- One branch per piece off `feat/bar-first`, each in its own worktree on D:, merged back with `--no-ff`.
- Each kit piece is proven in a lab app (D:\StruqRuns\lab\<piece>) with look.mjs screenshots at 390 and 1440.
- Every kit change is mirrored into StruqVisual (`blocks/kit`) so the MCP hands out the same parts.

## Where the 2026-11-26 slice ended

Shipped in 0.6.0: three references (Halden for shops, Van Rijn for trades without 3D, Oostwerk for agencies), the
one-world kit and ready-made objects, the order close, the finishing step (logo method, favicon, link previews,
sitemap, robots, llms.txt, JSON-LD, not-found, Struq Icons, the removable credit), phone checks, type over the
object, sparse stops, and 3D as a choice that the one stop offers.

Open, in order:
1. Photos for the references come from the stock library only. Van Rijn has none because no pack shows roofs; new
   packs for the new groups (trades, practices, hospitality, agencies) are Roy's next imagery work.
2. The remaining six groups get a reference each: hospitality first, then practices, professional services, B2B,
   portfolios, software, events and causes.
3. A proof run on Haiku with the references, to see the floor; then the 12 fixed briefs (brief set version 2).
4. The MCP has the brand kit files but not `blocks.mjs finish`; MCP clients need the same finishing step.
5. Kit gaps found on the way: cheap glass for many Pendants, a World wall colour per beat, Framed dolly-in and
   per-beat margins, `finish` writing a second viewport export, SiteFacts reading a placeholder phone.
6. The reviewer still sees settled frames only; mid-scroll frames and the reference shots beside the build (step 3).
