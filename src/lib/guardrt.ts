import {filmNo} from '../tokens';
import {FOOT_MAX, guardOn, slideInside} from './guard.mjs';
import type {Probe} from './layer';

// The frame guards at render time (src/lib/guard.mjs): on for a film from GUARD_FROM on (Promo's setFilmNo), or forced by the
// input prop "guard" (true / false: a before-and-after still of an older film, a test). Promo calls setGuardForce() and
// setProbe() before any scene renders, right after setFilmNo().
let force: boolean | null = null;
export const setGuardForce = (v: unknown) => {
  force = v === true ? true : v === false ? false : null;
};
/** true while the film renders with the guards (the subtitle's plate, the kit keeping out of the subtitle band and inside
 *  the frame, a long shot's breath, no side-on phone, no thought cloud) */
export const guarded = () => force ?? guardOn(filmNo());

// The probe's pass (tools/ci/guards.mjs, Promo's input prop "guardProbe"): "obj" draws only the marked things on the key
// green, so a 3D canvas drops what is not its thing (a car's or a phone's soft contact shadow, a floor): dark shadow pixels
// over the green read as a thing and would make a false EDGE_CUT or SUB_BAND.
let probe: Probe | null = null;
export const setProbe = (v: Probe | null) => {
  probe = v;
};
/** the probe's pass this render is for, or null (a normal render) */
export const probing = () => probe;
/** a 3D canvas's soft shadow / floor strength: 0 in the probe's "obj" pass (only the thing itself is measured) */
export const shadowOf = (k: number) => (probe === 'obj' ? 0 : k);

/** A card's box (stage: left, top, width, height) kept whole inside the frame and over the subtitle band in a guarded film
 *  (slid, never scaled); unchanged before the guards. */
export const keepBox = <B extends {x: number; y: number; w: number; h: number}>(b: B): B => (guarded() ? {...b, ...slideInside(b)} : b);
/** A foot (stage y) kept over the subtitle band in a guarded film. */
export const keepFoot = (y: number) => (guarded() ? Math.min(y, FOOT_MAX) : y);
