import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {ease} from '../lib/anim';
import {photoFile} from '../lib/photo';
import {ScreenImg} from '../lib/screen';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {CAP, FitText, fitHeight, S, shadow} from './kit/p2';
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
// widens and the camera pulls back to the WHOLE phone, or (a photo) to a whole disc of the photo inside the frame, and a hand
// circle lands where the detail was.
/** a photo's settled disc: this far from the frame's sides at least, and its foot over the subtitle band (frame y 1440) */
export const DISC_MARGIN = 56;
export const DISC_FOOT = 1420;
export const IrisDetail: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const dur = p.open ?? 26;
  const u = ease.data(Math.min(1, Math.max(0, (frame - 8) / dur)));
  const screen = !!p.screen;
  // the picture's resting box: a whole phone screen in the stage, or the full frame for a photo
  // the claim's foot: the circle opens BELOW it, its ring fades before it reaches a letter, and a capture never rises over it
  // (the fixtures' TEXT_CLASH: the ring and the zoomed phone ran through „ერთი ბარათი")
  const claimH = p.claim ? fitHeight(p.claim, S.right - S.left, 200, 2, 700, false, 0.98, 100) : 0;
  const claimBottom = S.top + claimH;
  const box = screen
    ? (() => {
        const h = S.bottom - S.top - (p.claim ? claimH + 40 : 20);
        const w = (h * CAP.w) / CAP.h;
        return {x: S.cx - w / 2, y: S.bottom - h, w, h};
      })()
    : {x: -60, y: -60, w: 1200, h: 2040};
  const fx = box.x + p.aim.x * box.w;
  const fy = box.y + p.aim.y * box.h;
  // a capture is sharp at 3x; a photo only to about 1.6x (the p3 prove run: the 3x photo inside the circle was soft)
  const z0 = screen ? 3 : 1.6;
  const z = z0 - (z0 - 1) * u;
  const r0 = 250;
  const cy0 = p.claim ? Math.min(S.bottom - r0, Math.max(S.cy, claimBottom + r0 + 40)) : S.cy;
  // where the iris settles. A capture: the whole phone (the circle opens past it). A photo: a WHOLE disc inside the frame,
  // DISC_MARGIN px clear of both sides, under the claim and over the subtitle band, so the line under it sits on paper (the
  // r3x round-2 panel, 2026-10-28: the disc opened to 1500 px and settled cut by the frame's top and sides, with the caption
  // as dark ink on the busy photo)
  const rEnd = screen ? 1500 : Math.max(r0, Math.min(540 - DISC_MARGIN, (DISC_FOOT - (claimBottom + 40)) / 2));
  const cxEnd = screen ? fx : S.cx;
  const cyEnd = screen ? fy : Math.min(DISC_FOOT - rEnd, Math.max(claimBottom + 40 + rEnd, S.cy));
  const cx = S.cx + (cxEnd - S.cx) * u;
  const cy = cy0 + (cyEnd - cy0) * u;
  const r = r0 + (rEnd - r0) * u;
  // the picture's offset: the detail under the circle's centre, but never so far that the photo leaves part of the disc bare
  const clampT = (t: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, t)));
  const tx = screen ? cx - fx * z : clampT(cx - fx * z, cx + r - (box.x + box.w) * z, cx - r - box.x * z);
  const ty = screen ? cy - fy * z : clampT(cy - fy * z, cy + r - (box.y + box.h) * z, cy - r - box.y * z);
  // the detail's place on screen once settled (the hand circle lands on it)
  const mx = screen ? fx : tx + fx * z;
  const my = screen ? fy : ty + fy * z;
  const ringOp = (screen ? 1 - u : 1) * (p.claim ? Math.min(1, Math.max(0, (cy - r - claimBottom - 8) / 40)) : 1);
  // the paper outside the circle (a mask: everything but the circle)
  const ring = `radial-gradient(circle ${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${(r - 0.5).toFixed(1)}px, #000 ${(r + 0.5).toFixed(1)}px)`;
  const outside: React.CSSProperties = {maskImage: ring, WebkitMaskImage: ring};
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
        <div style={{position: 'absolute', inset: 0, ...(screen && p.claim ? {clipPath: `inset(${(claimBottom + 24).toFixed(0)}px -200px -200px -200px)`} : {})}}>
          <div style={{position: 'absolute', inset: 0, transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${z.toFixed(4)})`, transformOrigin: '0 0'}}>{pic}</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0B0B0B" strokeWidth={8} opacity={ringOp} />
      </svg>
      {p.claim && screen ? <FitText text={p.claim} x={S.left} y={S.top} w={S.right - S.left} size={200} min={100} maxLines={2} weight={700} anim="none" lineHeight={0.98} /> : null}
      {/* over a photo the claim is white only where the photo is: ink on the paper outside the circle, white inside it (the p3
          prove run: the white claim stood on white paper while the iris opened, and read as nothing) */}
      {p.claim && !screen ? (
        <>
          <div style={{position: 'absolute', inset: 0, ...outside}}>
            <FitText text={p.claim} x={S.left} y={S.top} w={S.right - S.left} size={200} min={100} maxLines={2} weight={700} anim="none" lineHeight={0.98} />
          </div>
          <div style={{position: 'absolute', inset: 0, clipPath: `circle(${r.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`}}>
            <FitText text={p.claim} x={S.left} y={S.top} w={S.right - S.left} size={200} min={100} maxLines={2} weight={700} anim="none" lineHeight={0.98} style={{color: '#F5F5F5'}} />
          </div>
        </>
      ) : null}
      <Ink marks={[{kind: 'circle', box: {x: Math.min(Math.max(mx - 90, cx - r * 0.7), cx + r * 0.7 - 180), y: Math.min(Math.max(my - 60, cy - r * 0.7), cy + r * 0.7 - 120), w: 180, h: 120}, at: 8 + dur + 4}]} end={ctx.dur} />
      <Sfx name="asmr-shimmer" at={0} volume={0.34} /* event: frame 0, the detail */ />
      <Sfx name="asmr-air" at={8} volume={0.3} /* event: the iris opens */ />
    </>
  );
};
