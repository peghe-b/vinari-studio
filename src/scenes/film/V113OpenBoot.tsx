// src/scenes/film/V113OpenBoot.tsx: the film's own picture (v113-open-boot, QR ბარათი): a fuel station at night. A
// stranger's hatch reverses out of the pump bay and kisses the rear of your parked coupe-SUV; he gets out, crouches at the
// dented corner and looks round for a number (there is none, only the card); later he waits by the car and owns up when
// you come out. One component, three phases (the spec's "phase"):
//   scrape  the wide shot: both cars whole, side by side; the hatch rolls back, touches on hitAt, both bodies jolt, the
//           crease appears, the punch lands
//   look    closer, from behind: your car's rear whole at the left with the crease, the stranger crouched at it, rising on
//           hitAt with his hand to his head
//   sorry   the same rear, the two people face to face over it; on hitAt they shake hands, the punch lands
// Props: phase, hitAt (chunk or "1.2s"), line ("*word*" punches, from the spec), cast (the stranger), me (you), time.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {Figure, type Cast} from '../illo/figure';
import {IlloBand, Svg, timeOf} from '../illo/scene';
import {Glow} from '../kit/glow';
import {E} from '../kit/lib';
import {WHITE} from '../kit/stage';

type P = {
  phase?: 'scrape' | 'look' | 'sorry';
  hitAt?: number | string;
  line?: string;
  cast?: Cast;
  me?: Cast;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1250; // the forecourt's floor line (stage y): feet and wheels stand here, well over the subtitle band

/** The wide shot: your coupe-SUV parked at the left facing left (its rear to the right), the hatch reversing to it. */
const Scrape: React.FC<{p: P; ctx: SceneCtx; uid: string; hit: number}> = ({p, ctx, uid, hit}) => {
  const f = useCurrentFrame();
  const time = timeOf(p);
  const e = entrance(ctx);
  // the hatch rolls back from x 772 to 716, slowing as it nears, and rocks back a few px on the touch
  const roll = E.out(prog(f, e, Math.max(12, hit - e)));
  const knock = Math.max(0, 1 - Math.abs(f - hit - 2) / 7) * (f >= hit ? 1 : 0);
  const hx = 780 - 28 * roll + 8 * knock;
  const dent = prog(f, hit, 6);
  const jolt = f >= hit ? Math.sin((f - hit) * 1.6) * Math.exp(-(f - hit) / 6) * 5 : 0;
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="station" uid={uid} frame={f} time={time} base={GROUND} />
        </Svg>
        <Glow x={540} y={520} r={360} color="#FFE2B8" k={0.35} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}s`} x={320} y={GROUND} len={440} body="suv" paint="a" dir={-1} frame={f} time={time} dent={dent} bob={jolt * 0.6} />
          <Car uid={`${uid}h`} x={hx} y={GROUND} len={420} body="hatch" paint={2} dir={1} frame={f} time={time} roll={-28 * roll} lights={{tail: 1, brake: 1 - roll * 0.4}} pitch={-0.8 * knock} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ღრჭ*'} at={hit} fx="slam" size={120} color={WHITE} />
        </div>
      </Hud>
      <Sfx name="asmr-strike" at={hit} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.32} />
    </>
  );
};

/** The closer shots: your car's rear whole at the left (the crease on its corner), the people on the forecourt. */
const Rear: React.FC<{p: P; ctx: SceneCtx; uid: string; hit: number}> = ({p, ctx, uid, hit}) => {
  const f = useCurrentFrame();
  const time = timeOf(p);
  const e = entrance(ctx);
  const sorry = p.phase === 'sorry';
  const stranger: Cast = p.cast ?? {is: 'man', outfit: 'overcoat', hair: 'receding', beard: 'short'};
  const me: Cast = p.me ?? 'me';
  // look: crouched at the corner, then up with a hand to the head; sorry: he offers his hand, you take it
  const look = sorry
    ? [{at: e, pose: 'offer' as const, face: 'worried' as const}, {at: hit, pose: 'offer' as const, face: 'smile' as const}]
    : [{at: e, pose: 'crouch' as const, face: 'worried' as const}, {at: hit, pose: 'handsHead' as const, face: 'shock' as const}];
  const meActs = [{at: e, pose: 'crossArms' as const, face: 'meh' as const}, {at: hit - 2, pose: 'offer' as const, face: 'smile' as const}];
  const step = prog(f, e, 30, E.out);
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="station" uid={uid} frame={f} time={time} base={GROUND} seed={3} />
        </Svg>
        <Glow x={sorry ? 700 : 300} y={560} r={320} color="#FFE2B8" k={0.3} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={`${uid}r`} x={sorry ? 300 : 360} y={GROUND} len={980} body="suv" paint="a" view="rear" frame={f} time={time} dent={1} lights={{hazard: sorry ? 0 : 1}} />
          {sorry ? (
            <>
              <Figure uid={`${uid}m`} cast={me} x={600 + 20 * (1 - step)} y={GROUND + 20} size={600} turn={0.85} frame={f} time={time} acts={meActs} />
              <Figure uid={`${uid}x`} cast={stranger} x={830} y={GROUND + 20} size={610} turn={-0.85} frame={f} time={time} acts={look} />
            </>
          ) : (
            <Figure uid={`${uid}x`} cast={stranger} x={760} y={GROUND + 20} size={620} turn={-0.6} frame={f} time={time} acts={look} />
          )}
        </Svg>
      </CameraLayer>
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={96} color={WHITE} />
          </div>
        ) : null}
      </Hud>
      <Sfx name={sorry ? 'asmr-land' : 'asmr-knock'} at={hit} volume={0.32} />
      <Haptic kind="light" at={hit + 1} volume={0.28} />
    </>
  );
};

export const V113OpenBoot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  return (
    <IlloBand uid={uid} time={timeOf(p)}>
      {p.phase === 'look' || p.phase === 'sorry' ? <Rear p={p} ctx={ctx} uid={uid} hit={hit} /> : <Scrape p={p} ctx={ctx} uid={uid} hit={hit} />}
    </IlloBand>
  );
};
