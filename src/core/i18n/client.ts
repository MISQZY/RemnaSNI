import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./locales";
import { MESSAGES } from "./messages";

// Code outside React (sync, toasts from the game loop) reads the language through here; IntlProvider keeps
// it current in the browser.

let current: Locale = DEFAULT_LOCALE;

export const currentLocale = () => current;
export const setCurrentLocale = (locale: Locale) => {
  current = locale;
};

/** Messages of the current language, for code outside React. */
export const tr = () => createTranslator({ locale: current, messages: MESSAGES[current] });

/** Remembers the language for a year; the caller refreshes the page data. */
export function storeLocale(locale: Locale) {
  // In a frame (the RemnaWeb Mini App) a lax cookie is never sent; a partitioned one stays with that embedding.
  const attrs = window.parent === window ? "samesite=lax" : "samesite=none; secure; partitioned";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; ${attrs}`;
  setCurrentLocale(locale);
}
