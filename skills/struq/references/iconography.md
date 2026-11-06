# Iconography: one icon family + craft doctrine

## Decide here

Planning reads only this section ([direction.md](direction.md) §4); the rest is for the build.

- **Family, in this order, stop at the first that fits:** (1) the brand's own drawn set; (2) **Struq Icons**, the default (`npm i @struq/icons`, MIT, 182 icons: 118 two-tone with a hover motion, 14 status, 50 glyphs; browse at [struq.nl/iconen](https://struq.nl/iconen)); (3) **Phosphor, weight `light`** (`@phosphor-icons/react`, `thin` for luxury) when the set lacks what the site needs and drawing it is not worth it, or the concept wants a softer, rounder line; (4) **Iconoir or Tabler** at stroke 1.25 when the concept wants a sharper, technical line.
- **One icon family per site, never mixed.** Never two, never Lucide by reflex. If the chosen family lacks an icon, draw it to that family's rules or move the whole site down the list (§2).
- **Struq Icons on a Struq site:** `strokeWidth={1.5}` next to light display type (`1.25` for luxury); the accent mapped to the site's own `--color-accent` (§2), not the set's default flame; `states.css` on, so icons rest in one tone and the accent shows where you act.
- **Size and color:** one size per context (`size={20}` inline, `size={24}` nav, or a `size-5` / `size-6` class so the icon rides the root-rem knob), ink-colored; color only for state and semantics.
- **Budget:** functional icons only (nav, close, chevrons, form states, CTA anchors). No 3-up feature-card icons, no Sparkles, Rocket or Zap, no emoji, no colored chips.
- **Motion:** the set's own hover motion (200ms, hover and focus only, never on load, never looping, off under reduced motion) is inside the budget. Other animated icons under 500ms on click, never looping in standard UI, static under reduced motion.
- **Record in STRUQ.md SYSTEM:** `Icons: Struq Icons, @struq/icons, strokeWidth 1.5, accent = --color-accent, states.css on`.

---


Two separate decisions, never collapse them:

1. **Whether an icon earns its place**: the Struq taste gate. Most marketing
   sections need *fewer* icons than the reflex wants; icon-as-filler is an AI tell.
2. **How the icon behaves once it's in**: the craft doctrine below (family, register,
   color, state, animation timing, accessibility).

The gate (§1) governs *where*; the doctrine (§2 to §8) governs *how*. A perfectly-crafted
icon in the wrong place is still wrong.

---

## 1. The gate: does it earn its place?

Keep the existing bans hard:

- **Never** as 3-up feature-card filler (centered icon + h3 + two gray lines), the single
  most recognizable generated section ([anti-patterns.md](anti-patterns.md) §2, §13).
- **Never** Sparkles / Rocket / Zap / lightning, or emoji (🚀✨💡). They are the visual signature
  of generated UI.
- **Never** in a colored circle/chip background.
- **Never** five sizes / five strokes scattered across a page.

Icons **earn their place** when they do real work:

- **Functional affordances**: nav, search, close, chevrons, form-field states, toggles.
- **Scannability** in menus and dashboards: a per-row icon lets the eye decode the list
  faster than text alone (humans parse a glyph in ~1/10s).
- **Button visual-anchors**: an icon on a CTA gives a fast hint of the action.
- **Paragraph / feature separators**: between blocks of a "wall of text," an icon marks a
  visual point of separation. It must *reinforce* the message, never *replace* it.

When in doubt, **no icon**. Hairline rules, ghost type, a single oversized numeral as an
accent, or real imagery often carry decoration better in a marketing context.

---

## 2. Source: one coherent family per project, chosen in this order

The family is a SYSTEM decision, recorded in STRUQ.md ([direction.md](direction.md) §4), not
something picked per component. Resolve it top to bottom and stop at the first that fits:

| # | Family | When | Install | Weight to match light display type |
|---|---|---|---|---|
| 1 | **The brand's own icons** | The client already has a drawn set | their files, inlined as components | as drawn |
| 2 | **Struq Icons** | The default for every Struq build: a two-tone set on one 24 grid (a base tone for the shape, an accent on the part that carries the meaning), each icon with its own hover motion and a draw-in variant | `npm i @struq/icons`; sprite, plain SVG and Iconify JSON (prefix `struq`) for non-React stacks | `strokeWidth={1.5}` (the set's default 2 is Lucide weight; `1.25` for luxury) |
| 3 | **Phosphor** | A softer, rounder line, or a site that needs icons the Struq set does not have | `npm i @phosphor-icons/react`, or Iconify `ph:` | `weight="light"` (or `"thin"` for luxury) |
| 4 | **Iconoir** or **Tabler** | A sharper, more technical or architectural line | `npm i iconoir-react` / `@tabler/icons-react`, or Iconify `iconoir:` / `tabler:` | Tabler `stroke={1.25}`; Iconoir `strokeWidth={1.25}` |

### Struq Icons: the wiring

Import the stylesheets once, at the root, before the site's own stylesheet; then import icons by name. Every icon is a named PascalCase export (`Search`, `ArrowRight`, `External`, `ChevronDown`, `Close`); the barrel tree-shakes. Check a name against the installed `dist/index.d.ts` or [struq.nl/iconen](https://struq.nl/iconen) before using it: the set names icons by meaning, so the up-right arrow is `External`, not `ArrowUpRight`.

```tsx
// app/layout.tsx (Next) or src/main.tsx (Vite): once, before globals.css
import "@struq/icons/tokens.css";
import "@struq/icons/icons.css";
import "@struq/icons/states.css"; // optional: one tone at rest, the accent on hover, focus and current
```

```css
/* globals.css: the set's accent follows the site's palette, not its default flame.
   On body, so it wins over tokens.css's :root and .dark rules by inheritance. */
body {
  --icon-base: currentColor;
  --icon-accent: var(--color-accent);
  --icon-accent-live: var(--color-accent);
}
```

```tsx
import { ArrowRight, Search } from "@struq/icons";

<a href="/work" className="font-ui text-ui inline-flex items-center gap-2">
  Selected work <ArrowRight size={20} strokeWidth={1.5} />
</a>

<button type="button" className="grid size-12 place-items-center">
  <Search size={24} strokeWidth={1.5} label="Search" /> {/* the only content: give it a label */}
</button>
```

- **Props:** `size` (16, 20, 24, 32 or 48 px; a `size-5` class overrides it in rem), `strokeWidth`, `label` (names it for screen readers; without one it is `aria-hidden` decoration), `animate` (`"hover"` default, `"draw"`, `"none"`), `color` and `accentColor` (any CSS colour, set per icon; they beat the variables). Other SVG props pass through.
- **Server components.** The icons use no hooks, so they render in server components. Only the draw-in entry is a client component.
- **Draw-in** for one empty state, first run or hero moment, never a list: `import { StruqIconDraw } from "@struq/icons/draw"`, `<StruqIconDraw icon={Inbox} size={48} delay={0.2} />`. It needs `motion` (already in the stack), draws once, never loops, and shows the finished icon on the server, without JS and under reduced motion.
- **Name clashes.** `Link`, `Image`, `File` and `Text` collide with `next/link`, `next/image` and DOM globals; import the `LinkIcon`, `ImageIcon`, `FileIcon` and `TextIcon` aliases instead.
- **Accent off in one area:** `data-icon-accent="off"` on a parent paints the accent in the base colour (needs `icons.css`). `data-icons="live"` keeps the accent on at rest in an area when `states.css` is loaded.
- **Status icons** (one tone) take their colour from the place they sit in: they follow `currentColor`, or a token through `color="var(--color-...)"`, never a hex.
- **Without React:** `sprite.svg` (copy it to `public/`, `<use href="/sprite.svg#search" />`, two-tone, no hover motion), plain SVG files under `svg/`, or `iconify.json` (prefix `struq`, for Iconify loaders in Vue, Svelte, Astro or Tailwind: the icon in the text colour with the accent at half strength, no hover motion, and `struq:<name>-draw` for a draw-in that plays once and ignores reduced motion). Same family, same rules.
- **A missing icon** is drawn to the set's rules (24 grid, round caps and joins, the site's stroke, base and accent as two parts) or the whole site moves to row 3. Never patch the gap with a Phosphor glyph.

**Never Lucide as the reflex.** It is the default of every generated UI, so it reads as
generated. **Never two families on one site.** If the chosen family is missing an icon, either
draw the missing icon to its rules (its grid, its stroke, its caps and joins) or move the whole
site to the next family. Patching gaps with a second set is the icon version of three display
fonts on one page.

**Iconify** is an optional transport for families 3 and 4 (and for Struq Icons outside React) when you want any family through one
component: one API over about 200k icons across every major set. It is a delivery method, not a
second family.

```bash
# Next / any React              # Vite (compile-time, zero runtime, tree-shaken)
npm i @iconify/react            npm i -D unplugin-icons @iconify/json
```

```tsx
// @iconify/react: works in both Next and Vite
import { Icon } from "@iconify/react";
<Icon icon="ph:arrow-up-right" className="size-5 text-ink" />   // Phosphor
<Icon icon="iconoir:search" className="size-5 text-ink" />       // Iconoir
```

```ts
// Vite alternative: unplugin-icons, imported as components (no runtime fetch)
import ArrowUpRight from "~icons/ph/arrow-up-right";
<ArrowUpRight className="size-5 text-ink" />
```

**Pick one family and stay in it.** Consistency in *style, weight, corner treatment, and
fill-vs-stroke* is what makes an icon set read as designed. Lock the chosen family in the
project's icon component so nothing else can be imported by accident.

---

## 3. Two registers: system vs decorative

| Register | Use | Traits |
|---|---|---|
| **System** | menus, buttons, inputs, table rows, anything **≤24px** | minimal, reduced to essentials, legible at small size, single stroke |
| **Decorative / expressive** | bigger explanatory moments, feature anchors, animated (Lordicon/Lottie) | richer, more detail, only at **larger** sizes |

**Complex/decorative icons die at small sizes**: their detail turns to mud below ~24px.
If it's small, it's a system icon. If it's expressive, it's big. Don't mix the registers
within one role.

One stroke across the set, as the §2 table sets it (Struq Icons `strokeWidth={1.5}`,
Phosphor `weight="light"`, Tabler `stroke={1.25}`, Iconoir `strokeWidth={1.25}`), one size per
context (e.g. `size-5` inline, `size-6` nav), ink-colored by default. Struq Icons' two tones
are not two colours in the §4 sense: at rest under `states.css` they read as one tone, and the
accent is the site's one accent, shown only where the visitor acts.

---

## 4. Color

- **One color across the set** by default: ink. An icon set in four hues reads as no
  decision made (same rule as the one-accent color system).
- Color earns its place only for **state** (hover/pressed/active) and **semantics**:
  red/warning for errors, a success check, etc.
- Never rely on color *alone* to carry meaning (accessibility, see §7).

---

## 5. States & feedback

An icon the user can act on must *look* actionable and must confirm the action:

- Distinct **default / hover / pressed**, via motion, color, or both. A clickable icon
  that never changes reads as decoration.
- **Feedback through the icon itself:** a checkmark confirms success, a warning sign flags
  an error, a state-swap (empty→full trash) signals what happened. Digital UI lacks the
  physical click of a real switch, so this feedback matters *more*, not less.

---

## 6. Animated icons (Lordicon / Lottie): timing is locked

Animated icons convey more meaning than static ones and drive engagement, but only with
discipline. The same budget as micro-interactions applies: **2 to 3 per view**, never a field
of looping motion.

**Timing (hard limits):**

| Trigger | Duration | Notes |
|---|---|---|
| **Click / tap** | **≤ 500ms** | must keep up with repeat clicks; longer feels out of sync and becomes a distraction by the 3rd press |
| **Hover (decorative)** | **1500-3000ms** | the delight sweet spot; more complex symbol → longer end of the range |
| GIF fallback loop | **2000-5000ms delay between loops** | only if tech forces a looping GIF |

**Rules:**

- **No constant loops in dashboards / standard UI.** They become an unwelcome
  distraction (especially for attention-sensitive users). Trigger on hover instead.
  A looping animation is fine *as a page loader*, not as ambient dashboard decoration.
  (This rhymes with the skill-wide "nothing moves that the user didn't cause" principle,
  [feel-layer.md](feel-layer.md) §5.)
- **No extreme flashing or flickering**: a seizure/motion-sensitivity hazard. Smooth the
  frequency; never strobe.
- **Natural physics only.** Motion that breaks real-world dynamics (unnatural bounce,
  impossible 3D, irregular movement) leaves users unsettled and confused. Smooth, weighted,
  accurate. Every movement must serve a purpose and match the icon's meaning (a security
  icon shouldn't "wave and wiggle").
- **Don't overload.** Too many animated icons, especially on loop, drown the message.

Animated icons are a micro-interaction: they obey the same library split and gating as
everything in [micro-interactions.md](micro-interactions.md). Lottie/Lordicon players are
state/lifecycle-driven (Motion territory for triggering), hover effects are
`@media (hover: hover)`-gated, and **reduced-motion → static icon** (render the still
frame, never the animation).

---

## 7. Accessibility

- **Meaningful icon:** give it an accessible name via `aria-label` (or visible label, §8).
  An icon that carries content needs alt text so screen readers convey it.
- **Decorative icon:** `aria-hidden`, which keeps it out of the a11y tree entirely.
- **Never color-alone** for meaning (color-vision-deficient and low-vision users). Pair
  with shape, label, or motion.
- **Touch target ≥ 48×48px**: the tappable area can exceed the visual glyph. Keep spacing
  between grouped tappable icons so they don't misfire.
- **Reduced motion** → static icon (see §6).

---

## 8. Labels, universal icons, conflicts

- **Labels:** before users click, they need to know what to expect. Universal icons (home,
  play, stop, pin, search) are self-evident; anything ambiguous needs a **1 to 3 word label**
  using an action word (Buy, Continue, Subscribe). Icons reinforce; labels disambiguate.
- **Universal icons reduce cognitive load.** Lean on the globally-recognized set where it
  fits, beyond cultural differences.
- **Conflicting icons** (heart vs star both mean "favorite/save/rate"): don't avoid them,
  **consciously pick one** and label its function clearly. Don't use one icon for two
  purposes or two icons for one purpose.
- **Cultural context** matters for unique/symbolic icons, so consider the audience.
- **Test** new icons with outsiders for *recognizability* (do they understand it?) and
  *memorability* (do they recall it a week later?). Re-design or add a label if not.

---

**Cheap tell:** Lucide `Sparkles`/`Rocket`/`Zap` in colored circle chips, 3-up, as
feature decoration; an animated icon looping forever in a dashboard; a 500ms+ click
animation that lags the cursor; a tiny decorative icon turned to mud at 16px.
**Instead:** One deliberately chosen icon family, system vs decorative registers kept separate,
ink-colored with color only for state/semantics, animated only where it informs and
within the timing limits, labeled where not universal, `aria` correct, ≥48px targets.
