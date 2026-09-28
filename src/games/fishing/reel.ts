// The fight with a hooked fish, as plain data: a catch zone the player lifts by holding and gravity pulls down,
// a fish darting up and down the track, and the catch progress, filling while the fish is in the zone and draining
// while it is out. Landed at 1, lost at 0. Positions run from 0 (bottom) to 1 (top). No React here.

export type Reel = {
  /** The zone's bottom and height, and its speed. */
  zone: number;
  size: number;
  speed: number;
  /** The fish's position, where it heads, and how long until it picks another place. */
  fish: number;
  target: number;
  retargetIn: number;
  /** Its speed toward the target now: a dart is faster. */
  fishSpeed: number;
  strength: number;
  progress: number;
};

/** Acceleration of the zone while held, and of its fall, per s²; its top speed per s. */
const LIFT = 2.4;
const GRAVITY = 1.5;
const MAX_SPEED = 0.9;
/** A fall onto the bottom bounces back this share of the speed. */
const BOUNCE = 0.3;
const START_PROGRESS = 0.3;

export type ReelRules = { zone: number; fillPerSec: number; drainPerSec: number };

/** The zone for a fish of `strength` (0 to 1): narrower for strong ones, wider with the line bonus (a share). */
export const zoneSize = (rules: ReelRules, strength: number, line = 0) => Math.min(0.9, Math.max(0.08, rules.zone * (1 - 0.3 * strength) * (1 + line)));

export function newReel(rules: ReelRules, strength: number, line = 0): Reel {
  const size = zoneSize(rules, strength, line);
  return { zone: 0, size, speed: 0, fish: size / 2, target: 0.5, retargetIn: 0.6, fishSpeed: 0, strength, progress: START_PROGRESS };
}

/** Moves the fight on by `dt` seconds with the zone `holding` up: "caught" once the progress fills, "lost" once it empties. */
export function stepReel(r: Reel, rules: ReelRules, dt: number, holding: boolean, rand = Math.random): "fight" | "caught" | "lost" {
  // The zone: lifted while held, falling otherwise; it stops at the top and bounces off the bottom.
  r.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, r.speed + (holding ? LIFT : -GRAVITY) * dt));
  r.zone += r.speed * dt;
  if (r.zone < 0) {
    r.zone = 0;
    r.speed = -r.speed * BOUNCE;
  } else if (r.zone > 1 - r.size) {
    r.zone = 1 - r.size;
    r.speed = 0;
  }

  // The fish: heads for a spot, now and then a new one; strong fish pick sooner, move faster and dart more.
  r.retargetIn -= dt;
  if (r.retargetIn <= 0) {
    const dart = rand() < 0.15 + 0.35 * r.strength;
    r.target = 0.05 + 0.9 * rand();
    r.fishSpeed = (0.2 + 0.45 * r.strength) * (dart ? 1.7 : 1);
    r.retargetIn = (0.35 + 0.9 * rand()) * (1.4 - 0.6 * r.strength);
  }
  const step = r.fishSpeed * dt;
  r.fish += Math.max(-step, Math.min(step, r.target - r.fish));

  const inside = r.fish >= r.zone && r.fish <= r.zone + r.size;
  r.progress = Math.min(1, Math.max(0, r.progress + (inside ? rules.fillPerSec : -rules.drainPerSec) * dt));
  if (r.progress >= 1) return "caught";
  if (r.progress <= 0) return "lost";
  return "fight";
}
