import "server-only";
import { remoteConfig } from "@/core/remote-config";
import { isSacrificeRules } from "./rules";

/** The Sacrifice's rules and cards from RemnaWeb; null until they have come once (or while RemnaWeb is too old to send them). */
export const loadSacrificeRules = remoteConfig("sacrifice", (body) => {
  const rules = (body as { sacrifice?: unknown } | null)?.sacrifice;
  return isSacrificeRules(rules) ? rules : null;
});
