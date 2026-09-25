import {
  Award,
  Banknote,
  Coins,
  Crown,
  Flame,
  Gem,
  Hand,
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
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { GameState } from "@/lib/game";
import { UPGRADES } from "@/lib/upgrades";

export type TapInfo = { gain: number; crit: boolean; /** Taps within the last 2 s, this one included. */ burst: number; hour: number };

export type Achievement = {
  /** Name and description are in the dictionaries (`achievements.items`) under this id. */
  id: string;
  icon: LucideIcon;
  /** Name and description stay hidden until unlocked. */
  secret?: boolean;
  check: (s: GameState, tap?: TapInfo) => boolean;
  /** Current value and target, for a progress bar on locked achievements. */
  progress?: (s: GameState) => [number, number];
};

function counter(id: string, icon: LucideIcon, value: (s: GameState) => number, target: number): Achievement {
  return { id, icon, check: (s) => value(s) >= target, progress: (s) => [Math.min(value(s), target), target] };
}

const totalLevels = (s: GameState) => UPGRADES.reduce((acc, u) => acc + (s.levels[u.id] ?? 0), 0);
const ownedKinds = (s: GameState) => UPGRADES.filter((u) => (s.levels[u.id] ?? 0) > 0).length;

export const ACHIEVEMENTS: Achievement[] = [
  counter("tap-1", MousePointerClick, (s) => s.taps, 1),
  counter("tap-100", Hand, (s) => s.taps, 100),
  counter("tap-1k", Target, (s) => s.taps, 1_000),
  counter("tap-10k", Zap, (s) => s.taps, 10_000),
  counter("tap-100k", Crown, (s) => s.taps, 100_000),

  counter("earn-1k", Coins, (s) => s.totalEarned, 1_000),
  counter("earn-100k", PiggyBank, (s) => s.totalEarned, 100_000),
  counter("earn-1m", Wallet, (s) => s.totalEarned, 1_000_000),
  counter("earn-100m", Banknote, (s) => s.totalEarned, 100_000_000),
  counter("earn-1b", Landmark, (s) => s.totalEarned, 1_000_000_000),

  counter("crit-1", Sparkles, (s) => s.crits, 1),
  counter("crit-100", Star, (s) => s.crits, 100),
  counter("crit-1k", Swords, (s) => s.crits, 1_000),
  counter("best-1k", Flame, (s) => s.bestTap, 1_000),
  counter("best-100k", Gem, (s) => s.bestTap, 100_000),

  counter("buy-1", ShoppingBag, totalLevels, 1),
  counter("buy-50", Award, totalLevels, 50),
  counter("buy-all", Trophy, ownedKinds, UPGRADES.length),
  { id: "anthem", icon: Music, check: (s) => (s.levels.anthem ?? 0) > 0 },

  { id: "frenzy", icon: Timer, check: (_, tap) => !!tap && tap.burst >= 15 },
  {
    id: "night-owl",
    icon: Moon,
    secret: true,
    check: (_, tap) => !!tap && tap.hour >= 2 && tap.hour < 5,
  },
];
