import "server-only";
import type { Locale } from "@/lib/i18n";

export type Country = { code: string; name: string };

const FALLBACK: Country = { code: "xx", name: "Nowhere" };

/**
 * Country of this node from NODE_COUNTRY (ISO 3166-1 alpha-2), named in `locale`.
 * Must be called during dynamic rendering so the value comes from the running container, not the build.
 */
export function nodeCountry(locale: Locale = "en"): Country {
  const code = process.env.NODE_COUNTRY?.trim().toLowerCase() ?? "";
  if (!/^[a-z]{2}$/.test(code)) return FALLBACK;
  // DisplayNames echoes unknown codes back unchanged.
  const name = new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase());
  return name && name !== code.toUpperCase() ? { code, name } : FALLBACK;
}
