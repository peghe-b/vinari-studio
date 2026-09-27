// V26AlarmCinema: the car from above on a night street, its alarm going off as rings of sound. On the chunk `at` the
// camera pulls back over the block: the rings fade out long before they reach the cinema where you sit.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneLine} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  at?: number | string; // chunk (or "1.2s") where the camera pulls back
  place?: string; // the label over the far block
  you?: string; // the label by your seat
};

// the world, in units around the car (the car sits at 0, 0, its nose up)
const BLOCKS = [
  [-560, -760, 400, 560],
  [-560, -140, 400, 380],
  [-560, 300, 400, 420],
  [160, -760, 400, 520],
  [160, -180, 400, 420],
  [160, 300, 400, 420],
];
const CINEMA = [160, -760, 400, 520]; // the block where you sit
const SEAT = [380, -460]; // your seat, world units
const RMAX = 300; // the rings die here, long before the cinema
const PERIOD = 15; // frames between two rings
const LIFE = 48; // frames a ring lives

export const V26AlarmCinema: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = Math.max(0, lead(ctx));
  const back = Math.max(base + 14, cueFrame(ctx, p.at ?? 1));
  const pull = prog(frame, back - 16, 30, ease.camera);
  const late = prog(frame, back + 2, 16, ease.camera);
  const seen = spr(frame, back + 16, 'land');
  // the camera: close on the car, then back over the block and a little up, towards the cinema
  const s = lerp(1.55, 0.66, pull) * lerp(1, 1.03, prog(frame, e, ctx.dur, ease.camera));
  const cx = 540 - lerp(0, 150, pull) * s;
  const cy = L.contentMid + lerp(40, 250, pull) * s;
  const sx = (wx: number) => cx + wx * s;
  const sy = (wy: number) => cy + wy * s;

  // the alarm: rings keep leaving the car, each one fading as it grows
  const rings: React.ReactNode[] = [];
  for (let k = 0; k < 5; k++) {
    const age = ((frame + 200 + k * PERIOD) % (PERIOD * 5)) / LIFE;
    if (age > 1) continue;
    const r = 70 + (RMAX - 70) * ease.camera(age);
    rings.push(<circle key={k} cx={0} cy={0} r={r} fill="none" stroke={toneLine('down')} strokeWidth={2.2 / s} opacity={(1 - age) * 0.8} />);
  }
  const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos((frame / 16) * Math.PI * 2));
  const edge = RMAX;

  const place = mtav(p.place ?? 'კინო');
  const you = mtav(p.you ?? 'შენ');
  const size = Math.min(44, Math.floor((44 * 240) / Math.max(1, textWidth(place, `600 44px ${F.sans}`))));
  const px = sx(CINEMA[0] + CINEMA[2] / 2);
  const py = sy(CINEMA[1]) - 58;

  return (
    <PictureBand>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${cx} ${cy}) scale(${s})`}>
          {/* the streets: the blocks around the car */}
          {BLOCKS.map((b, i) => (
            <rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx={18} fill="none" stroke={C.rule} strokeWidth={1.8 / s} opacity={0.9} />
          ))}
          {/* the cinema: a screen and rows of seats, lit once the camera is back */}
          <g opacity={late}>
            <rect x={CINEMA[0]} y={CINEMA[1]} width={CINEMA[2]} height={CINEMA[3]} rx={18} fill={rgba(C.ink, 0.04)} stroke={C.ink} strokeWidth={2 / s} />
            <line x1={CINEMA[0] + 70} y1={CINEMA[1] + 60} x2={CINEMA[0] + 330} y2={CINEMA[1] + 60} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
            {[0, 1, 2, 3, 4].map((row) =>
              [0, 1, 2, 3, 4, 5, 6].map((col) => (row === 2 || row === 3) && col < 4 ? null : (
                <circle key={row * 10 + col} cx={CINEMA[0] + 80 + col * 40} cy={CINEMA[1] + 150 + row * 60} r={7} fill={rgba(C.ink, 0.28)} />
              )),
            )}
            <circle cx={SEAT[0]} cy={SEAT[1]} r={11 + 3 * seen} fill={C.ink} />
            <circle cx={SEAT[0]} cy={SEAT[1]} r={22 + 30 * seen} fill="none" stroke={C.ink} strokeWidth={1.6 / s} opacity={(1 - seen) * 0.8} />
          </g>
          {/* where the sound gives up */}
          <circle cx={0} cy={0} r={edge} fill="none" stroke={C.ink2} strokeWidth={1.5 / s} strokeDasharray={`${8 / s} ${10 / s}`} opacity={late * 0.7} />
          {rings}
          {/* the car from above, the card on its windshield */}
          <g>
            <rect x={-56} y={-118} width={112} height={236} rx={36} fill={C.bg} stroke={C.ink} strokeWidth={2.4 / s} />
            <path d="M -44 -52 Q 0 -66 44 -52 L 38 -14 Q 0 -22 -38 -14 Z" fill="none" stroke={C.ink} strokeWidth={1.8 / s} />
            <path d="M -38 64 Q 0 58 38 64 L 42 88 Q 0 96 -42 88 Z" fill="none" stroke={C.ink} strokeWidth={1.8 / s} />
            <rect x={-38} y={-10} width={76} height={70} rx={10} fill="none" stroke={C.ink2} strokeWidth={1.4 / s} />
            <rect x={-68} y={-34} width={12} height={16} rx={4} fill="none" stroke={C.ink} strokeWidth={1.6 / s} />
            <rect x={56} y={-34} width={12} height={16} rx={4} fill="none" stroke={C.ink} strokeWidth={1.6 / s} />
            <rect x={12} y={-50} width={20} height={20} rx={2} fill={C.surface} stroke={C.ink} strokeWidth={1.4 / s} />
            <rect x={15} y={-47} width={6} height={6} fill={C.ink} />
            <rect x={23} y={-47} width={6} height={6} fill={C.ink} />
            <rect x={15} y={-39} width={6} height={6} fill={C.ink} />
            <rect x={24} y={-38} width={4} height={4} fill={C.ink} />
            {[
              [-44, -108],
              [44, -108],
              [-44, 108],
              [44, 108],
            ].map((q, i) => (
              <circle key={i} cx={q[0]} cy={q[1]} r={8} fill={toneBig('down')} opacity={blink} />
            ))}
          </g>
        </g>
      </svg>
      <div className={TXT} style={{position: 'absolute', left: px - 200, width: 400, top: py - size, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: size, color: C.ink, opacity: late}}>
        {place}
      </div>
      <div className={TXT} style={{position: 'absolute', left: sx(SEAT[0]) - 150, width: 130, top: sy(SEAT[1]) - 22, textAlign: 'right', fontFamily: F.sans, fontWeight: 600, fontSize: 34, color: C.ink, opacity: seen, transform: `translateX(${(1 - seen) * 12}px)`}}>
        {you}
      </div>
      <Sfx name="asmr-knock" at={base + 2} volume={0.35} />
      <Sfx name="asmr-knock" at={base + 17} volume={0.3} />
      <Sfx name="asmr-air-long" at={back - 16} volume={0.35} />
      <Sfx name="asmr-pop" at={back + 16} volume={0.45} />
      <Haptic kind="light" at={back + 16} />
    </PictureBand>
  );
};
