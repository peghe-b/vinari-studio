// The palm-scanner parody's cover B (cover.art): "we do not even ask for your e-mail". ONE object: a big white key cap with
// the @ on it, struck through by one thick black bar that runs past its edges.
import React from 'react';
import {Block, CoverArt, type CoverP} from '../kit/cover';

export const PromoPalmAtCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const s = 540, x = 540 - s / 2 - 18, y = 90;
  const cx = x + s / 2, cy = y + s / 2;
  // the @ in FiraGO (the mono stack's @ is narrow and reads as a Q under the bar)
  const face = (
    <text x={s / 2} y={s / 2 + 128} textAnchor="middle" fontFamily="FiraGO, sans-serif" fontWeight={500} fontSize={400} fill="#0B0B0B">@</text>
  );
  const bar = (dx: number, dy: number) => `M${cx - 330 + dx} ${cy - 250 + dy} L${cx + 330 + dx} ${cy + 250 + dy}`;
  return (
    <CoverArt p={p}>
      {/* flat now, no floor or reflection under it: the object itself takes the room (the owner: big, one idea) */}
      <g transform="translate(540 0) scale(1.22) translate(-540 0)">
      <Block x={x} y={y} w={s} h={s} r={120} tone={0.04} stroke={2}>{face}</Block>
      {/* the strike: a white keyline so it sits on top, then the black bar */}
      <path d={bar(0, 0)} stroke="#FFFFFF" strokeWidth={66} strokeLinecap="round" />
      <path d={bar(0, 0)} stroke="#0B0B0B" strokeWidth={44} strokeLinecap="round" />
      </g>
    </CoverArt>
  );
};
