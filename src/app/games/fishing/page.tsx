import { gamePage } from "@/core/game-route";
import { loadFishingRules } from "@/games/fishing/config-server";
import { FishingSite } from "@/games/fishing/fishing";

export default gamePage(loadFishingRules, FishingSite);
