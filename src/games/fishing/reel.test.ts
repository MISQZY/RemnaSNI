import { describe, expect, it } from "vitest";
import { newReel, stepReel, zoneSize } from "./reel";
import { isFishingRules, rollCatch, type FishingRules } from "./rules";

const RULES = { zone: 0.3, fillPerSec: 0.3, drainPerSec: 0.22 };

/** Plays a fight at 60 fps with `play` deciding to hold; returns its end and how long it took, s. */
function fight(strength: number, play: (r: ReturnType<typeof newReel>) => boolean, rand = Math.random) {
  const r = newReel(RULES, strength);
  for (let t = 0; t < 120; t += 1 / 60) {
    const end = stepReel(r, RULES, 1 / 60, play(r), rand);
    if (end !== "fight") return { end, seconds: t };
  }
  return { end: "fight", seconds: 120 };
}

/** A player keeping the zone's middle on the fish, leading by its speed. */
const follow = (r: ReturnType<typeof newReel>) => r.zone + r.size / 2 + r.speed * 0.2 < r.fish;

describe("the reel", () => {
  it("narrows the zone for strong fish and widens it with the line", () => {
    expect(zoneSize(RULES, 1)).toBeLessThan(zoneSize(RULES, 0));
    expect(zoneSize(RULES, 0.5, 0.45)).toBeCloseTo(zoneSize(RULES, 0.5) * 1.45);
  });

  it("loses the fish left alone, a strong one too", () => {
    expect(fight(0.2, () => false, () => 0.99).end).toBe("lost");
    expect(fight(1, () => false).end).toBe("lost");
  });

  it("lands a weak fish for a player who follows it, in a few seconds at the least", () => {
    let landed = 0;
    for (let i = 0; i < 20; i++) {
      const { end, seconds } = fight(0.15, follow);
      if (end === "caught") {
        landed++;
        // Never faster than filling from the start: 0.7 / 0.3 s. RemnaWeb takes 2 s at the least.
        expect(seconds).toBeGreaterThan(2.3);
      }
    }
    expect(landed).toBeGreaterThan(15);
  });
});

describe("the rules", () => {
  const rules: FishingRules = {
    ...RULES,
    hookWindowMs: 1_000,
    biteMinMs: 1_500,
    biteMaxMs: 5_500,
    value: { base: 600, step: 3_600 },
    averageValue: 1,
    species: [
      { id: "roach", rarity: "common", weight: 3, value: 0.5, strength: 0.1, minKg: 0.1, maxKg: 0.5, name: { en: "Roach", ru: "Плотва" } },
      { id: "goldfish", rarity: "legendary", weight: 1, value: 2.5, strength: 1, minKg: 0.1, maxKg: 0.5, name: { en: "Golden Fish", ru: "Золотая рыбка" } },
    ],
  };

  it("take RemnaWeb's shape and refuse a broken one", () => {
    expect(isFishingRules(rules)).toBe(true);
    expect(isFishingRules({ ...rules, species: [] })).toBe(false);
    expect(isFishingRules({ ...rules, species: [{ ...rules.species[0], rarity: "mythic" }] })).toBe(false);
    expect(isFishingRules(undefined)).toBe(false);
  });

  it("roll a fish without an account at the price RemnaWeb would pay", () => {
    const seq = [0.9, 0];
    const fish = rollCatch(rules, 2, "ru", () => seq.shift()!);
    expect(fish).toMatchObject({ id: "goldfish", name: "Золотая рыбка", kg: 0.1 });
    expect(fish.qzr).toBe(Math.round((600 + 3_600 * 2) * 2.5 * 0.5));
  });
});
