// V83MechanicNotes: "hard to explain it to the mechanic?" The garage, the car behind, you and the mechanic face to face.
// Your explanation comes out of your mouth as a speech bubble whose words are one loopy scribble that keeps growing;
// on the key moment the scribble pulls itself into a tight knot, the mechanic shrugs with a question over his head, you
// cover your face, and the punch word slams in with the camera's kick.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {FaceFx} from '../illo/fx';
import {dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  me?: Cast;
  mechanic?: Cast;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1330;
const ME_X = 330;
const MECH_X = 760;
const CAR_X = 640;
// the speech bubble (stage units): its centre and half sizes
const BX = 400;
const BY = 610;
const BW = 220;
const BH = 105;
const SIZE = 560;
const LOOPS = 9;

export const V83MechanicNotes: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const night = dark(time);
  const kick = useKick();
  const tone = p.tone ?? 'down';

  // the bubble rises out of the mouth, the scribble draws on until the hit, then knots
  // frame 0 is the two of them face to face; the bubble bursts out of your mouth by about 0.3 s
  const start = Math.max(e + 2, 3);
  const pop = spr(frame, start, 'enter');
  const draw = prog(frame, start + 2, Math.max(8, hit - start - 2), ease.enter);
  const knot = prog(frame, hit, 10, ease.whipOut);
  // the scribble: loops travelling left to right, squeezed to a ball on the knot
  const pts: string[] = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const ang = t * LOOPS * Math.PI * 2;
    const wx = -BW * 0.78 + t * BW * 1.56 + Math.cos(ang) * 30;
    const wy = Math.sin(ang) * 40 + Math.sin(t * 7.3) * 18;
    const kx = Math.cos(ang * 1.13) * (38 + 10 * Math.sin(t * 11));
    const ky = Math.sin(ang * 0.87) * (38 + 10 * Math.cos(t * 9));
    const x = BX + wx + (kx - wx) * knot;
    const y = BY + wy + (ky - wy) * knot;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const shrink = 1 - 0.38 * knot;
  const bw = BW * shrink;
  const bh = BH * (1 - 0.15 * knot);
  const tail = `M${BX - 70} ${BY + bh - 4} L${ME_X + 40} ${GROUND - SIZE * 0.84} L${BX - 10} ${BY + bh - 4} Z`;

  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="garage" uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-100} y={GROUND} width={1280} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND - 128} rx={330} ry={14} />
          <g opacity={0.92}>
            <Car uid={uid} x={CAR_X} y={GROUND - 130} len={720} body="sedan" dir={1} frame={frame} time={time} />
          </g>
          <Shadow uid={uid} cx={ME_X} cy={GROUND + 2} rx={110} />
          <Figure
            uid={uid}
            cast={p.me ?? {is: 'me', outfit: 'blazer', hair: 'wavy', beard: 'stubble'}}
            x={ME_X}
            y={GROUND}
            size={SIZE}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'worried', pose: 'shrug', turn: 0.45},
              {at: hit, face: 'sad', pose: 'facepalm', turn: 0.35},
            ]}
          />
          <Shadow uid={uid} cx={MECH_X} cy={GROUND + 2} rx={110} />
          <Figure
            uid={uid}
            cast={p.mechanic ?? 'mechanic'}
            x={MECH_X}
            y={GROUND}
            size={SIZE + 20}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'meh', pose: 'crossArms', turn: -0.45},
              {at: hit + 4, face: 'shock', pose: 'shrug', turn: -0.4},
            ]}
          />
          <FaceFx kind="question" frame={frame} x={MECH_X + 30} y={GROUND - SIZE - 110} size={120} at={hit + 4} time={time} uid={uid} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.05}>
        <Svg>
          <g opacity={pop} transform={`translate(${BX} ${BY}) scale(${(0.7 + 0.3 * pop) * (1 + 0.05 * kick)}) translate(${-BX} ${-BY})`}>
            <path d={tail} fill={C.surface} />
            <rect x={BX - bw} y={BY - bh} width={bw * 2} height={bh * 2} rx={bh} fill={C.surface} stroke={rgba(C.ink, 0.18)} strokeWidth={2} />
            <path d={pts.join(' ')} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          </g>
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? 'ის... *რაღაც*'} at={hit} fx="slam" size={92} punchTone={tone} />
        </div>
      </Hud>
      <Sfx name="asmr-pencil-long" at={Math.max(base, e + 4)} volume={0.2} />
      <Sfx name="asmr-paper" at={hit} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
