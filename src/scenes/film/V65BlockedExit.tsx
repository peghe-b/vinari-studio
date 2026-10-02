// V65BlockedExit: a parking lot from above. A car parks across your exit; your gaze sweeps the empty bays
// (question marks, nobody there), then the camera dives onto the blocker's windshield, where a QR card waits,
// and a scan frame locks onto it.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneLine} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  lookAt?: number | string; // chunk where the gaze starts searching
  cardAt?: number | string; // chunk where the camera dives onto the card
  lockAt?: number | string; // chunk where the scan frame locks on
};

// a 9 x 9 code, read row by row (1 = a dark module); three finder corners
const CODE = [
  '111010111',
  '101001101',
  '111011111',
  '000110000',
  '101101011',
  '010010110',
  '111001010',
  '101110101',
  '111010011',
];
// the empty bays of the upper row: x of each bay's centre, and which ones get a "?"
const BAYS = [205, 335, 465, 595, 725, 855];
const ASK = [0, 2, 4, 5];
// the blocker (horizontal, nose to the right) and its card on the windshield
const BX = 540;
const BY = 760;
const CARD_X = 600;
const CARD_Y = 742;

/** A car seen from above, centred on (0, 0), nose up, len along y. */
const CarTop: React.FC<{len: number; wid: number; stroke: string; sw: number; glass: string}> = ({len, wid, stroke, sw, glass}) => {
  const h = len / 2;
  const w = wid / 2;
  return (
    <g fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <rect x={-w} y={-h} width={wid} height={len} rx={wid * 0.32} />
      {/* windshield, roof, rear glass */}
      <path d={`M ${-w + 10} ${-h * 0.42} Q 0 ${-h * 0.56} ${w - 10} ${-h * 0.42} L ${w - 16} ${-h * 0.14} L ${-w + 16} ${-h * 0.14} Z`} stroke={glass} />
      <rect x={-w + 16} y={-h * 0.14} width={wid - 32} height={h * 0.62} rx={8} />
      <path d={`M ${-w + 16} ${h * 0.48} L ${w - 16} ${h * 0.48} L ${w - 10} ${h * 0.7} Q 0 ${h * 0.78} ${-w + 10} ${h * 0.7} Z`} stroke={glass} />
      {/* mirrors */}
      <path d={`M ${-w} ${-h * 0.36} l -12 4 M ${w} ${-h * 0.36} l 12 4`} />
      {/* lamps */}
      <path d={`M ${-w + 12} ${-h + 6} h 20 M ${w - 12} ${-h + 6} h -20 M ${-w + 12} ${h - 6} h 18 M ${w - 12} ${h - 6} h -18`} />
    </g>
  );
};

export const V65BlockedExit: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const look = Math.max(base + 6, cueFrame(ctx, p.lookAt ?? 1));
  const dive = Math.max(look + 20, cueFrame(ctx, p.cardAt ?? 2));
  const lock = Math.max(dive + 26, cueFrame(ctx, p.lockAt ?? 3));

  const draw = prog(frame, e, 22, ease.drawOn);
  // the blocker rolls in across the exit on the cut, then settles
  const roll = spr(frame, e - 4, 'land');
  const bx = lerp(BX - 520, BX, roll);
  // the gaze: a cone from your car sweeping left and right over the bays
  const g = prog(frame, look, 46, ease.camera);
  const gazeOn = prog(frame, look, 8) * (1 - prog(frame, dive, 10));
  const ang = Math.sin(g * Math.PI * 1.5) * 52;
  // the dive onto the card, and the slow drift before it
  const d = prog(frame, dive, 30, ease.camera);
  const drift = lerp(1, 1.04, prog(frame, e, Math.max(1, dive - e), ease.camera));
  const zoom = drift * lerp(1, 3.1, d);
  const ox = lerp(540, CARD_X, d);
  const oy = lerp(L.contentMid, CARD_Y, d);
  const tx = (540 - ox) * d;
  const ty = (L.contentMid - oy) * d;
  // the blocker is red (it costs you the exit) until the card takes over
  const blockerTone = rgba(toneLine('down'), 1 - 0.75 * d);
  const glint = prog(frame, dive + 18, 14) * (1 - prog(frame, dive + 32, 16));
  const locked = spr(frame, lock, 'land');
  const sweep = prog(frame, lock + 6, 22, ease.camera);

  const mod = 3.4; // one module of the card, in stage units before the zoom
  const cw = mod * 11;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: `${ox}px ${oy}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the lot: the upper row of bays, the lane, your bay */}
          <g stroke={C.rule} strokeWidth={2} opacity={draw}>
            {[140, 270, 400, 530, 660, 790, 920].map((x) => (
              <line key={x} x1={x} y1={420} x2={x} y2={600} />
            ))}
            <line x1={140} y1={420} x2={920} y2={420} />
            <line x1={120} y1={650} x2={960} y2={650} strokeDasharray="18 16" />
            <line x1={120} y1={870} x2={960} y2={870} strokeDasharray="18 16" />
            {[400, 680].map((x) => (
              <line key={x} x1={x} y1={920} x2={x} y2={1290} />
            ))}
            <line x1={400} y1={1290} x2={680} y2={1290} />
          </g>
          {/* the way out, an arrow along the lane */}
          <path d="M 790 760 h 120 m -22 -18 l 22 18 l -22 18" fill="none" stroke={C.ink3} strokeWidth={2.4} strokeLinecap="round" opacity={draw * (1 - d)} />
          {/* the gaze cone */}
          <g transform={`translate(540 1060) rotate(${ang})`} opacity={gazeOn * 0.9}>
            <path d="M 0 0 L -120 -560 A 573 573 0 0 1 120 -560 Z" fill={rgba(C.ink, 0.06)} stroke={rgba(C.ink, 0.3)} strokeWidth={1.5} strokeDasharray="6 10" />
          </g>
          {/* your car, nose up, boxed in */}
          <g transform="translate(540 1100)" opacity={draw}>
            <CarTop len={290} wid={136} stroke={C.ink} sw={2.4} glass={C.ink2} />
          </g>
          {/* the blocker, across the lane */}
          <g transform={`translate(${bx} ${BY}) rotate(90)`}>
            <CarTop len={290} wid={136} stroke={blockerTone} sw={2.6} glass={blockerTone} />
          </g>
          {/* the card on its windshield */}
          <g transform={`translate(${CARD_X - cw / 2 + (bx - BX)} ${CARD_Y - cw / 2})`}>
            <rect x={0} y={0} width={cw} height={cw} rx={2} fill={C.surface} stroke={C.ink} strokeWidth={0.8} />
            {CODE.map((row, r) =>
              row.split('').map((b, c) =>
                b === '1' ? <rect key={`${r}-${c}`} x={mod + c * mod} y={mod + r * mod} width={mod} height={mod} fill={C.ink} /> : null,
              ),
            )}
            {/* a glint across it as the camera arrives */}
            <rect x={-cw * 0.5 + cw * 2 * glint} y={-4} width={cw * 0.22} height={cw + 8} fill={rgba(C.surface, 0.7 * Math.sin(glint * Math.PI))} transform={`skewX(-20)`} />
          </g>
          {/* the scan frame locks onto the card */}
          <g transform={`translate(${CARD_X} ${CARD_Y}) scale(${lerp(1.7, 1, locked)})`} opacity={prog(frame, lock, 6)} fill="none" stroke={toneBig('up')} strokeWidth={1.1} strokeLinecap="round">
            {[
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ].map(([sx, sy], i) => (
              <path key={i} d={`M ${sx * 30} ${sy * 30 - sy * 10} L ${sx * 30} ${sy * 30} L ${sx * 30 - sx * 10} ${sy * 30}`} />
            ))}
            <line x1={-26} x2={26} y1={lerp(-24, 24, sweep)} y2={lerp(-24, 24, sweep)} strokeWidth={0.8} opacity={1 - prog(frame, lock + 28, 8)} />
          </g>
        </svg>
        {/* nobody in the bays: question marks pop in under the gaze */}
        {ASK.map((b, i) => {
          const at = look + 6 + i * 9;
          const s = spr(frame, at, 'tap');
          return (
            <div key={b} className={TXT} style={{position: 'absolute', left: BAYS[+b] - 40, width: 80, top: 470, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 64, color: C.ink2, opacity: s * (1 - d), transform: `scale(${0.6 + 0.4 * s})`}}>
              ?
            </div>
          );
        })}
      </div>
      <Sfx name="asmr-air-long" at={base + 2} volume={0.3} />
      {ASK.map((b, i) => (
        <Sfx key={b} name="asmr-pop" at={look + 6 + i * 9} volume={0.32 + 0.03 * i} />
      ))}
      <Sfx name="asmr-air-long" at={dive} volume={0.4} />
      <Sfx name="asmr-camera" at={lock} volume={0.45} />
      <Haptic kind="light" at={dive + 24} />
      <Haptic kind="light" at={lock} />
    </PictureBand>
  );
};
