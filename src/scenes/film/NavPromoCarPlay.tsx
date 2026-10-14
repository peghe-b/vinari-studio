// src/scenes/film/NavPromoCarPlay.tsx: the navigator promo's CarPlay beat (the owner, 2026-10-12: "show the CarPlay screen:
// from inside the car, zoom in so it is clear we are in the car and this is the car's screen"; a PROMISE: CarPlay is
// coming, so the screen carries a small „მალე" tag).
//
// The driver's view at dusk: the road streaming into the mountains through the windscreen, the cabin around it, and on the
// dash a wide car screen in the CarPlay layout: the real VINARI map (the navigator's own screen, cropped) with the turn
// card on top. The camera starts in the cabin and pushes into the car screen; the „მალე" tag lands as it arrives.
//
// Props: src (the screen whose map is shown), soonAt (when the tag lands), dist / street (the turn card), time.
import React, {useId} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';
import {C, F, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Cabin, Road, view} from '../illo/road';
import {IlloBand, Svg} from '../illo/scene';

type P = {src?: string; soonAt?: number | string; dist?: string; street?: string; soon?: string; time?: 'day' | 'dusk' | 'night'};

// the car screen on the dash, in stage units
const SX = 540;
const SY = 1040;
const SW = 560;
const SH = 300;

const ARROW = 'M30 104V58C30 38 42 26 62 26H80V8L112 38L80 68V50H62C56 50 54 54 54 60V104Z';

export const NavPromoCarPlay: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const raw = useId();
  const uid = raw.replace(/[^A-Za-z0-9]/g, '');
  const e = entrance(ctx);
  const base = lead(ctx);
  const soon = Math.max(base + 20, cueFrame(ctx, p.soonAt ?? 0) + 24);
  const time = p.time ?? 'dusk';
  const vw = view({hy: 700, vx: 540, h: 1.25, fp: 1000});
  const d = frame * 0.55;
  // the push from the cabin into the car screen: slow first, then it arrives
  const push = prog(frame, e + 8, Math.max(40, ctx.dur - 30), ease.camera);
  const zoom = 1 + 0.72 * push;
  const tag = spr(frame, soon, 'land');
  const glow = 0.55 + 0.45 * prog(frame, e, 30, ease.enter);
  return (
    <IlloBand uid={uid} time={time}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(4)})`, transformOrigin: `${SX}px ${SY}px`}}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={vw.hy + 2} drift={0.08} />
          <Road v={vw} d={d} time={time} uid={uid} lanes={[-1.8]} edges={[-5.4, 1.9]} posts={[-7.4, 3.4]} beam={0} />
          <Cabin uid={uid} time={time} frame={frame} wheelX={150} hands={false} mirror />
        </Svg>
        {/* the car screen: a wide dark glass on the dash, the CarPlay layout */}
        <div
          style={{
            position: 'absolute',
            left: SX - SW / 2 - 14,
            top: SY - SH / 2 - 14,
            width: SW + 28,
            height: SH + 28,
            borderRadius: 30,
            backgroundColor: C.ilGlass,
            boxShadow: `0 20px 50px ${rgba(C.ilNight, 0.45)}, 0 0 ${40 * glow}px ${rgba(C.il0, 0.18 * glow)}`,
          }}
        />
        <div style={{position: 'absolute', left: SX - SW / 2, top: SY - SH / 2, width: SW, height: SH, borderRadius: 20, overflow: 'hidden', backgroundColor: C.il1}}>
          <Img src={staticFile('screens/17-nav-drive.jpg')} style={{position: 'absolute', left: 0, top: -SW * 0.62, width: SW, height: SW * 2.172}} />
          {/* the CarPlay turn card, top left */}
          <div style={{position: 'absolute', left: 14, top: 14, width: 236, height: 104, borderRadius: 18, backgroundColor: rgba(C.ilGlass, 0.92)}}>
            <svg width={64} height={64} viewBox="0 0 120 120" style={{position: 'absolute', left: 12, top: 20}}>
              <path d={ARROW} fill={C.il0} />
            </svg>
            <div className={TXT} style={{position: 'absolute', left: 88, top: 14, font: `600 38px ${F.sans}`, color: C.il0, whiteSpace: 'nowrap'}}>
              {p.dist ?? '300 მ'}
            </div>
            <div className={TXT} style={{position: 'absolute', left: 90, top: 62, font: `500 20px ${F.sans}`, color: C.il3, whiteSpace: 'nowrap', width: 140, overflow: 'hidden'}}>
              {mtav(p.street ?? 'რუსთაველის გამზ.')}
            </div>
          </div>
          {/* the CarPlay side dock: three quiet icons */}
          <div style={{position: 'absolute', right: 0, top: 0, width: 54, height: SH, backgroundColor: rgba(C.ilGlass, 0.85)}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{position: 'absolute', left: 13, top: 30 + i * 80, width: 28, height: 28, borderRadius: 8, backgroundColor: rgba(C.il3, 0.7)}} />
            ))}
          </div>
        </div>
        {/* the promise: a small tag on the screen's corner */}
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: SX + SW / 2 - 150,
            top: SY - SH / 2 + 16,
            padding: '6px 16px',
            borderRadius: 999,
            backgroundColor: C.accA,
            color: C.il0,
            font: `600 26px ${F.sans}`,
            transform: `scale(${(0.6 + 0.4 * tag).toFixed(3)})`,
            opacity: tag,
            whiteSpace: 'nowrap',
          }}
        >
          {mtav(p.soon ?? 'მალე')}
        </div>
      </div>
      <Sfx name="real-interior-drive" at={base} volume={0.22} />
      <Sfx name="asmr-screen" at={Math.max(base, e + 10)} volume={0.28} />
      <Sfx name="asmr-pop" at={soon} volume={0.3} />
      <Haptic kind="light" at={soon} />
    </IlloBand>
  );
};
