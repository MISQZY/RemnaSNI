import { gamePage } from "@/core/server/game-route";
import { loadFishingRules } from "@/games/fishing/config-server";
import { FishingSite } from "@/games/fishing/fishing";

export default gamePage(loadFishingRules, FishingSite);
