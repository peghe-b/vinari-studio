// The OBD 3D promo's cover C (cover.art, white): the buy check's answer in the hand of the app. ONE premium object: a phone
// turned a little the other way, on its screen the "recently cleared" card (a reset arrow, the verdict as bars, the three
// clues 3/8, 12 km, 2 as rows with their values, the permanent code as a chip), on a glossy floor.
import React from 'react';
import {CoverArt, Device, Floor, Halo, Mark, Mirror, Spot, type CoverP} from '../kit/cover';

export const PromoObdResultCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const H = p.artH ?? 880;
  const w = 430, x = 540 - w / 2, y = 10, sw = w * 0.91;
  const rows: [string, number][] = [['3/8', 0.52], ['12 კმ', 0.44], ['2', 0.36]];
  const screen = (
    <g>
      <rect x={0} y={0} width={sw} height={sw * 2.2} fill="#F4F4F4" />
      <rect x={22} y={100} width={sw - 44} height={560} rx={34} fill="#FFFFFF" />
      {/* the reset mark: an open circle with its arrow */}
      <path d={`M${sw / 2 + 44} 168 A 52 52 0 1 0 ${sw / 2 + 52} 214`} fill="none" stroke="#0B0B0B" strokeWidth={14} strokeLinecap="round" />
      <path d={`M${sw / 2 + 30} 150 L${sw / 2 + 50} 172 L${sw / 2 + 74} 156`} fill="none" stroke="#0B0B0B" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={52} y={290} width={sw - 104} height={22} rx={11} fill="#0B0B0B" />
      <rect x={92} y={328} width={sw - 184} height={22} rx={11} fill="#0B0B0B" />
      {rows.map(([v, k], i) => (
        <g key={i}>
          <line x1={48} x2={sw - 48} y1={392 + i * 82} y2={392 + i * 82} stroke="#E6E6E6" strokeWidth={3} />
          <rect x={52} y={418 + i * 82} width={(sw - 104) * k} height={16} rx={8} fill="#BDBDBD" />
          <Mark x={sw - 52} y={438 + i * 82} size={34} anchor="end" color="#0B0B0B">{v}</Mark>
        </g>
      ))}
      <rect x={sw / 2 - 86} y={700} width={172} height={52} rx={26} fill="#0B0B0B" />
      <Mark x={sw / 2} y={735} size={26} anchor="middle" color="#FFFFFF">P0420</Mark>
    </g>
  );
  return (
    <CoverArt p={p}>
      <Halo cx={540} cy={H * 0.45} r={380} />
      <Spot cx={540} cy={H * 0.45} r={620} />
      <Floor cx={540} y={y + w * 2.06 + 14} rx={260} k={0.8} />
      <Mirror y={y + w * 2.06 + 12} depth={180} k={0.7}>
        <Device x={x} y={y} w={w} rot={6}>{screen}</Device>
      </Mirror>
      <Device x={x} y={y} w={w} rot={6}>{screen}</Device>
    </CoverArt>
  );
};
