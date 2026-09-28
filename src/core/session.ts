import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { tr } from "@/core/i18n/client";
import type { SiteLook } from "@/core/look";
import { storage, tabStorage } from "@/core/storage";

// The Telegram session every game shares: sign-in through RemnaWeb, which runs the OAuth flow and hands the
// token back in the URL fragment, or the session of the RemnaWeb Mini App when the site runs in its frame.
// Knows nothing of any game, so a game importing it pulls in no other game's code.

const TOKEN_KEY = "token";
/** Random value sent to the sign-in and expected back with the token, so a token planted in a link is refused. */
const STATE_KEY = "sign-in-state";

/** The player as RemnaWeb tells, with the cosmetics bought there (missing from older RemnaWeb versions). */
export type Account = { name: string; photoUrl: string | null; look?: SiteLook };
export type SessionState = {
  /** Whether sign-in is available at all: the site has REMNAWEB_URL and a game started the session. */
  enabled: boolean;
  token: string | null;
  /** The signed-in account, once a game has loaded it from RemnaWeb. */
  account: Account | null;
};

const SIGNED_OUT: SessionState = { enabled: false, token: null, account: null };

let state = SIGNED_OUT;
const listeners = new Set<() => void>();

function set(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Without storage the session lasts until the tab closes. */
const storeToken = (token: string | null) => storage.set(TOKEN_KEY, token);

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
  const expected = tabStorage.take(STATE_KEY);
  const t = tr();
  if (!expected || params.get("sni_state") !== expected) {
    toast.error(t("session.signInFailed"), { description: t("session.tryLater") });
    return;
  }
  if (token) storeToken(token);
  if (error) {
    const known = `session.signInErrors.${error}` as "session.signInErrors.disabled";
    toast.error(t("session.signInFailed"), { description: t.has(known) ? t(known) : t("session.tryLater") });
  }
}

/**
 * Inside the RemnaWeb Mini App the site runs in a frame: it asks the parent for the Mini App user's
 * session instead of a Telegram sign-in, which cannot run in a frame. Only RemnaWeb may frame the site
 * (frame-ancestors in the Caddyfile), so a session from the parent is trusted. Returns a cleanup.
 */
function listenToParent(onSession: () => void): () => void {
  if (window.parent === window) return () => {};
  const onMessage = (e: MessageEvent) => {
    const data = e.data as { type?: unknown; token?: unknown } | null;
    if (e.source !== window.parent || data?.type !== "sni:session" || typeof data.token !== "string") return;
    if (data.token === state.token) return;
    storeToken(data.token);
    set({ token: data.token });
    onSession();
  };
  window.addEventListener("message", onMessage);
  window.parent.postMessage({ type: "sni:hello" }, "*");
  return () => window.removeEventListener("message", onMessage);
}

export const session = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => SIGNED_OUT,

  /**
   * Takes the session from a finished sign-in, the stored token or the parent frame. `onSession` runs when
   * the parent frame hands over a new one. Returns a cleanup.
   */
  start(onSession: () => void) {
    set({ enabled: true });
    consumeFragment();
    const token = storage.get(TOKEN_KEY);
    if (token) set({ token });
    return listenToParent(onSession);
  },

  /** Keeps a renewed session token handed back by RemnaWeb. */
  keep(token: string) {
    storeToken(token);
    set({ token });
  },

  setAccount(account: Account) {
    set({ account });
  },

  /** Where the sign-in starts; remembers the state it sends, so call it right before navigating. */
  signInUrl() {
    const back = `${location.origin}${location.pathname}`;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const signInState = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    // Without storage the token cannot be checked and is refused; nothing else to do.
    tabStorage.set(STATE_KEY, signInState);
    return `/api/sni/auth/start?${new URLSearchParams({ return_to: back, state: signInState })}`;
  },

  /** Signs out on this device only. */
  signOut() {
    storeToken(null);
    set({ token: null, account: null });
  },

  /** Signs out on every device and site: the sessions issued so far stop working. Returns an error to show. */
  async signOutEverywhere(): Promise<{ error?: string }> {
    const token = state.token;
    if (!token) return {};
    try {
      const res = await fetch("/api/sni/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      // 401: that session is over already.
      if (!res.ok && res.status !== 401) return { error: tr()("session.tryLater") };
    } catch {
      return { error: tr()("session.offline") };
    }
    session.signOut();
    return {};
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
}
