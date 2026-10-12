import { playBurst } from "@/core/cosmetics/burst";
import type { Fx, Who } from "./replay";
import { BEAT } from "./replay";
import type { StrikeLook } from "./rules";

// The effects of a replay's beat (replay.ts) on the board, played with the Web Animations API: the board marks its
// spaces (`data-slot="me:2"`), the units in them (`data-unit`) and the scale (`data-scale`). Numbers and rings float
// in the board's own box, made here and removed once played. Every animation is handed back so a skip can stop them.
// A side's cosmetic strike (StrikeLook) tints its units' rush and adds its burst where they land.

/** The words floating over a unit: sigil names and the like, in the page's language. */
export type FxLabels = { airborne: string; intercept: string; rift: string; spikes: string; resilient: string; growth: string; rebuild: string; sacrifice: string };

const RED = "brightness(0.95) sepia(1) saturate(7) hue-rotate(-45deg)";
const foe = (w: Who): Who => (w === "me" ? "them" : "me");

function center(root: HTMLElement, el: Element) {
  const r = el.getBoundingClientRect();
  const o = root.getBoundingClientRect();
  return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, w: r.width, h: r.height };
}

/** A word or number rising out of `at` and fading. */
function float(root: HTMLElement, at: Element, text: string, cls: string, out: Animation[], rise = 1) {
  const c = center(root, at);
  const el = document.createElement("span");
  el.textContent = text;
  el.className = `pointer-events-none absolute z-30 whitespace-nowrap font-heading font-bold drop-shadow-[0_1px_3px_rgb(0_0_0/0.9)] ${cls}`;
  el.style.left = `${c.x}px`;
  el.style.top = `${c.y}px`;
  root.append(el);
  const a = el.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
      { transform: "translate(-50%, -70%) scale(1.15)", opacity: 1, offset: 0.2 },
      { transform: `translate(-50%, ${-90 - 60 * rise}%) scale(1)`, opacity: 0 },
    ],
    { duration: 900, easing: "ease-out" },
  );
  a.onfinish = a.oncancel = () => el.remove();
  out.push(a);
}

/** A ring bursting out of a space: a shield, a spark of power. */
function ring(root: HTMLElement, at: Element, cls: string, out: Animation[]) {
  const c = center(root, at);
  const el = document.createElement("span");
  el.className = `pointer-events-none absolute z-20 rounded-[12px] border-2 ${cls}`;
  Object.assign(el.style, { left: `${c.x - c.w / 2}px`, top: `${c.y - c.h / 2}px`, width: `${c.w}px`, height: `${c.h}px` });
  root.append(el);
  const a = el.animate(
    [
      { transform: "scale(0.85)", opacity: 0.95 },
      { transform: "scale(1.3)", opacity: 0 },
    ],
    { duration: 520, easing: "ease-out" },
  );
  a.onfinish = a.oncancel = () => el.remove();
  out.push(a);
}

/** The bursts of the cosmetic strikes by kind (core/cosmetics/burst.ts); a bolt also flashes a lightning over the target. */
const STRIKE_BURSTS: Record<string, string> = { flame: "smoke", shards: "shards", frost: "stars", void: "ring", bolt: "shards" };

function strikeBurst(root: HTMLElement, at: Element, s: StrikeLook, out: Animation[]) {
  const c = center(root, at);
  if (s.kind === "bolt") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 20 40");
    Object.assign(svg.style, { position: "absolute", left: `${c.x - c.w / 3}px`, top: `${c.y - c.h / 2}px`, width: `${(c.w * 2) / 3}px`, height: `${c.h}px`, zIndex: "30", pointerEvents: "none", filter: `drop-shadow(0 0 6px ${s.glow})` });
    const bolt = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    bolt.setAttribute("points", "12,0 6,16 13,18 5,40");
    bolt.setAttribute("fill", "none");
    bolt.setAttribute("stroke", s.color);
    bolt.setAttribute("stroke-width", "2.5");
    bolt.setAttribute("stroke-linejoin", "round");
    svg.append(bolt);
    root.append(svg);
    const a = svg.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0 }], { duration: 360 });
    a.onfinish = a.oncancel = () => svg.remove();
    out.push(a);
  }
  out.push(...playBurst(root, c.x, c.y, { kind: STRIKE_BURSTS[s.kind] ?? "shards", colors: [s.color, s.glow] }, 0.45));
}

/** Lifts an animated unit over its neighbours for as long as it moves. */
function onTop(el: HTMLElement, a: Animation) {
  el.style.zIndex = "20";
  const reset = () => (el.style.zIndex = "");
  a.onfinish = a.oncancel = reset;
}

/** Plays `fx` on the board under `root`, with each side's cosmetic strike; the animations, to be cancelled on a skip. */
export function playFx(root: HTMLElement, fx: Fx, labels: FxLabels, strikes: Partial<Record<Who, StrikeLook | null>> = {}): Animation[] {
  const out: Animation[] = [];
  const slot = (who: Who, lane: number) => root.querySelector<HTMLElement>(`[data-slot="${who}:${lane}"]`);
  const unit = (who: Who, lane: number) => slot(who, lane)?.querySelector<HTMLElement>("[data-unit]") ?? null;

  switch (fx.t) {
    case "lunge": {
      const el = unit(fx.who, fx.lane);
      const to = slot(foe(fx.who), fx.target);
      if (!el || !to) break;
      const a0 = center(root, el);
      const b0 = center(root, to);
      const dx = b0.x - a0.x;
      const dy = b0.y - a0.y;
      const up = Math.sign(dy) * 10;
      const at = (k: number, extra = "") => `translate(${dx * k}px, ${dy * k}px) ${extra}`;
      const strike = strikes[fx.who];
      const rush = strike ? `drop-shadow(0 0 10px ${strike.glow}) brightness(1.15)` : "none";
      const frames: Keyframe[] =
        fx.kind === "fly"
          ? [
              { transform: "none" },
              { transform: `translate(0, ${up}px) scale(1.2)`, filter: "drop-shadow(0 0 10px rgb(56 189 248))", offset: 0.25 },
              { transform: `translate(${dx}px, ${dy * 1.2}px) scale(1.25)`, filter: "drop-shadow(0 0 14px rgb(56 189 248))", offset: 0.55 },
              { transform: `translate(${dx}px, ${dy * 1.15}px) scale(1.2)`, filter: "drop-shadow(0 0 10px rgb(56 189 248))", offset: 0.65 },
              { transform: "none", filter: "none" },
            ]
          : fx.kind === "intercepted"
            ? [
                { transform: "none" },
                { transform: `translate(0, ${up}px) scale(1.18)`, filter: "drop-shadow(0 0 10px rgb(56 189 248))", offset: 0.25 },
                { transform: at(0.55, "scale(1.18)"), offset: 0.45 },
                { transform: at(0.3, "rotate(-10deg) scale(1.05)"), filter: "none", offset: 0.62 },
                { transform: at(0.36, "rotate(6deg)"), offset: 0.72 },
                { transform: "none" },
              ]
            : [
                { transform: "none" },
                { transform: at(-0.08, "scale(0.96)"), offset: 0.18 },
                { transform: at(fx.kind === "direct" ? 0.7 : 0.62, "scale(1.1)"), filter: rush, offset: 0.42 },
                { transform: at(fx.kind === "direct" ? 0.6 : 0.5, "scale(1.05)"), filter: rush, offset: 0.55 },
                { transform: "none", filter: "none" },
              ];
      const a = el.animate(frames, { duration: BEAT.lunge + BEAT.impact, easing: "cubic-bezier(.45,0,.3,1)" });
      onTop(el, a);
      out.push(a);
      break;
    }
    case "impact": {
      const target = slot(foe(fx.who), fx.target);
      if (!target) break;
      const strike = strikes[fx.who];
      if (strike) strikeBurst(root, target, strike, out);
      if (fx.kind === "direct" || fx.kind === "fly") {
        const scale = root.querySelector<HTMLElement>("[data-scale]");
        if (scale) out.push(scale.animate([{ transform: "scale(1)" }, { transform: "scale(1.08)", filter: "brightness(1.6)" }, { transform: "scale(1)" }], { duration: 380 }));
        if (fx.kind === "fly") float(root, target, labels.airborne, "text-[0.6875rem] text-sky-300", out, 0.4);
        float(root, target, `+${fx.damage}`, fx.who === "me" ? "text-2xl text-primary" : "text-2xl text-rose-400", out);
        break;
      }
      const hit = unit(foe(fx.who), fx.target);
      if (fx.kind === "intercepted") {
        ring(root, target, "border-violet-400 bg-violet-500/20 shadow-[0_0_18px] shadow-violet-500/70", out);
        float(root, target, labels.intercept, "text-[0.6875rem] text-violet-300", out, 0.4);
      }
      if (hit) {
        const filter = fx.rift ? "brightness(1.3) sepia(1) saturate(6) hue-rotate(240deg)" : RED;
        out.push(
          hit.animate(
            [
              { filter: "none", transform: "none" },
              { filter, transform: "translateX(-4px) rotate(-2deg)" },
              { filter: "none", transform: "translateX(4px) rotate(2deg)" },
              { filter, transform: "translateX(-2px)" },
              { filter: "none", transform: "none" },
            ],
            { duration: BEAT.impact },
          ),
        );
      }
      if (fx.rift) {
        ring(root, target, "border-fuchsia-400 bg-fuchsia-500/25 shadow-[0_0_18px] shadow-fuchsia-500/70", out);
        float(root, target, labels.rift, "text-sm text-fuchsia-300", out);
      } else float(root, target, `−${fx.damage}`, "text-2xl text-rose-400", out);
      if (fx.spikes) {
        const me = slot(fx.who, fx.lane);
        const attacker = unit(fx.who, fx.lane);
        ring(root, target, "border-rose-400 shadow-[0_0_14px] shadow-rose-500/70", out);
        if (attacker) out.push(attacker.animate([{ filter: "none" }, { filter: RED }, { filter: "none" }, { filter: RED }, { filter: "none" }], { duration: BEAT.impact, delay: 120 }));
        if (me) float(root, me, `−1 ${labels.spikes}`, "text-sm text-rose-400", out, 0.6);
      }
      break;
    }
    case "die": {
      const el = unit(fx.who, fx.lane);
      const at = slot(fx.who, fx.lane);
      if (el)
        out.push(
          el.animate(
            [
              { opacity: 1, transform: "none", filter: "none" },
              { opacity: 0.9, transform: "scale(1.05)", filter: fx.back ? "brightness(1.6) hue-rotate(140deg)" : "brightness(1.8)", offset: 0.25 },
              { opacity: 0, transform: fx.back ? "translateY(30%) scale(0.5)" : "scale(0.6) rotate(10deg)", filter: "grayscale(1) brightness(0.5)" },
            ],
            { duration: BEAT.die, fill: "forwards", easing: "ease-in" },
          ),
        );
      if (at && fx.back) {
        ring(root, at, "border-cyan-400 shadow-[0_0_14px] shadow-cyan-500/70", out);
        float(root, at, labels.rebuild, "text-[0.6875rem] text-cyan-300", out, 0.4);
      }
      break;
    }
    case "sacrifice": {
      const el = unit(fx.who, fx.lane);
      const at = slot(fx.who, fx.lane);
      if (el) out.push(el.animate([{ filter: "none" }, { filter: "drop-shadow(0 0 10px rgb(244 63 94)) brightness(1.3)" }, { filter: "none" }], { duration: BEAT.sacrifice }));
      if (at) {
        ring(root, at, fx.survived ? "border-yellow-300 shadow-[0_0_14px] shadow-yellow-400/70" : "border-emerald-400 shadow-[0_0_14px] shadow-emerald-500/70", out);
        float(root, at, fx.survived ? labels.resilient : labels.sacrifice, fx.survived ? "text-[0.6875rem] text-yellow-200" : "text-[0.6875rem] text-emerald-300", out, 0.4);
      }
      break;
    }
    case "evolve": {
      const el = unit(fx.who, fx.lane);
      const at = slot(fx.who, fx.lane);
      if (el) out.push(el.animate([{ filter: "none", transform: "none" }, { filter: "drop-shadow(0 0 12px rgb(163 230 53)) brightness(1.4)", transform: "scale(1.1)" }, { filter: "none", transform: "none" }], { duration: BEAT.evolve }));
      if (at) {
        ring(root, at, "border-lime-400 shadow-[0_0_14px] shadow-lime-500/70", out);
        float(root, at, labels.growth, "text-[0.6875rem] text-lime-300", out, 0.4);
      }
      break;
    }
    case "play": {
      const at = slot(fx.who, fx.lane);
      if (at && fx.who === "them") ring(root, at, "border-primary/80", out);
      break;
    }
    case "turn":
      break;
  }
  return out;
}
