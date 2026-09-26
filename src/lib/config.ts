import type { Locale } from "@/lib/i18n";

// Rules and texts of the game. RemnaWeb is the source of truth (lib/clicker/config.ts there): the server loads
// them from GET /api/sni/config (lib/config-server.ts) and hands them to the page. These types mirror it.

export type Text = { ru: string; en: string };

export type UpgradeKind = "tap" | "crit" | "critPower" | "boost";

export type UpgradeDef = {
  id: string;
  kind: UpgradeKind;
  /** lucide icon name in kebab-case. */
  icon: string;
  baseCost: number;
  growth: number;
  amount: number;
  maxLevel?: number;
  name: Text;
  description: Text;
};

export type AchievementStat = "taps" | "totalEarned" | "crits" | "bestTap" | "upgradeLevels" | "upgradeKinds";

export type AchievementRule =
  | { type: "stat"; stat: AchievementStat; target: number }
  | { type: "upgrade"; upgrade: string; target: number }
  | { type: "burst"; taps: number }
  | { type: "hour"; from: number; to: number };

export type AchievementDef = {
  id: string;
  icon: string;
  secret?: boolean;
  rule: AchievementRule;
  name: Text;
  description: Text;
};

export type PerkKind = "income" | "crit" | "critPower" | "discount" | "keys";

export type PerkDef = {
  id: string;
  kind: PerkKind;
  icon: string;
  /** Cost in keys of the first level; each level costs `growth` times more. */
  baseCost: number;
  growth: number;
  amount: number;
  maxLevel?: number;
  name: Text;
  description: Text;
};

/** Prestige, "moving to a new SNI": keys ever received are floor(cbrt(totalEarned / base) × (1 + keys perks)). */
export type PrestigeConfig = { base: number; keyBonus: number; perks: PerkDef[] };

export type LadderStat = "taps" | "totalEarned" | "crits" | "bestTap" | "upgradeLevels" | "prestiges";

/** An endless achievement: tier n at `start × factor^(n-1)`; `{n}` in the description is the target. */
export type LadderDef = { id: string; icon: string; stat: LadderStat; start: number; factor: number; name: Text; description: Text };

export type GameConfig = {
  baseCritMultiplier: number;
  frenzyWindowMs: number;
  offlineRate: number;
  offlineCapMs: number;
  maxPinnedPets: number;
  upgrades: UpgradeDef[];
  achievements: AchievementDef[];
  achievementBonus: number;
  ladders: LadderDef[];
  prestige: PrestigeConfig;
};

/** Fills in what an older RemnaWeb does not send yet: no ladders, no achievement bonus, no prestige. */
export const withDefaults = (c: GameConfig): GameConfig => ({
  ...c,
  achievementBonus: c.achievementBonus ?? 0,
  ladders: c.ladders ?? [],
  prestige: c.prestige ?? { base: Infinity, keyBonus: 0, perks: [] },
});

// Code outside React (the game store, toasts) reads the config through here; ConfigProvider sets it.
let current: GameConfig | null = null;

export const setConfig = (config: GameConfig) => {
  current = config;
};

/** The loaded config; the game only runs once there is one. */
export function config(): GameConfig {
  if (!current) throw new Error("Game config is not loaded");
  return current;
}

/** A text of the config in `locale`. */
export const say = (text: Text, locale: Locale) => text[locale];
