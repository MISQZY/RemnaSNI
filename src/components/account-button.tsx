"use client";

import { CloudCheck, CloudOff, HardDrive, LoaderCircle, LogOut, RefreshCw, RotateCcw, Send, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSync } from "@/components/game-runtime";
import { useI18n } from "@/components/i18n-provider";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { game } from "@/lib/game";
import { sync, type SyncState } from "@/lib/sync";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .replace(/^@/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Telegram sign-in button, or the signed-in account with its sync status. Both menus hold the progress reset. */
export function AccountButton({ signIn }: { signIn: boolean }) {
  const s = useSync();
  const { t } = useI18n();

  if (!s.token) {
    return (
      <div className="flex items-center gap-2">
        {signIn && (
          <Button size="sm" onClick={() => location.assign(sync.signInUrl())}>
            <Send /> {t.account.signIn}
          </Button>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t.account.settings}>
              <Settings />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <p className="flex items-center gap-1.5 p-3 text-xs text-muted-foreground">
              <HardDrive className="size-3.5" /> {t.account.savedLocally}
            </p>
            <Separator />
            <div className="grid gap-1 p-1">
              <ResetButton />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const name = s.account?.name ?? "Telegram";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t.account.account} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar size="lg">
            {s.account?.photoUrl && <AvatarImage src={s.account.photoUrl} alt="" />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
            <AvatarBadge className={cn(s.status === "offline" && "bg-warning")} />
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="space-y-1 p-3">
          <p className="truncate font-medium">{name}</p>
          <SyncLine state={s} />
        </div>
        <Separator />
        <div className="grid gap-1 p-1">
          <Button variant="ghost" size="sm" className="justify-start" disabled={s.status === "syncing"} onClick={() => void sync.syncNow()}>
            <RefreshCw /> {t.account.syncNow}
          </Button>
          <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive" onClick={sync.signOut}>
            <LogOut /> {t.account.signOut}
          </Button>
        </div>
        <Separator />
        <div className="grid gap-1 p-1">
          <ResetButton />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SyncLine({ state }: { state: SyncState }) {
  const { t, time } = useI18n();
  const line = {
    idle: { icon: CloudCheck, text: t.account.idle },
    syncing: { icon: LoaderCircle, text: t.account.syncing },
    synced: { icon: CloudCheck, text: t.account.synced(state.syncedAt ? time(state.syncedAt) : "—") },
    offline: { icon: CloudOff, text: t.account.offline },
  }[state.status];

  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", state.status === "offline" && "text-warning")}>
      <line.icon className={cn("size-3.5", state.status === "syncing" && "animate-spin")} /> {line.text}
    </p>
  );
}

/** Wipes the game; the first click only arms it so a stray tap does nothing. */
function ResetButton() {
  const [armed, setArmed] = useState(false);
  const { t } = useI18n();
  return (
    <Button
      variant={armed ? "destructive" : "ghost"}
      size="sm"
      className={cn("justify-start", !armed && "text-destructive hover:text-destructive")}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
          return;
        }
        setArmed(false);
        game.reset();
        toast(t.account.resetDone);
      }}
    >
      <RotateCcw /> {armed ? t.account.resetConfirm : t.account.reset}
    </Button>
  );
}
