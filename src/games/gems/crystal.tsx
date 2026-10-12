import { memo } from "react";

// The gems of Gems, drawn like the Qzr crystal (core/ui/qzr-icon.tsx): faces in three tones of the gem's color, lit from
// the top left, with white glints and a dark rim. Every color has a cut of its own, so the gems tell apart by shape as
// well: the Qzr shard itself, a hexagon, a round brilliant, a rhombus, a trillion, a cluster of shards, an emerald cut
// and a pear. Drawn in a 100 × 100 box. A copy of this file is RemnaWeb's components/cosmetics/gems-crystal.tsx (the
// shop's preview): change both.

type Pt = [number, number];
/** A face: its points and its tone, l (lit), m (middle) or r (in shade), like the Qzr crystal's left, middle and right. */
type Face = { points: string; tone: "l" | "m" | "r" };
type Cut = { faces: Face[]; glints: string[] };

const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Where the light comes from: the top left. */
const LIGHT: Pt = [-0.6, -0.8];

/**
 * A cut seen from above: the girdle `outer` (clockwise), a table the same shape scaled by `table` around `c`, and a
 * facet between each side of the two, toned by how it faces the light.
 */
function ring(outer: Pt[], c: Pt = [50, 50], table = 0.52): Cut {
  const inner = outer.map(([x, y]): Pt => [c[0] + (x - c[0]) * table, c[1] + (y - c[1]) * table]);
  const faces: Face[] = outer.map((p, i) => {
    const q = outer[(i + 1) % outer.length];
    const mx = (p[0] + q[0]) / 2 - c[0];
    const my = (p[1] + q[1]) / 2 - c[1];
    const len = Math.hypot(mx, my) || 1;
    const lit = (mx * LIGHT[0] + my * LIGHT[1]) / len;
    return { points: pts([p, q, inner[(i + 1) % outer.length], inner[i]]), tone: lit > 0.3 ? "l" : lit < -0.3 ? "r" : "m" };
  });
  faces.push({ points: pts(inner), tone: "m" });
  // A glint on the lit edge of the table, and a fainter one across it.
  const top = inner.reduce((a, b) => (b[0] + b[1] < a[0] + a[1] ? b : a));
  const glints = [
    pts([top, [top[0] + (c[0] - top[0]) * 0.55, top[1] + (c[1] - top[1]) * 0.25], [top[0] + (c[0] - top[0]) * 0.25, top[1] + (c[1] - top[1]) * 0.55]]),
  ];
  return { faces, glints };
}

/** A regular polygon of `n` corners round `c`, the first at `start` degrees (0 is up), stretched by `sx`, `sy`. */
const polygon = (n: number, r: number, start = 0, c: Pt = [50, 50], sx = 1, sy = 1): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i - 90) * Math.PI) / 180;
    return [c[0] + Math.cos(a) * r * sx, c[1] + Math.sin(a) * r * sy];
  });

/** The Qzr crystal (qzr-icon.tsx) leaning 45°, its middle (256, 266) put in the middle of the box. */
const QZR_FIT = "translate(50 50) scale(0.33) translate(-256 -266)";
const QZR_SHARD = {
  left: "256,86 196,176 196,356 256,446",
  right: "256,86 316,176 316,356 256,446",
  middle: "256,86 226,176 226,392 256,446 286,392 286,176",
  glints: ["256,86 226,176 244,176", "208,196 218,196 218,330 208,322"],
};

/** Three shards out of one root, like the Qzr key's chip (chip-icon.tsx), in its 24 × 24 box. */
const CLUSTER: [string, string, string, string][] = [
  ["3.8,9.89 3.61,12.76 6.01,16.92 8.6,18.2", "3.8,9.89 6.39,11.16 8.79,15.32 8.6,18.2", "3.8,9.89 4.31,12.36 7.19,17.35 8.6,18.2 8.57,16.55 5.69,11.56", "3.8,9.89 4.31,12.36 4.72,12.12"],
  ["20.66,8.31 17.75,9.94 15.13,14.88 15.4,18.2", "20.66,8.31 20.93,11.63 18.3,16.57 15.4,18.2", "20.66,8.31 18.55,10.36 15.39,16.29 15.4,18.2 16.98,17.14 20.14,11.21", "20.66,8.31 18.55,10.36 19.03,10.61"],
  ["14.71,2.12 10.47,5.38 8.62,13.42 11,18.2", "14.71,2.12 17.1,6.91 15.24,14.95 11,18.2", "14.71,2.12 12.13,5.76 9.9,15.41 11,18.2 13.21,16.17 15.44,6.52", "14.71,2.12 12.13,5.76 13.12,5.99"],
];

const CUTS: Record<number, Cut> = {
  1: ring(polygon(6, 44, 0)),
  2: ring(polygon(8, 43, 22.5), [50, 50], 0.5),
  3: ring(polygon(4, 46, 0, [50, 50], 0.78, 1), [50, 50], 0.45),
  4: ring(polygon(3, 56, 0, [50, 60]), [50, 60], 0.46),
  6: ring([[30, 10], [70, 10], [82, 22], [82, 78], [70, 90], [30, 90], [18, 78], [18, 22]], [50, 50], 0.56),
  7: ring(
    [[50, 6], [64, 22], [77, 42], [82, 60], [76, 79], [62, 92], [38, 92], [24, 79], [18, 60], [23, 42], [36, 22]],
    [50, 62],
    0.5,
  ),
};

/** Shades of a hex color: mixed with white (`t` > 0) or black (`t` < 0). */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The three face gradients of a color, as the Qzr crystal's: lit, middle and in shade. */
function Gradients({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={shade(color, 0.72)} />
        <stop offset="1" stopColor={shade(color, 0.08)} />
      </linearGradient>
      <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(color, 0.38)} />
        <stop offset="1" stopColor={shade(color, -0.12)} />
      </linearGradient>
      <linearGradient id={`${id}-r`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(color, -0.08)} />
        <stop offset="1" stopColor={shade(color, -0.5)} />
      </linearGradient>
    </defs>
  );
}

/** The faces of cut `shape` in the gradients `id`, with its glints. */
function Body({ shape, id, rim }: { shape: number; id: string; rim: string }) {
  const fill = (tone: Face["tone"]) => `url(#${id}-${tone})`;
  if (shape === 0) {
    return (
      <g transform={`${QZR_FIT} rotate(45 256 266)`} stroke={rim} strokeWidth="6" strokeLinejoin="round">
        <polygon points={QZR_SHARD.left} fill={fill("l")} />
        <polygon points={QZR_SHARD.right} fill={fill("r")} />
        <polygon points={QZR_SHARD.middle} fill={fill("m")} />
        <polygon points={QZR_SHARD.glints[0]} fill="#fff" opacity="0.6" stroke="none" />
        <polygon points={QZR_SHARD.glints[1]} fill="#fff" opacity="0.3" stroke="none" />
      </g>
    );
  }
  if (shape === 5) {
    return (
      <g transform="translate(50 50) scale(5.2) translate(-12.3 -10.2)" stroke={rim} strokeWidth="0.45" strokeLinejoin="round">
        {CLUSTER.map(([l, r, m, glint], i) => (
          <g key={i}>
            <polygon points={l} fill={fill("l")} />
            <polygon points={r} fill={fill("r")} />
            <polygon points={m} fill={fill("m")} />
            <polygon points={glint} fill="#fff" opacity="0.6" stroke="none" />
          </g>
        ))}
      </g>
    );
  }
  const cut = CUTS[shape] ?? CUTS[2];
  return (
    <g stroke={rim} strokeWidth="1.6" strokeLinejoin="round">
      {cut.faces.map((f, i) => (
        <polygon key={i} points={f.points} fill={fill(f.tone)} />
      ))}
      {cut.glints.map((g, i) => (
        <polygon key={i} points={g} fill="#fff" opacity="0.65" stroke="none" />
      ))}
    </g>
  );
}

/** Colors of the star's shards, round the wheel. */
const STAR_COLORS = ["#ff4d6d", "#ffd60a", "#2ee06a", "#22d3ee", "#3a86ff", "#a259ff"];

/**
 * A gem: `color` its color (hex), `shape` its cut (the color's number); a line gem is the same crystal pierced by a
 * thin beam along its row or column, drawn behind it so the crystal stays whole, with small arrows in the gap past its
 * ends; a star is six shards of every color round a white core; a golden one has a gold rim and a sparkle.
 */
export const Crystal = memo(function Crystal({
  color,
  shape,
  kind = "plain",
  golden = false,
  id,
}: {
  color: string;
  shape: number;
  kind?: "plain" | "row" | "col" | "star";
  golden?: boolean;
  /** Unique on the page: the gradients are named after it. */
  id: string;
}) {
  if (kind === "star") {
    return (
      <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden>
        {STAR_COLORS.map((c, i) => (
          <Gradients key={c} id={`${id}-s${i}`} color={c} />
        ))}
        <defs>
          <radialGradient id={`${id}-core`}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STAR_COLORS.map((c, i) => (
          <g key={c} transform={`rotate(${i * 60} 50 50) translate(50 25) scale(0.4) rotate(-45) translate(-50 -50)`}>
            <Body shape={0} id={`${id}-s${i}`} rim={shade(c, -0.7)} />
          </g>
        ))}
        <circle cx="50" cy="50" r="22" fill={`url(#${id}-core)`} />
      </svg>
    );
  }
  const rim = golden ? "#fde68a" : shade(color, -0.72);
  const line = kind === "row" || kind === "col";
  return (
    <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden>
      <Gradients id={id} color={color} />
      {line && (
        // Behind the crystal: the beam shows only past its edges, as if it ran through it.
        <g transform={kind === "col" ? "rotate(90 50 50)" : undefined}>
          <polygon points="-4,50 8,45 92,45 104,50 92,55 8,55" fill={shade(color, 0.45)} opacity="0.35" />
          <polygon points="-2,50 10,48.2 90,48.2 102,50 90,51.8 10,51.8" fill="#fff" opacity="0.9" />
        </g>
      )}
      <Body shape={shape} id={id} rim={rim} />
      {line && (
        // Over the crystal's ends, in the gap between the cells: where the line goes.
        <g transform={kind === "col" ? "rotate(90 50 50)" : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-2 43 L-8 50 L-2 57 M102 43 L108 50 L102 57" stroke={shade(color, -0.6)} strokeWidth="5.5" />
          <path d="M-2 43 L-8 50 L-2 57 M102 43 L108 50 L102 57" stroke="#fff" strokeWidth="2.5" />
        </g>
      )}
      {golden && <path d="M80 4 L84 15 L95 19 L84 23 L80 34 L76 23 L65 19 L76 15 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />}
    </svg>
  );
});
