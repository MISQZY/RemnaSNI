import { gameLayout, gameRouteMetadata } from "@/core/server/game-route";
import { fishingGame } from "@/games/fishing/manifest";

export const generateMetadata = gameRouteMetadata(fishingGame);
export default gameLayout(fishingGame);
