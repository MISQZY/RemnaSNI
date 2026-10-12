"use client";

import { useTranslations } from "next-intl";
import { Bot, Coins, Flag, Layers, Swords, Users } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, api } from "@/core/player/api";
import { useFormat } from "@/core/i18n/provider";
import { useSession } from "@/core/player/session";
import { storage } from "@/core/storage";
import { AccountMenu, SignInButton } from "@/core/ui/account-menu";
import { StatTile } from "@/core/ui/perk-shop";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { gameLayout } from "@/core/ui/game-layout";
import { SiteHeader } from "@/core/ui/site-header";
import { useGameStatus } from "@/core/player/use-game-status";
import { cn } from "@/lib/utils";
import { Board, FightLog, type TurnClock } from "./board";
import { CardsProvider } from "./card";
import { DeckEditor, PackShop } from "./deck";
import { ProofButton } from "./fairness";
import { RulesBlock, SigilsBlock } from "./guide";
import type { Action, Collection, Duel, MatchView, Offer, PackStatus, Proof, SacrificeLook, SacrificeRules, Solo } from "./rules";
import { useDuelsStream } from "./stream";

// The Sacrifice, card duels after Inscryption in the Qzyrium mines, the game of nodes RemnaWeb has picked it for. Three tabs: a fight
// against the robot (RemnaWeb's robot/*, kept there and resumed after a reload), fights against players (offers with
// a range of bets, duel/*, followed through the stream, stream.ts) and the deck (the player's cards, packs bought with Qzr).
// RemnaWeb plays every fight; this page shows it and sends the moves. Watching the lobby needs no account.

const MODE_KEY = "sacrifice-mode";
const STAKE_KEY = "sacrifice-stake";
/** The range of the last offer against players. */
const RANGE_KEY = "sacrifice-range";

type Mode = "robot" | "players" | "deck";
/** What RemnaWeb's GET /api/sni/sacrifice tells: the country's Qzr, the cards and deck, the fight against the robot. */
type Status = { balance: number; collection: Collection; packs: PackStatus; solo: Solo | null; sacrifice?: SacrificeLook };

const readMode = (): Mode => {
  const m = storage.get(MODE_KEY);
  return m === "players" || m === "deck" ? m : "robot";
};
const noSubscribe = () => () => {};

function useFailed() {
  const t = useTranslations("sacrifice");
  return (err: unknown) => toast.error(err instanceof ApiError && err.status !== 0 ? err.message : t("failed"));
}

export function SacrificeSite({ code, name, signIn, rules }: { code: string; name: string; signIn: boolean; rules: SacrificeRules }) {
  const t = useTranslations("sacrifice");
  const account = useSession();
  const failed = useFailed();
  const { status, setStatus, reload } = useGameStatus<Status>("sacrifice", code);
  const stream = useDuelsStream();
  // The tab remembered on this device, read after hydration (the server renders the first one).
  const stored = useSyncExternalStore(noSubscribe, readMode, (): Mode => "robot");
  const [chosen, setMode] = useState<Mode | null>(null);
  const mode = chosen ?? stored;
  const [busy, setBusy] = useState(false);
  // A fight against the robot that is over stays on the table until the player starts the next.
  const [finished, setFinished] = useState<Solo | null>(null);
  const [opened, setOpened] = useState<string[] | null>(null);
  const signedIn = !!account.token;
  const solo = finished ?? status?.solo ?? null;
  const duel = stream.snapshot?.duel ?? null;

  const pick = (m: string) => {
    const next = (["robot", "players", "deck"] as const).find((x) => x === m) ?? "robot";
    setMode(next);
    storage.set(MODE_KEY, next);
  };

  // The bets and the pot of a duel move the balance outside of this page's calls.
  const reloadBalance = useEffectEvent(async () => {
    const res = await api<Status>("sacrifice", { country: code }).catch(() => null);
    if (res) setStatus((s) => (s ? { ...s, balance: res.balance } : res));
  });
  const duelKey = duel ? `${duel.id}:${duel.view.phase === "over"}` : "";
  useEffect(() => {
    if (duelKey) void reloadBalance();
  }, [duelKey]);

  const call = async <T,>(path: string, body: unknown, done: (res: T) => void) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api<T>(path, { method: "POST", body, country: code });
      if (res) done(res);
    } catch (err) {
      failed(err);
      // An answer lost on the way may hide a move, a fight or a pack RemnaWeb took: its state is asked for again.
      if (!(err instanceof ApiError) || err.status === 0 || err.status >= 500) reload();
    } finally {
      setBusy(false);
    }
  };

  const soloDone = (res: { solo: Solo; balance: number }) => {
    if (res.solo.view.phase === "over") {
      setFinished(res.solo);
      setStatus((s) => (s ? { ...s, balance: res.balance, solo: null } : s));
      if (res.solo.view.winner === 0) navigator.vibrate?.(40);
    } else setStatus((s) => (s ? { ...s, balance: res.balance, solo: res.solo } : s));
  };

  const startSolo = (stake: number) => {
    setFinished(null);
    void call("sacrifice/robot/start", { stake }, soloDone);
  };
  const actSolo = (action: Action) => void call("sacrifice/robot/move", action, soloDone);
  const actDuel = (action: Action) => void call("sacrifice/duel/move", action, () => {});
  const saveDeck = (deck: string[]) =>
    void call<{ collection: Collection }>("sacrifice/deck", { deck }, (res) => {
      setStatus((s) => (s ? { ...s, collection: res.collection } : s));
      toast(t("saved"));
    });
  const buyPack = () =>
    void call<{ cards: string[]; collection: Collection; packs: PackStatus; balance: number }>("sacrifice/pack", undefined, (res) => {
      setOpened(res.cards);
      setStatus((s) => (s ? { ...s, collection: res.collection, packs: res.packs, balance: res.balance } : s));
    });
  const tradePack = () =>
    void call<{ cards: string[]; collection: Collection }>("sacrifice/trade", undefined, (res) => {
      setOpened(res.cards);
      setStatus((s) => (s ? { ...s, collection: res.collection } : s));
    });

  return (
    <CardsProvider cards={rules.cards}>
      <SiteHeader code={code} name={name} subtitle={t("subtitle")} account={<AccountMenu signIn={signIn} />} className={gameLayout.header} />

      <main className={gameLayout.main}>
        <div className={cn(gameLayout.play, "lg:max-w-[34rem]")}>
          <Tabs value={mode} onValueChange={pick}>
            <TabsList className="w-full">
              <TabsTrigger value="robot">
                <Bot /> {t("modes.robot")}
              </TabsTrigger>
              <TabsTrigger value="players">
                <Users /> {t("modes.players")}
                {(duel || stream.snapshot?.offer) && <span className="size-1.5 rounded-full bg-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger value="deck">
                <Layers /> {t("modes.deck")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "robot" &&
            (solo ? (
              <Fight rules={rules} id={`solo:${solo.id}`} view={solo.view} proof={solo.proof} them={t("robot")} looks={{ me: status?.sacrifice }} busy={busy} onAct={actSolo} />
            ) : (
              <Intro text={t("robotIntro", { payout: rules.robotPayout })} />
            ))}
          {mode === "players" &&
            (duel ? (
              <DuelFight rules={rules} duel={duel} mine={status?.sacrifice} serverNow={stream.serverNow} busy={busy} onAct={actDuel} />
            ) : (
              <Intro text={!stream.snapshot ? t(stream.full ? "full" : stream.online ? "connecting" : "offline") : stream.snapshot.offer ? t("waitingOpponent") : t("playersIntro")} />
            ))}
          {mode === "deck" &&
            (status ? <DeckEditor key={status.collection.deck.join()} rules={rules} collection={status.collection} busy={busy} onSave={saveDeck} /> : <Intro text={t("deckSignIn")} />)}
        </div>

        <div className={gameLayout.side}>
          {!signedIn ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4 text-center ring-1 ring-foreground/10">
              <p className="text-sm text-muted-foreground">{t("signIn")}</p>
              {signIn && <SignInButton />}
            </div>
          ) : mode === "robot" ? (
            <SoloPanel rules={rules} status={status} solo={solo} busy={busy} onStart={startSolo} onConcede={() => actSolo({ type: "concede" })} onNext={() => setFinished(null)} />
          ) : mode === "players" ? (
            <QueuePanel rules={rules} code={code} balance={status?.balance} stream={stream} busy={busy} onConcede={() => actDuel({ type: "concede" })} />
          ) : (
            <PackShop rules={rules} balance={status?.balance} packs={status?.packs} busy={busy} opened={opened} onBuy={buyPack} collection={status?.collection} onTrade={tradePack} />
          )}
          {mode === "robot" && solo && <FightLog view={solo.view} them={t("robot")} />}
          {mode === "players" && duel && <FightLog view={duel.view} them={duel.names[1] ?? t("anonymous")} />}
          <RulesBlock rules={rules} />
          <SigilsBlock />
        </div>
      </main>
    </CardsProvider>
  );
}

function Intro({ text }: { text: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl bg-neutral-950 bg-[radial-gradient(ellipse_at_50%_40%,rgb(46_224_106/0.1),transparent_70%)] p-6 text-center text-sm text-neutral-300 ring-1 ring-white/10">
      <QzrIcon className="size-16" />
      <p className="max-w-xs">{text}</p>
    </div>
  );
}

/** The board (with the fight's result over it once it is over and replayed) and its proof under it. */
function Fight({
  rules,
  id,
  view,
  proof,
  them,
  looks,
  busy,
  clock,
  onAct,
}: {
  rules: SacrificeRules;
  id: string;
  view: MatchView;
  proof: Proof;
  them: string;
  looks: { me?: SacrificeLook | null; them?: SacrificeLook | null };
  busy: boolean;
  clock?: TurnClock | null;
  onAct: (a: Action) => void;
}) {
  const over = view.phase === "over";
  return (
    <div className="flex flex-col gap-1">
      <Board key={id} rules={rules} view={view} them={them} busy={busy || over} clock={clock} looks={looks} onAct={onAct} />
      <div className="flex justify-end">
        <ProofButton id={id} proof={proof} />
      </div>
    </div>
  );
}

/** A fight against a player: the looks as they wore them when the fight began, one's own as worn now if none came. */
function DuelFight({
  rules,
  duel,
  mine,
  serverNow,
  busy,
  onAct,
}: {
  rules: SacrificeRules;
  duel: Duel;
  mine: SacrificeLook | undefined;
  serverNow: () => number;
  busy: boolean;
  onAct: (a: Action) => void;
}) {
  const t = useTranslations("sacrifice");
  const deadline = duel.view.phase === "over" ? null : duel.deadline;
  // Counted down within the board's side bar (board.tsx), so its ticks re-render only the seconds.
  const clock = useMemo<TurnClock>(() => ({ deadline, serverNow }), [deadline, serverNow]);
  return (
    <Fight
      rules={rules}
      id={`duel:${duel.id}`}
      view={duel.view}
      proof={duel.proof}
      them={duel.names[1] ?? t("anonymous")}
      looks={{ me: duel.looks?.[0] ?? mine, them: duel.looks?.[1] }}
      busy={busy}
      clock={clock}
      onAct={onAct}
    />
  );
}

function Balance({ balance }: { balance: number | undefined }) {
  const t = useTranslations("sacrifice");
  const { num } = useFormat();
  return (
    <StatTile
      label={t("balance")}
      value={
        balance !== undefined ? (
          <span className="inline-flex items-center gap-1">
            <QzrIcon className="size-3.5" /> {num(balance)}
          </span>
        ) : (
          "—"
        )
      }
    />
  );
}

/** The last bet against the robot on this device, 100 at first. */
const readStake = () => Math.max(1, Math.floor(Number(storage.get(STAKE_KEY)) || 100));

/** Against the robot: the bet and the start, the fight's bet and the surrender, the result and the next fight. */
function SoloPanel({
  rules,
  status,
  solo,
  busy,
  onStart,
  onConcede,
  onNext,
}: {
  rules: SacrificeRules;
  status: Status | null;
  solo: Solo | null;
  busy: boolean;
  onStart: (stake: number) => void;
  onConcede: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("sacrifice");
  const { num } = useFormat();
  const [stake, setStake] = useState(readStake);
  const balance = status?.balance;
  const valid = Number.isInteger(stake) && stake >= 1 && (balance === undefined || stake <= balance);
  /** The bet as typed, until the field is left. */
  const [draft, setDraft] = useState<string | null>(null);
  const setBet = (n: number) => {
    const v = Math.max(1, Math.floor(n) || 1);
    setStake(v);
    storage.set(STAKE_KEY, String(v));
  };

  if (solo) {
    const over = solo.view.phase === "over";
    return (
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
        <div className="grid grid-cols-2 gap-1.5">
          <Balance balance={balance} />
          <StatTile label={over ? t("payout") : t("stake")} value={num(over ? (solo.payout ?? 0) : solo.stake)} />
        </div>
        {over ? (
          <Button size="lg" className="w-full" onClick={onNext}>
            <Swords /> {t("nextFight")}
          </Button>
        ) : (
          <>
            <p className="px-1 text-xs text-muted-foreground">{t("winPays", { qzr: num(Math.floor(solo.stake * rules.robotPayout)) })}</p>
            <Button variant="outline" disabled={busy} onClick={onConcede}>
              <Flag /> {t("concede")}
            </Button>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="grid grid-cols-2 gap-1.5">
        <Balance balance={balance} />
        <StatTile label={t("deckTitle")} value={t("cardsN", { n: status?.collection.deck.length ?? 0 })} />
      </div>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
          <Coins className="size-3.5" /> {t("stake")}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={draft ?? stake}
          // Typed freely (cleared, a digit at a time), set within the limits once the field is left.
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== null) setBet(Number(draft) || 0);
            setDraft(null);
          }}
          className={cn(
            "h-10 w-full min-w-0 rounded-xl border bg-background px-3 text-base font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            !valid && "border-destructive",
          )}
        />
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            ["half", () => setBet(stake / 2)],
            ["twice", () => setBet(stake * 2)],
            ["max", () => setBet(balance ?? stake)],
          ] as const
        ).map(([key, onClick]) => (
          <Button key={key} variant="secondary" size="sm" onClick={onClick}>
            {t(key)}
          </Button>
        ))}
      </div>
      <Button size="lg" className="h-12 w-full text-base tabular-nums" disabled={busy || !valid || !status} onClick={() => onStart(stake)}>
        <Swords /> {t("fight", { qzr: num(stake) })}
      </Button>
      <p className="px-1 text-xs text-muted-foreground">{t("winPays", { qzr: num(Math.floor(stake * rules.robotPayout)) })}</p>
    </section>
  );
}

/** The range of the last offer on this device, 100–1 000 at first. */
const readRange = (): [number, number] => {
  const [a, b] = (storage.get(RANGE_KEY) ?? "").split("-").map(Number);
  return Number.isInteger(a) && Number.isInteger(b) && a >= 1 && a <= b ? [a, b] : [100, 1_000];
};

/**
 * Against players: the player's offer (a range of bets, put up, changed or taken down), the offers of the others, any of
 * which can be taken, and during a fight its pot and the surrender.
 */
function QueuePanel({
  rules,
  code,
  balance,
  stream,
  busy,
  onConcede,
}: {
  rules: SacrificeRules;
  code: string;
  balance: number | undefined;
  stream: ReturnType<typeof useDuelsStream>;
  busy: boolean;
  onConcede: () => void;
}) {
  const t = useTranslations("sacrifice");
  const { num } = useFormat();
  const failed = useFailed();
  const [working, setWorking] = useState(false);
  const [range, setRange] = useState(readRange);
  const snap = stream.snapshot;
  const duel = snap?.duel ?? null;
  const fighting = !!duel && duel.view.phase !== "over";
  const mine = snap?.offer ?? null;
  const others = (snap?.lobby.offers ?? []).filter((o) => o.id !== mine?.id);
  const [lo, hi] = range;
  const valid = Number.isInteger(lo) && Number.isInteger(hi) && lo >= 1 && lo <= hi && (balance === undefined || lo <= balance);
  const changed = !mine || mine.min !== lo || mine.max !== hi;

  const set = (next: [number, number]) => {
    const v: [number, number] = [Math.max(0, Math.floor(next[0]) || 0), Math.max(0, Math.floor(next[1]) || 0)];
    setRange(v);
    storage.set(RANGE_KEY, `${v[0]}-${v[1]}`);
  };

  const post = async (path: string, body?: unknown) => {
    setWorking(true);
    try {
      await api(path, { method: "POST", body, country: code });
    } catch (err) {
      failed(err);
    } finally {
      setWorking(false);
    }
  };
  const put = () => void post("sacrifice/duel/join", { min: lo, max: hi });
  /** Takes `o`: an offer of the same range, as far as the balance goes, pointed at it. */
  const take = (o: Offer) => void post("sacrifice/duel/join", { min: o.min, max: Math.min(o.max, Math.floor(balance ?? o.max)), take: o.id });
  const presets: [number, number][] = [
    [100, 1_000],
    [1_000, 5_000],
    [5_000, 20_000],
  ];
  // As high as the balance goes, from the bottom set.
  const all = Math.max(lo, Math.floor(balance ?? hi));
  const input =
    "h-10 w-full min-w-0 rounded-xl border bg-background px-3 text-base font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  if (duel) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
        <div className="grid grid-cols-2 gap-1.5">
          <Balance balance={balance} />
          <StatTile label={t(fighting ? "pot" : "payout")} value={num(fighting ? Math.floor(duel.stake * 2 * (1 - rules.fee)) : (duel.payout ?? 0))} />
        </div>
        {fighting ? (
          <Button variant="outline" disabled={busy} onClick={onConcede}>
            <Flag /> {t("concede")}
          </Button>
        ) : (
          <Button size="lg" onClick={() => void post("sacrifice/duel/leave")} disabled={working}>
            <Swords /> {t("nextFight")}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="grid grid-cols-2 gap-1.5">
        <Balance balance={balance} />
        <StatTile label={t("yourOffer")} value={mine ? t("range", { min: num(mine.min), max: num(mine.max) }) : "—"} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["from", "to"] as const).map((key, i) => (
          <label key={key} className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
              <Coins className="size-3.5" /> {t(key)}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={range[i]}
              onChange={(e) => set(i === 0 ? [Number(e.target.value), hi] : [lo, Number(e.target.value)])}
              className={cn(input, !valid && "border-destructive")}
            />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {presets.map(([a, b]) => (
          <Button key={a} variant="secondary" size="sm" className="px-1 text-[0.6875rem] tabular-nums" onClick={() => set([a, b])}>
            {num(a)}–{num(b)}
          </Button>
        ))}
        <Button variant="secondary" size="sm" className="px-1 text-[0.6875rem]" onClick={() => set([lo, all])}>
          {t("upToAll")}
        </Button>
      </div>
      <div className="flex gap-1.5">
        <Button size="lg" className="flex-1" disabled={working || !valid || !changed} onClick={put}>
          <Swords /> {t(mine ? "updateOffer" : "putOffer")}
        </Button>
        {mine && (
          <Button size="lg" variant="outline" disabled={working} onClick={() => void post("sacrifice/duel/leave")}>
            {t("takeDown")}
          </Button>
        )}
      </div>
      {mine && <p className="px-1 text-xs text-muted-foreground">{t("offerWaiting")}</p>}

      <div className="flex flex-col gap-1">
        <p className="flex items-center justify-between px-1 text-sm font-semibold">
          {t("offers")}
          <span className="text-xs font-normal text-muted-foreground">{t("fightingNow", { n: snap?.lobby.fighting ?? 0 })}</span>
        </p>
        {others.length ? (
          <ul className="flex flex-col gap-1">
            {others.map((o) => (
              <li key={o.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <span className="min-w-0 flex-1 truncate text-sm">{o.name ?? t("anonymous")}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums">
                  <QzrIcon className="size-3" /> {t("range", { min: num(o.min), max: num(o.max) })}
                </span>
                <Button size="sm" variant="secondary" className="w-20" disabled={working || (balance !== undefined && balance < o.min)} onClick={() => take(o)}>
                  {t("take")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 py-2 text-center text-xs text-muted-foreground">{t("noOffers")}</p>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {t("duelHelp", { fee: `${Math.round(rules.fee * 100)}%`, turn: Math.round(rules.turnMs / 1000), missed: rules.maxMissed })}
      </p>
    </section>
  );
}
