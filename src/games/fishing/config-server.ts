import "server-only";
import { remoteConfig } from "@/core/remote-config";
import { isFishingRules } from "./rules";

/** The fishing's rules from RemnaWeb; null until they have come once (or while RemnaWeb is too old to send them). */
export const loadFishingRules = remoteConfig("fishing", (body) => {
  const rules = (body as { fishing?: unknown } | null)?.fishing;
  return isFishingRules(rules) ? rules : null;
});
