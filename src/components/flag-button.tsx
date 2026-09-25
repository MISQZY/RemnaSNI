"use client";

import { useRef, useState } from "react";
import { game } from "@/lib/game";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Pop = { id: number; x: number; y: number; value: number; crit: boolean; drift: number };

/** Most pops that can be on screen at once, so frantic tapping stays cheap. */
const MAX_POPS = 40;

export function FlagButton({ code, name }: { code: string; name: string }) {
  const [pops, setPops] = useState<Pop[]>([]);
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const nextId = useRef(0);

  function tap(x: number, y: number, rect: DOMRect) {
    const { gain, crit } = game.tap();
    const pop = { id: nextId.current++, x, y, value: gain, crit, drift: (Math.random() - 0.5) * 60 };
    setPops((p) => [...p.slice(-(MAX_POPS - 1)), pop]);
    // Lean the flag towards the tapped spot.
    setTilt({ x: (0.5 - y / rect.height) * 14, y: (x / rect.width - 0.5) * 14 });
  }

  return (
    <div className="relative mx-auto w-full max-w-md select-none">
      {/* Soft glow in the flag's own colors. */}
      <div aria-hidden className={cn("fib pointer-events-none absolute inset-6 rounded-3xl blur-3xl animate-glow", `fi-${code}`)} />

      <button
        type="button"
        aria-label={`Tap the flag of ${name}`}
        className="relative block w-full touch-manipulation rounded-2xl outline-none [perspective:800px] focus-visible:ring-3 focus-visible:ring-ring/50"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          tap(e.clientX - rect.left, e.clientY - rect.top, rect);
        }}
        onPointerUp={() => setTilt(null)}
        onPointerLeave={() => setTilt(null)}
        onPointerCancel={() => setTilt(null)}
        onClick={(e) => {
          // Pointer taps are handled on pointerdown; detail === 0 means Enter/Space.
          if (e.detail !== 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          tap(rect.width / 2, rect.height / 2, rect);
          setTimeout(() => setTilt(null), 100);
        }}
      >
        <div
          className={cn(
            "fib aspect-[4/3] w-full rounded-2xl shadow-xl ring-1 ring-foreground/10 transition-transform duration-100 ease-out",
            `fi-${code}`,
          )}
          style={{
            transform: tilt ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(0.95)` : undefined,
          }}
        />
      </button>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {pops.map((p) => (
          <span
            key={p.id}
            className={cn(
              "absolute font-bold tabular-nums whitespace-nowrap animate-float-up [text-shadow:0_2px_8px_rgb(0_0_0/0.35)]",
              p.crit ? "text-3xl text-warning" : "text-2xl text-white",
            )}
            style={{ left: p.x, top: p.y, "--drift": `${p.drift}px` } as React.CSSProperties}
            onAnimationEnd={() => setPops((all) => all.filter((x) => x.id !== p.id))}
          >
            +{formatNumber(p.value, true)}
            {p.crit && "!"}
          </span>
        ))}
      </div>
    </div>
  );
}
