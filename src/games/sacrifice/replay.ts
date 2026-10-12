import type { CardDef, Creature, GameEvent, MatchView } from "./rules";

// The replay of a fight between two of its states: RemnaWeb sends the fight as it stands after a move, the turn of the
// robot and the attacks already played out; the events in its log since the last state shown are stepped through on
// the board seen last, as RemnaWeb's lib/game/sacrifice/engine.ts applies them, so each strike, death and play can be shown
// (fx.ts) before the board snaps to RemnaWeb's state.

/** The side of the board as this player sees it. */
export type Who = "me" | "them";

/** How a strike goes: at a unit, at an empty space (the scale), over a unit (Airborne), stopped by Intercept. */
export type StrikeKind = "hit" | "direct" | "fly" | "intercepted";

export type Fx =
  /** The attacker moving at its target: before the damage. */
  | { t: "lunge"; who: Who; lane: number; target: number; kind: StrikeKind }
  /** The strike landing: after the damage. */
  | { t: "impact"; who: Who; lane: number; target: number; kind: StrikeKind; damage: number; rift: boolean; spikes: boolean }
  | { t: "die"; who: Who; lane: number; back: boolean }
  | { t: "sacrifice"; who: Who; lane: number; survived: boolean }
  | { t: "play"; who: Who; lane: number }
  | { t: "evolve"; who: Who; lane: number }
  | { t: "turn"; who: Who };

export type Boards = { me: (Creature | null)[]; them: (Creature | null)[]; scale: number };

/** One beat of the replay: the board to show, what happens on it, for how long. */
export type Step = Boards & { fx: Fx; ms: number };

/** How long each beat lasts, ms. */
export const BEAT = { lunge: 260, impact: 440, die: 380, sacrifice: 300, playMine: 180, playTheirs: 420, evolve: 460, turn: 320 } as const;

const clone = (b: Boards): Boards => ({ me: b.me.map((c) => c && { ...c }), them: b.them.map((c) => c && { ...c }), scale: b.scale });

/**
 * The beats between `from` and `to`, two states of the same fight as this player sees them, or none when there is
 * nothing to show: only this player's own plays (they see them made) or no new events.
 */
export function replay(defs: Map<string, CardDef>, from: MatchView, to: MatchView): Step[] {
  if (to.log.length <= from.log.length) return [];
  const events = to.log.slice(from.log.length);
  const worth = events.some((e) => e.t === "attack" || e.t === "turn" || e.t === "evolve" || ("side" in e && e.side !== to.you));
  if (!worth) return [];

  const has = (c: Creature | null | undefined, s: CardDef["sigils"][number]) => !!c && !!defs.get(c.card)?.sigils.includes(s);
  const cur: Boards = { me: from.me.board.map((c) => c && { ...c }), them: from.them.board.map((c) => c && { ...c }), scale: from.scale };
  const steps: Step[] = [];
  const beat = (fx: Fx, ms: number) => steps.push({ ...clone(cur), fx, ms });
  const whoOf = (side: number): Who => (side === to.you ? "me" : "them");
  const foe = (w: Who): Who => (w === "me" ? "them" : "me");

  events.forEach((e: GameEvent, i) => {
    switch (e.t) {
      case "turn":
        return beat({ t: "turn", who: whoOf(e.side) }, BEAT.turn);
      case "play": {
        const who = whoOf(e.side);
        const d = defs.get(e.card);
        // A unit still standing at the end keeps RemnaWeb's id, so the board does not show it coming twice.
        const gone = events.slice(i + 1).some((x) => x.t === "die" && x.side === e.side && x.lane === e.lane);
        const real = to[who].board[e.lane];
        const uid = !gone && real ? real.uid : -(i + 1);
        cur[who][e.lane] = { uid, card: e.card, power: d?.power ?? 0, health: d?.health ?? 1, born: 0 };
        return beat({ t: "play", who, lane: e.lane }, who === "me" ? BEAT.playMine : BEAT.playTheirs);
      }
      case "sacrifice":
        return beat({ t: "sacrifice", who: whoOf(e.side), lane: e.lane, survived: e.survived }, BEAT.sacrifice);
      case "evolve": {
        const who = whoOf(e.side);
        const cr = cur[who][e.lane];
        const grown = defs.get(e.card);
        if (cr && grown) {
          const wounds = (defs.get(cr.card)?.health ?? cr.health) - cr.health;
          cur[who][e.lane] = { ...cr, card: e.card, power: grown.power, health: Math.max(1, grown.health - wounds) };
        }
        return beat({ t: "evolve", who, lane: e.lane }, BEAT.evolve);
      }
      case "attack": {
        const who = whoOf(e.side);
        const attacker = cur[who][e.lane];
        const blocker = cur[foe(who)][e.target];
        const kind: StrikeKind = e.direct ? (blocker ? "fly" : "direct") : has(attacker, "airborne") && has(blocker, "intercept") ? "intercepted" : "hit";
        const rift = !e.direct && has(attacker, "rift");
        const spikes = !e.direct && has(blocker, "spikes");
        if (attacker) beat({ t: "lunge", who, lane: e.lane, target: e.target, kind }, BEAT.lunge);
        if (e.direct) cur.scale += who === "me" ? e.damage : -e.damage;
        else if (blocker) {
          blocker.health = rift ? 0 : blocker.health - e.damage;
          if (spikes && attacker) attacker.health -= 1;
        }
        return beat({ t: "impact", who, lane: e.lane, target: e.target, kind, damage: e.damage, rift, spikes }, BEAT.impact);
      }
      case "die": {
        const who = whoOf(e.side);
        beat({ t: "die", who, lane: e.lane, back: e.back }, BEAT.die);
        cur[who][e.lane] = null;
        return;
      }
    }
  });
  return steps;
}
