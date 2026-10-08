// src/scenes/film/V88MercedesGirl.tsx: two girls at a club bar at night. Slow light beams sweep the back wall, a
// mirror ball turns; the friend leans in and tells "me" something, and on the key moment "me" turns to her in shock,
// the beams flare and the punch word slams in with the camera's kick.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, rgba, type Tone} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {FaceFx} from '../illo/fx';
import {far, lamp, near} from '../illo/palette';
import {FOOT, IlloBand, Svg, TOP} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  laughAt?: number | string; // "me" laughs it off
  line?: string;
  tone?: Tone;
  me?: Cast;
  friend?: Cast;
};

const BAR = 1150; // the bar counter's top edge (stage y): waist high, in front of the two
const FLOOR = 1340; // where the two stand, behind the counter
const ME_X = 690;
const FR_X = 380;
const BALL_X = 540;
const BALL_Y = 300;
const BEAMS = 6;

export const V88MercedesGirl: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const laugh = Math.max(hit + 12, cueFrame(ctx, p.laughAt ?? 2));
  const kick = useKick();
  const time = 'night';
  const flare = prog(frame, hit, 10, ease.whipOut) * (1 - prog(frame, hit + 10, 24, ease.drift));
  const wall = far(0.6, time);
  return (
    <IlloBand uid={uid} time={time}>
      {/* the back wall: the club's dark, the sweeping beams and the mirror ball */}
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP - 200} width={1480} height={FOOT - TOP + 400} fill={wall} />
          {Array.from({length: BEAMS}, (_, i) => {
            const sway = Math.sin(frame / (34 + i * 5) + i * 1.7) * 26 + (i - (BEAMS - 1) / 2) * 22;
            const a = (sway * Math.PI) / 180;
            const len = 1700;
            const w = 0.07;
            const x1 = BALL_X + Math.sin(a - w) * len;
            const y1 = BALL_Y + Math.cos(a - w) * len;
            const x2 = BALL_X + Math.sin(a + w) * len;
            const y2 = BALL_Y + Math.cos(a + w) * len;
            const op = 0.07 + 0.05 * Math.sin(frame / 11 + i * 2.3) + 0.22 * flare;
            return <polygon key={i} points={`${BALL_X},${BALL_Y} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`} fill={rgba(lamp(time), Math.max(0.02, op))} />;
          })}
          <line x1={BALL_X} y1={TOP - 100} x2={BALL_X} y2={BALL_Y - 46} stroke={C.il5} strokeWidth={2} />
          <circle cx={BALL_X} cy={BALL_Y} r={46} fill={C.il4} />
          {Array.from({length: 5}, (_, r) =>
            Array.from({length: 6}, (_, c) => {
              const ph = (frame / 6 + c * 1.3 + r * 0.7) % 6;
              const x = BALL_X - 36 + c * 14 + ((frame / 3) % 14);
              const y = BALL_Y - 30 + r * 14;
              if (Math.hypot(x - BALL_X, y - BALL_Y) > 40) return null;
              return <rect key={`${r}-${c}`} x={x - 5} y={y - 5} width={10} height={10} rx={2} fill={ph < 1 ? C.il0 : C.il3} opacity={0.9} />;
            }),
          )}
          {/* the bottles on the back shelf, quiet silhouettes */}
          <rect x={-200} y={760} width={1480} height={8} fill={C.il6} />
          {Array.from({length: 16}, (_, i) => {
            const x = 40 + i * 66;
            const h = 70 + ((i * 37) % 50);
            return <rect key={i} x={x} y={760 - h} width={26} height={h} rx={8} fill={C.il6} opacity={0.9} />;
          })}
        </Svg>
      </CameraLayer>
      {/* the two at the bar */}
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={FLOOR - 20} width={1480} height={FOOT - FLOOR + 220} fill={near(time)} />
          <Shadow uid={uid} cx={FR_X} cy={FLOOR + 2} rx={110} />
          <Shadow uid={uid} cx={ME_X} cy={FLOOR + 2} rx={110} />
          <Figure
            uid={uid}
            cast={p.friend ?? {is: 'friend', gender: 'f', outfit: 'dress', hair: 'long', extras: ['hoops']}}
            x={FR_X}
            y={FLOOR}
            size={830}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'smirk', pose: 'stand', turn: 0.5},
              {at: Math.max(e + 4, hit - 14), face: 'grin', pose: 'pointYou', turn: 0.6},
              {at: hit + 10, face: 'laugh', pose: 'pointYou', turn: 0.6},
            ]}
          />
          <Figure
            uid={uid}
            cast={p.me ?? {is: 'me', gender: 'f', outfit: 'blouse', hair: 'bob', extras: ['earrings', 'watch']}}
            x={ME_X}
            y={FLOOR}
            size={810}
            frame={frame}
            time={time}
            acts={[
              {at: e, face: 'smile', pose: 'stand', turn: 0.3},
              {at: hit, face: 'shock', pose: 'handsHead', turn: -0.5},
              {at: laugh, face: 'laugh', pose: 'shrug', turn: -0.4},
            ]}
          />
          <FaceFx kind="shock" frame={frame} x={ME_X + 60} y={FLOOR - 760} size={100} at={hit} time={time} uid={uid} />
        </Svg>
      </CameraLayer>
      {/* the counter in front, two glasses on it */}
      <CameraLayer depth={1.3}>
        <Svg>
          <rect x={-240} y={BAR} width={1560} height={FOOT - BAR + 260} fill={C.il7} />
          <rect x={-240} y={BAR} width={1560} height={6} fill={rgba(lamp(time), 0.35 + 0.4 * flare)} />
          {[470, 600].map((x, i) => (
            <g key={i} opacity={0.95}>
              <path d={`M${x - 22} ${BAR - 70} L${x + 22} ${BAR - 70} L${x + 6} ${BAR - 30} L${x + 4} ${BAR - 4} L${x - 4} ${BAR - 4} L${x - 6} ${BAR - 30} Z`} fill={C.il5} stroke={C.il2} strokeWidth={2} />
              <rect x={x - 16} y={BAR - 6} width={32} height={6} rx={3} fill={C.il3} />
            </g>
          ))}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 600, top: 390, whiteSpace: 'nowrap', transform: `scale(${(1 + 0.04 * kick).toFixed(4)})`, transformOrigin: 'left center'}}>
          <Words text={p.line ?? '*ვინ?*'} at={hit} fx="slam" size={120} punchTone={p.tone ?? 'accent'} />
        </div>
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.22} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
