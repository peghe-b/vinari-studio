// v144-three-answers's cover drawing (cover.art): you cannot explain to the mechanic what the car does. One idea, big:
// a speech bubble full of a tangled scribble (the hand-waving), and out of it a clean path to three numbered answers,
// the third one picked. Ink on paper, even strokes, flat white cards; no words.
import React from 'react';
import {C, rgba} from '../../tokens';

type P = {w?: number; h?: number; artH?: number};

export const V144ThreeAnswersCover: React.FC<{p: P; ctx?: unknown}> = ({p}) => {
  const W = p.w ?? 1080;
  const H = p.artH ?? 940;
  const bx = 110, by = 20, bw = 560, bh = 330;
  // the tangle: a pen that loops and doubles back (a fixed path, drawn once)
  const tangle = Array.from({length: 90}, (_, i) => {
    const t = i / 89;
    const x = bx + 70 + t * (bw - 140) + Math.sin(i * 0.9) * 46 + Math.sin(i * 0.31) * 30;
    const y = by + bh / 2 + Math.cos(i * 1.15) * 70 * (0.55 + 0.45 * Math.sin(i * 0.17)) + Math.sin(i * 0.43) * 26;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const rows = [0, 1, 2].map((i) => ({y: by + bh + 120 + i * ((H - 60 - (by + bh + 120) - 104) / 2), picked: i === 2}));
  const cardX = 330, cardW = 620, cardH = 104;
  return (
    <svg width={W} height={p.h ?? 1200} viewBox={`0 0 ${W} ${p.h ?? 1200}`} style={{position: 'absolute', left: 0, top: 0}}>
      {/* the bubble with its tail, a soft drop under it */}
      <rect x={bx + 10} y={by + 16} width={bw} height={bh} rx={70} fill={rgba(C.ink, 0.07)} />
      <path d={`M${bx + 120} ${by + bh - 2} L${bx + 70} ${by + bh + 90} L${bx + 210} ${by + bh - 2}`} fill={C.surface} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={bx} y={by} width={bw} height={bh} rx={70} fill={C.surface} stroke={C.ink} strokeWidth={4} />
      <rect x={bx + 116} y={by + bh - 6} width={98} height={10} fill={C.surface} />
      <path d={tangle} fill="none" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      {/* the clean way out: a dotted leader from the bubble down to the answers */}
      <path d={`M${bx + bw - 60} ${by + bh + 10} C ${bx + bw - 40} ${by + bh + 70}, ${cardX - 80} ${rows[0].y - 60}, ${cardX - 80} ${rows[0].y + cardH / 2}`} fill="none" stroke={rgba(C.ink, 0.6)} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
      <path d={`M${cardX - 80} ${rows[0].y + cardH / 2} L${cardX - 80} ${rows[2].y + cardH / 2}`} stroke={rgba(C.ink, 0.6)} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
      {rows.map((r, i) => (
        <g key={i}>
          <path d={`M${cardX - 80} ${r.y + cardH / 2} L${cardX - 14} ${r.y + cardH / 2}`} stroke={rgba(C.ink, 0.6)} strokeWidth={4} strokeLinecap="round" />
          <rect x={cardX + 6} y={r.y + 10} width={cardW} height={cardH} rx={cardH / 2} fill={rgba(C.ink, 0.07)} />
          <rect x={cardX} y={r.y} width={cardW} height={cardH} rx={cardH / 2} fill={r.picked ? C.ink : C.surface} stroke={C.ink} strokeWidth={4} />
          <circle cx={cardX + cardH / 2} cy={r.y + cardH / 2} r={34} fill={r.picked ? C.surface : C.ink} />
          <text x={cardX + cardH / 2} y={r.y + cardH / 2 + 15} textAnchor="middle" fontFamily="FiraGO, sans-serif" fontWeight={700} fontSize={42} fill={r.picked ? C.ink : C.surface}>
            {i + 1}
          </text>
          {/* the answer's line of type, as bars: the cover has no small words */}
          <rect x={cardX + cardH + 20} y={r.y + cardH / 2 - 9} width={cardW * (0.5 - i * 0.07)} height={18} rx={9} fill={r.picked ? rgba(C.surface, 0.9) : rgba(C.ink, 0.35)} />
          {r.picked ? <path d={`M${cardX + cardW - 92} ${r.y + cardH / 2} l18 18 l36 -38`} fill="none" stroke={C.surface} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" /> : null}
        </g>
      ))}
    </svg>
  );
};
