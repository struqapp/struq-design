"use client";
// footer-reveal (Struq footer recipe)
// The footer is already there, under the page. As the reader reaches the end, the last section lifts away like a
// sheet and uncovers it, scrubbed to the scroll; scrolling back lays the page down again. The footer itself is calm
// and complete: the name large at a light weight, one closing line, the mail address and the phone number as real
// links, the street address, a few plain links and a small foot line. Three uncoverings:
//
// - lift: the last section rises and its bottom edge carries a hairline and a short soft shadow while it leaves; the
//   footer stands still beneath it. The classic sticky reveal.
// - fold: the last section tilts back from its bottom edge a few degrees as it lifts, like a page turned up (the hinge
//   is a screen above the edge, so the tilt is the same whatever the section's height), and the footer brightens as
//   it is uncovered.
// - iris: the footer is uncovered through an opening that grows from a thin horizontal slit at the bottom of the
//   screen to the full footer, its clip written from plain numbers, and the name rises inside it.
//
// <FooterReveal variant="lift" name="Noord" line="Kom langs, de tekentafel staat klaar." email="hallo@noord.studio"
//   phone="+31 10 412 77 30" address={["Maashaven Zuidzijde 14", "3081 AE Rotterdam"]}
//   links={[{ label: "Werk", href: "/werk" }, { label: "Instagram", href: "https://instagram.com/noord" }]}>
//   <section>the page's last section</section>
// </FooterReveal>
//
// How it holds: the last section (children) and the footer share one wrapper; the section sits above, the footer is
// `position: sticky` to the bottom of the screen beneath it. So the document is exactly as tall as the two of them
// (no margin trick, no fixed layer, no spacer) and the hand-over has nothing to switch: when the section has gone, the
// footer simply is where it always was. A footer taller than the screen sticks by its top instead (its sticky bottom
// is the screen height minus its own), so the lift uncovers its first screen and then the footer scrolls on.
// Every effect is painted from the raw scroll progress in onUpdate (Lenis already smooths the scroll), so the shadow,
// the tilt and the clip stay locked to the section's real edge and a fast flick never stacks states.
//
// Without scripts and under reduced motion nothing is sticky and nothing is hidden: the footer follows the page.
// Keyboard: a link in the footer that takes focus while the section still covers it scrolls the footer clear.
// The last section should be at least a screen tall; a shorter one still opens no gap, the footer just follows sooner.
import { useId, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../kit/gsap";
import { getLenis } from "../kit/SmoothScroll";

export const FOOTER_REVEAL_VARIANTS = [
  { id: "lift", title: "Optillen" },
  { id: "fold", title: "Omslaan" },
  { id: "iris", title: "Opening" },
] as const;

export type FooterRevealVariant = (typeof FOOTER_REVEAL_VARIANTS)[number]["id"];

type FooterLink = { label: string; href: string };

type Props = {
  variant?: FooterRevealVariant;
  /** The page's last section: the sheet that lifts away. */
  children: ReactNode;
  name: string;
  /** One short closing line. */
  line: string;
  email: string;
  /** As it is read, "+31 10 412 77 30"; the tel: link is made from its digits. */
  phone?: string;
  /** The street address, one entry per line. */
  address: string[];
  /** Three or four plain links. */
  links: FooterLink[];
  year?: number;
  className?: string;
};

/** The fold's largest tilt, in degrees, and its perspective as a share of the screen height. */
const TILT = 3.5;
const DEPTH = 2.4;
/** The iris: the slit's height in px, and the share of the width shut at each side while it is a slit. */
const SLIT = 3;
const SIDE_WIDE = 0.3;
const SIDE_PHONE = 0.14;
/** The name's rise inside the opening, as a share of its own height. */
const NAME_RISE = 0.55;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Where p sits inside the window [from, to], as 0 to 1. */
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out2 = gsap.parseEase("power2.out");
const out3 = gsap.parseEase("power3.out");
const inOut2 = gsap.parseEase("power2.inOut");

/** How deep the shade over the footer starts: lighter on a light ground, deeper on a dark one, or it does not show. */
function dimFor(el: HTMLElement) {
  const m = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return 0.35;
  const [r, g, b] = m.map(Number);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128 ? 0.6 : 0.32;
}

export function FooterReveal({
  variant = "lift",
  children,
  name,
  line,
  email,
  phone,
  address,
  links,
  year = new Date().getFullYear(),
  className = "",
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const iris = variant === "iris";

  useGSAP(
    () => {
      const el = root.current;
      const sheet = el?.querySelector<HTMLElement>("[data-fr-sheet]");
      const foot = el?.querySelector<HTMLElement>("[data-fr-foot]");
      if (!el || !sheet || !foot) return;
      const edge = el.querySelector<HTMLElement>("[data-fr-edge]");
      const shade = el.querySelector<HTMLElement>("[data-fr-shade]");
      const mark = el.querySelector<HTMLElement>("[data-fr-name]");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The measures every paint reads, taken again on every refresh: the screen, the footer, the part of the
        // footer the lift uncovers (all of it, or its first screen when it is taller), and the sheet.
        let vw = window.innerWidth;
        let vh = window.innerHeight;
        let footH = foot.offsetHeight;
        let reveal = Math.min(footH, vh);
        let sheetH = sheet.offsetHeight;
        let nameH = mark?.offsetHeight ?? 0;
        let dim = dimFor(foot);
        let p = 0;

        const measure = () => {
          vw = window.innerWidth;
          vh = window.innerHeight;
          footH = foot.offsetHeight;
          reveal = Math.min(footH, vh);
          sheetH = sheet.offsetHeight;
          nameH = mark?.offsetHeight ?? 0;
          dim = dimFor(foot);
          // A footer that fits sticks by its bottom; a taller one by its top, so its first screen is what lifts free.
          el.style.setProperty("--fr-bottom", `${Math.min(0, vh - footH)}px`);
          if (variant === "fold") sheet.style.transformOrigin = `50% ${Math.max(0, sheetH - vh)}px`;
        };

        const paint = () => {
          if (edge) edge.style.opacity = (within(p, 0, 0.05) * (1 - within(p, 0.8, 1))).toFixed(3);

          if (variant === "fold") {
            // The free bottom edge lifts toward the reader (a positive tilt), never away into the screen. The tilt rises
            // early and holds; where the section's edge still shows at rest (a footer shorter than
            // the screen), it lays flat again before the end, so the hand-over never shows a wedge.
            const flatten = clamp01((vh - reveal) / (0.2 * vh));
            const a = TILT * out2(within(p, 0, 0.45)) * (1 - flatten * inOut2(within(p, 0.55, 1)));
            sheet.style.transform = a > 0.005 ? `perspective(${Math.round(vh * DEPTH)}px) rotateX(${a.toFixed(3)}deg)` : "";
            if (shade) shade.style.opacity = (dim * (1 - inOut2(p))).toFixed(3);
          }

          if (iris) {
            if (p >= 1) {
              foot.style.clipPath = "none";
            } else {
              // In the footer's own pixels: the opening's bottom is the bottom of the screen, its top climbs from a
              // slit locked to the section's edge (no band of ground between them), and its sides open within the first fifth
              // of the move, so no line of text is ever cut at the opening's side.
              const height = SLIT + (reveal - SLIT) * p;
              const top = Math.max(0, reveal - height);
              const side = vw * (vw < 768 ? SIDE_PHONE : SIDE_WIDE) * (1 - out3(within(p, 0, 0.2)));
              foot.style.clipPath = `inset(${top.toFixed(1)}px ${side.toFixed(1)}px 0px ${side.toFixed(1)}px)`;
            }
            if (mark) {
              // The name rises once the opening has reached it, so the rise is seen.
              const e = out2(within(p, 0.6, 1));
              mark.style.transform = `translate3d(0, ${Math.round((1 - e) * nameH * NAME_RISE)}px, 0)`;
            }
          }
        };

        measure();
        el.dataset.live = variant;
        if (variant === "fold") sheet.style.willChange = "transform";

        const st = ScrollTrigger.create({
          trigger: el,
          // The sheet's bottom edge reaching the bottom of the screen, measured on the untransformed wrapper.
          start: () => `top+=${sheet.offsetHeight} bottom`,
          end: () => `+=${Math.min(foot.offsetHeight, window.innerHeight)}`,
          onRefresh: (self) => {
            measure();
            p = self.progress;
            paint();
          },
          onUpdate: (self) => {
            p = self.progress;
            paint();
          },
        });
        p = st.progress;
        paint();

        // The footer or the sheet changing height (a face landing, a line wrapping) moves the stretch: measure again.
        let frame = 0;
        const heights = [footH, sheetH];
        const ro = new ResizeObserver(() => {
          if (foot.offsetHeight === heights[0] && sheet.offsetHeight === heights[1]) return;
          heights[0] = foot.offsetHeight;
          heights[1] = sheet.offsetHeight;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        ro.observe(foot);
        ro.observe(sheet);

        // A link that takes focus while the sheet still covers the footer: scroll until the footer is clear (and,
        // in a tall footer, until the link itself is on screen).
        const onFocus = (e: FocusEvent) => {
          if (p >= 0.999) return;
          const target = e.target as HTMLElement;
          const below = target.getBoundingClientRect().bottom - foot.getBoundingClientRect().top;
          const over = vh - reveal + below - (vh - 24);
          const y = st.end + Math.max(0, over);
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(y, { duration: 0.7 });
          else window.scrollTo({ top: y });
        };
        foot.addEventListener("focusin", onFocus);

        return () => {
          foot.removeEventListener("focusin", onFocus);
          ro.disconnect();
          cancelAnimationFrame(frame);
          st.kill();
          delete el.dataset.live;
          el.style.removeProperty("--fr-bottom");
          sheet.style.transform = "";
          sheet.style.transformOrigin = "";
          sheet.style.willChange = "";
          foot.style.clipPath = "";
          if (edge) edge.style.opacity = "";
          if (shade) shade.style.opacity = "";
          if (mark) mark.style.transform = "";
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [variant] },
  );

  const tel = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  const link = "underline decoration-transparent underline-offset-[0.22em] transition-[text-decoration-color] duration-200 hover:decoration-current focus-visible:decoration-current";

  return (
    <div ref={root} data-footer-reveal={variant} className={className}>
      <div data-fr-sheet="">
        {children}
        {iris ? null : <div data-fr-edge="" aria-hidden />}
      </div>
      <footer
        data-fr-foot=""
        aria-labelledby={titleId}
        className={iris ? "scene-inverse" : "bg-surface-1 text-ink"}
      >
        {variant === "fold" ? <div data-fr-shade="" aria-hidden /> : null}
        <div className="relative flex min-h-svh flex-col px-sheet-margin pb-6 pt-[max(4rem,11svh)] md:pt-[max(4.5rem,13svh)]">
          <div className={iris ? "flex flex-col items-center text-center" : ""}>
            <h2
              id={titleId}
              data-fr-name=""
              className="m-0 text-[min(24vw,24svh)] leading-[0.86] tracking-[-0.04em] md:text-[min(13vw,25svh)]"
            >
              {name}
            </h2>
            <p className="m-0 mt-[3svh] max-w-[30ch] font-display text-h3 text-ink-muted">{line}</p>
          </div>

          <div aria-hidden className="min-h-[7svh] flex-1" />

          <div className="grid gap-7 border-t border-line pt-6 text-body md:grid-cols-12 md:gap-6">
            <address className="flex flex-col not-italic md:col-span-4">
              <a href={`mailto:${email}`} className={`text-lead text-ink ${link}`}>
                {email}
              </a>
              {tel ? (
                <a href={tel} className={`mt-1 text-ink-muted ${link}`}>
                  {phone}
                </a>
              ) : null}
            </address>
            <p className="m-0 text-ink-muted md:col-span-4">
              {address.map((part, i) => (
                <span key={part} className="block">
                  {part}
                  {i < address.length - 1 ? <span className="sr-only">, </span> : null}
                </span>
              ))}
            </p>
            <nav aria-label={`${name}, verder`} className="md:col-span-3 md:col-start-10">
              <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 md:flex-col">
                {links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className={`text-ink ${link}`}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <p className="m-0 mt-10 text-small text-ink-muted">
            © {year} {name}
          </p>
        </div>
      </footer>
    </div>
  );
}
