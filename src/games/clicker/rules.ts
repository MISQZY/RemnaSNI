import type { GameConfig, PerkDef, PerkKind, UpgradeDef, UpgradeKind } from "@/games/clicker/config";
import type { GameState as Progress } from "@/games/clicker/game";

// How the game applies the GameConfig loaded from RemnaWeb. Mirrors RemnaWeb/src/lib/clicker/rules.ts, which applies
// the same config in the Mini App; keep both in step when a formula or a rule type changes.

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

/** Multiplier of all points: upgrades, keys and perks. Achievements add nothing: they are profile-wide in RemnaWeb. */
export const incomeMultiplier = (c: GameConfig, s: Progress) => (1 + sum(c, s, "boost")) * prestigeMultiplier(c, s);
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

