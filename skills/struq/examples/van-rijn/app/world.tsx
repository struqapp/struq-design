"use client";
// app/world.tsx: the signature. One roof behind the whole page, keyed by the page's beats.
//
// World is the fixed canvas behind the type; BeatCamera picks the angle for each beat; Framed keeps the roof whole and
// on the side the type leaves free. The roof is the kit's Roof, so every scene below only says how far it is built,
// whether it rains, and what the active service asks of it:
//   droog    the finished tile roof in the rain, the water running into the gutter; then the tiles lift off
//   lagen    built again from the rafters up, layer by layer (schedule.ts), then the rain comes back and runs off
//   werk     the active service row changes the roof: a tile lifted, the pitch, laid flat in bitumen, the gutter in the
//            rain, the lead round the chimney turned to the camera
//   lek      low and close in the rain
//   offerte  the order's own ground covers it
//
// The roof carries its own frame box, so Framed sizes it once and the pitch, the cover and the rain change freely.
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Color, MathUtils, type Group } from "three";
import { BeatCamera, BeatsProvider, Framed, Roof, World, useBeats, useTokenColor, type RoofCover, type Signal } from "@/components/struq/kit/gl";
import { site } from "@/lib/site";
import { BARE, LAGEN, OPENING, between, lagenBuild } from "./scenes/schedule";

const smooth01 = (t: number) => t * t * (3 - 2 * t);

/** About one screen's height in the roof's own units, at the sizes Framed gives it here. */
const SCREEN = 3.3;

/**
 * How far (in screens) the roof must rise so the top of `selector` stays below `line` (a share of the screen from the
 * top): 0 while the element is lower than that line, or when there is none.
 */
function clearAbove(selector: string, line: number) {
  if (!line) return 0;
  const el = document.querySelector(selector);
  if (!el) return 0;
  const top = el.getBoundingClientRect().top / window.innerHeight;
  return Math.max(0, line - top);
}
const signal = (get: () => number): Signal => ({
  get current() {
    return get();
  },
});

/** The service row Werk has active: the scene writes it on its section. */
const activeRow = () => Number(document.querySelector<HTMLElement>("[data-beat='werk']")?.dataset.row ?? -1);

function House() {
  const { beat, on } = useBeats();
  const s = useMemo(() => ({ droog: beat("droog"), lagen: beat("lagen"), lagenOn: on("lagen"), werk: on("werk"), lek: on("lek") }), [beat, on]);
  // On a phone Framed gives the roof 0.7 of the screen's width: a tighter frame box lets it fill that share.
  const phone = useThree((st) => st.size.width / Math.max(1, st.size.height) < 0.8);
  // Fired clay: the palette's oxblood, browned toward the ground, so the tiles belong to the page and never read as
  // the buttons' red.
  const accent = useTokenColor("--accent", "#7c2a20");
  const tileColor = useMemo(() => `#${accent.clone().lerp(new Color("#6b4a3a"), 0.45).getHexString()}`, [accent]);
  const [cover, setCover] = useState<RoofCover>("tile");
  // What the active service asks of the roof, damped so a new row eases the roof over.
  const ask = useRef({ pitch: 40, lift: 0, rain: 0, turn: 0, zoom: 1, fx: 0, fy: 0, fz: 0 });
  // Framed measures the roof's frame box once, at scale 1; this group then moves the roof closer or out of the way.
  const closer = useRef<Group>(null);

  useFrame((_, delta) => {
    const row = s.werk.current > 0.5 ? activeRow() : -1;
    const want = row >= 0 ? site.werk.services[row]?.roof : undefined;
    const next = want?.cover ?? "tile";
    if (next !== cover) setCover(next);
    const a = ask.current;
    a.pitch = MathUtils.damp(a.pitch, want?.pitch ?? 40, 2.4, delta);
    a.lift = MathUtils.damp(a.lift, want?.lift ?? 0, 3, delta);
    a.rain = MathUtils.damp(a.rain, want?.rain ?? 0, 2, delta);
    a.turn = MathUtils.damp(a.turn, want?.turn ?? 0, 2, delta);
    // A closer look at what the service fixes: the roof grows about that point and brings it to the middle.
    const [fx, fy, fz] = want?.focus ?? [0, 0, 0];
    a.zoom = MathUtils.damp(a.zoom, want?.zoom ?? 1, 2.2, delta);
    a.fx = MathUtils.damp(a.fx, fx, 2.2, delta);
    a.fy = MathUtils.damp(a.fy, fy, 2.2, delta);
    a.fz = MathUtils.damp(a.fz, fz, 2.2, delta);
    const g = closer.current;
    if (g) {
      const w = s.werk.current;
      // On a phone Werk's rows fill the screen: the roof rises out of the frame while they pass, and comes back. At
      // the end the roof rises ahead of the close's type (on a phone) and the footer, so no edge ever cuts it.
      const away = (phone ? smooth01(w) * 3.2 : 0) + SCREEN * Math.max(clearAbove("[data-world-clear]", phone ? 0.5 : 0), clearAbove("footer", 0.98));
      const z = 1 + (a.zoom - 1) * w;
      g.scale.setScalar(z);
      g.position.set(-a.fx * (z - 1), -a.fy * (z - 1) + away, -a.fz * (z - 1));
    }
  });

  const signals = useMemo(() => {
    // Stripped down to the rafters in the opening's last screen, built up again from there in Lagen.
    const build = signal(() => {
      const l = s.lagen.current;
      if (l > 0) return lagenBuild(l);
      return 1 - (1 - BARE) * between(s.droog.current, OPENING.stripFrom, OPENING.stripTo);
    });
    const rain = signal(() => {
      const opening = 1 - between(s.droog.current, OPENING.rainFrom, OPENING.rainTo);
      const lagen = between(s.lagen.current, LAGEN.rainFrom, LAGEN.rainTo) * s.lagenOn.current;
      return Math.max(opening, lagen, ask.current.rain * s.werk.current, s.lek.current);
    });
    return {
      build,
      rain,
      pitch: signal(() => ask.current.pitch),
      lift: signal(() => ask.current.lift),
      // A three-quarter view: the gable's section turned toward the camera, further while the layers are named, and
      // nearer square-on for the leak, where the roof stands on the left and must keep inside the frame.
      turn: signal(() => -0.62 - 0.32 * s.lagenOn.current + 0.36 * s.lek.current + ask.current.turn * s.werk.current),
    };
  }, [s]);

  return (
    <group ref={closer}>
      <Roof
      cover={cover}
      pitch={signals.pitch}
      build={signals.build}
      rain={signals.rain}
      lift={signals.lift}
      turn={signals.turn}
      chimney
      frame={phone ? [1.9, 1.2, 1.95] : undefined}
      colors={{ tile: tileColor }}
      />
    </group>
  );
}

/**
 * The wall in the page's own ground. World's wall is a raw shader: with the post stack off it is written to the
 * screen as it is, so it is given the ground already encoded once more, and it lands on the exact bone of the page.
 * (With the post stack on, its tone mapping greys a light ground: a dark palette can keep it, a light one cannot.)
 */
const encoded = (c: Color) => `#${c.clone().convertLinearToSRGB().getHexString()}`;

function Scene() {
  const ground = useTokenColor("--surface-0", "#f5f1ec");
  const light = useTokenColor("--surface-1", "#fdfbf8");
  return (
    <World light="daylight" post={false} ground={encoded(ground)} glow={encoded(light)} pool={0.3} label={site.world.label}>
      {/* A low sun from the left rakes across the rows of tiles. */}
      <directionalLight position={[-4, 5, 3]} intensity={2.2} color="#fff3e3" />
      <hemisphereLight args={["#f6efe6", "#6b5a4c", 0.5]} />
      <BeatCamera
        keys={{
          droog: { position: [0.5, 2.7, 7.8], target: [0, 0, 0] },
          lagen: { position: [0.9, 1.7, 8.1], target: [0, 0.05, 0] },
          werk: { position: [0.3, 3.3, 7.4], target: [0, 0, 0] },
          lek: { position: [0.2, 0.6, 8.3], target: [0, 0.1, 0] },
          offerte: { position: [0.6, 2.2, 8], target: [0, 0, 0] },
        }}
      />
      <Framed side={{ droog: "right", lagen: "right", werk: "right", lek: "left", offerte: "right" }} size={{ droog: 0.62, lagen: 0.72, werk: 0.5, lek: 0.56, offerte: 0.5 }} phoneSize={0.34}>
        <House />
      </Framed>
    </World>
  );
}

export default function PageWorld() {
  return (
    <BeatsProvider>
      <Scene />
    </BeatsProvider>
  );
}
