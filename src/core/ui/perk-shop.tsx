"use client";

import { useTranslations } from "next-intl";
import { Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFormat } from "@/core/i18n/provider";
import { ChipIcon } from "@/core/ui/chip-icon";
import { cn } from "@/lib/utils";

/**
 * A game's bonus as RemnaWeb sends it, named in the page's language: `{n}` in the description is the effect of the
 * level, the next level's price in Qzr keys (null when maxed).
 */
export type GamePerk = { id: string; name: string; description: string; perLevel: number; level: number; maxLevel: number; cost: number | null };

/**
 * The country's Qzr keys a game brought and when the next one comes, as RemnaWeb sends them: `count` of what the
 * game counts (crystals, fish) so far, `nextKey` more to the next key, which came last at `keyFrom` (missing from
 * older RemnaWeb versions).
 */
export type KeyProgress = { count: number; nextKey: number; keyFrom?: number };

/** Percent of the way from the last key to the next one; from zero with an older RemnaWeb. */
function keyPercent({ count, nextKey, keyFrom = 0 }: KeyProgress): number {
  const next = count + nextKey;
  return next > keyFrom ? Math.min(100, Math.max(0, ((count - keyFrom) / (next - keyFrom)) * 100)) : 0;
}

type Props = {
  /** Free Qzr keys of the country, shared by every game. */
  keys: number;
  progress: KeyProgress;
  perks: GamePerk[];
  /** Icons by bonus id; Sparkles for the others. */
  icons: Record<string, LucideIcon>;
  /** The number put for `{n}` in a bonus's description: its effect at the current level (the first one before any). */
  effect: (perk: GamePerk) => number;
  /** No purchase meanwhile, e.g. during a run: bonuses apply from the next one. */
  locked?: boolean;
  /** The bonus being bought, if any. */
  buying: string | null;
  onBuy: (id: string) => void;
};

/**
 * A game's bonuses bought with the country's Qzr keys (kept in RemnaWeb, so for a signed-in player only), with the
 * keys on hand and the bar to the next key the game brings, like the clicker's prestige.
 */
export function PerkShop({ keys, progress, perks, icons, effect, locked, buying, onBuy }: Props) {
  const t = useTranslations("perks");
  const { num } = useFormat();
  return (
    <section className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="font-heading font-semibold">{t("title")}</p>
          <p className="flex items-center gap-1 text-xs font-medium tabular-nums">
            <ChipIcon className="size-3.5" /> {num(keys)}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("nextKey")}</span>
            <span className="tabular-nums">
              {num(progress.count)} / {num(progress.count + progress.nextKey)}
            </span>
          </div>
          <Progress value={keyPercent(progress)} className="h-1" />
        </div>
      </div>
      {perks.map((p) => {
        const Icon = icons[p.id] ?? Sparkles;
        const maxed = p.cost === null;
        const canBuy = !maxed && keys >= (p.cost ?? Infinity) && !locked;
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-foreground/10">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", p.level ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {p.name ?? p.id}
                <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                  {p.level}/{p.maxLevel}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{p.description?.replace("{n}", num(effect(p)))}</p>
            </div>
            <Button size="sm" className="shrink-0 tabular-nums" disabled={!canBuy || buying !== null} onClick={() => onBuy(p.id)}>
              {maxed ? (
                t("max")
              ) : (
                <>
                  <ChipIcon /> {num(p.cost ?? 0)}
                </>
              )}
            </Button>
          </div>
        );
      })}
    </section>
  );
}

/** A small tile of a game's stats row: the score, the record, the balance. */
export function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-1.5">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-heading text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
