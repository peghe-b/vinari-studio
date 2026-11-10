// The palm-scanner parody's cover B (cover.art, white): "we do not even ask for your e-mail". A small scene, refined and
// flat like the v140/v142/v144 covers: a sign-up card whose e-mail and password fields are struck through by hand, and the
// way out dotted down to the one black button with its tick. No fake depth, no shadow, no reflection.
import React, {useId} from 'react';
import {CoverArt, DotPath, type CoverP} from '../kit/cover';

export const PromoPalmAtCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const cx = 210, cy = 60, cw = 600, ch = 640;
  const f1 = cy + 190, f2 = cy + 316, fh = 92, fx = cx + 44, fw = cw - 88;
  const btnY = cy + ch - 150;
  const strike = (yy: number) => `M${fx - 18} ${yy + fh / 2 + 14} C ${fx + fw * 0.3} ${yy + fh / 2 - 6}, ${fx + fw * 0.7} ${yy + fh / 2 + 10}, ${fx + fw + 18} ${yy + fh / 2 - 10}`;
  return (
    <CoverArt p={p}>
      <defs>
        <linearGradient id={`c${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E3E3E3" />
        </linearGradient>
      </defs>
      <g transform={`rotate(3 ${cx + cw / 2} ${cy + ch / 2})`}>
        <rect x={cx} y={cy} width={cw} height={ch} rx={58} fill={`url(#c${uid})`} stroke="#D4D4D4" strokeWidth={3} />
        {/* the sheet's title: a black bar and a grey one */}
        <rect x={fx} y={cy + 66} width={250} height={26} rx={13} fill="#0B0B0B" />
        <rect x={fx} y={cy + 112} width={360} height={16} rx={8} fill="#BDBDBD" />
        {/* the e-mail field */}
        <rect x={fx} y={f1} width={fw} height={fh} rx={26} fill="#F6F6F6" stroke="#D2D2D2" strokeWidth={3} />
        <text x={fx + 50} y={f1 + 62} textAnchor="middle" fontFamily="FiraGO, sans-serif" fontWeight={500} fontSize={52} fill="#8A8A8A">@</text>
        <rect x={fx + 96} y={f1 + fh / 2 - 8} width={230} height={16} rx={8} fill="#CFCFCF" />
        {/* the password field */}
        <rect x={fx} y={f2} width={fw} height={fh} rx={26} fill="#F6F6F6" stroke="#D2D2D2" strokeWidth={3} />
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={fx + 40 + i * 30} cy={f2 + fh / 2} r={9} fill="#8A8A8A" />)}
        {/* struck through, by hand */}
        <path d={strike(f1)} fill="none" stroke="#0B0B0B" strokeWidth={12} strokeLinecap="round" />
        <path d={strike(f2)} fill="none" stroke="#0B0B0B" strokeWidth={12} strokeLinecap="round" />
        {/* the one button: open, and you are in */}
        <rect x={fx} y={btnY} width={fw} height={96} rx={48} fill="#0B0B0B" />
        <rect x={fx + 44} y={btnY + 40} width={200} height={16} rx={8} fill="rgba(255,255,255,0.8)" />
        <path d={`M${fx + fw - 92} ${btnY + 48} l18 18 l38 -40`} fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* the way out: dotted, past the fields to the button */}
      <DotPath d={`M${cx + cw + 30} ${f1 + 20} C ${cx + cw + 110} ${f1 + 140}, ${cx + cw + 110} ${btnY - 40}, ${cx + cw + 24} ${btnY + 60}`} gap={24} size={10} color="#0B0B0B" opacity={0.45} />
    </CoverArt>
  );
};
