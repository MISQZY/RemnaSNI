import { api } from "@/core/api";
import { tr } from "@/core/i18n/client";
import type { Look } from "@/core/look";
import { session, type Account } from "@/core/session";
import { game, isNewer, type GameState } from "@/games/clicker/game";
import { human, type HumanCheck } from "@/games/clicker/human";

// Two-way sync of the flag clicker's progress with RemnaWeb (core/api.ts). The Telegram session is the core's
// (core/session.ts), shared with the other games; its token and account are mirrored here.

const PUSH_EVERY_MS = 10_000;
/** After failed syncs the pushes back off up to this interval. */
const MAX_BACKOFF_MS = 5 * 60_000;
/** Traffic changes slowly; refresh the boost (and other devices' progress) every few minutes. */
const PULL_EVERY_MS = 5 * 60_000;

export type SyncStatus = "idle" | "syncing" | "synced" | "offline";
/**
 * Traffic through this country's nodes and the auto-tap rate RemnaWeb grants for it.
 * The traffic turbo is not open to every account (`eligible`, missing from older RemnaWeb versions). `bought`
 * is the turbo bought for points, open to anyone; `boost` is the stronger of the two.
 */
export type Traffic = { eligible?: boolean; bytes: number; boost: number; bought?: number; windowDays: number };
export type SyncState = {
  /** Whether this site has REMNAWEB_URL (set on the server), i.e. sign-in is available at all. */
  enabled: boolean;
  token: string | null;
  account: Account | null;
  traffic: Traffic | null;
  /** Particles of the tapped flag bought in the RemnaWeb Mini App shop; null for the default mini flags. */
  effect: string[] | null;
  /** The color of the tap numbers bought there, as CSS (core/look.ts); null for white. */
  tapColor: Look | null;
  status: SyncStatus;
  syncedAt: number | null;
};

const SIGNED_OUT: SyncState = {
  enabled: false,
  token: null,
  account: null,
  traffic: null,
  effect: null,
  tapColor: null,
  status: "idle",
  syncedAt: null,
};

let state = SIGNED_OUT;
/** Node country; RemnaWeb keeps separate progress per country. */
let country = "";
/** Game state last confirmed by the server; anything else is unsynced. */
let synced: GameState | null = null;
let inFlight = false;
/** Failed syncs in a row, for the backoff; the next push waits until `retryAt`. */
let failures = 0;
let retryAt = 0;
const listeners = new Set<() => void>();

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// The session's token and account, kept in this state too, so the clicker's components read one place.
// Signed out (here, by an expired session or in the account menu), the account's boost and looks go.
session.subscribe(() => {
  const { enabled, token, account } = session.getSnapshot();
  if (enabled === state.enabled && token === state.token && account === state.account) return;
  if (!token && state.token) {
    synced = null;
    game.setBoost(0);
    set({ ...SIGNED_OUT, enabled });
  } else {
    set({ enabled, token, account });
  }
});

/** The progress call; null when signed out or failed (then the pushes back off). */
async function progress<T>(method: "GET" | "PUT", body?: GameState, keepalive = false): Promise<T | null> {
  try {
    const res = await api<T>("progress", { method, body, country, keepalive });
    failures = 0;
    retryAt = 0;
    return res;
  } catch {
    failures++;
    retryAt = Date.now() + Math.min(MAX_BACKOFF_MS, PUSH_EVERY_MS * 2 ** failures);
    set({ status: "offline" });
    return null;
  }
}

/** Takes whichever of the server and local progress is further along. */
function adopt(server: GameState | null) {
  const local = game.getSnapshot();
  if (server && isNewer(server, local)) {
    game.replace(server);
    synced = game.getSnapshot();
  } else if (server && !isNewer(local, server)) {
    synced = local;
  }
}

async function pull() {
  set({ status: "syncing" });
  const res = await progress<{
    user: Account;
    progress: GameState | null;
    traffic?: Traffic;
    effect?: string[] | null;
    tapColor?: Look | null;
    /** A renewed token, sent when the current one is getting old. */
    session?: string | null;
  }>("GET");
  if (!res) return;
  if (res.session) session.keep(res.session);
  session.setAccount(res.user);
  set({ traffic: res.traffic ?? null, effect: res.effect ?? null, tapColor: res.tapColor ?? null });
  adopt(res.progress);
  game.setBoost(res.traffic?.boost ?? 0);
  if (synced !== game.getSnapshot()) await push();
  else set({ status: "synced", syncedAt: Date.now() });
}

async function push(keepalive = false) {
  const current = game.getSnapshot();
  if (inFlight || !state.token || current === synced) return;
  inFlight = true;
  set({ status: "syncing" });
  try {
    const res = await progress<{ progress: GameState; rejected?: boolean; challenge?: boolean }>("PUT", current, keepalive);
    if (!res) return;
    if (res.challenge) {
      // Not saved until a human check is passed; the local progress stays and goes up after it.
      human.require();
      set({ status: "synced", syncedAt: state.syncedAt });
      return;
    }
    if (res.rejected) {
      // RemnaWeb refused the progress as impossible: its copy is the game from now on.
      game.replace(res.progress);
      synced = game.getSnapshot();
    } else {
      synced = current;
      adopt(res.progress);
    }
    set({ status: "synced", syncedAt: Date.now() });
  } finally {
    inFlight = false;
  }
}

/** The interval push: skipped while the tab is hidden (hiding pushes once) and while backing off. */
function scheduledPush() {
  if (document.visibilityState === "hidden" || Date.now() < retryAt) return;
  void push();
}

export const sync = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => SIGNED_OUT,

  /** Starts syncing this country's progress with RemnaWeb; call after the game is hydrated. Returns a cleanup. */
  start(nodeCountry: string) {
    country = nodeCountry;
    const stopSession = session.start(() => {
      synced = null;
      void pull();
    });
    if (session.getSnapshot().token) void pull();

    const pushTimer = setInterval(scheduledPush, PUSH_EVERY_MS);
    const pullTimer = setInterval(() => state.token && document.visibilityState === "visible" && void pull(), PULL_EVERY_MS);
    const onHide = () => document.visibilityState === "hidden" && void push(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      stopSession();
      clearInterval(pushTimer);
      clearInterval(pullTimer);
      document.removeEventListener("visibilitychange", onHide);
    };
  },

  /** Pulls what other devices saved, then pushes local progress if it is further along. */
  syncNow: () => pull(),

  /** A human check from RemnaWeb for this country. */
  async getCheck(): Promise<HumanCheck> {
    const check = await api<HumanCheck>("challenge", { country });
    if (!check) throw new Error(tr()("human.failed"));
    return check;
  },

  async answerCheck(token: string, answer: number): Promise<{ passed: boolean; blockedUntil?: string }> {
    const res = await api<{ passed?: boolean; blockedUntil?: string }>("challenge", { method: "POST", body: { token, answer }, country });
    if (res?.passed === undefined) throw new Error(tr()("human.failed"));
    if (res.passed) void push();
    return { passed: res.passed, blockedUntil: res.blockedUntil };
  },

  /** Machine-like tapping was seen: asks RemnaWeb to make the check due now. */
  async requestCheck(): Promise<void> {
    try {
      await api("challenge", { method: "POST", body: { suspect: true }, country });
    } catch {
      // The check is due on this site anyway.
    }
  },
};
