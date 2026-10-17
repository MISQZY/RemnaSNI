import { PRIMARY } from "../canvas";

/** A float on the lake, a bite sending rings out, a fish below. */
export function Fishing() {
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
