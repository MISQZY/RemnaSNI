import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

// The Telegram session every game shares: sign-in through RemnaWeb, which runs the OAuth flow and hands the
// token back in the URL fragment, or the session of the RemnaWeb Mini App when the site runs in its frame.
// Knows nothing of any game, so a game importing it pulls in no other game's code.

const TOKEN_KEY = "remnasni:token";
/** Random value sent to the sign-in and expected back with the token, so a token planted in a link is refused. */
const STATE_KEY = "remnasni:sign-in-state";

export type Account = { name: string; photoUrl: string | null };
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
    const token = readToken();
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
    try {
      sessionStorage.setItem(STATE_KEY, signInState);
    } catch {
      // Without storage the token cannot be checked and is refused; nothing else to do.
    }
    return `/api/sni/auth/start?${new URLSearchParams({ return_to: back, state: signInState })}`;
  },

  /** Signs out on this device only. */
  signOut() {
    storeToken(null);
    set({ token: null, account: null });
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
}
