"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { formatDuration, formatNumber } from "@/lib/format";
import { game } from "@/lib/game";
import { currentLocale, t } from "@/lib/i18n";
import { unlockName } from "@/lib/rules";
import { sync } from "@/lib/sync";

/** How often passive income from the turbo is credited; it is counted by the time passed, so a second is enough. */
const TICK_MS = 1_000;

export function useGame() {
  return useSyncExternalStore(game.subscribe, game.getSnapshot, game.getServerSnapshot);
}

export function useSync() {
  return useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getServerSnapshot);
}

/**
 * Loads the saved game, persists it when the page hides and announces unlocked achievements.
 * With `syncEnabled` (REMNAWEB_URL set on the server) it also keeps the progress of a signed-in player in sync.
 */
export function GameRuntime({ syncEnabled, country }: { syncEnabled: boolean; country: string }) {
  useEffect(() => {
    const away = game.hydrate();
    if (away.gain >= 1 && away.seconds >= 60) {
      const locale = currentLocale();
      toast.success(t().clicker.welcomeBack, {
        description: t().clicker.awayIncome(formatNumber(away.gain, false, locale), formatDuration(away.seconds, locale)),
      });
    }
    // Hidden tabs skip the ticks: the income is credited by the time passed once the tab is back.
    const ticker = setInterval(() => document.visibilityState === "visible" && game.tick(), TICK_MS);
    game.onUnlock((ids) => {
      for (const id of ids) {
        const name = unlockName(config(), id);
        if (name) toast.success(t().achievements.toast, { description: t().achievements.toastBonus(name[currentLocale()], Math.round(config().achievementBonus * 100)) });
      }
    });
    const stopSync = syncEnabled ? sync.start(country) : null;

    const onHide = () => document.visibilityState === "hidden" && game.save();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", game.save);
    return () => {
      clearInterval(ticker);
      stopSync?.();
      game.onUnlock(null);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", game.save);
      game.save();
    };
  }, [syncEnabled, country]);

  return null;
}
