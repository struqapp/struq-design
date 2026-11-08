# Icons

Struq Icons is the default: `npm i @struq/icons` (MIT), the Iconify set `struq` for non-React stacks, browsable at
[struq.nl/iconen](https://struq.nl/iconen). A two-tone set on one 24 grid, the base tone for the shape and the accent
on the part that carries the meaning, each icon with its own hover motion.

## Whether an icon earns its place

Functional only: navigation, close, chevrons, an arrow on a text link, form states. Never a row of feature-card icons,
never an icon in a coloured chip, never sparkles, rocket, lightning, bulb, wand or emoji. Most studio sections need
none: the blocks carry their links as type.

## Wiring (React)

```tsx
// app/layout.tsx, once, before globals.css
import "@struq/icons/tokens.css";
import "@struq/icons/icons.css";
import "@struq/icons/states.css"; // one tone at rest, the accent on hover, focus and current
```

```css
/* globals.css: the set's accent follows the palette, not its default. On body, so it wins by inheritance. */
body {
  --icon-base: currentColor;
  --icon-accent: var(--accent);
  --icon-accent-live: var(--accent);
}
```

```tsx
import { ArrowRight, Search } from "@struq/icons";

<a href="/werk">Bekijk het werk <ArrowRight size={20} strokeWidth={1.5} /></a>
<button type="button"><Search size={24} strokeWidth={1.5} label="Zoeken" /></button>
```

- `strokeWidth={1.5}` beside light display type (1.25 for a luxury register); one size per context (20 inline, 24 in
  the bar). `label` names an icon that is a control's only content; without it the icon is decoration.
- Names are by meaning: the up-right arrow is `External`. Check a name in `dist/index.d.ts` before using it.
  `Link`, `Image`, `File` and `Text` clash with Next: import `LinkIcon`, `ImageIcon`, `FileIcon`, `TextIcon`.
- The hover motion is the set's own (hover and focus only, never on load, off under reduced motion).

## Without React

`iconify.json` with the prefix `struq` (`struq:search`, `struq:<name>-draw` for a draw-in), `sprite.svg` with
`<use href="/sprite.svg#search" />`, or the plain SVG files. Same rules.

## The one fallback

When the set lacks an icon and drawing it to the set's rules (24 grid, round caps and joins, the site's stroke, base
and accent as two parts) is not worth it, move the whole site to **Phosphor at `weight="light"`**
(`@phosphor-icons/react`, or Iconify `ph:`). One family per site, never mixed, never Lucide by reflex.
