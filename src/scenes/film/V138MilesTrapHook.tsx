// v138-miles-trap, the lot: every 3D shot of the film, the hook first. The same dark crossover on the Rustavi market's pale
// ground in a grey drizzle, the same seller in black leather and the same buyer, Nika, each shot its own camera:
//   slam    the hook: the seller slams the door and throws his arms up by the car, a low dolly in from the front right
//   market  wide: the seller offering the car, Nika walking in from the right
//   rival   from the other side: another buyer circling behind the car, the seller hurrying with a point
//   payoff  from the front left, the rain nearly gone: Nika holds the phone out, the seller shrugs
import React, {useId} from 'react';
import {Haptic, lead, PictureBand, Sfx} from '../common';
import {accentsOn, C} from '../../tokens';
import {prog} from '../../lib/anim';
import type {SceneCtx} from '../../types';
import {Car3, fitCarCam, GRAPHITE, type CarCam} from '../kit/car3d';
import {jolt, mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E, lerp} from '../kit/lib';
import {Figure} from '../illo/figure';
import {Rain} from '../illo/fx';

type P = {shot?: string; hitAt?: number | string};
type Ctx = {p: P; ctx: SceneCtx};

const NIKA = {is: 'buyer', outfit: 'bomber', hair: 'curly', gender: 'm', age: 'young', beard: 'none', bottom: 'jeans', shoe: 'sneaker'} as const;
const SELLER = {is: 'seller', outfit: 'leather', hair: 'slick', beard: 'short', extras: ['chain', 'watch']} as const;
const RIVAL = {is: 'buyer', look: 2, outfit: 'overcoat', hair: 'receding', gender: 'm', age: 'adult', beard: 'full'} as const;
const FULL = {x: 0, y: 0, w: 1080, h: 1920};

const Lot: React.FC<{cam: CarCam; t: number; children?: React.ReactNode; rain?: number; sheen?: number}> = ({cam, t, children, rain = 0.45, sheen}) => (
  <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
    <Car3 cam={cam} night={0} lift={0} shadow={1} lamp={0.35} paint={accentsOn() ? C.accA : GRAPHITE} sheen={sheen} />
    <Svg>
      {children}
      <Rain frame={t} n={110} slant={13} box={FULL} opacity={rain} time="day" />
    </Svg>
  </div>
);

const SL0: CarCam = {pos: [4.4, 1.25, 7.6], target: [0.1, 0.85, 0.1], fov: 36};
const SL1: CarCam = {pos: [3.9, 1.2, 6.9], target: [0.15, 0.88, 0.1], fov: 36};
const Slam: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 6, at(p.hitAt, 9));
  const k = E.inOut(prog(t, 0, len));
  const j = jolt(t, hit, 10, 9, 3);
  const c = fitCarCam(mixCam(SL0, SL1, k));
  const cam: CarCam = {...c, pos: [c.pos[0] + j * 0.004, c.pos[1] + j * 0.003, c.pos[2]]};
  const s = personAt(cam, 1.45, 0.35, 1.82);
  return (
    <PictureBand camera={false}>
      <Lot cam={cam} t={t} rain={0.55} sheen={-0.4 + 0.8 * k}>
        {s ? <Figure uid={`${uid}s`} cast={SELLER} x={s.x} y={s.y} size={s.size} frame={t} time="day" face="grin" pose="armsUp" turn={-0.6} acts={[{at: hit + 12, pose: 'pointYou', face: 'grin'}]} /> : null}
      </Lot>
      <Haptic kind="heavy" at={hit} volume={0.35} />
      <Sfx name="asmr-knock" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const MK0: CarCam = {pos: [5.6, 2.1, 9.4], target: [0.2, 0.8, 0.3], fov: 34};
const MK1: CarCam = {pos: [5.1, 2.0, 8.9], target: [0.2, 0.82, 0.3], fov: 34};
const Market: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(MK0, MK1, E.inOut(prog(t, 0, len))));
  const s = personAt(cam, 1.5, -0.6, 1.82);
  const walk = E.out(prog(t, 0, Math.max(20, hit)));
  const n = personAt(cam, lerp(3.6, 2.5, walk), lerp(3.4, 2.4, walk), 1.78);
  return (
    <PictureBand camera={false}>
      <Lot cam={cam} t={t}>
        {s ? <Figure uid={`${uid}s`} cast={SELLER} x={s.x} y={s.y} size={s.size} frame={t} time="day" face="grin" pose="offer" turn={0.55} /> : null}
        {n ? <Figure uid={`${uid}n`} cast={NIKA} x={n.x} y={n.y} size={n.size} frame={t} time="day" face="neutral" pose={walk < 1 ? 'walk' : 'stand'} turn={-0.6} acts={[{at: hit, pose: 'crossArms', face: 'neutral'}]} /> : null}
      </Lot>
      <Sfx name="real-pass-by" at={lead(ctx) + 4} volume={0.18} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </PictureBand>
  );
};

const RV0: CarCam = {pos: [-5.8, 2.0, -7.2], target: [-0.1, 0.8, 0.2], fov: 34};
const RV1: CarCam = {pos: [-6.2, 2.1, -6.4], target: [-0.1, 0.8, 0.3], fov: 34};
const Rival: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 30));
  const k = E.inOut(prog(t, 0, len));
  const cam = fitCarCam(mixCam(RV0, RV1, k));
  const r = personAt(cam, lerp(-0.4, 1.6, k), -3.2, 1.8);
  const s = personAt(cam, -1.7, -0.2, 1.82);
  return (
    <PictureBand camera={false}>
      <Lot cam={cam} t={t}>
        {r ? <Figure uid={`${uid}r`} cast={RIVAL} x={r.x} y={r.y} size={r.size} frame={t} time="day" face="meh" pose="walk" turn={-0.8} /> : null}
        {s ? <Figure uid={`${uid}s`} cast={SELLER} x={s.x} y={s.y} size={s.size} frame={t} time="day" face="smirk" pose="stand" turn={0.6} acts={[{at: hit, pose: 'point', face: 'grin'}]} /> : null}
      </Lot>
      <Haptic kind="light" at={hit} volume={0.25} />
    </PictureBand>
  );
};

const PY0: CarCam = {pos: [-4.6, 1.6, 7.6], target: [-0.2, 0.85, 0.5], fov: 34};
const PY1: CarCam = {pos: [-4.2, 1.55, 7.1], target: [-0.25, 0.88, 0.6], fov: 34};
const Payoff: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(PY0, PY1, E.inOut(prog(t, 0, len))));
  const n = personAt(cam, -2.0, 2.4, 1.78);
  const s = personAt(cam, -0.7, 3.3, 1.82);
  return (
    <PictureBand camera={false}>
      <Lot cam={cam} t={t} rain={0.15}>
        {n ? <Figure uid={`${uid}n`} cast={NIKA} x={n.x} y={n.y} size={n.size} frame={t} time="day" face="smirk" pose="offer" hold="phone" turn={0.6} /> : null}
        {s ? <Figure uid={`${uid}s`} cast={SELLER} x={s.x} y={s.y} size={s.size} frame={t} time="day" face="meh" pose="stand" turn={-0.6} acts={[{at: hit, pose: 'shrug', face: 'meh'}]} /> : null}
      </Lot>
      <Haptic kind="light" at={hit} volume={0.25} />
    </PictureBand>
  );
};

export const V138MilesTrapHook: React.FC<Ctx> = ({p, ctx}) =>
  p.shot === 'market' ? <Market p={p} ctx={ctx} /> : p.shot === 'rival' ? <Rival p={p} ctx={ctx} /> : p.shot === 'payoff' ? <Payoff p={p} ctx={ctx} /> : <Slam p={p} ctx={ctx} />;
