// The creator story's helpers (copied from src/qrpromo/lib.ts, so a change there never breaks this film) and its clock:
// src/crpromo/timeline.json, made by build/plan.py from the measured narrator take (every word's start, the subtitle
// chunks, the named cues the shots are cut to).
import {spring} from 'remotion';
import timeline from './timeline.json';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export type Word = {w: string; t: number};
export type Chunk = {text: string; start: number; end: number; words: Word[]; line: number};
export type Timeline = {total: number; fps: number; takeAt: number; lines: {start: number; end: number; words: Word[]}[]; chunks: Chunk[]; cues: Record<string, number>};
export const TL = timeline as unknown as Timeline;
export const fr = (s: number) => Math.round(s * FPS);
export const TOTAL = fr(TL.total);
/** a named cue (seconds of the film): a word's start */
export const cue = (name: string): number => {
  const v = TL.cues[name];
  if (typeof v !== 'number') throw new Error(`crpromo: no cue ${name}`);
  return v;
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (frame: number, start: number, dur: number) => clamp((frame - start) / Math.max(1, dur));
export const E = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t: number) => 1 - (1 - t) ** 3,
  out2: (t: number) => 1 - (1 - t) ** 2,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  in: (t: number) => t * t * t,
  in2: (t: number) => t * t,
  sine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  outBack: (t: number) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};
/** a spring 0 -> 1 from `start` (frames) */
export const sp = (frame: number, start: number, stiffness = 140, damping = 18, mass = 1) =>
  frame < start ? 0 : spring({frame: frame - start, fps: FPS, config: {stiffness, damping, mass}});

/** the light world: paper, ink, the site's greys and its one accent (ink), the REC red */
export const PAPER = '#F4F4F6';
export const CARD = '#FFFFFF';
export const INK = '#0B0B0B';
export const INK2 = '#5E5E63';
export const INK3 = '#9A9AA0';
export const LINE = 'rgba(11,11,11,0.08)';
export const REC = '#FF3B30';
export const GREEN = '#1F9D4C';
/** a soft drop shadow for glass cards */
export const SHADOW = '0 30px 80px rgba(20,20,30,0.13), 0 6px 18px rgba(20,20,30,0.07)';
