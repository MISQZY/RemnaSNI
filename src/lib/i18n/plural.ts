/** Russian plural form: 1 очко, 2 очка, 5 очков. */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const abs = Math.abs(Math.floor(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
