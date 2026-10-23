// v125-forgot-mechanic: the man who forgot his mechanic, in one Tbilisi street and one workshop, by day.
// The hero car is always the same graphite crossover (Car3), the man always the same (the kit's Owner, leather jacket).
//   shot "street"  the old Tbilisi street, his car parked at the kerb, he stands on the pavement beside it. `cam` picks the
//                  view (front: from the pavement ahead of the car, side: across the car to the houses, low: a low hero
//                  view from the kerb); `pose`, `face` and `acts` play him; `toast` drops a reminder over the street.
//   shot "garage"  the workshop by day. `car`: none (the lift empty, the mechanic waiting), other (someone else's grey saloon
//                  on the lift, the mechanic in its bay), mine (his graphite crossover rolled in, the mechanic ready).
//   On `hitAt` the camera kicks and the punch word lands (`line`).
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {L} from '../../tokens';
import {prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car3, fitCarCam, GRAPHITE, type CarCam} from '../kit/car3d';
import {Garage} from '../kit/garage';
import {Street} from '../kit/street';
import {Mechanic, Owner} from '../kit/people';
import {Toast} from '../kit/ui';
import {breath, INK, mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E} from '../kit/lib';
import type {Pose} from '../illo/poses';
import type {Face} from '../illo/faces';
import type {Act} from '../illo/acting';

type P = {
  shot?: 'hook' | 'groan' | 'think' | 'ping' | 'calm' | 'wait' | 'other' | 'pick' | 'door'; // the street's five, the workshop's four
  cam?: 'front' | 'side' | 'low';
  car?: 'none' | 'other' | 'mine';
  pose?: Pose;
  face?: Face;
  turn?: number;
  mechPose?: Pose;
  hitAt?: number | string;
  hitPose?: Pose;
  hitFace?: Face;
  line?: string;
  toast?: {title: string; body?: string; at?: number | string};
};

// the street: his car at the origin, nose to +z, the pavement on its right (+x)
const ST: Record<string, [CarCam, CarCam, [number, number]]> = {
  front: [{pos: [6.4, 1.7, 9.6], target: [0.4, 0.9, 0.6], fov: 34}, {pos: [6.0, 1.66, 9.0], target: [0.45, 0.92, 0.6], fov: 34}, [2.4, 3.1]],
  side: [{pos: [9.2, 1.45, 2.2], target: [0, 0.95, 0.2], fov: 36}, {pos: [9.0, 1.45, 1.2], target: [0, 0.95, 0.0], fov: 36}, [2.6, -0.6]],
  low: [{pos: [4.6, 0.55, 8.4], target: [0.6, 1.15, 0.8], fov: 40}, {pos: [4.9, 0.6, 8.0], target: [0.6, 1.2, 0.7], fov: 40}, [2.2, 2.6]],
};
// the workshop: the lift at the origin
const GA: [CarCam, CarCam] = [{pos: [2.3, 1.75, 10.8], target: [-0.05, 0.85, 0.4], fov: 34}, {pos: [2.0, 1.72, 10.2], target: [-0.05, 0.86, 0.42], fov: 34}];
const GB: [CarCam, CarCam] = [{pos: [-3.0, 1.6, 9.6], target: [0.4, 0.9, 0.2], fov: 36}, {pos: [-2.7, 1.6, 9.2], target: [0.4, 0.9, 0.2], fov: 36}];

const Punch: React.FC<{text?: string; hit: number}> = ({text, hit}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
        <Words text={text} at={hit} fx="slam" size={96} color={INK} />
      </div>
    </Hud>
  ) : null;

const StreetShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 24));
  const [c0, c1, me] = p.cam === 'side' ? ST.side : p.cam === 'low' ? ST.low : ST.front;
  const cam = fitCarCam(mixCam(c0, c1, E.inOut(prog(t, 0, len))));
  const o = personAt(cam, me[0], me[1], 1.8);
  const b = breath(t, 0.8);
  const acts: Act[] = p.hitPose || p.hitFace ? [{at: hit - 3, pose: p.hitPose, face: p.hitFace} as Act] : [];
  const tAt = p.toast ? Math.max(base + 6, at(p.toast.at, hit)) : 0;
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', left: -60, right: -60, top: -80, bottom: -80, backgroundColor: '#F4F4F4', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 60 + b.x, top: 80 + b.y, width: 1080, height: 1920}}>
          <Street cam={cam} uid={`${uid}s`} look="day" />
          <Car3 cam={cam} night={0} paint={GRAPHITE} shadow={1} lift={0} sheen={-0.6 + 1.2 * prog(t, 0, len)} />
          <Svg>{o ? <Owner uid={`${uid}o`} x={o.x} y={o.y} size={o.size} frame={t} light="day" pose={p.pose ?? 'stand'} face={p.face ?? 'neutral'} turn={p.turn ?? -0.6} acts={acts} /> : null}</Svg>
        </div>
      </div>
      {p.toast ? <Toast at={tAt} title={p.toast.title} body={p.toast.body} sym="notifications" y={420} /> : null}
      {p.toast ? <Sfx name="asmr-notif" at={tAt} volume={0.4} /> : null}
      <Punch text={p.line} hit={hit} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const GarageShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 24));
  const car = p.car ?? 'none';
  const pair = car === 'mine' ? GB : GA;
  const lift = car === 'other' ? 0.55 : 0;
  const cam = car === 'none' ? mixCam(pair[0], pair[1], E.inOut(prog(t, 0, len))) : fitCarCam(mixCam(pair[0], pair[1], E.inOut(prog(t, 0, len))), {lift, design: car === 'other' ? 'sedan' : 'suv'});
  const m = car === 'none' ? personAt(cam, -0.4, 1.4, 1.74) : car === 'other' ? personAt(cam, 1.15, 1.6, 1.74) : personAt(cam, 1.3, 3.4, 1.74);
  const o = car === 'mine' ? personAt(cam, -1.6, 3.0, 1.8) : null;
  const b = breath(t, 0.7);
  const acts: Act[] = p.hitPose ? [{at: hit - 3, pose: p.hitPose} as Act] : [];
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', left: -60, right: -60, top: -80, bottom: -80, backgroundColor: '#EDEDED', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 60 + b.x, top: 80 + b.y, width: 1080, height: 1920}}>
          <Garage cam={cam} uid={`${uid}g`} look="day" lift={lift} door={1} />
          {car === 'other' ? <Car3 cam={cam} night={0} design="sedan" paint="#B9B9B9" shadow={1} lift={lift} hood={1} /> : null}
          {car === 'mine' ? <Car3 cam={cam} night={0} paint={GRAPHITE} shadow={1} lift={0} lamp={prog(t, hit - 4, 10)} /> : null}
          <Garage cam={cam} uid={`${uid}f`} look="day" lift={lift} door={1} layer="front" />
          <Svg>{m ? <Mechanic uid={`${uid}m`} x={m.x} y={m.y} size={m.size} frame={t} light="day" pose={p.mechPose ?? (car === 'other' ? 'hold' : 'crossArms')} hold={car === 'other' ? 'wrench' : null} face="meh" turn={car === 'mine' ? -0.7 : -0.9} bend={car === 'other' ? 34 : 0} acts={car === 'mine' ? [] : acts} /> : null}</Svg>
          <Svg>{o ? <Owner uid={`${uid}o`} x={o.x} y={o.y} size={o.size} frame={t + 30} light="day" pose={p.pose ?? 'confident'} face={p.face ?? 'smile'} turn={p.turn ?? 0.6} acts={acts} /> : null}</Svg>
        </div>
      </div>
      <Punch text={p.line} hit={hit} />
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V125ForgotMechanic: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'wait' || p.shot === 'other' || p.shot === 'pick' || p.shot === 'door' ? <GarageShot p={p} ctx={ctx} /> : <StreetShot p={p} ctx={ctx} />;
