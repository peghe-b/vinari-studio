// v58-which-one: a row of identical cars from above. A round button below is pressed once, a ring opens, a thin
// line runs up to one bay and a pin drops on that car; then an airplane-mode switch slides on and the pin stays.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  tapAt?: number | string; // the finger presses the button
  pinAt?: number | string; // the pin drops on the car
  offAt?: number | string; // the airplane switch slides on
  tone?: Tone;
};

const BAYS = 5;
const BAY_W = 150;
const BAY_X = 165;
const BAY_TOP = 600;
const BAY_BOT = 850;
const PICK = 2;
const BTN_Y = 1065;
const BTN_R = 84;
const PIN = 'M0 0 C -6 -14 -26 -30 -26 -52 A 26 26 0 1 1 26 -52 C 26 -30 6 -14 0 0 Z';
const PLANE = 'M -24 4 L -4 -2 L 6 -22 L 12 -22 L 8 -2 L 22 2 L 26 -6 L 30 -6 L 28 6 L 30 18 L 26 18 L 22 10 L 8 14 L 12 34 L 6 34 L -4 14 L -24 8 Z';

export const V58WhichOne: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const hot = toneBig(tone);
  const tap = Math.max(base + 6, cueFrame(ctx, p.tapAt ?? 0) + 8);
  const pinF = Math.max(tap + 16, cueFrame(ctx, p.pinAt ?? 1));
  const offF = Math.max(pinF + 12, cueFrame(ctx, p.offAt ?? 2));

  const show = spr(frame, e, 'enter');
  const press = prog(frame, tap - 4, 4, ease.camera) * (1 - prog(frame, tap, 8, ease.camera));
  const ring = prog(frame, tap, 22, ease.camera);
  const line = prog(frame, tap + 4, 14, ease.drawOn);
  const drop = spr(frame, pinF, 'land');
  const pick = prog(frame, pinF, 10, ease.camera);
  const off = spr(frame, offF, 'tap');
  const push = lerp(1.12, 1.18, prog(frame, e, ctx.dur, ease.camera));
  const cx = BAY_X + BAY_W * PICK + BAY_W / 2;

  const bays = [];
  for (let i = 0; i < BAYS; i++) {
    const x0 = BAY_X + BAY_W * i;
    const me = i === PICK;
    const stroke = me ? (pick > 0 ? hot : C.ink2) : C.ink2;
    const fade = me ? 1 : 1 - 0.55 * off;
    bays.push(
      <g key={i} opacity={fade}>
        <rect x={x0 + 30} y={BAY_TOP + 45} width={90} height={160} rx={24} fill={C.surface} stroke={stroke} strokeWidth={me ? 2 + 0.6 * pick : 2} />
        <path d={`M ${x0 + 40} ${BAY_TOP + 95} Q ${x0 + 75} ${BAY_TOP + 82} ${x0 + 110} ${BAY_TOP + 95}`} fill="none" stroke={stroke} strokeWidth={1.6} />
        <path d={`M ${x0 + 42} ${BAY_TOP + 168} Q ${x0 + 75} ${BAY_TOP + 178} ${x0 + 108} ${BAY_TOP + 168}`} fill="none" stroke={stroke} strokeWidth={1.6} />
        <line x1={x0 + 30} y1={BAY_TOP + 112} x2={x0 + 120} y2={BAY_TOP + 112} stroke={rgba(stroke, 0.5)} strokeWidth={1.2} />
      </g>,
    );
  }
  const seps = [];
  for (let i = 0; i <= BAYS; i++) {
    const x = BAY_X + BAY_W * i;
    seps.push(<line key={i} x1={x} y1={BAY_TOP} x2={x} y2={BAY_BOT} stroke={C.rule} strokeWidth={2} />);
  }

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`, opacity: show}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the airplane switch, top centre */}
          <g transform="translate(455 470)" opacity={0.35 + 0.65 * off}>
            <path d={PLANE} fill={off > 0.5 ? C.ink : C.ink2} transform="translate(0 -6) scale(1.1)" />
          </g>
          <rect x={525} y={440} width={120} height={64} rx={32} fill={off > 0.02 ? rgba(hot, off) : 'none'} stroke={off > 0.5 ? hot : C.rule} strokeWidth={2} />
          <rect x={525} y={440} width={120} height={64} rx={32} fill="none" stroke={C.rule} strokeWidth={2} opacity={1 - off} />
          <circle cx={557 + 56 * off} cy={472} r={25} fill={C.surface} stroke={C.rule} strokeWidth={1.5} />
          {/* the car park row */}
          <line x1={BAY_X} y1={BAY_TOP} x2={BAY_X + BAY_W * BAYS} y2={BAY_TOP} stroke={C.rule} strokeWidth={2} />
          {seps}
          {bays}
          {/* the line from the button to the bay */}
          <line x1={cx} y1={BTN_Y - BTN_R - 8} x2={cx} y2={lerp(BTN_Y - BTN_R - 8, BAY_BOT + 10, line)} stroke={hot} strokeWidth={2.2} strokeDasharray="6 8" opacity={line > 0 ? 1 : 0} />
          {/* the pin */}
          {frame >= pinF ? (
            <g transform={`translate(${cx} ${lerp(BAY_TOP - 120, BAY_TOP + 125, drop)})`}>
              <path d={PIN} fill={hot} />
              <circle cx={0} cy={-52} r={9} fill={C.surface} />
            </g>
          ) : null}
          {frame >= pinF ? <ellipse cx={cx} cy={BAY_TOP + 125} rx={14 + 30 * pick} ry={6 + 10 * pick} fill="none" stroke={hot} strokeWidth={1.6} opacity={(1 - pick) * 0.9} /> : null}
          {/* the button */}
          <circle cx={cx} cy={BTN_Y} r={BTN_R + 86 * ring} fill="none" stroke={hot} strokeWidth={2} opacity={frame >= tap ? (1 - ring) * 0.8 : 0} />
          <g transform={`translate(${cx} ${BTN_Y}) scale(${1 - 0.06 * press})`}>
            <circle cx={0} cy={0} r={BTN_R} fill={C.surface} stroke={frame >= tap ? hot : C.ink} strokeWidth={2.5} />
            <circle cx={0} cy={0} r={BTN_R - 14} fill="none" stroke={C.rule} strokeWidth={1.5} />
            <circle cx={0} cy={0} r={34} fill={rgba(C.shade, 0.16 * press)} />
          </g>
        </svg>
        <div className={TXT} style={{position: 'absolute', left: cx - 60, width: 120, top: BTN_Y - 46, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 76, lineHeight: '92px', color: frame >= tap ? hot : C.ink, transform: `scale(${1 - 0.06 * press})`}}>
          P
        </div>
      </div>
      <Sfx name="asmr-tap" at={tap} volume={0.5} />
      <Haptic kind="light" at={tap} />
      <Sfx name="asmr-pencil-short" at={tap + 4} volume={0.35} />
      <Sfx name="asmr-pop" at={pinF + 8} volume={0.5} />
      <Haptic kind="light" at={pinF + 8} />
      <Sfx name="asmr-key" at={offF} volume={0.45} />
      <Haptic kind="light" at={offF} />
    </PictureBand>
  );
};
