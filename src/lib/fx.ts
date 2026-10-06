import type React from 'react';
import {L} from '../tokens';
import type {FxCut} from '../types';
import {ease, smooth} from './anim';

// ---- transitions (2026-10-06, the owner: "the same cut every time") ------------------------------------------------------
// A cut stays exactly where the voice puts it (the plan's `from`). A transition has `pre` frames before the cut and `post`
// after it: the outgoing scene keeps playing `post` frames past its cut (muted: its sounds end on the cut as always), and
// the incoming scene is shown frozen on its own frame 0 for `pre` frames before it (muted; its frame 0 is composed, its
// entrance starts CUT_IN frames early). Over that window u runs 0 -> 1 and presentation() moves both. Promo applies it
// outside any Freeze, from the wrapper's own frame, so it moves while the content holds.
//   cut     a hard cut (the air on the cut)                     glitch  a hard cut with the lens glitch (at most 2 a film)
//   whip    both travel sideways with a horizontal blur          push    the outgoing flies at the viewer, the next settles
//   match   a push about the two scenes' points (a match cut)    pull    the outgoing steps back, the next lands from big
//   stack   the next slides up over the outgoing like a card     wipe    a slanted edge wipes the next in
//   flash   a soft white flash (an ink dip on paper) over the cut
//   crash   the outgoing holds its last frame, the next crashes in from 1.3x with a flash, a glitch and a kick (twists)
//   dip     the field between the two (quiet, before the end card)
//   stamp   the end card lands on the last picture, frozen (the "stamp" and "loop" endings): no transition of its own
// tools/ci/fx.mjs picks them (variety rules, budgets) and their sounds; layers/FxOverlay.tsx draws the flashes.

export const W = 1080;
export type Role = 'out' | 'in';
/** outer: a clip (and the z order) that never moves; style: the motion (transform, opacity, the whip's blur); veil: a
 *  field-coloured veil over it; edge: a wipe's line; topLine: a stacked card's top edge (stage y). The outgoing scene is
 *  clipped where the incoming covers it (stack, wipe), so its text (the clean text layer, above every picture) never
 *  shows through the incoming picture. */
export type Pres = {outer: React.CSSProperties; style: React.CSSProperties; veil: number; edge: {x: number; dir: number} | null; topLine: number | null};
const NONE: Pres = {outer: {}, style: {}, veil: 0, edge: null, topLine: null};
const ORIGIN = {x: 540, y: L.contentMid};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The whip's horizontal blur (stage px of stdDeviation) at u. */
export const whipBlur = (u: number) => 36 * Math.sin(Math.PI * clamp01(u));
/** The wipe's slant: half the horizontal travel of the edge over the band's height (12 degrees). */
const SLANT = Math.tan((12 * Math.PI) / 180) * 960;

/** How a scene looks during a transition: its role ("out" the scene that ends, "in" the one that starts) and u. */
export const presentation = (cut: FxCut, role: Role, u0: number): Pres => {
  const u = clamp01(u0);
  const dir = cut.dir ?? 1;
  const origin = (pt?: {x: number; y: number}) => `${(pt ?? ORIGIN).x}px ${(pt ?? ORIGIN).y}px`;
  switch (cut.type) {
    case 'whip': {
      const m = ease.snap(u);
      const tx = role === 'out' ? -dir * W * m : dir * W * (1 - m);
      return {...NONE, style: {transform: `translateX(${tx.toFixed(2)}px)`, filter: whipBlur(u) > 0.5 ? 'url(#vn-whip)' : undefined}};
    }
    case 'push':
    case 'match': {
      const pt = cut.type === 'match' ? (role === 'out' ? cut.from : cut.to) : undefined;
      if (role === 'out') return {...NONE, outer: {zIndex: 2}, style: {transform: `scale(${(1 + 0.6 * u ** 3).toFixed(4)})`, transformOrigin: origin(pt), opacity: 1 - smooth(u, 0.45, 0.85)}};
      return {...NONE, style: {transform: `scale(${(0.86 + 0.14 * ease.whipOut(u)).toFixed(4)})`, transformOrigin: origin(pt), opacity: smooth(u, 0.2, 0.55)}};
    }
    case 'pull':
      if (role === 'out') return {...NONE, style: {transform: `scale(${(1 - 0.14 * u * u).toFixed(4)})`, transformOrigin: origin(), opacity: 1 - smooth(u, 0.4, 0.9)}};
      return {...NONE, style: {transform: `scale(${(1.22 - 0.22 * ease.whipOut(u)).toFixed(4)})`, transformOrigin: origin(), opacity: smooth(u, 0, 0.5)}};
    case 'stack': {
      const y = (1 - ease.whipOut(u)) * 1100; // the incoming card's top edge
      if (role === 'out') return {...NONE, outer: {clipPath: `inset(-40px -40px ${Math.max(0, 1920 - y).toFixed(1)}px -40px)`}, style: {transform: `scale(${(1 - 0.05 * u).toFixed(4)})`, transformOrigin: origin()}, veil: 0.35 * u};
      return {...NONE, style: {transform: `translateY(${y.toFixed(2)}px)`}, topLine: y};
    }
    case 'wipe': {
      const m = ease.snap(u);
      // the edge's centre x travels from -SLANT to W + SLANT (dir 1: left to right; -1 mirrored)
      const xc = dir > 0 ? -SLANT + (W + 2 * SLANT) * m : W + SLANT - (W + 2 * SLANT) * m;
      const top = xc + SLANT * dir;
      const bot = xc - SLANT * dir;
      const near = dir > 0 ? -60 : 1140; // the side the incoming grows from
      const far = dir > 0 ? 1140 : -60;
      const poly = (side: number) => `polygon(${side}px -40px, ${top.toFixed(1)}px -40px, ${bot.toFixed(1)}px 1960px, ${side}px 1960px)`;
      if (role === 'out') return {...NONE, outer: {clipPath: poly(far)}};
      return {...NONE, outer: {clipPath: poly(near)}, edge: m > 0 && m < 1 ? {x: xc, dir} : null};
    }
    case 'crash':
      if (role === 'out') return NONE;
      return {...NONE, style: {transform: `scale(${(1.3 - 0.3 * ease.whipOut(u)).toFixed(4)})`, transformOrigin: origin()}};
    case 'dip':
      if (role === 'out') return {...NONE, style: {opacity: 1 - ease.camera(clamp01(u * 2))}};
      return {...NONE, style: {opacity: ease.camera(clamp01(u * 2 - 1))}};
    default:
      return NONE;
  }
};

/** u of the window [cut - pre, cut + post) at a frame counted from the window's start. */
export const uOf = (cut: FxCut, k: number) => (cut.pre + cut.post > 0 ? (k + 0.5) / (cut.pre + cut.post) : 1);

/** The edge of a wipe: a 2 px ink line along the slant (stage px). */
export const wipeEdge = (x: number, dir: number): React.CSSProperties => ({
  position: 'absolute',
  left: x - 1,
  top: -20,
  width: 2,
  height: 1960,
  transform: `rotate(${(12 * dir).toFixed(2)}deg)`,
  transformOrigin: '50% 50%',
});
