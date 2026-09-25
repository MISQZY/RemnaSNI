"use client";

import { Coins, PawPrint, Pin, PinOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGame, useSync } from "@/components/game-runtime";
import { useI18n } from "@/components/i18n-provider";
import { PetSprite } from "@/components/pet-sprite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_PINNED, RARITY_COLOR, petText, soldOut, type OwnedPet, type PetKind } from "@/lib/pets";
import { sync as syncApi } from "@/lib/sync";
import { cn } from "@/lib/utils";

export function PetShop() {
  const s = useSync();
  const state = useGame();
  const { t, num, locale } = useI18n();
  const [pinning, setPinning] = useState<string | null>(null);

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

  const { kinds, owned } = s.pets;
  const ownedBy = new Map(owned.map((p) => [p.kind, p]));
  const pinnedCount = owned.filter((p) => p.pinned).length;
  const shop = kinds.filter((k) => !ownedBy.has(k.id));
  const mine = owned.flatMap((p) => kinds.find((k) => k.id === p.kind) ?? []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader>
          <CardDescription>{t.pets.title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {owned.length} <span className="text-muted-foreground">/ {kinds.length}</span>
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="tabular-nums">
              <Coins /> {num(state.points)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="gap-2">
          <Progress value={kinds.length ? (owned.length / kinds.length) * 100 : 0} />
          <p className="text-xs text-muted-foreground">{t.pets.paidWith}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="shop">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="shop" className="sm:px-4">
            {t.pets.shop} <span className="text-xs text-muted-foreground tabular-nums">{shop.length}</span>
          </TabsTrigger>
          <TabsTrigger value="mine" className="sm:px-4">
            {t.pets.mine} <span className="text-xs text-muted-foreground tabular-nums">{owned.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="shop" className="mt-2">
          {shop.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shop.map((k) => (
                <ShopCard key={k.id} kind={k} points={state.points} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.pets.allAdopted}</p>
          )}
        </TabsContent>
        <TabsContent value="mine" className="mt-2 space-y-3">
          {mine.length ? (
            <>
              <p className="text-xs text-muted-foreground tabular-nums">{t.pets.pinnedHint(pinnedCount, MAX_PINNED)}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {mine.map((k) => {
                  const pet = ownedBy.get(k.id)!;
                  return (
                    <OwnedCard
                      key={k.id}
                      kind={k}
                      pet={pet}
                      busy={pinning !== null}
                      full={pinnedCount >= MAX_PINNED}
                      onPin={async () => {
                        setPinning(k.id);
                        const { error } = await syncApi.pinPet(k.id, !pet.pinned);
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

function PetTitle({ kind: k }: { kind: PetKind }) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold">{petText(k, locale).name}</p>
      <p className={cn("text-[11px] font-medium tracking-wide uppercase", RARITY_COLOR[k.rarity])}>{t.pets.rarity[k.rarity]}</p>
    </div>
  );
}

function ShopCard({ kind: k, points }: { kind: PetKind; points: number }) {
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
      <Coins /> {num(k.price)}
    </>
  );
  if (gone) label = t.pets.soldOut;
  else if (busy) label = t.pets.adopting;
  else if (confirming) label = t.pets.confirm;

  return (
    <Card size="sm" className={cn(!canBuy && "bg-card/60")}>
      <CardContent className="flex-1 items-center gap-2 text-center">
        <PetSprite pet={k} size={80} locked={gone} />
        <PetTitle kind={k} />
        <p className="text-xs text-muted-foreground">{text.description}</p>
        <p className={cn("text-[11px] text-muted-foreground tabular-nums", gone && "text-destructive")}>
          {gone
            ? t.pets.goneAll
            : k.supply === null
              ? t.pets.minted(num(k.minted))
              : t.pets.left(num(k.supply - k.minted), num(k.supply))}
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
  busy,
  full,
  onPin,
}: {
  kind: PetKind;
  pet: OwnedPet;
  busy: boolean;
  /** No room left for one more pinned pet. */
  full: boolean;
  onPin: () => void;
}) {
  const { t, date } = useI18n();
  return (
    <Card size="sm" className={cn(pet.pinned && "ring-primary/50")}>
      <CardContent className="flex-1 items-center gap-2 text-center">
        <PetSprite pet={k} size={80} />
        <PetTitle kind={k} />
        <p className="font-mono text-sm font-semibold tabular-nums">
          {t.pets.numberSign}
          {pet.serial}
          {k.supply !== null && <span className="text-muted-foreground"> / {k.supply}</span>}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className={cn("fi rounded-[2px]", `fi-${pet.country}`)} /> {date(pet.createdAt)}
        </p>
        <Button
          size="sm"
          variant={pet.pinned ? "secondary" : "outline"}
          className="mt-auto w-full"
          disabled={busy || (!pet.pinned && full)}
          onClick={onPin}
        >
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
      </CardContent>
    </Card>
  );
}
