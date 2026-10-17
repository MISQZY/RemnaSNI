import type { CSSProperties, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

/*
 * A small drawn scene of each game, for the games on the home page of the website and on the hub of a RemnaSNI site.
 * The same file in both repositories (src/components/game-preview.tsx in RemnaWeb, src/core/ui/game-preview.tsx in
 * RemnaSNI): change one, copy it to the other. Line art in the circuit backdrop's manner: the lines in the text color
 * (set `text-muted-foreground` or the like on it), what the game is about in --primary. Still until the card it sits in
 * (a `.group`) is hovered or focused: then the scene starts as the game would, a flicker of power and a scanline running
 * down, and plays its own loop while the card stays under the pointer. The styles come with the component (one hoisted
 * <style>), so a page needs nothing of its own; with `prefers-reduced-motion` nothing moves.
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
    <>
      <style href="game-preview" precedence="default">
        {CSS}
      </style>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block", className)} {...props}>
        <g className="gp-boot">
          <Dots />
          <Scene />
        </g>
        <rect className="gp-scan" x={0} y={-4} width={W} height={4} fill={PRIMARY} opacity={0} />
      </svg>
    </>
  );
}

/*
 * What each `.gp-*` part of a scene does while its card is hovered (on a device that can hover) or focused. Parts turn
 * and scale about their own box, the cards of Sacrifice about the point their hand is held at. Only the `.gp-*` parts
 * get an origin: on an element with a `transform` attribute it would move that transform too, so those are wrapped.
 */
const PLAY: Record<string, string> = {
  boot: "animation: gp-boot 0.45s steps(1, end)",
  scan: "animation: gp-scan 0.7s ease-out",
  ripple: "animation: gp-ripple 1.2s ease-out infinite",
  tap: "animation: gp-tap 1.2s ease-out infinite",
  rise: "animation: gp-rise 1.2s ease-out infinite",
  idle: "opacity: 0",
  live: "opacity: 1",
  crawl: "animation: gp-crawl 2.6s steps(13, end) infinite",
  eat: "animation: gp-eat 2.6s ease-out infinite",
  bob: "animation: gp-bob 0.8s ease-in-out infinite alternate",
  wave: "animation: gp-wave 2.4s linear infinite",
  swim: "animation: gp-swim 1.8s ease-in-out infinite alternate",
  climb: "animation: gp-climb 2.6s infinite",
  peak: "animation: gp-peak 2.6s ease-out infinite",
  "fan-l": "animation: gp-fan-l 1.4s ease-in-out infinite alternate",
  "fan-r": "animation: gp-fan-r 1.4s ease-in-out infinite alternate",
  pick: "animation: gp-pick 1.4s ease-in-out infinite alternate",
  flash: "animation: gp-flash 1.5s ease-in-out infinite",
  twinkle: "animation: gp-twinkle 1.5s ease-in-out infinite",
  march: "animation: gp-march 0.6s linear infinite",
};

const played = (on: string) =>
  Object.entries(PLAY)
    .map(([part, rule]) => `${on} .gp-${part}{${rule}}`)
    .join("");

const CSS = `
.gp-boot [class*="gp-"]{transform-box:fill-box;transform-origin:center}
.gp-live{opacity:0}
.gp-boot .gp-fan-l,.gp-boot .gp-fan-r,.gp-boot .gp-pick{transform-box:view-box;transform-origin:160px 200px}
@media (prefers-reduced-motion:no-preference){
  @media (hover:hover){${played(".group:hover")}}
  ${played(".group:focus-visible")}
}
@keyframes gp-boot{0%{opacity:.35}18%{opacity:1}30%{opacity:.55}45%{opacity:1}}
@keyframes gp-scan{from{transform:translateY(0);opacity:.4}to{transform:translateY(${H + 4}px);opacity:0}}
@keyframes gp-ripple{from{transform:scale(.35);opacity:1}to{transform:scale(1.25);opacity:0}}
@keyframes gp-tap{0%,100%{transform:scale(1)}8%{transform:scale(.96)}20%{transform:scale(1.01)}}
@keyframes gp-rise{from{transform:translateY(8px);opacity:0}25%{opacity:1}to{transform:translateY(-14px);opacity:0}}
@keyframes gp-crawl{from{stroke-dashoffset:var(--at)}to{stroke-dashoffset:calc(var(--at) - 260px)}}
@keyframes gp-eat{0%{transform:scale(.4);opacity:0}8%,92%{transform:scale(1);opacity:1}98%,to{transform:scale(1.8);opacity:0}}
@keyframes gp-bob{to{transform:translateY(3px)}}
@keyframes gp-wave{to{transform:translateX(-40px)}}
@keyframes gp-swim{from{transform:translateX(-10px)}to{transform:translateX(14px)}}
@keyframes gp-climb{0%{clip-path:inset(-10px 100% -10px -10px);animation-timing-function:cubic-bezier(.55,0,.9,.5)}72%,86%{clip-path:inset(-10px);opacity:1}to{clip-path:inset(-10px);opacity:0}}
@keyframes gp-peak{0%,70%{transform:scale(.4);opacity:0}76%{transform:scale(1.3);opacity:1}90%,to{transform:scale(2.2);opacity:0}}
@keyframes gp-fan-l{to{transform:rotate(-6deg)}}
@keyframes gp-fan-r{to{transform:rotate(6deg)}}
@keyframes gp-pick{to{transform:translateY(-8px)}}
@keyframes gp-flash{0%,100%{opacity:1;transform:scale(1)}40%{opacity:.35;transform:scale(1.25)}55%{opacity:1;transform:scale(.9)}}
@keyframes gp-twinkle{0%,100%{stroke-opacity:1}50%{stroke-opacity:.3}}
@keyframes gp-march{to{stroke-dashoffset:-8}}
`;

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
      <g className="gp-tap">
        <g transform="rotate(-6 160 96)">
          <rect x={104} y={58} width={112} height={76} rx={6} fill="var(--card)" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} />
          <rect x={104} y={58} width={112} height={25} rx={6} fill="currentColor" opacity={0.18} />
          <rect x={104} y={108} width={112} height={26} rx={6} fill={PRIMARY} opacity={0.22} />
        </g>
      </g>
      {[12, 24, 38].map((r, i) => (
        <g key={r} opacity={0.9 - i * 0.3}>
          <circle className="gp-ripple" cx={176} cy={100} r={r} fill="none" stroke={PRIMARY} strokeWidth={2} style={{ animationDelay: `${i * -0.4}s` }} />
        </g>
      ))}
      <circle className="gp-tap" cx={176} cy={100} r={4} fill={PRIMARY} />
      <g className="gp-rise">
        <Label x={226} y={60} size={18} accent>
          +1
        </Label>
      </g>
      <g className="gp-rise" style={{ animationDelay: "-0.5s" }}>
        <Label x={238} y={36} size={13} accent faint>
          +1
        </Label>
      </g>
      <g className="gp-rise" style={{ animationDelay: "-0.85s" }}>
        <Label x={70} y={52} size={15} accent faint>
          +3
        </Label>
      </g>
    </g>
  );
}

/*
 * The way the snake crawls once the scene plays: along the dot grid, cell by cell, up to the crystal (340 long). Its
 * faint trail, body and head are dashes of this one path, moved along it a cell (20) at a time by `gp-crawl`.
 */
const SNAKE_WAY = "M20 160 V120 H120 V80 H220 V120 H240";

/** The snake turning toward a crystal; playing, it crawls there and eats it. */
function Snake() {
  const dash = (at: number, length: number, width: number, opacity = 1) => (
    <path
      className="gp-crawl"
      d={SNAKE_WAY}
      fill="none"
      stroke={PRIMARY}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${length} 1000`}
      opacity={opacity}
      style={{ "--at": `${-at}px` } as CSSProperties}
    />
  );
  return (
    <g>
      <g className="gp-idle">
        <polyline points="40,160 40,120 120,120 120,80 200,80" fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <polyline points="120,100 120,80 200,80" fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={200} cy={80} r={9} fill={PRIMARY} />
        <circle cx={203} cy={77} r={2} fill="var(--card)" />
      </g>
      <g className="gp-live">
        {dash(-60, 60, 12, 0.35)}
        {dash(0, 100, 12)}
        {dash(100, 0, 18)}
      </g>
      <g className="gp-eat">
        <path d="M260 100 l10 20 l-10 20 l-10 -20 z" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        <path d="M260 100 l4 20 l-4 20" fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
      </g>
    </g>
  );
}

/** A float on the lake, a bite sending rings out, a fish below. */
function Fishing() {
  const wave = (y: number) => `M0 ${y} ${Array.from({ length: 9 }, (_, i) => `Q${i * 40 + 20} ${y - 5} ${i * 40 + 40} ${y}`).join(" ")}`;
  return (
    <g fill="none">
      <path d="M320 0 C 280 30, 230 50, 196 76" stroke="currentColor" strokeWidth={1} opacity={0.6} />
      <path className="gp-wave" d={wave(96)} stroke="currentColor" strokeWidth={1.5} opacity={0.7} />
      <path className="gp-wave" d={wave(124)} stroke="currentColor" strokeWidth={1} opacity={0.35} style={{ animationDuration: "3.2s" }} />
      <path className="gp-wave" d={wave(152)} stroke="currentColor" strokeWidth={1} opacity={0.2} style={{ animationDuration: "4s" }} />
      <g opacity={0.7}>
        <ellipse className="gp-ripple" cx={196} cy={96} rx={26} ry={5} stroke={PRIMARY} strokeWidth={1.5} />
      </g>
      <g opacity={0.35}>
        <ellipse className="gp-ripple" cx={196} cy={96} rx={44} ry={9} stroke={PRIMARY} strokeWidth={1} style={{ animationDelay: "-0.6s" }} />
      </g>
      <g className="gp-bob">
        <line x1={196} y1={76} x2={196} y2={86} stroke="currentColor" strokeWidth={2} />
        <path d="M187 95 a9 9 0 0 1 18 0 z" fill={PRIMARY} />
        <path d="M187 95 a9 9 0 0 0 18 0 z" fill="currentColor" opacity={0.6} />
      </g>
      <path className="gp-swim" d="M86 146 q24 -14 48 0 q-24 14 -48 0 z M134 146 l12 -8 v16 z" fill="currentColor" opacity={0.3} />
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
      <g className="gp-climb">
        <path d={`${curve} L284 160 Z`} fill={PRIMARY} opacity={0.1} />
        <path d={curve} fill="none" stroke={PRIMARY} strokeWidth={3} strokeLinecap="round" />
        <circle cx={284} cy={44} r={6} fill={PRIMARY} />
      </g>
      <g opacity={0.4}>
        <circle className="gp-peak" cx={284} cy={44} r={12} fill="none" stroke={PRIMARY} strokeWidth={1.5} />
      </g>
      <Label x={36} y={66} size={30}>
        2.41×
      </Label>
    </g>
  );
}

/** A hand of cards, the one to sacrifice lifted. */
function Sacrifice() {
  const card = (angle: number, lifted: boolean) => (
    <g transform={`rotate(${angle} 160 200) translate(0 ${lifted ? -10 : 0})`}>
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
  return (
    <g>
      <g className="gp-fan-l">{card(-22, false)}</g>
      <g className="gp-fan-r">{card(22, false)}</g>
      <g className="gp-pick">{card(0, true)}</g>
    </g>
  );
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
          className={lit ? "gp-flash" : (row * 3 + col * 5) % 7 === 0 ? "gp-twinkle" : undefined}
          style={{ animationDelay: lit ? `${(col - 3) * 0.08}s` : `${-col * 0.3}s` }}
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
      <rect className="gp-march" x={130} y={58} width={92} height={32} rx={16} fill="none" stroke={PRIMARY} strokeWidth={1.5} strokeDasharray="4 4" />
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
