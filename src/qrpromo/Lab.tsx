// A bench for the kit pieces (stills only): node src/qrpromo/build/stills.mjs --comp QrLab --props '{"what":"car"}'
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Car3} from './kit/car3d';
import {Figure, type Cast} from '../scenes/illo/figure';
import {silPal, SilPalCtx} from '../scenes/illo/sil';
import {DefsSvg} from '../scenes/illo/solid';
import {cam, Room} from './kit/room';

const HER: Cast = {is: 'woman', seed: 21, gender: 'f', age: 'young', hair: 'long', outfit: 'blouse', extras: ['earrings']} as Cast;
const WARM = (time: 'day' | 'night' | 'dusk', level: number) => silPal({light: false, hue: '#E9A46A', b: '#8A6A55', time, level});


export const Lab: React.FC<{what?: string}> = ({what = 'car'}) => {
  const t = useCurrentFrame();
  if (what === 'car' || what === 'carNight') {
    const night = what === 'carNight' ? 1 : 0;
    const views = [
      [0.55, 15, 3.4, 30],
      [-0.55, 15, 3.4, 30],
      [0.5, 7.2, 3.6, 30],
      [0.9, 6.5, 1.4, 34],
    ];
    const v = views[Math.min(views.length - 1, Math.floor(t / 100))];
    const a = v[0];
    const r = v[1];
    return (
      <AbsoluteFill style={{background: night ? '#1a1612' : '#fff'}}>
        <Car3 cam={{pos: [Math.sin(a) * r, v[2], Math.cos(a) * r], target: [0, 0.6, 0.2], fov: v[3]}} night={night} note={1} card cardK={1} lamp={night} />
      </AbsoluteFill>
    );
  }
  if (what === 'woman') {
    const poses = ['stand', 'facepalm', 'handsHead', 'phoneLook', 'phoneEar', 'walk', 'shrug', 'crossArms'];
    const pose = poses[Math.min(poses.length - 1, Math.floor(t / 30))];
    return (
      <AbsoluteFill style={{background: '#2B2220'}}>
        <DefsSvg uid="lab" />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <SilPalCtx.Provider value={WARM}>
            <Figure uid="lab" cast={HER} x={300} y={900} size={760} frame={t} pose={pose as never} face="neutral" turn={0.9} time="night" hold={pose === 'walk' ? 'keys' : pose.startsWith('phone') ? 'phone' : null} />
            <Figure uid="lab" cast={HER} x={760} y={1250} size={1900} crop="bust" frame={t} pose={pose as never} face="smile" turn={0.6} time="night" />
            <Figure uid="lab" cast={HER} x={300} y={1850} size={760} frame={t} pose={pose as never} face="worried" turn={-0.5} time="dusk" />
          </SilPalCtx.Provider>
          <text x={40} y={60} fill="#fff" fontSize={40}>{pose}</text>
        </svg>
      </AbsoluteFill>
    );
  }
  if (what === 'room') {
    // the room at the groan's close-up and the wide, a pose per 30 frames: [pose, face, lean, scale]
    const opts: [string, string, number, number][] = [
      ['phoneEar', 'neutral', 0, 1.0],
      ['stand', 'worried', -9, 1.32],
      ['shrug', 'angry', 3, 1.32],
      ['armsUp', 'angry', 0, 1.32],
      ['facepalm', 'angry', 3, 1.32],
      ['stand', 'smile', 0, 1.12],
      ['handsHead', 'meh', 0, 1.0],
    ];
    const o = opts[Math.min(opts.length - 1, Math.floor(t / 30))];
    return (
      <AbsoluteFill style={{background: '#1E1714'}}>
        <div style={{position: 'absolute', inset: 0, transform: cam(o[3], o[3] > 1 ? 420 : 640, o[3] > 1 ? 700 : 1000), transformOrigin: '0 0'}}>
          <Room uid="lab" frame={t + 200} pose={o[0] as never} face={o[1] as never} lean={o[2]} ring={0.6} faceDown={o[1] === 'smile'} />
        </div>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{background: '#fff'}} />;
};
