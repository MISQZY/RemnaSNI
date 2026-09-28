"use client";

import type { ReactNode } from "react";
import { LanguageSwitch } from "@/core/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * The header of every game: the node's flag and name with the game's `subtitle`, the language and `account`
 * (an AccountMenu with the game's items). `className` sets its width to the game's.
 */
export function SiteHeader({ code, name, subtitle, account, className }: { code: string; name: string; subtitle: ReactNode; account: ReactNode; className?: string }) {
  return (
    <header className={cn("mx-auto flex w-full items-center gap-3 px-4 pt-6 lg:pt-10", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("fi shrink-0 rounded-[3px] text-2xl shadow-xs", `fi-${code}`)} />
        <div className="min-w-0">
          <p className="truncate font-heading text-xl font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <LanguageSwitch />
        {account}
      </div>
    </header>
  );
}
