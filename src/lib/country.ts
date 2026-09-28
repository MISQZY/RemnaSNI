import "server-only";
import type { Locale } from "@/i18n/locales";
import { loadSite } from "@/lib/site-game";

export type Country = { code: string; name: string };

const FALLBACK: Country = { code: "xx", name: "Nowhere" };

/** Country of this node as RemnaWeb tells (lib/site-game.ts), named in `locale`. */
export async function siteCountry(locale: Locale = "en"): Promise<Country> {
  const { country: code } = await loadSite();
  if (code === "xx") return FALLBACK;
  // DisplayNames echoes unknown codes back unchanged.
  const name = new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase());
  return name && name !== code.toUpperCase() ? { code, name } : FALLBACK;
}
