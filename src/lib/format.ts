import { dictionaries, type Locale } from "@/lib/i18n";

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
  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const value = n / 10 ** (tier * 3);
  return `${value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

export function formatBytes(bytes: number, locale: Locale = "en"): string {
  const units = dictionaries[locale].units.bytes;
  if (!bytes || bytes < 0) return `0 ${units[0]}`;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** i;
  const value = v.toFixed(i === 0 || v >= 100 ? 0 : 1);
  return `${locale === "ru" ? value.replace(".", ",") : value} ${units[i]}`;
}

export function formatDuration(seconds: number, locale: Locale = "en"): string {
  const { hours, minutes } = dictionaries[locale].units;
  const sep = locale === "ru" ? " " : "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}${sep}${hours} ${m}${sep}${minutes}` : `${Math.max(m, 1)}${sep}${minutes}`;
}
