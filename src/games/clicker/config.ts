import type { Locale } from "@/core/i18n/locales";

// Rules and texts of the clicker. RemnaWeb is the source of truth (lib/clicker/config.ts there): the server
// loads them from GET /api/sni/config (config-server.ts) and hands them to the page. These types mirror it.

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

const isText = (t: unknown) => !!t && typeof (t as Text).ru === "string" && typeof (t as Text).en === "string";
const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);
const listOf = (v: unknown, ok: (item: Record<string, unknown>) => boolean) =>
  Array.isArray(v) && v.every((item) => !!item && typeof item === "object" && ok(item as Record<string, unknown>));
const named = (i: Record<string, unknown>) => typeof i.id === "string" && typeof i.icon === "string" && isText(i.name) && isText(i.description);

/**
 * Whether a config from RemnaWeb has the shape the game relies on. A broken one (a bug or a tampered
 * response) is refused, and the last good config keeps serving, rather than breaking every page.
 */
export function isGameConfig(v: unknown): v is GameConfig {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    ["baseCritMultiplier", "frenzyWindowMs", "offlineRate", "offlineCapMs", "maxPinnedPets"].every((k) => isNum(c[k])) &&
    listOf(c.upgrades, (u) => named(u) && isNum(u.baseCost) && isNum(u.growth) && isNum(u.amount)) &&
    listOf(c.achievements, (a) => named(a) && !!a.rule && typeof a.rule === "object") &&
    (c.ladders === undefined || listOf(c.ladders, (l) => named(l) && isNum(l.start) && isNum(l.factor))) &&
    (c.prestige === undefined ||
      (!!c.prestige &&
        typeof c.prestige === "object" &&
        listOf((c.prestige as Record<string, unknown>).perks, (p) => named(p) && isNum(p.baseCost) && isNum(p.growth))))
  );
}

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
