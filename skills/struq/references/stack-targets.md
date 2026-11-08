# Vite and other React stacks

The blocks are written for Next.js App Router. Only four things tie them to it; everything else (GSAP, Lenis, the
kit, the CSS, the tokens) is plain React and Tailwind v4. Detect the stack first: `next` in package.json and an `app/`
folder is Next; `vite.config.*` with `src/main.tsx` is Vite.

`blocks.mjs` refuses a project without `next`: copy the files by hand instead, keeping the layout of `blocks/` under
`src/components/struq/` so the relative imports hold (each block's files are listed in `blocks/catalog.json`).

| Next.js | Vite |
|---|---|
| `next/image` (`<Image fill sizes priority>`) | `<img>` with `width`, `height`, `loading`, `decoding="async"`, and `object-cover` on a positioned box for `fill`. `getImageProps` (page-transition-stack) becomes the plain `src`. |
| `next/link` | `<a>`, or your router's `Link`. |
| `next/navigation` in the page transitions (`usePathname`, `useRouter`, `useSearchParams`) | Your router's location and navigate (React Router `useLocation`, `useNavigate`). The transitions only need the current path and a push. |
| `"use client"` | Delete it, or leave it: Vite ignores it. |

The shell, in Vite terms:

- `index.html`: in `<head>`, the gate script `<script>document.documentElement.classList.add('sq-js')</script>` before
  any stylesheet, and one `<link rel="stylesheet">` per URL that `canon.mjs print <palette> <pairing>` prints;
  `<body data-blocks>`.
- `src/index.css`: `@import "tailwindcss";`, the kit import, the `@theme inline` names and the STRUQ TOKENS block from
  `recipes/app/globals.css` (the block comes from `canon.mjs print`).
- `src/main.tsx`: wrap the app in `SmoothScroll` from the kit.

`check.mjs` reads `app/layout.tsx` for the gate; on Vite it reports that line as missing. Check `index.html` by eye
and note it under Verify in STRUQ.md.
