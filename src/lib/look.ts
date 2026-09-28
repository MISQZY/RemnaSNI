import type { CSSProperties } from "react";

// The cosmetics of the player's profile, bought in the RemnaWeb Mini App shop: a title, and the avatar frame,
// name color and glow as plain CSS (RemnaWeb's lib/looks.ts), so a new look needs no redeploy here. These
// types and lookStyle mirror it; the animations are the look-* keyframes of globals.css.

export type Look = {
  background?: string;
  backgroundSize?: string;
  boxShadow?: string;
  color?: string;
  animation?: { name: "flow" | "pulse" | "turn"; seconds: number; to?: string };
};

export type SiteLook = { title?: string; frame?: Look; color?: Look; glow?: Look };

const TIMING = { flow: "linear", pulse: "ease-in-out", turn: "linear" } as const;
const ANIMATIONS = new Set(Object.keys(TIMING));

/** Inline CSS of a look; `text` shows a background through a name's letters. */
export function lookStyle(look: Look | undefined, text = false): CSSProperties | undefined {
  if (!look) return undefined;
  const style: Record<string, string> = {};
  if (look.background) style.background = look.background;
  if (look.backgroundSize) style.backgroundSize = look.backgroundSize;
  if (look.boxShadow) style.boxShadow = look.boxShadow;
  if (look.color) style.color = look.color;
  if (text && look.background) {
    style.backgroundClip = "text";
    style.WebkitBackgroundClip = "text";
    style.color = "transparent";
  }
  if (look.animation && ANIMATIONS.has(look.animation.name)) {
    const { name, seconds, to } = look.animation;
    style.animation = `look-${name} ${seconds}s ${TIMING[name]} infinite`;
    if (to) style["--look-flow-to"] = to;
  }
  return style as CSSProperties;
}
