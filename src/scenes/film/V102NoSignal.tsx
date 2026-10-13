// V102NoSignal: a mountain pass at night, no bars. The car stands on the shoulder with its hazards on, and in the
// foreground a hand lifts the phone to the sky, hunting for a signal: the bars on its screen stay hollow, and on the key
// moment a slash cuts them and the punch lands. A picture ("look": "illustrated"), full bleed, composed from the kit.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, rgba, halo, toneLine, accentsOn} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car, blink, type CarBody} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Handset, HandGrip} from '../illo/handset';
import {Icon} from '../illo/icons';
import {dark} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf, osc} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  line?: string;
  body?: CarBody;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1150;
const CAR_X = 690;
const PH_X = 320;
const PH_Y = 700;
const PH_W = 215;

export const V102NoSignal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const time = timeOf(p);
  const night = dark(time);
  const lift = spr(frame, e, 'enterXL');
  // the hand searches: a slow sway up and to the side, it stops still on the hit
  const still = prog(frame, hit, 10, ease.enter);
  const sway = (1 - still) * osc(frame, 46);
  const px = PH_X + 34 * sway;
  const py = PH_Y + 120 * (1 - lift) - 18 * (1 - still) * Math.abs(osc(frame, 23));
  const tilt = -10 + 6 * sway;
  const hz = blink(frame);
  const slash = prog(frame, hit, 8, ease.whipOut);
  const bars = accentsOn() ? toneLine('a') : C.ink;
  const screen = (w: number, h: number) => {
    const bw = w * 0.11;
    const gap = w * 0.06;
    const x0 = w / 2 - (4 * bw + 3 * gap) / 2;
    const yb = h * 0.46;
    const scanning = (frame - e) % 30 < 15 && frame < hit;
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} fill={C.ilFeature} />
        {[0, 1, 2, 3].map((i) => {
          const bh = w * (0.12 + 0.1 * i);
          const x = x0 + i * (bw + gap);
          return (
            <rect
              key={i}
              x={x}
              y={yb - bh}
              width={bw}
              height={bh}
              rx={bw * 0.25}
              fill="none"
              stroke={C.il0}
              strokeOpacity={scanning && i === Math.floor(((frame - e) % 30) / 4) % 4 ? 0.9 : 0.45}
              strokeWidth={Math.max(2, w * 0.012)}
            />
          );
        })}
        <line
          x1={x0 - gap}
          y1={yb + gap * 0.5}
          x2={x0 - gap + (4 * bw + 5 * gap) * slash}
          y2={yb + gap * 0.5 - w * 0.5 * slash}
          stroke={bars}
          strokeWidth={Math.max(3, w * 0.022)}
          strokeLinecap="round"
          opacity={slash > 0 ? 1 : 0}
        />
        <Icon name="engine" x={w / 2} y={h * 0.7} size={w * 0.34} color={bars} opacity={0.55 + 0.45 * hz} />
      </g>
    );
  };
  return (
    <IlloBand uid={uid} time={time}>
      {/* the far plane: the pass at night */}
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={GROUND} drift={0.12} />
        </Svg>
      </CameraLayer>
      {/* the subject: the shoulder, the car with its hazards */}
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <line x1={-200} y1={GROUND + 60} x2={1280} y2={GROUND + 60} stroke={rgba(C.il0, night ? 0.14 : 0.3)} strokeWidth={3} strokeDasharray="60 50" />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={330} ry={18} />
          <circle cx={CAR_X - 300} cy={GROUND - 70} r={70} fill={halo(accentsOn() ? C.accB : C.ink2, 0.25 * hz)} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={660} body={p.body ?? 'sedan'} paint="a" caliper="b" dir={-1} frame={frame} time={time} lights={{hazard: 1, tail: 0.6, head: night ? 0.8 : 0}} />
        </Svg>
      </CameraLayer>
      {/* the foreground: the hand and the phone lifted to the sky */}
      <CameraLayer depth={1.3}>
        <Svg>
          <HandGrip uid={uid} part="back" x={px} y={py} w={PH_W} tilt={tilt} frame={frame} time={time} />
          <Handset uid={uid} x={px} y={py} w={PH_W} tilt={tilt} frame={frame} time={time} lit={prog(frame, e, 8)} screen={screen} />
          <HandGrip uid={uid} part="front" x={px} y={py} w={PH_W} tilt={tilt} frame={frame} time={time} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 560, top: 470 - 6 * kick, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? 'ქსელი *0*'} at={hit} fx="slam" size={92} punchTone="down" color={night ? C.il0 : C.ink} />
        </div>
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.22} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
