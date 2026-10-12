"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Cog, Layers, Scale as ScaleIcon, ScrollText, Sparkle, Swords, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChargeIcon } from "./art";
import { CardBack, CardFace, CardInfo, useCards } from "./card";
import { autoSacrifices, chargeOf, strikePreview, type Action, type CardDef, type Creature, type GameEvent, type MatchView, type SacrificeRules } from "./rules";

// The duel's table: the other's side above (their hand face down), the scale, this player's side and hand below.
// Playing takes two taps: a card in the hand, then a highlighted space. The sacrifices are picked by themselves, the
// cheapest first (sparks), and marked on the board; tapping a unit of one's own puts the card in its place instead.
// Above each unit of one's own: what it will do on the attack. RemnaWeb checks every move.

type Props = {
  rules: SacrificeRules;
  view: MatchView;
  /** Who is across: a player's name or the robot. */
  them: string;
  busy: boolean;
  /** Seconds left in the turn against a player. */
  left?: number | null;
  onAct: (action: Action) => void;
};

export function Board({ rules, view, them, busy, left, onAct }: Props) {
  const t = useTranslations("sacrifice");
  const { cards, def } = useCards();
  const [picked, setPicked] = useState<number | null>(null);
  const mine = view.active === view.you && view.phase !== "over";
  const canPlay = mine && !busy;

  // A new state (a move made, a turn passed) drops the pick.
  const key = `${view.turn}:${view.me.hand.map((h) => h.uid).join()}`;
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setPicked(null);
  }

  const card = canPlay && picked !== null ? view.me.hand.find((h) => h.uid === picked) : undefined;
  const pickedDef = card ? def(card.card) : undefined;
  const board = view.me.board;

  /** What playing the picked card into `lane` sacrifices, or null when it cannot go there. */
  const sacrificesFor = (lane: number): number[] | null => {
    if (!pickedDef || pickedDef.bones > view.me.bones) return null;
    const lanes = autoSacrifices(cards, board, pickedDef.blood, lane);
    if (!lanes) return null;
    return !board[lane] || lanes.includes(lane) ? lanes : null;
  };
  const targets = pickedDef ? board.map((_, l) => sacrificesFor(l) !== null) : board.map(() => false);
  // The sacrifices marked on the board: those for an empty space, the default.
  const preview = pickedDef ? (autoSacrifices(cards, board, pickedDef.blood, null) ?? []) : [];

  const playable = (id: string) => {
    const d = def(id);
    if (!d || d.bones > view.me.bones) return false;
    return board.some((_, l) => {
      const lanes = autoSacrifices(cards, board, d.blood, l);
      return lanes && (!board[l] || lanes.includes(l));
    });
  };

  const pickLane = (lane: number) => {
    const sacrifices = sacrificesFor(lane);
    if (picked === null || !sacrifices) return;
    onAct({ type: "play", hand: picked, lane, sacrifices });
  };

  const charge = chargeOnBoard(cards, board);
  let hint = "";
  if (view.phase !== "over") {
    if (!mine) hint = t("hint.theirTurn", { name: them });
    else if (!pickedDef) hint = view.me.hand.some((h) => playable(h.card)) ? t("hint.play") : t("hint.attack");
    else if (!targets.some(Boolean))
      hint = pickedDef.bones > view.me.bones ? t("hint.noBones", { need: pickedDef.bones, have: view.me.bones }) : t("hint.noSacrifice", { need: pickedDef.blood, have: charge });
    else hint = pickedDef.blood > 0 && board.some(Boolean) ? t("hint.laneSacrifice") : t("hint.lane");
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-neutral-950 bg-[radial-gradient(ellipse_at_50%_50%,rgb(46_224_106/0.08),transparent_70%)] p-2.5 text-neutral-100 ring-1 ring-white/10 sm:p-3">
      <SideBar
        name={them}
        charge={chargeOnBoard(cards, view.them.board)}
        bones={view.them.bones}
        deck={view.them.deck}
        sparks={view.them.sparks}
        active={view.active !== view.you && view.phase !== "over"}
      />
      <div className="flex h-8 items-center justify-center gap-2" title={t("theirHandHelp")}>
        <span className="text-[11px] text-neutral-500">{t("theirHand", { n: view.them.hand })}</span>
        {view.them.hand > 0 && (
          <div className="flex">
            {Array.from({ length: Math.min(view.them.hand, 8) }, (_, i) => (
              <div key={i} className={cn("w-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]", i > 0 && "-ml-2")} style={{ transform: `rotate(${(i - (Math.min(view.them.hand, 8) - 1) / 2) * 5}deg)` }}>
                <CardBack />
              </div>
            ))}
          </div>
        )}
      </div>

      <Lanes rules={rules} board={view.them.board} />
      <Scale rules={rules} scale={view.scale} />
      <Previews view={view} />
      <Lanes rules={rules} board={board} targets={targets} marked={preview} onPick={pickLane} />

      <SideBar name={t("you")} charge={charge} bones={view.me.bones} deck={view.me.deck} sparks={view.me.sparks} active={mine} left={mine ? left : null} />

      {pickedDef && <CardInfo card={pickedDef.id} />}
      {hint && <p className="text-center text-xs text-neutral-400">{hint}</p>}

      {mine && (
        <div className="flex gap-1.5">
          {pickedDef && (
            <Button variant="outline" className="border-white/15 bg-transparent text-neutral-200 hover:bg-white/10" onClick={() => setPicked(null)}>
              <X /> {t("cancel")}
            </Button>
          )}
          <Button size="lg" className="h-11 flex-1 font-heading text-base uppercase" disabled={busy} onClick={() => onAct({ type: "bell" })}>
            <Swords /> {t("attack")}
          </Button>
        </div>
      )}

      <ScrollArea scrollbars="horizontal" className="-mx-1">
        <div className="flex gap-1.5 px-1 pt-2 pb-2">
          {view.me.hand.map((h) => (
            <div key={h.uid} className="w-[4.6rem] shrink-0 sm:w-[5.25rem]">
              <CardFace
                card={h.card}
                selected={picked === h.uid && canPlay}
                dim={canPlay && !playable(h.card)}
                onClick={canPlay ? () => setPicked(picked === h.uid ? null : h.uid) : undefined}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/** The crystals a side's board would give as sacrifices: one a unit, three for Triple Charge. */
const chargeOnBoard = (cards: Map<string, CardDef>, board: (Creature | null)[]) => board.reduce((sum, c) => sum + (c ? chargeOf(cards, c.card) : 0), 0);

/**
 * A side's name and what it has: crystals (what its units on the board would give as sacrifices, as card costs count
 * them), debris, cards left in the deck and sparks left for the fight. Each with its name in words, past a phone's width.
 */
function SideBar({
  name,
  charge,
  bones,
  deck,
  sparks,
  active,
  left,
}: {
  name: string;
  charge: number;
  bones: number;
  deck: number;
  sparks: number;
  active: boolean;
  left?: number | null;
}) {
  const t = useTranslations("sacrifice");
  const stats = [
    { key: "charge", icon: <ChargeIcon className="size-3.5" />, n: charge, accent: "text-emerald-300" },
    { key: "bones", icon: <Cog className="size-3.5 text-neutral-400" />, n: bones, accent: "text-neutral-100" },
    { key: "deck", icon: <Layers className="size-3.5 text-neutral-400" />, n: deck, accent: "text-neutral-100" },
    { key: "sparks", icon: <Sparkle className="size-3.5 text-emerald-200" />, n: sparks, accent: "text-neutral-100" },
  ] as const;
  return (
    <div className="flex items-center gap-1.5 px-1 text-xs text-neutral-400">
      <span className={cn("min-w-0 flex-1 truncate font-heading font-semibold text-neutral-200", active && "text-primary")}>
        {active && <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-primary align-middle" />}
        {name}
        {left != null && <span className="ml-1.5 font-sans font-normal text-neutral-400 tabular-nums">{t("seconds", { s: left })}</span>}
      </span>
      {stats.map((s) => (
        <span key={s.key} title={t(`stat.${s.key}`)} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-0.5 ring-1 ring-white/10">
          {s.icon}
          <span className={cn("font-semibold tabular-nums", s.accent)}>{s.n}</span>
          <span className="hidden text-[10px] sm:inline">{t(`statShort.${s.key}`)}</span>
        </span>
      ))}
    </div>
  );
}

function Lanes({
  rules,
  board,
  targets,
  marked = [],
  onPick,
}: {
  rules: SacrificeRules;
  board: (Creature | null)[];
  targets?: boolean[];
  marked?: number[];
  onPick?: (lane: number) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${rules.lanes}, minmax(0, 1fr))` }}>
      {board.map((c, lane) => {
        const target = !!targets?.[lane];
        return (
          <div
            key={lane}
            className={cn(
              "relative aspect-[3/4] rounded-[10px] border border-dashed border-white/10 bg-white/[0.03] transition-colors",
              target && "border-2 border-primary/80 bg-primary/10",
            )}
          >
            {c && (
              <div key={c.uid} className="h-full animate-in duration-300 fade-in zoom-in-90">
                <CardFace card={c.card} power={c.power} health={c.health} marked={marked.includes(lane)} onClick={target ? () => onPick?.(lane) : undefined} />
              </div>
            )}
            {target && !c && <button type="button" aria-label={String(lane + 1)} onClick={() => onPick?.(lane)} className="absolute inset-0 animate-pulse rounded-[10px] bg-primary/10" />}
          </div>
        );
      })}
    </div>
  );
}

/** What each unit of this player's will do on the attack. */
function Previews({ view }: { view: MatchView }) {
  const t = useTranslations("sacrifice");
  const { cards } = useCards();
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${view.me.board.length}, minmax(0, 1fr))` }}>
      {view.me.board.map((_, lane) => {
        const p = strikePreview(cards, view.me.board, view.them.board, lane);
        return (
          <span key={lane} className="flex h-4 items-center justify-center gap-1 text-[10px] font-semibold tabular-nums">
            {p.scale > 0 && (
              <span className="inline-flex items-center gap-0.5 text-primary" title={t("toScale", { n: p.scale })}>
                <ScaleIcon className="size-3" /> {p.scale}
              </span>
            )}
            {p.hit > 0 && (
              <span className="inline-flex items-center gap-0.5 text-neutral-300" title={t("toUnit", { n: p.hit })}>
                <Swords className="size-3" /> {p.hit}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** The scale: this player's lead in damage, from −scaleToWin (lost) to +scaleToWin (won). */
function Scale({ rules, scale }: { rules: SacrificeRules; scale: number }) {
  const t = useTranslations("sacrifice");
  const max = rules.scaleToWin;
  const ticks = Array.from({ length: max * 2 + 1 }, (_, i) => i - max);
  return (
    <div className="flex flex-col items-center gap-1 py-0.5">
      <div className="flex w-full items-center gap-0.5">
        {ticks.map((n) => (
          <span
            key={n}
            className={cn(
              "h-2 flex-1 rounded-full bg-white/10 transition-colors",
              n === 0 && "h-3 bg-white/30",
              scale > 0 && n > 0 && n <= scale && "bg-primary shadow-[0_0_6px] shadow-primary/60",
              scale < 0 && n < 0 && n >= scale && "bg-rose-500 shadow-[0_0_6px] shadow-rose-500/60",
            )}
          />
        ))}
      </div>
      <p className={cn("font-heading text-[11px] font-semibold tracking-wide uppercase tabular-nums", scale > 0 ? "text-primary" : scale < 0 ? "text-rose-400" : "text-neutral-500")}>
        {scale === 0 ? t("scaleEven") : scale > 0 ? t("scaleUp", { n: Math.min(scale, max), max }) : t("scaleDown", { n: Math.min(-scale, max), max })}
      </p>
    </div>
  );
}

/** The whole fight in words, newest turn first: folds away, scrolls within its height. */
export function FightLog({ view, them }: { view: MatchView; them: string }) {
  const t = useTranslations("sacrifice");
  const { nameOf } = useCards();
  const [open, setOpen] = useState(true);
  const who = (side: number) => (side === view.you ? t("you") : them);
  const line = (e: GameEvent): string | null => {
    switch (e.t) {
      case "turn":
        return t("log.turn", { who: who(e.side), n: e.turn });
      case "draw":
        return e.side === view.you ? t(e.spark ? "log.spark" : "log.draw") : null;
      case "play":
        return t("log.play", { who: who(e.side), card: nameOf(e.card), lane: e.lane + 1 });
      case "sacrifice":
        return t(e.survived ? "log.survived" : "log.sacrifice", { who: who(e.side), card: nameOf(e.card) });
      case "evolve":
        return t("log.evolve", { card: nameOf(e.card) });
      case "attack":
        return t(e.direct ? "log.direct" : "log.hit", { card: nameOf(e.card), n: e.damage, lane: e.target + 1 });
      case "die":
        return t(e.back ? "log.back" : "log.die", { card: nameOf(e.card) });
      case "end":
        return e.winner === "draw" ? t("log.tie") : t("log.won", { who: who(e.winner) });
    }
  };
  // Turns newest first, what happened within each in its order.
  const turns: GameEvent[][] = [];
  for (const e of view.log) {
    if (e.t === "turn" || !turns.length) turns.push([]);
    turns.at(-1)!.push(e);
  }
  const lines = turns
    .reverse()
    .flat()
    .map((e, i) => ({ e, i, text: line(e) }))
    .filter((l) => l.text);
  return (
    <section className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-1.5 rounded-md px-1 text-left text-sm font-semibold">
        <ScrollText className="size-4 text-muted-foreground" /> {t("logTitle")}
        <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">{t("logTurn", { n: view.turn })}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ScrollArea className="mt-1.5" viewportClassName="h-auto max-h-72 overscroll-contain">
          <ul className="flex flex-col gap-0.5 px-1 pr-3 text-xs text-muted-foreground">
            {lines.map(({ e, i, text }) => (
              <li key={`${view.log.length}:${i}`} className={cn(e.t === "turn" && "mt-1 font-semibold text-foreground first:mt-0", e.t === "end" && "font-semibold text-foreground")}>
                {text}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}
