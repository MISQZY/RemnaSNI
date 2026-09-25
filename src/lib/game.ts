import { ACHIEVEMENTS, type TapInfo } from "@/lib/achievements";
import { UPGRADES, upgradeCost, type UpgradeKind } from "@/lib/upgrades";

const BASE_CRIT_MULTIPLIER = 5;
const STORAGE_KEY = "remnasni:v2";
/** Last traffic boost received from RemnaWeb, so income while away can be credited before the next sync. */
const BOOST_KEY = "remnasni:boost";
const SAVE_EVERY_MS = 2_000;
/** Passive income is capped so a forgotten tab does not break the economy. */
const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
/** Share of the auto-tap rate credited while no tab is open. */
const OFFLINE_RATE = 0.5;
/** Window for the "taps per burst" stat used by achievements. */
const FRENZY_WINDOW_MS = 2_000;

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

export const level = (s: GameState, id: string) => s.levels[id] ?? 0;

const sum = (s: GameState, kind: UpgradeKind) =>
  UPGRADES.filter((u) => u.kind === kind).reduce((acc, u) => acc + u.amount * level(s, u.id), 0);

export const unlockedCount = (s: GameState) => ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
export const incomeMultiplier = (s: GameState) => 1 + sum(s, "boost");
export const perTap = (s: GameState) => (1 + sum(s, "tap")) * incomeMultiplier(s);
export const critChance = (s: GameState) => sum(s, "crit");
export const critMultiplier = (s: GameState) => BASE_CRIT_MULTIPLIER + sum(s, "critPower");
/** Passive income: the traffic boost auto-taps `boost` times per second (without crits). */
export const perSecond = (s: GameState, boost: number) => perTap(s) * boost;

/**
 * Whether `a` is further along than `b`: a later reset wins, then more points earned,
 * then more points spent (buying an upgrade does not change totalEarned).
 * Mirrors isNewer in RemnaWeb/src/lib/sni.ts.
 */
export function isNewer(a: GameState, b: GameState): boolean {
  if (a.resetAt !== b.resetAt) return a.resetAt > b.resetAt;
  if (a.totalEarned !== b.totalEarned) return a.totalEarned > b.totalEarned;
  return a.totalEarned - a.points > b.totalEarned - b.points;
}


// A tiny external store for useSyncExternalStore, persisted to localStorage.

let state = INITIAL;
let hydrated = false;
let lastSave = 0;
let recentTaps: number[] = [];
/** Auto-taps per second from the player's traffic through this country (set by sync). */
let boost = 0;
const listeners = new Set<() => void>();
let unlockListener: ((ids: string[]) => void) | null = null;

function set(next: GameState, tap?: TapInfo) {
  const unlocked = ACHIEVEMENTS.filter((a) => !next.achievements[a.id] && a.check(next, tap)).map((a) => a.id);
  if (unlocked.length) {
    const now = Date.now();
    next = { ...next, achievements: { ...next.achievements, ...Object.fromEntries(unlocked.map((id) => [id, now])) } };
  }
  state = next;
  listeners.forEach((l) => l());
  if (unlocked.length) {
    save();
    unlockListener?.(unlocked);
  }
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
  const seconds = Math.min(Math.max(0, now - s.lastSeen), OFFLINE_CAP_MS) / 1000;
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

  onUnlock(listener: ((ids: string[]) => void) | null) {
    unlockListener = listener;
  },

  /** Loads the saved game once per page load and credits traffic income earned while away. */
  hydrate(): { gain: number; seconds: number } {
    if (hydrated) return { gain: 0, seconds: 0 };
    hydrated = true;
    boost = loadBoost();
    const { next, gain, seconds } = accrue(load() ?? INITIAL, Date.now(), OFFLINE_RATE);
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
    recentTaps = [...recentTaps.filter((t) => now - t < FRENZY_WINDOW_MS), now];
    const crit = Math.random() < critChance(state);
    const gain = perTap(state) * (crit ? critMultiplier(state) : 1);
    set(
      {
        ...state,
        points: state.points + gain,
        totalEarned: state.totalEarned + gain,
        taps: state.taps + 1,
        crits: state.crits + (crit ? 1 : 0),
        bestTap: Math.max(state.bestTap, gain),
      },
      { gain, crit, burst: recentTaps.length, hour: new Date(now).getHours() },
    );
    if (now - lastSave > SAVE_EVERY_MS) save();
    return { gain, crit };
  },

  buy(id: string): boolean {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return false;
    const lvl = level(state, id);
    const cost = upgradeCost(u, lvl);
    if (state.points < cost || (u.maxLevel && lvl >= u.maxLevel)) return false;
    set({ ...state, points: state.points - cost, levels: { ...state.levels, [id]: lvl + 1 } });
    save();
    return true;
  },

  save,

  /** Adopts progress synced from another device; its passive income continues from its lastSeen. */
  replace(next: GameState) {
    set(accrue({ ...INITIAL, ...next }, Date.now(), OFFLINE_RATE).next);
    save();
  },

  reset() {
    set({ ...INITIAL, resetAt: Date.now(), lastSeen: Date.now() });
    save();
  },
};
