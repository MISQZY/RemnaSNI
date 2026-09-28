"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, Gauge, Heart, LogOut, Pause, Play, RotateCcw, Send, Sparkles, Turtle } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ChipIcon } from "@/components/chip-icon";
import { LanguageSwitch, useFormat } from "@/components/i18n-provider";
import { ProfileAvatar, ProfileName } from "@/components/profile-avatar";
import { QzrIcon } from "@/components/qzr-icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SnakeRules, ValueRule } from "@/lib/config";
import type { SnakeLook, SnakeSkin } from "@/lib/look";
import { session, useSession, type Account } from "@/lib/session";
import { cn } from "@/lib/utils";

// Snake (a prototype), the game of nodes RemnaWeb has picked it for. Every crystal eaten brings Qzr to the
// country's balance in RemnaWeb (POST /api/sni/snake in chunks while playing). The board, the speeds and the
// crystal prices are RemnaWeb's (SnakeRules, from GET /api/sni/config): a crystal is worth more the more the
// player has collected (lib/snake-rules.ts there).

const BEST_KEY = "remnasni:snake-best";
/** Crystals are sent to RemnaWeb in chunks this often while playing, and when a run ends. */
const CHUNK_MS = 5_000;
/** Chunks played without sign-in, credited to the account once the player signs in. */
const PENDING_KEY = "remnasni:snake-pending";
const MAX_PENDING = 100;
/** Pending runs sent per status load; RemnaWeb takes a dozen runs a minute. */
const FLUSH_PER_LOAD = 10;
/** Price of crystal number `n` (from 0), as RemnaWeb computes it. */
const crystalValue = (n: number, v: ValueRule) => v.base + v.step * n;

/** Qzr for `count` crystals starting at number `from`. */
function crystalsValue(from: number, count: number, v: ValueRule): number {
  let sum = 0;
  for (let n = from; n < from + count; n++) sum += crystalValue(n, v);
  return sum;
}
/** Whether the phone control pad is shown; off by default, swipes are enough. */
const PAD_KEY = "remnasni:snake-pad";
/** A swipe turns once the finger has moved this far, px. */
const SWIPE_PX = 18;

type Cell = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
type Phase = "ready" | "playing" | "paused" | "over";

const VEC: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

/** A crystal on the board; a golden one (the golden bonus) is worth five. */
type Food = Cell & { golden: boolean };

/** What the bonuses bought give a run (see SNAKE_PERKS in RemnaWeb lib/snake.ts). */
type Boosts = { goldenChance: number; lives: number; speedup: number };
const noBoosts = (rules: SnakeRules): Boosts => ({ goldenChance: 0, lives: 0, speedup: rules.speedupMs });

type Game = {
  snake: Cell[];
  dir: Dir;
  /** Turns pressed faster than the snake moves, applied one per step. */
  queue: Dir[];
  food: Food;
  score: number;
  /** Golden crystals eaten this run. */
  golden: number;
  /** Collisions with itself the snake survives this run (the second-life bonus). */
  lives: number;
  boosts: Boosts;
  rules: SnakeRules;
  stepMs: number;
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
};

function freeCell(snake: Cell[], grid: number): Cell {
  const taken = new Set(snake.map((c) => c.y * grid + c.x));
  const free = Array.from({ length: grid * grid }, (_, i) => i).filter((i) => !taken.has(i));
  const i = free[Math.floor(Math.random() * free.length)] ?? 0;
  return { x: i % grid, y: Math.floor(i / grid) };
}

function newFood(snake: Cell[], boosts: Boosts, grid: number): Food {
  return { ...freeCell(snake, grid), golden: Math.random() < boosts.goldenChance };
}

function newGame(boosts: Boosts, rules: SnakeRules): Game {
  const mid = rules.grid >> 1;
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return {
    snake,
    dir: "right",
    queue: [],
    food: newFood(snake, boosts, rules.grid),
    score: 0,
    golden: 0,
    lives: boosts.lives,
    boosts,
    rules,
    stepMs: rules.startStepMs,
    startedAt: performance.now(),
    pausedAt: null,
    pausedMs: 0,
  };
}

/**
 * Moves the snake one cell, through an edge to the opposite one: "ate" on a crystal, "dead" on its own body,
 * or "saved" when a spare life lets it bite its tail off there instead.
 */
function step(g: Game): "ok" | "ate" | "dead" | "saved" {
  const next = g.queue.shift();
  if (next && next !== OPPOSITE[g.dir]) g.dir = next;
  const head = g.snake[0];
  const { grid } = g.rules;
  // The edges wrap around: the snake never hits a wall.
  const to = { x: (head.x + VEC[g.dir].x + grid) % grid, y: (head.y + VEC[g.dir].y + grid) % grid };
  const eats = to.x === g.food.x && to.y === g.food.y;
  // The tail moves away this step unless the snake grows.
  const body = eats ? g.snake : g.snake.slice(0, -1);
  const hit = body.findIndex((c) => c.x === to.x && c.y === to.y);
  if (hit >= 0) {
    if (g.lives <= 0) return "dead";
    // A spare life: the part from the bitten segment on falls off, and the snake moves on.
    g.lives--;
    g.snake = g.snake.slice(0, hit);
    g.snake.unshift(to);
    return "saved";
  }
  g.snake.unshift(to);
  if (!eats) {
    g.snake.pop();
    return "ok";
  }
  g.score++;
  if (g.food.golden) g.golden++;
  g.stepMs = Math.max(g.rules.minStepMs, g.stepMs - g.boosts.speedup);
  g.food = newFood(g.snake, g.boosts, grid);
  return "ate";
}

/** Queues a turn; at most two ahead, never straight back. */
function turn(g: Game, d: Dir) {
  const last = g.queue.at(-1) ?? g.dir;
  if (g.queue.length < 2 && d !== last && d !== OPPOSITE[last]) g.queue.push(d);
}

/** The skin of a snake without a bought one: green, like the Qzr crystal. */
const DEFAULT_SKIN: SnakeSkin = { head: "#5cf08e", body: "#2ee06a", tail: "#139a45", glow: "#2ee06a" };

/** A "#rrggbb" color; black for anything else, so a bad skin only looks wrong. */
function rgbOf(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** The color of segment `i` of `n` in a skin: the head's, then from the body color to the tail's. */
function segmentColor(skin: SnakeSkin, i: number, n: number): string {
  if (skin.rainbow) {
    // The hues run along the body and move on with every step drawn.
    const hue = (((i * 24 - performance.now() / 12) % 360) + 360) % 360;
    return `hsl(${Math.round(hue)} 85% ${i === 0 ? 70 : 58}%)`;
  }
  if (i === 0) return skin.head;
  const at = n > 2 ? (i - 1) / (n - 2) : 0;
  const [a, b] = [rgbOf(skin.body), rgbOf(skin.tail)];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * at)).join(", ")})`;
}

function draw(canvas: HTMLCanvasElement, g: Game | null, grid: number, skin: SnakeSkin | null) {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const cell = size / grid;

  // A faint checkerboard, readable on both themes.
  ctx.fillStyle = "rgba(127, 127, 127, 0.07)";
  for (let y = 0; y < grid; y++) for (let x = (y % 2); x < grid; x += 2) ctx.fillRect(x * cell, y * cell, cell, cell);
  if (!g) return;

  // The crystal: a glowing green rhombus, like the Qzr icon; a golden one shines gold.
  const fx = (g.food.x + 0.5) * cell;
  const fy = (g.food.y + 0.5) * cell;
  const gem = ctx.createLinearGradient(fx - cell / 2, fy - cell / 2, fx + cell / 2, fy + cell / 2);
  gem.addColorStop(0, g.food.golden ? "#fff4b8" : "#b8ffd0");
  gem.addColorStop(1, g.food.golden ? "#d49a0b" : "#139a45");
  ctx.save();
  ctx.shadowColor = g.food.golden ? "rgba(255, 196, 40, 0.9)" : "rgba(46, 224, 106, 0.8)";
  ctx.shadowBlur = cell * 0.6;
  ctx.fillStyle = gem;
  ctx.beginPath();
  ctx.moveTo(fx, fy - cell * 0.42);
  ctx.lineTo(fx + cell * 0.26, fy);
  ctx.lineTo(fx, fy + cell * 0.42);
  ctx.lineTo(fx - cell * 0.26, fy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // The snake in its skin (the one bought in RemnaWeb, or green), lighter at the head, which glows.
  const s = skin ?? DEFAULT_SKIN;
  const n = g.snake.length;
  g.snake.forEach((c, i) => {
    const pad = i === 0 ? cell * 0.06 : cell * 0.12;
    const color = segmentColor(s, i, n);
    ctx.save();
    if (i === 0) {
      ctx.shadowColor = s.rainbow ? color : s.glow;
      ctx.shadowBlur = cell * 0.5;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(c.x * cell + pad, c.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.28);
    ctx.fill();
    ctx.restore();
  });
}

/** A snake bonus as RemnaWeb reports it: level bought, the next level's price in Qzr keys (null when maxed). */
/** A bonus as RemnaWeb sends it, named in the page's language; `{n}` in the description is the effect of the level. */
type Perk = { id: string; name: string; description: string; perLevel: number; level: number; maxLevel: number; cost: number | null };
/**
 * `boost` is the country's turbo, `multiplier` what it does to crystal prices (1 without it); `keys` the free
 * Qzr keys (shared with the clicker), `nextKey` the crystals left until the next one.
 */
type Status = { balance: number; crystals: number; boost: number; multiplier: number; keys: number; nextKey: number; perks: Perk[] };

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
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(PENDING_KEY);
    const runs = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(runs) ? runs.filter((r): r is Run => Number.isInteger(r?.score) && Number.isInteger(r?.durationMs)) : [];
  } catch {
    return [];
  }
}

function writePending(runs: Run[]) {
  try {
    if (runs.length) localStorage.setItem(PENDING_KEY, JSON.stringify(runs));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Without storage the runs last until the page closes.
  }
}

/** RemnaWeb's snake API for the signed-in player; null when signed out (or signed out by a 401). */
async function snakeApi<T>(country: string, body?: object, path = "snake"): Promise<T | null> {
  const token = session.getSnapshot().token;
  if (!token) return null;
  const res = await fetch(`/api/sni/${path}?${new URLSearchParams({ country })}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    session.signOut();
    return null;
  }
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

function readPad(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(PAD_KEY) === "1";
  } catch {
    return false;
  }
}

function readBest(): number {
  try {
    return typeof window === "undefined" ? 0 : Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

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
    try {
      localStorage.setItem(PAD_KEY, next ? "1" : "0");
    } catch {
      // The choice lasts until the page closes.
    }
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
        if ((err as Error).message !== "400") break;
      }
      left.shift();
    }
    writePending(left);
    setPending(left);
    if (earned > 0) toast.success(t("snake.synced", { n: num(earned) }));
  });

  const loadStatus = useEffectEvent(async () => {
    try {
      const res = await snakeApi<Status & { user: { name: string; photoUrl: string | null }; snake?: SnakeLook; session: string | null }>(code);
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
      try {
        localStorage.setItem(BEST_KEY, String(g.score));
      } catch {
        // The record lasts until the page closes.
      }
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
      <header className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pt-6 lg:pt-10">
        <span className={cn("fi shrink-0 rounded-[3px] text-2xl shadow-xs", `fi-${code}`)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-xl font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{t("snake.subtitle")}</p>
        </div>
        <LanguageSwitch />
        <SnakeAccount signIn={signIn} account={account.account} token={account.token} />
      </header>

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
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="font-heading font-semibold">{t("snake.bonuses")}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChipIcon className="size-4" /> {num(status.keys)} · {t("snake.nextKey", { n: num(status.nextKey) })}
              </p>
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

/** Telegram sign-in, or the signed-in account with a sign-out. */
function SnakeAccount({ signIn, account, token }: { signIn: boolean; account: Account | null; token: string | null }) {
  const t = useTranslations();
  if (!token) {
    return signIn ? (
      <Button size="sm" onClick={() => location.assign(session.signInUrl())}>
        <Send /> {t("account.signIn")}
      </Button>
    ) : null;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t("account.account")} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ProfileAvatar account={account} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="p-2">
          <ProfileName account={account} className="truncate text-sm font-medium" />
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={session.signOut}>
          <LogOut /> {t("snake.signOut")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
