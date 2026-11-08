"use client";
// toonstuk-pixel-resolve (Struq showpiece recipe)
// The hero photo arrives as coarse pixels and resolves to sharp in a few held steps, on a stepped
// 2D canvas over the real image (no WebGL needed). When the last step lands, the canvas is hidden
// and the plain next/image is what stays, so the page always ends on the real photo.
// A supporting move for a product launch or a creative brand's hero.
//
// <PixelResolve image={images.hero[0]} priority className="h-svh" />
//
// Reduced motion, phones and any failure: the plain image, immediately.
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { StruqImage } from "../kit/images";

/** Pixel sizes in CSS pixels, coarse to fine. */
const STEPS = [64, 40, 24, 14, 8, 4];

type Props = {
  image: StruqImage;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Milliseconds each step holds. */
  hold?: number;
};

export function PixelResolve({ image, className = "", priority = false, sizes = "100vw", hold = 170 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    // React owns the canvas, so it is hidden, never removed.
    const hideCanvas = () => {
      canvas.style.display = "none";
    };
    const still = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches;
    if (still) {
      hideCanvas();
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const img = new window.Image();
    img.decoding = "async";
    img.src = image.src;
    img.onerror = () => hideCanvas();
    img.onload = () => {
      if (cancelled) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      const small = document.createElement("canvas");
      const sctx = small.getContext("2d");
      if (!ctx || !sctx) return hideCanvas();
      // object-fit: cover, by hand
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (img.naturalWidth - sw) / 2;
      const sy = (img.naturalHeight - sh) / 2;
      const draw = (px: number) => {
        small.width = Math.max(1, Math.round(w / px));
        small.height = Math.max(1, Math.round(h / px));
        sctx.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
      };
      STEPS.forEach((px, i) => timers.push(window.setTimeout(() => !cancelled && draw(px), 120 + i * hold)));
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          canvas.style.transition = "opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)";
          canvas.style.opacity = "0";
          timers.push(window.setTimeout(() => hideCanvas(), 450));
        }, 120 + STEPS.length * hold),
      );
      draw(STEPS[0]);
      canvas.style.opacity = "1";
    };
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [image.src, hold]);

  return (
    <div ref={box} data-showpiece="pixel-resolve" className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        unoptimized={image.unoptimized}
        className="object-cover"
      />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />
    </div>
  );
}
