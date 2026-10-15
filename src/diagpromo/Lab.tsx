// A bench for the kit pieces (stills only): node src/diagpromo/build/stills.mjs --comp DiagLab --props '{"what":"car"}' --frames 0,1,2
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Car3, type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {viewOf} from './kit/street';
import {Mechanic, Owner, Seller} from './kit/people';
import type {Pose} from '../scenes/illo/poses';

export const Lab: React.FC<{what?: string}> = ({what = 'car'}) => {
  const t = useCurrentFrame();
  if (what === 'car') {
    const looks: {cam: CarCam; night: number; hood: number; bg: string; garage?: 'night' | 'day'}[] = [
      {cam: {pos: [-3.2, 3.1, 6.4], target: [0, 0.9, 1.3], fov: 40}, night: 1, hood: 1, bg: '#15110E', garage: 'night'},
      {cam: {pos: [8.6, 1.6, 2.0], target: [0, 0.75, 0.0], fov: 36}, night: 0, hood: 0, bg: '#FFFFFF'},
      {cam: {pos: [5.2, 1.7, 8.8], target: [0, 0.8, 0.2], fov: 34}, night: 0, hood: 0, bg: '#F2F2F2'},
      {cam: {pos: [-0.4, 3.4, 3.2], target: [0, 0.95, 1.55], fov: 34}, night: 1, hood: 1, bg: '#15110E'},
      {cam: {pos: [-4.6, 1.2, -6.4], target: [0, 0.8, 0], fov: 34}, night: 0, hood: 0, bg: '#EDEDED'},
    ];
    const L = looks[Math.min(looks.length - 1, t)];
    const V = viewOf(L.cam);
    const person = (x: number, z: number, hgt: number) => {
      const f = V.pt([x, 0, z]);
      const hd = V.pt([x, hgt, z]);
      return f && hd ? {x: f[0], y: f[1], size: f[1] - hd[1]} : null;
    };
    const m = t === 0 ? person(0.2, 2.95, 1.74) : null;
    const o = t === 0 ? person(-1.5, 1.2, 1.8) : null;
    return (
      <AbsoluteFill style={{background: L.bg}}>
        {L.garage ? <Garage cam={L.cam} look={L.garage} uid="lb" lift={0} /> : null}
        <Car3 cam={L.cam} night={L.night} street={L.night ? 0.5 : 0} lift={0} shadow={1} hood={L.hood} bayLamp={L.hood} lamp={0.3} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {o ? <Owner uid="lo" x={o.x} y={o.y} size={o.size} frame={t} pose="crossArms" turn={0.6} light="garage" /> : null}
          {m ? <Mechanic uid="lm" x={m.x} y={m.y} size={m.size} frame={t} pose="hold" hold="wrench" turn={-0.9} bend={30} light="garage" /> : null}
        </svg>
      </AbsoluteFill>
    );
  }
  if (what === 'people') {
    const poses: Pose[] = ['stand', 'point', 'crossArms', 'shrug', 'handsHead', 'facepalm', 'offer', 'phoneLook', 'slumped', 'hold', 'confident', 'reject', 'phoneEar', 'pointYou'];
    const pose = poses[Math.min(poses.length - 1, t)];
    return (
      <AbsoluteFill style={{background: '#2A221C'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Mechanic uid="p1" x={230} y={900} size={760} frame={t * 7} pose={pose} turn={0.9} hold={pose === 'phoneEar' ? 'phone' : 'wrench'} />
          <Owner uid="p2" x={560} y={900} size={760} frame={t * 7} pose={pose} turn={-0.9} hold={pose === 'phoneLook' || pose === 'offer' ? 'phone' : null} />
          <Seller uid="p3" x={880} y={900} size={760} frame={t * 7} pose={pose} turn={-0.6} light="day" />
          <Mechanic uid="p5" x={330} y={1880} size={1500} crop="bust" frame={t * 7} pose={pose} turn={0.9} light="garage" />
          <Mechanic uid="p6" x={800} y={1880} size={900} frame={t * 7} pose={pose} turn={-0.85} light="day" />
          <text x={40} y={60} fill="#fff" fontSize={40}>{pose}</text>
        </svg>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{background: '#fff'}} />;
};
