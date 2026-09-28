import type { Locale } from "@/core/i18n/locales";
import type { Messages } from "@/core/i18n/messages";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
