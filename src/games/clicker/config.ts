import type { Locale } from "@/core/i18n/locales";

// Rules and texts of the clicker. RemnaWeb is the source of truth (lib/game/clicker/config.ts there): the server
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

/** The rules that spot an auto-clicker and ask for a human check (tap-guard.ts). */
export type TapGuardRules = {
  /** Taps looked at for rhythm and position. */
  window: number;
  /** Faster than this on average (ms between taps), a rhythm whose spread is below `steadyCv` is a machine's. */
  fastMs: number;
  steadyCv: number;
  /** Fingers landing within this many pixels of one spot every time are a program. */
  sameSpotPx: number;
  /** A pause this long ends a tapping session, and nobody taps longer than `marathonMs` without one. */
  pauseMs: number;
  marathonMs: number;
  /** Scripted (untrusted) events tolerated before asking for a check. */
  maxSynthetic: number;
  /** After a passed check the rules keep quiet this long, so one person is not asked again and again. */
  quietMs: number;
};

/**
 * How the site runs the clicker, RemnaWeb's (its lib/game/clicker/config.ts ClickerSiteConfig): how often the game is
 * kept on the device, pushed to RemnaWeb (backed off up to `maxBackoffMs` after failures) and pulled back (the boost
 * and other devices' progress), how long a signed-out player is held after failing the site's own checks, and the
 * auto-clicker rules.
 */
export type SiteConfig = { saveEveryMs: number; pushEveryMs: number; maxBackoffMs: number; pullEveryMs: number; localBlockMs: number; tapGuard: TapGuardRules };

/** What an older RemnaWeb, which does not send it, had the site do. */
const OLDER_SITE: SiteConfig = {
  saveEveryMs: 2_000,
  pushEveryMs: 10_000,
  maxBackoffMs: 5 * 60_000,
  pullEveryMs: 5 * 60_000,
  localBlockMs: 5 * 60_000,
  tapGuard: { window: 40, fastMs: 300, steadyCv: 0.06, sameSpotPx: 1.5, pauseMs: 5_000, marathonMs: 20 * 60_000, maxSynthetic: 3, quietMs: 2 * 60_000 },
};

const SITE_NUMBERS = ["saveEveryMs", "pushEveryMs", "maxBackoffMs", "pullEveryMs", "localBlockMs"] as const;
const GUARD_NUMBERS = ["window", "fastMs", "steadyCv", "sameSpotPx", "pauseMs", "marathonMs", "maxSynthetic", "quietMs"] as const;

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
  site: SiteConfig;
};

const isText = (t: unknown) => !!t && typeof (t as Text).ru === "string" && typeof (t as Text).en === "string";
const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);
const listOf = (v: unknown, ok: (item: Record<string, unknown>) => boolean) =>
  Array.isArray(v) && v.every((item) => !!item && typeof item === "object" && ok(item as Record<string, unknown>));
const named = (i: Record<string, unknown>) => typeof i.id === "string" && typeof i.icon === "string" && isText(i.name) && isText(i.description);

function isSite(v: unknown): boolean {
  const s = v as Record<string, unknown> | null;
  const guard = s?.tapGuard as Record<string, unknown> | null | undefined;
  return !!s && typeof s === "object" && SITE_NUMBERS.every((k) => isNum(s[k]) && (s[k] as number) > 0) && !!guard && GUARD_NUMBERS.every((k) => isNum(guard[k]));
}

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
        listOf((c.prestige as Record<string, unknown>).perks, (p) => named(p) && isNum(p.baseCost) && isNum(p.growth)))) &&
    (c.site === undefined || isSite(c.site))
  );
}

/** Fills in what an older RemnaWeb does not send yet: no ladders, no achievement bonus, no prestige, how the site ran before. */
export const withDefaults = (c: GameConfig): GameConfig => ({
  ...c,
  achievementBonus: c.achievementBonus ?? 0,
  ladders: c.ladders ?? [],
  prestige: c.prestige ?? { base: Infinity, keyBonus: 0, perks: [] },
  site: c.site ?? OLDER_SITE,
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
