import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Entry = {year: string; text: string; t?: P2Tone; at?: number};
type P = {entries: Entry[]};

// Ledger (phase 2, the story kit; extends Timeline): the story's years down a ruled spine, each year big, its line beside
// it, each landing on its own cue; the turning year in red or green (data only).
export const Ledger: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const list = (p.entries ?? []).slice(0, 5);
  const n = list.length;
  const rowH = Math.min(220, (S.bottom - S.top - 40) / Math.max(1, n));
  const spineX = S.left + 250;
  const ats = list.map((e, i) => (e.at !== undefined ? cueFrame(ctx, e.at) : base + 6 + i * 12));
  const grow = prog(frame, base, 10 + n * 12, ease.data);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <div style={{position: 'absolute', left: spineX - 2, top: S.top + 30, width: 4, height: (n * rowH - 40) * grow, background: C.ink}} />
      {list.map((e, i) => {
        const y = S.top + 20 + i * rowH;
        const dot = spr(frame, ats[i], 'punch');
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: spineX - 16, top: y + 28, width: 32, height: 32, borderRadius: 16, background: e.t ? tone(e.t) : C.ink, transform: `scale(${Math.max(0, dot)})`}} />
            <FitText text={e.year} x={S.left} y={y} w={210} size={84} min={48} maxLines={1} weight={700} t={e.t} at={ats[i]} latin />
            <FitText text={e.text} x={spineX + 50} y={y + 8} w={S.right - spineX - 50} size={48} min={34} maxLines={2} weight={600} at={ats[i] + 4} />
            <Sfx name="asmr-tick-fine" at={ats[i]} volume={0.26} /* event: a year lands */ />
          </React.Fragment>
        );
      })}
    </div>
  );
};
