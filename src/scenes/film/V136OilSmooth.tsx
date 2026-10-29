// v136-oil-smooth, the lot's two other moments, the same silver sedan, the same seller and Levan, another camera each:
//   gate    the test lap comes back through the lot's gate, seen from in front low: the car lurches and stalls on the
//           chunk, the seller spreads his hands (the cold fuel), Levan's head goes into his hands
//   payoff  the same lot, closer and from the other side: the car quiet, Levan calm with the phone held out, the seller's
//           grin gone; the punch word lands
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car3, fitCarCam, type CarCam} from '../kit/car3d';
import {Street} from '../kit/street';
import {Owner, Seller} from '../kit/people';
import {mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {shot?: 'gate' | 'payoff'; hitAt?: number | string; line?: string};

const SILVER = '#B7BABE';
const GATE0: CarCam = {pos: [1.0, 1.3, 12.6], target: [0, 1.6, 0], fov: 44};
const GATE1: CarCam = {pos: [0.9, 1.28, 12.0], target: [0, 1.6, 0], fov: 44};
const PAY0: CarCam = {pos: [3.4, 1.65, 6.6], target: [0.6, 1.5, 0.6], fov: 40};
const PAY1: CarCam = {pos: [3.2, 1.62, 6.2], target: [0.6, 1.5, 0.6], fov: 40};

const Gate: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(GATE0, GATE1, E.inOut(prog(t, 0, len))), {design: 'sedan'});
  // it rolls in, lurches on the hit and stops dead
  const roll = -0.9 + 0.9 * E.out(prog(t, 0, hit));
  const lurch = 0.08 * Math.sin(prog(t, hit, 10) * Math.PI) * (1 - prog(t, hit + 10, 8));
  const shrug = Math.max(hit + 12, at(2, hit + 24));
  const s = personAt(cam, 1.8, -0.6, 1.76);
  const o = personAt(cam, -1.8, -0.4, 1.8);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="day" />
        <Car3 cam={cam} night={0} lamp={1} shadow={1} design="sedan" paint={SILVER} at={[0, roll + lurch]} yaw={1.5 * Math.sin(prog(t, hit, 10) * Math.PI)} />
        <Svg>{o ? <Owner uid={`${uid}o`} x={o.x} y={o.y} size={o.size} frame={t} light="day" pose="stand" face="worried" turn={0.5} acts={[{at: hit + 4, pose: 'handsHead', face: 'shock'}]} /> : null}</Svg>
        <Svg>{s ? <Seller uid={`${uid}m`} x={s.x} y={s.y} size={s.size} frame={t + 20} light="day" pose="confident" face="smile" turn={-0.5} acts={[{at: shrug, pose: 'shrug', face: 'grin'}]} /> : null}</Svg>
      </div>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ცივი* საწვავი'} at={hit + 8} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Sfx name="real-sputter" at={Math.max(lead(ctx), hit - 4)} volume={0.5} />
      <Haptic kind="rigid" at={hit} volume={0.3} />
    </PictureBand>
  );
};

const Payoff: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(PAY0, PAY1, E.inOut(prog(t, 0, len))), {design: 'sedan'});
  const show = Math.max(lead(ctx) + 6, at(2, 40));
  const o = personAt(cam, 2.0, 2.6, 1.8);
  const s = personAt(cam, 1.9, 0.4, 1.76);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="day" />
        <Car3 cam={cam} night={0} lamp={0.4} shadow={1} design="sedan" paint={SILVER} />
        <Svg>{s ? <Seller uid={`${uid}m`} x={s.x} y={s.y} size={s.size} frame={t + 20} light="day" pose="confident" face="grin" turn={0.5} acts={[{at: hit, pose: 'crossArms', face: 'meh'}]} /> : null}</Svg>
        <Svg>{o ? <Owner uid={`${uid}o`} x={o.x} y={o.y} size={o.size} frame={t} light="day" pose="phoneLook" hold="phone" face="neutral" turn={-0.5} acts={[{at: show, pose: 'offer', face: 'cool'}]} /> : null}</Svg>
      </div>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ჩუმად*'} at={hit} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V136OilSmooth: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'payoff' ? <Payoff p={p} ctx={ctx} /> : <Gate p={p} ctx={ctx} />);
