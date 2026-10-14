// src/scenes/film/NavPromoReveal.tsx: the navigator promo's reveal (the owner, 2026-10-12: "the screen goes black for 2-3 s,
// then the phone rises in 3D and lights up from the edges", the SteelSeries move).
//
// It opens on black (the forest scene sank into it). The iPhone rises out of the dark as a silhouette, and a rim of light
// runs along its edges (a tight bright line and a wide soft halo, the device's own outline); on the second line of the
// voice its screen wakes (the real navigator screen) and the white of the film opens out from the phone in a soft circle.
// The Phone scene draws the device and the screen (src/scenes/Phone.tsx), this scene moves and lights it.
//
// Props: src (the screen), riseAt (when the phone starts to rise, "0.4s" or a chunk), onAt (when the screen wakes and the
// white opens; a chunk index or "1.6s").
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';
import {C, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {Phone} from '../Phone';
import type {SceneCtx} from '../../types';

type P = {src?: string; riseAt?: number | string; onAt?: number | string; focus?: unknown; highlight?: unknown};

export const NavPromoReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const rise = Math.max(e + 6, cueFrame(ctx, p.riseAt ?? '0.4s'));
  const on = Math.max(rise + 30, cueFrame(ctx, p.onAt ?? 1));
  // the rise: from below, tilted back and turned, settling upright on a spring
  const up = spr(frame, rise, 'enterXL');
  const settle = prog(frame, rise, 80, ease.camera);
  const tiltX = 34 * (1 - settle);
  const tiltY = -20 * (1 - settle);
  const y = 560 * (1 - up);
  const s = 0.88 + 0.12 * settle;
  // the rim: the edges catch the light first, then the screen wakes
  const rim = prog(frame, rise + 8, 26, ease.enter);
  const wake = prog(frame, on, 16, ease.enter);
  const open = prog(frame, on + 10, 30, ease.enter);
  const lit = 0.04 + 0.96 * wake;
  const rimA = rim * (1 - open);
  const filter = `brightness(${lit.toFixed(3)}) drop-shadow(0 0 ${(2 + 3 * rim).toFixed(1)}px ${rgba(C.il0, 0.95 * rimA)}) drop-shadow(0 0 ${(10 + 46 * rim).toFixed(1)}px ${rgba(C.il0, 0.55 * rimA)})`;
  // the white opens out of the phone: a soft-edged circle
  const r = 40 + 2300 * open;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.ilNight}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="nprOpen">
            <stop offset="0" stopColor={C.bg} stopOpacity={1} />
            <stop offset="0.82" stopColor={C.bg} stopOpacity={1} />
            <stop offset="1" stopColor={C.bg} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="nprHalo">
            <stop offset="0" stopColor={C.il0} stopOpacity={0.16 * rim * (1 - open)} />
            <stop offset="1" stopColor={C.il0} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={540} cy={1000 + y * 0.6} rx={560} ry={760} fill="url(#nprHalo)" />
        {open > 0 ? <circle cx={540} cy={1000} r={r} fill="url(#nprOpen)" /> : null}
      </svg>
      {/* the phone rising in perspective, a silhouette with lit edges until the screen wakes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `perspective(2200px) translateY(${y.toFixed(1)}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(${s.toFixed(4)})`,
          transformOrigin: '540px 1100px',
          opacity: Math.min(1, up * 1.6),
          filter,
        }}
      >
        <Phone p={{src: '17-nav-drive', staging: 'device', whole: true}} ctx={ctx} />
      </div>
      <Sfx name="asmr-air-long" at={Math.max(base, rise)} volume={0.26} />
      <Sfx name="asmr-shimmer" at={Math.max(base, rise + 10)} volume={0.24} />
      <Sfx name="asmr-screen" at={Math.max(base, on)} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, on + 6)} volume={0.3} />
      <Haptic kind="rigid" at={Math.max(base, on)} />
    </div>
  );
};
