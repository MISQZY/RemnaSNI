"use client";

import { useTranslations } from "next-intl";
import { LogOut, MonitorX, Send, Settings } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { session, useSession } from "@/core/session";
import { ProfileAvatar, ProfileName } from "@/core/ui/profile-avatar";
import { cn } from "@/lib/utils";

type Props = {
  /** Whether sign-in is available: the site has REMNAWEB_URL. */
  signIn: boolean;
  /** Signed in: a line under the name, e.g. the sync status. */
  status?: ReactNode;
  /** Signed in: the game's items above sign-out (MenuButton). */
  actions?: ReactNode;
  /** The game's items at the bottom of the menu (MenuButton); signed out, behind a gear button, under `note`. */
  settings?: ReactNode;
  note?: ReactNode;
};

/** Telegram sign-in, or the signed-in account with sign-out on this and on every device; a game adds its own items. */
export function AccountMenu({ signIn, status, actions, settings, note }: Props) {
  const { token, account } = useSession();
  const t = useTranslations();

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        {signIn && <SignInButton />}
        {settings && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t("account.settings")}>
                <Settings />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              {note && (
                <>
                  <div className="p-3 text-xs text-muted-foreground">{note}</div>
                  <Separator />
                </>
              )}
              <div className="grid gap-1 p-1">{settings}</div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t("account.account")} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <ProfileAvatar account={account} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="space-y-1 p-3">
          <ProfileName account={account} className="truncate font-medium" />
          {status}
        </div>
        <Separator />
        <div className="grid gap-1 p-1">
          {actions}
          <MenuButton destructive onClick={session.signOut}>
            <LogOut /> {t("account.signOut")}
          </MenuButton>
          <MenuButton
            destructive
            onClick={async () => {
              const { error } = await session.signOutEverywhere();
              if (error) toast.error(error);
            }}
          >
            <MonitorX /> {t("account.signOutEverywhere")}
          </MenuButton>
        </div>
        {settings && (
          <>
            <Separator />
            <div className="grid gap-1 p-1">{settings}</div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Starts the Telegram sign-in through RemnaWeb (core/session.ts). */
export function SignInButton(props: ComponentProps<typeof Button>) {
  const t = useTranslations();
  return (
    <Button size="sm" onClick={() => location.assign(session.signInUrl())} {...props}>
      <Send /> {t("account.signIn")}
    </Button>
  );
}

/** An item of the account menu. */
export function MenuButton({ destructive, className, ...props }: ComponentProps<typeof Button> & { destructive?: boolean }) {
  return <Button variant="ghost" size="sm" className={cn("justify-start", destructive && "text-destructive hover:text-destructive", className)} {...props} />;
}
