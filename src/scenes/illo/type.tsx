// src/scenes/illo/type.tsx: words inside the illustrated scenes (spec 3.10). The film shows MOMENTS, not sentences: a
// scene carries at most one punch (3 words at most), and the words the subtitle says at that moment are never repeated.
//
//   <Punch word ctx slot fx/>   the scene's punch word(s) in the film's capitals (Mtavruli, weight 700), 120 px shrinking
//                               to fit 760 px; `fx` slam (default: it lands big and settles, a light haptic) or mask (it
//                               rises out of a clean line: calm scenes); slots top (baseline about 540), low (1150..1260,
//                               clear of the like column) and centre (L.contentMid). Drawn in the text layer, in a Hud.
//   wordOf(p.word, ctx)         the spec's `word` (a string or {text, at, fx, tone}) with its frame
//   fitSize(text, size, maxW)   the largest size <= size that fits maxW in the film's caps
// UI labels inside a picture (a caller's name, a bubble) are part of the picture and live with it (handset.tsx, Chat).
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, Haptic, lead} from '../common';

export type WordFx = 'slam' | 'mask';
export type WordSpec = string | {text: string; at?: number | string; fx?: WordFx; tone?: Tone; slot?: Slot};
export type Slot = 'top' | 'low' | 'centre';
export type Word = {text: string; at: number; fx: WordFx; tone: Tone; slot?: Slot};

/** The spec's `word` with its frame (default: the scene's first chunk). */
export const wordOf = (w: unknown, ctx: SceneCtx, fallbackAt = 0): Word | null => {
  if (typeof w === 'string' && w.trim()) return {text: w.trim(), at: Math.max(lead(ctx) + 40, cueFrame(ctx, fallbackAt)), fx: 'slam', tone: 'neutral'};
  if (w && typeof w === 'object' && typeof (w as {text?: unknown}).text === 'string') {
    const o = w as Exclude<WordSpec, string>;
    return {text: o.text.trim(), at: o.at === undefined ? Math.max(0, cueFrame(ctx, fallbackAt)) : cueFrame(ctx, o.at), fx: o.fx === 'mask' ? 'mask' : 'slam', tone: o.tone ?? 'neutral', slot: o.slot};
  }
  return null;
};

const font = (size: number, weight = 700) => `${weight} ${size}px ${F.sans}`;
/** The largest size <= size at which `text` (already in capitals) fits maxW. */
export const fitSize = (text: string, size: number, maxW: number, weight = 700) => {
  const w = textWidth(text, font(size, weight), -size * 0.01);
  return w <= maxW ? size : Math.max(36, Math.floor((size * maxW) / w));
};

const SLOT: Record<Slot, {y: number; left: number; right: number}> = {
  top: {y: 540, left: 140, right: 940},
  low: {y: 1210, left: 140, right: 850},
  centre: {y: L.contentMid + 40, left: 140, right: 940},
};

/** The scene's punch word(s), never moving with the camera. */
/** `plate`: a soft field-coloured pill behind the word, for a word that sits over a busy picture (a phone filling the band). */
export const Punch: React.FC<{word: Word | null; slot?: Slot; size?: number; color?: string; align?: 'left' | 'center'; sound?: boolean; plate?: boolean}> = ({word, slot: slot0 = 'top', size = 120, color, align = 'center', sound = true, plate = false}) => {
  const f = useCurrentFrame();
  if (!word || !word.text) return null;
  const slot = SLOT[word.slot ?? slot0];
  const shown = mtav(word.text);
  const maxW = slot.right - slot.left;
  const px = fitSize(shown, size, maxW);
  const t = f - word.at;
  const ink = color ?? (word.tone === 'neutral' ? C.ink : toneBig(word.tone));
  let tr = '';
  let op = 1;
  let clip: string | undefined;
  if (word.fx === 'slam') {
    const k = spring({frame: t, fps: 30, config: {mass: 0.9, stiffness: 420, damping: 22}});
    const s = interpolate(k, [0, 1], [1.7, 1]);
    op = interpolate(t, [0, 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    tr = `scale(${s.toFixed(4)})`;
  } else {
    const k = interpolate(t, [0, 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - (1 - x) ** 3});
    tr = `translateY(${(k * px * 0.9).toFixed(2)}px)`;
    clip = `inset(-20% -10% 0 -10%)`;
  }
  if (t < 0) return null;
  return (
    <>
      <div style={{position: 'absolute', left: slot.left, width: maxW, top: slot.y - px * 0.92, height: px * 1.2, clipPath: clip, display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start'}}>
        <div
          className={TXT}
          style={{
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: px,
            lineHeight: 1.1,
            letterSpacing: `${-0.01 * px}px`,
            color: ink,
            whiteSpace: 'nowrap',
            transform: tr,
            transformOrigin: '50% 60%',
            opacity: op,
            ...(plate ? {background: rgba(C.bg, 0.86), borderRadius: px * 0.3, padding: `0 ${px * 0.3}px`} : null),
          }}
        >
          {shown}
        </div>
      </div>
      {sound && word.fx === 'slam' && word.at >= 0 ? <Haptic kind="light" at={word.at} /> : null}
    </>
  );
};
