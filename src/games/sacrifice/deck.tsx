"use client";

import { useTranslations } from "next-intl";
import { Info, Layers, PackageOpen, Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFormat } from "@/core/i18n/provider";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { cn } from "@/lib/utils";
import { CardFace, SIGIL_ICONS, useCards } from "./card";
import type { Collection, Rarity, SacrificeRules } from "./rules";

// The player's cards and deck: every card they own with how many of it the deck holds (a tap adds one, the minus
// takes one out), saved to RemnaWeb (POST /api/sni/sacrifice/deck); and packs of new cards for Qzr.

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare"];

type Props = {
  rules: SacrificeRules;
  collection: Collection;
  busy: boolean;
  onSave: (deck: string[]) => void;
};

const countOf = (ids: string[]) => ids.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});

export function DeckEditor({ rules, collection, busy, onSave }: Props) {
  const t = useTranslations("sacrifice");
  const { cards, nameOf } = useCards();
  // Keyed by the saved deck (sacrifice.tsx): a save starts the editing over from it.
  const [deck, setDeck] = useState(collection.deck);

  const inDeck = countOf(deck);
  const owned = [...cards.values()]
    .filter((d) => d.rarity !== "token" && (collection.cards[d.id] ?? 0) > 0)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.blood + a.bones / 3 - (b.blood + b.bones / 3));
  const limit = (id: string) => Math.min(collection.cards[id] ?? 0, rules.copies[cards.get(id)!.rarity as Exclude<Rarity, "token">] ?? 0);
  const changed = deck.join() !== collection.deck.join();
  const sizeOk = deck.length >= rules.deckMin && deck.length <= rules.deckMax;

  const add = (id: string) => {
    if ((inDeck[id] ?? 0) < limit(id) && deck.length < rules.deckMax) setDeck([...deck, id]);
  };
  const remove = (id: string) => {
    const i = deck.lastIndexOf(id);
    if (i >= 0) setDeck(deck.filter((_, j) => j !== i));
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="size-4 text-muted-foreground" /> {t("deckTitle")}
          <span className={cn("tabular-nums", sizeOk ? "text-muted-foreground" : "text-destructive")}>{t("deckSize", { n: deck.length, min: rules.deckMin, max: rules.deckMax })}</span>
        </p>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" disabled={!changed || busy} onClick={() => setDeck(collection.deck)}>
            <Undo2 /> {t("reset")}
          </Button>
          <Button size="sm" disabled={!changed || !sizeOk || busy} onClick={() => onSave(deck)}>
            <Save /> {t("save")}
          </Button>
        </div>
      </div>
      <div className="flex gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground ring-1 ring-foreground/5">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <div className="space-y-1">
          <p>{t("deckHelp")}</p>
          <p>{t("copiesTitle")}</p>
          <RarityList values={{ common: t("upTo", { n: rules.copies.common }), uncommon: t("upTo", { n: rules.copies.uncommon }), rare: String(rules.copies.rare) }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {owned.map((d) => {
          const n = inDeck[d.id] ?? 0;
          return (
            <div key={d.id} className="flex flex-col gap-1">
              <CardFace card={d.id} dim={n === 0} onClick={() => add(d.id)} />
              <div className="flex items-center justify-between gap-1 text-[11px] tabular-nums">
                <button
                  type="button"
                  aria-label={t("removeOne", { card: nameOf(d.id) })}
                  disabled={n === 0}
                  onClick={() => remove(d.id)}
                  className="size-5 rounded-md bg-muted font-bold disabled:opacity-40"
                >
                  −
                </button>
                <span className={cn(n > 0 && "font-semibold text-foreground", "text-muted-foreground")}>
                  {n}/{limit(d.id)}
                </span>
                <span className="text-muted-foreground" title={t("owned")}>
                  ×{collection.cards[d.id]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The rarities a card can have, in their colors on any page background (the board's own colors are for the dark). */
export const RARITY_LABEL: Record<Exclude<Rarity, "token">, string> = {
  common: "text-neutral-500 dark:text-neutral-300",
  uncommon: "text-sky-600 dark:text-sky-400",
  rare: "text-amber-600 dark:text-amber-400",
};

/** A value for each rarity, one per line, the rarity's name in its color. */
function RarityList({ values }: { values: Record<Exclude<Rarity, "token">, string> }) {
  const t = useTranslations("sacrifice.rarity");
  return (
    <ul className="space-y-0.5">
      {RARITY_ORDER.map((r) => (
        <li key={r} className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full bg-current", RARITY_LABEL[r as keyof typeof RARITY_LABEL])} />
          <span className={cn("font-semibold", RARITY_LABEL[r as keyof typeof RARITY_LABEL])}>{t(r)}</span>
          <span>— {values[r as keyof typeof values]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Packs: the price, the odds, the button, and the cards the last one held. */
export function PackShop({ rules, balance, busy, opened, onBuy }: { rules: SacrificeRules; balance: number | undefined; busy: boolean; opened: string[] | null; onBuy: () => void }) {
  const t = useTranslations("sacrifice");
  const { num } = useFormat();
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="flex items-center gap-1.5 px-1 text-sm font-semibold">
        <PackageOpen className="size-4 text-muted-foreground" /> {t("packTitle")}
      </p>
      <div className="space-y-1 px-1 text-xs text-muted-foreground">
        <p>{t("packHelp", { n: rules.packSize })}</p>
        <RarityList values={{ common: pct(rules.packOdds.common), uncommon: pct(rules.packOdds.uncommon), rare: pct(rules.packOdds.rare) }} />
        <p>{t("packPaid")}</p>
      </div>
      <Button size="lg" className="w-full tabular-nums" disabled={busy || (balance !== undefined && balance < rules.packPrice)} onClick={onBuy}>
        <PackageOpen /> {t("buyPack")} · <QzrIcon className="size-4" /> {num(rules.packPrice)}
      </Button>
      {opened && (
        <div className="grid grid-cols-3 gap-2">
          {opened.map((id, i) => (
            <div key={i} className="animate-in fade-in zoom-in-90" style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}>
              <CardFace card={id} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Every sigil with what it does, for the rules block. */
export function SigilList() {
  const t = useTranslations("sacrifice.sigils");
  return (
    <ul className="grid gap-1.5 text-xs">
      {(Object.keys(SIGIL_ICONS) as (keyof typeof SIGIL_ICONS)[]).map((s) => {
        const Icon = SIGIL_ICONS[s];
        return (
          <li key={s} className="flex gap-2">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-semibold">{t(`${s}.name`)}</span> — <span className="text-muted-foreground">{t(`${s}.text`)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
