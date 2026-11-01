// V143FunnyGirls: v143-funny-girls' own picture. Two friends on a seaside road in an accent EV, seen from the side, their
// heads in the glass. The car itself laughs: its body bounces in the rhythm of the girls' laughter (mode "road"); then
// the third joker joins (mode "joke"): a voice ribbon unrolls out of the dash through the cabin, the car shakes harder
// with the laugh on the key moment and the punch lands over the sky.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, accentsOn} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Figure} from '../illo/figure';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'road' | 'joke';
  hitAt?: number | string;
  line?: string;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1180;
const CAR_X = 540;
const LEN = 780;
const SPAN = 1440;

/** the coast road: the kerb, the asphalt and its lane dashes streaming by */
const RoadBed: React.FC<{frame: number}> = ({frame}) => {
  const shift = (frame * 14) % 240;
  const dashes = [];
  for (let i = -1; i < 7; i++) dashes.push(<rect key={i} x={i * 240 - shift} y={GROUND + 120} width={130} height={12} rx={6} fill={C.il0} />);
  const posts = [];
  for (let i = 0; i < 6; i++) {
    const x = (((i * 260 - frame * 20) % SPAN) + SPAN) % SPAN - 180;
    posts.push(<rect key={i} x={x} y={GROUND - 64} width={10} height={64} rx={4} fill={C.il5} />);
  }
  return (
    <g>
      <rect x={-200} y={GROUND - 70} width={1480} height={12} rx={6} fill={C.il5} />
      {posts}
      <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il2} />
      <rect x={-200} y={GROUND + 8} width={1480} height={320} fill={C.il6} />
      <rect x={-200} y={GROUND + 8} width={1480} height={6} fill={C.il4} />
      {dashes}
    </g>
  );
};

export const V143FunnyGirls: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const time = timeOf(p);
  const base = lead(ctx);
  const e = entrance(ctx);
  const joke = p.mode === 'joke';
  const hit = joke ? Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1)) : 1e9;
  const kick = useKick();
  // the laugh: a soft bounce all the time, a hard one from the hit on
  const hard = joke ? prog(frame, hit, 6) * (1 - 0.6 * prog(frame, hit + 40, 30)) : 0;
  const amp = 2.5 + 7 * hard;
  const bob = amp * Math.abs(Math.sin(frame / 2.6));
  const pitch = 0.5 * Math.sin(frame / 3.4) + 1.2 * hard * Math.sin(frame / 2.1);
  // the third voice: a ribbon unrolling from the dash, through the cabin, out over the roof
  const ribbon = joke ? prog(frame, Math.max(e, base + 2), 26, ease.enter) : 0;
  const ribCol = accentsOn() ? C.accB : C.il7;
  const pts: string[] = [];
  const N = 36;
  const x0 = CAR_X + 230;
  const x1 = CAR_X - 300;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (u > ribbon) break;
    const x = x0 + (x1 - x0) * u;
    const y = GROUND - 330 - 70 * u + (18 + 26 * hard) * Math.sin(u * 14 - frame / 3);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(y - bob).toFixed(1)}`);
  }
  const girl = {is: 'girl' as const, gender: 'f' as const, outfit: 'blouse' as const, hair: 'bob' as const, extras: ['hoops' as const]};
  const friend = {is: 'friend' as const, gender: 'f' as const, outfit: 'turtleneck' as const, hair: 'curls' as const};
  const laughFace = frame % 40 < 30 ? 'laugh' : 'grin';
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="coast" uid={uid} frame={frame} time={time} base={GROUND - 70} drift={3} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <RoadBed frame={frame} />
          <Car
            uid={`${uid}c`}
            x={CAR_X}
            y={GROUND + 70}
            len={LEN}
            body="ev"
            paint="a"
            dir={-1}
            frame={frame}
            time={time}
            speed={0.55}
            bob={bob}
            pitch={pitch}
            cabin={(b) => (
              <g>
                <Figure uid={`${uid}f1`} cast={girl} x={b.x + b.w * 0.36} y={b.y + b.h * 0.6} size={b.h * 6.2} crop="head" turn={-0.6} face={laughFace} frame={frame} time={time} />
                <Figure uid={`${uid}f2`} cast={friend} x={b.x + b.w * 0.74} y={b.y + b.h * 0.62} size={b.h * 6} crop="head" turn={-0.7} face={frame % 46 < 34 ? 'laugh' : 'smile'} frame={frame + 17} time={time} />
              </g>
            )}
          />
          {joke && pts.length > 1 ? <path d={pts.join('')} fill="none" stroke={ribCol} strokeWidth={9 + 4 * kick} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} /> : null}
        </Svg>
      </CameraLayer>
      {joke ? (
        <Hud>
          <div style={{position: 'absolute', left: 0, width: 1080, top: 450, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line ?? 'სამი *ხუმარა*'} at={hit} fx="slam" size={100} color={C.ink} />
          </div>
          <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.26} />
          <Land at={hit} />
          <Haptic kind="rigid" at={hit + 2} volume={0.3} />
        </Hud>
      ) : (
        <Sfx name="asmr-air-long" at={Math.max(base, e + 2)} volume={0.22} />
      )}
    </IlloBand>
  );
};
