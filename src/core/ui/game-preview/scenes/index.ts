import type { ReactNode } from "react";
import { Clicker } from "./clicker";
import { Crash } from "./crash";
import { Fishing } from "./fishing";
import { Gems } from "./gems";
import { Sacrifice } from "./sacrifice";
import { Snake } from "./snake";

/** Each game's scene, by its id: a game added with a scene adds its file here. */
export const SCENES: Record<string, () => ReactNode> = { clicker: Clicker, snake: Snake, fishing: Fishing, crash: Crash, sacrifice: Sacrifice, gems: Gems };
