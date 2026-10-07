"use client";

import { useTranslations } from "next-intl";
import { Bot, Coins, HandCoins, Undo2, Users } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/core/api";
import { useFormat } from "@/core/i18n/provider";
import { useSession } from "@/core/session";
import { storage } from "@/core/storage";
import { AccountMenu, SignInButton } from "@/core/ui/account-menu";
import { StatTile } from "@/core/ui/perk-shop";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { gameLayout } from "@/core/ui/game-layout";
import { SiteHeader } from "@/core/ui/site-header";
import { useGameStatus } from "@/core/use-game-status";
import { cn } from "@/lib/utils";
import { CrashChart, TIER_CHIP, useMultiplier } from "./chart";
import { CurrentRoundProof, RoundProof } from "./fairness";
import { multiplierAt, payoutOf, tierOf, type CrashBet, type CrashRules, type CrashSnapshot, type MyBet } from "./rules";
import { useCrashStream, useFrameNow } from "./stream";

// The crash, the game of nodes RemnaWeb has picked it for: a bet of Qzr before the round, then the multiplier grows
// until it crashes at a moment nobody knows but RemnaWeb; cash out before that and the bet comes back multiplied,
// or it burns. RemnaWeb runs the rounds, one for everyone on every site that runs the crash, and this page follows
// them through the stream (stream.ts); bets and cash-outs go to RemnaWeb (POST /api/sni/crash/bet and /cashout),
// whose clock decides whether a cash-out came in time; a bet may be taken back until the start (/cancel). Every
// round is provably fair: its seed's hash from the start, the seed once crashed, checked here (fairness.tsx).
// Watching needs no account, betting does.

/** The last bet and auto cash-out on this device, to bet the same again. */
const AMOUNT_KEY = "crash-amount";
const AUTO_KEY = "crash-auto";

/** The country's Qzr balance and the player's bet in the round on (RemnaWeb's GET /api/sni/crash). */
type Status = { balance: number; bet: MyBet | null };
/** What a bet or a cash-out brings back. */
type BetResult = { bet: MyBet; balance: number };

/** The player's bet in the round shown, with what the stream knows of it: its own cash-out may have come there. */
function myBetIn(snapshot: CrashSnapshot | null, bet: MyBet | null | undefined): MyBet | null {
  const round = snapshot?.round;
  if (!bet || !round || bet.roundId !== round.id) return null;
  const live = snapshot.bets.find((b) => b.id === bet.id);
  return live?.cashout != null && bet.cashout == null ? { ...bet, cashout: live.cashout, payout: live.payout } : bet;
}

export function CrashSite({ code, name, signIn, rules }: { code: string; name: string; signIn: boolean; rules: CrashRules }) {
  const t = useTranslations();
  const { num } = useFormat();
  const account = useSession();
  const { status, setStatus } = useGameStatus<Status>("crash", code);
  const { snapshot, online, full, serverNow } = useCrashStream();
  const [busy, setBusy] = useState(false);

  const signedIn = !!account.token;
  const mine = myBetIn(snapshot, status?.bet);

  // A cash-out of its own, seen in the stream: the balance takes it until RemnaWeb's next answer.
  const autoPaid = mine?.cashout != null && status?.bet?.cashout == null ? mine : null;
  useEffect(() => {
    if (!autoPaid) return;
    setStatus((s) =>
      s?.bet && s.bet.id === autoPaid.id && s.bet.cashout == null
        ? { balance: s.balance + autoPaid.payout, bet: { ...s.bet, cashout: autoPaid.cashout, payout: autoPaid.payout } }
        : s,
    );
  }, [autoPaid, setStatus]);

  const placeBet = async (amount: number, auto: number | null) => {
    setBusy(true);
    try {
      const res = await api<BetResult>("crash/bet", { method: "POST", body: { amount, auto }, country: code });
      if (res) setStatus(res);
    } catch (err) {
      toast.error(err instanceof ApiError && err.status !== 0 ? err.message : t("crash.failed"));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await api<{ bet: null; balance: number }>("crash/cancel", { method: "POST", country: code });
      if (res) setStatus(res);
    } catch (err) {
      toast.error(err instanceof ApiError && err.status !== 0 ? err.message : t("crash.failed"));
    } finally {
      setBusy(false);
    }
  };

  const cashOut = async () => {
    setBusy(true);
    try {
      const res = await api<BetResult>("crash/cashout", { method: "POST", country: code });
      if (res) {
        setStatus(res);
        navigator.vibrate?.(25);
      }
    } catch (err) {
      toast.error(err instanceof ApiError && err.status !== 0 ? err.message : t("crash.failed"));
    } finally {
      setBusy(false);
    }
  };

  const total = snapshot?.bets.reduce((sum, b) => sum + b.amount, 0) ?? 0;

  return (
    <>
      <SiteHeader code={code} name={name} subtitle={t("crash.subtitle")} account={<AccountMenu signIn={signIn} />} className={gameLayout.header} />

      <main className={gameLayout.main}>
        {/* On wide screens the chart shrinks with the window height, so it fits without scrolling. */}
        <div className={cn(gameLayout.play, "lg:max-w-[max(24rem,calc((100dvh-12rem)*4/3))]")}>
          <History rules={rules} history={snapshot?.history ?? []} />

          <div className="flex flex-col gap-1">
            <CrashChart rules={rules} snapshot={snapshot} serverNow={serverNow} online={online} full={full} />
            <CurrentRoundProof rules={rules} round={snapshot?.round ?? null} />
          </div>
        </div>

        <div className={gameLayout.side}>
          {signedIn ? (
            <BetPanel rules={rules} snapshot={snapshot} serverNow={serverNow} mine={mine} balance={status?.balance} busy={busy} onBet={placeBet} onCancel={cancel} onCashOut={cashOut} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4 text-center ring-1 ring-foreground/10">
              <p className="text-sm text-muted-foreground">{t("crash.signInToBet")}</p>
              {signIn && <SignInButton />}
            </div>
          )}

          <section className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Users className="size-4 text-muted-foreground" /> {t("crash.players")}
              </p>
              {!!snapshot?.bets.length && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  {t("crash.total", { n: snapshot.bets.length })} · <QzrIcon className="size-3" /> {num(total)}
                </p>
              )}
            </div>
            <Bets bets={snapshot?.bets ?? []} crashed={snapshot?.round?.crash != null} rules={rules} mineId={mine?.id ?? null} />
          </section>
        </div>
      </main>
    </>
  );
}

/** The last rounds, newest first, each in the color of where it crashed; a tap shows its seed and the check. */
function History({ rules, history }: { rules: CrashRules; history: CrashSnapshot["history"] }) {
  const t = useTranslations("crash");
  const mult = useMultiplier();
  return (
    <div aria-label={t("history")} className="flex h-7 gap-1.5 overflow-hidden">
      {history.map((r, i) => (
        <RoundProof key={r.id} rules={rules} round={r}>
          <button
            type="button"
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 text-xs font-semibold tabular-nums outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50",
              TIER_CHIP[tierOf(rules, r.crash)],
              i === 0 && "animate-in fade-in slide-in-from-left-2",
            )}
          >
            {mult(r.crash)}
          </button>
        </RoundProof>
      ))}
    </div>
  );
}

type PanelProps = {
  rules: CrashRules;
  snapshot: CrashSnapshot | null;
  serverNow: () => number;
  mine: MyBet | null;
  balance: number | undefined;
  busy: boolean;
  onBet: (amount: number, auto: number | null) => void;
  onCancel: () => void;
  onCashOut: () => void;
};

const readAmount = (min: number) => Math.max(min, Math.floor(Number(storage.get(AMOUNT_KEY)) || min));
const readAuto = () => storage.get(AUTO_KEY) ?? "";

/** The bet: its amount, an optional cash-out of its own, and the one button that bets or cashes out. */
function BetPanel({ rules, snapshot, serverNow, mine, balance, busy, onBet, onCancel, onCashOut }: PanelProps) {
  const t = useTranslations("crash");
  const { num } = useFormat();
  const mult = useMultiplier();
  const [amount, setAmount] = useState(() => readAmount(rules.minBet));
  const [auto, setAuto] = useState(readAuto);

  const round = snapshot?.round ?? null;
  const crashed = round?.crash != null;
  const flying = !!round && !crashed && snapshot?.phase === "flying";
  const canBet = !!round && snapshot?.phase === "betting" && !mine;
  const canCashOut = flying && !!mine && mine.cashout == null;
  // Taken back until the start, by RemnaWeb's clock as well.
  const canCancel = !!round && snapshot?.phase === "betting" && !!mine && mine.cashout == null;
  // The payout on the button follows the multiplier while the bet can be cashed out.
  const now = useFrameNow(serverNow, canCashOut);
  const current = round && canCashOut ? multiplierAt(rules, now - round.startAt) : 100;

  const autoValue = auto.trim() ? Math.round(Number(auto.replace(",", ".")) * 100) : null;
  const autoValid = autoValue === null || (Number.isFinite(autoValue) && autoValue >= rules.minAuto && autoValue <= rules.maxCrash);
  const amountValid = Number.isInteger(amount) && amount >= rules.minBet && (balance === undefined || amount <= balance);

  const setBet = (n: number) => {
    const v = Math.max(rules.minBet, Math.floor(n));
    setAmount(v);
    storage.set(AMOUNT_KEY, String(v));
  };

  const act = () => {
    if (busy) return;
    if (canCashOut) onCashOut();
    else if (canCancel) onCancel();
    else if (canBet && amountValid && autoValid) {
      storage.set(AUTO_KEY, auto.trim() || null);
      onBet(amount, autoValue);
    }
  };
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.code !== "Space" || e.repeat || (e.target as HTMLElement | null)?.closest("input, button")) return;
    e.preventDefault();
    act();
  });
  useEffect(() => {
    const down = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  let label: React.ReactNode;
  if (canCashOut) label = t("cashOut", { qzr: num(payoutOf(mine!.amount, current)), x: mult(current) });
  else if (mine?.cashout != null) label = t("cashedOut", { x: mult(mine.cashout), qzr: num(mine.payout) });
  else if (mine && crashed) label = t("lost");
  else if (canCancel) label = t("cancel", { qzr: num(mine!.amount) });
  else if (mine) label = t("placed");
  else if (canBet) label = t("place", { qzr: num(amount) });
  else label = t("nextRound");

  // The fields are the next bet: set while a round flies, they leave the bet in it as it is. Only a bet waiting for
  // the start holds them, as they show it.
  const locked = !!mine && snapshot?.phase === "betting";
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="grid grid-cols-2 gap-1.5">
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
        <StatTile label={t("auto")} value={mine ? (mine.auto ? mult(mine.auto) : t("autoOff")) : autoValue && autoValid ? mult(autoValue) : t("autoOff")} />
      </div>

      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <Coins className="size-3.5" /> {t("bet")}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={rules.minBet}
            step={1}
            value={amount}
            disabled={locked}
            onChange={(e) => setBet(Number(e.target.value) || 0)}
            className={cn(
              "h-10 rounded-xl border bg-background px-3 text-base font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              !amountValid && !locked && "border-destructive",
            )}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <Bot className="size-3.5" /> {t("auto")}
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder={t("autoOff")}
            value={auto}
            disabled={locked}
            onChange={(e) => setAuto(e.target.value.replace(/[^\d.,]/g, "").slice(0, 8))}
            className={cn(
              "h-10 rounded-xl border bg-background px-3 text-base font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              !autoValid && !locked && "border-destructive",
            )}
          />
        </label>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {(
          [
            ["min", () => setBet(rules.minBet)],
            ["half", () => setBet(amount / 2)],
            ["double", () => setBet(amount * 2)],
            ["max", () => setBet(balance ?? amount)],
          ] as const
        ).map(([key, onClick]) => (
          <Button key={key} variant="secondary" size="sm" disabled={locked} onClick={onClick}>
            {t(key)}
          </Button>
        ))}
      </div>

      <Button
        size="lg"
        className={cn("h-12 w-full text-base tabular-nums", canCashOut && "bg-emerald-600 text-white hover:bg-emerald-600/90")}
        variant={canCancel ? "outline" : mine?.cashout != null || (mine && crashed) || (!canBet && !canCashOut) ? "secondary" : "default"}
        disabled={busy || !(canCashOut || canCancel || (canBet && amountValid && autoValid))}
        onClick={act}
      >
        {canCashOut ? <HandCoins /> : canCancel ? <Undo2 /> : <QzrIcon className="size-5" />}
        {label}
      </Button>

      <p className="hidden text-center text-xs text-muted-foreground sm:block">{t("hint", { min: num(rules.minBet) })}</p>
    </section>
  );
}

/** The round's bets: who, how much, and the multiplier and win of those who cashed out (burnt once it crashed). */
function Bets({ bets, crashed, rules, mineId }: { bets: CrashBet[]; crashed: boolean; rules: CrashRules; mineId: number | null }) {
  const t = useTranslations("crash");
  const { num } = useFormat();
  const mult = useMultiplier();
  if (!bets.length) return <p className="px-1 py-3 text-center text-xs text-muted-foreground">{t("noBets")}</p>;
  return (
    <ul className="flex flex-col">
      {bets.map((b) => (
        <li key={b.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", b.id === mineId && "bg-primary/8")}>
          <span className="min-w-0 flex-1 truncate">{b.name ?? t("anonymous")}</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
            <QzrIcon className="size-3" /> {num(b.amount)}
          </span>
          <span className="w-28 text-right tabular-nums">
            {b.cashout != null ? (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("rounded-full px-1.5 text-xs font-semibold", TIER_CHIP[tierOf(rules, b.cashout)])}>{mult(b.cashout)}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{num(b.payout)}</span>
              </span>
            ) : crashed ? (
              <span className="text-destructive line-through decoration-1">−{num(b.amount)}</span>
            ) : (
              <span className="text-muted-foreground">…</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
