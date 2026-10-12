"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowBigUp, Cog, Feather, Hammer, Recycle, Shield, ShieldPlus, Sprout, Swords, Split, Triangle, Zap, type LucideIcon } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { CardArt, ChargeIcon } from "./art";
import type { CardDef, Rarity, Sigil } from "./rules";

// A card of the Sacrifice in the project's look: dark, framed in the color of its rarity (as RemnaWeb's pets: grey,
// blue, gold), its art drawn in art.tsx, its cost in sacrifices (a crystal) or debris (a cog), its sigils as round
// badges in their own colors in the top right corner, power and health. The catalog comes with the rules from RemnaWeb and is shared through CardsProvider.

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

/** Each sigil's own color, so it stands out on a card: `board` on the dark table, `page` on any page background. */
export const SIGIL_TONE: Record<Sigil, { board: string; page: string }> = {
  airborne: { board: "bg-sky-500/25 text-sky-300 ring-sky-400/60", page: "bg-sky-500/15 text-sky-600 ring-sky-500/40 dark:text-sky-300" },
  intercept: { board: "bg-violet-500/25 text-violet-300 ring-violet-400/60", page: "bg-violet-500/15 text-violet-600 ring-violet-500/40 dark:text-violet-300" },
  rift: { board: "bg-fuchsia-500/25 text-fuchsia-300 ring-fuchsia-400/60", page: "bg-fuchsia-500/15 text-fuchsia-600 ring-fuchsia-500/40 dark:text-fuchsia-300" },
  split: { board: "bg-orange-500/25 text-orange-300 ring-orange-400/60", page: "bg-orange-500/15 text-orange-600 ring-orange-500/40 dark:text-orange-300" },
  resilient: { board: "bg-yellow-500/25 text-yellow-200 ring-yellow-400/60", page: "bg-yellow-500/15 text-yellow-700 ring-yellow-500/40 dark:text-yellow-200" },
  tripleCharge: { board: "bg-emerald-500/25 text-emerald-300 ring-emerald-400/60", page: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/40 dark:text-emerald-300" },
  spikes: { board: "bg-rose-500/25 text-rose-300 ring-rose-400/60", page: "bg-rose-500/15 text-rose-600 ring-rose-500/40 dark:text-rose-300" },
  growth: { board: "bg-lime-500/25 text-lime-300 ring-lime-400/60", page: "bg-lime-500/15 text-lime-700 ring-lime-500/40 dark:text-lime-300" },
  rebuild: { board: "bg-cyan-500/25 text-cyan-300 ring-cyan-400/60", page: "bg-cyan-500/15 text-cyan-600 ring-cyan-500/40 dark:text-cyan-300" },
};

/** A sigil as a round badge in its color; its size comes from the font size (or `className`). */
export function SigilBadge({ sigil, tone = "board", className }: { sigil: Sigil; tone?: "board" | "page"; className?: string }) {
  const t = useTranslations("sacrifice.sigils");
  const Icon = SIGIL_ICONS[sigil];
  return (
    <span role="img" aria-label={t(`${sigil}.name`)} className={cn("inline-flex size-[2em] shrink-0 items-center justify-center rounded-full ring-1", SIGIL_TONE[sigil][tone], className)}>
      <Icon className="size-[62%]" strokeWidth={2.4} />
    </span>
  );
}

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
  const t = useTranslations("sacrifice");
  if (!def.blood && !def.bones) return null;
  return (
    <span
      title={def.blood > 0 ? t("costBloodTitle", { n: def.blood }) : t("costBonesTitle", { n: def.bones })}
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1 font-heading font-bold tabular-nums ring-1 ring-white/10", className)}>
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
        <span className="flex h-[clamp(10px,15cqw,18px)] items-center px-1 pt-1 text-[clamp(8px,11cqw,13px)] leading-none">
          <Cost def={d} className="py-px" />
        </span>
        {d.sigils.length > 0 && (
          <span className="absolute top-[3%] right-[4%] z-10 flex gap-[3cqw] text-[clamp(6px,10cqw,12px)]">
            {d.sigils.map((s) => (
              <SigilBadge key={s} sigil={s} className="bg-neutral-950/80 shadow-[0_0_8px_-1px] shadow-current" />
            ))}
          </span>
        )}
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
      {d.sigils.map((s) => (
        <p key={s} className="flex items-center gap-2 text-neutral-300">
          <SigilBadge sigil={s} className="text-[11px]" />
          <span>
            <span className="font-semibold text-neutral-100">{t(`sigils.${s}.name`)}</span> — {t(`sigils.${s}.text`)}
          </span>
        </p>
      ))}
      {d.evolves && <p className="text-neutral-400">{t("evolves", { card: nameOf(d.evolves) })}</p>}
    </div>
  );
}
