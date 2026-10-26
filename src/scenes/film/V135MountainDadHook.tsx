// V135MountainDadHook: the dad's call through the car, the driver's own view on a mountain road (v135-mountain-dad).
// One place, three moments, each its own picture:
//   "call"   the road climbing ahead, the dash's floating screen big in the middle: „მამა“ on it and his voice as a live
//            wave of bars; the car's speakers glow at the pillars with every word (the hook: the call heard by 2 s)
//   "drop"   a close-up of the same screen: the four signal bars fall one by one, the wave goes flat, the call ends
//   "again"  dusk, the car parked at the village: the screen wakes, „მამა“ rings again, the wave comes back
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {C, F} from '../../tokens';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Cabin, Road, view} from '../illo/road';
import {IlloBand, Svg} from '../illo/scene';
import {Glow} from '../kit/glow';
import {PhoneGlyph} from '../kit/ios';
import {clamp, E, lerp, prog} from '../kit/lib';
import {INK, useShot, WHITE} from '../kit/stage';

type P = {
  shot?: 'call' | 'drop' | 'again';
  hitAt?: number | string;
  caller?: string; // the name on the call (the spec's "name" is the scene's own)
  line?: string;
  time?: 'day' | 'dusk';
};

const HY = 760;
// the dash screen: a wide floating display above the dash, centred
const SX = 540;
const SY = 930;
const SW = 560;
const SH = 250;

/** the call's own screen: the caller, the wave of his voice, the signal bars (white on dark glass) */
const CallPanel: React.FC<{t: number; name: string; voice: number; bars: number; ended: number; ring: number}> = ({t, name, voice, bars, ended, ring}) => {
  const nb = 16;
  const bw = (SW - 68) / nb;
  return (
    <div className={OBJ} style={{position: 'absolute', left: SX - SW / 2, top: SY - SH / 2, width: SW, height: SH, borderRadius: 34, backgroundColor: '#121314', boxShadow: '0 18px 50px rgba(0,0,0,0.35)', overflow: 'hidden'}}>
      {/* the caller's round badge with the phone glyph; it pulses while it rings */}
      <div style={{position: 'absolute', left: 34, top: 36, width: 96, height: 96, borderRadius: 48, backgroundColor: ended > 0.5 ? '#3A3A3A' : C.accA, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${(1 + 0.08 * ring * Math.sin(t / 3)).toFixed(3)})`}}>
        <PhoneGlyph size={52} color={WHITE} down={ended > 0.5} />
      </div>
      <div className={TXT} style={{position: 'absolute', left: 156, top: 52, fontFamily: F.sans, fontWeight: 700, fontSize: 56, lineHeight: 1, color: WHITE}}>{mtav(name)}</div>
      {/* the signal: four bars, falling one by one */}
      <svg width={120} height={60} style={{position: 'absolute', right: 34, top: 50}}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 28} y={56 - (i + 1) * 13} width={18} height={(i + 1) * 13} rx={4} fill={WHITE} opacity={i < bars ? 1 : 0.22} />
        ))}
      </svg>
      {/* his voice: a row of bars that move with the words, flat when the call ends */}
      <svg width={SW - 68} height={80} style={{position: 'absolute', left: 34, top: 150}}>
        {Array.from({length: nb}, (_, i) => {
          const h = 8 + voice * (28 + 26 * Math.abs(Math.sin(t / 2.6 + i * 1.7) * Math.cos(t / 4.1 + i * 0.6)));
          return <rect key={i} x={i * bw} y={40 - h / 2} width={14} height={h} rx={7} fill={WHITE} opacity={0.35 + 0.6 * voice} />;
        })}
      </svg>
    </div>
  );
};

export const V135MountainDadHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const shot = p.shot ?? 'call';
  const time = p.time ?? (shot === 'again' ? 'dusk' : 'day');
  const hit = Math.max(base + 10, at(p.hitAt, shot === 'drop' ? 40 : 30));
  const name = p.caller ?? 'გურამი';
  // the road: moving in the call and the drop, standing (parked) in the payoff
  const moving = shot !== 'again';
  const d = moving ? t * 0.55 : 0;
  const bend = moving ? 120 * Math.sin(t / 70) : -40;
  const v = view({hy: HY, bend});

  // the call's state
  const ended = shot === 'drop' ? E.out(prog(t, hit, 8)) : 0;
  const bars = shot === 'drop' ? Math.max(0, 4 - Math.floor(clamp((t - (hit - 24)) / 24) * 4.01)) : shot === 'again' ? 3 : 2;
  const ring = shot === 'again' ? 1 - E.out(prog(t, hit, 10)) : 0;
  const talk =
    shot === 'call'
      ? 0.55 + 0.45 * Math.abs(Math.sin(t / 5))
      : shot === 'drop'
        ? (1 - ended) * (0.5 + 0.4 * Math.abs(Math.sin(t / 4)))
        : E.out(prog(t, hit, 10)) * (0.5 + 0.4 * Math.abs(Math.sin(t / 5)));

  // the close-up of the drop: the whole cabin pushed in on the screen (a 2D picture, so a scale is clean)
  const zoom = shot === 'drop' ? lerp(1.22, 1.3, E.inOut(prog(t, 0, len))) : 1;
  const speaker = shot === 'again' ? ring * 0.6 + talk * 0.5 : talk;

  return (
    <IlloBand uid={uid} time={time}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(4)})`, transformOrigin: `${SX}px ${SY}px`}}>
        <CameraLayer depth={0.6}>
          <Svg>
            <Backdrop kind="mountains" uid={uid} frame={t} time={time} base={HY} drift={moving ? 0.6 : 0.2} />
          </Svg>
        </CameraLayer>
        <CameraLayer depth={1}>
          <Svg>
            <Road v={v} d={d} time={time} uid={uid} />
          </Svg>
        </CameraLayer>
        <CameraLayer depth={1.3}>
          <Svg>
            <Cabin uid={uid} time={time} frame={t} mirror wheel={false} hands={false} />
          </Svg>
          {/* the car's speakers by the pillars: they glow with his voice */}
          <Glow x={96} y={1060} r={170} color={C.accA} k={0.55 * speaker} />
          <Glow x={984} y={1060} r={170} color={C.accA} k={0.55 * speaker} />
          <CallPanel t={t} name={name} voice={talk} bars={bars} ended={ended} ring={ring} />
        </CameraLayer>
      </div>
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} color={time === 'day' ? INK : WHITE} />
          </div>
        ) : null}
      </Hud>
      {shot === 'drop' ? (
        <>
          <Sfx name="asmr-haptic-error" at={Math.max(base, hit)} volume={0.4} />
          <Haptic kind="rigid" at={Math.max(base, hit + 1)} volume={0.3} />
        </>
      ) : null}
      {shot === 'again' ? (
        <>
          <Sfx name="real-phone-buzz" at={Math.max(base, 2)} volume={0.35} />
          <Land at={Math.max(base, hit)} />
        </>
      ) : null}
      {shot === 'call' ? <Haptic kind="light" at={Math.max(base, hit)} volume={0.25} /> : null}
    </IlloBand>
  );
};
