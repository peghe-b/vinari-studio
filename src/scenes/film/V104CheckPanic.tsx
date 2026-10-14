// V104CheckPanic: the check-engine panic, at dusk on a city street. The car faces us, its engine light blown up into a
// big amber lamp floating over the bonnet; the driver turns to his friend, hands on his head, the friend stays calm.
// shot "adapter": the driver lifts the little OBD adapter to the camera, its LED wakes and blinks.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car, blink, type CarBody} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Icon} from '../illo/icons';
import {Halo} from '../illo/fx';
import {acc, accRamp, dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated';
  shot?: 'pair' | 'adapter';
  hitAt?: number | string;
  line?: string;
  body?: CarBody;
  time?: 'day' | 'night' | 'dusk';
  me?: Cast;
  friend?: Cast;
};

const GROUND = 1240;
const ME_X = 270;
const FR_X = 820;
const CAR_X = 545;

/** The adapter: a trapezoid OBD-II plug with its pins and a small LED, drawn at (x, y), w wide. */
const Adapter: React.FC<{x: number; y: number; w: number; led: number; rot: number}> = ({x, y, w, led, rot}) => {
  const h = w * 0.62;
  const pins = [];
  for (let i = 0; i < 8; i++) {
    pins.push(<rect key={`a${i}`} x={-w * 0.36 + i * w * 0.1} y={-h * 0.72} width={w * 0.05} height={h * 0.1} rx={2} fill={C.il1} />);
    pins.push(<rect key={`b${i}`} x={-w * 0.32 + i * w * 0.09} y={-h * 0.56} width={w * 0.05} height={h * 0.1} rx={2} fill={C.il1} />);
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {/* the plug face */}
      <path d={`M ${-w * 0.46} ${-h * 0.82} L ${w * 0.46} ${-h * 0.82} L ${w * 0.38} ${-h * 0.4} L ${-w * 0.38} ${-h * 0.4} Z`} fill={C.il5} stroke={C.il2} strokeWidth={2} />
      {pins}
      {/* the body: a light shell that reads on the dusk street */}
      <rect x={-w * 0.4} y={-h * 0.42} width={w * 0.8} height={h * 1.0} rx={w * 0.08} fill={C.il1} stroke={C.il4} strokeWidth={2} />
      <rect x={-w * 0.4} y={-h * 0.42} width={w * 0.8} height={h * 0.16} rx={w * 0.06} fill={C.il0} opacity={0.7} />
      {/* the LED */}
      <circle cx={w * 0.22} cy={h * 0.32} r={w * 0.07} fill={C.il7} />
      <circle cx={w * 0.22} cy={h * 0.32} r={w * 0.055} fill={acc('b')} opacity={0.25 + 0.75 * led} />
      <circle cx={w * 0.22} cy={h * 0.32} r={w * 0.16} fill={acc('b')} opacity={0.18 * led} />
    </g>
  );
};

export const V104CheckPanic: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const night = dark(time);
  const kick = useKick();
  const shot = p.shot ?? 'pair';
  const adapter = shot === 'adapter';
  // the lamp: on the pair shot it flicks on at the start and pulses; on the adapter shot it glows quieter behind
  const lampOn = adapter ? 0.55 : prog(frame, Math.max(e, base), 6);
  const pulse = 0.85 + 0.15 * Math.sin(frame / 5);
  const lampK = lampOn * pulse;
  const lift = adapter ? spr(frame, Math.max(e, base), 'enterXL') : 0;
  const led = adapter && frame >= hit ? blink(frame) : 0;
  const meActs = adapter
    ? [{at: e, face: 'smile' as const, pose: 'confident' as const, turn: 0.4}]
    : [
        {at: e, face: 'shock' as const, pose: 'handsHead' as const, turn: 0.5},
        {at: hit, face: 'worried' as const, pose: 'shrug' as const, turn: 0.8},
      ];
  const frActs = adapter
    ? [{at: e, face: 'smile' as const, pose: 'thumbsUp' as const, turn: -0.5}]
    : [
        {at: e, face: 'neutral' as const, pose: 'crossArms' as const, turn: -0.5},
        {at: hit, face: 'smile' as const, pose: 'offer' as const, turn: -0.8},
      ];
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={GROUND} drift={0.08} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={400} ry={24} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={760} view="front" body={p.body ?? 'coupe'} paint="a" frame={frame} time={time} lights={{head: night ? 0.6 : 0}} />
          {/* the engine light, blown up over the bonnet */}
          <Halo uid={uid} x={CAR_X} y={700} r={230} opacity={0.55 * lampK} />
          <g opacity={0.25 + 0.75 * lampK} transform={`translate(${CAR_X} 700) scale(${1 + 0.06 * kick}) translate(${-CAR_X} -700)`}>
            <Icon name="engine" x={CAR_X} y={700} size={adapter ? 150 : 210} color={accRamp(acc('a'), 2)} accent={acc('a')} />
          </g>
          <Shadow uid={uid} cx={ME_X} cy={GROUND + 2} rx={110} />
          <Figure uid={uid} cast={p.me ?? 'me'} x={ME_X} y={GROUND} size={600} frame={frame} time={time} acts={meActs} />
          <Shadow uid={uid} cx={FR_X} cy={GROUND + 2} rx={110} />
          <Figure uid={uid} cast={p.friend ?? 'friend'} x={FR_X} y={GROUND} size={590} frame={frame} time={time} acts={frActs} />
        </Svg>
      </CameraLayer>
      {adapter ? (
        <CameraLayer depth={1.3}>
          <Svg>
            <Adapter x={540} y={880 + 300 * (1 - lift)} w={340} led={led} rot={-8 + 6 * lift} />
          </Svg>
        </CameraLayer>
      ) : null}
      {p.line ? (
        <Hud>
          <div style={{position: 'absolute', left: L.camSafe.left, top: 440, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={80} punchTone="neutral" />
          </div>
        </Hud>
      ) : null}
      {adapter ? null : <Sfx name="asmr-pop" at={Math.max(base, e + 2)} volume={0.3} />}
      <Sfx name={adapter ? 'asmr-knock' : 'asmr-swell'} at={Math.max(base, adapter ? hit : hit - 8)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
