import React from 'react';
import {noise2D} from '@remotion/noise';
import {useCurrentFrame} from 'remotion';
import {L, MOTION} from '../tokens';
import type {CamClass, CameraSpec, CamMove} from '../types';
import {ease} from './anim';

// ---- the camera rig (2026-10-06, the owner: "motion is missing, camera movement") --------------------------------
// Every scene of an fx film (tools/ci/fx.mjs plans it, Promo's SceneHost provides it) has a camera that is already
// moving on the cut and never stops: a push, a pull, a drift, a rise or an arc on the drift curve (ease.drift: it
// starts fast and settles), plus impact KICKS on the scene's events (a number lands, a punch word, a twist), an
// optional handheld micro-shake (photos), and the velocity a transition carries in (settle).
// Three classes (sceneClass), with hard budgets in tokens.ts MOTION:
//   band   the camera moves INSIDE the picture's clip: a Film's <PictureBand> (scenes/common.tsx) and the new scenes'
//          own bands (PhotoStory, Split, Timeline, Twist, Callback). The band's hard edges never move.
//   free   the whole scene moves a little (at most 1.2 %): Title, Stat, List, Compare, Grid, Squares, SplitFlap,
//          KineticHeadline, BigNumber. Text never shakes.
//   self   exactly the old 1 % drift (Phone's safe-zone maths inverts it; Wire3D, the maps, the cards, Photo, EndCard).
// "legacy" = an fx film's Film scene that still pushes its own camera (the planner sees it), or any scene of a film
// without fx: the old drift.
// Depth: <CameraLayer depth={d}> moves by the same camera scaled by d (background 0.6, subject 1, foreground 1.3), so
// one move gives parallax; <Hud> (depth 0) never moves. Keep important things inside L.camSafe or in a Hud.

export type CamState = {tx: number; ty: number; s: number; r: number};
export type CamInfo = {
  spec: CameraSpec; // the move (planned) and its knobs
  cls: CamClass;
  seed: string; // "<id>:<scene index>"
  kicks: number[]; // scene frames, sorted, at least MOTION.kickGap apart
  e: number; // the scene's entrance frame (scenes/common.tsx entrance)
  dur: number;
};
/** Promo's SceneHost provides the scene's camera; null outside an fx film (everything renders as before). */
export const CameraCtx = React.createContext<CamInfo | null>(null);

const BAND = new Set(['Film', 'PhotoStory', 'Split', 'Timeline', 'Twist', 'Callback']);
const FREE = new Set(['Title', 'Stat', 'List', 'Compare', 'Grid', 'Squares', 'SplitFlap', 'KineticHeadline', 'BigNumber']);
/** A scene type's camera class (tools/ci/fx.mjs keeps the same table). */
export const sceneClass = (type: string): CamClass => (BAND.has(type) ? 'band' : FREE.has(type) ? 'free' : 'self');

const DEFAULTS = {band: {amount: 0.035, travel: 22, roll: 0.7}, free: {amount: 0.008, travel: 4, roll: 0}} as const;
const ORIGIN: {x: number; y: number} = {x: 540, y: L.contentMid};
const DRIFT_END = 0.154; // ease.drift's slope at t = 1: past the scene's end (a transition's tail) it keeps moving

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** An impact's envelope dk frames after it: up in 3 frames to a rounded top, then an exponential fall (about 10 frames).
 *  The top is rounded on purpose: a one-frame peak is what tools/flicker.py reads as a broken frame. */
const KICK_UP = [0.45, 0.85, 1];
export const kickEnv = (dk: number) => (dk < 0 || dk > 40 ? 0 : dk < 3 ? KICK_UP[Math.floor(dk)] : 0.92 * Math.exp(-(dk - 3) / 3.6));

const moveOf = (m: CamMove | undefined, p: number, A: number, T: number, R: number): CamState => {
  const half = (x: number) => x / 2 - x * p; // +x/2 at the start, -x/2 at the end
  switch (m) {
    case 'push':
      return {tx: 0, ty: 0, s: 1 + A * p, r: 0};
    case 'pull':
      return {tx: 0, ty: 0, s: 1 + A * (1 - p), r: 0};
    case 'drift-l': // the camera travels left: the content moves right
      return {tx: -half(T), ty: 0, s: 1 + 0.01 * p, r: 0};
    case 'drift-r':
      return {tx: half(T), ty: 0, s: 1 + 0.01 * p, r: 0};
    case 'rise': // the camera rises: the content moves down
      return {tx: 0, ty: -half(T), s: 1 + 0.01 * p, r: 0};
    case 'sink':
      return {tx: 0, ty: half(T), s: 1 + 0.01 * p, r: 0};
    case 'arc-l':
      return {tx: -half(T), ty: 0, s: 1 + 0.02 * p, r: half(R)};
    case 'arc-r':
      return {tx: half(T), ty: 0, s: 1 + 0.02 * p, r: -half(R)};
    default:
      return {tx: 0, ty: 0, s: 1, r: 0};
  }
};

/** The camera at a scene frame. `parts.move` false leaves the move out (a scene with its own Ken Burns takes only
 *  the kicks, the shake and the settle). */
export const camAt = (info: CamInfo | null, frame: number, parts: {move?: boolean} = {}): CamState => {
  if (!info || (info.cls !== 'band' && info.cls !== 'free')) return {tx: 0, ty: 0, s: 1, r: 0};
  const {spec, cls, seed} = info;
  const B = MOTION[cls];
  const D = DEFAULTS[cls];
  const t = (frame - info.e) / Math.max(1, info.dur - info.e);
  const p = t <= 0 ? 0 : t >= 1 ? 1 + (t - 1) * DRIFT_END : ease.drift(t);
  const A = clamp(spec.amount ?? D.amount, 0, B.scale);
  const T = clamp(spec.travel ?? D.travel, 0, B.travel);
  const R = clamp(spec.roll ?? D.roll, 0, B.roll);
  const st = parts.move === false ? {tx: 0, ty: 0, s: 1, r: 0} : moveOf(spec.move, p, A, T, R);
  // handheld: two octaves of seeded noise (band only); text scenes never shake
  const S = cls === 'band' ? clamp(spec.shake ?? 0, 0, 1) : 0;
  if (S > 0) {
    st.tx += S * B.shake * (0.75 * noise2D(seed, frame / 34, 0) + 0.25 * noise2D(`${seed}b`, frame / 11, 0));
    st.ty += S * 2.2 * (0.75 * noise2D(`${seed}y`, frame / 34, 0) + 0.25 * noise2D(`${seed}yb`, frame / 11, 0));
    st.r += S * 0.12 * noise2D(`${seed}r`, frame / 40, 0);
  }
  // impacts: a scale kick and, on a band, a short burst of shake
  let kick = 0;
  for (const k of info.kicks) {
    const dk = frame - k;
    if (dk < 0 || dk > 40) continue;
    kick = Math.max(kick, kickEnv(dk));
    if (B.burst > 0) {
      // a short damped wobble along one seeded direction, not a per-frame jitter (a jitter on a detailed photo reads
      // as a broken frame)
      const b = B.burst * Math.exp(-dk / 5) * Math.sin(dk * 0.9);
      const th = Math.PI * noise2D(`${seed}k${k}`, 0.5, 0.5);
      st.tx += b * Math.cos(th);
      st.ty += b * Math.sin(th);
    }
  }
  // the move and the kick each keep their own budget
  st.s = 1 + clamp(st.s - 1, -B.scale, B.scale) + B.kick * kick;
  st.r = clamp(st.r, -B.roll - 0.15, B.roll + 0.15);
  // the velocity a transition or an opening carries in, easing out
  const se = spec.settle;
  if (se && se.frames > 0) {
    const w = 1 - ease.whipOut(clamp(frame / se.frames, 0, 1));
    st.tx += (se.dx ?? 0) * w;
    st.ty += (se.dy ?? 0) * w;
    st.s += (se.ds ?? 0) * w;
  }
  return st;
};

/** The current kick, 0..1 (a flash of weight or scale on a word that lands with the camera). */
export const kickAt = (info: CamInfo | null, frame: number) => (info ? info.kicks.reduce((m, k) => Math.max(m, kickEnv(frame - k)), 0) : 0);

const originOf = (info: CamInfo | null) => info?.spec.origin ?? ORIGIN;

/** The CSS transform of the camera at depth d. */
export const camStyle = (st: CamState, depth: number, origin: {x: number; y: number} = ORIGIN): React.CSSProperties => {
  const s = 1 + (st.s - 1) * depth;
  const r = st.r * Math.min(1, depth);
  return {transform: `translate(${(st.tx * depth).toFixed(3)}px, ${(st.ty * depth).toFixed(3)}px) rotate(${r.toFixed(4)}deg) scale(${s.toFixed(5)})`, transformOrigin: `${origin.x}px ${origin.y}px`};
};

/** The scene's camera now (identity outside an fx film). */
export const useCamState = (parts: {move?: boolean} = {}) => {
  const info = React.useContext(CameraCtx);
  const frame = useCurrentFrame();
  return camAt(info, frame, parts);
};
/** The camera as a style for a layer at `depth` (a scene that moves its own layers: PhotoStory's photo). */
export const useCamera = (depth = 1, parts: {move?: boolean} = {}): React.CSSProperties => {
  const info = React.useContext(CameraCtx);
  const frame = useCurrentFrame();
  if (!info || info.cls !== 'band') return {};
  return camStyle(camAt(info, frame, parts), depth, originOf(info));
};
/** The current kick, 0..1. */
export const useKick = () => {
  const info = React.useContext(CameraCtx);
  const frame = useCurrentFrame();
  return kickAt(info, frame);
};

/** A plane of the picture that moves with the camera, scaled by its depth (0.6 background, 1 subject, 1.3 foreground).
 *  Outside a band scene of an fx film it is a plain full-size layer. */
export const CameraLayer: React.FC<{depth?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({depth = 1, children, style}) => {
  const info = React.useContext(CameraCtx);
  const frame = useCurrentFrame();
  const cam = info && info.cls === 'band' && depth !== 0 ? camStyle(camAt(info, frame), depth, originOf(info)) : null;
  return <div style={{position: 'absolute', inset: 0, ...cam, ...style}}>{children}</div>;
};

/** Labels and readouts that never move with the camera. In a free scene (the whole scene moves) it cancels the move. */
export const Hud: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const info = React.useContext(CameraCtx);
  const frame = useCurrentFrame();
  let inv: React.CSSProperties | null = null;
  if (info && info.cls === 'free') {
    const st = camAt(info, frame);
    const o = originOf(info);
    inv = {transform: `scale(${(1 / st.s).toFixed(5)}) translate(${(-st.tx).toFixed(3)}px, ${(-st.ty).toFixed(3)}px)`, transformOrigin: `${o.x}px ${o.y}px`};
  }
  return <div style={{position: 'absolute', inset: 0, ...inv, ...style}}>{children}</div>;
};
