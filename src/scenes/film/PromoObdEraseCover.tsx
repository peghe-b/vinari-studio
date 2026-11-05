// The OBD 3D promo's cover A (cover.art, white): the seller's trick. ONE object: a cheap handheld scanner standing on a
// glossy floor, the stored code on its screen and the big erase key under it.
import React, {useId} from 'react';
import {Block, CoverArt, Floor, Halo, Mark, Mirror, Spot, type CoverP} from '../kit/cover';

const BIN = 'M-34 -30 L34 -30 M-12 -44 L12 -44 M-26 -30 L-20 40 L20 40 L26 -30';

export const PromoObdEraseCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const H = p.artH ?? 880;
  const w = 420, h = 640, x = 540 - w / 2 - 14, y = 40;
  const face = (
    <g>
      <rect x={34} y={40} width={w - 68} height={330} rx={30} fill="#0C0C0C" />
      <Mark x={62} y={86} size={24} color="#8A8A8A">OBD-II</Mark>
      <circle cx={w - 70} cy={78} r={9} fill="#FFFFFF" opacity={0.9} />
      <Mark x={w / 2} y={240} size={92} anchor="middle" color="#FFFFFF">P0420</Mark>
      <rect x={w / 2 - 70} y={276} width={140} height={14} rx={7} fill="#3A3A3A" />
      {/* the erase key: big, white, lit */}
      <ellipse cx={w / 2} cy={500} rx={150} ry={95} fill={`url(#kg${uid})`} />
      <rect x={w / 2 - 120} y={440} width={240} height={120} rx={40} fill="#FFFFFF" />
      <path d={BIN} transform={`translate(${w / 2} 500) scale(1.05)`} fill="none" stroke="#0B0B0B" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  return (
    <CoverArt p={p}>
      <defs>
        <radialGradient id={`kg${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <Halo cx={540} cy={y + h / 2} r={420} />
      <Spot cx={540} cy={H * 0.45} r={620} k={1.1} />
      <Floor cx={540} y={y + h + 40} rx={300} k={0.9} />
      <Mirror y={y + h + 38} depth={180} k={0.7}>
        <Block x={x} y={y} w={w} h={h} d={46} r={64} tone={0.92} />
      </Mirror>
      <Block x={x} y={y} w={w} h={h} d={46} r={64} tone={0.92} gloss={0.6} stroke={2}>{face}</Block>
    </CoverArt>
  );
};
