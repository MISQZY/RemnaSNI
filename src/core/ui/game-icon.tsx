import { ChipIcon } from "@/core/ui/chip-icon";
import {
  Award,
  BadgePercent,
  Banknote,
  Cable,
  ChartSpline,
  Coins,
  Crown,
  Fish,
  Flame,
  Gem,
  Hand,
  HandMetal,
  Heart,
  KeyRound,
  Landmark,
  Magnet,
  Moon,
  MousePointerClick,
  Music,
  PiggyBank,
  ShoppingBag,
  Skull,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Turtle,
  Wallet,
  Waves,
  Wheat,
  Worm,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Icons RemnaWeb names (the clicker config, the games' bonuses) and the games' own on the hub, imported one by
// one: lucide's DynamicIcon ships a loader for every icon lucide has and fetches each one after render. Keep in step
// with RemnaWeb's components/clicker/game-icon.tsx.
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  "badge-percent": BadgePercent,
  banknote: Banknote,
  cable: Cable,
  "chart-spline": ChartSpline,
  coins: Coins,
  crown: Crown,
  fish: Fish,
  flame: Flame,
  gem: Gem,
  hand: Hand,
  "hand-metal": HandMetal,
  heart: Heart,
  "key-round": KeyRound,
  landmark: Landmark,
  magnet: Magnet,
  moon: Moon,
  "mouse-pointer-click": MousePointerClick,
  music: Music,
  "piggy-bank": PiggyBank,
  "shopping-bag": ShoppingBag,
  skull: Skull,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  target: Target,
  timer: Timer,
  "trending-up": TrendingUp,
  trophy: Trophy,
  turtle: Turtle,
  wallet: Wallet,
  waves: Waves,
  wheat: Wheat,
  worm: Worm,
  zap: Zap,
};

/** An icon by its kebab-case lucide name; unknown names get a sparkle. */
export function GameIcon({ name, className }: { name: string; className?: string }) {
  // Our own icon, in its brand colors.
  if (name === "chip") return <ChipIcon className={className} />;
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}
