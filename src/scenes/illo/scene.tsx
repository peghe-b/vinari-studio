// src/scenes/illo/scene.tsx: the plumbing every illustrated scene shares (spec 4.1), so a scene file is only its picture:
//
//   <IlloBand uid time>     the picture (full bleed: the whole frame, src/lib/bleed.ts; outside Promo the old band cut at
//                           L.graphicsTop / L.graphicsBottom), the scene's IlloDefs and,
//                           on paper, the night or dusk plate (outside the camera: its edges are the band's edges)
//   <Svg>                   a full-stage SVG layer (1080 x 1920, overflow visible) for one camera plane
//   timeOf(p)               the spec's `time` (day | night | dusk)
//   stagingOf(p, list)      the spec's staging if the scene knows it, else its first (the default)
//   at(ctx, v, fallback)    a chunk index or "1.2s" as a scene frame (cueFrame), with a fallback for a missing value
//   seedOf(p, k)            a stable seed from the spec (its `seed`, else its text): two films never get the same jitter
//   osc(f, period, phase)   a sine in -1..1 (idle loops: periods that do not divide each other)
//   env(f, at, dur)         0 -> 1 eased over dur frames from at (0 before, 1 after)
//   useFilmKey()            the film's number (wardrobe.mjs filmKey: v93-..., its -en, its demos)
//   filmPick(key, salt, list)  this film's pick from a list (a body, a backdrop, a framing) when the spec names none:
//                           consecutive films never take the same one (the owner, 2026-10-12: "the cars are always the same
//                           scene"); `salt` keeps two lists of one film independent
import React from 'react';
import {useVideoConfig} from 'remotion';
import {filmKey} from './wardrobe.mjs';
import {cueFrame} from '../common';
import {PictureBand} from '../common';
import {ease, prog} from '../../lib/anim';
import {useBleed} from '../../lib/bleed';
import {ACCENT_FROM, L} from '../../tokens';
import type {SceneCtx} from '../../types';
import {Plate} from './backdrop';
import type {Time} from './palette';
import {DefsSvg} from './solid';

export const IlloBand: React.FC<{uid: string; time?: Time; children: React.ReactNode}> = ({uid, time = 'day', children}) => {
  // full bleed (src/lib/bleed.ts, the owner 2026-10-06): an illustrated scene fills the whole frame, so its plate does too
  const bleed = useBleed();
  return (
    // camera={false}: the scene's own <Camera> planes move (illo/cam.tsx), the band adds no layer of its own
    <PictureBand camera={false}>
      <DefsSvg uid={uid} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {bleed ? <Plate time={time} top={L.bleedTop} bottom={L.bleedBottom} /> : <Plate time={time} />}
      </svg>
      {children}
    </PictureBand>
  );
};

/** Stage y past the top / the foot of a full-bleed picture, its camera margin included (L.bleedTop / L.bleedBottom and
 *  160 px for a near plane's parallax): a ground, a road, a wall or a roof liner runs from TOP or to FOOT, so no
 *  picture ends on a line inside the frame (the owner, 2026-10-06: no crop band). In the old band they are cut anyway. */
export const TOP = L.bleedTop - 160;
export const FOOT = L.bleedBottom + 160;

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

/** The film's number (wardrobe.mjs filmKey). */
export const useFilmKey = (): number => filmKey(useVideoConfig().id);
const h32s = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** This film's pick from `list`: a stride coprime with the list's length steps with the film's number, so two films in a
 *  row never take the same item (and every item comes round). */
export const filmPick = <T,>(key: number, salt: string, list: readonly T[]): T => {
  const n = list.length;
  if (n <= 1) return list[0];
  const stride = [5, 7, 3, 11, 13].find((s) => gcd(s, n) === 1 && s % n !== 0) ?? 1;
  return list[(((key * stride + h32s(salt)) % n) + n) % n];
};
/** A film made after the 2026-10-12 asks (its number at least ACCENT_FROM, or a demo): it takes the per-film picks; an older
 *  film keeps the defaults it was made with. */
export const freshFilm = (key: number) => key >= ACCENT_FROM;
