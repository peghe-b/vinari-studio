// src/scenes/film/V135BerthaRoadHook.tsx: v135-bertha-road's opening pictures. The same poplar road in late light and the
// same three-wheeled Motorwagen as V135BerthaRoad.tsx: the engine coughs and dies mid-road and Bertha rises on the bench
// (the hook); Bertha close, from the waist up (who she is); the car rolling out past the Mannheim stone; the two boys on the
// bench; the car rolling the other way with the low sun behind it.
//   {"type": "Film", "name": "V135BerthaRoadHook", "look": "illustrated", "shot": "stall" | "hat" | "leave" | "boys" |
//    "roll", "place": "<town>", "hitAt": 1}
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {C} from '../../tokens';
import {prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {CameraLayer} from '../../lib/camera';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Smoke} from '../illo/fx';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {acc, accRamp, far, ground} from '../illo/palette';
import {Glow} from '../kit/glow';
import {jolt, useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'stall' | 'hat' | 'leave' | 'boys' | 'roll';
  place?: string; // the town on the roadside stone
  hitAt?: number | string;
};

const TIME = 'day' as const;
const GROUND = 1270; // the road's edge: wheels and feet stand here, well over the subtitle band
// the same people as V135BerthaRoad.tsx
const BERTHA = {is: 'woman', outfit: 'dress', hair: 'bun', age: 'adult', gender: 'f', extras: ['earrings']} as const;
const BOY1 = {is: 'friend', age: 'young', gender: 'm', outfit: 'knit', hair: 'side', beard: 'none'} as const;
const BOY2 = {is: 'friend', age: 'young', gender: 'm', outfit: 'shirt', hair: 'crop', beard: 'none', look: 2} as const;
const POPLARS = [
  [40, 560],
  [250, 620],
  [460, 540],
  [670, 600],
  [880, 570],
  [1090, 610],
] as const;
const SPAN = 1260;

/** the sky in late light, the far fields, the poplar row and the road to the frame's foot (full bleed); `scroll` slides
 *  the poplars (the car rolling), `warm` 0..1 the low sun's glow */
const RoadBack: React.FC<{scroll?: number; warm?: number; sunX?: number}> = ({scroll = 0, warm = 0.3, sunX = 820}) => {
  const sky = ground(TIME);
  const off = ((scroll % SPAN) + SPAN) % SPAN;
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND - TOP} fill={sky} />
          <rect x={-200} y={GROUND - 210} width={1480} height={220} fill={far(0.12, TIME)} />
        </Svg>
        <Glow x={sunX} y={GROUND - 520} r={420} color={C.il0} k={warm} />
        <Svg>
          {[0, 1].map((k) =>
            POPLARS.map(([x, h], i) => {
              const px = x - off + k * SPAN - 100;
              if (px < -160 || px > 1240) return null;
              const topY = GROUND - 120 - h;
              return (
                <g key={`${k}-${i}`}>
                  <rect x={px - 6} y={GROUND - 170} width={12} height={60} fill={far(0.55, TIME)} />
                  <ellipse cx={px} cy={topY + h / 2} rx={58 + (i % 3) * 8} ry={h / 2} fill={far(0.4 + 0.05 * (i % 2), TIME)} />
                </g>
              );
            }),
          )}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND - 4} width={1480} height={FOOT - GROUND + 4} fill={far(0.2, TIME)} />
          <rect x={-200} y={GROUND - 4} width={1480} height={10} fill={far(0.32, TIME)} />
        </Svg>
      </CameraLayer>
    </>
  );
};

/** the Patent-Motorwagen in profile, facing right (as in V135BerthaRoad.tsx): (x, y) = the rear wheel's ground point;
 *  `spin` turns the spokes, `shake` jolts it, `flip` faces it left. Marked OBJ: it stays whole in the frame. */
const Motorwagen: React.FC<{x: number; y: number; s?: number; spin?: number; shake?: number; flip?: boolean}> = ({x, y, s = 1, spin = 0, shake = 0, flip = false}) => {
  const R = 150;
  const r = 92;
  const fx = 420;
  const ink = C.il7;
  const body = accRamp(acc('a'), 3);
  const spokes = (cx: number, cy: number, rr: number, n: number) =>
    Array.from({length: n}, (_, i) => {
      const a = spin + (i * Math.PI * 2) / n;
      return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * (rr - 10)} y2={cy + Math.sin(a) * (rr - 10)} stroke={ink} strokeWidth={4} />;
    });
  return (
    <g className={OBJ} transform={`translate(${x} ${y + shake}) scale(${flip ? -s : s} ${s})`}>
      <path d={`M 0 ${-R} C 120 ${-R - 10}, 260 ${-R - 30}, 330 ${-R - 60} L ${fx} ${-r}`} fill="none" stroke={ink} strokeWidth={12} strokeLinecap="round" />
      <path d={`M ${fx - 30} ${-r - 150} L ${fx} ${-r}`} fill="none" stroke={ink} strokeWidth={10} strokeLinecap="round" />
      <rect x={-120} y={-R - 120} width={150} height={96} rx={10} fill={ink} />
      <ellipse cx={-120} cy={-R - 70} rx={22} ry={70} fill={ink} />
      <rect x={-30} y={-R - 175} width={250} height={58} rx={14} fill={body} />
      <rect x={-30} y={-R - 260} width={30} height={100} rx={8} fill={ink} />
      <rect x={-6} y={-R - 135} width={230} height={22} rx={6} fill={ink} />
      <path d={`M ${fx - 30} ${-r - 150} L 270 ${-R - 230}`} fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" />
      <rect x={250} y={-R - 246} width={56} height={14} rx={7} fill={ink} />
      <rect x={220} y={-R - 64} width={110} height={12} rx={6} fill={ink} />
      <circle cx={0} cy={-R} r={R} fill="none" stroke={ink} strokeWidth={14} />
      {spokes(0, -R, R, 14)}
      <circle cx={0} cy={-R} r={18} fill={ink} />
      <circle cx={fx} cy={-r} r={r} fill="none" stroke={ink} strokeWidth={12} />
      {spokes(fx, -r, r, 10)}
      <circle cx={fx} cy={-r} r={13} fill={ink} />
    </g>
  );
};

/** the head's y for a rider seated on the bench (a bust drawn behind the car, so the bench hides where it ends), for a
 *  car at scale `s` on the ground and a person of standing height `size` */
const seatHead = (s: number, size: number) => GROUND - 325 * s - 0.34 * size;

/** a roadside stone with its town written above it, marked OBJ (it stays whole) */
const Stone: React.FC<{x: number; y: number; name?: string}> = ({x, y, name}) => {
  const label = name ? mtav(name) : '';
  return (
    <g className={OBJ}>
      <path d={`M ${x - 60} ${y} L ${x - 60} ${y - 130} Q ${x - 60} ${y - 190} ${x} ${y - 190} Q ${x + 60} ${y - 190} ${x + 60} ${y - 130} L ${x + 60} ${y} Z`} fill={far(0.62, TIME)} />
      <rect x={x - 40} y={y - 150} width={80} height={10} rx={5} fill={far(0.85, TIME)} />
      {label ? (
        <text className={TXT} x={x} y={y - 222} textAnchor="middle" fontFamily="inherit" fontWeight={700} fontSize={44} fill={C.ink}>
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** HOOK: mid-road, the engine coughs and dies: the smoke thins out, the car jolts and stands, and Bertha rises on the bench */
const Stall: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  // the car rolls until the engine dies, then coasts to a stop in about half a second
  const coast = Math.min(t, hit) + 8 * E.out(prog(t, hit, 16));
  const sh = jolt(t, hit, 10, 12, 2);
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack scroll={coast * 6} warm={0.35} />
      <CameraLayer depth={1}>
        <Svg>
          <g opacity={1 - prog(t, hit, 24)}>
            <Smoke frame={t} x={250} y={GROUND - 270} seed={3} n={9} kind="smoke" rise={1} size={1.2} time={TIME} />
          </g>
          <Figure uid={`${uid}b`} cast={BERTHA} x={520} y={seatHead(1, 430) + sh} size={430} crop="bust" frame={t} time={TIME} pose="sitDrive" face="neutral" turn={0.5} acts={[{at: hit + 4, pose: 'handsHead', face: 'worried', turn: 0.7}]} />
          <Motorwagen x={380} y={GROUND} spin={coast * 0.06} shake={sh} />
        </Svg>
      </CameraLayer>
      <Land at={hit} />
      <Haptic kind="rigid" at={hit} volume={0.3} />
    </IlloBand>
  );
};

/** WHO SHE IS: Bertha from the waist up in three quarters, the sun behind her; on the key moment her chin lifts */
const Hat: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 20));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.5} sunX={820} />
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={`${uid}b`} cast={BERTHA} x={470} y={720} size={1150} crop="bust" frame={t} time={TIME} pose="stand" face="neutral" turn={0.55} acts={[{at: hit, face: 'smile', turn: 0.45}]} />
        </Svg>
      </CameraLayer>
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** LEAVING: the car rolls (the poplars stream past) and the town's stone slides in and stops by its front wheel */
const Leave: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 24));
  const arrive = E.out(prog(t, hit - 10, 14));
  const sx = 1260 - (1260 - 800) * arrive;
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack scroll={t * 9} warm={0.25} sunX={300} />
      <CameraLayer depth={1}>
        <Svg>
          <Smoke frame={t} x={120} y={GROUND - 270} seed={5} n={8} kind="smoke" rise={0.8} spread={1.4} size={1} time={TIME} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={385} y={seatHead(0.95, 410)} size={410} crop="bust" frame={t} time={TIME} pose="sitDrive" face="neutral" turn={0.6} />
          <Motorwagen x={250} y={GROUND} s={0.95} spin={t * 0.09} shake={1.5 * Math.sin(t / 2.2)} />
          {sx < 1180 ? <Stone x={sx} y={GROUND} name={p.place} /> : null}
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 12)} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** THE BOYS: the car stands facing left, the two boys on the bench, Bertha beside it */
const Boys: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 18));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.35} sunX={260} />
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={`${uid}o`} cast={BOY1} x={630} y={seatHead(0.95, 360)} size={360} crop="bust" frame={t + 9} time={TIME} pose="sitDrive" face="neutral" turn={-0.6} />
          <Figure uid={`${uid}y`} cast={BOY2} x={540} y={seatHead(0.95, 340)} size={340} crop="bust" frame={t + 17} time={TIME} pose="sitDrive" face="neutral" turn={-0.6} acts={[{at: hit, turn: 0.5}]} />
          <Motorwagen x={700} y={GROUND} s={0.95} flip spin={0.2} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={880} y={GROUND} size={520} frame={t} time={TIME} pose="stand" face="neutral" turn={-0.7} acts={[{at: hit, pose: 'confident', turn: -0.6}]} />
        </Svg>
      </CameraLayer>
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

/** THE OTHER WAY: the car rolls toward screen left, the low sun behind it, the poplars streaming the other way */
const Roll: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 20));
  const x = 720 - 60 * E.inOut(prog(t, 0, Math.max(30, hit + 30)));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack scroll={-t * 8} warm={0.45} sunX={180} />
      <CameraLayer depth={1}>
        <Svg>
          <Smoke frame={t} x={x + 130} y={GROUND - 270} seed={7} n={8} kind="smoke" rise={0.8} spread={1.3} time={TIME} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={x - 135} y={seatHead(0.95, 410)} size={410} crop="bust" frame={t} time={TIME} pose="sitDrive" face="neutral" turn={-0.6} />
          <Motorwagen x={x} y={GROUND} s={0.95} flip spin={-t * 0.09} shake={1.5 * Math.sin(t / 2.4)} />
        </Svg>
      </CameraLayer>
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

export const V135BerthaRoadHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'hat' ? (
    <Hat p={p} ctx={ctx} />
  ) : p.shot === 'leave' ? (
    <Leave p={p} ctx={ctx} />
  ) : p.shot === 'boys' ? (
    <Boys p={p} ctx={ctx} />
  ) : p.shot === 'roll' ? (
    <Roll p={p} ctx={ctx} />
  ) : (
    <Stall p={p} ctx={ctx} />
  );
