import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
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
  /** the hinge word (as said): set on a line of its own, the biggest, and the one word left standing on the pause */
  hinge?: string;
};

const norm = (w: string) => w.replace(/[.,!?;:„“"«»()…]/g, '').toLowerCase();
const BLEEP = /#@%|\{bleep/;
const OPTS = {weight: 700, mtav: true} as const;

type Word = {text: string; at: number};
type Line = {ws: Word[]; size: number; y: number; hinge: boolean};

/** The poster layout (r3, 2026-10-27): every line set to fill the measure (a short line gets BIG, as a shout on a poster
 *  does), the hinge word on a line of its own, the stack scaled to fit between `top` and `bottom`. Exported for the
 *  self-check in tools/ci/humor.mjs (the lines never pass the measure or the stage). */
export const shoutLayout = (words: Word[], hinge: string | undefined, top: number, bottom: number, measure: number = TEXT_W - 40): Line[] => {
  const label = (w: Word) => (BLEEP.test(w.text) ? '#@%…' : w.text);
  const h = hinge ? words.findIndex((w) => norm(w.text).startsWith(norm(hinge).slice(0, 5))) : -1;
  const groups: {ws: Word[]; hinge: boolean}[] = [];
  const split = (ws: Word[]) => {
    if (!ws.length) return;
    // long lines (set at 96 px): the fill makes them big again, and fewer lines leave the stack its height (the first
    // local stills: five lines at 150 px scaled the whole shout down to a third of the measure)
    const fit = fitLines(ws.map(label).join(' '), measure, 2, 96, {...OPTS, min: 50});
    let k = 0;
    for (const l of fit.lines) {
      const n = l.split(' ').length;
      groups.push({ws: ws.slice(k, k + n), hinge: false});
      k += n;
    }
  };
  if (h >= 0) {
    split(words.slice(0, h));
    groups.push({ws: [words[h]], hinge: true});
    split(words.slice(h + 1));
  } else split(words);
  // each line fills the measure: its size from its width at 100 px, a one-word line at most 230 px (the hinge 250)
  const sized = groups.map((g) => {
    const w100 = g.ws.reduce((t, w) => t + textW(label(w), 100, OPTS), 0) + (g.ws.length - 1) * 28; // the words and the gaps as drawn
    return {...g, size: Math.min(g.hinge ? 250 : 230, Math.max(60, (100 * measure) / Math.max(1, w100)))};
  });
  // the stack: lines at 0.96 of their size, the hinge line keeps room under it for the marker's underline
  const gap = (l: {size: number; hinge: boolean}) => l.size * (l.hinge ? 1.18 : 0.98);
  const total = sized.reduce((t, l) => t + gap(l), 0);
  const k = Math.min(1, (bottom - top) / Math.max(1, total));
  let y = top;
  return sized.map((l) => {
    const size = Math.floor(l.size * k);
    const out = {ws: l.ws, size, y, hinge: l.hinge};
    y += gap({size, hinge: l.hinge});
    return out;
  });
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
  // the shout ends with the voice; a silent demo has no voice spans: its last word's frame (+ 10) ends it
  const speechEnd = spans.length ? Math.max(...spans.map((s) => s[1])) : (words.at(-1)?.at ?? 0) + 10;
  const frozen = frame > speechEnd + 2;
  const f = frozen ? speechEnd + 2 : frame;
  // the shout starts under the figure's shoulders (the p3 run's TEXT_CLASH: the head stood under the first line)
  const top = FIG_Y + 0.8 * 232 + 40;
  const lines = shoutLayout(words, p.hinge, top, S.bottom);
  const hasHinge = lines.some((l) => l.hinge);
  const ghost = hasHinge ? interpolate(frame, [speechEnd + 2, speechEnd + 9], [1, 0.16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  let hingeBox: {x: number; y: number; w: number; h: number} | null = null;
  const rows = lines.map((l, i) => {
    let x = S.left + 20;
    return (
      <div key={i} style={{position: 'absolute', left: 0, top: l.y, width: 1080, height: l.size}}>
        {l.ws.map((w, j) => {
          const bleep = BLEEP.test(w.text);
          const ww = textW(bleep ? '#@%…' : w.text, l.size, OPTS);
          const s = spr(f, w.at - 1, 'punch');
          if (l.hinge) hingeBox = {x, y: l.y, w: ww, h: l.size * 0.92};
          const el = (
            <div key={j} className={TXT} style={{position: 'absolute', left: x, top: 0, fontFamily: F.sans, fontWeight: 700, fontSize: l.size, lineHeight: `${l.size}px`, letterSpacing: '-0.01em', color: C.ink, whiteSpace: 'nowrap', opacity: f < w.at - 1 ? 0 : l.hinge ? 1 : ghost, transform: `scale(${(1.3 - 0.3 * Math.min(1, s)).toFixed(3)})`, transformOrigin: 'left center'}}>
              {bleep ? <span style={{display: 'inline-block', width: ww, height: l.size * 0.72, background: C.ink, borderRadius: 8, verticalAlign: 'middle'}} /> : mtav(w.text)}
            </div>
          );
          x += ww + l.size * 0.28;
          return el;
        })}
      </div>
    );
  });
  const hb = hingeBox as {x: number; y: number; w: number; h: number} | null;
  return (
    <>
      <SideFigure sex={p.sex} x={S.cx - 40} y={FIG_Y} size={240} talking={!frozen && (spans.length ? spans.some(([a, z]) => frame >= a && frame <= z) : frame <= speechEnd)} frame={f} />
      {rows}
      {frozen && hb ? <Ink marks={[{kind: 'underline', box: hb, at: speechEnd + 4}]} end={ctx.dur + 30} /> : null}
    </>
  );
};
