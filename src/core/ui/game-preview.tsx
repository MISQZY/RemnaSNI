import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

/*
 * A small drawn scene of each game, for the games on the home page of the website and on the hub of a RemnaSNI site.
 * The same file in both repositories (src/components/game-preview.tsx in RemnaWeb, src/core/ui/game-preview.tsx in
 * RemnaSNI): change one, copy it to the other. Line art in the circuit backdrop's manner: the lines in the text color
 * (set `text-muted-foreground` or the like on it), what the game is about in --primary. Static, nothing animates.
 */

const W = 320;
const H = 180;
const PRIMARY = "var(--primary)";

const SCENES: Record<string, () => ReactNode> = { clicker: Clicker, snake: Snake, fishing: Fishing, crash: Crash, sacrifice: Sacrifice, gems: Gems };

/** The scene of the game `id`, nothing for a game without one. */
export function GamePreview({ id, className, ...props }: { id: string } & SVGProps<SVGSVGElement>) {
  const Scene = SCENES[id];
  if (!Scene) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block", className)} {...props}>
      <Dots />
      <Scene />
    </svg>
  );
}

/** The faint grid of dots every scene stands on. */
function Dots() {
  const dots: ReactNode[] = [];
  for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1} />);
  return (
    <g fill="currentColor" opacity={0.28}>
      {dots}
    </g>
  );
}

/** A flag tapped: rings from the finger and the Qzr it gave floating up. */
function Clicker() {
  return (
    <g>
      <g transform="rotate(-6 160 96)">
        <rect x={104} y={58} width={112} height={76} rx={6} fill="var(--card)" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} />
        <rect x={104} y={58} width={112} height={25} rx={6} fill="currentColor" opacity={0.18} />
        <rect x={104} y={108} width={112} height={26} rx={6} fill={PRIMARY} opacity={0.22} />
      </g>
      {[12, 24, 38].map((r, i) => (
        <circle key={r} cx={176} cy={100} r={r} fill="none" stroke={PRIMARY} strokeWidth={2} opacity={0.9 - i * 0.3} />
      ))}
      <circle cx={176} cy={100} r={4} fill={PRIMARY} />
      <Label x={226} y={60} size={18} accent>
        +1
      </Label>
      <Label x={238} y={36} size={13} accent faint>
        +1
      </Label>
      <Label x={70} y={52} size={15} accent faint>
        +3
      </Label>
    </g>
  );
}

/** The snake turning toward a crystal. */
function Snake() {
  return (
    <g>
      <polyline points="40,160 40,120 120,120 120,80 200,80" fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
      <polyline points="120,100 120,80 200,80" fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={200} cy={80} r={9} fill={PRIMARY} />
      <circle cx={203} cy={77} r={2} fill="var(--card)" />
      <path d="M260 100 l10 20 l-10 20 l-10 -20 z" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <path d="M260 100 l4 20 l-4 20" fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
    </g>
  );
}

/** A float on the lake, a bite sending rings out, a fish below. */
function Fishing() {
  const wave = (y: number) => `M0 ${y} ${Array.from({ length: 9 }, (_, i) => `Q${i * 40 + 20} ${y - 5} ${i * 40 + 40} ${y}`).join(" ")}`;
  return (
    <g fill="none">
      <path d="M320 0 C 280 30, 230 50, 196 76" stroke="currentColor" strokeWidth={1} opacity={0.6} />
      <path d={wave(96)} stroke="currentColor" strokeWidth={1.5} opacity={0.7} />
      <path d={wave(124)} stroke="currentColor" strokeWidth={1} opacity={0.35} />
      <path d={wave(152)} stroke="currentColor" strokeWidth={1} opacity={0.2} />
      <ellipse cx={196} cy={96} rx={26} ry={5} stroke={PRIMARY} strokeWidth={1.5} opacity={0.7} />
      <ellipse cx={196} cy={96} rx={44} ry={9} stroke={PRIMARY} strokeWidth={1} opacity={0.35} />
      <line x1={196} y1={76} x2={196} y2={86} stroke="currentColor" strokeWidth={2} />
      <path d="M187 95 a9 9 0 0 1 18 0 z" fill={PRIMARY} />
      <path d="M187 95 a9 9 0 0 0 18 0 z" fill="currentColor" opacity={0.6} />
      <path d="M86 146 q24 -14 48 0 q-24 14 -48 0 z M134 146 l12 -8 v16 z" fill="currentColor" opacity={0.3} />
    </g>
  );
}

/** The multiplier climbing until it crashes. */
function Crash() {
  const curve = "M24 160 C 150 158, 220 128, 284 44";
  return (
    <g>
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1={24} y1={y} x2={300} y2={y} stroke="currentColor" strokeWidth={1} opacity={0.2} />
      ))}
      <path d={`${curve} L284 160 Z`} fill={PRIMARY} opacity={0.1} />
      <path d={curve} fill="none" stroke={PRIMARY} strokeWidth={3} strokeLinecap="round" />
      <circle cx={284} cy={44} r={6} fill={PRIMARY} />
      <circle cx={284} cy={44} r={12} fill="none" stroke={PRIMARY} strokeWidth={1.5} opacity={0.4} />
      <Label x={36} y={66} size={30}>
        2.41×
      </Label>
    </g>
  );
}

/** A hand of cards, the one to sacrifice lifted. */
function Sacrifice() {
  const card = (angle: number, lifted: boolean) => (
    <g key={angle} transform={`rotate(${angle} 160 200) translate(0 ${lifted ? -10 : 0})`}>
      <rect
        x={124}
        y={44}
        width={72}
        height={104}
        rx={8}
        fill="var(--card)"
        stroke={lifted ? PRIMARY : "currentColor"}
        strokeOpacity={lifted ? 1 : 0.5}
        strokeWidth={lifted ? 2 : 1.5}
      />
      <rect x={132} y={52} width={56} height={46} rx={4} fill={lifted ? PRIMARY : "currentColor"} opacity={lifted ? 0.18 : 0.12} />
      <path d={`M160 ${lifted ? 62 : 64} l10 12 l-10 12 l-10 -12 z`} fill="none" stroke={lifted ? PRIMARY : "currentColor"} strokeWidth={1.5} opacity={lifted ? 1 : 0.5} />
      <line x1={134} y1={112} x2={176} y2={112} stroke="currentColor" strokeWidth={2} strokeLinecap="round" opacity={0.3} />
      <line x1={134} y1={124} x2={164} y2={124} stroke="currentColor" strokeWidth={2} strokeLinecap="round" opacity={0.2} />
    </g>
  );
  return <g>{[card(-22, false), card(22, false), card(0, true)]}</g>;
}

/** A board of gems with three in a row about to clear. */
function Gems() {
  const gems: ReactNode[] = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 8; col++) {
      const lit = row === 1 && col >= 3 && col <= 5;
      const x = 48 + col * 32;
      const y = 42 + row * 32;
      gems.push(
        <path
          key={`${row}-${col}`}
          d={`M${x} ${y - 10} l10 10 l-10 10 l-10 -10 z`}
          fill={lit ? PRIMARY : "none"}
          stroke={lit ? PRIMARY : "currentColor"}
          strokeWidth={1.5}
          strokeLinejoin="round"
          opacity={lit ? 1 : 0.45}
        />,
      );
    }
  return (
    <g>
      <rect x={130} y={58} width={92} height={32} rx={16} fill="none" stroke={PRIMARY} strokeWidth={1.5} strokeDasharray="4 4" />
      {gems}
    </g>
  );
}

function Label({ x, y, size, accent, faint, children }: { x: number; y: number; size: number; accent?: boolean; faint?: boolean; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={700}
      fill={accent ? PRIMARY : "currentColor"}
      opacity={faint ? 0.55 : 1}
      style={{ fontFamily: "var(--font-heading)", fontVariantNumeric: "tabular-nums" }}
    >
      {children}
    </text>
  );
}
