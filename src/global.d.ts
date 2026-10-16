import type { Locale } from "@/core/i18n/locales";
import type { Messages } from "@/games";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
