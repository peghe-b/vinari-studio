// The OBD 3D promo's cover B (cover.art, white): what the engine computer keeps after a wipe. ONE idea: its eight
// self-checks as eight solid tiles on a glossy floor, three done (black, a white tick), five still waiting (light, a
// thin ring).
import React from 'react';
import {Block, CoverArt, Floor, Halo, Mirror, Spot, type CoverP} from '../kit/cover';

export const PromoObdTilesCover: React.FC<{p: CoverP; ctx?: unknown}> = ({p}) => {
  const H = p.artH ?? 880;
  const s = 170, gap = 34, cols = 4;
  const x0 = 540 - (cols * s + (cols - 1) * gap) / 2 - 14, y0 = 120;
  const tile = (i: number, mirror = false) => {
    const cx = x0 + (i % cols) * (s + gap), cy = y0 + Math.floor(i / cols) * (s + gap);
    const done = i < 3;
    return (
      <Block key={`${mirror ? 'm' : 't'}${i}`} x={cx} y={cy} w={s} h={s} d={30} r={40} tone={done ? 0.93 : 0.06} gloss={mirror ? 0 : 0.5} stroke={2}>
        {done ? (
          <path d={`M${s * 0.3} ${s * 0.52} l${s * 0.14} ${s * 0.14} l${s * 0.28} -${s * 0.3}`} fill="none" stroke="#FFFFFF" strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <circle cx={s / 2} cy={s / 2} r={s * 0.2} fill="none" stroke="#B9B9B9" strokeWidth={9} strokeDasharray="10 12" />
        )}
      </Block>
    );
  };
  const rowY = y0 + 2 * s + gap;
  return (
    <CoverArt p={p}>
      <Halo cx={540} cy={y0 + s + gap / 2} r={430} />
      <Spot cx={540} cy={H * 0.42} r={640} k={1.1} />
      <Floor cx={540} y={rowY + 46} rx={420} k={0.85} />
      <Mirror y={rowY + 44} depth={160} k={0.6}>{[4, 5, 6, 7].map((i) => tile(i, true))}</Mirror>
      {Array.from({length: 8}, (_, i) => tile(i))}
    </CoverArt>
  );
};
