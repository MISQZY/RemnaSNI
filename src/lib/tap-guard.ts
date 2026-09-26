// Spots auto-clicker tapping on the client; RemnaWeb has the same file (lib/clicker/tap-guard.ts). A finding only
// asks RemnaWeb for a human check (its lib/human-check.ts), never punishes by itself: a person caught by
// mistake just answers one question. Programs that imitate people pass these rules; the checks the
// server hands out every few thousand taps catch those.

export type TapSample = {
  /** performance.now() of the tap, ms. */
  t: number;
  x: number;
  y: number;
  /** Touch or pen: fingers never hit the same pixel twice in a row, a mouse held still does. */
  touch: boolean;
};

export type Suspicion = "synthetic" | "rhythm" | "position" | "marathon";

/** Taps looked at for rhythm and position. */
const WINDOW = 40;
/** Faster than this on average (ms between taps), a steady rhythm is suspicious. */
const FAST_MS = 300;
/** Spread of intervals (standard deviation / mean) below which the rhythm is machine-like; people stay above 0.1. */
const STEADY_CV = 0.06;
/** Fingers landing within this many pixels of one spot every time are a program. */
const SAME_SPOT_PX = 1.5;
/** A pause this long ends a tapping session. */
const PAUSE_MS = 5_000;
/** Nobody taps this long without a pause. */
const MARATHON_MS = 20 * 60_000;
/** Scripted (untrusted) events tolerated before asking for a check. */
const MAX_SYNTHETIC = 3;
/** After a passed check the rules keep quiet for a while, so one person is not asked again and again. */
const QUIET_MS = 2 * 60_000;

export class TapGuard {
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
    if (!trusted) return ++this.synthetic >= MAX_SYNTHETIC ? "synthetic" : null;

    if (sample.t - this.lastTap > PAUSE_MS) this.sessionStart = sample.t;
    this.lastTap = sample.t;
    this.samples.push(sample);
    if (this.samples.length > WINDOW) this.samples.shift();
    if (sample.t < this.quietUntil) return null;

    if (sample.t - this.sessionStart > MARATHON_MS) return "marathon";
    if (this.samples.length < WINDOW) return null;

    const intervals = this.samples.slice(1).map((s, i) => s.t - this.samples[i].t);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length);
    if (mean < FAST_MS && sd / mean < STEADY_CV) return "rhythm";

    if (this.samples.every((s) => s.touch)) {
      const cx = this.samples.reduce((a, s) => a + s.x, 0) / this.samples.length;
      const cy = this.samples.reduce((a, s) => a + s.y, 0) / this.samples.length;
      if (this.samples.every((s) => Math.hypot(s.x - cx, s.y - cy) < SAME_SPOT_PX)) return "position";
    }
    return null;
  }

  /** Starts over after a check was passed. */
  reset(now: number) {
    this.samples = [];
    this.synthetic = 0;
    this.sessionStart = now;
    this.quietUntil = now + QUIET_MS;
  }
}
