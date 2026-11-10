// The palm-scanner parody's cover A (cover.art, white): the refusal. A small scene, refined and flat like the v140/v142/v144
// covers: a countertop payment terminal turned a little, the palm on its screen with its lines and the refusal ring, the
// keypad under it, and the scanner's dotted waves over it. No fake depth, no shadow, no reflection.
import React, {useId} from 'react';
import {CoverArt, DotPath, Mark, type CoverP} from '../kit/cover';

// the palm (a white silhouette) and its three lines, drawn round (0, 0)
const Palm: React.FC = () => (
  <g>
    <g fill="#FFFFFF">
      <rect x={-56} y={-12} width={116} height={108} rx={46} />
      <rect x={-56} y={-92} width={25} height={98} rx={12.5} />
      <rect x={-26} y={-110} width={26} height={116} rx={13} />
      <rect x={5} y={-102} width={25} height={108} rx={12.5} />
      <rect x={35} y={-74} width={22} height={84} rx={11} />
      <rect x={-88} y={8} width={26} height={88} rx={13} transform="rotate(-36 -75 52)" />
    </g>
    <g fill="none" stroke="#9A9A9A" strokeWidth={4} strokeLinecap="round">
      <path d="M-44 14 Q0 2 50 20" />
      <path d="M-46 36 Q-6 32 34 48" />
      <path d="M-30 -2 Q-48 44 -14 86" />
    </g>
  </g>
);

export const PromoPalmTerminalCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const uid = useId().replace(/:/g, '');
  const w = 330, h = 580, x = 540 - w / 2, y = 215;
  const kw = 78, kh = 40, kx0 = x + 30, ky0 = y + 330;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  return (
    <CoverArt p={p}>
      <g transform="translate(540 500) scale(1.2) translate(-540 -500)">
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E2E2E" />
          <stop offset="1" stopColor="#0C0C0C" />
        </linearGradient>
      </defs>
      {/* the scanner's waves over the screen */}
      {[0, 1, 2].map((i) => (
        <DotPath key={i} d={`M${540 - 90 - i * 40} ${y - 26 - i * 22} Q540 ${y - 92 - i * 34} ${540 + 90 + i * 40} ${y - 26 - i * 22}`} gap={20} size={9} opacity={0.5 - i * 0.12} />
      ))}
      <g transform={`rotate(-6 540 ${y + h / 2})`}>
        <rect x={x} y={y} width={w} height={h} rx={48} fill={`url(#b${uid})`} />
        <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={45} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
        {/* the screen */}
        <rect x={x + 24} y={y + 26} width={w - 48} height={278} rx={28} fill="#050505" />
        <Mark x={x + 46} y={y + 62} size={17} color="#7A7A7A">PALM ID</Mark>
        <circle cx={x + w - 50} cy={y + 56} r={6} fill="#FFFFFF" opacity={0.85} />
        <g transform={`translate(${540 - 6} ${y + 186}) scale(0.82)`}>
          <Palm />
        </g>
        {/* the scan line across the palm */}
        <line x1={x + 44} x2={x + w - 44} y1={y + 168} y2={y + 168} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="10 8" opacity={0.55} />
        {/* the refusal */}
        <circle cx={x + w - 76} cy={y + 248} r={30} fill="#FFFFFF" />
        <path d={`M${x + w - 87} ${y + 237} l22 22 M${x + w - 65} ${y + 237} l-22 22`} stroke="#0B0B0B" strokeWidth={8} strokeLinecap="round" />
        {/* the keypad */}
        {keys.map((k, i) => {
          const kx = kx0 + (i % 3) * (kw + 18), ky = ky0 + Math.floor(i / 3) * (kh + 16);
          return (
            <g key={k}>
              <rect x={kx} y={ky} width={kw} height={kh} rx={14} fill="#2A2A2A" />
              <Mark x={kx + kw / 2} y={ky + 28} size={19} anchor="middle" color="#B5B5B5">{k}</Mark>
            </g>
          );
        })}
      </g>
      </g>
    </CoverArt>
  );
};
