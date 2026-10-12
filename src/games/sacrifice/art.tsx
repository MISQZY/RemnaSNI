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

  druse: (
    <>
      <Glow cy={34} r={25} o={0.2} />
      <path d="M6 58 Q10 47 20 48 Q32 44 44 48 Q54 47 58 58 Z" {...plate} />
      <Shard x={14} y={54} h={16} w={7} r={-34} />
      <Shard x={50} y={54} h={16} w={7} r={34} />
      <Shard x={22} y={51} h={26} w={9} r={-16} />
      <Shard x={42} y={51} h={24} w={9} r={17} />
      <Shard x={32} y={50} h={36} w={11} />
    </>
  ),

  sprout: (
    <>
      <Glow cy={30} r={14} color={C.light} o={0.18} />
      <Shard x={32} y={44} h={22} w={8} />
      <Shard x={26} y={44} h={10} w={5} r={-38} />
      <Shard x={38} y={44} h={9} w={5} r={40} />
      <path d="M18 44 L46 44 L42 58 L22 58 Z" {...plate} />
      <line x1="16" y1="44" x2="48" y2="44" {...metal} strokeWidth="2.4" />
      <path d="M24 50 L40 50" {...metal} strokeWidth="1" opacity="0.6" />
    </>
  ),

  pickman: (
    <>
      <Glow cx={24} cy={24} r={16} color={C.light} o={0.14} />
      <line x1="14" y1="56" x2="42" y2="20" {...metal} strokeWidth="3.2" />
      <path d="M22 12 Q40 8 56 22 L52 24 Q40 15 26 17 Z" {...plate} fillOpacity={0.35} />
      <rect x="38" y="15" width="7" height="8" rx="1.5" transform="rotate(38 41.5 19)" {...plate} />
      <Shard x={22} y={44} h={14} w={7} r={-20} />
      <Shard x={30} y={50} h={10} w={5} r={14} />
      <path d="M8 58 L36 58" {...metal} strokeWidth="1.5" opacity="0.6" />
    </>
  ),

  lamplighter: (
    <>
      <Glow cy={36} r={20} color={C.light} o={0.22} />
      <path d="M32 4 L32 12" {...metal} strokeWidth="1.6" />
      <path d="M26 12 Q32 8 38 12" {...metal} fill="none" />
      <path d="M24 16 L40 16 L42 20 L22 20 Z" {...plate} />
      <path d="M24 20 L40 20 L40 46 L24 46 Z" {...plate} fillOpacity={0.08} />
      <path d="M24 20 L24 46 M40 20 L40 46 M32 20 L32 24 M32 42 L32 46" {...metal} strokeWidth="1.4" />
      <Shard x={32} y={42} h={18} w={7} />
      <path d="M22 46 L42 46 L40 51 L24 51 Z" {...plate} />
      <path d="M12 26 L6 22 M12 36 L5 36 M52 26 L58 22 M52 36 L59 36" stroke={C.bright} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  lineman: (
    <>
      <path d="M20 8 L8 58 M44 8 L56 58" {...metal} strokeWidth="2.4" />
      {[14, 24, 35, 47].map((y, i) => (
        <rect key={y} x={16 - i * 2.5} y={y} width={32 + i * 5} height="4" rx="1" {...plate} fillOpacity={0.25} />
      ))}
      {[18, 28, 39, 51].map((y, i) =>
        [-1, 1].map((s) => <polygon key={`${y}${s}`} points={`${32 + s * (7 + i * 3) - 2.5},${y - 0.5} ${32 + s * (7 + i * 3) + 2.5},${y - 0.5} ${32 + s * (7 + i * 3)},${y - 7}`} fill={C.mid} />),
      )}
    </>
  ),

  driller: (
    <>
      <Glow cy={50} r={14} color={MOLTEN} o={0.12} />
      <rect x="20" y="6" width="24" height="5" rx="2.5" {...plate} fillOpacity={0.35} />
      <path d="M26 11 L38 11 L40 32 L24 32 Z" {...plate} />
      <path d="M27 17 L37 17 M27 23 L37 23" {...metal} strokeWidth="1" opacity="0.6" />
      <rect x="28" y="32" width="8" height="6" {...plate} fillOpacity={0.3} />
      <path d="M29 38 L35 38 L32 52 Z" {...plate} fillOpacity={0.4} />
      <Shard x={18} y={60} h={10} w={6} r={-30} />
      <Shard x={46} y={60} h={10} w={6} r={30} />
      <path d="M24 54 L20 50 M40 54 L44 50 M32 56 L32 60" stroke={MOLTEN} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),

  scout: (
    <>
      <line x1="14" y1="16" x2="50" y2="16" {...metal} strokeWidth="2" />
      <ellipse cx="32" cy="16" rx="22" ry="2" fill="currentColor" opacity="0.15" />
      <line x1="32" y1="16" x2="32" y2="24" {...metal} />
      <circle cx="32" cy="34" r="10" {...plate} />
      <circle cx="32" cy="34" r="5" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <circle cx="32" cy="34" r="2.4" fill={C.light} />
      <path d="M24 42 L20 50 M40 42 L44 50" {...metal} strokeWidth="1.5" />
      <path d="M26 50 L32 58 L38 50" fill="none" stroke={C.mid} strokeWidth="1.2" strokeDasharray="2 2" />
    </>
  ),

  junk_golem: (
    <>
      <path d="M24 10 L38 8 L41 18 L26 20 Z" {...plate} />
      <circle cx="30" cy="14" r="2" fill={C.mid} />
      <circle cx="36" cy="13" r="1.4" fill={MOLTEN} />
      <path d="M16 22 L44 20 L48 34 L42 46 L20 46 L14 34 Z" {...plate} />
      <path d="M20 28 L30 34 M36 26 L42 34 M24 40 L38 38" {...metal} strokeWidth="1" opacity="0.6" />
      <circle cx="31" cy="31" r="3" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <path d="M14 26 L6 38 L10 44 M48 26 L56 34 L54 44" {...metal} strokeWidth="3" fill="none" />
      <rect x="20" y="46" width="9" height="12" rx="1" transform="rotate(-6 24 52)" {...plate} />
      <rect x="34" y="46" width="9" height="12" rx="1" transform="rotate(5 38 52)" {...plate} />
    </>
  ),

  welder: (
    <>
      <Glow cx={44} cy={46} r={14} color={MOLTEN} o={0.2} />
      <path d="M14 14 Q32 4 50 14 L50 38 Q32 46 14 38 Z" {...plate} />
      <rect x="20" y="20" width="24" height="9" rx="2" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <line x1="22" y1="24.5" x2="42" y2="24.5" stroke={C.bright} strokeWidth="1.5" opacity="0.7" />
      <path d="M22 34 L42 34" {...metal} strokeWidth="1" opacity="0.6" />
      <line x1="30" y1="58" x2="44" y2="46" {...metal} strokeWidth="2.6" />
      {[0, 50, 100, 150, 200, 250, 300].map((a) => (
        <line key={a} x1="44" y1="46" x2="44" y2="39" transform={`rotate(${a} 44 46)`} stroke={MOLTEN} strokeWidth="1.4" strokeLinecap="round" />
      ))}
      <circle cx="44" cy="46" r="2" fill="#fff" />
    </>
  ),

  phase_drone: (
    <>
      <g stroke={C.bright} strokeWidth="1.3" strokeDasharray="3 2.2" fill="none" strokeLinejoin="round">
        <polygon points={ring(32, 28, 11, 6, Math.PI / 6)} />
        <path d="M22 26 L11 20 M42 26 L53 20" />
        <ellipse cx="11" cy="18" rx="8" ry="2.2" />
        <ellipse cx="53" cy="18" rx="8" ry="2.2" />
      </g>
      <polygon points={ring(30, 30, 11, 6, Math.PI / 6)} {...plate} fillOpacity={0.1} opacity="0.6" />
      <circle cx="32" cy="28" r="4" fill={C.mid} stroke={C.light} strokeWidth="1" />
      {[42, 47, 52].map((y) => (
        <line key={y} x1="20" y1={y} x2="44" y2={y} stroke={C.light} strokeWidth="0.7" opacity="0.4" />
      ))}
    </>
  ),

  twin_drill: (
    <>
      <rect x="16" y="6" width="32" height="12" rx="3" {...plate} />
      <circle cx="32" cy="12" r="3" fill={C.mid} />
      {[-1, 1].map((s) => (
        <g key={s} transform={`rotate(${-s * 16} 32 18)`}>
          <rect x={32 + s * 9 - 4} y="18" width="8" height="6" {...plate} fillOpacity={0.3} />
          <path d={`M${32 + s * 9 - 5} 24 L${32 + s * 9 + 5} 24 L${32 + s * 9} 52 Z`} {...plate} fillOpacity={0.35} />
          <path d={`M${32 + s * 9 - 4} 30 L${32 + s * 9 + 3.5} 28 M${32 + s * 9 - 3} 37 L${32 + s * 9 + 2.5} 35 M${32 + s * 9 - 2} 44 L${32 + s * 9 + 1.5} 42.5`} {...metal} strokeWidth="1" />
        </g>
      ))}
      <path d="M6 58 L16 52 M58 58 L48 52" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),

  warden: (
    <>
      <Glow cy={14} r={12} color={C.light} o={0.2} />
      <path d="M26 14 L6 4 M38 14 L58 4" stroke={C.bright} strokeWidth="1.4" opacity="0.5" />
      <path d="M24 10 L40 10 L38 18 L26 18 Z" {...plate} />
      <circle cx="32" cy="14" r="2.5" fill={C.light} />
      <path d="M14 22 L50 22 L50 38 Q50 52 32 58 Q14 52 14 38 Z" {...plate} />
      <path d="M20 28 L44 28 L44 38 Q44 47 32 51 Q20 47 20 38 Z" fill="none" {...metal} strokeWidth="1.1" opacity="0.6" />
      <path d="M24 38 L32 32 L40 38 M24 45 L32 39 L40 45" fill="none" stroke={C.mid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  foreman: (
    <>
      <Glow cy={30} r={20} o={0.12} />
      <path d="M12 34 C12 20 21 12 32 12 C43 12 52 20 52 34 Z" {...plate} />
      <path d="M26 13 L26 34 M38 13 L38 34" {...metal} strokeWidth="1.4" opacity="0.7" />
      <rect x="6" y="33" width="52" height="5" rx="2.5" {...plate} fillOpacity={0.35} />
      <polygon points={ring(32, 24, 4.5, 6)} fill={C.deep} stroke={C.light} strokeWidth="1" />
      {[14, 22, 30, 38, 46].map((x) => (
        <polygon key={x} points={`${x},44 ${x + 4},44 ${x + 2},52`} {...plate} fillOpacity={0.35} />
      ))}
      <path d="M12 44 L52 44" {...metal} strokeWidth="2" />
    </>
  ),

  amber_cell: (
    <>
      <Glow cy={36} r={20} color={MOLTEN} o={0.16} />
      <rect x="26" y="6" width="12" height="5" rx="1.5" {...plate} />
      <rect x="18" y="11" width="28" height="46" rx="4" {...plate} fillOpacity={0.1} />
      <rect x="21" y="26" width="22" height="28" rx="2" fill={MOLTEN} opacity="0.75" />
      <path d="M21 30 Q32 26 43 30" fill="none" stroke="#fde68a" strokeWidth="1.2" opacity="0.8" />
      {[34, 41, 48].map((y) => (
        <polygon key={y} points={`32,${y - 3} 35,${y} 32,${y + 3} 29,${y}`} fill="#fff7d6" />
      ))}
      <path d="M18 18 L46 18" {...metal} strokeWidth="1" opacity="0.6" />
    </>
  ),

  spike_wall: (
    <>
      {[10, 20, 30, 40, 50].map((x) => (
        <polygon key={x} points={`${x - 3},24 ${x + 3},24 ${x},8`} {...plate} fillOpacity={0.35} />
      ))}
      <rect x="6" y="24" width="52" height="34" rx="1.5" {...plate} />
      <path d="M6 35 L58 35 M6 46 L58 46 M19 24 L19 35 M37 24 L37 35 M28 35 L28 46 M46 35 L46 46 M19 46 L19 58 M37 46 L37 58" {...metal} strokeWidth="1.1" opacity="0.7" />
      <Shard x={28} y={58} h={9} w={5} r={-10} />
    </>
  ),

  saboteur: (
    <>
      <Glow cx={48} cy={14} r={10} color={MOLTEN} o={0.25} />
      {[20, 28, 36].map((x) => (
        <rect key={x} x={x} y="24" width="8" height="32" rx="3" {...plate} fillOpacity={0.3} />
      ))}
      <path d="M18 34 L46 34 M18 46 L46 46" {...metal} strokeWidth="2.4" />
      <path d="M32 24 Q34 14 44 15 Q48 15 48 12" fill="none" {...metal} strokeWidth="1.4" />
      <path d="M48 12 L50 6 M48 12 L54 10 M48 12 L44 8" stroke={MOLTEN} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 60 L14 50 L11 47 L18 38" fill="none" stroke={C.mid} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),

  excavator: (
    <>
      <path d="M8 46 L36 46 L36 34 L20 34 L16 40 L8 40 Z" {...plate} />
      <rect x="22" y="36" width="8" height="5" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <rect x="6" y="48" width="34" height="9" rx="4.5" {...plate} fillOpacity={0.3} />
      {[11, 18, 25, 32].map((x) => (
        <circle key={x} cx={x + 1} cy="52.5" r="2" fill="currentColor" opacity="0.6" />
      ))}
      <path d="M34 36 L44 14 L56 26" {...metal} strokeWidth="3.6" fill="none" />
      <path d="M50 26 L60 26 L58 40 L48 36 Z" {...plate} />
      <path d="M50 40 L52 44 M54 41 L56 45" {...metal} strokeWidth="1.4" />
      <Shard x={54} y={36} h={8} w={4} r={8} />
    </>
  ),

  airship: (
    <>
      <Glow cy={22} r={22} o={0.1} />
      <ellipse cx="30" cy="22" rx="24" ry="12" {...plate} />
      <path d="M8 22 L52 22 M14 14 Q30 18 46 14 M14 30 Q30 26 46 30" {...metal} strokeWidth="1" opacity="0.6" />
      <path d="M52 16 L60 10 L60 34 L52 28" {...plate} />
      <path d="M22 33 L24 42 M38 33 L36 42" {...metal} strokeWidth="1.2" />
      <rect x="20" y="42" width="20" height="8" rx="2" {...plate} />
      <circle cx="26" cy="46" r="1.6" fill={C.light} />
      <circle cx="34" cy="46" r="1.6" fill={C.light} />
      <path d="M40 46 L46 46 M46 41 L46 51" {...metal} strokeWidth="1.6" />
      <Shard x={30} y={60} h={8} w={4} />
    </>
  ),

  fortress: (
    <>
      <Glow cy={34} r={26} o={0.1} />
      <path d="M6 58 L6 18 L10 18 L10 14 L14 14 L14 18 L18 18 L18 58 Z" {...plate} />
      <path d="M46 58 L46 18 L50 18 L50 14 L54 14 L54 18 L58 18 L58 58 Z" {...plate} />
      <path d="M18 58 L18 28 L46 28 L46 58 Z" {...plate} fillOpacity={0.24} />
      {[22, 28, 34, 40].map((x) => (
        <polygon key={x} points={`${x},28 ${x + 4},28 ${x + 2},20`} {...plate} fillOpacity={0.35} />
      ))}
      <path d="M26 58 L26 46 Q32 38 38 46 L38 58" {...plate} fillOpacity={0.35} />
      <Shard x={32} y={44} h={10} w={5} />
      <path d="M10 26 L14 26 M50 26 L54 26 M10 36 L14 36 M50 36 L54 36" stroke={C.mid} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="58" x2="62" y2="58" {...metal} strokeWidth="2.2" />
    </>
  ),

  void_crystal: (
    <>
      <Glow r={24} color="#a855f7" o={0.14} />
      <ellipse cx="32" cy="34" rx="26" ry="7" fill="none" stroke={C.mid} strokeWidth="1.2" strokeDasharray="4 3" transform="rotate(-18 32 34)" />
      <polygon points="32,6 46,30 32,58 18,30" fill="#0b0f12" stroke="#c084fc" strokeWidth="1.3" strokeLinejoin="round" />
      <polygon points="32,6 26,30 32,58" fill="#1a1426" />
      <polygon points="32,6 38,30 32,58" fill="#07060b" />
      <path d="M30 14 L34 24 L29 31 L35 40 L31 50" fill="none" stroke={C.light} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="54" cy="25" r="2.4" fill={C.light} />
      <path d="M11 44 L7 40 L12 38" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  drill_titan: (
    <>
      <Glow cy={30} r={26} color={MOLTEN} o={0.1} />
      <path d="M14 6 L50 6 L32 44 Z" {...plate} fillOpacity={0.3} />
      <path d="M17 13 L47 10 M21 21 L44 17 M24 29 L40 25 M28 37 L36 34" {...metal} strokeWidth="1.6" />
      <path d="M32 44 L32 50" {...metal} strokeWidth="2" />
      <path d="M8 46 L56 46 L52 58 L12 58 Z" {...plate} />
      {[16, 24, 32, 40, 48].map((x) => (
        <circle key={x} cx={x} cy="52" r="2.4" fill="currentColor" opacity="0.6" />
      ))}
      <Shard x={6} y={44} h={12} w={6} r={-30} />
      <Shard x={58} y={44} h={12} w={6} r={30} />
      <path d="M26 46 L22 40 M38 46 L42 40" stroke={MOLTEN} strokeWidth="1.6" strokeLinecap="round" />
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
