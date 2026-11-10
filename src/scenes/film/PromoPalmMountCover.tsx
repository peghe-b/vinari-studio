// The palm-scanner parody's cover C (cover.art, white): the app in the car. A small scene, refined and flat like the
// v140/v142/v144 covers: the windscreen's arc and the road running away through it, the dashboard's sweep and the wheel's rim
// at the left, and on the dash the phone in its mount with the navigator (the black turn card, 100 m, the route to the car's
// dot). Everything that meets the frame's side bleeds off it; no fake depth, no shadow.
import React, {useId} from 'react';
import {CoverArt, Device, DotPath, Mark, type CoverP} from '../kit/cover';

export const PromoPalmMountCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const w = 270, x = 610, y = 120, ph = w * 2.06, sw = w * 0.91, sh = ph - w * 0.09;
  const dashY = 640, hz = 300;
  const screen = (
    <g>
      <rect x={0} y={0} width={sw} height={sh} fill="#EEEEEE" />
      <path d={`M-20 ${sh * 0.44} L${sw + 20} ${sh * 0.52} M${sw * 0.3} -20 L${sw * 0.18} ${sh + 20} M${sw * 0.78} ${sh * 0.22} L${sw * 0.7} ${sh + 20}`}
        stroke="#FFFFFF" strokeWidth={20} strokeLinecap="round" />
      <rect x={sw * 0.38} y={sh * 0.58} width={sw * 0.24} height={sh * 0.1} rx={10} fill="#E2E2E2" />
      <path d={`M${sw * 0.22} ${sh * 0.92} L${sw * 0.26} ${sh * 0.66} Q${sw * 0.28} ${sh * 0.48} ${sw * 0.46} ${sh * 0.47} L${sw * 0.74} ${sh * 0.5}`}
        fill="none" stroke="#0B0B0B" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sw * 0.24} cy={sh * 0.8} r={12} fill="#0B0B0B" stroke="#FFFFFF" strokeWidth={4} />
      <rect x={12} y={52} width={sw - 24} height={112} rx={24} fill="#0B0B0B" />
      <g transform="translate(38 124)" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M0 26 L0 -4 Q0 -19 15 -19 L34 -19" />
        <path d="M23 -31 L35 -19 L23 -7" />
      </g>
      <Mark x={92} y={120} size={34} color="#FFFFFF">100 მ</Mark>
      <rect x={92} y={136} width={86} height={9} rx={4.5} fill="#FFFFFF" opacity={0.45} />
    </g>
  );
  return (
    <CoverArt p={p}>
      <defs>
        <linearGradient id={`d${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262626" />
          <stop offset="1" stopColor="#0C0C0C" />
        </linearGradient>
      </defs>
      {/* the windscreen's top edge, off both sides */}
      <path d="M-40 150 Q540 40 1120 150" fill="none" stroke="#CFCFCF" strokeWidth={10} strokeLinecap="round" />
      {/* the road running away, the horizon, the dotted centre line */}
      <line x1={-40} x2={1120} y1={hz} y2={hz} stroke="#DCDCDC" strokeWidth={4} />
      <path d={`M60 ${dashY} L430 ${hz} M840 ${dashY} L470 ${hz}`} fill="none" stroke="#CDCDCD" strokeWidth={6} strokeLinecap="round" />
      <DotPath d={`M450 ${dashY - 40} L450 ${hz + 20}`} gap={28} size={8} color="#BDBDBD" />
      {/* the dashboard's sweep, off both sides */}
      <path d={`M-60 ${dashY + 30} Q540 ${dashY - 60} 1140 ${dashY + 30} L1140 2200 L-60 2200 Z`} fill={`url(#d${uid})`} />
      <path d={`M-60 ${dashY + 30} Q540 ${dashY - 60} 1140 ${dashY + 30}`} fill="none" stroke="#3A3A3A" strokeWidth={4} />
      {/* the wheel's rim at the left, rising over the dash */}
      <circle cx={170} cy={dashY + 250} r={250} fill="none" stroke="#141414" strokeWidth={46} />
      <circle cx={170} cy={dashY + 250} r={250 - 20} fill="none" stroke="#3A3A3A" strokeWidth={3} />
      {/* the mount: a stem to the dash, side grips */}
      <rect x={x + w / 2 - 22} y={y + ph - 30} width={44} height={dashY - (y + ph) + 50} rx={15} fill="#2B2B2B" />
      <rect x={x - 18} y={y + ph * 0.44} width={32} height={90} rx={12} fill="#262626" />
      <rect x={x + w - 14} y={y + ph * 0.44} width={32} height={90} rx={12} fill="#262626" />
      <Device x={x} y={y} w={w} rot={-3}>{screen}</Device>
    </CoverArt>
  );
};
