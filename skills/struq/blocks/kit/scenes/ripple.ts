// components/struq/scenes/ripple.ts (Struq recipe)
// The hero photo as a living surface: a slow liquid drift, a ripple that follows the pointer
// and grows with its speed, a hint of chromatic split in the ripple, and a slow push-in as the
// hero scrolls away. The photo is pulled toward the palette (ink in the shadows, surface in the
// highlights) by `grade`, so any pack photo sits in the site's colours. The ripple only lives while
// the pointer is there (presence), and it stills behind the copy marked data-quiet.
// Suits: hospitality, food, hotels, fashion, wellness, any brief with one strong hero photo.
import { NOISE_GLSL, QUIET_GLSL, quietUniforms, type CreateScene } from "./types";

export const createScene: CreateScene = async ({ THREE, renderer, palette, image, grade }) => {
  if (!image) throw new Error("The ripple scene needs an image: <HeroCanvas scene=\"ripple\" image={images.hero[0]} />");
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const texture = await new THREE.TextureLoader().loadAsync(image.src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const quietSet = quietUniforms(THREE, 0.1);
  const uniforms = {
    ...quietSet.uniforms,
    uMap: { value: texture },
    uPresence: { value: 0 },
    uPr: { value: renderer.getPixelRatio() },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.Vector2(image.width, image.height) },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uStrength: { value: 0 },
    uScroll: { value: 0 },
    uGrade: { value: grade },
    uInk: { value: new THREE.Color(palette.ink) },
    uSurface: { value: new THREE.Color(palette.surface) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uTime; uniform vec2 uRes; uniform vec2 uImg;
      uniform vec2 uPointer; uniform float uStrength; uniform float uScroll; uniform float uGrade;
      uniform vec3 uInk; uniform vec3 uSurface; uniform float uPresence; uniform float uPr;
      varying vec2 vUv;
      ${NOISE_GLSL}
      ${QUIET_GLSL}
      vec2 cover(vec2 uv) {
        float rs = uRes.x / uRes.y; float ri = uImg.x / uImg.y;
        vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
        return (uv - 0.5) * s + 0.5;
      }
      void main() {
        vec2 uv = (vUv - 0.5) / (1.04 + uScroll * 0.12) + 0.5;
        float calm = 1.0 - 0.8 * quiet(gl_FragCoord.xy);
        float t = uTime * 0.05;
        vec2 d = (vec2(noise(uv * 2.4 + t), noise(uv * 2.4 - t * 0.8)) - 0.5) * 0.008 * calm;
        vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
        vec2 diff = (vUv - (uPointer * 0.5 + 0.5)) * aspect;
        float dist = length(diff);
        float wave = sin(dist * 30.0 - uTime * 2.0) * exp(-dist * 6.0) * (0.003 + uStrength * 0.012) * uPresence * calm;
        d += normalize(diff + 1e-5) * wave;
        vec2 c = cover(uv + d);
        float split = abs(wave) * 0.6;
        vec3 col = vec3(texture2D(uMap, c + vec2(split, 0.0)).r, texture2D(uMap, c).g, texture2D(uMap, c - vec2(split, 0.0)).b);
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, mix(uInk, uSurface, smoothstep(0.02, 0.9, l)), uGrade);
        col += (hash(vUv * uRes + fract(uTime * 7.0)) - 0.5) * 0.025;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  return {
    scene,
    camera,
    update(state) {
      uniforms.uTime.value = state.time;
      uniforms.uPointer.value.set(state.pointer.x, state.pointer.y);
      uniforms.uStrength.value = state.velocity;
      uniforms.uPresence.value = state.presence;
      quietSet.update(state);
      uniforms.uScroll.value = state.scroll;
    },
    resize(width, height) {
      uniforms.uRes.value.set(width, height);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
};
