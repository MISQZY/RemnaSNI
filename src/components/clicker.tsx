"use client";

import { Coins, Gauge, Hand, MousePointerClick, Send, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { FlagButton } from "@/components/flag-button";
import { useCompanionChoice } from "@/components/pet-shop";
import { PetSprite } from "@/components/pet-sprite";
import { useGame, useSync } from "@/components/game-runtime";
import { Upgrades } from "@/components/upgrades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBytes, formatNumber } from "@/lib/format";
import { critChance, critMultiplier, incomeMultiplier, perSecond, perTap } from "@/lib/game";
import { pickCompanion } from "@/lib/pets";
import { sync as syncApi, type SyncState } from "@/lib/sync";

export function Clicker({ code, name }: { code: string; name: string }) {
  const state = useGame();
  const sync = useSync();
  const crit = critChance(state);
  const mult = incomeMultiplier(state);
  const boost = sync.traffic?.boost ?? 0;
  const pet = pickCompanion(sync.pets, useCompanionChoice());

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="space-y-6">
        <Card size="sm" className="relative z-10">
          <CardContent className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Coins className="size-4" /> Points
              </p>
              <PointsValue points={state.points} taps={state.taps} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="tabular-nums">
                  <Hand /> {formatNumber(perTap(state), true)} / tap
                </Badge>
                {boost > 0 && (
                  <Badge className="tabular-nums">
                    <Gauge /> {formatNumber(perSecond(state, boost), true)} / sec
                  </Badge>
                )}
                {crit > 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    <Sparkles /> {Math.round(crit * 100)}% ×{critMultiplier(state)}
                  </Badge>
                )}
                {mult > 1 && (
                  <Badge className="tabular-nums">
                    <TrendingUp /> ×{mult.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>
            <Stats taps={state.taps} total={state.totalEarned} />
          </CardContent>
        </Card>

        <div>
          <div className="relative mx-auto w-full max-w-md">
            <FlagButton code={code} name={name} />
            {/* The companion sits on the flag's corner and jumps at every tap. */}
            {pet && <PetSprite pet={pet} size={72} pulse={state.taps} className="absolute -right-2 -bottom-6 z-10 sm:-right-6" />}
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MousePointerClick className="size-4" /> Tap the flag to earn points
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
  const text = formatNumber(points);
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
  const t = s.traffic;

  let text: ReactNode;
  if (!s.token) text = <>Sign in with Telegram and your traffic through {name} will tap the flag for you.</>;
  else if (!t) text = "Checking your traffic…";
  else if (t.boost <= 0)
    text = (
      <>
        No traffic through {name} in the last {t.windowDays} days. 10 GB, 100 GB and 1 TB unlock 1, 2 and 3 auto-taps
        per second.
      </>
    );
  else
    text = (
      <>
        {formatBytes(t.bytes)} through {name} in {t.windowDays} days taps the flag{" "}
        <span className="font-medium text-foreground">{t.boost}×</span> per second, at half speed while the page is
        closed (up to 8 h).
      </>
    );

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      <Gauge className="size-3.5 shrink-0 text-primary" />
      <p className="flex-1">{text}</p>
      {!s.token && (
        <Button size="xs" variant="outline" onClick={() => location.assign(syncApi.signInUrl())}>
          <Send /> Sign in
        </Button>
      )}
    </div>
  );
}

function Stats({ taps, total }: { taps: number; total: number }) {
  return (
    <div className="flex items-center gap-4 text-xs sm:border-l sm:pl-6">
      <div>
        <p className="text-muted-foreground">Total taps</p>
        <p className="text-sm font-semibold tabular-nums">{formatNumber(taps)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Total earned</p>
        <p className="text-sm font-semibold tabular-nums">{formatNumber(total)}</p>
      </div>
    </div>
  );
}
