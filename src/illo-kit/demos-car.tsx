// src/illo-kit/demos-car.tsx: the kit gallery's demos for phase 3 (the Car, the Handset, the Hand), stilled by
// tools/illo-gallery.mjs --kit (demos.tsx lists them). Each one composes the parts the way a scene would: on the picture
// band, with a backdrop where it helps to judge the part in its place.
import React from 'react';
import {C} from '../tokens';
import {Backdrop, Plate} from '../scenes/illo/backdrop';
import {Car, CAR_BODIES, type CarBody} from '../scenes/illo/car';
import {CallScreen, Handset, HandGrip} from '../scenes/illo/handset';
import {Hand, HAND_POSES} from '../scenes/illo/hand';
import type {Demo} from './demos';

const svg = (children: React.ReactNode) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);
const cap = (x: number, y: number, s: string) => (
  <text x={x} y={y} fontFamily="VinariMono, monospace" fontSize={20} fill={C.ink2}>
    {s}
  </text>
);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// the sedan driving along the highway: wheels turning with the road, the brake lights at frame 24
const sideDrive: Demo = {
  id: 'car-side-drive',
  group: 'car-sedan',
  row: 'side, driving, brake at 24',
  frames: [0, 14, 30, 60],
  band: true,
  render: (f, uid) => {
    const v = f < 24 ? 22 : 22 * Math.max(0.25, 1 - (f - 24) / 30);
    const dist = f < 24 ? f * 22 : 24 * 22 + (f - 24) * 22 * (1 - Math.min(1, (f - 24) / 60) * 0.6);
    const brake = clamp01((f - 24) / 3);
    const dive = f >= 24 ? 1.5 * Math.sin(Math.min(1, (f - 24) / 10) * Math.PI) * Math.exp(-(f - 24) / 30) : 0;
    return svg(
      <>
        <Backdrop kind="highway" uid={uid} frame={f} scroll={dist} />
        <Car uid={uid} x={540} y={1060} len={860} frame={f} roll={dist} speed={v / 26} lights={{head: 1, brake}} pitch={dive} />
      </>,
    );
  },
};
const sideNight: Demo = {
  id: 'car-side-night',
  group: 'car-sedan',
  row: 'side, night, beam, a driver slot',
  frames: [0, 20],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Plate time="night" />
        <Backdrop kind="city" uid={uid} frame={f} time="night" scroll={f * 16} />
        <Car
          uid={uid}
          x={500}
          y={1060}
          len={780}
          frame={f}
          speed={0.6}
          time="night"
          body="hatch"
          lights={{head: 1, tail: 1, beam: 1}}
          cabin={(b) => <ellipse cx={b.x + b.w * 0.62} cy={b.y + b.h * 0.62} rx={b.h * 0.3} ry={b.h * 0.36} fill={C.il6} />}
        />
      </>,
    ),
};
const rearNight: Demo = {
  id: 'car-rear-night',
  group: 'car-sedan',
  row: 'rear, night, indicator + brake at 20',
  frames: [0, 4, 24, 50],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Plate time="night" />
        <Backdrop kind="city" uid={uid} frame={f} time="night" scroll={f * 2} />
        <Car uid={uid} view="rear" x={540} y={1150} len={1560} frame={f} speed={0.4} time="night" lights={{tail: 1, brake: clamp01((f - 20) / 3), left: f < 20 ? 1 : 0}} />
      </>,
    ),
};
const rearDay: Demo = {
  id: 'car-rear-day',
  group: 'car-sedan',
  row: 'rear and front, day',
  frames: [0, 30],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Car uid={uid} view="rear" x={300} y={1120} len={1080} frame={f} />
        <Car uid={uid} view="front" x={790} y={1120} len={1080} frame={f} lights={{head: 1}} />
        {cap(140, 640, 'rear')}
        {cap(700, 640, 'front, lights on')}
      </>,
    ),
};
const topView: Demo = {
  id: 'car-top',
  group: 'car-sedan',
  row: 'top: sedan and suv, a turn',
  frames: [0, 30],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Car uid={uid} view="top" x={340} y={880} len={820} frame={f} lights={{head: 1}} />
        <Car uid={uid} view="top" body="suv" x={760} y={880} len={820} frame={f} heading={-8 + f * 0.3} lights={{right: 1}} />
      </>,
    ),
};
const states: Demo = {
  id: 'car-states',
  group: 'car-sedan',
  row: 'dirty and dented, parked (hazards)',
  frames: [0, 4],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Car uid={uid} x={540} y={760} len={820} frame={f} dirt={0.8} dent={1} lights={{hazard: 1}} />
        <Car uid={uid} x={540} y={1250} len={820} frame={f} dir={-1} paint={1} />
        {cap(140, 460, 'dirt 0.8, dent 1, hazards')}
        {cap(140, 950, 'paint 1, facing left')}
      </>,
    ),
};
const bodies: Demo = {
  id: 'car-bodies',
  group: 'car-bodies',
  row: 'suv, hatch, coupe, racer',
  frames: [0, 20],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {(['suv', 'hatch', 'coupe', 'racer'] as CarBody[]).map((b, i) => (
          <g key={b}>
            <Car uid={uid} body={b} x={540} y={600 + i * 230} len={640} frame={f} speed={0.5} number={b === 'racer' ? 7 : undefined} paint={b === 'coupe' ? 5 : b === 'racer' ? 1 : 3} />
            {cap(140, 410 + i * 230, b)}
          </g>
        ))}
      </>,
    ),
};
const bodiesEnds: Demo = {
  id: 'car-bodies-ends',
  group: 'car-bodies',
  row: 'rear views, top views',
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {CAR_BODIES.map((b, i) => (
          <Car key={b} uid={uid} body={b} view="rear" x={150 + i * 195} y={720} len={460} frame={f} lights={{tail: 1}} />
        ))}
        {CAR_BODIES.map((b, i) => (
          <Car key={b} uid={uid} body={b} view="top" x={150 + i * 195} y={1070} len={480} frame={f} number={b === 'racer' ? 7 : undefined} />
        ))}
      </>,
    ),
};

// the phone in a hand: it rings (bursts every 30 frames), the thumb answers at 40, the timer starts
const callDemo = (id: string, row: string, state: 'ringing' | 'answer' | 'decline', at: number): Demo => ({
  id,
  group: 'handset',
  row,
  frames: [0, 6, 36, 46, 80],
  band: true,
  render: (f, uid) => {
    const pl = {x: 540, y: 880, w: 470, tilt: -4, frame: f, ring: {from: 2, until: state === 'ringing' ? undefined : at}};
    const thumb = state === 'answer' ? (f < at - 8 ? 0 : f < at ? (f - at + 8) / 8 : Math.max(0, 1 - (f - at - 4) / 8)) : 0;
    const lit = clamp01(f / 8) * 0.4 + 0.6;
    return svg(
      <>
        <HandGrip uid={uid} part="back" {...pl} />
        <Handset uid={uid} {...pl} lit={lit} screen={(w, h) => <CallScreen uid={uid} w={w} h={h} frame={f} name="დედა" state={state} at={at} />} />
        <HandGrip uid={uid} part="front" {...pl} thumb={thumb} />
      </>,
    );
  },
});
const phoneDesk: Demo = {
  id: 'handset-desk',
  group: 'handset',
  row: 'off, waking, long name',
  frames: [0, 4, 12],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        <Handset uid={uid} x={300} y={870} w={330} tilt={-8} frame={f} lit={0} />
        <Handset uid={uid} x={780} y={870} w={330} tilt={6} frame={f} lit={clamp01(f / 8)} ring={{from: 0}} screen={(w, h) => <CallScreen uid={uid} w={w} h={h} frame={f} name="უცნობი ნომერი" />} />
      </>,
    ),
};
const hands: Demo = {
  id: 'hand-poses',
  group: 'hand',
  row: HAND_POSES.join(', '),
  frames: [0],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {HAND_POSES.map((pose, i) => (
          <g key={pose}>
            <Hand uid={uid} pose={pose} x={220 + (i % 3) * 320} y={i < 3 ? 860 : 1330} size={300} />
            {cap(140 + (i % 3) * 320, i < 3 ? 470 : 960, pose)}
          </g>
        ))}
      </>,
    ),
};
const tap: Demo = {
  id: 'hand-tap',
  group: 'hand',
  row: 'point, tapping a phone (press at 10)',
  frames: [0, 12, 30],
  band: true,
  render: (f, uid) => {
    const press = f < 8 ? 0 : f < 12 ? (f - 8) / 4 : Math.max(0, 1 - (f - 12) / 6);
    return svg(
      <>
        <Handset uid={uid} x={540} y={760} w={420} frame={f} lit={1} screen={(w, h) => <CallScreen uid={uid} w={w} h={h} frame={f} name="ხელოსანი" />} />
        <Hand uid={uid} pose="point" x={700} y={1330} size={460} angle={-14} press={press} />
      </>,
    );
  },
};

export const CAR_DEMOS: Demo[] = [
  sideDrive,
  sideNight,
  rearNight,
  rearDay,
  topView,
  states,
  bodies,
  bodiesEnds,
  callDemo('handset-ring', 'ringing in a hand', 'ringing', 999),
  callDemo('handset-answer', 'answered at 40 (the thumb taps)', 'answer', 40),
  callDemo('handset-decline', 'declined at 40', 'decline', 40),
  phoneDesk,
  hands,
  tap,
];
