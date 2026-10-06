import React from 'react';
import CATALOG from '../../public/photos/photos.json';
import SCENE_REGISTRY from '../data/scenes.json';
import {L} from '../tokens';
import type {SceneSpec} from '../types';

// ---- full bleed (the owner, 2026-10-06: "I don't like the hard crop band at the top and bottom of the pictures") -----
// A picture scene fills the whole 9:16 frame edge to edge: no crop line and no fade. The rule is the scene registry's
// "bleed" (src/data/scenes.json): photos (Photo bleed and cover, PhotoStory bleed and depth, Split, a Twist with a photo,
// a KineticHeadline or BigNumber `bg`, a Callback of a full-bleed hook), the illustrated scenes (Call, Chat, Drive ...)
// and a picture-like Film (`"look": "illustrated"` or `"bleed": true`; `"bleed": false` keeps the band). The data scenes,
// Phone and the other app pictures keep the clean field and the band cut at L.graphicsTop / L.graphicsBottom.
// Promo works it out per shot: SceneHost provides BleedCtx (a scene, PictureBand and the photo plates read it); the
// meta bar stays over it (Promo's META_HIDE_ON_BLEED is off: the owner, 2026-10-06, 23:50). The subtitle is NOT touched: it stays exactly as it is, with
// no shadow, outline or box (the owner: "if the text sometimes does not show, that is fine"). The photo credit keeps its
// small knockout in the lower left, where it always was.
//
// ---- the fit (the owner, 2026-10-07, on v79's Split: "the photos are spread full screen but you cannot make them out;
// when nothing shows, make the photos smaller again, in the earlier format") ------------------------------------------
// A photo bleeds only when it FITS the box its staging fills: covering the box keeps at least `_fit.min` (0.6) of the
// photo's width (a tall box) or height (a wide box), and the photo is not small (`_fit.small`, stories.mjs tooSmall).
// The 9:16 frame keeps 0.5625 / aspect of a wider photo's width: a 3:4 portrait 75 %, a 4:5 70 %, a square 56 %, a 4:3
// 42 %, a 3:2 37 %; so a portrait (up to 15:16) bleeds and a square or landscape one does not. Split's wipe gives each
// photo half the frame (no real photo is that tall), its stack two panels, its slide the frame. The registry's "fit"
// names each scene's photos and boxes; bleedOf demands both, so Promo, the meta bar logic, the subtitle and BleedCtx
// get the REAL outcome. A photo that does not fit is shown WHOLE on the clean field instead (wholeView: the photo at its
// own aspect, as wide as the content allows, inside the picture band), by the scene itself (PhotoStory's plate, Photo's
// frame, Split's pair, a Twist's and a bg's plate): every film, the old specs too, renders right with no new spec.
// tools/ci/stories.mjs reads the same numbers (the brief's photo shapes, the story notes).

type Cond = Record<string, unknown>;
type Rule = boolean | 'hook' | Cond[];
type FitRule = Record<string, unknown> & {when?: Cond};
const REGISTRY = SCENE_REGISTRY as unknown as Record<string, {bleed?: Rule; fit?: FitRule[]}>;
type FitCfg = {min: number; small: number; band: [number, number]; boxes: Record<string, number>};
const FIT = (SCENE_REGISTRY as unknown as {_fit: FitCfg})._fit;
type Size = {w: number; h: number};
const PHOTOS = CATALOG as unknown as Record<string, Size>;
type Rect = {x: number; y: number; w: number; h: number};

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

// ---- the fit ---------------------------------------------------------------------------------------------------------
const keyOf = (src: string) => src.replace(/^photos\//, '').replace(/\.jpe?g$/i, '');
/** A photo's pixel size from the catalogue (public/photos/photos.json), or null. */
export const photoSize = (src: unknown): Size | null => {
  if (typeof src !== 'string' || !src) return null;
  const i = PHOTOS[keyOf(src)];
  return i && i.w > 0 && i.h > 0 ? {w: i.w, h: i.h} : null;
};
/** The share of the photo a box of aspect `box` (w/h) keeps when the photo covers it: 1 = whole. */
export const keptShare = (img: Size, box: number) => {
  const a = img.w / img.h;
  return Math.min(a / box, box / a);
};
/** Small: the photo covers the old picture band only when blown up more than `_fit.small` times (stories.mjs tooSmall). */
export const isSmall = (img: Size) => Math.max(FIT.band[0] / img.w, FIT.band[1] / img.h) > FIT.small;
/** Does photo `src` fill the box (`_fit.boxes` name) and stay recognisable? A photo not in the catalogue: yes (nothing
 *  to measure: the old behaviour). */
export const photoFits = (src: unknown, box: string) => {
  const img = photoSize(src);
  const b = FIT.boxes[box];
  if (!img || !b) return true;
  return keptShare(img, b) >= FIT.min && !isSmall(img);
};
/** Do the scene's photos fit the boxes its full-bleed staging fills (the registry's "fit")? */
export const photosFit = (spec: SceneSpec | undefined) => {
  const rules = spec ? REGISTRY[spec.type]?.fit : undefined;
  if (!spec || !Array.isArray(rules)) return true;
  return rules.every((r) => {
    if (r.when && !holds(spec, r.when)) return true;
    return Object.entries(r).every(([path, box]) => path === 'when' || typeof box !== 'string' || photoFits(at(spec, path), box));
  });
};

/** The clean field's whole photo (the earlier format: a plate at the photo's own aspect, clamped 0.62..2, as wide as
 *  `maxW` and as tall as the picture band allows, centred on `cy`): where a photo that does not fit goes. */
export const WHOLE = Object.freeze({maxW: 920, top: L.graphicsTop + 10, bottom: L.graphicsBottom - 50});
export const wholeAspect = (src: unknown, fallback = 1.5) => {
  const img = photoSize(src);
  return Math.min(2, Math.max(0.62, img ? img.w / img.h : fallback));
};
export const wholeView = (src: unknown, o: {cy?: number; maxW?: number; top?: number; bottom?: number} = {}): Rect => {
  const ar = wholeAspect(src);
  const top = o.top ?? WHOLE.top;
  const bottom = o.bottom ?? WHOLE.bottom;
  let w = o.maxW ?? WHOLE.maxW;
  let h = w / ar;
  if (h > bottom - top) {
    h = bottom - top;
    w = h * ar;
  }
  const cy = o.cy ?? L.contentMid - 20;
  const y = Math.min(bottom - h, Math.max(top, cy - h / 2));
  return {x: 540 - w / 2, y, w, h};
};

/** Does this scene fill the frame edge to edge? `hook`: the film's first shot (a Callback shows it again). Only when
 *  the registry's rule holds AND its photos fit (photosFit). */
export const bleedOf = (spec: SceneSpec | undefined, hook?: SceneSpec): boolean => {
  if (!spec) return false;
  const rule = REGISTRY[spec.type]?.bleed;
  if (rule === true) return photosFit(spec);
  if (rule === 'hook') return hook && hook !== spec ? bleedOf(hook) : false;
  if (Array.isArray(rule)) return rule.some((c) => c && typeof c === 'object' && holds(spec, c)) && photosFit(spec);
  return false;
};

/** True inside a full-bleed shot (Promo's SceneHost). Outside Promo (the kit gallery) it is false: the old band. */
export const BleedCtx = React.createContext(false);
export const useBleed = () => React.useContext(BleedCtx);
/** The view a picture fills: the whole frame in a full-bleed shot, else the old band. */
export const usePictureView = () => (React.useContext(BleedCtx) ? BLEED_VIEW : BAND_VIEW);
