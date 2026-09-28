import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./locales";
import { MESSAGES } from "./messages";

/** The language chosen in the `lang` cookie (src/proxy.ts sets it from ?lang=), English otherwise. */
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  // Dates and times are not formatted by next-intl: the zone only silences its warning.
  return { locale, messages: MESSAGES[locale], timeZone: "UTC" };
});
