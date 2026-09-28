"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { human, type HumanCheck } from "@/lib/human";
import { cn } from "@/lib/utils";

/**
 * The human check over the flag: find the named emoji among six. Taps on the flag do not count until
 * it is passed; after three misses checks pause for a few minutes. Mirrors the RemnaWeb Mini App's.
 */
export function HumanCheckOverlay() {
  const t = useTranslations();
  const [check, setCheck] = useState<HumanCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missed, setMissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  /** Bumped to fetch a new check. */
  const [attempt, setAttempt] = useState(0);
  const reload = () => setAttempt((a) => a + 1);

  useEffect(() => {
    let alive = true;
    human.get().then(
      (c) => {
        if (!alive) return;
        setCheck(c);
        setError(null);
      },
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  // After too many misses: count down, then fetch a new check.
  const blockedUntil = check && "blockedUntil" in check ? new Date(check.blockedUntil).getTime() : 0;
  useEffect(() => {
    if (!blockedUntil) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= blockedUntil) setAttempt((a) => a + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [blockedUntil]);

  async function pick(index: number, trusted: boolean) {
    if (!check || !("token" in check) || busy || !trusted) return;
    setBusy(true);
    try {
      const res = await human.answer(check.token, index);
      if (res.passed) return;
      setMissed(true);
      if (res.blockedUntil) setCheck({ blockedUntil: res.blockedUntil });
      else reload();
    } catch (e) {
      // Most likely the check expired: show the error and take a fresh one.
      setError((e as Error).message);
      setCheck(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  const left = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/95 p-4 text-center backdrop-blur-sm">
      <ShieldCheck className="size-7 text-primary" />
      {check && "token" in check ? (
        <>
          <p className="text-sm font-semibold">
            {t("human.title")} <span className="align-middle text-2xl">{check.target}</span>
          </p>
          {missed && <p className="text-xs text-destructive">{t("human.missed")}</p>}
          <div className="grid grid-cols-3 gap-2">
            {check.options.map((emoji, i) => (
              <button
                key={`${check.token.slice(-8)}-${i}`}
                type="button"
                disabled={busy}
                onClick={(e) => void pick(i, e.isTrusted)}
                className={cn("grid size-14 place-items-center rounded-xl bg-muted text-3xl transition-transform active:scale-90", busy && "opacity-60")}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("human.notCounted")}</p>
        </>
      ) : check ? (
        <p className="text-sm tabular-nums">{t("human.blocked", { time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` })}</p>
      ) : error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={reload}>
            {t("human.retry")}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("human.loading")}</p>
      )}
    </div>
  );
}
