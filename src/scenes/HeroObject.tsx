import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import type {SceneCtx} from '../types';
import {drift, FitText, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** a real object of the library (public/hero/hero.json "src": "hero/obd-port.png"), never a drawn icon */
  src: string;
  /** a short label over it (3 words at most) */
  label?: string;
  /** where its subject sits (fractions), so the push goes there */
  aim?: {x: number; y: number};
  at?: number;
};

// HeroObject (phase 2, plan step 5): the real object the film is about (the OBD port, the tyre's DOT code, the battery),
// a black-and-white cut-out photo whole on the paper with a soft shadow, a slow push towards its subject; hand marks come
// from the spec ("marks"). It replaces the flat clip-art icon.
export const HeroObject: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 6;
  const s = spr(frame, base, 'enterXL');
  const top = S.top + (p.label ? 150 : 20);
  const h = S.bottom - top - 20;
  const w = S.right - S.left;
  const fx = S.left + (p.aim?.x ?? 0.5) * w;
  const fy = top + (p.aim?.y ?? 0.5) * h;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: fx, y: fy})}}>
      {p.label ? <FitText text={p.label} x={S.left} y={S.top} w={w} size={96} min={52} maxLines={1} weight={700} at={at} /> : null}
      <Img
        className="vn-obj"
        src={staticFile(p.src)}
        style={{position: 'absolute', left: S.left, top, width: w, height: h, objectFit: 'contain', filter: 'grayscale(1) contrast(1.1) drop-shadow(0 24px 40px rgba(11,11,11,0.18))', opacity: Math.min(1, s * 1.4), transform: `scale(${(0.94 + 0.06 * s).toFixed(4)})`, transformOrigin: `${fx}px ${fy}px`}}
      />
      <Sfx name="cc0-leather-drop" at={base + 2} volume={0.3} /* event: the object lands */ />
    </div>
  );
};
