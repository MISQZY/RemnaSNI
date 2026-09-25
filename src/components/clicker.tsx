"use client";

import { Coins, Gauge, Hand, MousePointerClick, Send, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
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
              <p className="text-4xl font-bold tracking-tight tabular-nums">{formatNumber(state.points)}</p>
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
