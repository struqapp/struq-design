"use client";
// components/struq/MediaFrame.tsx (Struq recipe)
// The only way an image goes on the page. It always holds a real image from lib/struq-images.ts
// (written by scripts/images.mjs), so a frame can never ship empty.
//
// - reveal "scroll": the frame opens bottom-up like a curtain as it enters, the photo settles from 1.3x.
// - reveal "load": the same curtain on mount, for the hero.
// - parallax: the photo pans inside the frame while the frame scrolls past (scrubbed).
//
// <MediaFrame image={images.hero[0]} ratio="16/9" priority sizes="100vw" reveal="load" />
// <MediaFrame image={images.card[2]} ratio="3/2" sizes="(min-width: 768px) 40vw, 100vw" />
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import type { StruqImage } from "./images";

type Props = {
  image: StruqImage;
  /** CSS aspect ratio, for example "16/9", "3/2", "4/5", "1/1", "21/9". Defaults to the file's own. */
  ratio?: string;
  className?: string;
  sizes?: string;
  /** The page's one LCP image (the hero). Exactly one per page. */
  priority?: boolean;
  reveal?: "scroll" | "load" | "none";
  parallax?: boolean;
  /** Override the alt, for example a translation on a non-Dutch site. "" marks it decorative. */
  alt?: string;
};

export function MediaFrame({
  image,
  ratio,
  className = "",
  sizes = "100vw",
  priority = false,
  reveal = "scroll",
  parallax = true,
  alt,
}: Props) {
  const frame = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = frame.current;
      const photo = inner.current;
      if (!el || !photo) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (reveal !== "none") {
          const trigger = reveal === "scroll" ? { trigger: el, start: "top 88%", once: true } : undefined;
          gsap.fromTo(
            el,
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "power4.inOut", delay: reveal === "load" ? 0.2 : 0, scrollTrigger: trigger },
          );
          gsap.fromTo(photo, { scale: 1.3 }, { scale: parallax ? 1.12 : 1, duration: 1.8, ease: "expo.out", delay: reveal === "load" ? 0.2 : 0, scrollTrigger: trigger });
        }
        if (parallax) {
          gsap.fromTo(
            photo,
            { yPercent: -5 },
            { yPercent: 5, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
          );
        }
      });
      el.dataset.ready = "1";
      return () => mm.revert();
    },
    { scope: frame },
  );

  return (
    <figure
      ref={frame}
      data-frame={reveal === "none" ? "still" : "mask"}
      className={`relative overflow-hidden bg-surface-2 ${className}`}
      style={{ aspectRatio: ratio ?? `${image.width}/${image.height}` }}
    >
      <div ref={inner} className="absolute inset-0" style={{ scale: parallax ? "1.12" : undefined }}>
        <Image
          src={image.src}
          alt={alt ?? image.alt}
          fill
          sizes={sizes}
          // eager + high fetch priority works on every Next.js major ("priority" is deprecated in 16).
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          unoptimized={image.unoptimized}
          className="object-cover"
        />
      </div>
    </figure>
  );
}
