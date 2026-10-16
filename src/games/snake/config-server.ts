import "server-only";
import { remoteConfig } from "@/core/server/remote-config";
import { snakeRulesOf } from "./rules";

/** The snake's rules from RemnaWeb; null until they have come once (or while RemnaWeb is too old to send them). */
export const loadSnakeRules = remoteConfig("snake", (body) => snakeRulesOf((body as { snake?: unknown } | null)?.snake));
