import { toast } from "sonner";
import { game, isNewer, type GameState } from "@/lib/game";
import { t } from "@/lib/i18n";
import type { OwnedPet, Pets } from "@/lib/pets";

// Telegram sign-in through RemnaWeb and two-way progress sync with it, via this site's /api/sni proxy.
// RemnaWeb runs the OAuth flow and hands the session token back in the URL fragment.

const TOKEN_KEY = "remnasni:token";
/** Random value sent to the sign-in and expected back with the token, so a token planted in a link is refused. */
const STATE_KEY = "remnasni:sign-in-state";
const PUSH_EVERY_MS = 10_000;
/** After failed syncs the pushes back off up to this interval. */
const MAX_BACKOFF_MS = 5 * 60_000;
/** Traffic changes slowly; refresh the boost (and other devices' progress) every few minutes. */
const PULL_EVERY_MS = 5 * 60_000;

export type Account = { name: string; photoUrl: string | null };
export type SyncStatus = "idle" | "syncing" | "synced" | "offline";
/**
 * Traffic through this country's nodes and the auto-tap rate RemnaWeb grants for it.
 * The turbo is for VPN users only; `vpn` is missing from older RemnaWeb versions.
 */
export type Traffic = { vpn?: boolean; bytes: number; boost: number; windowDays: number };
export type SyncState = {
  /** Whether this site has REMNAWEB_URL (set on the server), i.e. sign-in is available at all. */
  enabled: boolean;
  token: string | null;
  account: Account | null;
  traffic: Traffic | null;
  /** Pet catalog and the pets this account owns; null until the first pull. */
  pets: Pets | null;
  /** Particles of the tapped flag bought in the RemnaWeb Mini App shop; null for the default mini flags. */
  effect: string[] | null;
  status: SyncStatus;
  syncedAt: number | null;
};

const SIGNED_OUT: SyncState = {
  enabled: false,
  token: null,
  account: null,
  traffic: null,
  pets: null,
  effect: null,
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

/** RemnaWeb's error message in the current language, when the dictionary knows it. */
const serverError = (message?: string) => message && (t().sync.serverErrors[message] ?? message);

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

function takeSignInState(): string | null {
  try {
    const value = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return value;
  } catch {
    return null;
  }
}

/**
 * Picks up `#sni_token` / `#sni_error` left by the RemnaWeb callback and cleans the URL. The token is
 * taken only with the `sni_state` this tab sent to the sign-in: someone else's token in a link is dropped.
 */
function consumeFragment() {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("sni_token");
  const error = params.get("sni_error");
  if (!token && !error) return;
  history.replaceState(null, "", location.pathname + location.search);
  const expected = takeSignInState();
  if (!expected || params.get("sni_state") !== expected) {
    toast.error(t().sync.signInFailed, { description: t().sync.tryLater });
    return;
  }
  if (token) storeToken(token);
  if (error) toast.error(t().sync.signInFailed, { description: t().sync.signInErrors[error] ?? t().sync.tryLater });
}

function failed() {
  failures++;
  retryAt = Date.now() + Math.min(MAX_BACKOFF_MS, PUSH_EVERY_MS * 2 ** failures);
  set({ status: "offline" });
}

function succeeded() {
  failures = 0;
  retryAt = 0;
}

async function api(method: "GET" | "PUT", body?: GameState, keepalive = false): Promise<Response | null> {
  if (!state.token) return null;
  try {
    const res = await fetch(`/api/sni/progress?${new URLSearchParams({ country })}`, {
      method,
      headers: { Authorization: `Bearer ${state.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      keepalive,
      cache: "no-store",
    });
    if (res.status === 401) {
      signOut();
      toast(t().sync.signedOut, { description: t().sync.expiredSync });
      return null;
    }
    if (!res.ok) throw new Error(String(res.status));
    succeeded();
    return res;
  } catch {
    failed();
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
  const { user, progress, traffic, pets, effect, session } = (await res.json()) as {
    user: Account;
    progress: GameState | null;
    traffic?: Traffic;
    pets?: Pets;
    effect?: string[] | null;
    /** A renewed token, sent when the current one is getting old. */
    session?: string | null;
  };
  if (session) {
    storeToken(session);
    set({ token: session });
  }
  set({ account: user, traffic: traffic ?? null, pets: pets ?? null, effect: effect ?? null });
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
    const { progress, rejected } = (await res.json()) as { progress: GameState; rejected?: boolean };
    if (rejected) {
      // RemnaWeb refused the progress as impossible: its copy is the game from now on.
      game.replace(progress);
      synced = game.getSnapshot();
    } else {
      synced = current;
      adopt(progress);
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

  /** Starts syncing this country's progress with RemnaWeb; call after the game is hydrated. Returns a cleanup. */
  start(nodeCountry: string) {
    country = nodeCountry;
    set({ enabled: true });
    consumeFragment();
    const token = readToken();
    if (token) {
      set({ token });
      void pull();
    }

    const pushTimer = setInterval(scheduledPush, PUSH_EVERY_MS);
    const pullTimer = setInterval(() => state.token && document.visibilityState === "visible" && void pull(), PULL_EVERY_MS);
    const onHide = () => document.visibilityState === "hidden" && void push(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(pushTimer);
      clearInterval(pullTimer);
      document.removeEventListener("visibilitychange", onHide);
    };
  },

  /** Where the sign-in starts; remembers the state it sends, so call it right before navigating. */
  signInUrl() {
    const back = `${location.origin}${location.pathname}`;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const signInState = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    try {
      sessionStorage.setItem(STATE_KEY, signInState);
    } catch {
      // Without storage the token cannot be checked and is refused; nothing else to do.
    }
    return `/api/sni/auth/start?${new URLSearchParams({ return_to: back, state: signInState })}`;
  },

  /** Signs out on every device and site: the sessions issued so far stop working. */
  async signOutEverywhere(): Promise<{ error?: string }> {
    if (!state.token) return {};
    try {
      const res = await fetch("/api/sni/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${state.token}` }, cache: "no-store" });
      if (!res.ok && res.status !== 401) return { error: t().sync.tryLater };
    } catch {
      return { error: t().sync.offline };
    }
    signOut();
    return {};
  },

  /** Pulls what other devices saved, then pushes local progress if it is further along. */
  syncNow: () => pull(),

  /**
   * Buys a pet with this country's points. RemnaWeb saves the local progress first (with its checks),
   * then issues the serial number and deducts the price from the stored points.
   */
  async buyPet(kind: string): Promise<{ pet: OwnedPet } | { error: string }> {
    if (!state.token) return { error: t().sync.signInToBuy };
    let res: Response;
    try {
      res = await fetch(`/api/sni/pets?${new URLSearchParams({ country })}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kind, progress: game.getSnapshot() }),
        cache: "no-store",
      });
    } catch {
      return { error: t().sync.offline };
    }
    if (res.status === 401) {
      signOut();
      return { error: t().sync.expired };
    }
    const body = (await res.json().catch(() => ({}))) as {
      pet?: OwnedPet;
      pets?: Pets;
      progress?: GameState;
      rejected?: boolean;
      error?: string;
    };
    if (body.rejected && body.progress) {
      game.replace(body.progress);
      synced = game.getSnapshot();
    }
    if (!res.ok || !body.pet) return { error: serverError(body.error) ?? t().sync.buyFailed };

    // The stored progress has the price taken off and counted in shopSpent. Taps made while the request
    // was in flight stay: then the local progress is further along, and the push takes the price off it.
    if (body.progress) adopt(body.progress);
    set({ pets: body.pets ?? state.pets });
    void push();
    return { pet: body.pet };
  },

  /**
   * The upgrader: tries to raise an owned pet's rarity by one. On failure the pet is gone and its number
   * returns to the shop. Returns whether it worked and the pet after it.
   */
  async upgradePet(petId: number): Promise<{ success: boolean; pet: OwnedPet | null } | { error: string }> {
    if (!state.token) return { error: t().sync.signInToBuy };
    let res: Response;
    try {
      res = await fetch("/api/sni/pets/upgrade", {
        method: "POST",
        headers: { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pet: petId }),
        cache: "no-store",
      });
    } catch {
      return { error: t().sync.offline };
    }
    if (res.status === 401) {
      signOut();
      return { error: t().sync.expired };
    }
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; pet?: OwnedPet | null; pets?: Pets; error?: string };
    if (!res.ok || body.success === undefined) return { error: serverError(body.error) ?? t().pets.upgradeFailed };
    set({ pets: body.pets ?? state.pets });
    return { success: body.success, pet: body.pet ?? null };
  },

  /** Pins an owned pet to the profile in the RemnaWeb Mini App, where it flies around the avatar, or unpins it. */
  async pinPet(petId: number, pinned: boolean): Promise<{ error?: string }> {
    if (!state.token) return { error: t().sync.signInToPin };
    let res: Response;
    try {
      res = await fetch("/api/sni/pets", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${state.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pet: petId, pinned }),
        cache: "no-store",
      });
    } catch {
      return { error: t().sync.offline };
    }
    if (res.status === 401) {
      signOut();
      return { error: t().sync.expired };
    }
    const body = (await res.json().catch(() => ({}))) as { pets?: Pets; error?: string };
    if (!res.ok || !body.pets) return { error: serverError(body.error) ?? t().sync.pinFailed };
    set({ pets: body.pets });
    return {};
  },

  signOut,
};
