// Her: the QR promo's woman, drawn by this film's copy of the "Silhouette light" figure (kit/sil/sil.tsx: the trouser rim
// stops at the hem, the tucked blouse ends in a belt, the closed lip is a soft rose). The look is the studio's own for her
// cast in this film (wardrobe.mjs castDress), so she is the same person the Figure would draw.
import React from 'react';
import type {Act} from '../../scenes/illo/acting';
import type {Face} from '../../scenes/illo/faces';
import type {Time} from '../../scenes/illo/palette';
import type {Pose} from '../../scenes/illo/poses';
import type {Item} from '../../scenes/illo/props';
import {castDress, filmKey} from '../../scenes/illo/wardrobe.mjs';
import {SilFigure} from './sil/sil';

export const HER_CAST = {is: 'woman', seed: 21, gender: 'f', age: 'young', hair: 'long', outfit: 'blouse', extras: ['earrings']} as const;
export const FILM = 101;
const LOOK = castDress(HER_CAST, filmKey(FILM));

export const Her: React.FC<{
  uid?: string;
  x: number;
  y: number;
  size: number;
  frame: number;
  pose?: Pose;
  face?: Face;
  acts?: readonly Act[];
  turn?: number;
  time?: Time;
  crop?: 'full' | 'bust' | 'head';
  hold?: Item | null;
  opacity?: number;
  behind?: boolean;
}> = (p) => (
  <SilFigure
    uid={p.uid}
    look={LOOK}
    seed={HER_CAST.seed}
    x={p.x}
    y={p.y}
    size={p.size}
    crop={p.crop}
    face={p.face}
    pose={p.pose}
    turn={p.turn}
    hold={p.hold}
    acts={p.acts}
    frame={p.frame}
    time={p.time}
    opacity={p.opacity}
    behind={p.behind}
  />
);
