import { CLEARANCE, GAP, PULSE, RUNNING, SPEED } from "./constants";
import { apart, cut, lengthOf, offset, pathOf, round } from "./geometry";
import { seeded } from "./random";
import type { Line, Point } from "./types";

/**
 * One corner: buses of parallel lines coming in from the left and the top edges, each bending 45° on its way and
 * back, as on a circuit board, its lines stopping one by one, each at a pad. A bus goes down only where it keeps its
 * distance from those already there; otherwise it is laid again another way, or left out.
 */
export function layout(seed: number): Line[] {
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
