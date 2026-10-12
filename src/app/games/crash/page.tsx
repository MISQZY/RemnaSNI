import { gamePage } from "@/core/server/game-route";
import { loadCrashRules } from "@/games/crash/config-server";
import { CrashSite } from "@/games/crash/crash";

export default gamePage(loadCrashRules, CrashSite);
