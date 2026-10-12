"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowBigUp, Cog, Feather, Hammer, Recycle, Shield, ShieldPlus, Sprout, Swords, Split, Triangle, Zap, type LucideIcon } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { CardArt, ChargeIcon } from "./art";
import type { CardDef, Rarity, Sigil } from "./rules";

// A card of the Sacrifice in the project's look: dark, framed in the color of its rarity (as RemnaWeb's pets: grey,
// blue, gold), its art drawn in art.tsx, its cost in sacrifices (a crystal) or debris (a cog), its sigils, power and
// health. The catalog comes with the rules from RemnaWeb and is shared through CardsProvider.

export const SIGIL_ICONS: Record<Sigil, LucideIcon> = {
  airborne: Feather,
  intercept: ArrowBigUp,
  rift: Zap,
  split: Split,
  resilient: ShieldPlus,
  tripleCharge: Triangle,
  spikes: Hammer,
  growth: Sprout,
  rebuild: Recycle,
};

/** The frame and the art's metal, by rarity. */
const RARITY: Record<Rarity, { frame: string; art: string; glow: string }> = {
  token: { frame: "from-neutral-600 to-neutral-800", art: "text-neutral-400", glow: "" },
  common: { frame: "from-neutral-400 to-neutral-600", art: "text-neutral-300", glow: "" },
  uncommon: { frame: "from-sky-300 to-sky-600", art: "text-sky-300", glow: "shadow-[0_0_12px_-2px] shadow-sky-500/40" },
  rare: { frame: "from-amber-200 via-amber-400 to-amber-600", art: "text-amber-300", glow: "shadow-[0_0_14px_-2px] shadow-amber-400/50" },
};

export const RARITY_TEXT: Record<Rarity, string> = { token: "text-neutral-400", common: "text-neutral-300", uncommon: "text-sky-400", rare: "text-amber-400" };

const CardsContext = createContext<Map<string, CardDef>>(new Map());

export function CardsProvider({ cards, children }: { cards: CardDef[]; children: ReactNode }) {
  const map = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  return <CardsContext.Provider value={map}>{children}</CardsContext.Provider>;
}

/** The catalog, and a card's name in the page's language. */
export function useCards() {
  const cards = useContext(CardsContext);
  const locale = useLocale();
  const def = (id: string) => cards.get(id);
  const nameOf = (id: string) => {
    const d = cards.get(id);
    return d ? (locale === "ru" ? d.name.ru : d.name.en) : id;
  };
  return { cards, def, nameOf };
}

/** A card's cost: crystals for sacrifices, a cog for debris; nothing for a free card. */
export function Cost({ def, className }: { def: CardDef; className?: string }) {
  if (!def.blood && !def.bones) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1 font-heading font-bold tabular-nums ring-1 ring-white/10", className)}>
      {def.blood > 0 ? (
        <>
          <span className="text-emerald-300">{def.blood}</span>
          <ChargeIcon className="size-[1.1em]" />
        </>
      ) : (
        <>
          <span className="text-neutral-200">{def.bones}</span>
          <Cog className="size-[1em] text-neutral-400" />
        </>
      )}
    </span>
  );
}

type Props = {
  card: string;
  /** Power and health as on the board; the card's own otherwise. */
  power?: number;
  health?: number;
  selected?: boolean;
  /** About to be sacrificed. */
  marked?: boolean;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
};

/** A card's face, filling its box (3:4). */
export function CardFace({ card, power, health, selected, marked, dim, onClick, className }: Props) {
  const t = useTranslations("sacrifice.sigils");
  const { def, nameOf } = useCards();
  const d = def(card);
  if (!d) return null;
  const r = RARITY[d.rarity];
  const hurt = health !== undefined && health < d.health;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={[nameOf(card), ...d.sigils.map((s) => t(`${s}.name`))].join(" · ")}
      className={cn(
        "@container relative block aspect-[3/4] w-full overflow-hidden rounded-[10px] bg-gradient-to-b p-[2px] text-left transition-all duration-150 select-none",
        r.frame,
        r.glow,
        onClick && "cursor-pointer hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
        selected && "-translate-y-1.5 shadow-[0_0_18px_-2px] shadow-primary ring-2 ring-primary",
        dim && "opacity-45 saturate-50",
        className,
      )}
    >
      <span className="relative flex h-full flex-col overflow-hidden rounded-[8px] bg-neutral-900 bg-[radial-gradient(circle_at_50%_42%,rgb(46_224_106/0.13),transparent_65%)] text-neutral-100">
        <span className="flex items-center justify-between gap-0.5 px-1 pt-1 text-[clamp(7px,9cqw,11px)] leading-none">
          <Cost def={d} className="py-px" />
          {d.sigils.length > 0 && (
            <span className="flex gap-px text-neutral-300">
              {d.sigils.map((s) => {
                const Icon = SIGIL_ICONS[s];
                return <Icon key={s} className="size-[1.25em]" aria-label={t(`${s}.name`)} />;
              })}
            </span>
          )}
        </span>
        <CardArt card={card} className={cn("min-h-0 w-full flex-1 px-[8%] py-[2%]", r.art)} />
        <span className="line-clamp-2 px-0.5 text-center font-heading text-[clamp(6.5px,9cqw,11px)] leading-[1.05] font-semibold tracking-tight break-words uppercase">{nameOf(card)}</span>
        <span className="flex items-center justify-between px-1 pt-0.5 pb-1 font-heading text-[clamp(9px,13cqw,15px)] leading-none font-bold tabular-nums">
          <span className="inline-flex items-center gap-0.5">
            <Swords className="size-[0.8em] text-neutral-400" />
            {power ?? d.power}
          </span>
          <span className={cn("inline-flex items-center gap-0.5", hurt && "text-rose-400")}>
            {health ?? d.health}
            <Shield className="size-[0.8em] text-neutral-400" />
          </span>
        </span>
        {marked && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-rose-950/70 text-[clamp(7px,9cqw,11px)] font-semibold text-rose-100">
            <ChargeIcon className="size-[2.2em] opacity-90" />
          </span>
        )}
      </span>
    </Tag>
  );
}

/** The back of a card, with the project's crystal: the other's hand, a deck. */
export function CardBack({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("aspect-[3/4] w-full rounded-[6px] bg-gradient-to-b from-neutral-600 to-neutral-800 p-px", className)}>
      <div className="flex h-full items-center justify-center rounded-[5px] bg-neutral-900">
        <QzrIcon className="size-[70%]" />
      </div>
    </div>
  );
}

/** Everything about a card in words: for the card picked in hand. */
export function CardInfo({ card }: { card: string }) {
  const t = useTranslations("sacrifice");
  const { def, nameOf } = useCards();
  const d = def(card);
  if (!d) return null;
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-neutral-900/80 p-2.5 text-xs ring-1 ring-white/10">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-heading text-sm font-semibold uppercase">{nameOf(card)}</span>
        <span className={cn("text-[11px]", RARITY_TEXT[d.rarity])}>{t(`rarity.${d.rarity}`)}</span>
        <span className="ml-auto text-neutral-400">
          {d.blood ? t("costBlood", { n: d.blood }) : d.bones ? t("costBones", { n: d.bones }) : t("costFree")} · {t("stats", { power: d.power, health: d.health })}
        </span>
      </p>
      {d.sigils.map((s) => {
        const Icon = SIGIL_ICONS[s];
        return (
          <p key={s} className="flex gap-1.5 text-neutral-300">
            <Icon className="mt-px size-3.5 shrink-0 text-emerald-400" />
            <span>
              <span className="font-semibold text-neutral-100">{t(`sigils.${s}.name`)}</span> — {t(`sigils.${s}.text`)}
            </span>
          </p>
        );
      })}
      {d.evolves && <p className="text-neutral-400">{t("evolves", { card: nameOf(d.evolves) })}</p>}
    </div>
  );
}
