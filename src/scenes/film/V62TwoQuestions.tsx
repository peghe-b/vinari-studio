// v62-two-questions: the car at the customs booth. Two blank question cards pop over it, each one answers (the year,
// the engine), both cards slide into the booth's window, and a stamp lands with today's amount.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  sign?: string; // the booth's sign
  q1?: string; // the first card's label
  a1?: string; // its answer
  q2?: string;
  a2?: string;
  stampLabel?: string; // the small word over the stamped amount
  stamp?: string; // the amount
  askAt?: number | string; // the two blank cards pop
  a1At?: number | string;
  a2At?: number | string;
  sendAt?: number | string; // the cards slide into the window
  stampAt?: number | string; // the stamp lands
  tone?: Tone;
};

// the car, side view facing right, in its own units (ground at y 174)
const BODY =
  'M 20 140 L 50 140 A 45 45 0 0 1 140 140 L 300 140 A 45 45 0 0 1 390 140 L 430 140 Q 442 138 442 124 L 440 100 Q 436 82 412 78 L 360 70 Q 330 30 290 22 L 190 20 Q 150 22 115 62 L 40 74 Q 12 80 8 102 L 8 128 Q 10 140 20 140 Z';
const WIN1 = 'M 130 66 L 172 34 Q 184 28 200 28 L 244 28 L 244 66 Z';
const WIN2 = 'M 256 28 L 286 28 Q 314 32 340 66 L 256 66 Z';
const CAR_X = 150;
const CAR_Y = 976;
const GROUND = 1150;
// the booth
const BX = 700;
const BW = 200;
const BTOP = 850;
// the window (where the cards go)
const WX = 724;
const WY = 920;
const WW = 152;
const WH = 104;
// the cards
const CW = 320;
const CH = 200;
const CY = 430;
const CX = [180, 580];

export const V62TwoQuestions: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'down';
  const ask = Math.max(base + 6, cueFrame(ctx, p.askAt ?? 1));
  const ans = [cueFrame(ctx, p.a1At ?? 2), cueFrame(ctx, p.a2At ?? 3)];
  const send = cueFrame(ctx, p.sendAt ?? 4);
  const hit = Math.max(send + 16, cueFrame(ctx, p.stampAt ?? 5));

  const draw = prog(frame, e, 30, ease.drawOn);
  // a slow camera push towards the booth over the whole scene
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const sendT = prog(frame, send, 20, ease.camera);
  const stampIn = spr(frame, hit, 'land');
  const shake = frame >= hit ? Math.sin((frame - hit) * 2.2) * 6 * Math.max(0, 1 - (frame - hit) / 10) : 0;
  const winGlow = prog(frame, send + 14, 8) * (1 - prog(frame, hit + 4, 16));

  const labels = [mtav(p.q1 ?? 'წელი'), mtav(p.q2 ?? 'ძრავი')];
  const values = [p.a1 ?? '2020', p.a2 ?? '2.0 L'];
  const sign = mtav(p.sign ?? 'საბაჟო');
  const signSize = Math.min(34, Math.floor((34 * (BW - 30)) / Math.max(1, textWidth(sign, `600 34px ${F.mono}`))));
  const stamp = mtav(p.stamp ?? '3 610 ₾');
  const stampSize = Math.min(120, Math.floor((120 * 560) / Math.max(1, textWidth(stamp, `600 120px ${F.sans}`))));
  const stampLabel = mtav(p.stampLabel ?? 'დღეს');

  const cards = [0, 1].map((i) => {
    const pop = spr(frame, ask + i * 5, 'enter');
    const flip = prog(frame, ans[+i], 10, ease.enter);
    // the card turns on its vertical axis: blank face to 0.5, the answer from 0.5
    const sx = Math.abs(Math.cos(flip * Math.PI));
    const answered = flip >= 0.5;
    // slide into the window, shrinking
    const k = sendT;
    const tx = lerp(CX[+i], WX + WW / 2 - CW / 2, k);
    const ty = lerp(CY, WY + WH / 2 - CH / 2, k);
    const sc = lerp(1, 0.32, k) * (0.6 + 0.4 * pop);
    const op = pop * (1 - prog(frame, send + 12, 6));
    return {i, tx, ty, sc, sx, answered, op, pop};
  });

  const stampTone = toneBig(tone);
  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${shake}px) scale(${push})`, transformOrigin: `600px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the road */}
          <line x1={L.side} y1={GROUND} x2={960} y2={GROUND} stroke={C.rule} strokeWidth={2} strokeDasharray={900} strokeDashoffset={900 * (1 - draw)} />
          {[0, 1, 2, 3, 4].map((k) => (
            <line key={k} x1={150 + k * 150} y1={GROUND + 34} x2={210 + k * 150} y2={GROUND + 34} stroke={rgba(C.ink, 0.25)} strokeWidth={2} opacity={draw} />
          ))}
          {/* the booth */}
          <g opacity={draw} stroke={C.ink} strokeWidth={2.2} fill="none" strokeLinejoin="round">
            <rect x={BX - 16} y={BTOP - 30} width={BW + 32} height={30} rx={4} fill={C.surface} />
            <rect x={BX} y={BTOP} width={BW} height={GROUND - BTOP} fill={C.surface} />
            <rect x={WX} y={WY} width={WW} height={WH} rx={6} fill={rgba(stampTone, 0.12 * winGlow)} stroke={C.ink} />
            <line x1={WX} y1={WY + WH + 18} x2={WX + WW} y2={WY + WH + 18} stroke={C.rule} />
            <rect x={BX + 70} y={WY + WH + 40} width={60} height={GROUND - (WY + WH + 40)} rx={3} stroke={C.rule} />
          </g>
          {/* the car */}
          <g transform={`translate(${CAR_X} ${CAR_Y})`} opacity={draw}>
            <path d={BODY} fill={C.surface} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
            <path d={WIN1} fill="none" stroke={C.ink2} strokeWidth={1.8} strokeLinejoin="round" />
            <path d={WIN2} fill="none" stroke={C.ink2} strokeWidth={1.8} strokeLinejoin="round" />
            <line x1={250} y1={70} x2={250} y2={136} stroke={C.rule} strokeWidth={1.6} />
            <line x1={200} y1={92} x2={222} y2={92} stroke={C.ink2} strokeWidth={2} strokeLinecap="round" />
            <line x1={290} y1={92} x2={312} y2={92} stroke={C.ink2} strokeWidth={2} strokeLinecap="round" />
            {[95, 345].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy={140} r={34} fill={C.surface} stroke={C.ink} strokeWidth={2.4} />
                <circle cx={cx} cy={140} r={13} fill="none" stroke={C.ink2} strokeWidth={1.8} />
              </g>
            ))}
          </g>
          {/* the thread from each card down to the car while they ask */}
          {cards.map((c) => (
            <line key={c.i} x1={c.tx + CW / 2} y1={CY + CH} x2={CAR_X + 150 + c.i * 140} y2={CAR_Y + 12} stroke={C.rule} strokeWidth={1.5} strokeDasharray="4 8" opacity={c.pop * (1 - sendT)} />
          ))}
        </svg>
        {/* the sign on the booth's roof */}
        <div className={TXT} style={{position: 'absolute', left: BX - 16, width: BW + 32, top: BTOP - 30, height: 30, lineHeight: '30px', textAlign: 'center', fontFamily: F.mono, fontWeight: 600, fontSize: signSize, color: C.ink, opacity: draw}}>
          {sign}
        </div>
        {/* the two cards */}
        {cards.map((c) => (
          <div
            key={c.i}
            style={{
              position: 'absolute',
              left: c.tx,
              top: c.ty,
              width: CW,
              height: CH,
              opacity: c.op,
              transform: `scale(${c.sc * c.sx}, ${c.sc})`,
              transformOrigin: '50% 50%',
              background: C.surface,
              border: `2px solid ${c.answered ? C.ink : C.rule}`,
              borderRadius: 18,
            }}
          >
            <div className={TXT} style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              {c.answered ? (
                <>
                  <div style={{fontFamily: F.mono, fontSize: 30, color: C.ink2, letterSpacing: 1}}>{labels[+c.i]}</div>
                  <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 84, color: C.ink, lineHeight: 1.1}}>{values[+c.i]}</div>
                </>
              ) : (
                <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 110, color: C.ink2, lineHeight: 1}}>?</div>
              )}
            </div>
          </div>
        ))}
        {/* the stamp */}
        <div
          style={{
            position: 'absolute',
            left: 140,
            width: 800,
            top: 440,
            height: 240,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: frame >= hit ? Math.min(1, stampIn * 2) : 0,
            transform: `rotate(-5deg) scale(${lerp(1.5, 1, stampIn)})`,
          }}
        >
          <div style={{border: `5px solid ${stampTone}`, borderRadius: 22, padding: '14px 44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: C.surface}}>
            <div className={TXT} style={{fontFamily: F.mono, fontSize: 32, color: toneText(tone), letterSpacing: 2}}>{stampLabel}</div>
            <div className={TXT} style={{fontFamily: F.sans, fontWeight: 600, fontSize: stampSize, color: stampTone, lineHeight: 1.05}}>{stamp}</div>
          </div>
        </div>
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-knock" at={ask} volume={0.45} />
      <Sfx name="asmr-knock" at={ask + 5} volume={0.4} />
      <Haptic kind="light" at={ask} />
      <Sfx name="asmr-flap" at={ans[0] + 5} volume={0.45} />
      <Sfx name="asmr-flap" at={ans[1] + 5} volume={0.45} />
      <Sfx name="asmr-paper" at={send} volume={0.4} />
      <Land at={hit} />
    </PictureBand>
  );
};
