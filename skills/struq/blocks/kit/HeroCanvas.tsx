"use client";
// components/struq/HeroCanvas.tsx (Struq recipe): the WebGL hero layer
// A three.js layer behind the hero, with everything a production hero needs built in:
// - three.js loads in its own chunk after the page paints, never in the first-load bundle;
// - the poster (the hero photo, or the flat page surface) shows first and stays when WebGL is
//   missing; the canvas fades in over it only after its first frame;
// - device pixel ratio capped at 1.75, plus a pixel budget for large screens;
// - rendering pauses when the hero leaves the viewport or the tab is hidden;
// - prefers-reduced-motion and phones render ONE composed still frame (a computed poster) and never
//   run the loop, so a phone spends no battery on it;
// - the copy stays readable: mark the headline and lead with data-quiet and the field hushes
//   behind them (a soft ceiling, not a dark box);
// - the pointer is a gentle modulation that eases in and out (presence), never a spotlight;
// - colours come from the site tokens on :root (--surface-0, --surface-2, --ink, --accent), so the
//   scene is recoloured to the palette automatically;
// - it runs on gsap.ticker, the same clock as Lenis and ScrollTrigger.
//
// Place it as the first child of a `relative` hero section:
// <section className="relative min-h-svh">
//   <HeroCanvas scene="contours" />                      (no photo needed)
//   <HeroCanvas scene="ripple" image={images.hero[0]} /> (the hero photo, liquid under the pointer)
//   <HeroCanvas scene="dots" />                          (a field of points, for tech and mobility)
//   <div className="relative z-10"><h1 data-quiet>...</h1><p data-quiet>...</p></div>
// </section>
//
// A scene from the Struq MCP (struq_achtergrond) or one of your own: write it as
// components/struq/scenes/<name>.ts exporting createScene (see scenes/types.ts) and add it to SCENES.
import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "./gsap";
import type { StruqImage } from "./images";
import type { CreateScene, Palette } from "./scenes/types";

const SCENES: Record<string, () => Promise<{ createScene: CreateScene }>> = {
  contours: () => import("./scenes/contours"),
  ripple: () => import("./scenes/ripple"),
  dots: () => import("./scenes/dots"),
};

export type HeroSceneName = keyof typeof SCENES;

type Props = {
  scene: HeroSceneName;
  /** The poster, and the texture for "ripple". Use the same image as the hero photo. */
  image?: StruqImage;
  /** 0 to 1: how strongly the palette grade covers the photo (ripple only). */
  grade?: number;
  /** 0 to 0.6: a flat black scrim over the layer, so type set in text-on-photo reads on a photo. */
  scrim?: number;
  className?: string;
  /** Set when the poster image is the page's LCP element. */
  priority?: boolean;
};

/**
 * A token as an rgb() string three.js can parse, whatever it was written in: hex, oklch() or
 * color-mix(). The browser resolves the variable on a probe element, a 2D canvas turns the result
 * into sRGB bytes.
 */
function pick(name: string, fallback: string, host: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.color = `var(${name}, ${fallback})`;
  host.appendChild(probe); // resolved where the canvas sits, so a contrast scene recolours it
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.fillStyle = fallback;
  ctx.fillStyle = computed; // an unparseable value leaves the fallback in place
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/** Relative luminance of an rgb() string, 0 to 1. */
function luminance(rgb: string) {
  const [r, g, b] = (rgb.match(/[0-9]+/g) ?? ["255", "255", "255"]).slice(0, 3).map((n) => Number(n) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function readPalette(host: HTMLElement): Palette {
  return {
    surface: pick("--surface-0", "#f4efe6", host),
    surface2: pick("--surface-2", "#e2d7c4", host),
    ink: pick("--ink", "#1c1a17", host),
    accent: pick("--accent", "#8a3b22", host),
  };
}

export function HeroCanvas({ scene, image, grade = 0.25, scrim = 0, className = "", priority = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvasSlot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const slot = canvasSlot.current;
    if (!el || !slot) return;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const load = SCENES[scene];
      if (!load) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const { createScene } = await load();
      const THREE = await import("three");
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
      } catch {
        return; // no WebGL: the poster stays, which is the designed fallback
      }
      const phone = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
      const still = reduce || phone;
      const dprCap = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75);
      const canvas = renderer.domElement;
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0";
      canvas.setAttribute("aria-hidden", "true");
      slot.appendChild(canvas);

      const palette = readPalette(el);
      let hero: Awaited<ReturnType<CreateScene>>;
      try {
        hero = await createScene({
          THREE,
          renderer,
          palette,
          dark: luminance(palette.surface) < 0.4,
          image: image ? { src: image.src, width: image.width, height: image.height } : undefined,
          grade,
        });
      } catch (error) {
        console.warn("[HeroCanvas] scene failed, keeping the poster:", error);
        renderer.dispose();
        canvas.remove();
        return;
      }
      if (disposed) {
        canvas.remove();
        hero.dispose();
        renderer.dispose();
        return;
      }

      const state = {
        time: 0,
        pointer: { x: 0.3, y: 0 },
        target: { x: 0.3, y: 0 },
        presence: 0,
        wanted: 0,
        scroll: 0,
        velocity: 0,
        quiet: new Float32Array(16),
        feather: 48,
      };
      // The copy the field hushes behind: up to four [data-quiet] elements in the hero section.
      const measureQuiet = () => {
        const pr = renderer.getPixelRatio();
        const box = el.getBoundingClientRect();
        const section = el.parentElement ?? el;
        state.quiet.fill(0);
        Array.from(section.querySelectorAll<HTMLElement>("[data-quiet]"))
          .slice(0, 4)
          .forEach((node, i) => {
            const r = node.getBoundingClientRect();
            state.quiet[i * 4] = (r.left - box.left) * pr;
            state.quiet[i * 4 + 1] = (box.bottom - r.bottom) * pr;
            state.quiet[i * 4 + 2] = (r.right - box.left) * pr;
            state.quiet[i * 4 + 3] = (box.bottom - r.top) * pr;
          });
        state.feather = 64 * pr;
      };
      const size = () => {
        const w = el.clientWidth || window.innerWidth;
        const h = el.clientHeight || window.innerHeight;
        // DPR cap, then a pixel budget: a full-screen shader on a 4K or ultrawide screen renders at
        // most about 2.4 million pixels. The fields are soft, so the drop in resolution is invisible.
        renderer.setPixelRatio(Math.min(dprCap, Math.sqrt(2_400_000 / Math.max(1, w * h))));
        renderer.setSize(w, h, false);
        hero.resize(w, h);
        measureQuiet();
      };
      size();
      // Webfonts and the headline's split change the copy's box once after mount.
      const remeasure = window.setTimeout(measureQuiet, 900);

      const draw = () => {
        hero.update(state);
        if (hero.render) hero.render(renderer);
        else renderer.render(hero.scene, hero.camera);
      };

      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0 });
      io.observe(el);

      const onPointer = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        state.velocity = Math.min(1, state.velocity + Math.hypot(x - state.target.x, y - state.target.y) * 2);
        state.target.x = x;
        state.target.y = y;
        state.wanted = Math.abs(x) <= 1 && Math.abs(y) <= 1 ? 1 : 0;
      };
      const onLeave = () => (state.wanted = 0);

      const tick = (time: number) => {
        if (!visible || document.hidden) return;
        state.time = time;
        state.pointer.x += (state.target.x - state.pointer.x) * 0.05;
        state.pointer.y += (state.target.y - state.pointer.y) * 0.05;
        state.presence += (state.wanted - state.presence) * (state.wanted ? 0.04 : 0.015);
        state.velocity *= 0.95;
        state.scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, el.clientHeight)));
        draw();
      };

      const ro = new ResizeObserver(() => {
        size();
        if (still) draw();
      });
      ro.observe(el);

      if (still) {
        state.time = 40; // one composed still frame: the computed poster
        draw();
      } else {
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        gsap.ticker.add(tick);
        draw();
      }
      gsap.to(canvas, { opacity: 1, duration: 1.2, ease: "power2.out", delay: 0.1 });

      cleanup = () => {
        gsap.ticker.remove(tick);
        window.clearTimeout(remeasure);
        window.removeEventListener("pointermove", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        io.disconnect();
        ro.disconnect();
        hero.dispose();
        renderer.dispose();
        canvas.remove();
      };
    };

    // Start after the page has painted, so the canvas never competes with the LCP.
    const idle = window.setTimeout(() => void start(), 120);
    return () => {
      disposed = true;
      window.clearTimeout(idle);
      cleanup();
    };
  }, [scene, image, grade]);

  return (
    <div ref={host} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-surface-0 ${className}`}>
      {image ? (
        <Image
          src={image.src}
          alt=""
          fill
          sizes="100vw"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          unoptimized={image.unoptimized}
          className="object-cover"
        />
      ) : null}
      <div ref={canvasSlot} className="absolute inset-0" />
      {scrim > 0 ? <div className="absolute inset-0 bg-black" style={{ opacity: Math.min(0.6, scrim) }} /> : null}
    </div>
  );
}
