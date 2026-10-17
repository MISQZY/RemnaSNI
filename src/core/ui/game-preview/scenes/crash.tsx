import { PRIMARY } from "../canvas";
import { Label } from "../parts";

/** The multiplier climbing until it crashes. */
export function Crash() {
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
