// src/scenes/illo/cam.tsx: the illustrated scenes' camera, on the first batch's rig (src/lib/camera.tsx: CameraCtx,
// CameraLayer, Hud, the same camAt maths and MOTION.band budgets). Wave A was built before batch 1 was merged and had a
// local copy of the rig; since the merge (2026-10-06) this file only adapts the scenes' vocabulary to it:
//
//   <Camera ctx spec over kicks>  a scene's camera: `spec` {move, amount, travel, roll, origin, shake} is the staging's own
//                                 designed move (its origin on the subject, a road's shake), `over` the spec's "camera"
//                                 prop (it wins), `kicks` the scene frames of its impacts.
//                                 In a planned fx film (tools/ci/fx.mjs: Promo's SceneHost provides the band camera) the
//                                 plan's settle (the velocity a transition carries in), seed and kicks stay, the staging's
//                                 move replaces the planner's random pick, and the scene's kicks join the plan's
//                                 (MOTION.kickGap apart). Outside one (an older film, the gallery) the scene gets the same
//                                 band camera of its own.
//   <Plane depth>                 lib/camera's CameraLayer: a plane of the picture scaled by its depth (0.6 the backdrop,
//                                 1 the subject, 1.3 the near framing): one move gives parallax
//   <Hud>                         lib/camera's Hud: labels and punch words, never moved, never shaken
//   useCam() / useKick()          the camera state now / the current kick 0..1
// IlloBand (scene.tsx) passes camera={false} to the picture band: the planes move, the band itself never adds a layer.
// Everything here is frame-driven and deterministic.
import React from 'react';
import {CameraCtx, CameraLayer, Hud as RigHud, kickEnv, useCamState, useKick as useRigKick, type CamInfo} from '../../lib/camera';
import {ease} from '../../lib/anim';
import {MOTION} from '../../tokens';
import type {CameraSpec, CamMove, SceneCtx} from '../../types';
import {entrance} from '../common';

export type {CamMove};
export type CamSpec = Pick<CameraSpec, 'move' | 'amount' | 'travel' | 'roll' | 'origin' | 'shake'>;
export type CamState = {tx: number; ty: number; s: number; r: number};
export {kickEnv};

/** Kicks sorted and at least `gap` frames apart (a burst every few frames would read as a shaking picture). */
const spaced = (all: number[], gap: number) => {
  const out: number[] = [];
  for (const k of [...all].filter((x) => Number.isFinite(x)).sort((a, b) => a - b)) if (!out.length || k - out[out.length - 1] >= gap) out.push(Math.round(k));
  return out;
};
/** The keys of a camera spec that are set (a staging's spec leaves most of them out). */
const defined = (s: CamSpec | undefined): CamSpec => Object.fromEntries(Object.entries(s ?? {}).filter(([, v]) => v !== undefined)) as CamSpec;

/** A scene's camera: its staging's move (the spec's "camera" overrides it) and its impact frames. */
export const Camera: React.FC<{ctx: SceneCtx; spec?: CamSpec; over?: unknown; kicks?: number[]; children: React.ReactNode}> = ({ctx, spec, over, kicks = [], children}) => {
  const planned = React.useContext(CameraCtx);
  const o = defined(over && typeof over === 'object' ? (over as CamSpec) : undefined);
  const info: CamInfo =
    planned && planned.cls === 'band'
      ? {...planned, spec: {...planned.spec, ...defined(spec), ...o, settle: planned.spec.settle}, kicks: spaced([...planned.kicks, ...kicks], MOTION.kickGap)}
      : {spec: {...defined(spec), ...o}, cls: 'band', seed: `illo:${ctx.index}:${ctx.dur}`, kicks: spaced(kicks, 12), e: entrance(ctx), dur: ctx.dur};
  return <CameraCtx.Provider value={info}>{children}</CameraCtx.Provider>;
};

/** The camera now. */
export const useCam = (): CamState => useCamState();
/** The current kick, 0..1. */
export const useKick = () => useRigKick();

/** A plane of the picture at `depth` (0.6 backdrop, 1 subject, 1.3 near framing). */
export const Plane: React.FC<{depth?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({depth = 1, children, style}) => (
  <CameraLayer depth={depth} style={style}>
    {children}
  </CameraLayer>
);

/** Words and labels that never move with the camera. */
export const Hud: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <RigHud style={style}>{children}</RigHud>;

/** ease.camera re-exported for scenes that slide a layer themselves (a turn, a pan). */
export const camEase = ease.camera;
