import * as THREE from 'three';
import type {Model, Part, Wheel} from './model';

// Procedural cars for the technical drawing (owner, 2026-09-24: "the cars must look better"; the
// Kenney kit read as toys). No downloaded mesh: each car is designed here in metres, the way a car
// designer blocks one out, and turned into a mesh when a tab first needs it (about 0.3 s, cached).
//
//   body       an implicit solid: the side view, the plan view and the section (tuck under the
//              shoulder and the rocker) intersected with soft corners, plus the greenhouse (its own
//              side and plan views, tumblehome, a crowned roof) joined with a tight fillet, the wheel
//              arches cut out, the mirrors added. Surface nets turn it into a closed mesh whose
//              vertices sit on the true surface; normals come from the field's gradient.
//   lines      the drawing is (1) the smooth CONTOUR of that mesh for the current camera (lines.ts,
//              from the vertex normals, so a silhouette never zig-zags along facets) and (2) the
//              designer's lines, authored in the side, plan, front or rear view and projected onto
//              the surface: glass (DLO, B pillar, windscreen, backlight), shut lines (doors, bonnet,
//              boot), the arch lips, the lamps (a full-width rear bar), intakes, handles.
//   wheels     revolved tyres (sidewall bulge, rounded shoulders) with the rim drawn on the face:
//              lip, inner barrel, spokes, centre cap. The disc behind the spokes only occludes.
//
// Line weights: contour = t1 (heavy), glass / shut lines / lamps / arches / rim lip = t2 (medium),
// detail (character line, handles, grille, spokes) = t3 (fine). Every design is data below.

// ---- 2D helpers --------------------------------------------------------------------------------

/** A polygon vertex: u, v, fillet radius at this vertex (0 or absent = sharp). */
type Pt = [number, number, number?];

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** A polyline with per-vertex fillets (quadratic corners) as flat [u0, v0, u1, v1, ...]. */
const rounded = (pts: Pt[], closed: boolean, steps = 10): number[] => {
  const n = pts.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const [px, py, r = 0] = pts[i];
    const end = !closed && (i === 0 || i === n - 1);
    if (!r || end) {
      out.push(px, py);
      continue;
    }
    const [ax, ay] = pts[(i - 1 + n) % n];
    const [bx, by] = pts[(i + 1) % n];
    const la = Math.hypot(ax - px, ay - py);
    const lb = Math.hypot(bx - px, by - py);
    if (la < 1e-9 || lb < 1e-9) {
      out.push(px, py);
      continue;
    }
    const uax = (ax - px) / la;
    const uay = (ay - py) / la;
    const ubx = (bx - px) / lb;
    const uby = (by - py) / lb;
    const ang = Math.acos(clamp(uax * ubx + uay * uby, -1, 1));
    if (ang > Math.PI - 1e-3) {
      out.push(px, py);
      continue;
    }
    const t = Math.min(r / Math.tan(ang / 2), la * 0.5, lb * 0.5);
    const t1x = px + uax * t;
    const t1y = py + uay * t;
    const t2x = px + ubx * t;
    const t2y = py + uby * t;
    for (let s = 0; s <= steps; s++) {
      const q = s / steps;
      out.push((1 - q) * (1 - q) * t1x + 2 * (1 - q) * q * px + q * q * t2x, (1 - q) * (1 - q) * t1y + 2 * (1 - q) * q * py + q * q * t2y);
    }
  }
  // two fillets meeting half-way share a point: keep one (a zero-length edge helps nobody)
  const dd: number[] = [];
  for (let i = 0; i < out.length; i += 2) {
    const n2 = dd.length;
    if (n2 && Math.hypot(out[i] - dd[n2 - 2], out[i + 1] - dd[n2 - 1]) < 1e-6) continue;
    dd.push(out[i], out[i + 1]);
  }
  if (closed && dd.length > 4 && Math.hypot(dd[0] - dd[dd.length - 2], dd[1] - dd[dd.length - 1]) < 1e-6) dd.length -= 2;
  return dd;
};

/** Evenly resampled polyline (spacing `step`), flat pairs. */
const resample = (flat: number[], closed: boolean, step: number): number[] => {
  const pts = flat.slice();
  if (closed) pts.push(flat[0], flat[1]);
  const out: number[] = [pts[0], pts[1]];
  let carry = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2];
    const ay = pts[i - 1];
    const bx = pts[i];
    const by = pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay);
    let s = step - carry;
    while (s <= l) {
      out.push(ax + ((bx - ax) * s) / l, ay + ((by - ay) * s) / l);
      s += step;
    }
    carry = l - (s - step);
  }
  const lx = pts[pts.length - 2];
  const ly = pts[pts.length - 1];
  if (Math.hypot(out[out.length - 2] - lx, out[out.length - 1] - ly) > step * 0.25) out.push(lx, ly);
  return out;
};

/** Exact signed distance to a closed polygon (negative inside), flat pairs. */
const sdPoly = (p: Float64Array, x: number, y: number) => {
  const n = p.length / 2;
  let d = (x - p[0]) ** 2 + (y - p[1]) ** 2;
  let s = 1;
  for (let i = 0, j = n - 1; i < n; j = i, i++) {
    const vix = p[i * 2];
    const viy = p[i * 2 + 1];
    const ex = p[j * 2] - vix;
    const ey = p[j * 2 + 1] - viy;
    const wx = x - vix;
    const wy = y - viy;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
    const bx = wx - ex * t;
    const by = wy - ey * t;
    const dd = bx * bx + by * by;
    if (dd < d) d = dd;
    const c1 = y >= viy;
    const c2 = y < p[j * 2 + 1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
};

/** Work that yields now and then (a render tab must never freeze for a second: the model is built
 *  in slices between frames, see buildCarAsync). */
type Work<T> = Generator<void, T, void>;

/** A 2D profile's signed distance, sampled once on a 1 cm grid and read bilinearly. */
class Prof {
  u0: number;
  v0: number;
  nu: number;
  nv: number;
  h: number;
  g: Float32Array;
  private constructor(u0: number, u1: number, v0: number, v1: number, h: number) {
    this.u0 = u0;
    this.v0 = v0;
    this.h = h;
    this.nu = Math.ceil((u1 - u0) / h) + 1;
    this.nv = Math.ceil((v1 - v0) / h) + 1;
    this.g = new Float32Array(this.nu * this.nv);
  }
  static *make(pts: Pt[], u0: number, u1: number, v0: number, v1: number, h = 0.01): Work<Prof> {
    const P = new Prof(u0, u1, v0, v1, h);
    const poly = new Float64Array(rounded(pts, true, 12));
    for (let j = 0; j < P.nv; j++) {
      for (let i = 0; i < P.nu; i++) P.g[j * P.nu + i] = sdPoly(poly, u0 + i * h, v0 + j * h);
      if (j % 16 === 15) yield;
    }
    return P;
  }
  at(u: number, v: number) {
    const fu = clamp((u - this.u0) / this.h, 0, this.nu - 1.001);
    const fv = clamp((v - this.v0) / this.h, 0, this.nv - 1.001);
    const i = Math.floor(fu);
    const j = Math.floor(fv);
    const a = fu - i;
    const b = fv - j;
    const k = j * this.nu + i;
    const g = this.g;
    return (g[k] * (1 - a) + g[k + 1] * a) * (1 - b) + (g[k + this.nu] * (1 - a) + g[k + this.nu + 1] * a) * b;
  }
}

const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const sdBox = (x: number, y: number, z: number, bx: number, by: number, bz: number, r: number) => {
  const qx = Math.abs(x) - bx + r;
  const qy = Math.abs(y) - by + r;
  const qz = Math.abs(z) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

// ---- designs -----------------------------------------------------------------------------------

type Layer = 2 | 3; // t2 medium, t3 fine
type Rim = {spokes: number; twin: boolean; hub: number; w0: number; w1: number};
type WheelSpec = {zf: number; zr: number; x: number; R: number; Rr: number; w: number; arch: number; xin: number; rim: Rim};

type Design = {
  len: number; // overall length (m): the model is normalised to 4 units along it
  bounds: {x: number; y: number; z: number}; // half extents of the field's grid (m)
  side: Pt[]; // lower body, (z, y)
  plan: Pt[]; // lower body, (z, |x|): includes the x = 0 axis
  tuck: (y: number) => number; // the section: how far the side comes in at height y
  crownL: (ax: number) => number; // bonnet / boot crown: the top is this much lower at |x|
  gSide: Pt[]; // greenhouse, (z, y)
  gPlan: Pt[]; // greenhouse, (z, |x|)
  tumble: (y: number) => number; // greenhouse side coming in with height
  crownR: (ax: number) => number;
  kL: number; // soft corner of the lower body (shoulder)
  kG: number; // greenhouse roof edge
  kJ: number; // greenhouse onto the body (the belt)
  wheels: WheelSpec;
  mirror: {x: number; y: number; z: number; hx: number; hy: number; hz: number};
  extra?: (ax: number, y: number, z: number, f: number) => number; // details added to the field
  belt: number; // the belt line height (m) for the part boxes
  cabin: [number, number]; // z of the backlight base and the windscreen base (m)
  /** The glass, drawn as design lines and cut out of the occluder: through it the drawing shows the
   *  far side's glass and the cabin, as a technical drawing does. side: the DLO in (z, y), one per
   *  side; pillars: solid pillars inside it; front / back: windscreen and backlight in plan (x, z). */
  glass: {side: Pt[]; pillars: Pt[][]; front: Pt[]; back: Pt[]; backView?: 'top' | 'rear'}; // backView: the backlight in plan (x, z) or, upright, from behind (x, y)
  /** The cabin seen through the glass: the steering wheel (x = the driver's side, left-hand drive),
   *  the front seat backs with headrests, the rear bench. Metres. */
  inside: {
    steer: {x: number; y: number; z: number; r: number; tilt: number};
    seat: {x: number; w: number; y0: number; y1: number; z0: number; z1: number};
    rear: {w: number; y0: number; y1: number; z0: number; z1: number; heads: number[]};
  };
  lines: (d: Draw) => void;
};

/** The designer's pen: lines in one view, projected onto the body. */
type Draw = {
  side: (pts: Pt[], layer: Layer, closed?: boolean, ghost?: boolean) => void; // (z, y), both sides
  top: (pts: Pt[], layer: Layer, closed?: boolean, ghost?: boolean) => void; // (x, z), from above
  front: (pts: Pt[], layer: Layer, closed?: boolean, mirror?: boolean) => void; // (x, y), from the front
  rear: (pts: Pt[], layer: Layer, closed?: boolean, mirror?: boolean) => void; // (x, y), from behind
  arch: (z: number, r: number, yMin: number, layer: Layer) => void; // arc around an axle, both sides
};

/** Circle-ish arc of an axle's arch as (z, y) points above yMin. */
const archPts = (zc: number, yc: number, r: number, yMin: number): Pt[] => {
  const a0 = Math.asin(clamp((yMin - yc) / r, -1, 1));
  const out: Pt[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / n;
    out.push([zc + r * Math.cos(a), yc + r * Math.sin(a)]);
  }
  return out;
};

const mirrorX = (pts: Pt[]): Pt[] => pts.map(([u, v, r]) => [-u, v, r] as Pt);

// A premium mid-size saloon (the proportions of a current 5-series / E-class / A6): 4.94 m long,
// 1.87 m wide, 1.45 m tall, 2.94 m wheelbase, short front overhang, long bonnet, fast C pillar.
const SEDAN: Design = {
  len: 4.94,
  bounds: {x: 1.3, y: 1.62, z: 2.62},
  side: [
    [2.3, 0.17, 0.05],
    [2.455, 0.3, 0.1],
    [2.47, 0.52, 0.12],
    [2.445, 0.72, 0.08],
    [2.28, 0.792, 0.3],
    [1.4, 0.87, 0.9],
    [0.8, 0.945, 0.4],
    [0.0, 0.975, 0.8],
    [-1.0, 0.995, 0.8],
    [-1.86, 1.012, 0.3],
    [-2.33, 1.02, 0.05],
    [-2.47, 0.995, 0.04],
    [-2.47, 0.62, 0.16],
    [-2.42, 0.4, 0.12],
    [-2.3, 0.2, 0.06],
    [-1.95, 0.165, 0.2],
    [-1.0, 0.15, 0.3],
    [1.2, 0.15, 0.3],
    [2.0, 0.158, 0.2],
  ],
  plan: [
    [2.47, 0, 0],
    [2.465, 0.4, 0.3],
    [2.28, 0.87, 0.34],
    [1.6, 0.935, 1.0],
    [0.8, 0.925, 1.2],
    [-0.4, 0.925, 1.2],
    [-1.35, 0.948, 1.0],
    [-2.2, 0.9, 0.3],
    [-2.465, 0.6, 0.25],
    [-2.47, 0, 0],
  ],
  tuck: (y) => (y > 0.62 ? 0.1 * ((y - 0.62) / 0.38) ** 2 : 0.05 * ((0.62 - y) / 0.47) ** 2),
  crownL: (ax) => 0.035 * (ax / 0.9) ** 2,
  gSide: [
    [0.95, 0.8, 0],
    [0.84, 0.955, 0.03],
    [0.43, 1.2, 0.4],
    [0.02, 1.412, 0.3],
    [-0.4, 1.45, 1.0],
    [-0.95, 1.418, 0.4],
    [-1.4, 1.228, 0.45],
    [-1.86, 1.03, 0.08],
    [-1.95, 0.8, 0],
  ],
  gPlan: [
    [1.1, 0, 0],
    [1.1, 0.68, 0.1],
    [0.6, 0.785, 0.9],
    [-0.4, 0.8, 1.2],
    [-1.3, 0.78, 0.9],
    [-2.05, 0.66, 0.1],
    [-2.05, 0, 0],
  ],
  tumble: (y) => 0.37 * Math.max(0, y - 0.96),
  crownR: (ax) => 0.05 * (ax / 0.65) ** 2,
  kL: 0.06,
  kG: 0.075,
  kJ: 0.02,
  wheels: {zf: 1.57, zr: -1.37, x: 0.8, R: 0.355, Rr: 0.255, w: 0.245, arch: 0.405, xin: 0.58, rim: {spokes: 5, twin: true, hub: 0.07, w0: 0.012, w1: 0.013}},
  mirror: {x: 0.935, y: 1.04, z: 0.6, hx: 0.085, hy: 0.052, hz: 0.048},
  belt: 0.98,
  cabin: [-1.86, 0.84],
  // the side DLO with its kink at the C pillar, the B pillar, windscreen, backlight
  glass: {
    side: [[0.72, 0.985, 0.02], [0.09, 1.325, 0.1], [-0.45, 1.345, 0.7], [-0.98, 1.31, 0.14], [-1.4, 1.1, 0.12], [-1.47, 1.02, 0.03], [-1.4, 1.004, 0.02]],
    pillars: [[[-0.3, 0.99], [-0.35, 1.34], [-0.43, 1.343], [-0.38, 0.99]]],
    front: [[-0.66, 0.855, 0.05], [0.66, 0.855, 0.05], [0.53, 0.07, 0.08], [-0.53, 0.07, 0.08]],
    back: [[-0.52, -1.0, 0.07], [0.52, -1.0, 0.07], [0.63, -1.8, 0.06], [-0.63, -1.8, 0.06]],
  },
  inside: {
    steer: {x: 0.37, y: 0.87, z: 0.42, r: 0.185, tilt: 24},
    seat: {x: 0.37, w: 0.5, y0: 0.6, y1: 1.08, z0: -0.04, z1: -0.22},
    rear: {w: 1.25, y0: 0.62, y1: 1.0, z0: -0.98, z1: -1.12, heads: [-0.42, 0.42]},
  },
  lines: (d) => {
    // shut lines: front door, the door split under the B pillar, the rear door's dogleg round the arch
    d.side([[0.735, 0.975], [0.93, 0.82, 0.15], [1.07, 0.58, 0.2], [1.1, 0.24]], 2);
    d.side([[-0.34, 0.99], [-0.32, 0.24]], 2);
    d.side([[-1.41, 1.004], [-1.25, 0.86, 0.08], [-1.2, 0.8, 0.1], [-1.0, 0.66, 0.2], [-0.9, 0.43, 0.1], [-0.895, 0.24]], 2);
    // bonnet: the shut lines along the wings, and the leading edge
    d.top([[0.7, 0.93], [0.76, 1.8, 1.0], [0.8, 2.22]], 3);
    d.top([[-0.7, 0.93], [-0.76, 1.8, 1.0], [-0.8, 2.22]], 3);
    d.top([[-0.8, 2.22], [-0.4, 2.35, 0.6], [0, 2.37, 0.6], [0.4, 2.35, 0.6], [0.8, 2.22]], 3);
    // boot lid
    d.top([[0.66, -1.87], [0.72, -2.3]], 3);
    d.top([[-0.66, -1.87], [-0.72, -2.3]], 3);
    // body side: a taut shoulder line, the rocker, flush handles
    d.side([[2.1, 0.805], [0.4, 0.855, 2.0], [-1.2, 0.87, 2.0], [-2.3, 0.878]], 3);
    d.side([[1.12, 0.265], [-0.9, 0.265]], 3);
    d.side([[0.22, 0.87, 0.013], [0.02, 0.873, 0.013], [0.02, 0.899, 0.013], [0.22, 0.896, 0.013]], 3, true);
    d.side([[-0.94, 0.878, 0.013], [-1.14, 0.881, 0.013], [-1.14, 0.907, 0.013], [-0.94, 0.904, 0.013]], 3, true);
    d.arch(1.57, 0.408, 0.2, 2);
    d.arch(-1.37, 0.408, 0.19, 2);
    // lamps: slim swept headlamps with a DRL stroke, a full-width rear light bar
    d.front([[0.4, 0.685, 0.02], [0.83, 0.735, 0.05], [0.885, 0.695, 0.04], [0.83, 0.648, 0.05], [0.44, 0.64, 0.02]], 2, true, true);
    d.front([[0.47, 0.67], [0.81, 0.706]], 3, false, true);
    // intakes: a slim upper grille, the lower intake, the air curtains, the chin
    d.front([[-0.34, 0.645, 0.02], [0.34, 0.645, 0.02], [0.32, 0.69, 0.02], [-0.32, 0.69, 0.02]], 3, true);
    d.front([[-0.6, 0.235, 0.06], [0.6, 0.235, 0.06], [0.52, 0.44, 0.06], [-0.52, 0.44, 0.06]], 2, true);
    d.front([[0.7, 0.27, 0.03], [0.8, 0.27, 0.03], [0.8, 0.5, 0.03], [0.72, 0.5, 0.03]], 3, true, true);
    d.front([[-0.82, 0.2], [0.82, 0.2]], 3);
    d.rear([[-0.58, 0.886], [0.58, 0.886]], 2);
    d.rear([[-0.58, 0.906], [0.58, 0.906]], 2);
    d.rear([[0.58, 0.83, 0.03], [0.9, 0.84, 0.04], [0.9, 0.93, 0.04], [0.58, 0.918, 0.02]], 2, true, true);
    d.rear([[-0.6, 0.2, 0.05], [0.6, 0.2, 0.05], [0.55, 0.33, 0.05], [-0.55, 0.33, 0.05]], 3, true);
    d.rear([[-0.86, 0.46], [0.86, 0.46]], 3);
  },
};

// A four-door sports saloon (Taycan / Panamera proportions): 4.96 m, 1.97 m wide, 1.38 m tall, a
// 2.90 m wheelbase on 21-inch wheels, a low nose with the wings standing above the bonnet, a
// greenhouse that tapers hard toward the tail (the flyline) and wide rear haunches.
const SPORT: Design = {
  len: 4.96,
  bounds: {x: 1.3, y: 1.52, z: 2.62},
  side: [
    [2.33, 0.16, 0.05],
    [2.47, 0.28, 0.1],
    [2.48, 0.44, 0.12],
    [2.42, 0.62, 0.12],
    [2.2, 0.705, 0.3],
    [1.5, 0.79, 0.9],
    [0.9, 0.905, 0.4],
    [0.0, 0.93, 0.8],
    [-1.35, 0.965, 0.8],
    [-2.2, 0.975, 0.1],
    [-2.4, 0.988, 0.04],
    [-2.48, 0.95, 0.05],
    [-2.47, 0.62, 0.15],
    [-2.4, 0.36, 0.12],
    [-2.25, 0.19, 0.06],
    [-1.9, 0.155, 0.2],
    [-1.0, 0.14, 0.3],
    [1.2, 0.14, 0.3],
    [2.0, 0.15, 0.2],
  ],
  plan: [
    [2.48, 0, 0],
    [2.47, 0.45, 0.35],
    [2.25, 0.9, 0.35],
    [1.55, 0.975, 1.0],
    [0.6, 0.93, 1.0],
    [-0.6, 0.94, 1.0],
    [-1.35, 0.99, 1.0],
    [-2.2, 0.93, 0.35],
    [-2.47, 0.62, 0.3],
    [-2.48, 0, 0],
  ],
  tuck: (y) => (y > 0.58 ? 0.12 * ((y - 0.58) / 0.38) ** 2 : 0.05 * ((0.58 - y) / 0.44) ** 2),
  crownL: (ax) => -0.03 * (ax / 0.85) ** 4, // the wings stand above the bonnet
  gSide: [
    [0.98, 0.78, 0],
    [0.9, 0.915, 0.03],
    [0.42, 1.17, 0.4],
    [-0.05, 1.355, 0.35],
    [-0.35, 1.38, 1.0],
    [-0.85, 1.345, 0.6],
    [-1.45, 1.17, 0.7],
    [-2.05, 0.99, 0.1],
    [-2.12, 0.78, 0],
  ],
  gPlan: [
    [1.1, 0, 0],
    [1.1, 0.64, 0.1],
    [0.6, 0.75, 0.9],
    [-0.4, 0.77, 1.2],
    [-1.3, 0.72, 0.9],
    [-2.25, 0.55, 0.1],
    [-2.25, 0, 0],
  ],
  tumble: (y) => 0.42 * Math.max(0, y - 0.93),
  crownR: (ax) => 0.05 * (ax / 0.6) ** 2,
  kL: 0.07,
  kG: 0.08,
  kJ: 0.03,
  wheels: {zf: 1.55, zr: -1.35, x: 0.83, R: 0.36, Rr: 0.267, w: 0.265, arch: 0.41, xin: 0.6, rim: {spokes: 10, twin: false, hub: 0.07, w0: 0.011, w1: 0.012}},
  mirror: {x: 0.955, y: 0.985, z: 0.64, hx: 0.08, hy: 0.048, hz: 0.05},
  belt: 0.93,
  cabin: [-2.05, 0.9],
  glass: {
    side: [[0.78, 0.935, 0.02], [0.02, 1.295, 0.12], [-0.55, 1.3, 0.8], [-1.25, 1.17, 0.35], [-1.72, 1.0, 0.08], [-1.62, 0.955, 0.02]],
    pillars: [[[-0.38, 0.945], [-0.42, 1.3], [-0.49, 1.3], [-0.45, 0.95]]],
    front: [[-0.6, 0.915, 0.05], [0.6, 0.915, 0.05], [0.5, 0.02, 0.08], [-0.5, 0.02, 0.08]],
    back: [[-0.47, -0.95, 0.08], [0.47, -0.95, 0.08], [0.56, -1.95, 0.1], [-0.56, -1.95, 0.1]],
  },
  inside: {
    steer: {x: 0.37, y: 0.8, z: 0.45, r: 0.18, tilt: 22},
    seat: {x: 0.37, w: 0.5, y0: 0.52, y1: 1.0, z0: -0.02, z1: -0.22},
    rear: {w: 1.1, y0: 0.55, y1: 0.92, z0: -0.98, z1: -1.12, heads: [-0.38, 0.38]},
  },
  lines: (d) => {
    d.side([[0.8, 0.925], [0.98, 0.78, 0.15], [1.07, 0.56, 0.2], [1.09, 0.23]], 2);
    d.side([[-0.44, 0.945], [-0.42, 0.23]], 2);
    d.side([[-1.62, 0.955], [-1.28, 0.84, 0.1], [-1.2, 0.8, 0.1], [-1.0, 0.68, 0.2], [-0.9, 0.46, 0.1], [-0.885, 0.23]], 2);
    d.top([[0.62, 0.95], [0.66, 1.8, 1.0], [0.62, 2.28]], 3);
    d.top([[-0.62, 0.95], [-0.66, 1.8, 1.0], [-0.62, 2.28]], 3);
    d.top([[-0.62, 2.28], [0, 2.37, 0.6], [0.62, 2.28]], 3);
    d.side([[1.05, 0.38], [-0.85, 0.44]], 3);
    d.side([[1.1, 0.25], [-0.88, 0.25]], 3);
    d.side([[0.2, 0.835, 0.012], [0.01, 0.838, 0.012], [0.01, 0.862, 0.012], [0.2, 0.859, 0.012]], 3, true);
    d.side([[-1.02, 0.855, 0.012], [-1.2, 0.858, 0.012], [-1.2, 0.882, 0.012], [-1.02, 0.879, 0.012]], 3, true);
    d.arch(1.55, 0.413, 0.2, 2);
    d.arch(-1.35, 0.413, 0.19, 2);
    // four-point lamps under the wings, big side intakes, a slim centre intake
    d.front([[0.5, 0.585, 0.04], [0.8, 0.635, 0.06], [0.87, 0.565, 0.05], [0.62, 0.52, 0.05]], 2, true, true);
    d.front([[0.6, 0.55], [0.7, 0.6], [0.78, 0.585]], 3, false, true);
    d.front([[0.48, 0.22, 0.05], [0.82, 0.24, 0.06], [0.8, 0.44, 0.06], [0.52, 0.42, 0.05]], 2, true, true);
    d.front([[-0.4, 0.24, 0.04], [0.4, 0.24, 0.04], [0.38, 0.33, 0.04], [-0.38, 0.33, 0.04]], 3, true);
    // the full-width light bar, the diffuser
    d.rear([[-0.9, 0.845], [0.9, 0.845]], 2);
    d.rear([[-0.9, 0.87], [0.9, 0.87]], 2);
    d.rear([[-0.62, 0.2, 0.05], [0.62, 0.2, 0.05], [0.58, 0.34, 0.05], [-0.58, 0.34, 0.05]], 3, true);
    d.rear([[-0.88, 0.48], [0.88, 0.48]], 3);
  },
};

// A performance SUV (Cayenne / X5 proportions): 4.93 m, 1.98 m wide, 1.70 m tall, 2.90 m wheelbase,
// 21-inch wheels in clad arches, a roof that runs on to a spoiler over a raked tailgate, roof rails.
const SUV: Design = {
  len: 4.93,
  bounds: {x: 1.32, y: 1.82, z: 2.6},
  side: [
    [2.32, 0.3, 0.06],
    [2.455, 0.42, 0.1],
    [2.465, 0.62, 0.12],
    [2.43, 0.86, 0.1],
    [2.25, 0.955, 0.3],
    [1.5, 1.03, 0.9],
    [0.85, 1.12, 0.4],
    [0.0, 1.14, 0.8],
    [-1.3, 1.16, 0.8],
    [-2.25, 1.15, 0.1],
    [-2.43, 1.13, 0.06],
    [-2.465, 0.95, 0.12],
    [-2.46, 0.6, 0.15],
    [-2.38, 0.4, 0.1],
    [-2.25, 0.3, 0.06],
    [-1.95, 0.24, 0.15],
    [-1.0, 0.215, 0.3],
    [1.2, 0.215, 0.3],
    [2.0, 0.25, 0.2],
  ],
  plan: [
    [2.465, 0, 0],
    [2.455, 0.5, 0.35],
    [2.25, 0.93, 0.4],
    [1.53, 0.99, 1.0],
    [0.6, 0.975, 1.0],
    [-0.6, 0.975, 1.0],
    [-1.36, 0.99, 1.0],
    [-2.2, 0.95, 0.35],
    [-2.455, 0.68, 0.3],
    [-2.465, 0, 0],
  ],
  tuck: (y) => (y > 0.7 ? 0.1 * ((y - 0.7) / 0.46) ** 2 : 0.05 * ((0.7 - y) / 0.49) ** 2),
  crownL: (ax) => 0.03 * (ax / 0.95) ** 2,
  gSide: [
    [0.95, 1.0, 0],
    [0.85, 1.13, 0.03],
    [0.4, 1.43, 0.4],
    [0.02, 1.66, 0.3],
    [-0.6, 1.7, 1.2],
    [-1.8, 1.67, 1.0],
    [-2.22, 1.6, 0.12],
    [-2.4, 1.3, 0.3],
    [-2.44, 1.12, 0.05],
    [-2.46, 1.0, 0],
  ],
  gPlan: [
    [1.05, 0, 0],
    [1.05, 0.74, 0.1],
    [0.6, 0.83, 0.9],
    [-0.5, 0.85, 1.2],
    [-1.8, 0.83, 1.0],
    [-2.5, 0.76, 0.1],
    [-2.5, 0, 0],
  ],
  tumble: (y) => 0.3 * Math.max(0, y - 1.14),
  crownR: (ax) => 0.04 * (ax / 0.72) ** 2,
  kL: 0.07,
  kG: 0.08,
  kJ: 0.025,
  wheels: {zf: 1.535, zr: -1.36, x: 0.85, R: 0.39, Rr: 0.267, w: 0.285, arch: 0.445, xin: 0.6, rim: {spokes: 5, twin: true, hub: 0.075, w0: 0.013, w1: 0.014}},
  mirror: {x: 0.99, y: 1.2, z: 0.62, hx: 0.09, hy: 0.06, hz: 0.05},
  belt: 1.15,
  cabin: [-2.4, 0.85],
  glass: {
    side: [[0.72, 1.16, 0.02], [0.07, 1.585, 0.1], [-0.6, 1.615, 0.8], [-1.85, 1.585, 0.3], [-2.18, 1.45, 0.12], [-2.24, 1.2, 0.06], [-2.1, 1.175, 0.02]],
    pillars: [
      [[-0.34, 1.16], [-0.38, 1.6], [-0.46, 1.605], [-0.42, 1.16]],
      [[-1.36, 1.17], [-1.44, 1.59], [-1.56, 1.59], [-1.48, 1.17]],
    ],
    front: [[-0.72, 1.13, 0.05], [0.72, 1.13, 0.05], [0.62, 0.07, 0.08], [-0.62, 0.07, 0.08]],
    back: [[-0.62, 1.22, 0.05], [0.62, 1.22, 0.05], [0.56, 1.56, 0.06], [-0.56, 1.56, 0.06]],
    backView: 'rear',
  },
  inside: {
    steer: {x: 0.39, y: 1.02, z: 0.4, r: 0.19, tilt: 26},
    seat: {x: 0.38, w: 0.52, y0: 0.7, y1: 1.28, z0: -0.08, z1: -0.26},
    rear: {w: 1.3, y0: 0.72, y1: 1.22, z0: -1.1, z1: -1.24, heads: [-0.45, 0, 0.45]},
  },
  lines: (d) => {
    d.side([[0.74, 1.15], [0.92, 1.0, 0.15], [1.02, 0.72, 0.2], [1.05, 0.3]], 2);
    d.side([[-0.42, 1.16], [-0.4, 0.3]], 2);
    d.side([[-1.44, 1.17], [-1.27, 0.96, 0.08], [-1.22, 0.89, 0.1], [-0.96, 0.72, 0.2], [-0.85, 0.48, 0.1], [-0.84, 0.3]], 2);
    d.top([[0.74, 0.9], [0.8, 1.8, 1.0], [0.84, 2.24]], 3);
    d.top([[-0.74, 0.9], [-0.8, 1.8, 1.0], [-0.84, 2.24]], 3);
    d.top([[-0.84, 2.24], [0, 2.34, 0.6], [0.84, 2.24]], 3);
    d.top([[0.62, 0.05], [0.64, -2.0]], 3); // roof rails
    d.top([[-0.62, 0.05], [-0.64, -2.0]], 3);
    d.rear([[-0.74, 1.62], [-0.8, 1.2, 0.3], [-0.82, 0.86, 0.05], [0.82, 0.86, 0.05], [0.8, 1.2, 0.3], [0.74, 1.62]], 3);
    d.side([[2.1, 0.98], [0.4, 1.03, 2.0], [-2.3, 1.06]], 3);
    d.side([[1.05, 0.36], [-0.83, 0.36]], 3);
    d.side([[0.2, 1.05, 0.013], [0.0, 1.053, 0.013], [0.0, 1.08, 0.013], [0.2, 1.077, 0.013]], 3, true);
    d.side([[-0.9, 1.065, 0.013], [-1.1, 1.068, 0.013], [-1.1, 1.095, 0.013], [-0.9, 1.092, 0.013]], 3, true);
    d.arch(1.535, 0.448, 0.26, 2);
    d.arch(-1.36, 0.448, 0.25, 2);
    d.arch(1.535, 0.5, 0.3, 3); // the arch cladding
    d.arch(-1.36, 0.5, 0.29, 3);
    d.front([[0.46, 0.84, 0.02], [0.86, 0.88, 0.05], [0.92, 0.84, 0.04], [0.86, 0.8, 0.04], [0.5, 0.79, 0.02]], 2, true, true);
    d.front([[-0.42, 0.6, 0.05], [0.42, 0.6, 0.05], [0.4, 0.82, 0.04], [-0.4, 0.82, 0.04]], 2, true);
    d.front([[-0.4, 0.68], [0.4, 0.68]], 3);
    d.front([[0.55, 0.4, 0.04], [0.85, 0.42, 0.05], [0.83, 0.62, 0.05], [0.58, 0.6, 0.04]], 3, true, true);
    d.front([[-0.5, 0.33], [0.5, 0.33]], 3);
    d.rear([[-0.6, 1.1], [0.6, 1.1]], 2);
    d.rear([[0.6, 1.05, 0.03], [0.92, 1.06, 0.04], [0.92, 1.16, 0.04], [0.6, 1.15, 0.03]], 2, true, true);
    d.rear([[-0.6, 0.32, 0.05], [0.6, 0.32, 0.05], [0.55, 0.44, 0.05], [-0.55, 0.44, 0.05]], 3, true);
  },
};

// A full-size luxury SUV (Range Rover proportions): 5.05 m, 2.0 m wide, 1.87 m tall, 3.0 m wheelbase,
// slab sides, an upright windscreen, a long flat roof over a continuous glass band ("floating roof"),
// a clamshell bonnet, 22-inch wheels.
const LUX: Design = {
  len: 5.05,
  bounds: {x: 1.32, y: 1.98, z: 2.66},
  side: [
    [2.4, 0.33, 0.05],
    [2.515, 0.45, 0.08],
    [2.525, 0.75, 0.1],
    [2.49, 0.98, 0.06],
    [2.3, 1.02, 0.2],
    [1.5, 1.08, 1.0],
    [0.8, 1.12, 0.3],
    [0.0, 1.13, 0.8],
    [-1.5, 1.14, 0.8],
    [-2.38, 1.13, 0.06],
    [-2.525, 1.1, 0.06],
    [-2.52, 0.62, 0.12],
    [-2.46, 0.4, 0.1],
    [-2.32, 0.32, 0.05],
    [-2.0, 0.26, 0.15],
    [-1.0, 0.23, 0.3],
    [1.2, 0.23, 0.3],
    [2.05, 0.27, 0.15],
  ],
  plan: [
    [2.525, 0, 0],
    [2.52, 0.6, 0.25],
    [2.35, 0.97, 0.3],
    [1.6, 1.0, 1.5],
    [-1.4, 1.0, 1.5],
    [-2.3, 0.98, 0.3],
    [-2.52, 0.75, 0.25],
    [-2.525, 0, 0],
  ],
  tuck: (y) => (y > 0.75 ? 0.06 * ((y - 0.75) / 0.38) ** 2 : 0.04 * ((0.75 - y) / 0.52) ** 2),
  crownL: (ax) => 0.015 * (ax / 0.95) ** 2,
  gSide: [
    [0.92, 1.0, 0],
    [0.8, 1.125, 0.03],
    [0.45, 1.45, 0.3],
    [0.2, 1.82, 0.25],
    [-0.5, 1.87, 1.5],
    [-2.2, 1.85, 0.3],
    [-2.44, 1.75, 0.15],
    [-2.5, 1.4, 0.2],
    [-2.515, 1.12, 0.05],
    [-2.53, 1.0, 0],
  ],
  gPlan: [
    [1.0, 0, 0],
    [1.0, 0.82, 0.08],
    [0.5, 0.88, 1.0],
    [-2.0, 0.88, 1.2],
    [-2.6, 0.84, 0.08],
    [-2.6, 0, 0],
  ],
  tumble: (y) => 0.18 * Math.max(0, y - 1.13),
  crownR: (ax) => 0.025 * (ax / 0.8) ** 2,
  kL: 0.05,
  kG: 0.06,
  kJ: 0.02,
  wheels: {zf: 1.575, zr: -1.425, x: 0.86, R: 0.4, Rr: 0.28, w: 0.285, arch: 0.45, xin: 0.6, rim: {spokes: 6, twin: true, hub: 0.075, w0: 0.012, w1: 0.013}},
  mirror: {x: 1.0, y: 1.21, z: 0.58, hx: 0.09, hy: 0.065, hz: 0.05},
  belt: 1.13,
  cabin: [-2.5, 0.8],
  glass: {
    side: [[0.7, 1.15, 0.02], [0.24, 1.72, 0.08], [-2.25, 1.75, 0.1], [-2.32, 1.16, 0.05]],
    pillars: [
      [[-0.42, 1.14], [-0.44, 1.74], [-0.54, 1.745], [-0.52, 1.14]],
      [[-1.52, 1.14], [-1.54, 1.75], [-1.66, 1.75], [-1.64, 1.14]],
    ],
    front: [[-0.76, 1.12, 0.04], [0.76, 1.12, 0.04], [0.7, 0.25, 0.06], [-0.7, 0.25, 0.06]],
    back: [[-0.7, 1.22, 0.04], [0.7, 1.22, 0.04], [0.68, 1.7, 0.05], [-0.68, 1.7, 0.05]],
    backView: 'rear',
  },
  inside: {
    steer: {x: 0.4, y: 1.08, z: 0.38, r: 0.19, tilt: 22},
    seat: {x: 0.4, w: 0.54, y0: 0.78, y1: 1.38, z0: -0.12, z1: -0.28},
    rear: {w: 1.35, y0: 0.8, y1: 1.3, z0: -1.2, z1: -1.32, heads: [-0.45, 0, 0.45]},
  },
  lines: (d) => {
    d.side([[2.46, 0.985], [1.5, 1.02, 1.5], [0.8, 1.05]], 2); // the clamshell bonnet's edge on the wing
    d.top([[-0.9, 2.32], [0, 2.4, 0.8], [0.9, 2.32]], 3);
    d.side([[1.18, 0.76], [1.25, 0.9]], 3); // the wing vent
    d.side([[1.22, 0.76], [1.29, 0.9]], 3);
    d.side([[0.76, 1.13], [0.95, 0.95, 0.1], [1.04, 0.7, 0.1], [1.06, 0.3]], 2);
    d.side([[-0.5, 1.13], [-0.48, 0.3]], 2);
    d.side([[-1.62, 1.13], [-1.4, 0.95, 0.1], [-1.16, 0.86, 0.12], [-0.966, 0.665, 0.15], [-0.897, 0.446, 0.08], [-0.89, 0.3]], 2);
    d.side([[1.08, 0.46], [-0.88, 0.46]], 3);
    d.side([[1.1, 0.34], [-0.9, 0.34]], 3);
    d.side([[0.22, 1.03, 0.013], [0.02, 1.033, 0.013], [0.02, 1.06, 0.013], [0.22, 1.057, 0.013]], 3, true);
    d.side([[-1.0, 1.03, 0.013], [-1.2, 1.033, 0.013], [-1.2, 1.06, 0.013], [-1.0, 1.057, 0.013]], 3, true);
    d.arch(1.575, 0.453, 0.28, 2);
    d.arch(-1.425, 0.453, 0.27, 2);
    d.front([[0.5, 0.93, 0.02], [0.92, 0.95, 0.04], [0.94, 0.88, 0.03], [0.52, 0.87, 0.02]], 2, true, true);
    d.front([[-0.46, 0.8, 0.03], [0.46, 0.8, 0.03], [0.46, 0.94, 0.03], [-0.46, 0.94, 0.03]], 2, true);
    d.front([[-0.44, 0.845], [0.44, 0.845]], 3);
    d.front([[-0.44, 0.89], [0.44, 0.89]], 3);
    d.front([[-0.72, 0.38, 0.04], [0.72, 0.38, 0.04], [0.7, 0.56, 0.04], [-0.7, 0.56, 0.04]], 3, true);
    d.rear([[0.84, 0.9, 0.02], [0.95, 0.9, 0.02], [0.95, 1.38, 0.03], [0.86, 1.38, 0.03]], 2, true, true);
    d.rear([[-0.84, 1.12], [0.84, 1.12]], 3);
    d.rear([[-0.84, 1.2], [0.84, 1.2]], 3);
    d.rear([[-0.84, 0.8], [0.84, 0.8]], 3);
    d.rear([[-0.9, 0.55], [0.9, 0.55]], 3);
  },
};

// A hot hatch (Golf GTI proportions): 4.29 m, 1.79 m wide, 1.46 m tall, 2.63 m wheelbase, a sharp
// shoulder line, a thick C pillar, a roof spoiler over the tailgate glass, 18-inch wheels.
const HATCH: Design = {
  len: 4.29,
  bounds: {x: 1.2, y: 1.6, z: 2.3},
  side: [
    [2.0, 0.16, 0.05],
    [2.13, 0.28, 0.08],
    [2.145, 0.5, 0.12],
    [2.11, 0.72, 0.08],
    [1.95, 0.795, 0.25],
    [1.2, 0.88, 0.8],
    [0.65, 0.95, 0.35],
    [0.0, 0.975, 0.8],
    [-1.2, 0.99, 0.8],
    [-1.95, 0.99, 0.1],
    [-2.1, 0.97, 0.05],
    [-2.145, 0.8, 0.1],
    [-2.13, 0.45, 0.12],
    [-2.05, 0.22, 0.06],
    [-1.8, 0.16, 0.15],
    [-1.0, 0.145, 0.3],
    [1.0, 0.145, 0.3],
    [1.7, 0.155, 0.15],
  ],
  plan: [
    [2.145, 0, 0],
    [2.14, 0.42, 0.3],
    [1.95, 0.84, 0.3],
    [1.3, 0.895, 1.0],
    [-1.3, 0.895, 1.0],
    [-1.95, 0.86, 0.3],
    [-2.14, 0.6, 0.25],
    [-2.145, 0, 0],
  ],
  tuck: (y) => (y > 0.62 ? 0.09 * ((y - 0.62) / 0.37) ** 2 : 0.045 * ((0.62 - y) / 0.47) ** 2),
  crownL: (ax) => 0.03 * (ax / 0.85) ** 2,
  gSide: [
    [0.75, 0.8, 0],
    [0.65, 0.96, 0.03],
    [0.2, 1.24, 0.4],
    [-0.15, 1.44, 0.3],
    [-0.6, 1.46, 1.0],
    [-1.55, 1.42, 0.5],
    [-1.95, 1.34, 0.12],
    [-2.08, 1.05, 0.12],
    [-2.12, 0.95, 0.03],
    [-2.14, 0.8, 0],
  ],
  gPlan: [
    [0.9, 0, 0],
    [0.9, 0.66, 0.1],
    [0.4, 0.75, 0.9],
    [-1.0, 0.76, 1.2],
    [-2.2, 0.7, 0.1],
    [-2.2, 0, 0],
  ],
  tumble: (y) => 0.34 * Math.max(0, y - 0.97),
  crownR: (ax) => 0.045 * (ax / 0.62) ** 2,
  kL: 0.055,
  kG: 0.07,
  kJ: 0.02,
  wheels: {zf: 1.265, zr: -1.365, x: 0.77, R: 0.335, Rr: 0.228, w: 0.235, arch: 0.385, xin: 0.56, rim: {spokes: 5, twin: false, hub: 0.065, w0: 0.02, w1: 0.028}},
  mirror: {x: 0.905, y: 1.03, z: 0.45, hx: 0.08, hy: 0.05, hz: 0.045},
  belt: 0.97,
  cabin: [-2.08, 0.65],
  glass: {
    side: [[0.55, 0.975, 0.02], [-0.13, 1.385, 0.1], [-0.6, 1.4, 0.6], [-1.45, 1.365, 0.2], [-1.62, 1.12, 0.12], [-1.66, 1.0, 0.04], [-1.5, 0.99, 0.02]],
    pillars: [[[-0.52, 0.98], [-0.56, 1.395], [-0.64, 1.395], [-0.6, 0.98]]],
    front: [[-0.62, 0.66, 0.05], [0.62, 0.66, 0.05], [0.52, -0.1, 0.08], [-0.52, -0.1, 0.08]],
    back: [[-0.58, 1.08, 0.05], [0.58, 1.08, 0.05], [0.52, 1.32, 0.06], [-0.52, 1.32, 0.06]],
    backView: 'rear',
  },
  inside: {
    steer: {x: 0.36, y: 0.86, z: 0.25, r: 0.18, tilt: 25},
    seat: {x: 0.36, w: 0.5, y0: 0.58, y1: 1.08, z0: -0.25, z1: -0.42},
    rear: {w: 1.2, y0: 0.6, y1: 1.02, z0: -1.18, z1: -1.3, heads: [-0.4, 0.4]},
  },
  lines: (d) => {
    d.side([[0.57, 0.965], [0.74, 0.82, 0.15], [0.83, 0.58, 0.2], [0.85, 0.24]], 2);
    d.side([[-0.6, 0.98], [-0.58, 0.24]], 2);
    d.side([[-1.6, 0.99], [-1.3, 0.83, 0.08], [-1.21, 0.76, 0.1], [-1.02, 0.62, 0.15], [-0.92, 0.41, 0.08], [-0.915, 0.24]], 2);
    d.top([[0.64, 0.72], [0.7, 1.5, 1.0], [0.74, 1.93]], 3);
    d.top([[-0.64, 0.72], [-0.7, 1.5, 1.0], [-0.74, 1.93]], 3);
    d.top([[-0.74, 1.93], [0, 2.03, 0.5], [0.74, 1.93]], 3);
    d.side([[1.9, 0.83], [0.0, 0.86, 2.0], [-2.05, 0.88]], 3);
    d.side([[0.86, 0.26], [-0.92, 0.26]], 3);
    d.side([[0.05, 0.875, 0.012], [-0.14, 0.878, 0.012], [-0.14, 0.902, 0.012], [0.05, 0.899, 0.012]], 3, true);
    d.side([[-1.12, 0.885, 0.012], [-1.3, 0.888, 0.012], [-1.3, 0.912, 0.012], [-1.12, 0.909, 0.012]], 3, true);
    d.arch(1.265, 0.388, 0.2, 2);
    d.arch(-1.365, 0.388, 0.19, 2);
    d.front([[0.36, 0.66, 0.02], [0.8, 0.7, 0.05], [0.84, 0.64, 0.04], [0.74, 0.6, 0.04], [0.4, 0.61, 0.02]], 2, true, true);
    d.front([[-0.36, 0.63, 0.02], [0.36, 0.63, 0.02], [0.34, 0.68, 0.02], [-0.34, 0.68, 0.02]], 3, true);
    d.front([[-0.55, 0.24, 0.05], [0.55, 0.24, 0.05], [0.5, 0.46, 0.05], [-0.5, 0.46, 0.05]], 2, true);
    d.front([[0.62, 0.3, 0.02], [0.78, 0.3, 0.02], [0.78, 0.4, 0.02], [0.62, 0.4, 0.02]], 3, true, true);
    d.rear([[0.45, 0.86, 0.03], [0.86, 0.88, 0.04], [0.88, 0.97, 0.04], [0.45, 0.97, 0.03]], 2, true, true);
    d.rear([[-0.8, 1.34], [-0.84, 0.88, 0.2], [-0.8, 0.7, 0.05], [0.8, 0.7, 0.05], [0.84, 0.88, 0.2], [0.8, 1.34]], 3);
    d.rear([[-0.5, 0.2, 0.04], [0.5, 0.2, 0.04], [0.46, 0.3, 0.04], [-0.46, 0.3, 0.04]], 3, true);
  },
};

export const DESIGNS: Record<string, Design> = {
  sedan: SEDAN,
  taxi: SEDAN,
  'sedan-sports': SPORT,
  suv: SUV,
  'suv-luxury': LUX,
  'hatchback-sports': HATCH,
};

// ---- the field -----------------------------------------------------------------------------------

type Field = (x: number, y: number, z: number, noMirror?: boolean) => number;

function* makeField(D: Design): Work<Field> {
  const B = D.bounds;
  const m = 0.3;
  // a plan is authored as one half, from the centre line out; mirrored here into the whole outline,
  // or its x = 0 edge would be a boundary and pinch the bonnet and the roof along the centre line
  const whole = (half: Pt[]): Pt[] => {
    const h = half.filter(([, x]) => x > 1e-6);
    return [...h, ...h.slice().reverse().map(([z, x, r]) => [z, -x, r] as Pt)];
  };
  const side = yield* Prof.make(D.side, -B.z - m, B.z + m, -0.3, B.y + m);
  const plan = yield* Prof.make(whole(D.plan), -B.z - m, B.z + m, -0.1, B.x + m);
  const gSide = yield* Prof.make(D.gSide, -B.z - m, B.z + m, -0.3, B.y + m);
  const gPlan = yield* Prof.make(whole(D.gPlan), -B.z - m, B.z + m, -0.1, B.x + m);
  const W = D.wheels;
  const M = D.mirror;
  const yw = W.R;
  return (x, y, z, noMirror) => {
    const ax = Math.abs(x);
    const fs = side.at(z, y + D.crownL(ax));
    const fp = plan.at(z, ax + D.tuck(y));
    const fl = smax(fs, fp, D.kL);
    const fgs = gSide.at(z, y + D.crownR(ax));
    const fgp = gPlan.at(z, ax + D.tumble(y));
    const fg = smax(fgs, fgp, D.kG);
    let f = smin(fl, fg, D.kJ);
    // the arches: a cylinder round each axle, cut only from the outer part of the body
    for (const zw of [W.zf, W.zr]) {
      const dz = z - zw;
      if (Math.abs(dz) > W.arch + 0.2) continue;
      const fa = smax(Math.hypot(dz, y - yw) - W.arch, W.xin - ax, 0.02);
      f = smax(f, -fa, 0.012);
    }
    if (D.extra) f = D.extra(ax, y, z, f);
    if (!noMirror && ax > 0.6 && Math.abs(y - M.y) < 0.2 && Math.abs(z - M.z) < 0.25) {
      // the mirror: a head standing off the door on a short stalk
      const head = sdBox(ax - M.x, y - M.y, z - M.z, M.hx, M.hy, M.hz, 0.04);
      const stalk = sdBox(ax - (M.x - M.hx - 0.02), y - (M.y - 0.035), z - (M.z + 0.01), 0.1, 0.018, 0.04, 0.015);
      f = smin(f, smin(head, stalk, 0.02), 0.015);
    }
    return f;
  };
};

const grad = (F: Field, x: number, y: number, z: number, e: number, out: number[], noMirror = false) => {
  out[0] = (F(x + e, y, z, noMirror) - F(x - e, y, z, noMirror)) / (2 * e);
  out[1] = (F(x, y + e, z, noMirror) - F(x, y - e, z, noMirror)) / (2 * e);
  out[2] = (F(x, y, z + e, noMirror) - F(x, y, z - e, noMirror)) / (2 * e);
};

// ---- surface nets --------------------------------------------------------------------------------

type Mesh = {pos: number[]; nrm: number[]; tri: number[]};

function* surfaceNets(F: Field, B: {x: number; y: number; z: number}, h: number): Work<Mesh> {
  const x0 = -B.x;
  const y0 = -0.06;
  const z0 = -B.z;
  const nx = Math.ceil((2 * B.x) / h) + 1;
  const ny = Math.ceil((B.y - y0) / h) + 1;
  const nz = Math.ceil((2 * B.z) / h) + 1;
  const val = new Float32Array(nx * ny * nz);
  const I = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[I(i, j, k)] = F(x0 + i * h, y0 + j * h, z0 + k * h);
    if (k % 6 === 5) yield;
  }
  const cx = nx - 1;
  const cy = ny - 1;
  const cz = nz - 1;
  const cell = new Int32Array(cx * cy * cz).fill(-1);
  const C = (i: number, j: number, k: number) => i + cx * (j + cy * k);
  const pos: number[] = [];
  const E = [
    [0, 1], [2, 3], [4, 5], [6, 7], // x edges
    [0, 2], [1, 3], [4, 6], [5, 7], // y edges
    [0, 4], [1, 5], [2, 6], [3, 7], // z edges
  ];
  const cv = new Float64Array(8);
  const g = [0, 0, 0];
  for (let k = 0; k < cz; k++) {
    if (k % 3 === 2) yield;
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let neg = 0;
        for (let c = 0; c < 8; c++) {
          const v = val[I(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
          cv[c] = v;
          if (v < 0) neg++;
        }
        if (neg === 0 || neg === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of E) {
          if (cv[a] < 0 === cv[b] < 0) continue;
          const t = cv[a] / (cv[a] - cv[b]);
          sx += (a & 1) + (((b & 1) - (a & 1)) * t);
          sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t);
          sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
          n++;
        }
        let px = x0 + (i + sx / n) * h;
        let py = y0 + (j + sy / n) * h;
        let pz = z0 + (k + sz / n) * h;
        // onto the true surface (two Newton steps along the gradient), kept inside its cell's reach
        for (let it = 0; it < 2; it++) {
          const f = F(px, py, pz);
          grad(F, px, py, pz, 0.004, g);
          const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
          if (gg < 1e-8) break;
          const s = clamp(f / gg, -h, h);
          px -= g[0] * s;
          py -= g[1] * s;
          pz -= g[2] * s;
        }
        cell[C(i, j, k)] = pos.length / 3;
        pos.push(px, py, pz);
      }
  }
  const tri: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tri.push(a, c, b, a, d, c);
    else tri.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < cz; k++)
    for (let j = 1; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        // edge along x from (i, j, k)
        const a = val[I(i, j, k)] < 0;
        if (a === val[I(i + 1, j, k)] < 0) continue;
        quad(cell[C(i, j - 1, k - 1)], cell[C(i, j, k - 1)], cell[C(i, j, k)], cell[C(i, j - 1, k)], !a);
      }
  for (let k = 1; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 1; i < cx; i++) {
        const a = val[I(i, j, k)] < 0;
        if (a === val[I(i, j + 1, k)] < 0) continue;
        quad(cell[C(i - 1, j, k - 1)], cell[C(i - 1, j, k)], cell[C(i, j, k)], cell[C(i, j, k - 1)], !a);
      }
  for (let k = 0; k < cz; k++)
    for (let j = 1; j < cy; j++)
      for (let i = 1; i < cx; i++) {
        const a = val[I(i, j, k)] < 0;
        if (a === val[I(i, j, k + 1)] < 0) continue;
        quad(cell[C(i - 1, j - 1, k)], cell[C(i, j - 1, k)], cell[C(i, j, k)], cell[C(i - 1, j, k)], !a);
      }
  yield;
  const nrm: number[] = [];
  for (let v = 0; v < pos.length; v += 3) {
    if (v % 12000 === 0) yield;
    grad(F, pos[v], pos[v + 1], pos[v + 2], 0.006, g);
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    nrm.push(g[0] / l, g[1] / l, g[2] / l);
  }
  return {pos, nrm, tri};
};

// ---- wheels ----------------------------------------------------------------------------------------

/** A revolved tyre (closed), appended to the mesh; returns nothing, fills pos / nrm / tri. */
const tyre = (M: Mesh, cx: number, cy: number, cz: number, W: WheelSpec) => {
  const s = W.w / 2;
  const R = W.R;
  const Rr = W.Rr;
  const side = Math.sign(cx) || 1;
  // (lateral, radial): bead, sidewall bulge, shoulder, tread, and back; closed along the bead seat
  const prof = rounded(
    [
      [-s + 0.014, Rr, 0],
      [-s - 0.002, Rr + 0.03, 0.02],
      [-s - 0.008, (Rr + R) / 2, 0.06],
      [-s + 0.002, R - 0.02, 0.02],
      [-s + 0.03, R, 0.02],
      [s - 0.03, R, 0.02],
      [s - 0.002, R - 0.02, 0.02],
      [s + 0.008, (Rr + R) / 2, 0.06],
      [s + 0.002, Rr + 0.03, 0.02],
      [s - 0.014, Rr, 0],
    ],
    true,
    6,
  );
  const np = prof.length / 2;
  // profile normals: perpendicular to the tangent, pointing away from the profile's centre
  const mc = [0, (R + Rr) / 2];
  const pn: number[] = [];
  for (let i = 0; i < np; i++) {
    const a = (i - 1 + np) % np;
    const b = (i + 1) % np;
    let tx = prof[b * 2] - prof[a * 2];
    let ty = prof[b * 2 + 1] - prof[a * 2 + 1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    let nx = ty;
    let ny = -tx;
    if (nx * (prof[i * 2] - mc[0]) + ny * (prof[i * 2 + 1] - mc[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    pn.push(nx, ny);
  }
  const nt = 120;
  const first = M.pos.length / 3;
  for (let t = 0; t < nt; t++) {
    const th = (t / nt) * Math.PI * 2;
    const c = Math.cos(th);
    const sn = Math.sin(th);
    for (let i = 0; i < np; i++) {
      const lat = prof[i * 2] * side;
      const r = prof[i * 2 + 1];
      M.pos.push(cx + lat, cy + r * c, cz + r * sn);
      M.nrm.push(pn[i * 2] * side, pn[i * 2 + 1] * c, pn[i * 2 + 1] * sn);
    }
  }
  for (let t = 0; t < nt; t++) {
    const t2 = (t + 1) % nt;
    for (let i = 0; i < np; i++) {
      const i2 = (i + 1) % np;
      const a = first + t * np + i;
      const b = first + t * np + i2;
      const c = first + t2 * np + i2;
      const d = first + t2 * np + i;
      M.tri.push(a, b, c, a, c, d);
    }
  }
};

// ---- build ---------------------------------------------------------------------------------------

export type ProcData = {
  vn: Float32Array; // vertex normals
  noC: Uint8Array; // 1 = a body vertex in a wheel house: its triangles draw no contour (tyres are past the end)
  feat: Float32Array; // feature segments, 6 floats each
  fLayer: Uint8Array; // 2 or 3
  fGhost: Uint8Array; // 1 = drawn faintly when hidden
  fNear: Uint32Array; // nearest mesh vertex of each segment end (2 per segment): the pen's distance
  nF: number;
};

const cache = new Map<string, Model>();

export type Steer = 'left' | 'right';

type Bounds = {x: number; y: number; z: number};

/** The designer's pen over a field: lines authored in a view and projected onto the surface, lines
 *  placed in 3D, circles; everything collected as segments with a weight (and a ghost flag). */
const makePen = (F: Field, B: Bounds, archY = 0) => {
  const segs: number[] = [];
  const layers: number[] = [];
  const ghosts: number[] = [];
  const g = [0, 0, 0];
  const hit3 = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): number[] | null => {
    // march along d from o (outside) to the first sign change, then bisect; lift 3 mm off the surface
    let t = 0;
    let f = F(ox, oy, oz, true);
    if (f < 0) return null;
    let tp = 0;
    for (let it = 0; it < 400 && t < 4; it++) {
      tp = t;
      t += Math.max(0.003, f * 0.6);
      f = F(ox + dx * t, oy + dy * t, oz + dz * t, true);
      if (f < 0) break;
    }
    if (f >= 0) return null;
    let a = tp;
    let b = t;
    for (let it = 0; it < 14; it++) {
      const m = (a + b) / 2;
      if (F(ox + dx * m, oy + dy * m, oz + dz * m, true) < 0) b = m;
      else a = m;
    }
    const px = ox + dx * a;
    const py = oy + dy * a;
    const pz = oz + dz * a;
    grad(F, px, py, pz, 0.004, g, true);
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    return [px + (g[0] / l) * 0.003, py + (g[1] / l) * 0.003, pz + (g[2] / l) * 0.003];
  };
  const emit = (pts: (number[] | null)[], layer: Layer, ghost: boolean) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (!a || !b) continue;
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 0.08) continue; // a jump between surfaces
      segs.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      layers.push(layer);
      ghosts.push(ghost ? 1 : 0);
    }
  };
  const path2 = (pts: Pt[], closed: boolean) => resample(rounded(pts, closed, 10), closed, 0.018);
  const draw: Draw = {
    side: (pts, layer, closed = false, ghost = false) => {
      const q = path2(pts, closed);
      for (const sd of [1, -1]) {
        const out: (number[] | null)[] = [];
        for (let i = 0; i < q.length; i += 2) out.push(hit3(sd * (B.x + 0.1), q[i + 1], q[i], -sd, 0, 0));
        emit(out, layer, ghost);
      }
    },
    top: (pts, layer, closed = false, ghost = false) => {
      const q = path2(pts, closed);
      const out: (number[] | null)[] = [];
      for (let i = 0; i < q.length; i += 2) out.push(hit3(q[i], B.y + 0.1, q[i + 1], 0, -1, 0));
      emit(out, layer, ghost);
    },
    front: (pts, layer, closed = false, mirror = false) => {
      for (const set of mirror ? [pts, mirrorX(pts)] : [pts]) {
        const q = path2(set, closed);
        const out: (number[] | null)[] = [];
        for (let i = 0; i < q.length; i += 2) out.push(hit3(q[i], q[i + 1], B.z + 0.1, 0, 0, -1));
        emit(out, layer, false);
      }
    },
    rear: (pts, layer, closed = false, mirror = false) => {
      for (const set of mirror ? [pts, mirrorX(pts)] : [pts]) {
        const q = path2(set, closed);
        const out: (number[] | null)[] = [];
        for (let i = 0; i < q.length; i += 2) out.push(hit3(q[i], q[i + 1], -B.z - 0.1, 0, 0, 1));
        emit(out, layer, false);
      }
    },
    arch: (z, r, yMin, layer) => draw.side(archPts(z, archY, r, yMin), layer),
  };
  const line3 = (pts: number[][], layer: Layer, closed = false) => {
    const q = closed ? [...pts, pts[0]] : pts;
    for (let i = 1; i < q.length; i++) {
      segs.push(q[i - 1][0], q[i - 1][1], q[i - 1][2], q[i][0], q[i][1], q[i][2]);
      layers.push(layer);
      ghosts.push(0);
    }
  };
  /** A rounded rectangle in the plane through c spanned by u (width) and v (height). */
  const card = (c: number[], u: number[], v: number[], w: number, h: number, r: number, layer: Layer) => {
    const flat = rounded([[-w / 2, -h / 2, r], [w / 2, -h / 2, r], [w / 2, h / 2, r], [-w / 2, h / 2, r]], true, 6);
    const pts: number[][] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([0, 1, 2].map((k) => c[k] + u[k] * flat[i] + v[k] * flat[i + 1]));
    line3(pts, layer, true);
  };
  /** A circle round an axis along x, at x = cx. */
  const circle = (cx: number, cy: number, cz: number, r: number, layer: Layer, n = 64) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      segs.push(cx, cy + r * Math.cos(a0), cz + r * Math.sin(a0), cx, cy + r * Math.cos(a1), cz + r * Math.sin(a1));
      layers.push(layer);
      ghosts.push(0);
    }
  };
  return {segs, layers, ghosts, draw, line3, card, circle};
};
type Pen = ReturnType<typeof makePen>;

type WheelM = {c: THREE.Vector3; r: number; halfW: number};
type Bx = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => THREE.Box3;

/** Everything after the design (metres in, a Model out): normalised to 4 units along the length,
 *  the edges for the pen's walk, each design line's anchor on the surface, the occluders (minus
 *  what `drop` removes, the glass), the framing hull and the part boxes. */
function* finish(o: {
  key: string;
  len: number;
  M: Mesh;
  bodyTri: number; // index count of the body before the tyres
  pen: Pen;
  noC: Uint8Array;
  drop?: (a: number, b: number, c: number) => boolean; // a body triangle left out of the occluder
  disc?: {pos: number[]; tri: number[]};
  wheels: WheelM[];
  parts: (Bx: Bx, box: THREE.Box3) => Record<Part, THREE.Box3[]>; // box in metres
  /** lay the design's length (z) along x, bow to +x: a ship that `move`s across the screen sails
   *  forward (the Kenney ship it replaces was modelled that way). Parts stay in design axes. */
  alongX?: boolean;
}): Work<Model> {
  const {M, pen} = o;
  const k = 4 / o.len;
  if (o.alongX) {
    // (x, y, z) -> (z, y, -x), for every point and normal
    const turn = (a: number[]) => {
      for (let i = 0; i < a.length; i += 3) {
        const x = a[i];
        a[i] = a[i + 2];
        a[i + 2] = -x;
      }
    };
    turn(M.pos);
    turn(M.nrm);
    turn(pen.segs);
    if (o.disc) turn(o.disc.pos);
  }
  const pos = new Float32Array(M.pos.length);
  for (let i = 0; i < M.pos.length; i++) pos[i] = M.pos[i] * k;
  const feat = new Float32Array(pen.segs.length);
  for (let i = 0; i < pen.segs.length; i++) feat[i] = pen.segs[i] * k;
  const nv = pos.length / 3;
  const tri = new Uint32Array(M.tri);
  const nf = tri.length / 3;

  // edges (for the pen's walk over the surface)
  const emap = new Set<number>();
  const EA: number[] = [];
  const EB: number[] = [];
  for (let f = 0; f < nf; f++)
    for (let j = 0; j < 3; j++) {
      const a = tri[f * 3 + j];
      const b = tri[f * 3 + ((j + 1) % 3)];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const key = lo * 4194304 + hi;
      if (emap.has(key)) continue;
      emap.add(key);
      EA.push(lo);
      EB.push(hi);
    }
  const ne = EA.length;
  const ea = new Uint32Array(EA);
  const eb = new Uint32Array(EB);
  const eLen = new Float32Array(ne);
  let maxLen = 0;
  for (let e = 0; e < ne; e++) {
    const a = ea[e] * 3;
    const b = eb[e] * 3;
    eLen[e] = Math.hypot(pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]);
    if (eLen[e] > maxLen) maxLen = eLen[e];
  }

  // nearest mesh vertex of every design-line end (a coarse spatial hash; the cabin lies deeper)
  const hc = 0.06;
  const hash = new Map<string, number[]>();
  const hk = (x: number, y: number, z: number) => `${Math.floor(x / hc)},${Math.floor(y / hc)},${Math.floor(z / hc)}`;
  for (let i = 0; i < nv; i++) {
    const key = hk(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    let l = hash.get(key);
    if (!l) hash.set(key, (l = []));
    l.push(i);
  }
  yield;
  const nF = feat.length / 6;
  const fNear = new Uint32Array(nF * 2);
  for (let s = 0; s < nF * 2; s++) {
    if (s % 1500 === 1499) yield;
    const x = feat[s * 3];
    const y = feat[s * 3 + 1];
    const z = feat[s * 3 + 2];
    let best = 0;
    let bd = Infinity;
    const ix = Math.floor(x / hc);
    const iy = Math.floor(y / hc);
    const iz = Math.floor(z / hc);
    for (let r = 1; r <= 10 && bd === Infinity; r++)
      for (let a = -r; a <= r; a++)
        for (let b = -r; b <= r; b++)
          for (let c = -r; c <= r; c++) {
            if (r > 1 && Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) < r) continue; // the shell only
            const l = hash.get(`${ix + a},${iy + b},${iz + c}`);
            if (!l) continue;
            for (const i of l) {
              const d = (pos[i * 3] - x) ** 2 + (pos[i * 3 + 1] - y) ** 2 + (pos[i * 3 + 2] - z) ** 2;
              if (d < bd) {
                bd = d;
                best = i;
              }
            }
          }
    fNear[s] = best;
  }

  yield;
  const occTri: number[] = [];
  for (let f = 0; f < nf; f++) {
    const a = tri[f * 3];
    const b = tri[f * 3 + 1];
    const c = tri[f * 3 + 2];
    if (o.drop && f * 3 < o.bodyTri && o.drop(a, b, c)) continue;
    occTri.push(a, b, c);
  }
  const occ = new THREE.BufferGeometry();
  occ.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  occ.setIndex(new THREE.BufferAttribute(new Uint32Array(occTri), 1));
  const occluders = [occ];
  if (o.disc && o.disc.tri.length) {
    const dp = new Float32Array(o.disc.pos.length);
    for (let i = 0; i < dp.length; i++) dp[i] = o.disc.pos[i] * k;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setIndex(new THREE.BufferAttribute(new Uint32Array(o.disc.tri), 1));
    occluders.push(dg);
  }

  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < nv; i++) box.expandByPoint(v.fromArray(pos, i * 3));
  const step = Math.max(1, Math.floor(nv / 900));
  const H: number[] = [];
  for (let i = 0; i < nv; i += step) H.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  H.push(box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z);

  const Bx: Bx = o.alongX
    ? (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(z0 * k, y0 * k, -x1 * k), new THREE.Vector3(z1 * k, y1 * k, -x0 * k))
    : (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0 * k, y0 * k, z0 * k), new THREE.Vector3(x1 * k, y1 * k, z1 * k));
  const boxM = o.alongX
    ? new THREE.Box3(new THREE.Vector3(-box.max.z / k, box.min.y / k, box.min.x / k), new THREE.Vector3(-box.min.z / k, box.max.y / k, box.max.x / k))
    : new THREE.Box3(box.min.clone().multiplyScalar(1 / k), box.max.clone().multiplyScalar(1 / k));
  return {
    key: o.key,
    nv,
    pos,
    ne,
    ea,
    eb,
    ef1: new Int32Array(0),
    ef2: new Int32Array(0),
    eAngle: new Float32Array(0),
    eLen,
    eWheel: new Uint8Array(ne),
    maxLen,
    nf,
    tri,
    fn: new Float32Array(0),
    fp: new Float32Array(0),
    occluders,
    box,
    hull: new Float32Array(H),
    wheels: o.wheels.map((w) => ({c: w.c.clone().multiplyScalar(k), r: w.r * k, halfW: w.halfW * k})),
    car: o.wheels.length >= 4,
    parts: o.parts(Bx, boxM),
    dist: new Map(),
    proc: {vn: new Float32Array(M.nrm), noC: o.noC, feat, fLayer: new Uint8Array(pen.layers), fGhost: new Uint8Array(pen.ghosts), fNear, nF},
    bodyTri: o.bodyTri / 3,
  };
};

export const hasDesign = (name: string) => name in DESIGNS || name in SHIPS;

function* carGen(name: string, steer: Steer): Work<Model> {
  const ck = `${name}|${steer}`;
  const D = DESIGNS[name];
  const F = yield* makeField(D);
  const M = yield* surfaceNets(F, D.bounds, 0.025);
  const bodyTri = M.tri.length;
  const W = D.wheels;
  // the wheel houses: the lip is a crease sharper than the mesh, so its contour frays; the lip is
  // drawn as a design line instead, and nothing inside the arch draws a contour
  const nBody = M.pos.length / 3;
  const noC = new Uint8Array(nBody);
  for (let i = 0; i < nBody; i++) {
    const y = M.pos[i * 3 + 1];
    const z = M.pos[i * 3 + 2];
    for (const zw of [W.zf, W.zr]) if (Math.hypot(z - zw, y - W.R) < W.arch + 0.016) noC[i] = 1;
  }
  const wheelsM: WheelM[] = [];
  for (const z of [W.zf, W.zr])
    for (const sx of [-1, 1]) {
      const c = new THREE.Vector3(sx * W.x, W.R, z);
      tyre(M, c.x, c.y, c.z, W);
      wheelsM.push({c, r: W.R, halfW: W.w / 2});
    }

  // ---- the designer's lines: the glass (medium; the pillars inside it are solid), then the design's
  yield;
  const pen = makePen(F, D.bounds, W.R);
  const {draw, line3, card, circle} = pen;
  const G = D.glass;
  draw.side(G.side, 2, true);
  for (const p of G.pillars) draw.side(p, 2, true);
  draw.top(G.front, 2, true);
  if (G.backView === 'rear') draw.rear(G.back, 2, true);
  else draw.top(G.back, 2, true);
  yield;
  D.lines(draw);
  yield;

  // ---- the cabin, seen through the glass (lines only; the body hides it everywhere else)
  const I = D.inside;
  {
    // steering wheel: rim, hub and three spokes, in a plane leaning back toward the driver
    const S = I.steer;
    const sx = steer === 'left' ? S.x : -S.x;
    const t = (S.tilt * Math.PI) / 180;
    const v = [0, Math.cos(t), -Math.sin(t)];
    const at = (r: number, a: number) => [sx + r * Math.cos(a), S.y + r * Math.sin(a) * v[1], S.z + r * Math.sin(a) * v[2]];
    const ring = (r: number, n: number, layer: Layer) => line3(Array.from({length: n}, (_, i) => at(r, (i / n) * Math.PI * 2)), layer, true);
    ring(S.r, 56, 2);
    ring(S.r - 0.028, 56, 3);
    ring(0.05, 24, 3);
    for (const a of [0, Math.PI, -Math.PI / 2]) line3([at(0.05, a), at(S.r - 0.028, a)], 3);
    // front seat backs with their headrests (the back leans back by its z0..z1)
    const T = I.seat;
    const lean = Math.atan2(T.z0 - T.z1, T.y1 - T.y0);
    const up = [0, Math.cos(lean), -Math.sin(lean)];
    for (const x of [T.x, -T.x]) {
      const h = T.y1 - T.y0;
      card([x, (T.y0 + T.y1) / 2, (T.z0 + T.z1) / 2], [1, 0, 0], up, T.w, h, 0.09, 3);
      card([x, T.y1 + 0.13 * up[1], T.z1 + 0.13 * up[2]], [1, 0, 0], up, 0.25, 0.16, 0.06, 3);
    }
    // the rear bench and its headrests
    const Rb = I.rear;
    const rl = Math.atan2(Rb.z0 - Rb.z1, Rb.y1 - Rb.y0);
    const ru = [0, Math.cos(rl), -Math.sin(rl)];
    card([0, (Rb.y0 + Rb.y1) / 2, (Rb.z0 + Rb.z1) / 2], [1, 0, 0], ru, Rb.w, Rb.y1 - Rb.y0, 0.1, 3);
    for (const x of Rb.heads) card([x, Rb.y1 + 0.11 * ru[1], Rb.z1 + 0.11 * ru[2]], [1, 0, 0], ru, 0.24, 0.14, 0.05, 3);
  }

  // ---- the rims: drawn on the wheel face (lip, inner barrel, spokes, centre cap); a disc occludes
  const disc: number[] = [];
  const discTri: number[] = [];
  for (const w of wheelsM) {
    const sd = Math.sign(w.c.x);
    const face = w.c.x + sd * (W.w / 2 - 0.006);
    const inner = W.Rr - 0.026;
    circle(face, w.c.y, w.c.z, W.Rr - 0.004, 2);
    circle(face - sd * 0.012, w.c.y, w.c.z, inner, 3);
    const hubX = face + sd * 0.004;
    circle(hubX, w.c.y, w.c.z, 0.036, 3, 32);
    const rim = W.rim;
    const arms: number[] = [];
    for (let i = 0; i < rim.spokes; i++) {
      const a = (i / rim.spokes) * Math.PI * 2 + 0.3;
      if (rim.twin) arms.push(a - 0.11, a + 0.11);
      else arms.push(a);
    }
    for (const a of arms) {
      for (const sgn of [-1, 1]) {
        const a0 = a + (sgn * rim.w0) / rim.hub;
        const a1 = a + (sgn * rim.w1) / inner;
        line3([[hubX, w.c.y + rim.hub * Math.cos(a0), w.c.z + rim.hub * Math.sin(a0)], [face - sd * 0.012, w.c.y + inner * Math.cos(a1), w.c.z + inner * Math.sin(a1)]], 3);
      }
    }
    // occluding disc a little inside the face: hides what is behind the wheel, never the rim lines
    const dx = face - sd * 0.03;
    const first = disc.length / 3;
    disc.push(dx, w.c.y, w.c.z);
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      disc.push(dx, w.c.y + W.Rr * Math.cos(a), w.c.z + W.Rr * Math.sin(a));
    }
    for (let i = 0; i < n; i++) discTri.push(first, first + 1 + i, first + 1 + ((i + 1) % n));
  }

  // ---- the glass leaves the occluder: the cabin and the far side's glass show through it
  const inPoly = (poly: Float64Array, u: number, v: number) => sdPoly(poly, u, v) < -0.004;
  const gSidePoly = new Float64Array(rounded(G.side, true, 8));
  const gPillars = G.pillars.map((p) => new Float64Array(rounded(p, true, 8)));
  const gFront = new Float64Array(rounded(G.front, true, 8));
  const gBack = new Float64Array(rounded(G.back, true, 8));
  const backRear = G.backView === 'rear';
  const pm = M.pos;
  const nm = M.nrm;
  const drop = (a: number, b: number, c: number) => {
    const cy = (pm[a * 3 + 1] + pm[b * 3 + 1] + pm[c * 3 + 1]) / 3;
    if (cy <= D.belt - 0.02) return false;
    const cx = (pm[a * 3] + pm[b * 3] + pm[c * 3]) / 3;
    const cz = (pm[a * 3 + 2] + pm[b * 3 + 2] + pm[c * 3 + 2]) / 3;
    const nx = (nm[a * 3] + nm[b * 3] + nm[c * 3]) / 3;
    const ny = (nm[a * 3 + 1] + nm[b * 3 + 1] + nm[c * 3 + 1]) / 3;
    const nz = (nm[a * 3 + 2] + nm[b * 3 + 2] + nm[c * 3 + 2]) / 3;
    if (Math.abs(nx) > 0.45) return inPoly(gSidePoly, cz, cy) && !gPillars.some((p) => inPoly(p, cz, cy));
    if (ny > 0.2 && nz > -0.2 && inPoly(gFront, cx, cz)) return true;
    return backRear ? nz < -0.3 && inPoly(gBack, cx, cy) : ny > 0.2 && nz < 0.2 && inPoly(gBack, cx, cz);
  };

  return yield* finish({
    key: `car:${ck}`,
    len: D.len,
    M,
    bodyTri,
    pen,
    noC,
    drop,
    disc: {pos: disc, tri: discTri},
    wheels: wheelsM,
    parts: (Bx, box) => {
      const hw = Math.min(box.max.x, W.x + W.w / 2 + 0.05); // the body, not the mirrors
      const S = D.inside.steer;
      const sx = steer === 'left' ? S.x : -S.x;
      return {
        front: [Bx(-hw, 0, W.zf - W.R * 1.25, hw, D.belt, box.max.z)],
        rear: [Bx(-hw, 0, box.min.z, hw, D.belt + 0.04, W.zr + W.R * 1.25)],
        roof: [Bx(-0.82, D.belt - 0.02, D.cabin[0], 0.82, box.max.y, D.cabin[1])],
        steering: [Bx(sx - S.r - 0.03, S.y - S.r - 0.03, S.z - 0.12, sx + S.r + 0.03, S.y + S.r + 0.03, S.z + 0.12)],
        // the VIN plate: on the dashboard at the foot of the windscreen, the driver's side, read through the glass
        vin: [(() => {
          const zc = D.cabin[1] - 0.1;
          const xc = Math.sign(sx) * 0.52;
          return Bx(xc - 0.1, D.belt - 0.03, zc - 0.07, xc + 0.1, D.belt + 0.05, zc + 0.07);
        })()],
        engine: [Bx(-0.8, D.belt - 0.45, D.cabin[1], 0.8, D.belt, box.max.z - 0.12)],
        wheels: wheelsM.map((w) => {
          const sd = Math.sign(w.c.x);
          return Bx(w.c.x - w.halfW - (sd < 0 ? 0.03 : 0), 0, w.c.z - w.r, w.c.x + w.halfW + (sd > 0 ? 0.03 : 0), w.r * 2, w.c.z + w.r);
        }),
      };
    },
  });
}

// ---- the container ship -----------------------------------------------------------------------------

// A container ship at the scale of the drawing (5 units long, the hull above the waterline): a flared
// bow with a raked stem and a forecastle, a transom stern, the accommodation block and bridge aft with
// a funnel behind, and bays of containers stacked 4..6 high on deck. The containers are drawn as
// containers: tiers on the sides, rows and tiers on the ends, rows on top.
type Ship = {
  len: number;
  bounds: Bounds;
  side: Pt[]; // hull (z, y)
  plan: Pt[]; // hull (z, |x|)
  deck: number;
  bays: {z0: number; pitch: number; len: number; n: number; tiers: number[]; w: number};
  tier: number; // container height
  row: number; // container width
  house: {z0: number; z1: number; w: number; top: number; wing: number; bridge: [number, number]};
  funnel: {z0: number; z1: number; w: number; top: number};
};

const SHIP: Ship = {
  len: 5.0,
  bounds: {x: 0.5, y: 1.3, z: 2.65},
  side: [
    [-2.44, -0.03, 0],
    [-2.5, 0.1, 0.04],
    [-2.5, 0.345, 0.01],
    [2.05, 0.345, 0.3],
    [2.3, 0.425, 0.12],
    [2.52, 0.45, 0.02],
    [2.44, 0.16, 0.35],
    [2.32, -0.03, 0],
  ],
  plan: [
    [-2.5, 0, 0],
    [-2.5, 0.3, 0.06],
    [-2.15, 0.365, 0.5],
    [1.3, 0.37, 1.5],
    [1.95, 0.32, 0.6],
    [2.32, 0.16, 0.4],
    [2.53, 0, 0],
  ],
  deck: 0.345,
  bays: {z0: -1.62, pitch: 0.305, len: 0.285, n: 12, tiers: [5, 6, 6, 6, 6, 6, 6, 5, 5, 4, 4, 3], w: 0.335},
  tier: 0.062,
  row: 0.0565,
  house: {z0: -2.2, z1: -1.78, w: 0.3, top: 1.02, wing: 0.37, bridge: [0.93, 0.99]},
  funnel: {z0: -2.4, z1: -2.24, w: 0.11, top: 0.98},
};

const SHIPS: Record<string, Ship> = {'ship-cargo-a': SHIP};

function* shipGen(name: string): Work<Model> {
  const S = SHIPS[name];
  const B = S.bounds;
  const m = 0.3;
  const whole = (half: Pt[]): Pt[] => {
    const h = half.filter(([, x]) => x > 1e-6);
    return [...h, ...h.slice().reverse().map(([z, x, r]) => [z, -x, r] as Pt)];
  };
  const side = yield* Prof.make(S.side, -B.z - m, B.z + m, -0.3, B.y + m);
  const plan = yield* Prof.make(whole(S.plan), -B.z - m, B.z + m, -0.1, B.x + m);
  const Y = S.bays;
  const bayTop = (i: number) => S.deck + Y.tiers[i] * S.tier;
  // the stack narrows with the hull toward the bow
  const bayW = (i: number) => {
    const zc = Y.z0 + i * Y.pitch + Y.len / 2;
    let w = Y.w;
    for (const dz of [-Y.len / 2, Y.len / 2]) w = Math.min(w, -plan.at(zc + dz, 0) - 0.035);
    return Math.max(0.12, Math.round(w / S.row) * S.row - 0.004);
  };
  const widths = Y.tiers.map((_, i) => bayW(i));
  const H = S.house;
  const Fn = S.funnel;
  const F: Field = (x, y, z) => {
    const ax = Math.abs(x);
    // the hull: side view and plan, with a little flare as it rises
    let f = smax(side.at(z, y), plan.at(z, ax - 0.03 * Math.max(0, y - 0.1)), 0.03);
    if (y > S.deck - 0.05) {
      // the containers: the bay under z and its neighbours
      const i0 = Math.floor((z - Y.z0) / Y.pitch);
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        if (i < 0 || i >= Y.n) continue;
        const zc = Y.z0 + i * Y.pitch + Y.len / 2;
        const top = bayTop(i);
        const b = sdBox(x, y - (S.deck + top) / 2, z - zc, widths[i], (top - S.deck) / 2 + 0.01, Y.len / 2, 0.004);
        f = Math.min(f, b);
      }
      // accommodation, bridge wings, funnel
      if (z < H.z1 + 0.2) {
        const house = sdBox(x, y - (S.deck + H.top) / 2, z - (H.z0 + H.z1) / 2, H.w, (H.top - S.deck) / 2, (H.z1 - H.z0) / 2, 0.008);
        const wing = sdBox(x, y - (H.bridge[0] + H.bridge[1]) / 2, z - (H.z1 - 0.08), H.wing, (H.bridge[1] - H.bridge[0]) / 2, 0.08, 0.006);
        const fun = sdBox(x, y - (S.deck + Fn.top) / 2, z - (Fn.z0 + Fn.z1) / 2, Fn.w, (Fn.top - S.deck) / 2, (Fn.z1 - Fn.z0) / 2, 0.03);
        f = Math.min(f, house, wing, fun);
      }
    }
    return f;
  };
  const M = yield* surfaceNets(F, B, 0.02);
  const bodyTri = M.tri.length;
  const pen = makePen(F, B);
  const {draw, line3} = pen;
  // the hull: the boot top at the waterline, the sheer strake, the anchor pockets
  draw.side([[-2.49, 0.06], [2.33, 0.06]], 2);
  draw.side([[-2.49, 0.3], [2.0, 0.3], [2.28, 0.38, 0.1], [2.45, 0.405]], 3);
  draw.side([[2.3, 0.33, 0.02], [2.37, 0.335, 0.02], [2.37, 0.37, 0.02], [2.3, 0.365, 0.02]], 3, true);
  // the containers
  const e = 0.003;
  for (let i = 0; i < Y.n; i++) {
    const za = Y.z0 + i * Y.pitch;
    const zb = za + Y.len;
    const w = widths[i] + e;
    const top = bayTop(i) + e;
    for (let t = 1; t < Y.tiers[i]; t++) {
      const y = S.deck + t * S.tier;
      for (const sx of [-1, 1]) line3([[sx * w, y, za], [sx * w, y, zb]], 3); // tiers on the sides
      for (const z of [za - e, zb + e]) line3([[-w, y, z], [w, y, z]], 3); // tiers on the ends
    }
    const rows = Math.round((2 * widths[i]) / S.row);
    for (let r = 1; r < rows; r++) {
      const x = -widths[i] + r * S.row;
      for (const z of [za - e, zb + e]) line3([[x, S.deck, z], [x, top, z]], 3); // rows on the ends
      line3([[x, top, za], [x, top, zb]], 3); // rows on top
    }
  }
  // the accommodation: its decks, the bridge windows, a mast; the funnel's band
  for (let y = S.deck + 0.1; y < H.bridge[0] - 0.04; y += 0.1) {
    line3([[-H.w - e, y, H.z0], [-H.w - e, y, H.z1], [H.w + e, y, H.z1], [H.w + e, y, H.z0]], 3);
  }
  const zf = H.z1 + e;
  line3([[-H.wing, H.bridge[0] + 0.012, zf], [H.wing, H.bridge[0] + 0.012, zf]], 2);
  line3([[-H.wing, H.bridge[1] - 0.008, zf], [H.wing, H.bridge[1] - 0.008, zf]], 2);
  for (let x = -H.wing + 0.06; x < H.wing - 0.03; x += 0.06) line3([[x, H.bridge[0] + 0.012, zf], [x, H.bridge[1] - 0.008, zf]], 3);
  const zm = (H.z0 + H.z1) / 2;
  line3([[0, H.top, zm], [0, H.top + 0.2, zm]], 2);
  line3([[-0.1, H.top + 0.15, zm], [0.1, H.top + 0.15, zm]], 3);
  const fb = Fn.top - 0.08;
  line3([[-Fn.w - e, fb, Fn.z0], [-Fn.w - e, fb, Fn.z1], [Fn.w + e, fb, Fn.z1], [Fn.w + e, fb, Fn.z0], [-Fn.w - e, fb, Fn.z0]], 3);

  return yield* finish({
    key: `ship:${name}`,
    len: S.len,
    alongX: true,
    M,
    bodyTri,
    pen,
    noC: new Uint8Array(M.pos.length / 3),
    wheels: [],
    parts: (Bx, box) => {
      const hw = box.max.x;
      return {
        front: [Bx(-hw, 0, 1.2, hw, 0.6, box.max.z)],
        rear: [Bx(-hw, 0, box.min.z, hw, box.max.y, -1.7)],
        roof: [Bx(-hw, S.deck, Y.z0, hw, S.deck + Math.max(...Y.tiers) * S.tier, Y.z0 + Y.n * Y.pitch)],
        engine: [Bx(-Fn.w - 0.05, S.deck, Fn.z0 - 0.05, Fn.w + 0.05, Fn.top + 0.03, Fn.z1 + 0.05)],
        steering: [Bx(-H.wing, H.bridge[0], H.z1 - 0.16, H.wing, H.bridge[1], H.z1 + 0.02)],
        vin: [],
        wheels: [Bx(-hw, 0, box.min.z, hw, 0.08, box.max.z)],
      };
    },
  });
}

const gen = (name: string, steer: Steer): Work<Model> => (name in SHIPS ? shipGen(name) : carGen(name, steer));
const keyOf = (name: string, steer: Steer) => (name in SHIPS ? name : `${name}|${steer}`);

/** Build at once (tests, tools). */
export const buildCar = (name: string, steer: Steer = 'left'): Model => {
  const key = keyOf(name, steer);
  const hit = cache.get(key);
  if (hit) return hit;
  const g = gen(name, steer);
  for (;;) {
    const r = g.next();
    if (r.done) {
      cache.set(key, r.value);
      return r.value;
    }
  }
};

const pending = new Map<string, Promise<Model>>();

/** Build in slices of about 12 ms between tasks, so the tab keeps painting and answering the
 *  renderer while a car is made (about a second of work); Wire3D holds a delayRender meanwhile.
 *  One build per name and steer, shared by every scene of the tab. */
export const buildCarAsync = (name: string, steer: Steer = 'left'): Promise<Model> => {
  const key = keyOf(name, steer);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    const g = gen(name, steer);
    p = new Promise<Model>((resolve, reject) => {
      const step = () => {
        try {
          const t0 = performance.now();
          for (;;) {
            const r = g.next();
            if (r.done) {
              cache.set(key, r.value);
              resolve(r.value);
              return;
            }
            if (performance.now() - t0 > 12) break;
          }
          setTimeout(step, 0);
        } catch (e) {
          reject(e);
        }
      };
      step();
    });
    pending.set(key, p);
  }
  return p;
};

