import { tabStorage } from "@/core/storage";
import { replay, type Board, type Move } from "./board";

export type Stored = { id: string; board: Board };
export type Unsent = { move: Move; gems: number; qzr: number };
type Pending = { stored: Stored; unsent: Unsent[] };
const key = (owner: string, country: string) => "gems-pending:" + encodeURIComponent(owner) + ":" + country;

/** Per-tab journal: another tab must not overwrite this board's unsent moves. No token is stored. */
export function savePending(owner: string, country: string, stored: Stored, unsent: Unsent[]) {
  tabStorage.set(key(owner, country), unsent.length ? JSON.stringify({ stored, unsent }) : null);
}

/** Reconcile an unanswered request too: the server may already have applied a prefix of our moves. */
export function restorePending(owner: string, country: string, server: Stored): { board: Board; unsent: Unsent[] } | null {
  try {
    const saved = JSON.parse(tabStorage.get(key(owner, country)) ?? "null") as Pending | null;
    if (!saved || saved.stored.id !== server.id || !Array.isArray(saved.unsent)) return null;
    const applied = server.board.moves - saved.stored.board.moves;
    if (!Number.isInteger(applied) || applied < 0 || applied > saved.unsent.length) return null;
    const unsent = saved.unsent.slice(applied);
    if (!unsent.every(u => Array.isArray(u.move) && u.move.length === 2 && u.move.every(Number.isInteger) && Number.isFinite(u.gems) && Number.isFinite(u.qzr))) return null;
    const result = replay(server.board, unsent.map(u => u.move));
    return "bad" in result ? null : { board: result.board, unsent };
  } catch { return null; }
}
