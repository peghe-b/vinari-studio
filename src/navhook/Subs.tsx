// The studio's subtitle line (layers/Subtitles.tsx's look: one centred line at frame (510, 1500), condensed Mtavruli,
// weight 500, one size for the whole film, no shadow, outline or box), built WORD BY WORD with the voice (the owner,
// 2026-10-22): the whole line is laid out once, each word pops in a frame before it is heard (about 70 ms of fade and a
// 14 px rise), so the words already up never move. A line lives from its first word to its end (+0.35 s), never past the
// next cut or the next line. Its colour is the plan's: white over the night, ink over the white.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F, L, SUB_TONE, T} from '../tokens';
import {clamp, E, FPS, TL} from './lib';

const sizeFor = (text: string, base: number, maxW: number) => {
  if (typeof document === 'undefined') return base;
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return base;
  c.font = `500 ${base}px ${F.sans}`;
  const w = c.measureText(text).width;
  return w <= maxW ? base : Math.max(46, Math.floor((base * maxW) / w));
};

export const Subs: React.FC<{cuts: number[]}> = ({cuts}) => {
  const f = useCurrentFrame();
  const subs = TL.subs;
  const i = subs.findIndex((s, k) => {
    const a = Math.round(s.start * FPS) - 1;
    const nextA = k + 1 < subs.length ? Math.round(subs[k + 1].start * FPS) - 1 : Infinity;
    const cut = cuts.filter((c) => c > a).sort((x, y) => x - y)[0] ?? Infinity;
    const b = Math.min(Math.round((s.end + 0.35) * FPS), nextA, cut + (Math.round(s.end * FPS) > cut ? 9999 : 0));
    return f >= a && f < b;
  });
  if (i < 0) return null;
  const s = subs[i];
  const text = mtav(s.text);
  const words = text.split(' ');
  const maxW = L.subtitleMaxW;
  const fs = Math.min(T.subtitle, ...subs.map((x) => sizeFor(mtav(x.text), T.subtitle, maxW)).sort((a, b) => b - a).slice(0, Math.ceil(subs.length * 0.8)));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: L.subtitleX - maxW / 2,
          width: maxW,
          top: L.subtitleY - fs * 0.6,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: fs,
          lineHeight: 1.2,
          color: SUB_TONE[s.tone],
        }}
      >
        {words.map((w, k) => {
          const at = Math.round((s.words[k] ?? s.start) * FPS) - 1;
          const p = clamp((f - at) / 3);
          return (
            <span key={k} style={{display: 'inline-block', opacity: p, transform: `translateY(${(1 - E.out(p)) * 14}px)`, marginRight: k < words.length - 1 ? '0.28em' : 0}}>
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
