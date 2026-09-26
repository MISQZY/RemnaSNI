import { sync } from "@/lib/sync";
import { TapGuard, type Suspicion } from "@/lib/tap-guard";

// Human checks against auto-clickers: whether one is due (taps do not count until it is passed) and the
// guard that asks for one early. Signed in, RemnaWeb gives and grades the checks and will not save
// progress without them (its lib/human-check.ts); signed out, the site does it itself, and the progress
// made meanwhile still meets RemnaWeb's checks at the first save.

export type HumanCheck = { token: string; target: string; options: string[] } | { blockedUntil: string };

const EMOJI = ["🐸", "🐤", "🦊", "🐼", "🐙", "🦉", "🐢", "🐝", "🐬", "🦋", "🍄", "⭐", "🍉", "🚀", "🎈", "🌵"];
const LOCAL_BLOCK_MS = 5 * 60_000;

let due = false;
const listeners = new Set<() => void>();
const guard = new TapGuard();
/** The answer of a check made on this site while signed out, and misses in a row. */
let local: { token: string; answer: number } | null = null;
let localMisses = 0;
let localBlockedUntil = 0;

function setDue(next: boolean) {
  if (due === next) return;
  due = next;
  listeners.forEach((l) => l());
}

async function suspect(reason: Suspicion) {
  setDue(true);
  if (sync.getSnapshot().token) await sync.requestCheck();
  console.info(`Human check requested: ${reason}`);
}

function localCheck(): HumanCheck {
  if (Date.now() < localBlockedUntil) return { blockedUntil: new Date(localBlockedUntil).toISOString() };
  const pool = [...EMOJI];
  const options = Array.from({ length: 6 }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  local = { token: crypto.randomUUID(), answer: Math.floor(Math.random() * options.length) };
  return { token: local.token, target: options[local.answer], options };
}

export const human = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => due,
  getServerSnapshot: () => false,

  /**
   * Whether a tap counts: not while a check is due, never for a scripted event. Machine-like tapping
   * makes the check due at once, on RemnaWeb too.
   */
  allow(e: { isTrusted: boolean; clientX: number; clientY: number; pointerType?: string }): boolean {
    if (due) return false;
    const reason = guard.record(
      { t: performance.now(), x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" || e.pointerType === "pen" },
      e.isTrusted,
    );
    if (reason) void suspect(reason);
    return e.isTrusted && !due;
  },

  /** RemnaWeb wants a check before it takes more progress. */
  require: () => setDue(true),

  async get(): Promise<HumanCheck> {
    return sync.getSnapshot().token ? sync.getCheck() : localCheck();
  },

  async answer(token: string, index: number): Promise<{ passed: boolean; blockedUntil?: string }> {
    let result: { passed: boolean; blockedUntil?: string };
    if (sync.getSnapshot().token) {
      result = await sync.answerCheck(token, index);
    } else {
      const passed = local?.token === token && local.answer === index;
      local = null;
      localMisses = passed ? 0 : localMisses + 1;
      if (localMisses >= 3) {
        localMisses = 0;
        localBlockedUntil = Date.now() + LOCAL_BLOCK_MS;
      }
      result = { passed, ...(localBlockedUntil > Date.now() && !passed && { blockedUntil: new Date(localBlockedUntil).toISOString() }) };
    }
    if (result.passed) {
      guard.reset(performance.now());
      setDue(false);
    }
    return result;
  },
};
