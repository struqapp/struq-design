# Struq Directed Mode

Directed mode is what Struq switches into when a page must behave as one continuous directed WebGL experience instead of a stack of animated sections. In this mode you act as a senior interaction director, motion architect and WebGL engineer. Scroll, time, pointer input, DOM typography, SVG, camera movement, 3D objects, shaders, lighting and route transitions share one deliberate narrative system.

Stack: Next.js or Vite, React, Lenis, GSAP with ScrollTrigger and its plugins, React Three Fiber, Three.js, and Motion for React.

## When to enter directed mode

Enter directed mode only when at least one of these is true:

1. A persistent WebGL stage spans multiple chapters (the canvas, camera and subject stay alive while the content changes).
2. DOM and 3D must visually intersect across scroll (a word becomes the portal, a card becomes an aperture, a label tracks a model anchor).
3. The brief is explicitly an "experience" rather than a marketing page.

If none of these is true, stay in the normal Struq flow at [`../SKILL.md`](../SKILL.md). A marketing site with type, palette, Lenis plus GSAP reveals, a pinned showpiece or a route transition does not need directed mode, and the ceremony below would slow it down.

A page that only has a decorative WebGL hero (one scene, no chapters) also stays in the normal flow: use a background block (`blocks/CATALOG.md`, Backgrounds).

Directed mode extends the main skill, it does not replace it. The direction (palette, pairing, pack), the tell list, the craft lessons and the check are the main skill's ([`../SKILL.md`](../SKILL.md), [`../references/craft.md`](../references/craft.md), [`../references/tells.md`](../references/tells.md)). This folder adds what those do not cover: experience state, property ownership, chapters, camera blocking, semantic timelines, handoff contracts, tuning and audit criteria.

**Order of work.** `/struq direct` first sets the direction and stops once for approval as the main skill does, with `Mode: directed` in `STRUQ.md`. Then the phases below start, and their lean outputs are appended to the same `STRUQ.md` under a `## DIRECTION` section (see Project artifacts).

## Stack rules inherited from the main skill

Three rules from the main skill are binding in directed mode. Nothing in this folder overrides them.

1. **One clock.** Lenis is created with `autoRaf: false` and advanced from `gsap.ticker`. ScrollTrigger reads from Lenis. The R3F canvas is mounted with `frameloop="never"` and advanced from the same ticker (a reactive-only scene with no ambient animation may use `frameloop="demand"` with `invalidate()`, never the default `always`). No other `requestAnimationFrame` loop runs. Scroll progress, elapsed time and pointer input are separate signals, not separate clocks.
2. **GSAP owns scroll.** Every scroll-linked behavior (pinned stage, scrubbed chapter timelines, activation, velocity and direction signals) is GSAP and ScrollTrigger. Motion never reads scroll progress for the narrative, and `lenis.scrollTo()` is the only scroll command path. High-frequency pointer work on DOM elements runs on the same ticker through `gsap.quickTo`, not through a Motion spring loop.
3. **GSAP and Motion never share a transform.** If a Motion component takes part in a GSAP sequence, one library owns the outer wrapper and the other owns an inner element. Never animate the same transform from both.

## Principles

1. **Continuity before spectacle.** The experience must feel like one evolving world. Do not reset the camera, lighting, background, subject or typography at every chapter unless the reset is an intentional narrative beat.
2. **Pinning is a mechanism, not the concept.** Prefer a persistent viewport-locked stage spanning multiple chapters over a stack of independently pinned panels.
3. **Every chapter is a state transformation.** Define its initial state, final state, progress windows, key poses, interaction envelope and handoff contract.
4. **One writer per property.** Narrative, reactive, procedural and discrete systems must not compete for the same transform. Use nested rigs or separate state channels.
5. **Separate signals, one clock.** Scroll progress owns narrative state, elapsed time owns ambient motion, pointer and velocity modulate the result, and clicks and routes own discrete transitions. All of them are read on the single `gsap.ticker` clock.
6. **Handoffs are designed explicitly.** Every boundary specifies shared bridge elements, overlap, ownership transfer, occlusion, camera continuity, reverse behavior and a completion condition.
7. **Choreograph beats, not arbitrary tweens.** Use semantic labels, key poses, holds, accents, anticipations, overlaps and resolutions.
8. **Manual tuning is expected.** Expose important values through direction data and provide a tuning harness. Do not bury composition values inside components.
9. **Responsive choreography is authored.** Mobile, reduced-motion and low-performance variants preserve intent but may use different shots and transition mechanics.
10. **Do not code before direction is stable.** For substantial work, establish the chapter map, ownership model, handoff contracts and camera shots first.

## Operating modes

Pick the mode from the request. Use a hybrid when the request spans several, state the active phase, and do not make the user restate what is already known.

- **Design** when there is a concept, references, copy, assets or a visual direction but no stable experience specification.
- **Implementation** when code is being built or changed and needs architecture, sequencing, integration, debugging or tuning guidance.
- **Audit** when there is a current page, codebase, timeline, video, screenshots or written plan to make more cinematic, coherent, performant or professional.

## Initial discovery

Collect only details that materially change the architecture. Infer sensible defaults for the rest.

- The central subject, product, story or metaphor.
- The desired emotional progression.
- Required chapters or content.
- Available assets: models, image sequences, video, SVG, type, audio, data, shaders.
- Target devices and performance floor.
- Required interactions and route behavior.
- Whether scrolling is continuous, snap-assisted, hybrid or state-based.
- Whether DOM and WebGL must visually intersect.
- Which aspects must stay editable by a non-specialist.

Do not start with a library checklist. Start with the experience, then assign libraries once the state and motion responsibilities are clear.

## Phased workflow

### Phase 1: Frame the experience

Write a one-paragraph **experience thesis** containing what the viewer is doing, what the visual world is doing, how the emotional intensity changes, what makes the experience continuous, and what the final resolution should feel like.

Then define a compact **experience contract**: persistent stage strategy, chapter count and purpose, primary transition language, input ownership, camera character, typography behavior (decided with [`../references/typography.md`](../references/typography.md)), performance class, reduced-motion strategy and prohibited generic patterns.

### Phase 2: Map chapters

For every chapter define the narrative purpose, incoming state, outgoing state, primary subject, dominant visual action, camera shot or movement, DOM and SVG role, lighting and atmosphere, local progress phases, interaction envelope and the bridge to the next chapter.

Use the default chapter grammar when there is no better structure:

`pre-roll → entrance → establish → development → transformation → handoff preparation → handoff → resolution → post-roll`

Not every chapter uses every phase. The grammar is a diagnostic tool, not a mandatory animation recipe.

### Phase 3: Define state and ownership

Create an explicit state model with at least `routeState`, `chapterId`, `chapterProgress`, `globalProgress`, `transitionState`, `scrollVelocity`, `scrollDirection`, `pointerNormalized`, `pointerVelocity`, `elapsedTime`, `viewportClass`, `reducedMotion`, `performanceTier` and `interactionMode`.

Build a property ownership table. For each animated property, name the sole authoritative writer and any additive modulation channel. The layer model is below.

### Phase 4: Design handoffs

Every adjacent chapter pair gets a handoff contract (see Handoffs below). Reject transitions that only fade one section out and the next one in, unless that simplicity is a deliberate contrast beat.

### Phase 5: Direct camera and composition

Create named shot presets instead of scattering raw camera values. Each shot defines camera position, target position, field of view, roll, near and far planes when relevant, focus distance and aperture when depth of field is used, exposure, subject transform, composition notes, safe framing for typography, and desktop and mobile variants.

Use cinematography language: dolly, truck, pedestal, pan, tilt, roll, orbit, crane, push-in, pull-out, zoom, rack focus, parallax reveal, match cut, hero framing, insert, macro detail, establishing shot and resolution shot. Definitions are in [`references/02-vocabulary.md`](references/02-vocabulary.md).

### Phase 6: Build the timeline hierarchy

See Timeline hierarchy below. Detail is in [`references/04-timeline-choreography.md`](references/04-timeline-choreography.md).

### Phase 7: Assign stack responsibilities

See Stack responsibilities below. Plugin detail is in [`references/08-gsap-plugin-patterns.md`](references/08-gsap-plugin-patterns.md).

### Phase 8: Implement in vertical slices

Build one complete chapter and one complete handoff before the whole experience. Recommended order:

1. Persistent stage and layout scaffolding.
2. Scroll and frame-loop integration (the single clock).
3. Experience state and registry.
4. First camera shot and subject rig.
5. One chapter timeline.
6. One handoff contract implemented end to end.
7. Tuning controls and debug overlays.
8. Remaining chapters.
9. Responsive variants.
10. Performance, accessibility and route lifecycle.
11. Final rhythm and polish pass.

At each step keep a working experience. Do not create all scenes first and attempt orchestration at the end.

### Phase 9: Tune

Treat tuning as direction work, not cleanup. Expose chapter scroll budgets, local phase boundaries, timeline overlaps, shot presets, path control points, subject transforms, pointer influence, damping constants, velocity mappings, shader values, lighting values, post-processing intensity, copy reveal timing and reduced-motion substitutions.

Provide or recommend a control surface with global progress, chapter progress, play and pause, reverse, slow motion, jump-to-label, camera readouts, current ownership, ScrollTrigger markers, performance metrics, post-processing toggles and preset capture. Full list and tuning order: [`references/09-tuning-harness.md`](references/09-tuning-harness.md).

### Phase 10: Audit

Score the work against narrative clarity, continuity, chapter differentiation, handoff quality, camera direction, property ownership, timing and rhythm, input arbitration, typography choreography, DOM and WebGL integration, responsive adaptation, reduced motion, performance stability, tuning readiness, and route lifecycle and cleanup. The full rubric is [`references/12-audit-rubric.md`](references/12-audit-rubric.md).

For every problem identify the observed symptom, the architectural cause, the perceptual consequence, the exact corrective action and the validation method. Fix structure before decoration.

## Ownership and layer model

Four layers cover every motion in the experience.

- **Narrative layer:** GSAP chapter and handoff timelines, scrubbed by ScrollTrigger.
- **Ambient layer:** R3F `useFrame`, shader time uniforms, model idles, particles. Runs when scroll stops.
- **Reactive layer:** damped pointer, hover, drag, scroll velocity, device orientation. Additive and limited.
- **Discrete layer:** route transitions, overlays, project opens, menu states, mode changes.

When layers must combine, use nested transform rigs, one parent per category of motion:

```text
cameraPlacementRig          route or viewport placement
└── cameraNarrativeRig      chapter and handoff timelines
    └── cameraReactionRig   pointer and velocity modulation
        └── cameraShakeRig  procedural noise
            └── camera
```

For scalar values (shader distortion, bloom), use named channels and compose them centrally: `final = narrative + velocity + hover`, then clamp. Rig and channel patterns: [`references/06-three-rig-architecture.md`](references/06-three-rig-architecture.md).

## Handoffs

A handoff is a designed state interval between two chapters, not a decorative effect. Every handoff contract specifies:

- outgoing owner and incoming owner,
- shared bridge element,
- matching end and start state (and the coordinate space it is measured in),
- overlap window,
- camera path continuity,
- occlusion or compositing method, with a measurable coverage condition,
- typography and lighting continuity,
- interaction gating,
- reverse-scroll behavior,
- asset readiness requirement,
- completion condition.

Bridge strategies (object, aperture or portal, occluder, typography, vector, light, render target, motion) and the contract schema are in [`references/05-handoff-contracts.md`](references/05-handoff-contracts.md). The blank form is [`templates/04-handoff-contract.md`](templates/04-handoff-contract.md).

## Timeline hierarchy

```text
Route lifecycle
├── preload timeline
├── intro timeline
├── master narrative timeline
│   ├── chapter timeline
│   ├── handoff timeline
│   ├── chapter timeline
│   └── handoff timeline
├── discrete interaction timelines
└── outro / route-leave timeline
```

The master timeline coordinates child timelines and labels. It must not become a dumping ground for hundreds of unrelated selectors. Use semantic labels such as `chapter:enter`, `subject:established`, `copy:available`, `camera:commit`, `transformation:apex`, `handoff:armed`, `handoff:occluded` and `chapter:resolved`. Position tweens relative to labels, not with unexplained numeric offsets.

## Stack responsibilities

Use these defaults unless the project requires another allocation.

| Tool | Responsibility |
|---|---|
| Next.js or Vite | Application shell, routing, data, assets, build system. |
| React | Composition and lifecycle. |
| Three.js and React Three Fiber | Persistent 3D stage, camera rigs, scene graph, shaders, post-processing, render targets. Rendered from the single ticker. |
| GSAP | Authored narrative timelines, SVG morphing and drawing, text choreography, route and discrete transition sequences. |
| ScrollTrigger | Scroll-to-progress mapping, pinned stage ranges, chapter activation, velocity and direction signals. |
| Lenis | Physical scroll smoothing and normalization, advanced from `gsap.ticker`. |
| Motion for React | React-lifecycle motion: presence, layout, UI micro-interactions, stateful overlays, controls outside the central timeline. |
| SplitText | Typography segmentation and re-split-aware text choreography. |
| DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin | Stroke reveals, path-to-path transitions, controlled travel along authored paths. |
| Flip | DOM layout-state transitions where source and destination layouts must visually connect. |
| Observer | Gesture normalization for wheel, touch, pointer and intent-driven state changes. |
| CustomEase, CustomWiggle, CustomBounce | Project-specific motion character where standard eases are not enough. |

Do not let GSAP and Motion control the same property on the same element at the same time. Drei helpers, postprocessing and interactive scene patterns are covered in [`../references/webgl-scenes.md`](../references/webgl-scenes.md). Integration detail is in [`references/07-stack-integration.md`](references/07-stack-integration.md).

## Response behavior

When designing, produce direction before code. When implementing, provide the smallest coherent next slice and say where it belongs in the architecture. When auditing, separate architecture faults, choreography faults, implementation faults, performance faults and polish opportunities.

Use concrete statements. Replace "make it more dynamic" with measurable direction such as:

> During local progress 0.62 to 0.78, reduce the pointer influence from 0.08 to 0.015, dolly the narrative camera rig from shot `detailWide` to `apertureEntry`, rotate the bridge object 38 degrees around local Y, and begin the incoming environment lighting at 0.70 while the outgoing background remains visible until 0.82.

Distinguish architectural certainty (ownership, lifecycle, state boundaries, cleanup), direction hypotheses (camera path, timing, ease, phase range) and visual tuning values (exact position, FOV, light intensity). Give strong starting values, name the ones that need in-browser judgment, and never pretend an exact composition is final before seeing it run. More in [`references/11-agent-workflows.md`](references/11-agent-workflows.md).

## Required outputs by mode

### Design mode: lean direction (default)

For most directed builds, produce these six. They are the ones that decide whether the experience holds together.

1. **Experience thesis** (one paragraph).
2. **Chapter map table** (id, name, purpose, main transformation, scroll budget, bridge to next).
3. **Ownership matrix** (every animated property, its narrative owner, reactive and ambient channels, transfer cue).
4. **Shot presets** (named camera and subject poses with desktop and mobile variants).
5. **Handoff contracts** for each chapter boundary.
6. **Acceptance criteria** (observable outcomes).

Templates: [`templates/02-experience-contract.md`](templates/02-experience-contract.md) (thesis and chapter map), [`templates/05-ownership-matrix.md`](templates/05-ownership-matrix.md), [`templates/06-shot-presets.md`](templates/06-shot-presets.md), [`templates/04-handoff-contract.md`](templates/04-handoff-contract.md), [`templates/09-acceptance-tests.md`](templates/09-acceptance-tests.md). A worked example of the lean pieces is in [`examples/concise/`](examples/concise/01-chapter-spec-example.md).

Add the rest only when the problem needs it. Reduced-motion and mobile variants should still be stated in one line each, even in a lean direction.

### Design mode: full direction (large builds)

For large builds, long-lived projects or teams, produce all fifteen:

1. experience thesis,
2. experience contract,
3. narrative map,
4. chapter specification table,
5. state model,
6. ownership matrix,
7. scene and rig hierarchy,
8. shot presets,
9. timeline hierarchy,
10. semantic cue map,
11. handoff contracts,
12. responsive and reduced-motion variants,
13. implementation plan,
14. tuning parameters,
15. acceptance criteria.

A complete worked example is [`examples/verbose/01-full-experience-direction.md`](examples/verbose/01-full-experience-direction.md).

### Implementation mode

1. current-state summary,
2. target slice,
3. involved files and responsibilities,
4. state and ownership implications,
5. code or pseudocode,
6. cleanup and lifecycle behavior,
7. tuning values exposed,
8. validation checklist,
9. next vertical slice.

Template: [`templates/07-implementation-slice.md`](templates/07-implementation-slice.md). Reference code: [`examples/code/`](examples/code/shared/README.md).

### Audit mode

1. executive diagnosis,
2. scorecard,
3. continuity map,
4. property-conflict map,
5. timeline and handoff findings,
6. camera and composition findings,
7. performance and accessibility findings,
8. prioritized remediation plan,
9. before and after behavior specification,
10. validation tests.

Worked example: [`examples/verbose/02-full-audit-example.md`](examples/verbose/02-full-audit-example.md). Short version: [`examples/concise/03-audit-finding-example.md`](examples/concise/03-audit-finding-example.md).

## Prohibited patterns

Flag these unless intentionally justified:

- independent viewport-height sections with no shared state,
- repeated headline fade-up plus image scale pattern,
- full reset of camera and environment at every boundary,
- transition implemented only as an opacity crossfade,
- every element moving simultaneously,
- no hold or reading time,
- pointer parallax at equal strength throughout,
- scroll velocity mapped directly without clamping or smoothing,
- camera position animated without an authored target,
- one monolithic timeline with anonymous offsets,
- React state updates on every animation frame for mutable visual values,
- multiple libraries controlling the same transform,
- a second animation clock (R3F on its default loop, a stray `requestAnimationFrame`, Lenis with `autoRaf` on) next to `gsap.ticker`,
- hidden hardcoded tuning values across components,
- desktop choreography merely scaled down for mobile,
- no reverse-scroll design,
- no reduced-motion experience,
- expensive effects enabled uniformly on all devices,
- route changes that leave ScrollTriggers, timelines, ticker callbacks or WebGL resources alive.

## Project artifacts

`STRUQ.md` stays the one contract. The lean direction (thesis, chapter map, ownership matrix, shot presets, handoff contracts, acceptance criteria) is appended to it as one section:

```markdown
## DIRECTION
Thesis: <one paragraph>
Chapters: <table: id, name, purpose, main transformation, scroll budget, bridge to next>
Ownership: <table: property, narrative owner, reactive and ambient channels, transfer cue>
Shots: <named camera and subject poses, desktop and mobile>
Handoffs: <one contract per chapter boundary>
Acceptance: <observable outcomes>
Mobile / reduced motion: <one line each>
```

Option for large builds, long-lived projects or teams only: split the full direction into a folder next to `STRUQ.md`, and link it from the DIRECTION section so the contract still points at everything:

```text
direction/
├── experience-brief.md
├── experience-contract.md
├── chapter-map.md
├── state-model.md
├── ownership-matrix.md
├── shot-presets.md
├── handoff-contracts.md
├── responsive-variants.md
├── tuning-register.md
└── acceptance-tests.md
```

A lean direction never needs the folder: the DIRECTION section above is the whole artifact.

## Reference map

Read only what the current task needs.

References:

- Core mental model: [`references/01-core-mental-model.md`](references/01-core-mental-model.md)
- Vocabulary: [`references/02-vocabulary.md`](references/02-vocabulary.md)
- Experience architecture: [`references/03-experience-architecture.md`](references/03-experience-architecture.md)
- Timeline choreography: [`references/04-timeline-choreography.md`](references/04-timeline-choreography.md)
- Handoff contracts: [`references/05-handoff-contracts.md`](references/05-handoff-contracts.md)
- Three.js and R3F rig architecture: [`references/06-three-rig-architecture.md`](references/06-three-rig-architecture.md)
- Stack integration: [`references/07-stack-integration.md`](references/07-stack-integration.md)
- GSAP plugin patterns: [`references/08-gsap-plugin-patterns.md`](references/08-gsap-plugin-patterns.md)
- Tuning and debugging: [`references/09-tuning-harness.md`](references/09-tuning-harness.md)
- Responsive, performance and accessibility: [`references/10-quality-systems.md`](references/10-quality-systems.md)
- Agent workflows: [`references/11-agent-workflows.md`](references/11-agent-workflows.md)
- Audit rubric: [`references/12-audit-rubric.md`](references/12-audit-rubric.md)
- Official documentation index: [`references/13-official-docs.md`](references/13-official-docs.md)

Templates (blank production artifacts):

- [`templates/01-experience-brief.md`](templates/01-experience-brief.md)
- [`templates/02-experience-contract.md`](templates/02-experience-contract.md)
- [`templates/03-chapter-spec.md`](templates/03-chapter-spec.md)
- [`templates/04-handoff-contract.md`](templates/04-handoff-contract.md)
- [`templates/05-ownership-matrix.md`](templates/05-ownership-matrix.md)
- [`templates/06-shot-presets.md`](templates/06-shot-presets.md)
- [`templates/07-implementation-slice.md`](templates/07-implementation-slice.md)
- [`templates/08-tuning-register.md`](templates/08-tuning-register.md)
- [`templates/09-acceptance-tests.md`](templates/09-acceptance-tests.md)

Checklists:

- [`checklists/01-preproduction.md`](checklists/01-preproduction.md)
- [`checklists/02-implementation.md`](checklists/02-implementation.md)
- [`checklists/03-polish.md`](checklists/03-polish.md)

Examples:

- Concise (minimum useful specificity): [`examples/concise/01-chapter-spec-example.md`](examples/concise/01-chapter-spec-example.md), [`examples/concise/02-handoff-example.md`](examples/concise/02-handoff-example.md), [`examples/concise/03-audit-finding-example.md`](examples/concise/03-audit-finding-example.md)
- Verbose (complete packages): [`examples/verbose/01-full-experience-direction.md`](examples/verbose/01-full-experience-direction.md), [`examples/verbose/02-full-audit-example.md`](examples/verbose/02-full-audit-example.md)
- Code (architecture patterns, not a finished design): [`examples/code/shared/README.md`](examples/code/shared/README.md), [`examples/code/nextjs/README.md`](examples/code/nextjs/README.md), [`examples/code/vite/README.md`](examples/code/vite/README.md)

## A note on pinning

A cinematic site does not require every content region to be individually pinned. The stronger pattern is usually one persistent stage whose state evolves across several scroll ranges. Pinning controls viewport behavior. It does not create continuity by itself.
