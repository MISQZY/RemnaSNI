import { gameLayout, gameRouteMetadata } from "@/core/server/game-route";
import { gemsGame } from "@/games/gems/manifest";

export const generateMetadata = gameRouteMetadata(gemsGame);
export default gameLayout(gemsGame);
