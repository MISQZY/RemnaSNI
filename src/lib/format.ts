const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** 1234 -> "1,234", 1234567 -> "1.23M"; `fraction` keeps one decimal below 10. */
export function formatNumber(n: number, fraction = false): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 10 && fraction && !Number.isInteger(n)) return n.toFixed(1);
  if (n < 100_000) return Math.floor(n).toLocaleString("en-US");
  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const value = n / 10 ** (tier * 3);
  return `${value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** i;
  return `${v.toFixed(i === 0 || v >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}
