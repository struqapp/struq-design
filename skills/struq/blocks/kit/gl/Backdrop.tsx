"use client";
// components/struq/kit/gl/Backdrop.tsx (Struq kit): the lit wall behind an object.
//
// Glass is invisible without something to bend, and an object on flat black reads as a render. The backdrop is a
// large plane behind the scene with a soft pool of light (a radial falloff in a shader, with fine grain against
// banding), in the palette's ground and accent. `light` (0 to 1, a number or a Signal) opens the pool, so the room
// brightens as the object's glow rises.
//   <Backdrop ground="#0e0c0b" glow="#c8743a" light={progress} />
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, MathUtils, ShaderMaterial } from "three";
import type { Signal } from "./signals";

type Props = {
  /** The far ground colour. */
  ground?: string;
  /** The colour of the pool of light. */
  glow?: string;
  /** How open the pool is, 0 to 1. */
  light?: number | Signal;
  /** Where the pool sits on the wall, in wall units from the centre. */
  center?: [number, number];
  distance?: number;
};

const read = (v: number | Signal | undefined) => (typeof v === "number" ? v : (v?.current ?? 0));

export function Backdrop({ ground = "#0c0b0a", glow = "#b8743f", light = 0.6, center = [0, 0.2], distance = 6 }: Props) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uGround: { value: new Color(ground) },
          uGlow: { value: new Color(glow) },
          uLight: { value: read(light) },
          uCenter: { value: center },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uGround; uniform vec3 uGlow; uniform float uLight; uniform vec2 uCenter;
          varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec2 p = (vUv - 0.5) * vec2(1.6, 1.0) * 10.0 - uCenter;
            float d = length(p);
            float radius = mix(0.8, 5.5, uLight);
            float pool = exp(-pow(d / radius, 2.0) * 1.6);
            vec3 col = mix(uGround, uGlow, pool * mix(0.15, 0.95, uLight));
            col += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 2.0;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((_, delta) => {
    material.uniforms.uGround.value.set(ground);
    material.uniforms.uGlow.value.set(glow);
    material.uniforms.uLight.value = MathUtils.damp(material.uniforms.uLight.value, read(light), 4, delta);
  });

  return (
    <mesh position={[0, 0, -distance]} scale={[distance * 4, distance * 2.5, 1]} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
