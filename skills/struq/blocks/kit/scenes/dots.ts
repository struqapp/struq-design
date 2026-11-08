// components/struq/scenes/dots.ts (Struq recipe)
// A fine field of points seen at a low angle, rolling like a slow swell toward a horizon in the upper
// third. The swell rises toward the right of the frame, its crests catch the accent, the far rows thin
// out into the ground colour, and the field hushes behind the copy. The pointer lifts a soft hill only
// while it is there. Scrolling lowers the field away.
// Suits: mobility, logistics, technology, sport, energy, data: anything about movement or scale.
import { NOISE_GLSL, QUIET_GLSL, quietUniforms, type CreateScene } from "./types";

export const createScene: CreateScene = async ({ THREE, renderer, palette, dark }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(-1.5, 4.2, 13);
  camera.lookAt(1.5, 0.4, -6);
  renderer.setClearColor(new THREE.Color(palette.surface), 1);

  const cols = 260;
  const rows = 120;
  const positions = new Float32Array(cols * rows * 3);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions[i++] = (c / (cols - 1) - 0.5) * 48;
      positions[i++] = 0;
      positions[i++] = (r / (rows - 1)) * -40 + 10;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const quietSet = quietUniforms(THREE, dark ? 0.1 : 0.16);
  const uniforms = {
    ...quietSet.uniforms,
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPresence: { value: 0 },
    uScroll: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
    uInk: { value: new THREE.Color(palette.ink) },
    uAccent: { value: new THREE.Color(palette.accent) },
    uInkWeight: { value: dark ? 1.0 : 0.8 },
    // On a dark ground light points read smaller and fainter: bigger points and a visibility floor,
    // so a photo-less opener on the inverse ground still carries the screen.
    uSize: { value: dark ? 62 : 44 },
    uFloor: { value: dark ? 0.38 : 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec2 uPointer; uniform float uPresence; uniform float uScroll; uniform float uDpr; uniform float uSize;
      varying float vH; varying float vFade;
      ${NOISE_GLSL}
      void main() {
        vec3 p = position;
        float t = uTime * 0.04;
        // Long swells rolling toward the viewer, broken by slow noise; taller toward the right.
        float rise = smoothstep(-20.0, 18.0, p.x);
        float h = 0.8 * sin(p.z * 0.3 + p.x * 0.05 + t * 3.0) + 1.4 * (fbm(p.xz * 0.07 + vec2(t, t * 0.6)) - 0.5);
        h = h * (0.35 + 0.85 * rise);
        vec2 hill = p.xz - vec2(uPointer.x * 16.0 + 2.0, -uPointer.y * 10.0 - 4.0);
        h += exp(-dot(hill, hill) * 0.03) * 0.7 * uPresence;
        p.y += h - uScroll * 2.2;
        vH = clamp(h * 0.6 + 0.5, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFade = smoothstep(46.0, 14.0, -mv.z) * smoothstep(0.5, 4.0, -mv.z);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.5 * uDpr, uDpr * uSize / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk; uniform vec3 uAccent; uniform float uInkWeight; uniform float uFloor;
      varying float vH; varying float vFade;
      ${QUIET_GLSL}
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.3, d);
        float crest = smoothstep(0.68, 0.95, vH);
        float v = hush(max((0.3 + 0.7 * vH) * uInkWeight, uFloor) * vFade, gl_FragCoord.xy);
        vec3 col = mix(uInk, uAccent, crest * 0.85);
        gl_FragColor = vec4(col, disc * v);
        #include <colorspace_fragment>
      }
    `,
  });

  scene.add(new THREE.Points(geometry, material));

  return {
    scene,
    camera,
    update(state) {
      uniforms.uTime.value = state.time;
      uniforms.uPointer.value.set(state.pointer.x, state.pointer.y);
      uniforms.uPresence.value = state.presence;
      uniforms.uScroll.value = state.scroll;
      quietSet.update(state);
    },
    resize(width, height) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      uniforms.uDpr.value = renderer.getPixelRatio();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};
