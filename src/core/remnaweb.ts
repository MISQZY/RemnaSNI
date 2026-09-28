import "server-only";

/**
 * Origin of RemnaWeb from REMNAWEB_URL; without it sign-in and sync are hidden. Read at request time and
 * used on the server only. https is required (plain http only to localhost): tokens and the game rules travel over it.
 */
export function syncUrl(): string | null {
  const raw = process.env.REMNAWEB_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.protocol === "https:" || (url.protocol === "http:" && local) ? url.origin : null;
  } catch {
    return null;
  }
}
