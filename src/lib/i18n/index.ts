import { en, type Dict } from "./en";
import { ru } from "./ru";

export { plural } from "./plural";

// Interface languages. English is the default; the choice is kept in the `lang` cookie so the
// server renders the page in it right away.

export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ru: "Русский" };

export const dictionaries: Record<Locale, Dict> = { en, ru };

export type { Dict };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

// Code outside React (sync, toasts from the game loop) reads the language through here;
// the I18nProvider keeps it current in the browser.
let current: Locale = DEFAULT_LOCALE;

export const currentLocale = () => current;
export const setCurrentLocale = (locale: Locale) => {
  current = locale;
};
/** The dictionary of the current language, for code outside React. */
export const t = () => dictionaries[current];

/** Remembers the language for a year and returns; the caller refreshes the page data. */
export function storeLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  setCurrentLocale(locale);
}
