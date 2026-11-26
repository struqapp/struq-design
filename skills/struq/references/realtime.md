# Real-time 3D, shaders and choreography

Read this when the idea wants a moment in WebGL: an object the visitor turns, light that changes with the scroll, a
material the trade is known for. The blocks carry the hardened 2D moves; this file is how you build the 3D signature
at the level of a Lusion or Active Theory site. It is recipes, not rules. Change any number for the idea.

The four things that separate a studio scene from a demo, in the order they are usually missing:

1. **The material is believable.** Glass refracts, metal reflects a room, skin scatters. A flat colour is a toy.
2. **Light behaves as light.** Hot parts bloom, the frame has grain, colour is tone mapped, never clipped.
3. **The scene is choreographed.** The camera, the object, the type and the ground all read one scroll value, and
   every screen changes something. A model that sits still while text scrolls past is a sticker.
4. **It answers the visitor.** The pointer leans on it, scroll speed shakes or stretches it, it settles with inertia.

## Start from the kit

`node <skill-dir>/scripts/blocks.mjs add gl` installs three, the React Three packages and `components/struq/kit/gl`:

- **`Stage`**: the canvas with every guard (poster first, paused off screen, reduced motion follows only the
  visitor's own scroll, DPR caps and PerformanceMonitor), a light room from code (`light`: studio, warm, night,
  daylight) and the post stack (`post`: bloom, grain, vignette, aberration; AgX tone mapping).
- **`TurnedObject`**: a lathe object from a profile (`pendant-globe`, `pendant-bell`, `pendant-drop`, `vase`, `cup`,
  `bottle`, or your own silhouette) with a real wall, in `glass` (transmission, tinted by depth), `ceramic` or
  `metal`; `glow` lights it from inside with a coil and a soft halo; `hang` adds a cap and cord; it sways with the
  scroll speed and leans toward the pointer.
- **`ScrollCamera`**: keyframes on one progress value, eased between beats and damped so it moves with weight.
- **`Backdrop`**: a lit wall behind the object, a pool of light in the palette that opens with `light`.
- **Signals**: `useScrollProgress(ref, { start, end, pin })`, `span(progress, from, to)` (a beat of it), `useScrollVelocity()`, `usePointer()`,
  `useTokenColor("--accent")`.

A worked signature, the opening of a glass studio's site. The pin is 2.2 screens and each screen changes something:
the pendant lights from its coil, the room turns from night to warm and the camera drifts to look up into the glow.

```tsx
// app/Opening.tsx: the section, the copy and the pin.
"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { useScrollProgress } from "@/components/struq/kit/gl";
const Scene = dynamic(() => import("./PendantScene"), { ssr: false });

export function Opening() {
  const section = useRef<HTMLElement>(null);
  const progress = useScrollProgress(section, { start: "top top", end: "+=220%", pin: true });
  return (
    <section ref={section} className="relative h-svh overflow-hidden bg-[var(--surface-0)]">
      <Scene progress={progress} />
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-end p-[4vw]">
        <h1 className="text-display">Daylight, kept in glass.</h1>
        <p className="text-lead mt-6 max-w-[28rem]">Pendant lights designed and blown by hand in our Bergen studio.</p>
      </div>
    </section>
  );
}

// app/PendantScene.tsx: the scene, loaded in its own chunk.
"use client";
import { Backdrop, ScrollCamera, Stage, TurnedObject, type Signal } from "@/components/struq/kit/gl";
export default function PendantScene({ progress }: { progress: Signal }) {
  return (
    <Stage className="absolute inset-0" light="warm" post={{ bloom: 1.6, grain: 0.04, vignette: 0.5 }}
      camera={{ fov: 30, position: [0, 0.3, 8] }} label="A hand-blown glass pendant that lights up as you scroll">
      <Backdrop ground="#0d0b0a" glow="#9c5a2c" light={progress} center={[3, 0.8]} />
      <TurnedObject profile="pendant-drop" material="glass" tint="#f3d2a8" glow={progress} hang position={[2.1, 0.35, 0]} scale={0.95} />
      <ScrollCamera progress={progress} path={[
        { at: 0, position: [0, 0.3, 8], target: [0.6, 0.2, 0] },
        { at: 0.55, position: [1.2, 0.1, 6.6], target: [1.3, 0.1, 0] },
        { at: 1, position: [0.9, -0.9, 6.2], target: [1.4, 0.4, 0] },
      ]} />
    </Stage>
  );
}
```

Composition: the object sits on the calm side of the headline, never under it, and stays whole in frame at every
beat: no half-cut object at the screen edge unless the crop is the idea. The camera stays outside the object
(`ScrollCamera` keeps `minDistance`, default 3.2); a close-up is a slow drift toward the shoulder or the light, never
a flight into the glass. Check the first, middle and last beat at 1440 and 390 wide before you call it done: on a
phone, move the object above or behind the type rather than off the edge. The type stays readable at every beat. Take the colours from the palette tokens (`useTokenColor`) rather than hex. Fork any kit file into your own
when the idea needs more; the rest of this file is how.

## One world: the scene carries the page

The studios at the bar rarely end the 3D at the first screen. The object the visitor met keeps them company: it
drifts aside as the craft is told, comes back closer when the material is the point, lights up for the centerpiece and
settles where the door opens. That is what makes a page feel like one film instead of a hero and a stack of type
cards. Build it from the kit's world pieces, never a hand-rolled canvas:

- **`World`**: the one fixed canvas, always behind the type (`fixed inset-0 -z-10`), with a lit wall whose pool of
  light stays behind the object. It measures the page's beats for everything inside it.
- **`data-beat`** on each section of `<main>`, and **`useBeats()`** inside the world: `page` (the whole scroll),
  `beat(name)` (0 to 1 across one section), `on(name)` (1 while that section holds the screen: a light for one
  scene), `range(name)` for your own `span`.
- **`BeatCamera`**: a pose per beat (`position`, `target`, an optional `phone` pose); it holds each pose while its
  section has the screen and moves in the half screen where one section hands over to the next.
- **`Framed`**: keeps the object whole, sized to a share of the screen and on the side the type leaves free, per beat;
  on a phone it moves to the upper centre and shrinks above the type.

```tsx
// app/PageWorld.tsx: the world, in its own chunk.
"use client";
import { BeatCamera, Framed, TurnedObject, World, useBeats } from "@/components/struq/kit/gl";

function Pendant() {
  const { on } = useBeats();
  return <TurnedObject profile="pendant-globe" material="glass" tint="#f3d2a8" hang glow={on("centerpiece")} />;
}

export default function PageWorld() {
  return (
    <World light="night" label="A blown glass pendant that follows the page and lights up for the centerpiece">
      <BeatCamera keys={{
        opening: { position: [0, 0.3, 8], target: [0, 0.1, 0] },                                   // eye level
        craft: { position: [2.6, 1.4, 7.4], target: [0, 0, 0], phone: { position: [0, 1.2, 8.6] } }, // from above: the cap and the lip
        range: { position: [-2.2, -0.8, 7.6], target: [0, 0.2, 0] },                                // from below
        centerpiece: { position: [0.6, -1.4, 7.2], target: [0, 0.3, 0] },                          // looking up into the light
        close: { position: [0, 0.4, 9], target: [0, 0.1, 0] },
      }} />
      <Framed side={{ opening: "right", craft: "left", range: "right", centerpiece: "left", close: "right" }}
        size={{ centerpiece: 0.72, close: 0.5 }}>
        <Pendant />
      </Framed>
    </World>
  );
}

// app/page.tsx (a client component): each section a screen tall, its type centred on the free side; on a phone,
// in the lower half under the object.
const PageWorld = dynamic(() => import("./PageWorld"), { ssr: false });
<main className="relative">
  <PageWorld />
  <section data-beat="opening" className="flex min-h-[100svh] flex-col justify-end px-sheet-margin pb-[10svh] pt-[50svh] md:items-start md:justify-center md:py-[18vh]">
    <div className="max-w-[34rem] md:w-[42%]"><h1 className="font-display text-display">...</h1><p className="text-lead mt-6">...</p></div>
  </section>
  <section data-beat="craft" className="... md:items-end">...</section>
  ...
</main>
```

The camera's keys choose the angle (from above, from below, looking up into the glow); `Framed` owns where the object
sits and how big it is, so no key can push it off the frame or under a headline, at 390, 1024 or 1440 wide. The type
side and the object side are one decision: write them together in STRUQ.md, one line per beat. A section that wants
the page to itself has its own ground, and the world waits behind it. The opening's own pin can still run inside the
world: give that section `span(page, a, b)` beats rather than a second canvas. One canvas for the whole page is also
cheaper than one per section.

Writing your own canvas instead: load it in its own chunk, keep a poster until the first frame, cap the DPR, pause off
screen, render one frame under reduced motion, and run on the page's one GSAP clock, as `Stage` does.

## Form

- **Ready-made objects.** `kit/gl/objects` holds hero objects already modelled and finished to a studio standard:
  `Pendant` (hand-blown glass with a filament bulb, a knurled cap and a cord), `LeverMachine` (a vintage lever
  espresso machine, every part turned, bent or bevelled), `Vessel` (thrown ceramic with throwing rings, a glaze
  line and drips over bare clay) and `Roof` (a gable roof in section for the trades: rafters, boarding, membrane,
  battens and tile, slate, standing-seam metal or bitumen, gutters, a chimney in lead; it builds itself layer by layer,
  sheds the rain into the gutter and turns flat with its pitch). Use one of these first and adjust its props to the
  business: the shape, the tint, the enamel, the metal, the glaze and clay, the cover and the pitch, with `glow`,
  `lever`, `steam`, `build` or `rain` on the page's scroll. Each fits about a
  2 unit box with its origin and best camera in the file header. Model your own only when none of them fits the
  client's object, and then to the same standard, by the rules below.
- **Turned objects** (a lamp, a vase, a bottle, a cup): `LatheGeometry` from a profile of 20 to 40 points, then
  `geometry.computeVertexNormals()`. Draw the profile from the real object's silhouette, with a lip and a wall
  thickness, never a sphere on a stick.
- **A machine or a device** (an espresso machine, a camera, a radio, a tool) with no model to load: build every
  part as what it is. Every round part is turned (`LatheGeometry`: the boiler with its domed cap and its bands, the
  group head, the knobs, the feet); every housing is a `RoundedBox` from drei with a radius, never a sharp box (real
  metal has a radius, and the highlight on it is what reads as metal); levers, pipes and wands are a `TubeGeometry`
  along a curve, ending in a turned handle. Then add the details at the scale of a hand: a knurled ring, a gauge
  face with its needle, a badge, a seam, a screw head. Three of those carry more than the size of the whole. Draw
  the proportions from the real thing, measured from a reference, and look at it from the camera's every beat.
- **Framing.** The object stands whole in the frame at every beat, with air around it, unless the crop is the idea
  and is written as such in the Signature line. An object cut by the screen edge at the opening reads as a mistake,
  not as drama. Check the first, middle and last beat at 1024, 1440 and 390 wide; on a narrow screen move or scale
  the object (read the size from `useThree((s) => s.viewport)`), never let it push past the edge.
- **Anything you cannot turn or assemble**: a glTF compressed with Draco (`npx gltfjsx model.glb --transform`), loaded with
  `useGLTF`. A primitive (box, sphere, torus) is a placeholder, never the subject.
- **Soft organic forms**: displace a high-segment sphere in the vertex shader with FBM or curl noise; morph between
  two shapes by mixing positions on a uniform the scroll drives.

## Materials

**Glass.** `MeshTransmissionMaterial` from drei renders what is behind it, bent:

```tsx
<MeshTransmissionMaterial
  transmission={1} thickness={0.6} roughness={0.08} ior={1.45}
  chromaticAberration={0.04} anisotropicBlur={0.2} distortion={0.15} distortionScale={0.4}
  temporalDistortion={0.05} backside samples={6} resolution={512}
  color="#f3e9dc" attenuationColor="#e8b98a" attenuationDistance={0.8}
/>
```

Glass is invisible without something to refract: put type, a coloured plane or the environment behind it. Cheaper:
`meshPhysicalMaterial` with `transmission={1} thickness ior roughness` (no backside pass). Tinted, hand-blown glass
wants `attenuationColor`, a little `roughness` and a slight `iridescence={0.3}`.

**Metal and fittings.** `meshStandardMaterial` with `metalness={1} roughness={0.25 to 0.4}`; it is only as good as the
environment it reflects.

**Ceramic, stone, skin.** `meshPhysicalMaterial` with `sheen`, `clearcoat` or a matcap texture for a fast stylised
look.

**Environment without a network call.** drei `<Environment resolution={256}>` with a few `<Lightformer>` panels
(a ring, two long strips, one warm key) gives studio reflections from code. `preset="studio"` fetches an HDR from a
CDN at run time: avoid it in production.

## Light and post-processing

**A thing that glows** (a filament, molten glass, a screen): an emissive material pushed past 1 and left out of tone
mapping, so bloom picks it up and nothing else:

```tsx
<meshStandardMaterial color="#ffb36b" emissive="#ff8a3d" emissiveIntensity={4} toneMapped={false} />
```

Animate `emissiveIntensity` with the scroll to turn the light on. Add a `pointLight` at the same spot so the glow also
lights the glass around it.

**The post stack**, in this order, all subtle:

```tsx
<EffectComposer multisampling={0}>
  <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
  <ChromaticAberration offset={[0.0006, 0.0006]} radialModulation modulationOffset={0.4} />
  <Noise opacity={0.035} premultiply />
  <Vignette offset={0.3} darkness={0.55} />
  <ToneMapping mode={ToneMappingMode.AGX} />
</EffectComposer>
```

`luminanceThreshold={1}` means only what you pushed past 1 blooms. Shader light (bloom, fresnel, iridescence, a
falloff) is not the CSS glow the tells ban; a blurred coloured shadow behind a card still is.

## Shader snippets

```glsl
// Fresnel rim: bright where the surface turns away from the eye.
float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), 3.0);

// Film grain in a full-screen pass or a fragment shader.
float grain = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
color += grain * 0.04;

// FBM over simplex noise (bring a snoise implementation, for example from glsl-noise).
float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * snoise(p); p *= 2.02; a *= 0.5; } return v; }
```

Use curl noise to move particles along a flow that never collapses into clumps; for more than about 20k particles,
simulate on the GPU (GPGPU with a ping-pong render target) and draw with `InstancedMesh` or points.

## Choreography: one scroll value drives everything

Give each pinned scene one progress value from 0 to 1, and make every layer read it: camera, object, material, type
and ground. Then nothing can drift apart, and every screen of scroll changes something.

```tsx
const progress = useRef(0);
useGSAP(() => {
  ScrollTrigger.create({ trigger: ref.current, start: "top top", end: "+=300%", pin: true, scrub: true,
    onUpdate: (st) => { progress.current = st.progress; } });
});

useFrame((state, delta) => {
  const p = progress.current;
  // damp, never set: the object follows the scroll with inertia.
  easing.damp3(state.camera.position, [Math.sin(p * Math.PI) * 1.2, 0.2 + p * 0.6, 4 - p * 1.5], 0.25, delta);
  state.camera.lookAt(0, 0.3, 0);
  easing.damp(material, "emissiveIntensity", p > 0.2 ? 4 : 0, 0.4, delta);
  mesh.current.rotation.y += delta * (0.1 + Math.abs(velocity.current) * 0.002);
});
```

(`easing` comes from `maath`, which drei already installs.) Write the scene as beats in STRUQ.md before you code it,
for example: 0 to 0.2 the lamp is dark and the headline masks in; 0.2 to 0.4 the filament warms and blooms; 0.4 to 0.7
the camera circles to the lip and the second line splits in; 0.7 to 1 the light settles and the ground turns from
night to warm. Type enters with a mask reveal and a 0.04 to 0.08 s stagger per word, timed to a beat, never on its
own timer. Leave no screen-high stretch where nothing moves; if a beat is empty, shorten the pin.

**DOM-to-WebGL sync.** For images or type that live in the layout but render in WebGL (a wave on hover, a
distortion on scroll), drei `<View track={ref}>` draws a scene into a DOM element's rectangle; or measure the
element's `getBoundingClientRect()` each frame and place a plane to match. Keep the real `<img>` or text in the DOM
for accessibility and as the fallback.

## Answering the visitor

- **Scroll velocity:** `getLenis()?.velocity` (from `@/components/struq/kit/SmoothScroll`) each frame, damped into a
  ref. Feed it to a uniform: a slight stretch, faster spin, a ripple, a chromatic split that grows with speed and
  relaxes when the scroll stops.
- **Pointer:** lerp a target from the normalised pointer and let the object lean 3 to 8 degrees toward it. Presence,
  not a spotlight.
- **Inertia:** every value the visitor drives is damped (`easing.damp`, or lerp with `1 - Math.exp(-k * delta)`),
  so it eases in and settles.

## Phones and budgets

Same scene, fewer pixels: `dpr={[1, 1.5]}`, `samples={4}` and `resolution={256}` on transmission, no chromatic
aberration, drei `<PerformanceMonitor>` to step down. A phone that cannot hold 50 fps gets the composed still frame,
which must be as art-directed as the moving one. Keep the first-load bundle free of three.js; ship models under
about 1.5 MB with Draco and textures as KTX2 or WebP.
