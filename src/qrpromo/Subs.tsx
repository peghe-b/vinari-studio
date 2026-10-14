// COPY of src/navpromo/Subs.tsx for the QR promo, its line raised into the brief's safe zone (bottom 420: the letters end
// above y 1500). The studio's subtitle line (src/layers/Subtitles.tsx: one centred line, condensed
// Mtavruli, weight 500, one size for the whole film, no shadow, no outline, no box), timed the studio's way (up 2 frames
// before the first word, swapped in place when the next follows closely, a fade after a pause). Its colour is the
// storyboard's: white over the dark opening, ink from the whiteout on.
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {capsLatin, mtav} from '../lib/format';
import {F, L, SUB_TONE, T} from '../tokens';
import {FPS, TL} from './lib';

type SubChunk = {text: string; from: number; to: number; fadeIn: boolean; fadeOut: boolean; tone: 'white' | 'ink'; censor: boolean};
const HOOK_LEAD = 1;
/** the line's centre: its Mtavruli letters (about 0.75 of the size, centred) end near y 1478, inside the brief's safe zone */
export const SUB_Y = 1452;
/** The lines and their frames. `cuts` are the frames where the picture cuts (each block's first frame): a line belongs to
 *  the scene its voice starts in, so it never shows before that scene's cut (the 2-frame lead stops at the cut) and never
 *  runs past the next one (a held line ends on the cut, with the picture, instead of hanging over the next scene). */
const buildSubs = (cuts: number[]): SubChunk[] => {
  const sorted = [...cuts].sort((a, b) => a - b);
  const sceneStart = (f: number) => sorted.filter((c) => c <= f).pop() ?? 0;
  const sceneEnd = (f: number) => sorted.find((c) => c > f) ?? Infinity;
  const all = TL.subs.filter((c) => c.text.trim().length > 0);
  const froms = all.map((c, i) => (i === 0 && c.start <= HOOK_LEAD ? 0 : Math.max(sceneStart(Math.round(c.start * FPS)), Math.round(c.start * FPS) - 2)));
  return all.map((c, i) => {
    const hook = i === 0 && c.start <= HOOK_LEAD;
    const from = froms[i];
    const prev = all[i - 1];
    const next = all[i + 1];
    const nextFrom = next ? froms[i + 1] : Infinity;
    const tight = next !== undefined && next.start - c.end < 0.5;
    const naturalEnd = Math.round((c.end + 0.35) * FPS);
    const cut = sceneEnd(Math.round(c.start * FPS));
    const held = tight ? nextFrom : Math.min(naturalEnd, nextFrom);
    const to = Math.min(cut, nextFrom, Math.max(held, from + 12));
    return {
      text: /[a-z]/i.test(c.text) && !/[ა-ჰ]/.test(c.text) ? capsLatin(c.text) : c.text,
      from,
      to,
      fadeIn: !hook && (!prev || c.start - prev.end >= 0.5),
      // a line that ends on a cut goes with the picture (no fade into the next scene)
      fadeOut: !tight && to < cut,
      tone: c.tone,
      censor: Boolean(c.censor),
    };
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

/** the censored line: the „#@%" glyphs pop and shake with the bleep (each its own small kick), the rest stays still */
const CENSOR = '#@%';
const Censored: React.FC<{text: string; k: number}> = ({text, k}) => {
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
          <span key={j} style={{display: 'inline-block', transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${back.toFixed(3)})`, color: '#FF6A55'}}>
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
  const tIn = cur.fadeIn ? interpolate(frame, [cur.from, cur.from + 3], [0, 1], {extrapolateRight: 'clamp'}) : 1;
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
          color: SUB_TONE[cur.tone],
          opacity: Math.min(tIn, tOut),
          transform: `translateY(${(1 - tIn) * 10}px)`,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {cur.censor ? <Censored text={text} k={frame - cur.from} /> : text}
      </div>
    </AbsoluteFill>
  );
};
