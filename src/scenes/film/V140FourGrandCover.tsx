// v140-four-grand's cover drawing (cover.art): one idea, big. The counter's receipt spike, a tall pile of slips from
// workshop after workshop skewered on it, the top slip printed with the engine's noise as a sound wave. Ink on paper,
// even strokes, a few flat fills; nothing else on the page (the headline says the rest).
import React, {useId} from 'react';
import {C, rgba} from '../../tokens';

type P = {w?: number; h?: number; artH?: number};

/** one receipt slip centred on (0, 0): printed lines, a total, a torn foot */
const Slip: React.FC<{w: number; h: number; k: number; wave?: boolean}> = ({w, h, k, wave}) => {
  const teeth = 10;
  let foot = '';
  for (let i = teeth; i >= 0; i--) foot += ` L${(-w / 2 + (w * i) / teeth).toFixed(1)} ${(h / 2 - (i % 2 ? 12 : 0)).toFixed(1)}`;
  const body = `M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} L${w / 2} ${h / 2}${foot} Z`;
  // the noise, printed: a burst in the middle of a quiet line
  const wv = Array.from({length: 61}, (_, i) => {
    const x = -w / 2 + 36 + ((w - 72) * i) / 60;
    const t = Math.abs(i - 30) / 30;
    const a = (1 - t) ** 1.6 * 54 * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + 0.4)));
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${(-h * 0.08 + (i % 2 ? -a : a)).toFixed(1)}`;
  }).join(' ');
  return (
    <g>
      <path d={body} fill={C.surface} stroke={rgba(C.ink, 0.55)} strokeWidth={3} strokeLinejoin="round" />
      {wave ? (
        <>
          <path d={wv} fill="none" stroke={C.ink} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
          {[0.22, 0.31].map((y, i) => (
            <rect key={i} x={-w / 2 + 36} y={h * y} width={(w - 72) * (i ? 0.55 : 0.8)} height={9} rx={4.5} fill={rgba(C.ink, 0.28)} />
          ))}
          <rect x={w / 2 - 36 - 120} y={h * 0.38} width={120} height={16} rx={8} fill={C.ink} />
        </>
      ) : (
        [-0.3, -0.18, -0.06, 0.06, 0.2].map((y, i) => (
          <rect key={i} x={-w / 2 + 30} y={h * y} width={(w - 60) * (0.5 + ((k * 7 + i * 3) % 5) / 10)} height={i === 4 ? 13 : 8} rx={4} fill={i === 4 ? rgba(C.ink, 0.55) : rgba(C.ink, 0.18)} />
        ))
      )}
    </g>
  );
};

export const V140FourGrandCover: React.FC<{p: P; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const W = p.w ?? 1080;
  const H = p.artH ?? 940;
  const cx = W / 2;
  const baseY = H - 40; // the spike's foot sits on the grid's lower edge
  const topY = 40;
  const n = 6;
  // the pile: slips slide down the rod, the lowest the oldest and most crumpled, each turned a little
  const slips = Array.from({length: n}, (_, i) => {
    const t = i / (n - 1);
    return {y: i === n - 1 ? topY + 330 : baseY - 110 - t * 150, rot: [-6, 4, -3, 6, -4, 0][+i], dx: [-10, 14, -6, 12, -8, 0][+i]};
  });
  return (
    <svg width={W} height={p.h ?? 1200} viewBox={`0 0 ${W} ${p.h ?? 1200}`} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id={`rod${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor={rgba(C.ink, 0.95)} />
          <stop offset="0.5" stopColor={rgba(C.ink, 0.55)} />
          <stop offset="1" stopColor={rgba(C.ink, 0.95)} />
        </linearGradient>
      </defs>
      {/* the base: a heavy round foot in perspective, its shadow on the counter */}
      <ellipse cx={cx} cy={baseY + 18} rx={250} ry={34} fill={rgba(C.ink, 0.1)} />
      <path d={`M${cx - 190} ${baseY} A190 30 0 0 0 ${cx + 190} ${baseY} L${cx + 190} ${baseY - 34} A190 30 0 0 0 ${cx - 190} ${baseY - 34} Z`} fill={rgba(C.ink, 0.85)} />
      <ellipse cx={cx} cy={baseY - 34} rx={190} ry={30} fill={C.surface} stroke={C.ink} strokeWidth={4} />
      {/* the rod, up through every slip, its point above the top one */}
      <rect x={cx - 7} y={topY + 30} width={14} height={baseY - 34 - topY - 30} fill={`url(#rod${uid})`} />
      <path d={`M${cx - 7} ${topY + 30} L${cx} ${topY - 10} L${cx + 7} ${topY + 30} Z`} fill={C.ink} />
      {slips.map((s, i) => (
        <g key={i} transform={`translate(${cx + s.dx} ${s.y}) rotate(${s.rot})`}>
          <Slip w={i === n - 1 ? 500 : 420} h={i === n - 1 ? 560 : 240} k={i} wave={i === n - 1} />
          {/* the hole the spike made */}
          <circle cx={-s.dx} cy={i === n - 1 ? -150 : -60} r={9} fill={rgba(C.ink, 0.85)} />
        </g>
      ))}
    </svg>
  );
};
