// src/scenes/illo/palette.ts: the "Graphite" look's colour helpers (the illustrated scenes' kit, CLAUDE.md Style).
// Every object is drawn from one neutral grey ramp, C.il0 (lightest) .. C.il7 (darkest), in both looks; colour only
// carries data: one saturated accent per shot from toneBig() (red costs the viewer, green is good for him), never blue.
// Everything reads C at render time, so a scene never asks which look it is in. Pure functions, no state.
//
//   tone(n)            the ramp step n (0..7, clamped; a fraction mixes the two neighbours)
//   step(n, d)         a shade (+d) or highlight (-d) step from n: step(3, 1) = tone(4)
//   mix(a, b, t)       two '#RRGGBB' colours mixed (t = 0: a, 1: b)
//   ground(time)       the colour behind a picture: the field, or the night / dusk plate on paper
//   dark(time)         true when the picture stands on a dark ground (the black film, or a plate on paper)
//   far(k, time)       a backdrop silhouette tone, k = 0 (nearer) .. 1 (farthest): fades toward the ground
//   near(time)         the low-contrast framing tone of the near plane (a pillar, a bush, the cabin edge)
//   lit(time)          the high-contrast particle tone on that ground (rain, dust, glints)
//   accent(tone)       toneBig: the shot's one data colour;  glow(tone, a): its halo (a whisper on paper)
//   glowK(time)        how strong a halo is on that ground (1 on a dark ground, THEME.glow on paper)
import {C, halo, isLight, THEME, toneBig, type Tone} from '../../tokens';

export type Time = 'day' | 'night' | 'dusk';

/** Freezes a kit table, deep (a Film scene written in the cloud imports the kit: a write throws instead of changing
 *  every later scene of the bundle). Returns the same object. */
export const deepFreeze = <T,>(o: T): T => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const ramp = () => [C.il0, C.il1, C.il2, C.il3, C.il4, C.il5, C.il6, C.il7];

const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** Two '#RRGGBB' colours mixed in sRGB (t = 0 gives a, 1 gives b). */
export const mix = (a: string, b: string, t: number) => {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  const k = clamp(t, 0, 1);
  return toHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
};

/** The ramp step n (0 lightest .. 7 darkest), clamped; a fraction mixes its two neighbours. */
export const tone = (n: number) => {
  const r = ramp();
  const v = clamp(n, 0, 7);
  const lo = Math.floor(v);
  const t = v - lo;
  return t < 0.001 ? r[lo] : mix(r[lo], r[Math.min(7, lo + 1)], t);
};
/** A shade (+d) or highlight (-d) step away from n. */
export const step = (n: number, d: number) => tone(n + d);

/** The colour behind the picture: the brand field, or on paper the night plate (dusk: the plate at 0.75). */
export const ground = (time: Time = 'day') => {
  if (!isLight() || time === 'day') return C.bg;
  return time === 'night' ? C.ilNight : mix(C.bg, C.ilNight, 0.75);
};
/** True when the picture stands on a dark ground: the black film, or a night or dusk plate on paper. */
export const dark = (time: Time = 'day') => !isLight() || time !== 'day';

/** A backdrop silhouette tone: k = 0 the nearer backdrop layer, 1 the farthest; far planes fade toward the ground. */
export const far = (k = 0, time: Time = 'day') => {
  const t = clamp(k, 0, 1);
  if (!isLight()) {
    // the black film: il6 .. il7 by day; at night one step darker, the farthest close to the field
    return time === 'night' ? mix(C.il7, mix(C.il7, C.bg, 0.5), t) : mix(C.il6, C.il7, t);
  }
  if (time === 'day') return mix(C.il2, C.il1, t); // paper: the far planes fade toward the paper
  if (time === 'night') return mix(C.il6, C.il7, t); // the night plate (#141414)
  return mix(C.il7, mix(C.il7, ground('dusk'), 0.45), t); // dusk: dark silhouettes against the lighter plate
};
/** The near framing plane (a pillar, a bush, the cabin edge): low contrast on both looks, no detail. */
export const near = (time: Time = 'day') => (dark(time) ? C.il7 : C.il1);
/** The high-contrast particle tone on that ground: light streaks on a dark ground, dark ones on paper. */
export const lit = (time: Time = 'day') => (dark(time) ? C.il0 : C.il5);
/** A lit window or a lamp face: light on a dark ground, quiet on paper by day. */
export const lamp = (time: Time = 'day') => (dark(time) ? C.il1 : C.il0);

/** The shot's one data colour (red = costs the viewer, green = good for him). */
export const accent = (t: Tone = 'down') => toneBig(t);
/** A halo of the accent: full on the black film, a whisper on paper. */
export const glow = (t: Tone, a: number) => halo(toneBig(t), a);
/** How strong a halo is on that ground: full on a dark ground (a night plate too), THEME.glow on paper. */
export const glowK = (time: Time = 'day') => (dark(time) ? 1 : THEME.glow);

/** The ramp step for a named role (a shorthand for parts that take a `tone` prop as a number or a name). */
export type ToneRef = number | 'skin' | 'skin2' | 'feature' | 'glass';
export const toneOf = (t: ToneRef) =>
  typeof t === 'number' ? tone(t) : t === 'skin' ? C.ilSkin : t === 'skin2' ? C.ilSkin2 : t === 'feature' ? C.ilFeature : C.ilGlass;
