import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {ease, spr} from '../lib/anim';
import {photoFile, photoInfo} from '../lib/photo';
import type {SceneCtx} from '../types';
import {CaptionScrim, FitText, fitHeight, S} from './kit/p2';
import {Sfx} from './common';

type P = {
  /** the claim, readable at frame 0 (Mtavruli, 200 px or more where it fits) */
  claim: string;
  /** the trouble, mid-action: a photo (public/photos; greyscale) */
  src: string;
  /** the tag that slams on the freeze (2 words: „ეს მე ვარ", „1 200 ₾") */
  tag: string;
  /** where the camera pushes (photo fractions) */
  aim?: {x: number; y: number};
  /** the freeze frame (default 16) */
  freezeAt?: number;
};

// FreezeTag (phase 2, a hook): the film opens MID-TROUBLE on a full-bleed photo already moving (a fast push with a shake)
// and the claim already up at frame 0; on the freeze frame the picture stops dead with a shutter (its contrast steps up) and
// a tag slams on. The first motion by frame 6, the first sound on frame 0, the picture changes by frame 60.
// No white flash (the r3x round-2 panel, 2026-10-28): the old 85 % white sheet over the whole frame on the freeze read as a
// full grey flash frame at 0.60 s (humour) and a washed-out photo (story), the artifact the owner deletes films for; the
// tag sits level at rest (it tilts only while it slams in), a sticker floating at -3 deg read as untidy.
/** a photo wider than this (w / h) is shown WHOLE (fit, on black), never cropped to a wheel (the r3x round-2 story film: the
 *  1899 car was a hard crop of a wheel and a slice of body) */
export const FREEZE_FIT_AR = 0.8;
/** the whole photo's box: as wide as the frame less FIT_MARGIN each side, under the claim, its foot over the subtitle band */
const FIT_MARGIN = 56;
const FIT_FOOT = 1420;

export const FreezeTag: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const fz = p.freezeAt ?? 16;
  const f = Math.min(frame, fz);
  const fx = p.aim?.x ?? 0.5;
  const fy = p.aim?.y ?? 0.5;
  const z = 1.08 + 0.16 * ease.whipOut(Math.min(1, f / fz));
  const shake = frame < fz ? Math.sin(f * 2.3) * 6 * (1 - f / fz) : 0;
  const s = spr(frame, fz + 2, 'punch');
  const info = photoInfo(p.src);
  const ar = info ? info.w / info.h : 0.66;
  const fit = ar > FREEZE_FIT_AR;
  // fit: the claim's foot (frame px), then the photo whole under it (the push and the shake move the whole print, never
  // inside it, so the car stays whole)
  const claimBottom = S.top + fitHeight(p.claim, S.right - S.left, 210, 2, 700, false, 0.98, 110);
  const box = (() => {
    const top = claimBottom + 40;
    let w = 1080 - 2 * FIT_MARGIN;
    let h = w / ar;
    if (h > FIT_FOOT - top) {
      h = FIT_FOOT - top;
      w = h * ar;
    }
    return {x: 540 - w / 2, y: top + Math.max(0, (FIT_FOOT - top - h) / 2), w, h};
  })();
  const zf = 1 + 0.04 * ease.whipOut(Math.min(1, f / fz));
  // the tag: on the photo's lower left when it is whole, else where it always stood (frame y 1040)
  const tagTop = fit ? Math.min(980, box.y + box.h - 60 - 130) : 980;
  return (
    <div style={{position: 'absolute', left: -60, top: -60, width: 1200, height: 2040, overflow: 'hidden', ...(fit ? {background: '#0B0B0B'} : {})}}>
      {fit ? (
        <div style={{position: 'absolute', left: box.x + 60, top: box.y + 60, width: box.w, height: box.h, overflow: 'hidden', transform: `translate(${shake}px, 0) scale(${zf.toFixed(4)})`, transformOrigin: 'center center', outline: '2px solid rgba(245,245,245,0.35)', outlineOffset: 10}}>
          <Img src={photoFile(p.src)} style={{width: box.w, height: box.h, objectFit: 'cover', filter: `grayscale(1) contrast(${frame >= fz ? 1.2 : 1.08})`}} />
        </div>
      ) : (
        <>
          <Img src={photoFile(p.src)} style={{position: 'absolute', left: 0, top: 0, width: 1200, height: 2040, objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`, filter: `grayscale(1) contrast(${frame >= fz ? 1.2 : 1.08})`, transform: `translate(${shake}px, 0) scale(${z.toFixed(4)})`, transformOrigin: `${fx * 100}% ${fy * 100}%`}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0) 60%)'}} />
          <CaptionScrim />
        </>
      )}
      <div style={{position: 'absolute', left: 60, top: 60}}>
        <FitText text={p.claim} x={S.left} y={S.top} w={S.right - S.left} size={210} min={110} maxLines={2} weight={700} anim="none" style={{color: '#F5F5F5'}} lineHeight={0.98} />
        {frame >= fz + 2 ? (
          <div style={{position: 'absolute', left: S.left - 10, top: tagTop, padding: '10px 26px 14px', background: '#F5F5F5', borderRadius: 14, transform: `rotate(${(-3 * (1 - Math.min(1, s))).toFixed(3)}deg) scale(${(1.3 - 0.3 * Math.min(1, s)).toFixed(4)})`, transformOrigin: 'left center', opacity: Math.min(1, s * 1.5)}}>
            <FitText text={p.tag} x={0} y={0} w={700} size={96} min={56} maxLines={1} weight={700} anim="none" style={{position: 'relative', color: '#0B0B0B'}} />
          </div>
        ) : null}
      </div>
      <Sfx name="asmr-whoomp" at={0} volume={0.4} /* event: frame 0, the hook's first sound */ />
      <Sfx name="asmr-camera" at={fz} volume={0.5} /* event: the freeze */ />
    </div>
  );
};
