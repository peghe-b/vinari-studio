import React from 'react';
import {useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines, textW} from '../lib/textfit.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {S, TEXT_W} from './kit/p2';
import {SideFigure} from './SideCar';

type P = {
  /** the speaker's sex (the figure's silhouette; tools/ci/humor.mjs CHAR_VISIBLE) */
  sex: 'm' | 'f';
  /** the hinge word (as said) circled on the pause */
  hinge?: string;
};

const norm = (w: string) => w.replace(/[.,!?;:„“"«»()…]/g, '').toLowerCase();

// ShoutType (phase 2, the humour kit): the shout IS the picture. The character's line slams in word by word with his voice
// (the beat's "subs": "inPicture": no caption), in heavy Mtavruli, his silhouette in profile beside it (never a face).
// A bleeped word is a black bar (BleepBar) the size of the cut word; after the voice ends the frame FREEZES (the pause,
// the beat's "hold") and the hand marker circles the hinge word (HingeMark).
const FIG_Y = S.top + 160;
export const ShoutType: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const words = (ctx.words ?? []).flat();
  const spans = ctx.speech ?? [];
  // the shout ends with the voice; a silent demo has no voice spans: its last word's frame (+ 10) ends it
  const speechEnd = spans.length ? Math.max(...spans.map((s) => s[1])) : (words.at(-1)?.at ?? 0) + 10;
  const frozen = frame > speechEnd + 2;
  const f = frozen ? speechEnd + 2 : frame;
  const text = words.map((w) => w.text).join(' ');
  // the shout starts under the figure's shoulders (stage y FIG_Y + 220: the p3 run's TEXT_CLASH, the head stood under the
  // first line) and keeps above the stage's foot: a long shout gets smaller, never lower
  const top = FIG_Y + 220 + 50;
  const fit0 = fitLines(text.replace(/\{bleep(?::[^}]*)?\}/g, '#@%'), TEXT_W - 40, 4, 150, {weight: 700, mtav: true, min: 70});
  const tall = Math.max(70, Math.floor((S.bottom - top) / (fit0.lines.length * 1.02 + 0.15)));
  const fit = fit0.size > tall ? fitLines(text.replace(/\{bleep(?::[^}]*)?\}/g, '#@%'), TEXT_W - 40, 4, tall, {weight: 700, mtav: true, min: 60}) : fit0;
  let k = 0;
  const lines = fit.lines.map((l) => l.split(' ').map(() => words[k++]).filter(Boolean));
  let hingeBox: {x: number; y: number; w: number; h: number} | null = null;
  const rows = lines.map((ws, i) => {
    let x = S.left + 20;
    return (
      <div key={i} style={{position: 'absolute', left: 0, top: top + i * fit.size * 1.02, width: 1080, height: fit.size}}>
        {ws.map((w, j) => {
          const shown = w.text.includes('...') || /#@%/.test(w.text);
          const ww = textW(w.text, fit.size, {weight: 700, mtav: true});
          const s = spr(f, w.at - 1, 'punch');
          const el = (
            <div key={j} className={TXT} style={{position: 'absolute', left: x, top: 0, fontFamily: F.sans, fontWeight: 700, fontSize: fit.size, lineHeight: `${fit.size}px`, color: C.ink, whiteSpace: 'nowrap', opacity: f < w.at - 1 ? 0 : 1, transform: `scale(${(1.3 - 0.3 * Math.min(1, s)).toFixed(3)})`, transformOrigin: 'left center'}}>
              {shown ? <span style={{display: 'inline-block', width: Math.max(ww, fit.size * 1.6), height: fit.size * 0.72, background: C.ink, borderRadius: 8, verticalAlign: 'middle'}} /> : mtav(w.text)}
            </div>
          );
          if (p.hinge && norm(w.text).startsWith(norm(p.hinge).slice(0, 5))) hingeBox = {x, y: top + i * fit.size * 1.02, w: ww, h: fit.size};
          x += ww + fit.size * 0.28;
          return el;
        })}
      </div>
    );
  });
  const hb = hingeBox as {x: number; y: number; w: number; h: number} | null;
  return (
    <>
      <SideFigure sex={p.sex} x={S.cx} y={FIG_Y} size={300} talking={!frozen && (spans.length ? spans.some(([a, z]) => frame >= a && frame <= z) : frame <= speechEnd)} frame={frame} />
      {rows}
      {/* the ring only round a one-line shout; in stacked lines it ran through the lines above and below (the fixture's
          TEXT_CLASH): the hinge on the last line is underlined, one higher up stays unmarked (the freeze is the beat) */}
      {frozen && hb && (lines.length === 1 || hb.y >= top + (lines.length - 1) * fit.size * 1.02 - 1) ? <Ink marks={[{kind: lines.length === 1 ? 'circle' : 'underline', box: hb, at: speechEnd + 4}]} end={ctx.dur + 30} /> : null}
    </>
  );
};
