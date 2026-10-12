import { gameLayout, gameRouteMetadata } from "@/core/server/game-route";

export const generateMetadata = gameRouteMetadata("snake");
export default gameLayout("snake");
