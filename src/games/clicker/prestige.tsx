"use client";

import { useTranslations } from "next-intl";
import { ChipIcon } from "@/core/ui/chip-icon";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { GameIcon } from "@/games/clicker/game-icon";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "@/games/clicker/config-provider";
import { useFormat } from "@/core/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GameConfig, PerkDef } from "@/games/clicker/config";
import { game, prestigeMultiplier, type GameState } from "@/games/clicker/game";
import { freeKeys, keysFor, nextKeyAt, pendingKeys, perkCost, perkLevel } from "@/games/clicker/rules";
import { cn } from "@/lib/utils";

// Prestige: moving to a new place trades points and upgrades for keys. Mirrors
// components/clicker/prestige.tsx of the RemnaWeb Mini App.

/** How long the move button waits for the confirming second click, ms. */
const CONFIRM_MS = 3_000;

/** Whether a move or a perk is available now, for the dot on the tab. */
export const prestigeReady = (config: GameConfig, s: GameState) =>
  pendingKeys(config, s) >= 1 ||
  config.prestige.perks.some((p) => !(p.maxLevel && perkLevel(s, p.id) >= p.maxLevel) && freeKeys(config, s) >= perkCost(p, perkLevel(s, p.id)));

/** The move to a new place and the perks bought with its keys; its title is the tab it sits in. */
export function Prestige({ state }: { state: GameState }) {
  const config = useConfig();
  const t = useTranslations();
  const { num, fixed } = useFormat();
  const [confirming, setConfirming] = useState(false);
  const keys = state.keys ?? 0;
  const pending = pendingKeys(config, state);
  const next = nextKeyAt(config, state);
  // The bar runs from the key reached last to the next one, also while keys wait to be taken.
  const reached = keysFor(config, state);
  const prev = reached > 0 ? next * (reached / (reached + 1)) ** 3 : 0;
  const toNext = Math.min(100, Math.max(0, ((state.totalEarned - prev) / (next - prev)) * 100));

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
    if (gain) toast.success(t("prestige.done"), { description: t("prestige.doneHint", { keys: num(gain), n: gain, mult: fixed(prestigeMultiplier(game.getSnapshot()), 2) }) });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{t("prestige.description", { percent: Math.round(config.prestige.keyBonus * 100) })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">{t("prestige.keys")}</p>
            <p className="flex flex-wrap items-center gap-x-1 font-semibold tabular-nums">
              <ChipIcon className="size-4" /> {num(keys)}
              {keys > 0 && <span className="font-normal text-muted-foreground"> · {t("prestige.free", { n: num(freeKeys(config, state)) })}</span>}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">{t("prestige.bonus")}</p>
            <p className="font-semibold tabular-nums">×{fixed(prestigeMultiplier(state), 2)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("prestige.nextKey")}</span>
            <span className="flex items-center gap-1 tabular-nums">
              <QzrIcon className="size-3.5" /> {num(state.totalEarned)} / {num(next)}
            </span>
          </div>
          <Progress value={toNext} className="h-1" />
          </div>

        <Button className="w-full" variant={confirming ? "destructive" : "default"} disabled={pending < 1} onClick={move}>
          {pending >= 1 && <ChipIcon mono />}
          {pending < 1 ? t("prestige.nothing") : confirming ? t("prestige.confirm") : t("prestige.move", { keys: num(pending), n: pending })}
        </Button>

        {keys > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium">{t("prestige.perks")}</p>
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
  const t = useTranslations();
  const { num, locale } = useFormat();
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
        <GameIcon name={p.icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{p.name[locale]}</p>
          {lvl > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {maxed ? t("upgrades.maxBadge") : t("upgrades.level", { n: lvl })}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{p.description[locale]}</p>
      </div>
      <Button size="sm" className="min-w-16 tabular-nums" disabled={!canBuy} onClick={() => game.buyPerk(p.id)}>
        {maxed ? (
          t("upgrades.max")
        ) : (
          <>
            <ChipIcon /> {num(cost)}
          </>
        )}
      </Button>
    </div>
  );
}
