// src/scenes/film/V135BerthaRoad.tsx: v135-bertha-road's own pictures. 5 August 1888, the poplar road from Mannheim to
// Pforzheim in late light: the three-wheeled Motorwagen as a crisp silhouette (never a part close-up), Bertha Benz in a long
// dress beside it, the trouble on the way. The car small on the long straight; the Wiesloch stone and a pharmacy's shop front
// with a bottle on its sign; she crouches at the car's front (the hat pin) and turns with the pin up in the light; she
// crouches at its back (the garter on the wire); the wooden brakes give on a downhill, sparks at the wheel; a cobbler kneels
// at the wheel in front of his shop. The opening is V135BerthaRoadHook.tsx, the payoff V135BerthaRoadReveal.tsx.
//   {"type": "Film", "name": "V135BerthaRoad", "look": "illustrated", "shot": "far" | "pharmacy" | "pin" | "glint" |
//    "garter" | "downhill" | "cobbler", "place": "<town>", "hitAt": 1}
import React, {useId} from 'react';
import {Haptic, lead, Sfx} from '../common';
import {C} from '../../tokens';
import {prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {CameraLayer} from '../../lib/camera';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Smoke, Sparks} from '../illo/fx';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {acc, accRamp, far, ground} from '../illo/palette';
import {Glow} from '../kit/glow';
import {jolt, useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'far' | 'pharmacy' | 'pin' | 'glint' | 'garter' | 'downhill' | 'cobbler';
  place?: string; // the town on the roadside stone
  hitAt?: number | string;
};

const TIME = 'day' as const;
const GROUND = 1270; // the road's edge: wheels and feet stand here, well over the subtitle band
// Bertha: a long dark dress, her hair up; the cobbler an old man in his shirt (the same Bertha in the Hook and Reveal files)
const BERTHA = {is: 'woman', outfit: 'dress', hair: 'bun', age: 'adult', gender: 'f', extras: ['earrings']} as const;
const COBBLER = {is: 'man', outfit: 'shirt', hair: 'receding', beard: 'full', age: 'old', gender: 'm'} as const;
// the poplars along the road: [x, height]; the row repeats every SPAN px when the road scrolls
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

/** the 1885 Patent-Motorwagen in profile, facing right: the big spoked rear wheel, the small front wheel on its fork, the
 *  curved tube frame, the bench, the tiller, the flywheel at the back. (x, y) = the rear wheel's ground point; `spin` turns
 *  the spokes, `shake` jolts it. Marked OBJ: it stays whole in the frame. */
const Motorwagen: React.FC<{x: number; y: number; s?: number; spin?: number; shake?: number}> = ({x, y, s = 1, spin = 0, shake = 0}) => {
  const R = 150; // the rear wheel
  const r = 92; // the front wheel
  const fx = 420; // the front wheel's centre, from the rear one's
  const ink = C.il7;
  const body = accRamp(acc('a'), 3);
  const spokes = (cx: number, cy: number, rr: number, n: number) =>
    Array.from({length: n}, (_, i) => {
      const a = spin + (i * Math.PI * 2) / n;
      return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * (rr - 10)} y2={cy + Math.sin(a) * (rr - 10)} stroke={ink} strokeWidth={4} />;
    });
  return (
    <g className={OBJ} transform={`translate(${x} ${y + shake}) scale(${s})`}>
      {/* the tube frame and the front fork */}
      <path d={`M 0 ${-R} C 120 ${-R - 10}, 260 ${-R - 30}, 330 ${-R - 60} L ${fx} ${-r}`} fill="none" stroke={ink} strokeWidth={12} strokeLinecap="round" />
      <path d={`M ${fx - 30} ${-r - 150} L ${fx} ${-r}`} fill="none" stroke={ink} strokeWidth={10} strokeLinecap="round" />
      {/* the engine box under the bench and the flywheel behind it */}
      <rect x={-120} y={-R - 120} width={150} height={96} rx={10} fill={ink} />
      <ellipse cx={-120} cy={-R - 70} rx={22} ry={70} fill={ink} />
      {/* the bench, its back and the panel in the film's accent */}
      <rect x={-30} y={-R - 175} width={250} height={58} rx={14} fill={body} />
      <rect x={-30} y={-R - 260} width={30} height={100} rx={8} fill={ink} />
      <rect x={-6} y={-R - 135} width={230} height={22} rx={6} fill={ink} />
      {/* the tiller rising in front of the bench */}
      <path d={`M ${fx - 30} ${-r - 150} L 270 ${-R - 230}`} fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" />
      <rect x={250} y={-R - 246} width={56} height={14} rx={7} fill={ink} />
      {/* the footboard */}
      <rect x={220} y={-R - 64} width={110} height={12} rx={6} fill={ink} />
      {/* the wheels: thick rims, thin spokes, a hub */}
      <circle cx={0} cy={-R} r={R} fill="none" stroke={ink} strokeWidth={14} />
      {spokes(0, -R, R, 14)}
      <circle cx={0} cy={-R} r={18} fill={ink} />
      <circle cx={fx} cy={-r} r={r} fill="none" stroke={ink} strokeWidth={12} />
      {spokes(fx, -r, r, 10)}
      <circle cx={fx} cy={-r} r={13} fill={ink} />
    </g>
  );
};

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

/** FAR: a long way to go; the car small on the long straight, the poplar rows running on, its smoke trailing */
const Far: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 20));
  const x = 200 + 3.2 * t;
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack scroll={t * 2} warm={0.3} sunX={900} />
      <CameraLayer depth={1}>
        <Svg>
          <Smoke frame={t} x={x - 70} y={GROUND - 140} seed={11} n={8} kind="smoke" rise={0.5} spread={0.8} size={0.6} time={TIME} />
          <Motorwagen x={x} y={GROUND} s={0.5} spin={t * 0.15} shake={Math.sin(t / 2)} />
          <Stone x={900} y={GROUND} />
        </Svg>
      </CameraLayer>
      <Haptic kind="light" at={hit} volume={0.2} />
    </IlloBand>
  );
};

/** THE PHARMACY: the car stands at a small shop front with a bottle on its sign and the town's stone, Bertha at the door */
const Pharmacy: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 22));
  const walk = E.inOut(prog(t, 4, Math.max(12, hit)));
  const sign = E.out(prog(t, hit - 6, 14));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.3} sunX={240} />
      <CameraLayer depth={0.8}>
        <Svg>
          <rect x={540} y={GROUND - 600} width={460} height={600} fill={far(0.28, TIME)} />
          <path d={`M 520 ${GROUND - 600} L 770 ${GROUND - 740} L 1020 ${GROUND - 600} Z`} fill={far(0.45, TIME)} />
          <rect x={600} y={GROUND - 420} width={150} height={170} rx={6} fill={far(0.1, TIME)} />
          <rect x={800} y={GROUND - 340} width={120} height={340} rx={6} fill={far(0.58, TIME)} />
          <g className={OBJ} opacity={0.75 + 0.25 * sign}>
            <rect x={610} y={GROUND - 540} width={160} height={80} rx={12} fill={far(0.7, TIME)} />
            <path d={`M 676 ${GROUND - 526} L 704 ${GROUND - 526} L 704 ${GROUND - 514} Q 720 ${GROUND - 506} 720 ${GROUND - 490} L 720 ${GROUND - 472} L 660 ${GROUND - 472} L 660 ${GROUND - 490} Q 660 ${GROUND - 506} 676 ${GROUND - 514} Z`} fill={acc('a')} />
          </g>
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Motorwagen x={235} y={GROUND} s={0.8} spin={0.4} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={560 + 230 * walk} y={GROUND} size={520} frame={t} time={TIME} pose="walk" face="neutral" turn={0.7} acts={[{at: hit, pose: 'stand', turn: 0.8}]} />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-knock" at={hit} volume={0.25} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** THE ROADSIDE FIX: the car stands, she crouches at its front (the pin) or its back (the garter on the wire); on the key
 *  moment a small bright burst at her hands */
const Fix: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const rear = p.shot === 'garter';
  const carX = rear ? 400 : 250;
  const herX = rear ? 180 : 850;
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.4} sunX={rear ? 860 : 220} />
      <CameraLayer depth={1}>
        <Svg>
          <Motorwagen x={carX} y={GROUND} s={0.95} spin={0.3} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={herX} y={GROUND} size={520} frame={t} time={TIME} pose="stand" face="neutral" turn={rear ? 0.6 : -0.6} acts={[{at: Math.max(0, hit - 18), pose: 'crouch', turn: rear ? 0.7 : -0.7}]} />
          <Sparks frame={t} x={rear ? herX + 90 : herX - 90} y={GROUND - 210} at={hit} n={10} spread={120} power={0.7} time={TIME} uid={`${uid}s`} />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-tap" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** CLOSE: Bertha from the waist up, turned to the car on her left, the pin up in the light; a glint on it at the key moment */
const Glint: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 20));
  const g = prog(t, hit, 6) * (1 - prog(t, hit + 16, 20));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.5} sunX={260} />
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={`${uid}b`} cast={BERTHA} x={600} y={680} size={1300} crop="bust" frame={t} time={TIME} pose="stand" face="neutral" turn={-0.6} acts={[{at: Math.max(0, hit - 14), pose: 'hold', turn: -0.65}]} />
        </Svg>
        <Glow x={360} y={930} r={170} color={C.il0} k={0.9 * g} />
      </CameraLayer>
      <Sfx name="asmr-tap" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** DOWNHILL: the road tips, the car runs down with its wooden brakes on, sparks and a squeal at the back wheel */
const Downhill: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 6, at(p.hitAt, 14));
  const sh = jolt(t, hit, 6, 10, 3);
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack scroll={t * 12} warm={0.3} sunX={860} />
      <CameraLayer depth={1}>
        <Svg>
          <g transform={`rotate(7 540 ${GROUND})`}>
            <rect x={-300} y={GROUND} width={1680} height={700} fill={far(0.2, TIME)} />
            <Figure uid={`${uid}b`} cast={BERTHA} x={465} y={GROUND - 325 * 0.95 - 0.34 * 410 + sh} size={410} crop="bust" frame={t} time={TIME} pose="sitDrive" face="worried" turn={0.4} />
            <Motorwagen x={330} y={GROUND} s={0.95} spin={t * 0.12} shake={sh} />
            <Sparks frame={t} x={330} y={GROUND - 4} at={hit} loop={8} n={10} dir={-160} spread={40} power={0.8} time={TIME} uid={`${uid}s`} />
          </g>
        </Svg>
      </CameraLayer>
      <Sfx name="real-brake-squeal" at={hit} volume={0.35} />
      <Haptic kind="rigid" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** THE COBBLER: a small shop front with a boot on its sign; the old cobbler kneels at the car's rear wheel, Bertha watches */
const Cobbler: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 28));
  return (
    <IlloBand uid={uid} time={TIME}>
      <RoadBack warm={0.3} sunX={900} />
      <CameraLayer depth={0.8}>
        <Svg>
          <rect x={560} y={GROUND - 560} width={420} height={560} fill={far(0.3, TIME)} />
          <path d={`M 540 ${GROUND - 560} L 770 ${GROUND - 700} L 1000 ${GROUND - 560} Z`} fill={far(0.45, TIME)} />
          <rect x={640} y={GROUND - 420} width={120} height={150} rx={6} fill={far(0.1, TIME)} />
          <rect x={820} y={GROUND - 330} width={110} height={330} rx={6} fill={far(0.55, TIME)} />
          <g className={OBJ}>
            <rect x={600} y={GROUND - 520} width={180} height={70} rx={10} fill={far(0.7, TIME)} />
            <path d={`M 650 ${GROUND - 505} L 650 ${GROUND - 470} L 735 ${GROUND - 470} Q 735 ${GROUND - 488} 700 ${GROUND - 490} L 678 ${GROUND - 505} Z`} fill={C.il0} />
          </g>
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Motorwagen x={290} y={GROUND} s={0.95} spin={0.2} />
          <Figure uid={`${uid}c`} cast={COBBLER} x={150} y={GROUND} size={470} frame={t} time={TIME} pose="crouch" face="neutral" turn={0.7} acts={[{at: hit, pose: 'hold', turn: 0.7}]} />
          <Figure uid={`${uid}b`} cast={BERTHA} x={830} y={GROUND} size={520} frame={t} time={TIME} pose="crossArms" face="neutral" turn={-0.6} />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-knock" at={hit} volume={0.3} />
      <Haptic kind="rigid" at={hit} volume={0.25} />
    </IlloBand>
  );
};

export const V135BerthaRoad: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'pharmacy' ? (
    <Pharmacy p={p} ctx={ctx} />
  ) : p.shot === 'pin' || p.shot === 'garter' ? (
    <Fix p={p} ctx={ctx} />
  ) : p.shot === 'glint' ? (
    <Glint p={p} ctx={ctx} />
  ) : p.shot === 'downhill' ? (
    <Downhill p={p} ctx={ctx} />
  ) : p.shot === 'cobbler' ? (
    <Cobbler p={p} ctx={ctx} />
  ) : (
    <Far p={p} ctx={ctx} />
  );
