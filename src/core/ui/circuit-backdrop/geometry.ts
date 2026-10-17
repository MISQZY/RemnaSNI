import type { Point } from "./types";

/** Whether two lines stay at least `room` px from each other everywhere. */
export function apart(a: Point[], b: Point[], room: number) {
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
export function offset(points: Point[], distance: number): Point[] {
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
export function cut(points: Point[], length: number): Point[] {
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

export function lengthOf(points: Point[]) {
  return points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i]![0], y - points[i]![1]), 0);
}

export function pathOf(points: Point[]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
}

export function round(value: number, digits: number) {
  const k = 10 ** digits;
  return Math.round(value * k) / k;
}

/** The point `share` of the way along a line whose vertices are `at` of the way along it. */
export function pointAt(points: Point[], at: number[], share: number): Point {
  let i = 1;
  while (i < points.length - 1 && at[i]! < share) i++;
  const [ax, ay] = points[i - 1]!;
  const [bx, by] = points[i]!;
  const k = (share - at[i - 1]!) / (at[i]! - at[i - 1]! || 1);
  return [ax + (bx - ax) * k, ay + (by - ay) * k];
}
