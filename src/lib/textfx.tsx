import React from 'react';
import {interpolateColors, useCurrentFrame} from 'remotion';
import {Haptic, Sfx, TypeSfx} from '../scenes/common';
import {C, F, Tone, toneBig, toneLine} from '../tokens';
import {ease, prog, rand, spr, typeOn} from './anim';
import {kickEnv} from './camera';
import {capsLatin, mtav} from './format';
import {TXT} from './layer';
import {textWidth} from './measure';

// ---- text motion (2026-10-06: one entrance, one weight, words that only ever rose 24 px, read the same in every film)
// <Words> sets ONE line word by word, each word a TXT span (the clean text layer) through mtav(), with an entrance:
//   mask    each word rises out of its own mask (crisp, no fade), 2 frames apart
//   slam    each word lands from 1.6x with a 5-frame blur, 4 frames apart (the punchline)
//   blur    each word focuses in while its letters close up
//   stack   the whole line slides in from one side (`side`), alternate lines from alternate sides
//   strike  the line stands; at `strikeAt` a bar draws through it and it steps back (a belief struck out)
//   type    mono, typed at 1.4 characters a frame with a block cursor (a case file)
//   decode  every letter cycles seeded Mtavruli glyphs, then locks, left to right (the twist decodes)
//   rise    the old rise-in (kept for the end card and friends)
// "*word*" marks a PUNCH word (at most 2 a line, 3 a scene): it lands with a scale pop on SPRING.punch, morphs from
// weight 500 to 700 (Noto Sans Georgian is variable 400..700, so Mtavruli morphs smoothly; FiraGO's digits snap),
// takes its tone, and fires one camera kick (src/lib/kicks.ts), a knock and a medium haptic. Every word box is laid out
// at its FINAL weight, so a morph never reflows the line. Blur on a word lasts 6 frames at most, 12 px at most.
// The frames are pure functions (wordStart, punchFrames) so the camera's kicks land on the same frames.

export type TextFx = 'mask' | 'slam' | 'blur' | 'stack' | 'strike' | 'type' | 'decode' | 'rise';
export const TEXT_FX: TextFx[] = ['mask', 'slam', 'blur', 'stack', 'strike', 'type', 'decode', 'rise'];
export const STAGGER: Record<TextFx, number> = {mask: 2, slam: 4, blur: 2, stack: 0, strike: 0, type: 0, decode: 1, rise: 2};
/** frames after a punch word's own start when it punches (it is readable by then) */
export const PUNCH_DELAY = 3;
const PUNCH_MAX = 2;

export type Word = {w: string; punch: boolean};
/** The words of a line; "*word*" (punctuation may follow the closing star) is a punch, at most PUNCH_MAX a line. */
export const parseWords = (text: string): Word[] => {
  let n = 0;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = /^\*([^*]+)\*([^*]*)$/.exec(w);
      if (m && n < PUNCH_MAX) {
        n++;
        return {w: m[1] + m[2], punch: true};
      }
      return {w: w.replace(/\*/g, ''), punch: false};
    });
};
/** The line without its punch stars. */
export const plainText = (text: string) => text.replace(/\*/g, '');
/** The frame word i of a line starting at `start` begins its entrance. */
export const wordStart = (start: number, i: number, fx: TextFx, stagger?: number) => start + i * (stagger ?? STAGGER[fx]);
/** The frames the line's punch words punch. */
export const punchFrames = (text: string, start: number, fx: TextFx, stagger?: number) =>
  parseWords(text).flatMap((w, i) => (w.punch ? [wordStart(start, i, fx, stagger) + PUNCH_DELAY] : []));

export const fontOf = (size: number, weight: number, mono = false) => `${weight} ${size}px ${mono ? F.mono : F.sans}`;
const GAP = 0.26; // the word gap, em (as Title)
/** The set width of a line at its final weights (punch words at 700). */
export const lineWidth = (text: string, size: number, weight = 600, mono = false, ls = -0.01) => {
  const words = parseWords(text);
  return words.reduce((w, x) => w + textWidth(mtav(capsLatin(x.w)), fontOf(size, x.punch ? 700 : weight, mono), ls * size), 0) + Math.max(0, words.length - 1) * size * GAP;
};

const MTAV0 = 0x1c90; // U+1C90..U+1CBA: the decode's random glyphs
const glyph = (seed: number) => String.fromCharCode(MTAV0 + Math.floor(rand(seed) * 43));

type Props = {
  text: string;
  at: number; // the line's first frame
  fx?: TextFx;
  stagger?: number;
  size: number;
  weight?: number; // 600
  tone?: Tone; // the whole line's colour (data)
  punchTone?: Tone; // only the punch words take this colour when they punch
  color?: string;
  mono?: boolean;
  outline?: boolean; // an outlined word fills left to right on its punch
  strikeAt?: number; // strike: the frame the bar draws
  strikeTone?: Tone;
  side?: 1 | -1; // stack: the side it slides in from
  seed?: number;
  sound?: boolean; // the punch knocks and haptics (default true)
  ls?: number; // letter-spacing, em (-0.01)
  style?: React.CSSProperties;
};

/** One line of words with a motion. Inline: place it in a positioned block (nowrap). */
export const Words: React.FC<Props> = ({text, at, fx = 'mask', stagger, size, weight = 600, tone, punchTone, color, mono = false, outline = false, strikeAt, strikeTone, side = 1, seed = 1, sound = true, ls = -0.01, style}) => {
  const frame = useCurrentFrame();
  const words = parseWords(text);
  const base = color ?? (tone ? toneBig(tone) : C.ink);
  const lineH = size * 1.16;
  if (fx === 'type') {
    const shown = mtav(capsLatin(plainText(text)));
    const n = Array.from(shown).length;
    const done = at + Math.ceil(n / 1.4);
    const cursor = frame >= at && frame < done + 24 && Math.floor((frame - at) / 8) % 2 === 0;
    return (
      <span className={TXT} style={{position: 'relative', display: 'inline-block', whiteSpace: 'nowrap', fontFamily: F.mono, fontSize: size, letterSpacing: '0.04em', color: base, lineHeight: 1.2, ...style}}>
        <span style={{visibility: 'hidden'}}>{shown}</span>
        <span style={{position: 'absolute', left: 0, top: 0}}>
          {typeOn(shown, frame, at, 1.4)}
          <span style={{display: 'inline-block', width: size * 0.56, height: size * 0.9, marginLeft: 2, verticalAlign: '-0.08em', backgroundColor: base, opacity: cursor ? 0.85 : 0}} />
        </span>
        {sound ? <TypeSfx text={shown} at={at} cpf={1.4} volume={0.26} /> : null}
      </span>
    );
  }
  const lineIn = fx === 'stack' ? prog(frame, at, 10, ease.whipOut) : 1;
  const strike = strikeAt !== undefined ? prog(frame, strikeAt, 8, ease.drawOn) : 0;
  const lw = lineWidth(text, size, weight, mono, ls);
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        lineHeight: 1.16,
        height: lineH,
        transform: fx === 'stack' ? `translateX(${(side * (1 - lineIn) * 160).toFixed(2)}px)` : undefined,
        opacity: fx === 'stack' ? Math.min(1, prog(frame, at, 4) * 1.2) : strikeAt !== undefined ? 1 - 0.65 * strike : 1,
        ...style,
      }}
    >
      {words.map((wd, i) => {
        const w0 = wordStart(at, i, fx, stagger);
        const shown = mtav(capsLatin(wd.w));
        const fw = wd.punch ? 700 : weight;
        const boxW = textWidth(shown, fontOf(size, fw, mono), ls * size);
        const pw = w0 + PUNCH_DELAY;
        const punched = wd.punch && frame >= pw;
        // the pop rises over 2 frames and falls back (camera.tsx kickEnv): an impact, never a one-frame jump
        const pScale = punched ? 1 + 0.18 * kickEnv(frame - pw) : 1;
        const wNow = wd.punch ? (frame < pw ? 500 : 500 + 200 * prog(frame, pw, 6, ease.enter)) : weight;
        const pt = punchTone ?? tone;
        const toneK = wd.punch && pt ? prog(frame, pw, 4) : 1;
        const col = wd.punch && pt ? interpolateColors(toneK, [0, 1], [base === toneBig(pt) ? C.ink : base, toneBig(pt)]) : base;
        // the entrance
        let tf = '';
        let op = 1;
        let blur = 0;
        let lsNow = ls;
        let inner: React.CSSProperties | null = null;
        if (frame < w0 && fx !== 'stack' && fx !== 'strike') op = 0;
        if (fx === 'mask') {
          const k = prog(frame, w0, 9, ease.whipOut);
          inner = {display: 'inline-block', transform: `translateY(${((1 - k) * 110).toFixed(2)}%)`};
          op = frame < w0 ? 0 : 1;
        } else if (fx === 'slam') {
          const k = spr(frame, w0, 'punch');
          tf = `scale(${(1.6 - 0.6 * k).toFixed(4)})`;
          blur = Math.max(0, 10 - 2 * (frame - w0));
          op = prog(frame, w0, 3);
        } else if (fx === 'blur') {
          const k = prog(frame, w0, 8);
          op = k;
          blur = 10 * (1 - prog(frame, w0, 6));
          lsNow = 0.12 + (ls - 0.12) * prog(frame, w0, 10, ease.whipOut);
        } else if (fx === 'rise') {
          const k = spr(frame, w0);
          op = k;
          tf = `translateY(${((1 - k) * 24).toFixed(2)}px)`;
        }
        if (pScale !== 1) tf = `${tf} scale(${pScale.toFixed(4)})`;
        const letters = Array.from(shown);
        const decoding = fx === 'decode';
        const body = decoding
          ? letters.map((ch, j) => {
              const lock = w0 + 6 + j;
              const lw1 = textWidth(ch, fontOf(size, fw, mono), ls * size);
              const show = frame < w0 ? '' : frame >= lock || ch === ' ' ? ch : glyph(seed * 97 + i * 31 + j * 7 + (frame >> 1));
              return (
                <span key={j} style={{display: 'inline-block', width: lw1, textAlign: 'center', opacity: frame >= lock ? 1 : 0.7}}>
                  {show}
                </span>
              );
            })
          : shown;
        const outlined = outline
          ? {
              color: 'transparent',
              WebkitTextStroke: `2px ${col}`,
              backgroundImage: `linear-gradient(90deg, ${col} ${(prog(frame, pw, 8, ease.camera) * 100).toFixed(1)}%, transparent ${(prog(frame, pw, 8, ease.camera) * 100).toFixed(1)}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }
          : null;
        return (
          <span
            key={i}
            className={TXT}
            style={{
              position: 'relative',
              display: 'inline-block',
              width: boxW,
              marginRight: i < words.length - 1 ? size * GAP : 0,
              overflow: fx === 'mask' ? 'hidden' : 'visible',
              verticalAlign: 'top',
              height: lineH,
              fontFamily: mono ? F.mono : F.sans,
              fontSize: size,
              fontWeight: wNow,
              letterSpacing: `${lsNow}em`,
              color: col,
              opacity: op,
              transform: tf || undefined,
              transformOrigin: '50% 60%',
              filter: blur > 0.05 ? `blur(${Math.min(12, blur).toFixed(2)}px)` : undefined,
              ...outlined,
            }}
          >
            {inner ? <span style={inner}>{body}</span> : body}
          </span>
        );
      })}
      {strikeAt !== undefined && strike > 0 ? (
        <span style={{position: 'absolute', left: -6, top: lineH * 0.5 - 3, height: 6, width: (lw + 12) * strike, backgroundColor: toneLine(strikeTone ?? 'neutral')}} />
      ) : null}
      {sound
        ? words.map((wd, i) =>
            wd.punch ? (
              <React.Fragment key={`p${i}`}>
                <Sfx name="asmr-knock" at={wordStart(at, i, fx, stagger) + PUNCH_DELAY} volume={0.4} />
                <Haptic kind="medium" at={wordStart(at, i, fx, stagger) + PUNCH_DELAY} />
              </React.Fragment>
            ) : null,
          )
        : null}
      {sound && strikeAt !== undefined ? (
        <>
          <Sfx name="asmr-strike" at={strikeAt} volume={0.4} len={11} />
          <Haptic kind={strikeTone === 'down' ? 'error' : 'light'} at={strikeAt + 4} volume={0.34} />
        </>
      ) : null}
    </span>
  );
};
