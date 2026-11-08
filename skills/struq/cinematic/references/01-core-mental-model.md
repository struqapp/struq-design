# Core Mental Model

## The experience is a directed state machine

A normal website is organized primarily by document structure. A cinematic WebGL experience is organized by **experience state**.

The page still has semantic HTML, routes, accessibility, and responsive layout, but the visible composition at any moment is resolved from several coordinated inputs:

```text
final visual state =
  narrative state
  + ambient state
  + reactive state
  + discrete transition state
  + responsive constraints
  + performance constraints
```

The core problem is not “how do I animate this element?” It is:

> Who owns this property, during which interval, while moving from which state to which state, and how does that state become the valid starting point for what follows?

That question is the foundation of professional choreography.

## Persistent stage versus section stack

A section stack works like this:

```text
hero mounts → hero animates → hero disappears
feature mounts → feature animates → feature disappears
project mounts → project animates → project disappears
```

A persistent stage works like this:

```text
world state A
→ world state A/B overlap
→ world state B
→ world state B/C overlap
→ world state C
```

The canvas, camera hierarchy, lighting rig, central subject, grain, cursor, and some typography may remain alive throughout. Chapters transform their roles and values rather than replacing the entire world.

Use multiple scenes only when there is a strong reason, such as materially different render settings, asset isolation, route-level ownership, or render-target compositing. Even then, the visible transition should preserve continuity through a bridge.

## Chapters are controlled state intervals

A chapter is not defined by a `<section>` tag. It is defined by:

- a narrative purpose,
- an input interval,
- a local progress value,
- a set of state responsibilities,
- one or more key poses,
- a handoff to the next state.

A chapter may span one DOM section, several sections, or no visible section at all. A single pinned stage can be controlled by invisible scroll spacers or semantic content regions while the visual composition remains continuous.

## Four motion layers

### Narrative motion

Narrative motion is authored and repeatable. It includes:

- camera blocking,
- major subject transforms,
- chapter transitions,
- typography entrances and exits,
- light and environment changes,
- SVG and mask choreography,
- route entrance and leave sequences.

GSAP timelines are usually the authoritative sequencer.

### Ambient motion

Ambient motion communicates that the world is alive even when scroll stops:

- shader time,
- floating particles,
- breathing scale,
- subtle light fluctuation,
- cloth or fluid simulation,
- model idle animation,
- environmental noise.

Ambient motion should usually continue independently of chapter progress.

### Reactive motion

Reactive motion reflects immediate input:

- pointer parallax,
- hover attraction,
- drag response,
- scroll-velocity distortion,
- device orientation,
- cursor proximity,
- gaze or focus changes.

Reactive motion is normally additive and limited. It must not destroy the authored composition.

### Discrete state-transition motion

Discrete motion moves between named states rather than following continuous scroll:

- opening a project,
- changing routes,
- opening navigation,
- switching a product configuration,
- entering an immersive mode,
- playing an intro after loading.

These transitions should have explicit entry, active, and exit states.

## One clock, several signals

There is exactly one frame clock. Lenis is advanced from `gsap.ticker`, ScrollTrigger reads from Lenis, and the R3F canvas is advanced from the same ticker (the kit's `SmoothScroll` and [`../examples/code/shared/GsapFrameLoop.tsx`](../examples/code/shared/GsapFrameLoop.tsx)). Nothing in the experience runs its own `requestAnimationFrame` loop. Scroll progress and elapsed time are different signals read on that one clock, not different clocks.

At minimum, distinguish:

```ts
type ExperienceSignals = {
  globalProgress: number;      // 0..1 across the complete narrative
  chapterProgress: number;     // 0..1 inside the active chapter
  elapsedTime: number;         // continuous real time
  deltaTime: number;           // frame duration
  scrollVelocity: number;      // signed and clamped before visual mapping
  scrollDirection: -1 | 0 | 1;
  pointerX: number;             // normalized -1..1
  pointerY: number;             // normalized -1..1
  pointerSpeed: number;
};
```

Do not drive shader life, model idle motion, and all micro-movement from scroll progress. A world that becomes completely static when scrolling stops feels like a timeline inspector, not an environment.

## One writer per property

When GSAP, `useFrame`, pointer handlers, and Motion all write to `rotation.y`, the result depends on execution order and timing. That is not choreography; it is a race condition.

Resolve it through ownership:

```text
subjectPlacementRig.rotation.y  ← narrative timeline
subjectReactionRig.rotation.y   ← pointer modulation
subjectIdleRig.rotation.y       ← procedural idle
model.rotation.y                ← model's own baked animation only
```

The final world rotation is the composition of the hierarchy.

For scalar values that must combine, use explicit channels:

```ts
finalDistortion =
  narrativeDistortion +
  velocityDistortion +
  hoverDistortion;
```

Clamp and shape the result before sending it to a shader.

## Experience orchestration

The orchestrator is not necessarily one class. It is the system responsible for:

- knowing the active route and chapter,
- mapping input to progress,
- activating or disabling interaction envelopes,
- coordinating child timelines,
- exposing state to DOM and WebGL,
- handling resize and refresh,
- disposing route-specific systems,
- providing debugging and tuning information.

A useful conceptual pipeline is:

```text
raw input
→ normalized input
→ experience state
→ narrative timelines
→ ambient/reactive systems
→ final transform and material resolution
→ render
```

## Professional polish comes from relationships

A single spectacular shader does not make an experience coherent. Professional polish is created by relationships:

- the camera stops just before the copy reaches full contrast,
- the object begins preparing the next transition before the current chapter ends,
- pointer influence reduces as the narrative move becomes critical,
- a light source reveals the shape that becomes the next chapter's mask,
- an outgoing word shares scale or trajectory with the incoming subject,
- sound accents occur at perceptual beats rather than arbitrary timeline times,
- reverse scroll reconstructs the previous state without a jump.

Think in terms of cause, anticipation, overlap, and consequence.

## The minimum viable cinematic system

Before adding advanced effects, establish:

1. one persistent stage,
2. one central state model,
3. one complete chapter,
4. one complete handoff,
5. named camera shots,
6. property ownership,
7. semantic timeline labels,
8. responsive and reduced-motion behavior,
9. a tuning surface,
10. cleanup on unmount and route change.

A simple system with these qualities will feel more professional than a dense collection of disconnected effects.
