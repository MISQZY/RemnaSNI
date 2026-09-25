import "server-only";

/** Origin of RemnaWeb from REMNAWEB_URL; without it sign-in and sync are hidden. Read at request time. */
export function syncUrl(): string | null {
  const raw = process.env.REMNAWEB_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}
