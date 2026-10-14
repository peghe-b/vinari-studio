// The navigator promo (1080x1920, 30 fps): its shots in order, each a block of the timeline (src/navpromo/timeline.json,
// made by build/plan.py from the measured voices), the studio's subtitle line on top, and the film's whole sound as one
// mastered track (public/vo/navpromo/mix.wav). No meta bar, no category, no number, no caption bands (the owner).
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {S0Dive, S1Wide, S2Face, S3Phone, S4Spin, S5Bars, S6Top, S7Curse, S8Arms} from './Forest';
import {C, rgba} from '../tokens';
import {clamp, E, fr, shot, TL} from './lib';
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
  {ids: ['s0'], C: S0Dive},
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
  {ids: ['voices'], C: Voices, iris: {x: 540, y: 745}},
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

/** the iris cut: the incoming block opens out of a circle at its point of interest. The circle grows from nothing to the
 *  frame's farthest corner over IRIS frames on a soft ease, so it reads as a circle on every frame; a soft inner shadow on
 *  its edge (the outgoing frame's lip) keeps the edge visible even where both pictures are near-white. The block before an
 *  iris keeps playing under it (its post covers the whole opening, never the black stage). */
const IRIS = 14;
const Iris: React.FC<{x: number; y: number; children: React.ReactNode}> = ({x, y, children}) => {
  const t = useCurrentFrame();
  const k = clamp(t / IRIS);
  if (k >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const far = Math.max(Math.hypot(x, y), Math.hypot(1080 - x, y), Math.hypot(x, 1920 - y), Math.hypot(1080 - x, 1920 - y)) + 8;
  const r = Math.max(0.5, far * E.sine(k));
  const lip = Math.min(44, r * 0.45);
  const a = 0.2 * (1 - E.in2(k));
  return (
    <AbsoluteFill style={{clipPath: `circle(${r.toFixed(1)}px at ${x}px ${y}px)`}}>
      {children}
      <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(circle ${r.toFixed(1)}px at ${x}px ${y}px, ${rgba(C.shade, 0)} ${(r - lip).toFixed(1)}px, ${rgba(C.shade, a * 0.35)} ${(r - lip * 0.3).toFixed(1)}px, ${rgba(C.shade, a)} ${r.toFixed(1)}px)`}} />
    </AbsoluteFill>
  );
};

/** the frames where the picture cuts (each block's first frame): a subtitle line ends on its own scene's cut */
const CUTS = BLOCKS.map((b) => fr(shot(b.ids[0]).from));

export const NavPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {BLOCKS.map((b, i) => {
      const from = fr(shot(b.ids[0]).from);
      const to = fr(shot(b.ids[b.ids.length - 1]).to);
      const next = BLOCKS[i + 1];
      const post = Math.max(b.post ?? 0, next?.iris ? IRIS + 1 : 0);
      const Comp = b.C;
      return (
        <Sequence key={b.ids[0]} from={from} durationInFrames={to - from + post} layout="none">
          <AbsoluteFill>{b.iris ? <Iris x={b.iris.x} y={b.iris.y}><Comp /></Iris> : <Comp />}</AbsoluteFill>
        </Sequence>
      );
    })}
    <Subs cuts={CUTS} />
    {audio ? <Audio src={staticFile('vo/navpromo/mix.wav')} /> : null}
  </AbsoluteFill>
);

export const TOTAL_S = TL.total;
