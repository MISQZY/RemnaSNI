"use client";

import { useLocale, useTranslations } from "next-intl";
import { BowArrow, Cog, Feather, Mountain, Recycle, Shield, ShieldPlus, Sprout, Swords, Split, Triangle, Zap, type LucideIcon } from "lucide-react";
import { createContext, memo, useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { CardArt, ChargeIcon } from "./art";
import type { CardBackLook, CardDef, Rarity, Sigil } from "./rules";

// A card of the Sacrifice in the project's look: dark, framed in the color of its rarity (as RemnaWeb's pets: grey,
// blue, purple, gold), its art drawn in art.tsx, its cost in sacrifices (a crystal) or debris (a cog), its sigils as round
// badges in their own colors in the top right corner, power and health. The catalog comes with the rules from RemnaWeb and is shared through CardsProvider.

export const SIGIL_ICONS: Record<Sigil, LucideIcon> = {
  airborne: Feather,
  intercept: BowArrow,
  rift: Zap,
  split: Split,
  resilient: ShieldPlus,
  tripleCharge: Triangle,
  spikes: Mountain,
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
  rare: { frame: "from-purple-300 via-purple-500 to-purple-700", art: "text-purple-300", glow: "shadow-[0_0_14px_-2px] shadow-purple-500/50" },
  legendary: { frame: "from-amber-200 via-amber-400 to-amber-600", art: "text-amber-300", glow: "shadow-[0_0_16px_-1px] shadow-amber-400/60" },
};

export const RARITY_TEXT: Record<Rarity, string> = {
  token: "text-neutral-400",
  common: "text-neutral-300",
  uncommon: "text-sky-400",
  rare: "text-purple-400",
  legendary: "text-amber-400",
};

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
  /**
   * In the deck being built: a gold frame drawn inside the card, over the edge of its body, so no ancestor that clips
   * (the catalog's content-visibility) can cut it off, and it stands out from the gold frame of a legendary card.
   */
  chosen?: boolean;
  /** A cosmetic sheen sweeping over the card, through these colors: its owner's foil, on the board. */
  foil?: string[] | null;
  onClick?: () => void;
  className?: string;
};

/**
 * A card's face, filling its box (3:4). Memoized: the deck shows the whole catalog and the board re-renders on every
 * beat, while a card (its art a heavy SVG) changes only with its props.
 */
export const CardFace = memo(function CardFace({ card, power, health, selected, marked, dim, chosen, foil, onClick, className }: Props) {
  const t = useTranslations("sacrifice.sigils");
  const { def, nameOf } = useCards();
  const d = def(card);
  if (!d) return null;
  // A rarity a newer RemnaWeb has and this site does not know yet looks common.
  const r = RARITY[d.rarity] ?? RARITY.common;
  const hurt = health !== undefined && health < d.health;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={[nameOf(card), ...d.sigils.map((s) => t(`${s}.name`))].join(" · ")}
      className={cn(
        "@container relative block aspect-[3/4] w-full overflow-hidden rounded-[10px] bg-gradient-to-b p-[2px] text-left transition-[translate,box-shadow] duration-150 select-none",
        r.frame,
        r.glow,
        onClick && "cursor-pointer hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
        selected && "-translate-y-1.5 shadow-[0_0_18px_-2px] shadow-primary ring-2 ring-primary",
        dim && "opacity-45 saturate-50",
        className,
      )}
    >
      <span className="relative flex h-full flex-col overflow-hidden rounded-[8px] bg-neutral-900 bg-[radial-gradient(circle_at_50%_42%,rgb(46_224_106/0.13),transparent_65%)] text-neutral-100">
        <span className="flex h-[clamp(0.625rem,15cqw,1.125rem)] items-center px-1 pt-1 text-[clamp(0.5rem,11cqw,0.8125rem)] leading-none">
          <Cost def={d} className="py-px" />
        </span>
        {d.sigils.length > 0 && (
          <span className="absolute top-[3%] right-[4%] z-10 flex gap-[3cqw] text-[clamp(0.375rem,10cqw,0.75rem)]">
            {d.sigils.map((s) => (
              <SigilBadge key={s} sigil={s} className="bg-neutral-950/80 shadow-[0_0_8px_-1px] shadow-current" />
            ))}
          </span>
        )}
        <CardArt card={card} className={cn("min-h-0 w-full flex-1 px-[8%] py-[2%]", r.art)} />
        <span className="line-clamp-2 px-0.5 text-center font-heading text-[clamp(0.40625rem,9cqw,0.6875rem)] leading-[1.05] font-semibold tracking-tight break-words uppercase">{nameOf(card)}</span>
        <span className="flex items-center justify-between px-1 pt-0.5 pb-1 font-heading text-[clamp(0.5625rem,13cqw,0.9375rem)] leading-none font-bold tabular-nums">
          <span className="inline-flex items-center gap-0.5">
            <Swords className="size-[0.8em] text-neutral-400" />
            {power ?? d.power}
          </span>
          <span className={cn("inline-flex items-center gap-0.5", hurt && "text-rose-400")}>
            {health ?? d.health}
            <Shield className="size-[0.8em] text-neutral-400" />
          </span>
        </span>
        {foil && foil.length > 0 && <Sheen colors={foil.map((c) => `${c}80`)} seconds={7.2} rare />}
        {marked && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-rose-950/70 text-[clamp(0.4375rem,9cqw,0.6875rem)] font-semibold text-rose-100">
            <ChargeIcon className="size-[2.2em] opacity-90" />
          </span>
        )}
      </span>
      {chosen && (
        <span className="pointer-events-none absolute inset-[2px] z-20 rounded-[8px] shadow-[inset_0_0_10px_-1px] shadow-amber-400/70 ring-2 ring-amber-400 ring-inset" />
      )}
    </Tag>
  );
});

/** The emblem in the middle of a cosmetic back, on a 30×40 grid. */
function BackEmblem({ back }: { back: CardBackLook }) {
  switch (back.emblem) {
    case "rune":
      return <path d="M15 9 L15 31 M10 14 L20 20 M20 14 L10 20" stroke={back.mark} strokeWidth="2" strokeLinecap="round" fill="none" />;
    case "eye":
      return (
        <>
          <path d="M6 20 Q15 11 24 20 Q15 29 6 20 Z" fill="none" stroke={back.mark} strokeWidth="1.6" />
          <circle cx="15" cy="20" r="3" fill={back.mark} />
        </>
      );
    case "gear":
      return (
        <>
          <circle cx="15" cy="20" r="6" fill="none" stroke={back.mark} strokeWidth="2.5" strokeDasharray="2.4 1.6" />
          <circle cx="15" cy="20" r="2.4" fill={back.mark} />
        </>
      );
    case "star":
      return <polygon points="15,10 17,17.5 24,20 17,22.5 15,30 13,22.5 6,20 13,17.5" fill={back.mark} />;
    default:
      return <polygon points="15,9 20,17 15,31 10,17" fill={back.mark} />;
  }
}

/**
 * A band of light sweeping over a card (a foil, a shimmering back): it starts wholly off the left edge and ends wholly
 * off the right, then rests (sacrifice-sheen in globals.css), so the loop never shows its seam. `rare`: twice the rest,
 * the sweep as fast (sacrifice-sheen-rare), so `seconds` is the whole, doubled cycle.
 */
function Sheen({ colors, seconds, rare }: { colors: string[]; seconds: number; rare?: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-screen">
      <span
        className="absolute inset-y-[-20%] left-0 w-[250%] motion-reduce:hidden"
        style={{
          background: `linear-gradient(90deg, transparent 40%, ${colors.join(", ")}, transparent 60%)`,
          animation: `${rare ? "sacrifice-sheen-rare" : "sacrifice-sheen"} ${seconds}s ease-in-out infinite`,
        }}
      />
    </span>
  );
}

/**
 * The back of a card: the other's hand, a deck. Its owner's cosmetic back if they wear one (the frame's gradient, the
 * ground, an emblem, a sweeping shimmer), else the project's crystal.
 */
export const CardBack = memo(function CardBack({ back, className }: { back?: CardBackLook | null; className?: string }) {
  if (back) {
    return (
      <div aria-hidden className={cn("relative aspect-[3/4] w-full overflow-hidden rounded-[6px] p-px", className)} style={{ background: `linear-gradient(135deg, ${back.from}, ${back.to})` }}>
        <svg viewBox="0 0 30 40" className="size-full rounded-[5px]" style={{ background: back.base }}>
          <rect x="3" y="3" width="24" height="34" rx="2" fill="none" stroke={back.mark} strokeOpacity="0.35" />
          <BackEmblem back={back} />
        </svg>
        {back.shimmer && <Sheen colors={["rgb(255 255 255 / 0.5)"]} seconds={3} />}
      </div>
    );
  }
  return (
    <div aria-hidden className={cn("aspect-[3/4] w-full rounded-[6px] bg-gradient-to-b from-neutral-600 to-neutral-800 p-px", className)}>
      <div className="flex h-full items-center justify-center rounded-[5px] bg-neutral-900">
        <QzrIcon className="size-[70%]" />
      </div>
    </div>
  );
});

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
        <span className={cn("text-[0.6875rem]", RARITY_TEXT[d.rarity] ?? RARITY_TEXT.common)}>{t(`rarity.${d.rarity}`)}</span>
        <span className="ml-auto text-neutral-400">
          {d.blood ? t("costBlood", { n: d.blood }) : d.bones ? t("costBones", { n: d.bones }) : t("costFree")} · {t("stats", { power: d.power, health: d.health })}
        </span>
      </p>
      {d.sigils.map((s) => (
        <p key={s} className="flex items-center gap-2 text-neutral-300">
          <SigilBadge sigil={s} className="text-[0.6875rem]" />
          <span>
            <span className="font-semibold text-neutral-100">{t(`sigils.${s}.name`)}</span> — {t(`sigils.${s}.text`)}
          </span>
        </p>
      ))}
      {d.evolves && <p className="text-neutral-400">{t("evolves", { card: nameOf(d.evolves) })}</p>}
    </div>
  );
}
