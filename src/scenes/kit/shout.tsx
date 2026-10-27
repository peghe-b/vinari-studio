import React from 'react';
import {interpolate} from 'remotion';
import {spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {BLEEP, punchOf, shoutLayout, type ShoutWord as Word} from '../../lib/shout.mjs';
import {C, F} from '../../tokens';
import {Ink} from './ink';

// The shout's words (the humour kit, r3): the drawing ShoutType and SideCar share; the layout is pure (src/lib/shout.mjs,
// checked by its self-test and tools/ci/humor.mjs). The line as a poster (every line fills the measure, the hinge on its own
// line and the biggest), each word slamming in on its frame, a bleeped word a black bar, the words not said yet a pale
// ghost at their own size; on the pause every word but the hinge fades to a ghost and the marker underlines the hinge.
/** a word not said yet is already laid out, a pale ghost (r3: p2 check run 40517164152, EMPTY_P2 on v905's shout: its first
 *  second showed the figure and one word, 44 % of the frame's height); each word punches to full ink on its frame */
const PRE = 0.1;
export {shoutLayout};

/** the frame the shout ends (the voice's last span; a silent demo: its last word + 10) */
export const shoutEnd = (words: Word[], spans: [number, number][]) => (spans.length ? Math.max(...spans.map((s) => s[1])) : (words.at(-1)?.at ?? 0) + 10);

export const ShoutWords: React.FC<{words: Word[]; spans: [number, number][]; hinge?: string; top: number; bottom: number; frame: number; dur: number}> = ({words, spans, hinge, top, bottom, frame, dur}) => {
  const speechEnd = shoutEnd(words, spans);
  const frozen = frame > speechEnd + 2;
  const f = frozen ? speechEnd + 2 : frame;
  const lines = shoutLayout(words, hinge, top, bottom);
  const hasHinge = lines.some((l) => l.hinge);
  const ghost = hasHinge ? interpolate(frame, [speechEnd + 2, speechEnd + 9], [1, 0.16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  let hingeBox: {x: number; y: number; w: number; h: number} | null = null;
  const rows = lines.map((l, i) => (
    <div key={i} style={{position: 'absolute', left: 0, top: l.y, width: 1080, height: l.size}}>
      {l.ws.map((w, j) => {
        const bleep = BLEEP.test(w.text);
        if (l.hinge) hingeBox = {x: w.x, y: l.y, w: w.w, h: l.size * 0.92};
        // r3 review: no scale before the word's frame (the ghosts stood at 1.3x and collided); on its frame it punches from
        // its centre, at most PUNCH_MAX and only into the room it has (src/lib/shout.mjs punchOf), then settles to 1
        const said = f >= w.at - 1;
        const s = said ? 1 + (punchOf(l, j) - 1) * (1 - Math.min(1, spr(f, w.at - 1, 'punch'))) : 1;
        return (
          <div key={j} className={TXT} style={{position: 'absolute', left: w.x, top: 0, width: w.w, fontFamily: F.sans, fontWeight: 700, fontSize: l.size, lineHeight: `${l.size}px`, letterSpacing: '-0.01em', color: C.ink, whiteSpace: 'nowrap', opacity: !said ? PRE : l.hinge ? 1 : ghost, transform: `scale(${s.toFixed(3)})`, transformOrigin: 'center center'}}>
            {bleep ? <span style={{display: 'inline-block', width: w.w, height: l.size * 0.72, background: C.ink, borderRadius: 8, verticalAlign: 'middle'}} /> : mtav(w.text)}
          </div>
        );
      })}
    </div>
  ));
  const hb = hingeBox as {x: number; y: number; w: number; h: number} | null;
  return (
    <>
      {rows}
      {frozen && hb ? <Ink marks={[{kind: 'underline', box: hb, at: speechEnd + 4}]} end={dur + 30} /> : null}
    </>
  );
};
