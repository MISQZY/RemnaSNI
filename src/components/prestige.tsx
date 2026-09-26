"use client";

import { KeyRound } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "@/components/config-provider";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PerkDef } from "@/lib/config";
import { game, prestigeMultiplier, type GameState } from "@/lib/game";
import { freeKeys, nextKeyAt, pendingKeys, perkCost, perkLevel } from "@/lib/rules";
import { cn } from "@/lib/utils";

// Prestige: moving to a new SNI trades points and upgrades for encryption keys. Mirrors
// components/clicker/prestige.tsx of the RemnaWeb Mini App.

/** How long the move button waits for the confirming second click, ms. */
const CONFIRM_MS = 3_000;

export function Prestige({ state }: { state: GameState }) {
  const config = useConfig();
  const { t, num, fixed } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const keys = state.keys ?? 0;
  const pending = pendingKeys(config, state);
  const next = nextKeyAt(config, state);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  // An older RemnaWeb sends no prestige at all.
  if (!config.prestige.perks.length) return null;

  function move() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    const gain = game.prestige();
    if (gain) toast.success(t.prestige.done, { description: t.prestige.doneHint(num(gain), gain, fixed(prestigeMultiplier(game.getSnapshot()), 2)) });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4 text-primary" /> {t.prestige.title}
        </CardTitle>
        <CardDescription>{t.prestige.description(Math.round(config.prestige.keyBonus * 100))}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">{t.prestige.keys}</p>
            <p className="font-semibold tabular-nums">
              {num(keys)}
              {keys > 0 && <span className="font-normal text-muted-foreground"> · {t.prestige.free(num(freeKeys(config, state)))}</span>}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">{t.prestige.bonus}</p>
            <p className="font-semibold tabular-nums">×{fixed(prestigeMultiplier(state), 2)}</p>
          </div>
        </div>

        {pending < 1 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t.prestige.nextKey}</span>
              <span className="tabular-nums">
                {num(state.totalEarned)} / {num(next)}
              </span>
            </div>
            <Progress value={Math.min(100, (state.totalEarned / next) * 100)} className="h-1" />
          </div>
        )}

        <Button className="w-full" variant={confirming ? "destructive" : "default"} disabled={pending < 1} onClick={move}>
          <KeyRound />
          {pending < 1 ? t.prestige.nothing : confirming ? t.prestige.confirm : t.prestige.move(num(pending), pending)}
        </Button>

        {keys > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium">{t.prestige.perks}</p>
            {config.prestige.perks.map((p) => (
              <PerkRow key={p.id} state={state} perk={p} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerkRow({ state, perk: p }: { state: GameState; perk: PerkDef }) {
  const config = useConfig();
  const { t, num, locale } = useI18n();
  const lvl = perkLevel(state, p.id);
  const maxed = !!p.maxLevel && lvl >= p.maxLevel;
  const cost = perkCost(p, lvl);
  const canBuy = !maxed && freeKeys(config, state) >= cost;

  return (
    <div className={cn("flex items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10 transition-colors", canBuy && "bg-accent/50")}>
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          canBuy ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        <DynamicIcon name={p.icon as IconName} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{p.name[locale]}</p>
          {lvl > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {maxed ? t.upgrades.maxBadge : t.upgrades.level(lvl)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{p.description[locale]}</p>
      </div>
      <Button size="sm" className="min-w-16 tabular-nums" disabled={!canBuy} onClick={() => game.buyPerk(p.id)}>
        {maxed ? (
          t.upgrades.max
        ) : (
          <>
            <KeyRound /> {num(cost)}
          </>
        )}
      </Button>
    </div>
  );
}
