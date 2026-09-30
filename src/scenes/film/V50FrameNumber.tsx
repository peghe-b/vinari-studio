// src/scenes/film/V50FrameNumber.tsx: a Japanese car's frame number. Seventeen empty VIN slots wait at the top; a
// soft light searches them and finds nothing, a hairline strikes them out, then the light drops to a stamped steel
// plate below and reads its frame number character by character; the plate lands with a green outline.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, toneLine, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {capsLatin} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  code?: string; // the stamped frame number
  slotsLabel?: string; // the mono label over the slots
  plateLabel?: string; // the mono label under the plate
  searchAt?: number | string; // the light searches the slots
  strikeAt?: number | string; // the slots are struck out
  readAt?: number | string; // the light reads the plate
  tone?: Tone;
};

const SLOTS = 17;
const SW = 40; // slot width
const SG = 8; // slot gap
const ROW_X = 540 - (SLOTS * SW + (SLOTS - 1) * SG) / 2;
const ROW_Y = 610; // slots' top
const SH = 56;
const PX = 150; // plate
const PW = 780;
const PY = 810;
const PH = 300;

export const V50FrameNumber: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const code = capsLatin(p.code ?? 'GRX130-6012345');
  const tone = p.tone ?? 'up';
  const search = Math.max(base + 6, cueFrame(ctx, p.searchAt ?? 1));
  const strike = Math.max(search + 20, cueFrame(ctx, p.strikeAt ?? 2));
  const read = Math.max(strike + 16, cueFrame(ctx, p.readAt ?? 3));
  const readDur = 26;
  const landF = read + readDur + 2;

  const enter = spr(frame, e, 'enter');
  const sweep = prog(frame, search, 30, ease.camera); // over the slots
  const struck = prog(frame, strike, 16, ease.drawOn);
  const drop = prog(frame, strike + 4, 16, ease.camera); // the light drops to the plate
  const scan = prog(frame, read, readDur, ease.camera);
  const land = spr(frame, landF, 'land');
  const push = lerp(1, 1.07, prog(frame, e, ctx.dur, ease.camera));

  // the light: a soft vertical band, first on the slot row, then on the plate
  const beamOn = frame >= search ? (frame < strike ? 1 : 1 - prog(frame, strike, 8)) : 0;
  const beamX = lerp(ROW_X - 40, ROW_X + SLOTS * (SW + SG) + 20, sweep);
  const plateBeamOn = frame >= read ? 1 - prog(frame, read + readDur - 4, 10) : 0;
  const plateBeamX = lerp(PX - 20, PX + PW + 20, scan);

  // the stamped characters
  const size0 = 76;
  const cw = textWidth(code, `500 ${size0}px ${F.mono}`);
  const size = Math.min(size0, Math.floor((size0 * (PW - 120)) / Math.max(1, cw)));
  const w = textWidth(code, `500 ${size}px ${F.mono}`);
  const chars = code.split('');
  const charW = w / Math.max(1, chars.length);
  const codeX = 540 - w / 2;

  const slotsLabel = capsLatin(p.slotsLabel ?? 'VIN · 17');
  const plateLabel = capsLatin(p.plateLabel ?? 'FRAME No.');
  const plateY = PY + (1 - enter) * 30;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${PY + PH / 2}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="v50beam" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={C.ink} stopOpacity={0} />
              <stop offset="0.5" stopColor={C.ink} stopOpacity={0.1} />
              <stop offset="1" stopColor={C.ink} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* the seventeen slots */}
          {Array.from({length: SLOTS}, (_, i) => {
            const x = ROW_X + i * (SW + SG);
            const lit = frame >= search && frame < strike ? Math.max(0, 1 - Math.abs(beamX - (x + SW / 2)) / 70) : 0;
            const a = prog(frame, e + i, 12);
            return (
              <rect key={i} x={x} y={ROW_Y} width={SW} height={SH} rx={8} fill={C.surface} stroke={lit > 0.1 ? C.ink2 : C.rule} strokeWidth={1.6 + lit} opacity={a * lerp(1, 0.4, struck)} />
            );
          })}
          <rect x={beamX - 60} y={ROW_Y - 20} width={120} height={SH + 40} fill="url(#v50beam)" opacity={beamOn} />
          <line x1={ROW_X - 14} y1={ROW_Y + SH / 2} x2={lerp(ROW_X - 14, ROW_X + SLOTS * (SW + SG) + 6, struck)} y2={ROW_Y + SH / 2} stroke={C.ink2} strokeWidth={2.2} strokeLinecap="round" opacity={struck > 0 ? 1 : 0} />
          {/* the light dropping from the row to the plate */}
          <line x1={540} y1={ROW_Y + SH + 20} x2={540} y2={lerp(ROW_Y + SH + 20, PY - 16, drop)} stroke={C.rule} strokeWidth={1.5} strokeDasharray="4 8" opacity={drop > 0 && frame < read + 10 ? 1 - prog(frame, read, 10) : 0} />
          {/* the steel plate */}
          <g opacity={enter} transform={`translate(0 ${plateY - PY})`}>
            <rect x={PX} y={PY} width={PW} height={PH} rx={22} fill={C.surface} stroke={C.ink2} strokeWidth={2} />
            <rect x={PX + 18} y={PY + 18} width={PW - 36} height={PH - 36} rx={14} fill="none" stroke={C.rule} strokeWidth={1.2} />
            {[
              [PX + 36, PY + 36],
              [PX + PW - 36, PY + 36],
              [PX + 36, PY + PH - 36],
              [PX + PW - 36, PY + PH - 36],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r={9} fill="none" stroke={C.ink2} strokeWidth={1.6} />
                <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke={C.ink2} strokeWidth={1.4} />
              </g>
            ))}
            <rect x={plateBeamX - 70} y={PY + 6} width={140} height={PH - 12} fill="url(#v50beam)" opacity={plateBeamOn} />
            <rect x={PX - 10} y={PY - 10} width={PW + 20} height={PH + 20} rx={30} fill="none" stroke={toneLine(tone)} strokeWidth={2.4} strokeDasharray={2 * (PW + PH) + 60} strokeDashoffset={(2 * (PW + PH) + 60) * (1 - land)} opacity={frame >= landF ? 1 : 0} />
          </g>
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 0, width: 1080, top: ROW_Y - 58, textAlign: 'center', fontFamily: F.mono, fontSize: 26, letterSpacing: 3, color: C.ink2, opacity: prog(frame, e, 14) * lerp(1, 0.5, struck)}}>
          {slotsLabel}
        </div>
        <div className={TXT} style={{position: 'absolute', left: codeX, top: plateY + PH / 2 - size * 0.62, height: size * 1.24, whiteSpace: 'nowrap', fontFamily: F.mono, fontWeight: 500, fontSize: size, lineHeight: `${size * 1.24}px`, opacity: enter}}>
          {chars.map((ch, i) => {
            const cx = codeX + (i + 0.5) * charW;
            const passed = frame >= read ? Math.min(1, Math.max(0, (plateBeamX - cx + 30) / 60)) : 0;
            return (
              <span key={i} style={{display: 'inline-block', width: charW, textAlign: 'center', color: passed > 0.5 ? C.ink : C.ink3, opacity: lerp(0.45, 1, passed)}}>
                {ch}
              </span>
            );
          })}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 0, width: 1080, top: plateY + PH + 36, textAlign: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: 3, color: C.ink2, opacity: land, transform: `translateY(${(1 - land) * 14}px)`}}>
          {plateLabel}
        </div>
      </div>
      <Sfx name="asmr-air-long" at={search} volume={0.3} />
      <Sfx name="asmr-strike" at={strike} volume={0.4} />
      <Sfx name="asmr-key-roll" at={read} volume={0.35} len={readDur} />
      <Land at={landF} />
      <Haptic kind="success" at={landF + 2} />
    </PictureBand>
  );
};
