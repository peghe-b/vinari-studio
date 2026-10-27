// The physics scenes' shared parts (src/lib/physics.mjs; PhysJar, PhysStack, PhysCount). The world is simulated from the
// shot's own first frame on a fixed clock: sim frame = scene frame - start, so a frame renders the same in any tab, in any
// order, every time (the self-tests: node src/lib/physics.mjs --test, and the stills twice in tools/p2-stills.mjs --det).
import React from 'react';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {C, F} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance} from '../common';

/** the scene frame the world starts on (the shot's entrance; the first shot's lead, so frame 0 is already composed) and
 *  the frame the pour starts on (the spec's `at`, a chunk index or "1.2s", else 10 frames in) */
export const physClock = (ctx: SceneCtx, at: unknown) => {
  const start = entrance(ctx);
  const pour = at !== undefined ? cueFrame(ctx, at) : Math.max(0, start) + 10;
  return {start, pour, simAt: Math.max(0, pour - start)};
};
/** the sim frame of scene frame `frame` */
export const simFrame = (frame: number, start: number) => Math.max(0, frame - start);

/** a coin: the data tone, a pressed ring, a notch that turns with it */
export const Coin: React.FC<{x: number; y: number; r: number; a: number; fill: string; pop?: number}> = ({x, y, r, a, fill, pop = 1}) => {
  const k = 0.55 + 0.45 * pop;
  const nx = Math.cos(a) * r * 0.82;
  const ny = Math.sin(a) * r * 0.82;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})`}>
      <circle r={r} fill={fill} />
      <circle r={r * 0.68} fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth={Math.max(3, r * 0.1)} />
      <line x1={nx * 0.86} y1={ny * 0.86} x2={nx * 1.08} y2={ny * 1.08} stroke="rgba(255,255,255,0.42)" strokeWidth={Math.max(3, r * 0.1)} strokeLinecap="round" />
    </g>
  );
};

/** a fuel drop: round at rest, drawn out to a point (upwards) while it falls */
export const Drop: React.FC<{x: number; y: number; r: number; speed: number; fill: string; pop?: number}> = ({x, y, r, speed, fill, pop = 1}) => {
  const k = 0.55 + 0.45 * pop;
  const tip = r * (0.55 + 0.65 * Math.min(1, speed / 9));
  // a circle of radius r with a point tip px above its top: two tangents from the tip
  const d = r + tip;
  const t = Math.asin(Math.min(0.999, r / d));
  const tx = r * Math.cos(t);
  const ty = -r * Math.sin(t);
  const path = `M 0 ${(-d).toFixed(2)} L ${tx.toFixed(2)} ${ty.toFixed(2)} A ${r} ${r} 0 1 1 ${(-tx).toFixed(2)} ${ty.toFixed(2)} Z`;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})`}>
      <path d={path} fill={fill} />
      <ellipse cx={-r * 0.34} cy={-r * 0.2} rx={r * 0.16} ry={r * 0.28} fill="rgba(255,255,255,0.4)" />
    </g>
  );
};

/** an open vessel's outline (a jar, a bin): two walls and a floor with rounded inner corners, the ink's stroke */
export const vesselPath = (x0: number, x1: number, top: number, floor: number, rad = 18) =>
  `M ${x0} ${top} L ${x0} ${floor - rad} Q ${x0} ${floor} ${x0 + rad} ${floor} L ${x1 - rad} ${floor} Q ${x1} ${floor} ${x1} ${floor - rad} L ${x1} ${top}`;

/** a short quiet line set exactly (no fit: the caller measured it), Mtavruli unless latin */
export const Tag: React.FC<{text: string; x: number; y: number; size?: number; weight?: number; color?: string; align?: 'left' | 'center' | 'right'; w?: number; opacity?: number; latin?: boolean}> = ({text, x, y, size = 40, weight = 600, color = C.ink2, align = 'left', w = 300, opacity = 1, latin}) => (
  <div className={TXT} style={{position: 'absolute', left: align === 'left' ? x : align === 'center' ? x - w / 2 : x - w, top: y, width: w, textAlign: align, fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: `${Math.round(size * 1.15)}px`, color, whiteSpace: 'nowrap', opacity}}>
    {latin ? text : mtav(text)}
  </div>
);
