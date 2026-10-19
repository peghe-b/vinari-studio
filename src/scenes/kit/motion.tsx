// src/scenes/kit/motion.tsx: refined text motion for film scenes and the Story slides (2026-10-19), our own code after the
// patterns of remocn (github.com/Remocn/remocn, MIT: mask-reveal-up, per-character-rise, tracking-in, blur-out-up,
// rolling-number, slot-machine-roll, value-swap, strikethrough-replace, inline-pill-takeover), written for this studio: frame
// driven (interpolate / spring of the frame you pass), no randomness, our fonts (F.sans: FiraGO, the condensed Noto Mtavruli),
// Georgian through mtav() at render, black or white text only (C.ink, or C.onInk on an ink fill), every text element in the
// text layer (className TXT). Never a pen stroke or a hairline: a strike is a bold bar.
//
//   <MaskUp text="ერთი | ხაზი" at={f} size={96}/>        lines rise out of a mask, one after the other ("|" breaks a line)
//   <CharRise text="ბარათი" at={f} size={120}/>           letters rise and settle one by one
//   <TrackIn text="QR ბარათი" at={f} size={88}/>          wide tracking closes to normal while it sharpens
//   <BlurUp text="..." at={f} out={g} size={72}/>         rises in from a soft blur; leaves upward blurred from `out`
//   <RollNumber value={240} from={0} at={f} dur={24} size={160} suffix="₾"/>   an odometer: each digit rolls to its place
//   <SlotWords words={['ზეთი', 'ფილტრი', 'სანთლები']} at={[f0, f1, f2]} size={84}/>   a slot reel landing on each word in turn
//   <Swap a="300 ₾" b="0 ₾" at={f} size={110}/>           the old value slides up and out, the new one comes up from below
//   <Strike a="ხელით" b="ერთი შეხებით" at={f} size={80}/>  a bold bar strikes the old words, then the new ones replace them
//   <PillLine text="ახლა *ქართულად* იცი" at={f} size={64}/>   the *word* turns into a black pill with white letters
// Every component takes `color` (default C.ink), `weight` (default 700), `align` ('left' | 'center' | 'right'), `latin` (skip
// mtav for Latin text) and `style` for its box (position it absolutely yourself).
import React from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {C, F, FPS} from '../../tokens';
import {clamp, E, lerp} from './lib';

type Align = 'left' | 'center' | 'right';
type Base = {at: number; size?: number; weight?: number; color?: string; align?: Align; latin?: boolean; style?: React.CSSProperties; lineHeight?: number};
const tx = (s: string, latin?: boolean) => (latin ? s : mtav(s));
const font = (size: number, weight: number, lineHeight = 1.06): React.CSSProperties => ({fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight, whiteSpace: 'nowrap'});
const sp = (f: number, at: number, stiffness = 170, damping = 22) => (f < at ? 0 : spring({frame: f - at, fps: FPS, config: {stiffness, damping, mass: 1}}));

/** Lines rise out of a mask (each line in its own clipped box), `stagger` frames apart. */
export const MaskUp: React.FC<Base & {text: string; stagger?: number; dur?: number}> = ({text, at, size = 96, weight = 700, color, align = 'left', latin, style, lineHeight = 1.06, stagger = 5, dur = 16}) => {
  const f = useCurrentFrame();
  const lines = text.split('|').map((l) => l.trim()).filter(Boolean);
  return (
    <div className={TXT} style={{textAlign: align, color: color ?? C.ink, ...style}}>
      {lines.map((l, i) => {
        const k = E.outExpo(clamp((f - at - i * stagger) / dur));
        return (
          <div key={i} style={{overflow: 'hidden', paddingBottom: size * 0.08, marginBottom: -size * 0.08}}>
            <div style={{...font(size, weight, lineHeight), transform: `translateY(${((1 - k) * 108).toFixed(2)}%)`}}>{tx(l, latin)}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Letters rise and settle one by one (a soft spring each, `stagger` frames apart). */
export const CharRise: React.FC<Base & {text: string; stagger?: number}> = ({text, at, size = 110, weight = 700, color, align = 'left', latin, style, lineHeight, stagger = 1.4}) => {
  const f = useCurrentFrame();
  const chars = Array.from(tx(text, latin));
  return (
    <div className={TXT} style={{...font(size, weight, lineHeight), textAlign: align, color: color ?? C.ink, ...style}}>
      {chars.map((c, i) => {
        const k = sp(f, at + i * stagger, 210, 20);
        return (
          <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: clamp(k * 1.4), transform: `translateY(${((1 - k) * size * 0.42).toFixed(2)}px)`}}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

/** Wide tracking closes to normal while the word sharpens and fades in. */
export const TrackIn: React.FC<Base & {text: string; dur?: number; from?: number}> = ({text, at, size = 88, weight = 600, color, align = 'left', latin, style, lineHeight, dur = 26, from = 0.42}) => {
  const f = useCurrentFrame();
  const k = E.out(clamp((f - at) / dur));
  return (
    <div className={TXT} style={{...font(size, weight, lineHeight), textAlign: align, color: color ?? C.ink, letterSpacing: `${(from * (1 - k)).toFixed(4)}em`, opacity: clamp(k * 1.6), filter: k < 1 ? `blur(${((1 - k) * 10).toFixed(2)}px)` : undefined, ...style}}>
      {tx(text, latin)}
    </div>
  );
};

/** Rises in from a soft blur; from `out` (optional) it leaves upward, blurring again. */
export const BlurUp: React.FC<Base & {text: string; out?: number; dur?: number}> = ({text, at, out, size = 72, weight = 600, color, align = 'left', latin, style, lineHeight, dur = 14}) => {
  const f = useCurrentFrame();
  const kin = E.out(clamp((f - at) / dur));
  const kout = out === undefined ? 0 : E.in2(clamp((f - out) / dur));
  const blur = (1 - kin) * 14 + kout * 14;
  return (
    <div
      className={TXT}
      style={{
        ...font(size, weight, lineHeight),
        textAlign: align,
        color: color ?? C.ink,
        opacity: clamp(kin * 1.5) * (1 - kout),
        transform: `translateY(${((1 - kin) * size * 0.5 - kout * size * 0.6).toFixed(2)}px)`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
        ...style,
      }}
    >
      {tx(text, latin)}
    </div>
  );
};

/** An odometer: the number rolls from `from` to `value` over `dur` frames, each digit on its own reel (tabular figures). A
 *  `prefix` / `suffix` (₾, $, %, კმ) stands still beside it. Thousands are grouped with a thin no-break space. */
export const RollNumber: React.FC<Base & {value: number; from?: number; dur?: number; prefix?: string; suffix?: string; group?: boolean}> = ({
  value,
  from = 0,
  at,
  dur = 26,
  size = 150,
  weight = 700,
  color,
  align = 'left',
  style,
  prefix = '',
  suffix = '',
  group = true,
}) => {
  const f = useCurrentFrame();
  const k = E.out(clamp((f - at) / dur));
  const v = lerp(from, value, k);
  const digits = String(Math.round(Math.abs(value))).length;
  const shown = Math.abs(v);
  const cols = Array.from({length: digits}, (_, i) => {
    const place = 10 ** (digits - 1 - i);
    // the reel's continuous position: the lowest digit runs smooth, the higher ones step with a short roll
    const raw = shown / place;
    const whole = Math.floor(raw);
    const frac = raw - whole;
    const roll = i === digits - 1 ? frac : clamp((frac - 0.86) / 0.14);
    return (whole % 10) + roll;
  });
  const lead = cols.findIndex((c, i) => i === digits - 1 || Math.floor(shown / 10 ** (digits - 1 - i)) > 0);
  const h = size * 1.08;
  return (
    <div className={TXT} style={{...font(size, weight, 1.08), display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', alignItems: 'baseline', color: color ?? C.ink, fontVariantNumeric: 'tabular-nums', ...style}}>
      {prefix ? <span style={{marginRight: size * 0.08}}>{tx(prefix)}</span> : null}
      {v < 0 ? <span>−</span> : null}
      {cols.map((c, i) => {
        if (i < lead) return null;
        const gap = group && i > lead && (digits - i) % 3 === 0 ? size * 0.16 : 0;
        return (
          <span key={i} style={{display: 'inline-block', height: h, overflow: 'hidden', marginLeft: gap, position: 'relative', width: '0.62em'}}>
            <span style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${(-(c % 10) * h).toFixed(2)}px)`}}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, j) => (
                <span key={j} style={{display: 'block', height: h}}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      {suffix ? <span style={{marginLeft: size * 0.12}}>{tx(suffix)}</span> : null}
    </div>
  );
};

/** A slot reel: it spins in at at[0] and lands on words[i] at at[i] (a short overshoot each time). */
export const SlotWords: React.FC<Omit<Base, 'at'> & {words: string[]; at: number[]}> = ({words, at, size = 84, weight = 700, color, align = 'left', latin, style, lineHeight = 1.1}) => {
  const f = useCurrentFrame();
  const h = size * lineHeight;
  let pos = 0;
  at.forEach((a, i) => {
    if (i === 0) return;
    pos += sp(f, a, 260, 18) * 1;
  });
  const enter = sp(f, at[0] ?? 0, 200, 20);
  const w = Math.max(1, ...words.map((x) => Array.from(x).length));
  return (
    <div className={TXT} style={{height: h, overflow: 'hidden', textAlign: align, color: color ?? C.ink, opacity: clamp(enter * 1.5), minWidth: `${w * 0.55}em`, ...style}}>
      <div style={{transform: `translateY(${(-pos * h + (1 - enter) * h).toFixed(2)}px)`}}>
        {words.map((x, i) => (
          <div key={i} style={{...font(size, weight, lineHeight), height: h}}>
            {tx(x, latin)}
          </div>
        ))}
      </div>
    </div>
  );
};

/** A value swap: `a` slides up and out, `b` rises from below into its place, both in one clipped line. */
export const Swap: React.FC<Base & {a: string; b: string; dur?: number}> = ({a, b, at, size = 110, weight = 700, color, align = 'left', latin, style, lineHeight = 1.08, dur = 14}) => {
  const f = useCurrentFrame();
  const k = E.outExpo(clamp((f - at) / dur));
  const h = size * lineHeight;
  const row = (s: string, y: number, o: number) => (
    <div style={{...font(size, weight, lineHeight), position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${y.toFixed(2)}px)`, opacity: o}}>{tx(s, latin)}</div>
  );
  return (
    <div className={TXT} style={{position: 'relative', height: h, overflow: 'hidden', textAlign: align, color: color ?? C.ink, ...style}}>
      {k < 1 ? row(a, -k * h, 1 - k) : null}
      {k > 0 ? row(b, (1 - k) * h, 1) : null}
      <div style={{...font(size, weight, lineHeight), visibility: 'hidden'}}>{tx(a.length > b.length ? a : b, latin)}</div>
    </div>
  );
};

/** A bold bar strikes the old words (left to right), they fall away, the new words rise in their place. Never a hairline. */
export const Strike: React.FC<Base & {a: string; b: string; dur?: number}> = ({a, b, at, size = 80, weight = 700, color, align = 'left', latin, style, lineHeight = 1.08, dur = 10}) => {
  const f = useCurrentFrame();
  const ink = color ?? C.ink;
  const bar = E.out(clamp((f - at) / dur));
  const away = E.in2(clamp((f - at - dur - 6) / 10));
  const inK = sp(f, at + dur + 12, 190, 20);
  return (
    <div className={TXT} style={{position: 'relative', textAlign: align, color: ink, ...style}}>
      <div style={{...font(size, weight, lineHeight), display: 'inline-block', position: 'relative', opacity: 1 - away, transform: `translateY(${(away * size * 0.4).toFixed(2)}px)`}}>
        {tx(a, latin)}
        <div style={{position: 'absolute', left: -size * 0.04, top: '52%', height: Math.max(6, size * 0.1), width: `${(bar * 104).toFixed(2)}%`, background: ink, borderRadius: size}} />
      </div>
      {inK > 0.001 ? (
        <div style={{...font(size, weight, lineHeight), position: 'absolute', left: 0, right: 0, top: 0, opacity: clamp(inK * 1.4), transform: `translateY(${((1 - inK) * size * 0.5).toFixed(2)}px)`}}>{tx(b, latin)}</div>
      ) : null}
    </div>
  );
};

/** A line whose *word* turns into a pill: the ink fill grows behind it and the word turns white (C.onInk). */
export const PillLine: React.FC<Base & {text: string; dur?: number}> = ({text, at, size = 64, weight = 600, color, align = 'left', latin, style, lineHeight = 1.2, dur = 12}) => {
  const f = useCurrentFrame();
  const ink = color ?? C.ink;
  const k = E.outBack(clamp((f - at) / dur));
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean);
  return (
    <div className={TXT} style={{...font(size, weight, lineHeight), textAlign: align, color: ink, ...style}}>
      {parts.map((s, i) => {
        if (!/^\*[^*]+\*$/.test(s)) return <span key={i}>{tx(s, latin)}</span>;
        const word = tx(s.slice(1, -1), latin);
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', padding: `0 ${size * 0.32}px`, margin: `0 ${size * 0.06}px`}}>
            <span style={{position: 'absolute', inset: `${-size * 0.06}px 0 ${-size * 0.1}px 0`, borderRadius: size, background: ink, transform: `scaleX(${clamp(k, 0, 1.06).toFixed(4)})`, transformOrigin: '0 50%', opacity: clamp(k * 3)}} />
            <span style={{position: 'relative', color: interpolate(k, [0.3, 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) > 0.5 ? C.onInk : ink, fontWeight: 700}}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};
