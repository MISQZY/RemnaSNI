import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import { H, PRIMARY, W } from "./canvas";
import { Dots } from "./parts";
import { SCENES } from "./scenes";
import { CSS } from "./styles";

/** The scene of the game `id`, nothing for a game without one. */
export function GamePreview({ id, className, ...props }: { id: string } & SVGProps<SVGSVGElement>) {
  const Scene = SCENES[id];
  if (!Scene) return null;
  return (
    <>
      <style href="game-preview" precedence="default">
        {CSS}
      </style>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block", className)} {...props}>
        <g className="gp-boot">
          <Dots />
          <Scene />
        </g>
        <rect className="gp-scan" x={0} y={-4} width={W} height={4} fill={PRIMARY} opacity={0} />
      </svg>
    </>
  );
}
