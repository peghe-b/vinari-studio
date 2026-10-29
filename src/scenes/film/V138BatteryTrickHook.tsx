// v138-battery-trick, the hook: Gela's own garage by day, the graphite crossover with its bonnet up, seen close over the
// open bay. Frame 0: the amber engine lamp glows big over the bay and Gela leans in at the battery; on the clunk the lamp
// dies, the bay lamp drops, and he throws both fists up (the false win). The punch word lands with the camera's kick.
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Car3, fitCarCam, type CarCam} from '../kit/car3d';
import {Garage} from '../kit/garage';
import {EngineIcon, INK, jolt, mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {hitAt?: number | string; line?: string};

const GELA = {is: 'me', gender: 'm', age: 'young', outfit: 'denim', hair: 'curly', glasses: 'round', beard: 'none', hairTone: 1, tone: 5} as const;

const CAM0: CarCam = {pos: [3.6, 2.6, 8.4], target: [0, 0.9, 0.9], fov: 36};
const CAM1: CarCam = {pos: [3.3, 2.5, 7.9], target: [0, 0.9, 1.0], fov: 36};

export const V138BatteryTrickHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  // the clunk is on the shot's first frames: the lamp dies at once
  const clunk = 4;
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const cam = fitCarCam(mixCam(CAM0, CAM1, E.inOut(prog(t, 0, len))));
  const g = personAt(cam, 1.25, 1.7, 1.78);
  const lampK = 1 - prog(t, clunk, 5);
  const shake = jolt(t, clunk, 10, 10, 2);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden', transform: `translate(${shake.toFixed(2)}px, 0px)`}}>
        <Garage cam={cam} uid={`${uid}g`} look="day" lift={0} />
        <Car3 cam={cam} night={0} lift={0} shadow={1} hood={1} bayLamp={0.3 + 0.7 * lampK} lamp={0} />
        <Svg>{g ? <Figure uid={`${uid}a`} cast={GELA} x={g.x} y={g.y} size={g.size} frame={t} time="day" pose="hold" face="worried" turn={-0.6} acts={[{at: clunk + 6, pose: 'armsUp', face: 'smile'}]} /> : null}</Svg>
      </div>
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={540} cy={560} r={120} fill={INK} opacity={0.9} />
          <EngineIcon uid={`${uid}e`} x={540} y={560} size={150} k={lampK} />
        </svg>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 740, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? ''} at={hit} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Haptic kind="rigid" at={clunk} volume={0.35} />
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 8)} volume={0.2} />
      <Land at={hit} />
    </PictureBand>
  );
};
