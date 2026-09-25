"use client";

import { createContext, useContext, type ReactNode } from "react";
import { setConfig, type GameConfig } from "@/lib/config";

const ConfigContext = createContext<GameConfig | null>(null);

/** Hands the game config loaded from RemnaWeb to client components and to the game store. */
export function ConfigProvider({ config, children }: { config: GameConfig; children: ReactNode }) {
  // Set while rendering, not in an effect: the game store is hydrated from child effects.
  setConfig(config);
  return <ConfigContext value={config}>{children}</ConfigContext>;
}

export function useConfig(): GameConfig {
  const config = useContext(ConfigContext);
  if (!config) throw new Error("useConfig must be used inside ConfigProvider");
  return config;
}
