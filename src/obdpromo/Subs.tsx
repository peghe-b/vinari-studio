// The OBD promo's subtitle line: the diagnostics promo's line (one centred line, condensed Mtavruli, weight 500, one size for the
// whole film, no shadow, no outline, no box, raised into the safe zone, its colour following the picture under it; a line
// belongs to the scene its voice starts in and runs on over a cut while the voice still speaks), now built WORD BY WORD (the
// owner, 2026-10-22; the studio's c2d9e63): the whole line is laid out once, invisible, and each word pops in one frame before
// it is heard (a 70 ms fade and a 14 px rise), so the words already up never move. The hook's line is whole on frame 0. The
// bleeped line's „#@%" is laid out from the start and pops with the bleep (its own small kick).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F, L, SUB_TONE, T} from '../tokens';
import {DARK, FPS, TL} from './lib';

const toneAt = (frame: number, fallback: 'white' | 'ink'): 'white' | 'ink' => {
  const s = TL.shots.find((x) => frame >= Math.round(x.from * FPS) && frame < Math.round(x.to * FPS));
  return s ? (DARK.has(s.id) ? 'white' : 'ink') : fallback;
};

type SubChunk = {text: string; from: number; to: number; fadeOut: boolean; tone: 'white' | 'ink'; words: number[] | null};
const HOOK_LEAD = 1;
const WORD_LEAD = 1;
export const SUB_Y = 1452;
const tokensOf = (text: string) => text.split(/\s+/).filter(Boolean);

const buildSubs = (cuts: number[]): SubChunk[] => {
  const sorted = [...cuts].sort((a, b) => a - b);
  const sceneStart = (f: number) => sorted.filter((c) => c <= f).pop() ?? 0;
  const sceneEnd = (f: number) => sorted.find((c) => c > f) ?? Infinity;
  const all = TL.subs.filter((c) => c.text.trim().length > 0);
  const froms = all.map((c, i) => (i === 0 && c.start <= HOOK_LEAD ? 0 : Math.max(sceneStart(Math.round(c.start * FPS)), Math.round(c.start * FPS) - 2)));
  return all.map((c, i) => {
    const hook = i === 0 && c.start <= HOOK_LEAD;
    const from = froms[i];
    const next = all[i + 1];
    const nextFrom = next ? froms[i + 1] : Infinity;
    const tight = next !== undefined && next.start - c.end < 0.5;
    const naturalEnd = Math.round((c.end + 0.35) * FPS);
    const cut = sceneEnd(Math.round(c.start * FPS));
    const held = tight ? nextFrom : Math.min(naturalEnd, nextFrom);
    const want = Math.min(nextFrom, Math.max(held, from + 12));
    const voiceEnd = Math.round(c.end * FPS) + 3;
    const to = want <= cut ? want : Math.max(cut, Math.min(want, voiceEnd));
    const toks = tokensOf(c.text);
    const ws = Array.isArray(c.words) && c.words.length === toks.length ? c.words : null;
    const last = Math.max(from, to - 3);
    let at = from;
    const words = hook || !ws ? null : ws.map((t, k) => (at = k === 0 ? from : Math.min(last, Math.max(at, Math.round(t * FPS) - WORD_LEAD))));
    return {text: c.text, from, to, fadeOut: !tight && to !== cut, tone: c.tone, words};
  });
};

let measure: CanvasRenderingContext2D | null = null;
const sizeFor = (text: string, base: number, weight: number, maxW: number) => {
  if (typeof document === 'undefined') return base;
  measure = measure ?? document.createElement('canvas').getContext('2d');
  if (!measure) return base;
  measure.font = `${weight} ${base}px ${F.sans}`;
  const w = measure.measureText(text).width;
  return w <= maxW ? base : Math.max(40, Math.floor((base * maxW) / w));
};
const FILM_SHARE = 0.8;
const FLOOR = 50 / 58;
const filmSize = (texts: string[], base: number, weight: number, maxW: number) => {
  const fits = texts.map((t) => sizeFor(t, base, weight, maxW)).sort((a, b) => b - a);
  if (!fits.length) return base;
  const at = fits[Math.min(fits.length - 1, Math.floor(FILM_SHARE * (fits.length - 1)))];
  return Math.max(Math.round(base * FLOOR), Math.min(base, at));
};

const WORD_POP = {fade: 0.07, rise: 14, riseS: 0.1} as const;
const popOf = (frame: number, at: number, fs: number) => {
  const k = frame - at;
  const rise = (WORD_POP.rise * fs) / T.subtitle;
  if (k < 0) return {opacity: 0, y: rise};
  const p = Math.min(1, (k + 1) / (WORD_POP.riseS * FPS));
  return {opacity: Math.min(1, (k + 1) / (WORD_POP.fade * FPS)), y: rise * (1 - p) ** 2};
};

const CENSOR = '#@%';
/** the „#@%" glyphs: each its own small kick from the bleep's frame (the line's own colour: text only black or white) */
const Kick: React.FC<{text: string; k: number}> = ({text, k}) => {
  const i = text.indexOf(CENSOR);
  if (i < 0) return <>{text}</>;
  const pop = k < 0 ? 0 : Math.min(1, k / 5);
  const back = 1 + 0.55 * (1 - pop) ** 2 - 0.12 * Math.sin(Math.PI * pop);
  return (
    <>
      {text.slice(0, i)}
      {[...CENSOR].map((g, j) => {
        const kk = k - j;
        const amp = kk >= 0 && kk < 12 ? 5 * (1 - kk / 12) : 0;
        const dx = amp * Math.sin(kk * 2.3 + j * 1.7);
        const dy = amp * 0.7 * Math.cos(kk * 2.9 + j);
        const rot = amp * 1.6 * Math.sin(kk * 1.9 + j * 2.1);
        return (
          <span key={j} style={{display: 'inline-block', transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${back.toFixed(3)})`}}>
            {g}
          </span>
        );
      })}
      {text.slice(i + CENSOR.length)}
    </>
  );
};

export const Subs: React.FC<{cuts?: number[]}> = ({cuts = []}) => {
  const frame = useCurrentFrame();
  const SUBS = useMemo(() => buildSubs(cuts), [cuts]);
  const cur = SUBS.find((s) => frame >= s.from && frame < s.to);
  if (!cur) return null;
  const tOut = cur.fadeOut ? interpolate(frame, [cur.to - 4, cur.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const weight = 500;
  const maxW = L.subtitleMaxW;
  const text = mtav(cur.text);
  const base = filmSize(
    SUBS.map((x) => mtav(x.text)),
    T.subtitle,
    weight,
    maxW,
  );
  const fs = sizeFor(text, base, weight, maxW);
  const tone = toneAt(frame, cur.tone);
  const toks = tokensOf(text);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: L.subtitleX - maxW / 2,
          width: maxW,
          top: SUB_Y - fs * 0.6,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontFamily: F.sans,
          fontWeight: weight,
          fontSize: fs,
          lineHeight: 1.2,
          color: SUB_TONE[tone],
          opacity: tOut,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {toks.map((w, k) => {
          const at = cur.words ? cur.words[k] : cur.from;
          const p = cur.words ? popOf(frame, at, fs) : {opacity: 1, y: 0};
          return (
            <React.Fragment key={k}>
              {k > 0 ? ' ' : null}
              <span style={{display: 'inline-block', opacity: p.opacity, transform: `translateY(${p.y.toFixed(2)}px)`}}>{w.includes(CENSOR) ? <Kick text={w} k={frame - at} /> : w}</span>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
