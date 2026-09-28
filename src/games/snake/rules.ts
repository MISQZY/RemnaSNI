// How the snake plays and what a crystal is worth. RemnaWeb is the source of truth (lib/snake-rules.ts there):
// its rules come with the clicker's from GET /api/sni/config under `snake` (config-server.ts). These types mirror it.

/** Price of crystal number `n` (from 0): base + step × n. */
export type ValueRule = { base: number; step: number };

/** How the snake plays: the board is `grid` × `grid`, a step gets `speedupMs` shorter per crystal down to `minStepMs`. */
export type SnakeRules = {
  grid: number;
  startStepMs: number;
  minStepMs: number;
  speedupMs: number;
  /** A golden crystal is worth this many regular ones. */
  goldenMultiplier: number;
  value: ValueRule;
};

/**
 * A snake's skin bought in the RemnaWeb Mini App shop, drawn on the canvas: the head, the body from its neck to the
 * tail's end, the halo of the head, as hex colors; `rainbow` runs the hues along the body instead.
 */
export type SnakeSkin = { head: string; body: string; tail: string; glow: string; rainbow?: boolean };

/** The snake's looks bought there: its skin and the particles of an eaten crystal; null for the default ones. */
export type SnakeLook = { skin: SnakeSkin | null; effect: string[] | null };

const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);

/** Whether RemnaWeb's `snake` rules have the shape the game relies on; an older RemnaWeb sends none. */
export function isSnakeRules(v: unknown): v is SnakeRules {
  const r = v as Record<string, unknown> | null;
  return (
    !!r &&
    typeof r === "object" &&
    ["grid", "startStepMs", "minStepMs", "speedupMs", "goldenMultiplier"].every((k) => isNum(r[k])) &&
    Number.isInteger(r.grid) &&
    (r.grid as number) >= 4 &&
    (r.minStepMs as number) > 0 &&
    !!r.value &&
    isNum((r.value as ValueRule).base) &&
    isNum((r.value as ValueRule).step)
  );
}

/** Price of crystal number `n` (from 0), as RemnaWeb computes it. */
export const crystalValue = (n: number, v: ValueRule) => v.base + v.step * n;

/** Qzr for `count` crystals starting at number `from`. */
export function crystalsValue(from: number, count: number, v: ValueRule): number {
  let sum = 0;
  for (let n = from; n < from + count; n++) sum += crystalValue(n, v);
  return sum;
}
