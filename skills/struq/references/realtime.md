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

## Setup

```bash
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing
```

Load the canvas in its own chunk after paint (`dynamic(() => import("./Scene"), { ssr: false })`), keep a poster
behind it until the first frame, cap `dpr={[1, 1.75]}`, pause when off screen (`frameloop="demand"` plus
`invalidate()`, or drei `<View>`), and on `prefers-reduced-motion` render one composed frame and stop. Run the loop on
the same clock as Lenis and ScrollTrigger: `gsap.ticker.add` drives `advance()` with `frameloop="never"`, or read the
scroll value inside `useFrame`. The kit's `HeroCanvas` already does all of this for a 2D field; copy its guards.

## Form

- **Turned objects** (a lamp, a vase, a bottle, a cup): `LatheGeometry` from a profile of 20 to 40 points, then
  `geometry.computeVertexNormals()`. Draw the profile from the real object's silhouette, with a lip and a wall
  thickness, never a sphere on a stick.
- **Anything you cannot turn**: a glTF compressed with Draco (`npx gltfjsx model.glb --transform`), loaded with
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
