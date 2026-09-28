import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { lookStyle } from "@/lib/look";
import type { Account } from "@/lib/session";

const initials = (name: string) =>
  name
    .replace(/^@/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The signed-in player's avatar with the glow and frame they bought in RemnaWeb. */
export function ProfileAvatar({ account }: { account: Account | null }) {
  const name = account?.name ?? "Telegram";
  const { frame, glow } = account?.look ?? {};
  let avatar = (
    <Avatar size="lg">
      {account?.photoUrl && <AvatarImage src={account.photoUrl} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
  if (frame) {
    avatar = (
      <span className="inline-flex shrink-0 rounded-full p-[2px]" style={lookStyle(frame)}>
        {/* An opaque backing, so initials do not let the frame show through: only the ring does. */}
        <span className="inline-flex rounded-full bg-background">{avatar}</span>
      </span>
    );
  }
  if (glow) {
    avatar = (
      <span className="relative inline-flex shrink-0">
        <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-full opacity-70 blur-sm" style={lookStyle(glow)} />
        <span className="relative inline-flex">{avatar}</span>
      </span>
    );
  }
  return avatar;
}

/** The player's name in the color they bought, with their title under it. */
export function ProfileName({ account, className }: { account: Account | null; className?: string }) {
  const look = account?.look;
  return (
    <div className="min-w-0">
      <p className={className} style={lookStyle(look?.color, true)}>
        {account?.name ?? "Telegram"}
      </p>
      {look?.title && <p className="mt-0.5 truncate text-xs font-medium text-primary">{look.title}</p>}
    </div>
  );
}
