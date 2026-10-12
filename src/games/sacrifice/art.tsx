import { memo, type ReactNode } from "react";

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

  veteran: (
    <>
      <Glow cy={24} r={14} color={C.light} o={0.2} />
      <line x1="10" y1="60" x2="40" y2="38" {...metal} strokeWidth="3.4" />
      <path d="M33 31 Q46 31 54 44 L50 46 Q44 37 34 36 Z" {...plate} fillOpacity={0.35} />
      <path d="M13 36 C13 22 22 13 32 13 C42 13 51 22 51 36 Z" {...plate} />
      <path d="M20 22 L44 22 M17 29 L47 29" stroke={C.mid} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <rect x="8" y="35" width="48" height="5" rx="2.5" {...plate} fillOpacity={0.3} />
      <circle cx="32" cy="20" r="4" fill={C.light} stroke={C.mid} strokeWidth="1.2" />
      <path d="M46 50 L48 54 L52 54 L49 57 L50 61 L46 59 L42 61 L43 57 L40 54 L44 54 Z" fill={C.bright} stroke={C.light} strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),

  geode: (
    <>
      <Glow cy={36} r={24} o={0.18} />
      <path d="M8 40 Q6 18 30 12 Q54 10 57 34 Q58 52 34 56 Q10 58 8 40 Z" {...plate} />
      <path d="M16 38 Q16 24 31 21 Q48 20 49 35 Q49 47 33 49 Q17 50 16 38 Z" fill="#06100a" stroke={C.deep} strokeWidth="1" />
      <Shard x={24} y={47} h={14} w={6} r={-24} />
      <Shard x={41} y={47} h={14} w={6} r={24} />
      <Shard x={32} y={48} h={22} w={8} />
      <Shard x={33} y={23} h={9} w={5} r={180} />
    </>
  ),

  drill_rig: (
    <>
      <Glow cy={54} r={14} color={MOLTEN} o={0.14} />
      <path d="M20 50 L30 4 L34 4 L44 50" {...metal} strokeWidth="2" fill="none" />
      <path d="M23 36 L41 36 M25 26 L39 26 M27 16 L37 16 M23 36 L39 26 M25 26 L37 16 M41 36 L25 26 M39 26 L27 16" {...metal} strokeWidth="1" opacity="0.65" />
      <rect x="27" y="2" width="10" height="4" rx="1" {...plate} />
      <line x1="32" y1="6" x2="32" y2="44" stroke={C.mid} strokeWidth="1.6" />
      <path d="M28 44 L36 44 L32 58 Z" {...plate} fillOpacity={0.4} />
      <rect x="10" y="48" width="44" height="6" rx="2" {...plate} />
      <path d="M24 60 L20 56 M40 60 L44 56" stroke={MOLTEN} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),

  assembled: (
    <>
      <rect x="24" y="6" width="16" height="12" rx="2" transform="rotate(6 32 12)" {...plate} />
      <circle cx="29" cy="12" r="2.2" fill={C.mid} />
      <circle cx="36" cy="13" r="1.6" fill={MOLTEN} />
      <rect x="16" y="20" width="32" height="24" rx="3" {...plate} />
      <path d="M16 30 L48 30 M30 20 L30 30 M38 30 L38 44" {...metal} strokeWidth="1" opacity="0.6" />
      <polygon points={ring(24, 37, 4, 6)} fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      {[19, 25, 41, 45].map((x) => (
        <circle key={x} cx={x} cy="23" r="0.9" fill="currentColor" />
      ))}
      <path d="M16 24 L8 34 L10 44 M48 24 L56 30 L56 42" {...metal} strokeWidth="3.2" fill="none" />
      <path d="M22 44 L20 58 M42 44 L44 58" {...metal} strokeWidth="4" />
      <path d="M15 58 L25 58 M39 58 L49 58" {...metal} strokeWidth="2.4" />
    </>
  ),

  crystal_sentinel: (
    <>
      <Glow cy={32} r={26} o={0.18} />
      <Shard x={32} y={20} h={14} w={9} />
      <path d="M18 22 L46 22 L42 44 L22 44 Z" {...plate} />
      <Shard x={32} y={42} h={18} w={9} />
      <Shard x={14} y={30} h={12} w={6} r={-30} />
      <Shard x={50} y={30} h={12} w={6} r={30} />
      <path d="M18 24 L10 38 M46 24 L54 38" {...metal} strokeWidth="3.2" />
      <path d="M26 44 L24 58 M38 44 L40 58" {...metal} strokeWidth="4" />
    </>
  ),

  qzyrium_titan: (
    <>
      <Glow cy={32} r={28} o={0.22} />
      <Shard x={20} y={14} h={10} w={5} r={-20} />
      <Shard x={44} y={14} h={10} w={5} r={20} />
      <Shard x={32} y={14} h={13} w={7} />
      <path d="M22 16 L42 16 L46 30 L18 30 Z" fill="#06100a" {...metal} />
      <path d="M25 22 L30 22 M34 22 L39 22" stroke={C.bright} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 30 L50 30 L44 48 L20 48 Z" {...plate} />
      <Shard x={32} y={46} h={16} w={10} />
      <Shard x={8} y={44} h={16} w={8} r={-12} />
      <Shard x={56} y={44} h={16} w={8} r={12} />
      <path d="M14 32 L8 42 M50 32 L56 42" {...metal} strokeWidth="3.6" />
      <path d="M24 48 L20 62 M40 48 L44 62" {...metal} strokeWidth="5" />
    </>
  ),

  signalman: (
    <>
      <Glow cx={20} cy={16} r={12} color={C.light} o={0.22} />
      <line x1="32" y1="58" x2="32" y2="20" {...metal} strokeWidth="2.4" />
      <path d="M32 20 L52 14 L52 28 L32 26 Z" {...plate} fillOpacity={0.3} />
      <path d="M36 21 L48 18 M36 25 L48 24" {...metal} strokeWidth="1" opacity="0.6" />
      <circle cx="20" cy="16" r="6" fill={C.light} stroke={C.mid} strokeWidth="1.2" />
      <circle cx="20" cy="16" r="2.4" fill="#fff" />
      <line x1="26" y1="18" x2="32" y2="22" {...metal} strokeWidth="1.4" />
      <path d="M10 40 A22 22 0 0 1 54 40" fill="none" {...metal} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
      <path d="M24 58 L40 58" {...metal} strokeWidth="2.4" />
    </>
  ),

  cable_drone: (
    <>
      <line x1="2" y1="8" x2="62" y2="16" {...metal} strokeWidth="1.4" />
      <path d="M28 11.5 L28 20 M36 12.5 L36 20" {...metal} strokeWidth="1.4" />
      <circle cx="28" cy="11" r="2" {...plate} fillOpacity={0.4} />
      <circle cx="36" cy="12" r="2" {...plate} fillOpacity={0.4} />
      <path d="M18 20 L46 20 L42 36 L22 36 Z" {...plate} />
      <circle cx="32" cy="28" r="4" fill={C.mid} stroke={C.light} strokeWidth="1" />
      <path d="M24 36 L20 46 M40 36 L44 46" {...metal} strokeWidth="1.6" />
      <path d="M18 46 L22 50 M46 46 L42 50" {...metal} strokeWidth="1.6" />
      <Shard x={32} y={56} h={12} w={5} r={180} />
    </>
  ),

  cadet: (
    <>
      <Glow cy={30} r={16} color={C.light} o={0.16} />
      <path d="M18 38 C18 26 24 19 32 19 C40 19 46 26 46 38 Z" {...plate} />
      <rect x="14" y="37" width="36" height="4" rx="2" {...plate} fillOpacity={0.3} />
      <circle cx="32" cy="27" r="3.5" fill={C.light} stroke={C.mid} strokeWidth="1" />
      <path d="M24 46 L40 46 L38 56 L26 56 Z" {...plate} fillOpacity={0.24} />
      <Shard x={46} y={58} h={11} w={5} r={14} />
      <path d="M10 14 L14 10 M10 10 L14 14 M52 12 L54 8" stroke={C.bright} strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  stoker: (
    <>
      <Glow cx={20} cy={44} r={16} color={MOLTEN} o={0.2} />
      <rect x="6" y="30" width="26" height="28" rx="3" {...plate} />
      <rect x="11" y="40" width="16" height="10" rx="2" fill={MOLTEN} opacity="0.8" />
      <path d="M13 40 Q19 34 25 40" fill="none" stroke="#fde68a" strokeWidth="1.2" />
      {[10, 18, 26].map((x) => (
        <polygon key={x} points={`${x - 2.5},30 ${x + 2.5},30 ${x},23`} {...plate} fillOpacity={0.35} />
      ))}
      <line x1="58" y1="10" x2="34" y2="46" {...metal} strokeWidth="2.8" />
      <path d="M30 44 L40 50 L36 56 L26 50 Z" {...plate} fillOpacity={0.35} />
    </>
  ),

  crystal_seed: (
    <>
      <Glow cy={40} r={12} color={C.light} o={0.2} />
      <path d="M14 52 Q32 44 50 52 L50 58 L14 58 Z" {...plate} />
      <Shard x={32} y={50} h={14} w={8} />
      <path d="M22 40 Q18 32 22 26 M42 40 Q46 32 42 26" fill="none" stroke={C.bright} strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 3" opacity="0.7" />
      <circle cx="32" cy="22" r="1.6" fill={C.light} />
      <circle cx="26" cy="16" r="1.1" fill={C.light} opacity="0.7" />
      <circle cx="39" cy="18" r="1.1" fill={C.light} opacity="0.7" />
    </>
  ),

  prospector: (
    <>
      <Glow cy={40} r={16} color={C.light} o={0.14} />
      <ellipse cx="32" cy="40" rx="24" ry="8" {...plate} />
      <ellipse cx="32" cy="38" rx="18" ry="5" fill={C.deep} opacity="0.5" />
      <path d="M14 38 Q32 52 50 38" fill="none" {...metal} strokeWidth="1.2" opacity="0.6" />
      <Shard x={26} y={40} h={8} w={4} r={-20} />
      <Shard x={34} y={39} h={11} w={5} />
      <Shard x={40} y={40} h={7} w={4} r={22} />
      <path d="M48 34 L58 18" {...metal} strokeWidth="2.6" />
      <path d="M14 34 L6 18" {...metal} strokeWidth="2.6" />
      <path d="M18 54 Q24 58 30 54 M34 56 Q40 60 46 56" fill="none" stroke={C.mid} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </>
  ),

  jackhammer: (
    <>
      <Glow cy={54} r={12} color={MOLTEN} o={0.16} />
      <path d="M14 8 L50 8" {...metal} strokeWidth="3.6" />
      <path d="M24 10 L40 10 L38 34 L26 34 Z" {...plate} />
      <path d="M26 16 L38 16 M26 22 L38 22 M26 28 L38 28" {...metal} strokeWidth="1" opacity="0.6" />
      <rect x="29" y="34" width="6" height="8" {...plate} fillOpacity={0.3} />
      <path d="M30 42 L34 42 L32 54 Z" {...plate} fillOpacity={0.4} />
      <path d="M22 58 L26 54 M42 58 L38 54 M18 52 L24 52 M40 52 L46 52" stroke={MOLTEN} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 60 L54 60" {...metal} strokeWidth="1.4" opacity="0.6" />
    </>
  ),

  hauler: (
    <>
      <circle cx="32" cy="15" r="7" {...plate} />
      <path d="M20 26 L44 26 L46 44 L18 44 Z" {...plate} />
      <rect x="10" y="16" width="44" height="8" rx="1.5" {...plate} fillOpacity={0.3} />
      <Shard x={22} y={16} h={8} w={4} r={-10} />
      <Shard x={42} y={16} h={9} w={4} r={10} />
      <path d="M18 26 L10 24 M46 26 L54 24" {...metal} strokeWidth="3" />
      <path d="M24 44 L22 58 M40 44 L42 58" {...metal} strokeWidth="4" />
      <path d="M17 58 L27 58 M37 58 L47 58" {...metal} strokeWidth="2.4" />
    </>
  ),

  timberman: (
    <>
      <path d="M6 58 L6 10 M58 58 L58 10" {...metal} strokeWidth="4" />
      <path d="M2 10 L62 10" {...metal} strokeWidth="5" />
      <path d="M6 22 L18 10 M58 22 L46 10" {...metal} strokeWidth="2" />
      <path d="M20 32 C20 22 25 17 32 17 C39 17 44 22 44 32 Z" {...plate} />
      <rect x="16" y="31" width="32" height="4" rx="2" {...plate} fillOpacity={0.3} />
      <circle cx="32" cy="24" r="3" fill={C.light} stroke={C.mid} />
      <path d="M22 40 L42 40 L40 56 L24 56 Z" {...plate} fillOpacity={0.24} />
      <path d="M14 46 A18 18 0 0 1 50 46" fill="none" stroke={C.bright} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
    </>
  ),

  boiler: (
    <>
      <path d="M44 12 Q48 6 44 2 M50 14 Q55 8 51 3" fill="none" stroke={C.light} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <rect x="40" y="12" width="8" height="10" {...plate} />
      <rect x="12" y="20" width="40" height="34" rx="12" {...plate} />
      <path d="M12 30 L52 30 M12 44 L52 44" {...metal} strokeWidth="1" opacity="0.6" />
      <circle cx="26" cy="37" r="5" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <path d="M26 37 L28.5 34" stroke={C.light} strokeWidth="1.2" strokeLinecap="round" />
      {[[6, 30], [6, 44], [58, 30], [58, 44]].map(([x, y]) => (
        <polygon key={`${x}${y}`} points={x < 32 ? `12,${y - 3} 12,${y + 3} ${x},${y}` : `52,${y - 3} 52,${y + 3} ${x},${y}`} {...plate} fillOpacity={0.35} />
      ))}
      <path d="M16 54 L48 54 L46 60 L18 60 Z" {...plate} fillOpacity={0.3} />
    </>
  ),

  cargo_drone: (
    <>
      <path d="M14 14 L50 14" {...metal} strokeWidth="1.4" />
      {[10, 54].map((x) => (
        <ellipse key={x} cx={x} cy="12" rx="8" ry="2.2" {...plate} />
      ))}
      <path d="M18 14 L24 20 M46 14 L40 20" {...metal} />
      <rect x="20" y="18" width="24" height="12" rx="3" {...plate} />
      <circle cx="32" cy="24" r="3" fill={C.mid} />
      <path d="M24 30 L22 38 M40 30 L42 38" {...metal} strokeWidth="1.3" />
      <rect x="16" y="38" width="32" height="18" rx="1.5" {...plate} fillOpacity={0.3} />
      <path d="M16 47 L48 47 M32 38 L32 56" {...metal} strokeWidth="1" opacity="0.6" />
    </>
  ),

  steam_drill: (
    <>
      <path d="M22 14 Q18 8 22 4 M30 12 Q26 6 30 2" fill="none" stroke={C.light} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <rect x="18" y="14" width="18" height="22" rx="6" {...plate} />
      <circle cx="27" cy="25" r="3.5" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <path d="M36 22 L44 22 L44 30 L36 30" {...plate} fillOpacity={0.3} />
      <path d="M44 22 L58 26 L44 30 Z" {...plate} fillOpacity={0.4} />
      <path d="M46 23.5 L46 28.5 M50 24.5 L50 27.5" {...metal} strokeWidth="1" />
      <circle cx="20" cy="42" r="5" {...plate} fillOpacity={0.35} />
      <circle cx="36" cy="42" r="5" {...plate} fillOpacity={0.35} />
      <line x1="8" y1="48" x2="50" y2="48" {...metal} strokeWidth="1.5" />
      <Shard x={52} y={58} h={9} w={5} r={20} />
    </>
  ),

  mine_cage: (
    <>
      <path d="M32 2 L32 8" {...metal} strokeWidth="2" />
      <path d="M20 12 L32 6 L44 12" {...metal} fill="none" />
      <rect x="14" y="12" width="36" height="46" rx="1.5" {...plate} fillOpacity={0.1} />
      {[20, 26, 32, 38, 44].map((x) => (
        <line key={x} x1={x} y1="12" x2={x} y2="58" {...metal} strokeWidth="1.2" />
      ))}
      <path d="M14 24 L50 24 M14 46 L50 46" {...metal} strokeWidth="2" />
      <Shard x={32} y={44} h={14} w={7} />
    </>
  ),

  ore_train: (
    <>
      <path d="M2 32 L20 32 L20 22 L26 22 L26 32 L28 46 L2 46 Z" {...plate} />
      <rect x="8" y="26" width="7" height="6" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <rect x="30" y="34" width="14" height="12" {...plate} fillOpacity={0.3} />
      <rect x="46" y="34" width="14" height="12" {...plate} fillOpacity={0.3} />
      <Shard x={37} y={35} h={8} w={5} />
      <Shard x={53} y={35} h={9} w={5} r={8} />
      <path d="M28 42 L30 42 M44 42 L46 42" {...metal} strokeWidth="1.4" />
      {[8, 20, 34, 40, 50, 56].map((x) => (
        <circle key={x} cx={x} cy="49" r="3" {...plate} fillOpacity={0.35} />
      ))}
      <line x1="0" y1="54" x2="64" y2="54" {...metal} strokeWidth="1.5" />
    </>
  ),

  rubble: (
    <>
      <path d="M6 56 L14 44 L22 48 L28 36 L38 40 L44 32 L52 42 L58 56 Z" {...plate} />
      <path d="M14 44 L18 56 M28 36 L30 56 M44 32 L42 56 M22 48 L36 50" {...metal} strokeWidth="1" opacity="0.5" />
      <polygon points="18,34 24,30 26,36" {...plate} fillOpacity={0.3} />
      <polygon points="46,24 52,26 48,30" {...plate} fillOpacity={0.3} />
      <Shard x={36} y={44} h={7} w={4} r={12} />
    </>
  ),

  barricade: (
    <>
      <path d="M6 56 L58 56" {...metal} strokeWidth="2.2" />
      <path d="M10 56 L16 26 L48 22 L54 56 Z" {...plate} fillOpacity={0.1} />
      <rect x="10" y="30" width="22" height="9" rx="1" transform="rotate(-8 21 34)" {...plate} />
      <rect x="30" y="26" width="22" height="9" rx="1" transform="rotate(6 41 30)" {...plate} />
      <rect x="12" y="42" width="40" height="10" rx="1" {...plate} />
      <circle cx="22" cy="47" r="1.4" fill="currentColor" />
      <circle cx="42" cy="47" r="1.4" fill="currentColor" />
      <path d="M16 14 L22 22 M50 12 L44 20" {...metal} strokeWidth="2" />
    </>
  ),

  rusted_lantern: (
    <>
      <Glow cy={36} r={16} color={MOLTEN} o={0.16} />
      <path d="M32 4 L32 10" {...metal} strokeWidth="1.6" />
      <path d="M24 14 L40 14 L42 18 L22 18 Z" {...plate} transform="rotate(-6 32 16)" />
      <path d="M24 18 L40 18 L40 46 L24 46 Z" {...plate} fillOpacity={0.08} />
      <path d="M24 18 L24 46 M40 18 L40 46 M24 30 L40 34" {...metal} strokeWidth="1.4" />
      <circle cx="32" cy="34" r="4" fill={MOLTEN} opacity="0.85" />
      <path d="M22 46 L42 46 L40 51 L24 51 Z" {...plate} />
      <path d="M18 54 L22 58 M44 56 L48 52" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <path d="M10 30 A22 22 0 0 1 54 30" fill="none" stroke={C.bright} strokeWidth="1.1" strokeDasharray="2 3" opacity="0.5" />
    </>
  ),

  barbed_wire: (
    <>
      <path d="M8 58 L8 18 M56 58 L56 18" {...metal} strokeWidth="2.6" />
      {[24, 38, 52].map((y) => (
        <path key={y} d={`M8 ${y} Q20 ${y - 6} 32 ${y} Q44 ${y + 6} 56 ${y}`} fill="none" {...metal} strokeWidth="1.3" />
      ))}
      {[[16, 21], [32, 24], [46, 27], [20, 36], [40, 41], [16, 50], [32, 52], [48, 55]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x - 3} ${y - 3} L${x + 3} ${y + 3} M${x + 3} ${y - 3} L${x - 3} ${y + 3}`} stroke={C.mid} strokeWidth="1.4" strokeLinecap="round" />
      ))}
    </>
  ),

  self_assembler: (
    <>
      <Glow r={22} o={0.1} />
      <rect x="22" y="40" width="20" height="14" rx="2" {...plate} />
      <circle cx="32" cy="47" r="3" fill={C.mid} />
      <rect x="24" y="14" width="16" height="10" rx="2" transform="rotate(14 32 19)" {...plate} fillOpacity={0.3} />
      <path d="M12 26 L20 32 M52 22 L44 30" {...metal} strokeWidth="3" />
      <polygon points={blade(14, 44, 3.5, 5.5, 8)} {...plate} fillOpacity={0.3} />
      <polygon points={blade(52, 44, 3, 5, 8)} {...plate} fillOpacity={0.3} />
      <path d="M32 36 L32 28 M24 34 L20 30 M40 34 L44 30" fill="none" stroke={C.bright} strokeWidth="1.2" strokeDasharray="2 2" />
      <path d="M14 58 L50 58" {...metal} strokeWidth="1.5" opacity="0.6" />
    </>
  ),

  tin_drone: (
    <>
      <path d="M10 20 L54 20" {...metal} strokeWidth="1.6" />
      <path d="M32 20 L32 26" {...metal} />
      <path d="M20 26 L44 26 L40 42 L24 42 Z" {...plate} transform="rotate(-4 32 34)" />
      <circle cx="28" cy="32" r="3" fill={C.mid} stroke={C.light} strokeWidth="0.8" />
      <circle cx="37" cy="33" r="2" fill="currentColor" opacity="0.6" />
      <path d="M22 36 L42 36" {...metal} strokeWidth="0.9" opacity="0.5" />
      <path d="M26 42 L24 50 M38 42 L40 50" {...metal} strokeWidth="1.4" />
      <path d="M44 28 L50 24 L52 30" fill="none" {...metal} strokeWidth="1" opacity="0.6" />
    </>
  ),

  ore_hauler: (
    <>
      <path d="M6 22 L40 22 L40 44 L6 44 Z" {...plate} />
      <Shard x={14} y={23} h={10} w={5} r={-12} />
      <Shard x={23} y={23} h={13} w={6} />
      <Shard x={32} y={23} h={9} w={5} r={14} />
      <path d="M40 28 L52 28 L58 36 L58 44 L40 44 Z" {...plate} />
      <path d="M44 31 L51 31 L55 37 L44 37 Z" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      {[14, 30, 50].map((x) => (
        <circle key={x} cx={x} cy="48" r="5" {...plate} fillOpacity={0.35} />
      ))}
      <line x1="2" y1="54" x2="62" y2="54" {...metal} strokeWidth="1.5" />
    </>
  ),

  riveter: (
    <>
      {[12, 22, 32, 42, 52].map((x) => (
        <polygon key={x} points={`${x - 2.5},48 ${x + 2.5},48 ${x},56`} {...plate} fillOpacity={0.35} />
      ))}
      <rect x="6" y="40" width="52" height="8" rx="1" {...plate} />
      {[12, 22, 32, 42, 52].map((x) => (
        <circle key={x} cx={x} cy="44" r="1.6" fill={C.light} />
      ))}
      <path d="M18 8 L34 8 L36 22 L16 22 Z" {...plate} />
      <rect x="22" y="22" width="8" height="6" {...plate} fillOpacity={0.3} />
      <path d="M26 28 L26 36" {...metal} strokeWidth="2.4" />
      <path d="M36 12 L48 12 L48 18" {...metal} strokeWidth="2.4" fill="none" />
      <circle cx="26" cy="38" r="1.6" fill={C.bright} />
    </>
  ),

  blaster: (
    <>
      <Glow cx={44} cy={20} r={16} color={MOLTEN} o={0.22} />
      <path d="M44 6 L47 15 L56 12 L50 20 L58 26 L48 25 L46 34 L42 26 L32 28 L38 20 L32 12 L41 15 Z" fill={MOLTEN} opacity="0.75" />
      <path d="M44 12 L46 18 L51 17 L47 21 L50 25 L45 24 L43 28" fill="none" stroke="#fde68a" strokeWidth="1" />
      <rect x="10" y="30" width="18" height="24" rx="2" {...plate} />
      <path d="M10 38 L28 38 M10 46 L28 46" {...metal} strokeWidth="1.4" />
      <path d="M19 30 Q20 24 28 24 Q34 24 36 22" fill="none" {...metal} strokeWidth="1.3" />
      <path d="M6 58 L58 58" {...metal} strokeWidth="1.4" opacity="0.6" />
    </>
  ),

  crusher: (
    <>
      <path d="M10 8 L54 8 L54 18 L10 18 Z" {...plate} />
      <circle cx="24" cy="32" r="10" {...plate} fillOpacity={0.24} />
      <circle cx="40" cy="32" r="10" {...plate} fillOpacity={0.24} />
      <polygon points={blade(24, 32, 7, 10, 10)} fill="none" {...metal} strokeWidth="1" />
      <polygon points={blade(40, 32, 7, 10, 10)} fill="none" {...metal} strokeWidth="1" />
      <circle cx="24" cy="32" r="2.4" fill={C.mid} />
      <circle cx="40" cy="32" r="2.4" fill={C.mid} />
      <Shard x={32} y={14} h={8} w={5} r={180} />
      <path d="M24 46 L28 56 M32 46 L32 58 M40 46 L36 56" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.5" />
    </>
  ),

  ore_thrower: (
    <>
      <path d="M8 58 L56 58" {...metal} strokeWidth="2.2" />
      <path d="M14 58 L22 44 L42 44 L50 58" {...plate} />
      <circle cx="32" cy="44" r="3" fill={C.mid} />
      <path d="M32 44 L12 14" {...metal} strokeWidth="3.4" />
      <path d="M6 12 Q10 6 18 10 L16 18 Q10 18 6 12 Z" {...plate} />
      <path d="M22 8 Q36 2 50 14" fill="none" stroke={C.mid} strokeWidth="1.3" strokeDasharray="3 3" />
      <Shard x={54} y={24} h={10} w={5} r={40} />
      <path d="M42 44 L50 34" {...metal} strokeWidth="2" />
    </>
  ),

  slag_golem: (
    <>
      <Glow cy={34} r={22} color={MOLTEN} o={0.14} />
      <path d="M24 8 L40 8 L42 20 L22 20 Z" {...plate} />
      <path d="M28 14 L36 14" stroke={MOLTEN} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 22 L50 22 L46 46 L18 46 Z" {...plate} />
      <path d="M22 28 Q28 34 24 40 M38 26 Q34 32 40 38" fill="none" stroke={MOLTEN} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 24 L6 40 L8 48 M50 24 L58 40 L56 48" {...metal} strokeWidth="4" fill="none" />
      <path d="M22 46 L20 58 M42 46 L44 58" {...metal} strokeWidth="5" />
      <circle cx="56" cy="54" r="2" fill={MOLTEN} opacity="0.8" />
    </>
  ),

  power_cell: (
    <>
      <Glow cy={34} r={18} o={0.2} />
      <rect x="27" y="10" width="10" height="5" rx="1.5" {...plate} />
      <rect x="20" y="15" width="24" height="40" rx="4" {...plate} fillOpacity={0.1} />
      {[44, 34, 24].map((y) => (
        <rect key={y} x="24" y={y} width="16" height="7" rx="1" fill={C.mid} opacity="0.8" />
      ))}
      <path d="M33 26 L29 33 L34 33 L30 40" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  battery_crate: (
    <>
      <Glow cy={38} r={22} o={0.14} />
      <path d="M8 24 L56 24 L56 58 L8 58 Z" {...plate} />
      <path d="M8 24 L16 16 L64 16 L56 24 M56 58 L64 50 L64 16" {...plate} fillOpacity={0.08} />
      {[16, 28, 40].map((x) => (
        <g key={x}>
          <rect x={x} y="30" width="8" height="22" rx="2" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
          <rect x={x + 1.5} y="38" width="5" height="12" rx="1" fill={C.mid} />
        </g>
      ))}
      <path d="M8 34 L56 34" {...metal} strokeWidth="1" opacity="0.4" />
    </>
  ),

  ghost_miner: (
    <>
      <Glow cy={30} r={22} color={C.light} o={0.12} />
      <g stroke={C.bright} strokeWidth="1.4" strokeDasharray="3 2.5" fill="none" strokeLinejoin="round">
        <path d="M16 30 C16 18 23 11 32 11 C41 11 48 18 48 30 Z" />
        <path d="M12 30 L52 30" />
        <path d="M20 36 L44 36 L42 54 Q32 60 22 54 Z" />
        <line x1="10" y1="56" x2="34" y2="38" />
      </g>
      <circle cx="32" cy="20" r="3.5" fill={C.light} opacity="0.8" />
      {[40, 45, 50].map((y) => (
        <line key={y} x1="20" y1={y} x2="44" y2={y} stroke={C.light} strokeWidth="0.6" opacity="0.35" />
      ))}
    </>
  ),

  pendulum_saw: (
    <>
      <path d="M10 6 L54 6" {...metal} strokeWidth="2.6" />
      <circle cx="32" cy="6" r="2.5" fill={C.mid} />
      <line x1="32" y1="6" x2="32" y2="36" {...metal} strokeWidth="2" />
      <polygon points={blade(32, 44, 10, 14, 12)} {...plate} />
      <circle cx="32" cy="44" r="4" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <path d="M8 34 A30 30 0 0 0 14 52 M56 34 A30 30 0 0 1 50 52" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M6 30 L10 34 L14 31 M58 30 L54 34 L50 31" fill="none" stroke={C.mid} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </>
  ),

  shrapnel_bot: (
    <>
      <polygon points={ring(32, 36, 12, 8, Math.PI / 8)} {...plate} />
      <circle cx="32" cy="36" r="4.5" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <path d="M22 26 L10 14 M42 26 L54 14" {...metal} strokeWidth="2.2" />
      {[[8, 10], [14, 6], [5, 18], [56, 10], [50, 6], [59, 18]].map(([x, y]) => (
        <polygon key={`${x}${y}`} points={`${x},${y - 2} ${x + 2},${y + 1.5} ${x - 2},${y + 1.5}`} fill={C.mid} />
      ))}
      <path d="M24 48 L22 56 M40 48 L42 56" {...metal} strokeWidth="2" />
      <path d="M16 56 L28 56 M36 56 L48 56" {...metal} strokeWidth="2" />
    </>
  ),

  searchlight: (
    <>
      <polygon points="26,22 2,4 2,20" fill={C.light} opacity="0.18" />
      <polygon points="38,22 62,4 62,20" fill={C.light} opacity="0.18" />
      <path d="M20 16 L44 16 L46 28 L18 28 Z" {...plate} />
      <circle cx="24" cy="22" r="3.5" fill={C.light} />
      <circle cx="40" cy="22" r="3.5" fill={C.light} />
      <path d="M32 28 L32 44" {...metal} strokeWidth="2.6" />
      <path d="M20 58 L32 44 L44 58" {...metal} strokeWidth="2" fill="none" />
      <path d="M12 50 A20 20 0 0 1 52 50" fill="none" stroke={C.bright} strokeWidth="1.1" strokeDasharray="3 3" opacity="0.6" />
    </>
  ),

  rift_mine: (
    <>
      <Glow cy={40} r={20} color="#a855f7" o={0.14} />
      <ellipse cx="32" cy="46" rx="20" ry="7" {...plate} />
      <path d="M14 44 Q32 30 50 44" {...plate} fillOpacity={0.3} />
      <path d="M32 34 L32 26" {...metal} strokeWidth="1.6" />
      <circle cx="32" cy="24" r="2.4" fill="#c084fc" />
      <path d="M28 12 L33 18 L29 22 M40 10 L36 16 L40 20" fill="none" stroke={C.light} strokeWidth="1.2" strokeLinejoin="round" opacity="0.8" />
      <path d="M22 46 L26 42 L30 48 L36 42 L42 46" fill="none" stroke="#c084fc" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),

  fighter_drone: (
    <>
      <path d="M32 8 L40 30 L58 38 L40 40 L32 56 L24 40 L6 38 L24 30 Z" {...plate} />
      <path d="M32 8 L32 56 M6 38 L58 38" {...metal} strokeWidth="1" opacity="0.5" />
      <circle cx="32" cy="32" r="4" fill={C.mid} stroke={C.light} strokeWidth="1" />
      <path d="M12 20 A26 26 0 0 1 52 20" fill="none" stroke={C.bright} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
      <path d="M28 58 L32 62 L36 58" stroke={C.light} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),

  glider: (
    <>
      <path d="M2 30 Q32 14 62 30 L58 34 Q32 22 6 34 Z" {...plate} />
      <path d="M12 28 L20 32 M24 24 L28 29 M40 24 L36 29 M52 28 L44 32" {...metal} strokeWidth="1" opacity="0.6" />
      <path d="M32 22 L32 42" {...metal} strokeWidth="2" />
      <path d="M24 42 L40 42 L32 52 Z" {...plate} fillOpacity={0.3} />
      <circle cx="32" cy="45" r="2" fill={C.mid} />
      <path d="M10 48 L20 44 M8 54 L18 50" stroke={C.light} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </>
  ),

  gyrocopter: (
    <>
      <ellipse cx="32" cy="10" rx="26" ry="2.6" {...plate} />
      <path d="M32 10 L32 20" {...metal} strokeWidth="1.6" />
      <path d="M18 22 L40 20 L46 34 L26 40 L16 32 Z" {...plate} />
      <circle cx="26" cy="29" r="3.5" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <path d="M44 28 L58 26 L58 34 L46 32" {...plate} fillOpacity={0.3} />
      <polygon points={blade(58, 30, 2, 5, 3)} fill="none" {...metal} strokeWidth="1" />
      <path d="M22 40 L20 48 M38 38 L40 48 M16 48 L44 48" {...metal} strokeWidth="1.5" />
    </>
  ),

  overseer_drone: (
    <>
      <circle cx="32" cy="32" r="14" {...plate} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <polygon key={a} points="29.5,18.5 34.5,18.5 32,10" transform={`rotate(${a} 32 32)`} {...plate} fillOpacity={0.35} />
      ))}
      <circle cx="32" cy="32" r="7" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <circle cx="32" cy="32" r="3.5" fill={C.mid} />
      <circle cx="30.5" cy="30.5" r="1.2" fill="#fff" />
      <path d="M4 34 L12 32 M60 34 L52 32" stroke={C.light} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path d="M26 54 L32 58 L38 54" fill="none" stroke={C.mid} strokeWidth="1.2" strokeDasharray="2 2" />
    </>
  ),

  spiked_drone: (
    <>
      <line x1="20" y1="24" x2="10" y2="16" {...metal} />
      <line x1="44" y1="24" x2="54" y2="16" {...metal} />
      <ellipse cx="10" cy="14" rx="8" ry="2.2" {...plate} />
      <ellipse cx="54" cy="14" rx="8" ry="2.2" {...plate} />
      {[0, 72, 144, 216, 288].map((a) => (
        <polygon key={a} points="29.5,24 34.5,24 32,15" transform={`rotate(${a + 36} 32 34)`} {...plate} fillOpacity={0.35} />
      ))}
      <circle cx="32" cy="34" r="10" {...plate} />
      <circle cx="32" cy="34" r="4" fill={C.mid} stroke={C.light} strokeWidth="1" />
    </>
  ),

  grate: (
    <>
      <path d="M8 14 L56 14 L56 54 L8 54 Z" {...plate} fillOpacity={0.1} />
      {[16, 24, 32, 40, 48].map((x) => (
        <g key={x}>
          <line x1={x} y1="14" x2={x} y2="54" {...metal} strokeWidth="1.8" />
          <polygon points={`${x - 2},14 ${x + 2},14 ${x},6`} {...plate} fillOpacity={0.35} />
        </g>
      ))}
      <path d="M8 26 L56 26 M8 42 L56 42" {...metal} strokeWidth="1.4" />
      <path d="M4 58 L60 58" {...metal} strokeWidth="2.2" />
      <path d="M14 34 A18 18 0 0 1 50 34" fill="none" stroke={C.bright} strokeWidth="1.1" strokeDasharray="3 3" opacity="0.6" />
    </>
  ),

  ironclad: (
    <>
      {[10, 20, 30, 40].map((x) => (
        <polygon key={x} points={`${x + 6},18 ${x + 10},18 ${x + 8},10`} {...plate} fillOpacity={0.35} />
      ))}
      <path d="M6 18 L58 18 L60 26 L60 44 L4 44 L4 26 Z" {...plate} />
      <path d="M4 26 L60 26" {...metal} strokeWidth="1.2" opacity="0.6" />
      {[12, 22, 32, 42, 52].map((x) => (
        <circle key={x} cx={x} cy="22" r="0.9" fill="currentColor" />
      ))}
      <rect x="22" y="30" width="20" height="7" rx="1.5" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      {[14, 30, 50].map((x) => (
        <circle key={x} cx={x} cy="48" r="5" {...plate} fillOpacity={0.35} />
      ))}
      <line x1="0" y1="54" x2="64" y2="54" {...metal} strokeWidth="1.5" />
    </>
  ),

  blast_furnace: (
    <>
      <Glow cy={44} r={20} color={MOLTEN} o={0.2} />
      <path d="M26 4 L38 4 L38 14 L26 14 Z" {...plate} fillOpacity={0.3} />
      <path d="M22 14 L42 14 L50 44 L14 44 Z" {...plate} />
      <path d="M18 28 L46 28" {...metal} strokeWidth="1" opacity="0.6" />
      <path d="M26 34 Q32 28 38 34 L38 44 L26 44 Z" fill={MOLTEN} opacity="0.8" />
      {[8, 18, 46, 56].map((x) => (
        <polygon key={x} points={`${x - 2.5},50 ${x + 2.5},50 ${x},42`} {...plate} fillOpacity={0.35} />
      ))}
      <path d="M6 50 L58 50 L56 58 L8 58 Z" {...plate} />
      <path d="M30 2 Q28 -2 32 -4" fill="none" stroke={C.light} strokeWidth="1" opacity="0.5" />
    </>
  ),

  crystal_cocoon: (
    <>
      <Glow cy={34} r={20} o={0.2} />
      <path d="M32 6 L46 22 L44 46 L32 58 L20 46 L18 22 Z" {...plate} fillOpacity={0.12} />
      <path d="M18 22 L46 22 M20 46 L44 46 M32 6 L32 58 M18 22 L32 34 L46 22 M20 46 L32 34 L44 46" {...metal} strokeWidth="1" opacity="0.6" />
      <Shard x={32} y={44} h={20} w={9} />
      <path d="M10 14 L14 18 M54 14 L50 18 M10 52 L14 48 M54 52 L50 48" stroke={C.bright} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
    </>
  ),

  assembly_pod: (
    <>
      <Glow cy={30} r={18} o={0.12} />
      <path d="M12 54 L52 54 L48 20 L16 20 Z" {...plate} fillOpacity={0.08} />
      <path d="M16 20 Q32 8 48 20" {...plate} />
      <path d="M12 54 L52 54" {...metal} strokeWidth="2.4" />
      <path d="M8 30 L16 30 M48 30 L56 30" {...metal} strokeWidth="2" />
      <g stroke={C.bright} strokeWidth="1.2" strokeDasharray="2.5 2" fill="none">
        <path d="M22 36 Q32 26 42 36 Q32 46 22 36 Z" />
        <line x1="32" y1="26" x2="32" y2="22" />
      </g>
      <circle cx="32" cy="36" r="3.5" fill={C.mid} />
    </>
  ),

  salvage_bot: (
    <>
      <path d="M16 22 L44 22 L46 42 L14 42 Z" {...plate} />
      <circle cx="24" cy="31" r="3.5" fill={C.mid} stroke={C.light} strokeWidth="0.8" />
      <circle cx="37" cy="31" r="3.5" fill={C.mid} stroke={C.light} strokeWidth="0.8" />
      <path d="M20 16 L26 22 M40 16 L34 22" {...metal} strokeWidth="1.4" />
      <rect x="12" y="44" width="36" height="8" rx="4" {...plate} fillOpacity={0.3} />
      <path d="M52 22 C60 30 58 44 48 50" fill="none" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M46 46 L48 51 L53 49" fill="none" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 58 L48 58" {...metal} strokeWidth="1.4" opacity="0.6" />
    </>
  ),

  steam_hammer: (
    <>
      <path d="M12 4 L12 58 M52 4 L52 58" {...metal} strokeWidth="2.6" />
      <path d="M8 4 L56 4" {...metal} strokeWidth="3" />
      <rect x="26" y="6" width="12" height="14" rx="2" {...plate} fillOpacity={0.3} />
      <line x1="32" y1="20" x2="32" y2="28" {...metal} strokeWidth="3" />
      <rect x="18" y="28" width="28" height="12" rx="1.5" {...plate} />
      <path d="M18 34 L46 34" {...metal} strokeWidth="1" opacity="0.6" />
      <rect x="20" y="50" width="24" height="8" rx="1" {...plate} fillOpacity={0.3} />
      <path d="M20 46 L16 42 M44 46 L48 42" stroke={C.light} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <Shard x={32} y={50} h={7} w={6} />
    </>
  ),

  tunnel_shield: (
    <>
      <circle cx="32" cy="32" r="26" {...plate} />
      <circle cx="32" cy="32" r="18" fill="none" {...metal} strokeWidth="1.2" opacity="0.7" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="32" y1="14" x2="32" y2="6" transform={`rotate(${a} 32 32)`} {...metal} strokeWidth="1.2" />
      ))}
      <polygon points={ring(32, 32, 8, 6)} fill={C.deep} stroke={C.light} strokeWidth="1" />
      <circle cx="32" cy="32" r="3" fill={C.mid} />
      <path d="M18 24 A16 16 0 0 1 46 24" fill="none" stroke={C.bright} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
    </>
  ),

  quarry_crane: (
    <>
      <path d="M14 58 L14 10 L56 10" {...metal} strokeWidth="2.6" fill="none" />
      <path d="M14 10 L6 18 M14 22 L26 10 M26 10 L38 10 M14 22 L6 22 L6 18" {...metal} strokeWidth="1.4" fill="none" />
      <path d="M20 10 L26 4 L14 4" {...metal} strokeWidth="1.2" fill="none" />
      <line x1="48" y1="10" x2="48" y2="34" {...metal} strokeWidth="1.2" />
      <path d="M40 34 L56 34 L54 46 L42 46 Z" {...plate} />
      <Shard x={45} y={36} h={8} w={4} r={-10} />
      <Shard x={51} y={36} h={10} w={5} r={8} />
      <rect x="8" y="52" width="14" height="6" rx="1" {...plate} />
    </>
  ),

  eternal_miner: (
    <>
      <Glow cy={30} r={22} o={0.14} />
      <circle cx="32" cy="32" r="24" fill="none" stroke={C.mid} strokeWidth="1.4" strokeDasharray="10 4" opacity="0.7" />
      <path d="M52 14 L56 20 L50 21" fill="none" stroke={C.mid} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 34 C17 22 24 15 32 15 C40 15 47 22 47 34 Z" {...plate} />
      <rect x="12" y="33" width="40" height="5" rx="2.5" {...plate} fillOpacity={0.3} />
      <circle cx="32" cy="23" r="4" fill={C.light} stroke={C.mid} strokeWidth="1.2" />
      <line x1="20" y1="54" x2="40" y2="42" {...metal} strokeWidth="2.6" />
      <path d="M34 39 Q42 39 46 46" {...metal} strokeWidth="2.6" fill="none" />
    </>
  ),

  plasma_cutter: (
    <>
      <Glow cx={44} cy={22} r={18} color="#a855f7" o={0.14} />
      <path d="M8 52 L30 34 L36 40 L14 58 Z" {...plate} />
      <rect x="28" y="28" width="12" height="10" rx="2" transform="rotate(-40 34 33)" {...plate} fillOpacity={0.35} />
      <path d="M38 26 L58 8" stroke={C.light} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M38 26 L58 8" stroke="#c084fc" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 48 L22 44" {...metal} strokeWidth="1" opacity="0.6" />
      <circle cx="58" cy="8" r="3" fill="#fff" opacity="0.8" />
      <path d="M48 24 L54 28 M44 30 L46 36" stroke="#c084fc" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  gravity_drone: (
    <>
      <Glow cy={28} r={22} color="#a855f7" o={0.12} />
      <ellipse cx="32" cy="28" rx="26" ry="8" fill="none" stroke={C.mid} strokeWidth="1.2" strokeDasharray="3 3" />
      <polygon points={ring(32, 28, 12, 8, Math.PI / 8)} {...plate} />
      <circle cx="32" cy="28" r="6" fill="#0b0f12" stroke="#c084fc" strokeWidth="1.2" />
      <circle cx="32" cy="28" r="2.4" fill={C.light} />
      <path d="M22 44 L32 52 L42 44 M24 52 L32 58 L40 52" fill="none" {...metal} strokeWidth="1.4" />
    </>
  ),

  qzyrium_seed: (
    <>
      <Glow cy={36} r={20} o={0.22} />
      <Glow cy={36} r={10} color={C.light} o={0.22} />
      <path d="M32 14 C44 22 46 40 32 54 C18 40 20 22 32 14 Z" fill="#06100a" stroke={C.mid} strokeWidth="1.3" />
      <Shard x={32} y={48} h={22} w={8} />
      <path d="M14 56 Q32 50 50 56" fill="none" {...metal} strokeWidth="2" />
      <path d="M12 20 L16 24 M52 20 L48 24 M32 4 L32 9" stroke={C.bright} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  mech_walker: (
    <>
      <path d="M16 12 L48 12 L52 28 L12 28 Z" {...plate} />
      <rect x="22" y="16" width="20" height="6" rx="1.5" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <line x1="24" y1="19" x2="40" y2="19" stroke={C.bright} strokeWidth="1.2" opacity="0.8" />
      <path d="M12 18 L4 18 M52 18 L60 18" {...metal} strokeWidth="3" />
      <path d="M20 28 L12 42 L18 58 M44 28 L52 42 L46 58" {...metal} strokeWidth="3.4" fill="none" />
      <circle cx="12" cy="42" r="2.6" {...plate} fillOpacity={0.4} />
      <circle cx="52" cy="42" r="2.6" {...plate} fillOpacity={0.4} />
      <path d="M12 58 L24 58 M40 58 L52 58" {...metal} strokeWidth="2.4" />
      <Shard x={32} y={12} h={8} w={5} />
    </>
  ),

  undying_golem: (
    <>
      <Glow cy={34} r={26} o={0.12} />
      <path d="M8 34 C8 46 18 56 30 58" fill="none" stroke={C.mid} strokeWidth="1.4" strokeDasharray="4 3" />
      <path d="M26 56 L31 58 L28 62" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="25" y="6" width="14" height="10" rx="2" {...plate} />
      <path d="M28 11 L31 11 M33 11 L36 11" stroke={C.mid} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 18 L46 18 L43 40 L21 40 Z" {...plate} />
      <path d="M26 22 L30 30 L26 36 M38 22 L35 30" fill="none" stroke={C.light} strokeWidth="1" opacity="0.7" />
      <rect x="10" y="20" width="7" height="18" rx="2" {...plate} />
      <rect x="47" y="20" width="7" height="18" rx="2" {...plate} />
      <rect x="22" y="41" width="8" height="12" rx="1.5" {...plate} />
      <rect x="34" y="41" width="8" height="12" rx="1.5" {...plate} />
    </>
  ),

  sky_fortress: (
    <>
      <Glow cy={30} r={26} o={0.1} />
      <path d="M8 40 L56 40 L48 50 L16 50 Z" {...plate} />
      <path d="M14 40 L14 22 L18 22 L18 18 L22 18 L22 22 L42 22 L42 18 L46 18 L46 22 L50 22 L50 40" {...plate} fillOpacity={0.24} />
      <path d="M28 40 L28 32 Q32 27 36 32 L36 40" {...plate} fillOpacity={0.35} />
      <path d="M2 30 L12 32 M62 30 L52 32 M4 36 L12 36 M60 36 L52 36" {...metal} strokeWidth="1.4" />
      <Shard x={32} y={60} h={10} w={6} r={180} />
      <path d="M10 14 A26 26 0 0 1 54 14" fill="none" stroke={C.bright} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
    </>
  ),

  thorn_golem: (
    <>
      {[[12, 22, -60], [52, 22, 60], [32, 4, 0], [20, 10, -30], [44, 10, 30]].map(([x, y, r]) => (
        <polygon key={`${x}${y}`} points={`${x - 2.5},${y + 6} ${x + 2.5},${y + 6} ${x},${y - 2}`} transform={`rotate(${r} ${x} ${y + 4})`} {...plate} fillOpacity={0.4} />
      ))}
      <rect x="25" y="9" width="14" height="10" rx="2" {...plate} />
      <path d="M28 14 L36 14" stroke={C.mid} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 21 L48 21 L44 44 L20 44 Z" {...plate} />
      <polygon points={ring(32, 32, 5, 6)} fill={C.deep} stroke={C.light} strokeWidth="1" strokeOpacity="0.6" />
      <rect x="7" y="23" width="8" height="20" rx="2" {...plate} />
      <rect x="49" y="23" width="8" height="20" rx="2" {...plate} />
      <rect x="21" y="45" width="9" height="13" rx="1.5" {...plate} />
      <rect x="34" y="45" width="9" height="13" rx="1.5" {...plate} />
    </>
  ),

  void_excavator: (
    <>
      <Glow cx={48} cy={30} r={16} color="#a855f7" o={0.16} />
      <path d="M6 46 L32 46 L32 34 L18 34 L14 40 L6 40 Z" {...plate} />
      <rect x="6" y="48" width="30" height="9" rx="4.5" {...plate} fillOpacity={0.3} />
      <path d="M30 36 L40 16 L50 26" {...metal} strokeWidth="3.4" fill="none" />
      <path d="M44 26 L56 22 L60 36 L48 38 Z" fill="#0b0f12" stroke="#c084fc" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M52 26 L50 30 L54 33" fill="none" stroke={C.light} strokeWidth="1" />
      <path d="M44 42 L40 48 M58 40 L62 46" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),

  storm_zeppelin: (
    <>
      <Glow cy={20} r={22} o={0.1} />
      <ellipse cx="32" cy="20" rx="26" ry="11" {...plate} />
      <path d="M8 20 L56 20" {...metal} strokeWidth="1" opacity="0.6" />
      <rect x="24" y="31" width="16" height="7" rx="2" {...plate} />
      <path d="M22 40 L16 50 L20 50 L14 60" fill="none" stroke={C.light} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M42 40 L48 50 L44 50 L50 60" fill="none" stroke={C.light} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M22 40 L16 50 L20 50 L14 60 M42 40 L48 50 L44 50 L50 60" fill="none" stroke={C.mid} strokeWidth="0.6" />
    </>
  ),

  sentinel_array: (
    <>
      <path d="M8 58 L56 58" {...metal} strokeWidth="2.2" />
      <path d="M14 58 L18 40 L46 40 L50 58" {...plate} />
      {[-1, 1].map((s) => (
        <g key={s} transform={`rotate(${s * 30} 32 36)`}>
          <rect x="29" y="10" width="6" height="26" rx="1.5" {...plate} fillOpacity={0.35} />
          <circle cx="32" cy="10" r="2" fill={C.light} />
        </g>
      ))}
      <circle cx="32" cy="38" r="5" fill={C.deep} stroke={C.light} strokeWidth="1" />
      <path d="M14 30 A20 20 0 0 1 50 30" fill="none" stroke={C.bright} strokeWidth="1.1" strokeDasharray="3 3" opacity="0.6" />
    </>
  ),

  dreadnought: (
    <>
      <Glow cy={34} r={28} o={0.1} />
      <path d="M2 40 L10 26 L54 26 L62 40 L56 52 L8 52 Z" {...plate} />
      <path d="M20 26 L22 14 L42 14 L44 26" {...plate} fillOpacity={0.3} />
      <rect x="26" y="18" width="12" height="4" rx="1" fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <path d="M44 20 L60 12 M44 23 L60 18" {...metal} strokeWidth="2.6" />
      <path d="M6 40 L58 40" {...metal} strokeWidth="1.2" opacity="0.6" />
      {[14, 24, 34, 44].map((x) => (
        <Shard key={x} x={x + 2} y={40} h={10} w={5} />
      ))}
      {[12, 22, 32, 42, 52].map((x) => (
        <circle key={x} cx={x} cy="56" r="3" {...plate} fillOpacity={0.35} />
      ))}
    </>
  ),

  scrap_behemoth: (
    <>
      <Glow cy={32} r={26} color={MOLTEN} o={0.1} />
      <path d="M22 4 L42 6 L44 18 L20 18 Z" {...plate} />
      <circle cx="28" cy="11" r="2.6" fill={C.mid} />
      <circle cx="37" cy="12" r="2" fill={MOLTEN} />
      <path d="M10 20 L54 18 L58 34 L50 48 L14 48 L6 34 Z" {...plate} />
      <path d="M14 26 L28 34 M40 24 L52 32 M18 40 L44 38 M32 20 L30 48" {...metal} strokeWidth="1" opacity="0.6" />
      <polygon points={blade(32, 32, 4, 6.5, 8)} fill={C.deep} stroke={C.light} strokeWidth="0.8" />
      <path d="M6 24 L2 40 L6 50 M58 22 L62 38 L58 50" {...metal} strokeWidth="4" fill="none" />
      <rect x="16" y="48" width="12" height="12" rx="1" transform="rotate(-5 22 54)" {...plate} />
      <rect x="36" y="48" width="12" height="12" rx="1" transform="rotate(4 42 54)" {...plate} />
    </>
  ),
};

/** A card's art, sized by its box: memoized, as it changes only with the card. */
export const CardArt = memo(function CardArt({ card, className }: { card: string; className?: string }) {
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
});

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
