// V135CarrierJam: the problem lived (v135-carrier-jam, humour). Gio is late for the seller of his first car: the jam he is
// stuck in, a real photo cropped to it (greyscale), and over it the clock he keeps looking at, rolling later on each chunk
// (three escalations), the hand ring landing round it on the last one. Paper and ink, one data hue on the clock's last jump.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {prog, ease} from '../../lib/anim';
import {Hud} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {Card, FitText, RollDigits, S, shadow, tone} from '../kit/p2';
import {Ink} from '../kit/ink';

type P = {
  src?: string; // the jam (public/photos)
  label?: string; // what the clock means (a punch: never the subtitle's words)
  times?: string[]; // the clock's three readings, the same length („18:40")
  at1?: number | string;
  at2?: number | string;
};

const PH = {x: 130, y: 410, w: 820, h: 600};
const CL = {x: 190, y: 1050, w: 700, h: 260};

export const V135CarrierJam: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const times = p.times ?? ['18:40', '18:47', '18:55'];
  const a1 = Math.max(base + 8, cueFrame(ctx, p.at1 ?? '0.5s'));
  const a2 = a1 + 16;
  const rise = prog(frame, e, 10, ease.enter);
  const push = 1 + 0.06 * prog(frame, e, ctx.dur, ease.drift);
  return (
    <PictureBand camera={false}>
      <Card x={PH.x} y={PH.y} w={PH.w} h={PH.h} r={30} style={{background: '#0B0B0B', opacity: rise}}>
        <Img
          src={staticFile('photos/tbilisi-street-night.jpg')}
          style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.08)', transform: `scale(${push.toFixed(4)})`, transformOrigin: '50% 60%'}}
        />
      </Card>
      <Card x={CL.x} y={CL.y} w={CL.w} h={CL.h} r={30} style={{boxShadow: shadow(1.2), opacity: rise}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 26, display: 'flex', justifyContent: 'center'}}>
          <RollDigits text={times[times.length - 1]} from={times[0]} at={a1} size={150} t="ink" />
        </div>
      </Card>
      <Hud>
        <FitText text={p.label ?? 'გამყიდველი ელოდება'} x={S.cx} y={CL.y + CL.h + 14} w={640} size={40} min={34} maxLines={1} weight={600} align="center" t="quiet" at={e + 6} anim="none" />
        <Ink room={{x: CL.x, y: CL.y, w: CL.w, h: CL.h}} marks={[{kind: 'circle', box: {x: CL.x + 50, y: CL.y + 18, w: CL.w - 100, h: CL.h - 36}, at: a2}]} end={ctx.dur} color={tone('red')} />
      </Hud>
      <Sfx name="asmr-tap" at={a1} volume={0.25} />
      <Haptic kind="light" at={a1} />
      <Haptic kind="rigid" at={a2} volume={0.3} />
    </PictureBand>
  );
};
