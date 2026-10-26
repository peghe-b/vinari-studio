// src/scenes/kit/cuts.tsx: clean in-scene transitions between two pictures of one Film scene (2026-10-19; our own code after
// remocn's push-through, focus-pull, shared-axis-z, slide-swap and scale-down-fade, MIT). The film's planner still picks
// the cuts BETWEEN scenes (docs/style.md, Motion); these are for a step inside your own Film, the promos' fast cuts every 1.5 to
// 2.5 s. Frame driven, nothing random, no glitch, no flash.
//
//   <Cut kind="push" at={f} dur={12} a={<StepOne/>} b={<StepTwo/>} />
//     kind  push   the old picture rushes past the camera, the new one comes up from behind it
//           focus  a focus pull: the old one blurs away while the new one sharpens in
//           axis   the shared Z axis: the old one grows a touch and fades, the new one settles from a touch smaller
//           slide  the old one slides out to the left (dir -1: right), the new one slides in after it
//           scale  the old one sinks back and fades, the new one fades in at full size
//   Before `at` only `a` is drawn, after `at + dur` only `b`. Never put a 3D canvas (Phone3, Car3, a scene in WebGL) inside
//   a Cut: it would mount twice. Cut between two 2D pictures, or keep the 3D picture outside and cut what lies over it.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, E, lerp} from './lib';

export type CutKind = 'push' | 'focus' | 'axis' | 'slide' | 'scale';

const box = (style: React.CSSProperties, children: React.ReactNode) => <div style={{position: 'absolute', inset: 0, ...style}}>{children}</div>;

/** The two pictures' styles at progress k (0 = a alone, 1 = b alone). */
export const cutStyles = (kind: CutKind, k: number, dir = 1): [React.CSSProperties, React.CSSProperties] => {
  const q = clamp(k);
  const io = E.inOut(q);
  switch (kind) {
    case 'push':
      return [
        {transform: `scale(${lerp(1, 1.34, E.in2(q)).toFixed(4)})`, opacity: 1 - E.in2(clamp(q * 1.4)), filter: `blur(${(E.in2(q) * 10).toFixed(2)}px)`},
        {transform: `scale(${lerp(0.82, 1, E.out(q)).toFixed(4)})`, opacity: E.out(clamp((q - 0.12) / 0.88))},
      ];
    case 'focus':
      return [
        {opacity: 1 - io, filter: `blur(${(io * 18).toFixed(2)}px)`},
        {opacity: io, filter: `blur(${((1 - io) * 18).toFixed(2)}px)`},
      ];
    case 'axis':
      return [
        {transform: `scale(${lerp(1, 1.08, io).toFixed(4)})`, opacity: 1 - E.out(clamp(q * 1.6))},
        {transform: `scale(${lerp(0.92, 1, E.out(q)).toFixed(4)})`, opacity: E.out(clamp((q - 0.25) / 0.75))},
      ];
    case 'slide':
      return [
        {transform: `translateX(${(-dir * io * 1080).toFixed(2)}px)`},
        {transform: `translateX(${(dir * (1 - io) * 1080).toFixed(2)}px)`},
      ];
    case 'scale':
    default:
      return [
        {transform: `scale(${lerp(1, 0.9, io).toFixed(4)})`, opacity: 1 - io},
        {opacity: E.out(clamp((q - 0.2) / 0.8))},
      ];
  }
};

export const Cut: React.FC<{kind?: CutKind; at: number; dur?: number; dir?: number; a: React.ReactNode; b: React.ReactNode; origin?: string}> = ({kind = 'axis', at, dur = 12, dir = 1, a, b, origin = '540px 860px'}) => {
  const f = useCurrentFrame();
  const k = (f - at) / Math.max(1, dur);
  if (k <= 0) return <>{a}</>;
  if (k >= 1) return <>{b}</>;
  const [sa, sb] = cutStyles(kind, k, dir);
  return (
    <>
      {box({...sa, transformOrigin: origin}, a)}
      {box({...sb, transformOrigin: origin}, b)}
    </>
  );
};

/** Several pictures in a row, cut on `at[i]` (picture i+1 replaces picture i): the promos' rhythm of a new picture every 1.5
 *  to 2.5 s inside one Film. `kinds[i]` picks each cut (default "axis"). */
export const Cuts: React.FC<{at: number[]; kinds?: CutKind[]; dur?: number; children: React.ReactNode[]}> = ({at, kinds = [], dur = 12, children}) => {
  const f = useCurrentFrame();
  const pics = React.Children.toArray(children);
  let i = 0;
  while (i < at.length && f >= at[i] + dur) i++;
  const cur = pics[Math.min(i, pics.length - 1)];
  if (i >= at.length || i + 1 >= pics.length || f < at[i]) return <>{cur}</>;
  return <Cut kind={kinds[i] ?? 'axis'} at={at[i]} dur={dur} a={cur} b={pics[i + 1]} />;
};
