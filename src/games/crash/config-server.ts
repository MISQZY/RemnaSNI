import "server-only";
import { remoteConfig } from "@/core/remote-config";
import { isCrashRules } from "./rules";

/** The crash's rules from RemnaWeb; null until they have come once (or while RemnaWeb is too old to send them). */
export const loadCrashRules = remoteConfig("crash", (body) => {
  const rules = (body as { crash?: unknown } | null)?.crash;
  return isCrashRules(rules) ? rules : null;
});
