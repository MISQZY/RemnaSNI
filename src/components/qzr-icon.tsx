import { useId, type SVGProps } from "react";

// Qzr, the game currency: the Qzyrium crystal leaning 45° to the right. Sized like lucide icons,
// so it fits the same slots (badges, buttons, labels).

const LEFT = "256,86 196,176 196,356 256,446";
const RIGHT = "256,86 316,176 316,356 256,446";
const MIDDLE = "256,86 226,176 226,392 256,446 286,392 286,176";

/** Brand colors by default; `mono` takes the text color, with the faces told apart by opacity. */
export function QzrIcon({ mono = false, ...props }: SVGProps<SVGSVGElement> & { mono?: boolean }) {
  // Gradient ids must be unique per instance; useId's may hold characters url(#…) does not like.
  const id = `qzr${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="122 132 268 268"
      width="24"
      height="24"
      fill={mono ? "currentColor" : "none"}
      aria-hidden="true"
      {...props}
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
      <g transform="rotate(45 256 266)">
        <polygon points={LEFT} fill={mono ? undefined : `url(#${id}-l)`} opacity={mono ? 0.75 : undefined} />
        <polygon points={RIGHT} fill={mono ? undefined : `url(#${id}-r)`} opacity={mono ? 0.45 : undefined} />
        <polygon points={MIDDLE} fill={mono ? undefined : `url(#${id}-m)`} />
        {!mono && (
          <>
            <polygon points="256,86 226,176 244,176" fill="#fff" opacity="0.55" />
            <polygon points="208,196 218,196 218,330 208,322" fill="#fff" opacity="0.25" />
          </>
        )}
      </g>
    </svg>
  );
}
