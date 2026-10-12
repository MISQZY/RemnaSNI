// How the Sacrifice plays. RemnaWeb is the source of truth (src/lib/sacrifice/ there): it keeps the cards, shuffles,
// plays the duel and the robot and pays; its numbers and every card come with the other games' rules from
// GET /api/sni/config under `sacrifice` (config-server.ts), the duels through the stream (stream.ts). These types
// mirror its answers; only the shuffle is mirrored as code, to check the draws (verifyProof).

export type Sigil = "airborne" | "intercept" | "rift" | "split" | "resilient" | "tripleCharge" | "spikes" | "growth" | "rebuild";

export const SIGILS: Sigil[] = ["airborne", "intercept", "rift", "split", "resilient", "tripleCharge", "spikes", "growth", "rebuild"];

/** The free unit every turn brings. */
export const SPARK = "spark";

export type Rarity = "token" | "common" | "uncommon" | "rare";

export type CardDef = {
  id: string;
  name: { ru: string; en: string };
  power: number;
  health: number;
  blood: number;
  bones: number;
  sigils: Sigil[];
  rarity: Rarity;
  evolves?: string;
};

export type SacrificeRules = {
  scaleToWin: number;
  lanes: number;
  sparks: number;
  openingHand: number;
  maxTurns: number;
  turnMs: number;
  maxMissed: number;
  pauseMs: number;
  deckMin: number;
  deckMax: number;
  copies: Record<Exclude<Rarity, "token">, number>;
  packPrice: number;
  packSize: number;
  packOdds: Record<Exclude<Rarity, "token">, number>;
  robotPayout: number;
  fee: number;
  cards: CardDef[];
};

export type Side = 0 | 1;
export type HandCard = { uid: number; card: string };
export type Creature = { uid: number; card: string; power: number; health: number; born: number };

export type GameEvent =
  | { t: "draw"; side: Side; spark: boolean }
  | { t: "play"; side: Side; card: string; lane: number }
  | { t: "sacrifice"; side: Side; card: string; lane: number; survived: boolean }
  | { t: "evolve"; side: Side; card: string; lane: number }
  | { t: "attack"; side: Side; card: string; lane: number; target: number; damage: number; direct: boolean }
  | { t: "die"; side: Side; card: string; lane: number; back: boolean }
  | { t: "turn"; side: Side; turn: number }
  | { t: "end"; winner: Side | "draw"; reason: "scale" | "turns" | "concede" | "timeout" };

type SideView<Hand> = { hand: Hand; board: (Creature | null)[]; bones: number; deck: number; sparks: number };

/** A fight as this player sees it: `scale` is their lead, the other's hand a count. */
export type MatchView = {
  you: Side;
  turn: number;
  active: Side;
  phase: "play" | "over";
  scale: number;
  winner: Side | "draw" | null;
  me: SideView<HandCard[]>;
  them: SideView<number>;
  log: GameEvent[];
};

export type Proof = { hash: string; seed: string | null; decks: [string[], string[]] | null; drawn: [string[], string[]] | null };

/** A fight against the robot (RemnaWeb's robot/*): the payout once over. */
export type Solo = { id: number; stake: number; payout: number | null; proof: Proof; view: MatchView };

/** A fight against a player, from the stream. */
export type Duel = { id: number; stake: number; deadline: number | null; names: [string | null, string | null]; payout: number | null; proof: Proof; view: MatchView };

/** An offer of the lobby: who and the bets they accept. */
export type Offer = { id: number; name: string | null; min: number; max: number };

export type DuelsSnapshot = {
  now: number;
  lobby: { offers: Offer[]; fighting: number };
  /** The viewer's own offer, if they have one up. */
  offer: Omit<Offer, "name"> | null;
  duel: Duel | null;
};

export type Collection = { cards: Record<string, number>; deck: string[] };

export type Action = { type: "play"; hand: number; lane: number; sacrifices?: number[] } | { type: "bell" } | { type: "concede" };

const isNum = (n: unknown) => typeof n === "number" && Number.isFinite(n);

/** Whether RemnaWeb's `sacrifice` rules have the shape the game relies on; an older RemnaWeb sends none. */
export function isSacrificeRules(v: unknown): v is SacrificeRules {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return false;
  return (
    ["scaleToWin", "lanes", "turnMs", "deckMin", "deckMax", "packPrice", "robotPayout", "fee"].every((k) => isNum(r[k])) &&
    Array.isArray(r.cards) &&
    r.cards.length > 0 &&
    r.cards.every((c: Record<string, unknown>) => typeof c?.id === "string" && isNum(c.power) && isNum(c.health) && Array.isArray(c.sigils))
  );
}

/** Whether a stream message is the duels' state rather than just RemnaWeb's clock. */
export const isSnapshot = (v: unknown): v is DuelsSnapshot =>
  !!v && typeof v === "object" && isNum((v as DuelsSnapshot).now) && Array.isArray((v as DuelsSnapshot).lobby?.offers);

// The sacrifices and the strikes, as RemnaWeb's lib/sacrifice/engine.ts counts them: to show what a play would give
// up and what an attack would do before it is made. RemnaWeb decides; these only preview.

type Defs = Map<string, CardDef>;
const sigil = (defs: Defs, card: string, s: Sigil) => !!defs.get(card)?.sigils.includes(s);

/** What a unit is worth as a sacrifice. */
export const chargeOf = (defs: Defs, card: string) => (sigil(defs, card, "tripleCharge") ? 3 : 1);

function worthOf(defs: Defs, c: Creature): number {
  const def = defs.get(c.card);
  if (!def) return 99;
  if (def.id === SPARK) return 0.5;
  return c.power * 2 + c.health + def.sigils.length * 1.5 - (def.sigils.includes("tripleCharge") ? 3 : 0) - (def.sigils.includes("resilient") ? 2 : 0);
}

/** Whether `lanes` pay `blood` exactly: enough, and not one unit more than needed. */
export function paysExactly(defs: Defs, board: (Creature | null)[], lanes: number[], blood: number): boolean {
  if (!lanes.length || lanes.some((l) => !board[l]) || new Set(lanes).size !== lanes.length) return false;
  const values = lanes.map((l) => chargeOf(defs, board[l]!.card));
  const total = values.reduce((a, b) => a + b, 0);
  return total >= blood && total - Math.min(...values) < blood;
}

/** The cheapest sacrifices paying `blood` (with the unit in `lane` if that space is taken), or null when none pay. */
export function autoSacrifices(defs: Defs, board: (Creature | null)[], blood: number, lane: number | null): number[] | null {
  if (blood <= 0) return [];
  const lanes = board.flatMap((cr, l) => (cr ? [l] : []));
  const forced = lane !== null && board[lane] ? lane : null;
  if (forced !== null && sigil(defs, board[forced]!.card, "resilient")) return null;
  let best: { lanes: number[]; cost: number } | null = null;
  for (let mask = 1; mask < 1 << lanes.length; mask++) {
    const pick = lanes.filter((_, i) => mask & (1 << i));
    if (forced !== null && !pick.includes(forced)) continue;
    if (!paysExactly(defs, board, pick, blood)) continue;
    const cost = pick.reduce((sum, l) => sum + worthOf(defs, board[l]!), 0);
    if (!best || cost < best.cost) best = { lanes: pick, cost };
  }
  return best?.lanes ?? null;
}

/** What the unit in `lane` of `mine` would do on the attack: damage to the scale and to units across. */
export function strikePreview(defs: Defs, mine: (Creature | null)[], theirs: (Creature | null)[], lane: number): { scale: number; hit: number } {
  const c = mine[lane];
  if (!c || c.power <= 0) return { scale: 0, hit: 0 };
  const targets = sigil(defs, c.card, "split") ? [lane - 1, lane + 1].filter((l) => l >= 0 && l < mine.length) : [lane];
  let scale = 0;
  let hit = 0;
  for (const t of targets) {
    const b = theirs[t];
    if (!b || (sigil(defs, c.card, "airborne") && !sigil(defs, b.card, "intercept"))) scale += c.power;
    else hit += c.power;
  }
  return { scale, hit };
}

// Provably fair decks, as RemnaWeb's lib/sacrifice/fair.ts: side s's deck is shuffled from the seed alone, for i from
// its last card down to 1 swapping card i with card ⌊u × (i + 1)⌋, u the first 52 bits of
// HMAC-SHA256(key: seed, message: "deck:" + s + ":" + i) / 2^52.

export const deckMessage = (side: number, i: number) => `deck:${side}:${i}`;
export const uFromHmac = (hmacHex: string) => parseInt(hmacHex.slice(0, 13), 16) / 2 ** 52;

export function shuffle<T>(deck: readonly T[], u: (i: number) => number): T[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(u(i) * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Whether a finished fight is honest: its seed hashes to the hash shown from the start, and the cards each side drew
 * are the top of its deck shuffled by that seed. Null where the browser cannot tell (no Web Crypto outside https).
 */
export async function verifyProof(p: Proof): Promise<boolean | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !p.seed || !p.decks || !p.drawn) return null;
  const enc = new TextEncoder();
  if (hex(await subtle.digest("SHA-256", enc.encode(p.seed))) !== p.hash) return false;
  const key = await subtle.importKey("raw", enc.encode(p.seed), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  for (const side of [0, 1] as const) {
    const deck = p.decks[side];
    const us: number[] = [];
    for (let i = deck.length - 1; i > 0; i--) us[i] = uFromHmac(hex(await subtle.sign("HMAC", key, enc.encode(deckMessage(side, i)))));
    const order = shuffle(deck, (i) => us[i]);
    if (!p.drawn[side].every((card, i) => order[i] === card)) return false;
  }
  return true;
}
