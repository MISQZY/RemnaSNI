import { gamePage } from "@/core/server/game-route";
import { loadGemsRules } from "@/games/gems/config-server";
import { GemsSite } from "@/games/gems/gems";

export default gamePage(loadGemsRules, GemsSite);
