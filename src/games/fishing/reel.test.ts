import { describe, expect, it } from "vitest";
import { MAX_TICKS, START_PROGRESS, newReel, replayReel, stepReel, zoneSize, type ReelSetup } from "./reel";
import { isFishingRules, localReel, rollCatch, type FishingRules } from "./rules";

const RULES = { zone: 0.3, fillPerSec: 0.3, drainPerSec: 0.22 };
const setup = (strength: number, seed = 1): ReelSetup => ({ seed, strength, size: zoneSize(RULES.zone, strength), fill: RULES.fillPerSec, drain: RULES.drainPerSec, start: START_PROGRESS });

/** Plays a fight with `play` deciding to hold, recording the flips as the site does; its end, ticks and flips. */
function fight(s: ReelSetup, play: (r: ReturnType<typeof newReel>) => boolean) {
  const r = newReel(s);
  const flips: number[] = [];
  for (;;) {
    const hold = play(r);
    if (hold !== r.holding) {
      flips.push(r.tick);
      r.holding = hold;
    }
    const end = stepReel(r, s);
    if (end !== "fight") return { end, ticks: r.tick, flips };
  }
}

/** A player keeping the zone's middle on the fish, leading by its speed. */
const follow = (s: ReelSetup) => (r: ReturnType<typeof newReel>) => r.zone + s.size / 2 + r.speed * 0.2 < r.fish;

describe("the reel", () => {
  it("narrows the zone for strong fish and widens it with the line", () => {
    expect(zoneSize(RULES.zone, 1)).toBeLessThan(zoneSize(RULES.zone, 0));
    expect(zoneSize(RULES.zone, 0.5, 0.45)).toBeCloseTo(zoneSize(RULES.zone, 0.5) * 1.45);
  });

  it("loses the fish left alone, a strong one all the more", () => {
    const lost = (strength: number) => Array.from({ length: 20 }, (_, seed) => fight(setup(strength, seed), () => false).end).filter((e) => e === "lost").length;
    // A weak fish may now and then stay low, in the zone on the bottom, for long enough.
    expect(lost(0.2)).toBeGreaterThan(12);
    expect(lost(1)).toBeGreaterThan(17);
  });

  it("lands a weak fish for a player who follows it, in a few seconds at the least", () => {
    let landed = 0;
    for (let seed = 0; seed < 20; seed++) {
      const s = setup(0.15, seed);
      const { end, ticks } = fight(s, follow(s));
      if (end === "caught") {
        landed++;
        // Never faster than filling from the start: 0.7 / 0.3 s.
        expect(ticks / 60).toBeGreaterThan(2.3);
      }
    }
    expect(landed).toBeGreaterThan(15);
  });

  it("replays to the same end from the flips, as RemnaWeb checks it", () => {
    for (let seed = 0; seed < 10; seed++) {
      const s = setup(0.7, seed * 7919);
      const played = fight(s, follow(s));
      expect(replayReel(s, played.flips)).toEqual({ end: played.end, ticks: played.ticks });
    }
  });

  it("gives up on a fight dragged out for too long", () => {
    expect(replayReel({ ...setup(0), size: 1, fill: 0, drain: 0 }, [])).toEqual({ end: "lost", ticks: MAX_TICKS });
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
    rarities: [
      { id: "common", weight: 3, value: 0.5, strength: 0.1, minKg: 0.1, maxKg: 0.5 },
      { id: "legendary", weight: 1, value: 2.5, strength: 1, minKg: 10, maxKg: 50 },
    ],
    species: [
      { id: "roach", name: { en: "Roach", ru: "Плотва" } },
      { id: "goldfish", name: { en: "Golden Fish", ru: "Золотая рыбка" } },
    ],
  };

  it("take RemnaWeb's shape and refuse a broken one", () => {
    expect(isFishingRules(rules)).toBe(true);
    expect(isFishingRules({ ...rules, species: [] })).toBe(false);
    expect(isFishingRules({ ...rules, rarities: [{ ...rules.rarities[0], id: "mythic" }] })).toBe(false);
    expect(isFishingRules({ ...rules, species: [{ id: "roach" }] })).toBe(false);
    expect(isFishingRules(undefined)).toBe(false);
  });

  it("roll a fish without an account at the price RemnaWeb would pay: of its rarity and weight, whatever its species", () => {
    const seq = [0.9, 0, 0];
    const { fish, strength } = rollCatch(rules, 2, "ru", () => seq.shift()!);
    expect(fish).toMatchObject({ id: "roach", name: "Плотва", rarity: "legendary", kg: 10 });
    expect(fish.qzr).toBe(Math.round((600 + 3_600 * 2) * 2.5 * 0.5));
    expect(strength).toBe(1);
    const next = [0, 0, 0.99];
    const golden = rollCatch(rules, 2, "ru", () => next.shift()!);
    expect(golden.fish).toMatchObject({ id: "goldfish", rarity: "common" });
  });

  it("set up a fight without an account from the reel numbers", () => {
    expect(localReel(rules, 0.5, () => 0.5)).toEqual({ seed: 2 ** 30, strength: 0.5, size: zoneSize(0.3, 0.5), fill: 0.3, drain: 0.22, start: START_PROGRESS });
  });
});
