"use client";

import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";
import { game, level, type GameState } from "@/lib/game";
import { UPGRADES, upgradeCost, type Upgrade, type UpgradeKind } from "@/lib/upgrades";
import { cn } from "@/lib/utils";

const TABS: { value: string; label: string; kinds: UpgradeKind[] }[] = [
  { value: "tap", label: "Tap", kinds: ["tap"] },
  { value: "luck", label: "Luck", kinds: ["crit", "critPower"] },
  { value: "boost", label: "Boost", kinds: ["boost"] },
];

/** An upgrade shows up once the player has earned half its base price. */
const revealed = (s: GameState, u: Upgrade) => level(s, u.id) > 0 || s.totalEarned >= u.baseCost / 2;

const affordable = (s: GameState, u: Upgrade) =>
  !(u.maxLevel && level(s, u.id) >= u.maxLevel) && s.points >= upgradeCost(u, level(s, u.id));

export function Upgrades({ state }: { state: GameState }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Upgrades</CardTitle>
        <CardDescription>Spend points to earn them faster.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tap">
          <TabsList className="w-full">
            {TABS.map((t) => {
              const ready = UPGRADES.some((u) => t.kinds.includes(u.kind) && revealed(state, u) && affordable(state, u));
              return (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  {ready && <span className="size-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-2 space-y-2">
              <UpgradeList state={state} upgrades={UPGRADES.filter((u) => t.kinds.includes(u.kind))} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function UpgradeList({ state, upgrades }: { state: GameState; upgrades: Upgrade[] }) {
  // The first upgrade of each tab is always on display so a fresh game has something to aim for.
  const visible = upgrades.filter((u, i) => i === 0 || revealed(state, u));
  const teaser = upgrades.find((u) => !visible.includes(u));
  return (
    <>
      {visible.map((u) => (
        <UpgradeRow key={u.id} state={state} upgrade={u} />
      ))}
      {teaser && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-muted-foreground">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
            <Lock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">???</p>
            <p className="text-xs">Earn {formatNumber(teaser.baseCost / 2)} points to reveal</p>
          </div>
        </div>
      )}
    </>
  );
}

function UpgradeRow({ state, upgrade: u }: { state: GameState; upgrade: Upgrade }) {
  const lvl = level(state, u.id);
  const maxed = !!u.maxLevel && lvl >= u.maxLevel;
  const cost = upgradeCost(u, lvl);
  const canBuy = affordable(state, u);
  const Icon = u.icon;

  return (
    <div className={cn("flex items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10 transition-colors", canBuy && "bg-accent/50")}>
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          canBuy ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{u.name}</p>
          {lvl > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {maxed ? "MAX" : `Lv ${lvl}`}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{u.description}</p>
        {!canBuy && !maxed && <Progress value={Math.min(100, (state.points / cost) * 100)} className="mt-2 h-1" />}
      </div>
      <Button size="sm" className="min-w-16 tabular-nums" disabled={!canBuy} onClick={() => game.buy(u.id)}>
        {maxed ? "Max" : formatNumber(cost)}
      </Button>
    </div>
  );
}
