import { gamePage } from "@/core/server/game-route";
import { loadSacrificeRules } from "@/games/sacrifice/config-server";
import { SacrificeSite } from "@/games/sacrifice/sacrifice";

export default gamePage(loadSacrificeRules, SacrificeSite);
