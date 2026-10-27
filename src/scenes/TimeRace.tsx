import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {clockText, raceLap, raceTime} from '../lib/r3.mjs';
import {textW} from '../lib/textfit.mjs';
import {C, F, isLight} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {drift, fitHeight, FitText, Quiet, S, tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Lane = {
  /** whose time it is (3 words at most: „ხელოსანთან", „ვინარით") */
  label: string;
  /** how long it takes, in seconds (a real figure) */
  secs: number;
  /** the time as said („3 საათი", „2 წუთი"; 2 words) */
  shown: string;
};
type P = {
  title?: string;
  /** the quick way: the left clock, done first (its tick) */
  fast: Lane;
  /** the long way: the right clock, it keeps going (tools/ci/p2lint.mjs RACE_TIME: longer than fast) */
  slow: Lane;
  /** the chunk the clocks start */
  at?: number | string;
  source?: string;
};

const R = 150;
const CX = [340, 740] as const; // the clocks are pictures (no word reaches past stage x 894: the readouts and times sit inside the rings and under them)
const CY = 870;
const STROKE = 18;
const FAST_F = 20; // frames the fast clock runs
const SLOW_F = 46; // frames the rest of the slow one runs after it

// TimeRace (r3): two ways to the same thing, timed on ONE shared clock, so the picture never lies about the gap. Both
// clocks start together; the fast one runs its arc and stops with a tick while the slow one keeps going, lap after lap (one
// lap is one round unit, src/lib/r3.mjs raceLap: a minute, five, an hour...; at most 4 laps), its readout counting real
// times. The clock speeds up once the fast one is done (the readouts show it: each frame a real time on both). Arcs on
// BEZ.data, the fast one ink with its tick, the slow one in the cost colour; nothing in TikTok's column.
export const TimeRace: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const fast = p.fast ?? {label: '', secs: 1, shown: ''};
  const slow = p.slow ?? {label: '', secs: 2, shown: ''};
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(base + 26, 18);
  const lap = raceLap(slow.secs);
  const T = raceTime(frame - at, fast.secs, slow.secs, FAST_F, SLOW_F);
  const fastDone = frame >= at + FAST_F;
  const slowDone = frame >= at + FAST_F + 6 + SLOW_F;
  const on = spr(frame, base, 'enterXL');
  const track = isLight() ? 'rgba(11,11,11,0.10)' : 'rgba(245,245,245,0.16)';
  const labelY = CY - R - 40 - Math.max(fitHeight(fast.label, 340, 52, 2, 700), fitHeight(slow.label, 340, 52, 2, 700));
  const lanes = [
    {lane: fast, t: Math.min(T, fast.secs), col: tone('ink'), done: fastDone},
    {lane: slow, t: Math.min(T, slow.secs), col: tone('red'), done: slowDone},
  ];
  const shownY = CY + R + 44;
  const fastShownH = fitHeight(fast.shown, 340, 64, 1, 700);
  const fastShownW = Math.min(340, textW(fast.shown, 64, {weight: 700, mtav: true}));
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: CY})}}>
      {p.title ? <FitText text={p.title} x={S.left} y={S.top + 10} w={S.right - S.left} size={64} min={40} maxLines={1} weight={700} at={base + 2} /> : null}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        {lanes.map(({t, col}, i) => {
          const turns = t / lap;
          const laps = Math.floor(turns + 1e-9);
          const frac = turns - laps;
          const full = laps >= 1 && frac < 1e-6;
          const c = 2 * Math.PI * R;
          const arc = full ? c : frac * c;
          const ang = -Math.PI / 2 + (full ? 2 * Math.PI : frac * 2 * Math.PI);
          return (
            <g key={i} opacity={Math.min(1, on * 1.3)} transform={`translate(0 ${((1 - on) * 50).toFixed(2)})`}>
              <circle className="vn-obj" cx={CX[i]} cy={CY} r={R} fill="none" stroke={track} strokeWidth={STROKE} />
              {laps >= 1 && !full ? <circle cx={CX[i]} cy={CY} r={R} fill="none" stroke={col} strokeWidth={STROKE} opacity={0.22} /> : null}
              {t > 0 ? (
                <circle cx={CX[i]} cy={CY} r={R} fill="none" stroke={col} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${arc.toFixed(2)} ${(c + 2).toFixed(2)}`} transform={`rotate(-90 ${CX[i]} ${CY})`} />
              ) : null}
              <circle cx={CX[i] + Math.cos(ang) * R} cy={CY + Math.sin(ang) * R} r={t > 0 ? 15 : 11} fill={t > 0 ? col : C.ink2} />
            </g>
          );
        })}
      </svg>
      {lanes.map(({lane, t, col, done}, i) => {
        const laps = Math.floor(t / lap + 1e-9);
        const lapOn = i === 1 && laps >= 1;
        return (
          <React.Fragment key={i}>
            <FitText text={lane.label} x={CX[i]} y={labelY} w={340} size={52} min={36} maxLines={2} weight={700} align="center" at={base + 4 + i * 3} />
            <div className={TXT} style={{position: 'absolute', left: CX[i] - R + 20, width: 2 * R - 40, top: CY - 34, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 56, lineHeight: '64px', color: frame >= at ? col : C.ink2, fontFeatureSettings: '"tnum" 1, "lnum" 1', whiteSpace: 'nowrap', opacity: prog(frame, base + 6, 8)}}>
              {clockText(t, lap)}
            </div>
            {lapOn ? (
              <div className={TXT} style={{position: 'absolute', left: CX[i] - 60, width: 120, top: CY + 38, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 36, lineHeight: '42px', color: C.ink2, fontFeatureSettings: '"tnum" 1'}}>
                {`×${laps}`}
              </div>
            ) : null}
            {done ? <FitText text={lane.shown} x={CX[i]} y={shownY} w={340} size={64} min={40} maxLines={1} weight={700} align="center" t={i === 0 ? 'ink' : 'red'} at={i === 0 ? at + FAST_F : at + FAST_F + 6 + SLOW_F} anim="slam" /> : null}
          </React.Fragment>
        );
      })}
      <Ink marks={[{kind: 'tick', box: {x: CX[0] - fastShownW / 2, y: shownY + 4, w: fastShownW, h: Math.max(40, fastShownH - 8)}, at: at + FAST_F + 6}]} end={ctx.dur} />
      {p.source ? <Quiet text={p.source} x={S.left} y={shownY + 110} w={S.right - S.left} at={at} /> : null}
      <Sfx name="asmr-count-roll" at={at} volume={0.26} /* event: both clocks start */ />
      <Sfx name="asmr-detent" at={at + FAST_F + 6 + SLOW_F} volume={0.34} /* event: the slow clock stops */ />
    </div>
  );
};
