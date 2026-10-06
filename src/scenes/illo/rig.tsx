// src/scenes/illo/rig.tsx: the geometry core of the kit's characters and props (src/scenes/illo/figure.tsx, props.tsx).
//
// Everything a figure draws is built in its own units (u: the standing figure is 100 u tall, feet at the origin, y up
// negative) and pushed through one affine matrix chain (the skeleton: hips, lean, breath, a limb, a hand, the mirror of
// a flipped figure), so the shapes come out already posed in the figure's space and the outer <g> only translates and
// scales. That keeps the key light, the shade crescents, the rim and the contact shadow on the screen's top left even
// for a mirrored or leaning figure.
//
//   Mx, mul, tr, rot, scl, ap, msc      2D affine matrices (SVG order [a b c d e f]); rot is clockwise on screen
//   dir(a), angOf(dx, dy)               the limb angle convention: 0 = pointing down, + = toward screen right
//   E, K, S, P, poly, toD               shapes as cubic segments: ellipse, tapered capsule, smooth (Catmull-Rom),
//                                       an authored path string (absolute M L H V C Q Z), a polygon; toD joins them and
//                                       winds every shape clockwise, so shapes joined in one path never punch holes
//   ik2(...)                            a two-bone solver (an arm or a leg reaching a point)
//   Ink, piece()                        a filled part: shade crescent (clipped offset copy), cut gap, rim or outline
//
// Pure drawing code: no state, no randomness, colours only from C through palette.ts.
import React from 'react';
import {C} from '../../tokens';
import {paint} from './solid';

export type Pt = [number, number];
export type Mx = [number, number, number, number, number, number];
export type Seg = [Pt, Pt, Pt, Pt]; // p0, c1, c2, p1 (a cubic)
export type Shape = Seg[];

// ---- matrices -----------------------------------------------------------------------------------------------------------
export const I: Mx = [1, 0, 0, 1, 0, 0];
/** m after n: a point goes through n first, then m. */
export const mul = (m: Mx, n: Mx): Mx => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
export const chain = (...ms: Mx[]) => ms.reduce((a, b) => mul(a, b), I);
export const tr = (x: number, y: number): Mx => [1, 0, 0, 1, x, y];
/** A rotation, clockwise on screen (SVG's rotate), about (cx, cy). */
export const rot = (deg: number, cx = 0, cy = 0): Mx => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
};
export const scl = (sx: number, sy = sx, cx = 0, cy = 0): Mx => [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy];
export const ap = (m: Mx, x: number, y: number): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** The matrix's linear scale (a radius drawn through it grows by this). */
export const msc = (m: Mx) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

// ---- the limb angle convention ----------------------------------------------------------------------------------------
/** A unit vector at limb angle a (degrees): 0 = pointing down, 90 = toward screen right, 180 = up. */
export const dir = (a: number): Pt => [Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];
/** The limb angle of a vector. */
export const angOf = (dx: number, dy: number) => (Math.atan2(dx, dy) * 180) / Math.PI;
/** The limb angle a, as a clockwise screen rotation that turns "down" (0, 1) into dir(a). */
export const limbRot = (a: number, cx = 0, cy = 0) => rot(-a, cx, cy);
/** a -> b the short way round, t = 0..1 (angles in degrees). */
export const lerpAng = (a: number, b: number, t: number) => {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  if (!Number.isFinite(d)) d = 0;
  return a + d * t;
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

// ---- shapes -----------------------------------------------------------------------------------------------------------
const KAPPA = 0.5523;
const line = (a: Pt, b: Pt): Seg => [a, [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + (2 * (b[0] - a[0])) / 3, a[1] + (2 * (b[1] - a[1])) / 3], b];

/** An ellipse at (cx, cy) with radii rx, ry, through matrix m. */
export const E = (m: Mx, cx: number, cy: number, rx: number, ry = rx): Shape => {
  const p = (x: number, y: number) => ap(m, cx + x, cy + y);
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    [p(-rx, 0), p(-rx, -ky), p(-kx, -ry), p(0, -ry)],
    [p(0, -ry), p(kx, -ry), p(rx, -ky), p(rx, 0)],
    [p(rx, 0), p(rx, ky), p(kx, ry), p(0, ry)],
    [p(0, ry), p(-kx, ry), p(-rx, ky), p(-rx, 0)],
  ];
};

/** A circular arc as cubics (math angles in radians, screen coords: point = c + r (cos a, sin a)). */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number): Seg[] => {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9));
  const da = (a1 - a0) / n;
  const h = (4 / 3) * Math.tan(da / 4) * r;
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + i * da;
    const t1 = t0 + da;
    const p0: Pt = [cx + r * Math.cos(t0), cy + r * Math.sin(t0)];
    const p1: Pt = [cx + r * Math.cos(t1), cy + r * Math.sin(t1)];
    out.push([p0, [p0[0] - h * Math.sin(t0), p0[1] + h * Math.cos(t0)], [p1[0] + h * Math.sin(t1), p1[1] - h * Math.cos(t1)], p1]);
  }
  return out;
};

/** A tapered capsule (a limb): circles r1 at (x1, y1) and r2 at (x2, y2) joined by their outer tangents. */
export const K = (m: Mx, x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): Shape => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  const xf = (s: Seg[]) => s.map((g) => g.map(([x, y]) => ap(m, x, y)) as Seg);
  if (d <= Math.abs(r1 - r2) + 1e-6) return r1 > r2 ? E(m, x1, y1, r1) : E(m, x2, y2, r2);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(clamp((r1 - r2) / d, -1, 1));
  const at = (x: number, y: number, r: number, a: number): Pt => [x + r * Math.cos(a), y + r * Math.sin(a)];
  const a1 = at(x1, y1, r1, base + off);
  const a2 = at(x2, y2, r2, base + off);
  const b2 = at(x2, y2, r2, base - off);
  const b1 = at(x1, y1, r1, base - off);
  return xf([line(a1, a2), ...arc(x2, y2, r2, base + off, base - off), line(b2, b1), ...arc(x1, y1, r1, base - off, base + off - 2 * Math.PI)]);
};

/** A jointed limb as ONE silhouette (no seam at the joint): circles rA at A, rB at B (the elbow or knee), rC at C,
 *  joined by their tangents; the outer side of the bend wraps round B, the inner side meets in a crease. */
export const K2 = (m: Mx, A: Pt, rA: number, B: Pt, rB: number, C: Pt, rC: number): Shape => {
  const seg = (P0: Pt, r0: number, P1: Pt, r1: number) => {
    const dx = P1[0] - P0[0];
    const dy = P1[1] - P0[1];
    const d = Math.max(1e-6, Math.hypot(dx, dy));
    return {base: Math.atan2(dy, dx), off: Math.acos(clamp((r0 - r1) / d, -1, 1)), d};
  };
  const s1 = seg(A, rA, B, rB);
  const s2 = seg(B, rB, C, rC);
  if (s1.d <= Math.abs(rA - rB) + 1e-3 || s2.d <= Math.abs(rB - rC) + 1e-3) return K(m, A[0], A[1], rA, C[0], C[1], rC);
  const at = (c: Pt, r: number, a: number): Pt => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const norm = (a: number) => {
    let x = a;
    while (x > Math.PI) x -= 2 * Math.PI;
    while (x <= -Math.PI) x += 2 * Math.PI;
    return x;
  };
  const cross = Math.cos(s1.base) * Math.sin(s2.base) - Math.sin(s1.base) * Math.cos(s2.base); // > 0: the bend turns toward +
  const out: Seg[] = [];
  const isect = (p1: Pt, q1: Pt, p2: Pt, q2: Pt): Pt | null => {
    const d1x = q1[0] - p1[0];
    const d1y = q1[1] - p1[1];
    const d2x = q2[0] - p2[0];
    const d2y = q2[1] - p2[1];
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-6) return null;
    const t = ((p2[0] - p1[0]) * d2y - (p2[1] - p1[1]) * d2x) / den;
    const u = ((p2[0] - p1[0]) * d1y - (p2[1] - p1[1]) * d1x) / den;
    if (t < 0.15 || t > 1.4 || u < -0.4 || u > 0.85) return null;
    return [p1[0] + t * d1x, p1[1] + t * d1y];
  };
  // the + side, A -> B -> C
  const p1 = at(A, rA, s1.base + s1.off);
  const q1 = at(B, rB, s1.base + s1.off);
  const p2 = at(B, rB, s2.base + s2.off);
  const q2 = at(C, rC, s2.base + s2.off);
  if (cross > 1e-3) {
    const x = isect(p1, q1, p2, q2);
    if (x) out.push(line(p1, x), line(x, q2));
    else out.push(line(p1, q1), line(q1, p2), line(p2, q2));
  } else {
    out.push(line(p1, q1));
    const a0 = s1.base + s1.off;
    out.push(...arc(B[0], B[1], rB, a0, a0 + norm(s2.base + s2.off - a0)));
    out.push(line(p2, q2));
  }
  out.push(...arc(C[0], C[1], rC, s2.base + s2.off, s2.base - s2.off));
  // the - side, C -> B -> A
  const r2 = at(C, rC, s2.base - s2.off);
  const r1 = at(B, rB, s2.base - s2.off);
  const t2 = at(B, rB, s1.base - s1.off);
  const t1 = at(A, rA, s1.base - s1.off);
  if (cross < -1e-3) {
    const x = isect(r2, r1, t2, t1);
    if (x) out.push(line(r2, x), line(x, t1));
    else out.push(line(r2, r1), line(r1, t2), line(t2, t1));
  } else {
    out.push(line(r2, r1));
    const a0 = s2.base - s2.off;
    out.push(...arc(B[0], B[1], rB, a0, a0 + norm(s1.base - s1.off - a0)));
    out.push(line(t2, t1));
  }
  out.push(...arc(A[0], A[1], rA, s1.base - s1.off, s1.base + s1.off - 2 * Math.PI));
  return out.map((g) => g.map(([x, y]) => ap(m, x, y)) as Seg);
};

/** A smooth closed (or open) curve through points (Catmull-Rom), through matrix m. */
export const S = (m: Mx, pts: Pt[], close = true, tension = 1): Shape => {
  const q = pts.map(([x, y]) => ap(m, x, y));
  const n = q.length;
  if (n < 3) return n === 2 ? [line(q[0], q[1])] : [];
  const at = (i: number) => (close ? q[(i + n) % n] : q[Math.max(0, Math.min(n - 1, i))]);
  const segs = close ? n : n - 1;
  const k = tension / 6;
  const out: Seg[] = [];
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    out.push([p1, [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k], p2]);
  }
  return out;
};

/** A polygon through points (straight sides), through matrix m. */
export const poly = (m: Mx, pts: Pt[]): Shape => {
  const q = pts.map(([x, y]) => ap(m, x, y));
  return q.map((p, i) => line(p, q[(i + 1) % q.length]));
};

const TOK = /([MLHVCQZmlhvcqz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g;
/** An authored path (absolute M, L, H, V, C, Q, Z only; one closed shape) through matrix m. */
export const P = (m: Mx, d: string): Shape => {
  const toks = [...d.matchAll(TOK)].map((x) => x[1] ?? Number(x[2]));
  const out: Seg[] = [];
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let cmd = 'M';
  let i = 0;
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    if (typeof toks[i] === 'string') cmd = (toks[i++] as string).toUpperCase();
    if (cmd === 'Z') {
      if (cur[0] !== start[0] || cur[1] !== start[1]) out.push(line(cur, start));
      cur = start;
      continue;
    }
    if (cmd === 'M') {
      cur = [num(), num()];
      start = cur;
      cmd = 'L';
    } else if (cmd === 'L') {
      const p: Pt = [num(), num()];
      out.push(line(cur, p));
      cur = p;
    } else if (cmd === 'H') {
      const p: Pt = [num(), cur[1]];
      out.push(line(cur, p));
      cur = p;
    } else if (cmd === 'V') {
      const p: Pt = [cur[0], num()];
      out.push(line(cur, p));
      cur = p;
    } else if (cmd === 'C') {
      const c1: Pt = [num(), num()];
      const c2: Pt = [num(), num()];
      const p: Pt = [num(), num()];
      out.push([cur, c1, c2, p]);
      cur = p;
    } else if (cmd === 'Q') {
      const c: Pt = [num(), num()];
      const p: Pt = [num(), num()];
      out.push([cur, [cur[0] + ((c[0] - cur[0]) * 2) / 3, cur[1] + ((c[1] - cur[1]) * 2) / 3], [p[0] + ((c[0] - p[0]) * 2) / 3, p[1] + ((c[1] - p[1]) * 2) / 3], p]);
      cur = p;
    } else i++;
  }
  if (out.length && (cur[0] !== start[0] || cur[1] !== start[1])) out.push(line(cur, start));
  return out.map((g) => g.map(([x, y]) => ap(m, x, y)) as Seg);
};

const area = (s: Shape) => {
  let a = 0;
  for (const [p0, c1, c2, p1] of s) a += p0[0] * c1[1] - c1[0] * p0[1] + c1[0] * c2[1] - c2[0] * c1[1] + c2[0] * p1[1] - p1[0] * c2[1];
  return a;
};
const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(2).replace(/\.?0+$/, ''));
/** Shapes to a path's d, every shape wound clockwise on screen (so a union of shapes in one path fills solid). */
export const toD = (...shapes: (Shape | null | undefined | false)[]) => {
  let d = '';
  for (const s0 of shapes) {
    if (!s0 || !s0.length) continue;
    const s = area(s0) < 0 ? [...s0].reverse().map(([p0, c1, c2, p1]) => [p1, c2, c1, p0] as Seg) : s0;
    d += `M${f2(s[0][0][0])} ${f2(s[0][0][1])}`;
    for (const [, c1, c2, p1] of s) d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${f2(p1[0])} ${f2(p1[1])}`;
    d += 'Z';
  }
  return d;
};
/** An open stroke path (a line detail: a seam, a drawstring, a closed eye). */
export const toLine = (s: Shape) => {
  if (!s.length) return '';
  let d = `M${f2(s[0][0][0])} ${f2(s[0][0][1])}`;
  for (const [, c1, c2, p1] of s) d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${f2(p1[0])} ${f2(p1[1])}`;
  return d;
};

// ---- two-bone IK ----------------------------------------------------------------------------------------------------
/** A two-bone chain from root (rx, ry) reaching (tx, ty): lengths a (upper) and b (lower). `bend` +1 puts the middle
 *  joint on the side the limb angle grows toward (screen right of a chain pointing down, left of one pointing up), -1 on
 *  the other side. Returns limb angles [upper, lower relative to upper]. */
export const ik2 = (rx: number, ry: number, tx: number, ty: number, a: number, b: number, bend: 1 | -1): [number, number] => {
  const dx = tx - rx;
  const dy = ty - ry;
  const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const base = angOf(dx, dy);
  const A = (Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) * 180) / Math.PI;
  const upper = base + bend * A;
  const [ex, ey] = dir(upper);
  const jx = rx + a * ex;
  const jy = ry + a * ey;
  const lowerAbs = angOf(tx - jx, ty - jy);
  return [upper, ((lowerAbs - upper + 540) % 360) - 180];
};

// ---- a filled part ----------------------------------------------------------------------------------------------------
/** How a figure inks its parts: ids, scale and the look (rim on a dark ground, ink outline on paper). */
export type Ink = {
  id: string; // a clean per-figure id prefix (clip paths)
  uid?: string; // the scene's IlloDefs uid (rim and ball gradients); without it, flat paint and no rim
  k: number; // stage px per u (strokes are given in px)
  hi: boolean; // hi LOD: shade crescents and details
  onDark: boolean; // the rim on a dark ground, the ink outline on paper
  cut: string; // the cel-cut colour (the ground's)
  lx: number; // the shade offset toward the light (u): the lit copy moves by (-lx, -ly)
  ly: number;
};
type PieceO = {
  fill: string;
  shade?: string; // the shade tone: a crisp crescent on the side away from the light
  off?: number; // the crescent's width (x the figure's light offset)
  cut?: boolean; // a gap in the ground's colour around the part (it lies over something)
  rim?: boolean; // the rim light (dark ground)
  rimK?: number; // the rim's strength (a leather jacket: 1.6)
  edge?: boolean; // the ink outline on paper (default true)
  opacity?: number;
};
/** One filled part: base, shade crescent, cut gap, rim (dark ground) or ink outline (paper). The cut, the outline and
 *  the rim are strokes drawn UNDER the fill (paint-order), so a part built from several overlapping shapes (a hand and
 *  its thumb, a limb) shows only its outer silhouette, never the seams inside. */
export const piece = (ink: Ink, key: string, d: string, o: PieceO): React.ReactNode => {
  if (!d) return null;
  const sh = ink.hi && o.shade && o.shade !== o.fill;
  const cid = `${ink.id}-${key}`;
  const off = o.off ?? 1;
  const edgePx = !ink.onDark && o.edge !== false ? 1.8 : 0;
  const rimOn = ink.onDark && o.rim && ink.uid;
  const rimPx = rimOn ? 1.6 * (o.rimK ?? 1) : 0;
  const ring = Math.max(edgePx, rimPx);
  const cutPx = o.cut ? 1.5 : 0;
  const body = (
    <>
      {cutPx ? <path d={d} fill="none" stroke={ink.cut} strokeWidth={(2 * (ring + cutPx)) / ink.k} strokeLinejoin="round" /> : null}
      <path
        d={d}
        fill={sh ? o.shade : o.fill}
        stroke={edgePx ? C.ilEdge : rimOn && ink.uid ? paint(ink.uid, 'rim') : undefined}
        strokeWidth={ring ? (2 * ring) / ink.k : undefined}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
      {sh ? (
        <>
          <clipPath id={cid}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${cid})`}>
            <path d={d} fill={o.fill} transform={`translate(${(-ink.lx * off).toFixed(2)} ${(-ink.ly * off).toFixed(2)})`} />
          </g>
        </>
      ) : null}
    </>
  );
  return o.opacity === undefined ? <React.Fragment key={key}>{body}</React.Fragment> : <g key={key} opacity={o.opacity}>{body}</g>;
};
