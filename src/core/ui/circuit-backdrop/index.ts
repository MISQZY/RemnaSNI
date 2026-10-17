// Faint circuit traces in the corners of the page, with data pulsing slowly along them: a background echoing the
// circuit under the Qzyrium crystal on the website's home page. The same folder lives in RemnaWeb
// (src/components/circuit-backdrop/) and RemnaSNI (src/core/ui/circuit-backdrop/): change one, copy it to the other.
//
// The traces are laid out once, from fixed seeds, so the server and the browser draw the same picture. They are two
// layers: the still traces, an SVG painted once, and the pulses over them, drawn on a canvas a few dozen times a
// second. Animating the SVG itself would repaint every trace, its fading mask and any glass blurring it on every
// frame. Each corner is one layout drawn for the top-left corner and mirrored into its place, fading out towards the
// middle of the page so it never reaches the content.
//
// circuit-backdrop.tsx — the corners and their still traces; pulses.ts — the canvas; corners.ts — where the corners
// sit and their layouts; layout.ts — laying out a corner's buses; geometry.ts, random.ts — what laying them out takes;
// constants.ts — sizes, speeds and timings.
export { CircuitBackdrop } from "./circuit-backdrop";
