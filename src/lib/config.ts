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

export type GameConfig = {
  baseCritMultiplier: number;
  frenzyWindowMs: number;
  offlineRate: number;
  offlineCapMs: number;
  maxPinnedPets: number;
  upgrades: UpgradeDef[];
  achievements: AchievementDef[];
};

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
