"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageSwitch } from "@/core/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * The header of every page: the node's flag and name with the page's `subtitle`, a link to the hub of the node's
 * games at / (app/page.tsx), the language and `account` (an AccountMenu with the game's items). `className` sets its
 * width to the page's.
 */
export function SiteHeader({ code, name, subtitle, account, className }: { code: string; name: string; subtitle: ReactNode; account: ReactNode; className?: string }) {
  const t = useTranslations("header");
  return (
    <header className={cn("mx-auto flex w-full items-center gap-3 px-4 pt-6 lg:pt-10", className)}>
      <Link href="/" aria-label={t("allGames")} title={t("allGames")} className="flex min-w-0 flex-1 items-center gap-3">
        {/* The flag is what tells one node from another: large, framed like a print. */}
        <span className={cn("fi shrink-0 rounded-[4px] text-[2.5rem] ring-1 ring-foreground/10", `fi-${code}`)} />
        <div className="min-w-0">
          <p className="truncate font-heading text-xl leading-tight font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </Link>
      <div className="flex items-center gap-1">
        <LanguageSwitch />
        {account}
      </div>
    </header>
  );
}
