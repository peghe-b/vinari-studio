// v31-car-birthday: the car's birthday cake. A line-art cake with six unlit candles and a car drawn on its side;
// on `at` (chunk 1) the date rolls 31.12 -> 01.01, the candles light one by one and a seventh, red one rises out
// of the cake and lights; on `ageAt` (chunk 2) a red "+1" lands beside it: for customs the car is a year older.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  from?: string; // the date before (mono)
  to?: string; // the date after
  at?: number | string; // chunk where the date rolls and the candles light
  ageAt?: number | string; // chunk where "+1" lands
  age?: string; // the small word under "+1"
  tone?: Tone;
};

// the cake, stage units
const CX = 540;
const TOP = 900; // centre of the top ellipse
const RX = 290;
const RY = 64;
const BASE = 1130; // centre of the bottom ellipse
const CAR = 'M 0 58 L 0 40 Q 2 30 20 28 L 60 24 L 95 4 Q 100 2 110 2 L 170 2 Q 180 2 188 8 L 218 26 L 250 32 Q 260 34 260 44 L 260 58 L 222 58 A 20 20 0 0 0 182 58 L 78 58 A 20 20 0 0 0 38 58 Z';
const FLAME = 'M 0 -34 C 9 -20 12 -10 12 -2 C 12 6 6 11 0 11 C -6 11 -12 6 -12 -2 C -12 -10 -9 -20 0 -34 Z';

export const V31CarBirthday: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = prog(frame, e, 26, ease.drawOn);
  const light = Math.max(base + 10, cueFrame(ctx, p.at ?? 1));
  const ageF = Math.max(light + 24, cueFrame(ctx, p.ageAt ?? 2));
  const tone = p.tone ?? 'down';
  const red = toneBig(tone);

  const push = lerp(1, 1.06, prog(frame, e, ctx.dur, ease.camera)) + 0.02 * prog(frame, light, 20, ease.camera);
  const roll = prog(frame, light, 12, ease.camera);
  const rise = spr(frame, light + 14, 'land');
  const newLit = prog(frame, light + 26, 6, ease.camera);
  const plus = spr(frame, ageF, 'land');

  // the bottom and top ellipses' front arcs
  const arc = (cy: number, rx: number, ry: number, front: boolean) =>
    `M ${CX - rx} ${cy} A ${rx} ${ry} 0 0 ${front ? 0 : 1} ${CX + rx} ${cy}`;

  const candles: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + ((i + 0.5) / 6) * Math.PI;
    const x = CX + 205 * Math.cos(a);
    const y = TOP + 34 * Math.sin(a) + 6;
    const lit = prog(frame, light + 4 + i * 3, 5, ease.camera);
    const s = 1 + 0.07 * Math.sin(frame * 0.9 + i * 1.7) + 0.04 * Math.sin(frame * 2.3 + i);
    candles.push(
      <g key={i} opacity={draw}>
        <rect x={x - 7} y={y - 96} width={14} height={96} rx={3} fill={C.bg} stroke={C.ink2} strokeWidth={1.8} />
        <line x1={x} y1={y - 96} x2={x} y2={y - 106} stroke={C.ink2} strokeWidth={1.6} />
        {lit > 0 ? (
          <g transform={`translate(${x} ${y - 110}) scale(${lit * s})`}>
            <circle r={26} fill={rgba(C.ink, 0.07)} />
            <path d={FLAME} fill={C.ink} opacity={0.92} />
          </g>
        ) : null}
      </g>,
    );
  }

  // the new, seventh candle: rises from the cake's front, taller, red
  const nx = CX;
  const ny = TOP + 30;
  const nh = 128 * rise;
  const ns = 1 + 0.07 * Math.sin(frame * 1.1 + 4) + 0.04 * Math.sin(frame * 2.7);

  const from = p.from ?? '31.12';
  const to = p.to ?? '01.01';

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the plate */}
          <ellipse cx={CX} cy={BASE + 26} rx={360 * draw} ry={62 * draw} fill="none" stroke={C.rule} strokeWidth={1.6} />
          {/* the cake: sides, front of the bottom, the top */}
          <g opacity={draw}>
            <path d={`M ${CX - RX} ${TOP} L ${CX - RX} ${BASE} ${arc(BASE, RX, RY, true).replace('M', 'L')} L ${CX + RX} ${TOP}`} fill={C.bg} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
            <ellipse cx={CX} cy={TOP} rx={RX} ry={RY} fill={C.bg} stroke={C.ink} strokeWidth={2.2} />
            <path d={arc(TOP + 34, RX, RY, true)} fill="none" stroke={C.rule} strokeWidth={1.6} />
            <g transform={`translate(${CX - 130} 1016)`}>
              <path d={CAR} fill="none" stroke={C.ink2} strokeWidth={2} strokeLinejoin="round" />
              <circle cx={58} cy={60} r={15} fill="none" stroke={C.ink2} strokeWidth={2} />
              <circle cx={202} cy={60} r={15} fill="none" stroke={C.ink2} strokeWidth={2} />
            </g>
          </g>
          {candles}
          {rise > 0.01 ? (
            <g>
              <rect x={nx - 8} y={ny - nh} width={16} height={nh} rx={3} fill={C.bg} stroke={red} strokeWidth={2.2} />
              <line x1={nx} y1={ny - nh} x2={nx} y2={ny - nh - 11 * rise} stroke={red} strokeWidth={1.8} />
              {newLit > 0 ? (
                <g transform={`translate(${nx} ${ny - nh - 15}) scale(${newLit * ns * 1.15})`}>
                  <circle r={30} fill={rgba(C.ink, 0.08)} />
                  <path d={FLAME} fill={C.ink} />
                </g>
              ) : null}
            </g>
          ) : null}
        </svg>
        {/* the date, rolling */}
        <div className={TXT} style={{position: 'absolute', left: 240, width: 600, top: 400, height: 110, overflow: 'hidden', fontFamily: F.mono, fontSize: 96, lineHeight: '110px', textAlign: 'center', color: C.ink, letterSpacing: 4}}>
          <div style={{transform: `translateY(${-110 * roll}px)`, opacity: 1 - roll}}>{from}</div>
          <div style={{transform: `translateY(${-110 * roll}px)`, opacity: roll}}>{to}</div>
        </div>
        {/* +1, the age */}
        {frame >= ageF ? (
          <div className={TXT} style={{position: 'absolute', left: 750, width: 200, top: 540, textAlign: 'left', opacity: plus, transform: `translateY(${(1 - plus) * 20}px)`}}>
            <div style={{fontFamily: F.mono, fontSize: 120, lineHeight: '120px', color: red}}>+1</div>
            <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 34, color: toneText(tone), marginTop: 6}}>{mtav(p.age ?? 'ასაკი')}</div>
          </div>
        ) : null}
      </div>
      <Sfx name="asmr-pencil" at={base + 2} volume={0.35} />
      <Sfx name="asmr-flap" at={light} volume={0.45} />
      <Sfx name="asmr-tick-fine" at={light + 6} volume={0.3} />
      <Sfx name="asmr-tick-fine" at={light + 13} volume={0.28} />
      <Sfx name="asmr-pop" at={light + 14} volume={0.4} />
      <Sfx name="asmr-swell" at={light + 24} volume={0.3} />
      <Haptic kind="light" at={light + 26} />
      <Sfx name="asmr-knock" at={ageF} volume={0.4} />
      <Land at={ageF + 2} />
    </PictureBand>
  );
};
