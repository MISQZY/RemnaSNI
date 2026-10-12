// Bursts of particles over a game, bought as cosmetics in the RemnaWeb Mini App shop (RemnaWeb's lib/looks.ts): the
// crash's cash-out and crash, the Sacrifice's win. A burst is a shape the code here knows (`kind`, an unknown one
// throws shards) and colors that come as data, so a new variant needs no redeploy. Played with the Web Animations API
// in a box of the page; the particles are made here and removed once played. Nothing plays for those who ask the
// system for less motion.

export type Burst = { kind: string; colors: string[] };

const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pick = <T>(list: T[], i: number) => list[i % list.length];
const STAR = "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)";
const DIAMOND = "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)";

function particle(root: HTMLElement, x: number, y: number, size: number, color: string, style: Partial<CSSStyleDeclaration> = {}) {
  const el = document.createElement("span");
  Object.assign(el.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    background: color,
    pointerEvents: "none",
    zIndex: "40",
    ...style,
  });
  root.append(el);
  return el;
}

/** Plays `b` in `root` (positioned) from (x, y), in its own pixels: the animations, to be cancelled. */
export function playBurst(root: HTMLElement, x: number, y: number, b: Burst, scale = 1): Animation[] {
  if (calm() || !b.colors.length) return [];
  const out: Animation[] = [];
  const fly = (el: HTMLElement, frames: Keyframe[], ms: number, delay = 0) => {
    const a = el.animate(frames, { duration: ms, delay, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" });
    a.onfinish = a.oncancel = () => el.remove();
    out.push(a);
  };
  const scatter = (n: number, size: number, style: (i: number) => Partial<CSSStyleDeclaration>, reach: number, gravity: number, ms: number, delay = 0, at = { x, y }) => {
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = reach * (0.55 + Math.random() * 0.6) * scale;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const spin = (Math.random() - 0.5) * 720;
      const el = particle(root, at.x, at.y, size * scale * (0.7 + Math.random() * 0.6), pick(b.colors, i), style(i));
      fly(
        el,
        [
          { transform: "translate(0, 0) scale(0.4) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx * 1.15}px, ${dy * 1.15 + gravity * scale}px) scale(0.8) rotate(${spin}deg)`, opacity: 0 },
        ],
        ms * (0.85 + Math.random() * 0.3),
        delay,
      );
    }
  };
  const ring = (color: string, size: number, delay: number) => {
    const el = particle(root, x, y, size * scale, "transparent", { borderRadius: "9999px", border: `3px solid ${color}`, boxShadow: `0 0 18px ${color}` });
    fly(
      el,
      [
        { transform: "scale(0.1)", opacity: 1 },
        { transform: "scale(1)", opacity: 0 },
      ],
      700,
      delay,
    );
  };

  switch (b.kind) {
    case "coins":
      scatter(16, 12, (i) => ({ borderRadius: "9999px", boxShadow: `inset 0 0 0 2px ${pick(b.colors, i + 1)}` }), 90, 70, 1100);
      break;
    case "stars":
      scatter(18, 13, () => ({ clipPath: STAR }), 100, 20, 1200);
      break;
    case "ring":
      b.colors.forEach((c, i) => ring(c, 180 - i * 40, i * 110));
      scatter(10, 6, () => ({ borderRadius: "9999px" }), 80, 0, 800);
      break;
    case "smoke":
      for (let i = 0; i < 9; i++) {
        const el = particle(root, x, y, 34 * scale, pick(b.colors, i), { borderRadius: "9999px", filter: "blur(8px)", opacity: "0.6" });
        const dx = (Math.random() - 0.5) * 120 * scale;
        fly(
          el,
          [
            { transform: "translate(0, 0) scale(0.3)", opacity: 0.7 },
            { transform: `translate(${dx}px, ${-60 * scale - Math.random() * 40}px) scale(2.2)`, opacity: 0 },
          ],
          1500 + Math.random() * 500,
          i * 40,
        );
      }
      break;
    case "glitch": {
      for (let i = 0; i < 12; i++) {
        const el = particle(root, x + (Math.random() - 0.5) * 140 * scale, y + (Math.random() - 0.5) * 80 * scale, 1, pick(b.colors, i), {
          width: `${(30 + Math.random() * 70) * scale}px`,
          height: `${(3 + Math.random() * 5) * scale}px`,
          mixBlendMode: "screen",
        });
        fly(
          el,
          [
            { transform: "translateX(0)", opacity: 0 },
            { transform: `translateX(${(Math.random() - 0.5) * 40}px)`, opacity: 1, offset: 0.2 },
            { transform: `translateX(${(Math.random() - 0.5) * 60}px)`, opacity: 0.8, offset: 0.6 },
            { transform: "translateX(0)", opacity: 0 },
          ],
          600,
          i * 25,
        );
      }
      out.push(
        root.animate(
          [{ transform: "none" }, { transform: "translateX(-4px) skewX(-2deg)" }, { transform: "translateX(4px) skewX(2deg)" }, { transform: "none" }],
          { duration: 300, iterations: 2 },
        ),
      );
      break;
    }
    case "confetti":
      scatter(28, 9, (i) => ({ width: `${6 * scale}px`, height: `${11 * scale}px`, borderRadius: "2px", background: pick(b.colors, i) }), 130, 140, 1600);
      break;
    case "fireworks":
      for (let k = 0; k < 4; k++) {
        const at = { x: x + (Math.random() - 0.5) * 160 * scale, y: y + (Math.random() - 0.6) * 90 * scale };
        scatter(14, 6, () => ({ clipPath: STAR }), 60, 30, 1000, k * 220, at);
      }
      break;
    case "crystals":
      scatter(20, 12, () => ({ clipPath: DIAMOND }), 110, 90, 1400);
      break;
    default:
      scatter(18, 11, () => ({ clipPath: DIAMOND }), 100, 40, 1000);
  }
  return out;
}
