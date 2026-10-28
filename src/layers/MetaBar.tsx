import React from 'react';
import {useCurrentFrame} from 'remotion';
import {typeOn} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {C, F, L, SUB_TONE, T} from '../tokens';

export type MetaEntry = {from: number; left: string; right: string};
/** The meta line's tone along the film per side (tools/subtone.mjs, a film from POLISH_FROM on): 'own' the theme's grey,
 *  'white' / 'ink' where the grey no longer reads on the picture under it (a lamp's halo, a white roof) */
export type MetaTone = [number, 'own' | 'white' | 'ink'][];
const toneAt = (track: MetaTone | undefined, f: number) => {
  let t: 'own' | 'white' | 'ink' = 'own';
  for (const [at, v] of track ?? []) if (at <= f) t = v;
  return t === 'white' ? SUB_TONE.white : t === 'ink' ? SUB_TONE.ink : null;
};

// Persistent mono label bar just inside the top of the Reels safe zone (frame pixels, outside the
// stage), its ends on the content box's edges. Each change types on at 1.4 chars/frame.
// `hide`: film frame spans [from, to) with no bar: a full-bleed picture is on screen (src/lib/bleed.ts, the owner
// 2026-10-06). A label that changed while it was hidden types on when the bar comes back.
export const MetaBar: React.FC<{entries: MetaEntry[]; hide?: [number, number][]; tone?: {l: MetaTone; r: MetaTone}}> = ({entries, hide = [], tone}) => {
  const frame = useCurrentFrame();
  const hiddenAt = (f: number) => hide.find(([a, z]) => f >= a && f < z);
  if (hiddenAt(frame)) return null;
  const idx = entries.map((e) => frame >= e.from).lastIndexOf(true);
  const cur = entries[idx];
  if (!cur || !cur.left) return null;
  // only a changed label types on again; an unchanged one stays put across cuts
  let startLeft = cur.from;
  for (let i = idx; i >= 0 && entries[i].left === cur.left; i--) startLeft = entries[i].from;
  const gap = hiddenAt(startLeft);
  if (gap) startLeft = gap[1];
  const left = typeOn(mtav(capsLatin(cur.left)), frame, startLeft, 1.4);
  const right = typeOn(mtav(capsLatin(cur.right)), frame, cur.from + 4, 1);
  const style: React.CSSProperties = {
    position: 'absolute',
    top: L.metaY,
    fontFamily: F.mono,
    fontSize: T.meta,
    letterSpacing: '0.06em',
    color: C.ink2,
    whiteSpace: 'nowrap',
  };
  return (
    <>
      <div style={{...style, left: L.metaLeft, ...(toneAt(tone?.l, frame) ? {color: toneAt(tone?.l, frame)!} : {})}}>
        {/* a square bullet: a drawn rule reads as an em dash */}
        <span style={{display: 'inline-block', width: 8, height: 8, background: toneAt(tone?.l, frame) ?? C.rule, verticalAlign: 'middle', marginRight: 16, marginTop: -4}} />
        {left}
      </div>
      <div style={{...style, right: 1080 - L.metaRight, ...(toneAt(tone?.r, frame) ? {color: toneAt(tone?.r, frame)!} : {})}}>{right}</div>
    </>
  );
};
