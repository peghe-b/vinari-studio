// v138-night-squeal (the 3D shots; the cab's 2D shots are V138NightSquealMirror): Gela's night shift at the airport's taxi
// bay, one graphite crossover, one bay, another camera each:
//   hook    the bay at night: a passenger at the open rear door yells, the car jolts on the slam, the squeal
//   bay     back at the bay: the bonnet up under the work lamp, Gela with his hand to his face, two drivers staring
//   reveal  the phone rising slowly out of the dark (the home screen)
//   record  the same bay, idling: Gela holds the phone out over the open bay, REC
//   dawn    the same bay at dawn: the bonnet shut, Gela calm in his glasses, the last passenger by the door
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car3, fitCarCam, projectCar, type CarCam} from '../kit/car3d';
import {Street} from '../kit/street';
import {Glow} from '../kit/glow';
import {PhoneReveal} from '../kit/reveal';
import {Figure} from '../illo/figure';
import {jolt, mixCam, personAt, Svg, useShot, WHITE, INK} from '../kit/stage';
import {E} from '../kit/lib';

type P = {shot?: 'hook' | 'bay' | 'reveal' | 'record' | 'dawn'; hitAt?: number | string; line?: string; src?: string};

// Gela: a taxi driver in his fifties, a dark knit polo, a short grey beard, reading glasses
const GELA = {is: 'me', gender: 'm', age: 'old', outfit: 'polo', hair: 'receding', beard: 'short', glasses: 'rect', hairTone: 1} as const;
const FARE = {is: 'man', gender: 'm', age: 'adult', outfit: 'overcoat', hair: 'slick', beard: 'none'} as const;
const LAST = {is: 'buyer', gender: 'f', age: 'adult', outfit: 'blazer', hair: 'pony'} as const;
const CABBY = {is: 'neighbour', gender: 'm', age: 'adult', outfit: 'leather', hair: 'buzz', beard: 'full'} as const;
const CABBY2 = {is: 'grandpa', gender: 'm', age: 'old', outfit: 'cardigan', hair: 'bald', beard: 'tache', hat: 'flatCap'} as const;

const HOOK0: CarCam = {pos: [-4.6, 1.7, -8.6], target: [0, 0.9, 0], fov: 38};
const HOOK1: CarCam = {pos: [-4.3, 1.62, -8.0], target: [0, 0.9, 0], fov: 38};
const BAY0: CarCam = {pos: [2.3, 1.75, 10.8], target: [-0.05, 0.85, 0.4], fov: 34};
const BAY1: CarCam = {pos: [2.15, 1.72, 10.4], target: [-0.05, 0.86, 0.42], fov: 34};
const REC0: CarCam = {pos: [-3.4, 1.9, 8.6], target: [0, 0.9, 0.6], fov: 36};
const REC1: CarCam = {pos: [-3.1, 1.85, 8.1], target: [0, 0.9, 0.6], fov: 36};
const DAWN0: CarCam = {pos: [5.4, 1.5, 7.4], target: [0.3, 1.0, 0.2], fov: 38};
const DAWN1: CarCam = {pos: [5.1, 1.48, 7.0], target: [0.3, 1.0, 0.2], fov: 38};

const SODIUM = '#FFB25C'; // the bay's sodium lamps

const Punch: React.FC<{text?: string; at: number; color: string}> = ({text, at, color}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
        <Words text={text} at={at} fx="slam" size={96} color={color} />
      </div>
    </Hud>
  ) : null;

/** THE HOOK: the bay at night, the car from behind at three quarters, the passenger at the open rear door yelling; the car
 *  jolts on the slam and squeals. */
const Hook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 6, at(p.hitAt, 12));
  const cam = fitCarCam(mixCam(HOOK0, HOOK1, E.inOut(prog(t, 0, len))));
  const j = jolt(t, hit, 7, 10, 3);
  const f = personAt(cam, -1.5, -0.4, 1.8);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: INK, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="night" />
        <div style={{position: 'absolute', inset: 0, transform: `translate(${j.x}px, ${j.y}px)`}}>
          <Car3 cam={cam} night={1} street={0.8} lamp={1} shadow={1} design="suv" yaw={0.8 * Math.sin(prog(t, hit, 10) * Math.PI)} />
        </div>
        <Svg>{f ? <Figure uid={`${uid}f`} cast={FARE} x={f.x} y={f.y} size={f.size} frame={t} time="night" pose="point" face="angry" turn={0.6} acts={[{at: hit + 10, pose: 'handsHead', face: 'shock'}]} /> : null}</Svg>
        <Glow x={540} y={520} r={420} color={SODIUM} k={0.35} />
      </div>
      <Punch text={p.line} at={hit + 4} color={WHITE} />
      <Haptic kind="heavy" at={hit} volume={0.4} />
    </PictureBand>
  );
};

/** BACK AT THE BAY: the bonnet up under the work lamp, Gela at the car's front corner with his hand to his face, two
 *  drivers across the bay turning to stare. */
const Bay: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(BAY0, BAY1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, -0.3, 3.1, 1.76);
  const a = personAt(cam, 2.4, -1.2, 1.8);
  const b = personAt(cam, 3.3, -1.6, 1.74);
  const lamp = projectCar(cam, [0.05, 1.45, 1.55]);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: INK, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="night" />
        <Car3 cam={cam} night={1} street={0.6} shadow={1} hood={1} bayLamp={1} lamp={0.3} design="suv" cool={0.15} />
        <Glow x={lamp.x} y={lamp.y} r={240} color="#FFD9A8" k={0.55} />
        <Svg>{a ? <Figure uid={`${uid}a`} cast={CABBY} x={a.x} y={a.y} size={a.size} frame={t + 10} time="night" pose="crossArms" face="meh" turn={-0.5} acts={[{at: hit, pose: 'point', face: 'smirk'}]} /> : null}</Svg>
        <Svg>{b ? <Figure uid={`${uid}b`} cast={CABBY2} x={b.x} y={b.y} size={b.size} frame={t + 40} time="night" pose="stand" face="neutral" turn={-0.6} acts={[{at: hit + 8, pose: 'shrug'}]} /> : null}</Svg>
        <Svg>{g ? <Figure uid={`${uid}g`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="night" pose="stand" face="worried" turn={0.55} acts={[{at: hit - 4, pose: 'facepalm', face: 'sad'}]} /> : null}</Svg>
      </div>
      <Punch text={p.line} at={hit + 4} color={WHITE} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** THE REVEAL: the phone rising slowly out of the dark. */
const Reveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    <PhoneReveal ctx={ctx} src={p.src ?? '23-home-104'} />
  </PictureBand>
);

/** THE SAME BAY, IDLING: Gela holds the phone out over the open bay under the work lamp, REC. */
const Record: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 24));
  const cam = fitCarCam(mixCam(REC0, REC1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, -1.3, 1.9, 1.76);
  const lamp = projectCar(cam, [0.05, 1.45, 1.55]);
  const dot = Math.floor(t / 15) % 2 === 0 ? 1 : 0.3;
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: INK, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="night" />
        <Car3 cam={cam} night={1} street={0.6} shadow={1} hood={1} bayLamp={1} lamp={0.6} design="suv" cool={0.15} />
        <Glow x={lamp.x} y={lamp.y} r={260} color="#FFD9A8" k={0.6} />
        <Svg>{g ? <Figure uid={`${uid}g`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="night" pose="phoneLook" hold="phone" face="neutral" turn={0.6} acts={[{at: hit - 6, pose: 'offer'}]} /> : null}</Svg>
      </div>
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={L.camSafe.left + 26} cy={470} r={22} fill="#E01B1B" opacity={dot * prog(t, hit, 6)} />
        </svg>
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left + 70, top: 420, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} color={WHITE} />
          </div>
        ) : null}
      </Hud>
      <Sfx name="real-idle" at={lead(ctx)} volume={0.35} />
      <Sfx name="asmr-tap" at={Math.max(lead(ctx), hit - 2)} volume={0.3} />
      <Haptic kind="light" at={hit} volume={0.3} />
    </PictureBand>
  );
};

/** THE PAYOFF: the same bay at dawn, the bonnet shut; Gela calm in his glasses, the last passenger by the rear door. */
const Dawn: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(DAWN0, DAWN1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, 2.0, 2.4, 1.76);
  const f = personAt(cam, 1.9, -0.6, 1.72);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="day" />
        <Car3 cam={cam} night={0} lamp={0.5} shadow={1} design="suv" />
        <Svg>{f ? <Figure uid={`${uid}f`} cast={LAST} x={f.x} y={f.y} size={f.size} frame={t + 20} time="day" pose="stand" face="neutral" turn={0.5} acts={[{at: hit - 20, pose: 'shrug'}]} /> : null}</Svg>
        <Svg>{g ? <Figure uid={`${uid}g`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="day" pose="confident" face="smile" turn={-0.5} acts={[{at: hit, pose: 'thumbsUp', face: 'cool'}]} /> : null}</Svg>
      </div>
      <Punch text={p.line} at={hit} color={C.ink} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V138NightSqueal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'bay':
      return <Bay p={p} ctx={ctx} />;
    case 'reveal':
      return <Reveal p={p} ctx={ctx} />;
    case 'record':
      return <Record p={p} ctx={ctx} />;
    case 'dawn':
      return <Dawn p={p} ctx={ctx} />;
    default:
      return <Hook p={p} ctx={ctx} />;
  }
};
