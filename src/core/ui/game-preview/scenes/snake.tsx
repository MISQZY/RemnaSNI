import type { CSSProperties } from "react";
import { PRIMARY } from "../canvas";

/*
 * The way the snake crawls once the scene plays: along the dot grid, cell by cell, up to the crystal (340 long). Its
 * faint trail, body and head are dashes of this one path, moved along it a cell (20) at a time by `gp-crawl`.
 */
const SNAKE_WAY = "M20 160 V120 H120 V80 H220 V120 H240";

/** The snake turning toward a crystal; playing, it crawls there and eats it. */
export function Snake() {
  const dash = (at: number, length: number, width: number, opacity = 1) => (
    <path
      className="gp-crawl"
      d={SNAKE_WAY}
      fill="none"
      stroke={PRIMARY}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${length} 1000`}
      opacity={opacity}
      style={{ "--at": `${-at}px` } as CSSProperties}
    />
  );
  return (
    <g>
      <g className="gp-idle">
        <polyline points="40,160 40,120 120,120 120,80 200,80" fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <polyline points="120,100 120,80 200,80" fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={200} cy={80} r={9} fill={PRIMARY} />
        <circle cx={203} cy={77} r={2} fill="var(--card)" />
      </g>
      <g className="gp-live">
        {dash(-60, 60, 12, 0.35)}
        {dash(0, 100, 12)}
        {dash(100, 0, 18)}
      </g>
      <g className="gp-eat">
        <path d="M260 100 l10 20 l-10 20 l-10 -20 z" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        <path d="M260 100 l4 20 l-4 20" fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
      </g>
    </g>
  );
}
