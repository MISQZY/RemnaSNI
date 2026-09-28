"use client";

import { useTranslations } from "next-intl";
import { AccountButton } from "@/components/account-button";
import { LanguageSwitch } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/** The node's flag and name, the language and the account. The clicker is a single page: no tabs. */
export function SiteHeader({ code, name, account }: { code: string; name: string; account: boolean }) {
  const t = useTranslations();
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-6 lg:pt-10">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("fi shrink-0 rounded-[3px] text-2xl shadow-xs", `fi-${code}`)} />
        <div className="min-w-0">
          <p className="truncate font-heading text-xl font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{t("header.subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <LanguageSwitch />
        <AccountButton signIn={account} />
      </div>
    </header>
  );
}
