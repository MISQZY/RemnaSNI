import { useId, type SVGProps } from "react";

// A Qzr key (Qzr ключ), the prestige currency, drawn as a chip: Qzr crystals (qzr-icon.tsx) growing out of a microchip, with
// the same faces, colors and glints. Sized like lucide icons.

/** Left, right and middle face, tip glint and side glint of each crystal, back to front. */
const CRYSTALS: [string, string, string, string, string][] = [
  ["3.8,9.89 3.61,12.76 6.01,16.92 8.6,18.2", "3.8,9.89 6.39,11.16 8.79,15.32 8.6,18.2", "3.8,9.89 4.31,12.36 7.19,17.35 8.6,18.2 8.57,16.55 5.69,11.56", "3.8,9.89 4.31,12.36 4.72,12.12", "4.16,13.07 4.39,12.93 6.18,16.03 5.84,15.98"],
  ["20.66,8.31 17.75,9.94 15.13,14.88 15.4,18.2", "20.66,8.31 20.93,11.63 18.3,16.57 15.4,18.2", "20.66,8.31 18.55,10.36 15.39,16.29 15.4,18.2 16.98,17.14 20.14,11.21", "20.66,8.31 18.55,10.36 19.03,10.61", "17.78,10.66 18.05,10.8 16.09,14.48 15.94,14.12"],
  ["14.71,2.12 10.47,5.38 8.62,13.42 11,18.2", "14.71,2.12 17.1,6.91 15.24,14.95 11,18.2", "14.71,2.12 12.13,5.76 9.9,15.41 11,18.2 13.21,16.17 15.44,6.52", "14.71,2.12 12.13,5.76 13.12,5.99", "10.93,6.42 11.49,6.55 10.11,12.54 9.63,12.05"],
];

/** X of the chip's pins. */
const PINS = [6.8,9.4,12,14.6,17.2];

/** Brand colors by default; `mono` takes the text color, with the parts told apart by opacity. */
export function ChipIcon({ mono = false, ...props }: SVGProps<SVGSVGElement> & { mono?: boolean }) {
  // Gradient ids must be unique per instance; useId's may hold characters url(#…) does not like.
  const id = `chip${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill={mono ? "currentColor" : "none"}
      aria-hidden="true"
      {...props}
      // The same faint halo as the Qzr crystal; the mono one stays flat.
      style={mono ? props.style : { filter: "drop-shadow(0 0 3px oklch(0.74 0.22 149 / 0.5))", ...props.style }}
    >
      {!mono && (
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b8ffd0" />
            <stop offset="1" stopColor="#2ee06a" />
          </linearGradient>
          <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5cf08e" />
            <stop offset="1" stopColor="#139a45" />
          </linearGradient>
          <linearGradient id={`${id}-r`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1fb857" />
            <stop offset="1" stopColor="#0a5a28" />
          </linearGradient>
        </defs>
      )}
      <clipPath id={`${id}-above`}>
        <rect width="24" height="14.9" />
      </clipPath>
      {/* Cut at the chip's top edge: the crystals come out of the body, which the mono chip does not hide. */}
      <g clipPath={`url(#${id}-above)`}>
      {CRYSTALS.map(([left, right, middle, tip, side], i) => (
        <g key={i} stroke={mono ? undefined : "#06381a"} strokeWidth={mono ? undefined : 0.4} strokeLinejoin="round">
          <polygon points={left} fill={mono ? undefined : `url(#${id}-l)`} opacity={mono ? 0.75 : undefined} />
          <polygon points={right} fill={mono ? undefined : `url(#${id}-r)`} opacity={mono ? 0.45 : undefined} />
          <polygon points={middle} fill={mono ? undefined : `url(#${id}-m)`} />
          {!mono && (
            <>
              <polygon points={tip} fill="#fff" opacity="0.55" stroke="none" />
              <polygon points={side} fill="#fff" opacity="0.25" stroke="none" />
            </>
          )}
        </g>
      ))}
      </g>
      {/* The chip the crystals grow out of: pins, body, lit top edge, pin-1 notch. */}
      {PINS.map((x) => (
        <rect key={x} x={x - 0.6} y="20" width="1.2" height="2.6" rx="0.3" fill={mono ? undefined : "#c9a15a"} opacity={mono ? 0.5 : undefined} />
      ))}
      <rect x="4.5" y="14.4" width="15" height="6" rx="1.3" fill={mono ? undefined : "#121a15"} stroke={mono ? undefined : "#2f4a37"} strokeWidth="0.5" opacity={mono ? 0.35 : undefined} />
      <rect x="5.3" y="14.9" width="13.4" height="0.9" rx="0.45" fill={mono ? undefined : "#2ee06a"} opacity={mono ? 0.6 : 0.35} />
      <circle cx="6.6" cy="18.4" r="0.65" fill={mono ? undefined : "#2ee06a"} opacity={mono ? 0.6 : 0.7} />
    </svg>
  );
}
