import { PRIMARY } from "../canvas";
import { Label } from "../parts";

/** A flag tapped: rings from the finger and the Qzr it gave floating up. */
export function Clicker() {
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
