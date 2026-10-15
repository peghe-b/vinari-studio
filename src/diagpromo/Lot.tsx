// 18 lot: a used car for sale by a Tbilisi street in the day (kit/street.tsx's white world): a silver 2020s saloon at the
// kerb; the seller, all smiles, presents it with an open hand: „მანქანის ყიდვამდეც შეამოწმებ," (the next shot's scanner finds the check light he hid).
import React from 'react';
import {E, prog} from './lib';
import {useShot, mixCam} from './Act1';
import {Car3, type CarCam} from './kit/car3d';
import {Street, viewOf} from './kit/street';
import {Seller} from './kit/people';

const L_CAM0: CarCam = {pos: [7.2, 1.55, 12.6], target: [0.1, 1.0, 0.4], fov: 33};
const L_CAM1: CarCam = {pos: [6.8, 1.5, 12.0], target: [0.15, 1.0, 0.5], fov: 33};

export const LotShot: React.FC = () => {
  const {t, len, L} = useShot('lot');
  const sAt = L('seller');
  const cam = mixCam(L_CAM0, L_CAM1, E.inOut(prog(t, 0, len)));
  const V = viewOf(cam);
  const f = V.pt([2.35, 0.14, 2.9]);
  const hd = V.pt([2.35, 0.14 + 1.8, 2.9]);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <Street cam={cam} uid="lt" nearTree={false} />
      <Car3 cam={cam} night={0} paint="#C3C8CF" shadow={1} lamp={0.3} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {f && hd ? (
          <Seller uid="ls" x={f[0]} y={f[1]} size={f[1] - hd[1]} frame={t} pose="confident" face="smile" turn={-0.6} light="day" acts={[{at: sAt, pose: 'offer', face: 'grin'}]} />
        ) : null}
      </svg>
    </div>
  );
};
