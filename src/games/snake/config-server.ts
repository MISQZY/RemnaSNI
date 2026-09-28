import "server-only";
import { remoteConfig } from "@/core/remote-config";
import { isSnakeRules } from "./rules";

/** The snake's rules from RemnaWeb; null until they have come once (or while RemnaWeb is too old to send them). */
export const loadSnakeRules = remoteConfig("snake", (body) => {
  const rules = (body as { snake?: unknown } | null)?.snake;
  return isSnakeRules(rules) ? rules : null;
});
