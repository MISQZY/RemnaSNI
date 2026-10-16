"use client";

import { useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import { useFormat } from "@/core/i18n/provider";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { cn } from "@/lib/utils";

/** A small tile of a game's stats row: the score, the record, the balance. */
export function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-1.5">
      <p className="truncate text-[0.6875rem] text-muted-foreground">{label}</p>
      <p className="truncate font-heading text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** The country's Qzr balance as a tile, "—" until it is known (signed out, or loading). */
export function BalanceTile({ balance, label = "Qzr" }: { balance: number | null | undefined; label?: string }) {
  const { num } = useFormat();
  return (
    <StatTile
      label={label}
      value={
        balance != null ? (
          <span className="inline-flex items-center gap-1">
            <QzrIcon className="size-3.5" /> {num(balance)}
          </span>
        ) : (
          "—"
        )
      }
    />
  );
}

/**
 * The country's turbo on a game's prices, as RemnaWeb sends it with the status: `boost` the turbo, `multiplier` what it
 * does to the prices. Nothing without one.
 */
export function TurboBadge({ boost, multiplier, className }: { boost: number; multiplier: number; className?: string }) {
  const t = useTranslations("game");
  const { num, fixed } = useFormat();
  if (multiplier <= 1) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full bg-primary/12 px-1.5 font-medium text-primary", className)}>
      <Gauge className="size-3" /> {t("turbo", { boost: fixed(boost, 1), percent: num(Math.round((multiplier - 1) * 100)) })}
    </span>
  );
}

/** "+N" of what a crystal, a wave or a fish brought, and the turbo's part of it in green. */
export function Gain({ qzr, bonus }: { qzr: number; bonus: number }) {
  const { num } = useFormat();
  return (
    <>
      +{num(qzr)}
      {bonus > 0 && (
        <span className="inline-flex items-center text-xs text-primary">
          <Gauge className="size-3" />+{num(bonus)}
        </span>
      )}
    </>
  );
}
