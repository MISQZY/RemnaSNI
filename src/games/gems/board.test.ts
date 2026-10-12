import { describe, expect, it } from "vitest";
import { COL, EMPTY, PLAIN, ROW, STAR, colorOf, findMove, gem, isMove, kindOf, newBoard, play, replay, tallyOf, type Board, type Move, type MoveResult } from "./board";

const setup = { cols: 10, rows: 8, colors: 6, seed: 12345 };

/** A player who always makes the first move there is: the moves made and what they did. */
function autoplay(b: Board, n: number): { moves: Move[]; results: MoveResult[] } {
  const moves: Move[] = [];
  const results: MoveResult[] = [];
  for (let i = 0; i < n; i++) {
    const move = findMove(b);
    if (!move) throw new Error("no move");
    moves.push(move);
    results.push(play(b, move)!);
  }
  return { moves, results };
}

/** A board of the given colors, row by row (a digit a gem); `*` a star. */
function boardOf(rows: string[], colors = 6): Board {
  const cells = rows.flatMap((r) => [...r].map((ch) => (ch === "*" ? gem(0, STAR) : gem(Number(ch)))));
  return { cols: rows[0].length, rows: rows.length, colors, cells, rng: 7, line: 0, golden: 0, moves: 0 };
}

/** Whether three of a color stand in a row or a column anywhere. */
function lined(b: Board): boolean {
  const at = (x: number, y: number) => b.cells[y * b.cols + x];
  for (let y = 0; y < b.rows; y++)
    for (let x = 0; x < b.cols; x++) {
      const c = colorOf(at(x, y));
      if (x + 2 < b.cols && colorOf(at(x + 1, y)) === c && colorOf(at(x + 2, y)) === c) return true;
      if (y + 2 < b.rows && colorOf(at(x, y + 1)) === c && colorOf(at(x, y + 2)) === c) return true;
    }
  return false;
}

describe("a new board", () => {
  it("is the same for the same seed, and has nothing lined up and a move to make", () => {
    for (const seed of [1, 7, 99, 123456, 2 ** 31 - 1]) {
      const a = newBoard({ ...setup, seed });
      expect(newBoard({ ...setup, seed })).toEqual(a);
      expect(a.cells).toHaveLength(80);
      expect(a.cells.every((g) => g !== EMPTY && kindOf(g) === PLAIN && colorOf(g) < 6)).toBe(true);
      expect(findMove(a)).not.toBeNull();
      expect(lined(a)).toBe(false);
    }
  });
});

describe("moves", () => {
  it("replay the same as they were played", () => {
    for (const seed of [3, 42, 2024]) {
      const played = newBoard({ ...setup, seed, line: 0.05, golden: 0.05 });
      const start = { ...played, cells: [...played.cells] };
      const { moves, results } = autoplay(played, 200);
      const replayed = replay(start, moves);
      expect(replayed).toEqual({ board: played, tally: tallyOf(results) });
      expect(played.moves).toBe(200);
      // The board is never left with a hole or without a move.
      expect(played.cells.every((g) => g !== EMPTY)).toBe(true);
      expect(findMove(played)).not.toBeNull();
    }
  });

  it("keep the board after each wave when traced", () => {
    const traced = newBoard(setup);
    const plain = { ...traced, cells: [...traced.cells] };
    const move = findMove(traced)!;
    const result = play(traced, move, true)!;
    play(plain, move);
    if (!result.shuffled) expect(result.waves.at(-1)!.after).toEqual(traced.cells);
    expect(traced).toEqual(plain);
  });

  it("refuse a swap that lines nothing up, of cells that are not neighbours, or off the board", () => {
    const b = boardOf(["0123", "1230", "2301"]);
    expect(isMove(b, 0, 1)).toBe(false);
    expect(isMove(b, 0, 5)).toBe(false);
    expect(isMove(b, 3, 4)).toBe(false);
    expect(isMove(b, 11, 12)).toBe(false);
    expect(play(b, [0, 1])).toBeNull();
    const start = newBoard(setup);
    const good = findMove(start)!;
    expect(replay(start, [good, [0, 0]])).toEqual({ bad: 1 });
    expect(start.moves).toBe(0);
  });

  it("clear a row of three and drop new gems in from the top", () => {
    const b = boardOf(["0122", "1203", "3451"]);
    // Swapping the 1 at the top with the 2 under it lines up 2 2 2.
    const result = play(b, [1, 5])!;
    expect(result.waves[0].cleared.length).toBeGreaterThanOrEqual(3);
    expect(b.cells.every((g) => g !== EMPTY)).toBe(true);
    expect(b.moves).toBe(1);
  });

  it("leave a line gem for four in a row, and a star for five", () => {
    const four = boardOf(["00103", "34053", "45314"]);
    const r4 = play(four, [7, 2])!;
    expect(r4.waves[0].spawned).toEqual([{ cell: 2, gem: gem(0, ROW) }]);
    expect(r4.waves[0].cleared).toEqual([0, 1, 3]);

    const column = boardOf(["012", "034", "103", "054"]);
    const rc = play(column, [6, 7])!;
    expect(rc.waves[0].spawned).toEqual([{ cell: 6, gem: gem(0, COL) }]);

    const five = boardOf(["001002", "340314", "453145"]);
    const r5 = play(five, [8, 2])!;
    expect(r5.waves[0].spawned).toEqual([{ cell: 2, gem: gem(0, STAR) }]);
  });

  it("clear every gem of a color with a star", () => {
    const b = boardOf(["*1234", "51234", "23451"]);
    const result = play(b, [0, 1])!;
    // The star and the four 1s.
    expect(result.waves[0].cleared).toEqual([0, 1, 6, 14]);
  });

  it("clear a whole row with a line gem", () => {
    const b = boardOf(["2345", "0010", "4523"]);
    b.cells[4] = gem(0, ROW);
    const result = play(b, [6, 7])!;
    expect(result.waves[0].cleared).toEqual([4, 5, 6, 7]);
  });
});

describe("the copy on the sites", () => {
  // RemnaWeb's lib/game/gems/board.ts must play exactly the same: both repos check this very game.
  it("plays a fixed game to the same end", () => {
    const b = newBoard({ ...setup, seed: 2024, line: 0.05, golden: 0.05 });
    const results = autoplay(b, 300).results;
    expect({ rng: b.rng, cells: b.cells.join(""), tally: tallyOf(results) }).toEqual({
      rng: 2014572395,
      cells: "513244235135421443003240211422411642432020103131351320014421451341335402244220042014164",
      tally: { cleared: 2039, golden: 94, cascade: 851, best: 6 },
    });
  });
});

describe("the tally", () => {
  it("counts cascades by their wave", () => {
    const t = tallyOf([
      { waves: [{ cleared: [1, 2, 3], golden: 1, spawned: [] }, { cleared: [4, 5, 6, 7], golden: 0, spawned: [] }], shuffled: false },
      { waves: [{ cleared: [1, 2, 3], golden: 0, spawned: [] }], shuffled: false },
    ]);
    expect(t).toEqual({ cleared: 10, golden: 1, cascade: 4, best: 2 });
  });
});
