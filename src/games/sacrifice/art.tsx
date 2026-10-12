import type { ReactNode } from "react";

// The art of the Sacrifice's cards, drawn here by hand on a 64×64 grid: the machines and miners of the Qzyrium
// mines. Metal takes `currentColor` (the card's rarity), crystals the brand's greens, as the Qzyrium druse in
// RemnaWeb's brand art. A card RemnaWeb adds without art here shows a plain crystal.

const C = { light: "#c4ffd8", bright: "#6af49a", mid: "#2ee06a", deep: "#119142", dark: "#094f23" };
const MOLTEN = "#f59e0b";

/** A crystal growing up from (x, y): `h` tall, `w` wide, leaning `r` degrees, faceted like the brand druse. */
function Shard({ x, y, h, w, r = 0 }: { x: number; y: number; h: number; w: number; r?: number }) {
  const hw = w / 2;
  const tip = -h;
  const shoulder = -h + w * 0.85;
  const foot = w * 0.18;
  const m = w / 5;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`} strokeLinejoin="round">
      <polygon points={`0,${tip} ${-hw},${shoulder} ${-hw},0 0,${foot}`} fill={C.bright} />
      <polygon points={`0,${tip} ${hw},${shoulder} ${hw},0 0,${foot}`} fill={C.deep} />
      <polygon points={`0,${tip} ${-m},${shoulder} ${-m},${foot * 0.6} 0,${foot} ${m},${foot * 0.6} ${m},${shoulder}`} fill={C.mid} />
      <polygon points={`0,${tip} ${-m},${shoulder} ${-m / 5},${shoulder}`} fill="#fff" opacity="0.45" />
      <polygon points={`0,${tip} ${-hw},${shoulder} ${-hw},0 0,${foot} ${hw},0 ${hw},${shoulder}`} fill="none" stroke={C.light} strokeOpacity="0.5" strokeWidth="0.8" />
    </g>
  );
}

/** A soft glow behind the art. */
const Glow = ({ cx = 32, cy = 32, r = 24, color = C.mid, o = 0.16 }: { cx?: number; cy?: number; r?: number; color?: string; o?: number }) => (
  <circle cx={cx} cy={cy} r={r} fill={color} opacity={o} />
);

/** Metal: a line in the rarity's color, with a faint fill of it. */
const metal = { stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const plate = { ...metal, fill: "currentColor", fillOpacity: 0.16 };

/** Points of a regular polygon. */
const ring = (cx: number, cy: number, r: number, n: number, turn = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n + turn;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

/** A saw blade: `teeth` teeth between radii `r1` and `r2`. */
function blade(cx: number, cy: number, r1: number, r2: number, teeth: number) {
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (Math.PI * 2 * i) / teeth;
    const b = a + Math.PI / teeth;
    pts.push(`${(cx + r2 * Math.cos(a)).toFixed(2)},${(cy + r2 * Math.sin(a)).toFixed(2)}`);
    pts.push(`${(cx + r1 * Math.cos(b)).toFixed(2)},${(cy + r1 * Math.sin(b)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const ART: Record<string, ReactNode> = {
  spark: (
    <>
      <Glow r={20} o={0.2} />
      <Glow r={11} color={C.light} o={0.25} />
      <path d="M32 9 L35.5 28.5 L55 32 L35.5 35.5 L32 55 L28.5 35.5 L9 32 L28.5 28.5 Z" fill={C.light} stroke={C.mid} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M32 18 L33.6 30.4 L46 32 L33.6 33.6 L32 46 L30.4 33.6 L18 32 L30.4 30.4 Z" fill="#fff" />
      <circle cx="32" cy="32" r="2.4" fill={C.mid} />
    </>
  ),

  miner: (
    <>
      <Glow cy={23} r={11} color={C.light} o={0.22} />
      <line x1="16" y1="58" x2="44" y2="40" {...metal} strokeWidth="3" />
      <path d="M36 34 Q47 35 53 46" {...metal} strokeWidth="3" fill="none" />
      <path d="M15 36 C15 23 23 15 32 15 C41 15 49 23 49 36 Z" {...plate} />
      <path d="M32 15 L32 36" {...metal} strokeWidth="1.2" opacity="0.6" />
      <rect x="10" y="35" width="44" height="5" rx="2.5" {...plate} fillOpacity={0.3} />
      <circle cx="32" cy="23" r="4.5" fill={C.light} stroke={C.mid} strokeWidth="1.2" />
      <circle cx="32" cy="23" r="1.8" fill="#fff" />
      <Shard x={50} y={60} h={14} w={6} r={14} />
    </>
  ),

  apprentice: (
    <>
      <circle cx="32" cy="36" r="22" fill="none" {...metal} strokeWidth="1.2" strokeDasharray="3 4" opacity="0.7" />
      <Glow cy={40} r={14} o={0.14} />
      <path d="M17 50 Q20 43 27 44 Q32 41 38 44 Q45 43 47 50 Z" {...plate} />
      <Shard x={27} y={47} h={15} w={7} r={-16} />
      <Shard x={33} y={46} h={22} w={8} />
      <Shard x={39} y={47} h={13} w={6} r={18} />
    </>
  ),

  master: (
    <>
      <Glow cy={36} r={26} o={0.18} />
      <path d="M8 56 Q12 46 22 47 Q32 43 42 47 Q52 46 56 56 Z" {...plate} />
      <Shard x={18} y={52} h={22} w={8} r={-30} />
      <Shard x={46} y={52} h={22} w={8} r={30} />
      <Shard x={25} y={50} h={32} w={10} r={-12} />
      <Shard x={39} y={50} h={30} w={10} r={13} />
      <Shard x={32} y={49} h={42} w={12} />
      <path d="M24 7 L28 12 L32 6 L36 12 L40 7" {...metal} fill="none" strokeWidth="1.5" />
    </>
  ),

  drone: (
    <>
      <line x1="22" y1="26" x2="11" y2="20" {...metal} />
      <line x1="42" y1="26" x2="53" y2="20" {...metal} />
      <ellipse cx="11" cy="18" rx="9" ry="2.4" {...plate} />
      <ellipse cx="53" cy="18" rx="9" ry="2.4" {...plate} />
      <polygon points={ring(32, 28, 11, 6, Math.PI / 6)} {...plate} />
      <circle cx="32" cy="28" r="4" fill={C.mid} stroke={C.light} strokeWidth="1" />
      <polygon points="26,37 38,37 32,57" {...plate} fillOpacity={0.3} />
      <path d="M27.5 42 L36.5 41 M29 47 L35 46 M30.5 52 L33.5 51.5" {...metal} strokeWidth="1.2" />
      <circle cx="32" cy="58" r="2" fill={C.light} opacity="0.8" />
    </>
  ),

  minecart: (
    <>
      <Shard x={22} y={33} h={16} w={7} r={-14} />
      <Shard x={31} y={33} h={22} w={8} r={4} />
      <Shard x={41} y={33} h={14} w={7} r={18} />
      <path d="M10 30 L54 30 L47 48 L17 48 Z" {...plate} />
      <line x1="13" y1="36" x2="51" y2="36" {...metal} strokeWidth="1.2" />
      <path d="M22 30 L24 48 M32 30 L32 48 M42 30 L40 48" {...metal} strokeWidth="1" opacity="0.6" />
      <circle cx="23" cy="51" r="4.5" {...plate} fillOpacity={0.35} />
      <circle cx="41" cy="51" r="4.5" {...plate} fillOpacity={0.35} />
      <line x1="4" y1="57" x2="60" y2="57" {...metal} strokeWidth="1.5" />
    </>
  ),

  spiker: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <polygon key={a} points="28.5,22 35.5,22 32,8" transform={`rotate(${a} 32 34)`} {...plate} fillOpacity={0.3} />
      ))}
      <polygon points={ring(32, 34, 13, 6)} {...plate} />
      <polygon points={ring(32, 34, 7, 6)} fill={C.deep} stroke={C.light} strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="32" cy="34" r="2.6" fill={C.light} />
    </>
  ),

  cutter: (
    <>
      <Glow r={23} color={MOLTEN} o={0.1} />
      <path d="M8 18 A26 26 0 0 1 22 8" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M56 46 A26 26 0 0 1 42 56" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <polygon points={blade(32, 32, 17, 22, 14)} {...plate} />
      <circle cx="32" cy="32" r="12" fill="none" {...metal} strokeWidth="1.2" opacity="0.7" />
      <circle cx="32" cy="32" r="5.5" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <circle cx="32" cy="32" r="2" fill={C.light} />
    </>
  ),

  scrapbot: (
    <>
      <path d="M38 18 L44 9" {...metal} strokeWidth="1.5" />
      <path d="M44 9 L48 11" {...metal} strokeWidth="1.5" />
      <circle cx="49" cy="11.5" r="2" fill={MOLTEN} />
      <g transform="rotate(-7 32 32)">
        <rect x="16" y="18" width="32" height="26" rx="3" {...plate} />
        <circle cx="25" cy="29" r="4.5" fill={C.mid} stroke={C.light} strokeWidth="1" />
        <path d="M36 25 L43 32 M43 25 L36 32" {...metal} strokeWidth="2" />
        <path d="M22 38 L42 38 M22 38 L22 41 M27 38 L27 41 M32 38 L32 41 M37 38 L37 41 M42 38 L42 41" {...metal} strokeWidth="1.2" />
        <circle cx="19.5" cy="21.5" r="1" fill="currentColor" />
        <circle cx="44.5" cy="21.5" r="1" fill="currentColor" />
      </g>
      <rect x="27" y="45" width="10" height="5" {...plate} />
      <path d="M18 56 L46 56 L42 50 L22 50 Z" {...plate} />
    </>
  ),

  scrapper: (
    <>
      <path d="M8 58 L14 58 L28 38 L40 30" {...metal} strokeWidth="5" fill="none" opacity="0.35" />
      <path d="M8 58 L14 58 L28 38 L40 30" {...metal} strokeWidth="2" fill="none" />
      <circle cx="28" cy="38" r="3.5" {...plate} fillOpacity={0.35} />
      <circle cx="40" cy="30" r="3" {...plate} fillOpacity={0.35} />
      <path d="M41 28 Q44 16 52 12" {...metal} fill="none" strokeWidth="2.2" />
      <path d="M43 31 Q55 28 58 18" {...metal} fill="none" strokeWidth="2.2" />
      <path d="M40 27 Q37 15 42 8" {...metal} fill="none" strokeWidth="2.2" />
      <Shard x={50} y={24} h={13} w={6} r={30} />
      <path d="M6 58 L22 58" {...metal} strokeWidth="2.5" />
    </>
  ),

  black_crystal: (
    <>
      <Glow r={22} o={0.22} />
      <polygon points="32,6 51,32 32,58 13,32" fill="#0b120e" stroke={C.mid} strokeWidth="1.3" strokeLinejoin="round" />
      <polygon points="32,6 24,32 32,58" fill="#132219" />
      <polygon points="32,6 40,32 32,58" fill="#06100a" />
      <polygon points="13,32 32,6 24,32" fill="#1b3024" />
      <line x1="13" y1="32" x2="51" y2="32" stroke={C.deep} strokeWidth="1" />
      <circle cx="32" cy="32" r="5" fill={C.mid} opacity="0.85" />
      <circle cx="32" cy="32" r="2" fill={C.light} />
      {[0, 120, 240].map((a) => (
        <circle key={a} cx="32" cy="10" r="2" fill={C.light} transform={`rotate(${a + 60} 32 32) translate(0 -2)`} opacity="0.9" />
      ))}
    </>
  ),

  hologram: (
    <>
      <polygon points="32,52 14,58 50,58" fill={C.mid} opacity="0.12" />
      <polygon points="32,50 18,14 46,14" fill={C.mid} opacity="0.1" />
      <ellipse cx="32" cy="55" rx="14" ry="3" {...plate} />
      <g stroke={C.bright} strokeWidth="1.4" strokeDasharray="3 2.5" fill="none" strokeLinejoin="round">
        <circle cx="32" cy="19" r="6" />
        <path d="M22 46 L24 30 Q32 25 40 30 L42 46" />
      </g>
      {[24, 29, 34, 39, 44].map((y) => (
        <line key={y} x1="20" y1={y} x2="44" y2={y} stroke={C.light} strokeWidth="0.6" opacity="0.35" />
      ))}
    </>
  ),

  splitter: (
    <>
      <line x1="3" y1="36" x2="22" y2="33" stroke={C.light} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="27" x2="61" y2="14" stroke={C.mid} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="38" x2="61" y2="51" stroke={C.mid} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="32,12 50,46 14,46" {...plate} />
      <polygon points="32,12 32,46 14,46" fill="currentColor" opacity="0.12" />
      <line x1="22" y1="33" x2="40" y2="27" stroke={C.light} strokeWidth="1.2" opacity="0.7" />
      <line x1="22" y1="33" x2="40" y2="38" stroke={C.light} strokeWidth="1.2" opacity="0.7" />
    </>
  ),

  interceptor: (
    <>
      <path d="M10 34 A22 22 0 0 1 54 34" fill="none" {...metal} />
      <path d="M17 34 A15 15 0 0 1 47 34 M24 34 A8 8 0 0 1 40 34" fill="none" {...metal} strokeWidth="1" opacity="0.6" />
      <path d="M32 12 L32 34 M17 19 L25 34 M47 19 L39 34" {...metal} strokeWidth="1" opacity="0.6" />
      <polygon points="32,36 42,48 22,48" {...plate} />
      <path d="M24 52 L32 46 L40 52" {...metal} fill="none" />
      <path d="M24 58 L32 52 L40 58" {...metal} fill="none" />
      <circle cx="32" cy="42" r="2.4" fill={C.mid} />
    </>
  ),

  sentry: (
    <>
      <path d="M8 28 L2 22 M8 34 L1 34 M8 40 L2 46" {...metal} strokeWidth="1.5" />
      <path d="M56 28 L62 22 M56 34 L63 34 M56 40 L62 46" {...metal} strokeWidth="1.5" />
      <path d="M8 34 Q32 12 56 34 Q32 56 8 34 Z" {...plate} />
      <circle cx="32" cy="34" r="9" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <circle cx="32" cy="34" r="5" fill={C.mid} />
      <circle cx="29.5" cy="31.5" r="1.8" fill="#fff" />
      <line x1="32" y1="14" x2="32" y2="21" {...metal} strokeWidth="1.5" />
      <circle cx="32" cy="12" r="2" fill={C.light} />
    </>
  ),

  bastion: (
    <>
      <path d="M17 58 L17 18 L21 18 L21 13 L26 13 L26 18 L30 18 L30 13 L34 13 L34 18 L38 18 L38 13 L43 13 L43 18 L47 18 L47 58 Z" {...plate} />
      <path d="M24 30 L40 30 L40 40 Q40 48 32 51 Q24 48 24 40 Z" {...plate} fillOpacity={0.3} />
      <Shard x={32} y={44} h={11} w={5} />
      {[22, 42].map((x) => [24, 34, 44, 54].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.9" fill="currentColor" />))}
      <line x1="12" y1="58" x2="52" y2="58" {...metal} strokeWidth="2.2" />
    </>
  ),

  riftblade: (
    <>
      <Glow cx={34} cy={28} r={20} o={0.14} />
      <polygon points="52,8 55,11 24,44 20,40" {...plate} />
      <path d="M50 12 L44 20 L46 22 L38 29 L40 31 L31 38" fill="none" stroke={C.mid} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M50 12 L44 20 L46 22 L38 29 L40 31 L31 38" fill="none" stroke={C.light} strokeWidth="0.6" />
      <path d="M15 37 L27 49" {...metal} strokeWidth="3" />
      <path d="M21 43 L11 53" {...metal} strokeWidth="3.5" />
      <circle cx="9.5" cy="54.5" r="2.5" fill={C.mid} />
    </>
  ),

  smelter: (
    <>
      <Glow cx={40} cy={46} r={18} color={MOLTEN} o={0.16} />
      <g transform="rotate(-28 24 22)">
        <path d="M12 14 L36 14 L33 32 Q24 36 15 32 Z" {...plate} />
        <ellipse cx="24" cy="14" rx="12" ry="3" fill={MOLTEN} stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 20 L12 20" {...metal} strokeWidth="2.5" />
        <path d="M15 22 L33 22" {...metal} strokeWidth="1" opacity="0.5" />
      </g>
      <path d="M37 18 Q44 26 42 40" fill="none" stroke={MOLTEN} strokeWidth="3" strokeLinecap="round" />
      <path d="M28 44 L56 44 L52 56 L32 56 Z" {...plate} />
      <path d="M31 47.5 L53 47.5" stroke={MOLTEN} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),

  golem: (
    <>
      <Shard x={14} y={26} h={14} w={6} r={-25} />
      <Shard x={50} y={26} h={14} w={6} r={25} />
      <rect x="25" y="8" width="14" height="11" rx="2" {...plate} />
      <path d="M28 13 L31 13 M33 13 L36 13" stroke={C.mid} strokeWidth="2" strokeLinecap="round" />
      <path d="M17 22 L47 22 L44 44 L20 44 Z" {...plate} />
      <polygon points={ring(32, 32, 5, 6)} fill={C.deep} stroke={C.light} strokeWidth="1" strokeOpacity="0.6" />
      <rect x="8" y="24" width="8" height="20" rx="2" {...plate} />
      <rect x="48" y="24" width="8" height="20" rx="2" {...plate} />
      <rect x="21" y="45" width="9" height="13" rx="1.5" {...plate} />
      <rect x="34" y="45" width="9" height="13" rx="1.5" {...plate} />
    </>
  ),

  colossus: (
    <>
      <Glow cy={30} r={26} o={0.12} />
      <Shard x={24} y={10} h={9} w={4} r={-14} />
      <Shard x={32} y={9} h={12} w={5} />
      <Shard x={40} y={10} h={9} w={4} r={14} />
      <path d="M25 10 L39 10 L41 20 L23 20 Z" {...plate} />
      <line x1="26" y1="15" x2="38" y2="15" stroke={C.mid} strokeWidth="2.2" strokeLinecap="round" />
      <polygon points={ring(32, 30, 10, 6, Math.PI / 6)} {...plate} />
      <polygon points={ring(32, 30, 4, 6, Math.PI / 6)} fill={C.mid} />
      <path d="M22 26 L10 32 L8 46 M42 26 L54 32 L56 46" {...metal} strokeWidth="3.5" fill="none" />
      <polygon points={ring(32, 45, 7, 6, Math.PI / 6)} {...plate} />
      <path d="M27 51 L23 62 M37 51 L41 62" {...metal} strokeWidth="4" />
    </>
  ),

  keymaster: (
    <>
      <path d="M15 24 C7 24 2 18 2 9 C6 13 9 14 12 14 C8 11 7 7 8 3 C12 9 15 12 18 13 Z" {...plate} />
      <path d="M29 24 C37 24 42 18 42 9 C38 13 35 14 32 14 C36 11 37 7 36 3 C32 9 29 12 26 13 Z" {...plate} />
      <path d="M6 12 L12 17 M9 6 L14 13 M38 12 L32 17 M35 6 L30 13" {...metal} strokeWidth="1" opacity="0.6" />
      <circle cx="22" cy="22" r="9" {...plate} fillOpacity={0.3} />
      <polygon points={ring(22, 22, 4.5, 6)} fill={C.deep} stroke={C.light} strokeWidth="1" />
      <line x1="28.5" y1="28.5" x2="54" y2="54" {...metal} strokeWidth="3.5" />
      <path d="M44 44 L50 38 M48 48 L52 44 M52 52 L58 46" {...metal} strokeWidth="3" />
    </>
  ),

  engine: (
    <>
      <Glow r={22} o={0.12} />
      <path d="M32 32 C24 20 8 22 8 32 C8 42 24 44 32 32 C40 20 56 22 56 32 C56 42 40 44 32 32 Z" fill="none" {...metal} strokeWidth="2.2" />
      <polygon points={blade(32, 32, 6, 8.5, 8)} {...plate} fillOpacity={0.35} />
      <circle cx="32" cy="32" r="3" fill={C.mid} />
      <circle cx="10" cy="32" r="2.6" fill={C.light} stroke={C.mid} />
      <path d="M48 23 L52 25 L49 28" fill="none" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 41 L12 39 L15 36" fill="none" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

/** A card's art, sized by its box. */
export function CardArt({ card, className }: { card: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {ART[card] ?? (
        <>
          <Glow />
          <Shard x={32} y={54} h={40} w={14} />
        </>
      )}
    </svg>
  );
}

/** The sacrifice a card costs, as a small crystal. */
export function ChargeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <polygon points="8,1 12,5 12,13 8,15" fill={C.deep} />
      <polygon points="8,1 4,5 4,13 8,15" fill={C.bright} />
      <polygon points="8,1 6.4,5 6.4,13.6 8,15 9.6,13.6 9.6,5" fill={C.mid} />
    </svg>
  );
}
