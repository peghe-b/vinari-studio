import React from 'react';
import {useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import type {SceneCtx} from '../types';
import {fitLines, textW} from '../lib/textfit.mjs';
import {Ink} from './kit/ink';
import {Card, drift, FitText, fitHeight, Quiet, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** the words as said or written then (a short line, 12 words at most) */
  quote: string;
  /** who said it and when („ენცო ფერარი, 1963") */
  who: string;
  /** the word to underline in the quote (as written) */
  mark?: string;
  at?: number;
};

// QuoteCard (phase 2, the story kit): what someone really said, set big on a white card with a hand underline on the word
// that turns the story, and who said it and when under it.
export const QuoteCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 8;
  const w = S.right - S.left;
  const qh = fitHeight(`„${p.quote}“`, w - 120, 96, 4, 700, false, 1.1, 52);
  const h = qh + 260;
  const y = Math.max(S.top, S.cy - h / 2);
  const s = spr(frame, base, 'enter');
  // the marked word's own box: the same fit FitText makes, the word found on its line and measured
  const fit = fitLines(`„${p.quote}“`, w - 120, 4, 96, {weight: 700, mtav: true, min: 52});
  const li = p.mark ? fit.lines.findIndex((l) => l.includes(p.mark!)) : -1;
  const markBox =
    li >= 0
      ? {
          x: S.left + 60 + textW(fit.lines[li].slice(0, fit.lines[li].indexOf(p.mark!)), fit.size, {weight: 700, mtav: true}),
          y: y + 70 + li * fit.size * 1.1,
          w: textW(p.mark!, fit.size, {weight: 700, mtav: true}),
          h: fit.size * 0.9,
        }
      : null;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <Card x={S.left} y={y} w={w} h={h} r={32} style={{opacity: Math.min(1, s * 1.4)}} />
      <FitText text={`„${p.quote}“`} x={S.left + 60} y={y + 70} w={w - 120} size={96} min={52} maxLines={4} weight={700} at={at} lineHeight={1.1} />
      <FitText text={p.who} x={S.left + 60} y={y + qh + 120} w={w - 120} size={46} min={34} maxLines={1} weight={600} t="quiet" at={at + 12} />
      {markBox ? <Ink marks={[{kind: 'underline', box: markBox, at: at + 16}]} end={ctx.dur} /> : null}
      <Sfx name="asmr-paper" at={base + 2} volume={0.28} /* event: the card lands */ />
    </div>
  );
};
