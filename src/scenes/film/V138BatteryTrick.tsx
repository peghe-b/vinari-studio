// v138-battery-trick: Gela's garage, the same graphite crossover in every shot, another camera and moment each.
//   morning    the car's own digital cockpit, close: the start, the lamps test, then the amber check lamp blooms back;
//              the tally of returns (amber lamps in a row over the cockpit) gains one
//   neighbour  wide from the garage's far corner: Gela bent at the open bay again, the old neighbour beside the bumper
//              drops his face into his hand as the lamp comes back on the tally
//   boss       low from in front, the headlamps on: the boss at the passenger side points at the windscreen, the lamp's
//              glow fills it, Gela's head goes into his hands; the tally reaches three
//   plug       at the open driver's door, low: Gela crouches with the phone, the adapter's light wakes under the wheel
//   reveal     the phone rises slowly out of the dark (PhoneReveal), the home screen waking
//   payoff     the bonnet shut, the boss beside him, Gela calm with the phone held out; the punch lands
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Car3, fitCarCam, projectCar, type CarCam} from '../kit/car3d';
import {Garage} from '../kit/garage';
import {Glow} from '../kit/glow';
import {Cockpit, CP} from '../kit/cockpit';
import {PhoneReveal} from '../kit/reveal';
import {AMBER, EngineIcon, INK, mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {shot?: 'morning' | 'neighbour' | 'boss' | 'plug' | 'reveal' | 'payoff'; hitAt?: number | string; line?: string; tally?: number; big?: string[]};

const GELA = {is: 'me', gender: 'm', age: 'young', outfit: 'denim', hair: 'curly', glasses: 'round', beard: 'none', hairTone: 1, tone: 5} as const;
const NEIGH = {is: 'neighbour', gender: 'm', age: 'old', outfit: 'cardigan', hair: 'receding', beard: 'tache'} as const;
const BOSS = {is: 'boss', gender: 'f', age: 'adult', outfit: 'blazer', hair: 'bob', extras: ['earrings']} as const;

/** the tally of the lamp's returns: three amber lamps in a row, `n` lit (the newest blooms on `hit`) */
const Tally: React.FC<{uid: string; n0: number; hit: number; t: number; y?: number}> = ({uid, n0, hit, t, y = 470}) => {
  const k = prog(t, hit, 8);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <rect x={300} y={y - 70} width={480} height={140} rx={70} fill={INK} opacity={0.92} />
      {[0, 1, 2].map((i) => (
        <EngineIcon key={i} uid={`${uid}t${i}`} x={400 + i * 140} y={y} size={84} k={i < n0 ? 1 : i === n0 ? k : 0} glow={0.6} />
      ))}
    </svg>
  );
};

const GARAGE_WIDE0: CarCam = {pos: [-4.2, 1.9, 9.6], target: [0.2, 0.9, 0.6], fov: 38};
const GARAGE_WIDE1: CarCam = {pos: [-3.9, 1.85, 9.1], target: [0.2, 0.9, 0.6], fov: 38};
const FRONT0: CarCam = {pos: [0.6, 1.0, 11.6], target: [0, 1.0, 0], fov: 40};
const FRONT1: CarCam = {pos: [0.5, 1.0, 11.1], target: [0, 1.0, 0], fov: 40};
const DOOR0: CarCam = {pos: [-6.4, 1.2, 3.8], target: [0, 0.8, 0.2], fov: 38};
const DOOR1: CarCam = {pos: [-6.0, 1.15, 3.4], target: [0, 0.8, 0.2], fov: 38};
const PAY0: CarCam = {pos: [4.6, 1.7, 7.2], target: [0.3, 1.0, 0.4], fov: 38};
const PAY1: CarCam = {pos: [4.3, 1.65, 6.8], target: [0.3, 1.0, 0.4], fov: 38};

const Morning: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 30));
  const start = Math.max(lead(ctx), hit - 22);
  const s = 0.7 + 0.05 * E.inOut(prog(t, 0, len));
  const w = CP.w * s;
  const h = CP.h * s;
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: '#1C1D20'}} />
      <Glow x={540} y={900} r={520} color="#3A3D44" k={0.8} />
      <Hud>
        <Tally uid={uid} n0={p.tally ?? 0} hit={hit} t={t} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${(540 - w / 2).toFixed(1)} ${(900 - h / 2).toFixed(1)}) scale(${s.toFixed(4)})`}>
            <Cockpit uid={`${uid}c`} frame={t} on={prog(t, start, 10)} test={prog(t, start, 4) * (1 - prog(t, start + 14, 4))} check={prog(t, hit, 6)} speed={0} night={1} />
          </g>
        </svg>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 1130, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? ''} at={hit} fx="slam" size={96} color="#FFFFFF" />
        </div>
      </Hud>
      <Sfx name="real-start" at={start} volume={0.45} />
      <Land at={hit} />
      <Haptic kind="warning" at={hit} volume={0.3} />
    </PictureBand>
  );
};

const Neighbour: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(GARAGE_WIDE0, GARAGE_WIDE1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, 1.2, 1.6, 1.78);
  const n = personAt(cam, -1.5, 3.6, 1.72);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Garage cam={cam} uid={`${uid}g`} look="day" lift={0} />
        <Car3 cam={cam} night={0} lift={0} shadow={1} hood={1} bayLamp={0.4} lamp={0} />
        <Svg>{g ? <Figure uid={`${uid}a`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="day" pose="hold" face="worried" turn={-0.8} /> : null}</Svg>
        <Svg>{n ? <Figure uid={`${uid}n`} cast={NEIGH} x={n.x} y={n.y} size={n.size} frame={t + 30} time="day" pose="stand" face="meh" turn={0.6} acts={[{at: hit, pose: 'facepalm', face: 'meh'}]} /> : null}</Svg>
      </div>
      <Hud>
        <Tally uid={uid} n0={p.tally ?? 1} hit={hit} t={t} />
        <div style={{position: 'absolute', left: L.camSafe.left, top: 600, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? ''} at={hit} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Sfx name="real-clunk" at={Math.max(lead(ctx), hit - 18)} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="warning" at={hit} volume={0.3} />
    </PictureBand>
  );
};

const Boss: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(FRONT0, FRONT1, E.inOut(prog(t, 0, len))));
  const b = personAt(cam, 1.35, 2.4, 1.7);
  const g = personAt(cam, -1.4, 2.4, 1.78);
  const glass = projectCar(cam, [0, 1.25, 0.9]);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Garage cam={cam} uid={`${uid}g`} look="day" lift={0} />
        <Car3 cam={cam} night={0} lift={0} shadow={1} hood={0} lamp={prog(t, Math.max(0, hit - 20), 8)} />
        {glass ? <Glow x={glass.x} y={glass.y} r={220} color={AMBER} k={0.75 * prog(t, hit, 8)} /> : null}
        <Svg>{b ? <Figure uid={`${uid}b`} cast={BOSS} x={b.x} y={b.y} size={b.size} frame={t + 10} time="day" pose="stand" face="neutral" turn={-0.7} acts={[{at: hit, pose: 'point', face: 'meh'}]} /> : null}</Svg>
        <Svg>{g ? <Figure uid={`${uid}a`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="day" pose="stand" face="smile" turn={0.6} acts={[{at: hit + 8, pose: 'handsHead', face: 'shock'}]} /> : null}</Svg>
      </div>
      <Hud>
        <Tally uid={uid} n0={p.tally ?? 2} hit={hit} t={t} />
        <div style={{position: 'absolute', left: L.camSafe.left, top: 600, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? ''} at={hit} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Sfx name="real-start-b" at={Math.max(lead(ctx), hit - 20)} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="error" at={hit} volume={0.3} />
    </PictureBand>
  );
};

const Plug: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 24));
  const cam = fitCarCam(mixCam(DOOR0, DOOR1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, -1.75, 0.9, 1.78);
  const port = projectCar(cam, [-0.55, 0.55, 0.75]);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Garage cam={cam} uid={`${uid}g`} look="day" lift={0} />
        <Car3 cam={cam} night={0} lift={0} shadow={1} hood={0} lamp={0} />
        {port ? <Glow x={port.x} y={port.y} r={110} color="#7FD4FF" k={prog(t, hit, 8) * (0.75 + 0.25 * Math.sin(t / 3))} /> : null}
        <Svg>{g ? <Figure uid={`${uid}a`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="day" pose="crouch" hold="phone" face="neutral" turn={0.7} /> : null}</Svg>
      </div>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 520, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? ''} at={hit} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Sfx name="real-key-in" at={Math.max(lead(ctx), hit - 4)} volume={0.45} />
      <Land at={hit} />
      <Haptic kind="success" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const Reveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    <PhoneReveal ctx={ctx} src="23-home-104" big={p.big ?? []} kick={1} foot={1300} />
  </PictureBand>
);

const Payoff: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 12, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(PAY0, PAY1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, 2.1, 2.4, 1.78);
  const b = personAt(cam, 2.3, 0.6, 1.7);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Garage cam={cam} uid={`${uid}g`} look="day" lift={0} />
        <Car3 cam={cam} night={0} lift={0} shadow={1} hood={0} lamp={0.4} />
        <Svg>{b ? <Figure uid={`${uid}b`} cast={BOSS} x={b.x} y={b.y} size={b.size} frame={t + 10} time="day" pose="stand" face="neutral" turn={0.6} acts={[{at: hit, pose: 'confident', face: 'smile'}]} /> : null}</Svg>
        <Svg>{g ? <Figure uid={`${uid}a`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="day" pose="phoneLook" hold="phone" face="neutral" turn={-0.6} acts={[{at: hit, pose: 'offer', face: 'smile'}]} /> : null}</Svg>
      </div>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 520, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? ''} at={hit} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V138BatteryTrick: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'morning' ? (
    <Morning p={p} ctx={ctx} />
  ) : p.shot === 'neighbour' ? (
    <Neighbour p={p} ctx={ctx} />
  ) : p.shot === 'boss' ? (
    <Boss p={p} ctx={ctx} />
  ) : p.shot === 'plug' ? (
    <Plug p={p} ctx={ctx} />
  ) : p.shot === 'reveal' ? (
    <Reveal p={p} ctx={ctx} />
  ) : (
    <Payoff p={p} ctx={ctx} />
  );
