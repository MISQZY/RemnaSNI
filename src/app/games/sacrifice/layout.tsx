import { gameLayout, gameRouteMetadata } from "@/core/server/game-route";
import { sacrificeGame } from "@/games/sacrifice/manifest";

export const generateMetadata = gameRouteMetadata(sacrificeGame);
export default gameLayout(sacrificeGame);
