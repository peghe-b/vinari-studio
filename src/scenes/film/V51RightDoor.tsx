// V51RightDoor: a row of 11 workshop doors. The camera pulls back to show all 11, three answers roll the
// shutters down in waves (11 -> 7 -> 3 -> 1), and the camera pushes in on the one door left open.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  countAt?: number | string; // chunk: the camera pulls back and the count 11 appears
  hopAt?: number | string; // chunk: a light hops from door to door (which one?)
  askAt?: number | string; // chunk: the three answers start closing shutters
  label?: string; // the mechanic on the door that stays open
  unit?: string; // the small word under the count
};

const N = 11;
const DW = 150; // door width, world units
const DH = 400; // door height
const PITCH = 176;
const ROW = N * PITCH - (PITCH - DW); // 1910
const KEEP = 6; // the door that stays open
// which wave (0, 1, 2) closes each door; the kept one never closes
const WAVE = [0, 1, 2, 0, 1, 0, -1, 2, 1, 0, 1];
const LEFT = [11, 7, 3, 1];
const HOPS = [2, 8, 4, 9, 1, 6, 10, 3, 7, 5];

export const V51RightDoor: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = ctx.index === 0 ? 1 : prog(frame, e, 22, ease.drawOn);
  const countF = Math.max(base + 8, cueFrame(ctx, p.countAt ?? 1));
  const hopF = Math.max(countF + 16, cueFrame(ctx, p.hopAt ?? 2));
  const askF = Math.max(hopF + 20, cueFrame(ctx, p.askAt ?? 3));
  const waveAt = (w: number) => askF + 6 + 14 * w;
  const pushF = askF + 44;

  // the camera: close on the first doors, pull back to all 11, push in on the kept door
  const keepX = KEEP * PITCH + DW / 2;
  const pull = prog(frame, countF, 26, ease.camera);
  const push = prog(frame, pushF, 34, ease.camera);
  const sA = 0.95;
  const sB = 840 / ROW;
  const sC = 1.1;
  const cxA = 470 + 50 * prog(frame, e, Math.max(1, countF - e), ease.camera);
  const s = push > 0 ? lerp(sB, sC, push) : lerp(sA, sB, pull);
  const cx = push > 0 ? lerp(ROW / 2, keepX, push) : lerp(cxA, ROW / 2, pull);
  const midY = L.contentMid + 40;
  const wy = DH / 2 - 20; // the world y that sits on midY
  const X = (x: number) => 540 + (x - cx) * s;
  const Y = (y: number) => midY + (y - wy) * s;

  // how many doors are still open, and how far each shutter is down
  const stage = frame >= waveAt(2) + 10 ? 3 : frame >= waveAt(1) + 10 ? 2 : frame >= waveAt(0) + 10 ? 1 : 0;
  const shut = (i: number) => {
    const w = WAVE[+i];
    return w < 0 ? 0 : prog(frame, waveAt(w) + (i % 3) * 3, 16, ease.camera);
  };
  const kept = prog(frame, waveAt(2) + 14, 20, ease.enter);
  const up = toneBig('up');
  // "which one?": before the questions a soft light hops from door to door, undecided
  const hops = Math.max(0, Math.min(HOPS.length - 1, Math.floor((frame - hopF) / 7)));
  const hopOn = frame >= hopF && frame < askF + 4 ? 1 : 0;
  const hopDoor = HOPS[+hops];

  const doors = [];
  for (let i = 0; i < N; i++) {
    const x0 = X(i * PITCH);
    const w = DW * s;
    const y0 = Y(0);
    const h = DH * s;
    const c = shut(i);
    const isKeep = i === KEEP;
    const slats = [];
    for (let k = 1; k * 24 < DH * c; k++) {
      slats.push(<line key={k} x1={x0} x2={x0 + w} y1={y0 + k * 24 * s} y2={y0 + k * 24 * s} stroke={C.rule} strokeWidth={1.2} />);
    }
    doors.push(
      <g key={i} opacity={draw}>
        {isKeep ? <rect x={x0} y={y0} width={w} height={h} fill={rgba(up, 0.16 * kept)} /> : null}
        {hopOn && i === hopDoor ? <rect x={x0} y={y0} width={w} height={h} fill={rgba(C.ink, 0.14)} /> : null}
        <rect x={x0} y={y0} width={w} height={h * c} fill={C.surface} />
        {slats}
        <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={isKeep ? (kept > 0 ? up : C.ink) : c > 0.99 ? C.ink2 : C.ink} strokeWidth={isKeep ? 2 + kept : 2} />
        <rect x={x0 + w * 0.12} y={Y(-74)} width={w * 0.76} height={40 * s} rx={4 * s} fill="none" stroke={isKeep && kept > 0 ? up : C.ink2} strokeWidth={1.5} />
      </g>,
    );
  }

  const numbersOn = 1 - pull + push;
  const label = mtav(p.label ?? 'ხოდოვოი');
  const lSize = Math.min(64, Math.floor((64 * 560) / Math.max(1, textWidth(label, `600 64px ${F.sans}`))));
  const n = LEFT[+stage];
  const countOn = prog(frame, countF, 14, ease.enter);
  const unit = mtav(p.unit ?? 'ხელოსნის ტიპი');

  return (
    <>
      <PictureBand>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={X(-60)} x2={X(ROW + 60)} y1={Y(DH)} y2={Y(DH)} stroke={C.ink2} strokeWidth={1.5} opacity={draw} />
          <line x1={X(-60)} x2={X(ROW + 60)} y1={Y(-100)} y2={Y(-100)} stroke={C.rule} strokeWidth={1.5} opacity={draw} />
          {doors}
        </svg>
        {Array.from({length: N}, (_, i) => (
          <div key={i} className={TXT} style={{position: 'absolute', left: X(i * PITCH), width: DW * s, top: Y(-74), height: 40 * s, lineHeight: `${40 * s}px`, textAlign: 'center', fontFamily: F.mono, fontSize: 22 * s, color: C.ink2, opacity: Math.max(0, Math.min(1, numbersOn)) * draw}}>
            {String(i + 1).padStart(2, '0')}
          </div>
        ))}
      </PictureBand>
      {/* the three answers, top left */}
      <div style={{position: 'absolute', left: 120, top: 420, display: 'flex', gap: 18}}>
        {[0, 1, 2].map((k) => {
          const on = prog(frame, askF + k * 4, 12, ease.enter);
          const done = prog(frame, waveAt(k) + 8, 8, ease.enter);
          return (
            <div key={k} className={TXT} style={{width: 56, height: 56, borderRadius: 28, border: `2px solid ${C.ink}`, backgroundColor: rgba(C.ink, done), color: done > 0.5 ? C.bg : C.ink, fontFamily: F.mono, fontSize: 26, lineHeight: '52px', textAlign: 'center', opacity: on, transform: `translateY(${(1 - on) * 10}px)`}}>
              {k + 1}
            </div>
          );
        })}
      </div>
      {/* the count, top right */}
      <div className={TXT} style={{position: 'absolute', right: 120, top: 395, textAlign: 'right', opacity: countOn, transform: `translateY(${(1 - countOn) * 12}px)`}}>
        <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 96, lineHeight: '100px', color: stage === 3 ? up : C.ink}}>{n}</div>
        <div style={{fontFamily: F.sans, fontSize: 28, color: C.ink2}}>{unit}</div>
      </div>
      {/* the mechanic on the kept door */}
      <div className={TXT} style={{position: 'absolute', left: 120, width: 840, top: Y(DH) + 34, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: lSize, color: up, opacity: push, transform: `translateY(${(1 - push) * 16}px)`}}>
        {label}
      </div>
      <Sfx name="asmr-pencil-short" at={Math.max(0, base + 2)} volume={0.35} />
      <Sfx name="asmr-air-long" at={countF} volume={0.3} />
      <Land at={countF + 12} volume={0.4} />
      {[0, 1, 2, 3, 4].map((j) => (
        <Sfx key={`h${j}`} name="asmr-tick-fine" at={hopF + j * 7} volume={0.3} />
      ))}
      {[0, 1, 2].map((k) => (
        <React.Fragment key={k}>
          <Sfx name="asmr-flap-roll" at={waveAt(k)} volume={0.3} />
          <Haptic kind="light" at={waveAt(k) + 10} />
        </React.Fragment>
      ))}
      <Sfx name="asmr-pop" at={pushF + 6} volume={0.45} />
      <Land at={pushF + 20} />
    </>
  );
};
