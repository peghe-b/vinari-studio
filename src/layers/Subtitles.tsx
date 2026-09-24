import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, F, L, T} from '../tokens';

export type SubChunk = {text: string; from: number; to: number; fadeIn: boolean; fadeOut: boolean}; // absolute frames

// One centred line per voice phrase (pollar style), timed from the TTS word boundaries.
// It appears 2 frames before the first word. A chunk followed closely by the next one is
// swapped in place (no fade either side, so nothing blinks); after a long pause it fades.
// The hook's line is already up on frame 0 when the voice starts within HOOK_LEAD seconds: frame 0
// is the cover and the loop point, and with the sound off it must still say the hook.
const HOOK_LEAD = 1;
export const buildSubs = (chunks: {text: string; start: number; end: number}[], fps: number): SubChunk[] =>
  chunks
    .filter((c) => c.text.trim().length > 0)
    .map((c, i, all) => {
      const hook = i === 0 && c.start <= HOOK_LEAD;
      const from = hook ? 0 : Math.max(0, Math.round(c.start * fps) - 2);
      const prev = all[i - 1];
      const next = all[i + 1];
      const nextFrom = next ? Math.max(0, Math.round(next.start * fps) - 2) : Infinity;
      const tight = next !== undefined && next.start - c.end < 0.5;
      const naturalEnd = Math.round((c.end + 0.35) * fps);
      const to = tight ? nextFrom : Math.min(naturalEnd, nextFrom);
      return {
        text: c.text,
        from,
        to: Math.min(nextFrom, Math.max(to, from + 12)),
        fadeIn: !hook && (!prev || c.start - prev.end >= 0.5),
        fadeOut: !tight,
      };
    });

// Always one line: the size is measured, never wrapped. Georgian is ~25% wider than Latin, so a
// long chunk shrinks instead of spilling into the platform UI. The line sits in the lower block of
// the Reels safe zone (frame pixels, outside the stage), centred on that block's own centre (the
// like / comment / share column narrows it on the right). `silent`: no voice, so the line is the
// primary text: larger and a step heavier, same timing. `centre`: no platform UI (the 16:9 frame).
let measure: CanvasRenderingContext2D | null = null;
const sizeFor = (text: string, base: number, weight: number, maxW: number) => {
  if (typeof document === 'undefined') return base;
  measure = measure ?? document.createElement('canvas').getContext('2d');
  if (!measure) return base;
  measure.font = `${weight} ${base}px FiraGO`;
  const w = measure.measureText(text).width;
  return w <= maxW ? base : Math.max(40, Math.floor((base * maxW) / w));
};

export const Subtitles: React.FC<{subs: SubChunk[]; silent?: boolean; centreX?: number}> = ({subs, silent = false, centreX = L.subtitleX}) => {
  const frame = useCurrentFrame();
  const cur = subs.find((s) => frame >= s.from && frame < s.to);
  if (!cur) return null;
  const tIn = cur.fadeIn ? interpolate(frame, [cur.from, cur.from + 3], [0, 1], {extrapolateRight: 'clamp'}) : 1;
  const tOut = cur.fadeOut ? interpolate(frame, [cur.to - 4, cur.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const weight = silent ? 600 : 500;
  const maxW = L.subtitleMaxW;
  const fs = sizeFor(cur.text, silent ? T.subtitleSilent : T.subtitle, weight, maxW);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: centreX - maxW / 2,
          width: maxW,
          top: L.subtitleY - fs * 0.6,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontFamily: F.sans,
          fontWeight: weight,
          fontSize: fs,
          lineHeight: 1.2,
          color: C.ink,
          opacity: Math.min(tIn, tOut),
          transform: `translateY(${(1 - tIn) * 10}px)`,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {cur.text}
      </div>
    </AbsoluteFill>
  );
};
