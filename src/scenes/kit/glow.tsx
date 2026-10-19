// src/scenes/kit/glow.tsx: light that blooms (2026-10-19): headlamps, an LED, a lit screen, a warning lamp. Drawn in 2D over the
// 3D canvases (Car3, Phone3 render with alpha over the drawn worlds, so a GPU bloom pass there would lose its halo outside the
// car's own pixels): place a Glow at a projected 3D point (kit/car3d projectCar) and it adds soft light with "screen" blending,
// cheap on the cloud's software GL. Frame driven: pass `k` (0 off .. 1 full) from your own timing.
//
//   const lamp = projectCar(cam, [0.62, 0.72, 2.3]);   <Glow x={lamp.x} y={lamp.y} r={120} color="#FFF4E0" k={on} />
//   <Glow ... streak />   a thin horizontal lens streak through the core (anamorphic headlamps at night)
import React from 'react';
import {clamp} from './lib';

export const Glow: React.FC<{x: number; y: number; r: number; color: string; k?: number; core?: number; streak?: boolean; blend?: 'screen' | 'plus-lighter' | 'normal'}> = ({x, y, r, color, k = 1, core = 0.18, streak = false, blend = 'screen'}) => {
  const a = clamp(k);
  if (a <= 0.002) return null;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: blend}}>
      <div
        style={{
          position: 'absolute',
          left: x - r,
          top: y - r,
          width: 2 * r,
          height: 2 * r,
          borderRadius: r,
          background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${color} ${(core * 100).toFixed(1)}%, rgba(255,255,255,0) 72%)`,
          opacity: 0.85 * a,
        }}
      />
      <div style={{position: 'absolute', left: x - r * 2.2, top: y - r * 2.2, width: 4.4 * r, height: 4.4 * r, borderRadius: 2.2 * r, background: `radial-gradient(circle at 50% 50%, ${color} 0%, rgba(255,255,255,0) 60%)`, opacity: 0.22 * a}} />
      {streak ? (
        <div style={{position: 'absolute', left: x - r * 4, top: y - r * 0.05, width: 8 * r, height: r * 0.1, borderRadius: r, background: `linear-gradient(90deg, rgba(255,255,255,0), ${color} 50%, rgba(255,255,255,0))`, opacity: 0.55 * a}} />
      ) : null}
    </div>
  );
};
