// V137DagenH: Dagen H, 3 September 1967. One clock and one order: the split-flap clock that stops on 04:50, the two lane
// arrows with the old side struck at 04:50, and the clock rolling on to 05:00 as an arrow sweeps right.
// Phase 2: paper and ink, colour on data only (red the struck lane, the accent 05:00).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';
import {Card, drift, FitText, RollDigits, S} from '../kit/p2';

type P = {
  shot?: 'freeze' | 'swap' | 'go';
  hitAt?: number | string;
  /** the small line over the clock or the photo (a date, never the subtitle's words) */
  label?: string;
};

const W = S.right - S.left;
const CARD_H = 400;
const CARD_Y = 640;
const DIGITS = 230;

/** The split-flap clock: a white card, the digits big, the flap's hinge across the middle. */
const Clock: React.FC<{text: string; next?: string; at: number; y: number; jolt: number; accent?: boolean}> = ({text, next, at, y, jolt, accent}) => {
  const frame = useCurrentFrame();
  const rolled = next !== undefined && frame >= at;
  return (
    <Card x={S.left} y={y} w={W} h={CARD_H} style={{transform: `translateY(${(jolt * 14).toFixed(2)}px) rotate(${(jolt * -0.8).toFixed(3)}deg)`}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: CARD_H / 2 - 3, height: 6, backgroundColor: C.bg}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: (CARD_H - DIGITS * 1.08) / 2, display: 'flex', justifyContent: 'center'}}>
        {rolled ? <RollDigits text={next ?? text} at={at} dur={12} size={DIGITS} t={accent ? 'accent' : 'ink'} /> : <RollDigits text={text} at={0} size={DIGITS} t="ink" settled />}
      </div>
    </Card>
  );
};

/** The lane arrow, drawn in ink: a thick shaft and its head, pointing up the street (dir -1 the left lane, 1 the right). */
const Lane: React.FC<{x: number; y: number; h: number; draw: number; dim?: number; color: string}> = ({x, y, h, draw, dim = 1, color}) => {
  const len = h * draw;
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: dim}}>
      <path d={`M ${x} ${y + h} L ${x} ${y + h - len}`} stroke={color} strokeWidth={22} strokeLinecap="round" fill="none" />
      {draw > 0.85 ? <path d={`M ${x - 52} ${y + 62} L ${x} ${y} L ${x + 52} ${y + 62}`} stroke={color} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
    </svg>
  );
};

/** 04:50: the clock stops, the card jolts with the handbrake, a mark lands under the time. */
const Freeze: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const hit = Math.max(lead(ctx) + 8, cueFrame(ctx, p.hitAt ?? '0.5s'));
  const enter = spr(frame, base, 'enter');
  const jolt = Math.max(0, 1 - Math.abs(frame - hit) / 6) * (frame >= hit ? 1 : 0.4);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <FitText text={p.label ?? '3 სექტემბერი, 1967'} x={S.left} y={S.top + 40} w={W} size={72} min={44} maxLines={1} weight={700} at={base + 4} />
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter * 1.4), transform: `translateY(${((1 - enter) * 50).toFixed(2)}px)`}}>
        <Clock text="04:50" at={0} y={CARD_Y} jolt={jolt} />
      </div>
      <Ink marks={[{kind: 'underline', box: {x: S.left + 90, y: CARD_Y + 40, w: W - 180, h: CARD_H - 80}, at: hit + 4}]} end={ctx.dur} />
      <Sfx name="asmr-flap" at={Math.max(lead(ctx), base)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </div>
  );
};

/** The order of the morning on paper: two lane arrows side by side under the clock chip, the left one (the old side) is
 *  struck in red on the key word, then the right one draws itself up in ink. */
const Swap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const hit = Math.max(base + 16, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const enter = spr(frame, base, 'enter');
  const y0 = 640;
  const h = 620;
  const lx = S.left + W * 0.28;
  const rx = S.left + W * 0.72;
  const drawR = prog(frame, hit + 14, 16, ease.enter);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: y0 + h / 2})}}>
      <div style={{position: 'absolute', left: S.left, top: S.top + 20, opacity: prog(frame, base + 2, 8)}}>
        <RollDigits text="04:50" at={0} size={120} t="ink" settled />
      </div>
      <Card x={S.left} y={y0 - 60} w={W} h={h + 120} style={{opacity: Math.min(1, enter * 1.4), transform: `translateY(${((1 - enter) * 40).toFixed(2)}px)`}} />
      <div style={{position: 'absolute', left: S.cx - 3, top: y0 - 20, width: 6, height: h + 40, backgroundColor: C.rule, opacity: enter}} />
      <Lane x={lx} y={y0 + 20} h={h - 60} draw={prog(frame, base + 4, 12, ease.enter)} color={C.ink} />
      <Lane x={rx} y={y0 + 20} h={h - 60} draw={drawR} color={C.ink} />
      <Ink marks={[{kind: 'strike', box: {x: lx - 90, y: y0 + 60, w: 180, h: h - 140}, at: hit}]} end={ctx.dur} />
      <Land at={hit + 28} />
      <Haptic kind="medium" at={hit + 29} volume={0.3} />
    </div>
  );
};

/** 05:00: the clock rolls on from 04:59, the time lands in the film's accent and a big ink arrow sweeps to the right. */
const Go: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? 1));
  const enter = spr(frame, base, 'enter');
  const sweep = prog(frame, hit + 10, 16, ease.enter);
  const ax = S.left + 80;
  const aw = (W - 160) * sweep;
  const ay = CARD_Y + CARD_H + 150;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <FitText text={p.label ?? '3 სექტემბერი, 1967'} x={S.left} y={S.top + 40} w={W} size={72} min={44} maxLines={1} weight={700} at={base + 4} />
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter * 1.4), transform: `translateY(${((1 - enter) * 50).toFixed(2)}px)`}}>
        <Clock text="04:59" next="05:00" at={hit} y={CARD_Y} jolt={0} accent />
      </div>
      <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={`M ${ax} ${ay} L ${ax + aw} ${ay}`} stroke={C.ink} strokeWidth={22} strokeLinecap="round" fill="none" />
        {sweep > 0.9 ? <path d={`M ${ax + aw - 64} ${ay - 56} L ${ax + aw} ${ay} L ${ax + aw - 64} ${ay + 56}`} stroke={C.ink} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
      </svg>
      <Sfx name="asmr-flap-roll" at={hit} volume={0.34} />
      <Land at={hit + 16} />
      <Haptic kind="success" at={hit + 17} volume={0.3} />
    </div>
  );
};

export const V137DagenH: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'swap' ? <Swap p={p} ctx={ctx} /> : p.shot === 'go' ? <Go p={p} ctx={ctx} /> : <Freeze p={p} ctx={ctx} />;
