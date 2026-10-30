// The OBD promo's hand-drawn marks (the owner, 2026-10-21: every second explained with marker marks): a wobbly circle round a
// thing, an arrow to it, a tick, drawn on with a stroke-dashoffset like a marker; in ink on the white world, in the check
// lamp's amber on pictures (never on text, never a line under text). And the small pictograms the explainers share: the
// readiness check's tick and hourglass. Deterministic, frame-driven.
import React from 'react';
import {clamp, E, hash} from '../lib';
import {AMBER, INK} from './stage';

/** a hand-drawn ellipse round (cx, cy), its two ends overlapping a little, drawn over `k` 0..1 */
export const MarkCircle: React.FC<{cx: number; cy: number; rx: number; ry: number; k: number; color?: string; width?: number; seed?: number; rot?: number}> = ({cx, cy, rx, ry, k, color = AMBER, width = 8, seed = 1, rot = -8}) => {
  if (k <= 0) return null;
  const pts: string[] = [];
  const N = 48;
  const turns = 1.12;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = -Math.PI * 0.62 + u * Math.PI * 2 * turns;
    const wob = 1 + 0.035 * Math.sin(u * 9 + seed) + 0.02 * hash(i, seed) + 0.05 * u;
    const x = cx + rx * wob * Math.cos(a);
    const y = cy + ry * wob * Math.sin(a);
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const p = E.out(clamp(k));
  return <path d={pts.join('')} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} transform={`rotate(${rot} ${cx} ${cy})`} />;
};

/** a hand-drawn arrow from a to b (a slight bow), its head drawn after the shaft */
export const MarkArrow: React.FC<{a: [number, number]; b: [number, number]; k: number; color?: string; width?: number; bow?: number}> = ({a, b, k, color = INK, width = 7, bow = 0.18}) => {
  if (k <= 0) return null;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const c: [number, number] = [mx - dy * bow, my + dx * bow];
  const shaft = E.out(clamp(k / 0.75));
  const head = E.out(clamp((k - 0.7) / 0.3));
  const ang = Math.atan2(b[1] - c[1], b[0] - c[0]);
  const L = 34;
  const h1: [number, number] = [b[0] - L * Math.cos(ang - 0.5), b[1] - L * Math.sin(ang - 0.5)];
  const h2: [number, number] = [b[0] - L * Math.cos(ang + 0.5), b[1] - L * Math.sin(ang + 0.5)];
  return (
    <g fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - shaft} />
      {head > 0 ? <path d={`M${h1[0]} ${h1[1]}L${b[0]} ${b[1]}L${h2[0]} ${h2[1]}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - head} /> : null}
    </g>
  );
};

/** a hand-drawn tick at (x, y), `s` its size */
export const MarkTick: React.FC<{x: number; y: number; s: number; k: number; color?: string; width?: number}> = ({x, y, s, k, color = INK, width = 8}) =>
  k > 0 ? (
    <path
      d={`M${x - 0.5 * s} ${y + 0.02 * s}L${x - 0.15 * s} ${y + 0.36 * s}L${x + 0.55 * s} ${y - 0.38 * s}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - E.out(clamp(k))}
    />
  ) : null;

/** the readiness check's two states as small round pictograms: done (a filled disc, a white tick) or waiting (an outlined
 *  disc, an hourglass) */
export const CheckDot: React.FC<{x: number; y: number; r: number; done: number; k?: number; color?: string; bg?: string}> = ({x, y, r, done, k = 1, color = INK, bg = '#FFFFFF'}) => {
  const s = r / 20;
  return (
    <g transform={`translate(${x} ${y}) scale(${(0.6 + 0.4 * E.outBack(clamp(k))) * s})`} opacity={clamp(k * 2)}>
      <circle r={20} fill={done > 0.5 ? color : bg} stroke={color} strokeWidth={2.6} />
      {done > 0.5 ? (
        <path d="M-8.5 0.5L-2.5 6.5L9 -6" fill="none" stroke={bg} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M-7 -10H7L0 0ZM-7 10H7L0 0Z" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  );
};
