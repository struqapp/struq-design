// app/scenes/Paintings.tsx: the paintings inside the example museum and archive pages, drawn in the site's own manner
// (flat fields of colour, a horizon, a few shapes; no gradients), so the pages show a collection in use instead of
// stock textures. They are illustrations of the trade, like the pages that hold them: no real work, no real artist.
type Kind = "sea" | "canal" | "interior" | "dunes" | "harbour" | "still";

const C = {
  sky: "#cfc8b4",
  cloud: "#e4dccb",
  sea: "#56625f",
  deep: "#3c4643",
  foam: "#d9d2bf",
  umber: "#4a3826",
  dark: "#2a2119",
  dusk: "#cf9558",
  amber: "#e6b06a",
  ochre: "#a9824a",
  cream: "#efe6d2",
  clay: "#9c4a34",
  slate: "#7a827d",
};

function Scene({ kind }: { kind: Kind }) {
  switch (kind) {
    case "sea":
      return (
        <>
          <rect width="100" height="125" fill={C.sky} />
          <ellipse cx="30" cy="30" rx="26" ry="9" fill={C.cloud} />
          <ellipse cx="70" cy="44" rx="30" ry="8" fill={C.cloud} />
          <rect y="70" width="100" height="55" fill={C.sea} />
          <rect y="96" width="100" height="29" fill={C.deep} />
          <path d="M0 80 Q12 76 24 80 T48 80 T72 80 T100 80M0 90 Q14 86 28 90 T56 90 T100 90" stroke={C.foam} strokeWidth="0.8" fill="none" opacity="0.7" />
          <path d="M60 70 L60 44 L74 66 Z" fill={C.cream} />
          <path d="M60 46 L50 66 L60 66 Z" fill={C.foam} />
          <path d="M48 70 L76 70 L72 74 L52 74 Z" fill={C.dark} />
        </>
      );
    case "canal":
      return (
        <>
          <rect width="100" height="125" fill={C.dusk} />
          <rect y="0" width="100" height="22" fill={C.amber} opacity="0.5" />
          <path d="M0 78 V40 h10 v-6 h4 v-6 h6 v6 h4 v6 h8 V30 q8 -10 16 0 V78 Z" fill={C.umber} />
          <path d="M48 78 V36 h6 v-6 h10 v6 h6 V44 h14 v-8 h6 v8 h10 V78 Z" fill={C.dark} />
          <rect x="22" y="52" width="5" height="8" fill={C.amber} />
          <rect x="70" y="58" width="5" height="8" fill={C.amber} />
          <rect y="78" width="100" height="47" fill={C.umber} />
          <rect y="80" width="100" height="10" fill={C.dark} opacity="0.6" />
          <rect x="22" y="84" width="5" height="16" fill={C.amber} opacity="0.55" />
          <rect x="70" y="84" width="5" height="12" fill={C.amber} opacity="0.55" />
          <path d="M0 104 h100 M0 112 h100" stroke={C.dusk} strokeWidth="0.6" opacity="0.5" />
        </>
      );
    case "interior":
      return (
        <>
          <rect width="100" height="125" fill={C.ochre} />
          <rect x="8" y="14" width="30" height="46" fill={C.cream} />
          <path d="M23 14 v46 M8 37 h30" stroke={C.umber} strokeWidth="1.2" />
          <path d="M38 60 L74 70 L74 22 L38 14 Z" fill={C.cream} opacity="0.25" />
          <rect y="84" width="100" height="41" fill={C.umber} />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${i * 25 - 10} 125 L${i * 25 + 8} 84`} stroke={C.cream} strokeWidth="0.5" opacity="0.4" />
          ))}
          <path d="M0 98 h100 M0 112 h100" stroke={C.cream} strokeWidth="0.5" opacity="0.4" />
          <rect x="54" y="62" width="30" height="4" fill={C.dark} />
          <rect x="57" y="66" width="2.5" height="20" fill={C.dark} />
          <rect x="79" y="66" width="2.5" height="20" fill={C.dark} />
          <path d="M62 62 q4 -12 8 0 Z" fill={C.clay} />
        </>
      );
    case "dunes":
      return (
        <>
          <rect width="100" height="125" fill={C.cloud} />
          <ellipse cx="62" cy="34" rx="34" ry="12" fill={C.sky} />
          <path d="M0 76 Q30 62 56 74 T100 70 V125 H0 Z" fill={C.ochre} />
          <path d="M0 92 Q36 80 70 94 T100 90 V125 H0 Z" fill={C.umber} />
          <path d="M76 70 V58 l2 -8 l2 8 V70 Z" fill={C.dark} />
          <rect y="110" width="100" height="15" fill={C.dark} />
        </>
      );
    case "harbour":
      return (
        <>
          <rect width="100" height="125" fill={C.slate} />
          <rect y="72" width="100" height="53" fill={C.deep} />
          {[18, 40, 66, 84].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 72 V${24 + i * 6}`} stroke={C.dark} strokeWidth="1" />
              <path d={`M${x - 8} 72 h16 l-3 6 h-10 Z`} fill={C.dark} />
              <path d={`M${x} ${30 + i * 6} h${7 - i}`} stroke={C.dark} strokeWidth="0.7" />
            </g>
          ))}
          <path d="M0 86 h100 M0 98 h100" stroke={C.slate} strokeWidth="0.6" />
        </>
      );
    default:
      return (
        <>
          <rect width="100" height="125" fill={C.dark} />
          <rect y="82" width="100" height="43" fill={C.umber} />
          <path d="M30 82 V58 q-6 -4 0 -12 h14 q6 8 0 12 V82 Z" fill={C.slate} />
          <circle cx="60" cy="76" r="6" fill={C.amber} />
          <circle cx="70" cy="78" r="4.5" fill={C.clay} />
          <path d="M14 82 q10 -8 22 0 Z" fill={C.cream} opacity="0.8" />
        </>
      );
  }
}

/** A small painting, cropped to its box like a photo (object-cover), with a hairline frame. */
export function Painting({ kind, label }: { kind: Kind; label: string }) {
  return (
    <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="absolute inset-0 h-full w-full">
      <Scene kind={kind} />
      <rect x="0.5" y="0.5" width="99" height="124" fill="none" stroke={C.dark} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** The collection the archive page shows: six works with their titles. */
export const COLLECTION: { kind: Kind; title: string }[] = [
  { kind: "sea", title: "Calm off the coast" },
  { kind: "canal", title: "Canal at dusk" },
  { kind: "interior", title: "Room with a window" },
  { kind: "dunes", title: "Dunes and a spire" },
  { kind: "harbour", title: "The harbour, morning" },
  { kind: "still", title: "Still life with a jug" },
];
