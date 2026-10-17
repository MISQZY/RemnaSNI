import { DRAIN, FPS, HEIGHT, RUNNING, WIDTH } from "./constants";
import { pointAt } from "./geometry";
import type { Line, Point } from "./types";

/**
 * Runs the pulses on the corners' canvases (`layouts[i]` on canvas i) until the returned function stops them; with
 * reduced motion, never starts. Hidden corners have no size and are skipped; in a hidden tab the browser holds the
 * frames back on its own.
 */
export function animate(canvases: (HTMLCanvasElement | null)[], layouts: Line[][]) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // The canvases are sized in device pixels, so the pulses stay sharp; resizing a canvas clears it.
  const resize = new ResizeObserver((entries) => {
    for (const { target, contentRect, devicePixelContentBoxSize } of entries) {
      const canvas = target as HTMLCanvasElement;
      const box = devicePixelContentBoxSize?.[0];
      canvas.width = box ? box.inlineSize : Math.round(contentRect.width * devicePixelRatio);
      canvas.height = box ? box.blockSize : Math.round(contentRect.height * devicePixelRatio);
    }
  });
  for (const canvas of canvases) {
    if (!canvas) continue;
    try {
      resize.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      resize.observe(canvas);
    }
  }

  let frame = 0;
  let drawn = -Infinity;
  let color = "";
  let colorRead = -Infinity;
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    // A little slack, so a 60 Hz screen does not skip a frame too many now and then.
    if (now - drawn < 1000 / FPS - 2) return;
    drawn = now;
    // The color changes with the theme, rarely: looked up twice a second rather than on every frame.
    if (now - colorRead > 500) {
      colorRead = now;
      const first = canvases.find(Boolean);
      if (first) color = getComputedStyle(first).color;
    }
    canvases.forEach((canvas, i) => canvas && draw(canvas, layouts[i]!, now / 1000, color));
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
  };
}

/** The pulses and the lit pads of one corner at `time` s, faded out towards the middle of the page as the traces are. */
function draw(canvas: HTMLCanvasElement, lines: Line[], time: number, color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  for (const line of lines) {
    // One clock for the pulse and its pad, so the pad lights up just as the pulse lands in it.
    const t = (((time - line.delay) % line.cycle) + line.cycle) % line.cycle / line.cycle;
    // Where the pulse's head is along its line, from 0 to 1: running to the pad, then past it as its tail drains in.
    const head = t < RUNNING ? t / RUNNING : t < RUNNING + DRAIN ? 1 + (line.dash * (t - RUNNING)) / DRAIN : undefined;
    if (head !== undefined) {
      ctx.globalAlpha = 0.6;
      stroke(ctx, line, Math.max(0, head - line.dash), Math.min(1, head));
    }
    // The pad flares up in a moment as the pulse lands, then dims slowly.
    const lit = t < 0.39 ? 0 : t < 0.41 ? (t - 0.39) / 0.02 : t < 0.6 ? (0.6 - t) / 0.19 : 0;
    if (lit > 0) {
      ctx.globalAlpha = 0.25 * lit;
      dot(ctx, line.end, 6);
      ctx.globalAlpha = lit;
      dot(ctx, line.end, 2);
    }
  }

  // The same fade as the mask over the traces: a circle from the corner, as far as the farthest corner of the drawing.
  const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(WIDTH, HEIGHT));
  fade.addColorStop(0.15, "#000");
  fade.addColorStop(0.7, "transparent");
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/** The stretch of a line from `from` to `to`, as shares of its length. */
function stroke(ctx: CanvasRenderingContext2D, { points, at }: Line, from: number, to: number) {
  if (to <= from) return;
  ctx.beginPath();
  ctx.moveTo(...pointAt(points, at, from));
  for (let i = 1; i < points.length - 1; i++) if (at[i]! > from && at[i]! < to) ctx.lineTo(...points[i]!);
  ctx.lineTo(...pointAt(points, at, to));
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, [x, y]: Point, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}
