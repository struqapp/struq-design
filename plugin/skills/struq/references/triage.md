# Triage: what to fix and what to leave alone

When Struq is invoked to **fix or improve an existing build** (not greenfield), the
failure mode is *over-correction*: rewriting the brand, the copy, and the component
library along with the actual problems, then handing back something the owner does not
recognize. This file is the restraint rule. Read it first on any remediation task.

The principle: **fix the execution, preserve the identity.** Type, spacing, surfaces,
motion, scaling, and icon misuse are execution, so they are fair game. Brand color, words,
and the component foundation are identity, so leave them unless explicitly asked.

---

## Preserve by default: do NOT touch unless the user asks

### 1. Brand colors / palette
Keep the brand and accent hues as they are. You may fix **how** color is used
(remove a blue→purple gradient, fix a contrast failure, stop an accent appearing five times
per viewport) but do **not reassign the brand color** to something you find more
tasteful. If the brand is a specific blue, the fix keeps that blue and applies it with
restraint; it does not swap it for sienna because a preset uses sienna.

### 2. Copy / content
Do **not** rewrite headlines or body copy. Treat the existing words as fixed. Fix the
*typography, layout, and motion around* the copy, never the copy itself, unless the user
flags a specific line. (This is the opposite of greenfield, where you would write real copy
instead of lorem; here the copy already exists and is someone's decision.)

### 3. Component-library primitives
Do not rip out shadcn / Radix / the existing design-system base and replace it with custom
components. **Style within** the primitives: restyle the button, don't delete the
`<Button>`; retheme the card, don't swap the card library. The foundation stays; you
change its dress.

---

## Fair game: fix freely (this is what you were called for)

- **Layout / structure / IA**: restructure sections, reorder, break the grid, fix the
  symmetric "SaaS stack." Layout is execution, not identity: swap in blocks where the page is weakest (the hero, the work, the footer first).
- **Spacing rhythm**: kill uniform `py-16`, vary padding by section role.
- **Type scale + weight**: fix the five-mid-sizes problem, lighten hero weights, enforce
  the readable floor and contrast minimums. If the
  brand already owns its typefaces, keep them and change how they are set, not which they are
  (their faces go into --face-display and --face-body).
- **Surfaces / elevation**: replace `shadow-lg` cards with the tonal ladder.
- **Motion / reveals**: replace opacity-only fades, add transform+stagger, fix easing.
- **Scaling**: convert px-everything + per-breakpoint size ladders to the fluid root-rem
  system ([craft.md](craft.md)).
- **Icon misuse**: remove Sparkles/Rocket/Zap/emoji, colored chips, decorative filler;
  consolidate to one icon family ([iconography.md](iconography.md)): the brand's own set if it has one, else Struq Icons (`@struq/icons`). A redesign that already uses one coherent non-Lucide family keeps it (preserve by default); one family per site, never mixed.
- **Everything in [tells.md](tells.md)**: that list is the fix list.

---

## Workflow

1. **Scan** with `struq_controle`'s detectors and [tells.md](tells.md); collect every tell.
2. **Filter** the findings through the preserve-list above. A "fix" that reassigns brand
   color, rewrites copy, or replaces a component primitive is dropped (or downgraded to a
   *suggestion* the user can opt into), not applied.
3. **Apply** the remaining fixes.
4. **Report what you intentionally left unchanged and why**, for example: "kept your brand blue
   and all copy; restyled gradient usage, spacing, type weights, and icons within your
   existing shadcn components." This makes the restraint visible and lets the user lift any
   preserved item into scope if they want it changed after all.

When unsure whether something is identity or execution, **ask** rather than assume, but
default to preserving the three categories above.

