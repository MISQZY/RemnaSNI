export type Point = [number, number];

/**
 * A trace: its path, its vertices and how far along it each one is (shares of its length), and its pulse: the pulse's
 * length (a share of the line's), its cycle and where in the cycle it starts, in seconds.
 */
export type Line = { d: string; points: Point[]; at: number[]; end: Point; dash: number; cycle: number; delay: number };
