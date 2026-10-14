// 14 walk (v4): the evening street, the same street the stranger stood in, her car at the kerb under the lamp, the card
// behind its glass. She walks in along the pavement from the right, calm, the keys in her hand, and on the fob her car
// blinks its lights twice: „შენი ნომრის გარეშე." (she moves it; nobody had her number).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, E, ev, fr, lerp, prog, shot} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street as StreetWorld, viewOf} from './kit/street';
import {Woman, womanPal, POSES, type WPose} from './kit/woman';
import type {Pt} from '../scenes/illo/rig';

// v4 fix (the art director: "empty for its first 1.2 s, she shows for 0.5 s, small, at the right edge; the car cut on the
// left"): the whole car, and she walks in from the right on the near pavement from the first frame, a third of the frame
// tall, toward her car's front corner; the fob blinks it in the middle of the shot
const W_CAM0: CarCam = {pos: [7.5, 1.55, 13.5], target: [0.2, 0.95, 0.8], fov: 31};
const W_CAM1: CarCam = {pos: [7.4, 1.55, 13.2], target: [0.25, 0.95, 0.85], fov: 30};
const mixCam = (a: CarCam, b: CarCam, k: number): CarCam => ({
  pos: [lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k)],
  target: [lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k)],
  fov: lerp(a.fov, b.fov, k),
});
const FROM: Pt = [3.2, 3.02];
const TO: Pt = [2.45, 3.5];
const HER_H = 1.72;
const CYCLE = 0.6; // v4: no foot slides: a stance foot moves back by the stride (210 u of 1.72 m = 0.36 m) in 0.6 of a cycle
const LAMPS: [number, number, number][] = [
  [0.68, 0.68, 2.12],
  [-0.68, 0.68, 2.12],
];

export const Walk: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('walk').from);
  const len = fr(shot('walk').to) - base;
  const fobAt = fr(ev('fob')) - base;
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(W_CAM0, W_CAM1, k);
  const V = viewOf(cam);
  // she walks the whole shot, slowing a little toward the end
  const wk = clamp(t / Math.max(1, len));
  const along = 0.8 * wk + 0.2 * E.out2(wk);
  const pos: Pt = [lerp(FROM[0], TO[0], along), lerp(FROM[1], TO[1], along)];
  const dist = Math.hypot(TO[0] - FROM[0], TO[1] - FROM[1]) * along;
  const phase = 0.2 + dist / CYCLE;
  const foot = V.pt([pos[0], 0.14, pos[1]]);
  const head = V.pt([pos[0], 0.14 + HER_H, pos[1]]);
  const swing = Math.sin(2 * Math.PI * phase);
  const pose: WPose = {
    ...POSES.stand,
    head: 4,
    neck: 2,
    legs: phase,
    stride: 210,
    bob: -6 * (0.5 - 0.5 * Math.cos(4 * Math.PI * phase)),
    near: {to: [70, -560], bend: -1, hand: 'hold', ha: 20},
    far: {to: [-30 - 40 * swing, -470], bend: -1, hand: 'relax', ha: -4},
    hold: 'keys',
    ex: {lid: 0.2, smile: 0.4, brow: 0.2, browTilt: 0, curve: 0.5, open: 0, look: 0},
  };
  const fob = t - fobAt;
  const blink = fob >= 0 && fob < 20 ? ((fob >= 0 && fob < 5) || (fob >= 9 && fob < 14) ? 1 : 0) : 0;
  const lampPts = LAMPS.map((p) => projectCar(cam, p));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#121014', overflow: 'hidden'}}>
      <StreetWorld cam={cam} uid="wk" look="night" />
      <Car3 cam={cam} night={1} card cardK={1} glassA={0.6} lamp={blink} street={0.8} shadow={1.1} />
      {blink > 0 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="wkb" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFF2C8" stopOpacity={1} />
              <stop offset="0.25" stopColor="#FFB547" stopOpacity={0.7} />
              <stop offset="1" stopColor="#FF9A1F" stopOpacity={0} />
            </radialGradient>
          </defs>
          {lampPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={70} fill="url(#wkb)" />
          ))}
        </svg>
      ) : null}
      {foot && head ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Woman uid="wkw" x={foot[0]} y={foot[1]} size={foot[1] - head[1]} pose={pose} pal={womanPal(1.05)} flip rim={0.8} />
        </svg>
      ) : null}
    </div>
  );
};
