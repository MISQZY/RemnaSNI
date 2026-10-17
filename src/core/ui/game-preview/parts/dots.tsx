import type { ReactNode } from "react";
import { H, W } from "../canvas";

/** The faint grid of dots every scene stands on. */
export function Dots() {
  const dots: ReactNode[] = [];
  for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1} />);
  return (
    <g fill="currentColor" opacity={0.28}>
      {dots}
    </g>
  );
}
