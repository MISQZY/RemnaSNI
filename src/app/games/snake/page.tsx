import { gamePage } from "@/core/game-route";
import { loadSnakeRules } from "@/games/snake/config-server";
import { SnakeSite } from "@/games/snake/snake";

export default gamePage(loadSnakeRules, SnakeSite);
