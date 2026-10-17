/** The drawing of one corner, in px at the default 16px rem; it grows with the rem, as the page does on large screens. */
export const WIDTH = 480;
export const HEIGHT = 360;
/** The distance between the lines of a bus, and the least room kept between buses. */
export const GAP = 9;
export const CLEARANCE = 2.5 * GAP;
/** The speed of the pulses in px per second, and a pulse's length. */
export const SPEED = 26;
export const PULSE = 22;
/**
 * The share of its cycle a pulse spends running to its pad, then draining into it, its pad lighting up as it lands;
 * for the rest of the cycle its line rests.
 */
export const RUNNING = 0.4;
export const DRAIN = 0.04;
/**
 * How often the pulses are drawn. They creep along at well under a pixel a frame, so drawing them on every frame of
 * the screen would show nothing more.
 */
export const FPS = 30;
