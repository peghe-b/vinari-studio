import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines, sizeFor} from '../lib/textfit.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import type {InkMark} from './kit/ink';
import {drift, S, TEXT_W, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {Sfx} from './common';

type P = {
  /** 1 or 2 words of the spoken line to lift (as written in the beat's "say", Mkhedruli) */
  lift: string[];
  /** the lifted words' colour: ink (default), red a cost, green a gain, accent the film's data accent */
  t?: P2Tone;
  /** a hand mark under or round the lifted words */
  mark?: 'underline' | 'circle' | 'strike';
};

const norm = (w: string) => w.replace(/[.,!?;:„“"«»()]/g, '').toLowerCase();

// KeywordLift (phase 2): the spoken line drawn in the picture word by word with the voice (the beat says "subs":
// "inPicture", so the caption skips it and no word shows twice), and on the frame it is said each key word LIFTS out of the
// line to 180-260 px, fitted to the 860 px text width, with an optional hand mark. Emphasis lives in the picture, never in
// the caption (the caption has no highlight colour).
export const KeywordLift: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const words = (ctx.words ?? []).flat();
  const lift = new Set((p.lift ?? []).slice(0, 2).map(norm));
  const lifted = words.filter((w) => lift.has(norm(w.text)));
  const line = words.map((w) => w.text).join(' ');
  // the small line: 56 px, at most 3 lines, at the top of the stage
  const small = fitLines(line, TEXT_W, 3, 60, {weight: 600, mtav: true, min: 44});
  let k = 0;
  const lines = small.lines.map((ln) => ln.split(' ').map(() => words[k++]).filter(Boolean));
  const big = lifted.map((w) => w.text).join(' ');
  const bigPx = Math.max(120, Math.min(260, sizeFor(big, TEXT_W, 260, {weight: 700, mtav: true})));
  const bigFit = fitLines(big, TEXT_W, 2, bigPx, {weight: 700, mtav: true, min: 120});
  // as the film's first shot the lifted word IS the claim: up from frame 0 (HOOK_FRAME0); later shots lift it when said
  const at = ctx.index === 0 ? 0 : (lifted[0]?.at ?? 10);
  const s = spr(frame, at, 'punch');
  const bigTop = S.top + small.lines.length * small.size * 1.2 + 120;
  const bigH = bigFit.lines.length * bigFit.size * 1.0;
  const marks: InkMark[] = p.mark ? [{kind: p.mark, box: {x: S.left + 40, y: bigTop + 10, w: TEXT_W - 80, h: bigH - 20}, at: ctx.index === 0 ? 2 : at + 8}] : [];
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      {lines.map((ws, i) => (
        <div key={i} className={TXT} style={{position: 'absolute', left: S.left, width: TEXT_W, top: S.top + i * small.size * 1.2, fontFamily: F.sans, fontWeight: 600, fontSize: small.size, lineHeight: `${Math.round(small.size * 1.2)}px`, whiteSpace: 'nowrap'}}>
          {ws.map((w, j) => {
            // as the hook, the first chunk's words are up from frame 0 with the claim
            const on = ctx.index === 0 && w.at <= (ctx.cues[1] ?? 1e9) ? 1 : prog(frame, w.at - 2, 4, ease.enter);
            const isLift = lift.has(norm(w.text));
            return (
              <span key={j} style={{color: isLift ? (frame >= w.at ? 'transparent' : C.ink2) : C.ink2, opacity: on, marginRight: '0.28em', display: 'inline-block', transform: `translateY(${(1 - on) * 10}px)`}}>
                {mtav(w.text)}
              </span>
            );
          })}
        </div>
      ))}
      {bigFit.lines.map((ln, i) => (
        <div
          key={`b${i}`}
          className={TXT}
          style={{
            position: 'absolute',
            left: S.left,
            width: TEXT_W,
            top: bigTop + i * bigFit.size,
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: bigFit.size,
            lineHeight: `${bigFit.size}px`,
            letterSpacing: '-0.02em',
            color: tone(p.t),
            whiteSpace: 'nowrap',
            opacity: ctx.index === 0 ? 1 : frame < at ? 0 : Math.min(1, s * 1.5),
            transform: ctx.index === 0 ? `scale(${(1.04 - 0.04 * Math.min(1, s)).toFixed(4)})` : `translateY(${(1 - s) * -60}px) scale(${(1.25 - 0.25 * Math.min(1, s)).toFixed(4)})`,
            transformOrigin: 'left center',
          }}
        >
          {mtav(ln)}
        </div>
      ))}
      <Ink marks={marks} end={ctx.dur} />
      <Sfx name="asmr-whoomp" at={Math.max(0, at)} volume={0.32} /* event: the key word lifts out of the line */ />
    </div>
  );
};
