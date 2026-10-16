import { config } from "@/games/clicker/config";
import * as rules from "@/games/clicker/rules";
import { storage } from "@/core/storage";

const STORAGE_KEY = "v2";
/** Last traffic boost received from RemnaWeb, so income while away can be credited before the next sync. */
const BOOST_KEY = "boost";
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
  /**
   * The country's wallet in RemnaWeb, as it last answered: `points` is its balance with what was played here since on
   * top, these counters make the free keys (rules.freeKeys) come out at its keys. RemnaWeb keeps the wallet: they are
   * sent back as they came, and it ignores them.
   */
  shopSpent?: number;
  shopEarned?: number;
  keysShopEarned?: number;
  keysShopSpent?: number;
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

/** Upgrade and perk levels bought in the run: more of them is further along at the same points earned. */
const bought = (s: GameState) =>
  Object.values(s.levels).reduce((a, n) => a + n, 0) + Object.values(s.perks ?? {}).reduce((a, n) => a + n, 0);

/**
 * Whether the run of `a` is further along than that of `b`: a later reset (or move) wins, then more points earned,
 * then more levels bought, then the later accrual. The points on hand are not compared: they are the wallet's, which
 * RemnaWeb keeps. Mirrors isNewer in RemnaWeb/src/lib/game/clicker/state.ts.
 */
export function isNewer(a: GameState, b: GameState): boolean {
  if (a.resetAt !== b.resetAt) return a.resetAt > b.resetAt;
  if (a.totalEarned !== b.totalEarned) return a.totalEarned > b.totalEarned;
  if (bought(a) !== bought(b)) return bought(a) > bought(b);
  return (a.lastSeen ?? 0) > (b.lastSeen ?? 0);
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
  // Private mode or full storage: the game still works, it just won't persist.
  storage.setJSON(STORAGE_KEY, state);
}

function load(): GameState | null {
  const parsed = storage.getJSON(STORAGE_KEY) as Partial<GameState> | null;
  if (!parsed || typeof parsed !== "object" || typeof parsed.points !== "number") return null;
  return { ...INITIAL, ...parsed, levels: { ...parsed.levels }, achievements: { ...parsed.achievements } };
}

function loadBoost(): number {
  const n = Number(storage.get(BOOST_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
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
    // Without storage offline income just starts after the next sync.
    storage.set(BOOST_KEY, String(boost));
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

  /**
   * Takes RemnaWeb's answer to `sent`: its run when that is further along (another device), else ours with the
   * wallet it sent (the points, the key counters) and what was played here since `sent` on top.
   */
  rebase(server: GameState, sent: GameState) {
    if (isNewer(server, state)) {
      game.replace(server);
      return;
    }
    set({
      ...state,
      points: Math.max(0, server.points + (state.points - sent.points)),
      shopSpent: server.shopSpent,
      shopEarned: server.shopEarned,
      keysShopEarned: server.keysShopEarned,
      keysShopSpent: server.keysShopSpent,
    });
    save();
  },

  /** Starts the clicker anew. The points and free keys stay: they are the country's wallet, not the run's. */
  reset() {
    const now = Date.now();
    set({ ...INITIAL, points: state.points, keysShopEarned: rules.freeKeys(config(), state), resetAt: now, lastSeen: now });
    save();
  },
};
