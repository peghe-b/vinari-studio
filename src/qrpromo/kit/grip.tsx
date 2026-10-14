// A passer-by's right hand holding the 3D phone, in the "Silhouette light" language: ONE joined ink silhouette (palm,
// four fingers wrapped round the left edge, the thumb along the right edge, the wrist) and a coat sleeve with a tapered
// cuff, the forearm leaving to the right above the subtitle band. The near side is a step lighter and the film's one
// light draws a hairline rim along the top edges. Two layers round the phone: <GripBack/> under the phone's canvas
// (the palm, the fingers' backs past the left edge, the thumb's base, the wrist, the sleeve) and <GripFront/> over its
// screen (the thumb's pad on the right bezel, the fingertips on the left bezel), drawn as parts of the same shape.
// Laid out in the phone body box's own units (u across, v down), frame px.
import React from 'react';
import {filmSilPal} from '../../scenes/illo/sil';
import {smoothPath, type Pt} from '../lib';
import type {Rect} from './phone3d';

const useTones = () => {
  const pal = filmSilPal('day', 1.0);
  return {deep: '#0E0E11', shadow: '#17171B', half: '#24242B', hi: '#33333C', rim: pal.lit[2], coat: '#1E2026', coat2: '#0B0C0E'};
};

const at = (b: Rect) => (u: number, v: number): Pt => [b.x + u * b.w, b.y + v * b.h];

/** the palm and the wrapped fingers as one outline (u, v), clockwise from the index finger's top at the left edge */
const PALM: [number, number][] = [
  [0.02, 0.5],
  [-0.06, 0.505],
  [-0.095, 0.53],
  [-0.092, 0.565],
  [-0.07, 0.578],
  [-0.103, 0.6],
  [-0.104, 0.64],
  [-0.075, 0.655],
  [-0.1, 0.675],
  [-0.098, 0.712],
  [-0.07, 0.725],
  [-0.085, 0.743],
  [-0.08, 0.775],
  [-0.03, 0.8],
  [0.2, 0.93],
  [0.55, 1.0],
  [0.8, 1.012],
  [1.0, 1.0],
  [1.12, 0.985],
  [1.26, 0.975],
  [1.26, 0.8],
  [1.16, 0.75],
  [1.11, 0.66],
  [1.05, 0.58],
  [0.9, 0.52],
  [0.4, 0.48],
];

export const GripBack: React.FC<{b: Rect; id: string}> = ({b, id}) => {
  const P = at(b);
  const c = useTones();
  const pts = PALM.map(([u, v]) => P(u, v));
  // the sleeve: from a slim cuff at the wrist, widening as it leaves the frame to the right (its foot stays above y 1405)
  const sTop = P(0, 0.76)[1] - 14;
  const sBot = Math.min(1405, P(0, 1.04)[1]);
  const w0 = P(1.22, 0.79);
  const w1 = P(1.22, 0.99);
  const sleeve = `M${w0[0]} ${w0[1]}C${w0[0] + 120} ${w0[1] - 4} 1040 ${sTop + 2} 1160 ${sTop}L1160 ${sBot}C1040 ${sBot} ${w1[0] + 120} ${w1[1] + 6} ${w1[0]} ${w1[1]}Z`;
  const cuff = smoothPath([P(1.22, 0.79), P(1.31, 0.785), P(1.31, 0.993), P(1.22, 0.99)], true);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={`${id}sk`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.hi} />
          <stop offset="0.45" stopColor={c.half} />
          <stop offset="1" stopColor={c.deep} />
        </linearGradient>
        <linearGradient id={`${id}co`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.coat} />
          <stop offset="1" stopColor={c.coat2} />
        </linearGradient>
      </defs>
      <path d={sleeve} fill={`url(#${id}co)`} />
      <path d={`M${P(1.3, 0.787).join(' ')}C${P(1.3, 0.787)[0] + 110} ${P(1.3, 0.787)[1] - 4} 1040 ${sTop + 2} 1160 ${sTop}`} fill="none" stroke={c.rim} strokeWidth={2} opacity={0.5} />
      <path d={smoothPath(pts, true)} fill={`url(#${id}sk)`} />
      <path d={cuff} fill={c.coat2} />
      <path d={`M${P(1.31, 0.79).join(' ')}L${P(1.31, 0.99).join(' ')}`} stroke={c.half} strokeWidth={2} opacity={0.8} />
      {/* the rim of the light along the fingers' backs (top left) */}
      <path d={smoothPath([P(0.02, 0.5), P(-0.06, 0.505), P(-0.095, 0.53)])} fill="none" stroke={c.rim} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
    </svg>
  );
};

export const GripFront: React.FC<{b: Rect; id: string}> = ({b, id}) => {
  const P = at(b);
  const c = useTones();
  const s = b.w / 380;
  // the fingertips over the left bezel: index (highest) to little finger, each a soft rounded pad joined to its finger
  const tips: [number, number, number][] = [
    [0.53, 0.046, 0.034],
    [0.608, 0.048, 0.04],
    [0.686, 0.046, 0.036],
    [0.752, 0.038, 0.026],
  ];
  // the thumb: from its base past the right edge, along the bezel, its pad resting on the glass's edge
  const thumb = smoothPath(
    [P(1.13, 0.86), P(1.02, 0.83), P(0.965, 0.76), P(0.94, 0.69), P(0.952, 0.655), P(0.99, 0.66), P(1.04, 0.71), P(1.1, 0.74), P(1.16, 0.78)],
    true,
  );
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={`${id}th`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.hi} />
          <stop offset="0.6" stopColor={c.half} />
          <stop offset="1" stopColor={c.shadow} />
        </linearGradient>
        <linearGradient id={`${id}fi`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.shadow} />
          <stop offset="1" stopColor={c.half} />
        </linearGradient>
      </defs>
      {tips.map(([v, h, len], i) => {
        const x0 = b.x - 0.05 * b.w;
        const x1 = b.x + len * b.w;
        const y0 = b.y + (v - h / 2) * b.h;
        const hh = h * b.h;
        return (
          <g key={i}>
            <rect x={x0} y={y0} width={x1 - x0} height={hh} rx={hh / 2} fill={`url(#${id}fi)`} />
            <path d={`M${x0 + hh * 0.3} ${y0 + 1.2 * s}H${x1 - hh * 0.45}`} stroke={c.rim} strokeWidth={1.6 * s} strokeLinecap="round" opacity={0.6} />
          </g>
        );
      })}
      <path d={thumb} fill={`url(#${id}th)`} />
      <path d={smoothPath([P(0.945, 0.68), P(0.97, 0.655), P(1.03, 0.69), P(1.1, 0.735)])} fill="none" stroke={c.rim} strokeWidth={2.4 * s} strokeLinecap="round" opacity={0.75} />
    </svg>
  );
};
