// src/scenes/film/V97CarTalks.tsx: v97-car-talks' own visual. "Plug in the adapter and the car talks to you in
// Georgian": a low close-up of the driver's footwell at night, the steering wheel's lower arc above, the OBD socket
// under the dash at knee height. A hand lifts the small adapter (the film's accent) into the socket, it clicks, its
// LED wakes, the hand drops away; on the key moment the instrument glow comes on behind the wheel and a speech bubble
// pops out of the dash with the car's first Georgian word (a prop from the spec).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, rgba, halo, accentsOn} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Hand} from '../illo/figure';
import {acc, accRamp, type Time} from '../illo/palette';
import {FOOT, IlloBand, Svg, TOP, timeOf} from '../illo/scene';
import {Solid, rr, circ, Glint} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  plugAt?: number | string; // the adapter clicks into the socket
  hitAt?: number | string; // the car speaks: the glow, the bubble, the word
  line?: string; // the car's word in the bubble, "*word*" punches
  time?: Time;
};

const SX = 540; // the socket's centre, under the wheel at knee height
const SY = 880;
const DASH = 800; // the dash's lower edge
const WX = 540; // the steering wheel's centre (its lower arc shows)
const WY = 380;
const WR = 330;

export const V97CarTalks: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const time = timeOf(p);
  const plug = Math.max(base + 8, cueFrame(ctx, p.plugAt ?? '0.5s'));
  const hit = Math.max(plug + 14, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const on = accentsOn();
  const bodyCol = on ? accRamp(acc('a'), 3) : C.il2;
  const bodyShade = on ? accRamp(acc('a'), 5) : C.il4;
  const led = on ? acc('b') : C.ink;

  // the adapter rises into the socket (a spring that seats with a tiny bounce), the hand lets go and drops away
  const rise = spr(frame, e - 6, 'land');
  const seat = prog(frame, plug - 10, 10, ease.inOut);
  const ay = SY + 260 - 120 * rise - 140 * seat + 4 * Math.sin(Math.min(1, Math.max(0, (frame - plug) / 8)) * Math.PI);
  const away = prog(frame, plug + 6, 18, ease.inOut);
  const handY = ay + 170 + 1300 * away;
  const ledOn = frame >= plug + 4 ? 0.55 + 0.45 * (Math.floor((frame - plug) / 5) % 2) : 0;
  const ledSteady = frame >= hit ? 1 : ledOn;
  const glow = prog(frame, hit - 4, 12, ease.out);
  const pop = spr(frame, hit, 'land');

  // the socket's 16 pins in two rows
  const pins: React.ReactNode[] = [];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 8; i++) {
      pins.push(<path key={`p${r}-${i}`} d={circ(SX - 56 + i * 16, SY - 10 + r * 22, 4.2)} fill={C.il3} />);
    }
  }

  return (
    <IlloBand uid={uid} time={time}>
      {/* far plane: the dash, the footwell, the instrument glow behind the wheel */}
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il7} />
          <path d={`M-200 ${TOP} H1280 V${DASH - 30} Q540 ${DASH + 40} -200 ${DASH - 30} Z`} fill={C.il6} />
          <path d={`M-200 ${DASH - 30} Q540 ${DASH + 40} 1280 ${DASH - 30}`} fill="none" stroke={rgba(C.ink, 0.12)} strokeWidth={2} />
          <ellipse cx={WX} cy={WY - 60} rx={300} ry={110} fill={halo(C.ink, 0.05 + 0.22 * glow)} />
        </Svg>
      </CameraLayer>
      {/* subject: the column, the socket, the adapter and the hand */}
      <CameraLayer depth={1}>
        <Svg>
          <Solid uid={uid} time={time} tone={6} rim d={`M${WX - 70} ${WY + 120} L${WX + 70} ${WY + 120} L${WX + 95} ${DASH - 10} L${WX - 95} ${DASH - 10} Z`} />
          {/* the socket: a dark trapezoid set into the lower dash */}
          <path d={rr(SX - 120, SY - 60, 240, 112, 22)} fill={C.il6} stroke={rgba(C.ink, 0.18)} strokeWidth={2} />
          <path d={`M${SX - 82} ${SY - 32} H${SX + 82} L${SX + 70} ${SY + 32} H${SX - 70} Z`} fill={C.ilNight} stroke={rgba(C.ink, 0.35)} strokeWidth={2} strokeLinejoin="round" />
          {pins}
          {/* the adapter: a small rounded box with its plug on top and an LED */}
          <g>
            <path d={`M${SX - 70} ${ay - 64} H${SX + 70} L${SX + 60} ${ay - 2} H${SX - 60} Z`} fill={C.il4} />
            <path d={rr(SX - 92, ay, 184, 150, 28)} fill={bodyCol} />
            <path d={rr(SX - 92, ay + 96, 184, 54, [0, 0, 28, 28])} fill={bodyShade} />
            <path d={rr(SX - 76, ay + 16, 152, 10, 5)} fill={rgba(C.ink, 0.18)} />
            <path d={circ(SX + 58, ay + 58, 9)} fill={ledSteady ? led : C.il5} opacity={ledSteady ? 0.4 + 0.6 * ledSteady : 1} />
            {ledSteady ? <path d={circ(SX + 58, ay + 58, 26)} fill={halo(led, 0.35 * ledSteady)} /> : null}
          </g>
          <Glint x={SX - 96} y={SY - 24} size={44} at={plug} frame={frame} color={C.ink} />
          <Hand uid={uid} frame={frame} time={time} x={SX + 30} y={handY} angle={172} scale={30} side="r" kind="grip" />
        </Svg>
      </CameraLayer>
      {/* foreground: the wheel's lower arc, close to the lens */}
      <CameraLayer depth={1.3}>
        <Svg>
          <circle cx={WX} cy={WY} r={WR} fill="none" stroke={C.il7} strokeWidth={58} />
          <circle cx={WX} cy={WY} r={WR + 22} fill="none" stroke={rgba(C.ink, 0.1 + 0.18 * glow)} strokeWidth={2} />
          <path d={`M${WX - 120} ${WY + 40} Q${WX} ${WY + 150} ${WX + 120} ${WY + 40}`} fill="none" stroke={C.il7} strokeWidth={42} strokeLinecap="round" />
        </Svg>
      </CameraLayer>
      {/* the car's word: a bubble out of the dash, never moving with the camera */}
      <Hud>
        <div
          style={{
            position: 'absolute',
            left: 540,
            top: 560,
            transform: `translate(-50%, -100%) scale(${(0.6 + 0.4 * pop + 0.04 * kick).toFixed(4)})`,
            transformOrigin: '50% 100%',
            opacity: frame >= hit ? 1 : 0,
          }}
        >
          <div style={{position: 'relative', padding: '26px 54px 32px', borderRadius: 60, border: `3px solid ${C.ink}`, backgroundColor: rgba(C.bg, 0.72), whiteSpace: 'nowrap'}}>
            <Words text={p.line ?? '*გამარჯობა*'} at={hit} fx="slam" size={88} punchTone={on ? 'a' : 'neutral'} />
            <svg width={60} height={50} style={{position: 'absolute', left: '50%', bottom: -47, marginLeft: -30, overflow: 'visible'}}>
              <path d="M8 0 L30 44 L52 0" fill={rgba(C.bg, 0.72)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
              <path d="M10 -2 H50" stroke={rgba(C.bg, 1)} strokeWidth={4} />
            </svg>
          </div>
        </div>
      </Hud>
      <Sfx name="asmr-knock" at={plug} volume={0.5} />
      <Haptic kind="light" at={plug} volume={0.3} />
      <Sfx name="asmr-screen" at={Math.max(base, hit - 6)} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
