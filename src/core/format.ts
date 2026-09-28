import { createTranslator } from "next-intl";
import type { Locale } from "@/core/i18n/locales";
import { MESSAGES } from "@/core/i18n/messages";

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** 1234 -> "1 234" (narrow no-break space), 1234567 -> "1.23M"; the dot is only ever a decimal point. `fraction` keeps one decimal below 10. */
export function formatNumber(n: number, fraction = false, locale: Locale = "en"): string {
  const text = formatPlain(n, fraction);
  // Russian writes the decimal point as a comma; thousands are already split by spaces.
  return locale === "ru" ? text.replace(".", ",") : text;
}

function formatPlain(n: number, fraction: boolean): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 10 && fraction && !Number.isInteger(n)) return n.toFixed(1);
  if (n < 100_000) return Math.floor(n).toLocaleString("en-US").replaceAll(",", " ");
  let tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  let value = n / 10 ** (tier * 3);
  // Rounding may reach the next tier: 999 999 is 1M, not 1000K.
  if (Math.round(value) >= 1000 && tier < SUFFIXES.length - 1) {
    tier++;
    value /= 1000;
  }
  // An all-zero fraction is dropped: 2M rather than 2.00M, while 2.50M keeps its digits.
  return `${value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0).replace(/\.0+$/, "")}${SUFFIXES[tier]}`;
}

const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte", "petabyte"] as const;

/** 1536 -> "1.5 kB" / "1,5 КБ". */
export function formatBytes(bytes: number, locale: Locale = "en"): string {
  const i = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1) : 0;
  const v = bytes > 0 ? bytes / 1024 ** i : 0;
  const digits = i === 0 || v >= 100 ? 0 : 1;
  return new Intl.NumberFormat(locale, { style: "unit", unit: BYTE_UNITS[i], unitDisplay: "short", maximumFractionDigits: digits }).format(v);
}

/** "2h 5m" / "2 ч 5 мин"; under an hour, minutes only (at least one). */
export function formatDuration(seconds: number, locale: Locale = "en"): string {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "units" });
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? t("hoursMinutes", { h, m }) : t("minutes", { m: Math.max(m, 1) });
}
