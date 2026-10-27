// The physics scenes' shared parts (src/lib/physics.mjs; PhysJar, PhysStack, PhysCount). The world is simulated from the
// shot's own first frame on a fixed clock: sim frame = scene frame - start, so a frame renders the same in any tab, in any
// order, every time (the self-tests: node src/lib/physics.mjs --test, and the stills twice in tools/p2-stills.mjs --det).
import React from 'react';
import {getInputProps} from 'remotion';
import {stateHash} from '../../lib/physics.mjs';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {C, F} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance} from '../common';

/** the scene frame the world starts on (the shot's entrance; the first shot's lead, so frame 0 is already composed) and
 *  the frame the pour starts on (the spec's `at`, a chunk index or "1.2s", else 10 frames in) */
export const physClock = (ctx: SceneCtx, at: unknown) => {
  const start = entrance(ctx);
  // the first shot's frame 0 is the thumbnail: the pour is already under way there
  const pour = at !== undefined ? cueFrame(ctx, at) : ctx.index === 0 ? -16 : Math.max(0, start) + 10;
  return {start, pour, simAt: Math.max(0, pour - start)};
};
/** the determinism check's probe (tools/p2-stills.mjs --det, input prop "physLog"): each physics shot logs its world's state
 *  hash at the frame it draws, read from the browser's console by the renderer; nothing on screen changes */
export const physLog = (scene: string, sf: number, a: Float64Array) => {
  if ((getInputProps() as Record<string, unknown>).physLog) console.log(`PHYS ${scene} sf=${sf} h=${stateHash(a)}`);
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

/** a fuel drop, in the ink (the 2026-10-27 review: red teardrops in a jar read as blood): a teardrop inscribed in its
 *  body's circle (radius r) and drawn at 0.94 of it, so no two drops ever overlap, falling or settled: the round part's
 *  bottom on the circle's bottom, the point on its top, always upright (fuel, not a spinning coin) */
export const Drop: React.FC<{x: number; y: number; r: number; fill: string; pop?: number}> = ({x, y, r, fill, pop = 1}) => {
  const k = (0.55 + 0.45 * pop) * 0.94;
  const rr = r * 0.62; // the round part: centred (r - rr) below the body's centre, its bottom on the circle
  const cy = r - rr;
  const d = r + cy; // the point (0, -r) to the round part's centre
  const t = Math.asin(Math.min(0.999, rr / d));
  // the tangent points from the point to the round part
  const tx = rr * Math.cos(t);
  const ty = cy - rr * Math.sin(t);
  const path = `M 0 ${(-r).toFixed(2)} L ${tx.toFixed(2)} ${ty.toFixed(2)} A ${rr.toFixed(2)} ${rr.toFixed(2)} 0 1 1 ${(-tx).toFixed(2)} ${ty.toFixed(2)} Z`;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})`}>
      <path d={path} fill={fill} />
      <ellipse cx={-rr * 0.42} cy={cy - rr * 0.1} rx={rr * 0.16} ry={rr * 0.3} fill="rgba(255,255,255,0.34)" />
    </g>
  );
};

/** the counter's text: the figure as `shown` writes it when it is whole, else the plain number grouped like `shown`
 *  ("1 200" -> "1 000"), Mtavruli for a Georgian unit; never padded (the number sits on the left margin from frame one) */
export const counterText = (v: number, done: boolean, value: number, shown?: string) => {
  if (done && shown) return mtav(shown);
  const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
  const sep = shown ? /\d([ \u00a0\u202f,])\d{3}(?!\d)/.exec(shown)?.[1] : undefined;
  if (!sep || Math.abs(v) < 1000) return s;
  const [int, dec] = s.split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (dec ? `.${dec}` : '');
};

/** the counting figure: plain text on the left margin, tabular figures, no reserved cells */
export const Counter: React.FC<{text: string; size: number; color: string}> = ({text, size, color}) => (
  <span className={TXT} style={{display: 'inline-block', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: `${Math.round(size * 1.08)}px`, color, fontFeatureSettings: '"tnum" 1, "lnum" 1', letterSpacing: '-0.02em'}}>
    {text}
  </span>
);

/** an open vessel's outline (a jar, a bin): two walls and a floor with rounded inner corners, the ink's stroke */
export const vesselPath = (x0: number, x1: number, top: number, floor: number, rad = 18) =>
  `M ${x0} ${top} L ${x0} ${floor - rad} Q ${x0} ${floor} ${x0 + rad} ${floor} L ${x1 - rad} ${floor} Q ${x1} ${floor} ${x1} ${floor - rad} L ${x1} ${top}`;

/** a short quiet line set exactly (no fit: the caller measured it), Mtavruli unless latin */
export const Tag: React.FC<{text: string; x: number; y: number; size?: number; weight?: number; color?: string; align?: 'left' | 'center' | 'right'; w?: number; opacity?: number; latin?: boolean}> = ({text, x, y, size = 40, weight = 600, color = C.ink2, align = 'left', w = 300, opacity = 1, latin}) => (
  <div className={TXT} style={{position: 'absolute', left: align === 'left' ? x : align === 'center' ? x - w / 2 : x - w, top: y, width: w, textAlign: align, fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: `${Math.round(size * 1.15)}px`, color, whiteSpace: 'nowrap', opacity}}>
    {latin ? text : mtav(text)}
  </div>
);
