// How Gems plays and what a gem is worth. RemnaWeb is the source of truth (lib/game/gems/rules.ts there): its rules
// come with the other games' from GET /api/sni/config under `gems` (config-server.ts). These types mirror it.
// Signed in, RemnaWeb deals the board and pays for the moves it replays; the numbers here size the board for playing
// without an account and show the prices before RemnaWeb's answer comes.

/** Price of gem number `n` (from 0) cleared in the country: base + step × n. */
export type ValueRule = { base: number; step: number };

export type GemsRules = {
  /** The board: `cols` wide and `rows` high, with gems of `colors` colors. */
  cols: number;
  rows: number;
  colors: number;
  /** The quickest a move can be made, ms (RemnaWeb's check). */
  minMoveMs: number;
  /** A gem cleared by a cascade is worth this much more per wave after the swap's own. */
  cascadeBonus: number;
  /** A golden gem is worth this many regular ones. */
  goldenMultiplier: number;
  value: ValueRule;
};

/**
 * The gems' skin bought in the RemnaWeb Mini App shop: their colors by color number (each color has its cut, crystal.tsx)
 * and whether they glow. Hex colors.
 */
export type GemsSkin = { colors: string[]; shine?: boolean };

/** The looks of Gems bought there: the gems' skin and the particles of a cleared gem; null for the default ones. */
export type GemsLook = { skin: GemsSkin | null; effect: string[] | null };

/** The gems without a bought skin, as the Mini App shop shows them: the fourth is the Qzr crystal's own green. */
export const DEFAULT_SKIN: GemsSkin = { colors: ["#ff4d6d", "#ff9f1c", "#ffd60a", "#2ee06a", "#3a86ff", "#a259ff", "#ff5cc8", "#22d3ee"] };

const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);

/** Whether RemnaWeb's `gems` rules have the shape the game relies on; an older RemnaWeb sends none. */
export function isGemsRules(v: unknown): v is GemsRules {
  const r = v as Record<string, unknown> | null;
  return (
    !!r &&
    typeof r === "object" &&
    ["cols", "rows", "colors", "minMoveMs", "cascadeBonus", "goldenMultiplier"].every((k) => isNum(r[k])) &&
    ["cols", "rows", "colors"].every((k) => Number.isInteger(r[k]) && (r[k] as number) >= 3) &&
    (r.colors as number) <= 8 &&
    !!r.value &&
    isNum((r.value as ValueRule).base) &&
    isNum((r.value as ValueRule).step)
  );
}

/** Qzr for `count` gems starting at number `from`. */
export const gemsValue = (from: number, count: number, v: ValueRule) => count * v.base + v.step * (count * from + (count * (count - 1)) / 2);

/** Price of gem number `n` (from 0), as RemnaWeb computes it. */
export const gemValue = (n: number, v: ValueRule) => v.base + v.step * n;

/**
 * Qzr for a wave of `cleared` gems (`golden` of them golden) from gem number `from`, cleared `wave` waves after the
 * swap's own, before the turbo: as RemnaWeb counts a chunk, which it pays at the chunk's average price.
 */
export function waveValue(rules: GemsRules, from: number, cleared: number, golden: number, wave: number, cascadeBonus = rules.cascadeBonus): number {
  if (cleared <= 0) return 0;
  const average = gemsValue(from, cleared, rules.value) / cleared;
  return average * (cleared * (1 + cascadeBonus * wave) + (rules.goldenMultiplier - 1) * golden);
}
