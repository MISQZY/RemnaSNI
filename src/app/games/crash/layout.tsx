import { gameLayout, gameRouteMetadata } from "@/core/server/game-route";
import { crashGame } from "@/games/crash/manifest";

export const generateMetadata = gameRouteMetadata(crashGame);
export default gameLayout(crashGame);
