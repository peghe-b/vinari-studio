// src/scenes/illo/scene.tsx: the plumbing every illustrated scene shares (spec 4.1), so a scene file is only its picture:
//
//   <IlloBand uid time>     the picture band (hard cuts at L.graphicsTop / L.graphicsBottom), the scene's IlloDefs and,
//                           on paper, the night or dusk plate (outside the camera: its edges are the band's edges)
//   <Svg>                   a full-stage SVG layer (1080 x 1920, overflow visible) for one camera plane
//   timeOf(p)               the spec's `time` (day | night | dusk)
//   stagingOf(p, list)      the spec's staging if the scene knows it, else its first (the default)
//   at(ctx, v, fallback)    a chunk index or "1.2s" as a scene frame (cueFrame), with a fallback for a missing value
//   seedOf(p, k)            a stable seed from the spec (its `seed`, else its text): two films never get the same jitter
//   osc(f, period, phase)   a sine in -1..1 (idle loops: periods that do not divide each other)
//   env(f, at, dur)         0 -> 1 eased over dur frames from at (0 before, 1 after)
import React from 'react';
import {cueFrame} from '../common';
import {PictureBand} from '../common';
import {ease, prog} from '../../lib/anim';
import type {SceneCtx} from '../../types';
import {Plate} from './backdrop';
import type {Time} from './palette';
import {DefsSvg} from './solid';

export const IlloBand: React.FC<{uid: string; time?: Time; children: React.ReactNode}> = ({uid, time = 'day', children}) => (
  <PictureBand>
    <DefsSvg uid={uid} />
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <Plate time={time} />
    </svg>
    {children}
  </PictureBand>
);

export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);

export const timeOf = (p: {time?: unknown}): Time => (p.time === 'night' || p.time === 'dusk' ? p.time : 'day');

export const stagingOf = <S extends string>(p: {staging?: unknown}, list: readonly S[]): S =>
  (list as readonly string[]).includes(String(p.staging)) ? (p.staging as S) : list[0];

export const at = (ctx: SceneCtx, v: unknown, fallback: number) => (v === undefined || v === null ? fallback : cueFrame(ctx, v, fallback));

export const seedOf = (p: Record<string, unknown>, k = 0) => {
  if (typeof p.seed === 'number') return p.seed + k;
  const s = JSON.stringify(p);
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h + k;
};

export const osc = (f: number, period: number, phase = 0) => Math.sin((f / period) * Math.PI * 2 + phase);

export const env = (f: number, from: number, dur: number, e: (t: number) => number = ease.enter) => prog(f, from, dur, e);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const n1 = (v: number) => +v.toFixed(1);
