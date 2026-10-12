"use client";

import { useTranslations } from "next-intl";
import { BookOpen, ChevronDown, Cog, Layers, Sparkle } from "lucide-react";
import type { ReactNode } from "react";
import { ChargeIcon } from "./art";
import { SigilBadge } from "./card";
import { SIGILS, type SacrificeRules } from "./rules";

// The page's two guides under the fight: the rules, with what each count beside a player's name means and how it
// is counted, and every sigil, as its badge on the cards, with what it does.

/** A block of the side column that folds away. */
function Fold({ title, icon, open, children }: { title: string; icon: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-2xl bg-card p-3 text-xs ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {icon}
        {title}
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 px-1 leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export function RulesBlock({ rules }: { rules: SacrificeRules }) {
  const t = useTranslations("sacrifice");
  const counts: { key: "charge" | "bones" | "sparks" | "deck"; icon: ReactNode; params?: Record<string, number> }[] = [
    { key: "charge", icon: <ChargeIcon className="size-4" /> },
    { key: "bones", icon: <Cog className="size-4" /> },
    { key: "sparks", icon: <Sparkle className="size-4 text-emerald-500" />, params: { n: rules.sparks } },
    { key: "deck", icon: <Layers className="size-4" /> },
  ];
  return (
    <Fold title={t("rulesTitle")} icon={<BookOpen className="size-4 text-muted-foreground" />}>
      <div className="space-y-2">
        <p>{t("rulesText", { scale: rules.scaleToWin, maxTurns: rules.maxTurns })}</p>
        <p className="font-semibold text-foreground">{t("countsTitle")}</p>
        <ul className="grid gap-1.5">
          {counts.map((c) => (
            <li key={c.key} className="flex gap-2">
              <span className="mt-0.5 shrink-0">{c.icon}</span>
              <span>
                <span className="font-semibold text-foreground">{t(`stat.${c.key}`)}</span> — {t(`statHelp.${c.key}`, c.params)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Fold>
  );
}

/** Every sigil, as its badge on the cards, with what it does. */
export function SigilsBlock() {
  const t = useTranslations("sacrifice");
  return (
    <Fold title={t("sigilsTitle")} icon={<span className="size-4 rounded-full bg-gradient-to-br from-sky-400 via-fuchsia-400 to-lime-400" />} open>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {SIGILS.map((s) => (
          <li key={s} className="flex items-center gap-2.5">
            <SigilBadge sigil={s} tone="page" className="text-sm" />
            <span>
              <span className="font-semibold text-foreground">{t(`sigils.${s}.name`)}</span> — {t(`sigils.${s}.text`)}
            </span>
          </li>
        ))}
      </ul>
    </Fold>
  );
}
