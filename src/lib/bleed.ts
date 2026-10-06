import React from 'react';
import SCENE_REGISTRY from '../data/scenes.json';
import {L} from '../tokens';
import type {SceneSpec} from '../types';

// ---- full bleed (the owner, 2026-10-06: "I don't like the hard crop band at the top and bottom of the pictures") -----
// A picture scene fills the whole 9:16 frame edge to edge: no crop line and no fade. The rule is the scene registry's
// "bleed" (src/data/scenes.json): photos (Photo bleed and cover, PhotoStory bleed and depth, Split, a Twist with a photo,
// a KineticHeadline or BigNumber `bg`, a Callback of a full-bleed hook), the illustrated scenes (Call, Chat, Drive ...)
// and a picture-like Film (`"look": "illustrated"` or `"bleed": true`; `"bleed": false` keeps the band). The data scenes,
// Phone and the other app pictures keep the clean field and the band cut at L.graphicsTop / L.graphicsBottom.
// Promo works it out per shot: SceneHost provides BleedCtx (a scene, PictureBand and the photo plates read it) and the
// meta bar is hidden while a full-bleed shot is on screen. The subtitle is NOT touched: it stays exactly as it is, with
// no shadow, outline or box (the owner: "if the text sometimes does not show, that is fine"). The photo credit keeps its
// small knockout in the lower left, where it always was.

type Cond = Record<string, unknown>;
type Rule = boolean | 'hook' | Cond[];
const REGISTRY = SCENE_REGISTRY as unknown as Record<string, {bleed?: Rule}>;

/** The stage rect of a full-bleed view: the frame and the camera's margin (tokens.ts L.bleedTop / L.bleedBottom). */
export const BLEED_VIEW = Object.freeze({x: 0, y: L.bleedTop, w: 1080, h: L.bleedBottom - L.bleedTop});
/** The old picture band (the clean field's crop): what data scenes and app screens keep. */
export const BAND_VIEW = Object.freeze({x: 20, y: L.graphicsTop, w: 1040, h: L.graphicsBottom - L.graphicsTop});

const at = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), o);
const set = (v: unknown) => v !== undefined && v !== null && v !== false && v !== '';
const holds = (spec: SceneSpec, c: Cond) =>
  Object.entries(c).every(([path, want]) => {
    const v = at(spec, path);
    if (want === '*') return set(v);
    if (Array.isArray(want)) return want.some((w) => (w === null ? v === undefined || v === null : v === w));
    return v === want;
  });

/** Does this scene fill the frame edge to edge? `hook`: the film's first shot (a Callback shows it again). */
export const bleedOf = (spec: SceneSpec | undefined, hook?: SceneSpec): boolean => {
  if (!spec) return false;
  const rule = REGISTRY[spec.type]?.bleed;
  if (rule === true) return true;
  if (rule === 'hook') return hook && hook !== spec ? bleedOf(hook) : false;
  if (Array.isArray(rule)) return rule.some((c) => c && typeof c === 'object' && holds(spec, c));
  return false;
};

/** True inside a full-bleed shot (Promo's SceneHost). Outside Promo (the kit gallery) it is false: the old band. */
export const BleedCtx = React.createContext(false);
export const useBleed = () => React.useContext(BleedCtx);
/** The view a picture fills: the whole frame in a full-bleed shot, else the old band. */
export const usePictureView = () => (React.useContext(BleedCtx) ? BLEED_VIEW : BAND_VIEW);
