// V135GrandmaEvHook: the struck word. Frame 0 already reads the claim (Mtavruli, big, ink on paper) over the 1899 plate
// of the record car, shown whole; on frame 2 a red ink strike runs through it, on the year's chunk the stamp rolls back
// from today's year to 1899, and on the "me" line an ink circle lands round the car on the plate.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, Haptic} from '../common';
import {C} from '../../tokens';
import {spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Card, drift, FitText, RollDigits, S} from '../kit/p2';
import {Ink} from '../kit/ink';

type P = {
  claim?: string; // the struck word, readable at frame 0
  src?: string; // the plate (public/photos)
  year?: string; // the stamp the rewind lands on
  from?: string; // where the rewind starts
  yearAt?: number | string; // the chunk the year rolls on
  ringAt?: number | string; // the chunk the ring lands on
  ring?: {x: number; y: number; w: number; h: number}; // the car on the plate (plate fractions)
};

// the plate: 1600 x 1167, shown whole
const PW = 800;
const PH = Math.round((PW * 1167) / 1600);
const PX = 540 - PW / 2;
const PY = 1360 - PH;

export const V135GrandmaEvHook: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const yearAt = Math.max(8, cueFrame(ctx, p.yearAt ?? 1));
  const ringAt = Math.max(16, cueFrame(ctx, p.ringAt ?? '0.9s'));
  const r = p.ring ?? {x: 0.18, y: 0.3, w: 0.66, h: 0.5};
  const stamp = spr(frame, yearAt, 'punch');
  const claimY = S.top;
  const yearY = claimY + 250;
  return (
    <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg}}>
      <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: 540, y: 900})}}>
        <Card x={PX} y={PY} w={PW} h={PH} r={18}>
          <Img src={staticFile('photos/story-ev-is-old-2.jpg')} style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, objectFit: 'contain', filter: 'grayscale(1) contrast(1.1)'}} />
        </Card>
        <FitText text={p.claim ?? ''} x={540} y={claimY} w={S.right - S.left} size={210} min={120} maxLines={1} weight={700} align="center" anim="none" />
        {p.year ? (
          <div className={TXT} style={{position: 'absolute', left: 0, width: 1080, top: yearY, textAlign: 'center', opacity: frame < yearAt ? 0 : Math.min(1, stamp * 1.4), transform: `scale(${(1.2 - 0.2 * Math.min(1, stamp)).toFixed(4)})`}}>
            <RollDigits text={p.year} from={p.from} at={yearAt} size={170} dur={22} />
          </div>
        ) : null}
      </div>
      <Ink
        end={ctx.dur}
        marks={[
          {kind: 'strike', box: {x: 250, y: claimY + 40, w: 580, h: 130}, at: 2},
          {kind: 'circle', box: {x: PX + r.x * PW, y: PY + r.y * PH, w: r.w * PW, h: r.h * PH}, at: ringAt},
        ]}
      />
      <Haptic kind="rigid" at={yearAt + 2} volume={0.3} />
    </div>
  );
};
