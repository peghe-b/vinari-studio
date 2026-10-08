// src/scenes/film/V90OnePlace.tsx: v90-one-place's own picture. A car owner's clutter (the keys, a parking ticket, the
// papers on a clipboard, a wrench, the money) hangs in the air of a dusk room, drifting in a loose ring around an
// idle phone. On the key moment the ring spirals in and every thing drops into the phone, which wakes on the Vinari mark.
// Props: look "illustrated", hitAt (a chunk or "1.2s"), line (the punch, "*word*"), tone, time, where.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {BrandMark, cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop, type BackdropKind} from '../illo/backdrop';
import {Handset} from '../illo/handset';
import {Prop, type Item} from '../illo/props';
import {Sparks} from '../illo/fx';
import {dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  where?: BackdropKind;
  time?: 'day' | 'night' | 'dusk';
};

const PX = 540; // the phone's centre
const PY = 800;
const PW = 250;
const FLOOR = 1330;
// the clutter: item, ring angle (deg), radius, size, own spin
const THINGS = [
  {item: 'keys', a: -100, r: 330, s: 22, spin: 14},
  {item: 'ticket', a: -30, r: 360, s: 26, spin: -18},
  {item: 'clipboard', a: 40, r: 340, s: 20, spin: 10},
  {item: 'wrench', a: 115, r: 350, s: 22, spin: -22},
  {item: 'money', a: 185, r: 330, s: 24, spin: 16},
  {item: 'coffee', a: 250, r: 300, s: 20, spin: -8},
];

export const V90OnePlace: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const time = timeOf(p);
  const night = dark(time);
  // the pull: the ring tightens just before the hit, everything is in the phone on it
  const pull = prog(frame, hit - 16, 16, ease.whipIn);
  const wake = spr(frame, hit, 'land');
  const appear = spr(frame, e, 'enterXL');
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind={p.where ?? 'room'} uid={uid} frame={frame} time={time} base={FLOOR} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={FLOOR} width={1320} height={FOOT - FLOOR} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={PX} cy={FLOOR + 4} rx={170 + 30 * wake} ry={16} />
          <Handset uid={uid} x={PX} y={PY + 8 * Math.sin(frame / 22)} w={PW * (0.96 + 0.04 * appear) * (1 + 0.04 * kick)} tilt={-4 * (1 - wake)} frame={frame} time={time} lit={wake} />
          {THINGS.map((t, i) => {
            const orbit = ((t.a + frame * 0.55) * Math.PI) / 180;
            const r = t.r * (1 - pull) * (0.9 + 0.1 * appear);
            const x = PX + Math.cos(orbit) * r;
            const y = PY - 40 + Math.sin(orbit) * r * 0.82 + 10 * Math.sin(frame / 15 + i);
            const k = 1 - 0.85 * pull;
            if (pull >= 0.999) return null;
            return <Prop key={i} item={t.item as Item} x={x} y={y} scale={t.s * k} uid={uid} frame={frame} time={time} rotate={t.spin * Math.sin(frame / 30 + i) * (1 - pull)} />;
          })}
          {frame >= hit ? <Sparks frame={frame} x={PX} y={PY} at={hit} spread={180} n={22} uid={uid} time={time} /> : null}
        </Svg>
        <div style={{position: 'absolute', left: PX - 80, top: PY - 70, width: 160, opacity: wake, transform: `scale(${(0.7 + 0.3 * wake).toFixed(3)})`}}>
          <BrandMark kind="mark" width={160} style={{filter: 'brightness(0) invert(0.96)'}} />
        </div>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ეგაა*'} at={hit} fx="slam" size={110} punchTone={p.tone ?? 'up'} />
        </div>
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 16)} volume={0.3} />
      <Sfx name="asmr-screen" at={hit} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
