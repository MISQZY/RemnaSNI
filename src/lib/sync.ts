import { toast } from "sonner";
import { game, isNewer, type GameState } from "@/lib/game";

// Telegram sign-in through RemnaWeb and two-way progress sync with it.
// RemnaWeb runs the OAuth flow and hands the session token back in the URL fragment.

const TOKEN_KEY = "remnasni:token";
const PUSH_EVERY_MS = 10_000;
/** Traffic changes slowly; refresh the boost (and other devices' progress) every few minutes. */
const PULL_EVERY_MS = 5 * 60_000;

export type Account = { name: string; photoUrl: string | null };
export type SyncStatus = "idle" | "syncing" | "synced" | "offline";
/** Traffic through this country's nodes and the auto-tap rate RemnaWeb grants for it. */
export type Traffic = { bytes: number; boost: number; windowDays: number };
export type SyncState = {
  /** Whether this site has REMNAWEB_URL, i.e. sign-in is available at all. */
  enabled: boolean;
  token: string | null;
  account: Account | null;
  traffic: Traffic | null;
  status: SyncStatus;
  syncedAt: number | null;
};

const SIGNED_OUT: SyncState = { enabled: false, token: null, account: null, traffic: null, status: "idle", syncedAt: null };

const ERRORS: Record<string, string> = {
  disabled: "Sign-in is not configured yet.",
  cancelled: "Sign-in was cancelled.",
  access_denied: "Sign-in was cancelled.",
};

let state = SIGNED_OUT;
let baseUrl = "";
/** Node country; RemnaWeb keeps separate progress per country. */
let country = "";
/** Game state last confirmed by the server; anything else is unsynced. */
let synced: GameState | null = null;
let inFlight = false;
const listeners = new Set<() => void>();

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage the session lasts until the tab closes.
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Picks up `#sni_token` / `#sni_error` left by the RemnaWeb callback and cleans the URL. */
function consumeFragment() {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("sni_token");
  const error = params.get("sni_error");
  if (!token && !error) return;
  history.replaceState(null, "", location.pathname + location.search);
  if (token) storeToken(token);
  if (error) toast.error("Could not sign in", { description: ERRORS[error] ?? "Please try again later." });
}

async function api(method: "GET" | "PUT", body?: GameState, keepalive = false): Promise<Response | null> {
  if (!state.token) return null;
  try {
    const res = await fetch(`${baseUrl}/api/sni/progress?${new URLSearchParams({ country })}`, {
      method,
      headers: { Authorization: `Bearer ${state.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      keepalive,
      cache: "no-store",
    });
    if (res.status === 401) {
      signOut();
      toast("Signed out", { description: "Your session has expired, sign in again to keep syncing." });
      return null;
    }
    if (!res.ok) throw new Error(String(res.status));
    return res;
  } catch {
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
  const res = await api("GET");
  if (!res) return;
  const { user, progress, traffic } = (await res.json()) as {
    user: Account;
    progress: GameState | null;
    traffic?: Traffic;
  };
  set({ account: user, traffic: traffic ?? null });
  adopt(progress);
  game.setBoost(traffic?.boost ?? 0);
  if (synced !== game.getSnapshot()) await push();
  else set({ status: "synced", syncedAt: Date.now() });
}

async function push(keepalive = false) {
  const current = game.getSnapshot();
  if (inFlight || !state.token || current === synced) return;
  inFlight = true;
  set({ status: "syncing" });
  try {
    const res = await api("PUT", current, keepalive);
    if (!res) return;
    const { progress } = (await res.json()) as { progress: GameState };
    synced = current;
    adopt(progress);
    set({ status: "synced", syncedAt: Date.now() });
  } finally {
    inFlight = false;
  }
}

function signOut() {
  storeToken(null);
  synced = null;
  game.setBoost(0);
  set({ ...SIGNED_OUT, enabled: state.enabled });
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

  /** Starts syncing this country's progress with RemnaWeb at `url`; call after the game is hydrated. Returns a cleanup. */
  start(url: string, nodeCountry: string) {
    baseUrl = url;
    country = nodeCountry;
    set({ enabled: true });
    consumeFragment();
    const token = readToken();
    if (token) {
      set({ token });
      void pull();
    }

    const pushTimer = setInterval(() => void push(), PUSH_EVERY_MS);
    const pullTimer = setInterval(() => state.token && void pull(), PULL_EVERY_MS);
    const onHide = () => document.visibilityState === "hidden" && void push(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(pushTimer);
      clearInterval(pullTimer);
      document.removeEventListener("visibilitychange", onHide);
    };
  },

  signInUrl() {
    const back = `${location.origin}${location.pathname}`;
    return `${baseUrl}/api/sni/auth/start?${new URLSearchParams({ return_to: back })}`;
  },

  /** Pulls what other devices saved, then pushes local progress if it is further along. */
  syncNow: () => pull(),

  signOut,
};
