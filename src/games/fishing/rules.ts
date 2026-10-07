import type { Locale } from "@/core/i18n/locales";
import { START_PROGRESS, zoneSize, type ReelSetup } from "./reel";

// How the fishing plays and what a fish is worth. RemnaWeb is the source of truth (lib/fishing-rules.ts there): its
// rules come with the other games' from GET /api/sni/config under `fishing` (config-server.ts). These types mirror
// it. Signed in, RemnaWeb rolls every fish, picks its fight and pays for it; the rarities, the species and the reel
// numbers here are for playing without an account.
//
// A fish is a rarity and a weight within that rarity's range, which make its price and its pull; its species is only
// a name, drawn at random apart from them.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** A rarity: how often it bites (`weight`), its price against the average fish, how hard it fights, its weights. */
export type FishRarity = {
  id: Rarity;
  weight: number;
  value: number;
  /** 0 to 1: the fish darts faster and the catch zone is narrower. */
  strength: number;
  minKg: number;
  maxKg: number;
};

/** A species: a name only. */
export type FishSpecies = { id: string; name: Record<Locale, string> };

export type FishingRules = {
  /** How long a bite waits to be hooked without an account, ms (RemnaWeb sends it with the cast otherwise). */
  hookWindowMs: number;
  /** For playing without an account: the catch zone, a share of the reel's track, before the fish's strength. */
  zone: number;
  /** Catch progress gained per second with the fish in the zone, and lost with it out (0 to 1). */
  fillPerSec: number;
  drainPerSec: number;
  /** The wait for a bite when playing without an account (RemnaWeb picks it otherwise), ms. */
  biteMinMs: number;
  biteMaxMs: number;
  /** Price of the average fish number `n` (from 0) caught in the country: base + step × n. */
  value: { base: number; step: number };
  /** The weighted average of the rarities' values, which prices are divided by. */
  averageValue: number;
  rarities: FishRarity[];
  species: FishSpecies[];
};

/** A fish on the hook, landed: RemnaWeb's answer, or one rolled here without an account. */
export type Catch = { id: string; name: string; rarity: Rarity; kg: number; qzr: number; bonus: number; keys: number };

const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);
const RARITIES = new Set<unknown>(["common", "uncommon", "rare", "epic", "legendary"]);

/** Whether RemnaWeb's `fishing` rules have the shape the game relies on; an older RemnaWeb sends none. */
export function isFishingRules(v: unknown): v is FishingRules {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return false;
  const value = r.value as Record<string, unknown> | null;
  return (
    ["hookWindowMs", "zone", "fillPerSec", "drainPerSec", "biteMinMs", "biteMaxMs", "averageValue"].every((k) => isNum(r[k])) &&
    (r.averageValue as number) > 0 &&
    !!value &&
    isNum(value.base) &&
    isNum(value.step) &&
    Array.isArray(r.rarities) &&
    r.rarities.length > 0 &&
    r.rarities.every((f: Record<string, unknown>) => RARITIES.has(f?.id) && ["weight", "value", "strength", "minKg", "maxKg"].every((k) => isNum(f[k]))) &&
    Array.isArray(r.species) &&
    r.species.length > 0 &&
    r.species.every((f: Record<string, unknown>) => {
      const name = f?.name as Record<string, unknown> | undefined;
      return typeof f?.id === "string" && typeof name?.en === "string" && typeof name?.ru === "string";
    })
  );
}

/** Price of the average fish number `n` (from 0), as RemnaWeb computes it. */
export const fishValue = (r: FishingRules, n: number) => r.value.base + r.value.step * n;

/**
 * A bite without an account: the rarity by its chances, the weight within its range (light ones most often), a
 * species of any, the would-be price (of the rarity and the weight), and how hard the fish pulls.
 */
export function rollCatch(r: FishingRules, n: number, locale: Locale, rand = Math.random): { fish: Catch; strength: number } {
  const total = r.rarities.reduce((sum, f) => sum + f.weight, 0);
  let pick = rand() * total;
  let i = 0;
  while (i < r.rarities.length - 1 && pick >= r.rarities[i].weight) pick -= r.rarities[i++].weight;
  const rarity = r.rarities[i];
  const t = rand();
  const species = r.species[Math.min(r.species.length - 1, Math.floor(rand() * r.species.length))];
  const qzr = Math.round((fishValue(r, n) * rarity.value * (0.5 + 1.5 * t * t)) / r.averageValue);
  const kg = Math.round((rarity.minKg + (rarity.maxKg - rarity.minKg) * t * t) * 100) / 100;
  return { fish: { id: species.id, name: species.name[locale], rarity: rarity.id, kg, qzr, bonus: 0, keys: 0 }, strength: rarity.strength };
}

/** The wait for a bite without an account, ms. */
export const localBiteMs = (r: FishingRules, rand = Math.random) => Math.round(r.biteMinMs + (r.biteMaxMs - r.biteMinMs) * rand());

/** The fight with a fish of `strength` without an account (RemnaWeb picks it otherwise, lib/fishing.ts there). */
export const localReel = (r: FishingRules, strength: number, rand = Math.random): ReelSetup => ({
  seed: Math.floor(rand() * 2 ** 31),
  strength,
  size: zoneSize(r.zone, strength),
  fill: r.fillPerSec,
  drain: r.drainPerSec,
  start: START_PROGRESS,
});
