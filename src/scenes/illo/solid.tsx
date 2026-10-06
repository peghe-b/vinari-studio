// src/scenes/illo/solid.tsx: the shading primitives of the "Graphite" look (filled, not drawn).
//
//   <IlloDefs uid/>         one <defs> per scene and render layer: soft-n and ball-n for every ramp step (and skin), the
//                           rim stroke, three halos and the contact shadow. Ids come from the scene's useId() (a scene
//                           renders twice, gfx and text layers), cleaned by gid(); every kit part takes that uid as a
//                           prop and paints with paint(uid, 'soft-3'). Always mounted: only attribute values change.
//   <Solid d uid tone shade rim outline cut time/>
//                           a filled shape: flat, soft (a 35-degree key light from the top left) or ball (a sphere);
//                           `rim` a light stroke on the lit edge (dark ground only), `outline` the 1.8 px ink contour
//                           (paper only), `cut` a 1.5 px gap in the ground's colour around the part (a cel cut over
//                           what lies under it).
//   <Shadow uid cx cy rx ry k/>   a soft contact shadow (paper only: on the black field there is nothing to darken).
//   <Glint x y size at frame/>    a four-point sparkle that pops and goes (14 frames).
//   path helpers            rr (rounded rect), circ, ell, capsule (a tapered limb), poly, smooth (Catmull-Rom), star.
//
// Pure drawing code (the kit is imported by cloud-written Film scenes): frame-driven, no state, colours only from C
// through palette.ts. No blur filter, no blend mode.
import React from 'react';
import {C, isLight, THEME, toneBig} from '../../tokens';
import {dark, ground, mix, step, tone, toneOf, type Time, type ToneRef} from './palette';

// ---- ids --------------------------------------------------------------------------------------------------------------
/** A gradient id from the scene's useId() (React's ids carry colons: only [A-Za-z0-9_-] is kept). */
export const gid = (uid: string, name: string) => `il${String(uid).replace(/[^A-Za-z0-9_-]/g, '')}-${name}`;
/** A fill or stroke that paints with one of IlloDefs' gradients: paint(uid, 'soft-3'), paint(uid, 'glow-ink'). */
export const paint = (uid: string, name: string) => `url(#${gid(uid, name)})`;

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7];

/** One <defs> block: 8 soft + 8 ball gradients, skin soft and ball, the rim, three halos and the contact shadow (22). */
export const IlloDefs: React.FC<{uid: string}> = ({uid}) => {
  const soft = (name: string, hi: string, mid: string, lo: string) => (
    <linearGradient key={`s${name}`} id={gid(uid, `soft-${name}`)} x1="0.12" y1="0.02" x2="0.82" y2="1">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.5" stopColor={mid} />
      <stop offset="1" stopColor={lo} />
    </linearGradient>
  );
  const ball = (name: string, hi: string, mid: string, lo: string) => (
    <radialGradient key={`b${name}`} id={gid(uid, `ball-${name}`)} cx="0.46" cy="0.46" r="0.62" fx="0.32" fy="0.26">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.55" stopColor={mid} />
      <stop offset="1" stopColor={lo} />
    </radialGradient>
  );
  const halo = (name: string, color: string) => (
    <radialGradient key={`g${name}`} id={gid(uid, `glow-${name}`)} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor={color} stopOpacity={0.9} />
      <stop offset="0.3" stopColor={color} stopOpacity={0.42} />
      <stop offset="0.65" stopColor={color} stopOpacity={0.12} />
      <stop offset="1" stopColor={color} stopOpacity={0} />
    </radialGradient>
  );
  return (
    <defs>
      {STEPS.map((n) => soft(String(n), step(n, -0.55), tone(n), step(n, 0.6)))}
      {soft('skin', mix(C.ilSkin, C.il0, 0.4), C.ilSkin, C.ilSkin2)}
      {STEPS.map((n) => ball(String(n), step(n, -0.9), tone(n), step(n, 0.75)))}
      {ball('skin', mix(C.ilSkin, C.il0, 0.6), C.ilSkin, C.ilSkin2)}
      <linearGradient id={gid(uid, 'rim')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={C.ilRim} />
        <stop offset="0.38" stopColor={C.ilRim} />
        <stop offset="0.55" stopColor={C.ilRim} stopOpacity={0} />
      </linearGradient>
      {halo('ink', C.il0)}
      {halo('up', toneBig('up'))}
      {halo('down', toneBig('down'))}
      <radialGradient id={gid(uid, 'shade')} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={C.shade} stopOpacity={0.5 * THEME.shadowK} />
        <stop offset="0.6" stopColor={C.shade} stopOpacity={0.22 * THEME.shadowK} />
        <stop offset="1" stopColor={C.shade} stopOpacity={0} />
      </radialGradient>
    </defs>
  );
};

/** The <svg> that carries a scene's IlloDefs: zero-sized, never display:none (a hidden svg's gradients still paint). */
export const DefsSvg: React.FC<{uid: string}> = ({uid}) => (
  <svg width={0} height={0} style={{position: 'absolute', left: 0, top: 0, overflow: 'hidden'}} aria-hidden>
    <IlloDefs uid={uid} />
  </svg>
);

// ---- Solid ------------------------------------------------------------------------------------------------------------
export type Shade = 'flat' | 'soft' | 'ball';
type SolidP = {
  d: string;
  uid: string;
  tone?: ToneRef; // ramp step 0..7 (default 3: mid) or 'skin' | 'skin2' | 'feature' | 'glass'
  shade?: Shade; // default 'soft'
  fill?: string; // an explicit paint (an accent from toneBig, a halo): overrides tone and shade
  rim?: boolean; // the rim light on the lit edge (dark ground only; outer contours)
  outline?: boolean; // the 1.8 px ink contour (paper only)
  cut?: boolean; // a 1.5 px gap in the ground's colour around the part
  time?: Time; // the ground the part stands on (a night plate on paper reads as a dark ground)
  opacity?: number;
  transform?: string;
};
/** A filled, shaded shape: the building block of every illustrated object. */
export const Solid: React.FC<SolidP> = ({d, uid, tone: t = 3, shade = 'soft', fill, rim, outline, cut, time = 'day', opacity, transform}) => {
  const named = typeof t === 'number' ? String(Math.round(Math.min(7, Math.max(0, t)))) : t === 'skin' ? 'skin' : null;
  const paintFill = fill ?? (shade === 'flat' || !named || (typeof t === 'number' && t % 1 !== 0) ? toneOf(t) : paint(uid, `${shade}-${named}`));
  const onDark = dark(time);
  const cutColor = isLight() && time !== 'day' ? ground(time) : C.ilCut;
  return (
    <g opacity={opacity} transform={transform}>
      <path d={d} fill={paintFill} stroke={cut ? cutColor : undefined} strokeWidth={cut ? 3 : undefined} strokeLinejoin="round" paintOrder="stroke" />
      {outline && !onDark ? <path d={d} fill="none" stroke={C.ilEdge} strokeWidth={1.8} strokeLinejoin="round" /> : null}
      {rim && onDark ? <path d={d} fill="none" stroke={paint(uid, 'rim')} strokeWidth={2.4} strokeLinejoin="round" /> : null}
    </g>
  );
};

/** A soft contact shadow under an object (paper only; k scales its strength). */
export const Shadow: React.FC<{uid: string; cx: number; cy: number; rx: number; ry?: number; k?: number}> = ({uid, cx, cy, rx, ry, k = 1}) =>
  isLight() ? <ellipse cx={cx} cy={cy} rx={rx} ry={ry ?? rx * 0.16} fill={paint(uid, 'shade')} opacity={Math.min(1, k)} /> : null;

/** A four-point sparkle: two thin diamonds, scale 0 -> 1 -> 0 over `dur` frames from `at`. */
export const Glint: React.FC<{x: number; y: number; size?: number; at: number; frame: number; dur?: number; color?: string; turn?: number}> = ({
  x,
  y,
  size = 28,
  at,
  frame,
  dur = 14,
  color,
  turn = 0,
}) => {
  const t = (frame - at) / dur;
  if (t <= 0 || t >= 1) return null;
  const s = Math.sin(Math.PI * t) ** 0.8;
  const L = size * s;
  const w = size * 0.13 * s;
  const c = color ?? C.il0;
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn + 20 * t})`}>
      <path d={`M0 ${-L}L${w} 0L0 ${L}L${-w} 0Z`} fill={c} />
      <path d={`M${-L * 0.62} 0L0 ${w}L${L * 0.62} 0L0 ${-w}Z`} fill={c} />
      <circle r={w * 1.2} fill={c} />
    </g>
  );
};

// ---- path helpers -----------------------------------------------------------------------------------------------------
const n2 = (v: number) => +v.toFixed(2);

/** A rounded rectangle; r is one radius or [top-left, top-right, bottom-right, bottom-left]. */
export const rr = (x: number, y: number, w: number, h: number, r: number | [number, number, number, number] = 0) => {
  const m = Math.min(w, h) / 2;
  const [a, b, c, d] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(m, v)));
  return (
    `M${n2(x + a)} ${n2(y)}H${n2(x + w - b)}` +
    (b ? `A${n2(b)} ${n2(b)} 0 0 1 ${n2(x + w)} ${n2(y + b)}` : '') +
    `V${n2(y + h - c)}` +
    (c ? `A${n2(c)} ${n2(c)} 0 0 1 ${n2(x + w - c)} ${n2(y + h)}` : '') +
    `H${n2(x + d)}` +
    (d ? `A${n2(d)} ${n2(d)} 0 0 1 ${n2(x)} ${n2(y + h - d)}` : '') +
    `V${n2(y + a)}` +
    (a ? `A${n2(a)} ${n2(a)} 0 0 1 ${n2(x + a)} ${n2(y)}` : '') +
    'Z'
  );
};
/** An ellipse as a path. */
// clockwise on screen, like rr(): shapes joined in one nonzero path never punch holes in each other
export const ell = (cx: number, cy: number, rx: number, ry = rx) =>
  `M${n2(cx - rx)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 1 ${n2(cx + rx)} ${n2(cy)}A${n2(rx)} ${n2(ry)} 0 1 1 ${n2(cx - rx)} ${n2(cy)}Z`;
/** A circle as a path. */
export const circ = (cx: number, cy: number, r: number) => ell(cx, cy, r, r);
/** A tapered capsule (a limb): two circles r1 at (x1, y1) and r2 at (x2, y2) joined by their outer tangents. */
export const capsule = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  if (dist <= Math.abs(r1 - r2)) return circ(r1 > r2 ? x1 : x2, r1 > r2 ? y1 : y2, Math.max(r1, r2));
  const base = Math.atan2(dy, dx);
  const off = Math.acos((r1 - r2) / dist);
  const p = (x: number, y: number, r: number, a: number) => [x + r * Math.cos(a), y + r * Math.sin(a)];
  const [a1x, a1y] = p(x1, y1, r1, base + off);
  const [a2x, a2y] = p(x2, y2, r2, base + off);
  const [b2x, b2y] = p(x2, y2, r2, base - off);
  const [b1x, b1y] = p(x1, y1, r1, base - off);
  const big1 = off * 2 > Math.PI ? 0 : 1; // the far arc around the first circle
  return (
    `M${n2(a1x)} ${n2(a1y)}L${n2(a2x)} ${n2(a2y)}` +
    `A${n2(r2)} ${n2(r2)} 0 ${big1 ? 0 : 1} 0 ${n2(b2x)} ${n2(b2y)}` +
    `L${n2(b1x)} ${n2(b1y)}` +
    `A${n2(r1)} ${n2(r1)} 0 ${big1} 0 ${n2(a1x)} ${n2(a1y)}Z`
  );
};
/** A polygon (closed) or polyline through points. */
export const poly = (pts: [number, number][], close = true) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n2(x)} ${n2(y)}`).join('') + (close ? 'Z' : '');
/** A smooth curve through points (Catmull-Rom as cubic Beziers); `close` joins the ends smoothly. */
export const smooth = (pts: [number, number][], close = false, tension = 1) => {
  const n = pts.length;
  if (n < 3) return poly(pts, close);
  const at = (i: number) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`;
  const segs = close ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    d += `C${n2(p1[0] + (p2[0] - p0[0]) * k)} ${n2(p1[1] + (p2[1] - p0[1]) * k)} ${n2(p2[0] - (p3[0] - p1[0]) * k)} ${n2(p2[1] - (p3[1] - p1[1]) * k)} ${n2(p2[0])} ${n2(p2[1])}`;
  }
  return d + (close ? 'Z' : '');
};
/** A star or burst: `points` tips between radii r1 (outer) and r0 (inner), turned by `turn` degrees; `jitter` (0..1)
 *  varies each tip's length by a seeded amount (the comic burst). */
export const star = (cx: number, cy: number, r1: number, r0: number, points: number, turn = 0, jitter = 0, seed = 1) => {
  const out: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((turn - 90) * Math.PI) / 180 + (i * Math.PI) / points;
    const j = jitter ? 1 - jitter * (Math.sin(seed * 91.7 + i * 12.9898) * 0.5 + 0.5) : 1;
    const r = i % 2 ? r0 : r1 * j;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return poly(out);
};
