// v36-make-room: a phone's home screen seen flat. The app icons slide aside to make room, the small "ვადა" widget
// drops into the free 2x2 slot, its days land, then the camera leans in on the widget while the icons go quiet.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  days?: string; // the big number on the widget
  unit?: string; // under it
  label?: string; // the date's name over it
  dropAt?: number | string; // chunk: the icons make room, the widget drops in
  landAt?: number | string; // chunk: the days land
  pushAt?: number | string; // chunk: the camera leans in on the widget
  quietAt?: number | string; // chunk: the icons go quiet
  glanceAt?: number | string; // chunk: the widget's edge breathes once (a glance is enough)
};

// the phone, in stage units
const PX = 220;
const PW = 640;
const PY = 400;
const PH = 1100; // runs past the band's bottom: cut there on a hard line
// the icon grid
const GX = 284;
const GY = 530;
const PITCH_X = 136;
const PITCH_Y = 140;
const ICON = 104;
const N = 16; // icons
const TAKEN = [0, 1, 4, 5]; // the widget's 2x2 slot
// the widget
const WX = GX;
const WY = GY;
const WW = PITCH_X + ICON;
const WH = PITCH_Y + ICON;
// where the camera puts the widget's centre, and how close
const FOCUS_X = 540;
const FOCUS_Y = 800;
const PUSH = 1.45;

const slotXY = (s: number) => ({x: GX + (s % 4) * PITCH_X, y: GY + Math.floor(s / 4) * PITCH_Y});

/** A simple line glyph for icon k: no logos, a calm set of shapes. */
const Glyph: React.FC<{k: number; x: number; y: number; color: string}> = ({k, x, y, color}) => {
  const cx = x + ICON / 2;
  const cy = y + ICON / 2;
  const kind = k % 6;
  const sw = 2.2;
  if (kind === 0) return <circle cx={cx} cy={cy} r={20} fill="none" stroke={color} strokeWidth={sw} />;
  if (kind === 1) return <rect x={cx - 19} y={cy - 19} width={38} height={38} rx={8} fill="none" stroke={color} strokeWidth={sw} />;
  if (kind === 2)
    return (
      <g stroke={color} strokeWidth={sw} strokeLinecap="round">
        <line x1={cx - 20} y1={cy - 10} x2={cx + 20} y2={cy - 10} />
        <line x1={cx - 20} y1={cy + 2} x2={cx + 20} y2={cy + 2} />
        <line x1={cx - 20} y1={cy + 14} x2={cx + 6} y2={cy + 14} />
      </g>
    );
  if (kind === 3) return <path d={`M ${cx} ${cy - 20} L ${cx + 21} ${cy + 16} L ${cx - 21} ${cy + 16} Z`} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
  if (kind === 4)
    return (
      <g fill="none" stroke={color} strokeWidth={sw}>
        <circle cx={cx} cy={cy} r={20} />
        <line x1={cx} y1={cy} x2={cx} y2={cy - 12} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx + 9} y2={cy + 5} strokeLinecap="round" />
      </g>
    );
  return <path d={`M ${cx - 20} ${cy + 12} L ${cx - 6} ${cy - 4} L ${cx + 4} ${cy + 6} L ${cx + 20} ${cy - 14}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
};

export const V36MakeRoom: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const drop = Math.max(base + 6, cueFrame(ctx, p.dropAt ?? 0) + 6);
  const land = Math.max(drop + 26, cueFrame(ctx, p.landAt ?? 1));
  const pushF = Math.max(land + 14, cueFrame(ctx, p.pushAt ?? 2));
  const quietF = Math.max(pushF + 10, cueFrame(ctx, p.quietAt ?? 3));

  const appear = prog(frame, e, 14, ease.camera);
  const reflow = spr(frame, drop, 'enter');
  const wIn = spr(frame, drop + 8, 'enterXL');
  const num = spr(frame, land, 'land');
  const push = prog(frame, pushF, 40, ease.camera);
  const quiet = prog(frame, quietF, 18, ease.camera);
  const glanceF = Math.max(quietF + 10, cueFrame(ctx, p.glanceAt ?? 5));
  const glance = Math.sin(Math.PI * prog(frame, glanceF, 30, ease.camera));
  const drift = lerp(1, 1.025, prog(frame, e, ctx.dur, ease.camera));

  // the camera: a slow drift, then the lean in that brings the widget's centre to the focus point
  const s = lerp(1, PUSH, push) * drift;
  const wcx = WX + WW / 2;
  const wcy = WY + WH / 2;
  const tx = lerp(0, FOCUS_X - PUSH * wcx, push) + (1 - drift) * 540;
  const ty = lerp(0, FOCUS_Y - PUSH * wcy, push) + (1 - drift) * 830;

  // every icon's slot before and after the widget takes its room
  const free: number[] = [];
  for (let s2 = 0; free.length < N; s2++) if (TAKEN.indexOf(s2) < 0) free.push(s2);

  const label = mtav(p.label ?? 'ტექინსპექტირება');
  const unit = mtav(p.unit ?? 'დღე');
  const days = p.days ?? '53';
  const labelSize = Math.min(19, Math.floor((19 * (WW - 44)) / Math.max(1, textWidth(label, `500 19px ${F.mono}`))));
  const wDy = (1 - wIn) * -70;
  const wScale = lerp(1.1, 1, wIn);
  const iconA = lerp(1, 0.32, quiet);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, opacity: appear, transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: '0 0'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {/* the phone: a thin outline, the screen, the island */}
          <rect x={PX} y={PY} width={PW} height={PH} rx={82} fill={C.surface} stroke={C.ink} strokeWidth={2.4} />
          <rect x={PX + 12} y={PY + 12} width={PW - 24} height={PH - 24} rx={70} fill={rgba(C.ink, 0.035)} />
          <rect x={540 - 78} y={PY + 30} width={156} height={42} rx={21} fill={C.island} />
          {/* the icons, sliding to their new slots */}
          {Array.from({length: N}, (_, i) => {
            const a = slotXY(i);
            const b = slotXY(free[+i]);
            const x = lerp(a.x, b.x, reflow);
            const y = lerp(a.y, b.y, reflow);
            const isApp = i === 0;
            return (
              <g key={i} opacity={isApp ? 1 : iconA}>
                <rect x={x} y={y} width={ICON} height={ICON} rx={26} fill={isApp ? C.ink : C.surface} stroke={isApp ? C.ink : rgba(C.ink, 0.16)} strokeWidth={1.6} />
                {isApp ? (
                  <path d={`M ${x + 32} ${y + 36} L ${x + 52} ${y + 70} L ${x + 72} ${y + 36}`} fill="none" stroke={C.onInk} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <Glyph k={i} x={x} y={y} color={C.ink2} />
                )}
              </g>
            );
          })}
          {/* the widget's shadow and card, dropping into the room the icons left */}
          <g opacity={wIn} transform={`translate(${wcx} ${wcy + wDy}) scale(${wScale}) translate(${-wcx} ${-wcy})`}>
            <rect x={WX + 4} y={WY + 14 + (1 - wIn) * 20} width={WW - 8} height={WH - 8} rx={34} fill={rgba(C.shade, 0.1 + 0.08 * (1 - wIn))} style={{filter: 'blur(14px)'}} />
            <rect x={WX} y={WY} width={WW} height={WH} rx={34} fill={C.surface} stroke={rgba(C.ink, 0.2)} strokeWidth={1.6} />
            <rect x={WX - 10 * glance} y={WY - 10 * glance} width={WW + 20 * glance} height={WH + 20 * glance} rx={34 + 10 * glance} fill="none" stroke={rgba(C.ink, 0.4 * glance)} strokeWidth={2} />
            <line x1={WX + 22} y1={WY + 62} x2={WX + 22 + (WW - 44) * num} y2={WY + 62} stroke={rgba(C.ink, 0.25)} strokeWidth={1.4} />
          </g>
        </svg>
        {/* the status bar's time */}
        <div className={TXT} style={{position: 'absolute', left: PX + 64, top: PY + 34, fontFamily: F.sans, fontWeight: 600, fontSize: 26, color: C.ink}}>9:41</div>
        {/* the widget's words: the name, the days, the unit */}
        <div
          className={TXT}
          style={{position: 'absolute', left: WX, top: WY, width: WW, height: WH, opacity: wIn, transform: `translateY(${wDy}px) scale(${wScale})`, transformOrigin: 'center center'}}
        >
          <div style={{position: 'absolute', left: 22, top: 26, fontFamily: F.mono, fontWeight: 500, fontSize: labelSize, color: C.ink2, whiteSpace: 'nowrap'}}>{label}</div>
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: 76,
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 108,
              lineHeight: 1,
              color: C.ink,
              opacity: num,
              transform: `translateY(${(1 - num) * 26}px)`,
              letterSpacing: -2,
            }}
          >
            {days}
          </div>
          <div style={{position: 'absolute', left: 24, top: 192, fontFamily: F.sans, fontWeight: 500, fontSize: 28, color: C.ink2, opacity: num}}>{unit}</div>
        </div>
      </div>
      <Sfx name="asmr-slide" at={drop} volume={0.35} />
      <Sfx name="asmr-knock" at={drop + 14} volume={0.45} />
      <Haptic kind="light" at={drop + 14} />
      <Land at={land} />
      <Sfx name="asmr-air-long" at={pushF} volume={0.3} />
      <Sfx name="asmr-tick-fine" at={quietF} volume={0.35} />
      <Sfx name="asmr-swell" at={glanceF} volume={0.25} />
    </PictureBand>
  );
};
