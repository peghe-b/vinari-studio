// The chek promo's cover C (cover.art): the verdict in the hand of the app. ONE premium object: a phone standing a
// little turned in a studio light, on its screen a clean verdict card (a big round badge, the answer as bars, the code as
// a chip), its reflection on a glossy floor, a halo stage behind it.
import React from 'react';
import {Device, Floor, Halo, Mark, Mirror, Spot, CoverArt, type CoverP} from '../kit/cover';

export const PromoChekCCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const H = p.artH ?? 880;
  const w = 430;
  const x = 540 - w / 2;
  const y = 10;
  const sw = w * 0.91;
  const screen = (
    <g>
      <rect x={0} y={0} width={sw} height={sw * 2.2} fill="#F4F4F4" />
      <rect x={22} y={110} width={sw - 44} height={330} rx={34} fill="#FFFFFF" />
      <circle cx={sw / 2} cy={210} r={62} fill="#0B0B0B" />
      <path d={`M${sw / 2 - 26} 210 l18 18 l36 -40`} fill="none" stroke="#FFFFFF" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={52} y={300} width={sw - 104} height={22} rx={11} fill="#0B0B0B" />
      <rect x={82} y={340} width={sw - 164} height={22} rx={11} fill="#0B0B0B" />
      <rect x={sw / 2 - 70} y={390} width={140} height={34} rx={17} fill="#E4E4E4" />
      <Mark x={sw / 2} y={415} size={22} anchor="middle" color="#3A3A3A">P0300</Mark>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={22} y={470 + i * 92} width={sw - 44} height={76} rx={22} fill="#FFFFFF" />
          <rect x={48} y={500 + i * 92} width={(sw - 96) * (0.6 - i * 0.12)} height={14} rx={7} fill="#B5B5B5" />
        </g>
      ))}
    </g>
  );
  return (
    <CoverArt p={p}>
      <Halo cx={540} cy={H * 0.45} r={380} />
      <Spot cx={540} cy={H * 0.45} r={620} />
      <Floor cx={540} y={y + w * 2.06 + 14} rx={260} k={0.8} />
      <Mirror y={y + w * 2.06 + 12} depth={180} k={0.7}>
        <Device x={x} y={y} w={w} rot={-6}>{screen}</Device>
      </Mirror>
      <Device x={x} y={y} w={w} rot={-6}>{screen}</Device>
    </CoverArt>
  );
};
