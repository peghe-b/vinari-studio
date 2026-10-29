// V136CarplayScreenHook: the hook. Inside the white crossover at the junction at dusk, seen from the passenger's side: Dato
// leans in over the wheel to squint at a phone the size of a matchbox in its holder, while the car's own wide screen beside
// it glows with nothing but the radio. The horn from behind (the spec's sfx on frame 0) and Tamar's line, set big at frame 0.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead} from '../common';
import {C, F} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';
import {Figure} from '../illo/figure';
import {Handset} from '../illo/handset';
import {Backdrop} from '../illo/backdrop';
import {ground} from '../illo/palette';
import {FOOT, IlloBand, Svg} from '../illo/scene';
import {rr, Solid} from '../illo/solid';

type P = {
  look?: string;
  claim?: string; // the line readable at frame 0
  station?: string; // what the big screen shows (the radio)
  hitAt?: number | string;
};

const BASE = 980; // the horizon through the windscreen
const DASH = 1150; // the dashboard's top edge
const SX = 560; // the car's wide screen
const SY = 820;
const SW = 400;
const SH = 250;

export const V136CarplayScreenHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const time = 'day' as const;
  // he leans in towards the tiny phone from the first frame, and jerks back on the second chunk
  const lean = 1 - spr(frame, hit, 'land');
  const claim = mtav(p.claim ?? '');
  const size = Math.min(112, Math.floor((112 * 780) / Math.max(1, textWidth(claim, `800 112px ${F.sans}`))));
  const glow = 0.75 + 0.25 * Math.sin(frame / 5);
  // the horn jolts him on the first frames, and the claim pops in
  const shake = 14 * Math.sin(frame * 2.2) * (1 - prog(frame, e, 16));
  const pop = 1.14 - 0.14 * prog(frame, 0, 8, ease.enter);
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={BASE} />
          <rect x={-200} y={BASE} width={1480} height={FOOT - BASE} fill={ground(time)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Solid uid={uid} d={`M-200 ${DASH + 20}Q540 ${DASH - 50} 1280 ${DASH + 20}L1280 ${FOOT}L-200 ${FOOT}Z`} tone={6} time={time} />
          <g className={OBJ}>
            <path d={rr(SX, SY, SW, SH, 28)} fill={C.il7} />
            <path d={rr(SX + 18, SY + 18, SW - 36, SH - 36, 18)} fill={C.il5} opacity={0.5 * glow} />
          </g>
          <Handset uid={uid} x={470} y={930} w={92} tilt={-3} frame={frame} time={time} lit={0.6 + 0.4 * prog(frame, e, 6, ease.enter)} />
          <Figure uid={`${uid}d`} cast={{is: 'me', gender: 'm', age: 'adult', outfit: 'knit', hair: 'side', beard: 'short', hairTone: 5, tone: 6}} x={230 + 40 * lean + shake} y={1330} size={760} pose="sitDrive" face={frame < hit ? 'worried' : 'shock'} turn={0.6} frame={frame} time={time} gaze={[0.5, 0.2]} />
        </Svg>
        <div className={TXT} style={{position: 'absolute', left: SX, top: SY + SH / 2 - 34, width: SW, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 56, lineHeight: '68px', color: '#FFFFFF'}}>{mtav(p.station ?? '')}</div>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: 110, width: 860, top: 400, textAlign: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: `${Math.round(size * 1.12)}px`, color: C.ink, whiteSpace: 'nowrap', transform: `translateY(${(-6 * prog(frame, hit, 6, ease.enter)).toFixed(2)}px) scale(${pop.toFixed(4)})`}}>{claim}</div>
      </Hud>
      <Haptic kind="rigid" at={Math.max(lead(ctx), e)} />
      <Haptic kind="light" at={hit} />
    </IlloBand>
  );
};
