"use client";

import { useTranslations } from "next-intl";
import { CloudCheck, CloudOff, HardDrive, LoaderCircle, RefreshCw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFormat } from "@/core/i18n/provider";
import { AccountMenu, MenuButton } from "@/core/ui/account-menu";
import { game } from "@/games/clicker/game";
import { useSync } from "@/games/clicker/game-runtime";
import { sync, type SyncState } from "@/games/clicker/sync";
import { cn } from "@/lib/utils";

/** The account menu with the sync status, a sync on demand and the progress reset, which is there signed out too. */
export function ClickerAccount({ signIn }: { signIn: boolean }) {
  const s = useSync();
  const t = useTranslations();
  return (
    <AccountMenu
      signIn={signIn}
      status={<SyncLine state={s} />}
      actions={
        <MenuButton disabled={s.status === "syncing"} onClick={() => void sync.syncNow()}>
          <RefreshCw /> {t("clicker.sync.now")}
        </MenuButton>
      }
      note={
        <span className="flex items-center gap-1.5">
          <HardDrive className="size-3.5" /> {t("clicker.sync.local")}
        </span>
      }
      settings={<ResetButton />}
    />
  );
}

function SyncLine({ state }: { state: SyncState }) {
  const t = useTranslations();
  const { time } = useFormat();
  const line = {
    idle: { icon: CloudCheck, text: t("clicker.sync.idle") },
    syncing: { icon: LoaderCircle, text: t("clicker.sync.syncing") },
    synced: { icon: CloudCheck, text: t("clicker.sync.synced", { time: state.syncedAt ? time(state.syncedAt) : "—" }) },
    offline: { icon: CloudOff, text: t("clicker.sync.offline") },
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
  const t = useTranslations();
  return (
    <MenuButton
      destructive={!armed}
      variant={armed ? "destructive" : "ghost"}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
          return;
        }
        setArmed(false);
        game.reset();
        toast(t("clicker.reset.done"));
      }}
    >
      <RotateCcw /> {armed ? t("clicker.reset.confirm") : t("clicker.reset.label")}
    </MenuButton>
  );
}
