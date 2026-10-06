// src/scenes/illo/faces.ts: the twelve expressions of the kit's characters (src/scenes/illo/figure.tsx draws them).
// A face is a handful of numbers, so two faces blend linearly (6 frames in acting.ts) and a blink or a saccade is one
// number more. Units are the figure's (u: the standing figure is 100 u tall; the head is 16.8 x 18.4 u).
//
//   eyeOpen    eye height (1 = 2.6 u); under 0.2 the eye is a closed arc (a blink, a laugh)
//   eyeSmile   the lower lid rises (0..1): happy, squinting eyes
//   pupil      1 = the eye is one dark oval; under 1 = a white eye with a dark pupil this big (shock)
//   lookX/Y    the pupils' shift (u, at most 0.6); lookY + = down (sad, reading a phone)
//   browY      brows up (-) or down (+), u: -2.2 (shock) .. +1.2 (angry)
//   browTilt   inner ends up (+, worried, sad) or down (-, angry), degrees
//   browAsym   one brow (the screen-right one) raised: the smirk
//   mw         mouth width, u (2..8);  curve: corner lift -1 (frown) .. +1 (smile), 1.5 u at most
//   open       0..1: the lower lip drops to 3 u;  skew: -1..1, one corner up 1 u (the smirk)
//   teeth      0..1: an upper teeth band when the mouth is open;  tongue: a tongue at the bottom of an open mouth
//   shades     sunglasses on (cool);  bob: the laugh's head bob (u at 2 Hz)
import type {FaceFxKind} from './fx';
import {deepFreeze} from './palette';

export type Face = 'neutral' | 'smile' | 'grin' | 'laugh' | 'shock' | 'worried' | 'sad' | 'cry' | 'angry' | 'smirk' | 'cool' | 'meh';
export const FACE_NAMES: readonly Face[] = deepFreeze(['neutral', 'smile', 'grin', 'laugh', 'shock', 'worried', 'sad', 'cry', 'angry', 'smirk', 'cool', 'meh'] as Face[]);

export type FaceParams = {
  eyeOpen: number;
  eyeSmile: number;
  pupil: number;
  lookX: number;
  lookY: number;
  browY: number;
  browTilt: number;
  browAsym: number;
  mw: number;
  curve: number;
  open: number;
  skew: number;
  teeth: number;
  tongue: number;
  shades: number;
  bob: number;
};

const N: FaceParams = {eyeOpen: 1, eyeSmile: 0, pupil: 1, lookX: 0, lookY: 0, browY: 0, browTilt: 0, browAsym: 0, mw: 4, curve: 0.1, open: 0, skew: 0, teeth: 0, tongue: 0, shades: 0, bob: 0};
const f = (o: Partial<FaceParams>): FaceParams => ({...N, ...o});

/** The table (spec 3.5): each face as numbers. */
export const FACE: Readonly<Record<Face, FaceParams>> = deepFreeze({
  neutral: f({}),
  smile: f({eyeOpen: 0.9, eyeSmile: 0.3, browY: -0.3, mw: 5, curve: 0.7}),
  grin: f({eyeOpen: 0.6, eyeSmile: 0.8, browY: -0.6, mw: 7, curve: 1, open: 0.5, teeth: 1, tongue: 0.4}),
  laugh: f({eyeOpen: 0.1, eyeSmile: 1, browY: -1, mw: 7, curve: 1, open: 0.9, teeth: 1, tongue: 1, bob: 1.5}),
  shock: f({eyeOpen: 1.35, pupil: 0.7, browY: -2.2, browTilt: 5, mw: 3.5, curve: 0, open: 1}),
  worried: f({eyeOpen: 1.05, browY: -0.8, browTilt: 18, mw: 3.5, curve: -0.3, open: 0.1}),
  sad: f({eyeOpen: 0.75, browY: -0.4, browTilt: 20, mw: 4, curve: -0.8, lookY: 0.4}),
  cry: f({eyeOpen: 0.6, browY: -0.4, browTilt: 20, mw: 4, curve: -0.9, open: 0.2, lookY: 0.3}),
  angry: f({eyeOpen: 0.8, browY: 1.2, browTilt: -20, mw: 5, curve: -0.5, open: 0.3, teeth: 1}),
  smirk: f({eyeOpen: 0.75, eyeSmile: 0.2, mw: 5, curve: 0.5, skew: 0.8, browAsym: 1}),
  cool: f({eyeOpen: 0.75, eyeSmile: 0.2, mw: 5, curve: 0.5, skew: 0.8, browAsym: 1, shades: 1}),
  meh: f({eyeOpen: 0.55, browY: 0.2, mw: 4, curve: 0, lookX: 0.3}),
});

/** The effect a face brings with it (drawn from the moment the face lands): shock lines, a tear, the shades' glint. */
export const FACE_FX: Readonly<Partial<Record<Face, FaceFxKind>>> = deepFreeze({shock: 'shock', cry: 'tear', cool: 'sparkle'});

const KEYS = Object.keys(N) as (keyof FaceParams)[];
/** Two faces blended (t = 0: a, 1: b). */
export const mixFace = (a: FaceParams, b: FaceParams, t: number): FaceParams => {
  const o = {} as FaceParams;
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
};
export const isFace = (v: unknown): v is Face => typeof v === 'string' && (FACE_NAMES as readonly string[]).includes(v);
