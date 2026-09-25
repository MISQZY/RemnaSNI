"use client";

import { CircleHelp, Lock } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useConfig } from "@/components/config-provider";
import { useGame } from "@/components/game-runtime";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AchievementDef as Achievement } from "@/lib/config";
import type { GameState } from "@/lib/game";
import { achievementProgress } from "@/lib/rules";
import { cn } from "@/lib/utils";

export function Achievements() {
  const state = useGame();
  const { achievements: ACHIEVEMENTS } = useConfig();
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]);
  const locked = ACHIEVEMENTS.filter((a) => !state.achievements[a.id]);
  const percent = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);
  const { t } = useI18n();

  const tabs = [
    { value: "all", label: t.achievements.all, list: ACHIEVEMENTS },
    { value: "unlocked", label: t.achievements.unlocked, list: unlocked },
    { value: "locked", label: t.achievements.locked, list: locked },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardDescription>{t.achievements.title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {unlocked.length} <span className="text-muted-foreground">/ {ACHIEVEMENTS.length}</span>
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="tabular-nums">
              {percent}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Progress value={percent} />
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="w-full sm:w-fit">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="sm:px-4">
              {tab.label}
              <span className="text-xs text-muted-foreground tabular-nums">{tab.list.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-2">
            {tab.list.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tab.list.map((a) => (
                  <AchievementCard key={a.id} state={state} achievement={a} />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {tab.value === "unlocked" ? t.achievements.noneUnlocked : t.achievements.allUnlocked}
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AchievementCard({ state, achievement: a }: { state: GameState; achievement: Achievement }) {
  const unlockedAt = state.achievements[a.id];
  const hidden = a.secret && !unlockedAt;
  const config = useConfig();
  const progress = !unlockedAt && achievementProgress(config, a, state);
  const { t, num, date, locale } = useI18n();

  return (
    <Card size="sm" className={cn(!unlockedAt && "bg-card/60")}>
      <CardContent className="flex-row items-start gap-3">
        <div
          className={cn(
            "relative grid size-11 shrink-0 place-items-center rounded-lg",
            unlockedAt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {hidden ? <CircleHelp className="size-5" /> : <DynamicIcon name={a.icon as IconName} className="size-5" />}
          {!unlockedAt && (
            <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-card ring-1 ring-foreground/10">
              <Lock className="size-3" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("font-medium", !unlockedAt && "text-muted-foreground")}>{hidden ? "???" : a.name[locale]}</p>
          <p className="text-xs text-muted-foreground">{hidden ? t.achievements.secret : a.description[locale]}</p>
          {unlockedAt ? (
            <p className="text-xs text-primary">{t.achievements.unlockedAt(date(unlockedAt))}</p>
          ) : (
            progress && (
              <div className="space-y-1 pt-1">
                <Progress value={(progress[0] / progress[1]) * 100} className="h-1" />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {num(progress[0])} / {num(progress[1])}
                </p>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
