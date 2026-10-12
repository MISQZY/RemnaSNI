import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { deckMessage, isSacrificeRules, shuffle, spareOf, uFromHmac, verifyProof, type CardDef, type SacrificeRules } from "./rules";

// The mirror of RemnaWeb's lib/game/sacrifice/fair.ts: the same shuffle of a seed, so the page checks RemnaWeb's draws.

const seed = "5ac1f1ce".repeat(8);
const hash = createHash("sha256").update(seed).digest("hex");
const decks: [string[], string[]] = [
  ["stoat", "stoat", "wolf", "sparrow", "bullfrog", "rat", "rat", "coyote", "skunk", "porcupine"],
  ["raven", "adder", "goat", "mantis", "turtle", "mole", "cat", "beehive", "elk_fawn", "grizzly"],
];
const shuffled = (side: number) => shuffle(decks[side], (i) => uFromHmac(createHmac("sha256", seed).update(deckMessage(side, i)).digest("hex")));

describe("the proof", () => {
  it("accepts draws from the top of the seed's decks", async () => {
    const drawn: [string[], string[]] = [shuffled(0).slice(0, 6), shuffled(1).slice(0, 5)];
    expect(await verifyProof({ hash, seed, decks, drawn })).toBe(true);
  });

  it("refuses another hash and draws out of order", async () => {
    const drawn: [string[], string[]] = [shuffled(0).slice(0, 3), shuffled(1).slice(0, 3)];
    expect(await verifyProof({ hash: "00".repeat(32), seed, decks, drawn })).toBe(false);
    expect(await verifyProof({ hash, seed, decks, drawn: [[...drawn[0]].reverse(), drawn[1]] })).toBe(drawn[0][0] === drawn[0][2]);
  });

  it("cannot tell before the fight is over", async () => {
    expect(await verifyProof({ hash, seed: null, decks: null, drawn: null })).toBeNull();
  });
});

describe("rules from RemnaWeb", () => {
  it("need the cards", () => {
    const base = { scaleToWin: 5, lanes: 4, turnMs: 60000, deckMin: 10, deckMax: 20, packPrice: 1500, robotPayout: 1.9, fee: 0.03 };
    expect(isSacrificeRules({ ...base, cards: [{ id: "stoat", power: 1, health: 3, sigils: [] }] })).toBe(true);
    expect(isSacrificeRules({ ...base, cards: [] })).toBe(false);
  });
});

describe("spare copies", () => {
  const def = (id: string, rarity: CardDef["rarity"]): [string, CardDef] => [id, { id, name: { ru: id, en: id }, power: 1, health: 1, blood: 0, bones: 0, sigils: [], rarity }];
  const defs = new Map([def("a", "common"), def("b", "uncommon"), def("c", "rare")]);
  const rules = { copies: { common: 3, uncommon: 2, rare: 1 }, shardValue: { common: 1, uncommon: 3, rare: 10 } } as SacrificeRules;

  it("are the copies past the deck's limit, worth shards by rarity, as RemnaWeb counts them", () => {
    expect(spareOf(rules, defs, { a: 5, b: 2, c: 3, gone: 4 })).toEqual({ spare: { a: 2, c: 2 }, shards: 22 });
  });

  it("are none from a RemnaWeb that trades nothing", () => {
    expect(spareOf({ ...rules, shardValue: undefined }, defs, { a: 5 })).toEqual({ spare: {}, shards: 0 });
  });
});
