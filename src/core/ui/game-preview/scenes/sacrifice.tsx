import { PRIMARY } from "../canvas";

/** A hand of cards, the one to sacrifice lifted. */
export function Sacrifice() {
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
