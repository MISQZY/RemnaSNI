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
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Name and description stay hidden until unlocked. */
  secret?: boolean;
  check: (s: GameState, tap?: TapInfo) => boolean;
  /** Current value and target, for a progress bar on locked achievements. */
  progress?: (s: GameState) => [number, number];
};

function counter(
  id: string,
  name: string,
  description: string,
  icon: LucideIcon,
  value: (s: GameState) => number,
  target: number,
): Achievement {
  return { id, name, description, icon, check: (s) => value(s) >= target, progress: (s) => [Math.min(value(s), target), target] };
}

const totalLevels = (s: GameState) => UPGRADES.reduce((acc, u) => acc + (s.levels[u.id] ?? 0), 0);
const ownedKinds = (s: GameState) => UPGRADES.filter((u) => (s.levels[u.id] ?? 0) > 0).length;

export const ACHIEVEMENTS: Achievement[] = [
  counter("tap-1", "First Tap", "Tap the flag once", MousePointerClick, (s) => s.taps, 1),
  counter("tap-100", "Warming Up", "Tap 100 times", Hand, (s) => s.taps, 100),
  counter("tap-1k", "Dedicated", "Tap 1,000 times", Target, (s) => s.taps, 1_000),
  counter("tap-10k", "Tap Machine", "Tap 10,000 times", Zap, (s) => s.taps, 10_000),
  counter("tap-100k", "Legendary Finger", "Tap 100,000 times", Crown, (s) => s.taps, 100_000),

  counter("earn-1k", "Pocket Change", "Earn 1,000 points in total", Coins, (s) => s.totalEarned, 1_000),
  counter("earn-100k", "Saver", "Earn 100,000 points in total", PiggyBank, (s) => s.totalEarned, 100_000),
  counter("earn-1m", "Millionaire", "Earn 1M points in total", Wallet, (s) => s.totalEarned, 1_000_000),
  counter("earn-100m", "Tycoon", "Earn 100M points in total", Banknote, (s) => s.totalEarned, 100_000_000),
  counter("earn-1b", "Billionaire", "Earn 1B points in total", Landmark, (s) => s.totalEarned, 1_000_000_000),

  counter("crit-1", "Lucky Strike", "Land a critical tap", Sparkles, (s) => s.crits, 1),
  counter("crit-100", "Fortune's Favorite", "Land 100 critical taps", Star, (s) => s.crits, 100),
  counter("crit-1k", "Crit Master", "Land 1,000 critical taps", Swords, (s) => s.crits, 1_000),
  counter("best-1k", "Heavy Hand", "Earn 1,000 points with a single tap", Flame, (s) => s.bestTap, 1_000),
  counter("best-100k", "Earthquake", "Earn 100,000 points with a single tap", Gem, (s) => s.bestTap, 100_000),

  counter("buy-1", "Investor", "Buy your first upgrade", ShoppingBag, totalLevels, 1),
  counter("buy-50", "Collector", "Own 50 upgrade levels", Award, totalLevels, 50),
  counter("buy-all", "Completionist", "Own every kind of upgrade", Trophy, ownedKinds, UPGRADES.length),
  {
    id: "anthem",
    name: "Patriot",
    description: "Buy the National Anthem",
    icon: Music,
    check: (s) => (s.levels.anthem ?? 0) > 0,
  },

  {
    id: "frenzy",
    name: "Frenzy",
    description: "Tap 15 times within 2 seconds",
    icon: Timer,
    check: (_, tap) => !!tap && tap.burst >= 15,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Tap the flag between 2 and 5 AM",
    icon: Moon,
    secret: true,
    check: (_, tap) => !!tap && tap.hour >= 2 && tap.hour < 5,
  },
];
