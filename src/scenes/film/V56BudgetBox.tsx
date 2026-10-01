// v56-budget-box: the budget is an open box. The car is too wide and sticks on the rim; the costs (ship, port,
// customs) fill the box from the floor, then the car shrinks to the room left and drops in: that room is the bid.
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
  tryAt?: number | string; // the car drops and sticks on the rim
  fillAt?: number | string; // the costs fill the box
  fitAt?: number | string; // the car shrinks and drops in
  label?: string; // the word by the bracket
  tone?: Tone;
};

// the box (stage units)
const BX0 = 300;
const BX1 = 780;
const RIM = 720;
const FLOOR = 1190;
const BH = 76; // one cost layer
const GAP = 8;
const CW = 560; // the car's own width
const CH = 176; // the car's own height (wheels included)
const FIT = 0.7;

// a side-view sedan in its own 560 x 176 box, wheels on y 140
const BODY = 'M 22 140 L 20 112 Q 22 94 58 88 L 150 80 Q 192 40 252 30 L 360 28 Q 412 30 452 78 L 518 88 Q 546 94 546 118 L 544 140 Z';
const GLASS = 'M 178 80 Q 208 50 256 43 L 296 42 L 296 80 Z M 312 42 L 352 42 Q 386 46 414 80 L 312 80 Z';

const Car: React.FC<{ink: string}> = ({ink}) => (
  <g>
    <path d={BODY} fill={C.bg} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
    <path d={GLASS} fill="none" stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
    <line x1={304} y1={86} x2={304} y2={132} stroke={ink} strokeWidth={1.5} />
    <line x1={196} y1={104} x2={222} y2={104} stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
    <line x1={330} y1={104} x2={356} y2={104} stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
    <circle cx={132} cy={140} r={34} fill={C.bg} stroke={ink} strokeWidth={2.4} />
    <circle cx={132} cy={140} r={12} fill="none" stroke={ink} strokeWidth={1.6} />
    <circle cx={436} cy={140} r={34} fill={C.bg} stroke={ink} strokeWidth={2.4} />
    <circle cx={436} cy={140} r={12} fill="none" stroke={ink} strokeWidth={1.6} />
  </g>
);

// the three icons of the cost layers, centred on (0, 0)
const Icon: React.FC<{i: number; ink: string}> = ({i, ink}) => {
  if (i === 0)
    return (
      <g fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -66 4 Q -55 -10 -44 4 T -22 4 T 0 4 T 22 4 T 44 4 T 66 4" />
        <path d="M -50 -14 L 46 -14 L 34 -2 L -40 -2 Z" />
      </g>
    );
  if (i === 1)
    return (
      <g fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -40 26 L -40 -26 L 50 -26 M -40 -16 L -22 -26 M 34 -26 L 34 -6" />
        <rect x={24} y={-6} width={20} height={14} rx={2} />
        <line x1={-56} y1={26} x2={-24} y2={26} />
      </g>
    );
  return (
    <g fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={-26} y={4} width={52} height={14} rx={3} />
      <path d="M -10 4 L -10 -10 Q -18 -14 -18 -22 Q -18 -30 0 -30 Q 18 -30 18 -22 Q 18 -14 10 -10 L 10 4" />
      <line x1={-34} y1={26} x2={34} y2={26} />
    </g>
  );
};

export const V56BudgetBox: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const tryF = Math.max(base + 6, cueFrame(ctx, p.tryAt ?? 1));
  const fillF = Math.max(tryF + 18, cueFrame(ctx, p.fillAt ?? 2));
  const fitF = Math.max(fillF + 30, cueFrame(ctx, p.fitAt ?? 3));

  // the camera: a slow push over the whole scene
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));

  // the car: hovers, drops onto the rim (too wide), then shrinks and drops onto the top layer
  const bob = Math.sin(frame / 11) * 5 * (1 - prog(frame, tryF, 6));
  const drop1 = spr(frame, tryF, 'land');
  const shrink = prog(frame, fitF, 12, ease.camera);
  const drop2 = spr(frame, fitF + 10, 'land');
  const layerTop = FLOOR - 3 * (BH + GAP);
  const bottom = lerp(lerp(RIM - 90, RIM, drop1), layerTop - 4, drop2) + bob;
  const scale = lerp(1, FIT, shrink);
  // a little rock on the rim when it sticks
  const rock = frame >= tryF ? Math.sin((frame - tryF) / 3.2) * 2.2 * Math.exp(-(frame - tryF) / 12) * (1 - shrink) : 0;

  // the question over the stuck car
  const q = spr(frame, tryF + 6, 'land') * (1 - prog(frame, fitF, 10));

  // the bracket of the room the car takes
  const br = spr(frame, fitF + 22, 'land');
  const bTop = layerTop - 4 - CH * FIT;
  const bBot = layerTop - 4;
  const label = mtav(p.label ?? 'ბიდი');
  const lSize = Math.min(48, Math.floor((48 * 130) / Math.max(1, textWidth(label, `600 48px ${F.sans}`))));
  const lineC = toneBig(tone);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the cost layers, rising from the floor one after another */}
          {[0, 1, 2].map((i) => {
            const g = spr(frame, fillF + i * 9, 'enter');
            const y1 = FLOOR - i * (BH + GAP) - 6;
            const h = BH * g;
            return (
              <g key={i} opacity={g > 0.01 ? 1 : 0}>
                <rect x={BX0 + 12} y={y1 - h} width={BX1 - BX0 - 24} height={h} rx={10} fill={C.surface} stroke={C.ink2} strokeWidth={1.6} />
                <g transform={`translate(540 ${y1 - BH / 2}) scale(${0.6 + 0.4 * g})`} opacity={g}>
                  <Icon i={i} ink={C.ink2} />
                </g>
              </g>
            );
          })}
          {/* the box: an open U, the budget */}
          <path d={`M ${BX0} ${RIM} L ${BX0} ${FLOOR} L ${BX1} ${FLOOR} L ${BX1} ${RIM}`} fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinejoin="round" />
          <line x1={BX0 - 14} y1={RIM} x2={BX0 + 6} y2={RIM} stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" />
          <line x1={BX1 - 6} y1={RIM} x2={BX1 + 14} y2={RIM} stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" />
          <line x1={BX0 - 60} y1={FLOOR} x2={BX1 + 60} y2={FLOOR} stroke={C.rule} strokeWidth={1.5} />
          {/* the car */}
          <g transform={`translate(540 ${bottom}) rotate(${rock}) scale(${scale}) translate(${-CW / 2} ${-CH})`}>
            <Car ink={C.ink} />
          </g>
          {/* the bracket: the room the car takes is the bid */}
          <g opacity={br}>
            <path d={`M ${BX1 + 26} ${bTop} L ${BX1 + 40} ${bTop} L ${BX1 + 40} ${bBot} L ${BX1 + 26} ${bBot}`} fill="none" stroke={lineC} strokeWidth={2.6} strokeLinejoin="round" strokeDasharray={600} strokeDashoffset={600 * (1 - br)} />
            <rect x={540 - (CW * FIT) / 2 - 14} y={bTop - 10} width={CW * FIT + 28} height={bBot - bTop + 14} rx={14} fill="none" stroke={rgba(lineC, 0.55)} strokeWidth={1.6} strokeDasharray="8 8" />
          </g>
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 506, width: 120, top: 392, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 120, lineHeight: '130px', color: C.ink, opacity: q, transform: `translateY(${(1 - q) * 20}px) scale(${0.8 + 0.2 * q})`}}>
          ?
        </div>
        <div className={TXT} style={{position: 'absolute', left: BX1 + 52, top: (bTop + bBot) / 2 - lSize * 0.62, fontFamily: F.sans, fontWeight: 600, fontSize: lSize, color: toneText(tone), opacity: br, transform: `translateX(${(1 - br) * -12}px)`}}>
          {label}
        </div>
      </div>
      <Sfx name="asmr-knock" at={tryF + 4} volume={0.5} />
      <Haptic kind="light" at={tryF + 4} />
      <Sfx name="asmr-pop" at={tryF + 10} volume={0.35} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="asmr-tick-fine" at={fillF + i * 9 + 2} volume={0.45} />
      ))}
      <Sfx name="asmr-air" at={fitF} volume={0.3} />
      <Land at={fitF + 16} />
      <Sfx name="asmr-pencil-short" at={fitF + 22} volume={0.35} />
      <Haptic kind="light" at={fitF + 22} />
    </PictureBand>
  );
};
