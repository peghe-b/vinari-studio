// The chek promo's cover B (cover.art, the black cover): the ELM327 adapter, big, a premium dark plastic object with its
// own print and its light on, plugged into the car's 16-pin socket, the Wi-Fi arcs over it. Studio light, one idea.
import React, {useId} from 'react';
import {Block, CoverArt, Floor, Mark, Spot, type CoverP} from '../kit/cover';

export const PromoChekBCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const H = p.artH ?? 880;
  const ax = 170, ay = 170, aw = 660, ah = 390;
  return (
    <CoverArt p={p}>
      <defs>
        <radialGradient id={`led${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.5} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <Spot cx={540} cy={H * 0.45} r={620} k={1.3} />
      <Floor cx={560} y={ay + ah + 120} rx={360} />
      {/* the car's socket under it: a dark trapezoid housing with its 16 pins */}
      <Block x={ax + 40} y={ay + ah - 6} w={aw - 80} h={130} d={26} r={22} tone={0.78}>
        <path d={`M40 22 L${aw - 120} 22 L${aw - 150} 104 L70 104 Z`} fill="#0A0A0A" />
        {Array.from({length: 16}, (_, i) => (
          <rect key={i} x={70 + (i % 8) * ((aw - 230) / 7)} y={i < 8 ? 40 : 70} width={12} height={20} rx={3} fill="#9A9A9A" />
        ))}
      </Block>
      {/* the adapter, standing in the socket */}
      <Block x={ax} y={ay} w={aw} h={ah} d={48} r={56} tone={0.9} gloss={0.7} stroke={2}>
        <Mark x={64} y={150} size={76} color="#F2F2F2">ELM327</Mark>
        <Mark x={68} y={214} size={34} color="#9C9C9C">OBD-II · WI-FI</Mark>
        <circle cx={aw - 80} cy={ah - 76} r={46} fill={`url(#led${uid})`} />
        <circle cx={aw - 80} cy={ah - 76} r={14} fill="#FFFFFF" />
      </Block>
      {/* its signal: three arcs */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${ax + aw - 40 - i * 34} ${ay - 40 - i * 34} A ${70 + i * 48} ${70 + i * 48} 0 0 1 ${ax + aw + 50 + i * 34} ${ay + 50 + i * 34}`} fill="none" stroke="#F2F2F2" strokeOpacity={0.85 - i * 0.22} strokeWidth={14} strokeLinecap="round" />
      ))}
    </CoverArt>
  );
};
