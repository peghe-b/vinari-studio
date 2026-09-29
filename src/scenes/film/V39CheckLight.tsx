// V39CheckLight: the mechanic's code on a paper slip. It is written on in pencil, its letters wobble under three
// question marks (you did not get it), then fly one by one into a search field and a card unfolds the code in Georgian.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  code?: string; // the code the mechanic wrote down
  from?: string; // the slip's small label
  scrambleAt?: number | string; // the letters wobble, question marks rise
  typeAt?: number | string; // the letters fly into the field
  explainAt?: number | string; // the card unfolds
  title?: string[]; // the code's Georgian title, one entry a line
  note?: string; // the quiet line under it
  tag?: string; // the card's small mono label
  tone?: Tone; // the note's dot
};

const SLIP_Y = 760; // the code's centre on the slip
const SLIP_W = 600;
const SLIP_H = 330;
const BIG = 118; // the pencilled code
const BIG_STEP = 76;
const FIELD_TOP = 430;
const FIELD_H = 116;
const SMALL = 62; // the typed code
const SMALL_STEP = 40;
const CARD_TOP = 606;
const CARD_H = 470;

export const V39CheckLight: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const code = Array.from(p.code ?? 'P0420');
  const n = code.length;
  const scr = Math.max(base + 20, cueFrame(ctx, p.scrambleAt ?? 1));
  const typ = Math.max(scr + 12, cueFrame(ctx, p.typeAt ?? 2));
  const exp = Math.max(typ + n * 4 + 10, cueFrame(ctx, p.explainAt ?? 3));
  const tone = p.tone ?? 'up';

  // the slip: in on the cut, away down when the letters leave it
  const slipIn = spr(frame, e, 'enter');
  const slipOut = prog(frame, typ + 4, 18, ease.exit);
  const slipY = lerp(40, 0, slipIn) + slipOut * 220;
  const slipO = Math.min(1, slipIn * 1.4) * (1 - slipOut);
  // the pencil writes the code, a letter every 5 frames
  const writeStart = Math.max(e + 4, base + 2);
  const underline = prog(frame, writeStart + n * 5, 16, ease.drawOn);
  // doubt: the letters wobble, three question marks rise
  const doubt = prog(frame, scr, 14, ease.enter) * (1 - prog(frame, typ - 4, 8, ease.exit));

  // the field and the card
  const field = spr(frame, typ - 6, 'enter');
  const card = spr(frame, exp, 'enterXL');
  const sweep = prog(frame, exp + 6, 22, ease.drawOn);
  const rule = prog(frame, exp + 20, 18, ease.drawOn);
  const noteIn = spr(frame, exp + 30, 'enter');
  const caretOn = frame >= typ - 4 && Math.floor(frame / 12) % 2 === 0;

  const push = lerp(1, 1.035, prog(frame, e, ctx.dur, ease.camera));

  const title = (p.title ?? ['კატალიზატორის', 'ეფექტიანობა დაბალია']).map((s) => mtav(s));
  const widest = Math.max(1, ...title.map((s) => textWidth(s, `600 60px ${F.sans}`)));
  const tSize = Math.min(60, Math.floor((60 * 660) / widest));
  const note = mtav(p.note ?? 'მანქანა ჩვეულებრივ დადის');
  const nSize = Math.min(38, Math.floor((38 * 600) / Math.max(1, textWidth(note, `400 38px ${F.sans}`))));

  // the letters: on the slip, then flying into the field one after another
  const letters = code.map((ch, i) => {
    const written = frame >= writeStart + i * 5;
    const fly = prog(frame, typ + i * 4, 14, ease.camera);
    const sx = 540 + (i - (n - 1) / 2) * BIG_STEP;
    const sy = SLIP_Y + slipY * (1 - fly);
    const fx = 262 + i * SMALL_STEP;
    const fy = FIELD_TOP + FIELD_H / 2;
    const wob = doubt * Math.sin(frame / 5 + i * 1.7) * 7;
    const x = lerp(sx, fx, fly);
    const y = lerp(sy, fy, fly) + (1 - fly) * doubt * Math.sin(frame / 6 + i) * 6;
    const size = lerp(BIG, SMALL, fly);
    const o = written ? (fly > 0 ? 1 : slipO) : 0;
    return (
      <div key={i} className={TXT} style={{position: 'absolute', left: x - 60, top: y - size * 0.62, width: 120, textAlign: 'center', fontFamily: F.mono, fontSize: size, lineHeight: 1.2, color: C.ink, opacity: o, transform: `rotate(${wob * (1 - fly)}deg)`}}>
        {ch}
      </div>
    );
  });

  const marks = [0, 1, 2].map((i) => {
    const u = prog(frame, scr + i * 5, 16, ease.enter);
    const o = u * (1 - prog(frame, typ - 4, 8, ease.exit));
    const x = [380, 540, 700][+i];
    const y = SLIP_Y - SLIP_H / 2 - 30 - [20, 60, 10][+i] - u * 24 + slipY;
    return (
      <div key={i} className={TXT} style={{position: 'absolute', left: x - 40, top: y - 40, width: 80, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: [58, 74, 52][+i], color: C.ink2, opacity: o, transform: `rotate(${[-12, 4, 14][+i]}deg)`}}>
        ?
      </div>
    );
  });

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        {/* the paper slip */}
        <div style={{position: 'absolute', left: 540 - SLIP_W / 2, top: SLIP_Y - SLIP_H / 2 + slipY, width: SLIP_W, height: SLIP_H, borderRadius: 14, backgroundColor: C.surface, border: `1.5px solid ${C.rule}`, opacity: slipO}} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: slipO}}>
          <line x1={540 - 210} y1={SLIP_Y + 88 + slipY} x2={540 - 210 + 420 * underline} y2={SLIP_Y + 84 + slipY} stroke={C.ink2} strokeWidth={2.2} strokeLinecap="round" />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 540 - SLIP_W / 2 + 34, top: SLIP_Y - SLIP_H / 2 + 26 + slipY, fontFamily: F.mono, fontSize: 26, letterSpacing: 2, color: C.ink2, opacity: slipO}}>
          {mtav(p.from ?? 'ხელოსანი')}
        </div>

        {/* the search field */}
        <div style={{position: 'absolute', left: 160, top: FIELD_TOP + (1 - field) * 30, width: 760, height: FIELD_H, borderRadius: FIELD_H / 2, backgroundColor: C.surface, border: `2px solid ${rgba(C.ink, 0.55)}`, opacity: field}} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: field}}>
          <circle cx={212} cy={FIELD_TOP + FIELD_H / 2 - 4 + (1 - field) * 30} r={14} fill="none" stroke={C.ink2} strokeWidth={2.4} />
          <line x1={222} y1={FIELD_TOP + FIELD_H / 2 + 6 + (1 - field) * 30} x2={232} y2={FIELD_TOP + FIELD_H / 2 + 16 + (1 - field) * 30} stroke={C.ink2} strokeWidth={2.4} strokeLinecap="round" />
          {caretOn ? <line x1={262 + (n - 0.5) * SMALL_STEP + 8} y1={FIELD_TOP + 32} x2={262 + (n - 0.5) * SMALL_STEP + 8} y2={FIELD_TOP + FIELD_H - 32} stroke={C.ink} strokeWidth={2.4} /> : null}
        </svg>

        {/* the card that explains it */}
        <div style={{position: 'absolute', left: 160, top: CARD_TOP + (1 - card) * 40, width: 760, height: CARD_H, borderRadius: 30, backgroundColor: C.surface, border: `1.5px solid ${C.rule}`, opacity: Math.min(1, card * 1.3)}} />
        <div className={TXT} style={{position: 'absolute', left: 210, top: CARD_TOP + 50 + (1 - card) * 40, fontFamily: F.mono, fontSize: 26, letterSpacing: 2, color: C.ink2, opacity: Math.min(1, card * 1.3)}}>
          {mtav(p.tag ?? 'ქართულად')}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 210, top: CARD_TOP + 118 + (1 - card) * 40, width: 680, fontFamily: F.sans, fontWeight: 600, fontSize: tSize, lineHeight: 1.22, color: C.ink, clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)`}}>
          {title.map((s, i) => (
            <div key={i} style={{whiteSpace: 'nowrap'}}>{s}</div>
          ))}
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={210} y1={CARD_TOP + 318} x2={210 + 660 * rule} y2={CARD_TOP + 318} stroke={C.rule} strokeWidth={1.5} opacity={rule > 0 ? 1 : 0} />
          <circle cx={222} cy={CARD_TOP + 390} r={9} fill={toneBig(tone)} opacity={noteIn} />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 250, top: CARD_TOP + 390 - nSize * 0.66 + (1 - noteIn) * 14, fontFamily: F.sans, fontSize: nSize, lineHeight: 1.3, whiteSpace: 'nowrap', color: C.ink, opacity: noteIn}}>
          {note}
        </div>

        {marks}
        {letters}
      </div>
      <Sfx name="asmr-paper" at={Math.max(base, e + 2)} volume={0.35} />
      <Sfx name="asmr-pencil-short" at={Math.max(base, writeStart)} volume={0.4} />
      <Sfx name="asmr-pencil-short" at={Math.max(base, writeStart + n * 5)} volume={0.3} />
      <Sfx name="asmr-knock" at={scr} volume={0.35} />
      <Haptic kind="light" at={scr} />
      {code.map((_, i) => (
        <Sfx key={i} name="asmr-key" at={typ + i * 4 + 12} volume={0.35} />
      ))}
      <Sfx name="asmr-paper" at={exp} volume={0.4} />
      <Sfx name="asmr-pencil-short" at={exp + 20} volume={0.3} />
      <Land at={exp + 12} />
      <Haptic kind="soft" at={exp + 12} />
    </PictureBand>
  );
};
