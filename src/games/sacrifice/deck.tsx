"use client";

import { useTranslations } from "next-intl";
import { Check, Clock, Gem, Info, Layers, Minus, PackageOpen, Recycle, Save, Undo2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFormat } from "@/core/i18n/provider";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { cn } from "@/lib/utils";
import { CardFace, useCards } from "./card";
import { spareOf, type CardDef, type Collection, type PackStatus, type Rarity, type SacrificeRules } from "./rules";

// The player's cards and deck: the deck on top card by card (a tap takes one out), then every card of the catalog —
// the ones not owned grey and out of reach, the owned with how many of it the deck holds (a tap adds one, the minus
// takes one out) — saved to RemnaWeb (POST /api/sni/sacrifice/deck); and packs of new cards for Qzr, a few a day, or
// for the shards of the copies a deck has no room for.

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "legendary"];

type Props = {
  rules: SacrificeRules;
  collection: Collection;
  busy: boolean;
  onSave: (deck: string[]) => void;
};

const countOf = (ids: string[]) => {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = (out[id] ?? 0) + 1;
  return out;
};

export function DeckEditor({ rules, collection, busy, onSave }: Props) {
  const t = useTranslations("sacrifice");
  const { cards } = useCards();
  // Keyed by the saved deck (sacrifice.tsx): a save starts the editing over from it.
  const [deck, setDeck] = useState(collection.deck);

  const inDeck = countOf(deck);
  const order = (a: CardDef, b: CardDef) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.blood + a.bones / 3 - (b.blood + b.bones / 3);
  // Every card a pack can hold, owned or not: the ones not owned are shown grey, to see what is still to be found.
  const all = [...cards.values()].filter((d) => d.rarity !== "token").sort(order);
  const ownedCount = all.filter((d) => (collection.cards[d.id] ?? 0) > 0).length;
  // The deck card by card, each copy on its own, in the collection's order.
  const chosen = deck
    .map((id, i) => ({ id, i, def: cards.get(id) }))
    .filter((c): c is { id: string; i: number; def: CardDef } => !!c.def)
    .sort((a, b) => order(a.def, b.def) || a.i - b.i);
  const limit = useCallback(
    (id: string) => Math.min(collection.cards[id] ?? 0, rules.copies[cards.get(id)!.rarity as Exclude<Rarity, "token">] ?? 0),
    [cards, collection.cards, rules.copies],
  );
  const changed = deck.join() !== collection.deck.join();
  const sizeOk = deck.length >= rules.deckMin && deck.length <= rules.deckMax;

  // Stable, so a tap re-renders only the cards it changes (CatalogCard, ChosenCard), not the whole catalog.
  const add = useCallback(
    (id: string) => setDeck((d) => (d.filter((x) => x === id).length < limit(id) && d.length < rules.deckMax ? [...d, id] : d)),
    [limit, rules.deckMax],
  );
  const remove = useCallback((id: string) => {
    setDeck((d) => {
      const i = d.lastIndexOf(id);
      return i >= 0 ? d.filter((_, j) => j !== i) : d;
    });
  }, []);

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
          <RarityList values={{ common: t("upTo", { n: rules.copies.common }), uncommon: t("upTo", { n: rules.copies.uncommon }), rare: String(rules.copies.rare), legendary: rules.copies.legendary === undefined ? undefined : String(rules.copies.legendary) }} />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-2 ring-1 ring-foreground/5">
        <p className="px-1 text-xs font-semibold text-muted-foreground">{t("deckChosen")}</p>
        {chosen.length > 0 ? (
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
            {chosen.map((c) => (
              <ChosenCard key={c.i} id={c.id} onRemove={remove} />
            ))}
          </div>
        ) : (
          <p className="px-1 pb-1 text-xs text-muted-foreground">{t("deckEmpty")}</p>
        )}
      </div>

      <p className="flex items-center justify-between gap-2 px-1 text-xs font-semibold text-muted-foreground">
        {t("allCards")}
        <span className="font-normal tabular-nums">{t("collected", { n: ownedCount, total: all.length })}</span>
      </p>
      <div className="grid grid-cols-4 gap-x-3 gap-y-2 sm:grid-cols-5">
        {all.map((d) => (
          <CatalogCard key={d.id} id={d.id} owned={collection.cards[d.id] ?? 0} n={inDeck[d.id] ?? 0} limit={limit(d.id)} onAdd={add} onRemove={remove} />
        ))}
      </div>
    </section>
  );
}

/** A copy in the chosen deck: a tap takes it out. */
const ChosenCard = memo(function ChosenCard({ id, onRemove }: { id: string; onRemove: (id: string) => void }) {
  const take = useCallback(() => onRemove(id), [id, onRemove]);
  return <CardFace card={id} onClick={take} />;
});

/** A card of the catalog. Its art is lazy (see `CardFace`), as the catalog holds every card a pack can give. */
const CatalogCard = memo(function CatalogCard({
  id,
  owned,
  n,
  limit,
  onAdd,
  onRemove,
}: {
  id: string;
  owned: number;
  /** Copies in the deck. */
  n: number;
  limit: number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("sacrifice");
  const { nameOf } = useCards();
  const add = useCallback(() => onAdd(id), [id, onAdd]);
  if (!owned)
    return (
      <div className="flex flex-col items-center gap-1" title={t("notOwned")}>
        <CardFace card={id} lazy className="opacity-40 grayscale" />
        <span className="h-5 text-[0.6875rem] leading-5 text-muted-foreground">{t("notOwnedShort")}</span>
      </div>
    );
  // The cards the deck holds in a gold frame. Under the card: copies in the deck of the limit in a hollow yellow ring, how many are owned in the middle and,
  // once the deck holds one, the mark that takes one out.
  return (
    <div className="flex flex-col gap-1">
      <CardFace card={id} onClick={add} chosen={n > 0} lazy />
      <div className="flex h-5 items-center justify-between gap-0.5 text-[0.625rem] leading-none font-bold tabular-nums">
        <span
          title={t("limitBadge", { n, limit })}
          className={cn(
            "flex h-4 min-w-4 items-center shrink-0 justify-center rounded-full border-[1.5px] px-1",
            n > 0 ? "border-amber-400 text-amber-300" : "border-muted-foreground/50 text-muted-foreground",
          )}
        >
          {n}/{limit}
        </span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-normal text-muted-foreground" title={t("owned")}>
          ×{owned}
        </span>
        {n > 0 ? (
          <button
            type="button"
            aria-label={t("removeOne", { card: nameOf(id) })}
            title={t("removeOne", { card: nameOf(id) })}
            onClick={() => onRemove(id)}
            className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition-transform hover:scale-110"
          >
            <Minus className="size-2.5" strokeWidth={3.5} />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
      </div>
    </div>
  );
});

/** The rarities a card can have, in their colors on any page background (the board's own colors are for the dark). */
export const RARITY_LABEL: Record<Exclude<Rarity, "token">, string> = {
  common: "text-neutral-500 dark:text-neutral-300",
  uncommon: "text-sky-600 dark:text-sky-400",
  rare: "text-purple-600 dark:text-purple-400",
  legendary: "text-amber-600 dark:text-amber-400",
};

/** A value for each rarity, one per line, the rarity's name in its color; none for a rarity an older RemnaWeb does not send. */
function RarityList({ values }: { values: Partial<Record<Exclude<Rarity, "token">, string>> }) {
  const t = useTranslations("sacrifice.rarity");
  return (
    <ul className="space-y-0.5">
      {RARITY_ORDER.filter((r) => values[r as keyof typeof values] !== undefined).map((r) => (
        <li key={r} className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full bg-current", RARITY_LABEL[r as keyof typeof RARITY_LABEL])} />
          <span className={cn("font-semibold", RARITY_LABEL[r as keyof typeof RARITY_LABEL])}>{t(r)}</span>
          <span>— {values[r as keyof typeof values]}</span>
        </li>
      ))}
    </ul>
  );
}

/** The clock, a tick a minute: for the time left until the day's packs come back. */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Packs: a few a day, each dearer than the last (RemnaWeb counts them, PackStatus): the day's prices as a ladder with
 * the ones bought ticked off, the odds, the button with the next price, or the time left until the next day once
 * they are all bought; the trade of the spare copies for a pack (TradeBox); and the cards the last pack held.
 */
export function PackShop({
  rules,
  balance,
  packs,
  busy,
  opened,
  onBuy,
  collection,
  onTrade,
}: {
  rules: SacrificeRules;
  balance: number | undefined;
  /** Missing without an account, or from a RemnaWeb that counts no packs: one price then, no limit. */
  packs: PackStatus | undefined;
  busy: boolean;
  opened: string[] | null;
  onBuy: () => void;
  /** Missing without an account. */
  collection: Collection | undefined;
  onTrade: () => void;
}) {
  const t = useTranslations("sacrifice");
  const { num } = useFormat();
  const now = useMinuteClock();
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  const limit = packs?.limit ?? rules.packsPerDay ?? 0;
  const growth = rules.packGrowth ?? 1;
  // The day may have turned since RemnaWeb counted: the count starts over then.
  const bought = packs && now < packs.resetAt ? packs.bought : 0;
  const ladder = Array.from({ length: limit }, (_, i) => Math.round(rules.packPrice * growth ** i));
  const price = limit ? (ladder[bought] ?? ladder.at(-1)!) : rules.packPrice;
  const left = limit ? limit - bought : Infinity;
  const waitMin = packs ? Math.max(1, Math.ceil((packs.resetAt - now) / 60_000)) : 0;
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="flex items-center gap-1.5 px-1 text-sm font-semibold">
        <PackageOpen className="size-4 text-muted-foreground" /> {t("packTitle")}
        {limit > 0 && <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">{t("packsToday", { n: bought, limit })}</span>}
      </p>
      {limit > 0 && (
        <div className="space-y-1.5">
          <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${limit}, minmax(0, 1fr))` }}>
            {ladder.map((p, i) => (
              <li
                key={i}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[0.6875rem] tabular-nums ring-1",
                  i < bought ? "bg-muted/40 text-muted-foreground ring-foreground/5" : i === bought ? "bg-primary/10 font-semibold text-foreground ring-primary/50" : "text-muted-foreground ring-foreground/10",
                )}
              >
                <span className="text-[0.625rem] font-normal">{i < bought ? <Check className="size-3" /> : t("packN", { n: i + 1 })}</span>
                <span className={cn("inline-flex items-center gap-0.5", i < bought && "line-through")}>
                  <QzrIcon className="size-3" /> {num(p)}
                </span>
              </li>
            ))}
          </ol>
          <p className="px-1 text-xs text-muted-foreground">{t("packLimitHelp", { n: limit, growth })}</p>
        </div>
      )}
      <div className="space-y-1 px-1 text-xs text-muted-foreground">
        <p>{t("packHelp", { n: rules.packSize })}</p>
        <RarityList values={{ common: pct(rules.packOdds.common), uncommon: pct(rules.packOdds.uncommon), rare: pct(rules.packOdds.rare), legendary: rules.packOdds.legendary === undefined ? undefined : pct(rules.packOdds.legendary) }} />
        <p>{t("packPaid")}</p>
      </div>
      {left > 0 ? (
        <Button size="lg" className="w-full tabular-nums" disabled={busy || (balance !== undefined && balance < price)} onClick={onBuy}>
          <PackageOpen /> {t("buyPack")} · <QzrIcon className="size-4" /> {num(price)}
        </Button>
      ) : (
        <Button size="lg" variant="secondary" className="w-full tabular-nums" disabled>
          <Clock /> {t("packsIn", { h: Math.floor(waitMin / 60), m: waitMin % 60 })}
        </Button>
      )}
      {collection && rules.shardValue && rules.shardPack && <TradeBox rules={rules} shardValue={rules.shardValue} shardPack={rules.shardPack} collection={collection} busy={busy} onTrade={onTrade} />}
      {opened && (
        <div className="grid grid-cols-5 gap-1.5">
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

/**
 * The trade of the spare copies: those past what a deck may hold, as cards with their counts, break down into shards
 * by rarity (RemnaWeb's POST /api/sni/sacrifice/trade), and enough of them buy a pack outside the day's limit.
 */
function TradeBox({
  rules,
  shardValue,
  shardPack,
  collection,
  busy,
  onTrade,
}: {
  rules: SacrificeRules;
  shardValue: Record<Exclude<Rarity, "token">, number>;
  shardPack: number;
  collection: Collection;
  busy: boolean;
  onTrade: () => void;
}) {
  const t = useTranslations("sacrifice");
  const { cards, nameOf } = useCards();
  const { spare, shards } = spareOf(rules, cards, collection.cards);
  const copies = Object.values(spare).reduce((a, b) => a + b, 0);
  const have = (collection.shards ?? 0) + shards;
  return (
    <div className="flex flex-col gap-2 border-t border-foreground/10 pt-3">
      <p className="flex items-center gap-1.5 px-1 text-sm font-semibold">
        <Recycle className="size-4 text-muted-foreground" /> {t("tradeTitle")}
      </p>
      <div className="space-y-1 px-1 text-xs text-muted-foreground">
        <p>{t("tradeHelp")}</p>
        <p>{t("shardValues")}</p>
        <RarityList values={{ common: t("shardsN", { n: shardValue.common }), uncommon: t("shardsN", { n: shardValue.uncommon }), rare: t("shardsN", { n: shardValue.rare }), legendary: shardValue.legendary === undefined ? undefined : t("shardsN", { n: shardValue.legendary }) }} />
      </div>
      {copies > 0 ? (
        <div className="space-y-1 rounded-xl bg-muted/60 px-3 py-2 text-xs ring-1 ring-foreground/5">
          <p className="font-semibold">{t("tradeSpare", { n: copies })}</p>
          <p className="text-muted-foreground">
            {Object.entries(spare)
              .map(([id, n]) => `${nameOf(id)} ×${n}`)
              .join(", ")}
          </p>
        </div>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">{t("tradeNone")}</p>
      )}
      {/* Two parts that never break inside: on a narrow phone the shards go onto a second line and the button grows to fit. */}
      <Button
        size="lg"
        variant="secondary"
        className="h-fit min-h-10 w-full flex-wrap gap-x-3 gap-y-0.5 py-2 whitespace-normal tabular-nums"
        disabled={busy || have < shardPack}
        onClick={onTrade}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <PackageOpen /> {t("tradeButton")}
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Gem className="size-4" /> {t("tradeHave", { have, need: shardPack })}
        </span>
      </Button>
    </div>
  );
}
