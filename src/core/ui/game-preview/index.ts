/*
 * A small drawn scene of each game, for the games on the home page of the website and on the hub of a RemnaSNI site.
 * The same folder in both repositories (src/components/game-preview/ in RemnaWeb, src/core/ui/game-preview/ in
 * RemnaSNI): change one, copy it to the other. Line art in the circuit backdrop's manner: the lines in the text color
 * (set `text-muted-foreground` or the like on it), what the game is about in --primary. Still until the card it sits in
 * (a `.group`) is hovered or focused: then the scene starts as the game would, a flicker of power and a scanline running
 * down, and plays its own loop while the card stays under the pointer. The styles come with the component (one hoisted
 * <style>, styles.ts), so a page needs nothing of its own; with `prefers-reduced-motion` nothing moves.
 *
 * game-preview.tsx — the frame of every scene; scenes/ — a file per game; parts/ — the dot grid and the figures;
 * canvas.ts — the box and the accent color.
 */
export { GamePreview } from "./game-preview";
