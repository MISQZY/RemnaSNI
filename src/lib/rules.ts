import type { AchievementDef, AchievementStat, GameConfig, UpgradeDef, UpgradeKind } from "@/lib/config";
import type { GameState as Progress } from "@/lib/game";

// How the game applies the GameConfig loaded from RemnaWeb. Mirrors RemnaWeb/src/lib/clicker/rules.ts, which applies
// the same config in the Mini App; keep both in step when a formula or a rule type changes.

export type TapInfo = { gain: number; crit: boolean; /** Taps within the frenzy window, this one included. */ burst: number; hour: number };

export const level = (s: Progress, id: string) => s.levels[id] ?? 0;

export const upgradeCost = (u: UpgradeDef, lvl: number) => Math.ceil(u.baseCost * u.growth ** lvl);

const sum = (c: GameConfig, s: Progress, kind: UpgradeKind) =>
  c.upgrades.filter((u) => u.kind === kind).reduce((acc, u) => acc + u.amount * level(s, u.id), 0);

export const incomeMultiplier = (c: GameConfig, s: Progress) => 1 + sum(c, s, "boost");
export const perTap = (c: GameConfig, s: Progress) => (1 + sum(c, s, "tap")) * incomeMultiplier(c, s);
export const critChance = (c: GameConfig, s: Progress) => sum(c, s, "crit");
export const critMultiplier = (c: GameConfig, s: Progress) => c.baseCritMultiplier + sum(c, s, "critPower");

function statValue(c: GameConfig, s: Progress, stat: AchievementStat): number {
  switch (stat) {
    case "upgradeLevels":
      return c.upgrades.reduce((acc, u) => acc + level(s, u.id), 0);
    case "upgradeKinds":
      return c.upgrades.filter((u) => level(s, u.id) > 0).length;
    default:
      return s[stat];
  }
}

export function isUnlocked(c: GameConfig, a: AchievementDef, s: Progress, tap?: TapInfo): boolean {
  const r = a.rule;
  switch (r.type) {
    case "stat":
      return statValue(c, s, r.stat) >= r.target;
    case "upgrade":
      return level(s, r.upgrade) >= r.target;
    case "burst":
      return !!tap && tap.burst >= r.taps;
    case "hour":
      return !!tap && tap.hour >= r.from && tap.hour < r.to;
  }
}

/** Current value and target of a counting achievement, for a progress bar; null for the others. */
export function achievementProgress(c: GameConfig, a: AchievementDef, s: Progress): [number, number] | null {
  if (a.rule.type !== "stat") return null;
  return [Math.min(statValue(c, s, a.rule.stat), a.rule.target), a.rule.target];
}

/** Ids of the achievements `s` (after `tap`, if any) newly unlocks. */
export const newlyUnlocked = (c: GameConfig, s: Progress, tap?: TapInfo) =>
  c.achievements.filter((a) => !s.achievements[a.id] && isUnlocked(c, a, s, tap)).map((a) => a.id);
