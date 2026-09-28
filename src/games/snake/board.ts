import type { SnakeRules, SnakeSkin } from "./rules";

// The board of the snake: the run as plain data, a step of it, and its drawing on a canvas. No React here.

export type Cell = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";
export type Phase = "ready" | "playing" | "paused" | "over";

const VEC: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
export const KEYS: Record<string, Dir> = {
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
export type Food = Cell & { golden: boolean };

/** What the bonuses bought give a run (see SNAKE_PERKS in RemnaWeb lib/snake.ts). */
export type Boosts = { goldenChance: number; lives: number; speedup: number };
export const noBoosts = (rules: SnakeRules): Boosts => ({ goldenChance: 0, lives: 0, speedup: rules.speedupMs });

export type Game = {
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

export function newGame(boosts: Boosts, rules: SnakeRules): Game {
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
export function step(g: Game): "ok" | "ate" | "dead" | "saved" {
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
export function turn(g: Game, d: Dir) {
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

export function draw(canvas: HTMLCanvasElement, g: Game | null, grid: number, skin: SnakeSkin | null) {
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
