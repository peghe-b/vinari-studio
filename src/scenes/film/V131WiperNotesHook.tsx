// V131WiperNotesHook: v131-wiper-notes' hook. Frame 0: his phone already buzzing in his hand, an unknown number on it; behind
// it, soft and far, the same crossover parked on the strip outside his block. He answers on the hit and the call starts:
// the dealer's question is the voice's first line.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, Haptic, lead, Sfx} from '../common';
import {CameraLayer} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {CallScreen, Handset, HandGrip, heldPlace} from '../illo/handset';
import {IlloBand} from '../illo/scene';

type P = {look?: 'illustrated'; hitAt?: number | string; caller?: string};

export const V131WiperNotesHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const t = useCurrentFrame();
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.5s'));
  const ph = heldPlace(560, 760, 380);
  const ring = {from: 0, until: hit};
  const drift = 30 * Math.min(1, t / 60);
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Backdrop kind="city" uid={uid} frame={t} time="day" base={1180} />
          <Car uid={uid} x={330 + drift} y={1240} len={420} view="side" body="ev" paint="a" dir={1} frame={t} speed={0} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <HandGrip uid={uid} part="back" x={ph.x} y={ph.y} w={ph.w} frame={t} ring={ring} time="day" />
          <Handset
            uid={uid}
            x={ph.x}
            y={ph.y}
            w={ph.w}
            frame={t}
            ring={ring}
            lit={1}
            time="day"
            screen={(w, h) => <CallScreen uid={uid} w={w} h={h} frame={t} name={p.caller ?? 'უცნობი ნომერი'} state="answer" at={hit} />}
          />
          <HandGrip uid={uid} part="front" x={ph.x} y={ph.y} w={ph.w} frame={t} ring={ring} time="day" thumb={Math.min(1, Math.max(0, (t - hit + 8) / 8))} />
        </svg>
      </CameraLayer>
      <Sfx name="asmr-tap" at={Math.max(base, hit)} volume={0.3} />
      <Haptic kind="rigid" at={hit} volume={0.3} />
    </IlloBand>
  );
};
