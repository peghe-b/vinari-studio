// v136-oil-smooth, the hook: a used-car lot in the day, the silver sedan idling rough (the whole car shivers on its
// wheels), the seller slapping the bonnet with a big grin while Levan stands frozen by the door, the keys still in his
// hand. The seller's claim stands over them from frame 0, big; on the chunk it is said the shiver kicks harder.
import React, {useId} from 'react';
import {Haptic, lead, PictureBand} from '../common';
import {C, F} from '../../tokens';
import {prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {Hud} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {Car3, fitCarCam, type CarCam} from '../kit/car3d';
import {Street} from '../kit/street';
import {Owner, Seller} from '../kit/people';
import {mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E} from '../kit/lib';

type P = {claim?: string; hitAt?: number | string};

const CAM0: CarCam = {pos: [4.6, 1.7, 8.6], target: [0.2, 1.55, 0.2], fov: 38};
const CAM1: CarCam = {pos: [4.3, 1.68, 8.0], target: [0.2, 1.55, 0.2], fov: 38};
const SILVER = '#B7BABE';

export const V136OilSmoothHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 24));
  const k = E.inOut(prog(t, 0, len));
  const cam = fitCarCam(mixCam(CAM0, CAM1, k), {design: 'sedan'});
  // the rough idle: an uneven shiver, harder after the slap
  const amp = 0.006 + 0.01 * prog(t, hit, 6);
  const sx = amp * (Math.sin(t * 2.3) + 0.6 * Math.sin(t * 5.1 + 1));
  const yaw = 0.25 * Math.sin(t * 3.7) * (amp / 0.016);
  const s = personAt(cam, 1.9, 2.3, 1.76);
  const o = personAt(cam, 1.7, -0.6, 1.8);
  const lines = mtav(p.claim ?? 'ზეთივით | მუშაობს').split('|').map((x) => x.trim());
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg, overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}s`} look="day" />
        <Car3 cam={cam} night={0} lamp={0.6} shadow={1} design="sedan" paint={SILVER} at={[sx, 0]} yaw={yaw} />
        <Svg>{o ? <Owner uid={`${uid}o`} x={o.x} y={o.y} size={o.size} frame={t} light="day" pose="hold" hold="keys" face="worried" turn={-0.6} acts={[{at: hit, face: 'shock'}]} /> : null}</Svg>
        <Svg>{s ? <Seller uid={`${uid}m`} x={s.x} y={s.y} size={s.size} frame={t + 20} light="day" pose="confident" face="grin" turn={-0.4} acts={[{at: hit - 3, pose: 'point'}]} /> : null}</Svg>
      </div>
      <Hud>
        <div style={{position: 'absolute', left: 120, right: 120, top: 400, textAlign: 'center'}}>
          {lines.map((ln, i) => (
            <div key={i} className={TXT} style={{fontFamily: F.sans, fontWeight: 800, fontSize: 132, lineHeight: 1.02, color: C.ink, whiteSpace: 'nowrap'}}>
              {ln}
            </div>
          ))}
        </div>
      </Hud>
      <Haptic kind="rigid" at={hit} volume={0.3} />
    </PictureBand>
  );
};
