"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFormat } from "@/core/i18n/provider";
import { api } from "@/core/player/api";
import { ChipIcon } from "@/core/ui/chip-icon";
import { GameIcon } from "@/core/ui/game-icon";
import { cn } from "@/lib/utils";

/**
 * A game's bonus as RemnaWeb sends it (its lib/game/kit.ts perkDtos), named in the page's language: `{n}` in the
 * description is `effect`, the effect of the level; `icon` a kebab-case lucide name; the next level's price in Qzr keys
 * (null when maxed). `icon` and `effect` are missing from older RemnaWeb versions.
 */
export type GamePerk = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  perLevel: number;
  effect?: number;
  level: number;
  maxLevel: number;
  cost: number | null;
};

/**
 * What every game with bonuses gets in its status from RemnaWeb: the country's Qzr balance, the turbo on the game's
 * prices (`boost`, and `multiplier`, 1 without it), the free Qzr keys of the country (shared by every game), `nextKey`
 * more of what the game counts to the next one, which came last at `keyFrom` (missing from older RemnaWeb versions),
 * and the game's bonuses.
 */
export type PerkStatus = { balance: number; boost: number; multiplier: number; keys: number; nextKey: number; keyFrom?: number; perks: GamePerk[] };

/** The number put for `{n}`: RemnaWeb's, or a share in percent from an older one. */
const effectOf = (p: GamePerk) => p.effect ?? Math.round(Math.max(1, p.level) * p.perLevel * 100);

/** Percent of the way from the last key to the next one; from zero with an older RemnaWeb. */
function keyPercent(count: number, nextKey: number, keyFrom = 0): number {
  const next = count + nextKey;
  return next > keyFrom ? Math.min(100, Math.max(0, ((count - keyFrom) / (next - keyFrom)) * 100)) : 0;
}

/**
 * Buying a game's bonuses: POST /api/sni/<game>/perks with `{ id }` (RemnaWeb's lib/game/kit.ts perksRoute), whose
 * answer is the game's new status. `before` runs first (e.g. sending the moves made), `bought` takes the answer
 * (`setStatus` of useGameStatus, or more).
 */
export function usePerkShop<S>(game: string, country: string, bought: (status: S) => void | Promise<void>, before?: () => Promise<unknown>) {
  const t = useTranslations("perks");
  const [buying, setBuying] = useState<string | null>(null);
  const buy = async (id: string) => {
    setBuying(id);
    try {
      await before?.();
      const res = await api<S>(`${game}/perks`, { method: "POST", body: { id }, country });
      if (res) await bought(res);
    } catch {
      toast.error(t("buyFailed"));
    } finally {
      setBuying(null);
    }
  };
  return { buying, buy };
}

type Props = {
  status: PerkStatus;
  /** What the game counts toward the keys (crystals, fish, gems) so far. */
  count: number;
  shop: { buying: string | null; buy: (id: string) => Promise<void> };
  /** No purchase meanwhile, e.g. during a run: bonuses apply from the next one. */
  locked?: boolean;
};

/**
 * A game's bonuses bought with the country's Qzr keys (kept in RemnaWeb, so for a signed-in player only), with the
 * keys on hand and the bar to the next key the game brings, like the clicker's prestige.
 */
export function PerkShop({ status, count, shop, locked }: Props) {
  const t = useTranslations("perks");
  const { num } = useFormat();
  const { keys, nextKey, keyFrom, perks } = status;
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
              {num(count)} / {num(count + nextKey)}
            </span>
          </div>
          <Progress value={keyPercent(count, nextKey, keyFrom)} className="h-1" />
        </div>
      </div>
      {perks.map((p) => {
        const maxed = p.cost === null;
        const canBuy = !maxed && keys >= (p.cost ?? Infinity) && !locked;
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-foreground/10">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", p.level ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>
              <GameIcon name={p.icon ?? "sparkles"} className="size-[1.125rem]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {p.name ?? p.id}
                <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                  {p.level}/{p.maxLevel}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{p.description?.replace("{n}", num(effectOf(p)))}</p>
            </div>
            <Button size="sm" className="shrink-0 tabular-nums" disabled={!canBuy || shop.buying !== null} onClick={() => void shop.buy(p.id)}>
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
