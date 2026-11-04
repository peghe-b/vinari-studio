// v142-windy-night's cover (cover.art): the night the wind broke a branch onto the jeep. ONE premium picture: the
// windshield seen close from the hood, dark glass with the street's reflections running across it, a broken branch lying
// over it as a solid shape, and behind the glass in its corner the printed QR card, the only white thing, lit by the
// street lamp. Black and white only.
import React, {useId} from 'react';
import {Qr, Spot, CoverArt, type CoverP} from '../kit/cover';

export const V142WindyNightCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const H = p.artH ?? 880;
  // the glass: from the A-pillar on the left edge to past the right edge, the dash line at its foot
  const gTop = 40, gBot = H - 70;
  const glass = `M-20 ${gTop + 120} Q 120 ${gTop - 10} 420 ${gTop} L1120 ${gTop + 30} L1120 ${gBot} L-20 ${gBot} Z`;
  // the card behind the glass, standing a little turned
  const cw = 340, ch = 430, cx = 640, cy = gBot - ch - 36;
  // the branch: a tapering limb from off the top left, across the glass, snapped short of the card
  const limb = 'M-60 110 C 120 150, 280 230, 470 330 C 520 356, 560 380, 600 398';
  const twig = (d: string, k: number) => <path key={d} d={d} fill="none" stroke="#3E3E3E" strokeWidth={k * 1.4} strokeLinecap="round" />;
  const leaf = (x: number, y: number, r: number, s: number) => (
    <g key={`${x}.${y}`} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C 18 -24, 58 -26, 84 0 C 58 26, 18 24, 0 0 Z" fill={`url(#lf${uid})`} />
      <path d="M4 0 L76 0" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
  return (
    <CoverArt p={p}>
      <defs>
        <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#1C1C1C" />
          <stop offset="1" stopColor="#060606" />
        </linearGradient>
        <linearGradient id={`rf${uid}`} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.045} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`lf${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5A5A5A" />
          <stop offset="1" stopColor="#2A2A2A" />
        </linearGradient>
        <linearGradient id={`cd${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D8D8D8" />
        </linearGradient>
        <clipPath id={`gc${uid}`}>
          <path d={glass} />
        </clipPath>
        <filter id={`bl${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      {/* the glass and what is behind it */}
      <path d={glass} fill={`url(#gl${uid})`} />
      <g clipPath={`url(#gc${uid})`}>
        <Spot cx={cx + cw / 2 + 60} cy={cy + 40} r={420} k={1.2} />
        {/* the card: paper, standing on the dash, a soft shadow behind it */}
        <rect x={cx + 18} y={cy + 24} width={cw} height={ch} rx={16} fill="rgba(0,0,0,0.7)" filter={`url(#bl${uid})`} />
        <g transform={`rotate(-4 ${cx + cw / 2} ${cy + ch / 2})`}>
          <rect x={cx} y={cy} width={cw} height={ch} rx={16} fill={`url(#cd${uid})`} />
          <Qr x={cx + 40} y={cy + 40} s={cw - 80} seed={142} />
          <rect x={cx + 40} y={cy + cw + 6} width={cw - 80} height={12} rx={6} fill="rgba(11,11,11,0.55)" />
          <rect x={cx + 40} y={cy + cw + 30} width={(cw - 80) * 0.55} height={12} rx={6} fill="rgba(11,11,11,0.3)" />
        </g>
        {/* the street's reflections running across the glass */}
        <path d={`M-40 ${gTop + 260} L1120 ${gTop + 60} L1120 ${gTop + 150} L-40 ${gTop + 400} Z`} fill={`url(#rf${uid})`} />
        <path d={`M-40 ${gTop + 520} L1120 ${gTop + 330} L1120 ${gTop + 370} L-40 ${gTop + 580} Z`} fill={`url(#rf${uid})`} />
      </g>
      {/* the frame of the glass: the pillar's edge and the dash line */}
      <path d={`M-20 ${gTop + 120} Q 120 ${gTop - 10} 420 ${gTop} L1120 ${gTop + 30}`} fill="none" stroke="#4A4A4A" strokeWidth={10} strokeLinecap="round" />
      <path d={`M-20 ${gBot} L1120 ${gBot}`} stroke="#3A3A3A" strokeWidth={14} />
      <path d={`M-20 ${gBot + 18} Q 540 ${gBot + 60} 1120 ${gBot + 18}`} fill="none" stroke="#262626" strokeWidth={6} />
      {/* the branch on the glass: its shadow, then the solid limb, the twigs and the leaves, the snapped end */}
      <path d={limb} fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth={34} strokeLinecap="round" transform="translate(14 22)" filter={`url(#bl${uid})`} />
      <path d={limb} fill="none" stroke="#454545" strokeWidth={40} strokeLinecap="round" />
      <path d={limb} fill="none" stroke="#6E6E6E" strokeWidth={10} strokeLinecap="round" transform="translate(-5 -12)" />
      {twig('M190 172 C 220 110, 250 70, 300 30', 12)}
      {twig('M360 268 C 390 330, 380 390, 350 450', 11)}
      {twig('M470 330 C 520 280, 580 260, 640 250', 10)}
      {leaf(300, 30, -60, 1.1)}
      {leaf(262, 64, -110, 0.95)}
      {leaf(350, 450, 110, 1.05)}
      {leaf(376, 400, 40, 0.9)}
      {leaf(640, 250, -20, 1.1)}
      {leaf(590, 262, -150, 0.9)}
      {leaf(120, 150, 150, 0.9)}
      <path d="M596 384 L626 380 M600 398 L630 404 M598 410 L620 428" stroke="#5E5E5E" strokeWidth={7} strokeLinecap="round" />
    </CoverArt>
  );
};
