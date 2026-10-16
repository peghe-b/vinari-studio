// V109WakeUp: the check light as an alarm clock. At dawn a parked crossover's engine lamp hangs over its bonnet inside
// an alarm clock's bezel, rattling on its bells; the driver dozes beside it and jolts awake on the hit ("alarm"). Then he
// strides off toward the garage with the clock still ringing behind ("run"), and later the clock falls quiet, the lamp
// dims and he lifts a thumb ("calm"). LOOK "illustrated", full bleed, composed from the kit.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, toneLine, accentsOn} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car, type CarBody} from '../illo/car';
import {Backdrop, type BackdropKind} from '../illo/backdrop';
import {FaceFx, Halo, Notes} from '../illo/fx';
import {Icon} from '../illo/icons';
import {acc, accRamp, dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'alarm' | 'run' | 'calm';
  hitAt?: number | string;
  line?: string;
  cast?: Cast;
  body?: CarBody;
  where?: BackdropKind;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1300;
const CAR_X = 650;
const CLOCK_Y = 700;
const R = 118;

/** The alarm clock with the engine lamp for a face: bells, feet, ring arcs while it rattles. */
const Clock: React.FC<{x: number; y: number; frame: number; ring: number; on: number; uid: string}> = ({x, y, frame, ring, on, uid}) => {
  const shake = ring * Math.sin(frame * 2.1) * 9;
  const lampCol = accentsOn() ? acc('a') : toneLine('down');
  const face = on > 0 ? lampCol : C.ink2;
  const rim = C.il1;
  const arcs = [0, 1, 2];
  return (
    <g transform={`translate(${x} ${y}) rotate(${shake.toFixed(2)})`}>
      {on > 0 ? <Halo uid={uid} x={0} y={0} r={R * 2.4} kind="down" opacity={0.55 * on} /> : null}
      {/* bells and hammer */}
      <circle cx={-R * 0.62} cy={-R * 0.98} r={R * 0.34} fill={accRamp(rim, 4)} />
      <circle cx={R * 0.62} cy={-R * 0.98} r={R * 0.34} fill={accRamp(rim, 4)} />
      <rect x={-6} y={-R * 1.26} width={12} height={R * 0.36} rx={5} fill={C.il3} />
      {/* feet */}
      <path d={`M${-R * 0.6} ${R * 0.8}L${-R * 0.86} ${R * 1.18}M${R * 0.6} ${R * 0.8}L${R * 0.86} ${R * 1.18}`} stroke={C.il2} strokeWidth={14} strokeLinecap="round" />
      {/* bezel and face */}
      <circle cx={0} cy={0} r={R} fill={C.il2} />
      <circle cx={0} cy={0} r={R * 0.84} fill={C.il6} />
      <circle cx={0} cy={0} r={R * 0.84} fill="none" stroke={rgba(C.ink, 0.12)} strokeWidth={2} />
      <Icon name="engine" x={0} y={0} size={R * 1.1} color={face} />
      {/* ring arcs */}
      {ring > 0.02
        ? arcs.map((i) => {
            const ph = ((frame * 0.09 + i / 3) % 1);
            const rr = R * (1.25 + 0.55 * ph);
            const o = ring * (1 - ph);
            return (
              <g key={i} opacity={o.toFixed(3)} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round">
                <path d={`M${-rr * 0.8} ${-rr * 0.6}A${rr} ${rr} 0 0 0 ${-rr * 0.8} ${rr * 0.6}`} />
                <path d={`M${rr * 0.8} ${-rr * 0.6}A${rr} ${rr} 0 0 1 ${rr * 0.8} ${rr * 0.6}`} />
              </g>
            );
          })
        : null}
    </g>
  );
};

export const V109WakeUp: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.5s'));
  const kick = useKick();
  const shot = p.shot ?? 'alarm';
  const time = timeOf(p);
  const night = dark(time);
  const cast: Cast = p.cast ?? {is: 'me', outfit: 'leather', hair: 'buzz', beard: 'short'};
  const woke = frame >= hit;

  // the clock: rings in alarm and run, falls quiet in calm on the hit
  const quiet = shot === 'calm' ? prog(frame, hit, 10) : 0;
  const ring = shot === 'calm' ? 1 - quiet : 1;
  const lampOn = shot === 'calm' ? 1 - quiet : 1;
  const clockPop = spr(frame, e, 'enter');

  if (shot === 'run') {
    // the garage: he strides left to right toward the open door, the clock rattling over the car behind him
    const walk = prog(frame, e, Math.max(30, ctx.dur - e));
    const meX = 250 + 230 * walk;
    return (
      <IlloBand uid={uid} time={time}>
        <CameraLayer depth={0.6}>
          <Svg>
            <Backdrop kind={p.where ?? 'garage'} uid={uid} frame={frame} time={time} base={GROUND} drift={0.4} />
          </Svg>
        </CameraLayer>
        <CameraLayer depth={1}>
          <Svg>
            <rect x={-100} y={GROUND} width={1280} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
            <Shadow uid={uid} cx={meX} cy={GROUND + 2} rx={110} />
            <Figure uid={uid} cast={cast} x={meX} y={GROUND} size={660} frame={frame} time={time} acts={[{at: e, face: 'worried', pose: 'walk', turn: 0.85}]} />
            <FaceFx kind="sweat" frame={frame} x={meX + 40} y={GROUND - 560} size={90} at={e + 4} time={time} uid={uid} />
            <Icon name="wrench" x={800} y={620} size={150} color={C.ink2} opacity={clockPop} />
            <Notes frame={frame} uid={uid} direction="out" n={9} size={92} at={e + 6} from={{x: meX + 20, y: GROUND - 330}} seed={11} />
          </Svg>
        </CameraLayer>
        <Sfx name="asmr-air-long" at={Math.max(base, e + 2)} volume={0.22} />
        <Haptic kind="light" at={Math.max(base, e + 4)} volume={0.2} />
      </IlloBand>
    );
  }

  const meX = 235;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind={p.where ?? 'bridge'} uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-100} y={GROUND} width={1280} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={CAR_X + 60} cy={GROUND + 2} rx={380} ry={20} />
          <Car uid={uid} x={CAR_X + 60} y={GROUND} len={760} body={p.body ?? 'ev'} paint="a" dir={-1} frame={frame} time={time} />
          <Shadow uid={uid} cx={meX} cy={GROUND + 2} rx={110} />
          <Figure
            uid={uid}
            cast={cast}
            x={meX}
            y={GROUND}
            size={660}
            frame={frame}
            time={time}
            acts={
              shot === 'calm'
                ? [
                    {at: e, face: 'worried', pose: 'phoneLook', turn: 0.85},
                    {at: hit, face: 'smile', pose: 'thumbsUp', turn: 0.6},
                  ]
                : [
                    {at: e, face: 'meh', pose: 'slumped', turn: 0.85},
                    {at: hit, face: 'shock', pose: 'handsHead', turn: 0.6},
                  ]
            }
          />
          {shot === 'alarm' && !woke ? <FaceFx kind="zzz" frame={frame} x={meX + 60} y={GROUND - 640} size={100} at={e} time={time} uid={uid} /> : null}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.15}>
        <Svg>
          <g transform={`translate(${CAR_X + 60} ${CLOCK_Y}) scale(${(0.9 + 0.1 * clockPop + 0.06 * kick).toFixed(4)}) translate(${-(CAR_X + 60)} ${-CLOCK_Y})`}>
            <Clock x={CAR_X + 60} y={CLOCK_Y} frame={frame} ring={ring * (shot === 'alarm' ? 0.5 + 0.5 * prog(frame, hit - 4, 6) : 1)} on={lampOn} uid={uid} />
          </g>
        </Svg>
      </CameraLayer>
      {p.line ? (
        <Hud>
          <div style={{position: 'absolute', left: L.camSafe.left, top: 440, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={92} punchTone={shot === 'calm' ? 'up' : 'a'} />
          </div>
        </Hud>
      ) : null}
      {shot === 'alarm'
        ? [0, 1, 2, 3].map((i) => <Sfx key={i} name="asmr-tick-fine" at={Math.max(base, e + 2 + i * 5)} volume={0.25} />)
        : null}
      <Sfx name={shot === 'calm' ? 'asmr-check' : 'asmr-knock'} at={hit} volume={0.32} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
