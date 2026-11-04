// v142-windy-night's cover drawing (cover.art): the night the wind broke a branch over the jeep. One idea, big: the
// windshield seen from the hood, a broken branch lying across the glass, the printed QR card behind it in the lower
// corner, wind running over the top. Thin even strokes in ink on the black field, the card the one flat white fill.
import React from 'react';
import {C, rgba} from '../../tokens';

type P = {w?: number; h?: number; artH?: number};

/** a stable 0..1 from two integers (the QR's modules: drawing code, no randomness) */
const cell = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const QR: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => {
  const n = 21;
  const m = s / n;
  const finder = (cx: number, cy: number) => (
    <g key={`${cx}-${cy}`}>
      <rect x={x + cx * m} y={y + cy * m} width={7 * m} height={7 * m} fill={C.bg} />
      <rect x={x + (cx + 1) * m} y={y + (cy + 1) * m} width={5 * m} height={5 * m} fill={C.ink} />
      <rect x={x + (cx + 2) * m} y={y + (cy + 2) * m} width={3 * m} height={3 * m} fill={C.bg} />
    </g>
  );
  const inFinder = (i: number, j: number) => (i < 8 && j < 8) || (i > 12 && j < 8) || (i < 8 && j > 12);
  const mods: React.ReactNode[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!inFinder(i, j) && cell(i, j) > 0.52) mods.push(<rect key={`${i}.${j}`} x={x + i * m} y={y + j * m} width={m + 0.4} height={m + 0.4} fill={C.bg} />);
  return (
    <g>
      {mods}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </g>
  );
};

export const V142WindyNightCover: React.FC<{p: P; ctx?: unknown}> = ({p}) => {
  const W = p.w ?? 1080;
  const H = p.artH ?? 940;
  const line = rgba(C.ink, 0.9);
  const faint = rgba(C.ink, 0.35);
  // the glass: a wide trapezoid, rounded, the hood's edge under it
  const gx0 = 120, gx1 = W - 120, gy0 = H * 0.2, gy1 = H * 0.78, inset = 120;
  const glass = `M${gx0 + inset} ${gy0} Q${W / 2} ${gy0 - 26} ${gx1 - inset} ${gy0} L${gx1 - 8} ${gy1 - 18} Q${gx1} ${gy1} ${gx1 - 30} ${gy1 + 4} Q${W / 2} ${gy1 + 34} ${gx0 + 30} ${gy1 + 4} Q${gx0} ${gy1} ${gx0 + 8} ${gy1 - 18} Z`;
  // the branch: a main limb from off the left edge to past the glass's right side, snapped at its end, with twigs
  const limb = `M-40 ${gy0 + 40} C ${W * 0.25} ${gy0 + 120}, ${W * 0.48} ${gy0 + 250}, ${W * 0.74} ${gy0 + 330}`;
  const twigs = [
    `M${W * 0.2} ${gy0 + 95} C ${W * 0.24} ${gy0 + 20}, ${W * 0.28} ${gy0 - 30}, ${W * 0.33} ${gy0 - 70}`,
    `M${W * 0.4} ${gy0 + 185} C ${W * 0.45} ${gy0 + 140}, ${W * 0.5} ${gy0 + 120}, ${W * 0.56} ${gy0 + 100}`,
    `M${W * 0.52} ${gy0 + 245} C ${W * 0.53} ${gy0 + 320}, ${W * 0.5} ${gy0 + 380}, ${W * 0.46} ${gy0 + 430}`,
    `M${W * 0.3} ${gy0 + 140} C ${W * 0.3} ${gy0 + 210}, ${W * 0.27} ${gy0 + 260}, ${W * 0.22} ${gy0 + 300}`,
  ];
  const leaves: [number, number, number][] = [
    [W * 0.33, gy0 - 70, -30], [W * 0.29, gy0 - 20, 20], [W * 0.56, gy0 + 100, 10], [W * 0.5, gy0 + 118, -40],
    [W * 0.46, gy0 + 430, 120], [W * 0.5, gy0 + 380, 150], [W * 0.22, gy0 + 300, 100], [W * 0.26, gy0 + 250, 60],
    [W * 0.12, gy0 + 70, -10],
  ];
  const leaf = (x: number, y: number, r: number, i: number) => (
    <path key={i} d="M0 0 C 14 -16, 40 -16, 56 0 C 40 16, 14 16, 0 0 Z M2 0 L50 0" transform={`translate(${x} ${y}) rotate(${r})`} fill={rgba(C.ink, 0.12)} stroke={line} strokeWidth={3} strokeLinejoin="round" />
  );
  // the snapped end: a few splinters
  const ex = W * 0.74, ey = gy0 + 330;
  const card = {x: gx1 - 330, y: gy1 - 300, w: 210, h: 250};
  return (
    <svg width={W} height={p.h ?? 1200} viewBox={`0 0 ${W} ${p.h ?? 1200}`} style={{position: 'absolute', left: 0, top: 0}}>
      {/* wind over the roof line */}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${60 + i * 70} ${gy0 - 110 + i * 22} C ${W * 0.35} ${gy0 - 150 + i * 18}, ${W * 0.6} ${gy0 - 60 + i * 14}, ${W - 80 - i * 40} ${gy0 - 120 + i * 20}`} fill="none" stroke={faint} strokeWidth={3} strokeLinecap="round" strokeDasharray={i % 2 ? '60 22' : '120 30'} />
      ))}
      {/* the windshield, the pillars and the hood's edge */}
      <path d={glass} fill={rgba(C.ink, 0.04)} stroke={line} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M${gx0 + inset} ${gy0} L${gx0 + inset - 60} ${gy0 - 40} M${gx1 - inset} ${gy0} L${gx1 - inset + 60} ${gy0 - 40}`} stroke={line} strokeWidth={4} strokeLinecap="round" />
      <path d={`M40 ${gy1 + 70} Q${W / 2} ${gy1 + 120} ${W - 40} ${gy1 + 70}`} fill="none" stroke={line} strokeWidth={4} strokeLinecap="round" />
      {/* the wipers, parked */}
      <path d={`M${W * 0.22} ${gy1 + 14} L${W * 0.47} ${gy1 - 6} M${W * 0.52} ${gy1 + 16} L${W * 0.77} ${gy1 - 4}`} stroke={line} strokeWidth={6} strokeLinecap="round" />
      {/* the printed QR card behind the glass, its corner taped */}
      <g transform={`rotate(-3 ${card.x + card.w / 2} ${card.y + card.h / 2})`}>
        <rect x={card.x} y={card.y} width={card.w} height={card.h} rx={10} fill={C.ink} />
        <QR x={card.x + 30} y={card.y + 30} s={card.w - 60} />
        <rect x={card.x + 30} y={card.y + card.w - 6} width={card.w - 60} height={8} rx={4} fill={rgba(C.bg, 0.55)} />
        <rect x={card.x + 30} y={card.y + card.w + 12} width={(card.w - 60) * 0.6} height={8} rx={4} fill={rgba(C.bg, 0.35)} />
      </g>
      {/* the branch over everything */}
      <path d={limb} fill="none" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
      <path d={limb} fill="none" stroke={C.bg} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 34" />
      {twigs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
      ))}
      {leaves.map(([x, y, r], i) => leaf(x, y, r, i))}
      <path d={`M${ex - 6} ${ey - 10} L${ex + 26} ${ey - 22} M${ex} ${ey} L${ex + 30} ${ey + 4} M${ex - 4} ${ey + 10} L${ex + 20} ${ey + 26}`} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
};
