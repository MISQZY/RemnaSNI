import { afterEach, describe, expect, it, vi } from "vitest";
import { findMove, newBoard, play } from "./board";
import { restorePending, savePending, type Unsent } from "./pending";
const data = new Map<string, string>();
vi.stubGlobal("window", { sessionStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) } });
afterEach(() => data.clear());
describe("durable moves", () => {
  const setup = () => ({ id: "board-a", board: newBoard({ cols: 10, rows: 8, colors: 6, seed: 2024 }) });
  it("restores after navigation and isolates users and countries", () => {
    const stored = setup();
    const move = findMove(stored.board)!;
    const unsent: Unsent[] = [{ move, gems: 7, qzr: 100 }];
    savePending("alice:1", "de", stored, unsent);
    const expected = structuredClone(stored.board); play(expected, move);
    expect(restorePending("alice:1", "de", stored)).toEqual({ board: expected, unsent });
    expect(restorePending("bob:1", "de", stored)).toBeNull();
    expect(restorePending("alice:1", "fr", stored)).toBeNull();
  });
  it("removes a prefix already committed when the HTTP answer was lost", () => {
    const stored = setup();
    const board = structuredClone(stored.board);
    const first = findMove(board)!; play(board, first);
    const second = findMove(board)!;
    const unsent: Unsent[] = [first, second].map(move => ({ move, gems: 1, qzr: 2 }));
    savePending("alice:1", "de", stored, unsent);
    const expected = structuredClone(board); play(expected, second);
    expect(restorePending("alice:1", "de", { id: stored.id, board })).toEqual({ board: expected, unsent: unsent.slice(1) });
    expect(restorePending("alice:1", "de", { id: "different", board })).toBeNull();
  });
});
