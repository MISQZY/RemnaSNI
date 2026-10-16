"use client";

import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef } from "react";
import { playBurst, type Burst } from "@/core/cosmetics/burst";
import { useFormat } from "@/core/i18n/provider";
import { cn } from "@/lib/utils";
import { msToReach, multiplierAt, tierOf, type CrashHead, type CrashLook, type CrashRules, type CrashSnapshot, type CrashTier } from "./rules";
import { useFrameLoop, useFrameNow } from "@/core/player/stream";

// The round on a chart: the multiplier's curve as it grows, in the color its height has reached (the rarities of
// RemnaWeb's pets, grey to cosmic), the countdown while bets are taken and the crash point once it has crashed. The
// player's cosmetics draw on it too: the tip and the trail of the curve, bursts at their cash-out and at the crash.

/** The curve's colors; the cosmic one runs through three. */
const TIER_STROKE: Record<CrashTier, string[]> = {
  common: ["#94a3b8"],
  rare: ["#38bdf8"],
  epic: ["#c084fc"],
  legendary: ["#fbbf24"],
  mythic: ["#fb7185"],
  cosmic: ["#22d3ee", "#a78bfa", "#f472b6"],
};

/** The multiplier's text on the chart's dark ground. */
export const TIER_TEXT: Record<CrashTier, string> = {
  common: "text-slate-300",
  rare: "text-sky-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
  mythic: "text-rose-400",
  cosmic: "bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent",
};

/** A multiplier on the page, as a chip: the history of rounds, the cash-outs. */
export const TIER_CHIP: Record<CrashTier, string> = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  epic: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  legendary: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  mythic: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  cosmic: "bg-gradient-to-r from-cyan-500/25 via-violet-500/25 to-fuchsia-500/25 text-cyan-700 ring-1 ring-cyan-400/40 dark:text-cyan-300",
};

/** "×2.43" in the page's language. */
export function useMultiplier() {
  const { fixed } = useFormat();
  return (hundredths: number) => `×${fixed(hundredths / 100, 2)}`;
}

/** The steps of the chart's grid, in multiplier units: the first that leaves at most four lines. */
const STEPS = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

/** A cosmetic tip at (x, y), pointing along the curve (`angle`, radians); false for a kind it does not know. */
function drawHead(ctx: CanvasRenderingContext2D, head: CrashHead, x: number, y: number, angle: number): boolean {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = head.glow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = head.color;
  ctx.strokeStyle = head.glow;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  let known = true;
  switch (head.kind) {
    case "crystal":
      poly([
        [11, 0],
        [2, -6],
        [-9, -4],
        [-9, 4],
        [2, 6],
      ]);
      break;
    case "drill":
      poly([
        [12, 0],
        [-6, -7],
        [-6, 7],
      ]);
      ctx.beginPath();
      for (const t of [-2, 2, 6]) {
        ctx.moveTo(t, -((12 - t) / 18) * 7);
        ctx.lineTo(t - 3, ((12 - t) / 18) * 7);
      }
      ctx.stroke();
      ctx.fillRect(-11, -4, 5, 8);
      break;
    case "drone":
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-9, -9);
      ctx.moveTo(-4, 4);
      ctx.lineTo(-9, 9);
      ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(-9, 9 * s, 5, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "comet": {
      const tail = ctx.createLinearGradient(-30, 0, 0, 0);
      tail.addColorStop(0, `${head.glow}00`);
      tail.addColorStop(1, head.glow);
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-30, 0);
      ctx.lineTo(0, 6);
      ctx.fill();
      ctx.fillStyle = head.color;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "star":
      poly(
        Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 ? 4.5 : 11;
          const a = (Math.PI * i) / 5 - Math.PI / 2;
          return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
        }),
      );
      break;
    default:
      known = false;
  }
  ctx.restore();
  return known;
}

/** Where the curve's tip was drawn last, for the bursts over it; null before the round flies. */
type Tip = { x: number; y: number } | null;

/** Points of the curve: enough to look smooth. */
const SAMPLES = 120;
/** The curve's points, x and y in turn: one buffer for every frame, not a new array each time. */
const curve = new Float64Array((SAMPLES + 1) * 2);

/** The gradients of the last frames, by canvas, kept while their ends and colors stay: in a long flight they barely move. */
const gradientsOf = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>();
function gradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  let gradients = gradientsOf.get(ctx);
  if (!gradients) gradientsOf.set(ctx, (gradients = new Map()));
  const key = [x0, y0, x1, y1].map(Math.round).join(",") + stops.join(";");
  let g = gradients.get(key);
  if (!g) {
    if (gradients.size > 8) gradients.clear();
    g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [at, color] of stops) g.addColorStop(at, color);
    gradients.set(key, g);
  }
  return g;
}

/** Color stops spread evenly over a gradient. */
const spread = (colors: string[]): [number, string][] => colors.map((c, i) => [colors.length === 1 ? 0 : i / (colors.length - 1), c]);

/** The root font size over the default 16px: wide screens scale the page up (globals.css), the labels with it. */
let unit = 1;

function draw(canvas: HTMLCanvasElement, rules: CrashRules, elapsedMs: number, top: number, colors: string[], crashed: boolean, look: CrashLook | null): Tip {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    unit = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // The right edge leaves room for the tip only, so the curve runs up to it.
  const pad = { left: 40 * unit, right: 10, top: 16, bottom: 16 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  // The scale grows with the round, so the curve always fills most of the chart.
  const spanMs = Math.max(8_000, elapsedMs);
  const maxY = Math.max(2, (top / 100) * 1.2);
  const x = (ms: number) => pad.left + (ms / spanMs) * plotW;
  const y = (m: number) => pad.top + plotH - ((m - 1) / (maxY - 1)) * plotH;

  // The grid, with the multipliers it marks.
  const step = STEPS.find((s) => (maxY - 1) / s <= 4) ?? STEPS[STEPS.length - 1];
  ctx.font = `${11 * unit}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let m = 1; m <= maxY; m += step) {
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y(m));
    ctx.lineTo(w - pad.right, y(m));
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`×${Number(m.toFixed(2))}`, pad.left - 6 * unit, y(m));
  }
  if (elapsedMs <= 0) return null;

  // The curve: e^(growth × t), sampled finely enough to look smooth.
  for (let i = 0; i <= SAMPLES; i++) {
    const ms = (elapsedMs * i) / SAMPLES;
    curve[i * 2] = x(ms);
    curve[i * 2 + 1] = y(Math.min(top / 100, Math.exp((rules.growth * ms) / 1000)));
  }
  const endX = curve[SAMPLES * 2];
  const endY = curve[SAMPLES * 2 + 1];
  const tracePath = () => {
    for (let i = 0; i <= SAMPLES; i++) ctx.lineTo(curve[i * 2], curve[i * 2 + 1]);
  };
  const stroke = gradient(ctx, pad.left, 0, endX, 0, spread(colors));

  // The area under it, fading to the bottom.
  const fill = gradient(ctx, 0, endY, 0, pad.top + plotH, [
    [0, `${colors[colors.length - 1]}55`],
    [1, `${colors[0]}00`],
  ]);
  ctx.beginPath();
  ctx.moveTo(curve[0], pad.top + plotH);
  tracePath();
  ctx.lineTo(endX, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = crashed ? 0.5 : 1;
  ctx.fill();

  // The line itself: in the colors of the height reached, or a cosmetic trail's along its whole length, the same thin
  // line with a soft glow of its own.
  const trail = look?.trail;
  let line: CanvasGradient = stroke;
  if (trail?.colors.length) {
    line = gradient(ctx, pad.left, 0, endX, 0, spread(trail.colors));
    ctx.shadowColor = trail.colors[trail.colors.length - 1];
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.moveTo(curve[0], curve[1]);
  tracePath();
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // The tip: a glowing dot in flight, a cross where it crashed.
  ctx.fillStyle = colors[colors.length - 1];
  ctx.strokeStyle = colors[colors.length - 1];
  if (crashed) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(endX - 6, endY - 6);
    ctx.lineTo(endX + 6, endY + 6);
    ctx.moveTo(endX + 6, endY - 6);
    ctx.lineTo(endX - 6, endY + 6);
    ctx.stroke();
  } else {
    // Sparks of a cosmetic trail, falling off behind the tip as the round flies.
    if (trail?.sparks) {
      for (let i = 0; i < 9; i++) {
        const phase = (elapsedMs / 700 + i / 9) % 1;
        const sx = endX - phase * 46 - ((i * 13) % 9);
        const sy = endY + phase * phase * 34 + ((i * 7) % 11) - 5;
        ctx.globalAlpha = 1 - phase;
        ctx.fillStyle = trail.colors[i % trail.colors.length];
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2 - phase * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors[colors.length - 1];
    }
    const prev = Math.max(0, SAMPLES - 3) * 2;
    const [prevX, prevY] = [curve[prev], curve[prev + 1]];
    const angle = Math.atan2(endY - prevY, endX - prevX);
    if (!look?.head || !drawHead(ctx, look.head, endX, endY, angle)) {
      ctx.shadowColor = colors[colors.length - 1];
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  return { x: endX, y: endY };
}

type Props = {
  rules: CrashRules;
  snapshot: CrashSnapshot | null;
  serverNow: () => number;
  online: boolean;
  full: boolean;
  /** The player's cosmetics: the tip and trail of the curve, the bursts at their cash-out and at the crash. */
  look?: CrashLook | null;
  /** The player's bet in the round, once cashed out: its burst plays when this turns up. */
  cashedOut?: number | null;
};

export function CrashChart({ rules, snapshot, serverNow, online, full, look = null, cashedOut = null }: Props) {
  const t = useTranslations("crash");
  const { fixed } = useFormat();
  const mult = useMultiplier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tip = useRef<Tip>(null);
  const round = snapshot?.round ?? null;
  const crashed = round?.crash != null;
  // The text follows the clock twenty times a second, while bets are taken and in flight; frozen while the stream is
  // down, so the curve does not climb on past a crash the page has not heard of.
  const now = useFrameNow(serverNow, !!round && !crashed && online);

  /** The round at `at`: where the curve is (in flight it may pass the crash point a moment before the stream says so). */
  const viewAt = (at: number) => {
    const betting = !!round && !crashed && at < round.startAt;
    const elapsedMs = !round || betting ? 0 : crashed ? msToReach(rules, round.crash!) : at - round.startAt;
    const top = crashed ? round!.crash! : multiplierAt(rules, elapsedMs);
    // The curve takes the multiplier unrounded: floored to hundredths, its tip and scale would move in steps.
    const curveTop = crashed ? top : Math.min(rules.maxCrash, 100 * Math.exp((rules.growth * elapsedMs) / 1000));
    return { betting, elapsedMs, top, tier: tierOf(rules, top), curveTop };
  };
  const { betting, top, tier } = viewAt(now);
  const flying = !!round && !crashed && !betting;
  const animating = flying && online;

  const paint = (at: number) => {
    if (!canvasRef.current) return;
    const v = viewAt(at);
    tip.current = draw(canvasRef.current, rules, v.elapsedMs, v.curveTop, TIER_STROKE[v.tier], crashed, look);
  };
  // In flight the canvas is drawn on every frame by itself, not by React; otherwise (the countdown, the crash, the
  // stream down) the picture stands still and is drawn when something changes, the size of the chart included.
  useFrameLoop(serverNow, animating, paint);
  const paintStill = useEffectEvent(() => {
    if (!animating) paint(now);
  });
  useEffect(() => paintStill());
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => paintStill());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // The cosmetic bursts: where the round crashes, if it was seen flying (not on a page opened after), and over the
  // tip at the player's own cash-out.
  const roundId = round?.id ?? null;
  const seenFlying = useRef<number | null>(null);
  const burstAt = useEffectEvent((b: Burst) => {
    const box = boxRef.current;
    if (box && tip.current) playBurst(box, tip.current.x, tip.current.y, b);
  });
  useEffect(() => {
    if (flying) seenFlying.current = roundId;
    else if (crashed && roundId !== null && seenFlying.current === roundId) {
      seenFlying.current = null;
      if (look?.burst) burstAt(look.burst);
    }
  }, [flying, crashed, roundId, look?.burst]);
  // Only a cash-out that comes while the page is open: not one already made when it opened.
  const lastCashout = useRef(cashedOut);
  useEffect(() => {
    if (cashedOut === lastCashout.current) return;
    lastCashout.current = cashedOut;
    if (cashedOut !== null && look?.cashout) burstAt(look.cashout);
  }, [cashedOut, look?.cashout]);

  const left = round ? Math.max(0, round.startAt - now) : 0;
  return (
    <div ref={boxRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 ring-1 ring-foreground/10">
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />

      <div className="pointer-events-none absolute inset-y-0 right-0 left-10 flex flex-col items-center justify-center gap-1 p-4 text-center">
        {(flying || crashed) && (
          <p className={cn("font-heading text-3xl font-bold tabular-nums drop-shadow sm:text-4xl", TIER_TEXT[tier])}>{mult(top)}</p>
        )}
        {betting && (
          <>
            <p className="text-xs font-medium text-white/70">{t("betsOpen")}</p>
            <p className="font-heading text-2xl font-bold text-white tabular-nums">{t("startsIn", { s: fixed(left / 1000, 1) })}</p>
            <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white/70" style={{ width: `${Math.min(100, (left / rules.bettingMs) * 100)}%` }} />
            </div>
          </>
        )}
        {!round && (
          <p className="font-heading text-lg font-semibold text-white/70">{full ? t("full") : !snapshot ? t("connecting") : t("idle")}</p>
        )}
      </div>

      {!online && snapshot && <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/60">{t("offline")}</p>}
    </div>
  );
}
