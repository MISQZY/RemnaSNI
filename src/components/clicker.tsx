"use client";

import { Coins, Gauge, Hand, MousePointerClick, RotateCcw, Send, Sparkles, TrendingUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FlagButton } from "@/components/flag-button";
import { useGame, useSync } from "@/components/game-runtime";
import { Upgrades } from "@/components/upgrades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatBytes, formatNumber } from "@/lib/format";
import { critChance, critMultiplier, game, incomeMultiplier, perSecond, perTap } from "@/lib/game";
import { sync as syncApi, type SyncState } from "@/lib/sync";
import { cn } from "@/lib/utils";

export function Clicker({ code, name }: { code: string; name: string }) {
  const state = useGame();
  const sync = useSync();
  const crit = critChance(state);
  const mult = incomeMultiplier(state);
  const boost = sync.traffic?.boost ?? 0;

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section className="space-y-6">
        <Card>
          <CardContent className="items-center gap-1 text-center">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Coins className="size-4" /> Points
            </p>
            <p className="text-5xl font-bold tracking-tight tabular-nums">{formatNumber(state.points)}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
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
          </CardContent>
        </Card>

        <div className="py-2">
          <FlagButton code={code} name={name} />
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MousePointerClick className="size-4" /> Tap the flag to earn points
          </p>
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-6">
        {sync.enabled && <TrafficCard name={name} sync={sync} perSec={perSecond(state, boost)} />}
        <Upgrades state={state} />
        <Stats taps={state.taps} total={state.totalEarned} />
      </aside>
    </div>
  );
}

/** Explains the traffic boost: sign-in prompt, how to unlock it, or the current rate. */
function TrafficCard({ name, sync: s, perSec }: { name: string; sync: SyncState; perSec: number }) {
  const t = s.traffic;
  const active = !!t && t.boost > 0;

  let body: ReactNode;
  if (!s.token) {
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          Sign in with Telegram and your traffic through {name} will tap the flag for you.
        </p>
        <Button size="sm" className="w-fit" onClick={() => location.assign(syncApi.signInUrl())}>
          <Send /> Sign in
        </Button>
      </>
    );
  } else if (!t) {
    body = <p className="text-sm text-muted-foreground">Checking your traffic…</p>;
  } else if (!active) {
    body = (
      <p className="text-sm text-muted-foreground">
        No traffic through {name} in the last {t.windowDays} days yet. Traffic unlocks auto-taps: 1 GB → ×1,
        7 GB → ×3, 1 TB → ×10 taps per second.
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          {formatBytes(t.bytes)} through {name} in the last {t.windowDays} days — the flag is tapped{" "}
          <span className="font-medium text-foreground">{t.boost}×</span> per second for you, even while this page is
          closed (up to 8 hours).
        </p>
        <p className="text-sm font-semibold tabular-nums">+{formatNumber(perSec, true)} points / sec</p>
      </>
    );
  }

  return (
    <Card size="sm" className={cn(active && "ring-primary/40")}>
      <CardContent className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            <Gauge className="size-4 text-primary" /> Traffic boost
          </p>
          {active && <Badge className="tabular-nums">×{t.boost}</Badge>}
        </div>
        {body}
      </CardContent>
    </Card>
  );
}

function Stats({ taps, total }: { taps: number; total: number }) {
  const [confirming, setConfirming] = useState(false);
  const signedIn = !!useSync().token;

  return (
    <Card size="sm">
      <CardContent className="gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Total taps</p>
            <p className="font-semibold tabular-nums">{formatNumber(taps)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total earned</p>
            <p className="font-semibold tabular-nums">{formatNumber(total)}</p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {signedIn ? "Progress is synced to your Telegram account." : "Progress is saved in this browser."}
          </p>
          <Button
            size="xs"
            variant={confirming ? "destructive" : "ghost"}
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 3000);
                return;
              }
              setConfirming(false);
              game.reset();
              toast("Progress reset");
            }}
          >
            <RotateCcw /> {confirming ? "Sure?" : "Reset"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
