// src/scenes/film/V92AndroidLaunch.tsx: v92-android-launch, the launch. A quiet showroom plinth with one phone standing on
// it; a slot in the plinth's top opens, steam breathes out and a second phone rises out of it on a spring to stand beside
// the first, its screen waking. The two names stand over them: the first quiet, the second slams in with the camera's kick.
// Props: look ("illustrated"), hitAt (the second phone lands), line ("first · *second*": the two names), tone, time.
import React, {useId} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, F, rgba, toneBig, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Handset} from '../illo/handset';
import {Confetti, Halo, Smoke} from '../illo/fx';
import {FOOT, IlloBand, Svg, TOP, timeOf} from '../illo/scene';
import {rr, Shadow, Solid} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  time?: 'day' | 'night' | 'dusk';
};

// stage layout: the floor line, the plinth, the two phones
const FLOOR = 1270;
const PL_TOP = 1180;
const PL_H = 64;
const PL_X = 150;
const PL_W = 780;
const PW = 250;
const PH = PW * 2.05;
const A_X = 345;
const B_X = 735;
const REST = PL_TOP - PH / 2 - 4;

/** The phone's own screen: a calm feed of abstract cards (no app, no logo). */
const feed = (w: number, h: number, k: number) => (
  <g>
    <rect x={0} y={0} width={w} height={h} fill={C.screen} />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={w * 0.08} y={h * (0.12 + i * 0.2) + (1 - k) * 18 * (i + 1)} width={w * 0.84} height={h * 0.16} rx={w * 0.05} fill={i === 0 ? C.il2 : C.il1} opacity={k} />
    ))}
  </g>
);

export const V92AndroidLaunch: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? '0.8s'));
  const kick = useKick();
  const time = timeOf(p);
  const tone = p.tone ?? 'up';
  const parts = String(p.line ?? '').split(' · ');
  const first = parts[0] ?? '';
  const second = parts[1] ?? '';
  // the slot opens, then the phone rises out of the plinth and lands on a spring
  const rise0 = hit - 14;
  const slotK = prog(frame, rise0 - 8, 8, ease.enter);
  const up = spr(frame, rise0, 'land');
  const by = interpolate(up, [0, 1], [PL_TOP + PH / 2 + 10, REST]);
  const lit = prog(frame, hit, 10, ease.enter);
  const litA = 0.85 + 0.15 * prog(frame, e, 10, ease.enter);
  const glow = 0.35 + 0.65 * prog(frame, hit - 4, 16, ease.enter);
  const clip = `v92clip${uid.replace(/[^A-Za-z0-9]/g, '')}`;
  return (
    <IlloBand uid={uid} time={time}>
      {/* the far plane: the showroom wall, a soft light behind the plinth */}
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FLOOR - TOP} fill={C.il1} />
          <Halo uid={uid} x={540} y={860} r={520} kind={tone === 'down' ? 'down' : 'up'} opacity={0.5 * glow} />
        </Svg>
      </CameraLayer>
      {/* the subject: the floor, the plinth, the two phones */}
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={FLOOR} width={1480} height={FOOT - FLOOR} fill={C.il2} />
          <Shadow uid={uid} cx={540} cy={PL_TOP + PL_H + 6} rx={420} ry={22} />
          <Solid uid={uid} d={rr(PL_X, PL_TOP, PL_W, PL_H, 18)} tone={1} rim outline time={time} />
          {/* the slot in the plinth's top, opening under the second phone */}
          <rect x={B_X - (PW / 2 + 14) * slotK} y={PL_TOP - 3} width={(PW + 28) * slotK} height={8} rx={4} fill={C.il5} opacity={slotK} />
          <Shadow uid={uid} cx={A_X} cy={PL_TOP + 2} rx={130} ry={10} />
          <Handset uid={uid} x={A_X} y={REST} w={PW} tilt={0} frame={frame} lit={litA} time={time} screen={(w, h) => feed(w, h, 1)} />
          <defs>
            <clipPath id={clip}>
              <rect x={0} y={TOP} width={1080} height={PL_TOP - TOP + 2} />
            </clipPath>
          </defs>
          {/* steam breathes out of the slot behind the rising phone, then settles */}
          {frame < hit + 40 ? <Smoke frame={frame} x={B_X} y={PL_TOP} n={6} kind="steam" rise={0.7} spread={2.6} size={0.9} at={rise0 - 4} time={time} uid={uid} /> : null}
          <g clipPath={`url(#${clip})`}>
            <Handset uid={uid} x={B_X} y={by} w={PW} tilt={0} frame={frame} lit={lit} time={time} screen={(w, h) => feed(w, h, lit)} />
          </g>
        </Svg>
      </CameraLayer>
      {/* the foreground: confetti thrown up on the landing */}
      <CameraLayer depth={1.3}>
        <Svg>
          <Confetti frame={frame} x={B_X} y={REST - PH / 2} at={hit + 2} n={34} spread={55} power={1.1} tone={tone} />
        </Svg>
      </CameraLayer>
      {/* the names over the phones: never moved by the camera */}
      <Hud>
        <div
          className={TXT}
          style={{position: 'absolute', left: A_X - 200, width: 400, top: 562, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 52, color: C.ink2, opacity: prog(frame, e, 10, ease.enter), whiteSpace: 'nowrap'}}
        >
          {mtav(first)}
        </div>
        <div style={{position: 'absolute', left: B_X - 230, width: 460, top: 532, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap', transform: `scale(${(1 + 0.06 * kick).toFixed(4)})`}}>
          <Words text={second} at={hit} fx="slam" size={76} weight={700} punchTone={tone} />
        </div>
        <div style={{position: 'absolute', left: B_X - 60, width: 120, top: 640, height: 4, borderRadius: 2, backgroundColor: rgba(toneBig(tone), 0.9 * lit)}} />
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, rise0 - 8)} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, rise0)} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
