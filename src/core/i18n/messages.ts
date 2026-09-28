import type { Locale } from "./locales";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";

export type Messages = typeof en;

/** Both catalogs are small, so both ship: code outside React (sync, toasts of the game loop) needs the current one. */
export const MESSAGES: Record<Locale, Messages> = { en, ru };
