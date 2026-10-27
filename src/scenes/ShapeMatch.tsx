import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {FitText, S} from './kit/p2';
import {Sfx} from './common';

const SHAPES = {
  dot: {w: 120, h: 120, r: 60},
  coin: {w: 420, h: 420, r: 210},
  card: {w: 700, h: 440, r: 36},
  phone: {w: 460, h: 960, r: 70},
  pill: {w: 640, h: 160, r: 80},
  bar: {w: 860, h: 90, r: 14},
} as const;
type Shape = keyof typeof SHAPES;
type P = {
  /** the shape this shot's object ends on, and the shape the next shot's object starts as (once a film) */
  from: Shape;
  to: Shape;
  /** a label on the shape (2 words) */
  label?: string;
};

// ShapeMatch (phase 2, a match cut, ONCE a film): one object's shape morphs into the next scene's (a coin into a phone, a
// card into a bar), in ink on the paper, so the cut lands on the same silhouette: the NEXT shot must open on that shape
// (p2lint SHAPE_MATCH: a bar into a chart, a phone into the app, a card into a card, a coin or a dot into a number).
export const ShapeMatch: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const a = SHAPES[p.from] ?? SHAPES.card;
  const b = SHAPES[p.to] ?? SHAPES.phone;
  const u = ease.data(Math.min(1, Math.max(0, (frame - 8) / Math.max(10, ctx.dur - 14))));
  const w = a.w + (b.w - a.w) * u;
  const h = a.h + (b.h - a.h) * u;
  const r = a.r + (b.r - a.r) * u;
  // the label clear of the shape at its tallest: under it, else over it, else none (a phone fills the stage)
  const half = Math.max(a.h, b.h) / 2;
  const labelY = !p.label ? null : S.cy + half + 40 + 80 <= S.bottom ? S.cy + half + 40 : S.cy - half - 40 - 80 >= S.top ? S.cy - half - 40 - 80 : null;
  return (
    <>
      <div className="vn-obj" style={{position: 'absolute', left: S.cx - w / 2, top: S.cy - h / 2, width: w, height: h, borderRadius: r, background: C.ink}} />
      {/* the label in ink on the paper under the shape, readable the whole shot (the p3 prove run: printed on the shape in
          paper colour it faded and squeezed into a bare black bar) */}
      {labelY !== null ? <FitText text={p.label ?? ''} x={S.cx} y={labelY} w={S.right - S.left} size={72} min={44} maxLines={1} weight={700} align="center" anim="none" /> : null}
      <Sfx name="asmr-air" at={8} volume={0.28} /* event: the shape starts to change */ />
    </>
  );
};
