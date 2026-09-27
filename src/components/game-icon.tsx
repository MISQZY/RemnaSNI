import { ChipIcon } from "@/components/chip-icon";
import {
  Award,
  BadgePercent,
  Banknote,
  Coins,
  Crown,
  Flame,
  Gem,
  Hand,
  HandMetal,
  KeyRound,
  Landmark,
  Moon,
  MousePointerClick,
  Music,
  PiggyBank,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Icons of the game config RemnaWeb sends (its lib/clicker/config.ts), imported one by one: lucide's
// DynamicIcon ships a loader for every icon lucide has and fetches each one after render. Keep in step
// with RemnaWeb's components/clicker/game-icon.tsx.
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  "badge-percent": BadgePercent,
  banknote: Banknote,
  coins: Coins,
  crown: Crown,
  flame: Flame,
  gem: Gem,
  hand: Hand,
  "hand-metal": HandMetal,
  "key-round": KeyRound,
  landmark: Landmark,
  moon: Moon,
  "mouse-pointer-click": MousePointerClick,
  music: Music,
  "piggy-bank": PiggyBank,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  target: Target,
  timer: Timer,
  "trending-up": TrendingUp,
  trophy: Trophy,
  wallet: Wallet,
  zap: Zap,
};

/** A game config icon by its kebab-case lucide name; unknown names get a sparkle. */
export function GameIcon({ name, className }: { name: string; className?: string }) {
  // Our own icon, in its brand colors.
  if (name === "chip") return <ChipIcon className={className} />;
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}
