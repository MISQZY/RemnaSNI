// Interface languages. English is the default; the choice is kept in the `lang` cookie (or comes as ?lang=
// from the RemnaWeb Mini App, src/proxy.ts) so the server renders the page in it right away. Messages live in
// messages/<locale>.json (ICU MessageFormat, rendered by next-intl); en.json is the reference the types come from.

export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";
/** Header with the interface language, passed on to RemnaWeb by the API proxy so its errors come in it. */
export const LOCALE_HEADER = "x-locale";

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ru: "Русский" };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);
