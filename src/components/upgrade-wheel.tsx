"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The upgrader wheel, as on item-upgrade sites: a ring whose filled arc is the chance, and a needle that
// spins and stops inside the arc on a win. The server decides the outcome; the wheel only shows it.
// Mirrored from the RemnaWeb Mini App (components/upgrade-wheel.tsx).

const SIZE = 200;
const RADIUS = 82;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Full turns before the needle stops. */
const TURNS = 6;
const SPIN_MS = 3_800;

/** How long a spin takes: short for people who asked for less motion. */
export const spinMs = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 600 : SPIN_MS);

/** Where the needle stops (degrees clockwise from the top) for a win or a loss; the arc starts at the top. */
export function landingAngle(chance: number, win: boolean): number {
  const arc = Math.max(0, Math.min(1, chance)) * 360;
  // Keep clear of the arc's edges, so no stop looks like a near miss the other way.
  const margin = Math.min(arc, 360 - arc) * 0.12;
  if (win) return margin + Math.random() * Math.max(0, arc - 2 * margin);
  return arc + margin + Math.random() * Math.max(0, 360 - arc - 2 * margin);
}

/** The next resting rotation after `current`: whole turns plus the landing angle. */
export const spinTo = (current: number, angle: number) => current - (((current % 360) + 360) % 360) + TURNS * 360 + angle;

export function UpgradeWheel({
  chance,
  rotation,
  spinning,
  result,
  arcClassName,
  onStop,
  children,
}: {
  chance: number;
  /** Absolute rotation of the needle, degrees; changing it spins the needle there. */
  rotation: number;
  spinning: boolean;
  result: "won" | "lost" | null;
  /** Text color class of the filled arc (currentColor), e.g. the next rarity's. */
  arcClassName?: string;
  onStop?: () => void;
  /** Shown in the middle of the ring. */
  children?: ReactNode;
}) {
  const filled = CIRCUMFERENCE * Math.max(0, Math.min(1, chance));
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-muted" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={cn("stroke-current transition-[filter] duration-500", arcClassName ?? "text-primary", result === "won" && "drop-shadow-[0_0_8px_currentColor]")}
        />
      </svg>

      {/* The needle: a line from the middle to a pointer riding on the ring. */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${spinMs()}ms cubic-bezier(0.12, 0.8, 0.22, 1)` : "none",
        }}
        onTransitionEnd={onStop}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden>
          <line
            x1={SIZE / 2}
            y1={SIZE / 2 - 44}
            x2={SIZE / 2}
            y2={SIZE / 2 - RADIUS + STROKE / 2 + 2}
            strokeWidth={3}
            strokeLinecap="round"
            className={cn("stroke-foreground", result === "lost" && "stroke-destructive")}
          />
          <path
            d={`M ${SIZE / 2 - 8} ${SIZE / 2 - RADIUS - STROKE / 2 - 6} L ${SIZE / 2 + 8} ${SIZE / 2 - RADIUS - STROKE / 2 - 6} L ${SIZE / 2} ${SIZE / 2 - RADIUS + STROKE / 2 - 2} Z`}
            className={cn("fill-foreground", result === "lost" && "fill-destructive")}
          />
        </svg>
      </div>

      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
