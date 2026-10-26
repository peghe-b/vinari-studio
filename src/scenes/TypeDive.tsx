import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines, textW} from '../lib/textfit.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {S, TEXT_W} from './kit/p2';
import {Sfx} from './common';

type P = {
  /** one word (7 Mtavruli letters at most reads best) */
  word: string;
  /** which letter the camera dives through (0-based; default the middle one) */
  letter?: number;
  /** frames the word holds before the dive (default 14) */
  hold?: number;
};

// TypeDive (phase 2, a transition, ONCE a film at most): a big word, then the camera zooms THROUGH one of its letters (40x on
// BEZ.whipIn) into the paper of the next scene. The word is fitted to the 860 px width first.
export const TypeDive: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const word = p.word ?? '';
  const fit = fitLines(word, TEXT_W, 1, 300, {weight: 700, mtav: true, min: 120});
  const px = fit.size;
  const letters = [...mtav(word)];
  const li = Math.max(0, Math.min(letters.length - 1, p.letter ?? Math.floor(letters.length / 2)));
  const w = textW(word, px, {weight: 700, mtav: true});
  const left = S.cx - w / 2;
  const lx = left + textW(letters.slice(0, li).join(''), px, {weight: 700}) + textW(letters[li], px, {weight: 700}) / 2;
  const ly = S.cy;
  const hold = p.hold ?? 14;
  const u = ease.whipIn(Math.min(1, Math.max(0, (frame - hold) / Math.max(8, ctx.dur - hold - 2))));
  const z = Math.exp(Math.log(40) * u);
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${(lx - lx * z).toFixed(2)}px, ${(ly - ly * z).toFixed(2)}px) scale(${z.toFixed(4)})`, transformOrigin: '0 0'}}>
      <div className={TXT} style={{position: 'absolute', left, top: ly - px * 0.55, fontFamily: F.sans, fontWeight: 700, fontSize: px, lineHeight: `${px}px`, color: C.ink, whiteSpace: 'nowrap', letterSpacing: 0}}>
        {letters.join('')}
      </div>
      <Sfx name="synth-whoosh" at={hold} volume={0.34} /* event: the dive */ />
    </div>
  );
};
