// src/scenes/film/V114TunnelVoice.tsx: v114-tunnel-voice's own picture. The mountain cut open like a geology section: the
// rock in strata, the tunnel's bore running through it with its lamps, the road outside. One hero car (the film's accent,
// a coupe-SUV in profile) on that one road all through:
//   "drop"   the car climbs toward the mountain; a mast on the left sends its signal in soft arcs that thin out and stop,
//            the four signal bars in the corner fall one by one to none on the hit.
//   "tunnel" the car rolls up to the portal past a tunnel sign; over its roof the voice speaks as a little bar wave in the
//            accent (the navigator warns before the bore), then the car slides into the lit bore.
//   "out"    the mountain seen from its far side: the car rolls out of the portal toward a fork sign; on the hit the sign's
//            left branch lights up in the accent.
//   "scene": {"type": "Film", "name": "V114TunnelVoice", "look": "illustrated", "mode": "drop" | "tunnel" | "out",
//             "hitAt": 1, "line": "*ნული*"}
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, halo, rgba} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car, carBox} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {acc, accRamp, glowK, lamp} from '../illo/palette';
import {FOOT, IlloBand, Svg} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'drop' | 'tunnel' | 'out';
  hitAt?: number | string;
  line?: string;
};

const GROUND = 1180; // the road's surface under the wheels (stage y)
const CAR_LEN = 430;
const PORTAL = 610; // the portal's x (drop / tunnel); "out" mirrors the mountain, its portal at 1080 - PORTAL
const BORE_H = 210;
const MAST_X = 170;
const MAST_TOP = 650;

/** The mountain in section: rock, strata, the bore with its lamps and the portal's concrete frame. */
const Mountain: React.FC<{lit: number}> = ({lit}) => {
  const rock = `M${PORTAL - 150} ${GROUND + 40} C${PORTAL - 60} ${GROUND - 260} ${PORTAL + 120} ${520} ${PORTAL + 300} ${470} C${PORTAL + 420} ${440} ${PORTAL + 520} ${420} 1400 ${400} L1400 ${GROUND + 40} Z`;
  const boreTop = GROUND - BORE_H;
  const bore = `M${PORTAL} ${GROUND} V${boreTop + 70} Q${PORTAL} ${boreTop} ${PORTAL + 80} ${boreTop} H1400 V${GROUND} Z`;
  const strata = [0, 1, 2, 3, 4];
  return (
    <g>
      <path d={rock} fill={C.il3} />
      {strata.map((i) => {
        const y = 600 + i * 120;
        return <path key={i} d={`M${PORTAL + 40 + i * 6} ${y + 40} C${PORTAL + 300} ${y - 30} ${PORTAL + 520} ${y + 50} 1400 ${y + 10}`} fill="none" stroke={C.il4} strokeWidth={4} opacity={0.55} />;
      })}
      <path d={bore} fill={C.il6} />
      {Array.from({length: 9}, (_, i) => {
        const x = PORTAL + 90 + i * 84;
        const on = 0.55 + 0.45 * lit;
        return (
          <g key={i}>
            <circle cx={x} cy={boreTop + 22} r={26} fill={halo(C.il0, 0.18 * on)} />
            <rect x={x - 14} y={boreTop + 14} width={28} height={10} rx={5} fill={lamp('night')} opacity={on} />
          </g>
        );
      })}
      <path d={`M${PORTAL - 14} ${GROUND} V${boreTop + 64} Q${PORTAL - 14} ${boreTop - 16} ${PORTAL + 80} ${boreTop - 16} H${PORTAL + 150}`} fill="none" stroke={C.il1} strokeWidth={16} strokeLinecap="round" />
      <rect x={PORTAL} y={GROUND - 4} width={800} height={8} fill={C.il5} opacity={0.6} />
    </g>
  );
};

export const V114TunnelVoice: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const mode = p.mode ?? 'drop';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const end = Math.max(hit + 20, ctx.dur);
  const a = acc('a');
  const b = acc('b');
  const box = carBox('side', 'suv', CAR_LEN);
  // the car's run: always whole inside x 100..980
  const run = prog(frame, e, end - e, ease.camera);
  const carX = mode === 'drop' ? 330 + 150 * run : mode === 'tunnel' ? 340 + 380 * run : 360 + 230 * run;
  const lights = {head: mode === 'tunnel' ? 0.8 * prog(frame, hit, 12) : 0.3, tail: 0.3};
  // drop: the signal thins out and the bars fall to none on the hit
  const sig = 1 - prog(frame, hit - 30, 30, ease.camera);
  const bars = mode === 'drop' ? Math.max(0, Math.min(4, Math.ceil(4 * (1 - prog(frame, e + 4, hit - e - 4))))) : 0;
  // tunnel: the voice over the roof
  const talk = mode === 'tunnel' ? prog(frame, hit, 8) * (1 - prog(frame, end - 24, 16)) : 0;
  // out: the fork sign's left branch lights
  const pick = mode === 'out' ? prog(frame, hit, 10, ease.camera) : 0;
  const signX = 900;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time="day" base={GROUND - 30} drift={0.15} opacity={0.7} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {/* the ground: the road and the earth under it, to the frame's foot (calm under the subtitle) */}
          <rect x={-200} y={GROUND - 6} width={1480} height={70} fill={C.il4} />
          <rect x={-200} y={GROUND + 64} width={1480} height={FOOT - GROUND - 64} fill={C.il2} />
          {Array.from({length: 8}, (_, i) => (
            <rect key={i} x={-120 + i * 190} y={GROUND + 26} width={90} height={7} rx={3} fill={C.il1} opacity={0.7} />
          ))}
          <g transform={mode === 'out' ? 'translate(1080 0) scale(-1 1)' : undefined}>
            <Mountain lit={mode === 'drop' ? 0 : 1} />
          </g>
          {mode === 'drop' ? (
            <g>
              <path d={`M${MAST_X - 34} ${GROUND} L${MAST_X} ${MAST_TOP} L${MAST_X + 34} ${GROUND}`} fill="none" stroke={C.il5} strokeWidth={6} strokeLinejoin="round" />
              {[0, 1, 2, 3, 4].map((i) => {
                const y = MAST_TOP + 90 + i * 100;
                const w = 34 * ((y - MAST_TOP) / (GROUND - MAST_TOP));
                return <line key={i} x1={MAST_X - w} y1={y} x2={MAST_X + w} y2={y + 50} stroke={C.il5} strokeWidth={4} />;
              })}
              <circle cx={MAST_X} cy={MAST_TOP} r={12} fill={b} />
              {[0, 1, 2, 3].map((i) => {
                const r = 70 + (((frame - e) * 4 + i * 120) % 480 + 480) % 480;
                const k = Math.max(0, 1 - r / 520) * sig;
                const a0 = -0.85;
                const a1 = 0.85;
                return <path key={i} d={`M${MAST_X + r * Math.cos(a0)} ${MAST_TOP + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${MAST_X + r * Math.cos(a1)} ${MAST_TOP + r * Math.sin(a1)}`} fill="none" stroke={b} strokeWidth={6} strokeLinecap="round" opacity={0.8 * k} />;
              })}
            </g>
          ) : null}
          {mode === 'tunnel' ? (
            <g>
              <rect x={PORTAL - 104} y={GROUND - 250} width={8} height={250} rx={3} fill={C.il5} />
              <rect x={PORTAL - 160} y={GROUND - 360} width={120} height={120} rx={20} fill={C.il0} stroke={C.il5} strokeWidth={5} />
              <path d={`M${PORTAL - 130} ${GROUND - 262} V${GROUND - 300} Q${PORTAL - 130} ${GROUND - 338} ${PORTAL - 100} ${GROUND - 338} Q${PORTAL - 70} ${GROUND - 338} ${PORTAL - 70} ${GROUND - 300} V${GROUND - 262}`} fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" />
            </g>
          ) : null}
          {mode === 'out' ? (
            <g>
              <rect x={signX - 4} y={GROUND - 250} width={8} height={250} rx={3} fill={C.il5} />
              <rect x={signX - 70} y={GROUND - 380} width={140} height={140} rx={22} fill={C.il0} stroke={C.il5} strokeWidth={5} />
              <path d={`M${signX} ${GROUND - 256} V${GROUND - 300} L${signX + 34} ${GROUND - 350}`} fill="none" stroke={C.il5} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              <path d={`M${signX} ${GROUND - 300} L${signX - 34} ${GROUND - 350}`} fill="none" stroke={pick > 0 ? a : C.il5} strokeWidth={9 + 5 * pick} strokeLinecap="round" />
              <circle cx={signX - 34} cy={GROUND - 350} r={10 + 8 * pick} fill={halo(a, 0.5 * pick * glowK('day') + 0.2 * pick)} />
            </g>
          ) : null}
          <Shadow uid={uid} cx={carX} cy={GROUND + 2} rx={box.w * 0.52} ry={14} />
          <Car uid={uid} x={carX} y={GROUND} len={CAR_LEN} body="suv" paint="a" dir={1} frame={frame} roll={carX} speed={0.4} time="day" lights={lights} />
          {talk > 0
            ? Array.from({length: 7}, (_, i) => {
                const h = (16 + 46 * Math.abs(Math.sin(frame / 3.2 + i * 1.3)) * (1 - Math.abs(i - 3) / 5)) * talk;
                const x = carX - 78 + i * 26;
                const y = GROUND - box.h - 70;
                return <rect key={i} x={x - 7} y={y - h / 2} width={14} height={Math.max(4, h)} rx={7} fill={accRamp(a, 2 + (i % 2))} />;
              })
            : null}
        </Svg>
      </CameraLayer>
      <Hud>
        {mode === 'drop' ? (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            {[0, 1, 2, 3].map((i) => {
              const hgt = 26 + i * 22;
              const on = i < bars;
              return <rect key={i} x={790 + i * 32} y={540 - hgt} width={22} height={hgt} rx={6} fill={on ? C.ink : 'none'} stroke={on ? C.ink : rgba(C.ink, 0.35)} strokeWidth={4} />;
            })}
          </svg>
        ) : null}
        <div style={{position: 'absolute', left: mode === 'out' ? 520 : L.camSafe.left, top: mode === 'drop' ? 450 : 470, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ნული*'} at={hit} fx="slam" size={96} punchTone="neutral" />
        </div>
      </Hud>
      <Sfx name={mode === 'tunnel' ? 'asmr-swell' : 'asmr-air-long'} at={Math.max(base, hit - 12)} volume={0.28} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
