import type { AchievementDef, AchievementStat, GameConfig, LadderDef, LadderStat, PerkDef, PerkKind, Text, UpgradeDef, UpgradeKind } from "@/lib/config";
import type { GameState as Progress } from "@/lib/game";

// How the game applies the GameConfig loaded from RemnaWeb. Mirrors RemnaWeb/src/lib/clicker/rules.ts, which applies
// the same config in the Mini App; keep both in step when a formula or a rule type changes.

export type TapInfo = { gain: number; crit: boolean; /** Taps within the frenzy window, this one included. */ burst: number; hour: number };

export const level = (s: Progress, id: string) => s.levels[id] ?? 0;
export const perkLevel = (s: Progress, id: string) => s.perks?.[id] ?? 0;

/** Price of level `lvl + 1` before prestige discounts. */
export const upgradeCost = (u: UpgradeDef, lvl: number) => Math.ceil(u.baseCost * u.growth ** lvl);

const sum = (c: GameConfig, s: Progress, kind: UpgradeKind) =>
  c.upgrades.filter((u) => u.kind === kind).reduce((acc, u) => acc + u.amount * level(s, u.id), 0);

const perkSum = (c: GameConfig, s: Progress, kind: PerkKind) =>
  c.prestige.perks.filter((p) => p.kind === kind).reduce((acc, p) => acc + p.amount * perkLevel(s, p.id), 0);

/** Share of the price left after the discount perks, which compound per level. */
const priceFactor = (c: GameConfig, s: Progress) =>
  c.prestige.perks.filter((p) => p.kind === "discount").reduce((acc, p) => acc * (1 - p.amount) ** perkLevel(s, p.id), 1);

/** What the next level of `u` costs this player. */
export const upgradePrice = (c: GameConfig, s: Progress, u: UpgradeDef) => Math.ceil(upgradeCost(u, level(s, u.id)) * priceFactor(c, s));

/** Unlocked achievements and ladder tiers, each worth `achievementBonus`. */
export const achievementCount = (s: Progress) =>
  Object.keys(s.achievements).length + Object.values(s.ladders ?? {}).reduce((acc, n) => acc + n, 0);

/** Multiplier of all points: upgrades, keys and perks, achievements. */
export const incomeMultiplier = (c: GameConfig, s: Progress) =>
  (1 + sum(c, s, "boost")) * prestigeMultiplier(c, s) * (1 + c.achievementBonus * achievementCount(s));
export const prestigeMultiplier = (c: GameConfig, s: Progress) => 1 + (s.keys ?? 0) * c.prestige.keyBonus + perkSum(c, s, "income");
export const perTap = (c: GameConfig, s: Progress) => (1 + sum(c, s, "tap")) * incomeMultiplier(c, s);
export const critChance = (c: GameConfig, s: Progress) => sum(c, s, "crit") + perkSum(c, s, "crit");
export const critMultiplier = (c: GameConfig, s: Progress) => c.baseCritMultiplier + sum(c, s, "critPower") + perkSum(c, s, "critPower");

// Prestige: keys are counted from the points earned in total, so every move pays only for what was earned since the last one.

/** Keys the points earned so far are worth in total, those already received included. */
export const keysFor = (c: GameConfig, s: Progress) =>
  Math.floor(Math.cbrt(s.totalEarned / c.prestige.base) * (1 + perkSum(c, s, "keys")));
/** Keys a move would bring now. */
export const pendingKeys = (c: GameConfig, s: Progress) => Math.max(0, keysFor(c, s) - (s.keys ?? 0));
/** Points earned in total at which the next key comes. */
export function nextKeyAt(c: GameConfig, s: Progress): number {
  const next = keysFor(c, s) + 1;
  return c.prestige.base * (next / (1 + perkSum(c, s, "keys"))) ** 3;
}

/** The state after a move: keys for it, points and upgrade levels gone; stats, achievements and perks stay. */
export function prestige(c: GameConfig, s: Progress, now: number): Progress | null {
  const gain = pendingKeys(c, s);
  if (gain < 1) return null;
  return {
    ...s,
    points: 0,
    levels: {},
    keys: (s.keys ?? 0) + gain,
    prestiges: (s.prestiges ?? 0) + 1,
    resetAt: now,
    lastSeen: now,
  };
}

export const perkCost = (p: PerkDef, lvl: number) => Math.ceil(p.baseCost * p.growth ** lvl);

/** Keys spent on the perks owned; recounted from the levels, so a change of costs refunds or charges nothing. */
const keysSpent = (c: GameConfig, s: Progress) =>
  c.prestige.perks.reduce((acc, p) => {
    let spent = 0;
    for (let l = 0; l < perkLevel(s, p.id); l++) spent += perkCost(p, l);
    return acc + spent;
  }, 0);
/** Keys to spend: those of prestiges and those other games credited, less what perks here and bonuses there took. */
export const freeKeys = (c: GameConfig, s: Progress) =>
  Math.max(0, (s.keys ?? 0) + (s.keysShopEarned ?? 0) - keysSpent(c, s) - (s.keysShopSpent ?? 0));

/** The state with one more level of perk `id`, or null when it is maxed out or not affordable. */
export function buyPerk(c: GameConfig, s: Progress, id: string): Progress | null {
  const p = c.prestige.perks.find((x) => x.id === id);
  if (!p) return null;
  const lvl = perkLevel(s, id);
  if ((p.maxLevel && lvl >= p.maxLevel) || freeKeys(c, s) < perkCost(p, lvl)) return null;
  return { ...s, perks: { ...s.perks, [id]: lvl + 1 } };
}

// Achievements

function statValue(c: GameConfig, s: Progress, stat: AchievementStat | LadderStat): number {
  switch (stat) {
    case "upgradeLevels":
      return c.upgrades.reduce((acc, u) => acc + level(s, u.id), 0);
    case "upgradeKinds":
      return c.upgrades.filter((u) => level(s, u.id) > 0).length;
    case "prestiges":
      return s.prestiges ?? 0;
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

// Ladders: endless achievements

export const ladderTier = (s: Progress, id: string) => s.ladders?.[id] ?? 0;
/** Stat value that reaches tier `n` (from 1). */
export const ladderTarget = (l: LadderDef, n: number) => l.start * l.factor ** (n - 1);

/** Highest tier the current value of the stat reaches; tiers reached before stay. */
function tierOf(c: GameConfig, l: LadderDef, s: Progress): number {
  const value = statValue(c, s, l.stat);
  if (value < l.start) return 0;
  let n = Math.floor(Math.log(value / l.start) / Math.log(l.factor)) + 1;
  // Floating point may land one off either way.
  while (ladderTarget(l, n + 1) <= value) n++;
  while (n > 0 && ladderTarget(l, n) > value) n--;
  return n;
}

/** Value and target of the next tier of a ladder, for a progress bar. */
export function ladderProgress(c: GameConfig, l: LadderDef, s: Progress): [number, number] {
  const target = ladderTarget(l, ladderTier(s, l.id) + 1);
  return [Math.min(statValue(c, s, l.stat), target), target];
}

/** Ladders `s` climbs higher on: id -> new tier. */
export function newTiers(c: GameConfig, s: Progress): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of c.ladders) {
    const n = tierOf(c, l, s);
    if (n > ladderTier(s, l.id)) out[l.id] = n;
  }
  return out;
}

/** Unlock id of a ladder tier, as the unlock listeners get it next to achievement ids. */
export const tierId = (ladder: string, n: number) => `${ladder}#${n}`;

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function roman(n: number): string {
  let out = "";
  for (const [value, digits] of ROMAN) {
    while (n >= value) {
      out += digits;
      n -= value;
    }
  }
  return out;
}

/** Name of an achievement or a ladder tier by its unlock id: "Magnate IV". */
export function unlockName(c: GameConfig, id: string): Text | null {
  const [ladderId, n] = id.split("#");
  if (n) {
    const l = c.ladders.find((x) => x.id === ladderId);
    return l ? { ru: `${l.name.ru} ${roman(Number(n))}`, en: `${l.name.en} ${roman(Number(n))}` } : null;
  }
  return c.achievements.find((a) => a.id === id)?.name ?? null;
}
