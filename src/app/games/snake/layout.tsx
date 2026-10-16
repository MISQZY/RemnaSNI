import { gameLayout, gameRouteMetadata } from "@/core/server/game-route";
import { snakeGame } from "@/games/snake/manifest";

export const generateMetadata = gameRouteMetadata(snakeGame);
export default gameLayout(snakeGame);
