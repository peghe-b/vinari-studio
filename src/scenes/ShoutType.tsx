import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {SceneCtx} from '../types';
import {S} from './kit/p2';
import {shoutEnd, ShoutWords} from './kit/shout';
import {SideFigure} from './SideCar';

export {shoutLayout} from './kit/shout';

type P = {
  /** the speaker's sex (the figure's silhouette; tools/ci/humor.mjs CHAR_VISIBLE) */
  sex: 'm' | 'f';
  /** the hinge word (as said): set on a line of its own, the biggest, and the one word left standing on the pause */
  hinge?: string;
};

// ShoutType (phase 2, the humour kit): the shout IS the picture. The character's line slams in word by word with his voice
// (the beat's "subs": "inPicture": no caption), in heavy Mtavruli set as a poster (r3: every line fills the measure, the
// hinge word on its own line and the biggest), his silhouette in strict profile above it (never a face). A bleeped word is
// a black bar (BleepBar) the size of the cut word. After the voice ends the frame FREEZES (the pause, the beat's "hold"):
// every word but the hinge fades back to a ghost, and the hand marker underlines the hinge (HingeMark).
const FIG_Y = S.top + 150;
export const ShoutType: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const words = (ctx.words ?? []).flat();
  const spans = ctx.speech ?? [];
  const speechEnd = shoutEnd(words, spans);
  const frozen = frame > speechEnd + 2;
  // the shout starts under the figure's shoulders (the p3 run's TEXT_CLASH: the head stood under the first line)
  const top = FIG_Y + 0.8 * 232 + 40;
  return (
    <>
      <SideFigure sex={p.sex} x={S.cx - 40} y={FIG_Y} size={240} talking={!frozen && (spans.length ? spans.some(([a, z]) => frame >= a && frame <= z) : frame <= speechEnd)} frame={frozen ? speechEnd + 2 : frame} />
      <ShoutWords words={words} spans={spans} hinge={p.hinge} top={top} bottom={S.bottom} frame={frame} dur={ctx.dur} />
    </>
  );
};
