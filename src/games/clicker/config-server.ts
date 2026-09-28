import "server-only";
import { remoteConfig } from "@/core/remote-config";
import { isGameConfig, withDefaults } from "./config";

/** The clicker's rules from RemnaWeb; null until they have come once. */
export const loadClickerConfig = remoteConfig("clicker", (body) => (isGameConfig(body) ? withDefaults(body) : null));
