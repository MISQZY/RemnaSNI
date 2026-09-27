"use client";

import { ArrowUp, PawPrint, Pin, PinOff, Send, Sparkles, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "@/components/config-provider";
import { useGame, useSync } from "@/components/game-runtime";
import { useI18n } from "@/components/i18n-provider";
import { PetSprite } from "@/components/pet-sprite";
import { QzrIcon } from "@/components/qzr-icon";
import { UpgradeWheel, landingAngle, spinTo } from "@/components/upgrade-wheel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RARITIES, RARITY_COLOR, nextRarity, petLook, petText, soldOut, type OwnedPet, type PetKind, type PetRarity, type Pets, type Rarity } from "@/lib/pets";
import { sync as syncApi } from "@/lib/sync";
import { cn } from "@/lib/utils";

/** How long the result stays on the wheel before the pets list is updated, ms. */
const RESULT_MS = 1500;
const percent = (chance: number) => `${Math.round(chance * 1000) / 10}%`;

export function PetShop() {
  const s = useSync();
  const state = useGame();
  const { t, num, locale } = useI18n();
  const { maxPinnedPets } = useConfig();
  const [pinning, setPinning] = useState<number | null>(null);

  // Fresh series counters: somebody may have just taken the last one.
  useEffect(() => {
    if (s.token) void syncApi.syncNow();
  }, [s.token]);

  if (!s.enabled || !s.token) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <Card>
          <CardContent className="items-center gap-3 py-6 text-center">
            <PawPrint className="size-8 text-primary" />
            <p className="font-semibold">{t.pets.shopTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t.pets.intro} {s.enabled ? t.pets.introSignIn : t.pets.introDisabled}
            </p>
            {s.enabled && (
              <Button size="sm" onClick={() => location.assign(syncApi.signInUrl())}>
                <Send /> {t.account.signIn}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!s.pets) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t.pets.loading}</p>;
  }

  const { kinds, owned, rarities = [] } = s.pets;
  const kindOf = new Map(kinds.map((k) => [k.id, k]));
  const pinnedCount = owned.filter((p) => p.pinned).length;
  const kindsOwned = new Set(owned.map((p) => p.kind)).size;
  const mine = [...owned].sort(
    (a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.kind.localeCompare(b.kind) || a.serial - b.serial,
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardDescription>{t.pets.title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {kindsOwned} <span className="text-muted-foreground">/ {kinds.length}</span>
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="tabular-nums">
              <QzrIcon /> {num(state.points)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="gap-2">
          <Progress value={kinds.length ? (kindsOwned / kinds.length) * 100 : 0} />
          <p className="text-xs text-muted-foreground">{t.pets.paidWith}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="shop">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="shop" className="sm:px-4">
            <span className="inline-flex items-baseline gap-1.5">
              {t.pets.shop} <span className="text-xs text-muted-foreground tabular-nums">{kinds.length}</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="mine" className="sm:px-4">
            <span className="inline-flex items-baseline gap-1.5">
              {t.pets.mine} <span className="text-xs text-muted-foreground tabular-nums">{owned.length}</span>
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="shop" className="mt-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kinds.map((k) => (
              <ShopCard key={k.id} kind={k} points={state.points} owned={owned.filter((p) => p.kind === k.id).length} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="mine" className="mt-2 space-y-3">
          {mine.length ? (
            <>
              <p className="text-xs text-muted-foreground tabular-nums">{t.pets.pinnedHint(pinnedCount, maxPinnedPets)}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {mine.map((pet) => {
                  const k = kindOf.get(pet.kind);
                  if (!k) return null;
                  return (
                    <OwnedCard
                      key={pet.id}
                      kind={k}
                      pet={pet}
                      rarities={rarities}
                      busy={pinning !== null}
                      full={pinnedCount >= maxPinnedPets}
                      onPin={async () => {
                        setPinning(pet.id);
                        const { error } = await syncApi.pinPet(pet.id, !pet.pinned);
                        setPinning(null);
                        if (!error) return;
                        const name = petText(k, locale).name;
                        toast.error(pet.pinned ? t.pets.unpinFailed(name) : t.pets.pinFailed(name), { description: error });
                      }}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.pets.noneYet}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PetTitle({ kind: k, rarity }: { kind: PetKind; rarity: PetRarity }) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold">{petText(k, locale).name}</p>
      <p className={cn("text-[11px] font-medium tracking-wide uppercase", RARITY_COLOR[rarity])}>{t.pets.rarity[rarity]}</p>
    </div>
  );
}

function ShopCard({ kind: k, points, owned }: { kind: PetKind; points: number; owned: number }) {
  const { t, num, locale } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const gone = soldOut(k);
  const canBuy = !gone && points >= k.price;
  const text = petText(k, locale);

  async function buy() {
    // Pets are pricey: the first press only asks to confirm.
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    setBusy(true);
    const result = await syncApi.buyPet(k.id);
    setBusy(false);
    if ("error" in result) {
      toast.error(t.pets.buyFailed(text.name), { description: result.error });
      return;
    }
    toast.success(`${k.emoji} ${t.pets.bought(text.name)}`, {
      description: t.pets.boughtHint(t.pets.serialOf(result.pet.serial, k.supply)),
    });
  }

  let label: React.ReactNode = (
    <>
      <QzrIcon /> {num(k.price)}
    </>
  );
  if (gone) label = t.pets.soldOut;
  else if (busy) label = t.pets.adopting;
  else if (confirming) label = t.pets.confirm;

  return (
    <Card size="sm" className={cn(!canBuy && "bg-card/60")}>
      <CardContent className="flex-1 items-center gap-2 text-center">
        <PetSprite pet={petLook(k, k.rarity, "shop")} size={80} locked={gone} />
        <PetTitle kind={k} rarity={k.rarity} />
        <p className="text-xs text-muted-foreground">{text.description}</p>
        <p className={cn("text-[11px] text-muted-foreground tabular-nums", gone && "text-destructive")}>
          {gone ? t.pets.goneAll : k.supply === null ? t.pets.minted(num(k.minted)) : t.pets.left(num(k.supply - k.minted), num(k.supply))}
          {owned > 0 && ` · ${t.pets.owned(num(owned))}`}
        </p>
        {!gone && !canBuy && <Progress value={Math.min(100, (points / k.price) * 100)} className="h-1 w-full" />}
        <Button
          size="sm"
          className="mt-auto w-full tabular-nums"
          variant={canBuy ? "default" : "secondary"}
          disabled={!canBuy || busy}
          onClick={() => void buy()}
        >
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}

function OwnedCard({
  kind: k,
  pet,
  rarities,
  busy,
  full,
  onPin,
}: {
  kind: PetKind;
  pet: OwnedPet;
  rarities: Rarity[];
  busy: boolean;
  /** No room left for one more pinned pet. */
  full: boolean;
  onPin: () => void;
}) {
  const { t, date } = useI18n();
  const chance = rarities.find((r) => r.id === pet.rarity)?.chance ?? 0;
  return (
    <Card size="sm" className={cn(pet.pinned && "ring-primary/50")}>
      <CardContent className="flex-1 items-center gap-2 text-center">
        <PetSprite pet={petLook(k, pet.rarity, pet.id)} size={80} />
        <PetTitle kind={k} rarity={pet.rarity} />
        <p className="font-mono text-sm font-semibold tabular-nums">
          {t.pets.numberSign}
          {pet.serial}
          {pet.supply !== null && <span className="text-muted-foreground"> / {pet.supply}</span>}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className={cn("fi rounded-[2px]", `fi-${pet.country}`)} /> {date(pet.createdAt)}
        </p>
        <div className="mt-auto grid w-full gap-1.5">
          <Button size="sm" variant={pet.pinned ? "secondary" : "outline"} disabled={busy || (!pet.pinned && full)} onClick={onPin}>
            {pet.pinned ? (
              <>
                <PinOff /> {t.pets.unpin}
              </>
            ) : (
              <>
                <Pin /> {t.pets.pin}
              </>
            )}
          </Button>
          {pet.listing ? (
            <Button size="sm" variant="ghost" disabled>
              {t.pets.upgradeListed}
            </Button>
          ) : chance > 0 ? (
            <Upgrader kind={k} pet={pet} chance={chance} />
          ) : (
            <Button size="sm" variant="ghost" disabled>
              {t.pets.upgradeMax}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type UpgradeResult = { success: boolean; pet: OwnedPet | null; pets: Pets | null };

/** The upgrader in a popover: the odds on a wheel, a confirming second press, the spin and its result. */
function Upgrader({ kind: k, pet, chance }: { kind: PetKind; pet: OwnedPet; chance: number }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<"ready" | "rolling" | "won" | "lost">("ready");
  const [rotation, setRotation] = useState(0);
  /** RemnaWeb's answer, played out once the needle stops. */
  const pending = useRef<UpgradeResult | null>(null);
  const rolling = phase === "rolling";
  const next = nextRarity(pet.rarity);
  const name = petText(k, locale).name;

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  async function roll() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setPhase("rolling");
    const result = await syncApi.upgradePet(pet.id);
    if ("error" in result) {
      setPhase("ready");
      toast.error(t.pets.upgradeFailed, { description: result.error });
      return;
    }
    pending.current = result;
    setRotation((r) => spinTo(r, landingAngle(chance, result.success)));
  }

  function stopped() {
    const result = pending.current;
    if (!result) return;
    pending.current = null;
    setPhase(result.success ? "won" : "lost");
    if (result.success && result.pet) {
      toast.success(`${k.emoji} ${t.pets.upgradeWon(name, t.pets.rarity[result.pet.rarity])}`, {
        description: t.pets.serialOf(result.pet.serial, result.pet.supply),
      });
    } else {
      toast.error(t.pets.upgradeLost(name));
    }
    // Let the result sink in, then show the new pets (a lost one leaves the list, and this popover with it).
    setTimeout(() => {
      setOpen(false);
      setPhase("ready");
      syncApi.applyPets(result.pets);
    }, RESULT_MS);
  }

  return (
    <Popover open={open} onOpenChange={(o) => !rolling && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowUp /> {t.pets.upgrade}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="font-medium">{t.pets.upgradeTitle}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t.pets.upgradeHint}</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">{t.pets.upgradeBecomes}</p>
            {next && <p className={cn("text-xs font-medium uppercase", RARITY_COLOR[next])}>{t.pets.rarity[next]}</p>}
          </div>
          <div className="rounded-lg bg-muted/60 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">{t.pets.upgradeChance}</p>
            <p className="font-semibold tabular-nums">{percent(chance)}</p>
          </div>
        </div>
        <UpgradeWheel
          chance={chance}
          rotation={rotation}
          spinning={rolling}
          result={phase === "won" || phase === "lost" ? phase : null}
          arcClassName={next ? RARITY_COLOR[next] : undefined}
          onStop={stopped}
        >
          <div className={cn("transition-all duration-500", phase === "lost" && "scale-75 opacity-20 grayscale")}>
            <PetSprite pet={petLook(k, phase === "won" && next ? next : pet.rarity, pet.id)} size={64} pulse={phase === "won" ? 1 : 0} />
          </div>
        </UpgradeWheel>
        <Button
          className="h-auto min-h-8 w-full py-1.5 whitespace-normal"
          size="sm"
          variant={armed ? "destructive" : "default"}
          disabled={phase !== "ready"}
          onClick={() => void roll()}
        >
          <Zap />
          {rolling ? t.pets.upgradeRolling : armed ? t.pets.upgradeConfirm : t.pets.upgradeGo(percent(chance))}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
