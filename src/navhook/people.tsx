// The hook's four people in the studio's "Silhouette light" language (diagpromo/kit/sil/sil.tsx: an elegant adult, a crisp
// near-black silhouette, only the skin lit by the night city's one cool light; the mood is posture and gesture, never a
// cartoon face). Their looks are fixed by the studio's wardrobe (castDress), so each is the same person in every shot:
//   MOM    the front passenger, in her fifties: a low bun, earrings, a scarf over a cardigan: the one who knows the way
//   GIO    the back seat, late twenties: a fade, stubble, a bomber: leans in between the seats
//   LUKA   the other back seat, thirty: curls, a short beard, denim: glued to the window, the bridge
//   DRIVER thirty-five, a short beard, a turtleneck: the one with the wheel and no vote
import React from 'react';
import type {Act} from '../scenes/illo/acting';
import type {Face} from '../scenes/illo/faces';
import type {Pose} from '../scenes/illo/poses';
import {castDress, filmKey} from '../scenes/illo/wardrobe.mjs';
import {silPal, SilFigure, SilPalCtx, type SilPal} from '../diagpromo/kit/sil/sil';

const FILM = 146;
type Cast = {is: string; seed: number; gender: 'm' | 'f'; age: string; hair: string; outfit: string; beard?: string | null; tone?: number; hairTone?: number; extras?: string[]; glasses?: string};
const MOM_CAST: Cast = {is: 'mom', seed: 21, gender: 'f', age: 'adult', hair: 'lowbun', outfit: 'cardigan', tone: 1, hairTone: 2, extras: ['earrings', 'scarf']};
const GIO_CAST: Cast = {is: 'friend', seed: 8, gender: 'm', age: 'young', hair: 'fade', outfit: 'bomber', beard: 'stubble', tone: 6, hairTone: 0};
const LUKA_CAST: Cast = {is: 'friend', seed: 44, gender: 'm', age: 'adult', hair: 'curly', outfit: 'denim', beard: 'short', tone: 5, hairTone: 1};
const DRV_CAST: Cast = {is: 'me', seed: 3, gender: 'm', age: 'adult', hair: 'textured', outfit: 'turtleneck', beard: 'short', tone: 7, hairTone: 0};

/** the city's light at night: a cool cobalt key on the skin, a deep blue second light */
const CITY = (level = 1) => (_t: unknown, lv: number): SilPal => silPal({light: false, hue: '#86A4FF', b: '#2B3C78', time: 'night', level: lv * level});

type P = {x: number; y: number; size: number; frame: number; pose?: Pose; face?: Face; acts?: readonly Act[]; turn?: number; flip?: boolean; crop?: 'full' | 'bust' | 'head'; level?: number; opacity?: number};
const make = (cast: Cast) => {
  const look = castDress(cast, filmKey(FILM));
  const C: React.FC<P & {uid: string}> = (p) => (
    <SilPalCtx.Provider value={CITY(p.level ?? 1) as never}>
      <SilFigure uid={p.uid} look={look} seed={cast.seed} x={p.x} y={p.y} size={p.size} crop={p.crop ?? 'bust'} face={p.face ?? 'neutral'} pose={p.pose} turn={p.turn} flip={p.flip} acts={p.acts} frame={p.frame} time="night" opacity={p.opacity} />
    </SilPalCtx.Provider>
  );
  return C;
};
export const Mom = make(MOM_CAST);
export const Gio = make(GIO_CAST);
export const Luka = make(LUKA_CAST);
export const Driver = make(DRV_CAST);
