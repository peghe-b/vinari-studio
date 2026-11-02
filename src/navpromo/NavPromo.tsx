// The navigator promo (1080x1920, 30 fps): its shots in order, each a block of the timeline (src/navpromo/timeline.json,
// made by build/plan.py from the measured voices), the studio's subtitle line on top, and the film's whole sound as one
// mastered track (public/vo/navpromo/mix.wav). No meta bar, no category, no number, no caption bands (the owner).
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {S1Wide, S2Face, S3Phone, S4Spin, S5Bars, S6Top, S7Curse, S8Arms} from './Forest';
import {fr, shot, TL} from './lib';
import {RevealSeq} from './Reveal';
import {Subs} from './Subs';
import {MountainSeq} from './Mountain';
import {Voices} from './Voices';
import {Streets, Settings} from './PhoneShots';
import {Lanes, Roundabout} from './Diagram';
import {CameraRoad} from './CameraRoad';
import {CarPlayBeat} from './CarPlayBeat';
import {Arrival} from './Arrival';
import {Redemption} from './Redemption';
import {End} from './End';

type Block = {ids: string[]; C: React.FC; pre?: number; post?: number; iris?: {x: number; y: number}};
const BLOCKS: Block[] = [
  {ids: ['s1'], C: S1Wide},
  {ids: ['s2'], C: S2Face},
  {ids: ['s3'], C: S3Phone},
  {ids: ['s4'], C: S4Spin},
  {ids: ['s5'], C: S5Bars},
  {ids: ['s6'], C: S6Top},
  {ids: ['s7'], C: S7Curse},
  {ids: ['s8'], C: S8Arms},
  {ids: ['reveal', 'slam', 'claim'], C: RevealSeq, post: 10},
  {ids: ['mountain', 'why'], C: MountainSeq, iris: {x: 540, y: 830}, post: 10},
  {ids: ['voices'], C: Voices, iris: {x: 540, y: 900}},
  {ids: ['streets'], C: Streets},
  {ids: ['round'], C: Roundabout},
  {ids: ['lane'], C: Lanes},
  {ids: ['camera'], C: CameraRoad},
  {ids: ['settings'], C: Settings},
  {ids: ['carplay'], C: CarPlayBeat},
  {ids: ['arrival'], C: Arrival},
  {ids: ['redeem'], C: Redemption},
  {ids: ['end'], C: End},
];

/** the incoming block opens out of a circle at its point of interest (the iris cut, 9 frames) */
const Iris: React.FC<{x: number; y: number; children: React.ReactNode}> = ({x, y, children}) => {
  const t = useCurrentFrame();
  const k = Math.min(1, t / 9);
  const r = k >= 1 ? 3000 : 2300 * (1 - (1 - k) ** 3);
  return <AbsoluteFill style={{clipPath: k >= 1 ? undefined : `circle(${r}px at ${x}px ${y}px)`}}>{children}</AbsoluteFill>;
};

export const NavPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {BLOCKS.map((b) => {
      const from = fr(shot(b.ids[0]).from);
      const to = fr(shot(b.ids[b.ids.length - 1]).to);
      const post = b.post ?? 0;
      const C = b.C;
      return (
        <Sequence key={b.ids[0]} from={from} durationInFrames={to - from + post} layout="none">
          <AbsoluteFill>{b.iris ? <Iris x={b.iris.x} y={b.iris.y}><C /></Iris> : <C />}</AbsoluteFill>
        </Sequence>
      );
    })}
    <Subs />
    {audio ? <Audio src={staticFile('vo/navpromo/mix.wav')} /> : null}
  </AbsoluteFill>
);

export const TOTAL_S = TL.total;
