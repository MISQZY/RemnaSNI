"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Mirrored in RemnaWeb and RemnaSNI; the animations live in globals.css (`.pet`).

export type PetLook = {
  /** Seeds the animation phase so a grid of pets does not move in lockstep. */
  id: string;
  emoji: string;
  rarity: string;
  anim: string;
};

/** Offset into the idle cycle derived from the id, stable between server and client renders. */
function phase(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${-((h % 1000) / 1000) * 2.4}s`;
}

/**
 * An animated pet in a rarity-tinted bubble. Tapping it makes it jump and sends a heart up;
 * changing `pulse` makes it jump too (e.g. on every tap of the flag).
 */
export function PetSprite({
  pet,
  size = 64,
  locked = false,
  pulse = 0,
  className,
}: {
  pet: PetLook;
  size?: number;
  locked?: boolean;
  pulse?: number;
  className?: string;
}) {
  const [pets, setPets] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; drift: number }[]>([]);
  const nextHeart = useRef(0);

  return (
    <div
      className={cn("pet", `pet-${locked ? "locked" : pet.rarity}`, !locked && "cursor-pointer", className)}
      data-anim={pet.anim}
      style={{ width: size, height: size, fontSize: size * 0.55, "--pet-delay": phase(pet.id) } as React.CSSProperties}
      onClick={
        locked
          ? undefined
          : () => {
              setPets((n) => n + 1);
              const heart = { id: nextHeart.current++, drift: (Math.random() - 0.5) * size * 0.6 };
              setHearts((all) => [...all.slice(-5), heart]);
            }
      }
    >
      <span className="pet-shadow" />
      <span key={`${pulse}:${pets}`} className={cn(pulse + pets > 0 && "pet-happy")}>
        <span className="pet-body block">{pet.emoji}</span>
      </span>
      {hearts.map((h) => (
        <span
          key={h.id}
          aria-hidden
          className="pet-heart"
          style={{ "--pet-drift": `${h.drift}px` } as React.CSSProperties}
          onAnimationEnd={() => setHearts((all) => all.filter((x) => x.id !== h.id))}
        >
          💖
        </span>
      ))}
    </div>
  );
}
