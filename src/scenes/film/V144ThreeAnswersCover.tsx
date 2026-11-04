// v144-three-answers's cover (cover.art): you cannot explain to the mechanic what the car does. ONE premium picture: a
// speech bubble built as a solid white object, a thick tangled knot of ink inside it (the hand-waving), and under it
// three solid keys, 1 2 3, the third pressed down in black with a tick. Studio light, real depth, soft shadows; black and
// white only.
import React, {useId} from 'react';
import {C} from '../../tokens';
import {Block, CoverArt, DotPath, Floor, Spot, type CoverP} from '../kit/cover';

export const V144ThreeAnswersCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const H = p.artH ?? 880;
  const bx = 150, by = 24, bw = 600, bh = 280;
  // the knot: one smooth closed curve that crosses itself (a rose curve, drawn thick: a tangle on purpose, not a scribble)
  const knot = Array.from({length: 241}, (_, i) => {
    const t = (i / 240) * Math.PI * 2;
    const r = 1 + 0.42 * Math.cos(5 * t);
    const x = bx + bw / 2 + Math.cos(2 * t) * 190 * r * 0.62 + Math.cos(3 * t) * 34;
    const y = by + bh / 2 + Math.sin(3 * t) * 84 * r * 0.62 + Math.sin(2 * t) * 22;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const keyW = 560, keyH = 90, keyX = 300;
  const gap = (H - 50 - (by + bh + 120) - keyH) / 2;
  const keys = [0, 1, 2].map((i) => ({y: by + bh + 120 + i * gap, on: i === 2}));
  return (
    <CoverArt p={p}>
      <defs>
        <linearGradient id={`tl${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E3E3E3" />
        </linearGradient>
      </defs>
      <Spot cx={480} cy={H * 0.42} r={560} />
      {/* the bubble: a solid white block, its tail an extruded wedge */}
      <path d={`M${bx + 140} ${by + bh - 4} L${bx + 70} ${by + bh + 110} L${bx + 250} ${by + bh - 4} Z`} fill="#BDBDBD" transform="translate(16 -12)" />
      <Block x={bx} y={by} w={bw} h={bh} d={30} r={86} tone={0} gloss={0.5} />
      <path d={`M${bx + 140} ${by + bh - 6} L${bx + 70} ${by + bh + 110} L${bx + 250} ${by + bh - 6} Z`} fill={`url(#tl${uid})`} />
      <path d={knot} fill="none" stroke={C.ink} strokeWidth={13} strokeLinejoin="round" strokeLinecap="round" />
      {/* the way out: dotted, from the bubble to the keys */}
      <DotPath d={`M${bx + bw - 40} ${by + bh + 40} C ${bx + bw} ${by + bh + 110}, ${keyX - 70} ${keys[0].y - 40}, ${keyX - 70} ${keys[0].y + keyH / 2} L${keyX - 70} ${keys[2].y + keyH / 2}`} gap={24} size={10} opacity={0.55} />
      {keys.map((k, i) => (
        <g key={i}>
          <Floor cx={keyX + keyW / 2 + 20} y={k.y + keyH + 14} rx={keyW * 0.52} k={0.7} />
          <Block x={keyX} y={k.y + (k.on ? 8 : 0)} w={keyW} h={keyH} d={k.on ? 14 : 28} r={keyH / 2} tone={k.on ? 0.92 : 0.02} gloss={k.on ? 0.35 : 0.4}>
            <circle cx={keyH / 2} cy={keyH / 2} r={30} fill={k.on ? '#FFFFFF' : C.ink} />
            <text x={keyH / 2} y={keyH / 2 + 13} textAnchor="middle" fontFamily="FiraGO, sans-serif" fontWeight={700} fontSize={38} fill={k.on ? C.ink : '#FFFFFF'}>
              {i + 1}
            </text>
            <rect x={keyH + 16} y={keyH / 2 - 9} width={keyW * (0.46 - i * 0.06)} height={18} rx={9} fill={k.on ? 'rgba(255,255,255,0.8)' : 'rgba(11,11,11,0.3)'} />
            {k.on ? <path d={`M${keyW - 96} ${keyH / 2} l18 18 l38 -40`} fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Block>
        </g>
      ))}
    </CoverArt>
  );
};
