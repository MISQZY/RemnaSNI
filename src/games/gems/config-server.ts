import "server-only";
import { remoteConfig } from "@/core/server/remote-config";
import { isGemsRules } from "./rules";

/** The rules of Gems from RemnaWeb; null until they have come once (or while RemnaWeb is too old to send them). */
export const loadGemsRules = remoteConfig("gems", (body) => {
  const rules = (body as { gems?: unknown } | null)?.gems;
  return isGemsRules(rules) ? rules : null;
});
