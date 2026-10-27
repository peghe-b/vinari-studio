import React from 'react';
import {interpolateColors, useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {groupNum, stakeSteps} from '../lib/r3.mjs';
import {fitLines, sizeFor, textW} from '../lib/textfit.mjs';
import {mtav} from '../lib/format';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {drift, FitText, hair, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Step = {
  /** the running total after this step (a real figure: the film's own story or its source) */
  value: number;
  /** why it went up (3 words at most: „ისევ ნათურა", „ხელოსანი") */
  note: string;
  /** the chunk the step lands on (default: evenly spaced) */
  at?: number | string;
};
type P = {
  /** what is counted (3 words at most: „დაკარგული ფული", „უცნობი ზარი") */
  label: string;
  /** the unit after the number („₾", „ზარი", „წუთი") */
  unit?: string;
  /** the count before the first step: what frame 0 shows (default 0) */
  from?: number;
  /** 2 to 5 steps (tools/ci/p2lint.mjs STAKE_STEPS) */
  steps: Step[];
  /** the payoff: the count is struck and this lands („0 ₾", „ჩუმად"; 3 words) */
  resolve?: {text: string; at?: number | string};
  /** the count's colour: red (default: it costs the viewer) or the film's data accent */
  t?: P2Tone;
  /** whose figure it is when it is not the film's own story */
  source?: string;
};

const ROW_H = 104;
const DELTA_W = 250;

// StakeCounter (r3; the craft audit's open loop, kit 2; the treatment's hookType "StakeCounter" had no scene of its own): a
// running cost or count that only grows while the problem lives, every step a real total with its reason stacked under it,
// worse three times, and at the payoff the count goes grey, a strike crosses it and the answer lands where the reasons were.
// Every frame shows a real whole number (no digit spin): the count runs from the last total to the next on BEZ.data.
export const StakeCounter: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const steps = stakeSteps(p.steps ?? []).slice(0, 5);
  const n = steps.length;
  const from = Number.isFinite(p.from) ? Number(p.from) : 0;
  const per = Math.min(40, Math.max(20, Math.floor((ctx.dur - (p.resolve ? 50 : 20)) / Math.max(1, n))));
  const first = Math.max(base + 16, ctx.index === 0 ? 12 : 8);
  const at = steps.map((s, i) => (s.at !== undefined ? cueFrame(ctx, s.at) : first + i * per));
  const resAt = p.resolve ? (p.resolve.at !== undefined ? cueFrame(ctx, p.resolve.at) : (at[n - 1] ?? first) + per + 6) : Infinity;
  // the running total: from the last landed value to this step's, over 14 frames
  const values = [from, ...steps.map((s) => s.value)];
  let v = from;
  for (let i = 0; i < n; i++) if (frame >= at[i]) v = Math.round(values[i] + (values[i + 1] - values[i]) * ease.data(Math.min(1, (frame - at[i]) / 14)));
  const unit = p.unit ? ` ${p.unit}` : '';
  const widest = `${groupNum(Math.max(...values.map((x) => Math.abs(x))))}${unit}`;
  const size = sizeFor(widest, S.right - S.left, 230, {weight: 700});
  const numH = Math.round(size * 1.06);
  // the count stands in the middle of the stage until the first step, then rises to make room for the reasons
  const rise = n ? prog(frame, at[0] - 6, 12, ease.whipOut) : 0;
  const numY = S.cy - numH / 2 + 40 + (S.top + 78 - (S.cy - numH / 2 + 40)) * rise;
  const rowsY = S.top + 78 + numH + 56;
  const col = tone(p.t ?? 'red');
  const grey = prog(frame, resAt, 6);
  const numCol = interpolateColors(grey, [0, 1], [col, C.ink2]);
  const text = `${groupNum(v)}${unit}`;
  const tw = textW(text, size, {weight: 700});
  const kick = at.reduce((k, f) => (frame >= f && frame < f + 12 ? spr(frame, f, 'punch') : k), 1);
  const rowsOut = 1 - prog(frame, resAt + 8, 8, ease.exit);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: numY + numH / 2})}}>
      <FitText text={p.label} x={S.left} y={numY - 70} w={S.right - S.left} size={56} min={36} maxLines={1} weight={600} t="quiet" at={base + 2} anim="none" />
      <div
        className={TXT}
        style={{position: 'absolute', left: S.left, top: numY, fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: `${numH}px`, color: numCol, whiteSpace: 'pre', fontFeatureSettings: '"tnum" 1, "lnum" 1', letterSpacing: '-0.02em', transform: `scale(${(1.06 - 0.06 * Math.min(1.06, kick)).toFixed(4)})`, transformOrigin: 'left center'}}
      >
        {text}
      </div>
      {/* the reasons, stacked under the count: the step's own increase and why */}
      {steps.map((s, i) => {
        // a row waits for the count's rise to end (the first one 6 frames after its step): it never slides under the moving count
        const r0 = i === 0 ? at[i] + 6 : at[i] - 2;
        const on = prog(frame, r0, 9, ease.enter);
        if (frame < r0) return null;
        const y = rowsY + i * ROW_H;
        const d = values[i + 1] - values[i];
        const nf = fitLines(s.note, S.right - S.left - DELTA_W - 24, 1, 56, {weight: 600, mtav: true, min: 36});
        return (
          <div key={i} style={{position: 'absolute', left: S.left, top: y, width: S.right - S.left, height: ROW_H, opacity: on * rowsOut, transform: `translateY(${(1 - on) * 24}px)`}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 0, borderTop: `3px solid ${hair()}`}} />
            <div className={TXT} style={{position: 'absolute', left: 0, width: DELTA_W - 24, top: 18, textAlign: 'left', fontFamily: F.sans, fontWeight: 700, fontSize: 60, lineHeight: '68px', color: col, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum" 1'}}>
              {`${d >= 0 ? '+' : '-'}${groupNum(Math.abs(d))}`}
            </div>
            <div className={TXT} style={{position: 'absolute', left: DELTA_W, top: 22, fontFamily: F.sans, fontWeight: 600, fontSize: nf.size, lineHeight: '64px', color: C.ink, whiteSpace: 'nowrap'}}>
              {mtav(nf.lines[0] ?? '')}
            </div>
          </div>
        );
      })}
      {p.resolve ? (
        <>
          <Ink marks={[{kind: 'strike', box: {x: S.left, y: numY + numH * 0.12, w: Math.min(S.right - S.left - 40, tw), h: numH * 0.7}, at: resAt + 4}]} end={ctx.dur} />
          <FitText text={p.resolve.text} x={S.left} y={rowsY + 30} w={S.right - S.left} size={170} min={64} maxLines={2} weight={700} at={resAt + 16} anim="slam" />
          <Sfx name="app-landed" at={resAt + 16} volume={0.34} /* event: the answer lands */ />
        </>
      ) : null}
      {at.map((f, i) => (
        <Sfx key={i} name="asmr-ui-tick" at={f} volume={0.32} /* event: the count steps up */ />
      ))}
      {p.source ? <FitText text={p.source} x={S.left} y={Math.min(S.bottom - 46, rowsY + n * ROW_H + 24)} w={S.right - S.left} size={34} min={30} maxLines={1} weight={500} t="quiet" at={at[n - 1] ?? base} anim="none" style={{opacity: rowsOut}} /> : null}
    </div>
  );
};
