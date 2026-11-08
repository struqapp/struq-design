// components/struq/scenes/contours.ts (Struq recipe)
// A survey terrain seen at a low angle: fine contour lines in the ink, every fifth line catching the
// accent on the right of the frame, compressing toward a horizon above the top edge. The field drifts
// toward the viewer on a slow clock, the pointer lifts it a little, and it hushes behind the copy.
// Composition: the vanishing point sits on the right third and the lines fade out to the left, so a
// headline on the left sits in calm space. Needs no photo.
// Suits: architecture, studios, consultancy, research, nature, anything calm and precise.
//
// Two passes, so noise never runs per screen pixel: a field pass writes the terrain height into a
// small target (one texel per 4 CSS pixels, packed to 16 bits), and the draw pass turns the
// upsampled height into antialiased lines with cheap per-pixel arithmetic.
import { NOISE_GLSL, QUIET_GLSL, quietUniforms, type CreateScene } from "./types";

const CELL = 4; // CSS pixels per field texel

export const createScene: CreateScene = async ({ THREE, renderer, palette, dark }) => {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);
  const vertexShader = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const field = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    generateMipmaps: false,
  });

  const fieldUniforms = {
    uFieldRes: { value: new THREE.Vector2(2, 2) },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uPresence: { value: 0 },
    uScroll: { value: 0 },
  };
  const fieldMaterial = new THREE.ShaderMaterial({
    uniforms: fieldUniforms,
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform vec2 uFieldRes; uniform float uAspect; uniform float uTime;
      uniform vec2 uPointer; uniform float uPresence; uniform float uScroll;
      ${NOISE_GLSL}
      void main() {
        vec2 uv = gl_FragCoord.xy / uFieldRes;
        float t = uTime * 0.022; // the ambient clock: a slow drift, Vapor pace
        // Perspective: the horizon sits just above the top edge, the vanishing point on the right third.
        float below = 1.18 - uv.y;
        float Z = 0.8 / below;
        float X = (uv.x - 0.66) * uAspect * Z;
        vec2 p = vec2(X, Z - t * 1.1 + uScroll * 1.2) * 0.62;
        vec2 warp = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(4.1, -t)));
        float h = fbm(p * 0.9 + 1.25 * warp);
        // The pointer: a soft rise where it rests, eased by presence. A modulation, never a spotlight.
        vec2 d = (uv - (uPointer * 0.5 + 0.5)) * vec2(uAspect, 1.0);
        h += exp(-dot(d, d) / 0.035) * 0.05 * uPresence;
        h = clamp(h, 0.0, 0.999);
        gl_FragColor = vec4(floor(h * 255.0) / 255.0, fract(h * 255.0), 0.0, 1.0);
      }
    `,
  });
  const fieldScene = new THREE.Scene();
  fieldScene.add(new THREE.Mesh(quad, fieldMaterial));

  const quietSet = quietUniforms(THREE, dark ? 0.08 : 0.12);
  const drawUniforms = {
    ...quietSet.uniforms,
    uField: { value: field.texture },
    uFieldRes: { value: new THREE.Vector2(2, 2) },
    uCell: { value: CELL },
    uResPx: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uSurface: { value: new THREE.Color(palette.surface) },
    uInk: { value: new THREE.Color(palette.ink) },
    uAccent: { value: new THREE.Color(palette.accent) },
    uInkWeight: { value: dark ? 0.85 : 0.56 },
    // On a dark ground the lines need more weight and must not vanish on the copy side.
    uLeftFloor: { value: dark ? 0.45 : 0.2 },
  };
  const drawMaterial = new THREE.ShaderMaterial({
    uniforms: drawUniforms,
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D uField; uniform vec2 uFieldRes; uniform float uCell; uniform vec2 uResPx;
      uniform float uTime; uniform vec3 uSurface; uniform vec3 uInk; uniform vec3 uAccent; uniform float uInkWeight; uniform float uLeftFloor;
      ${QUIET_GLSL}
      float grain(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
      float at(ivec2 i) {
        ivec2 m = ivec2(uFieldRes) - 1;
        vec4 v = texelFetch(uField, clamp(i, ivec2(0), m), 0);
        return v.r + v.g / 255.0;
      }
      float height(vec2 fc) {
        vec2 g = fc / uCell - 0.5;
        ivec2 i = ivec2(floor(g));
        vec2 f = fract(g);
        return mix(mix(at(i), at(i + ivec2(1, 0)), f.x), mix(at(i + ivec2(0, 1)), at(i + ivec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 fc = gl_FragCoord.xy;
        vec2 uv = fc / uResPx;
        float f = height(fc) * 54.0;
        float w = fwidth(f);
        float dist = min(fract(f), 1.0 - fract(f));
        float line = 1.0 - smoothstep(0.0, w * 1.3, dist);
        // Where lines crowd closer than the screen can draw, they fade into a mist instead of moire.
        float dense = smoothstep(0.22, 0.55, w);
        float mist = dense * 0.05;
        line *= 1.0 - dense;
        float major = 1.0 - step(0.5, mod(floor(f + 0.5), 5.0));
        // Composition and depth: weighted to the right, fading toward the far horizon.
        float right = uLeftFloor + (1.0 - uLeftFloor) * smoothstep(0.05, 0.8, uv.x);
        float near = 1.0 - 0.6 * smoothstep(0.3, 1.0, uv.y);
        float inkV = hush((line * (0.55 + 0.45 * major) + mist) * uInkWeight * right * near, fc);
        float accentV = hush(line * major * smoothstep(0.5, 0.95, uv.x) * near * 0.75, fc);
        vec3 col = mix(uSurface, uInk, inkV);
        col = mix(col, uAccent, accentV);
        col += (grain(fc + fract(uTime) * 61.0) - 0.5) * 0.018;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(quad, drawMaterial));

  return {
    scene,
    camera,
    update(state) {
      fieldUniforms.uTime.value = state.time;
      fieldUniforms.uPointer.value.set(state.pointer.x, state.pointer.y);
      fieldUniforms.uPresence.value = state.presence;
      fieldUniforms.uScroll.value = state.scroll;
      drawUniforms.uTime.value = state.time;
      quietSet.update(state);
    },
    resize(width, height) {
      const pr = renderer.getPixelRatio();
      const fw = Math.max(2, Math.ceil(width / CELL));
      const fh = Math.max(2, Math.ceil(height / CELL));
      field.setSize(fw, fh);
      fieldUniforms.uFieldRes.value.set(fw, fh);
      fieldUniforms.uAspect.value = width / Math.max(1, height);
      drawUniforms.uFieldRes.value.set(fw, fh);
      drawUniforms.uCell.value = CELL * pr;
      drawUniforms.uResPx.value.set(width * pr, height * pr);
    },
    render(r) {
      r.setRenderTarget(field);
      r.render(fieldScene, camera);
      r.setRenderTarget(null);
      r.render(scene, camera);
    },
    dispose() {
      quad.dispose();
      field.dispose();
      fieldMaterial.dispose();
      drawMaterial.dispose();
    },
  };
};
