import type { Locale } from "./locales";
import clickerEn from "../../../messages/clicker/en.json";
import clickerRu from "../../../messages/clicker/ru.json";
import coreEn from "../../../messages/core/en.json";
import coreRu from "../../../messages/core/ru.json";
import snakeEn from "../../../messages/snake/en.json";
import snakeRu from "../../../messages/snake/ru.json";

// The catalogs of messages/<scope>/<locale>.json: the core's (header, account, session, units) and each game's
// under its own top-level namespaces. A new game adds its folder here, next to its id in core/games.ts.

/** Each scope's catalogs; they never share a top-level key (checked by messages.test.ts). */
export const CATALOGS = {
  core: { en: coreEn, ru: coreRu },
  clicker: { en: clickerEn, ru: clickerRu },
  snake: { en: snakeEn, ru: snakeRu },
};

const en = { ...coreEn, ...clickerEn, ...snakeEn };
const ru = { ...coreRu, ...clickerRu, ...snakeRu };

export type Messages = typeof en;

/** Both languages are small, so both ship: code outside React (sync, toasts of the game loop) needs the current one. */
export const MESSAGES: Record<Locale, Messages> = { en, ru };
