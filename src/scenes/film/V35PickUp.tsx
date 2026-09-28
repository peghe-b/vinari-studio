// V35PickUp: the phone lies dark on the table, you lift it, the lock screen wakes and the deadline is already there:
// a ring widget draws on around the days left, the date's name above it, and the camera leans in.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, halo, isLight, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  liftAt?: number | string; // chunk where the phone is lifted off the table
  ringAt?: number | string; // chunk where the widget draws on
  landAt?: number | string; // chunk where the days land
  days?: string; // "53"
  unit?: string; // "დღე"
  label?: string; // "ტექინსპექტირება"
};

// the phone, upright, in stage units
const PW = 430;
const PH = 880;
const PX = 540 - PW / 2;
const PY = 400;
const RC = 810; // ring centre y
const RR = 136; // ring radius
const RING = 2 * Math.PI * RR;

export const V35PickUp: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const liftF = Math.max(base + 8, cueFrame(ctx, p.liftAt ?? 1));
  const ringF = Math.max(liftF + 16, cueFrame(ctx, p.ringAt ?? 2));
  const landF = Math.max(ringF + 14, cueFrame(ctx, p.landAt ?? 3));
  const light = isLight();

  // the phone on the table, then lifted towards you
  const lift = spr(frame, liftF, 'enterXL');
  const tilt = lerp(64, 0, lift);
  const dropY = lerp(170, 0, lift);
  const sc = lerp(0.84, 1, lift);
  const settle = prog(frame, e, 20, ease.camera); // the table shot drifts in on the cut
  const wake = prog(frame, liftF + 8, 14, ease.camera);
  const nameIn = prog(frame, liftF + 14, 16, ease.camera); // the name line
  const ring = prog(frame, ringF, 26, ease.drawOn);
  const land = spr(frame, landF, 'land');
  // after the days land, the camera leans into the widget
  const push = lerp(1, 1.14, prog(frame, landF + 4, Math.max(20, ctx.dur - landF), ease.camera));
  const drift = lerp(0, -10, prog(frame, e, ctx.dur, ease.camera));

  const line = light ? C.ink2 : C.ink2;
  const glass = light ? C.surface : C.screenGlow;
  const dark = light ? rgba(C.ink, 0.06) : C.shade;
  const screenFill = wake > 0 ? glass : dark;

  const label = mtav(p.label ?? 'ტექინსპექტირება');
  const labelSize = Math.min(36, Math.floor((36 * 350) / Math.max(1, textWidth(label, `600 36px ${F.sans}`))));
  const days = p.days ?? '53';
  const unit = mtav(p.unit ?? 'დღე');
  const shadow = 1 - lift;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${drift}px) scale(${push})`, transformOrigin: `540px ${RC}px`}}>
        {/* the table's contact shadow, fading as the phone leaves it */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <ellipse cx={540} cy={PY + PH + 40} rx={250} ry={34} fill={rgba(light ? C.ink : C.ink, light ? 0.08 : 0.05)} opacity={shadow * settle} />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateY(${dropY + (1 - settle) * 30}px) perspective(1600px) rotateX(${tilt}deg) scale(${sc})`,
            transformOrigin: `540px ${PY + PH}px`,
          }}
        >
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            {/* the device */}
            <rect x={PX} y={PY} width={PW} height={PH} rx={58} fill={screenFill} stroke={line} strokeWidth={2.2} />
            <rect x={PX + 12} y={PY + 12} width={PW - 24} height={PH - 24} rx={47} fill="none" stroke={rgba(C.ink, 0.14)} strokeWidth={1.2} />
            <rect x={540 - 52} y={PY + 26} width={104} height={30} rx={15} fill={light ? C.ink : C.shade} stroke={light ? 'none' : rgba(C.ink, 0.22)} strokeWidth={1} />
            {/* the wake: a soft light across the glass */}
            <rect x={PX + 3} y={PY + 3} width={PW - 6} height={PH - 6} rx={55} fill={halo(C.ink, 0.06)} opacity={wake * (1 - wake) * 3} />
            {/* the lock screen widget: a ring drawing on around the days */}
            <circle cx={540} cy={RC} r={RR} fill="none" stroke={rgba(C.ink, 0.16)} strokeWidth={12} opacity={wake} />
            <circle
              cx={540}
              cy={RC}
              r={RR}
              fill="none"
              stroke={C.ink}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - ring)}
              transform={`rotate(-90 540 ${RC})`}
            />
            {/* the lock screen's two round buttons */}
            <circle cx={PX + 74} cy={PY + PH - 86} r={30} fill="none" stroke={rgba(C.ink, 0.3)} strokeWidth={1.5} opacity={wake} />
            <circle cx={PX + PW - 74} cy={PY + PH - 86} r={30} fill="none" stroke={rgba(C.ink, 0.3)} strokeWidth={1.5} opacity={wake} />
            <rect x={540 - 60} y={PY + PH - 28} width={120} height={6} rx={3} fill={rgba(C.ink, 0.4)} opacity={wake} />
          </svg>
          <div
            className={TXT}
            style={{position: 'absolute', left: PX, width: PW, top: RC - RR - 96, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: labelSize, color: C.ink, opacity: nameIn, transform: `translateY(${(1 - nameIn) * 10}px)`}}
          >
            {label}
          </div>
          <div
            className={TXT}
            style={{position: 'absolute', left: PX, width: PW, top: RC - 80, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 112, lineHeight: '116px', color: C.ink, opacity: land, transform: `translateY(${(1 - land) * 16}px) scale(${0.9 + 0.1 * land})`}}
          >
            {days}
          </div>
          <div
            className={TXT}
            style={{position: 'absolute', left: PX, width: PW, top: RC + 42, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: C.ink2, opacity: land}}
          >
            {unit}
          </div>
        </div>
      </div>
      <Sfx name="asmr-slide" at={liftF} volume={0.4} />
      <Sfx name="asmr-screen" at={liftF + 8} volume={0.4} />
      <Haptic kind="light" at={liftF + 8} />
      <Sfx name="asmr-pencil-short" at={ringF} volume={0.4} />
      <Haptic kind="light" at={ringF} />
      <Sfx name="asmr-land" at={landF} volume={0.5} />
      <Land at={landF} />
    </PictureBand>
  );
};
