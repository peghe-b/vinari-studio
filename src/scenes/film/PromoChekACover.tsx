// The chek promo's cover A (cover.art): the check-engine light that finally talks. ONE premium object: a solid dark
// speech bubble, the engine light glowing inside it like a lamp behind glass, on a halo stage with a glossy floor.
import React, {useId} from 'react';
import {Block, CoverArt, Floor, Halo, Mirror, Spot, type CoverP} from '../kit/cover';

/** the engine warning glyph (the ISO symbol), 220 wide, drawn at (0, 0) */
const ENGINE = 'M40 30 L70 30 L70 10 L130 10 L130 30 L160 30 L175 50 L195 50 L195 30 L205 30 L205 110 L195 110 L195 90 L175 90 L150 125 L60 125 L40 100 L20 100 L20 120 L0 120 L0 45 L20 45 L20 65 L40 65 Z';

export const PromoChekACover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const H = p.artH ?? 880;
  const bw = 740, bh = 530, bx = 540 - bw / 2 - 20, by = 20;
  const gx = bx + bw / 2 - 205, gy = by + bh / 2 - 125;
  return (
    <CoverArt p={p}>
      <defs>
        <radialGradient id={`gw${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.12} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <filter id={`bl${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={14} />
        </filter>
      </defs>
      <Halo cx={540} cy={by + bh / 2 + 20} r={400} />
      <Spot cx={540} cy={H * 0.45} r={600} />
      <Floor cx={540} y={by + bh + 150} rx={330} k={0.9} />
      <Mirror y={by + bh + 150} depth={200} k={0.8}>
        <Block x={bx} y={by + 10} w={bw} h={bh} d={34} r={120} tone={0.94} />
      </Mirror>
      {/* the tail, then the bubble */}
      <path d={`M${bx + 150} ${by + bh - 10} L${bx + 90} ${by + bh + 150} L${bx + 300} ${by + bh - 10} Z`} fill="#2A2A2A" transform="translate(18 -14)" />
      <path d={`M${bx + 150} ${by + bh - 10} L${bx + 90} ${by + bh + 150} L${bx + 300} ${by + bh - 10} Z`} fill="#141414" />
      <Block x={bx} y={by} w={bw} h={bh} d={34} r={120} tone={0.94} gloss={0.6}>
        {/* the lamp behind its glass: a wide soft glow, then the glyph lit white with its own bloom */}
        <ellipse cx={bw / 2} cy={bh / 2} rx={300} ry={220} fill={`url(#gw${uid})`} />
        <g transform={`translate(${gx - bx - 20} ${gy - by - 10}) scale(2.2)`}>
          <path d={ENGINE} fill="#FFFFFF" opacity={0.6} filter={`url(#bl${uid})`} />
          <path d={ENGINE} fill="#FFFFFF" />
        </g>
      </Block>
      <rect x={bx + 150} y={by + bh - 16} width={150} height={14} fill="#141414" />
    </CoverArt>
  );
};
