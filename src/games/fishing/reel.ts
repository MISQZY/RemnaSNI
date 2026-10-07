// The fight with a hooked fish, as plain data: a catch zone the player lifts by holding and gravity pulls down,
// a fish darting up and down the track, and the catch progress, filling while the fish is in the zone and draining
// while it is out. Landed at 1, lost at 0. Positions run from 0 (bottom) to 1 (top).
//
// The fight runs in fixed ticks off a seeded generator, so it is the same wherever it runs: the site plays it, and
// RemnaWeb replays the holds the site sends with the catch (its lib/fishing.ts) and pays only for a fish that really
// came in. This file is a copy of RemnaWeb's lib/fishing-reel.ts: change both, or no catch is paid.

/** What a fight is played with: picked by RemnaWeb at the cast (by the site without an account). */
export type ReelSetup = {
  /** Seed of the fish's moves. */
  seed: number;
  /** 0 to 1: the fish darts faster and more often. */
  strength: number;
  /** The catch zone's height, a share of the track. */
  size: number;
  /** Catch progress gained per second with the fish in the zone, and lost with it out; the progress it starts at. */
  fill: number;
  drain: number;
  start: number;
};

export type Reel = {
  /** The zone's bottom and its speed. */
  zone: number;
  speed: number;
  /** The fish's position, where it heads, how long until it picks another place, and its speed toward it. */
  fish: number;
  target: number;
  retargetIn: number;
  fishSpeed: number;
  progress: number;
  /** Whether the zone is held up, and the ticks played. */
  holding: boolean;
  tick: number;
  /** The state of the fish's generator. */
  rng: number;
};

/** One tick, s: the fight moves in these whatever the frame rate. */
export const TICK = 1 / 60;
/** The longest fight, ticks: one dragged out beyond is lost. */
export const MAX_TICKS = 60 * 90;
/** The progress a fight starts at. */
export const START_PROGRESS = 0.3;

/** Acceleration of the zone while held, and of its fall, per s²; its top speed per s. */
const LIFT = 2.4;
const GRAVITY = 1.5;
const MAX_SPEED = 0.9;
/** A fall onto the bottom bounces back this share of the speed. */
const BOUNCE = 0.3;

/** The zone for a fish of `strength` (0 to 1): narrower for strong ones, wider with the line bonus (a share). */
export const zoneSize = (zone: number, strength: number, line = 0) => Math.min(0.9, Math.max(0.08, zone * (1 - 0.3 * strength) * (1 + line)));

/** The next number of mulberry32 in [0, 1), moving the reel's generator on. */
function random(r: Reel): number {
  r.rng = (r.rng + 0x6d2b79f5) | 0;
  let t = r.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A fight just hooked: the tap that hooked the fish holds the zone up. */
export function newReel(s: ReelSetup): Reel {
  return { zone: 0, speed: 0, fish: s.size / 2, target: 0.5, retargetIn: 0.6, fishSpeed: 0, progress: s.start, holding: true, tick: 0, rng: s.seed | 0 };
}

/** Moves the fight on by one tick: "caught" once the progress fills, "lost" once it empties or the fight drags on. */
export function stepReel(r: Reel, s: ReelSetup): "fight" | "caught" | "lost" {
  const dt = TICK;
  r.tick++;
  // The zone: lifted while held, falling otherwise; it stops at the top and bounces off the bottom.
  r.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, r.speed + (r.holding ? LIFT : -GRAVITY) * dt));
  r.zone += r.speed * dt;
  if (r.zone < 0) {
    r.zone = 0;
    r.speed = -r.speed * BOUNCE;
  } else if (r.zone > 1 - s.size) {
    r.zone = 1 - s.size;
    r.speed = 0;
  }

  // The fish: heads for a spot, now and then a new one; strong fish pick sooner, move faster and dart more.
  r.retargetIn -= dt;
  if (r.retargetIn <= 0) {
    const dart = random(r) < 0.15 + 0.35 * s.strength;
    r.target = 0.05 + 0.9 * random(r);
    r.fishSpeed = (0.2 + 0.45 * s.strength) * (dart ? 1.7 : 1);
    r.retargetIn = (0.35 + 0.9 * random(r)) * (1.4 - 0.6 * s.strength);
  }
  const step = r.fishSpeed * dt;
  r.fish += Math.max(-step, Math.min(step, r.target - r.fish));

  const inside = r.fish >= r.zone && r.fish <= r.zone + s.size;
  r.progress = Math.min(1, Math.max(0, r.progress + (inside ? s.fill : -s.drain) * dt));
  if (r.progress >= 1) return "caught";
  if (r.progress <= 0 || r.tick >= MAX_TICKS) return "lost";
  return "fight";
}

/**
 * Plays a whole fight from the ticks at which the hold flipped (released, held again, …; the fight starts held),
 * as the site recorded them: how it ended and after how many ticks.
 */
export function replayReel(s: ReelSetup, flips: readonly number[]): { end: "caught" | "lost"; ticks: number } {
  const r = newReel(s);
  let i = 0;
  for (;;) {
    while (i < flips.length && flips[i] <= r.tick) {
      r.holding = !r.holding;
      i++;
    }
    const end = stepReel(r, s);
    if (end !== "fight") return { end, ticks: r.tick };
  }
}
