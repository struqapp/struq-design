# Stack Integration

## Responsibility map

The stack is strongest when each tool has a clear job.

| Tool | Primary responsibility | Avoid |
|---|---|---|
| Next.js / Vite | application shell, bundling, routing, asset delivery | embedding choreography logic in route files |
| React | lifecycle, composition, semantic state | high-frequency visual state updates every frame |
| React Three Fiber | Three.js scene graph and frame composition | forcing all scene changes through React re-renders |
| GSAP | authored sequences and property interpolation | becoming an unstructured global mutation layer |
| ScrollTrigger | mapping scroll ranges to timeline progress | treating each section as an isolated animation by default |
| Lenis | smoothing and normalizing physical scroll | controlling narrative state independently of ScrollTrigger |
| Motion for React | local presence, layout, gestures, UI state | controlling the same transform as GSAP |
| SVG GSAP plugins | vector drawing, morphing, path movement | using incompatible paths without shape preparation |

## Next.js guidance

Place browser-dependent experience systems behind a client boundary.

```tsx
'use client';
```

Register GSAP plugins in a client-side module. Build timelines after refs and WebGL targets are ready. Route transitions must account for App Router mounting behavior and must kill route-specific timelines and ScrollTriggers.

For a large canvas, consider dynamically loading the experience component with server-side rendering disabled when that improves reliability. Preserve semantic content and fallback output outside the canvas.

Do not put mutable Three.js objects into server components or serialize them through props.

## Vite guidance

Vite has fewer server/client boundaries. Keep the same lifecycle discipline:

- register plugins once,
- create timelines inside scoped hooks,
- remove ticker callbacks,
- kill ScrollTriggers,
- dispose route-specific scene resources,
- refresh measurements after fonts and assets are ready.

## GSAP in React

Use the official React integration or scoped GSAP context so animation and ScrollTrigger instances revert on cleanup.

Conceptual pattern:

```tsx
const root = useRef<HTMLDivElement>(null);

useGSAP(() => {
  const tl = gsap.timeline();
  // Build scoped timelines and ScrollTriggers.

  return () => {
    // Additional cleanup not handled by context.
  };
}, { scope: root, dependencies: [isReady] });
```

Do not rebuild expensive timelines on every React render. Keep direction objects stable and recreate only when relevant responsive or asset-readiness conditions change.

## Lenis and ScrollTrigger

Use one Lenis instance for the root scroll unless the design intentionally uses a custom scroll container.

Key integration responsibilities:

- Lenis emits scroll updates to ScrollTrigger.
- Lenis is advanced from a controlled animation ticker.
- ScrollTrigger refreshes after layout-affecting assets are ready.
- Lenis is stopped during states that require scroll lock.
- native nested scrolling is handled deliberately.

Lenis must be created with `autoRaf: false`. If it keeps its own animation loop it becomes a second clock next to `gsap.ticker`, and scroll, ScrollTrigger and the canvas drift apart by a frame. The canonical setup is the kit's `SmoothScroll` (`blocks/kit/SmoothScroll.tsx`); this is the conceptual shape.

Conceptual setup:

```tsx
// ScrollTrigger sync: useLenis subscribes once the root instance exists.
// Never capture lenisRef.current?.lenis once in an effect; on first mount it
// is often still undefined, and the listener is silently never bound.
useLenis(() => ScrollTrigger.update());

useEffect(() => {
  // Registered unconditionally, instance resolved per frame.
  const update = (time: number) => {
    lenisRef.current?.lenis?.raf(time * 1000);
  };

  gsap.ticker.add(update);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(update);
  };
}, []);
```

Do not add CSS `scroll-behavior: smooth` on top of Lenis.

## R3F frame-loop options

The single-clock rule applies: the canvas is rendered from `gsap.ticker`, the same callback chain that advances Lenis. The exact bridge is shown in [`../examples/code/shared/GsapFrameLoop.tsx`](../examples/code/shared/GsapFrameLoop.tsx).

### Ticker-driven loop (default)

Mount the canvas with `frameloop="never"` and call `advance()` from a `gsap.ticker` callback. `useFrame` still runs, once per ticker tick, so ambient and reactive layers keep working, and GSAP tweens of Three.js objects land in the frame they were written.

Use when ambient animation is always active, which is the normal case for a directed experience.

Advantages:

- one clock for scroll, timelines and rendering,
- no drift between ScrollTrigger measurements and the rendered frame,
- `useFrame` reads narrative values from the same tick that produced them, with no separate render loop to run ahead or behind.

### Demand loop with invalidation

Use only when the scene changes solely with scroll or pointer and has no ambient animation, so it can sit idle (power efficiency matters).

Mount the canvas with `frameloop="demand"` and call `invalidate()` from the things that change it (a ScrollTrigger `onUpdate`, a pointer handler, a uniform setter). R3F then renders on demand without a continuous loop of its own. A directed experience with ambient shaders, particles or model idles is not this case, so use the ticker-driven loop instead.

### Fully coordinated manual loop

Use only when exact render ordering or multi-scene compositing requires it. This is more complex and should be justified by the transition design. It still advances from the one ticker.

Do not leave the canvas on R3F's default `frameloop="always"` next to a Lenis ticker. R3F then runs its own `requestAnimationFrame` loop, which is a second clock.

## Motion for React boundaries

Use Motion for:

- menus,
- route-level interface shells,
- local hover and press states,
- layout transitions,
- presence and exit behavior,
- interface controls,
- non-central content transitions.

Use GSAP for:

- the central chapter sequence,
- camera and WebGL choreography,
- multi-element timeline relationships,
- scroll-scrubbed sequences,
- SVG path drawing and morphing,
- branded typography direction.

The split that keeps the two libraries from colliding: GSAP owns scroll-linked and chapter-timeline motion, Motion owns React-lifecycle motion (mount, unmount, presence, layout, UI state). Motion never reads scroll progress for the central narrative.

If a Motion component must participate in a GSAP sequence, let GSAP own a wrapper and Motion own an inner element or vice versa. Never animate the same CSS transform layer from both systems.

## SplitText lifecycle

Typography layout can change after fonts load or the viewport changes. The text system must account for re-splitting.

Define:

- split mode,
- overflow masks,
- accessibility output,
- font-readiness condition,
- resize behavior,
- timeline rebuild or rebind behavior,
- cleanup and revert.

Do not cache line elements across a re-split without updating the timeline targets.

## ScrollTrigger architecture

Use ScrollTrigger to define input ranges, not the full conceptual architecture.

Preferred patterns:

### One long persistent-stage trigger

A master timeline maps the complete scroll narrative.

Best when the route is a highly integrated continuous experience.

### Chapter triggers within one persistent stage

Each chapter has a trigger and local timeline while the visual stage remains fixed.

Best when chapters need separate activation and easier tuning.

### Mixed pinned and flowing content

Some chapters control the persistent stage while semantic content can flow normally between immersive sequences.

Best when readability and editorial depth matter.

Avoid nested pinning unless it is carefully tested. Pin spacing and measurement changes can easily create fragile layouts.

## Refresh and resize sequence

After a meaningful responsive or asset change:

1. update viewport classification,
2. apply responsive direction data,
3. update camera projection and renderer size,
4. re-split typography if required,
5. rebuild affected timelines,
6. refresh ScrollTrigger measurements,
7. restore or remap progress,
8. validate the active state.

Debounce expensive rebuilds, but do not leave stale measurements.

## Route transitions

A professional route transition defines:

- click intent,
- interaction lock,
- leave timeline,
- destination asset prefetch,
- scroll state handling,
- history behavior,
- transition cover,
- destination ready condition,
- enter timeline,
- cleanup and unlock.

Do not begin navigation before the transition system has captured or covered the current visual state if continuity depends on it.
