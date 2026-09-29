// v42-date-stamp: the inspection date changed, so a rubber date stamp rolls its wheels to the new date, presses it
// onto the car's inspection card, and the three reminder ticks (7, 3, 1 days) slide along with the flag.
import React from 'react';
import {interpolateColors, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, halo, rgba, toneBig, toneText} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  from?: string; // the old date on the card, "14.10"
  to?: string; // the new date the stamp rolls to, "03.12"
  label?: string; // the card's label
  rollAt?: number | string; // the wheels roll to the new date
  oldAt?: number | string; // the old date turns red
  alarmAt?: number | string; // the bell rings for the old date
  stampAt?: number | string; // the stamp presses the new date onto the card
  moveAt?: number | string; // the flag and its reminder ticks slide to the new date
};

const CX = 540;
const CARD = {x: 200, y: 720, w: 680, h: 300};
const PRESS = 262; // how far the stamp travels down onto the card
const WIN = {x: 392, y: 580, w: 296, h: 64}; // the stamp's wheel window
const LINE_Y = 1150;
const U = 38; // stage px per day on the timeline
const TICKS = [7, 3, 1];

export const V42DateStamp: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const from = p.from ?? '14.10';
  const to = p.to ?? '03.12';
  const rollAt = Math.max(base + 6, cueFrame(ctx, p.rollAt ?? 1));
  const oldAt = Math.max(rollAt + 12, cueFrame(ctx, p.oldAt ?? 2));
  const alarmAt = Math.max(oldAt + 6, cueFrame(ctx, p.alarmAt ?? 3));
  const stampAt = Math.max(alarmAt + 16, cueFrame(ctx, p.stampAt ?? 4));
  const moveAt = Math.max(stampAt + 20, cueFrame(ctx, p.moveAt ?? 5));

  // entrance: the card rises, the stamp settles above it
  const inCard = spr(frame, e, 'enterXL');
  const inStamp = spr(frame, e + 4, 'enter');
  const push = lerp(1, 1.045, prog(frame, e, ctx.dur, ease.camera));

  // the press: down fast, a short hold, back up
  const down = prog(frame, stampAt, 7, ease.enter);
  const up = prog(frame, stampAt + 12, 16, ease.exit);
  const press = down * (1 - up);
  const hitAt = stampAt + 7;
  const stamped = frame >= hitAt;
  const ink = spr(frame, hitAt, 'land');

  // the old date turns red, the bell rings for it until the stamp lands
  const redOld = prog(frame, oldAt, 10) * (stamped ? 0 : 1);
  const ringT = frame - alarmAt;
  const ringing = ringT >= 0 && !stamped;
  const bellRot = ringing ? Math.sin(ringT * 0.9) * 16 * Math.exp(-Math.max(0, ringT - 14) / 18) : 0;
  const ringR = ringing ? (ringT % 18) / 18 : 0;

  // the wheels: each digit rolls up to its new value with one extra turn, staggered
  const cols = from.split('').map((ch, i) => {
    const t2 = to.charAt(i) || ch;
    const d0 = Number(ch);
    const d1 = Number(t2);
    if (Number.isNaN(d0) || Number.isNaN(d1)) return {sep: true, ch: t2, pos: 0};
    const steps = ((d1 - d0 + 10) % 10) + 10;
    const t = prog(frame, rollAt + i * 3, 26, ease.countUp);
    return {sep: false, ch: t2, pos: d0 + steps * t};
  });
  const digits: number[] = [];
  for (let k = 0; k < 30; k++) digits.push(k % 10);
  const cw = 50;
  const rowW = cols.length * cw;

  // the timeline: today at the left, the flag at the date, the reminder ticks before it
  const oldF = 560;
  const newF = 820;
  const flagX = (lag: number) => lerp(oldF, newF, spr(frame, moveAt + lag, 'enterXL'));
  const moved = spr(frame, moveAt + 8, 'land');
  const lineIn = prog(frame, e + 6, 24, ease.drawOn);

  const label = mtav(p.label ?? 'ტექინსპექტირება');
  const lsize = Math.min(26, Math.floor((26 * 380) / Math.max(1, textWidth(label, `500 26px ${F.mono}`))));
  const dateColor = stamped ? C.ink : interpolateColors(redOld, [0, 1], [C.ink, toneText('down')]);
  const shown = stamped ? to : from;
  const dateHidden = press > 0.35;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${CX}px ${L.contentMid}px`}}>
        {/* the card */}
        <div
          style={{
            position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 34,
            backgroundColor: C.surface, border: `1.5px solid ${C.rule}`,
            boxShadow: `0 ${18 + 30 * press}px 60px ${rgba(C.shade, 0.1 + 0.06 * press)}`,
            opacity: inCard, transform: `translateY(${(1 - inCard) * 60}px) scale(${1 - 0.012 * press})`,
          }}
        />
        <div className={TXT} style={{position: 'absolute', left: CARD.x + 40, top: CARD.y + 30, fontFamily: F.mono, fontSize: lsize, color: C.ink2, letterSpacing: 1, opacity: inCard, transform: `translateY(${(1 - inCard) * 60}px)`}}>
          {label}
        </div>
        <div
          className={TXT}
          style={{
            position: 'absolute', left: CARD.x, width: CARD.w, top: CARD.y + 92, textAlign: 'center',
            fontFamily: F.sans, fontWeight: 600, fontSize: 150, lineHeight: '160px', letterSpacing: 4,
            color: dateColor, opacity: dateHidden ? 0 : inCard,
            transform: `translateY(${(1 - inCard) * 60}px) scale(${stamped ? 1.05 - 0.05 * ink : 1})`,
          }}
        >
          {shown}
        </div>

        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the bell on the card */}
          <g transform={`translate(${CARD.x + CARD.w - 56} ${CARD.y + 50 + (1 - inCard) * 60}) rotate(${bellRot})`} opacity={inCard}>
            <path d="M -15 9 Q -15 -17 0 -17 Q 15 -17 15 9 L 20 13 L -20 13 Z" fill="none" stroke={ringing ? toneBig('down') : C.ink2} strokeWidth={2.2} strokeLinejoin="round" />
            <circle cx={0} cy={19} r={3.5} fill={ringing ? toneBig('down') : C.ink2} />
          </g>
          {ringing ? (
            <circle cx={CARD.x + CARD.w - 56} cy={CARD.y + 50} r={22 + 40 * ringR} fill="none" stroke={halo(toneBig('down'), 3)} strokeWidth={1.6} opacity={0.7 * (1 - ringR)} />
          ) : null}
          {/* the ink impression ring on the card when the stamp lifts */}
          {stamped ? (
            <rect x={CX - 170 - 20 * ink} y={CARD.y + 88 - 8 * ink} width={340 + 40 * ink} height={168 + 16 * ink} rx={18} fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={1.5} opacity={1 - ink} />
          ) : null}

          {/* the timeline */}
          <line x1={200} y1={LINE_Y} x2={200 + 660 * lineIn} y2={LINE_Y} stroke={C.rule} strokeWidth={2} strokeLinecap="round" />
          <circle cx={220} cy={LINE_Y} r={9} fill={C.ink} opacity={lineIn} />
          {TICKS.map((d, i) => {
            const x = flagX(i * 3 + 2) - d * U;
            const tone = moved > 0.5 ? toneBig('up') : C.ink2;
            return (
              <g key={d} opacity={lineIn}>
                <line x1={x} y1={LINE_Y - 20} x2={x} y2={LINE_Y + 20} stroke={tone} strokeWidth={2.4} strokeLinecap="round" />
              </g>
            );
          })}
          <g transform={`translate(${flagX(0)} ${LINE_Y})`} opacity={lineIn}>
            <line x1={0} y1={0} x2={0} y2={-74} stroke={stamped ? C.ink : toneBig('down')} strokeWidth={2.4} strokeLinecap="round" />
            <path d="M 0 -74 L 34 -63 L 0 -52 Z" fill={stamped ? C.ink : toneBig('down')} opacity={0.35 + 0.65 * Math.max(redOld, stamped ? 1 : 0)} />
          </g>
        </svg>
        {TICKS.map((d, i) => (
          <div key={d} className={TXT} style={{position: 'absolute', left: flagX(i * 3 + 2) - d * U - 30, width: 60, top: LINE_Y + 28, textAlign: 'center', fontFamily: F.mono, fontSize: 32, color: moved > 0.5 ? toneText('up') : C.ink2, opacity: lineIn}}>
            {d}
          </div>
        ))}

        {/* the stamp */}
        <div style={{position: 'absolute', inset: 0, opacity: inStamp, transform: `translateY(${PRESS * press - (1 - inStamp) * 40}px)`}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <ellipse cx={CX} cy={432} rx={58} ry={46} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
            <path d={`M ${CX - 22} 474 L ${CX - 30} 522 L ${CX + 30} 522 L ${CX + 22} 474`} fill={C.surface} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
            <rect x={372} y={522} width={336} height={40} rx={10} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
            <rect x={350} y={562} width={380} height={100} rx={14} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
            <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={8} fill="none" stroke={C.rule} strokeWidth={1.5} />
            <line x1={362} y1={676} x2={718} y2={676} stroke={C.ink} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
          </svg>
          <div className={TXT} style={{position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: (WIN.w - rowW) / 2, top: 0, width: rowW, height: WIN.h}}>
              {cols.map((c, i) =>
                c.sep ? (
                  <div key={i} style={{position: 'absolute', left: i * cw, width: cw, top: 0, height: WIN.h, lineHeight: `${WIN.h}px`, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 50, color: C.ink}}>
                    {c.ch}
                  </div>
                ) : (
                  <div key={i} style={{position: 'absolute', left: i * cw, width: cw, top: 0, transform: `translateY(${-c.pos * WIN.h}px)`}}>
                    {digits.map((d, k) => (
                      <div key={k} style={{height: WIN.h, lineHeight: `${WIN.h}px`, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 50, color: C.ink}}>
                        {d}
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <Sfx name="asmr-paper" at={base + 2} volume={0.35} />
      <Sfx name="asmr-flap-roll" at={rollAt} volume={0.4} />
      <Haptic kind="light" at={rollAt + 30} />
      <Sfx name="asmr-notif" at={alarmAt} volume={0.3} />
      <Sfx name="asmr-knock" at={hitAt} volume={0.5} />
      <Land at={hitAt} />
      <Sfx name="asmr-tick-fine" at={moveAt + 4} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={moveAt + 9} volume={0.3} />
      <Sfx name="asmr-pop" at={moveAt + 16} volume={0.4} />
      <Haptic kind="success" at={moveAt + 16} />
    </PictureBand>
  );
};
