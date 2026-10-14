// A bench for the kit pieces (stills only): node src/qrpromo/build/stills.mjs --comp QrLab --props '{"what":"car"}'
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Car3} from './kit/car3d';
import {Figure, type Cast} from '../scenes/illo/figure';
import {silPal, SilPalCtx} from '../scenes/illo/sil';
import {DefsSvg} from '../scenes/illo/solid';
import {Passer} from './kit/passer';
import {mixW, POSES, Woman, womanPal} from './kit/woman';

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
  if (what === 'passer') {
    // passer-by looks: four casts side by side, walking (frames 0..29) then scanning (30..)
    const casts = [
      {is: 'man', seed: 3, gender: 'm', age: 'young', hair: 'side', outfit: 'bomber', beard: null, tone: 6, bottom: 'jeans', shoe: 'sneaker'},
      {is: 'man', seed: 9, gender: 'm', age: 'young', hair: 'textured', outfit: 'leather', beard: null, bottom: 'jeans', shoe: 'sneaker'},
      {is: 'man', seed: 3, gender: 'm', age: 'young', hair: 'fade', outfit: 'puffer', beard: null, tone: 6, bottom: 'jeans', shoe: 'sneaker'},
      {is: 'man', seed: 12, gender: 'm', age: 'young', hair: 'quiff', outfit: 'denim', beard: 'stubble', tone: 5, bottom: 'chinos', shoe: 'sneaker'},
    ] as const;
    const hues = ['#B89A84', '#B89A84', '#B89A84', '#B89A84'];
    const pose = t < 30 ? 'walk' : 'phoneLook';
    return (
      <AbsoluteFill style={{background: '#fff'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {casts.map((c, i) => (
            <Passer key={i} uid={`lp${i}`} cast={c as never} hue={hues[i]} x={150 + i * 260} y={1100} size={820} frame={t} pose={pose as never} turn={0.9} hold={pose === 'walk' ? null : 'phone'} />
          ))}
        </svg>
      </AbsoluteFill>
    );
  }
  if (what === 'woman4') {
    // v4's woman: a pose per 30 frames, full figure left, a close bust right, her reflection
    const names = Object.keys(POSES) as (keyof typeof POSES)[];
    const i = Math.min(names.length - 1, Math.floor(t / 30));
    const j = Math.min(names.length - 1, i + 1);
    const pose = mixW(POSES[names[i]], POSES[names[j]], (t % 30) / 30 > 0.85 ? ((t % 30) / 30 - 0.85) / 0.15 : 0);
    const pal = womanPal(1);
    return (
      <AbsoluteFill style={{background: '#3A2C27'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Woman uid="lw1" x={260} y={1880} size={1500} pose={pose} pal={pal} />
          <Woman uid="lw2" x={760} y={1900} size={1050} pose={pose} pal={pal} flip opacity={0.8} />
          <text x={40} y={60} fill="#fff" fontSize={40}>{names[i]}</text>
        </svg>
      </AbsoluteFill>
    );
  }
  if (what === 'womanClose') {
    const names = Object.keys(POSES) as (keyof typeof POSES)[];
    const i = Math.min(names.length - 1, Math.floor(t / 30));
    const pal = womanPal(1);
    return (
      <AbsoluteFill style={{background: '#3A2C27'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Woman uid="lw3" x={420} y={3900} size={3600} pose={POSES[names[i]]} pal={pal} />
          <text x={40} y={60} fill="#fff" fontSize={40}>{names[i]}</text>
        </svg>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{background: '#fff'}} />;
};
