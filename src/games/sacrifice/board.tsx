"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Cog, FastForward, Layers, Redo2, Scale as ScaleIcon, ScrollText, Sparkle, Swords, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { playBurst } from "@/core/cosmetics/burst";
import { lookStyle } from "@/core/cosmetics/look";
import { cn } from "@/lib/utils";
import { ChargeIcon } from "./art";
import { CardBack, CardFace, CardInfo, useCards } from "./card";
import { playFx, type FxLabels } from "./fx";
import { replay, type Boards, type Step } from "./replay";
import { useSecondsLeft } from "@/core/player/stream";
import {
  autoSacrifices,
  chargeOf,
  strikePreview,
  type Action,
  type CardDef,
  type Creature,
  type GameEvent,
  type MatchView,
  type SacrificeLook,
  type SacrificeRules,
  type ScaleLook,
} from "./rules";

// The duel's table: the other's side above (their hand face down), the scale, this player's side and hand below.
// Playing takes two taps: a card in the hand, then a highlighted space. The sacrifices are picked by themselves, the
// cheapest first (sparks), and marked on the board; tapping a unit of one's own puts the card in its place instead.
// Above each unit of one's own: what it will do on the attack. RemnaWeb checks every move. The players' cosmetics
// dress it: this player's table, balance and win, either side's card backs, foil on their units and strikes.

/** A turn's deadline and RemnaWeb's clock to count it down by. */
export type TurnClock = { deadline: number | null; serverNow: () => number };

type Props = {
  rules: SacrificeRules;
  view: MatchView;
  /** Who is across: a player's name or the robot. */
  them: string;
  busy: boolean;
  /** The turn's deadline by RemnaWeb's clock, against a player. */
  clock?: TurnClock | null;
  /** The cosmetics of this player and of the one across (none for the robot, or from an older RemnaWeb). */
  looks?: { me?: SacrificeLook | null; them?: SacrificeLook | null };
  onAct: (action: Action) => void;
};

/**
 * The replay of what happened since the state shown last (replay.ts): its beats one after another, the effects of each
 * played on the board under `root` (fx.ts). A state coming in while one plays queues its beats after. Skipped by those
 * who ask the system for less motion.
 */
function useReplay(view: MatchView, root: RefObject<HTMLDivElement | null>, looks: Props["looks"]) {
  const t = useTranslations("sacrifice");
  const { cards } = useCards();
  const [base, setBase] = useState(view);
  const [play, setPlay] = useState<{ steps: Step[]; at: number; upTo: number } | null>(null);
  const running = useRef<Animation[]>([]);

  if (base !== view) {
    setBase(view);
    const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = calm ? [] : replay(cards, base, view);
    // Keyed by how far the log is played, so a render run twice queues the beats once.
    const upTo = view.log.length;
    if (steps.length) setPlay((p) => (p && p.upTo >= upTo ? p : p ? { steps: [...p.steps, ...steps], at: p.at, upTo } : { steps, at: 0, upTo }));
  }

  const step = play ? play.steps[play.at] : null;
  const labels: FxLabels = {
    airborne: t("sigils.airborne.name"),
    intercept: t("sigils.intercept.name"),
    rift: t("sigils.rift.name"),
    spikes: t("sigils.spikes.name"),
    resilient: t("sigils.resilient.name"),
    growth: t("sigils.growth.name"),
    rebuild: t("sigils.rebuild.name"),
    sacrifice: t("fxSacrifice"),
  };
  const playStep = useEffectEvent((s: Step) => {
    if (root.current) running.current.push(...playFx(root.current, s.fx, labels, { me: looks?.me?.strike, them: looks?.them?.strike }));
  });

  useLayoutEffect(() => {
    if (step) playStep(step);
  }, [step]);

  useEffect(() => {
    if (!play) {
      // Once over, nothing lingers: the board shows RemnaWeb's state.
      for (const a of running.current.splice(0)) a.cancel();
      return;
    }
    const id = setTimeout(() => setPlay((p) => (!p ? p : p.at + 1 >= p.steps.length ? null : { ...p, at: p.at + 1 })), play.steps[play.at].ms);
    return () => clearTimeout(id);
  }, [play]);

  useEffect(() => () => running.current.forEach((a) => a.cancel()), []);

  return { step, skip: () => setPlay(null) };
}

export function Board({ rules, view, them, busy, clock, looks, onAct }: Props) {
  const t = useTranslations("sacrifice");
  const { cards, def } = useCards();
  const root = useRef<HTMLDivElement>(null);
  const { step, skip } = useReplay(view, root, looks);
  const replaying = !!step;
  const shown: Boards = step ?? { me: view.me.board, them: view.them.board, scale: view.scale };
  const [picked, setPicked] = useState<number | null>(null);
  const over = view.phase === "over";
  const mine = view.active === view.you && !over;
  // The fight's first turn has no attack (RemnaWeb's engine): the other side has not played yet.
  const quiet = view.turn === 1;
  const canPlay = mine && !busy && !replaying;

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

  // The win's cosmetic burst, once the fight is seen ending and replayed: not for a fight already over when opened.
  const won = over && !replaying && view.winner === view.you;
  const overAtFirst = useRef(over);
  const victory = looks?.me?.victory;
  const celebrate = useEffectEvent(() => {
    const box = root.current;
    if (box && victory) playBurst(box, box.clientWidth / 2, box.clientHeight / 3, victory);
  });
  useEffect(() => {
    if (won && !overAtFirst.current) celebrate();
  }, [won]);

  const charge = chargeOnBoard(cards, board);
  let hint = "";
  if (replaying) hint = t("hint.replay", { name: step.fx.who === "me" ? t("you") : them });
  else if (!over) {
    if (!mine) hint = t("hint.theirTurn", { name: them });
    else if (!pickedDef) hint = quiet ? t("hint.firstTurn") : view.me.hand.some((h) => playable(h.card)) ? t("hint.play") : t("hint.attack");
    else if (!targets.some(Boolean))
      hint = pickedDef.bones > view.me.bones ? t("hint.noBones", { need: pickedDef.bones, have: view.me.bones }) : t("hint.noSacrifice", { need: pickedDef.blood, have: charge });
    else hint = pickedDef.blood > 0 && board.some(Boolean) ? t("hint.laneSacrifice") : t("hint.lane");
  }

  return (
    <div className="flex flex-col gap-1">
      {over && !replaying && (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-center text-sm font-semibold animate-in fade-in",
            view.winner === view.you ? "bg-emerald-600 text-white" : view.winner === "draw" ? "bg-muted" : "bg-rose-700 text-white",
          )}
        >
          {view.winner === view.you ? t("won") : view.winner === "draw" ? t("drawn") : t("lost")}
        </p>
      )}
    <div
      ref={root}
      className="relative flex flex-col gap-2 rounded-2xl bg-neutral-950 bg-[radial-gradient(ellipse_at_50%_50%,rgb(46_224_106/0.08),transparent_70%)] p-2.5 text-neutral-100 ring-1 ring-white/10 sm:p-3"
      style={lookStyle(looks?.me?.table ?? undefined)}
    >
      <SideBar
        name={them}
        charge={chargeOnBoard(cards, view.them.board)}
        bones={view.them.bones}
        deck={view.them.deck}
        sparks={view.them.sparks}
        active={replaying ? step.fx.who === "them" : view.active !== view.you && !over}
      />
      <div className="flex h-8 items-center justify-center gap-2" title={t("theirHandHelp")}>
        <span className="text-[0.6875rem] text-neutral-500">{t("theirHand", { n: view.them.hand })}</span>
        {view.them.hand > 0 && (
          <div className="flex">
            {Array.from({ length: Math.min(view.them.hand, 8) }, (_, i) => (
              <div key={i} className={cn("w-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]", i > 0 && "-ml-2")} style={{ transform: `rotate(${(i - (Math.min(view.them.hand, 8) - 1) / 2) * 5}deg)` }}>
                <CardBack back={looks?.them?.back} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Lanes rules={rules} who="them" board={shown.them} foil={looks?.them?.foil} />
      <Scale rules={rules} scale={shown.scale} skin={looks?.me?.scale} />
      <Previews mine={shown.me} theirs={shown.them} hidden={replaying || quiet} />
      <Lanes rules={rules} who="me" board={shown.me} foil={looks?.me?.foil} targets={targets} marked={preview} onPick={pickLane} />

      <SideBar
        name={t("you")}
        charge={charge}
        bones={view.me.bones}
        deck={view.me.deck}
        sparks={view.me.sparks}
        active={replaying ? step.fx.who === "me" : mine}
        clock={mine ? clock : null}
      />

      {hint && <p className={cn("text-center text-xs text-neutral-400", replaying && "text-neutral-300")}>{hint}</p>}

      {replaying ? (
        <Button variant="outline" className="h-11 border-white/15 bg-transparent text-neutral-200 hover:bg-white/10" onClick={skip}>
          <FastForward /> {t("skip")}
        </Button>
      ) : mine && (
        <div className="flex gap-1.5">
          <Button size="lg" className="h-11 flex-1 font-heading text-base uppercase" disabled={busy} onClick={() => onAct({ type: "bell" })}>
            {quiet ? <><Redo2 /> {t("endTurn")}</> : <><Swords /> {t("attack")}</>}
          </Button>
          {pickedDef && (
            <Button
              variant="outline"
              size="sm"
              className="h-11 shrink-0 border-white/15 bg-transparent px-3 text-xs text-neutral-300 hover:bg-white/10"
              title={t("cancel")}
              onClick={() => setPicked(null)}
            >
              <X /> {t("cancel")}
            </Button>
          )}
        </div>
      )}

      {pickedDef && !replaying && <CardInfo card={pickedDef.id} />}

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
    </div>
  );
}

/** The crystals a side's board would give as sacrifices: one a unit, three for Triple Charge. */
const chargeOnBoard = (cards: Map<string, CardDef>, board: (Creature | null)[]) => board.reduce((sum, c) => sum + (c ? chargeOf(cards, c.card) : 0), 0);

/**
 * A side's name and what it has: crystals (what its units on the board would give as sacrifices, as card costs count
 * them), debris, cards left in the deck and sparks left for the fight. Each with its name in words, past a phone's width.
 */
/**
 * The seconds left in the turn: ticking on its own, four times a second, so the rest of the board does not re-render
 * with it.
 */
function TurnSeconds({ clock }: { clock: TurnClock }) {
  const t = useTranslations("sacrifice");
  const left = useSecondsLeft(clock.deadline, clock.serverNow);
  return left != null && <span className="ml-1.5 font-sans font-normal text-neutral-400 tabular-nums">{t("seconds", { s: left })}</span>;
}

function SideBar({
  name,
  charge,
  bones,
  deck,
  sparks,
  active,
  clock,
}: {
  name: string;
  charge: number;
  bones: number;
  deck: number;
  sparks: number;
  active: boolean;
  /** The turn's deadline by RemnaWeb's clock, against a player. */
  clock?: TurnClock | null;
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
        {clock && <TurnSeconds clock={clock} />}
      </span>
      {stats.map((s) => (
        <span key={s.key} title={t(`stat.${s.key}`)} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-0.5 ring-1 ring-white/10">
          {s.icon}
          <span className={cn("font-semibold tabular-nums", s.accent)}>{s.n}</span>
          <span className="hidden text-[0.625rem] sm:inline">{t(`statShort.${s.key}`)}</span>
        </span>
      ))}
    </div>
  );
}

function Lanes({
  rules,
  who,
  board,
  foil,
  targets,
  marked = [],
  onPick,
}: {
  rules: SacrificeRules;
  /** Whose side: marks the spaces for the replay's effects (fx.ts). */
  who: "me" | "them";
  board: (Creature | null)[];
  /** The cosmetic foil of the side's owner, on their units. */
  foil?: string[] | null;
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
            data-slot={`${who}:${lane}`}
            className={cn(
              "relative aspect-[3/4] rounded-[10px] border border-dashed border-white/10 bg-white/[0.03] transition-colors",
              target && "border-2 border-primary/80 bg-primary/10",
            )}
          >
            {c && (
              <div key={c.uid} data-unit className="relative h-full animate-in duration-300 fade-in zoom-in-90">
                <CardFace card={c.card} power={c.power} health={c.health} foil={foil} marked={marked.includes(lane)} onClick={target ? () => onPick?.(lane) : undefined} />
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
function Previews({ mine, theirs, hidden }: { mine: (Creature | null)[]; theirs: (Creature | null)[]; hidden: boolean }) {
  const t = useTranslations("sacrifice");
  const { cards } = useCards();
  return (
    <div className={cn("grid gap-1.5 transition-opacity", hidden && "opacity-0")} style={{ gridTemplateColumns: `repeat(${mine.length}, minmax(0, 1fr))` }}>
      {mine.map((_, lane) => {
        const p = strikePreview(cards, mine, theirs, lane);
        return (
          <span key={lane} className="flex h-4 items-center justify-center gap-1 text-[0.625rem] font-semibold tabular-nums">
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
function Scale({ rules, scale, skin }: { rules: SacrificeRules; scale: number; skin?: ScaleLook | null }) {
  const t = useTranslations("sacrifice");
  const max = rules.scaleToWin;
  const ticks = Array.from({ length: max * 2 + 1 }, (_, i) => i - max);
  return (
    <div data-scale className="flex flex-col items-center gap-1 py-0.5">
      <div className="flex w-full items-center gap-0.5">
        {ticks.map((n) => (
          <span
            key={n}
            className={cn(
              "h-2 flex-1 rounded-full bg-white/10 transition-colors",
              n === 0 && "mx-0.5 h-4 w-0.5 flex-none rounded-full bg-white/40",
              scale > 0 && n > 0 && n <= scale && "bg-primary shadow-[0_0_6px] shadow-primary/60",
              scale < 0 && n < 0 && n >= scale && "bg-rose-500 shadow-[0_0_6px] shadow-rose-500/60",
            )}
          />
        ))}
      </div>
      <Balance lead={Math.max(-max, Math.min(max, scale))} max={max} skin={skin} />
      <p className={cn("font-heading text-[0.6875rem] font-semibold tracking-wide uppercase tabular-nums", scale > 0 ? "text-primary" : scale < 0 ? "text-rose-400" : "text-neutral-500")}>
        {scale === 0 ? t("scaleEven") : scale > 0 ? t("scaleUp", { n: Math.min(scale, max), max }) : t("scaleDown", { n: Math.min(-scale, max), max })}
      </p>
    </div>
  );
}

const SWING = "transform 0.9s cubic-bezier(.34,1.56,.64,1)";

/**
 * The scale drawn as a balance: the beam tips toward the side ahead, as far as its lead goes toward winning, and its
 * pan holds a crystal for each point of the lead: a small mark, the words are under it. This player's pan is the green
 * one on the right, as the lead on the line above, the other's the red one.
 * The beam and the pans swing with a slight overshoot.
 */
function Balance({ lead, max, skin }: { lead: number; max: number; skin?: ScaleLook | null }) {
  const angle = (lead / max) * 14;
  const drop = Math.sin((angle * Math.PI) / 180) * 22;
  const swing = (transform: string) => ({ transform, transformBox: "view-box" as const, transformOrigin: "60px 10px", transition: SWING });
  const pan = (cx: number, dy: number, weights: number, color: string) => (
    <g style={swing(`translate(0px, ${dy}px)`)}>
      <path d={`M${cx} 10 L${cx - 7} 22 M${cx} 10 L${cx + 7} 22`} stroke={skin?.pans ?? "rgb(255 255 255 / 0.3)"} strokeWidth="0.8" />
      {Array.from({ length: weights }, (_, i) => {
        const x = cx + (i - (weights - 1) / 2) * 2.5;
        return <polygon key={i} points={`${x},16 ${x + 1.2},18.6 ${x + 1.2},21.6 ${x},22.4 ${x - 1.2},21.6 ${x - 1.2},18.6`} fill={color} stroke="rgb(0 0 0 / 0.4)" strokeWidth="0.4" />;
      })}
      <path d={`M${cx - 8} 22 Q${cx} 28 ${cx + 8} 22 Z`} fill={skin ? `${skin.pans}33` : "rgb(255 255 255 / 0.08)"} stroke={weights ? color : (skin?.pans ?? "rgb(255 255 255 / 0.35)")} strokeWidth="1.2" strokeLinejoin="round" />
    </g>
  );
  return (
    <svg viewBox="28 0 64 36" className="h-auto w-[3.5rem]" aria-hidden>
      <path d="M60 12 L60 33 M55 34 L65 34" stroke={skin?.beam ?? "rgb(255 255 255 / 0.35)"} strokeOpacity={skin ? 0.8 : 1} strokeWidth="1.4" strokeLinecap="round" />
      {pan(38, -drop, Math.max(0, -lead), "#fb7185")}
      {pan(82, drop, Math.max(0, lead), "#2ee06a")}
      <g style={swing(`rotate(${angle}deg)`)}>
        <line x1="38" y1="10" x2="82" y2="10" stroke={skin?.beam ?? "rgb(255 255 255 / 0.55)"} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="38" cy="10" r="1.3" fill="rgb(255 255 255 / 0.6)" />
        <circle cx="82" cy="10" r="1.3" fill="rgb(255 255 255 / 0.6)" />
      </g>
      <polygon points="60,4 63,9 60,15 57,9" fill={skin?.pivot ?? "#2ee06a"} stroke="#c4ffd8" strokeWidth="0.6" strokeOpacity="0.6" />
    </svg>
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
