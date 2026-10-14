// The passer-by (v3, 2026-10-14): a young man in a short dark jacket who walks past her car, stops and scans its card. The same
// "Silhouette light" figure as her (kit/sil/sil.tsx), always in profile, his look fixed by the studio's wardrobe for this
// film, lit by a cool grey light on the white field (no cartoon face: the mood is posture). His hand and sleeve in the
// close-up are kit/grip.tsx (the same coat).
import React from 'react';
import type {Act} from '../../scenes/illo/acting';
import type {Face} from '../../scenes/illo/faces';
import type {Time} from '../../scenes/illo/palette';
import type {Pose} from '../../scenes/illo/poses';
import type {Item} from '../../scenes/illo/props';
import {castDress, filmKey} from '../../scenes/illo/wardrobe.mjs';
import {silPal, SilFigure, SilPalCtx} from './sil/sil';
import {FILM} from './her';

type Cast = {is: string; seed: number; gender: 'm' | 'f'; age: string; hair: string; outfit: string; beard?: string | null; tone?: number; legs?: number; bottom?: string; shoe?: string};
// v3.1 (the art director: the long black coat with a full beard read as a priest): a short leather jacket over dark
// jeans and white sneakers, clean-shaven, a textured crop: a young man of today
export const PASSER_CAST: Cast = {is: 'man', seed: 9, gender: 'm', age: 'young', hair: 'textured', outfit: 'leather', beard: null, tone: 7, legs: 3, bottom: 'jeans', shoe: 'sneaker'};
/** a soft neutral light on the white field (the paper look), a touch warm on the skin: never her room's amber */
const palOf = (hue: string | null) => (time: Time, level: number) => silPal({light: true, hue, b: '#6A6A6A', time, level});
const PAL = palOf('#B89A84');

export const Passer: React.FC<{
  uid?: string;
  x: number;
  y: number;
  size: number;
  frame: number;
  pose?: Pose;
  face?: Face;
  acts?: readonly Act[];
  turn?: number;
  hold?: Item | null;
  opacity?: number;
  cast?: Cast;
  hue?: string | null;
}> = (p) => (
  <SilPalCtx.Provider value={p.hue !== undefined ? palOf(p.hue) : PAL}>
    <SilFigure
      uid={p.uid}
      look={castDress(p.cast ?? PASSER_CAST, filmKey(FILM))}
      seed={(p.cast ?? PASSER_CAST).seed}
      x={p.x}
      y={p.y}
      size={p.size}
      face={p.face ?? 'neutral'}
      pose={p.pose}
      turn={p.turn}
      hold={p.hold}
      acts={p.acts}
      frame={p.frame}
      time="day"
      opacity={p.opacity}
    />
  </SilPalCtx.Provider>
);
