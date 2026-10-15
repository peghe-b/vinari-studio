// The film's three people, in the studio's "Silhouette light" language (kit/sil/sil.tsx, the QR promo's copy: an elegant
// adult of about eight heads, a crisp near-black silhouette, only the skin lit by the scene's one light; the mood is posture
// and gesture, never a cartoon face). Their looks are fixed here by the studio's wardrobe (wardrobe.mjs castDress), so the
// same person is drawn in every shot:
//   MECHANIC  a man in his fifties in a work coverall, a short crop, grey stubble: the garage's guesser
//   OWNER     a young man in a leather jacket over a tee, dark jeans, white sneakers: the car's owner
//   SELLER    a used-car seller in a light shirt, a chain: the lot's smiling man
// The light: the garage's warm amber (night), the morning's soft neutral (day), the lot's daylight.
import React from 'react';
import type {Act} from '../../scenes/illo/acting';
import type {Face} from '../../scenes/illo/faces';
import type {Time} from '../../scenes/illo/palette';
import type {Pose} from '../../scenes/illo/poses';
import type {Item} from '../../scenes/illo/props';
import {castDress, filmKey} from '../../scenes/illo/wardrobe.mjs';
import {silPal, SilFigure, SilPalCtx, type SilPal} from './sil/sil';

const FILM = 102;
type Cast = {is: string; seed: number; gender: 'm' | 'f'; age: string; hair: string; outfit: string; beard?: string | null; tone?: number; legs?: number; bottom?: string; shoe?: string; hairTone?: number; extras?: string[]};
export const MECH_CAST: Cast = {is: 'mechanic', seed: 14, gender: 'm', age: 'adult', hair: 'crop', outfit: 'coverall', beard: 'stubble', hairTone: 3, tone: 6};
export const OWNER_CAST: Cast = {is: 'me', seed: 5, gender: 'm', age: 'young', hair: 'textured', outfit: 'leather', beard: null, tone: 7, legs: 3, bottom: 'jeans', shoe: 'sneaker'};
export const SELLER_CAST: Cast = {is: 'seller', seed: 31, gender: 'm', age: 'adult', hair: 'slick', outfit: 'shirt', beard: 'short', tone: 1, bottom: 'chinos', shoe: 'loafer', extras: ['chain', 'watch']};

export type Light = 'garage' | 'morning' | 'day';
const palOf = (light: Light, level = 1) => (time: Time, lv: number): SilPal => {
  if (light === 'garage') return silPal({light: false, hue: '#EBA468', b: '#8A6A55', time: 'night', level: lv * level});
  if (light === 'morning') return silPal({light: false, hue: '#C9B8A8', b: '#6A6A6A', time: 'dusk', level: lv * level});
  return silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time, level: lv * level});
};

type P = {
  uid: string;
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
  crop?: 'full' | 'bust' | 'head';
  light?: Light;
  level?: number;
  flip?: boolean;
  itemSide?: 'back' | 'front';
  bend?: number;
};

const make = (cast: Cast) => {
  const look = castDress(cast, filmKey(FILM));
  const C: React.FC<P> = (p) => (
    <SilPalCtx.Provider value={palOf(p.light ?? 'garage', p.level ?? 1)}>
      <SilFigure
        uid={p.uid}
        look={look}
        seed={cast.seed}
        x={p.x}
        y={p.y}
        size={p.size}
        crop={p.crop}
        face={p.face ?? 'neutral'}
        pose={p.pose}
        turn={p.turn}
        flip={p.flip}
        hold={p.hold}
        acts={p.acts}
        frame={p.frame}
        time={(p.light ?? 'garage') === 'day' ? 'day' : 'night'}
        opacity={p.opacity}
        itemSide={p.itemSide}
        bend={p.bend}
      />
    </SilPalCtx.Provider>
  );
  return C;
};

export const Mechanic = make(MECH_CAST);
export const Owner = make(OWNER_CAST);
export const Seller = make(SELLER_CAST);
