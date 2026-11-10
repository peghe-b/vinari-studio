// The palm-scanner parody's cover C (cover.art, white): the app in the car. A small scene, refined and flat like the
// v140/v142/v144 covers: the phone held by a slim clip on the car's air vent, the navigator on its screen (the black turn
// card, 100 m, the route to the car's dot), and the route going on beside it, dotted, to the pin. Everything whole inside
// the frame (the owner, 2026-11-10: never a black mass at the foot that cuts the picture); no fake depth, no shadow.
import React from 'react';
import {CoverArt, Device, DotPath, Mark, type CoverP} from '../kit/cover';

export const PromoPalmMountCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const w = 290, x = 400, y = 70, ph = w * 2.06, sw = w * 0.91, sh = ph - w * 0.09;
  const ventY = y + ph + 46, ventX = 330, ventW = 430, ventH = 74;
  const screen = (
    <g>
      <rect x={0} y={0} width={sw} height={sh} fill="#EEEEEE" />
      <path d={`M-20 ${sh * 0.44} L${sw + 20} ${sh * 0.52} M${sw * 0.3} -20 L${sw * 0.18} ${sh + 20} M${sw * 0.78} ${sh * 0.22} L${sw * 0.7} ${sh + 20}`}
        stroke="#FFFFFF" strokeWidth={22} strokeLinecap="round" />
      <rect x={sw * 0.38} y={sh * 0.58} width={sw * 0.24} height={sh * 0.1} rx={10} fill="#E2E2E2" />
      <path d={`M${sw * 0.22} ${sh * 0.92} L${sw * 0.26} ${sh * 0.66} Q${sw * 0.28} ${sh * 0.48} ${sw * 0.46} ${sh * 0.47} L${sw * 0.74} ${sh * 0.5}`}
        fill="none" stroke="#0B0B0B" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sw * 0.24} cy={sh * 0.8} r={13} fill="#0B0B0B" stroke="#FFFFFF" strokeWidth={4} />
      <rect x={14} y={54} width={sw - 28} height={118} rx={26} fill="#0B0B0B" />
      <g transform="translate(42 130)" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M0 28 L0 -4 Q0 -20 16 -20 L36 -20" />
        <path d="M24 -33 L37 -20 L24 -7" />
      </g>
      <Mark x={100} y={126} size={36} color="#FFFFFF">100 მ</Mark>
      <rect x={100} y={142} width={92} height={10} rx={5} fill="#FFFFFF" opacity={0.45} />
    </g>
  );
  return (
    <CoverArt p={p}>
      {/* the route goes on beside the phone, dotted, to the pin */}
      <DotPath d={`M${x + w + 30} ${y + ph * 0.52} C ${x + w + 150} ${y + ph * 0.46}, ${x + w + 110} ${y + ph * 0.2}, ${x + w + 200} ${y + 120}`} gap={24} size={10} color="#0B0B0B" opacity={0.5} />
      <g transform={`translate(${x + w + 200} ${y + 120})`}>
        <path d="M0 0 C -26 -30 -40 -48 -40 -70 A 40 40 0 1 1 40 -70 C 40 -48 26 -30 0 0 Z" fill="#0B0B0B" />
        <circle cx={0} cy={-70} r={15} fill="#FFFFFF" />
      </g>
      {/* the vent: a slim grille, its slats, and the clip that holds the phone */}
      <rect x={ventX} y={ventY} width={ventW} height={ventH} rx={26} fill="#2A2A2A" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={ventX + 24} y={ventY + 16 + i * 17} width={ventW - 48} height={7} rx={3.5} fill="#4A4A4A" />
      ))}
      <rect x={x + w / 2 - 18} y={y + ph - 20} width={36} height={ventY - (y + ph) + 34} rx={12} fill="#1C1C1C" />
      <rect x={x - 16} y={y + ph * 0.46} width={30} height={92} rx={11} fill="#262626" />
      <rect x={x + w - 14} y={y + ph * 0.46} width={30} height={92} rx={11} fill="#262626" />
      <Device x={x} y={y} w={w} rot={-3}>{screen}</Device>
    </CoverArt>
  );
};
