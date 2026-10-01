// V55PocketCar: the car fits in your pocket. A big line-drawn car stands in the frame; on the question it shrinks
// and flies into a phone, where it parks on a white medium widget (the car card: plate, price with its change, the
// next date). The rows light up on the voice, a tap on the card and the car grows big again (the app grows there).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneText} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  shrinkAt?: number | string; // the car flies into the phone
  cardAt?: number | string; // the card settles, the camera leans in
  plateAt?: number | string; // plate and price light up
  dateAt?: number | string; // the next date lands
  tapAt?: number | string; // a finger on the card
  growAt?: number | string; // the car grows back big
  plate?: string;
  label?: string; // the date's name
  days?: string;
  unit?: string;
};

// the car in its own box, 760 x 260, facing right
const BODY =
  'M 24 196 L 22 150 Q 26 122 66 114 L 196 102 Q 246 52 304 42 L 468 40 Q 534 44 594 102 L 690 114 Q 738 124 742 160 L 742 196 L 672 196 A 60 60 0 0 0 552 196 L 212 196 A 60 60 0 0 0 92 196 Z';
const GLASS_R = 'M 222 102 Q 262 64 308 58 L 380 56 L 380 102 Z';
const GLASS_F = 'M 396 56 L 464 56 Q 516 60 562 102 L 396 102 Z';
const LINES = 'M 388 108 L 388 188 M 60 130 L 704 130 M 700 140 L 738 140 M 28 140 L 52 140';
const CW = 760;
const CH = 260;

// the phone and its card, stage units
const PH = {x: 250, y: 400, w: 580, h: 1180, r: 78};
const CARD = {x: 290, y: 500, w: 500, h: 250, r: 38};
const SCREEN = {x: 266, y: 416, w: 548, h: 1148, r: 64};

export const V55PocketCar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const fShrink = Math.max(base + 8, cueFrame(ctx, p.shrinkAt ?? 1));
  const fCard = Math.max(fShrink + 20, cueFrame(ctx, p.cardAt ?? 2));
  const fPlate = Math.max(fCard + 6, cueFrame(ctx, p.plateAt ?? 3));
  const fDate = Math.max(fPlate + 8, cueFrame(ctx, p.dateAt ?? 4));
  const fTap = Math.max(fDate + 8, cueFrame(ctx, p.tapAt ?? 5));
  const fOpen = Math.max(fTap + 10, cueFrame(ctx, p.growAt ?? 6));

  // the car draws on, then flies into the card
  const draw = prog(frame, e, 30, ease.drawOn);
  const fly = prog(frame, fShrink, 26, ease.camera);
  const phoneIn = prog(frame, fShrink + 4, 22, ease.drawOn);
  const cardIn = spr(frame, fShrink + 14, 'land');
  const grow = prog(frame, fOpen, 22, ease.camera);

  // big car: centred on the content box; small: on the card's left
  const bigW = 800;
  const smallW = 190;
  const sBig = bigW / CW;
  const sSmall = smallW / CW;
  const s0 = lerp(sBig, sSmall, fly);
  const s = lerp(s0, 470 / CW, grow);
  const cx0 = lerp(540, CARD.x + 30 + smallW / 2, fly);
  const cy0 = lerp(L.contentMid, CARD.y + 96, fly);
  const cx = lerp(cx0, 540, grow);
  const cy = lerp(cy0, 760, grow);
  const carStroke = lerp(2.2, 3.2, fly) / Math.max(0.2, s / sBig);
  const onCard = fly > 0.75;
  const carInk = onCard ? C.onStrip : C.ink;

  // the camera: a slow drift, a lean into the card once it sits, back out as it grows
  const lean = prog(frame, fCard, 30, ease.camera) * (1 - grow);
  const cam = lerp(1, 1.18, lean) * lerp(1, 1.03, prog(frame, e, ctx.dur, ease.camera));
  const camY = lerp(L.contentMid, CARD.y + CARD.h / 2 + 60, lean);

  // rows
  const plateOn = spr(frame, fPlate, 'enter');
  const priceOn = spr(frame, fPlate + 6, 'enter');
  const dateOn = spr(frame, fDate, 'land');
  const tap = prog(frame, fTap, 16, ease.enter);
  const press = fTap <= frame && frame < fTap + 10 ? 1 - Math.abs(frame - fTap - 5) / 5 : 0;
  // the sheet: the card grows to the whole screen
  const sh = {
    x: lerp(CARD.x, SCREEN.x, grow),
    y: lerp(CARD.y, SCREEN.y, grow),
    w: lerp(CARD.w, SCREEN.w, grow),
    h: lerp(CARD.h, SCREEN.h, grow),
    r: lerp(CARD.r, SCREEN.r, grow),
  };
  const rowsFade = 1 - prog(frame, fOpen, 8, ease.exit);

  const plate = p.plate ?? 'AA-000-AA';
  const label = mtav(p.label ?? 'ტექინსპექტირება');
  const days = p.days ?? '53';
  const unit = mtav(p.unit ?? 'დღე');
  const textX = CARD.x + 30 + smallW + 26;
  const textW = CARD.x + CARD.w - 28 - textX;
  const lblSize = Math.min(24, Math.floor((24 * textW) / Math.max(1, textWidth(label, `500 24px ${F.sans}`))));
  const icons: Array<{x: number; y: number}> = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) icons.push({x: 300 + c * 126, y: 800 + r * 150});
  const iconsOn = phoneIn * (1 - grow) * (1 - 0.35 * lean);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: `540px ${camY}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the phone */}
          <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={PH.r} fill="none" stroke={rgba(C.ink, 0.7)} strokeWidth={2.2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - phoneIn} />
          <rect x={PH.x + 220} y={PH.y + 22} width={140} height={34} rx={17} fill={C.ink} opacity={0.18 * phoneIn} />
          {/* the home screen's other icons, quiet */}
          {icons.map((ic, i) => (
            <rect key={i} x={ic.x} y={ic.y} width={96} height={96} rx={24} fill="none" stroke={rgba(C.ink, 0.32)} strokeWidth={1.6} opacity={iconsOn * prog(frame, fShrink + 8 + i, 10, ease.enter)} />
          ))}
          {/* the card, and the sheet it becomes */}
          <g opacity={cardIn} transform={`translate(0 ${(1 - cardIn) * 24}) translate(540 ${CARD.y + CARD.h / 2}) scale(${1 - 0.03 * press}) translate(-540 ${-(CARD.y + CARD.h / 2)})`}>
            <rect x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.r} fill={C.strip} />
          </g>
          {/* the car */}
          <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-CW / 2} ${-CH / 2})`}>
            <path d={BODY} fill="none" stroke={carInk} strokeWidth={carStroke} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <path d={GLASS_R} fill={rgba(carInk, 0.1)} stroke={carInk} strokeWidth={carStroke * 0.7} opacity={draw} />
            <path d={GLASS_F} fill={rgba(carInk, 0.1)} stroke={carInk} strokeWidth={carStroke * 0.7} opacity={draw} />
            <path d={LINES} fill="none" stroke={carInk} strokeWidth={carStroke * 0.6} opacity={0.7 * draw} />
            {[152, 612].map((wx) => (
              <g key={wx} opacity={draw}>
                <circle cx={wx} cy={196} r={48} fill="none" stroke={carInk} strokeWidth={carStroke} />
                <circle cx={wx} cy={196} r={20} fill="none" stroke={carInk} strokeWidth={carStroke * 0.6} />
              </g>
            ))}
            <line x1={-40} y1={246} x2={800} y2={246} stroke={rgba(carInk, 0.45)} strokeWidth={carStroke * 0.6} opacity={draw * (1 - fly) + grow} />
          </g>
          {/* the tap */}
          {frame >= fTap && frame < fOpen + 12 ? (
            <circle cx={620} cy={CARD.y + 130} r={18 + 50 * tap} fill={rgba(C.onStrip, 0.12 * (1 - tap))} stroke={rgba(C.onStrip, 0.5 * (1 - tap))} strokeWidth={2} />
          ) : null}
        </svg>
        {/* the card's rows */}
        <div className={TXT} style={{position: 'absolute', left: textX, top: CARD.y + 34, width: textW, opacity: cardIn * rowsFade}}>
          <div style={{fontFamily: F.mono, fontSize: 28, letterSpacing: 2, color: C.onStrip, border: `2px solid ${rgba(C.onStrip, 0.8)}`, borderRadius: 8, padding: '4px 10px', display: 'inline-block', opacity: lerp(0.3, 1, plateOn), transform: `scale(${lerp(0.96, 1, plateOn)})`, transformOrigin: 'left center'}}>
            {plate}
          </div>
          <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, opacity: lerp(0.3, 1, priceOn)}}>
            <div style={{width: 120, height: 22, borderRadius: 11, backgroundColor: rgba(C.onStrip, 0.18)}} />
            <div style={{fontFamily: F.sans, fontSize: 30, fontWeight: 600, color: C.onStrip}}>₾</div>
            <svg width={22} height={22} viewBox="0 0 22 22">
              <path d="M 11 3 L 19 15 L 3 15 Z" fill={toneText('up')} />
            </svg>
          </div>
          <div style={{marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 10, opacity: lerp(0.25, 1, dateOn), transform: `translateY(${(1 - dateOn) * 10}px)`}}>
            <span style={{fontFamily: F.sans, fontSize: lblSize, fontWeight: 500, color: rgba(C.onStrip, 0.7)}}>{label}</span>
          </div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 10, opacity: dateOn, transform: `translateY(${(1 - dateOn) * 14}px)`}}>
            <span style={{fontFamily: F.sans, fontSize: 52, fontWeight: 700, color: C.onStrip, lineHeight: 1.05}}>{days}</span>
            <span style={{fontFamily: F.sans, fontSize: 26, fontWeight: 600, color: C.onStrip}}>{unit}</span>
          </div>
        </div>
        {/* after the tap: the date, big, under the car */}
        <div className={TXT} style={{position: 'absolute', left: SCREEN.x, width: SCREEN.w, top: 930, textAlign: 'center', opacity: prog(frame, fOpen + 12, 12, ease.enter)}}>
          <div style={{fontFamily: F.sans, fontSize: 30, fontWeight: 500, color: rgba(C.onStrip, 0.7)}}>{label}</div>
          <div style={{fontFamily: F.sans, fontSize: 120, fontWeight: 700, color: C.onStrip, lineHeight: 1.1}}>
            {days} <span style={{fontSize: 44, fontWeight: 600}}>{unit}</span>
          </div>
        </div>
      </div>
      <Sfx name="asmr-pencil" at={base + 1} volume={0.35} />
      <Sfx name="asmr-air-long" at={fShrink} volume={0.35} />
      <Sfx name="asmr-paper" at={fShrink + 14} volume={0.4} />
      <Haptic kind="light" at={fShrink + 14} />
      <Sfx name="asmr-knock" at={fPlate} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={fPlate + 6} volume={0.35} />
      <Land at={fDate} />
      <Sfx name="asmr-tap" at={fTap} volume={0.5} />
      <Haptic kind="light" at={fTap} />
      <Sfx name="asmr-swell" at={fOpen} volume={0.3} />
    </PictureBand>
  );
};
