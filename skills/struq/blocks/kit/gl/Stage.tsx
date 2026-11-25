"use client";
// components/struq/kit/gl/Stage.tsx (Struq kit): the canvas every real-time scene stands on.
//
// What a studio scene needs and a hand-written <Canvas> forgets, built in:
// - the poster shows first (your still: a render, a photo, or nothing on a flat ground) and stays when WebGL is
//   missing; the canvas fades in over it after its first frame;
// - the loop pauses when the stage leaves the viewport and the tab is hidden; reduced motion renders one still frame;
// - device pixel ratio capped at 1.75 (1.5 on phones) and stepped down by PerformanceMonitor when frames drop;
// - studio light from code: Lightformer panels in an Environment, so glass and metal have a room to reflect, with no
//   HDR fetched from a CDN at run time;
// - the post stack, all subtle by default: bloom only on what you push past 1 (an emissive filament, molten glass),
//   film grain, a vignette, AgX tone mapping, an optional hint of chromatic aberration.
//
// Load it in its own chunk so three.js never lands in the first-load bundle:
//   const Scene = dynamic(() => import(<your scene file>), { ssr: false });
// and inside that file:
//   <Stage className="absolute inset-0" light="warm" post={{ bloom: 1.1, grain: 0.04 }} poster={<img ... />}>
//     <TurnedObject profile="pendant-globe" material="glass" glow={glow} hang />
//     <ScrollCamera progress={progress} path={[...]} />
//   </Stage>
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction } from "postprocessing";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NoToneMapping, Vector2 } from "three";
import { prefersReducedMotion } from "./signals";

export type StageLight = "studio" | "warm" | "night" | "daylight";

export type StagePost = {
  /** Bloom strength on what is brighter than 1 (an emissive pushed past 1). 0 turns it off. Default 0.9. */
  bloom?: number;
  /** Film grain opacity. Default 0.035. */
  grain?: number;
  /** Vignette darkness, 0 to 1. Default 0.45. */
  vignette?: number;
  /** Chromatic aberration offset, for example 0.0006. Default 0 (off). */
  aberration?: number;
};

type Props = {
  children: ReactNode;
  className?: string;
  /** The still behind the canvas: shown first, kept when WebGL is missing. */
  poster?: ReactNode;
  /** The light room the scene reflects. Default "studio". */
  light?: StageLight;
  /** The post stack, or false for none. */
  post?: StagePost | false;
  /** Camera field of view and start position. */
  camera?: { fov?: number; position?: [number, number, number] };
  /** The clear colour behind the scene; leave it out for a transparent canvas over the page ground. */
  background?: string;
  /** Accessible description of what the scene shows. */
  label?: string;
};

/** Each light is a few emissive panels: a key, a fill, a rim and a ring, the way a product photographer lights glass. */
function Room({ light }: { light: StageLight }) {
  const warm = light === "warm";
  const night = light === "night";
  const key = warm ? "#ffd9b0" : light === "daylight" ? "#f4f7ff" : "#ffffff";
  const scale = night ? 0.45 : 1;
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={[night ? "#050507" : warm ? "#1a1310" : "#101012"]} />
      <Lightformer form="rect" intensity={3 * scale} color={key} position={[-4, 3, 3]} scale={[4, 6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.4 * scale} color={key} position={[5, 1, 2]} scale={[2, 8, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2.2 * scale} color={warm ? "#ffb36b" : "#ffffff"} position={[0, 2, -6]} scale={[12, 1.2, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.6 * scale} color={key} position={[0, -5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
  );
}

/**
 * Under reduced motion nothing moves on its own, but the scene still follows the visitor's own scroll: one frame per
 * scroll event, so a scroll-driven camera or glow still lands where the page is.
 */
function FollowScroll() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const render = () => invalidate();
    window.addEventListener("scroll", render, { passive: true });
    window.addEventListener("resize", render);
    const settle = window.setInterval(render, 250);
    return () => {
      window.removeEventListener("scroll", render);
      window.removeEventListener("resize", render);
      window.clearInterval(settle);
    };
  }, [invalidate]);
  return null;
}

function Post({ post }: { post: StagePost }) {
  const { bloom = 0.9, grain = 0.035, vignette = 0.45, aberration = 0 } = post;
  const offset = useRef(new Vector2(aberration, aberration)).current;
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.3} intensity={bloom} radius={0.86} levels={8} />
      <ChromaticAberration offset={offset} radialModulation modulationOffset={0.45} blendFunction={aberration ? BlendFunction.NORMAL : BlendFunction.SKIP} />
      <Vignette offset={0.32} darkness={vignette} />
      <Noise premultiply opacity={grain} blendFunction={grain ? BlendFunction.SCREEN : BlendFunction.SKIP} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  );
}

export function Stage({ children, className = "", poster, light = "studio", post = {}, camera, background, label }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);
  const [dpr, setDpr] = useState(1.5);

  useEffect(() => {
    setStill(prefersReducedMotion());
    const phone = window.matchMedia("(max-width: 767px)").matches;
    setDpr(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75));
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "20% 0px" });
    io.observe(el);
    const onHide = () => setVisible(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className={`${/\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative "}overflow-hidden ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {poster ? (
        <div aria-hidden className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 0 : 1 }}>
          {poster}
        </div>
      ) : null}
      <Canvas
        className="!absolute inset-0"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 900ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        dpr={dpr}
        frameloop={still ? "demand" : visible ? "always" : "never"}
        camera={{ fov: camera?.fov ?? 32, position: camera?.position ?? [0, 0, 6], near: 0.1, far: 100 }}
        gl={{ antialias: post === false, alpha: !background, powerPreference: "high-performance", toneMapping: post === false ? undefined : NoToneMapping }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(background ? 1 : 0);
          requestAnimationFrame(() => setReady(true));
        }}
      >
        {background ? <color attach="background" args={[background]} /> : null}
        <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.25))} />
        {still ? <FollowScroll /> : null}
        <Room light={light} />
        {children}
        {post === false ? null : <Post post={post} />}
      </Canvas>
    </div>
  );
}
