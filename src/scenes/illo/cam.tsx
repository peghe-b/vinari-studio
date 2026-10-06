// src/scenes/illo/cam.tsx: the illustrated scenes' camera, a small LOCAL rig (spec 3.3 and 4.1: three depth planes and a
// HUD). The first batch's rig (src/lib/camera.tsx: CameraLayer, Hud, useKick, planned by tools/ci/fx.mjs) was not merged
// when wave A was built, so the scenes use this one, with the same vocabulary and the same maths:
//
//   <Camera ctx spec kicks>     a scene's camera: `spec` {move, amount, travel, roll, origin, shake} (the scene's default
//                               move, overridden by the spec's "camera" prop), `kicks` the scene frames of its impacts
//   <Plane depth>               a plane of the picture that moves with the camera, scaled by its depth (0.6 the backdrop,
//                               1 the subject, 1.3 the near framing): one move gives parallax
//   <Hud>                       labels and punch words: never move, never shake (depth 0)
//   useCam() / useKick()        the camera state now / the current kick 0..1 (a word that lands with the camera)
//
// Switching to batch 1 later: Plane becomes lib/camera's CameraLayer and Hud its Hud when its CameraCtx is present (a
// planned fx film); Camera then only forwards the scene's kicks. Everything here is frame-driven and deterministic.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease} from '../../lib/anim';
import {L} from '../../tokens';
import type {SceneCtx} from '../../types';
import {entrance} from '../common';

export type CamMove = 'push' | 'pull' | 'drift-l' | 'drift-r' | 'rise' | 'sink' | 'arc-l' | 'arc-r' | 'still';
export type CamSpec = {move?: CamMove; amount?: number; travel?: number; roll?: number; origin?: {x: number; y: number}; shake?: number};
export type CamState = {tx: number; ty: number; s: number; r: number};

// budgets (a band scene of batch 1's MOTION table): the move's scale, travel and roll, the kick's scale and burst
const B = {scale: 0.06, travel: 40, roll: 1.2, kick: 0.022, burst: 5};
const DEF = {amount: 0.035, travel: 24, roll: 0.7};

type Info = {spec: CamSpec; kicks: number[]; e: number; dur: number};
const Ctx = React.createContext<Info | null>(null);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** The drift curve: fast on the cut, settling (never fully stopping) toward the scene's end. */
const drift = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 + (t - 1) * 0.15 : 1 - (1 - t) ** 2.2 * (1 - 0.15 * t));

/** An impact's envelope dk frames after it: up in 3 frames to a rounded top, then an exponential fall. */
const KICK_UP = [0.45, 0.85, 1];
export const kickEnv = (dk: number) => (dk < 0 || dk > 40 ? 0 : dk < 3 ? KICK_UP[Math.floor(dk)] : 0.92 * Math.exp(-(dk - 3) / 3.6));

const moveOf = (m: CamMove | undefined, p: number, A: number, T: number, R: number): CamState => {
  const half = (x: number) => x / 2 - x * p;
  switch (m) {
    case 'pull':
      return {tx: 0, ty: 0, s: 1 + A * (1 - p), r: 0};
    case 'drift-l':
      return {tx: -half(T), ty: 0, s: 1 + 0.012 * p, r: 0};
    case 'drift-r':
      return {tx: half(T), ty: 0, s: 1 + 0.012 * p, r: 0};
    case 'rise':
      return {tx: 0, ty: -half(T), s: 1 + 0.012 * p, r: 0};
    case 'sink':
      return {tx: 0, ty: half(T), s: 1 + 0.012 * p, r: 0};
    case 'arc-l':
      return {tx: -half(T), ty: 0, s: 1 + 0.02 * p, r: half(R)};
    case 'arc-r':
      return {tx: half(T), ty: 0, s: 1 + 0.02 * p, r: -half(R)};
    case 'still':
      return {tx: 0, ty: 0, s: 1, r: 0};
    default:
      return {tx: 0, ty: 0, s: 1 + A * p, r: 0};
  }
};

/** The camera at a scene frame. */
export const camAt = (info: Info | null, frame: number): CamState => {
  if (!info) return {tx: 0, ty: 0, s: 1, r: 0};
  const {spec} = info;
  const t = (frame - info.e) / Math.max(1, info.dur - info.e);
  const st = moveOf(spec.move, drift(t), clamp(spec.amount ?? DEF.amount, 0, B.scale), clamp(spec.travel ?? DEF.travel, 0, B.travel), clamp(spec.roll ?? DEF.roll, 0, B.roll));
  const S = clamp(spec.shake ?? 0, 0, 1);
  if (S > 0) {
    // road vibration: two incommensurate sines (deterministic), never a per-frame jitter
    st.tx += S * 2.2 * (Math.sin(frame * 0.71) * 0.6 + Math.sin(frame * 1.93 + 1.1) * 0.4);
    st.ty += S * 1.6 * (Math.sin(frame * 0.83 + 0.4) * 0.6 + Math.sin(frame * 2.27) * 0.4);
  }
  let kick = 0;
  for (const k of info.kicks) {
    const dk = frame - k;
    if (dk < 0 || dk > 40) continue;
    kick = Math.max(kick, kickEnv(dk));
    const b = B.burst * Math.exp(-dk / 5) * Math.sin(dk * 0.9);
    const th = (k * 2.399) % (Math.PI * 2);
    st.tx += b * Math.cos(th);
    st.ty += b * Math.sin(th);
  }
  st.s = 1 + clamp(st.s - 1, -B.scale, B.scale) + B.kick * kick;
  return st;
};

const ORIGIN: {x: number; y: number} = {x: 540, y: L.contentMid};
const styleOf = (st: CamState, depth: number, origin = ORIGIN): React.CSSProperties => {
  const s = 1 + (st.s - 1) * depth;
  const r = st.r * Math.min(1, depth);
  return {transform: `translate(${(st.tx * depth).toFixed(3)}px, ${(st.ty * depth).toFixed(3)}px) rotate(${r.toFixed(4)}deg) scale(${s.toFixed(5)})`, transformOrigin: `${origin.x}px ${origin.y}px`};
};

/** A scene's camera: its default move (the spec's "camera" overrides it) and its impact frames. */
export const Camera: React.FC<{ctx: SceneCtx; spec?: CamSpec; over?: unknown; kicks?: number[]; children: React.ReactNode}> = ({ctx, spec, over, kicks = [], children}) => {
  const o = over && typeof over === 'object' ? (over as CamSpec) : {};
  const sorted = [...kicks].filter((k) => Number.isFinite(k)).sort((a, b) => a - b);
  // kicks at least 12 frames apart (a burst every few frames would read as a shaking picture)
  const ks: number[] = [];
  for (const k of sorted) if (!ks.length || k - ks[ks.length - 1] >= 12) ks.push(k);
  const info: Info = {spec: {...spec, ...o}, kicks: ks, e: entrance(ctx), dur: ctx.dur};
  return <Ctx.Provider value={info}>{children}</Ctx.Provider>;
};

/** The camera now. */
export const useCam = () => camAt(React.useContext(Ctx), useCurrentFrame());
/** The current kick, 0..1. */
export const useKick = () => {
  const info = React.useContext(Ctx);
  const f = useCurrentFrame();
  return info ? info.kicks.reduce((m, k) => Math.max(m, kickEnv(f - k)), 0) : 0;
};

/** A plane of the picture at `depth` (0.6 backdrop, 1 subject, 1.3 near framing). */
export const Plane: React.FC<{depth?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({depth = 1, children, style}) => {
  const info = React.useContext(Ctx);
  const f = useCurrentFrame();
  const cam = info && depth !== 0 ? styleOf(camAt(info, f), depth, info.spec.origin ?? ORIGIN) : null;
  return <div style={{position: 'absolute', inset: 0, ...cam, ...style}}>{children}</div>;
};

/** Words and labels that never move with the camera. */
export const Hud: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <div style={{position: 'absolute', inset: 0, ...style}}>{children}</div>;

/** ease.camera re-exported for scenes that slide a layer themselves (a turn, a pan). */
export const camEase = ease.camera;
