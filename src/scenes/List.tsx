import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F, L, Tone, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, lead, Sfx, toneHaptic, vary} from './common';

type Item = {text: string; note?: string; at?: number | string; strike?: boolean; tone?: Tone; mark?: 'check' | 'cross' | 'dot'};
type P = {items: Item[]; title?: string; size?: number};

// A short vertical list. Items can be struck through (the "what Vinari will not tell you"
// honesty beat) or checked, each at its own subtitle chunk.
export const List: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx); // the list title stands on the cut frame of a later scene
  const size = p.size ?? 58;
  // marks, gaps and notes are drawn for 58 px text: they scale with it, so a big list keeps its
  // proportions (a 110 px row with a 40 px mark reads as a bullet lost next to a headline)
  const k = size / 58;
  const mark = Math.round(40 * k);
  const gap = Math.round(22 * k);
  // a note grows with the row (never under 24 px), but a long one shrinks to its line: the mono note
  // must end inside the content box (a 35 px "sa.gov.ge · ..." ran past it)
  const noteRoom = 1080 - 2 * L.side - (mark + gap);
  const noteW = Math.max(1, ...p.items.map((it) => (it.note ? textWidth(capsLatin(it.note), `400 24px VinariMono, FiraGO`, 24 * 0.04) : 1)));
  const noteSize = Math.max(18, Math.min(Math.round(24 * Math.min(1.5, Math.max(1, k))), Math.floor((24 * noteRoom) / noteW)));
  // a row: the text line, then its note (the gap above the note scales, the air under it stays 18 px so a
  // big three-row list with notes still fits the content box under its title)
  const rowH = size * 1.2 + (p.items.some((i) => i.note) ? 6 * k + noteSize * 1.25 + 18 : 40 * k);
  // centred on the content zone's optical centre, never above the meta bar
  const top = Math.max(p.title ? 480 : 420, Math.round(720 - (p.items.length * rowH) / 2));
  // sound: only the green check that lands last glints
  const atOf = (it: Item, i: number) => (it.at !== undefined ? cueFrame(ctx, it.at) : base + 4 + i * 8);
  // A row waiting for the scene's first chunk (at: 0) is part of the picture the cut lands on: it
  // rises with the entrance (a few frames apart) instead of after the first word, so a cut never lands
  // on an empty field. Its sound stays on the word (the cut has its own air).
  const zeroRows = p.items.map((it, i) => (it.at === 0 && ctx.index > 0 ? i : -1)).filter((i) => i >= 0);
  const showAt = (it: Item, i: number) => (zeroRows.includes(i) ? e + 3 * zeroRows.indexOf(i) : atOf(it, i));
  const lastGreen = p.items.reduce((best, it, i) => (it.mark === 'check' && it.tone === 'up' && (best < 0 || atOf(it, i) >= atOf(p.items[best], best)) ? i : best), -1);
  return (
    <>
      {p.title ? (
        <div style={{position: 'absolute', top: top - 80, left: L.side, right: L.side, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.06em', color: C.ink2, opacity: prog(frame, e, 10)}}>
          {capsLatin(p.title)}
        </div>
      ) : null}
      {p.items.map((it, i) => {
        const at = atOf(it, i);
        const s = spr(frame, showAt(it, i));
        const strike = it.strike ? prog(frame, at + 14, 12, ease.drawOn) : 0;
        const color = C.ink; // colour only on the mark, never decoration on words
        const markColor = it.tone ? toneLine(it.tone) : C.ink2;
        return (
          <div key={i} style={{position: 'absolute', top: top + i * rowH, left: L.side, right: L.side, opacity: s, transform: `translateY(${(1 - s) * 20}px)`}}>
            <div style={{display: 'flex', alignItems: 'center', gap}}>
              <svg width={mark} height={mark} viewBox="0 0 40 40" style={{flex: 'none'}}>
                {it.mark === 'check' ? (
                  <path d="M8 21 L17 30 L33 11" fill="none" stroke={markColor} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                ) : it.mark === 'cross' ? (
                  <path d="M10 10 L30 30 M30 10 L10 30" fill="none" stroke={markColor} strokeWidth={3.5} strokeLinecap="round" />
                ) : (
                  <circle cx={20} cy={20} r={6} fill={markColor} />
                )}
              </svg>
              <div style={{position: 'relative', fontFamily: F.sans, fontWeight: 500, fontSize: size, color: it.strike ? C.ink2 : color, lineHeight: 1.2}}>
                {it.text}
                {it.strike ? <div style={{position: 'absolute', left: 0, top: '55%', height: Math.max(3, Math.round(3 * k)), width: `${strike * 100}%`, background: C.ink}} /> : null}
              </div>
            </div>
            {it.note ? (
              <div style={{marginLeft: mark + gap, marginTop: Math.round(6 * k), fontFamily: F.mono, fontSize: noteSize, letterSpacing: '0.04em', color: C.ink3, opacity: prog(frame, at + 22, 10)}}>{capsLatin(it.note)}</div>
            ) : null}
            {it.mark === 'check' ? (
              <Sfx name="asmr-check" at={at} volume={0.5 * vary(i)} /* event: a checked row rises in */ />
            ) : it.mark === 'cross' ? (
              <Sfx name="asmr-pencil-short" at={at} volume={0.34 * vary(i)} len={9} /* event: a crossed row rises in */ />
            ) : (
              <Sfx name="asmr-pop" at={at} volume={0.34 * vary(i)} /* event: a dotted row rises in */ />
            )}
            {/* the row's haptic carries its mark's data tone: green success, red error, otherwise a light landing (a cross snaps) */}
            <Haptic kind={toneHaptic(it.tone, it.mark === 'cross' ? 'rigid' : 'light')} at={at} volume={(it.tone === 'up' ? 0.4 : it.tone === 'down' ? 0.34 : 0.38) * vary(i + 20, 0.15)} />
            {/* the list's last green check glints once (never a chime: three quiet partials) */}
            {it.mark === 'check' && it.tone === 'up' && i === lastGreen ? <Sfx name="asmr-shimmer" at={at + 3} volume={0.4} /> : null}
            {it.strike ? <Sfx name="asmr-strike" at={at + 14} volume={0.48} /* event: the strike-through draws (12 frames) */ /> : null}
          </div>
        );
      })}
    </>
  );
};
