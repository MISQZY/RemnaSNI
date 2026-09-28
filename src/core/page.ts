import "server-only";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { siteCountry } from "@/core/country";
import { remnaWebUrl } from "@/core/remnaweb";

/**
 * What a game's layout and pages start with: the page's language, the node's country named in it and whether
 * sign-in is available (REMNAWEB_URL is set). Rendered at request time: RemnaWeb tells the country, not the build.
 */
export async function nodePage() {
  await connection();
  const locale = await getLocale();
  const { code, name } = await siteCountry(locale);
  return { locale, code, name, signIn: remnaWebUrl() !== null };
}

/** A game's title, also the template of its pages' titles, and description. */
export const gameMetadata = (title: string, description: string): Metadata => ({
  title: { default: title, template: `%s · ${title}` },
  description,
});
