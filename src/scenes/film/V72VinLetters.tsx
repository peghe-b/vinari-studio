// v72-vin-letters: a VIN strip of 17 cells types on; its round and straight marks are ringed, then three glyph
// cards rise under it (O over 0, I over 1, Q over 0): the letter that looks like a digit is struck out, the digit stays.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx, SourceLine, vary} from '../common';
import {C, F, L, rgba, toneBig, toneLine, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  vin?: string; // 17 characters, an illustration
  oAt?: number | string; // the O card rises, the strip's zeros are ringed
  iqAt?: number | string; // the I and Q cards join it
  strikeAt?: number | string; // the three letters are struck out
  label?: string; // a small mono label over the strip
  source?: string;
  tone?: Tone;
};

const CELL = 46;
const GAP = 3;
const X0 = 540 - (17 * CELL + 16 * GAP) / 2;
const STRIP_Y = 500;
const STRIP_H = 70;
const CARD_W = 236;
const CARD_H = 460;
const CARD_GAP = 40;
const CARD_Y = 690;
// the three pairs, left to right: the letter and the digit it is taken for
const PAIRS = [
  ['I', '1'],
  ['O', '0'],
  ['Q', '0'],
];

export const V72VinLetters: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const vin = (p.vin ?? '4AB3E1EA0KF101234').slice(0, 17);
  const oAt = Math.max(base + 14, cueFrame(ctx, p.oAt ?? 1));
  const iqAt = Math.max(oAt + 10, cueFrame(ctx, p.iqAt ?? 2));
  const strikeAt = Math.max(iqAt + 10, cueFrame(ctx, p.strikeAt ?? 3));
  const tone = p.tone ?? 'down';
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const ring = prog(frame, oAt, 14, ease.drawOn);
  const cardsX0 = 540 - (3 * CARD_W + 2 * CARD_GAP) / 2;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < 17; i++) {
    const ch = vin.charAt(i);
    const a = prog(frame, e + i * 1.4, 8, ease.drawOn);
    const x = X0 + i * (CELL + GAP);
    const round = ch === '0' || ch === '1';
    cells.push(
      <div key={i} style={{position: 'absolute', left: x, top: STRIP_Y, width: CELL, height: STRIP_H, opacity: a, transform: `translateY(${(1 - a) * 10}px)`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 8, backgroundColor: C.surface, border: `1.5px solid ${round && ring > 0 ? rgba(C.ink, 0.25 + 0.6 * ring) : C.rule}`}} />
        <div className={TXT} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 34, fontWeight: 600, color: C.ink}}>
          {ch}
        </div>
      </div>,
    );
  }

  const cards = PAIRS.map(([letter, digit], i) => {
    const at = i === 1 ? oAt : iqAt + (i === 0 ? 0 : 4);
    const r = spr(frame, at, 'enter');
    const s = prog(frame, strikeAt + i * 5, 10, ease.drawOn);
    const x = cardsX0 + i * (CARD_W + CARD_GAP);
    return (
      <div key={i} style={{position: 'absolute', left: x, top: CARD_Y, width: CARD_W, height: CARD_H, opacity: Math.min(1, r * 1.4), transform: `translateY(${(1 - r) * 40}px)`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 26, backgroundColor: C.surface, border: `1.5px solid ${C.rule}`}} />
        <div style={{position: 'absolute', left: 28, right: 28, top: CARD_H / 2, height: 1.5, backgroundColor: C.rule}} />
        <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 0, height: CARD_H / 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 170, fontWeight: 500, color: s > 0 ? rgba(C.ink, 1 - 0.6 * s) : C.ink}}>
          {letter}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: CARD_H / 2, height: CARD_H / 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 170, fontWeight: 500, color: C.ink}}>
          {digit}
        </div>
        <svg width={CARD_W} height={CARD_H} style={{position: 'absolute', left: 0, top: 0}}>
          <line x1={36} y1={CARD_H / 4 + 34} x2={36 + (CARD_W - 72) * s} y2={CARD_H / 4 + 34 - 70 * s} stroke={toneLine(tone)} strokeWidth={7} strokeLinecap="round" opacity={s > 0 ? 1 : 0} />
        </svg>
      </div>
    );
  });

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <div className={TXT} style={{position: 'absolute', left: X0, top: STRIP_Y - 50, fontFamily: F.mono, fontSize: 24, letterSpacing: 2, color: C.ink2, opacity: prog(frame, e, 10)}}>
          {mtav(p.label ?? 'VIN · 17')}
        </div>
        {cells}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={X0} y1={STRIP_Y + STRIP_H + 40} x2={X0 + (1080 - 2 * X0) * ring} y2={STRIP_Y + STRIP_H + 40} stroke={rgba(C.ink, 0.35)} strokeWidth={1.5} />
          <circle cx={540} cy={CARD_Y + CARD_H + 60} r={6} fill={toneBig(tone)} opacity={prog(frame, strikeAt + 14, 8)} />
        </svg>
        {cards}
      </div>
      {p.source ? <SourceLine text={p.source} at={strikeAt + 16} /> : null}
      <Sfx name="asmr-key-roll" at={base + 4} volume={0.3} />
      <Sfx name="asmr-knock" at={oAt} volume={0.45} />
      <Haptic kind="light" at={oAt} />
      <Sfx name="asmr-knock" at={iqAt} volume={0.4 * vary(2)} />
      <Sfx name="asmr-knock" at={iqAt + 4} volume={0.4 * vary(3)} />
      <Sfx name="asmr-strike" at={strikeAt} volume={0.45} />
      <Sfx name="asmr-strike" at={strikeAt + 5} volume={0.42 * vary(5)} />
      <Sfx name="asmr-strike" at={strikeAt + 10} volume={0.4 * vary(6)} />
      <Haptic kind="light" at={strikeAt + 10} />
    </PictureBand>
  );
};
