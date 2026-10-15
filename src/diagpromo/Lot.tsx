// 18 lot: used cars for sale along a Tbilisi kerb in the day (kit/street.tsx's white world): three 2020s saloons in a row, all
// whole in the frame; the seller, all smiles, presents the silver one with an open hand: „მანქანის ყიდვამდეც შეამოწმებ,". v2
// (the art director: one car, no check light ever, a cut-off tree, empty pavement): the row of cars, the camera lower on them,
// no tree at the frame's edge, and in the last beat the amber check lamp glows on the silver car's cluster through its
// windscreen, magnified in a small round lens beside it (the next shot's scanner finds what he hid).
import React from 'react';
import {mtav} from '../lib/format';
import {C, F, rgba} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {useShot, mixCam} from './Act1';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street, viewOf} from './kit/street';
import {Seller} from './kit/people';
import {ENGINE_D} from './kit/cluster';

const L_CAM0: CarCam = {pos: [5.0, 2.8, 16.0], target: [-0.5, 0.6, -3.0], fov: 34};
const L_CAM1: CarCam = {pos: [4.95, 2.77, 15.75], target: [-0.5, 0.6, -3.0], fov: 34};
/** the row along the kerb: the hero (silver) in front, two more behind it */
const ROW: {at: [number, number]; paint: string}[] = [
  {at: [0, -11.2], paint: '#3A3D44'},
  {at: [0, -5.6], paint: '#E9EAEC'},
];
/** the cluster's lamp inside the silver car (metres): behind the wheel, under the windscreen */
const LAMP_3D: [number, number, number] = [0.37, 0.98, 0.3];

export const LotShot: React.FC = () => {
  const {t, len, L} = useShot('lot');
  const sAt = L('seller');
  const cam = mixCam(L_CAM0, L_CAM1, E.inOut(prog(t, 0, len)));
  const V = viewOf(cam);
  const f = V.pt([2.3, 0.14, 2.6]);
  const hd = V.pt([2.3, 0.14 + 1.8, 2.6]);
  const lampAt = len - 22;
  const lampK = E.out(prog(t, lampAt, 8));
  const lens = sp(t, lampAt + 3, 170, 16);
  const lp = projectCar(cam, LAMP_3D);
  const flick = lampK * (0.85 + 0.15 * Math.sin((t - lampAt) / 2.5));
  const lx = lp.x + 70;
  const ly = lp.y - 250;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <Street cam={cam} uid="lt" nearTree={false} farTrees={false} />
      {ROW.map((r) => (
        <Car3 key={r.at[1]} cam={cam} night={0} paint={r.paint} shadow={1} lamp={0.15} at={r.at} />
      ))}
      <Car3 cam={cam} night={0} paint="#C3C8CF" shadow={1} lamp={0.3} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="ltAmber" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFB020" stopOpacity={0.85} />
            <stop offset="0.35" stopColor="#FF9A10" stopOpacity={0.3} />
            <stop offset="1" stopColor="#FF9A10" stopOpacity={0} />
          </radialGradient>
        </defs>
        {lampK > 0.01 ? <circle cx={lp.x} cy={lp.y} r={34} fill="url(#ltAmber)" opacity={flick} /> : null}
        {f && hd ? (
          <Seller uid="ls" x={f[0]} y={f[1]} size={f[1] - hd[1]} frame={t} pose="confident" face="smile" turn={-0.6} light="day" acts={[{at: sAt, pose: 'offer', face: 'grin'}, {at: sAt + 26, pose: 'thumbsUp', face: 'grin'}]} />
        ) : null}
      </svg>
      {lens > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: lx - 92,
            top: ly - 92,
            width: 184,
            height: 184,
            borderRadius: 92,
            background: '#15171C',
            boxShadow: `0 18px 44px ${rgba(C.shade, 0.22)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: clamp(lens * 1.6),
            transform: `scale(${lerp(0.6, 1, clamp(lens))})`,
          }}
        >
          <svg width={104} height={104} viewBox="0 0 24 24" style={{filter: 'drop-shadow(0 0 10px rgba(255,170,30,0.65))'}}>
            <path d={ENGINE_D} fill="none" stroke="#FFAE1A" strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div style={{marginTop: -4, fontFamily: F.sans, fontWeight: 600, fontSize: 24, color: '#FFC266', letterSpacing: '0.04em'}}>{mtav('ჩეკი')}</div>
        </div>
      ) : null}
    </div>
  );
};
