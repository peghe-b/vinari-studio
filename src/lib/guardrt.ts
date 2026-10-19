import {filmNo} from '../tokens';
import {guardOn} from './guard.mjs';

// The frame guards at render time (src/lib/guard.mjs): on for a film from GUARD_FROM on (Promo's setFilmNo), or forced by the
// input prop "guard" (true / false: a before-and-after still of an older film, a test). Promo calls setGuardForce() before any
// scene renders, right after setFilmNo().
let force: boolean | null = null;
export const setGuardForce = (v: unknown) => {
  force = v === true ? true : v === false ? false : null;
};
/** true while the film renders with the guards (the subtitle's plate, the kit keeping out of the subtitle band and inside
 *  the frame, a long shot's breath, no side-on phone, no thought cloud) */
export const guarded = () => force ?? guardOn(filmNo());
