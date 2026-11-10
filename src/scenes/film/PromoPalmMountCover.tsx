// The palm-scanner parody's cover C (cover.art, white): the app in the car. ONE flat object: a phone held in a dash mount,
// on its screen the navigator (the black turn card with its arrow and 100 m, a light map, the route in black to the car's dot).
import React from 'react';
import {Block, CoverArt, Device, Mark, type CoverP} from '../kit/cover';

export const PromoPalmMountCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const w = 350, x = 540 - w / 2, y = 0, ph = w * 2.06, sw = w * 0.91, sh = ph - w * 0.09;
  const screen = (
    <g>
      <rect x={0} y={0} width={sw} height={sh} fill="#EEEEEE" />
      {/* the map: soft streets, a block, the route */}
      <path d={`M-20 ${sh * 0.42} L${sw + 20} ${sh * 0.5} M${sw * 0.3} -20 L${sw * 0.18} ${sh + 20} M${sw * 0.78} ${sh * 0.2} L${sw * 0.7} ${sh + 20}`}
        stroke="#FFFFFF" strokeWidth={26} strokeLinecap="round" />
      <rect x={sw * 0.36} y={sh * 0.56} width={sw * 0.26} height={sh * 0.12} rx={12} fill="#E1E1E1" />
      <path d={`M${sw * 0.22} ${sh * 0.92} L${sw * 0.26} ${sh * 0.66} Q${sw * 0.28} ${sh * 0.47} ${sw * 0.46} ${sh * 0.46} L${sw * 0.74} ${sh * 0.49}`}
        fill="none" stroke="#0B0B0B" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sw * 0.24} cy={sh * 0.8} r={17} fill="#0B0B0B" stroke="#FFFFFF" strokeWidth={6} />
      {/* the turn card */}
      <rect x={16} y={64} width={sw - 32} height={146} rx={30} fill="#0B0B0B" />
      <g transform="translate(48 156)" stroke="#FFFFFF" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M0 34 L0 -6 Q0 -26 20 -26 L46 -26" />
        <path d="M32 -42 L48 -26 L32 -10" />
      </g>
      <Mark x={116} y={160} size={44} color="#FFFFFF">100 მ</Mark>
      <rect x={sw / 2 - 60} y={sh - 22} width={120} height={7} rx={3.5} fill="#0B0B0B" opacity={0.6} />
    </g>
  );
  const armY = y + ph * 0.44;
  return (
    <CoverArt p={p}>
      {/* flat now, no floor or reflection under it: the object itself takes the room (the owner: big, one idea) */}
      <g transform="translate(540 0) scale(1.16) translate(-540 0)">
      {/* the mount: a stem down to the vent clip, side grips round the phone */}
      <rect x={540 - 30} y={y + ph - 40} width={60} height={124} rx={22} fill="#2B2B2B" />
      <Block x={540 - 240} y={y + ph + 70} w={480} h={52} r={20} tone={0.86} />
      <rect x={x - 26} y={armY} width={44} height={120} rx={16} fill="#262626" />
      <rect x={x + w - 18} y={armY} width={44} height={120} rx={16} fill="#262626" />
      <Device x={x} y={y} w={w}>{screen}</Device>
      <rect x={x - 26} y={armY + 14} width={20} height={92} rx={8} fill="#3A3A3A" />
      <rect x={x + w + 6} y={armY + 14} width={20} height={92} rx={8} fill="#3A3A3A" />
      </g>
    </CoverArt>
  );
};
