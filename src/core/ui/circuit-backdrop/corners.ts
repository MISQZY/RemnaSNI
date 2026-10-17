import { layout } from "./layout";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Two corners across from each other everywhere; the other two only where the window is big enough for the four not
// to meet.
const FULL_ONLY = "max-lg:hidden [@media(max-height:46rem)]:hidden";
export const CORNERS: { corner: Corner; seed: number; className?: string }[] = [
  { corner: "top-left", seed: 11 },
  { corner: "top-right", seed: 23, className: FULL_ONLY },
  { corner: "bottom-left", seed: 37, className: FULL_ONLY },
  { corner: "bottom-right", seed: 51 },
];

/** Where each corner sits, the top-left drawing mirrored into it. */
export const PLACE: Record<Corner, string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0 -scale-x-100",
  "bottom-left": "bottom-0 left-0 -scale-y-100",
  "bottom-right": "right-0 bottom-0 -scale-100",
};

/** Each corner's traces, laid out once from its seed: the same on the server and in the browser. */
export const LAYOUTS = CORNERS.map(({ seed }) => layout(seed));
