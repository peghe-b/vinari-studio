import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {photoFile} from '../lib/photo';
import type {SceneCtx} from '../types';
import {S} from './kit/paper';
import {ShoutWords} from './kit/shout';

export {shoutLayout} from './kit/shout';

type P = {
  /** the speaker's sex (his voice; tools/ci/humor.mjs CHAR_VISIBLE: the shout on screen is his) */
  sex: 'm' | 'f';
  /** the hinge word (as said): set on a line of its own, the biggest, and the one word left standing on the pause */
  hinge?: string;
  /** the photo of what the shout is about (public/photos: the blocked car, the jam), greyscale under a dark veil, the words
   *  white over it (the r3x round-2 panel, 2026-10-28: 3.4 s of words alone on blank paper, the film's longest shot; alone
   *  on paper the shout should hold 1.2 s at most) */
  src?: string;
};

// ShoutType (the humour kit, ported from phase 2 on 2026-10-31): the shout IS the picture. The character's line slams in word by word with his voice
// (the beat's "subs": "inPicture": no caption), in heavy Mtavruli set as a poster over the whole stage (every line fills
// the measure, the hinge word on its own line and the biggest). A bleeped word is a black bar the size of the cut word.
// After the voice ends the frame FREEZES (the pause, the beat's "hold"): every word but the hinge fades back to a ghost,
// and the hand marker underlines the hinge. r3 review (2026-10-27): the profile bust above the type read as a stock avatar
// with a glitchy mouth (promo-craft: no primitive cartoon faces) and left the bottom 40 % of the frame empty, so the
// figure is gone and the poster fills the stage; a speaker on screen is SideCar's (the kit's refined car and driver).
export const ShoutType: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const words = (ctx.words ?? []).flat();
  const spans = ctx.speech ?? [];
  if (!p.src) return <ShoutWords words={words} spans={spans} hinge={p.hinge} top={S.top + 40} bottom={S.bottom} frame={frame} dur={ctx.dur} />;
  const z = 1.04 + 0.04 * Math.min(1, frame / Math.max(1, ctx.dur));
  return (
    <>
      <div style={{position: 'absolute', left: -60, top: -60, width: 1200, height: 2040, overflow: 'hidden', background: '#0B0B0B'}}>
        <Img src={photoFile(p.src)} style={{position: 'absolute', inset: 0, width: 1200, height: 2040, objectFit: 'cover', filter: 'grayscale(1) contrast(1.1)', transform: `scale(${z.toFixed(4)})`}} />
        <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)'}} />
      </div>
      <ShoutWords words={words} spans={spans} hinge={p.hinge} top={S.top + 40} bottom={S.bottom} frame={frame} dur={ctx.dur} color="#F5F5F5" />
    </>
  );
};
