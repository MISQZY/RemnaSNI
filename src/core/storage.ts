// The browser's storage for every game, under the site's `remnasni:` prefix (keys already stored keep their
// names: never rename one). Reads and writes never throw: without storage (private mode, full, blocked, or
// on the server) a read finds nothing and a write lasts until the page closes.

const PREFIX = "remnasni:";

function store(kind: "local" | "session"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function read(kind: "local" | "session", key: string): string | null {
  try {
    return store(kind)?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

/** Writes `value`, or removes the key for null. */
function write(kind: "local" | "session", key: string, value: string | null) {
  try {
    const s = store(kind);
    if (value === null) s?.removeItem(PREFIX + key);
    else s?.setItem(PREFIX + key, value);
  } catch {
    // Kept in memory only, see above.
  }
}

function readJSON(kind: "local" | "session", key: string): unknown {
  const raw = read(kind, key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

const writeJSON = (kind: "local" | "session", key: string, value: unknown) => write(kind, key, value === null ? null : JSON.stringify(value));

/** Kept on this device for good. */
export const storage = {
  get: (key: string) => read("local", key),
  set: (key: string, value: string | null) => write("local", key, value),
  /** The parsed value, null when missing or broken; the caller checks its shape. */
  getJSON: (key: string) => readJSON("local", key),
  setJSON: (key: string, value: unknown) => writeJSON("local", key, value),
};

/** Kept until the tab closes. */
export const tabStorage = {
  get: (key: string) => read("session", key),
  set: (key: string, value: string | null) => write("session", key, value),
  /** Reads the value and removes it. */
  take(key: string) {
    const value = read("session", key);
    write("session", key, null);
    return value;
  },
};
