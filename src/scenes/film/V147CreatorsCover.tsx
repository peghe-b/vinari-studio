// v147-creators's cover (cover.art, white): the creator program in one small scene, refined and flat like the
// v140/v142/v144 and palm covers: a phone filming (the viewfinder's corners, the REC dot and its timer) and, leaning on it,
// the site's dashed code card with a personal code printed big. No fake depth, no shadow, everything whole in the art box.
import React from 'react';
import {CoverArt, Corners, Device, Mark, type CoverP} from '../kit/cover';

export const V147CreatorsCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const w = 270, x = 250, y = 40, sw = w * 0.91, ph = w * 2.06, sh = ph - w * 0.09;
  const cx = 470, cy = 420, cw = 440, ch = 300;
  const screen = (
    <g>
      <rect x={0} y={0} width={sw} height={sh} fill="#E9E9E9" />
      {/* a road through the viewfinder, two lines and a dotted middle */}
      <path d={`M${sw * 0.1} ${sh} L${sw * 0.44} ${sh * 0.42} M${sw * 0.9} ${sh} L${sw * 0.56} ${sh * 0.42}`} stroke="#C9C9C9" strokeWidth={6} strokeLinecap="round" />
      <line x1={-10} x2={sw + 10} y1={sh * 0.42} y2={sh * 0.42} stroke="#D6D6D6" strokeWidth={4} />
      <Corners x={22} y={70} w={sw - 44} h={sh - 160} len={34} sw={6} color="#0B0B0B" />
      <circle cx={38} cy={44} r={9} fill="#0B0B0B" />
      <Mark x={54} y={51} size={18} color="#0B0B0B">REC 00:12</Mark>
      <circle cx={sw / 2} cy={sh - 46} r={26} fill="none" stroke="#0B0B0B" strokeWidth={6} />
      <circle cx={sw / 2} cy={sh - 46} r={17} fill="#0B0B0B" />
    </g>
  );
  return (
    <CoverArt p={p}>
      <Device x={x} y={y} w={w} rot={-7}>{screen}</Device>
      {/* the code card: white, its dashed inner edge and the ticket notches, a personal code */}
      <g transform={`rotate(4 ${cx + cw / 2} ${cy + ch / 2})`}>
        <rect x={cx} y={cy} width={cw} height={ch} rx={34} fill="#FFFFFF" stroke="#D2D2D2" strokeWidth={3} />
        <rect x={cx + 16} y={cy + 16} width={cw - 32} height={ch - 32} rx={24} fill="none" stroke="#BDBDBD" strokeWidth={3} strokeDasharray="10 9" />
        <circle cx={cx} cy={cy + ch * 0.62} r={18} fill="#F3F3F3" stroke="#D2D2D2" strokeWidth={3} />
        <circle cx={cx + cw} cy={cy + ch * 0.62} r={18} fill="#F3F3F3" stroke="#D2D2D2" strokeWidth={3} />
        <rect x={cx + 44} y={cy + 48} width={150} height={14} rx={7} fill="#BDBDBD" />
        <Mark x={cx + 44} y={cy + 146} size={78} color="#0B0B0B">NIA</Mark>
        <line x1={cx + 30} x2={cx + cw - 30} y1={cy + ch * 0.62} y2={cy + ch * 0.62} stroke="#D2D2D2" strokeWidth={3} strokeDasharray="8 8" />
        <rect x={cx + 44} y={cy + ch - 78} width={cw - 88} height={48} rx={24} fill="#0B0B0B" />
        <rect x={cx + 78} y={cy + ch - 60} width={120} height={12} rx={6} fill="rgba(255,255,255,0.8)" />
      </g>
    </CoverArt>
  );
};
