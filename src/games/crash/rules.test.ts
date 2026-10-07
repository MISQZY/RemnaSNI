import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { crashPoint, isCrashRules, isSnapshot, msToReach, multiplierAt, payoutOf, tierOf, uFromHmac, verifyRound, type CrashRules } from "./rules";

// RemnaWeb's defaults (lib/crash-rules.ts there).
const RULES: CrashRules = {
  bettingMs: 7_000,
  pauseMs: 3_000,
  growth: 0.06,
  edge: 0.03,
  maxCrash: 100_000,
  minBet: 100,
  minAuto: 101,
  tiers: [
    { tier: "common", from: 100 },
    { tier: "rare", from: 200 },
    { tier: "epic", from: 500 },
    { tier: "legendary", from: 1_000 },
    { tier: "mythic", from: 5_000 },
    { tier: "cosmic", from: 25_000 },
  ],
};

describe("the multiplier", () => {
  it("grows as RemnaWeb's does: ×1.00 at the start, ×2.00 after about 11.5 s", () => {
    expect(multiplierAt(RULES, 0)).toBe(100);
    expect(multiplierAt(RULES, 11_553)).toBe(200);
    expect(multiplierAt(RULES, 11_500)).toBe(199);
    expect(multiplierAt(RULES, 60 * 60_000)).toBe(RULES.maxCrash);
  });

  it("takes the time to reach a point that the chart's scale expects", () => {
    expect(msToReach(RULES, 100)).toBe(0);
    expect(multiplierAt(RULES, Math.ceil(msToReach(RULES, 500)))).toBe(500);
  });
});

it("colors a round from grey to cosmic", () => {
  expect(tierOf(RULES, 100)).toBe("common");
  expect(tierOf(RULES, 250)).toBe("rare");
  expect(tierOf(RULES, 700)).toBe("epic");
  expect(tierOf(RULES, 1_000)).toBe("legendary");
  expect(tierOf(RULES, 9_999)).toBe("mythic");
  expect(tierOf(RULES, 30_000)).toBe("cosmic");
});

it("pays a cash-out floored to a whole Qzr", () => {
  expect(payoutOf(1_000, 243)).toBe(2_430);
});

describe("RemnaWeb's answers", () => {
  it("take the rules in their shape only", () => {
    expect(isCrashRules(RULES)).toBe(true);
    expect(isCrashRules({ ...RULES, growth: 0 })).toBe(false);
    expect(isCrashRules({ ...RULES, tiers: [{ tier: "gold", from: 100 }] })).toBe(false);
    expect(isCrashRules(null)).toBe(false);
  });

  it("tell the state from the clock", () => {
    expect(isSnapshot({ now: 1, phase: "betting", round: null, bets: [], history: [] })).toBe(true);
    expect(isSnapshot({ now: 1 })).toBe(false);
  });
});

describe("fairness", () => {
  // A round as RemnaWeb makes it, with Node's crypto.
  const seed = "5f".repeat(32);
  const hash = createHash("sha256").update(seed).digest("hex");
  const crash = crashPoint(RULES, uFromHmac(createHmac("sha256", seed).update("crash").digest("hex")));

  it("checks a round in the browser's way to what RemnaWeb did", async () => {
    expect(await verifyRound(RULES, { id: 1, crash, hash, seed })).toBe(true);
  });

  it("catches a crash point or a seed that does not match", async () => {
    expect(await verifyRound(RULES, { id: 1, crash: crash + 1, hash, seed })).toBe(false);
    expect(await verifyRound(RULES, { id: 1, crash, hash, seed: "60".repeat(32) })).toBe(false);
  });
});
