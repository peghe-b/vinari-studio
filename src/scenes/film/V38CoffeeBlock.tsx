// V38CoffeeBlock: a courtyard seen from above. The neighbour's car waits inside, its way out draws down to the gate
// and stops dead on your car parked across it (chunk `at`); then the camera pulls back and finds, across the street,
// a café table with one cup: you (chunk `cafeAt`), and a small ripple in the cup as you sip (chunk `sipAt`).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import type {SceneCtx} from '../../types';

type P = {
  at?: number | string; // the neighbour's way out draws and hits your car
  cafeAt?: number | string; // the camera pulls back to the café
  sipAt?: number | string; // the cup ripples
};

// the world, in stage units
const WALL_L = 300;
const WALL_R = 620;
const GATE_Y = 960;
const KERB_A = 990;
const KERB_B = 1230;
const NB = {x: 460, y: 660, w: 130, h: 240}; // the neighbour's car, nose down
const YOU = {x: 460, y: 1110, w: 300, h: 124}; // your car, across the gate
const CAFE = {x: 900, y: 610};

/** A car from above: body, windscreen, rear window, four wheels. Vertical when w < h. */
const Car: React.FC<{x: number; y: number; w: number; h: number; stroke: string; fill: string; sw: number; op?: number}> = ({x, y, w, h, stroke, fill, sw, op = 1}) => {
  const vert = h > w;
  const L = vert ? h : w; // length
  const W = vert ? w : h; // width
  // draw a car pointing right in local units, then rotate for a vertical one (nose down)
  const r = W * 0.28;
  const ws = L * 0.16; // windscreen line from centre
  const rw = L * 0.24;
  const wheel = {l: L * 0.17, t: W * 0.1};
  const rot = vert ? 90 : 0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <rect key={`${sx}${sy}`} x={sx * L * 0.3 - wheel.l / 2} y={sy * (W / 2) - wheel.t / 2} width={wheel.l} height={wheel.t} rx={wheel.t / 2} fill={stroke} opacity={0.85} />
        )),
      )}
      <rect x={-L / 2} y={-W / 2} width={L} height={W} rx={r} fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d={`M ${ws} ${-W * 0.36} Q ${ws + L * 0.06} 0 ${ws} ${W * 0.36}`} fill="none" stroke={stroke} strokeWidth={sw * 0.8} />
      <path d={`M ${-rw} ${-W * 0.34} Q ${-rw - L * 0.04} 0 ${-rw} ${W * 0.34}`} fill="none" stroke={stroke} strokeWidth={sw * 0.8} />
      <line x1={-rw} y1={-W * 0.34} x2={ws} y2={-W * 0.36} stroke={stroke} strokeWidth={sw * 0.6} opacity={0.6} />
      <line x1={-rw} y1={W * 0.34} x2={ws} y2={W * 0.36} stroke={stroke} strokeWidth={sw * 0.6} opacity={0.6} />
    </g>
  );
};

export const V38CoffeeBlock: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.at ?? 1));
  const pull = Math.max(hit + 24, cueFrame(ctx, p.cafeAt ?? 2));
  const sip = Math.max(pull + 20, cueFrame(ctx, p.sipAt ?? 3));

  // the courtyard is already drawn on the first frame (the hook reads muted); a slow drift
  const draw = ctx.index === 0 ? 1 : prog(frame, e, 20, ease.drawOn);
  // the way out: draws from the neighbour's nose down to your car and stops
  const way = prog(frame, hit - 14, 16, ease.drawOn);
  const block = spr(frame, hit + 2, 'land');
  const blocked = frame >= hit + 2 ? 1 : 0;
  // the neighbour inches forward and stops
  const inch = frame >= hit - 14 ? 10 * prog(frame, hit - 14, 16, ease.camera) - 4 * block : 0;

  // the camera: close on the courtyard, then pulled back to take in the café across the street
  const k = prog(frame, pull, 30, ease.camera);
  const s = lerp(1.32, 0.9, k) * lerp(1, 1.03, prog(frame, e, ctx.dur, ease.camera));
  const cx = lerp(460, 640, k);
  const cy = lerp(860, 840, k);
  const cafeIn = spr(frame, pull + 12, 'enter');
  const ripple = prog(frame, sip, 26, ease.camera);
  const link = prog(frame, sip + 4, 22, ease.drawOn);

  const red = toneBig('down');
  const noseY = NB.y + NB.h / 2 + inch;
  const stopY = YOU.y - YOU.h / 2 - 16;
  const wayLen = stopY - noseY;
  // the dotted link from the cup to your car (a quarter curve)
  const linkD = `M ${CAFE.x - 40} ${CAFE.y + 40} Q ${CAFE.x - 60} ${YOU.y} ${YOU.x + YOU.w / 2 + 24} ${YOU.y}`;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${540 - cx}px, ${830 - cy}px) scale(${s})`, transformOrigin: `${cx}px ${cy}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g opacity={draw}>
            {/* the courtyard walls and the gate posts */}
            <line x1={WALL_L} y1={300} x2={WALL_L} y2={GATE_Y} stroke={C.ink} strokeWidth={2.2} />
            <line x1={WALL_R} y1={300} x2={WALL_R} y2={GATE_Y} stroke={C.ink} strokeWidth={2.2} />
            <line x1={WALL_L - 160} y1={GATE_Y} x2={WALL_L} y2={GATE_Y} stroke={C.ink} strokeWidth={2.2} />
            <line x1={WALL_R} y1={GATE_Y} x2={WALL_R + 120} y2={GATE_Y} stroke={C.ink} strokeWidth={2.2} />
            <rect x={WALL_L - 9} y={GATE_Y - 9} width={18} height={18} fill={C.ink} />
            <rect x={WALL_R - 9} y={GATE_Y - 9} width={18} height={18} fill={C.ink} />
            {/* the street: two kerbs and a centre dash */}
            <line x1={-400} y1={KERB_A} x2={WALL_L - 160} y2={KERB_A} stroke={C.rule} strokeWidth={1.6} />
            <line x1={WALL_R + 120} y1={KERB_A} x2={1500} y2={KERB_A} stroke={C.rule} strokeWidth={1.6} />
            <line x1={-400} y1={KERB_B} x2={1500} y2={KERB_B} stroke={C.rule} strokeWidth={1.6} />
            {/* the café across the street: a round table, two chairs, a cup on its saucer */}
            <g opacity={cafeIn} transform={`translate(${CAFE.x} ${CAFE.y})`}>
              <circle r={78} fill={C.surface} stroke={C.ink} strokeWidth={2} />
              <path d="M -70 -104 A 44 44 0 0 1 70 -104" fill="none" stroke={C.ink2} strokeWidth={2} transform="scale(0.8)" />
              <path d="M -70 104 A 44 44 0 0 0 70 104" fill="none" stroke={C.ink2} strokeWidth={2} transform="scale(0.8)" />
              <circle r={34} fill="none" stroke={C.ink2} strokeWidth={1.6} />
              <circle r={21} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
              <path d="M 21 -7 C 36 -7 36 7 21 7" fill="none" stroke={C.ink} strokeWidth={2.2} />
              <circle r={4 + 13 * ripple} fill="none" stroke={C.ink} strokeWidth={1.4} opacity={frame >= sip ? 1 - ripple : 0} />
              <circle r={4 + 8 * ripple} fill="none" stroke={C.ink} strokeWidth={1.2} opacity={frame >= sip ? (1 - ripple) * 0.7 : 0} />
            </g>
            {/* the neighbour's way out */}
            <line x1={NB.x} y1={noseY + 10} x2={NB.x} y2={noseY + 10 + Math.max(0, wayLen - 10) * way} stroke={blocked ? red : C.ink2} strokeWidth={2.2} strokeDasharray="10 12" />
            {/* the neighbour's car */}
            <Car x={NB.x} y={NB.y + inch} w={NB.w} h={NB.h} stroke={C.ink} fill={C.surface} sw={2.2} />
            {/* your car across the gate, and the stop where the way ends */}
            <Car x={YOU.x} y={YOU.y} w={YOU.w} h={YOU.h} stroke={C.ink} fill={C.surface} sw={2.4} />
            <Car x={YOU.x} y={YOU.y} w={YOU.w} h={YOU.h} stroke={red} fill="none" sw={2.6} op={block} />
            {/* the card on your dash, a small A4 */}
            <g transform={`translate(${YOU.x + 52} ${YOU.y - 16})`}>
              <rect width={22} height={30} fill={C.surface} stroke={C.ink} strokeWidth={1.4} />
              <rect x={4} y={5} width={6} height={6} fill={C.ink} />
              <rect x={12} y={5} width={6} height={6} fill={C.ink} />
              <rect x={4} y={14} width={6} height={6} fill={C.ink} />
              <rect x={13} y={15} width={4} height={4} fill={C.ink2} />
            </g>
            <g opacity={blocked} transform={`translate(${NB.x} ${stopY}) scale(${0.6 + 0.4 * block})`}>
              <line x1={-44} y1={0} x2={44} y2={0} stroke={red} strokeWidth={4} strokeLinecap="round" />
              <circle r={30 + 40 * block} fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={1.4} opacity={1 - block * 0.8} />
            </g>
            {/* you, at the table, and how far the car is */}
            <path d={linkD} fill="none" stroke={C.ink2} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" opacity={link} />
            <circle cx={YOU.x + YOU.w / 2 + 24} cy={YOU.y} r={6} fill={C.ink2} opacity={link} />
          </g>
        </svg>
      </div>
      <Sfx name="asmr-pencil-short" at={hit - 14} volume={0.35} />
      <Sfx name="asmr-knock" at={hit + 2} volume={0.5} />
      <Haptic kind="light" at={hit + 2} />
      <Sfx name="asmr-air-long" at={pull} volume={0.3} />
      <Sfx name="asmr-pop" at={sip} volume={0.4} />
      <Haptic kind="light" at={sip} />
    </PictureBand>
  );
};
