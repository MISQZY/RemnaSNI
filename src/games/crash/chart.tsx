"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useFormat } from "@/core/i18n/provider";
import { cn } from "@/lib/utils";
import { msToReach, multiplierAt, tierOf, type CrashRules, type CrashSnapshot, type CrashTier } from "./rules";
import { useFrameNow } from "./stream";

// The round on a chart: the multiplier's curve as it grows, in the color its height has reached (the rarities of
// RemnaWeb's pets, grey to cosmic), the countdown while bets are taken and the crash point once it has crashed.

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

function draw(canvas: HTMLCanvasElement, rules: CrashRules, elapsedMs: number, top: number, colors: string[], crashed: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // The right edge leaves room for the tip only, so the curve runs up to it.
  const pad = { left: 40, right: 10, top: 16, bottom: 16 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  // The scale grows with the round, so the curve always fills most of the chart.
  const spanMs = Math.max(8_000, elapsedMs);
  const maxY = Math.max(2, (top / 100) * 1.2);
  const x = (ms: number) => pad.left + (ms / spanMs) * plotW;
  const y = (m: number) => pad.top + plotH - ((m - 1) / (maxY - 1)) * plotH;

  // The grid, with the multipliers it marks.
  const step = STEPS.find((s) => (maxY - 1) / s <= 4) ?? STEPS[STEPS.length - 1];
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
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
    ctx.fillText(`×${Number(m.toFixed(2))}`, pad.left - 6, y(m));
  }
  if (elapsedMs <= 0) return;

  // The curve: e^(growth × t), sampled finely enough to look smooth.
  const points: [number, number][] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const ms = (elapsedMs * i) / n;
    points.push([x(ms), y(Math.min(top / 100, Math.exp((rules.growth * ms) / 1000)))]);
  }
  const [endX, endY] = points[points.length - 1];
  const stroke = ctx.createLinearGradient(pad.left, 0, endX, 0);
  colors.forEach((c, i) => stroke.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));

  // The area under it, fading to the bottom.
  const fill = ctx.createLinearGradient(0, endY, 0, pad.top + plotH);
  fill.addColorStop(0, `${colors[colors.length - 1]}55`);
  fill.addColorStop(1, `${colors[0]}00`);
  ctx.beginPath();
  ctx.moveTo(points[0][0], pad.top + plotH);
  for (const [px, py] of points) ctx.lineTo(px, py);
  ctx.lineTo(endX, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = crashed ? 0.5 : 1;
  ctx.fill();

  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
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
    ctx.shadowColor = colors[colors.length - 1];
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

type Props = {
  rules: CrashRules;
  snapshot: CrashSnapshot | null;
  serverNow: () => number;
  online: boolean;
  full: boolean;
};

export function CrashChart({ rules, snapshot, serverNow, online, full }: Props) {
  const t = useTranslations("crash");
  const { fixed } = useFormat();
  const mult = useMultiplier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const now = useFrameNow(serverNow, !!snapshot?.round);

  const round = snapshot?.round ?? null;
  const crashed = round?.crash != null;
  const betting = !!round && !crashed && now < round.startAt;
  const flying = !!round && !crashed && !betting;
  // Where the curve is now; in flight it may pass the crash point a moment before the stream says so.
  const elapsedMs = !round || betting ? 0 : crashed ? msToReach(rules, round.crash!) : now - round.startAt;
  const top = crashed ? round!.crash! : multiplierAt(rules, elapsedMs);
  const tier = tierOf(rules, top);
  // The curve takes the multiplier unrounded: floored to hundredths, its tip and scale would move in steps.
  const curveTop = crashed ? top : Math.min(rules.maxCrash, 100 * Math.exp((rules.growth * elapsedMs) / 1000));

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, rules, elapsedMs, curveTop, TIER_STROKE[tier], crashed);
  });

  const left = round ? Math.max(0, round.startAt - now) : 0;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 ring-1 ring-foreground/10">
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
