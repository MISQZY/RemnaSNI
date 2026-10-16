// Spots auto-clicker tapping on the client, by RemnaWeb's numbers (the config's `site.tapGuard`). A finding only asks
// RemnaWeb for a human check (its lib/game/human-check.ts), never punishes by itself: a person caught by mistake just
// answers one question. Programs that imitate people pass these rules; the checks the server hands out every few
// thousand taps catch those.

import type { TapGuardRules } from "@/games/clicker/config";

export type TapSample = {
  /** performance.now() of the tap, ms. */
  t: number;
  x: number;
  y: number;
  /** Touch or pen: fingers never hit the same pixel twice in a row, a mouse held still does. */
  touch: boolean;
};

export type Suspicion = "synthetic" | "rhythm" | "position" | "marathon";

export class TapGuard {
  /** `rules` gives the numbers in force, read at every tap: an admin's change applies without a reload. */
  constructor(private readonly rules: () => TapGuardRules) {}

  private samples: TapSample[] = [];
  private synthetic = 0;
  private sessionStart = 0;
  private lastTap = -Infinity;
  private quietUntil = 0;

  /**
   * Records a tap and says whether tapping so far looks automated. Untrusted events (dispatched by a
   * script, not the user) are counted but must not be credited by the caller.
   */
  record(sample: TapSample, trusted: boolean): Suspicion | null {
    const r = this.rules();
    if (!trusted) return ++this.synthetic >= r.maxSynthetic ? "synthetic" : null;

    if (sample.t - this.lastTap > r.pauseMs) this.sessionStart = sample.t;
    this.lastTap = sample.t;
    this.samples.push(sample);
    while (this.samples.length > r.window) this.samples.shift();
    if (sample.t < this.quietUntil) return null;

    if (sample.t - this.sessionStart > r.marathonMs) return "marathon";
    if (this.samples.length < r.window) return null;

    const intervals = this.samples.slice(1).map((s, i) => s.t - this.samples[i].t);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length);
    if (mean < r.fastMs && sd / mean < r.steadyCv) return "rhythm";

    if (this.samples.every((s) => s.touch)) {
      const cx = this.samples.reduce((a, s) => a + s.x, 0) / this.samples.length;
      const cy = this.samples.reduce((a, s) => a + s.y, 0) / this.samples.length;
      if (this.samples.every((s) => Math.hypot(s.x - cx, s.y - cy) < r.sameSpotPx)) return "position";
    }
    return null;
  }

  /** Starts over after a check was passed. */
  reset(now: number) {
    this.samples = [];
    this.synthetic = 0;
    this.sessionStart = now;
    this.quietUntil = now + this.rules().quietMs;
  }
}
