import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, spr} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, S, tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** the two times or distances as said („3:30.1" / „3:33.2"), and who */
  a: {label: string; value: number; shown: string};
  b: {label: string; value: number; shown: string};
  /** the gap as said („3 წამი", „1 წრე") */
  gap: string;
  at?: number;
};

// LapDelta (phase 2, the story kit): how close it was. Two bars race to their true lengths (from zero, on a baseline), the
// gap between their ends is bracketed and named in the film's one data hue: the 3 minutes of Toyota 2016, the half point of
// Lombardi. Never two years (1899 against 2026 drew two equal bars and a red stub: the p2x round-2 story film; an age is a
// BigNumber or a Ledger) and never a gap under LAPDELTA_GAP of the longer bar (tools/ci/p2lint.mjs LAPDELTA_GAP refuses
// both); a gap too small to bracket is named without the bracket.
export const LapDelta: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // a film's first shot is settled at frame 0 (entrance() is its negative lead); later shots enter after the cut
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 8;
  const max = Math.max(p.a.value, p.b.value, 1e-9);
  const w = S.right - S.left;
  const run = ease.data(Math.min(1, Math.max(0, (frame - at) / 30)));
  const bar = (v: number) => (w - 20) * (v / max) * run;
  const y0 = S.top + 160;
  const gapOn = spr(frame, at + 32, 'punch');
  const xa = S.left + bar(p.a.value);
  const xb = S.left + bar(p.b.value);
  // the bracket only when the gap reads as a span (a few px of bracket at a bar's end is a stray mark)
  const bracket = Math.abs(p.a.value - p.b.value) / max >= 0.15;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      {[p.a, p.b].map((r, i) => (
        <React.Fragment key={i}>
          <FitText text={`${r.label}  ${r.shown}`} x={S.left} y={y0 + i * 300 - 90} w={w} size={56} min={36} maxLines={1} weight={700} at={at - 6 + i * 4} />
          <div className="vn-obj" style={{position: 'absolute', left: S.left, top: y0 + i * 300, width: Math.max(4, bar(r.value)), height: 120, borderRadius: 14, background: i ? C.ink2 : C.ink}} />
        </React.Fragment>
      ))}
      {/* the baseline both bars start from */}
      <div className="vn-obj" style={{position: 'absolute', left: S.left - 4, top: y0 - 30, width: 4, height: 300 + 120 + 60, background: C.ink2}} />
      {bracket ? (
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: Math.min(1, Math.max(0, gapOn))}}>
          <path d={`M ${Math.min(xa, xb)} ${y0 + 440} L ${Math.min(xa, xb)} ${y0 + 470} L ${Math.max(xa, xb)} ${y0 + 470} L ${Math.max(xa, xb)} ${y0 + 440}`} fill="none" stroke={tone('accent')} strokeWidth={6} strokeLinejoin="round" />
        </svg>
      ) : null}
      <FitText text={p.gap} x={S.cx} y={y0 + 500} w={w} size={140} min={64} maxLines={1} weight={700} t="accent" align="center" at={at + 34} anim="slam" />
      <Sfx name="asmr-swell" at={at} volume={0.28} /* event: the bars race */ />
      <Sfx name="asmr-land" at={at + 32} volume={0.4} /* event: the gap lands */ />
    </div>
  );
};
