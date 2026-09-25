import { Crown, Flame, Gem, Hand, HandMetal, Music, Sparkles, Zap, type LucideIcon } from "lucide-react";

export type UpgradeKind = "tap" | "crit" | "critPower" | "boost";

export type Upgrade = {
  /** Name and description are in the dictionaries (`upgrades.items`) under this id. */
  id: string;
  kind: UpgradeKind;
  icon: LucideIcon;
  baseCost: number;
  /** Cost multiplier per owned level. */
  growth: number;
  /** Per level: points per tap, crit chance, crit multiplier or income bonus, depending on kind. */
  amount: number;
  maxLevel?: number;
};

export const UPGRADES: Upgrade[] = [
  { id: "finger", kind: "tap", icon: Hand, baseCost: 25, growth: 1.3, amount: 1 },
  { id: "double", kind: "tap", icon: HandMetal, baseCost: 400, growth: 1.32, amount: 4 },
  { id: "gloves", kind: "tap", icon: Zap, baseCost: 7_500, growth: 1.35, amount: 20 },
  { id: "golden", kind: "tap", icon: Crown, baseCost: 150_000, growth: 1.38, amount: 120 },
  { id: "diamond", kind: "tap", icon: Gem, baseCost: 4_000_000, growth: 1.4, amount: 800 },

  { id: "lucky", kind: "crit", icon: Sparkles, baseCost: 1_000, growth: 1.8, amount: 0.01, maxLevel: 20 },
  { id: "mass", kind: "critPower", icon: Flame, baseCost: 5_000, growth: 2.2, amount: 1, maxLevel: 15 },

  { id: "anthem", kind: "boost", icon: Music, baseCost: 50_000, growth: 5, amount: 0.1 },
];

export const upgradeCost = (u: Upgrade, lvl: number) => Math.ceil(u.baseCost * u.growth ** lvl);
