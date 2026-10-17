"use client";

import { useEffect, useRef } from "react";
import { HEIGHT, WIDTH } from "./constants";
import { CORNERS, LAYOUTS, PLACE } from "./corners";
import { animate } from "./pulses";

/**
 * The backdrop. Its root is positioned by the caller (fixed to the window, or sticky in a scrolling column) and
 * lies under the content; it never takes the pointer.
 */
export function CircuitBackdrop({ className = "" }: { className?: string }) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => animate(canvases.current, LAYOUTS), []);

  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden select-none ${className}`}>
      {CORNERS.map(({ corner, className: extra = "" }, i) => (
        <div
          key={corner}
          style={{ width: `${WIDTH / 16}rem`, height: `${HEIGHT / 16}rem` }}
          className={`absolute ${PLACE[corner]} ${extra}`}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            fill="none"
            className="absolute inset-0 size-full [mask-image:radial-gradient(circle_at_0_0,black_15%,transparent_70%)]"
          >
            {LAYOUTS[i]!.map(({ d, end }, j) => (
              <g key={j} className="stroke-primary opacity-[0.16]">
                <path d={d} />
                <circle cx={end[0]} cy={end[1]} r={3} className="fill-background" />
              </g>
            ))}
          </svg>
          {/* Its color is read from its own `color`, so the pulses follow the theme. */}
          <canvas
            ref={(el) => {
              canvases.current[i] = el;
            }}
            className="absolute inset-0 size-full text-primary motion-reduce:hidden"
          />
        </div>
      ))}
    </div>
  );
}
