// src/scenes/kit/explain.tsx: the promos' step-by-step explainer, as parts a film scene composes (2026-10-19; from the
// diagnostics promo's Explain.tsx: "explain it so anyone gets it", "show HOW, very clearly, step by step"). The method: the
// problem lived in a scene first, then ONE step a shot: a plain verb label (StepLabel), the REAL screen in a WHOLE phone that
// rises slowly in a hand, a clear window on the one row that matters (the screen's paper veil round it), the tap, and the row
// lifted out big (Lift) so it reads at phone size. Every real screen at most once a film; text only black or white.
//
//   regionOf({y: 0.38, h: 0.06})      a spec's highlight (capture fractions; x 0.03, w 0.94 by default) as a Region
//   bandOf(r, a) / pad(r, px) / mid(r) / inPlace(pose, r, grow)   the window, a margin round a row, its centre, a lift in place
//   useRow(src, row)                   the row's ring (src/lib/outline.mjs, the owner 2026-10-19: the highlight follows the
//                                      element's shape): {region, band(a), lift, rCap}: the window and the lifted card
//                                      concentric with the element under the row (its own corners plus an even gap)
//   <HeldPhone pose src hand="right" .../>   Phone3 in a hand (kit/grip: the palm behind, the thumb and fingertips over the glass)
//   <StepShot ctx src n={2} text="დააჭირე სკანირებას" row={{y: 0.378, h: 0.056}} tapAt={1} liftAt={1}/>   one whole step shot
import React from 'react';
import {BleedCtx} from '../../lib/bleed';
import {FIG} from '../../lib/layer';
import {guarded} from '../../lib/guardrt';
import {FOOT_MAX, LABEL_TOP} from '../../lib/guard.mjs';
import type {SceneCtx} from '../../types';
import {C, L} from '../../tokens';
import {GripBack, GripFront} from './grip';
import {clamp, E, lerp, prog, sp} from './lib';
import {growRing, type OutlineHl} from '../../lib/outline.mjs';
import {toFrac, useRings} from '../../lib/outline-px';
import {atFoot, bodyBox, capUrl, float, Lift, Phone3, type Band, type Phone3Props, type Pose, type Rect, type Region} from './phone3d';
import {silPal} from './sil/sil';
import {riseFoot, riseIn, StepLabel, useShot} from './stage';

/** the hand's skin on the white world (the promos' day light) */
export const DAY_SKIN = silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time: 'day', level: 1}).lit;

/** a spec's row (capture fractions) as a Region */
export const regionOf = (h: {x?: number; y: number; w?: number; h: number}): Region => {
  const x0 = h.x ?? 0.03;
  return {x0, y0: h.y, x1: x0 + (h.w ?? 0.94), y1: h.y + h.h};
};
export const bandOf = (r: Region, a: number): Band => ({x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0, a});
export const pad = (r: Region, px: number): Region => ({x0: r.x0 - px / 1080, y0: r.y0 - px / 2346, x1: r.x1 + px / 1080, y1: r.y1 + px / 2346});
export const mid = (r: Region) => ({x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2});
/** The row's ring on its capture (src/lib/outline.mjs): the element under the spec's row, measured from the capture's pixels,
 *  with an even gap round it and its corner radius plus that gap. `region` the ring (capture fractions), `band(a)` the veil's
 *  window on it (its corners concentric), `lift` the lifted card's region (the ring a little wider) and `rCap` its corner
 *  radius in capture px (pass both to Lift). null without a row. A row may say `r` (the element's corner radius in capture
 *  px, or "pill"), `snap: false` (the row as given) and `gap`. */
export const useRow = (src: string, row?: OutlineHl | null) => {
  const [g] = useRings(row ? capUrl(src) : null, row ? [row] : []);
  if (!row || !g) return null;
  const lifted = growRing(g, 6);
  return {
    region: toFrac(g) as Region,
    band: (a: number): Band => ({x: g.x0 / 1080, y: g.y0 / 2346, w: (g.x1 - g.x0) / 1080, h: (g.y1 - g.y0) / 2346, a, r: g.r}),
    lift: toFrac(lifted) as Region,
    rCap: lifted.r,
  };
};

/** a region lifted in place, toward the lens, `grow` times its size about its own centre */
export const inPlace = (pose: Pose, r: Region, grow: number, dy = 0): Rect => {
  const x = pose.x + (r.x0 - 0.5) * pose.w;
  const h = (r.y1 - r.y0) * (2346 / 1080) * pose.w;
  const y = pose.y + (r.y0 - 0.5) * (2346 / 1080) * pose.w;
  const w = (r.x1 - r.x0) * pose.w;
  return {x: x - (w * (grow - 1)) / 2, y: y - (h * (grow - 1)) / 2 + dy, w: w * grow, h: h * grow};
};

/** Phone3 held in a hand: `right` (the arm leaves to the right), `left` (mirrored), or `none`. Lifted cards go in `over`. */
export const HeldPhone: React.FC<Phone3Props & {hand?: 'right' | 'left' | 'none'; uid: string; over?: React.ReactNode; skin?: readonly [string, string, string, string]}> = ({hand = 'right', uid, over, skin = DAY_SKIN, ...p}) => {
  if (hand === 'none')
    return (
      <>
        <Phone3 {...p} />
        {over}
      </>
    );
  const left = hand === 'left';
  const m = left ? {...p.pose, x: 1080 - p.pose.x, yaw: -p.pose.yaw, roll: -(p.pose.roll ?? 0)} : p.pose;
  const b = bodyBox(m);
  const flip: React.CSSProperties = left ? {position: 'absolute', inset: 0, transform: 'scaleX(-1)', transformOrigin: '540px 0'} : {position: 'absolute', inset: 0};
  return (
    <>
      {/* the hand is a figure for the frame guards (lib/layer.ts FIG): its arm stays out of the subtitle band */}
      <div className={FIG} style={flip}>
        <GripBack b={b} id={`${uid}b`} skin={skin} />
      </div>
      <Phone3 {...p} />
      {over}
      <div className={FIG} style={flip}>
        <GripFront b={b} id={`${uid}f`} skin={skin} />
      </div>
    </>
  );
};

type At = number | string;
/** One step of a how-to, whole: the step label on top, the phone rising slowly from below in a hand (0.95 s, one opaque unit,
 *  never a fade), the window on `row`, the tap on its centre at `tapAt`, the row lifted out big at `liftAt` (it settles back
 *  after `liftFor` frames unless `hold`). Frame px of a 1080 x 1920 box (a film's stage, a Story slide): `labelY` the label's
 *  top, `foot` the phone's lowest point (keep it whole: above the subtitle in a film, inside the safe zone on a slide).
 *  A step shot is a PICTURE: its beat says "look": "illustrated" (full bleed). In a beat without it the film's clean
 *  field is cut at L.graphicsTop / L.graphicsBottom, so the shot keeps its label and its WHOLE phone inside that band itself
 *  (the label moves down, the foot up, the phone shrinks to fit): nothing is ever sliced by the band's edge. */
const LABEL_H = 92; // StepLabel at its 44 px: the chip 66 + the pill's padding
export const StepShot: React.FC<{
  ctx: SceneCtx;
  src: string;
  n?: number;
  text?: string;
  row?: OutlineHl;
  tapAt?: At;
  liftAt?: At;
  liftFor?: number;
  hold?: boolean;
  riseAt?: At;
  hand?: 'right' | 'left' | 'none';
  w?: number;
  x?: number;
  foot?: number;
  labelY?: number;
  yaw?: number;
  bg?: string;
  uid?: string;
}> = ({ctx, src, n, text, row, tapAt, liftAt, liftFor = 40, hold = false, riseAt, hand = 'right', w: w0 = 400, x = 560, foot: foot0 = 1300, labelY: label0 = 300, yaw = -10, bg, uid = 'st'}) => {
  const {t, at} = useShot(ctx);
  // inside the clean field's band (no bleed): the label and the whole phone, its float and turn included, stay in the band
  const bleed = React.useContext(BleedCtx);
  // the frame guards (src/lib/guard.mjs, a film from v110 on): on the full bleed too the label sits under the meta bar
  // (LABEL_TOP: v110's label at 290 covered the meta bar's words), the phone's foot over the subtitle band (it may come down
  // as far as the label went down, to FOOT_MAX), and the phone shrinks to fit between them
  const g = guarded();
  const labelY = bleed && !g ? label0 : Math.max(label0, g ? LABEL_TOP : L.graphicsTop + 18);
  // (with a hand its palm shows 1.2 % of the phone's height under the foot: 12 px more room)
  const foot = !bleed ? Math.min(foot0, L.graphicsBottom - 24) : g ? Math.min(FOOT_MAX - (hand === 'none' ? 0 : 12), foot0 + Math.max(0, labelY - label0)) : foot0;
  const top = n !== undefined && text ? labelY + LABEL_H + 28 : (bleed && !g ? 0 : g ? LABEL_TOP : L.graphicsTop + 24);
  const w = bleed && !g ? w0 : Math.max(200, Math.min(w0, Math.floor((foot - top) / 2.36)));
  // guarded: the rise starts 10 frames before the cut (6 before it), so the phone crosses the subtitle band in under 0.4 s
  const r0 = at(riseAt, g ? -10 : -6);
  const r = riseIn(t, r0);
  const fl = float(t);
  const H = w * 2.25;
  const pose = atFoot({x, w, yaw: lerp(yaw - 6, yaw, clamp(r)) + fl.roll, pitch: lerp(10, 5, clamp(r)) + fl.pitch, roll: hand === 'left' ? 3 : -3}, riseFoot(r, foot, H));
  const region = row ? regionOf(row) : null;
  // the window and the lifted card follow the element under the row (concentric, an even gap); the tap stays on its centre
  const ring = useRow(src, row);
  const tap = tapAt === undefined ? null : at(tapAt, 20);
  const lift = liftAt === undefined ? null : at(liftAt, 24);
  const bandA = region ? prog(t, (tap ?? lift ?? 12) - 12, 6) : 0;
  const lk = region && lift !== null ? sp(t, lift - 4, 150, 18) * (hold ? 1 : 1 - E.inOut(prog(t, lift + liftFor, 8))) : 0;
  const c = ring ? mid(ring.region) : region ? mid(region) : {x: 0.5, y: 0.5};
  return (
    <div style={{position: 'absolute', left: -60, right: -60, top: -80, bottom: -80, background: bg ?? C.surface, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 60, top: 80, width: 1080, height: 1920}}>
        {n !== undefined && text ? <StepLabel n={n} text={text} y={labelY} k={E.out(prog(t, Math.max(0, r0) + 2, 10))} /> : null}
        <HeldPhone
          uid={uid}
          hand={hand}
          src={src}
          pose={pose}
          band={ring ? ring.band(bandA) : region ? bandOf(pad(region, 14), bandA) : null}
          veil={0.24 * bandA}
          taps={tap !== null ? [{x: c.x, y: c.y, k: (t - tap) / 16}] : []}
          over={
            ring && lk > 0.002 ? (
              <Lift src={src} r={ring.lift} pose={pose} to={inPlace(pose, ring.lift, 1.1)} k={lk} rCap={ring.rCap} />
            ) : region && lk > 0.002 ? (
              <Lift src={src} r={region} pose={pose} to={inPlace(pose, region, 1.1)} k={lk} radius={30} />
            ) : null
          }
        />
      </div>
    </div>
  );
};
