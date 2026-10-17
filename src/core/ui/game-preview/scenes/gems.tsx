import type { ReactNode } from "react";
import { PRIMARY } from "../canvas";

/** A board of gems with three in a row about to clear. */
export function Gems() {
  const gems: ReactNode[] = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 8; col++) {
      const lit = row === 1 && col >= 3 && col <= 5;
      const x = 48 + col * 32;
      const y = 42 + row * 32;
      gems.push(
        <path
          key={`${row}-${col}`}
          className={lit ? "gp-flash" : (row * 3 + col * 5) % 7 === 0 ? "gp-twinkle" : undefined}
          style={{ animationDelay: lit ? `${(col - 3) * 0.08}s` : `${-col * 0.3}s` }}
          d={`M${x} ${y - 10} l10 10 l-10 10 l-10 -10 z`}
          fill={lit ? PRIMARY : "none"}
          stroke={lit ? PRIMARY : "currentColor"}
          strokeWidth={1.5}
          strokeLinejoin="round"
          opacity={lit ? 1 : 0.45}
        />,
      );
    }
  return (
    <g>
      <rect className="gp-march" x={130} y={58} width={92} height={32} rx={16} fill="none" stroke={PRIMARY} strokeWidth={1.5} strokeDasharray="4 4" />
      {gems}
    </g>
  );
}
