"use client";

import { Coins, Gauge, Hand, MousePointerClick, Send, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { FlagButton } from "@/components/flag-button";
import { useGame, useSync } from "@/components/game-runtime";
import { useI18n } from "@/components/i18n-provider";
import { Upgrades } from "@/components/upgrades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { critChance, critMultiplier, incomeMultiplier, perSecond, perTap } from "@/lib/game";
import { sync as syncApi, type SyncState } from "@/lib/sync";

export function Clicker({ code, name }: { code: string; name: string }) {
  const state = useGame();
  const sync = useSync();
  const crit = critChance(state);
  const mult = incomeMultiplier(state);
  const boost = sync.traffic?.boost ?? 0;
  const { t, num, fixed } = useI18n();

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="space-y-6">
        <Card size="sm" className="relative z-10">
          <CardContent className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Coins className="size-4" /> {t.clicker.points}
              </p>
              <PointsValue points={state.points} taps={state.taps} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="tabular-nums">
                  <Hand /> {num(perTap(state), true)} {t.clicker.perTap}
                </Badge>
                {boost > 0 && (
                  <Badge className="tabular-nums">
                    <Gauge /> {num(perSecond(state, boost), true)} {t.clicker.perSec}
                  </Badge>
                )}
                {crit > 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    <Sparkles /> {Math.round(crit * 100)}% ×{critMultiplier(state)}
                  </Badge>
                )}
                {mult > 1 && (
                  <Badge className="tabular-nums">
                    <TrendingUp /> ×{fixed(mult, 2)}
                  </Badge>
                )}
              </div>
            </div>
            <Stats taps={state.taps} total={state.totalEarned} />
          </CardContent>
        </Card>

        <div className="pt-6">
          <FlagButton code={code} name={name} />
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MousePointerClick className="size-4" /> {t.clicker.hint}
          </p>
        </div>
      </section>

      <aside className="space-y-3 lg:sticky lg:top-6">
        {sync.enabled && <TrafficHint name={name} sync={sync} />}
        <Upgrades state={state} />
      </aside>
    </div>
  );
}

/** Passive income ticks several times a second, so it bounces the counter at most this often. */
const PASSIVE_BUMP_MS = 1000;

/** The points counter; its changed digits bounce on every tap and, more calmly, as passive income comes in. */
function PointsValue({ points, taps }: { points: number; taps: number }) {
  const text = useI18n().num(points);
  const ref = useRef<HTMLParagraphElement>(null);
  const last = useRef({ points, taps, text, bumpedAt: 0 });

  useEffect(() => {
    const prev = last.current;
    last.current = { ...prev, points, taps, text };
    const el = ref.current;
    if (!el || points <= prev.points || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tapped = taps > prev.taps;
    const now = performance.now();
    if (!tapped && now - prev.bumpedAt < PASSIVE_BUMP_MS) return;

    const [from, to] = changedRange(prev.text, text);
    if (from > to) return;
    last.current.bumpedAt = now;

    const lift = tapped ? 0.18 : 0.1;
    Array.from(el.children)
      .slice(from, to + 1)
      .forEach((ch, i) =>
        ch.animate(
          [
            { transform: "translateY(0)" },
            { transform: `translateY(-${lift}em)`, offset: 0.35 },
            { transform: `translateY(${lift / 6}em)`, offset: 0.7 },
            { transform: "translateY(0)" },
          ],
          { duration: tapped ? 320 : 400, delay: i * 25, easing: "ease-out" },
        ),
      );
  }, [points, taps, text]);

  return (
    <p ref={ref} aria-label={text} className="text-4xl font-bold tracking-tight tabular-nums">
      {/* One span per character, keyed from the right so digits keep their node as the number grows. */}
      {[...text].map((ch, i) => (
        <span key={text.length - i} aria-hidden className="inline-block whitespace-pre">
          {ch}
        </span>
      ))}
    </p>
  );
}

/** Indices in `next` of the first and last characters that differ from `prev`, both aligned to the right. */
function changedRange(prev: string, next: string): [number, number] {
  const shift = next.length - prev.length;
  let from = next.length;
  let to = -1;
  for (let i = 0; i < next.length; i++) {
    if (next[i] === prev[i - shift]) continue;
    from = Math.min(from, i);
    to = i;
  }
  return [from, to];
}

/** A short hint about the traffic boost: sign-in prompt, how to unlock it, or the current rate. */
function TrafficHint({ name, sync: s }: { name: string; sync: SyncState }) {
  const { t, bytes } = useI18n();
  const traffic = s.traffic;

  let text: ReactNode;
  if (!s.token) text = t.traffic.signIn(name);
  else if (!traffic) text = t.traffic.checking;
  else if (traffic.boost <= 0) text = t.traffic.none(name, traffic.windowDays);
  else {
    const [before, after] = t.traffic.active(bytes(traffic.bytes), name, traffic.windowDays);
    text = (
      <>
        {before}
        <span className="font-medium text-foreground">{traffic.boost}×</span>
        {after}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      <Gauge className="size-3.5 shrink-0 text-primary" />
      <p className="flex-1">{text}</p>
      {!s.token && (
        <Button size="xs" variant="outline" onClick={() => location.assign(syncApi.signInUrl())}>
          <Send /> {t.account.signIn}
        </Button>
      )}
    </div>
  );
}

function Stats({ taps, total }: { taps: number; total: number }) {
  const { t, num } = useI18n();
  return (
    <div className="flex items-center gap-4 text-xs sm:border-l sm:pl-6">
      <div>
        <p className="text-muted-foreground">{t.clicker.totalTaps}</p>
        <p className="text-sm font-semibold tabular-nums">{num(taps)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">{t.clicker.totalEarned}</p>
        <p className="text-sm font-semibold tabular-nums">{num(total)}</p>
      </div>
    </div>
  );
}
