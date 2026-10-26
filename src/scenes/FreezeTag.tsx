import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {ease, spr} from '../lib/anim';
import {photoFile} from '../lib/photo';
import type {SceneCtx} from '../types';
import {CaptionScrim, FitText, S} from './kit/p2';
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
// and the claim already up at frame 0; on the freeze frame the picture stops dead with a shutter and a white flash, and a
// tag slams on. The first motion by frame 6, the first sound on frame 0, the picture changes by frame 60.
export const FreezeTag: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const fz = p.freezeAt ?? 16;
  const f = Math.min(frame, fz);
  const fx = p.aim?.x ?? 0.5;
  const fy = p.aim?.y ?? 0.5;
  const z = 1.08 + 0.16 * ease.whipOut(Math.min(1, f / fz));
  const shake = frame < fz ? Math.sin(f * 2.3) * 6 * (1 - f / fz) : 0;
  const flash = frame >= fz ? Math.max(0, 1 - (frame - fz) / 5) : 0;
  const s = spr(frame, fz + 2, 'punch');
  return (
    <div style={{position: 'absolute', left: -60, top: -60, width: 1200, height: 2040, overflow: 'hidden'}}>
      <Img src={photoFile(p.src)} style={{position: 'absolute', left: 0, top: 0, width: 1200, height: 2040, objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`, filter: `grayscale(1) contrast(${frame >= fz ? 1.2 : 1.08})`, transform: `translate(${shake}px, 0) scale(${z.toFixed(4)})`, transformOrigin: `${fx * 100}% ${fy * 100}%`}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0) 60%)'}} />
      <CaptionScrim />
      <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', opacity: flash * 0.85}} />
      <div style={{position: 'absolute', left: 60, top: 60}}>
        <FitText text={p.claim} x={S.left} y={S.top} w={S.right - S.left} size={210} min={110} maxLines={2} weight={700} anim="none" style={{color: '#F5F5F5'}} lineHeight={0.98} />
        {frame >= fz + 2 ? (
          <div style={{position: 'absolute', left: S.left - 10, top: 980, padding: '10px 26px 14px', background: '#F5F5F5', borderRadius: 14, transform: `rotate(-3deg) scale(${(1.3 - 0.3 * Math.min(1, s)).toFixed(4)})`, transformOrigin: 'left center', opacity: Math.min(1, s * 1.5)}}>
            <FitText text={p.tag} x={0} y={0} w={700} size={96} min={56} maxLines={1} weight={700} anim="none" style={{position: 'relative', color: '#0B0B0B'}} />
          </div>
        ) : null}
      </div>
      <Sfx name="asmr-whoomp" at={0} volume={0.4} /* event: frame 0, the hook's first sound */ />
      <Sfx name="asmr-camera" at={fz} volume={0.5} /* event: the freeze */ />
    </div>
  );
};
