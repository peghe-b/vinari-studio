// v94-dream-car: "what do you drive, what do you dream of?" Two moments of one picture.
// mode "dream": a dusk car park, your everyday hatch on the ground and you beside it looking up; the dream coupe floats
//   over the rooftops as a pale ghost and, on hitAt, takes its paint and a glint (the dream lit up).
// mode "tank": the hatch from behind, its tailgate turned to glass (an x-ray): the LPG cylinder lies across the boot
//   and a paper tag hangs from its valve; on hitAt the tag swings and the punch word lands.
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
import {Halo} from '../illo/fx';
import {acc, accRamp, dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Glint, Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'dream' | 'tank';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  cast?: Cast;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1300;
const ME_X = 290;
const HATCH_X = 650;
const DREAM_X = 560;
const DREAM_Y = 690;
const REAR_X = 540;
const REAR_GROUND = 1240;
const REAR_LEN = 1500;

const Dream: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const night = dark(time);
  const lit = spr(frame, hit, 'land');
  // the dream appears over the roofs in the first half second (the opening's event), then lights up on the hit
  const ghost = prog(frame, 2, 12, ease.enter);
  const float = Math.sin(frame / 22) * 10;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={0.8}>
        <Svg>
          <Halo uid={uid} x={DREAM_X} y={DREAM_Y + float - 60} r={420} sx={1.5} opacity={ghost * (0.35 + 0.5 * lit)} />
          <Car
            uid={uid}
            x={DREAM_X}
            y={DREAM_Y + float}
            len={760}
            body="coupe"
            dir={1}
            paint={lit > 0.5 ? 'a' : 1}
            caliper="b"
            frame={frame}
            time={time}
            opacity={ghost * (0.32 + 0.68 * lit)}
            lights={{head: lit, tail: lit}}
            shadow={false}
          />
          <Glint x={DREAM_X + 150} y={DREAM_Y + float - 150} size={70} at={hit + 4} frame={frame} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={GROUND} width={1320} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={HATCH_X} cy={GROUND + 2} rx={340} ry={18} />
          <Car uid={uid} x={HATCH_X} y={GROUND} len={720} body="hatch" dir={-1} paint={3} frame={frame} time={time} lights={{head: night ? 0.6 : 0}} />
          <Shadow uid={uid} cx={ME_X} cy={GROUND + 2} rx={100} />
          <Figure
            uid={uid}
            cast={p.cast ?? {is: 'me', outfit: 'trench', hair: 'lob', extras: ['earrings']}}
            x={ME_X}
            y={GROUND}
            size={600}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'meh', pose: 'crossArms', turn: 0.3},
              {at: hit, face: 'smile', pose: 'point', turn: 0.5},
            ]}
          />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

const Tank: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const night = dark(time);
  const kick = useKick();
  const xray = prog(frame, e + 4, 16, ease.enter);
  // the cylinder across the boot, seen through the glass tailgate
  const cy = 905;
  const cw = 520;
  const cr = 74;
  const cx0 = REAR_X - cw / 2;
  const col = acc('a');
  // the tag swings from the valve: a soft idle sway, then a big swing on the hit that settles
  const t = Math.max(0, frame - hit);
  const swing = frame < hit ? 4 * Math.sin(frame / 14) : 26 * Math.exp(-t / 16) * Math.cos(t / 3.2);
  const vx = REAR_X + 150;
  const vy = cy - cr - 26;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={REAR_GROUND - 60} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={REAR_GROUND - 60} width={1320} height={FOOT - REAR_GROUND + 60} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={REAR_X} cy={REAR_GROUND + 2} rx={420} ry={26} />
          <Car uid={uid} x={REAR_X} y={REAR_GROUND} len={REAR_LEN} view="rear" body="hatch" paint={3} frame={frame} time={time} lights={{tail: 0.7}} />
          {/* the x-ray: the boot seen through */}
          <g opacity={xray}>
            <rect x={cx0 - 70} y={cy - cr - 70} width={cw + 140} height={cr * 2 + 120} rx={36} fill={rgba(C.bg, 0.72)} stroke={rgba(C.ink, 0.35)} strokeWidth={2} strokeDasharray="10 8" />
            <rect x={cx0} y={cy - cr} width={cw} height={cr * 2} rx={cr} fill={accRamp(col, 4)} />
            <rect x={cx0 + 10} y={cy - cr + 10} width={cw - 20} height={cr * 0.7} rx={cr * 0.35} fill={accRamp(col, 2)} opacity={0.8} />
            <line x1={cx0 + 120} y1={cy - cr} x2={cx0 + 120} y2={cy + cr} stroke={accRamp(col, 6)} strokeWidth={3} />
            <line x1={cx0 + cw - 120} y1={cy - cr} x2={cx0 + cw - 120} y2={cy + cr} stroke={accRamp(col, 6)} strokeWidth={3} />
            <rect x={vx - 22} y={vy} width={44} height={30} rx={6} fill={C.il4} />
            <circle cx={vx} cy={vy - 4} r={14} fill={C.il3} stroke={C.il5} strokeWidth={2} />
            {/* the tag on its string */}
            <g transform={`rotate(${swing.toFixed(2)} ${vx} ${vy})`}>
              <line x1={vx} y1={vy} x2={vx} y2={vy + 150} stroke={C.ink2} strokeWidth={2} />
              <g transform={`scale(${(1 + 0.05 * kick).toFixed(4)})`} style={{transformOrigin: `${vx}px ${vy + 150}px`}}>
                <rect x={vx - 70} y={vy + 150} width={140} height={160} rx={12} fill={C.surface} stroke={C.ink2} strokeWidth={2} />
                <circle cx={vx} cy={vy + 172} r={8} fill="none" stroke={C.ink2} strokeWidth={2} />
                <rect x={vx - 44} y={vy + 200} width={88} height={78} rx={8} fill="none" stroke={C.ink} strokeWidth={3} />
                <line x1={vx - 44} y1={vy + 222} x2={vx + 44} y2={vy + 222} stroke={C.ink} strokeWidth={3} />
                <circle cx={vx + 18} cy={vy + 252} r={9} fill={acc('b')} />
              </g>
            </g>
          </g>
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 470, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*LPG*'} at={hit} fx="slam" size={110} punchTone={p.tone ?? 'neutral'} />
        </div>
      </Hud>
      <Sfx name="asmr-knock" at={Math.max(base, e + 6)} volume={0.3} />
      <Sfx name="asmr-paper" at={hit} volume={0.32} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

export const V94DreamCar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.mode === 'tank' ? <Tank p={p} ctx={ctx} /> : <Dream p={p} ctx={ctx} />);
