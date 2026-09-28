import { config } from "@/games/clicker/config";
import * as rules from "@/games/clicker/rules";

const STORAGE_KEY = "remnasni:v2";
/** Last traffic boost received from RemnaWeb, so income while away can be credited before the next sync. */
const BOOST_KEY = "remnasni:boost";
const SAVE_EVERY_MS = 2_000;

export type GameState = {
  points: number;
  totalEarned: number;
  taps: number;
  crits: number;
  bestTap: number;
  levels: Record<string, number>;
  /** Achievement id -> unlock time (ms). */
  achievements: Record<string, number>;
  /** Time of the last reset (ms), so a reset beats progress that is larger but older when syncing. */
  resetAt: number;
  /** Last passive-income accrual (ms); 0 until the traffic boost first kicks in. */
  lastSeen?: number;
  /** Points RemnaWeb took for Mini App purchases and credited for market sales; kept as is and sent back. */
  shopSpent?: number;
  shopEarned?: number;
  /** Qzr keys RemnaWeb credited from other games and those spent there, and the snake's bonuses; kept as is. */
  keysShopEarned?: number;
  keysShopSpent?: number;
  snakePerks?: Record<string, number>;
  /** Encryption keys received for all moves (prestige); they survive them. */
  keys?: number;
  prestiges?: number;
  /** Prestige perk id -> level. */
  perks?: Record<string, number>;
  /** Ladder id -> highest tier reached. */
  ladders?: Record<string, number>;
};

const INITIAL: GameState = {
  points: 0,
  totalEarned: 0,
  taps: 0,
  crits: 0,
  bestTap: 0,
  levels: {},
  achievements: {},
  resetAt: 0,
};

export const level = rules.level;

export const incomeMultiplier = (s: GameState) => rules.incomeMultiplier(config(), s);
export const perTap = (s: GameState) => rules.perTap(config(), s);
export const critChance = (s: GameState) => rules.critChance(config(), s);
export const critMultiplier = (s: GameState) => rules.critMultiplier(config(), s);
export const prestigeMultiplier = (s: GameState) => rules.prestigeMultiplier(config(), s);
/** Passive income: the traffic boost auto-taps `boost` times per second (without crits). */
export const perSecond = (s: GameState, boost: number) => perTap(s) * boost;

/** Points RemnaWeb has moved in or out of this progress; only ever grows until a reset. */
const shopActivity = (s: GameState) => (s.shopSpent ?? 0) + (s.shopEarned ?? 0) + (s.keysShopEarned ?? 0) + (s.keysShopSpent ?? 0);

/**
 * Whether `a` is further along than `b`: a later reset (or move) wins, then more points earned,
 * then more RemnaWeb purchases and sales seen, then more points spent (buying an upgrade does not
 * change totalEarned). Mirrors isNewer in RemnaWeb/src/lib/clicker/state.ts.
 */
export function isNewer(a: GameState, b: GameState): boolean {
  if (a.resetAt !== b.resetAt) return a.resetAt > b.resetAt;
  if (a.totalEarned !== b.totalEarned) return a.totalEarned > b.totalEarned;
  if (shopActivity(a) !== shopActivity(b)) return shopActivity(a) > shopActivity(b);
  return a.totalEarned - a.points > b.totalEarned - b.points;
}


// A tiny external store for useSyncExternalStore, persisted to localStorage.

let state = INITIAL;
let hydrated = false;
let lastSave = 0;
/** Auto-taps per second from the player's traffic through this country (set by sync). */
let boost = 0;
const listeners = new Set<() => void>();

function set(next: GameState) {
  state = next;
  listeners.forEach((l) => l());
}

function save() {
  if (!hydrated) return;
  lastSave = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the game still works, it just won't persist.
  }
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<GameState>) : null;
    if (!parsed || typeof parsed.points !== "number") return null;
    return { ...INITIAL, ...parsed, levels: { ...parsed.levels }, achievements: { ...parsed.achievements } };
  } catch {
    return null;
  }
}

function loadBoost(): number {
  try {
    const n = Number(localStorage.getItem(BOOST_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Passive income accrued since `s.lastSeen` (capped) at `rate` of the full speed, and the state with it credited. */
function accrue(s: GameState, now: number, rate = 1): { next: GameState; gain: number; seconds: number } {
  if (boost <= 0 || !s.lastSeen) return { next: { ...s, lastSeen: now }, gain: 0, seconds: 0 };
  const seconds = Math.min(Math.max(0, now - s.lastSeen), config().offlineCapMs) / 1000;
  const gain = perSecond(s, boost) * seconds * rate;
  return { next: { ...s, points: s.points + gain, totalEarned: s.totalEarned + gain, lastSeen: now }, gain, seconds };
}

export const game = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => INITIAL,
  isHydrated: () => hydrated,

  /** Loads the saved game once per page load and credits traffic income earned while away. */
  hydrate(): { gain: number; seconds: number } {
    if (hydrated) return { gain: 0, seconds: 0 };
    hydrated = true;
    boost = loadBoost();
    const { next, gain, seconds } = accrue(load() ?? INITIAL, Date.now(), config().offlineRate);
    set(next);
    save();
    return { gain, seconds };
  },

  /** Credits passive income up to now; call it on an interval. */
  tick() {
    if (!hydrated || boost <= 0) return;
    const now = Date.now();
    set(accrue(state, now).next);
    if (now - lastSave > SAVE_EVERY_MS) save();
  },

  /** Sets the auto-tap rate from the traffic boost; income so far is credited at the old rate. */
  setBoost(value: number) {
    const next = Number.isFinite(value) && value > 0 ? value : 0;
    if (next === boost) return;
    if (hydrated) set(accrue(state, Date.now()).next);
    boost = next;
    try {
      localStorage.setItem(BOOST_KEY, String(boost));
    } catch {
      // Not persisted: offline income just starts after the next sync.
    }
    save();
  },

  tap(): { gain: number; crit: boolean } {
    const now = Date.now();
    const crit = Math.random() < critChance(state);
    const gain = perTap(state) * (crit ? critMultiplier(state) : 1);
    set({
        ...state,
        points: state.points + gain,
        totalEarned: state.totalEarned + gain,
        taps: state.taps + 1,
        crits: state.crits + (crit ? 1 : 0),
        bestTap: Math.max(state.bestTap, gain),
      });
    if (now - lastSave > SAVE_EVERY_MS) save();
    return { gain, crit };
  },

  buy(id: string): boolean {
    const u = config().upgrades.find((x) => x.id === id);
    if (!u) return false;
    const lvl = level(state, id);
    const cost = rules.upgradePrice(config(), state, u);
    if (state.points < cost || (u.maxLevel && lvl >= u.maxLevel)) return false;
    set({ ...state, points: state.points - cost, levels: { ...state.levels, [id]: lvl + 1 } });
    save();
    return true;
  },

  /**
   * Moves to a new SNI: trades points and upgrades for keys, after crediting passive income so far.
   * Returns the keys received, 0 while none are due.
   */
  prestige(): number {
    const now = Date.now();
    const current = accrue(state, now).next;
    const gain = rules.pendingKeys(config(), current);
    const next = rules.prestige(config(), current, now);
    if (!next) return 0;
    set(next);
    save();
    return gain;
  },

  buyPerk(id: string): boolean {
    const next = rules.buyPerk(config(), state, id);
    if (!next) return false;
    set(next);
    save();
    return true;
  },

  save,

  /** Adopts progress synced from another device; its passive income continues from its lastSeen. */
  replace(next: GameState) {
    set(accrue({ ...INITIAL, ...next }, Date.now(), config().offlineRate).next);
    save();
  },

  reset() {
    set({ ...INITIAL, resetAt: Date.now(), lastSeen: Date.now() });
    save();
  },
};
