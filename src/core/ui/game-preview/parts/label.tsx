import type { ReactNode } from "react";
import { PRIMARY } from "../canvas";

/** A figure in a scene, in the heading font: in the text color, or `accent` in --primary; `faint` is fainter. */
export function Label({ x, y, size, accent, faint, children }: { x: number; y: number; size: number; accent?: boolean; faint?: boolean; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={700}
      fill={accent ? PRIMARY : "currentColor"}
      opacity={faint ? 0.55 : 1}
      style={{ fontFamily: "var(--font-heading)", fontVariantNumeric: "tabular-nums" }}
    >
      {children}
    </text>
  );
}
