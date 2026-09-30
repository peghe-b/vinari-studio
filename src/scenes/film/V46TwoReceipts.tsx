// V46TwoReceipts: the customs bill as a till receipt. It is already printed at frame 0 (today's total); on 1 January
// the printer feeds on, the date row prints 01.01, the old total gets a red strike and the new one lands under it.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Land, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  header?: string; // the receipt's title line
  car?: string; // the car, one line
  dateLabel?: string;
  date?: string; // today's date row
  nowLabel?: string; // the label over today's total
  from?: string; // today's total
  newLabel?: string; // the label of the second print
  to?: string; // the January total
  at?: number | string; // chunk: the printer feeds on, the new date row prints
  landAt?: number | string; // chunk: the new total prints and lands
  tone?: Tone;
};

const SLOT = 1200; // the printer's slot (stage y); the paper rises out of it
const PX = 290; // paper left
const PW = 500; // paper width
const STEP1 = 560; // paper printed for today
const STEP2 = 690; // after the date row
const STEP3 = 800; // after the new total

const fit = (s: string, px: number, weight: number, max: number) => Math.min(px, Math.floor((px * max) / Math.max(1, textWidth(s, `${weight} ${px}px ${F.sans}`))));

export const V46TwoReceipts: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'down';
  const feedAt = Math.max(base + 12, cueFrame(ctx, p.at ?? 2));
  const landAt = Math.max(feedAt + 16, cueFrame(ctx, p.landAt ?? 3));

  // the paper's printed length: nearly out on frame 0, then two more feeds
  const f1 = lerp(STEP1 - 60, STEP1, prog(frame, e, 16, ease.camera));
  const f2 = (STEP2 - STEP1) * prog(frame, feedAt, 14, ease.camera);
  const f3 = (STEP3 - STEP2) * prog(frame, landAt - 6, 14, ease.camera);
  const len = f1 + f2 + f3;
  const paperY = SLOT - len; // the paper's top edge
  const land = spr(frame, landAt + 6, 'land');
  const strike = prog(frame, landAt + 10, 12, ease.drawOn);
  const push = lerp(1, 1.04, prog(frame, e, ctx.dur, ease.camera));

  const header = mtav(p.header ?? 'განბაჟება');
  const car = mtav(p.car ?? '2020 · 2.0 L · ბენზინი');
  const dateLabel = mtav(p.dateLabel ?? 'თარიღი');
  const nowLabel = mtav(p.nowLabel ?? 'დღეს');
  const newLabel = mtav(p.newLabel ?? '1 იანვრიდან');
  const from = p.from ?? '3 610 ₾';
  const to = p.to ?? '9 615 ₾';
  const carSize = fit(car, 30, 500, PW - 80);
  const bigFrom = fit(from, 84, 600, PW - 80);
  const bigTo = fit(to, 96, 600, PW - 60);
  const red = toneBig(tone);

  // the torn top edge: a fine zigzag across the paper
  const teeth: string[] = [];
  for (let i = 0; i <= 25; i++) teeth.push(`${PX + i * 20} ${i % 2 === 0 ? 0 : 10}`);
  const paperPath = `M ${PX} ${len} L ${teeth.join(' L ')} L ${PX + PW} ${len} Z`;

  const dash = (y: number, key: string) => <line key={key} x1={PX + 36} x2={PX + PW - 36} y1={y} y2={y} stroke={C.rule} strokeWidth={1.6} strokeDasharray="6 8" />;
  const row: React.CSSProperties = {position: 'absolute', left: PX + 40, width: PW - 80, fontFamily: F.sans, color: C.ink};

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        {/* the paper, clipped at the slot: only what has come out shows */}
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SLOT, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, top: paperY, width: 1080, height: STEP3 + 20}}>
            <svg width={1080} height={STEP3 + 20} style={{position: 'absolute', inset: 0}}>
              <path d={paperPath} fill={C.surface} stroke={C.rule} strokeWidth={1.5} strokeLinejoin="round" />
              {dash(150, 'd1')}
              {dash(300, 'd2')}
              {dash(580, 'd3')}
              {/* the red strike over today's total */}
              {strike > 0 ? <line x1={PX + 70} x2={PX + 70 + (PW - 140) * strike} y1={456} y2={456} stroke={red} strokeWidth={4} strokeLinecap="round" /> : null}
            </svg>
            <div className={TXT} style={{...row, top: 44, textAlign: 'center', fontSize: 24, fontWeight: 600, letterSpacing: 3, color: C.ink2}}>{header}</div>
            <div className={TXT} style={{...row, top: 88, textAlign: 'center', fontSize: carSize, fontWeight: 500}}>{car}</div>
            <div className={TXT} style={{...row, top: 204, fontSize: 30, fontWeight: 500, display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: C.ink2}}>{dateLabel}</span>
              <span>31.12</span>
            </div>
            <div className={TXT} style={{...row, top: 340, textAlign: 'center', fontSize: 26, fontWeight: 600, letterSpacing: 2, color: C.ink2}}>{nowLabel}</div>
            <div className={TXT} style={{...row, top: 396, textAlign: 'center', fontSize: bigFrom, fontWeight: 600, lineHeight: 1.2, color: strike > 0 ? rgba(C.ink, 1 - 0.55 * strike) : C.ink}}>{from}</div>
            <div className={TXT} style={{...row, top: 612, fontSize: 30, fontWeight: 500, display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: C.ink2}}>{newLabel}</span>
              <span style={{color: toneText(tone)}}>01.01</span>
            </div>
            <div className={TXT} style={{...row, top: 676, textAlign: 'center', fontSize: bigTo, fontWeight: 600, lineHeight: 1.2, color: red, opacity: frame >= landAt - 2 ? 1 : 0, transform: `scale(${lerp(1.08, 1, land)})`}}>{to}</div>
          </div>
        </div>
        {/* the printer: a slot and a low body under it */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={236} y={SLOT - 4} width={608} height={96} rx={22} fill={C.surface} stroke={C.ink} strokeWidth={2} />
          <rect x={PX - 16} y={SLOT - 7} width={PW + 32} height={14} rx={7} fill={C.ink} />
          <circle cx={800} cy={SLOT + 50} r={8} fill={frame >= feedAt && frame < landAt + 12 ? red : C.rule} />
        </svg>
      </div>
      <Sfx name="asmr-paper" at={base + 1} volume={0.35} />
      <Sfx name="asmr-key-roll" at={feedAt} volume={0.35} />
      <Haptic kind="light" at={feedAt} />
      <Sfx name="asmr-key-roll" at={landAt - 6} volume={0.35} />
      <Land at={landAt + 6} />
      <Sfx name="asmr-strike" at={landAt + 10} volume={0.4} />
    </PictureBand>
  );
};
