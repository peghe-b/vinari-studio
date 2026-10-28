import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {clockText, RACE_CX, RACE_LABEL_W, RACE_R, raceLap, raceTime} from '../lib/r3.mjs';
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

const R = RACE_R;
const CX = RACE_CX; // the clocks and their outer ticks end at stage x 891 (src/lib/r3.mjs): TikTok's buttons cover nothing of them
const LW = RACE_LABEL_W;
const CY = 870;
const STROKE = 18;
const FAST_F = 20; // frames the fast clock runs
const SLOW_F = 46; // frames the rest of the slow one runs after it

// TimeRace (r3): two ways to the same thing, timed on ONE shared clock, so the picture never lies about the gap. Both
// clocks start together; the fast one runs its arc and stops with a tick while the slow one keeps going, lap after lap (one
// lap is one round unit, src/lib/r3.mjs raceLap: a minute, five, an hour...; at most 4 laps), its readout counting real
// times. The clock speeds up once the fast one is done (the readouts show it: each frame a real time on both). Arcs on
// BEZ.data, the fast one ink with its tick, the slow one in the cost colour; nothing in TikTok's column. Each face has its
// 12 lap ticks and a start mark, and an arc ends square on a radial tick (the review of 08a2624: a 2-minute arc of a 1-hour
// lap drew as a round-capped 12-degree blob, a glitch; it now reads as a measured segment of a clock face). Earlier laps
// are counted in ink (×2), never a tinted ring (the pink third tone).
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
  const labelY = CY - R - 48 - Math.max(fitHeight(fast.label, LW, 52, 2, 700, false, 1.04, 36), fitHeight(slow.label, LW, 52, 2, 700, false, 1.04, 36));
  const lanes = [
    {lane: fast, t: Math.min(T, fast.secs), col: tone('ink'), done: fastDone},
    {lane: slow, t: Math.min(T, slow.secs), col: tone('red'), done: slowDone},
  ];
  const shownY = CY + R + 44;
  const fastShownH = fitHeight(fast.shown, LW, 64, 1, 700);
  const fastShownW = Math.min(LW, textW(fast.shown, 64, {weight: 700, mtav: true}));
  const O = R + STROKE / 2; // the ring's outer edge
  const radial = (cx: number, a: number, r0: number, r1: number) => ({x1: cx + Math.cos(a) * r0, y1: CY + Math.sin(a) * r0, x2: cx + Math.cos(a) * r1, y2: CY + Math.sin(a) * r1});
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
              {/* the face: 12 lap ticks outside the ring, the start mark at 12 o'clock */}
              {Array.from({length: 12}, (_, h) => (
                <line key={h} {...radial(CX[i], -Math.PI / 2 + (h * Math.PI) / 6, O + 4, O + (h % 3 === 0 ? 14 : 9))} stroke={C.ink2} strokeWidth={h === 0 ? 4 : 2} strokeLinecap="butt" />
              ))}
              {t > 0 ? (
                <circle cx={CX[i]} cy={CY} r={R} fill="none" stroke={col} strokeWidth={STROKE} strokeLinecap="butt" strokeDasharray={`${arc.toFixed(2)} ${(c + 2).toFixed(2)}`} transform={`rotate(-90 ${CX[i]} ${CY})`} />
              ) : null}
              {/* where the time has got to: a square radial tick across the ring */}
              <line {...radial(CX[i], ang, R - STROKE / 2 - 8, O + 14)} stroke={t > 0 ? col : C.ink2} strokeWidth={6} strokeLinecap="butt" />
            </g>
          );
        })}
      </svg>
      {lanes.map(({lane, t, col, done}, i) => {
        const laps = Math.floor(t / lap + 1e-9);
        const lapOn = i === 1 && laps >= 1;
        return (
          <React.Fragment key={i}>
            <FitText text={lane.label} x={CX[i]} y={labelY} w={LW} size={52} min={36} maxLines={2} weight={700} align="center" at={base + 4 + i * 3} />
            <div className={TXT} style={{position: 'absolute', left: CX[i] - R + 20, width: 2 * R - 40, top: CY - 34, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 56, lineHeight: '64px', color: frame >= at ? col : C.ink2, fontFeatureSettings: '"tnum" 1, "lnum" 1', whiteSpace: 'nowrap', opacity: prog(frame, base + 6, 8)}}>
              {clockText(t, lap)}
            </div>
            {lapOn ? (
              <div className={TXT} style={{position: 'absolute', left: CX[i] - 60, width: 120, top: CY + 38, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 36, lineHeight: '42px', color: C.ink, fontFeatureSettings: '"tnum" 1'}}>
                {`×${laps}`}
              </div>
            ) : null}
            {done ? <FitText text={lane.shown} x={CX[i]} y={shownY} w={LW} size={64} min={40} maxLines={1} weight={700} align="center" t={i === 0 ? 'ink' : 'red'} at={i === 0 ? at + FAST_F : at + FAST_F + 6 + SLOW_F} anim="slam" /> : null}
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
