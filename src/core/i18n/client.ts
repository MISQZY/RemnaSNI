import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./locales";
import type { Messages } from "./messages";

// Code outside React (sync, toasts from the game loop) reads the language through here; I18nProvider keeps it
// current in the browser with the messages the server handed over: the core's and the node's game's only, so
// no catalog is bundled into the page's JS.

let current: { locale: Locale; messages: Messages | null } = { locale: DEFAULT_LOCALE, messages: null };

export const currentLocale = () => current.locale;
export const setCurrentLocale = (locale: Locale, messages: Messages) => {
  current = { locale, messages };
};

/** Messages of the current language, for code outside React. */
export const tr = () => createTranslator({ locale: current.locale, messages: current.messages ?? ({} as Messages) });

/** Remembers the language for a year; the caller refreshes the page, which brings its messages. */
export function storeLocale(locale: Locale) {
  // In a frame (the RemnaWeb Mini App) a lax cookie is never sent; a partitioned one stays with that embedding.
  const attrs = window.parent === window ? "samesite=lax" : "samesite=none; secure; partitioned";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; ${attrs}`;
}
