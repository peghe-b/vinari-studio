// The camera kicks a scene brings itself (src/lib/camera.tsx): the frames of its own impacts, computed with the very
// functions the scene draws them with, so the kick and the event always land together. Promo merges them with the
// spec's own `camera.kicks` and keeps them MOTION.kickGap apart.
import {bnKicks} from '../scenes/BigNumber';
import {cbKicks} from '../scenes/Callback';
import {khKicks} from '../scenes/KineticHeadline';
import {psKicks} from '../scenes/PhotoStory';
import {spKicks} from '../scenes/Split';
import {tlKicks} from '../scenes/Timeline';
import {twKicks} from '../scenes/Twist';
import {cueFrame} from '../scenes/common';
import {MOTION} from '../tokens';
import type {SceneCtx, SceneSpec} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BUILT_IN: Record<string, (p: any, ctx: SceneCtx) => number[]> = {
  KineticHeadline: khKicks,
  BigNumber: bnKicks,
  PhotoStory: psKicks,
  Twist: twKicks,
  Split: spKicks,
  Timeline: tlKicks,
  Callback: cbKicks,
  // a Film scene names its key moment `hitAt` (a chunk or "1.2s"): the camera kicks there (src/scenes/film/_template.tsx)
  Film: (p: {hitAt?: number | string}, ctx: SceneCtx) => (p.hitAt !== undefined ? [cueFrame(ctx, p.hitAt)] : []),
};

/** The scene's kicks (scene frames), merged with `extra`, sorted, at least MOTION.kickGap apart (the earlier wins). */
export const sceneKicks = (spec: SceneSpec, ctx: SceneCtx, extra: number[] = []) => {
  let own: number[] = [];
  try {
    own = BUILT_IN[spec.type]?.(spec, ctx) ?? [];
  } catch {
    own = [];
  }
  const all = [...own, ...extra].filter((f) => Number.isFinite(f) && f >= 0 && f < ctx.dur + 8).sort((a, b) => a - b);
  const out: number[] = [];
  for (const f of all) if (!out.length || f - out[out.length - 1] >= MOTION.kickGap) out.push(Math.round(f));
  return out;
};
