import { describe, expect, it } from "vitest";
import { replay } from "./replay";
import type { CardDef, Creature, GameEvent, MatchView } from "./rules";

// The replay steps through RemnaWeb's events on the board seen last, as its engine applies them.

const def = (id: string, power: number, health: number, sigils: CardDef["sigils"] = [], evolves?: string): CardDef => ({
  id,
  name: { ru: id, en: id },
  power,
  health,
  blood: 1,
  bones: 0,
  sigils,
  rarity: "common",
  evolves,
});
const defs = new Map(
  [
    def("miner", 1, 3),
    def("drone", 1, 2, ["airborne"]),
    def("interceptor", 1, 2, ["intercept"]),
    def("spiker", 1, 2, ["spikes"]),
    def("riftblade", 1, 1, ["rift"]),
    def("apprentice", 1, 1, ["growth"], "master"),
    def("master", 3, 3),
  ].map((d) => [d.id, d]),
);

let uid = 1;
const unit = (card: string, health?: number): Creature => ({ uid: uid++, card, power: defs.get(card)!.power, health: health ?? defs.get(card)!.health, born: 0 });
const view = (me: (Creature | null)[], them: (Creature | null)[], log: GameEvent[], scale = 0): MatchView => ({
  you: 0,
  turn: 1,
  active: 0,
  phase: "play",
  scale,
  winner: null,
  me: { hand: [], board: me, bones: 0, deck: 5, sparks: 5 },
  them: { hand: 0, board: them, bones: 0, deck: 5, sparks: 5 },
  log,
});
const empty = () => [null, null, null, null] as (Creature | null)[];

describe("the replay", () => {
  it("shows nothing for this player's own plays", () => {
    const from = view(empty(), empty(), []);
    const to = view([unit("miner"), null, null, null], empty(), [{ t: "play", side: 0, card: "miner", lane: 0 }]);
    expect(replay(defs, from, to)).toEqual([]);
  });

  it("strikes a unit, hurts the striker on spikes, and lets the dead go", () => {
    const me = [unit("miner"), null, null, null];
    const them = [unit("spiker", 1), null, null, null];
    const from = view(me, them, []);
    const log: GameEvent[] = [
      { t: "attack", side: 0, card: "miner", lane: 0, target: 0, damage: 1, direct: false },
      { t: "die", side: 1, card: "spiker", lane: 0, back: false },
      { t: "turn", side: 1, turn: 2 },
    ];
    const to = view([{ ...me[0]!, health: 2 }, null, null, null], empty(), log);
    const steps = replay(defs, from, to);
    expect(steps.map((s) => s.fx.t)).toEqual(["lunge", "impact", "die", "turn"]);
    expect(steps[0].them[0]?.health).toBe(1);
    expect(steps[1]).toMatchObject({ fx: { kind: "hit", spikes: true, damage: 1 } });
    expect(steps[1].them[0]?.health).toBe(0);
    expect(steps[1].me[0]?.health).toBe(2);
    expect(steps[3].them[0]).toBeNull();
  });

  it("flies over a unit to the scale, and is stopped by Intercept", () => {
    const from = view([unit("drone"), unit("drone"), null, null], [unit("miner"), unit("interceptor"), null, null], []);
    const log: GameEvent[] = [
      { t: "attack", side: 0, card: "drone", lane: 0, target: 0, damage: 1, direct: true },
      { t: "attack", side: 0, card: "drone", lane: 1, target: 1, damage: 1, direct: false },
    ];
    const steps = replay(defs, from, view(from.me.board, from.them.board, log));
    expect(steps[1]).toMatchObject({ scale: 1, fx: { kind: "fly" } });
    expect(steps[3]).toMatchObject({ fx: { kind: "intercepted" } });
    expect(steps[3].them[1]?.health).toBe(1);
  });

  it("plays the other's cards with RemnaWeb's ids, grows units and destroys with Rift", () => {
    const grow = unit("apprentice");
    const from = view(empty(), [grow, null, null, null], []);
    const placed = unit("riftblade");
    const log: GameEvent[] = [
      { t: "turn", side: 1, turn: 2 },
      { t: "evolve", side: 1, card: "master", lane: 0 },
      { t: "play", side: 1, card: "riftblade", lane: 1 },
    ];
    const steps = replay(defs, from, view(empty(), [{ ...grow, card: "master", power: 3, health: 3 }, placed, null, null], log));
    expect(steps[1].them[0]).toMatchObject({ card: "master", power: 3, health: 3 });
    expect(steps[2].them[1]?.uid).toBe(placed.uid);

    const me = [unit("miner"), null, null, null];
    const rift = replay(defs, view(me, [placed, null, null, null], []), view(empty(), [placed, null, null, null], [
      { t: "turn", side: 1, turn: 3 },
      { t: "attack", side: 1, card: "riftblade", lane: 0, target: 0, damage: 1, direct: false },
    ]));
    expect(rift[2]).toMatchObject({ fx: { t: "impact", who: "them", rift: true } });
    expect(rift[2].me[0]?.health).toBe(0);
  });
});
