import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {drift, FitText, Quiet, RollDigits, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** how many of the 100 */
  n: number;
  /** what the filled dots are (3 words at most) */
  label: string;
  /** whose figure it is: REQUIRED (tools/ci/p2lint.mjs UNIT_SOURCE) */
  source: string;
  /** the filled dots' colour: red a cost (default), green a gain, accent the film's data accent */
  t?: P2Tone;
  /** the chunk the dots start filling on */
  at?: number;
};

// UnitGrid (phase 2): "N out of 100" as ten rows of ten dots. The number rolls (one glyph a cell), the dots fill row by row
// on BEZ.data, the filled block gets a bracket. A source is required: a number without whose figure it is never shows.
export const UnitGrid: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const n = Math.max(0, Math.min(100, Math.round(p.n)));
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(0, base) + 12;
  const gy = S.top + 300;
  // ten rows fit between the label and the stage's foot, with the source line under them
  const cell = Math.min(74, Math.floor((S.bottom - 70 - (gy + 40)) / 10));
  const r = cell * 0.4;
  const gx = S.cx - (cell * 10) / 2;
  const fillDur = 26;
  const filled = Math.round(n * ease.data(Math.min(1, Math.max(0, (frame - at) / fillDur))));
  const col = tone(p.t ?? 'red');
  const rows = Math.ceil(n / 10);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: gy + 200})}}>
      <div style={{position: 'absolute', left: S.left, top: S.top + 10}}>
        <RollDigits text={String(n)} at={at} size={200} t={p.t ?? 'red'} dur={fillDur} />
        <span className="vn-t" style={{fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 600, fontSize: 72, color: C.ink2, marginLeft: 16}}>/100</span>
      </div>
      <FitText text={p.label} x={S.left} y={S.top + 236} w={S.right - S.left} size={52} min={36} maxLines={1} weight={600} at={at + 6} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {Array.from({length: 100}, (_, i) => {
          const cx = gx + (i % 10) * cell + cell / 2;
          const cy = gy + 40 + Math.floor(i / 10) * cell + cell / 2;
          const on = i < filled;
          const pop = on ? spr(frame, at + (i / Math.max(1, n)) * fillDur, 'punch') : 0;
          return <circle key={i} cx={cx} cy={cy} r={r * (on ? 0.85 + 0.15 * Math.min(1, pop) : 0.62)} fill={on ? col : 'none'} stroke={on ? 'none' : C.rule} strokeWidth={4} opacity={prog(frame, base + (i % 10), 8)} />;
        })}
      </svg>
      {n > 0 ? <Ink marks={[{kind: 'bracket', box: {x: gx + 6, y: gy + 40 + 6, w: cell * 10 - 12, h: rows * cell - 12}, at: at + fillDur + 4}]} end={ctx.dur} /> : null}
      <Quiet text={p.source} x={S.left} y={gy + 40 + cell * 10 + 18} w={S.right - S.left} at={at + fillDur} />
      <Sfx name="asmr-count-roll" at={at} volume={0.36} /* event: the dots start filling */ />
    </div>
  );
};
