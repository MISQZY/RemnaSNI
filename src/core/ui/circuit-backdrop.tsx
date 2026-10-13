"use client";

// Faint circuit traces in the corners of the page, with data pulsing slowly along them: a background echoing the
// circuit under the Qzyrium crystal on the website's home page. The same file lives in RemnaWeb and RemnaSNI.
//
// The traces are laid out once, from fixed seeds, so the server and the browser draw the same picture. They are two
// layers: the still traces, an SVG painted once, and the pulses over them, drawn on a canvas a few dozen times a
// second. Animating the SVG itself would repaint every trace, its fading mask and any glass blurring it on every
// frame. Each corner is one layout drawn for the top-left corner and mirrored into its place, fading out towards the
// middle of the page so it never reaches the content.

import { useEffect, useRef } from "react";

type Point = [number, number];

/** The drawing of one corner, in px at the default 16px rem; it grows with the rem, as the page does on large screens. */
const WIDTH = 480;
const HEIGHT = 360;
/** The distance between the lines of a bus, and the least room kept between buses. */
const GAP = 9;
const CLEARANCE = 2.5 * GAP;
/** The speed of the pulses in px per second, and a pulse's length. */
const SPEED = 26;
const PULSE = 22;
/**
 * The share of its cycle a pulse spends running to its pad, then draining into it, its pad lighting up as it lands;
 * for the rest of the cycle its line rests.
 */
const RUNNING = 0.4;
const DRAIN = 0.04;
/**
 * How often the pulses are drawn. They creep along at well under a pixel a frame, so drawing them on every frame of
 * the screen would show nothing more.
 */
const FPS = 30;

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Two corners across from each other everywhere; the other two only where the window is big enough for the four not
// to meet.
const FULL_ONLY = "max-lg:hidden [@media(max-height:46rem)]:hidden";
const CORNERS: { corner: Corner; seed: number; className?: string }[] = [
  { corner: "top-left", seed: 11 },
  { corner: "top-right", seed: 23, className: FULL_ONLY },
  { corner: "bottom-left", seed: 37, className: FULL_ONLY },
  { corner: "bottom-right", seed: 51 },
];

const PLACE: Record<Corner, string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0 -scale-x-100",
  "bottom-left": "bottom-0 left-0 -scale-y-100",
  "bottom-right": "right-0 bottom-0 -scale-100",
};

const LAYOUTS = CORNERS.map(({ seed }) => layout(seed));

/**
 * The backdrop. Its root is positioned by the caller (fixed to the window, or sticky in a scrolling column) and
 * lies under the content; it never takes the pointer.
 */
export function CircuitBackdrop({ className = "" }: { className?: string }) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => animate(canvases.current), []);

  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden select-none ${className}`}>
      {CORNERS.map(({ corner, className: extra = "" }, i) => (
        <div
          key={corner}
          style={{ width: `${WIDTH / 16}rem`, height: `${HEIGHT / 16}rem` }}
          className={`absolute ${PLACE[corner]} ${extra}`}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            fill="none"
            className="absolute inset-0 size-full [mask-image:radial-gradient(circle_at_0_0,black_15%,transparent_70%)]"
          >
            {LAYOUTS[i]!.map(({ d, end }, j) => (
              <g key={j} className="stroke-primary opacity-[0.16]">
                <path d={d} />
                <circle cx={end[0]} cy={end[1]} r={3} className="fill-background" />
              </g>
            ))}
          </svg>
          {/* Its color is read from its own `color`, so the pulses follow the theme. */}
          <canvas
            ref={(el) => {
              canvases.current[i] = el;
            }}
            className="absolute inset-0 size-full text-primary motion-reduce:hidden"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Runs the pulses on the corners' canvases until the returned function stops them; with reduced motion, never starts.
 * Hidden corners have no size and are skipped; in a hidden tab the browser holds the frames back on its own.
 */
function animate(canvases: (HTMLCanvasElement | null)[]) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // The canvases are sized in device pixels, so the pulses stay sharp; resizing a canvas clears it.
  const resize = new ResizeObserver((entries) => {
    for (const { target, contentRect, devicePixelContentBoxSize } of entries) {
      const canvas = target as HTMLCanvasElement;
      const box = devicePixelContentBoxSize?.[0];
      canvas.width = box ? box.inlineSize : Math.round(contentRect.width * devicePixelRatio);
      canvas.height = box ? box.blockSize : Math.round(contentRect.height * devicePixelRatio);
    }
  });
  for (const canvas of canvases) {
    if (!canvas) continue;
    try {
      resize.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      resize.observe(canvas);
    }
  }

  let frame = 0;
  let drawn = -Infinity;
  let color = "";
  let colorRead = -Infinity;
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    // A little slack, so a 60 Hz screen does not skip a frame too many now and then.
    if (now - drawn < 1000 / FPS - 2) return;
    drawn = now;
    // The color changes with the theme, rarely: looked up twice a second rather than on every frame.
    if (now - colorRead > 500) {
      colorRead = now;
      const first = canvases.find(Boolean);
      if (first) color = getComputedStyle(first).color;
    }
    canvases.forEach((canvas, i) => canvas && draw(canvas, LAYOUTS[i]!, now / 1000, color));
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
  };
}

/** The pulses and the lit pads of one corner at `time` s, faded out towards the middle of the page as the traces are. */
function draw(canvas: HTMLCanvasElement, lines: Line[], time: number, color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  for (const line of lines) {
    // One clock for the pulse and its pad, so the pad lights up just as the pulse lands in it.
    const t = (((time - line.delay) % line.cycle) + line.cycle) % line.cycle / line.cycle;
    // Where the pulse's head is along its line, from 0 to 1: running to the pad, then past it as its tail drains in.
    const head = t < RUNNING ? t / RUNNING : t < RUNNING + DRAIN ? 1 + (line.dash * (t - RUNNING)) / DRAIN : undefined;
    if (head !== undefined) {
      ctx.globalAlpha = 0.6;
      stroke(ctx, line, Math.max(0, head - line.dash), Math.min(1, head));
    }
    // The pad flares up in a moment as the pulse lands, then dims slowly.
    const lit = t < 0.39 ? 0 : t < 0.41 ? (t - 0.39) / 0.02 : t < 0.6 ? (0.6 - t) / 0.19 : 0;
    if (lit > 0) {
      ctx.globalAlpha = 0.25 * lit;
      dot(ctx, line.end, 6);
      ctx.globalAlpha = lit;
      dot(ctx, line.end, 2);
    }
  }

  // The same fade as the mask over the traces: a circle from the corner, as far as the farthest corner of the drawing.
  const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(WIDTH, HEIGHT));
  fade.addColorStop(0.15, "#000");
  fade.addColorStop(0.7, "transparent");
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/** The stretch of a line from `from` to `to`, as shares of its length. */
function stroke(ctx: CanvasRenderingContext2D, { points, at }: Line, from: number, to: number) {
  if (to <= from) return;
  ctx.beginPath();
  ctx.moveTo(...pointAt(points, at, from));
  for (let i = 1; i < points.length - 1; i++) if (at[i]! > from && at[i]! < to) ctx.lineTo(...points[i]!);
  ctx.lineTo(...pointAt(points, at, to));
  ctx.stroke();
}

/** The point `share` of the way along a line whose vertices are `at` of the way along it. */
function pointAt(points: Point[], at: number[], share: number): Point {
  let i = 1;
  while (i < points.length - 1 && at[i]! < share) i++;
  const [ax, ay] = points[i - 1]!;
  const [bx, by] = points[i]!;
  const k = (share - at[i - 1]!) / (at[i]! - at[i - 1]! || 1);
  return [ax + (bx - ax) * k, ay + (by - ay) * k];
}

function dot(ctx: CanvasRenderingContext2D, [x, y]: Point, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * One corner: buses of parallel lines coming in from the left and the top edges, each bending 45° on its way and
 * back, as on a circuit board, its lines stopping one by one, each at a pad. A bus goes down only where it keeps its
 * distance from those already there; otherwise it is laid again another way, or left out.
 */
function layout(seed: number) {
  const random = seeded(seed);
  const range = (min: number, max: number) => min + random() * (max - min);
  const placed: Point[][] = [];
  const plans: { edge: "left" | "top"; from: number; to: number }[] = [
    { edge: "left", from: 50, to: 170 },
    { edge: "top", from: 110, to: 320 },
    { edge: "left", from: 200, to: 300 },
    { edge: "top", from: 330, to: 440 },
  ];
  for (const { edge, from, to } of plans) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const lines = bus(random, edge, range(from, to));
      if (lines.every((line) => placed.every((other) => apart(line, other, CLEARANCE)))) {
        placed.push(...lines);
        break;
      }
    }
  }

  return placed.map((raw): Line => {
    const points = raw.map(([x, y]) => [round(x, 1), round(y, 1)] as Point);
    const length = lengthOf(points);
    const cycle = length / SPEED / RUNNING;
    return {
      d: pathOf(points),
      points,
      at: points.map((_, i) => lengthOf(points.slice(0, i + 1)) / length),
      end: points.at(-1)!,
      dash: PULSE / length,
      cycle,
      // Started part way through its cycle, so the pulses are already spread out when the page opens.
      delay: -random() * cycle,
    };
  });
}

/**
 * A trace: its path, its vertices and how far along it each one is (shares of its length), and its pulse: the pulse's
 * length (a share of the line's), its cycle and where in the cycle it starts, in seconds.
 */
type Line = { d: string; points: Point[]; at: number[]; end: Point; dash: number; cycle: number; delay: number };

/** A bus of 3–5 lines, entering at `at` px along the given edge. */
function bus(random: () => number, edge: "left" | "top", at: number): Point[][] {
  const range = (min: number, max: number) => min + random() * (max - min);
  const count = 3 + Math.floor(random() * 3);
  const straight = range(20, 90);
  const diagonal = range(30, 90);
  const rest = range(90, 220);
  // Bending away from the other edge when close to it.
  const turn = at < 90 || random() < 0.6 ? 1 : -1;
  // The middle of the bus, running along +x from just outside the edge.
  const middle: Point[] = [
    [-10, 0],
    [straight, 0],
    [straight + diagonal, turn * diagonal],
    [straight + diagonal + rest, turn * diagonal],
  ];
  const full = lengthOf(middle);
  return Array.from({ length: count }, (_, i) => {
    const line = cut(offset(middle, (i - (count - 1) / 2) * GAP), full - range(0, rest * 0.7));
    return line.map(([x, y]) => (edge === "left" ? [x, at + y] : [at + y, x]) as Point);
  });
}

/** Whether two lines stay at least `room` px from each other everywhere. */
function apart(a: Point[], b: Point[], room: number) {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentDistance(a[i - 1]!, a[i]!, b[j - 1]!, b[j]!) < room) return false;
    }
  }
  return true;
}

function segmentDistance(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) return 0;
  return Math.min(pointDistance(a, c, d), pointDistance(b, c, d), pointDistance(c, a, b), pointDistance(d, a, b));
}

/** The distance from `p` to the segment from `a` to `b`. */
function pointDistance(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** The line `distance` px to the left of `points` (mitred at the bends, so it stays parallel). */
function offset(points: Point[], distance: number): Point[] {
  const normal = (a: Point, b: Point): Point => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
  };
  return points.map((p, i) => {
    const before = i > 0 ? normal(points[i - 1]!, p) : undefined;
    const after = i < points.length - 1 ? normal(p, points[i + 1]!) : undefined;
    const a = (before ?? after)!;
    const b = (after ?? before)!;
    const sum = Math.hypot(a[0] + b[0], a[1] + b[1]);
    const n: Point = [(a[0] + b[0]) / sum, (a[1] + b[1]) / sum];
    const scale = distance / (n[0] * a[0] + n[1] * a[1]);
    return [p[0] + n[0] * scale, p[1] + n[1] * scale];
  });
}

/** `points` up to `length` px along them. */
function cut(points: Point[], length: number): Point[] {
  const out: Point[] = [points[0]!];
  let left = length;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    const step = Math.hypot(bx - ax, by - ay);
    if (step >= left) {
      out.push([ax + ((bx - ax) * left) / step, ay + ((by - ay) * left) / step]);
      return out;
    }
    out.push(points[i]!);
    left -= step;
  }
  return out;
}

function lengthOf(points: Point[]) {
  return points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i]![0], y - points[i]![1]), 0);
}

function pathOf(points: Point[]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
}

function round(value: number, digits: number) {
  const k = 10 ** digits;
  return Math.round(value * k) / k;
}

/** A repeatable sequence of random numbers in [0, 1) (mulberry32). */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
