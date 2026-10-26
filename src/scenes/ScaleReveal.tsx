import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Item = {label: string; value: number; shown?: string; t?: P2Tone};
type P = {
  /** 2 or 3 sizes, smallest first: drawn to TRUE AREA (a square's side is the root of its value) */
  items: Item[];
  /** the chunk the camera pulls out on (default 18 frames in) */
  at?: number;
  /** a source line (required for a real figure) */
  source?: string;
};

// ScaleReveal (phase 2): sizes drawn to true area. The shot opens close on the smallest square (it fills the frame), then
// the camera pulls out (BEZ.data) and the bigger ones appear beside it at their real scale: the jump the viewer feels.
export const ScaleReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const items = (p.items ?? []).slice(0, 3).filter((i) => i.value > 0).sort((a, b) => a.value - b.value);
  if (!items.length) return null;
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(0, base) + 18;
  const big = items[items.length - 1];
  // the biggest square fills 620 px; the others by the root of their share of its value
  const sideOf = (v: number) => 620 * Math.sqrt(v / big.value);
  const sides = items.map((i) => sideOf(i.value));
  const gap = 40;
  const totalW = sides.reduce((s, x) => s + x, 0) + gap * (items.length - 1);
  const k = Math.min(1, (S.right - S.left) / totalW);
  const foot = S.top + 160 + 620 * k; // every square stands on one baseline
  let x = S.cx - (totalW * k) / 2;
  const boxes = items.map((it, i) => {
    const s = sides[i] * k;
    const b = {x, y: foot - s, s};
    x += s + gap * k;
    return b;
  });
  // the camera: from filling the stage with the smallest square to the whole row
  const u = ease.data(Math.min(1, Math.max(0, (frame - at) / 30)));
  const z0 = Math.min(6, (S.right - S.left) / 1.15 / boxes[0].s);
  const z = z0 + (1 - z0) * u;
  const fx = boxes[0].x + boxes[0].s / 2;
  const fy = boxes[0].y + boxes[0].s / 2;
  const cx = fx + (S.cx - fx) * u;
  const cy = fy + (S.cy - 60 - fy) * u;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${(S.cx - cx * z).toFixed(2)}px, ${(S.cy - 60 - cy * z).toFixed(2)}px) scale(${z.toFixed(4)})`, transformOrigin: '0 0'}}>
        {boxes.map((b, i) => {
          const on = i === 0 ? spr(frame, base, 'enter') : prog(frame, at + 8 + i * 6, 10, ease.data);
          return <div key={i} className="vn-obj" style={{position: 'absolute', left: b.x, top: b.y + (1 - on) * 30, width: b.s, height: b.s, borderRadius: Math.max(6, b.s * 0.04), background: i === items.length - 1 ? tone(items[i].t ?? 'ink') : items[i].t ? tone(items[i].t) : C.ink2, opacity: on}} />;
        })}
      </div>
      {boxes.map((b, i) => (
        <FitText key={i} text={`${items[i].shown ?? items[i].value} ${items[i].label}`} x={b.x + b.s / 2} y={foot + 30 + (i % 2) * 0} w={Math.max(180, b.s + gap - 8)} size={46} min={34} maxLines={2} weight={600} align="center" at={at + 26 + i * 4} />
      ))}
      {p.source ? <FitText text={p.source} x={S.left} y={foot + 170} w={S.right - S.left} size={34} min={30} maxLines={1} weight={500} t="quiet" at={at + 36} anim="none" /> : null}
      <Sfx name="asmr-air-long" at={at} volume={0.3} /* event: the camera pulls out */ />
    </div>
  );
};
