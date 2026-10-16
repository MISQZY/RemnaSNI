// Emoji particles thrown around a spot of a board (an eaten crystal, a cleared wave), from an effect bought in the
// RemnaWeb Mini App shop: the emoji come as data, a game picks how many and how far, and its CSS animation flies them
// out by --dx, --dy and --rot.

export type Particle = { emoji: string; dx: number; dy: number; rot: number; size: number };

/** `count` particles of `effect` thrown evenly around a spot, `near` to `far` px away; none without an effect. */
export function particlesOf(effect: string[] | null, count = 4, near = 36, far = 52): Particle[] {
  if (!effect?.length) return [];
  const start = Math.random() * Math.PI * 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = start + ((i + (Math.random() - 0.5) * 0.3) / count) * Math.PI * 2;
    const dist = near + Math.random() * (far - near);
    return {
      emoji: effect[Math.floor(Math.random() * effect.length)],
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      rot: (Math.random() - 0.5) * 360,
      size: 12 + Math.random() * 6,
    };
  });
}

/** The particles of a burst at `x`, `y` (percent of the box they are in), flown by the animation of `className`. */
export function Particles({ particles, x, y, className }: { particles: Particle[]; x: number; y: number; className: string }) {
  return particles.map((f, i) => (
    <span
      key={i}
      className={`absolute leading-none ${className}`}
      style={{ left: `${x}%`, top: `${y}%`, fontSize: f.size, "--dx": `${f.dx}px`, "--dy": `${f.dy}px`, "--rot": `${f.rot}deg` } as React.CSSProperties}
    >
      {f.emoji}
    </span>
  ));
}
