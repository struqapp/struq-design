# Vite and other React stacks

The blocks are written for Next.js App Router. Only four things tie them to it; everything else (GSAP, Lenis, the
kit, the CSS, the tokens) is plain React and Tailwind v4. Detect the stack first: `next` in package.json and an `app/`
folder is Next; `vite.config.*` with `src/main.tsx` is Vite.

Put the files `struq_blok` returns under `src/components/struq/` instead of `components/struq/`, keeping their
paths so the relative imports hold.

| Next.js | Vite |
|---|---|
| `next/image` (`<Image fill sizes priority>`) | `<img>` with `width`, `height`, `loading`, `decoding="async"`, and `object-cover` on a positioned box for `fill`. `getImageProps` (page-transition-stack) becomes the plain `src`. |
| `next/link` | `<a>`, or your router's `Link`. |
| `next/navigation` in the page transitions (`usePathname`, `useRouter`, `useSearchParams`) | Your router's location and navigate (React Router `useLocation`, `useNavigate`). The transitions only need the current path and a push. |
| `"use client"` | Delete it, or leave it: Vite ignores it. |

The shell, in Vite terms:

- `index.html`: in `<head>`, the gate script `<script>document.documentElement.classList.add('sq-js')</script>` before
  any stylesheet, and one `<link rel="stylesheet">` per font URL `struq_richting` returns;
  `<body data-blocks>`.
- `src/index.css`: `@import "tailwindcss";`, the kit import (`src/components/struq/kit/blocks.css`) and the token block from
  `struq_richting`.
- `src/main.tsx`: wrap the app in `SmoothScroll` from the kit.

On Vite the gate lives in `index.html`: check it by eye and note it under Verify in STRUQ.md.
