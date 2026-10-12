// DemoEngineStoryV97: the owner's story as one illustrated moment (the 2026-10-12 diagnostics demo). A friend's father in
// a garage, his car beside him in the film's accent; a mechanic shrugs over it; the money he spent going round to learn
// what one noise was counts up in the Hud, and on the key moment the notes fly out of his hands and he grabs his head.
//   hitAt   the count lands (the camera kicks, the notes fly, the faces change)
//   value   the count's end (the owner's own figure, from the spec)
//   cast / mech  the father and the mechanic; body, where, time as in the kit.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, F, L, toneBig} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car, type CarBody} from '../illo/car';
import {Backdrop, type BackdropKind} from '../illo/backdrop';
import {FaceFx, Notes} from '../illo/fx';
import {dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  hitAt?: number | string;
  value?: number;
  unit?: string;
  cast?: Cast;
  mech?: Cast;
  body?: CarBody;
  where?: BackdropKind;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1300;
const DAD_X = 230;
const MECH_X = 590;
const CAR_X = 820;

const group = (n: number) => {
  const s = String(Math.round(n));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const left = s.length - i;
    out += s[i];
    if (left > 1 && (left - 1) % 3 === 0) out += ' ';
  }
  return out;
};

export const DemoEngineStoryV97: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf(p);
  const night = dark(time);
  const end = p.value ?? 0;
  // the meter runs from 0 on the cut and lands on the hit, evenly (an ease-out shot to 3 700 in the first frames)
  const count = end * prog(frame, e, Math.max(8, hit - e), ease.camera);
  const landed = frame >= hit;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind={p.where ?? 'garage'} uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-100} y={GROUND} width={1280} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={CAR_X + 60} cy={GROUND + 2} rx={380} ry={20} />
          <Car uid={uid} x={CAR_X + 60} y={GROUND} len={820} body={p.body ?? 'sedan'} paint="a" dir={-1} frame={frame} time={time} lights={{hazard: landed ? 1 : 0}} />
          <Shadow uid={uid} cx={MECH_X} cy={GROUND + 2} rx={90} />
          <Figure
            uid={uid}
            cast={p.mech ?? {is: 'mechanic'}}
            x={MECH_X}
            y={GROUND}
            size={560}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'meh', pose: 'hold', hold: 'wrench', turn: -0.4},
              {at: hit, face: 'meh', pose: 'shrug', turn: -0.6},
            ]}
          />
          <Shadow uid={uid} cx={DAD_X} cy={GROUND + 2} rx={110} />
          <Figure
            uid={uid}
            cast={p.cast ?? {is: 'dad'}}
            x={DAD_X}
            y={GROUND}
            size={640}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'worried', pose: 'offer', hold: 'money', turn: 0.45},
              {at: hit, face: 'shock', pose: 'handsHead', turn: 0.3},
            ]}
          />
          <Notes frame={frame} at={hit} direction="out" from={{x: DAD_X + 210, y: GROUND - 250}} n={8} size={92} uid={uid} />
          <FaceFx kind="sweat" frame={frame} x={DAD_X + 70} y={GROUND - 610} size={80} at={hit + 4} time={time} uid={uid} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: L.camSafe.left,
            top: 430,
            whiteSpace: 'nowrap',
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 132,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: landed ? toneBig('down') : C.ink,
            transform: `scale(${(1 + 0.06 * Math.max(0, 1 - (frame - hit) / 8) * (landed ? 1 : 0)).toFixed(4)})`,
            transformOrigin: 'left center',
          }}
        >
          {group(count)} {p.unit ?? '₾'}
        </div>
      </Hud>
      <Sfx name="asmr-count-roll" at={Math.max(base, e + 2)} volume={0.3} />
      <Land at={hit} />
      <Sfx name="cc0-chips-stack" at={hit + 2} volume={0.35} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
