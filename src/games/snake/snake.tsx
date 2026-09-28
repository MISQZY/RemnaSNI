"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, Gauge, Heart, Pause, Play, RotateCcw, Sparkles, Turtle } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/core/api";
import { useFormat } from "@/core/i18n/provider";
import { session, useSession, type Account } from "@/core/session";
import { storage } from "@/core/storage";
import { AccountMenu } from "@/core/ui/account-menu";
import { ChipIcon } from "@/core/ui/chip-icon";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { SiteHeader } from "@/core/ui/site-header";
import { cn } from "@/lib/utils";
import { KEYS, draw, newGame, noBoosts, step, turn, type Boosts, type Cell, type Dir, type Game, type Phase } from "./board";
import { crystalValue, crystalsValue, type SnakeLook, type SnakeRules, type SnakeSkin } from "./rules";

// Snake (a prototype), the game of nodes RemnaWeb has picked it for. Every crystal eaten brings Qzr to the
// country's balance in RemnaWeb (POST /api/sni/snake in chunks while playing). The board, the speeds and the
// crystal prices are RemnaWeb's (SnakeRules, from GET /api/sni/config): a crystal is worth more the more the
// player has collected (lib/snake-rules.ts there).

const BEST_KEY = "snake-best";
/** Crystals are sent to RemnaWeb in chunks this often while playing, and when a run ends. */
const CHUNK_MS = 5_000;
/** Chunks played without sign-in, credited to the account once the player signs in. */
const PENDING_KEY = "snake-pending";
const MAX_PENDING = 100;
/** Pending runs sent per status load; RemnaWeb takes a dozen runs a minute. */
const FLUSH_PER_LOAD = 10;
/** Whether the phone control pad is shown; off by default, swipes are enough. */
const PAD_KEY = "snake-pad";
/** A swipe turns once the finger has moved this far, px. */
const SWIPE_PX = 18;

/** A bonus as RemnaWeb sends it, named in the page's language; `{n}` in the description is the effect of the level. */
type Perk = { id: string; name: string; description: string; perLevel: number; level: number; maxLevel: number; cost: number | null };
/**
 * `boost` is the country's turbo, `multiplier` what it does to crystal prices (1 without it); `keys` the free
 * Qzr keys (shared with the clicker), `nextKey` the crystals left until the next one, `keyFrom` the crystals at
 * which the last one came (missing from older RemnaWeb versions).
 */
type Status = { balance: number; crystals: number; boost: number; multiplier: number; keys: number; nextKey: number; keyFrom?: number; perks: Perk[] };

/** Percent of the way from the last key to the next one; from zero with an older RemnaWeb. */
function keyProgress({ crystals, nextKey, keyFrom = 0 }: Status): number {
  const next = crystals + nextKey;
  return next > keyFrom ? Math.min(100, Math.max(0, ((crystals - keyFrom) / (next - keyFrom)) * 100)) : 0;
}

function boostsOf(perks: Perk[] | undefined, rules: SnakeRules): Boosts {
  const effect = (id: string) => {
    const p = perks?.find((x) => x.id === id);
    return p ? p.level * p.perLevel : 0;
  };
  return { goldenChance: effect("golden"), lives: effect("life"), speedup: rules.speedupMs * Math.max(0, 1 - effect("slow")) };
}
type Run = { score: number; durationMs: number; golden?: number };
/**
 * A floating "+N Qzr" over an eaten crystal: `bonus` is the part the turbo added. `particles` fly off it with a
 * crystal effect bought in RemnaWeb.
 */
type Popup = { id: number; x: number; y: number; qzr: number; bonus: number; golden: boolean; particles: Particle[] };
type Particle = { emoji: string; dx: number; dy: number; rot: number; size: number };

/** A few particles of an effect thrown evenly around an eaten crystal; none without one. */
function particlesOf(effect: string[] | null): Particle[] {
  if (!effect?.length) return [];
  const start = Math.random() * Math.PI * 2;
  return Array.from({ length: 4 }, (_, i) => {
    const angle = start + ((i + (Math.random() - 0.5) * 0.3) / 4) * Math.PI * 2;
    const dist = 36 + Math.random() * 16;
    return {
      emoji: effect[Math.floor(Math.random() * effect.length)],
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      rot: (Math.random() - 0.5) * 360,
      size: 12 + Math.random() * 6,
    };
  });
}
/** How long a popup floats, ms: the float-up animation in globals.css. */
const POPUP_MS = 900;

function readPending(): Run[] {
  const runs = storage.getJSON(PENDING_KEY);
  return Array.isArray(runs) ? runs.filter((r): r is Run => Number.isInteger(r?.score) && Number.isInteger(r?.durationMs)) : [];
}

/** Without storage the runs last until the page closes. */
const writePending = (runs: Run[]) => storage.setJSON(PENDING_KEY, runs.length ? runs : null);

/** RemnaWeb's snake API (core/api.ts): the status with a GET, a run or a purchase with a POST. */
const snakeApi = <T,>(country: string, body?: object, path = "snake") => api<T>(path, { method: body ? "POST" : "GET", body, country });

const readPad = () => storage.get(PAD_KEY) === "1";
const readBest = () => Number(storage.get(BEST_KEY)) || 0;

const noop = () => () => {};

/** Icons of the snake bonuses. */
const PERK_ICONS: Record<string, typeof Sparkles> = { golden: Sparkles, life: Heart, slow: Turtle };

export function SnakeSite({ code, name, signIn, rules }: { code: string; name: string; signIn: boolean; rules: SnakeRules }) {
  const t = useTranslations();
  const { num, fixed } = useFormat();
  const account = useSession();
  // False while hydrating, so values kept in the browser do not differ from the server's markup.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState<Run[]>(readPending);
  const [pad, setPad] = useState(readPad);
  /** Crystals eaten since the last chunk was sent, their Qzr, and when that chunk began. */
  const chunkRef = useRef({ score: 0, golden: 0, qzr: 0, since: 0 });
  const [lives, setLives] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);
  const [unsent, setUnsent] = useState({ crystals: 0, qzr: 0 });
  /**
   * Crystals collected so far, the ones not sent yet included: the number of the next one, which sets its
   * price. Kept here, so a chunk sent or a request failed never takes it back; RemnaWeb's answers correct it.
   * Null until the first crystal or answer.
   */
  const [collected, setCollected] = useState<number | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  /** The skin and crystal effect bought in RemnaWeb; a ref too, for the canvas drawn outside renders. */
  const [look, setLook] = useState<SnakeLook>({ skin: null, effect: null });
  const skinRef = useRef<SnakeSkin | null>(null);
  const popupId = useRef(0);
  const togglePad = () => {
    const next = !pad;
    setPad(next);
    storage.set(PAD_KEY, next ? "1" : "0");
  };

  /** Sends runs played without sign-in; the server checks and caps them like any other. */
  const flushPending = useEffectEvent(async () => {
    const runs = readPending();
    if (!runs.length) return;
    const left = [...runs];
    let earned = 0;
    for (const run of runs.slice(0, FLUSH_PER_LOAD)) {
      try {
        const res = await snakeApi<Status & { earned: number }>(code, run);
        if (!res) break;
        earned += res.earned;
        setStatus(res);
        setCollected(res.crystals + chunkRef.current.score);
      } catch (err) {
        // A refused run is dropped; any other failure leaves the rest for later.
        if (!(err instanceof ApiError) || err.status !== 400) break;
      }
      left.shift();
    }
    writePending(left);
    setPending(left);
    if (earned > 0) toast.success(t("snake.synced", { n: num(earned) }));
  });

  const loadStatus = useEffectEvent(async () => {
    try {
      const res = await snakeApi<Status & { user: Account; snake?: SnakeLook; session: string | null }>(code);
      if (!res) {
        // Signed out: the bought looks are the account's.
        setLook({ skin: null, effect: null });
        skinRef.current = null;
        return;
      }
      // Missing from older RemnaWeb versions.
      const bought = { skin: res.snake?.skin ?? null, effect: res.snake?.effect ?? null };
      setLook(bought);
      skinRef.current = bought.skin;
      if (canvasRef.current) draw(canvasRef.current, gameRef.current, rules.grid, bought.skin);
      if (res.session) session.keep(res.session);
      session.setAccount(res.user);
      setStatus({
        balance: res.balance,
        crystals: res.crystals,
        boost: res.boost,
        multiplier: res.multiplier,
        keys: res.keys,
        nextKey: res.nextKey,
        keyFrom: res.keyFrom,
        perks: res.perks,
      });
      setCollected(res.crystals + chunkRef.current.score);
      await flushPending();
    } catch {
      // The balance just stays hidden; playing works without it.
    }
  });

  useEffect(() => {
    const stop = session.start(() => void loadStatus());
    // After the effect: the status arrives asynchronously anyway.
    void Promise.resolve().then(() => loadStatus());
    return stop;
  }, []);

  const redraw = () => {
    if (canvasRef.current) draw(canvasRef.current, gameRef.current, rules.grid, skinRef.current);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, gameRef.current, rules.grid, skinRef.current);
    const observer = new ResizeObserver(() => draw(canvas, gameRef.current, rules.grid, skinRef.current));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [rules.grid]);

  /**
   * Sends the crystals eaten since the last chunk. Their Qzr are already counted on screen: signed in,
   * the balance is raised right away and corrected by RemnaWeb's answer; signed out, the chunk waits on
   * this device until sign-in.
   */
  const sendChunk = useEffectEvent(async () => {
    const chunk = chunkRef.current;
    if (chunk.score === 0) return;
    const now = performance.now();
    const run = { score: chunk.score, durationMs: Math.round(now - chunk.since), golden: chunk.golden };
    chunkRef.current = { score: 0, golden: 0, qzr: 0, since: now };
    setUnsent({ crystals: 0, qzr: 0 });
    if (!session.getSnapshot().token) {
      const next = [...readPending(), run].slice(-MAX_PENDING);
      writePending(next);
      setPending(next);
      return;
    }
    setStatus((s) => s && { ...s, balance: s.balance + chunk.qzr, crystals: s.crystals + run.score });
    try {
      const res = await snakeApi<Status & { earned: number }>(code, run);
      if (!res) return;
      setStatus(res);
      // Crystals eaten while the chunk was on its way are not in the server's count yet.
      setCollected(res.crystals + chunkRef.current.score);
    } catch {
      toast.error(t("snake.failed"));
    }
  });

  const finish = useEffectEvent(async (g: Game) => {
    setPhase("over");
    if (g.score > best) {
      setBest(g.score);
      storage.set(BEST_KEY, String(g.score));
    }
    await sendChunk();
  });

  /** A crystal eaten: counted at the price of its number right away, sent with the next chunk. */
  const ate = useEffectEvent((at: Cell, golden: boolean) => {
    const chunk = chunkRef.current;
    const number = collected ?? (session.getSnapshot().token ? (status?.crystals ?? 0) : pending.reduce((sum, r) => sum + r.score, 0));
    // Turbo needs an account; the server applies it again when crediting.
    const turbo = session.getSnapshot().token ? (status?.multiplier ?? 1) : 1;
    const price = crystalValue(number, rules.value) * (golden ? rules.goldenMultiplier : 1);
    setCollected(number + 1);
    if (golden) chunk.golden++;
    const qzr = Math.round(price * turbo);
    chunk.score++;
    chunk.qzr += qzr;
    setUnsent({ crystals: chunk.score, qzr: chunk.qzr });
    const popup = { id: ++popupId.current, x: ((at.x + 0.5) / rules.grid) * 100, y: ((at.y + 0.5) / rules.grid) * 100, qzr, bonus: qzr - price, golden, particles: particlesOf(look.effect) };
    setPopups((list) => [...list, popup]);
    setTimeout(() => setPopups((list) => list.filter((p) => p.id !== popup.id)), POPUP_MS);
  });

  // Chunks while playing, so a long run is credited as it goes.
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => void sendChunk(), CHUNK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  // The loop: one step per tick while playing, faster with every crystal.
  useEffect(() => {
    const g = gameRef.current;
    if (phase !== "playing" || !g) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      // Whether the crystal ahead is golden, before the step replaces it.
      const golden = g.food.golden;
      const result = step(g);
      if (canvasRef.current) draw(canvasRef.current, g, g.rules.grid, skinRef.current);
      if (result === "dead") {
        void finish(g);
        return;
      }
      if (result === "saved") {
        setLives(g.lives);
        navigator.vibrate?.([30, 40, 30]);
      }
      if (result === "ate") {
        setScore(g.score);
        ate(g.snake[0], golden);
        navigator.vibrate?.(12);
      }
      timer = setTimeout(tick, g.stepMs);
    };
    timer = setTimeout(tick, g.stepMs);
    return () => clearTimeout(timer);
  }, [phase]);

  /** Buys the next level of a bonus with the country's Qzr keys; it applies from the next run. */
  const buyPerk = async (id: string) => {
    setBuying(id);
    try {
      const res = await snakeApi<Status>(code, { id }, "snake/perks");
      if (res) setStatus(res);
    } catch {
      toast.error(t("snake.buyFailed"));
    } finally {
      setBuying(null);
    }
  };

  const start = () => {
    // Bonuses need an account: they are bought and kept in RemnaWeb.
    const boosts = account.token ? boostsOf(status?.perks, rules) : noBoosts(rules);
    gameRef.current = newGame(boosts, rules);
    setLives(boosts.lives);
    chunkRef.current = { score: 0, golden: 0, qzr: 0, since: performance.now() };
    setUnsent({ crystals: 0, qzr: 0 });
    setScore(0);
    redraw();
    setPhase("playing");
  };

  const togglePause = () => {
    const g = gameRef.current;
    if (!g) return;
    if (phase === "playing") {
      g.pausedAt = performance.now();
      setPhase("paused");
    } else if (phase === "paused") {
      g.pausedMs += performance.now() - (g.pausedAt ?? performance.now());
      g.pausedAt = null;
      setPhase("playing");
    }
  };

  const steer = (d: Dir) => {
    if (phase === "ready" || phase === "over") start();
    if (gameRef.current) turn(gameRef.current, d);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const d = KEYS[e.code];
    if (d) {
      e.preventDefault();
      steer(d);
    } else if (e.code === "Space") {
      e.preventDefault();
      if (phase === "playing" || phase === "paused") togglePause();
      else start();
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const shownBest = hydrated ? Math.max(best, score) : 0;
  const showPad = hydrated && pad;
  const rule = rules.value;
  const pendingCrystals = pending.reduce((sum, r) => sum + r.score, 0);
  /** Crystals already counted: the account's in the country, or this device's before sign-in. */
  const collectedBefore = account.token ? (status?.crystals ?? 0) : pendingCrystals;
  /** Without sign-in the balance is what this device's runs are worth. */
  const localQzr = crystalsValue(0, pendingCrystals, rule);
  // Crystals not sent yet count too: Qzr go up the moment one is eaten.
  const balance = account.token ? (status ? status.balance + unsent.qzr : null) : hydrated ? localQzr + unsent.qzr : null;
  const turbo = account.token ? (status?.multiplier ?? 1) : 1;
  const nextPrice = Math.round(crystalValue(collected ?? collectedBefore, rule) * turbo);

  return (
    <>
      <SiteHeader code={code} name={name} subtitle={t("snake.subtitle")} account={<AccountMenu signIn={signIn} />} className="max-w-md" />

      {/* The whole play area takes swipes, so a thumb below the board steers too; it does not scroll while playing. */}
      <main
        className={cn("mx-auto flex w-full max-w-md flex-1 flex-col gap-3 overflow-clip px-4 pt-4 pb-6 select-none", phase === "playing" && "touch-none", showPad && "pb-44 sm:pb-6")}
        onPointerDown={(e) => {
          if (phase !== "playing" || e.pointerType === "mouse") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          swipeRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const from = swipeRef.current;
          if (!from) return;
          const dx = e.clientX - from.x;
          const dy = e.clientY - from.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
          steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
          // The next turn is measured from here, so one gesture can make several.
          swipeRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          swipeRef.current = null;
        }}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        {/* Score, record and balance in one compact row, with pause and the pad toggle at its end. */}
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
            <Stat label={t("snake.score")} value={num(score)} />
            <Stat label={t("snake.best")} value={num(shownBest)} />
            <Stat
              label="Qzr"
              value={
                balance !== null ? (
                  <span className="inline-flex items-center gap-1">
                    <QzrIcon className="size-3.5" /> {num(balance)}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={phase === "paused" ? t("snake.resume") : t("snake.paused")}
            disabled={phase !== "playing" && phase !== "paused"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={togglePause}
          >
            {phase === "paused" ? <Play /> : <Pause />}
          </Button>
          {/* Phones only: wide screens have a keyboard. */}
          <Button
            variant={showPad ? "secondary" : "ghost"}
            size="icon"
            className="sm:hidden"
            aria-label={t("snake.pad")}
            aria-pressed={showPad}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={togglePad}
          >
            <Gamepad2 />
          </Button>
        </div>

        <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          {hydrated && (
            <>
              <QzrIcon className="size-3.5" /> {t("snake.price", { qzr: num(nextPrice) })}
            </>
          )}
          {phase !== "ready" && lives > 0 && (
            <span className="inline-flex items-center gap-0.5 font-medium text-rose-500">
              <Heart className="size-3 fill-current" /> {lives}
            </span>
          )}
          {turbo > 1 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/12 px-1.5 font-medium text-primary">
              <Gauge className="size-3" /> {t("snake.turbo", { boost: fixed(status?.boost ?? 0, 1), percent: num(Math.round((turbo - 1) * 100)) })}
            </span>
          )}
          {!account.token && signIn && <span>· {t("snake.signIn")}</span>}
        </p>

        {/* A frame around the board, so its rounding never cuts the corner cells. */}
        <div className="relative aspect-square w-full rounded-3xl bg-card p-3 ring-1 ring-foreground/10">
          <canvas ref={canvasRef} className="size-full rounded-xl bg-muted/40 ring-1 ring-foreground/5" />
          {/* What each crystal brought, the turbo's share in green, floating up from where it lay. */}
          <div aria-hidden className="pointer-events-none absolute inset-3 motion-reduce:hidden">
            {popups.map((p) =>
              p.particles.map((f, i) => (
                <span
                  key={`${p.id}-${i}`}
                  className="absolute leading-none animate-flag-burst"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: f.size, "--dx": `${f.dx}px`, "--dy": `${f.dy}px`, "--rot": `${f.rot}deg` } as React.CSSProperties}
                >
                  {f.emoji}
                </span>
              )),
            )}
            {popups.map((p) => (
              <span
                key={p.id}
                className={cn(
                  "absolute flex animate-float-up items-baseline gap-1 font-heading text-sm font-bold whitespace-nowrap tabular-nums [text-shadow:0_2px_8px_rgb(0_0_0/0.45)]",
                  p.golden && "text-base text-amber-400",
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                +{num(p.qzr)}
                {p.bonus > 0 && (
                  <span className="inline-flex items-center text-xs text-primary">
                    <Gauge className="size-3" />+{num(p.bonus)}
                  </span>
                )}
              </span>
            ))}
          </div>
          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-background/60 backdrop-blur-[2px]">
              {phase !== "ready" && <p className="font-heading text-2xl font-bold">{phase === "paused" ? t("snake.paused") : t("snake.over")}</p>}
              {phase === "over" && <p className="text-sm text-muted-foreground tabular-nums">{t("snake.score")}: {num(score)}</p>}
              <Button size="lg" onClick={phase === "paused" ? togglePause : start}>
                {phase === "over" ? <RotateCcw /> : <Play />}
                {phase === "ready" ? t("snake.play") : phase === "paused" ? t("snake.resume") : t("snake.again")}
              </Button>
              {phase === "ready" && <p className="text-xs text-muted-foreground sm:hidden">{t("snake.swipe")}</p>}
            </div>
          )}
        </div>

        <p className="hidden text-center text-xs text-muted-foreground sm:block">{t("snake.hint")}</p>

        {/* Bonuses bought with the country's Qzr keys, shared with the clicker; kept in RemnaWeb, so signed in only. */}
        {account.token && status && (
          <section className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <p className="font-heading font-semibold">{t("snake.bonuses")}</p>
                <p className="flex items-center gap-1 text-xs font-medium tabular-nums">
                  <ChipIcon className="size-3.5" /> {num(status.keys)}
                </p>
              </div>
              {/* Like the clicker's bar (prestige.tsx): from the key reached last to the next one. */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("snake.nextKey")}</span>
                  <span className="tabular-nums">
                    {num(status.crystals)} / {num(status.crystals + status.nextKey)}
                  </span>
                </div>
                <Progress value={keyProgress(status)} className="h-1" />
              </div>
            </div>
            {status.perks.map((p) => {
              const Icon = PERK_ICONS[p.id] ?? Sparkles;
              const effect = num(Math.round(Math.max(1, p.level) * p.perLevel * (p.id === "life" ? 1 : 100)));
              const maxed = p.cost === null;
              const canBuy = !maxed && status.keys >= (p.cost ?? Infinity) && phase !== "playing";
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-foreground/10">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", p.level ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {p.name ?? p.id}
                      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                        {p.level}/{p.maxLevel}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{p.description?.replace("{n}", effect)}</p>
                  </div>
                  <Button size="sm" className="shrink-0 tabular-nums" disabled={!canBuy || buying !== null} onClick={() => void buyPerk(p.id)}>
                    {maxed ? (
                      t("snake.max")
                    ) : (
                      <>
                        <ChipIcon /> {num(p.cost ?? 0)}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {/* The pad sits under the thumbs at the bottom of a phone screen, inverted-T like arrow keys. */}
      {showPad && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/90 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] select-none sm:hidden">
          <div className="mx-auto grid w-fit touch-none grid-cols-3 gap-2">
            <span />
            <PadButton label={t("snake.up")} onPress={() => steer("up")}>
              <ArrowUp />
            </PadButton>
            <span />
            <PadButton label={t("snake.left")} onPress={() => steer("left")}>
              <ArrowLeft />
            </PadButton>
            <PadButton label={t("snake.down")} onPress={() => steer("down")}>
              <ArrowDown />
            </PadButton>
            <PadButton label={t("snake.right")} onPress={() => steer("right")}>
              <ArrowRight />
            </PadButton>
          </div>
        </div>
      )}
    </>
  );
}

function PadButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    // Pointer down, not click: a turn should not wait for the finger to lift.
    <Button
      variant="outline"
      className="size-16 touch-none rounded-2xl bg-card/90 active:bg-primary/20 [&_svg]:size-7"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        // Not a swipe start on the play area behind.
        e.stopPropagation();
        onPress();
      }}
    >
      {children}
    </Button>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-1.5">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-heading text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
