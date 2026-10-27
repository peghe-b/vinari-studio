import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {SceneCtx} from '../types';
import {S} from './kit/p2';
import {ShoutWords} from './kit/shout';

export {shoutLayout} from './kit/shout';

type P = {
  /** the speaker's sex (his voice; tools/ci/humor.mjs CHAR_VISIBLE: the shout on screen is his) */
  sex: 'm' | 'f';
  /** the hinge word (as said): set on a line of its own, the biggest, and the one word left standing on the pause */
  hinge?: string;
};

// ShoutType (phase 2, the humour kit): the shout IS the picture. The character's line slams in word by word with his voice
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
  return <ShoutWords words={words} spans={spans} hinge={p.hinge} top={S.top + 40} bottom={S.bottom} frame={frame} dur={ctx.dur} />;
};
