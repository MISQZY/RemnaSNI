"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { game } from "@/lib/game";
import { cn } from "@/lib/utils";

type Pop = { id: number; x: number; y: number; value: number; crit: boolean; drift: number };

type Burst = { id: number; x: number; y: number; flags: { dx: number; dy: number; rot: number; size: number }[] };

/** Most pops and flag bursts that can be on screen at once, so frantic tapping stays cheap. */
const MAX_POPS = 40;
const MAX_BURSTS = 12;

/** A few tiny flags thrown far from the tapped spot, evenly around it; crits throw one more and further. */
function burst(id: number, x: number, y: number, crit: boolean): Burst {
  const count = crit ? 4 : 3;
  const start = Math.random() * Math.PI * 2;
  const flags = Array.from({ length: count }, (_, i) => {
    const angle = start + ((i + (Math.random() - 0.5) * 0.3) / count) * Math.PI * 2;
    const dist = (crit ? 150 : 110) + Math.random() * 40;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 20,
      rot: (Math.random() - 0.5) * 540,
      size: 14 + Math.random() * 8,
    };
  });
  return { id, x, y, flags };
}

export function FlagButton({ code, name }: { code: string; name: string }) {
  const { t, num } = useI18n();
  const [pops, setPops] = useState<Pop[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const nextId = useRef(0);

  function tap(x: number, y: number, rect: DOMRect) {
    const { gain, crit } = game.tap();
    const pop = { id: nextId.current++, x, y, value: gain, crit, drift: (Math.random() - 0.5) * 60 };
    setPops((p) => [...p.slice(-(MAX_POPS - 1)), pop]);
    setBursts((b) => [...b.slice(-(MAX_BURSTS - 1)), burst(pop.id, x, y, crit)]);
    // Lean the flag towards the tapped spot.
    setTilt({ x: (0.5 - y / rect.height) * 14, y: (x / rect.width - 0.5) * 14 });
  }

  return (
    <div className="relative mx-auto w-full max-w-lg select-none">
      {/* Soft glow in the flag's own colors. */}
      <div aria-hidden className={cn("fib pointer-events-none absolute inset-6 rounded-3xl blur-3xl animate-glow", `fi-${code}`)} />

      <button
        type="button"
        aria-label={t.clicker.tapFlag(name)}
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
        {bursts.map((b) => (
          <div
            key={b.id}
            className="absolute motion-reduce:hidden"
            style={{ left: b.x, top: b.y }}
            // All flags of a burst share one duration, so the first to finish ends it.
            onAnimationEnd={() => setBursts((all) => all.filter((x) => x.id !== b.id))}
          >
            {b.flags.map((f, i) => (
              <span
                key={i}
                className={cn("fib absolute rounded-[2px] shadow-sm animate-flag-burst", `fi-${code}`)}
                style={
                  {
                    width: f.size,
                    height: f.size * 0.75,
                    "--dx": `${f.dx}px`,
                    "--dy": `${f.dy}px`,
                    "--rot": `${f.rot}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ))}
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
            +{num(p.value, true)}
            {p.crit && "!"}
          </span>
        ))}
      </div>
    </div>
  );
}
