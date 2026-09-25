"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration, formatNumber } from "@/lib/format";
import { LOCALES, LOCALE_NAMES, dictionaries, setCurrentLocale, storeLocale, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

/** Hands the language the server rendered with to client components and to code outside React. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  // Set while rendering, not in an effect: child effects (the welcome-back toast) run first.
  setCurrentLocale(locale);
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/** The dictionary of the current language and formatters bound to it. */
export function useI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: dictionaries[locale],
    num: (n: number, fraction = false) => formatNumber(n, fraction, locale),
    /** `n.toFixed(digits)` with the language's decimal separator. */
    fixed: (n: number, digits: number) => n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    bytes: (n: number) => formatBytes(n, locale),
    duration: (seconds: number) => formatDuration(seconds, locale),
    date: (value: string | number) => new Date(value).toLocaleDateString(locale),
    time: (value: number) => new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Switches to the next language and re-renders the page in it. */
export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`${t.header.language}: ${LOCALE_NAMES[next]}`}
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
