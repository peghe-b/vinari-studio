// src/scenes/illo/acting.ts: a character's performance over time: `acts` (frame-based beats: a face, a pose, an effect,
// a turn, an item) resolved to what the Figure draws on one frame. History-free (every frame recomputes from the list),
// so a still at any frame is the same as the film's frame.
//
//   resolveActs(frame, base, acts)   the face blend (6 frames, ease), the pose blend (SPRING.enter with overlapping
//                                    action: torso first, arms +2 frames, head +3; Figure applies the delays), the turn,
//                                    the held item and the effects running now (an effect lasts until the next beat)
//   actsAt(ctx, acts)                a scene's acts with `at` as a chunk index or "1.2s" (cueFrame) -> frame-based acts
import {cueFrame} from '../common';
import type {SceneCtx} from '../../types';
import {ease, prog} from '../../lib/anim';
import {FACE_FX, type Face} from './faces';
import type {FaceFxKind} from './fx';
import type {Pose} from './poses';
import type {Item} from './props';

export type Act = {
  at: number; // frame (scene-local)
  face?: Face;
  pose?: Pose;
  fx?: FaceFxKind | FaceFxKind[];
  turn?: number;
  hold?: Item | null;
};
/** An act as a scene's spec writes it: `at` is a chunk index of the scene or "1.2s". */
export type ActSpec = Omit<Act, 'at'> & {at?: number | string; who?: number; say?: string};

export type ActState = {
  face: {a: Face; b: Face; t: number};
  pose: {a: Pose; b: Pose; at: number; aAt: number};
  turn: {a: number; b: number; at: number};
  hold: Item | null | undefined;
  fx: {kind: FaceFxKind; at: number}[];
};

type Base = {face: Face; pose: Pose; turn: number; hold?: Item | null};

const FACE_FRAMES = 6;

/** What a character shows on `frame`, from its base look and its acts (any order). */
export const resolveActs = (frame: number, base: Base, acts: readonly Act[] = []): ActState => {
  const list = [...acts].filter((a) => Number.isFinite(a.at)).sort((x, y) => x.at - y.at);
  let fa = base.face;
  let fb = base.face;
  let fAt = -Infinity;
  let pa = base.pose;
  let pb = base.pose;
  let pAt = -Infinity;
  let paAt = -Infinity;
  let ta = base.turn;
  let tb = base.turn;
  let tAt = -Infinity;
  let hold = base.hold;
  const fx: {kind: FaceFxKind; at: number; until: number}[] = [];
  // the base face's own effect (shock lines, a tear, the shades' glint) runs from the start until the face changes
  const baseFx = FACE_FX[base.face];
  if (baseFx) {
    const first = list.find((n) => n.face && n.face !== base.face);
    fx.push({kind: baseFx, at: -20, until: first ? first.at : Infinity});
  }
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.at > frame) break;
    if (a.face && a.face !== fb) {
      fa = fb;
      fb = a.face;
      fAt = a.at;
    }
    if (a.pose && (a.pose !== pb || a.pose === 'jump')) {
      pa = pb;
      paAt = pAt;
      pb = a.pose;
      pAt = a.at;
    }
    if (typeof a.turn === 'number') {
      ta = tb;
      tb = a.turn;
      tAt = a.at;
    }
    if (a.hold !== undefined) hold = a.hold;
    // an effect runs until the next beat that changes the face or brings its own effect
    const next = list.slice(i + 1).find((n) => n.face || n.fx);
    const until = next ? next.at : Infinity;
    const kinds = [...(Array.isArray(a.fx) ? a.fx : a.fx ? [a.fx] : []), ...(a.face && FACE_FX[a.face] ? [FACE_FX[a.face] as FaceFxKind] : [])];
    for (const k of new Set(kinds)) fx.push({kind: k, at: a.at, until});
  }
  return {
    face: {a: fa, b: fb, t: fAt === -Infinity ? 1 : prog(frame, fAt, FACE_FRAMES, ease.enter)},
    pose: {a: pa, b: pb, at: pAt, aAt: paAt},
    turn: {a: ta, b: tb, at: tAt},
    hold,
    fx: fx.filter((e) => frame < e.until).map(({kind, at}) => ({kind, at})),
  };
};

/** A scene's acts (`at` as a chunk index or "1.2s") as frame-based acts, for <Figure acts>. `who` filters one
 *  character of a pair (acts without `who` belong to character 0). */
export const actsAt = (ctx: SceneCtx, acts: readonly ActSpec[] = [], who?: number): Act[] =>
  acts
    .filter((a) => who === undefined || (a.who ?? 0) === who)
    .map(({at, who: _w, say: _s, ...rest}) => ({...rest, at: cueFrame(ctx, at ?? 0)}));
/** The spec's name for actsAt (a plain function, not a React hook: safe anywhere in a scene or a Film). */
export const useActing = (acts: readonly ActSpec[] = [], ctx: SceneCtx, who?: number): Act[] => actsAt(ctx, acts, who);
