import { gamePage } from "@/core/game-route";
import { loadCrashRules } from "@/games/crash/config-server";
import { CrashSite } from "@/games/crash/crash";

export default gamePage(loadCrashRules, CrashSite);
