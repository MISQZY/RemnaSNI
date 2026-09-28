"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { GameIcon } from "@/games/clicker/game-icon";
import { useConfig } from "@/games/clicker/config-provider";
import { useFormat } from "@/core/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { config, type UpgradeDef as Upgrade, type UpgradeKind } from "@/games/clicker/config";
import { game, level, type GameState } from "@/games/clicker/game";
import { upgradePrice } from "@/games/clicker/rules";
import { cn } from "@/lib/utils";

const TABS: { value: "tap" | "luck" | "boost"; kinds: UpgradeKind[] }[] = [
  { value: "tap", kinds: ["tap"] },
  { value: "luck", kinds: ["crit", "critPower"] },
  { value: "boost", kinds: ["boost"] },
];

/** An upgrade shows up once the player has earned half its base price. */
const revealed = (s: GameState, u: Upgrade) => level(s, u.id) > 0 || s.totalEarned >= u.baseCost / 2;

const affordable = (s: GameState, u: Upgrade) =>
  !(u.maxLevel && level(s, u.id) >= u.maxLevel) && s.points >= upgradePrice(config(), s, u);

/** Whether any shown upgrade can be bought now, for the dot on the tab. */
export const upgradeReady = (s: GameState, upgrades: Upgrade[]) => upgrades.some((u) => revealed(s, u) && affordable(s, u));

/** The upgrade shop; its title is the tab it sits in. */
export function Upgrades({ state }: { state: GameState }) {
  const t = useTranslations();
  const { upgrades } = useConfig();
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{t("upgrades.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tap">
          <TabsList className="w-full">
            {TABS.map((tab) => {
              const ready = upgrades.some((u) => tab.kinds.includes(u.kind) && revealed(state, u) && affordable(state, u));
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {t(`upgrades.tabs.${tab.value}`)}
                  {ready && <span className="size-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-2 space-y-2">
              <UpgradeList state={state} upgrades={upgrades.filter((u) => tab.kinds.includes(u.kind))} />
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
  const t = useTranslations();
  const { num } = useFormat();
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
            <p className="text-xs">{t("upgrades.reveal", { points: num(teaser.baseCost / 2) })}</p>
          </div>
        </div>
      )}
    </>
  );
}

function UpgradeRow({ state, upgrade: u }: { state: GameState; upgrade: Upgrade }) {
  const lvl = level(state, u.id);
  const maxed = !!u.maxLevel && lvl >= u.maxLevel;
  const cost = upgradePrice(config(), state, u);
  const canBuy = affordable(state, u);
  const t = useTranslations();
  const { num, locale } = useFormat();

  return (
    <div className={cn("flex items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10 transition-colors", canBuy && "bg-accent/50")}>
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          canBuy ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        <GameIcon name={u.icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{u.name[locale]}</p>
          {lvl > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {maxed ? t("upgrades.maxBadge") : t("upgrades.level", { n: lvl })}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{u.description[locale]}</p>
        {!canBuy && !maxed && <Progress value={Math.min(100, (state.points / cost) * 100)} className="mt-2 h-1" />}
      </div>
      <Button size="sm" className="min-w-16 tabular-nums" disabled={!canBuy} onClick={() => game.buy(u.id)}>
        {maxed ? t("upgrades.max") : num(cost)}
      </Button>
    </div>
  );
}
