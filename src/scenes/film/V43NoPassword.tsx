// v43-no-password: a sign-up form asks for an email and a password twice, the password rules pile up in red, then a
// padlock springs open, the fields fall out of the card one by one and the empty card folds into a car card: the car
// draws on in one line. No account, no email, no password.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba, toneBig, toneText} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  fields?: string[]; // the three field labels
  rules?: string[]; // the password rules that pile up
  car?: string; // the label under the car at the end
  failAt?: number | string; // chunk: the password types in and the rules turn red
  unlockAt?: number | string; // chunk: the padlock opens
  dropAt?: number | string; // chunk: the fields fall away and the card becomes the car card
};

const CX = 540;
const W = 600; // card width
const FW = 500; // field width
const FIELD_Y = [650, 810, 970]; // field box tops (stage)
const FH = 88;
// a sedan in profile, one line, in a 520 x 150 box (origin at its lower left)
const CAR = 'M 0 118 L 0 92 Q 4 76 40 70 L 128 60 Q 168 26 230 16 L 330 14 Q 384 18 420 56 L 486 66 Q 516 72 520 94 L 520 118 L 452 118 A 34 34 0 0 0 384 118 L 138 118 A 34 34 0 0 0 70 118 Z';
const CAR_LEN = 1500;

export const V43NoPassword: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const fields = p.fields ?? ['ელფოსტა', 'პაროლი', 'გაიმეორე პაროლი'];
  const rules = p.rules ?? ['8+ სიმბოლო', 'დიდი ასო', 'ციფრი', 'ნიშანი'];
  const fail = Math.max(base + 6, cueFrame(ctx, p.failAt ?? 1));
  const unlock = Math.max(fail + 12, cueFrame(ctx, p.unlockAt ?? 2));
  const drop = Math.max(unlock + 10, cueFrame(ctx, p.dropAt ?? 3));
  const fold = prog(frame, drop + 20, 24, ease.camera);
  const carDraw = prog(frame, drop + 34, 34, ease.drawOn);
  const carLabel = spr(frame, drop + 56, 'land');

  // the camera: a slow push, and a small settle from a slight tilt on the cut
  const push = lerp(1.12, 1.17, prog(frame, e, ctx.dur, ease.camera));
  const tilt = lerp(8, 0, spr(frame, e, 'enter'));

  // the card folds from the form's height into a car card
  const cardTop = lerp(470, 640, fold);
  const bot = lerp(1210, 1040, fold);

  // the email types on at the start (already composed on frame 0 of the film)
  const email = '••••••@••••';
  const emailN = ctx.index === 0 ? email.length : Math.round(email.length * prog(frame, e, 16));
  // the password dots type on at fail, then the repeat field
  const dots1 = Math.round(8 * prog(frame, fail, 12));
  const dots2 = Math.round(5 * prog(frame, fail + 10, 10));
  const shake = frame >= fail + 22 && frame < fail + 34 ? Math.sin((frame - fail - 22) * 1.9) * 9 * (1 - (frame - fail - 22) / 12) : 0;
  const rulesOut = prog(frame, unlock, 10);
  const lockOpen = spr(frame, unlock, 'tap');
  const lockGone = prog(frame, drop + 20, 14);

  const label = mtav(p.car ?? 'შენი მანქანა');
  const labelSize = Math.min(52, Math.floor((52 * 480) / Math.max(1, textWidth(label, `600 52px ${F.sans}`))));
  const red = toneText('down');

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `perspective(1600px) rotateX(${tilt}deg) scale(${push})`, transformOrigin: '540px 830px'}}>
        {/* the card */}
        <div style={{position: 'absolute', left: CX - W / 2, width: W, top: cardTop, height: bot - cardTop, borderRadius: 36, backgroundColor: C.surface, border: `1.5px solid ${rgba(C.ink, 0.16)}`}} />

        {/* the padlock */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - lockGone}}>
          <g transform={`translate(${CX} 560)`}>
            <g transform={`translate(0 ${-14 * lockOpen}) rotate(${-28 * lockOpen} -20 0)`}>
              <path d="M -20 0 V -24 A 20 20 0 0 1 20 -24 V 0" fill="none" stroke={frame >= unlock ? toneBig('up') : C.ink} strokeWidth={5} strokeLinecap="round" />
            </g>
            <rect x={-32} y={-4} width={64} height={50} rx={10} fill={frame >= unlock ? toneBig('up') : C.ink} />
            <circle cx={0} cy={18} r={6} fill={C.surface} />
          </g>
        </svg>

        {/* the fields */}
        {fields.slice(0, 3).map((f, i) => {
          const t = prog(frame, drop + i * 5, 22, ease.exit);
          const y = FIELD_Y[+i] + 560 * t;
          const rot = (i - 1) * 7 * t + 4 * t;
          const bad = i > 0 && frame >= fail + 12 && frame < unlock;
          const content = i === 0 ? email.slice(0, emailN) : '•'.repeat(i === 1 ? dots1 : dots2);
          const caret = i === (frame < fail ? 0 : frame < fail + 12 ? 1 : 2) && Math.floor(frame / 15) % 2 === 0 && frame < unlock;
          return (
            <div key={i} style={{position: 'absolute', left: CX - FW / 2, width: FW, top: y - 44, height: FH + 44, opacity: 1 - t, transform: `translateX(${i > 0 ? shake : 0}px) rotate(${rot}deg)`}}>
              <div className={TXT} style={{position: 'absolute', left: 4, top: 0, fontFamily: F.mono, fontSize: 24, color: bad ? red : C.ink2, letterSpacing: 1}}>
                {mtav(f)}
              </div>
              <div style={{position: 'absolute', left: 0, top: 44, width: FW, height: FH, borderRadius: 18, border: `2px solid ${bad ? red : rgba(C.ink, 0.28)}`, backgroundColor: rgba(C.ink, 0.03)}} />
              <div className={TXT} style={{position: 'absolute', left: 26, top: 44, height: FH, lineHeight: `${FH}px`, fontFamily: F.sans, fontSize: i === 0 ? 34 : 40, letterSpacing: i === 0 ? 0 : 6, color: C.ink}}>
                {content}
                {caret ? <span style={{display: 'inline-block', width: 3, height: 40, marginLeft: 4, verticalAlign: 'middle', backgroundColor: C.ink}} /> : null}
              </div>
            </div>
          );
        })}

        {/* the password rules pile up */}
        <div style={{position: 'absolute', left: CX - FW / 2, width: FW, top: 1086, display: 'flex', flexWrap: 'wrap', gap: 12, opacity: 1 - rulesOut}}>
          {rules.slice(0, 4).map((r, i) => {
            const s = spr(frame, fail + 10 + i * 4, 'tap');
            return (
              <div key={i} className={TXT} style={{fontFamily: F.mono, fontSize: 27, color: red, padding: '6px 14px', borderRadius: 999, boxShadow: `inset 0 0 0 1.5px ${red}`, opacity: s, transform: `translateY(${(1 - s) * 14}px)`}}>
                {'× ' + mtav(r)}
              </div>
            );
          })}
        </div>

        {/* the car card */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${CX - 260} ${690})`}>
            <path d={CAR} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={CAR_LEN} strokeDashoffset={CAR_LEN * (1 - carDraw)} />
            <circle cx={104} cy={118} r={26} fill="none" stroke={C.ink} strokeWidth={2.4} opacity={carDraw} />
            <circle cx={418} cy={118} r={26} fill="none" stroke={C.ink} strokeWidth={2.4} opacity={carDraw} />
            <line x1={-20} y1={152} x2={540} y2={152} stroke={rgba(C.ink, 0.3)} strokeWidth={1.5} strokeDasharray={600} strokeDashoffset={600 * (1 - carDraw)} />
          </g>
        </svg>
        <div className={TXT} style={{position: 'absolute', left: CX - 260, width: 520, top: 890, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: labelSize, color: C.ink, opacity: carLabel, transform: `translateY(${(1 - carLabel) * 16}px)`}}>
          {label}
        </div>
        <div style={{position: 'absolute', left: CX - 40, width: 80, top: 970, height: 4, borderRadius: 2, backgroundColor: toneBig('up'), opacity: carLabel, transform: `scaleX(${carLabel})`}} />
      </div>

      <Sfx name="asmr-key-roll" at={fail} volume={0.4} />
      <Sfx name="asmr-strike" at={fail + 22} volume={0.35} />
      <Haptic kind="light" at={fail + 22} />
      <Sfx name="asmr-knock" at={unlock} volume={0.45} />
      <Haptic kind="light" at={unlock} />
      <Sfx name="asmr-paper" at={drop} volume={0.4} />
      <Sfx name="asmr-pencil-short" at={drop + 34} volume={0.4} />
      <Sfx name="asmr-pop" at={drop + 56} volume={0.4} />
      <Haptic kind="light" at={drop + 56} />
    </PictureBand>
  );
};
