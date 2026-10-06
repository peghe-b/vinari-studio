import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, isLight, L, rgba} from '../tokens';
import type {SceneCtx} from '../types';
import {BrandMark, brandFile, entrance, Haptic, lead, Sfx} from './common';

// `line` is gone (the owner, 2026-09-24: no store line, no call to action); a spec that still sets
// it is ignored.
// `mode` (fx films, the ending templates of src/Promo.tsx): "card" (default, as it always was), "stamp" (the card lands on
// the film's last picture, frozen under a veil: a smaller mark, the words on a panel), "loop" (as stamp, and over the
// last 12 frames the card fades while Promo pushes into the hook's first frame, so the replay is seamless).
type P = {tagline?: string; note?: string; line?: string; mode?: 'card' | 'stamp' | 'loop'};

const MARK_W0 = 176;
const WORD_W = 276;
const WORD_H = (WORD_W * 68) / 267;
const TAG_FS = 50;
const NOTE_FS = 24;
const CY = L.contentMid; // centre of the content box (stage units)
const TAG_MAX_W = 720; // the tagline never wraps: a long one shrinks to 720 px (840 ran 3x the wordmark's width, nearly edge to edge)

// A quiet signature, never a call to action: the mark, the wordmark, an optional one-line tagline
// and an optional mono note (e.g. "VINARI+" after a film that showed paid features). No store name,
// no badge. The card never freezes: after it lands, the whole signature keeps a slow push-in, a
// soft light passes once across the mark, and a hairline under the wordmark keeps drawing.
// A "|" in the tagline breaks it into two lines (the follow reminder of every second film is longer than a
// quote: ci/endings.json, tools/ci/ending.mjs); both lines take one size, the widest fitting 720 px. A tagline
// without "|" is the one line it always was.
export const EndCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const stamped = p.mode === 'stamp' || p.mode === 'loop';
  const MARK_W = stamped ? 140 : MARK_W0;
  const MARK_H = (MARK_W * 671) / 768;
  // loop: the card's words leave over frames dur-12..dur-4, the hook's first frame takes over (Promo)
  const out = p.mode === 'loop' ? 1 - prog(frame, ctx.dur - 12, 8) : 1;
  // the entrance starts before the cut, so the cut lands on the mark (sounds stay on base)
  const e = entrance(ctx);

  // vertical stack, centred on the content box
  const gapWord = 50;
  const gapTag = 64;
  const gapNote = p.tagline ? 30 : 56;
  const raw = p.tagline ?? '';
  const tagRows = (raw.includes('|') ? raw.split('|').map((r) => r.trim()).filter(Boolean) : [raw]).map((r) => mtav(r));
  const rowsN = p.tagline ? tagRows.length : 0;
  const tagH = p.tagline ? gapTag + TAG_FS * 1.2 * rowsN : 0;
  const noteH = p.note ? gapNote + NOTE_FS * 1.25 : 0;
  const total = MARK_H + gapWord + WORD_H + tagH + noteH;
  const markTop = Math.round(CY - total / 2 - 10);
  const wordTop = markTop + MARK_H + gapWord;
  const tagTop = wordTop + WORD_H + gapTag;
  const noteTop = wordTop + WORD_H + (p.tagline ? gapTag + TAG_FS * 1.2 * rowsN : 0) + gapNote;
  const ruleY = wordTop + WORD_H + (p.tagline ? gapTag / 2 : 26);

  const mark = spr(frame, e, 'enterXL');
  const wipe = prog(frame, e, 16);
  const word = prog(frame, e + 8, 16, ease.drawOn);
  const hold = Math.max(24, ctx.dur - (e + 22));
  const push = 1 + 0.03 * prog(frame, e + 22, hold, ease.camera);
  const sheen = prog(frame, e + 26, 44, ease.camera); // 0..1: the light crosses the mark once
  const rule = prog(frame, e + 22, hold, ease.camera);
  const rowWords = tagRows.map((r) => r.split(' '));
  const rowW = (r: string, words: string[]) => textWidth(r, `500 ${TAG_FS}px ${F.sans}`) + 14 * Math.max(0, words.length - 1) - textWidth(' ', `500 ${TAG_FS}px ${F.sans}`) * Math.max(0, words.length - 1);
  const tagW = Math.max(...tagRows.map((r, k) => rowW(r, rowWords[k])));
  const tagFs = tagW > TAG_MAX_W ? Math.floor((TAG_FS * TAG_MAX_W) / tagW) : TAG_FS;
  // the words rise one after another, on through the second line
  const wordSpans = (words: string[], first: number) =>
    words.map((w, i) => {
      const s = spr(frame, e + 16 + (first + i) * 2);
      return (
        <span key={i} className={TXT} style={{display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 16}px)`, marginRight: i < words.length - 1 ? (14 * tagFs) / TAG_FS : 0}}>
          {w}
        </span>
      );
    });

  return (
    <>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${CY}px`, opacity: out < 1 ? out : undefined}}>
        {stamped ? (
          // drawn in the clean text layer (TXT), so it also covers the frozen picture's own words under the card
          <div
            className={TXT}
            style={{
              position: 'absolute',
              left: 120,
              right: 120,
              top: markTop - 48,
              height: total + 106,
              backgroundColor: rgba(C.bg, 0.6),
              opacity: prog(frame, e, 10),
            }}
          />
        ) : null}
        {/* the mark, wiping up from its point, then one soft light across it */}
        {/* the brand is drawn like text, in the clean layer above the lens (lib/layer.ts): no fringe on the mark */}
        <div className={TXT} style={{position: 'absolute', top: markTop, left: 540 - MARK_W / 2, width: MARK_W, height: MARK_H, opacity: mark, transform: `scale(${0.94 + 0.06 * mark})`, clipPath: `inset(0 0 ${(1 - wipe) * 100}% 0)`}}>
          <BrandMark kind="mark" width={MARK_W} height={MARK_H} style={{position: 'absolute', inset: 0}} />
          {sheen > 0 && sheen < 1 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                WebkitMaskImage: `url(${brandFile('mark')})`,
                WebkitMaskSize: '100% 100%',
                maskImage: `url(${brandFile('mark')})`,
                maskSize: '100% 100%',
                // white light over the mark: it lifts the light mark on the black film to white, and
                // passes as a soft grey gleam over the ink mark on paper
                background: `linear-gradient(110deg, transparent ${-30 + 160 * sheen - 16}%, ${rgba(C.sheen, isLight() ? 0.42 : 0.9)} ${-30 + 160 * sheen}%, transparent ${-30 + 160 * sheen + 16}%)`,
              }}
            />
          ) : null}
        </div>
        {/* the wordmark wipes in left to right */}
        <div className={TXT} style={{position: 'absolute', top: wordTop, left: 540 - WORD_W / 2, width: WORD_W, height: WORD_H, clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`, opacity: Math.min(1, word * 2)}}>
          <BrandMark kind="wordmark" width={WORD_W} height={WORD_H} />
        </div>
        {/* a hairline that keeps drawing out from the centre for the whole hold */}
        <div style={{position: 'absolute', top: ruleY, left: 540 - 90 * rule, width: 180 * rule, height: 1.5, background: C.rule, opacity: 0.9}} />
        {p.tagline ? (
          <div style={{position: 'absolute', top: tagTop + ((TAG_FS - tagFs) * 1.2 * rowsN) / 2, left: 60, right: 60, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 500, fontSize: tagFs, lineHeight: 1.2, color: C.ink}}>
            {rowsN === 1
              ? wordSpans(rowWords[0], 0)
              : rowWords.map((words, k) => <div key={k}>{wordSpans(words, rowWords.slice(0, k).reduce((n, x) => n + x.length, 0))}</div>)}
          </div>
        ) : null}
        {p.note ? (
          <div className={TXT} style={{position: 'absolute', top: noteTop, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: NOTE_FS, letterSpacing: '0.08em', color: C.ink3, opacity: prog(frame, e + 28, 12), whiteSpace: 'nowrap'}}>
            {mtav(capsLatin(p.note))}
          </div>
        ) : null}
      </div>
      {/* event: the mark lands; the felt tail breathes out and fades before the last frame */}
      <Sfx name="asmr-end" at={base + 2} volume={0.55} len={ctx.dur - base - (p.mode === 'loop' ? 10 : 3)} fade={14} />
      {/* event: the mark settles: a soft, dry pat (cc0 carpet) under the felt hit */}
      <Sfx name="cc0-carpet" at={base + 2} volume={0.5} />
      {/* event: the mark lands: a light haptic on the felt hit (the hit is low, a phone speaker keeps only this click) */}
      <Haptic kind="light" at={base + 2} volume={0.32} />
    </>
  );
};
