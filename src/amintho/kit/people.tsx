// The film's three people, in the studio's "Silhouette light" language (kit/sil/sil.tsx, the QR promo's copy: an elegant
// adult of about eight heads, a crisp near-black silhouette, only the skin lit by the scene's one light; the mood is posture
// and gesture, never a cartoon face). Their looks are fixed here by the studio's wardrobe (wardrobe.mjs castDress), so the
// same person is drawn in every shot:
//   MECHANIC  v2 (the owner: "a real Georgian street mechanic"): a man in his fifties, a bit scruffy: a worn light tee with
//             a few oil stains over a belly, dark work trousers, a cap, grey stubble, a cigarette hanging from his lips with
//             a faint wisp of smoke, a relaxed slouch: the garage's guesser
//   OWNER     v2: a grown man (the new take's voice) in a leather jacket over a tee, dark jeans, white sneakers, a short
//             beard: the car's owner
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
export const MECH_CAST: Cast & {hat?: string} = {is: 'mechanic', seed: 14, gender: 'm', age: 'adult', hair: 'crop', outfit: 'tee', beard: 'stubble', hairTone: 3, tone: 7, legs: 6, bottom: 'trousers', shoe: 'sneaker', hat: 'cap'};
export const OWNER_CAST: Cast = {is: 'me', seed: 5, gender: 'm', age: 'adult', hair: 'textured', outfit: 'leather', beard: 'short', tone: 7, legs: 3, bottom: 'jeans', shoe: 'sneaker', hairTone: 6};
export const SELLER_CAST: Cast = {is: 'seller', seed: 31, gender: 'm', age: 'adult', hair: 'slick', outfit: 'shirt', beard: 'short', tone: 6, bottom: 'chinos', shoe: 'loafer', extras: ['chain', 'watch']};

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
  belly?: number;
  cig?: number | null;
  smoke?: number;
  stains?: boolean;
  idle?: boolean;
};

export const make = (cast: Cast, extra: Partial<P> = {}) => {
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
        belly={p.belly ?? extra.belly}
        cig={p.cig !== undefined ? p.cig : extra.cig}
        smoke={p.smoke ?? extra.smoke}
        stains={p.stains ?? extra.stains}
        idle={p.idle}
      />
    </SilPalCtx.Provider>
  );
  return C;
};

export const Mechanic = make(MECH_CAST, {belly: 1, cig: 0.25, smoke: 0.7, stains: true});
export const Owner = make(OWNER_CAST);
export const Seller = make(SELLER_CAST);
// the OBD promo (2026-10-30): the buyer (a new man, not the diagnostics promo's owner), two other sellers for the joke, the next buyer
export const BUYER_CAST: Cast = {is: 'me', seed: 9, gender: 'm', age: 'adult', hair: 'fade', outfit: 'bomber', beard: 'short', tone: 5, legs: 4, bottom: 'jeans', shoe: 'sneaker', hairTone: 2};
export const SELLER_B_CAST: Cast = {is: 'seller', seed: 47, gender: 'm', age: 'adult', hair: 'buzz', outfit: 'polo', beard: 'stubble', tone: 3, bottom: 'chinos', shoe: 'loafer', extras: ['watch']};
export const SELLER_C_CAST: Cast = {is: 'seller', seed: 63, gender: 'm', age: 'adult', hair: 'receding', outfit: 'suitOpen', beard: null, tone: 6, bottom: 'trousers', shoe: 'derby', extras: ['chain']};
export const NEXT_CAST: Cast = {is: 'friend', seed: 71, gender: 'm', age: 'adult', hair: 'curly', outfit: 'knit', beard: 'short', tone: 4, legs: 6, bottom: 'chinos', shoe: 'sneaker', hairTone: 5};
export const Buyer = make(BUYER_CAST);
export const SellerB = make(SELLER_B_CAST);
export const SellerC = make(SELLER_C_CAST);
export const NextBuyer = make(NEXT_CAST);
