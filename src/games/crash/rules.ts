// How the crash plays. RemnaWeb is the source of truth (lib/crash-rules.ts and lib/crash.ts there): it makes the
// rounds, rolls where each crashes and pays the bets; its numbers come with the other games' from GET /api/sni/config
// under `crash` (config-server.ts) and the rounds through the stream (stream.ts). These types and formulas mirror it.
// Multipliers are in hundredths: 243 is ×2.43.
//
// Provably fair: a round's seed hash (SHA-256) is shown from its start, the seed once it has crashed. The crash point
// comes from the seed alone, u = the first 52 bits of HMAC-SHA256(key: seed, message: "crash") / 2^52, so the page
// checks every crashed round itself (verifyRound).

/** The colors of the rounds, as the rarities of RemnaWeb's pets, from grey to cosmic. */
export type CrashTier = "common" | "rare" | "epic" | "legendary" | "mythic" | "cosmic";

export type CrashRules = {
  /** How long bets are taken before the multiplier starts, ms. */
  bettingMs: number;
  /** How long a crash is shown before the next round, ms. */
  pauseMs: number;
  /** The multiplier after `t` seconds of flight: e^(growth × t). */
  growth: number;
  /** The share of bets the game keeps on average: part of the crash point's formula. */
  edge: number;
  /** The highest crash point, hundredths. */
  maxCrash: number;
  /** The smallest bet, Qzr. */
  minBet: number;
  /** The lowest auto cash-out, hundredths. */
  minAuto: number;
  /** Where each color starts, hundredths, from grey up. */
  tiers: { tier: CrashTier; from: number }[];
};

export type CrashPhase = "idle" | "betting" | "flying" | "crashed";

/** A bet as everyone sees it: the first name of who made it (null when hidden), its cash-out once there is one. */
export type CrashBet = { id: number; name: string | null; amount: number; cashout: number | null; payout: number };

/** The player's own bet, with its round and its own cash-out. */
export type MyBet = CrashBet & { roundId: number; auto: number | null };

/** A crashed round with what checks it: its seed and the seed's hash. */
export type CrashRound = { id: number; crash: number; hash: string; seed: string };

/**
 * The game's state, as the stream sends it: RemnaWeb's clock (`now`, ms), the round (its seed's hash; its crash
 * point and seed only once it has crashed), its bets and the last rounds, newest first.
 */
export type CrashSnapshot = {
  now: number;
  phase: CrashPhase;
  round: { id: number; startAt: number; hash: string; crash: number | null; seed: string | null } | null;
  bets: CrashBet[];
  history: CrashRound[];
};

const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);
export const TIERS: CrashTier[] = ["common", "rare", "epic", "legendary", "mythic", "cosmic"];

/** Whether RemnaWeb's `crash` rules have the shape the game relies on; an older RemnaWeb sends none. */
export function isCrashRules(v: unknown): v is CrashRules {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return false;
  return (
    ["bettingMs", "pauseMs", "growth", "edge", "maxCrash", "minBet", "minAuto"].every((k) => isNum(r[k])) &&
    (r.growth as number) > 0 &&
    Array.isArray(r.tiers) &&
    r.tiers.length > 0 &&
    r.tiers.every((t: Record<string, unknown>) => TIERS.includes(t?.tier as CrashTier) && isNum(t.from))
  );
}

/** Whether a stream message is the game's state rather than just RemnaWeb's clock. */
export const isSnapshot = (v: unknown): v is CrashSnapshot =>
  !!v && typeof v === "object" && isNum((v as CrashSnapshot).now) && typeof (v as CrashSnapshot).phase === "string" && Array.isArray((v as CrashSnapshot).bets);

/** The multiplier `ms` into the flight, hundredths, floored as RemnaWeb floors it. */
export function multiplierAt(r: CrashRules, ms: number): number {
  if (ms <= 0) return 100;
  return Math.min(r.maxCrash, Math.floor(100 * Math.exp((r.growth * ms) / 1000) + 1e-9));
}

/** How long into the flight the multiplier reaches `hundredths`, ms. */
export const msToReach = (r: CrashRules, hundredths: number) => (hundredths <= 100 ? 0 : (Math.log(hundredths / 100) / r.growth) * 1000);

/** The color of a multiplier, hundredths. */
export function tierOf(r: CrashRules, hundredths: number): CrashTier {
  let tier: CrashTier = r.tiers[0]?.tier ?? "common";
  for (const t of r.tiers) if (hundredths >= t.from) tier = t.tier;
  return tier;
}

/** What a bet of `amount` brings cashed out at `hundredths`, Qzr. */
export const payoutOf = (amount: number, hundredths: number) => Math.floor((amount * hundredths) / 100);

/** The crash point of a round for a uniform `u` in [0, 1), hundredths, as RemnaWeb rolls it. */
export function crashPoint(r: Pick<CrashRules, "edge" | "maxCrash">, u: number): number {
  return Math.min(r.maxCrash, Math.max(100, Math.floor((100 * (1 - r.edge)) / (1 - u))));
}

/** The message the seed signs to give the round's u. */
export const FAIR_MESSAGE = "crash";

/** u in [0, 1) from the HMAC of a round's seed, as hex: its first 52 bits. */
export const uFromHmac = (hmacHex: string) => parseInt(hmacHex.slice(0, 13), 16) / 2 ** 52;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Whether a crashed round is honest: its seed hashes to the hash shown from its start, and gives its crash point.
 * Null where the browser cannot tell (no Web Crypto outside a secure context).
 */
export async function verifyRound(r: Pick<CrashRules, "edge" | "maxCrash">, round: CrashRound): Promise<boolean | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const enc = new TextEncoder();
  if (hex(await subtle.digest("SHA-256", enc.encode(round.seed))) !== round.hash) return false;
  const key = await subtle.importKey("raw", enc.encode(round.seed), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = hex(await subtle.sign("HMAC", key, enc.encode(FAIR_MESSAGE)));
  return crashPoint(r, uFromHmac(mac)) === round.crash;
}
