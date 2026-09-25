import "server-only";

export type Country = { code: string; name: string };

const FALLBACK: Country = { code: "xx", name: "Nowhere" };

/**
 * Country of this node from NODE_COUNTRY (ISO 3166-1 alpha-2).
 * Must be called during dynamic rendering so the value comes from the running container, not the build.
 */
export function nodeCountry(): Country {
  const code = process.env.NODE_COUNTRY?.trim().toLowerCase() ?? "";
  if (!/^[a-z]{2}$/.test(code)) return FALLBACK;
  // DisplayNames echoes unknown codes back unchanged.
  const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase());
  return name && name !== code.toUpperCase() ? { code, name } : FALLBACK;
}
