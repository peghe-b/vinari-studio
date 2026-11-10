// The studio's subtitle line (58 px, weight 500, condensed Mtavruli, one line, clean), word by word: every word of the
// chunk pops as it is said (its start from build/plan.py: the studio's vo.word_starts), the line keeps its full width
// from the first frame so nothing jumps, the hook's chunk is up whole on frame 0. It sits inside the owner's safe zone:
// centred on x 490 (the band 110..870 under y 1110), letters about 1478..1522. Its tone follows the picture under it
// (TONES); over a moving photo it gets a soft, semi-transparent plate.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, FPS, TL} from './lib';

export const SUB_X = 490;
export const SUB_Y = 1500;
const SIZE = 58;
/** [from s, to s, tone, plate] in film seconds; the last match wins */
const TONES: [number, number, 'ink' | 'white', boolean][] = [[0, 99, 'ink', false]];
const LEAD = 0.04; // a word shows this much before its sound starts (the eye is a little slower than the ear)

export const Subs: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const chunks = TL.chunks;
  const i = chunks.findIndex((c, k) => {
    const next = chunks[k + 1];
    const from = k === 0 ? 0 : c.start - LEAD - 0.02;
    const to = next && next.start - c.end < 0.6 ? next.start - LEAD - 0.02 : c.end + 0.35;
    return t >= from && t < to;
  });
  if (i < 0) return null;
  const c = chunks[i];
  const tone = [...TONES].reverse().find(([a, b]) => t >= a && t < b) ?? [0, 0, 'ink', false];
  const color = tone[2] === 'white' ? '#F5F5F5' : '#0B0B0B';
  const words = c.text.split(' ');
  const next = chunks[i + 1];
  const endT = next && next.start - c.end < 0.6 ? 99 : c.end + 0.35;
  const out = clamp((endT - t) / 0.12);
  return (
    <div style={{position: 'absolute', left: SUB_X - 380, width: 760, top: SUB_Y - SIZE * 0.62, textAlign: 'center', pointerEvents: 'none'}}>
      <span
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: SIZE,
          lineHeight: 1.24,
          color,
          padding: tone[3] ? '6px 22px 8px' : 0,
          borderRadius: 18,
          background: tone[3] ? 'rgba(10,10,12,0.34)' : 'transparent',
          backdropFilter: tone[3] ? 'blur(10px)' : undefined,
          opacity: out,
        }}
      >
        {words.map((w, k) => {
          const wt = (c.words[k]?.t ?? c.start) - LEAD;
          const hook = i === 0;
          const k01 = hook ? 1 : clamp((t - wt) * FPS / 3);
          const pop = hook ? 1 : E.out(k01);
          return (
            <span key={k} style={{display: 'inline-block', opacity: k01, transform: `translateY(${((1 - pop) * 10).toFixed(1)}px)`, marginRight: k < words.length - 1 ? '0.26em' : 0}}>
              {mtav(w)}
            </span>
          );
        })}
      </span>
    </div>
  );
};
export const setTones = (t: [number, number, 'ink' | 'white', boolean][]) => {
  TONES.splice(0, TONES.length, ...t);
};
