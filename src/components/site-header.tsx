"use client";

import { Gamepad2, PawPrint, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountButton } from "@/components/account-button";
import { useConfig } from "@/components/config-provider";
import { useGame, useSync } from "@/components/game-runtime";
import { LanguageSwitch, useI18n } from "@/components/i18n-provider";
import { unlockedCount } from "@/lib/game";
import { cn } from "@/lib/utils";

export function SiteHeader({ code, name, account }: { code: string; name: string; account: boolean }) {
  const pathname = usePathname();
  const state = useGame();
  const pets = useSync().pets;
  const { achievements } = useConfig();
  const { t } = useI18n();

  const items = [
    { href: "/", label: t.header.play, icon: Gamepad2, extra: null },
    {
      href: "/achievements",
      label: t.header.achievements,
      icon: Trophy,
      extra: `${unlockedCount(state)}/${achievements.length}`,
    },
  ];
  // Pets are bought through RemnaWeb, so the shop only exists where sign-in does.
  if (account) {
    items.push({ href: "/pets", label: t.header.pets, icon: PawPrint, extra: pets && `${pets.owned.length}/${pets.kinds.length}` });
  }

  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-4 px-4 pt-6 lg:pt-10">
      <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("fi shrink-0 rounded-[3px] text-2xl shadow-xs", `fi-${code}`)} />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{t.header.subtitle}</p>
        </div>
      </Link>

      <div className="flex items-center gap-1 sm:order-last">
        <LanguageSwitch />
        <AccountButton signIn={account} />
      </div>

      <nav className="grid w-full auto-cols-fr grid-flow-col rounded-lg bg-muted p-[3px] sm:inline-grid sm:w-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-all [&_svg]:size-4",
                active
                  ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                  : "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
              )}
            >
              <item.icon />
              {item.label}
              {item.extra && <span className="hidden text-xs text-muted-foreground tabular-nums min-[480px]:inline">{item.extra}</span>}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
