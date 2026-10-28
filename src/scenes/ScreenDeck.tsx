import React from 'react';
import {useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import type {SceneCtx} from '../types';
import {drift, FitText, HeroPhone, phoneGeom, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** 3 or 4 current captures: the "and also" beat */
  screens: string[];
  /** an optional label under each (2 words at most) */
  labels?: string[];
  /** the chunks the cards arrive on (default: 8 frames apart) */
  at?: number[];
};

// ScreenDeck (phase 2): 3 or 4 flat screens fanned side by side, each one WHOLE (never cropped), arriving one by one with
// a soft card sound: the "and it also does this" beat.
export const ScreenDeck: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const list = (p.screens ?? []).slice(0, 4);
  const n = list.length;
  if (!n) return null;
  // the phones' height: as tall as the stage allows with the labels under them, and n of them side by side with a gap
  const labelH = p.labels?.length ? 90 : 0;
  const gap = 26;
  const wMax = (S.right - S.left - gap * (n - 1)) / n;
  const h0 = phoneGeom(1000).w / 1000; // width per unit height
  const h = Math.min(S.bottom - S.top - labelH - 40, wMax / h0);
  const g0 = phoneGeom(h);
  const total = n * g0.w + (n - 1) * gap;
  const x0 = S.cx - total / 2 + g0.w / 2;
  const cy = S.top + 20 + h / 2;
  const at = list.map((_, i) => (p.at?.[i] !== undefined ? cueFrame(ctx, p.at[i]) : Math.max(0, base) + 6 + i * 8));
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      {list.map((src, i) => {
        const g = phoneGeom(h, x0 + i * (g0.w + gap), cy);
        const s = spr(frame, at[i], 'enter');
        const tilt = (i - (n - 1) / 2) * 1.2 * (1 - s);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 90}px) rotate(${tilt}deg)`, transformOrigin: `${g.x + g.w / 2}px ${g.y + g.h}px`}}>
              <HeroPhone g={g} screen={src} />
            </div>
            {p.labels?.[i] ? <FitText text={p.labels[i]} x={g.x + g.w / 2} y={g.y + g.h + 26} w={g.w + gap - 6} size={44} min={34} maxLines={1} weight={600} align="center" at={at[i] + 6} /> : null}
            <Sfx name="cc0-card-place" at={at[i]} volume={0.3} /* event: a card lands */ />
          </React.Fragment>
        );
      })}
    </div>
  );
};
