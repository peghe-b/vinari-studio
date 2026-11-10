// The palm-scanner parody's cover A (cover.art, white): the refusal. ONE flat object: a countertop payment terminal, a palm
// on its screen with the refusal cross over it and the keypad under it.
import React from 'react';
import {Block, CoverArt, Mark, type CoverP} from '../kit/cover';

const Palm: React.FC<{fill: string}> = ({fill}) => (
  <g fill={fill}>
    <rect x={-60} y={-14} width={124} height={116} rx={50} />
    <rect x={-60} y={-98} width={27} height={104} rx={13.5} />
    <rect x={-28} y={-118} width={28} height={124} rx={14} />
    <rect x={5} y={-110} width={27} height={116} rx={13.5} />
    <rect x={37} y={-80} width={24} height={90} rx={12} />
    <rect x={-94} y={8} width={28} height={96} rx={14} transform="rotate(-36 -80 56)" />
  </g>
);

export const PromoPalmTerminalCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const w = 400, h = 660, x = 540 - w / 2 - 14, y = 30;
  const kw = (w - 68 - 32) / 3;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const face = (
    <g>
      <rect x={34} y={40} width={w - 68} height={318} rx={30} fill="#0C0C0C" />
      <Mark x={62} y={84} size={22} color="#8A8A8A">PALM ID</Mark>
      <g transform={`translate(${w / 2 - 8} 226) scale(0.92)`}>
        <Palm fill="#FFFFFF" />
      </g>
      {/* the refusal: a white disc with a black cross, over the palm's heel */}
      <circle cx={w / 2 + 70} cy={296} r={44} fill="#FFFFFF" stroke="#0C0C0C" strokeWidth={8} />
      <path d={`M${w / 2 + 54} 280 L${w / 2 + 86} 312 M${w / 2 + 86} 280 L${w / 2 + 54} 312`} stroke="#0B0B0B" strokeWidth={11} strokeLinecap="round" />
      {keys.map((k, i) => {
        const kx = 34 + (i % 3) * (kw + 16), ky = 384 + Math.floor(i / 3) * 62;
        return (
          <g key={k}>
            <rect x={kx} y={ky} width={kw} height={48} rx={16} fill="#2A2A2A" />
            <Mark x={kx + kw / 2} y={ky + 33} size={24} anchor="middle" color="#BDBDBD">{k}</Mark>
          </g>
        );
      })}
    </g>
  );
  return (
    <CoverArt p={p}>
      {/* flat now, no floor or reflection under it: the object itself takes the room (the owner: big, one idea) */}
      <g transform="translate(540 0) scale(1.3) translate(-540 0)">
      <Block x={x} y={y} w={w} h={h} r={60} tone={0.92} stroke={2}>{face}</Block>
      </g>
    </CoverArt>
  );
};
