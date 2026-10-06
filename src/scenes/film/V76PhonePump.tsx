// v76-phone-pump: static, the real spark at the pump. A side diagram: a driver at the car's fuel filler, the nozzle in
// his hand. Charge (+) gathers on his body, a small zap at the fingertip, then the charge runs down the arm and jumps
// as a red spark at the nozzle. The fix: the free hand touches the car's metal first, the charge drains through the
// panel to the ground in green, and the spark is gone.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, halo, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  chargeAt?: number | string; // charge gathers on the body
  zapAt?: number | string; // a small zap at the fingertip
  travelAt?: number | string; // the charge runs to the nozzle, the red spark
  touchAt?: number | string; // the free hand reaches the car's metal
  drainAt?: number | string; // the charge drains to the ground, green
  chargeLabel?: string;
  sparkLabel?: string;
  metalLabel?: string;
  groundLabel?: string;
};

// the body points where the charge sits (stage units)
const PLUS = [
  [300, 690], [322, 740], [282, 780], [312, 830], [290, 875], [326, 905], [276, 950],
  [306, 990], [284, 1040], [318, 1080], [270, 1120], [330, 1150], [296, 1190], [314, 640],
];
// the panel: a slight slant from (742, 430) to (682, 1240)
const PX = (y: number) => 742 - 60 * ((y - 430) / 810);
const GROUND = 1240;
const NOZ = {x: 742 - 60 * ((812 - 430) / 810) - 6, y: 812}; // the spout's mouth in the filler neck
const HAND1 = {x: 540, y: 792};
const SHOULDER = {x: 300, y: 660};
const ELBOW1 = {x: 418, y: 760};

export const V76PhonePump: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = prog(frame, e, 30, ease.drawOn);
  const fChar = Math.max(base + 8, cueFrame(ctx, p.chargeAt ?? 1));
  const fZap = Math.max(fChar + 10, cueFrame(ctx, p.zapAt ?? 3));
  const fTravel = Math.max(fZap + 10, cueFrame(ctx, p.travelAt ?? 5));
  const fTouch = Math.max(fTravel + 30, cueFrame(ctx, p.touchAt ?? 6));
  const fDrain = Math.max(fTouch + 14, cueFrame(ctx, p.drainAt ?? 7));

  const red = toneBig('down');
  const green = toneBig('up');
  const line = rgba(C.ink, 0.86);

  // the camera: a slow push, leaning in towards the nozzle while the charge travels, back out for the fix
  const lean = prog(frame, fTravel - 6, 30, ease.camera) * (1 - prog(frame, fTouch, 30, ease.camera));
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera)) + 0.08 * lean;
  const ox = lerp(480, NOZ.x - 40, lean);
  const oy = lerp(L.contentMid, NOZ.y, lean);

  // the free arm: hangs, then reaches the panel
  const reach = spr(frame, fTouch, 'enter');
  const touchY = 968;
  const hand2 = {x: lerp(236, PX(touchY) - 4, reach), y: lerp(930, touchY, reach)};
  const elbow2 = {x: lerp(250, 470, reach), y: lerp(810, 880, reach)};

  // the charge: how many plus signs are on the body
  const shown = Math.round(PLUS.length * prog(frame, fChar, 26, ease.enter));
  const zap = prog(frame, fZap, 6, ease.enter) * (1 - prog(frame, fZap + 8, 10, ease.exit));
  const spark = spr(frame, fTravel + 30, 'land');
  const sparkOff = prog(frame, fTouch, 14, ease.exit);
  const drained = prog(frame, fDrain, 34, ease.camera);
  const ring = spr(frame, fTouch + 8, 'land');

  // the arm path the charge runs along to the nozzle
  const arm1 = (t: number) => {
    if (t < 0.5) {
      const u = t / 0.5;
      return {x: lerp(SHOULDER.x, ELBOW1.x, u), y: lerp(SHOULDER.y, ELBOW1.y, u)};
    }
    if (t < 0.8) {
      const u = (t - 0.5) / 0.3;
      return {x: lerp(ELBOW1.x, HAND1.x, u), y: lerp(ELBOW1.y, HAND1.y, u)};
    }
    const u = (t - 0.8) / 0.2;
    return {x: lerp(HAND1.x, NOZ.x, u), y: lerp(HAND1.y, NOZ.y, u)};
  };
  // the drain path: hand2 -> down the panel -> the ground
  const drainPt = (t: number) => {
    if (t < 0.25) return {x: hand2.x, y: hand2.y};
    const u = (t - 0.25) / 0.75;
    const y = lerp(touchY, GROUND, u);
    return {x: PX(y) + 6, y};
  };

  const plus = (x: number, y: number, s: number, col: string, op: number, k: number) => (
    <g key={k} opacity={op} transform={`translate(${x} ${y}) scale(${s})`}>
      <line x1={-9} y1={0} x2={9} y2={0} stroke={col} strokeWidth={3} strokeLinecap="round" />
      <line x1={0} y1={-9} x2={0} y2={9} stroke={col} strokeWidth={3} strokeLinecap="round" />
    </g>
  );

  const charges: React.ReactNode[] = [];
  for (let i = 0; i < PLUS.length; i++) {
    const pt = PLUS[i];
    const on = i < shown ? 1 : 0;
    const pop = spr(frame, fChar + i * 2, 'tap');
    // during the travel, each charge leaves the body for the nozzle, staggered
    const go = prog(frame, fTravel + i * 1.6, 24, ease.camera);
    const back = drained;
    if (frame < fTouch) {
      const at = arm1(go);
      const x = lerp(pt[0], at.x, Math.min(1, go * 1.3));
      const y = lerp(pt[1], at.y, Math.min(1, go * 1.3));
      const fade = go >= 1 ? 0 : 1;
      charges.push(plus(x, y, 0.6 + 0.4 * pop, red, on * fade * (1 - 0.3 * zap), i));
    } else {
      // after the touch, the body charges again and drains through the panel, green
      const t = prog(frame, fDrain + i * 2, 22, ease.camera);
      const d = drainPt(t);
      const x = lerp(pt[0], d.x, Math.min(1, t * 1.4));
      const y = lerp(pt[1], d.y, Math.min(1, t * 1.4));
      const op = (1 - prog(frame, fDrain + i * 2 + 18, 8, ease.exit)) * Math.min(1, prog(frame, fTouch, 10, ease.enter) + back);
      charges.push(plus(x, y, 0.85, green, op, i));
    }
  }

  const sparkOp = spark * (1 - sparkOff);
  const groundGlow = drained * (1 - prog(frame, fDrain + 70, 30, ease.exit));
  const labelStyle: React.CSSProperties = {position: 'absolute', fontFamily: F.mono, fontSize: 30, letterSpacing: 1, whiteSpace: 'nowrap'};

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${ox}px ${oy}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the car's side: a panel edge, the metal shaded to its right */}
          <path d={`M ${PX(430)} 430 L ${PX(GROUND)} ${GROUND} L 960 ${GROUND} L 960 430 Z`} fill={rgba(C.ink, 0.05)} opacity={draw} />
          <path d={`M ${PX(430)} 430 L ${PX(GROUND)} ${GROUND}`} stroke={line} strokeWidth={2.4} fill="none" strokeDasharray={820} strokeDashoffset={820 * (1 - draw)} />
          <path d={`M ${PX(470) + 30} 470 L ${PX(1200) + 30} 1200`} stroke={rgba(C.ink, 0.25)} strokeWidth={1.5} fill="none" opacity={draw} />
          {/* the filler flap, open */}
          <rect x={PX(780) - 2} y={770} width={58} height={84} rx={14} fill="none" stroke={line} strokeWidth={2} opacity={draw} />
          <path d={`M ${PX(780) - 2} 776 L ${PX(780) - 62} 760 L ${PX(780) - 62} 842 L ${PX(780) - 2} 850`} stroke={rgba(C.ink, 0.5)} strokeWidth={1.6} fill="none" opacity={draw} />
          {/* the ground */}
          <line x1={140} y1={GROUND} x2={940} y2={GROUND} stroke={rgba(C.ink, 0.5)} strokeWidth={2} strokeDasharray={800} strokeDashoffset={800 * (1 - draw)} />
          <line x1={PX(GROUND) - 120} y1={GROUND} x2={PX(GROUND) + 120} y2={GROUND} stroke={green} strokeWidth={4} opacity={groundGlow} />
          <circle cx={PX(GROUND)} cy={GROUND} r={30 + 40 * drained} fill="none" stroke={green} strokeWidth={2} opacity={groundGlow * (1 - drained * 0.7)} />

          {/* the driver: head, body, legs */}
          <circle cx={300} cy={560} r={46} fill="none" stroke={line} strokeWidth={2.4} opacity={draw} />
          <path d="M 300 608 L 300 1000 M 300 1000 L 262 1240 M 300 1000 L 338 1240" stroke={line} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - draw)} />
          {/* the arm holding the nozzle */}
          <path d={`M ${SHOULDER.x} ${SHOULDER.y} L ${ELBOW1.x} ${ELBOW1.y} L ${HAND1.x} ${HAND1.y}`} stroke={line} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw} />
          {/* the free arm */}
          <path d={`M ${SHOULDER.x} ${SHOULDER.y} L ${elbow2.x} ${elbow2.y} L ${hand2.x} ${hand2.y}`} stroke={line} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw} />
          <circle cx={hand2.x} cy={hand2.y} r={9} fill={C.bg} stroke={line} strokeWidth={2.2} opacity={draw} />

          {/* the nozzle: grip in the hand, body, spout into the filler */}
          <path d={`M ${HAND1.x - 24} ${HAND1.y + 30} L ${HAND1.x - 6} ${HAND1.y - 18} L ${HAND1.x + 70} ${HAND1.y - 22} L ${NOZ.x} ${NOZ.y}`} stroke={line} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={draw} />
          <path d={`M ${HAND1.x - 12} ${HAND1.y + 6} Q ${HAND1.x + 18} ${HAND1.y + 24} ${HAND1.x + 40} ${HAND1.y - 4}`} stroke={rgba(C.ink, 0.5)} strokeWidth={1.6} fill="none" opacity={draw} />
          {/* the hose back to the pump, off the left */}
          <path d={`M ${HAND1.x - 24} ${HAND1.y + 30} C ${HAND1.x - 60} 1000 180 1080 140 1110`} stroke={rgba(C.ink, 0.45)} strokeWidth={2} fill="none" strokeDasharray={600} strokeDashoffset={600 * (1 - draw)} />
          <circle cx={HAND1.x} cy={HAND1.y} r={9} fill={C.bg} stroke={line} strokeWidth={2.2} opacity={draw} />

          {/* the zap at the fingertip */}
          <path d={`M ${hand2.x - 6} ${hand2.y + 10} l -16 18 l 14 2 l -16 22`} stroke={red} strokeWidth={2.6} fill="none" strokeLinejoin="round" opacity={zap} />
          <circle cx={hand2.x} cy={hand2.y} r={16 + 30 * zap} fill="none" stroke={red} strokeWidth={1.6} opacity={zap * 0.7} />

          {charges}

          {/* the red spark at the nozzle */}
          <g opacity={sparkOp} transform={`translate(${NOZ.x} ${NOZ.y})`}>
            <circle r={60 * spark} fill={halo(red, 0.22)} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
              const a = (k / 8) * Math.PI * 2 + 0.3;
              const r1 = 10;
              const r2 = (k % 2 ? 26 : 40) * spark;
              return <line key={k} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke={red} strokeWidth={2.6} strokeLinecap="round" />;
            })}
          </g>

          {/* the touch: a green ring where the hand meets the metal */}
          <circle cx={PX(touchY)} cy={touchY} r={14 + 34 * ring} fill="none" stroke={green} strokeWidth={2.2} opacity={frame >= fTouch + 8 ? 1 - ring * 0.5 : 0} />
        </svg>

        <div className={TXT} style={{...labelStyle, left: 360, top: 470, color: red, opacity: prog(frame, fChar + 6, 10) * (frame < fTouch ? 1 - prog(frame, fTravel, 10) : 0)}}>
          {mtav(p.chargeLabel ?? '+ მუხტი')}
        </div>
        <div className={TXT} style={{...labelStyle, left: NOZ.x - 250, top: NOZ.y - 130, color: red, opacity: sparkOp}}>
          {mtav(p.sparkLabel ?? 'ნაპერწკალი')}
        </div>
        <div className={TXT} style={{...labelStyle, left: PX(touchY) + 40, top: touchY - 18, color: green, opacity: ring}}>
          {mtav(p.metalLabel ?? 'ლითონი')}
        </div>
        <div className={TXT} style={{...labelStyle, left: PX(GROUND) - 60, top: GROUND - 56, color: green, opacity: prog(frame, fDrain + 20, 12) * (1 - prog(frame, fDrain + 90, 20, ease.exit))}}>
          {mtav(p.groundLabel ?? 'მიწა')}
        </div>
      </div>
      <Sfx name="asmr-pencil" at={base + 2} volume={0.38} />
      <Sfx name="asmr-tick-fine" at={fChar} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={fChar + 8} volume={0.3} />
      <Sfx name="asmr-tick-fine" at={fChar + 16} volume={0.28} />
      <Sfx name="asmr-pop" at={fZap} volume={0.45} />
      <Haptic kind="light" at={fZap} />
      <Sfx name="asmr-air-long" at={fTravel} volume={0.3} />
      <Sfx name="asmr-knock" at={fTravel + 30} volume={0.5} />
      <Haptic kind="error" at={fTravel + 30} />
      <Sfx name="asmr-tap" at={fTouch + 8} volume={0.45} />
      <Sfx name="asmr-check" at={fDrain + 30} volume={0.4} />
      <Haptic kind="success" at={fDrain + 30} />
    </PictureBand>
  );
};
