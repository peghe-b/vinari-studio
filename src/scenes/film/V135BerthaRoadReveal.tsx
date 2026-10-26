// src/scenes/film/V135BerthaRoadReveal.tsx: v135-bertha-road's payoff. The same poplar road and the same three-wheeled
// Motorwagen as V135BerthaRoad.tsx, at the end of the way: the low sun over the Pforzheim stone, Bertha standing tall by the
// car with her two boys; then people stepping up to the car from both sides (the world getting to know it).
//   {"type": "Film", "name": "V135BerthaRoadReveal", "look": "illustrated", "shot": "arrive" | "crowd", "place": "<town>", "hitAt": 1}
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {C} from '../../tokens';
import {prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {CameraLayer} from '../../lib/camera';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {acc, accRamp, far, ground} from '../illo/palette';
import {Glow} from '../kit/glow';
import {useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'arrive' | 'crowd';
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

/** the sky in late light, the far fields, the poplar row and the road to the frame's foot (full bleed) */
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

/** the Patent-Motorwagen in profile, facing right (as in V135BerthaRoad.tsx); marked OBJ: it stays whole in the frame */
const Motorwagen: React.FC<{x: number; y: number; s?: number; spin?: number}> = ({x, y, s = 1, spin = 0}) => {
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
    <g className={OBJ} transform={`translate(${x} ${y}) scale(${s})`}>
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

/** THE PAYOFF: the low sun over the Pforzheim stone, the same car standing, Bertha tall beside it, her two boys with her */
const Arrive: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 24));
  const sun = 0.35 + 0.45 * E.out(prog(t, hit - 6, 24));
  const roll = 1 - E.out(prog(t, 0, Math.max(10, hit)));
  const label = p.place ? mtav(p.place) : '';
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack scroll={t * 4 * roll} warm={sun} sunX={760} />
      <CameraLayer depth={1}>
        <Svg>
          <g className={OBJ}>
            <path d={`M 780 ${GROUND} L 780 ${GROUND - 130} Q 780 ${GROUND - 190} 840 ${GROUND - 190} Q 900 ${GROUND - 190} 900 ${GROUND - 130} L 900 ${GROUND} Z`} fill={far(0.62, TIME)} />
            <rect x={800} y={GROUND - 150} width={80} height={10} rx={5} fill={far(0.85, TIME)} />
            {label ? (
              <text className={TXT} x={800} y={GROUND - 222} textAnchor="middle" fontFamily="inherit" fontWeight={700} fontSize={44} fill={C.ink}>
                {label}
              </text>
            ) : null}
          </g>
          <Motorwagen x={240} y={GROUND} s={0.75} spin={t * 0.05 * roll} />
          <Figure uid={`${uid}o`} cast={BOY1} x={650} y={GROUND} size={420} frame={t + 9} time={TIME} pose="stand" face="smile" turn={-0.4} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={740} y={GROUND} size={540} frame={t} time={TIME} pose="stand" face="neutral" turn={-0.5} acts={[{at: hit, pose: 'confident', face: 'smile', turn: -0.45}]} />
          <Figure uid={`${uid}y`} cast={BOY2} x={845} y={GROUND} size={390} frame={t + 17} time={TIME} pose="stand" face="smile" turn={-0.6} />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 10)} volume={0.24} />
      <Land at={hit} />
    </IlloBand>
  );
};

/** THE WORLD HEARS: the same car at the kerb and people stepping up to it from both sides, the light warming */
const FOLK = [
  {cast: {is: 'man', outfit: 'overcoat', hat: 'flatCap', beard: 'tache', age: 'adult', gender: 'm'}, x: 200, turn: 0.6, size: 500, d: 0},
  {cast: {is: 'woman', outfit: 'dress', hair: 'lowbun', age: 'old', gender: 'f'}, x: 290, turn: 0.5, size: 470, d: 6},
  {cast: {is: 'man', outfit: 'suit', hair: 'slick', beard: 'full', age: 'adult', gender: 'm'}, x: 790, turn: -0.6, size: 510, d: 3},
  {cast: {is: 'neighbour', outfit: 'cardigan', hair: 'side', age: 'young', gender: 'm'}, x: 880, turn: -0.5, size: 460, d: 9},
] as const;
const Crowd: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 18));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.55} sunX={540} />
      <CameraLayer depth={1}>
        <Svg>
          <Motorwagen x={390} y={GROUND} s={0.7} spin={0.3} />
          {FOLK.map((f, i) => {
            const k = E.out(prog(t, f.d, 24));
            const x = f.x + (f.x < 540 ? -30 : 30) * (1 - k);
            return <Figure key={i} uid={`${uid}f${i}`} cast={f.cast} x={x} y={GROUND} size={f.size} frame={t + f.d * 3} time={TIME} pose={k < 1 ? 'walk' : 'stand'} face="neutral" turn={f.turn} acts={[{at: hit + f.d, pose: i === 2 ? 'point' : 'stand', turn: f.turn}]} />;
          })}
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 8)} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

export const V135BerthaRoadReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'crowd' ? <Crowd p={p} ctx={ctx} /> : <Arrive p={p} ctx={ctx} />;
