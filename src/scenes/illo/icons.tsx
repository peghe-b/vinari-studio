// src/scenes/illo/icons.tsx: filled glyphs of the "Graphite" look, drawn on a 64 x 64 grid and scaled to `size`.
//   warning lights   engine battery oil temp tyre brake abs airbag fuel seatbelt (simplified ISO 2575 shapes)
//   reactions        heart laugh wow sad like
//   thoughts         car money wrench heart clock question phone flowers trophy key house ring
//   signs            no-phone no-parking cone (the prohibition ring and slash take the accent)
// <Icon name x y size color accent/>: (x, y) is the icon's centre; `color` paints the glyph (default C.ink), `accent`
// the ring and slash of a sign (default red: it costs the viewer). Holes are real holes (even-odd fills), so an icon
// sits on any ground. No text: the ABS letters are strokes.
import React from 'react';
import {C, toneBig} from '../../tokens';
import {circ, ell, poly, rr} from './solid';
import {LARI} from './fx';
import {deepFreeze} from './palette';

type Part = {d: string; stroke?: number; cap?: 'round' | 'butt'; accent?: boolean; opacity?: number; tf?: string};

// the plus sign as one polygon (an even-odd hole made of two rects would fill its own centre back in)
const plus = (cx: number, cy: number, a: number, t: number) =>
  poly([
    [cx - t, cy - a],
    [cx + t, cy - a],
    [cx + t, cy - t],
    [cx + a, cy - t],
    [cx + a, cy + t],
    [cx + t, cy + t],
    [cx + t, cy + a],
    [cx - t, cy + a],
    [cx - t, cy + t],
    [cx - a, cy + t],
    [cx - a, cy - t],
    [cx - t, cy - t],
  ]);
const HEART = 'M32 55C11 41 4 28 11 18C17 10 27 11 32 19C37 11 47 10 53 18C60 28 53 41 32 55Z';
const FACE = circ(32, 32, 26);

export const ICONS: Record<string, Part[]> = {
  // ---- warning lights
  engine: [
    {d: 'M8 25H14V20H21V16H35V20H43L48 25H53V19H58V45H53V39H49L43 47H22L18 43H14V37H8Z' + rr(17.5, 24, 30, 4, 2) + rr(17.5, 31, 22, 4, 2)},
    {d: rr(24, 10, 12, 4, 1.5)},
    {d: rr(28, 13, 4, 4, 0)},
  ],
  battery: [{d: rr(8, 20, 48, 32, 3.5) + 'M12.5 34.3H23.5V38.3H12.5Z' + plus(46, 36.3, 6, 2)}, {d: rr(14, 14, 9, 7, 1.5)}, {d: rr(41, 14, 9, 7, 1.5)}],
  oil: [
    {d: 'M13 30H38L50 24H57L43 45H17Q13 45 13 41Z'},
    {d: rr(22, 25.5, 9, 5, 1)},
    {d: rr(20, 23, 13, 3, 1.2)},
    {d: 'M13 34H7V28Q7 26.5 8.5 26.5H13', stroke: 3.4},
    {d: 'M55 33C57 36 58.5 38 58.5 40A3.5 3.5 0 0 1 51.5 40C51.5 38 53 36 55 33Z'},
  ],
  temp: [
    {d: rr(28.5, 8, 7, 32, 3.5) + circ(32, 42, 7.5)},
    {d: rr(37.5, 13, 7, 3, 1.5) + rr(37.5, 20, 5, 3, 1.5) + rr(37.5, 27, 7, 3, 1.5)},
    {d: 'M8 53Q14 49 20 53T32 53T44 53T56 53', stroke: 3.4, cap: 'round'},
    {d: 'M8 59Q14 55 20 59T32 59T44 59T56 59', stroke: 3.4, cap: 'round'},
  ],
  tyre: [
    {d: 'M16 13C9 21 8.5 35 12.5 46V51H51.5V46C55.5 35 55 21 48 13', stroke: 5, cap: 'round'},
    {d: rr(16, 54, 5, 5, 1) + rr(25.5, 54, 5, 5, 1) + rr(33.5, 54, 5, 5, 1) + rr(43, 54, 5, 5, 1)},
    {d: rr(29.5, 19, 5, 18, 2.5) + circ(32, 43.5, 2.9)},
  ],
  brake: [
    {d: circ(32, 32, 16.5) + circ(32, 32, 12)},
    {d: rr(30, 21, 4, 13, 2) + circ(32, 40, 2.6)},
    {d: 'M14 15A24 24 0 0 0 14 49', stroke: 4, cap: 'round'},
    {d: 'M50 15A24 24 0 0 1 50 49', stroke: 4, cap: 'round'},
  ],
  abs: [
    {d: circ(32, 32, 18) + circ(32, 32, 14.4)},
    {d: 'M19.5 37L22.8 27L26.1 37M20.6 33.8H25', stroke: 2.5, cap: 'round'},
    {d: 'M28.6 37V27H31.2Q33.6 27 33.6 29.5Q33.6 32 31.2 32H28.6M28.6 32H31.6Q34.2 32 34.2 34.5Q34.2 37 31.6 37H28.6', stroke: 2.5, cap: 'round'},
    {d: 'M43.2 28.6Q42.2 27 40 27Q37.2 27 37.2 29.4Q37.2 31.5 40.2 32Q43.5 32.5 43.5 34.7Q43.5 37 40.2 37Q37.8 37 36.8 35.4', stroke: 2.5, cap: 'round'},
    {d: 'M11 14A26 26 0 0 0 11 50', stroke: 4, cap: 'round'},
    {d: 'M53 14A26 26 0 0 1 53 50', stroke: 4, cap: 'round'},
  ],
  airbag: [
    {d: circ(21, 13, 6)},
    {d: 'M15.5 22.5Q20 20 26 21.5L29.5 34H40Q43 34 44 37L48.5 52Q49 55 46 55H43.5Q41.5 55 41 53L37.5 42H22Q16 42 15 36Z'},
    {d: circ(45, 23, 11.5)},
    {d: 'M9 21L12 46Q12.5 49 15.5 49H33', stroke: 3.2, cap: 'round'},
  ],
  fuel: [
    {d: rr(13, 9, 24, 45, 3.5) + rr(17.5, 14, 15, 11, 1.5)},
    {d: rr(9, 52, 32, 5, 1.5)},
    {d: 'M37 25H41.5Q45 25 45 28.5V44Q45 48 48.5 48Q52 48 52 44V22L46.5 16', stroke: 3.4, cap: 'round'},
  ],
  seatbelt: [
    {d: circ(32, 12.5, 6.5)},
    {d: 'M19 24Q32 19.5 45 24L47.5 47Q32 51.5 16.5 47Z' + poly([[23.5, 22], [28.5, 21], [44.5, 45.5], [39.5, 47]])},
    {d: rr(41, 47.5, 8, 6, 1.5)},
  ],
  // ---- reactions
  heart: [{d: HEART}],
  laugh: [{d: FACE + 'M17 27Q22 19 27 27Q22 23.5 17 27Z' + 'M37 27Q42 19 47 27Q42 23.5 37 27Z' + 'M17 35H47Q45 50 32 50Q19 50 17 35Z'}],
  wow: [{d: FACE + ell(23.5, 26, 3.2, 4.6) + ell(40.5, 26, 3.2, 4.6) + ell(32, 42, 5.8, 7.4) + 'M17 17Q22 13 27 16Q22 15.5 17 17Z' + 'M47 17Q42 13 37 16Q42 15.5 47 17Z'}],
  sad: [{d: FACE + ell(23.5, 27, 3, 3.6) + ell(40.5, 27, 3, 3.6) + 'M21.5 46Q32 36 42.5 46Q32 41 21.5 46Z' + 'M46 33C48 36 49.5 38 49.5 40A3.5 3.5 0 0 1 42.5 40C42.5 38 44 36 46 33Z'}],
  like: [{d: rr(8, 29, 10, 25, 2.5)}, {d: 'M21 31L29.5 18Q31.5 10 36.5 12Q40.5 14 38.5 22L36.5 28H50.5Q56 28 55 33.5L52 50Q51 54 46.5 54H21Z'}],
  // ---- thoughts
  car: [
    {d: 'M5 40Q5 34.5 11 33.2L21.5 31Q28 22.5 38 22.5Q46.5 22.5 52.5 30.2L56.5 31.2Q60 32.2 60 36.8V40.5Q60 43 57.8 43H52.5A6.5 6.5 0 0 0 39.5 43H24.5A6.5 6.5 0 0 0 11.5 43H7.5Q5 43 5 40.5Z' + 'M25 31Q30.5 25.5 37.5 25.5Q44 25.5 48.5 31Z'},
    {d: circ(18, 43, 5.4) + circ(18, 43, 2)},
    {d: circ(46, 43, 5.4) + circ(46, 43, 2)},
  ],
  money: [{d: rr(5, 17, 54, 30, 4) + circ(32, 32, 9.5)}, {d: LARI, stroke: 2.2, cap: 'round', tf: 'translate(32 32) scale(0.62)'}, {d: circ(13.5, 32, 2.6) + circ(50.5, 32, 2.6)}],
  wrench: [
    {d: 'M51.9 17.8A7 7 0 1 1 46.2 12.1', stroke: 9, cap: 'butt'},
    {d: 'M40.5 24.5L15 50', stroke: 8.5, cap: 'round'},
  ],
  clock: [{d: circ(32, 32, 25) + circ(32, 32, 20)}, {d: 'M32 32V19M32 32L41.5 37.5', stroke: 4, cap: 'round'}, {d: circ(32, 32, 3.2)}, {d: rr(30.8, 14, 2.4, 3.5, 1) + rr(30.8, 46.5, 2.4, 3.5, 1) + rr(14, 30.8, 3.5, 2.4, 1) + rr(46.5, 30.8, 3.5, 2.4, 1)}],
  question: [{d: 'M21.5 21.5C21.5 10.5 42.5 9.5 42.5 21.5C42.5 30 32 30.5 32 40', stroke: 7, cap: 'round'}, {d: circ(32, 51.5, 4.6)}],
  phone: [{d: rr(17, 5, 30, 54, 6.5) + rr(20.5, 10, 23, 44, 3)}, {d: rr(27.5, 12.5, 9, 3.4, 1.7)}],
  flowers: [
    {d: 'M22 24L31 44M32 20V44M42 24L33 44', stroke: 2.6, cap: 'round'},
    {d: circ(21, 20, 7.5) + circ(21, 20, 2.6) + circ(32, 13, 7.5) + circ(32, 13, 2.6) + circ(43, 20, 7.5) + circ(43, 20, 2.6)},
    {d: 'M22 38H42L35 58H29Z'},
  ],
  trophy: [
    {d: 'M18 9H46V21Q46 36.5 32 38Q18 36.5 18 21Z'},
    {d: 'M18 13H12.5Q10 13 10 16.5Q10.5 26 20 28.5M46 13H51.5Q54 13 54 16.5Q53.5 26 44 28.5', stroke: 3.4, cap: 'round'},
    {d: rr(29, 37, 6, 9, 0) + rr(22, 45, 20, 6, 2) + rr(18, 51, 28, 6, 2)},
  ],
  key: [{d: circ(19, 32, 13) + circ(19, 32, 5.5)}, {d: rr(30, 28.5, 29, 7, 2)}, {d: rr(47, 34, 5, 7, 1) + rr(54, 34, 5, 9.5, 1)}],
  house: [{d: 'M7 31L32 9L57 31L54 34.5L50 31V55H38.5V41H25.5V55H14V31L10 34.5Z'}],
  ring: [{d: circ(32, 41, 16.5) + circ(32, 41, 12.2)}, {d: poly([[23, 19], [27.5, 12], [36.5, 12], [41, 19], [32, 28]])}],
  // ---- signs
  'no-phone': [{d: rr(23, 15, 18, 34, 4.5) + rr(25.6, 19, 12.8, 26, 2)}, {d: circ(32, 32, 27) + circ(32, 32, 21.5), accent: true}, {d: 'M13 13L51 51', stroke: 5.5, cap: 'butt', accent: true}],
  'no-parking': [{d: 'M26 46V18H34Q42.5 18 42.5 26Q42.5 34 34 34H26', stroke: 6, cap: 'round'}, {d: circ(32, 32, 27) + circ(32, 32, 21.5), accent: true}, {d: 'M13 13L51 51', stroke: 5.5, cap: 'butt', accent: true}],
  cone: [{d: 'M27 8H37L47.5 51H16.5Z' + poly([[22.6, 25], [41.4, 25], [42.8, 31], [21.2, 31]]) + poly([[19.7, 37], [44.3, 37], [45.7, 43], [18.3, 43]])}, {d: rr(9, 50, 46, 6.5, 2)}],
};

export const WARNING_LIGHTS = ['engine', 'battery', 'oil', 'temp', 'tyre', 'brake', 'abs', 'airbag', 'fuel', 'seatbelt'] as const;
export const REACTIONS = ['heart', 'laugh', 'wow', 'sad', 'like'] as const;
export const THOUGHTS = ['car', 'money', 'wrench', 'heart', 'clock', 'question', 'phone', 'flowers', 'trophy', 'key', 'house', 'ring'] as const;
export const SIGNS = ['no-phone', 'no-parking', 'cone'] as const;
export type IconName = keyof typeof ICONS;
for (const t of [ICONS, WARNING_LIGHTS, REACTIONS, THOUGHTS, SIGNS]) deepFreeze(t);

/** One icon, centred at (x, y), `size` px square. */
export const Icon: React.FC<{name: string; x: number; y: number; size?: number; color?: string; accent?: string; opacity?: number; turn?: number}> = ({
  name,
  x,
  y,
  size = 64,
  color,
  accent,
  opacity,
  turn = 0,
}) => {
  const parts = ICONS[name];
  if (!parts) return null;
  const ink = color ?? C.ink;
  const acc = accent ?? toneBig('down');
  const s = size / 64;
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${s.toFixed(4)}) translate(-32 -32)`} opacity={opacity}>
      {parts.map((p, i) =>
        p.stroke ? (
          <path key={i} d={p.d} transform={p.tf} fill="none" stroke={p.accent ? acc : ink} strokeWidth={p.stroke} strokeLinecap={p.cap ?? 'round'} strokeLinejoin="round" opacity={p.opacity} />
        ) : (
          <path key={i} d={p.d} transform={p.tf} fill={p.accent ? acc : ink} fillRule="evenodd" opacity={p.opacity} />
        ),
      )}
    </g>
  );
};
