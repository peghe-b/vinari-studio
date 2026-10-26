// v131-lilo-bag: a Saturday at the Lilo market, in daylight. The bag rips by the stalls and the oranges roll across the
// asphalt; then the hunt between rows of parked cars that never end; the one step on the real parking screen; and the
// payoff: the same man by his own crossover, its lights blinking hello, a new bag whole at his feet.
// Shots: "rip" (the hook), "hunt" (Act 1), "found" (the payoff); the screen step is V131LiloBagStep.
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Car} from '../illo/car';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {acc, far, ground, near} from '../illo/palette';
import {useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'rip' | 'hunt' | 'step' | 'found';
  hitAt?: number | string;
  line?: string;
  src?: string;
  step?: number;
  verb?: string;
  row?: {x?: number; y: number; w?: number; h: number};
};

// the hero: a man doing his mother's Saturday shopping, a bomber jacket and a buzz cut
const ME = {is: 'me' as const, outfit: 'bomber' as const, hair: 'buzz' as const, beard: 'short' as const, extras: ['watch' as const]};

const ORANGES = [
  {dx: -150, dy: -8, r: 26, d: 1.0},
  {dx: 190, dy: 6, r: 24, d: 1.3},
  {dx: -260, dy: 14, r: 22, d: 0.8},
  {dx: 320, dy: -2, r: 25, d: 1.1},
  {dx: 90, dy: 20, r: 23, d: 0.7},
  {dx: -60, dy: 26, r: 21, d: 1.4},
];

/** The market's stalls behind: striped awnings on posts, the sky above them and the asphalt to the frame's foot. */
const Market: React.FC<{y: number; t: number}> = ({y, t}) => {
  const sway = Math.sin(t / 22) * 4;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <rect x={-200} y={TOP} width={1480} height={y - TOP} fill={far(0.15, 'day')} />
      <rect x={-200} y={y} width={1480} height={FOOT - y} fill={ground('day')} />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = -120 + i * 300;
        return (
          <g key={i}>
            <rect x={x + 16} y={y - 330} width={10} height={330} fill={near('day')} />
            <rect x={x + 248} y={y - 330} width={10} height={330} fill={near('day')} />
            <path d={`M ${x} ${y - 350 + sway} L ${x + 274} ${y - 350 + sway} L ${x + 290} ${y - 290} L ${x - 16} ${y - 290} Z`} fill={i % 2 ? far(0.5, 'day') : C.surface} stroke={near('day')} strokeWidth={4} />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <circle key={k} cx={x - 16 + k * 61} cy={y - 290} r={26} fill={i % 2 ? far(0.5, 'day') : C.surface} stroke={near('day')} strokeWidth={4} />
            ))}
            <rect x={x + 10} y={y - 140} width={254} height={70} rx={10} fill={far(0.35, 'day')} />
          </g>
        );
      })}
    </svg>
  );
};

const Orange: React.FC<{x: number; y: number; r: number; spin: number}> = ({x, y, r, spin}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${spin.toFixed(1)})`}>
    <circle r={r} fill={acc('a')} stroke={C.ink} strokeWidth={3} />
    <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.28} fill={C.surface} opacity={0.45} />
    <path d={`M 0 ${-r} L 4 ${-r - 9}`} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
  </g>
);

/** A paper shopping bag: whole (split 0) or torn open, its two halves falling apart (split 1). */
const Bag: React.FC<{x: number; y: number; split: number; fill?: boolean}> = ({x, y, split, fill = false}) => {
  const a = 24 * split;
  const off = 40 * split;
  const half = (side: -1 | 1) => (
    <g transform={`translate(${x + side * off} ${y}) rotate(${side * a})`}>
      <path d={side < 0 ? 'M -70 0 L -76 -190 L 6 -190 L -8 -120 L 10 -60 L -4 0 Z' : 'M -4 0 L 10 -60 L -8 -120 L 6 -190 L 76 -190 L 70 0 Z'} fill={far(0.2, 'day')} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
  return (
    <g className={OBJ}>
      {fill ? (
        <g>
          <Orange x={x - 30} y={y - 196} r={26} spin={10} />
          <Orange x={x + 28} y={y - 204} r={24} spin={-20} />
        </g>
      ) : null}
      {half(-1)}
      {half(1)}
    </g>
  );
};

/** THE HOOK: the bag rips by the stalls, the oranges roll away across the lot. */
const Rip: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = at(p.hitAt, 6);
  const k = E.out(prog(t, hit, 14));
  const roll = prog(t, hit, 40);
  const GY = 1250;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Market y={GY - 120} t={t} />
      </CameraLayer>
      <CameraLayer depth={0.85}>
        <Svg>
          <Car uid={`${uid}c1`} x={160} y={GY - 110} len={420} view="side" body="sedan" paint={2} frame={t} scenery />
          <Car uid={`${uid}c2`} x={930} y={GY - 110} len={420} view="side" body="hatch" paint={3} frame={t} scenery dir={-1} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={420} y={GY} size={560} frame={t} time="day" face="shock" pose="stand" turn={0.5} acts={[{at: hit + 2, pose: 'armsUp', face: 'shock'}, {at: hit + 30, pose: 'handsHead', face: 'worried'}]} />
          <Bag x={600} y={GY} split={k} />
          {ORANGES.map((o, i) => {
            const d = roll * o.d;
            return <Orange key={i} x={600 + o.dx * E.out(Math.min(1, d))} y={GY - 26 + o.dy * k - 60 * Math.sin(Math.PI * Math.min(1, d * 1.6)) * (1 - roll)} r={o.r} spin={o.dx * d * 2} />;
          })}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit + 8} fx="slam" size={96} /> : null}
        </div>
      </Hud>
      <Haptic kind="heavy" at={Math.max(lead(ctx), hit)} volume={0.3} />
    </IlloBand>
  );
};

/** ACT 1: rows of parked cars that never end; he turns one way, then the other, then grabs his head. */
const Hunt: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = at(p.hitAt, 30);
  const rows = [
    {y: 900, len: 250, xs: [60, 260, 460, 660, 860, 1060], paint: 4},
    {y: 1030, len: 330, xs: [-20, 250, 520, 790, 1060], paint: 2},
  ];
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <rect x={-200} y={TOP} width={1480} height={860 - TOP} fill={far(0.15, 'day')} />
          <rect x={-200} y={860} width={1480} height={FOOT - 860} fill={ground('day')} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={-60 + i * 180} y={1300} width={90} height={12} fill={C.surface} opacity={0.8} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={0.8}>
        <Svg>
          {rows.map((r, j) =>
            r.xs.map((x, i) => <Car key={`${j}-${i}`} uid={`${uid}r${j}${i}`} x={x} y={r.y} len={r.len} view="front" body={i % 2 ? 'suv' : 'sedan'} paint={((i + j) % 4) + 1} frame={t} scenery />),
          )}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={`${uid}me`} cast={ME} x={540} y={1250} size={440} frame={t} time="day" face="worried" pose="stand" turn={-0.6} acts={[{at: 18, turn: 0.6, pose: 'stand'}, {at: hit, pose: 'handsHead', face: 'worried', turn: 0.3}]} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <Car uid={`${uid}f0`} x={110} y={1330} len={460} view="front" body="suv" paint={3} frame={t} scenery />
          <Car uid={`${uid}f1`} x={980} y={1330} len={460} view="front" body="sedan" paint={1} frame={t} scenery />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit} fx="slam" size={84} /> : null}
        </div>
      </Hud>
      <Haptic kind="light" at={Math.max(lead(ctx), hit)} volume={0.25} />
    </IlloBand>
  );
};

/** THE PAYOFF: the same man by his own crossover, its lights blink hello, the new bag whole at his feet. */
const Found: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = at(p.hitAt, 20);
  const GY = 1240;
  const on = t >= hit && t < hit + 34 ? 1 : 0;
  const walk = E.out(prog(t, 0, Math.max(1, hit)));
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Market y={GY - 130} t={t} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}hero`} x={640} y={GY} len={600} view="side" body="suv" paint="a" frame={t} dir={-1} lights={{hazard: on, head: on * 0.8}} />
          <Figure uid={`${uid}me`} cast={ME} x={150 + 60 * walk} y={GY + 10} size={500} frame={t} time="day" face="smile" pose={walk < 1 ? 'walk' : 'confident'} turn={0.5} acts={[{at: hit + 4, pose: 'thumbsUp', face: 'smile'}]} />
          <Bag x={330} y={GY + 10} split={0} fill />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit} fx="slam" size={88} /> : null}
        </div>
      </Hud>
      <Sfx name="real-fob-lock" at={Math.max(lead(ctx), hit - 2)} volume={0.35} />
      <Land at={hit} />
    </IlloBand>
  );
};

export const V131LiloBag: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'hunt' ? <Hunt p={p} ctx={ctx} /> : p.shot === 'found' ? <Found p={p} ctx={ctx} /> : <Rip p={p} ctx={ctx} />;
