// A bench for the kit pieces (stills only): node src/diagpromo/build/stills.mjs --comp DiagLab --props '{"what":"garage"}'
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Car3, type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {viewOf} from './kit/street';
import {Mechanic, Owner, Seller} from './kit/people';
import type {Pose} from '../scenes/illo/poses';

export const Lab: React.FC<{what?: string}> = ({what = 'garage'}) => {
  const t = useCurrentFrame();
  if (what === 'garage' || what === 'garageDay') {
    const night = what === 'garage';
    const cams: CarCam[] = [
      {pos: [0.6, 1.2, 10.6], target: [0.0, 1.35, 0.3], fov: 36},
      {pos: [1.6, 1.15, 10.8], target: [0.0, 1.4, 0.3], fov: 36},
      {pos: [0.9, 1.0, 9.6], target: [0.0, 1.5, 0.3], fov: 38},
      {pos: [1.0, 1.3, 6.5], target: [-3.0, 0.75, 3.2], fov: 36},
    ];
    const ci = Math.min(cams.length - 1, Math.floor(t / 30));
    const cam = cams[ci];
    const V = viewOf(cam);
    const lift = night ? 1.8 : 0;
    const person = (x: number, z: number, hgt: number) => {
      const f = V.pt([x, 0, z]);
      const hd = V.pt([x, hgt, z]);
      return f && hd ? {x: f[0], y: f[1], size: f[1] - hd[1]} : null;
    };
    const m = ci === 3 ? person(-3.0, 3.4, 1.76) : person(0.45, 1.3, 1.76);
    const o = person(-1.0, 2.6, 1.8);
    return (
      <AbsoluteFill style={{background: night ? '#1A1512' : '#EEE'}}>
        <Garage cam={cam} look={night ? 'night' : 'day'} uid="lb" lift={lift} />
        <Car3 cam={cam} night={night ? 1 : 0} street={night ? 0.7 : 0} lift={lift} shadow={1} />
        <Garage cam={cam} look={night ? 'night' : 'day'} uid="lf" layer="front" lift={lift} workLamp={night ? [0.1, 1.62, 1.7] : null} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {o && ci < 3 ? <Owner uid="lo" x={o.x} y={o.y} size={o.size} frame={t} pose="crossArms" turn={0.6} light={night ? 'garage' : 'day'} /> : null}
          {m ? <Mechanic uid="lm" x={m.x} y={m.y} size={m.size} frame={t} pose="point" turn={ci === 3 ? 0.85 : -0.8} hold="wrench" light={night ? 'garage' : 'day'} /> : null}
        </svg>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1405, height: 100, background: 'rgba(255,0,0,0.12)'}} />
      </AbsoluteFill>
    );
  }
  if (what === 'people') {
    const poses: Pose[] = ['stand', 'point', 'crossArms', 'shrug', 'handsHead', 'facepalm', 'offer', 'phoneLook', 'slumped', 'hold', 'confident', 'reject'];
    const pose = poses[Math.min(poses.length - 1, Math.floor(t / 10))];
    return (
      <AbsoluteFill style={{background: '#2A221C'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Mechanic uid="p1" x={200} y={900} size={760} frame={t} pose={pose} turn={0.9} hold="wrench" />
          <Owner uid="p2" x={540} y={900} size={760} frame={t} pose={pose} turn={-0.9} hold={pose === 'phoneLook' || pose === 'offer' ? 'phone' : null} />
          <Seller uid="p3" x={880} y={900} size={760} frame={t} pose={pose} turn={-0.6} light="day" />
          <Owner uid="p4" x={300} y={1900} size={1500} crop="bust" frame={t} pose={pose} turn={0.9} hold={pose === 'phoneLook' || pose === 'offer' ? 'phone' : null} light="morning" />
          <Mechanic uid="p5" x={800} y={1900} size={1500} crop="bust" frame={t} pose={pose} turn={-0.9} light="day" />
          <text x={40} y={60} fill="#fff" fontSize={40}>{pose}</text>
        </svg>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{background: '#fff'}} />;
};
