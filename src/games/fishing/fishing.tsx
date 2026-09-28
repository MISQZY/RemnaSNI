"use client";

import { useTranslations } from "next-intl";
import { Cable, Fish, Gauge, Magnet, RotateCcw, Wheat } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/core/api";
import { useFormat } from "@/core/i18n/provider";
import { useSession } from "@/core/session";
import { storage } from "@/core/storage";
import { AccountMenu } from "@/core/ui/account-menu";
import { PerkShop, StatTile, type GamePerk } from "@/core/ui/perk-shop";
import { QzrIcon } from "@/core/ui/qzr-icon";
import { SiteHeader } from "@/core/ui/site-header";
import { useGameStatus } from "@/core/use-game-status";
import { cn } from "@/lib/utils";
import { newReel, stepReel, type Reel } from "./reel";
import { fishValue, localBiteMs, rollCatch, type Catch, type FishingRules, type Rarity } from "./rules";

// Fishing, the game of nodes RemnaWeb has picked it for: cast, wait for the bite, hook it in time and reel the fish
// in, keeping it in the catch zone (reel.ts), or it breaks free. Signed in, RemnaWeb rolls the fish at the cast and
// pays for it once landed (POST /api/sni/fishing/cast and /catch): the site only knows how hard it pulls. Signed out,
// the fish are rolled here, for the fun of it: they are not sold, as nothing proves they were caught.

/** The heaviest fish caught on this device, kg. */
const BEST_KEY = "fishing-best";
/** Fish caught on this device without an account: the prices shown grow with them, as they would signed in. */
const LOCAL_KEY = "fishing-local";

type Phase = "ready" | "casting" | "waiting" | "bite" | "fight" | "landing" | "caught" | "lost";
type Lost = "early" | "missed" | "escaped";

/**
 * `fish` caught in the country, `boost` its turbo and `multiplier` what it does to fish prices (1 without it);
 * `keys` the free Qzr keys (shared with the other games), `nextKey` fish until the next one, `keyFrom` the count
 * at which the last one came.
 */
type Status = { balance: number; fish: number; boost: number; multiplier: number; keys: number; nextKey: number; keyFrom?: number; perks: GamePerk[] };
/** What a landed fish brings: RemnaWeb's answer to the catch. */
type Landed = Status & { earned: number; caught: Catch };
/** The cast on the water: RemnaWeb's id (null without an account), when the bite comes and how hard the fish pulls. */
type Cast = { id: string | null; biteMs: number; strength: number; local: Catch | null };

const PERK_ICONS = { lure: Magnet, line: Cable, bait: Wheat };
const perkEffect = (p: GamePerk) => Math.round(Math.max(1, p.level) * p.perLevel * 100);
const perkShare = (perks: GamePerk[] | undefined, id: string) => {
  const p = perks?.find((x) => x.id === id);
  return p ? p.level * p.perLevel : 0;
};

/** Text colors of the rarities, lightest to brightest. */
const RARITY_COLOR: Record<Rarity, string> = {
  common: "text-muted-foreground",
  uncommon: "text-emerald-500",
  rare: "text-sky-500",
  epic: "text-violet-500",
  legendary: "text-amber-400",
};

const readBest = () => Number(storage.get(BEST_KEY)) || 0;
const readLocal = () => Math.max(0, Math.floor(Number(storage.get(LOCAL_KEY)) || 0));
const noop = () => () => {};

export function FishingSite({ code, name, signIn, rules }: { code: string; name: string; signIn: boolean; rules: FishingRules }) {
  const t = useTranslations();
  const { num, fixed, locale } = useFormat();
  const account = useSession();
  const { status, setStatus } = useGameStatus<Status>("fishing", code);
  // False while hydrating, so values kept in the browser do not differ from the server's markup.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [lost, setLost] = useState<Lost>("escaped");
  /** The fish landed last, and whether RemnaWeb bought it (not without an account). */
  const [result, setResult] = useState<{ fish: Catch; sold: boolean } | null>(null);
  const [best, setBest] = useState(readBest);
  const [local, setLocal] = useState(readLocal);
  const [buying, setBuying] = useState<string | null>(null);
  const castRef = useRef<Cast | null>(null);
  const reelRef = useRef<Reel | null>(null);
  const holdingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // The reel's parts, moved straight in the DOM every frame rather than through renders.
  const zoneRef = useRef<HTMLDivElement>(null);
  const fishRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  useEffect(() => clearTimers, []);

  const lose = (why: Lost) => {
    clearTimers();
    holdingRef.current = false;
    setLost(why);
    setPhase("lost");
    navigator.vibrate?.([40, 30, 40]);
  };

  const cast = async () => {
    clearTimers();
    setResult(null);
    setPhase("casting");
    let next: Cast;
    try {
      const res = account.token ? await api<{ id: string; biteMs: number; strength: number }>("fishing/cast", { method: "POST", country: code }) : null;
      if (res) {
        next = { ...res, local: null };
      } else {
        // Without an account (or signed out by an expired session just now): a fish of this device.
        const fish = rollCatch(rules, local, locale);
        const strength = rules.species.find((f) => f.id === fish.id)?.strength ?? 0.5;
        next = { id: null, biteMs: localBiteMs(rules), strength, local: fish };
      }
    } catch (err) {
      toast.error(err instanceof ApiError && err.status !== 0 ? err.message : t("fishing.failed"));
      setPhase("ready");
      return;
    }
    castRef.current = next;
    setPhase("waiting");
    timersRef.current.push(
      setTimeout(() => {
        setPhase("bite");
        navigator.vibrate?.([20, 40, 20]);
        timersRef.current.push(setTimeout(() => lose("missed"), rules.hookWindowMs));
      }, next.biteMs),
    );
  };

  const hook = () => {
    const c = castRef.current;
    if (!c) return;
    clearTimers();
    // The line bonus is the account's: it counts signed in only.
    const line = account.token ? perkShare(status?.perks, "line") : 0;
    reelRef.current = newReel(rules, c.strength, line);
    holdingRef.current = true;
    setPhase("fight");
  };

  /** A fish reeled in: RemnaWeb pays for it signed in; without an account it is only counted on this device. */
  const land = useEffectEvent(async () => {
    const c = castRef.current;
    castRef.current = null;
    if (!c) return;
    setPhase("landing");
    let fish: Catch;
    if (c.id) {
      try {
        const res = await api<Landed>("fishing/catch", { method: "POST", body: { id: c.id }, country: code });
        if (!res) {
          setPhase("ready");
          return;
        }
        setStatus(res);
        fish = res.caught;
      } catch (err) {
        toast.error(err instanceof ApiError && err.status !== 0 ? err.message : t("fishing.failed"));
        setPhase("ready");
        return;
      }
    } else if (c.local) {
      fish = c.local;
      const count = local + 1;
      setLocal(count);
      storage.set(LOCAL_KEY, String(count));
    } else {
      return;
    }
    if (fish.kg > best) {
      setBest(fish.kg);
      storage.set(BEST_KEY, String(fish.kg));
    }
    setResult({ fish, sold: !!c.id });
    setPhase("caught");
    navigator.vibrate?.(fish.rarity === "legendary" || fish.rarity === "epic" ? [30, 50, 30, 50, 60] : 25);
  });

  const escaped = useEffectEvent(() => lose("escaped"));

  // The fight: the reel moves on every frame; the zone, the fish and the progress are set right in the DOM.
  useEffect(() => {
    if (phase !== "fight") return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const r = reelRef.current;
      if (!r) return;
      // A hidden tab or a slow frame does not let the fish run far.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const end = stepReel(r, rules, dt, holdingRef.current);
      if (zoneRef.current) {
        zoneRef.current.style.bottom = `${r.zone * 100}%`;
        zoneRef.current.style.height = `${r.size * 100}%`;
      }
      if (fishRef.current) fishRef.current.style.bottom = `${r.fish * 100}%`;
      if (progressRef.current) progressRef.current.style.height = `${r.progress * 100}%`;
      if (end === "caught") void land();
      else if (end === "lost") escaped();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, rules]);

  /** A tap, a click or Space: what it does depends on the moment. */
  const press = () => {
    if (phase === "fight") holdingRef.current = true;
    else if (phase === "waiting") lose("early");
    else if (phase === "bite") hook();
    else if (phase === "ready" || phase === "caught" || phase === "lost") void cast();
  };
  const release = () => {
    holdingRef.current = false;
  };
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) press();
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => onKeyDown(e);
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /** Buys the next level of a bonus with the country's Qzr keys; it applies from the next cast. */
  const buyPerk = async (id: string) => {
    setBuying(id);
    try {
      const res = await api<Status>("fishing/perks", { method: "POST", body: { id }, country: code });
      if (res) setStatus(res);
    } catch {
      toast.error(t("fishing.buyFailed"));
    } finally {
      setBuying(null);
    }
  };

  const signedIn = !!account.token;
  const turbo = signedIn ? (status?.multiplier ?? 1) : 1;
  const caughtCount = signedIn ? status?.fish : hydrated ? local : undefined;
  const nextPrice = Math.round(fishValue(rules, caughtCount ?? 0) * turbo);
  const busy = phase === "casting" || phase === "landing";
  const onWater = phase === "waiting" || phase === "bite" || phase === "fight";
  const buttonLabel = {
    ready: t("fishing.cast"),
    casting: t("fishing.casting"),
    waiting: t("fishing.waiting"),
    bite: t("fishing.hook"),
    fight: t("fishing.reel"),
    landing: t("fishing.landing"),
    caught: t("fishing.again"),
    lost: t("fishing.again"),
  }[phase];

  const holdHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      press();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
  };

  return (
    <>
      <SiteHeader code={code} name={name} subtitle={t("fishing.subtitle")} account={<AccountMenu signIn={signIn} />} className="max-w-md" />

      <main className={cn("mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 pt-4 pb-6 select-none", phase === "fight" && "touch-none")}>
        <div className="grid grid-cols-3 gap-1.5">
          <StatTile label={t("fishing.caught")} value={caughtCount !== undefined ? num(caughtCount) : "—"} />
          <StatTile label={t("fishing.best")} value={hydrated && best > 0 ? t("fishing.kg", { kg: fixed(best, best < 10 ? 2 : 1) }) : "—"} />
          <StatTile
            label="Qzr"
            value={
              signedIn && status ? (
                <span className="inline-flex items-center gap-1">
                  <QzrIcon className="size-3.5" /> {num(status.balance)}
                </span>
              ) : (
                "—"
              )
            }
          />
        </div>

        <p className="flex flex-wrap items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          {hydrated && (
            <>
              <QzrIcon className="size-3.5" /> {t("fishing.price", { qzr: num(nextPrice) })}
            </>
          )}
          {turbo > 1 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/12 px-1.5 font-medium text-primary">
              <Gauge className="size-3" /> {t("fishing.turbo", { boost: fixed(status?.boost ?? 0, 1), percent: num(Math.round((turbo - 1) * 100)) })}
            </span>
          )}
          {!signedIn && signIn && <span>· {t("fishing.demo")}</span>}
        </p>

        {/* The lake: the whole of it takes taps, so a thumb anywhere hooks and reels. */}
        <div
          className="relative aspect-square w-full touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-sky-300/70 via-sky-600/80 to-blue-950 ring-1 ring-foreground/10"
          {...holdHandlers}
        >
          {/* The shore line and some light on the water. */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-sky-100/60 to-transparent dark:from-sky-200/20" />

          {onWater && (
            <>
              {/* The line from the rod, out of the top right corner, to the float. */}
              <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="100" y1="0" x2="42" y2={phase === "bite" ? 58 : 55} className="stroke-white/70" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              </svg>
              <span aria-hidden className="absolute top-[55%] left-[42%] size-10 animate-ripple rounded-full border-2 border-white/50" />
              {phase === "bite" && <span aria-hidden className="absolute top-[55%] left-[42%] size-10 animate-ripple rounded-full border-2 border-white/70 [animation-delay:0.4s]" />}
              <span
                aria-hidden
                className={cn(
                  "absolute top-[55%] left-[42%] block h-7 w-4 rounded-full bg-gradient-to-b from-red-500 from-45% to-white to-55% shadow-md ring-1 ring-black/20",
                  phase === "bite" ? "animate-bite" : "animate-bob",
                )}
              />
            </>
          )}

          {/* The reel during the fight: the catch zone and the fish on the track, the progress next to it. */}
          {phase === "fight" && (
            <>
              <div className="absolute inset-y-5 right-5 w-12 rounded-full bg-black/30 ring-1 ring-white/15">
                <div ref={zoneRef} className="absolute inset-x-1 rounded-full bg-emerald-400/60 ring-2 ring-emerald-200/80" style={{ bottom: 0, height: "30%" }} />
                <div ref={fishRef} className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 text-white drop-shadow" style={{ bottom: "15%" }}>
                  <Fish className="size-6" />
                </div>
              </div>
              <div className="absolute inset-y-5 right-[4.75rem] w-2.5 overflow-hidden rounded-full bg-black/30">
                <div ref={progressRef} className="absolute inset-x-0 bottom-0 rounded-full bg-amber-300" style={{ height: "30%" }} />
              </div>
            </>
          )}

          {/* What is going on, over the water. */}
          <div className="pointer-events-none absolute inset-x-4 top-4 text-center">
            {phase === "waiting" && (
              <>
                <p className="font-heading text-lg font-semibold text-white drop-shadow">{t("fishing.waiting")}</p>
                <p className="text-xs text-white/80">{t("fishing.waitHint")}</p>
              </>
            )}
            {phase === "bite" && <p className="font-heading text-2xl font-bold text-amber-300 drop-shadow">{t("fishing.bite")}</p>}
            {phase === "fight" && (
              <p className="pr-20 text-left font-heading text-sm font-semibold text-white drop-shadow">{t("fishing.reelHint")}</p>
            )}
          </div>

          {(phase === "lost" || phase === "caught" || phase === "ready" || busy) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              {phase === "lost" && <p className="font-heading text-2xl font-bold text-white drop-shadow">{t(`fishing.lost.${lost}`)}</p>}
              {phase === "caught" && result && <CatchCard fish={result.fish} sold={result.sold} />}
              {phase === "ready" && <Fish aria-hidden className="size-16 text-white/40" />}
            </div>
          )}
        </div>

        <Button size="lg" className="h-12 w-full touch-none text-base" variant={phase === "bite" ? "default" : phase === "fight" ? "secondary" : "default"} disabled={busy} {...holdHandlers}>
          {(phase === "caught" || phase === "lost") && <RotateCcw />}
          {buttonLabel}
        </Button>

        <p className="hidden text-center text-xs text-muted-foreground sm:block">{t("fishing.hint")}</p>

        {/* Bonuses bought with the country's Qzr keys, shared with the other games; kept in RemnaWeb, so signed in only. */}
        {signedIn && status && (
          <PerkShop
            keys={status.keys}
            progress={{ count: status.fish, nextKey: status.nextKey, keyFrom: status.keyFrom }}
            perks={status.perks}
            icons={PERK_ICONS}
            effect={perkEffect}
            locked={onWater}
            buying={buying}
            onBuy={(id) => void buyPerk(id)}
          />
        )}
      </main>
    </>
  );
}

/** A landed fish: its species in its rarity's color, its size, and what it sold for (or would sell for, signed in). */
function CatchCard({ fish, sold }: { fish: Catch; sold: boolean }) {
  const t = useTranslations();
  const { num, fixed } = useFormat();
  return (
    <div className="w-full max-w-60 rounded-2xl bg-card/95 p-4 shadow-xl ring-1 ring-foreground/10">
      <Fish className={cn("mx-auto size-12", RARITY_COLOR[fish.rarity])} />
      <p className="mt-2 font-heading text-lg font-bold">{fish.name}</p>
      <p className={cn("text-xs font-medium", RARITY_COLOR[fish.rarity])}>{t(`fishing.rarity.${fish.rarity}`)}</p>
      <p className="mt-1 text-sm text-muted-foreground tabular-nums">{t("fishing.kg", { kg: fixed(fish.kg, fish.kg < 10 ? 2 : 1) })}</p>
      <p className={cn("mt-2 flex items-center justify-center gap-1 font-heading text-xl font-bold tabular-nums", !sold && "text-muted-foreground line-through decoration-1")}>
        <QzrIcon className="size-5" /> +{num(fish.qzr)}
        {fish.bonus > 0 && (
          <span className="inline-flex items-center text-xs text-primary">
            <Gauge className="size-3" />+{num(fish.bonus)}
          </span>
        )}
      </p>
      {fish.keys > 0 && <p className="mt-1 text-xs font-medium text-primary">{t("fishing.keys", { n: fish.keys })}</p>}
      {!sold && <p className="mt-1 text-xs text-muted-foreground">{t("fishing.demo")}</p>}
    </div>
  );
}
