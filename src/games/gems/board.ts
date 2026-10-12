// The board of Gems (match three), as plain data: a field `cols` wide and `rows` high (wider than high), gems of a few
// colors, swapped two neighbours at a time. A row of three or more of a color goes, the gems above fall into its
// place and new ones drop in from the top; what lines up after the fall goes too, a cascade. A row of four leaves a
// line gem (it clears its row or column when it goes), a row of five a star (swapped with a gem, it clears every gem
// of that color). A board with no move left is shuffled.
//
// Everything random comes from a seeded generator, so a board plays the same wherever it runs: the site plays it,
// and RemnaWeb replays the moves the site sends (its lib/game/gems/game.ts) and pays only for what they really cleared.
// This file is a copy of RemnaWeb's lib/game/gems/board.ts: change both, or no move is paid.

/** What a cell holds, packed in a number: the color in the low bits, the kind above it, the golden flag above that. */
export type Gem = number;

/** Kinds of gems: a plain one, a line gem clearing its row or its column, a star. */
export const PLAIN = 0;
export const ROW = 1;
export const COL = 2;
export const STAR = 3;
export type Kind = typeof PLAIN | typeof ROW | typeof COL | typeof STAR;

/** No gem: a cell emptied while a move resolves. Never left on a board between moves. */
export const EMPTY = -1;

const COLOR_BITS = 3;
const KIND_BITS = 2;
const COLOR_MASK = (1 << COLOR_BITS) - 1;
const KIND_MASK = (1 << KIND_BITS) - 1;
const GOLDEN_BIT = 1 << (COLOR_BITS + KIND_BITS);

/** The most colors a board may have. */
export const MAX_COLORS = COLOR_MASK + 1;

export const gem = (color: number, kind: Kind = PLAIN, golden = false): Gem => color | (kind << COLOR_BITS) | (golden ? GOLDEN_BIT : 0);
export const colorOf = (g: Gem) => g & COLOR_MASK;
export const kindOf = (g: Gem) => ((g >> COLOR_BITS) & KIND_MASK) as Kind;
export const isGolden = (g: Gem) => (g & GOLDEN_BIT) !== 0;

/** A board between moves, all the server keeps of it. */
export type Board = {
  cols: number;
  rows: number;
  colors: number;
  /** Row by row from the top: cell `y × cols + x`. */
  cells: Gem[];
  /** The state of the generator. */
  rng: number;
  /** Chances of a new gem dropping in as a line gem and as a golden one (the bonuses bought with keys). */
  line: number;
  golden: number;
  /** Moves made on it. */
  moves: number;
};

/** A move: the two neighbouring cells swapped. */
export type Move = readonly [number, number];

/**
 * What one round of a move cleared: the cells gone (before the fall) and the specials left in their place; traced
 * (play's `trace`), the cells after the fall too, for the site to animate.
 */
export type Wave = { cleared: number[]; golden: number; spawned: { cell: number; gem: Gem }[]; after?: Gem[] };

/** What a move did: its waves (the first one the swap's, then the cascades), and whether the board was shuffled after. */
export type MoveResult = { waves: Wave[]; shuffled: boolean };

/** The next number of mulberry32 in [0, 1), moving the board's generator on. */
function random(b: Board): number {
  b.rng = (b.rng + 0x6d2b79f5) | 0;
  let t = b.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const randomInt = (b: Board, n: number) => Math.min(n - 1, Math.floor(random(b) * n));

/** A gem dropping in from the top: a line gem and a golden one by their chances. */
function dropGem(b: Board): Gem {
  const color = randomInt(b, b.colors);
  const line = random(b) < b.line;
  const kind: Kind = line ? (random(b) < 0.5 ? ROW : COL) : PLAIN;
  return gem(color, kind, random(b) < b.golden);
}

/** Whether two gems match by color: a star matches nothing. */
const same = (a: Gem, b: Gem) => a !== EMPTY && b !== EMPTY && kindOf(a) !== STAR && kindOf(b) !== STAR && colorOf(a) === colorOf(b);

/** The length of the run of gems of one color through `cell`, along its row or its column. */
function runAt(b: Board, cell: number, horizontal: boolean): number {
  const x = cell % b.cols;
  const y = Math.floor(cell / b.cols);
  const g = b.cells[cell];
  let n = 1;
  if (horizontal) {
    for (let i = x - 1; i >= 0 && same(b.cells[y * b.cols + i], g); i--) n++;
    for (let i = x + 1; i < b.cols && same(b.cells[y * b.cols + i], g); i++) n++;
  } else {
    for (let j = y - 1; j >= 0 && same(b.cells[j * b.cols + x], g); j--) n++;
    for (let j = y + 1; j < b.rows && same(b.cells[j * b.cols + x], g); j++) n++;
  }
  return n;
}

const matchesAt = (b: Board, cell: number) => runAt(b, cell, true) >= 3 || runAt(b, cell, false) >= 3;

/** Whether `a` and `c` are neighbouring cells of the board. */
export function neighbours(b: Board, a: number, c: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(c) || a < 0 || c < 0 || a >= b.cells.length || c >= b.cells.length) return false;
  const ax = a % b.cols;
  const cx = c % b.cols;
  return (Math.abs(a - c) === 1 && Math.floor(a / b.cols) === Math.floor(c / b.cols)) || (Math.abs(a - c) === b.cols && ax === cx);
}

function swap(b: Board, a: number, c: number) {
  const t = b.cells[a];
  b.cells[a] = b.cells[c];
  b.cells[c] = t;
}

/** Whether swapping `a` and `c` is a move: a star is in it, or it lines three up. */
export function isMove(b: Board, a: number, c: number): boolean {
  if (!neighbours(b, a, c)) return false;
  if (kindOf(b.cells[a]) === STAR || kindOf(b.cells[c]) === STAR) return true;
  swap(b, a, c);
  const ok = matchesAt(b, a) || matchesAt(b, c);
  swap(b, a, c);
  return ok;
}

/** A move there is on the board, or null: the site's hint. */
export function findMove(b: Board): Move | null {
  for (let cell = 0; cell < b.cells.length; cell++) {
    const x = cell % b.cols;
    if (x + 1 < b.cols && isMove(b, cell, cell + 1)) return [cell, cell + 1];
    if (cell + b.cols < b.cells.length && isMove(b, cell, cell + b.cols)) return [cell, cell + b.cols];
  }
  return null;
}

const hasMatch = (b: Board) => b.cells.some((_, cell) => matchesAt(b, cell));

/** Fills the board from scratch with nothing lined up and a move to make. */
function fill(b: Board) {
  for (let attempt = 0; ; attempt++) {
    for (let cell = 0; cell < b.cells.length; cell++) {
      const x = cell % b.cols;
      // Colors that would make a row of three with the two gems to the left or above are skipped.
      const banned = new Set<number>();
      if (x >= 2 && same(b.cells[cell - 1], b.cells[cell - 2])) banned.add(colorOf(b.cells[cell - 1]));
      if (cell >= 2 * b.cols && same(b.cells[cell - b.cols], b.cells[cell - 2 * b.cols])) banned.add(colorOf(b.cells[cell - b.cols]));
      const allowed = Array.from({ length: b.colors }, (_, c) => c).filter((c) => !banned.has(c));
      b.cells[cell] = gem(allowed[randomInt(b, allowed.length)]);
    }
    // With three colors or fewer a board may have no move; a few more tries find one.
    if (findMove(b) || attempt >= 50) return;
  }
}

/** A new board off `seed`: nothing lined up, a move to make. */
export function newBoard(setup: { cols: number; rows: number; colors: number; seed: number; line?: number; golden?: number }): Board {
  const b: Board = {
    cols: setup.cols,
    rows: setup.rows,
    colors: Math.max(3, Math.min(MAX_COLORS, setup.colors)),
    cells: new Array<Gem>(setup.cols * setup.rows).fill(EMPTY),
    rng: setup.seed | 0,
    line: setup.line ?? 0,
    golden: setup.golden ?? 0,
    moves: 0,
  };
  fill(b);
  return b;
}

/** Shuffles a board with no move left until it has one and nothing lined up; refills it if no shuffle does. */
function shuffle(b: Board) {
  for (let attempt = 0; attempt < 100; attempt++) {
    for (let i = b.cells.length - 1; i > 0; i--) {
      const j = randomInt(b, i + 1);
      const t = b.cells[i];
      b.cells[i] = b.cells[j];
      b.cells[j] = t;
    }
    if (!hasMatch(b) && findMove(b)) return;
  }
  fill(b);
}

/** The runs of three or more on the board: each a list of cells, rows first. */
function findRuns(b: Board): number[][] {
  const runs: number[][] = [];
  for (let y = 0; y < b.rows; y++) {
    let start = 0;
    for (let x = 1; x <= b.cols; x++) {
      const cell = y * b.cols + x;
      if (x < b.cols && same(b.cells[cell], b.cells[cell - 1])) continue;
      if (x - start >= 3) runs.push(Array.from({ length: x - start }, (_, i) => y * b.cols + start + i));
      start = x;
    }
  }
  for (let x = 0; x < b.cols; x++) {
    let start = 0;
    for (let y = 1; y <= b.rows; y++) {
      const cell = y * b.cols + x;
      if (y < b.rows && same(b.cells[cell], b.cells[cell - b.cols])) continue;
      if (y - start >= 3) runs.push(Array.from({ length: y - start }, (_, i) => (start + i) * b.cols + x));
      start = y;
    }
  }
  return runs;
}

/**
 * Clears `cells` and what the specials among them set off: a line gem its row or column, a star every gem of a
 * color (`starColor`, or a random one for a star set off by another special). Cells in `keep` stay (a special just made).
 */
function clear(b: Board, cells: Iterable<number>, keep: Set<number>, starColor: number | null): Wave {
  const gone = new Set<number>();
  const queue = [...cells];
  let golden = 0;
  while (queue.length) {
    const cell = queue.shift()!;
    if (gone.has(cell) || keep.has(cell) || b.cells[cell] === EMPTY) continue;
    gone.add(cell);
    const g = b.cells[cell];
    if (isGolden(g)) golden++;
    const kind = kindOf(g);
    const x = cell % b.cols;
    const y = Math.floor(cell / b.cols);
    if (kind === ROW) for (let i = 0; i < b.cols; i++) queue.push(y * b.cols + i);
    else if (kind === COL) for (let j = 0; j < b.rows; j++) queue.push(j * b.cols + x);
    else if (kind === STAR) {
      const color = starColor ?? randomInt(b, b.colors);
      starColor = null;
      b.cells.forEach((other, i) => {
        if (other !== EMPTY && kindOf(other) !== STAR && colorOf(other) === color) queue.push(i);
      });
    }
  }
  const cleared = [...gone].sort((p, q) => p - q);
  for (const cell of cleared) b.cells[cell] = EMPTY;
  return { cleared, golden, spawned: [] };
}

/** The gems fall into the emptied cells and new ones drop in from the top, column by column, from the left. */
function fall(b: Board) {
  for (let x = 0; x < b.cols; x++) {
    let to = b.rows - 1;
    for (let y = b.rows - 1; y >= 0; y--) {
      const g = b.cells[y * b.cols + x];
      if (g === EMPTY) continue;
      b.cells[to * b.cols + x] = g;
      if (to !== y) b.cells[y * b.cols + x] = EMPTY;
      to--;
    }
    for (let y = to; y >= 0; y--) b.cells[y * b.cols + x] = dropGem(b);
  }
}

/**
 * Clears the runs on the board: a run of four leaves a line gem along it, of five or more a star, on the swapped cell
 * if it is in the run (`moved`), otherwise on its second cell. Null when nothing is lined up.
 */
function clearRuns(b: Board, moved: readonly number[]): Wave | null {
  const runs = findRuns(b);
  if (!runs.length) return null;
  const spawned: { cell: number; gem: Gem }[] = [];
  const keep = new Set<number>();
  for (const run of runs) {
    if (run.length < 4) continue;
    const at = run.find((cell) => moved.includes(cell) && !keep.has(cell)) ?? run.find((cell, i) => i >= 1 && !keep.has(cell));
    if (at === undefined) continue;
    const horizontal = run[1] - run[0] === 1;
    const special = gem(colorOf(b.cells[run[0]]), run.length >= 5 ? STAR : horizontal ? ROW : COL);
    keep.add(at);
    spawned.push({ cell: at, gem: special });
  }
  const wave = clear(b, runs.flat(), keep, null);
  // The special takes the place of the gem it was made on, which goes without its effect.
  for (const { cell, gem: g } of spawned) b.cells[cell] = g;
  return { ...wave, spawned };
}

/**
 * Makes move `move` on the board, in place: the swap, what it clears, the cascades after, and a shuffle when no move
 * is left. Null, and the board untouched, when it is no move (not neighbours, or nothing lines up). With `trace` each
 * wave keeps the board after its fall.
 */
export function play(b: Board, move: Move, trace = false): MoveResult | null {
  const [a, c] = move;
  if (!isMove(b, a, c)) return null;
  swap(b, a, c);
  b.moves++;
  const waves: Wave[] = [];
  const ga = b.cells[a];
  const gc = b.cells[c];
  if (kindOf(ga) === STAR || kindOf(gc) === STAR) {
    // A star swapped with a gem clears that gem's color; two stars clear the board.
    const both = kindOf(ga) === STAR && kindOf(gc) === STAR;
    const star = kindOf(ga) === STAR ? a : c;
    const other = star === a ? c : a;
    const cells = both ? b.cells.map((_, i) => i) : [star];
    const wave = clear(b, cells, new Set(), both ? null : colorOf(b.cells[other]));
    fall(b);
    waves.push(trace ? { ...wave, after: [...b.cells] } : wave);
  }
  for (let moved: readonly number[] = waves.length ? [] : [a, c]; ; moved = []) {
    const wave = clearRuns(b, moved);
    if (!wave) break;
    fall(b);
    waves.push(trace ? { ...wave, after: [...b.cells] } : wave);
  }
  const shuffled = !findMove(b);
  if (shuffled) shuffle(b);
  return { waves, shuffled };
}

/** What a run of moves brought: gems cleared, golden ones among them, the cascade weight and the deepest cascade. */
export type Tally = {
  /** Gems cleared. */
  cleared: number;
  golden: number;
  /** Gems cleared by each move's waves, each counted by its wave's number: 0 for the swap's own, 1 for the first cascade… */
  cascade: number;
  /** The most waves of one move. */
  best: number;
};

export const tallyOf = (results: readonly MoveResult[]): Tally =>
  results.reduce(
    (t, r) => ({
      cleared: t.cleared + r.waves.reduce((n, w) => n + w.cleared.length, 0),
      golden: t.golden + r.waves.reduce((n, w) => n + w.golden, 0),
      cascade: t.cascade + r.waves.reduce((n, w, i) => n + w.cleared.length * i, 0),
      best: Math.max(t.best, r.waves.length),
    }),
    { cleared: 0, golden: 0, cascade: 0, best: 0 },
  );

/**
 * Replays `moves` on a copy of board `b`: the board after them and what they brought, or the number of the first move
 * that is none (`bad`) with the board untouched.
 */
export function replay(b: Board, moves: readonly Move[]): { board: Board; tally: Tally } | { bad: number } {
  const board: Board = { ...b, cells: [...b.cells] };
  const results: MoveResult[] = [];
  for (let i = 0; i < moves.length; i++) {
    const result = play(board, moves[i]);
    if (!result) return { bad: i };
    results.push(result);
  }
  return { board, tally: tallyOf(results) };
}
