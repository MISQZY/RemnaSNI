"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import { useMemo, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { setCurrentLocale, storeLocale } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";
import { formatBytes, formatDuration, formatNumber } from "@/lib/format";

/** Hands the language the server rendered with, and its messages, to client components and to code outside React. */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  // Set while rendering, not in an effect: child effects (the welcome-back toast) run first.
  setCurrentLocale(locale);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

/** Formatters bound to the current language. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      num: (n: number, fraction = false) => formatNumber(n, fraction, locale),
      /** `n.toFixed(digits)` with the language's decimal separator. */
      fixed: (n: number, digits: number) => n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
      bytes: (n: number) => formatBytes(n, locale),
      duration: (seconds: number) => formatDuration(seconds, locale),
      date: (value: string | number) => new Date(value).toLocaleDateString(locale),
      time: (value: number) => new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    }),
    [locale],
  );
}

/** Switches to the next language and re-renders the page in it. */
export function LanguageSwitch() {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`${t("language")}: ${LOCALE_NAMES[next]}`}
      title={LOCALE_NAMES[next]}
      onClick={() => {
        storeLocale(next);
        startTransition(() => router.refresh());
      }}
    >
      <Languages /> {locale.toUpperCase()}
    </Button>
  );
}
