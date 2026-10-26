import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {ease} from '../lib/anim';
import {photoFile} from '../lib/photo';
import {ScreenImg} from '../lib/screen';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {CAP, CaptionScrim, FitText, S, shadow} from './kit/p2';
import {Sfx} from './common';

type P = {
  /** a photo (public/photos) or a current capture (screen): the whole picture the iris opens onto */
  src?: string;
  screen?: string;
  /** the detail the shot opens on (fractions of the picture) */
  aim: {x: number; y: number};
  /** the claim over it, readable at frame 0 */
  claim?: string;
  /** frames the iris takes to open (default 26) */
  open?: number;
};

// IrisDetail (phase 2, a hook): the film opens on a whole circle of detail (the picture 3x, a ring round it), then the iris
// widens and the camera pulls back to the WHOLE phone or photo, and a hand circle lands where the detail was.
export const IrisDetail: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const dur = p.open ?? 26;
  const u = ease.data(Math.min(1, Math.max(0, (frame - 8) / dur)));
  const screen = !!p.screen;
  // the picture's resting box: a whole phone screen in the stage, or the full frame for a photo
  const box = screen
    ? (() => {
        const h = S.bottom - S.top - (p.claim ? 260 : 20);
        const w = (h * CAP.w) / CAP.h;
        return {x: S.cx - w / 2, y: S.bottom - h, w, h};
      })()
    : {x: -60, y: -60, w: 1200, h: 2040};
  const fx = box.x + p.aim.x * box.w;
  const fy = box.y + p.aim.y * box.h;
  const z = 3 - 2 * u;
  const cx = S.cx + (fx - S.cx) * u;
  const cy = S.cy + (fy - S.cy) * u;
  const r0 = 250;
  const r = r0 + (1500 - r0) * u;
  const pic = screen ? (
    <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: box.w * 0.11, overflow: 'hidden', boxShadow: shadow()}}>
      <ScreenImg src={p.screen!} style={{width: box.w, height: box.h}} />
    </div>
  ) : (
    <Img src={photoFile(p.src ?? '')} style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, objectFit: 'cover', filter: 'grayscale(1) contrast(1.08)'}} />
  );
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`}}>
        <div style={{position: 'absolute', inset: 0, transform: `translate(${(cx - fx * z).toFixed(2)}px, ${(cy - fy * z).toFixed(2)}px) scale(${z.toFixed(4)})`, transformOrigin: '0 0'}}>{pic}</div>
        {!screen ? <CaptionScrim /> : null}
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0B0B0B" strokeWidth={8} opacity={1 - u} />
      </svg>
      {p.claim ? <FitText text={p.claim} x={S.left} y={S.top} w={S.right - S.left} size={200} min={100} maxLines={2} weight={700} anim="none" lineHeight={0.98} style={!screen ? {color: '#F5F5F5'} : undefined} /> : null}
      <Ink marks={[{kind: 'circle', box: {x: fx - 90, y: fy - 60, w: 180, h: 120}, at: 8 + dur + 4}]} end={ctx.dur} />
      <Sfx name="asmr-shimmer" at={0} volume={0.34} /* event: frame 0, the detail */ />
      <Sfx name="asmr-air" at={8} volume={0.3} /* event: the iris opens */ />
    </>
  );
};
