"use client";

import { useTranslations } from "next-intl";
import { memo, useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/core/player/api";
import { useFormat } from "@/core/i18n/provider";
import { session, useSession } from "@/core/player/session";
import { AccountMenu } from "@/core/ui/account-menu";
import { PerkShop, usePerkShop, type PerkStatus } from "@/core/ui/perk-shop";
import { BalanceTile, Gain, StatTile, TurboBadge } from "@/core/ui/stat-tile";
import { Particles, particlesOf, type Particle } from "@/core/cosmetics/particles";
import { useGameStatus } from "@/core/player/use-game-status";
import { haptic } from "@/core/haptic";
import { useHydrated } from "@/core/use-hydrated";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { gameLayout } from "@/core/ui/game-layout";
import { SiteHeader } from "@/core/ui/site-header";
import { cn } from "@/lib/utils";
import { COL, PLAIN, ROW, STAR, colorOf, findMove, isGolden, isMove, kindOf, neighbours, newBoard, play, replay, type Board, type Gem, type Move, type Wave } from "./board";
import { Crystal } from "./crystal";
import { DEFAULT_SKIN, gemValue, waveValue, type GemsLook, type GemsRules, type GemsSkin } from "./rules";

// Gems (match three), the game of nodes RemnaWeb has picked it for. Signed in, the board is RemnaWeb's: it deals it
// (POST /api/sni/gems/start) and keeps it, the site plays the same board (board.ts, a copy of RemnaWeb's) and sends its
// moves in chunks (POST /api/sni/gems), which RemnaWeb replays before it pays for the gems they cleared. The prices
// shown are counted here the way RemnaWeb counts them and corrected by its answers. Signed out, a board is dealt here,
// for the fun of it: nothing proves its moves were made, so they bring no Qzr.

/** A swipe swaps once the finger has moved this far, px. */
const SWIPE_PX = 14;
/** The steps of a move on screen, ms: the swap, a wave of gems bursting, their fall; a shuffle. */
const SWAP_MS = 200;
const POP_MS = 380;
const FALL_MS = 330;
const SHUFFLE_MS = 700;
/** How long a popup floats, ms: the gem-float animation in globals.css. */
const POPUP_MS = 1_700;

/**
 * The bonuses' status (core/ui/perk-shop.tsx) with `cleared` gems in the country (which the keys come for), `best` the
 * most waves one move has cleared there, `price` the next gem's worth with the turbo and `cascadeBonus` with the
 * player's bonus.
 */
type Status = PerkStatus & { cleared: number; best: number; price: number; cascadeBonus: number };
/** The board RemnaWeb keeps, with its id: what a chunk is played on. */
type Stored = { id: string; board: Board };
/** RemnaWeb's answer to a chunk: what it paid, the board after it and the status. */
type Played = Status & { earned: number; keysEarned: number; board: Stored };

/**
 * A gem on screen: `id` keeps it the same element while it moves; `drop` the rows it falls in from above the board,
 * `fall` the rows it falls within it.
 */
type Tile = { id: number; gem: Gem; drop?: number; fall?: number };
/** A move made but not credited yet, with the gems it cleared and the Qzr they are worth, shown already. */
type Unsent = { move: Move; gems: number; qzr: number };
/** A floating "+N Qzr" over a wave: `bonus` the part the turbo added; `cascade` its wave number from the swap's. */
type Popup = { id: number; x: number; y: number; qzr: number | null; bonus: number; cascade: number; golden: boolean; particles: Particle[] };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const copyBoard = (b: Board): Board => ({ ...b, cells: [...b.cells] });
const sameBoard = (a: Board, b: Board) => a.rng === b.rng && a.moves === b.moves && a.cells.every((g, i) => g === b.cells[i]);

let lastTileId = 0;
const tilesOf = (cells: readonly Gem[]): Tile[] => cells.map((gem) => ({ id: ++lastTileId, gem }));

/**
 * The tiles after a wave, as the board fell (board.ts): in each column the gems left move down in their order, keeping
 * their ids, and new ones drop in above them; the specials made take the place of the gem they were made on.
 */
function tilesAfter(tiles: readonly Tile[], wave: Wave, cols: number, rows: number): Tile[] {
  const after = wave.after!;
  const gone = new Set(wave.cleared);
  const next: Tile[] = new Array(tiles.length);
  for (let x = 0; x < cols; x++) {
    let to = rows - 1;
    for (let y = rows - 1; y >= 0; y--) {
      const cell = y * cols + x;
      if (gone.has(cell)) continue;
      next[to * cols + x] = { id: tiles[cell].id, gem: after[to * cols + x], ...(to > y && { fall: to - y }) };
      to--;
    }
    for (let y = to; y >= 0; y--) next[y * cols + x] = { id: ++lastTileId, gem: after[y * cols + x], drop: to + 1 };
  }
  return next;
}

/** RemnaWeb's Gems API (core/player/api.ts): the board, the moves and the bonuses (the status comes with useGameStatus). */
const gemsApi = <T,>(country: string, path: string, body: object, keepalive = false) => api<T>(path, { method: "POST", body, country, keepalive });

/**
 * Whether the board is wanted on its side: a phone held upright (below lg, higher than wide) gets the board as high as
 * the rules make it wide, the same gems in bigger cells. Asked when a board is dealt; turning the phone keeps it.
 */
const portraitScreen = () => window.matchMedia("(width < 64rem) and (orientation: portrait)").matches;
/** The size of the board for this screen. */
const sizeFor = (rules: GemsRules) => (portraitScreen() ? { cols: rules.rows, rows: rules.cols } : { cols: rules.cols, rows: rules.rows });

/** A board dealt here, to play signed out. */
const localBoard = (rules: GemsRules) => newBoard({ ...sizeFor(rules), colors: rules.colors, seed: Math.floor(Math.random() * 2 ** 31) });

export function GemsSite({ code, name, signIn, rules }: { code: string; name: string; signIn: boolean; rules: GemsRules }) {
  const t = useTranslations();
  const { num } = useFormat();
  const account = useSession();
  // False while hydrating, so the board dealt here does not differ from the server's markup.
  const hydrated = useHydrated();
  const { status, setStatus, loaded } = useGameStatus<Status & { gems?: GemsLook }>("gems", code);
  const look: GemsLook = { skin: loaded?.gems?.skin ?? null, effect: loaded?.gems?.effect ?? null };

  /** The board as played here, every move made included; RemnaWeb's board before the moves not credited yet. */
  const boardRef = useRef<Board | null>(null);
  const storedRef = useRef<Stored | null>(null);
  const unsentRef = useRef<Unsent[]>([]);
  /** The chunk on its way to RemnaWeb, while there is one. */
  const sendingRef = useRef<Promise<void> | null>(null);
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [popping, setPopping] = useState<ReadonlySet<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  /** A move playing out on screen: no other is taken meanwhile. */
  const [busy, setBusy] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  /** Gems cleared and the most waves of a move on this visit. */
  const [score, setScore] = useState(0);
  const [bestWaves, setBestWaves] = useState(0);
  /** The gems and Qzr of the moves not credited yet, shown already. */
  const [unsent, setUnsent] = useState({ gems: 0, qzr: 0 });
  const swipeRef = useRef<{ cell: number; x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const popupId = useRef(0);

  /** The size of the board on screen: RemnaWeb's board keeps its own while an admin changes the rules. */
  const [{ cols, rows }, setSize] = useState({ cols: rules.cols, rows: rules.rows });
  const signedIn = !!account.token;

  const showUnsent = () => {
    const list = unsentRef.current;
    setUnsent({ gems: list.reduce((n, u) => n + u.gems, 0), qzr: list.reduce((n, u) => n + u.qzr, 0) });
  };

  /** Puts `board` on screen anew, all its gems new elements. */
  const show = (board: Board | null) => {
    boardRef.current = board;
    if (board) setSize({ cols: board.cols, rows: board.rows });
    setTiles(board ? tilesOf(board.cells) : null);
    setSelected(null);
    setHint(null);
  };

  /**
   * Takes RemnaWeb's board (the one kept, or a new one); the moves not credited are gone with the old one. A board kept
   * for another screen (the computer's on a phone) gives way to a new one turned this screen's way.
   */
  const resync = async () => {
    try {
      const res = await gemsApi<Stored>(code, "gems/start", { portrait: portraitScreen() });
      if (!res) return;
      storedRef.current = res;
      unsentRef.current = [];
      showUnsent();
      show(copyBoard(res.board));
    } catch {
      toast.error(t("gems.failed"));
    }
  };

  /** Signed in, the board is RemnaWeb's; signed out, one dealt here. */
  const deal = useEffectEvent(() => {
    storedRef.current = null;
    unsentRef.current = [];
    showUnsent();
    // The frame takes the board's shape while it is on its way.
    setSize(sizeFor(rules));
    if (session.getSnapshot().token) {
      show(null);
      void resync();
    } else show(localBoard(rules));
  });

  useEffect(() => {
    // After the effect: the board of an account arrives asynchronously anyway.
    if (hydrated) void Promise.resolve().then(deal);
  }, [account.token, hydrated]);

  /**
   * Sends the moves not credited yet (as of now: those made meanwhile wait for the next chunk). RemnaWeb replays them
   * on its board: its answer is the board after them, on which the moves made since are played again; a chunk it
   * refuses, or made on a board it no longer has, gives way to its board.
   */
  const sendChunk = (keepalive = false): Promise<void> => {
    if (sendingRef.current) return sendingRef.current;
    const stored = storedRef.current;
    const chunk = unsentRef.current.slice();
    if (!session.getSnapshot().token || !stored || !chunk.length) return Promise.resolve();
    const run = async () => {
      try {
        const res = await gemsApi<Played>(code, "gems", { id: stored.id, at: stored.board.moves, moves: chunk.map((u) => u.move) }, keepalive);
        if (!res) return;
        storedRef.current = res.board;
        unsentRef.current = unsentRef.current.slice(chunk.length);
        showUnsent();
        setStatus(res);
        if (res.keysEarned > 0) {
          toast.success(t("gems.keys", { n: res.keysEarned }));
          haptic("success", [20, 40, 20]);
        }
        // The moves made meanwhile, on RemnaWeb's board: they must come to the board here.
        const again = replay(res.board.board, unsentRef.current.map((u) => u.move));
        if ("bad" in again || !boardRef.current || !sameBoard(again.board, boardRef.current)) await resync();
      } catch (err) {
        // Not reached, or RemnaWeb failing: the moves wait for the next chunk. Refused, or another board: RemnaWeb's.
        if (err instanceof ApiError && err.status > 0 && err.status < 500) {
          toast.error(t(err.status === 409 ? "gems.stale" : "gems.failed"));
          await resync();
        }
      } finally {
        sendingRef.current = null;
      }
    };
    sendingRef.current = run();
    return sendingRef.current;
  };
  const sendLater = useEffectEvent((keepalive?: boolean) => void sendChunk(keepalive));

  useEffect(() => {
    if (!signedIn) return;
    // Moves go to RemnaWeb in chunks every rules.chunkMs while playing, and when the page is hidden.
    const timer = setInterval(() => sendLater(), rules.chunkMs);
    // A page hidden may never come back: what was played goes now.
    const onHide = () => {
      if (document.visibilityState === "hidden") sendLater(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [signedIn, rules.chunkMs]);

  // A move shown after rules.hintMs without one.
  useEffect(() => {
    if (busy || !tiles) return;
    const timer = setTimeout(() => boardRef.current && setHint(findMove(boardRef.current)), rules.hintMs);
    return () => clearTimeout(timer);
  }, [busy, tiles, rules.hintMs]);

  /** Floats what a wave brought over its gems, with the particles of the effect bought. */
  const popup = (wave: Wave, qzr: number | null, bonus: number, cascade: number) => {
    const xs = wave.cleared.map((c) => (c % cols) + 0.5);
    const ys = wave.cleared.map((c) => Math.floor(c / cols) + 0.5);
    const p: Popup = {
      id: ++popupId.current,
      x: (xs.reduce((a, b) => a + b, 0) / xs.length / cols) * 100,
      y: (ys.reduce((a, b) => a + b, 0) / ys.length / rows) * 100,
      qzr,
      bonus,
      cascade,
      golden: wave.golden > 0,
      particles: particlesOf(look.effect, 5, 34, 52),
    };
    setPopups((list) => [...list, p]);
    setTimeout(() => setPopups((list) => list.filter((x) => x.id !== p.id)), POPUP_MS);
  };

  /** Swaps `a` and `c`: back again when it is no move; otherwise the move plays out, wave by wave. */
  const swapGems = async (a: number, c: number) => {
    const board = boardRef.current;
    if (!board || !tiles || busy || buying || !neighbours(board, a, c)) return;
    setSelected(null);
    setHint(null);
    setBusy(true);
    const swapped = [...tiles];
    [swapped[a], swapped[c]] = [swapped[c], swapped[a]];
    setTiles(swapped);
    await wait(SWAP_MS);
    if (!isMove(board, a, c)) {
      setTiles(tiles);
      await wait(SWAP_MS);
      setBusy(false);
      return;
    }
    const result = play(board, [a, c], true)!;
    // Signed in, the move waits for the next chunk at once; what it is worth is filled in as it plays out.
    const made: Unsent | null = storedRef.current ? { move: [a, c], gems: 0, qzr: 0 } : null;
    if (made) unsentRef.current.push(made);
    /** Another board came meanwhile (RemnaWeb's, or a sign-in): this move's show is over. */
    const gone = () => boardRef.current !== board;

    // What the waves are worth, as RemnaWeb will count them: from the number of the next gem, with the turbo.
    const turbo = signedIn ? (status?.multiplier ?? 1) : 1;
    const bonusRate = status?.cascadeBonus ?? rules.cascadeBonus;
    let from = (status?.cleared ?? 0) + unsent.gems;
    let gems = 0;
    let qzr = 0;
    let shown = swapped;
    for (let i = 0; i < result.waves.length; i++) {
      const wave = result.waves[i];
      const base = waveValue(rules, from, wave.cleared.length, wave.golden, i, bonusRate);
      const worth = Math.round(base * turbo);
      from += wave.cleared.length;
      gems += wave.cleared.length;
      qzr += worth;
      popup(wave, signedIn ? worth : null, worth - Math.round(base), i);
      setPopping(new Set(wave.cleared.map((cell) => shown[cell].id)));
      haptic("tap", i ? 8 : 12);
      await wait(POP_MS);
      if (gone()) break;
      shown = tilesAfter(shown, wave, board.cols, board.rows);
      setPopping(new Set());
      setTiles(shown);
      await wait(FALL_MS);
      if (gone()) break;
      // Fallen in: no drop to play again when the gem's animation changes later.
      shown = shown.map((tile) => (tile.drop || tile.fall ? { id: tile.id, gem: tile.gem } : tile));
      setTiles(shown);
    }
    if (result.shuffled && !gone()) {
      setShuffling(true);
      await wait(SHUFFLE_MS / 2);
      if (!gone()) setTiles(tilesOf(board.cells));
      await wait(SHUFFLE_MS / 2);
      setShuffling(false);
    }
    setPopping(new Set());
    setScore((s) => s + gems);
    setBestWaves((b) => Math.max(b, result.waves.length));
    // Counted once the move has played out; sent with the next chunk whatever is shown.
    if (made && unsentRef.current.includes(made)) {
      made.gems = gems;
      made.qzr = qzr;
      showUnsent();
    }
    setBusy(false);
  };

  /** The cell under a pointer, or null off the board. */
  const cellAt = (clientX: number, clientY: number): number | null => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.floor(((clientX - rect.left) / rect.width) * cols);
    const y = Math.floor(((clientY - rect.top) / rect.height) * rows);
    return x >= 0 && x < cols && y >= 0 && y < rows ? y * cols + x : null;
  };

  /** A tap picks a gem, and a tap on its neighbour swaps them; another tap picks that one instead. */
  const tap = (cell: number) => {
    const board = boardRef.current;
    if (!board) return;
    if (selected === null || selected === cell) setSelected(selected === cell ? null : cell);
    else if (neighbours(board, selected, cell)) void swapGems(selected, cell);
    else setSelected(cell);
  };

  /** Buys the next level of a bonus with the country's Qzr keys: the moves made go first, the board takes its new chances. */
  const shop = usePerkShop<Status & { board: Stored | null }>(
    "gems",
    code,
    async (res) => {
      setStatus(res);
      if (res.board && !unsentRef.current.length && boardRef.current && sameBoard(res.board.board, boardRef.current)) {
        storedRef.current = res.board;
        boardRef.current = copyBoard(res.board.board);
      } else await resync();
    },
    () => sendChunk(),
  );
  const buying = shop.buying;

  const balance = signedIn && status ? status.balance + unsent.qzr : null;
  const turbo = signedIn ? (status?.multiplier ?? 1) : 1;
  const nextPrice = Math.round(gemValue((status?.cleared ?? 0) + unsent.gems, rules.value) * turbo);
  const skin = look.skin ?? DEFAULT_SKIN;

  return (
    <>
      <SiteHeader code={code} name={name} subtitle={t("gems.subtitle")} account={<AccountMenu signIn={signIn} />} className={gameLayout.header} />

      <main className={cn(gameLayout.main, "overflow-clip select-none")}>
        {/* The board shrinks with the window's height (the frame's, in RemnaWeb), so it fits without scrolling: on
            phones under the header and the stats, on wide screens beside the blocks. */}
        <div
          className={cn(
            gameLayout.play,
            "max-lg:mx-auto max-lg:w-full max-lg:max-w-[max(16rem,calc((100dvh-13rem)*var(--ratio)))] lg:max-w-[max(24rem,calc((100dvh-10rem)*var(--ratio)))]",
          )}
          style={{ "--ratio": cols / rows } as React.CSSProperties}
        >
          {/* A frame around the board, so its rounding never cuts the corner gems. */}
          <div className="relative w-full rounded-2xl bg-card p-2 ring-1 ring-foreground/10 sm:p-3">
            <div
              ref={areaRef}
              className="relative w-full touch-none overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/5"
              style={{ aspectRatio: `${cols} / ${rows}` }}
              onPointerDown={(e) => {
                const cell = cellAt(e.clientX, e.clientY);
                if (cell === null) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                swipeRef.current = { cell, x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                const from = swipeRef.current;
                if (!from) return;
                const dx = e.clientX - from.x;
                const dy = e.clientY - from.y;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
                swipeRef.current = null;
                const x = from.cell % cols;
                const y = Math.floor(from.cell / cols);
                const [tx, ty] = Math.abs(dx) > Math.abs(dy) ? [x + Math.sign(dx), y] : [x, y + Math.sign(dy)];
                if (tx >= 0 && tx < cols && ty >= 0 && ty < rows) void swapGems(from.cell, ty * cols + tx);
              }}
              onPointerUp={() => {
                const from = swipeRef.current;
                swipeRef.current = null;
                if (from) tap(from.cell);
              }}
              onPointerCancel={() => {
                swipeRef.current = null;
              }}
            >
              {tiles?.map((tile, cell) => (
                <GemTile
                  key={tile.id}
                  tile={tile}
                  x={cell % cols}
                  y={Math.floor(cell / cols)}
                  cols={cols}
                  rows={rows}
                  skin={skin}
                  selected={selected === cell}
                  hinted={!!hint && (hint[0] === cell || hint[1] === cell)}
                  popping={popping.has(tile.id)}
                  shuffling={shuffling}
                />
              ))}
              {!tiles && hydrated && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{t("gems.loading")}</p>}
            </div>

            {/* Over the board, which clips the gems dropping in but not these. */}
            <div className="pointer-events-none absolute inset-2 sm:inset-3">
              {/* What each wave brought, the turbo's share in green, floating up from where it was cleared. */}
              <div aria-hidden className="absolute inset-0 motion-reduce:hidden">
                {popups.map((p) => (
                  <Particles key={`burst-${p.id}`} particles={p.particles} x={p.x} y={p.y} className="animate-gem-burst" />
                ))}
                {popups.map((p) => (
                  <span
                    key={p.id}
                    className={cn(
                      "absolute flex animate-gem-float flex-col items-center font-heading text-base font-bold whitespace-nowrap tabular-nums text-white [text-shadow:0_2px_8px_rgb(0_0_0/0.6)]",
                      p.golden && "text-lg text-amber-300",
                    )}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    {p.qzr !== null && (
                      <span className="flex items-baseline gap-1">
                        <Gain qzr={p.qzr} bonus={p.bonus} />
                      </span>
                    )}
                    {p.cascade > 0 && <span className="text-sm text-sky-300">{t("gems.cascade", { n: p.cascade + 1 })}</span>}
                  </span>
                ))}
              </div>
              {shuffling && (
                <p className="absolute inset-0 flex items-center justify-center font-heading text-lg font-bold text-white [text-shadow:0_2px_8px_rgb(0_0_0/0.6)]">
                  {t("gems.shuffled")}
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">{t("gems.hint")}</p>
        </div>

        <div className={gameLayout.side}>
          <div className={cn("grid grid-cols-3 gap-1.5", gameLayout.above)}>
            <StatTile label={t("gems.cleared")} value={num(score)} />
            <StatTile label={t("gems.best")} value={hydrated ? `×${num(Math.max(bestWaves, status?.best ?? 0))}` : "—"} />
            <BalanceTile balance={balance} />
          </div>

          <p className={cn("flex flex-wrap items-center justify-center gap-1 text-center text-xs text-muted-foreground lg:justify-start lg:rounded-lg lg:bg-muted/60 lg:px-3 lg:py-2", gameLayout.above)}>
            {hydrated && signedIn && (
              <>
                <QzrIcon className="size-3.5" /> {t("gems.price", { qzr: num(nextPrice) })}
              </>
            )}
            <TurboBadge boost={status?.boost ?? 0} multiplier={turbo} />
            {hydrated && !signedIn && signIn && <span>{t("gems.demo")}</span>}
          </p>

          {/* Bonuses bought with the country's Qzr keys, shared with the other games; kept in RemnaWeb, so signed in only. */}
          {signedIn && status && (
            <PerkShop status={status} count={status.cleared} shop={shop} locked={busy} />
          )}
        </div>
      </main>
    </>
  );
}

/** How long a gem falls `rows` rows, ms: longer the further, as under gravity. */
const fallMs = (rows: number) => Math.round(110 + 75 * Math.sqrt(rows));

/**
 * A gem in its cell, moved by a transform: a swap glides and settles, a fall speeds up. Drawn by Crystal in the color
 * of the skin bought and the cut of its color; a gold glow on the golden ones, a white one on the picked one.
 */
const GemTile = memo(function GemTile({
  tile,
  x,
  y,
  cols,
  rows,
  skin,
  selected,
  hinted,
  popping,
  shuffling,
}: {
  tile: Tile;
  x: number;
  y: number;
  cols: number;
  rows: number;
  skin: GemsSkin;
  selected: boolean;
  hinted: boolean;
  popping: boolean;
  shuffling: boolean;
}) {
  const kind = kindOf(tile.gem);
  const index = colorOf(tile.gem);
  const color = skin.colors[index % skin.colors.length] ?? DEFAULT_SKIN.colors[index % DEFAULT_SKIN.colors.length];
  const golden = isGolden(tile.gem);
  const glow = selected ? "#ffffff" : golden ? "#fcd34d" : skin.shine ? color : null;
  return (
    <div
      className={cn("absolute top-0 left-0 will-change-transform motion-reduce:transition-none", shuffling && "opacity-0")}
      style={{
        width: `${100 / cols}%`,
        height: `${100 / rows}%`,
        transform: `translate(${x * 100}%, ${y * 100}%)`,
        transition: tile.fall
          ? `transform ${fallMs(tile.fall)}ms cubic-bezier(0.45, 0, 0.9, 0.55), opacity 300ms`
          : `transform ${SWAP_MS}ms cubic-bezier(0.25, 0.85, 0.3, 1.08), opacity 300ms`,
      }}
    >
      <div
        className={cn(
          // Inset from the cell: a padding in percent would be of the board's width.
          "absolute inset-[6%] transition-[scale,filter] duration-150",
          popping ? "animate-gem-pop" : hinted ? "animate-gem-hint" : tile.drop && "animate-gem-drop",
          selected && "scale-[1.14]",
        )}
        style={
          {
            "--drop": tile.drop ?? 0,
            animationDuration: tile.drop && !popping && !hinted ? `${fallMs(tile.drop)}ms` : undefined,
            filter: glow ? `drop-shadow(0 0 ${selected ? 5 : 4}px ${glow})` : "drop-shadow(0 2px 2px rgb(0 0 0 / 0.45))",
          } as React.CSSProperties
        }
      >
        {/* A line gem or a star glows, coming and going: a layer's opacity, which the compositor animates alone. */}
        {kind !== PLAIN && !popping && (
          <span aria-hidden className="absolute -inset-[8%] animate-gem-charge rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.5),transparent)]" />
        )}
        <Crystal
          id={`gem${tile.id}`}
          color={color}
          shape={index}
          kind={kind === STAR ? "star" : kind === ROW ? "row" : kind === COL ? "col" : "plain"}
          golden={golden}
        />
        {/* A cleared gem flashes white as it bursts. */}
        {popping && (
          <span aria-hidden className="absolute -inset-[10%] animate-gem-flash rounded-full bg-[radial-gradient(closest-side,#fff_30%,rgb(255_255_255/0.6)_60%,transparent)]" />
        )}
      </div>
    </div>
  );
});
