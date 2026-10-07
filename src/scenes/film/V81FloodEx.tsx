// v81-flood-ex: the breakup at the curb. Dusk, a street; I hold out flowers, she stands by my new SUV. On her put-down
// she points at me, on "this car" she points at it and muddy water starts to drip from its door sills into a growing
// puddle, and on the hit she walks off to the right while my flowers droop and a tear runs. A picture, full bleed.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, rgba} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {FaceFx} from '../illo/fx';
import {dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  pointAt?: number | string; // she points at me
  carAt?: number | string; // she points at the car, the water starts to drip
  hitAt?: number | string; // she walks off
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1300;
const ME_X = 250;
const CAR_X = 660;
const GIRL_X = 820;
// where the water drips from the sills (stage x)
const DRIPS = [470, 540, 610, 700, 770, 840];

export const V81FloodEx: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const time = timeOf(p);
  const night = dark(time);
  const pointAt = Math.max(base + 4, cueFrame(ctx, p.pointAt ?? 1));
  const carAt = Math.max(pointAt + 8, cueFrame(ctx, p.carAt ?? 2));
  const hit = Math.max(carAt + 10, cueFrame(ctx, p.hitAt ?? 3));
  // she walks out of the frame after the hit
  const away = prog(frame, hit, 70, ease.enter);
  const girlX = GIRL_X + 560 * away;
  // the puddle grows once the water runs
  const pud = prog(frame, carAt, 60, ease.enter);
  const water = night ? C.il3 : C.il4;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <rect x={-200} y={GROUND} width={1480} height={6} fill={night ? C.il6 : C.il3} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={380} ry={20} />
          {/* the puddle under the car */}
          <ellipse cx={CAR_X} cy={GROUND + 18} rx={60 + 330 * pud} ry={6 + 16 * pud} fill={rgba(water, 0.85 * Math.min(1, pud * 3))} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={760} body="suv" paint={2} dir={-1} frame={frame} time={time} dirt={1} lights={{head: night ? 1 : 0}} />
          {/* the drips: each falls from the sill to the puddle, staggered */}
          {DRIPS.map((x, i) => {
            const t = frame - carAt - i * 5;
            if (t < 0) return null;
            const c = (t % 22) / 22;
            const y = GROUND - 70 + 80 * c * c;
            return <ellipse key={i} cx={x} cy={y} rx={5} ry={8 + 4 * c} fill={water} opacity={0.9 * (1 - c * c)} />;
          })}
          <Shadow uid={uid} cx={ME_X} cy={GROUND + 2} rx={110} />
          <Figure
            uid={uid}
            cast="me"
            x={ME_X}
            y={GROUND}
            size={620}
            frame={frame}
            time={time}
            hold="flowers"
            acts={[
              {at: e, face: 'smile', pose: 'offer', turn: 0.5},
              {at: pointAt, face: 'shock', pose: 'offer', turn: 0.5},
              {at: carAt, face: 'worried', pose: 'hold', turn: 0.6},
              {at: hit, face: 'sad', pose: 'slumped', turn: 0.4},
            ]}
          />
          <FaceFx kind="tear" frame={frame} x={ME_X + 20} y={GROUND - 540} size={110} at={hit + 6} time={time} uid={uid} />
          <FaceFx kind="shock" frame={frame} x={ME_X + 40} y={GROUND - 620} size={110} at={pointAt} time={time} uid={uid} />
          <Shadow uid={uid} cx={girlX} cy={GROUND + 2} rx={100} />
          <Figure
            uid={uid}
            cast="girl"
            x={girlX}
            y={GROUND}
            size={590}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'meh', pose: 'crossArms', turn: -0.5},
              {at: Math.max(e + 1, base + 6), face: 'angry', pose: 'reject', turn: -0.6},
              {at: pointAt, face: 'angry', pose: 'pointYou', turn: -0.6},
              {at: carAt, face: 'angry', pose: 'point', turn: -0.3},
              {at: hit, face: 'meh', pose: 'walk', turn: 0.8},
            ]}
          />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-paper" at={base + 6} volume={0.25} />
      <Sfx name="asmr-knock" at={pointAt} volume={0.3} />
      <Sfx name="asmr-tick-fine" at={carAt + 4} volume={0.25} />
      <Sfx name="asmr-air-long" at={hit} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
