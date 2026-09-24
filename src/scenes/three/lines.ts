import * as THREE from 'three';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type {Model} from './model';

// Per-frame line work for the technical drawing. Buffers are allocated once per model and
// rewritten every frame (no GPU buffer churn): silhouettes depend on the camera, the pen
// reveal on the frame, tints on the highlight and scan.

export type Rgb = [number, number, number];

export const rgb = (hex: string): Rgb => {
  const c = new THREE.Color(hex); // linear, as the line shader expects
  return [c.r, c.g, c.b];
};

export class DynLines {
  obj: LineSegments2;
  geo: LineSegmentsGeometry;
  mat: LineMaterial;
  pos: Float32Array;
  col: Float32Array;
  n = 0;
  cap: number;
  constructor(cap: number, o: {width: number; opacity?: number; depthTest?: boolean; additive?: boolean; order?: number; w: number; h: number}) {
    this.cap = Math.max(1, cap);
    this.pos = new Float32Array(this.cap * 6);
    this.col = new Float32Array(this.cap * 6);
    this.geo = new LineSegmentsGeometry();
    this.geo.setPositions(this.pos);
    this.geo.setColors(this.col);
    this.mat = new LineMaterial({color: 0xffffff, linewidth: o.width, worldUnits: false, transparent: true, opacity: o.opacity ?? 1});
    this.mat.vertexColors = true;
    this.mat.toneMapped = false;
    this.mat.depthTest = o.depthTest ?? true;
    this.mat.depthWrite = false;
    if (o.additive) {
      // adds light without touching alpha: over the transparent canvas it composites as pure glow
      this.mat.blending = THREE.CustomBlending;
      this.mat.blendEquation = THREE.AddEquation;
      this.mat.blendSrc = THREE.OneFactor;
      this.mat.blendDst = THREE.OneFactor;
      this.mat.blendSrcAlpha = THREE.ZeroFactor;
      this.mat.blendDstAlpha = THREE.OneFactor;
    }
    this.mat.resolution.set(o.w, o.h);
    this.obj = new LineSegments2(this.geo, this.mat);
    this.obj.frustumCulled = false;
    this.obj.renderOrder = o.order ?? 10;
  }
  reset() {
    this.n = 0;
  }
  seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number, ca: Rgb | number[], cb: Rgb | number[] = ca) {
    if (this.n >= this.cap) return;
    const i = this.n * 6;
    this.pos[i] = ax;
    this.pos[i + 1] = ay;
    this.pos[i + 2] = az;
    this.pos[i + 3] = bx;
    this.pos[i + 4] = by;
    this.pos[i + 5] = bz;
    this.col[i] = ca[0];
    this.col[i + 1] = ca[1];
    this.col[i + 2] = ca[2];
    this.col[i + 3] = cb[0];
    this.col[i + 4] = cb[1];
    this.col[i + 5] = cb[2];
    this.n++;
  }
  commit() {
    (this.geo.attributes.instanceStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
    (this.geo.attributes.instanceColorStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
    this.geo.instanceCount = this.n;
    this.obj.visible = this.n > 0;
  }
}

export type Layers = {t1: DynLines; t2: DynLines; t3: DynLines; ghost: DynLines; glowW: DynLines; glowC: DynLines};

export type Tint = {boxes: THREE.Box3[]; color: Rgb; k: number};
export type ScanTint = {z: number; color: Rgb; band: number; keep: number; dir: number; fade: number};

export type EdgeFrame = {
  cam: THREE.Vector3; // camera position in model space
  R: number; // pen radius along the surface (same units as the distances)
  dist: Float32Array;
  fdist?: Float32Array; // a procedural car's design lines: the pen distance of each segment end
  base: Rgb;
  threshold: number;
  ghost: boolean;
  tint?: Tint;
  scan?: ScanTint;
};

const SHORT = 0.05; // edges shorter than this (in the 4-unit model space) are details
const CREASE = 50; // degrees: at or above, a crease reads as structure
const HEAD = 0.16; // length of the glowing pen head

let facing = new Uint8Array(0);
const ca: number[] = [0, 0, 0];
const cb: number[] = [0, 0, 0];

const inBoxes = (boxes: THREE.Box3[], x: number, y: number, z: number) => {
  for (const b of boxes) {
    if (x >= b.min.x && x <= b.max.x && y >= b.min.y && y <= b.max.y && z >= b.min.z && z <= b.max.z) return true;
  }
  return false;
};

const colorAt = (f: EdgeFrame, x: number, y: number, z: number, out: number[]) => {
  out[0] = f.base[0];
  out[1] = f.base[1];
  out[2] = f.base[2];
  if (f.tint && f.tint.k > 0 && inBoxes(f.tint.boxes, x, y, z)) {
    const k = f.tint.k;
    out[0] += (f.tint.color[0] - out[0]) * k;
    out[1] += (f.tint.color[1] - out[1]) * k;
    out[2] += (f.tint.color[2] - out[2]) * k;
  }
  if (f.scan) {
    const s = f.scan;
    const dz = (z - s.z) * s.dir; // > 0: already passed by the plane
    let k = 0;
    if (dz >= 0) k = Math.max(s.keep, Math.max(0, 1 - dz / s.band) * s.fade);
    if (k > 0) {
      out[0] += (s.color[0] - out[0]) * k;
      out[1] += (s.color[1] - out[1]) * k;
      out[2] += (s.color[2] - out[2]) * k;
    }
  }
};

export const fillEdges = (m: Model, f: EdgeFrame, L: Layers) => {
  if (m.proc) return fillProc(m, f, L);
  const {pos, fn, fp} = m;
  if (facing.length < m.nf) facing = new Uint8Array(m.nf);
  const cx = f.cam.x;
  const cy = f.cam.y;
  const cz = f.cam.z;
  for (let i = 0; i < m.nf; i++) {
    const j = i * 3;
    facing[i] = fn[j] * (cx - fp[j]) + fn[j + 1] * (cy - fp[j + 1]) + fn[j + 2] * (cz - fp[j + 2]) > 0 ? 1 : 0;
  }
  for (const l of [L.t1, L.t2, L.t3, L.ghost, L.glowW, L.glowC]) l.reset();
  const D = f.dist;
  for (let e = 0; e < m.ne; e++) {
    const f1 = m.ef1[e];
    const f2 = m.ef2[e];
    const hard = m.eAngle[e] >= f.threshold;
    let sil = false;
    let front = true;
    if (f2 >= 0) {
      sil = facing[f1] !== facing[f2];
      front = facing[f1] === 1 || facing[f2] === 1;
    }
    if (!hard && !sil) continue;
    const a = m.ea[e];
    const b = m.eb[e];
    const len = m.eLen[e];
    if (len < 1e-6) continue;
    const ta = Math.min(1, Math.max(0, (f.R - D[a]) / len));
    const tb = Math.min(1, Math.max(0, (f.R - D[b]) / len));
    if (ta <= 0 && tb <= 0) continue;
    const ax = pos[a * 3];
    const ay = pos[a * 3 + 1];
    const az = pos[a * 3 + 2];
    const bx = pos[b * 3];
    const by = pos[b * 3 + 1];
    const bz = pos[b * 3 + 2];
    const layer = sil || f2 < 0 ? L.t1 : m.eAngle[e] >= CREASE && len >= SHORT ? L.t2 : L.t3;
    const full = ta + tb >= 1;
    if (f.ghost && hard && !m.eWheel[e] && m.eAngle[e] >= CREASE) {
      if (full) L.ghost.seg(ax, ay, az, bx, by, bz, f.base);
      else {
        if (ta > 0) L.ghost.seg(ax, ay, az, ax + (bx - ax) * ta, ay + (by - ay) * ta, az + (bz - az) * ta, f.base);
        if (tb > 0) L.ghost.seg(bx, by, bz, bx + (ax - bx) * tb, by + (ay - by) * tb, bz + (az - bz) * tb, f.base);
      }
    }
    if (!front && !sil) continue; // both faces turned away: hidden, only the ghost shows it
    if (full) {
      colorAt(f, ax, ay, az, ca);
      colorAt(f, bx, by, bz, cb);
      layer.seg(ax, ay, az, bx, by, bz, ca, cb);
      continue;
    }
    // partially drawn: one or two pens are travelling along this edge
    for (const [t, sx, sy, sz, ex, ey, ez] of [
      [ta, ax, ay, az, bx, by, bz],
      [tb, bx, by, bz, ax, ay, az],
    ] as const) {
      if (t <= 0) continue;
      const hx = sx + (ex - sx) * t;
      const hy = sy + (ey - sy) * t;
      const hz = sz + (ez - sz) * t;
      colorAt(f, sx, sy, sz, ca);
      colorAt(f, hx, hy, hz, cb);
      layer.seg(sx, sy, sz, hx, hy, hz, ca, cb);
      const h0 = Math.max(0, t - HEAD / len);
      const tx = sx + (ex - sx) * h0;
      const ty = sy + (ey - sy) * h0;
      const tz = sz + (ez - sz) * h0;
      const z0 = [0, 0, 0];
      L.glowW.seg(tx, ty, tz, hx, hy, hz, z0, cb);
      L.glowC.seg(tx, ty, tz, hx, hy, hz, z0, cb);
    }
  }
  for (const l of [L.t1, L.t2, L.t3, L.ghost, L.glowW, L.glowC]) l.commit();
};

/** Thin 3D corner brackets (and a faint full box) around each box; `grow` 0..1 draws them on. */
export const fillBrackets = (boxes: THREE.Box3[], grow: number, color: Rgb, brk: DynLines, box: DynLines, pad = 0.05) => {
  brk.reset();
  box.reset();
  if (grow > 0) {
    for (const b0 of boxes) {
      const b = b0.clone().expandByScalar(pad);
      const xs = [b.min.x, b.max.x];
      const ys = [b.min.y, b.max.y];
      const zs = [b.min.z, b.max.z];
      const sx = b.max.x - b.min.x;
      const sy = b.max.y - b.min.y;
      const sz = b.max.z - b.min.z;
      const arm = (s: number) => Math.min(0.28, s * 0.24) * grow;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
          for (let k = 0; k < 2; k++) {
            const x = xs[i];
            const y = ys[j];
            const z = zs[k];
            const dx = i ? -1 : 1;
            const dy = j ? -1 : 1;
            const dz = k ? -1 : 1;
            brk.seg(x, y, z, x + dx * arm(sx), y, z, color);
            brk.seg(x, y, z, x, y + dy * arm(sy), z, color);
            brk.seg(x, y, z, x, y, z + dz * arm(sz), color);
          }
      if (grow >= 1) {
        for (let j = 0; j < 2; j++)
          for (let k = 0; k < 2; k++) box.seg(xs[0], ys[j], zs[k], xs[1], ys[j], zs[k], color);
        for (let i = 0; i < 2; i++)
          for (let k = 0; k < 2; k++) box.seg(xs[i], ys[0], zs[k], xs[i], ys[1], zs[k], color);
        for (let i = 0; i < 2; i++)
          for (let j = 0; j < 2; j++) box.seg(xs[i], ys[j], zs[0], xs[i], ys[j], zs[1], color);
      }
    }
  }
  brk.commit();
  box.commit();
};

/** Cross-section of the model at z = zs: the contour a scan plane cuts through the mesh. */
export const fillSlice = (m: Model, zs: number, color: Rgb, out: DynLines) => {
  out.reset();
  const {pos, tri} = m;
  const p: number[] = [];
  for (let f = 0; f < m.nf; f++) {
    p.length = 0;
    for (let j = 0; j < 3; j++) {
      const a = tri[f * 3 + j] * 3;
      const b = tri[f * 3 + ((j + 1) % 3)] * 3;
      const za = pos[a + 2] - zs;
      const zb = pos[b + 2] - zs;
      if ((za < 0 && zb >= 0) || (za >= 0 && zb < 0)) {
        const t = za / (za - zb);
        p.push(pos[a] + (pos[b] - pos[a]) * t, pos[a + 1] + (pos[b + 1] - pos[a + 1]) * t, zs);
      }
    }
    if (p.length === 6) out.seg(p[0], p[1], p[2], p[3], p[4], p[5], color);
  }
  out.commit();
};

// ---- procedural cars (car.ts) ----------------------------------------------------------------------

let gv = new Float32Array(0);
const pa: number[] = [0, 0, 0, 0];
const pb: number[] = [0, 0, 0, 0];

/** One segment revealed by the pen: the part within R of the seed, from either end, with the glowing
 *  head where it is still drawing. da / db: the pen distance of each end. */
const penSeg = (f: EdgeFrame, L: Layers, layer: DynLines, ax: number, ay: number, az: number, bx: number, by: number, bz: number, da: number, db: number) => {
  const len = Math.hypot(bx - ax, by - ay, bz - az);
  if (len < 1e-7) return;
  const ta = Math.min(1, Math.max(0, (f.R - da) / len));
  const tb = Math.min(1, Math.max(0, (f.R - db) / len));
  if (ta <= 0 && tb <= 0) return;
  if (ta + tb >= 1) {
    colorAt(f, ax, ay, az, ca);
    colorAt(f, bx, by, bz, cb);
    layer.seg(ax, ay, az, bx, by, bz, ca, cb);
    return;
  }
  for (const [t, sx, sy, sz, ex, ey, ez] of [
    [ta, ax, ay, az, bx, by, bz],
    [tb, bx, by, bz, ax, ay, az],
  ] as const) {
    if (t <= 0) continue;
    const hx = sx + (ex - sx) * t;
    const hy = sy + (ey - sy) * t;
    const hz = sz + (ez - sz) * t;
    colorAt(f, sx, sy, sz, ca);
    colorAt(f, hx, hy, hz, cb);
    layer.seg(sx, sy, sz, hx, hy, hz, ca, cb);
    const h0 = Math.max(0, t - HEAD / len);
    const z0 = [0, 0, 0];
    L.glowW.seg(sx + (ex - sx) * h0, sy + (ey - sy) * h0, sz + (ez - sz) * h0, hx, hy, hz, z0, cb);
    L.glowC.seg(sx + (ex - sx) * h0, sy + (ey - sy) * h0, sz + (ez - sz) * h0, hx, hy, hz, z0, cb);
  }
};

/** A procedural car: the smooth contour of the body and tyres for this camera (where the vertex
 *  normals turn from facing the camera to facing away, interpolated across each triangle, so it
 *  never zig-zags along facets), plus the design lines. Hidden parts are left to the depth test;
 *  hidden design lines marked ghost show faintly. */
const fillProc = (m: Model, f: EdgeFrame, L: Layers) => {
  const P = m.proc!;
  const {pos, tri} = m;
  const vn = P.vn;
  const D = f.dist;
  for (const l of [L.t1, L.t2, L.t3, L.ghost, L.glowW, L.glowC]) l.reset();
  if (gv.length < m.nv) gv = new Float32Array(m.nv);
  const cx = f.cam.x;
  const cy = f.cam.y;
  const cz = f.cam.z;
  for (let i = 0; i < m.nv; i++) {
    const j = i * 3;
    gv[i] = vn[j] * (cx - pos[j]) + vn[j + 1] * (cy - pos[j + 1]) + vn[j + 2] * (cz - pos[j + 2]);
  }
  for (let t = 0; t < m.nf; t++) {
    const a = tri[t * 3];
    const b = tri[t * 3 + 1];
    const c = tri[t * 3 + 2];
    const sa = gv[a] > 0;
    const sb = gv[b] > 0;
    const sc = gv[c] > 0;
    if (sa === sb && sb === sc) continue;
    if (a < P.noC.length && (P.noC[a] || P.noC[b] || P.noC[c])) continue;
    let k = 0;
    for (const [u, v, su, sv] of [
      [a, b, sa, sb],
      [b, c, sb, sc],
      [c, a, sc, sa],
    ] as const) {
      if (su === sv || k > 1) continue;
      const s = gv[u] / (gv[u] - gv[v]);
      const o = k === 0 ? pa : pb;
      o[0] = pos[u * 3] + (pos[v * 3] - pos[u * 3]) * s;
      o[1] = pos[u * 3 + 1] + (pos[v * 3 + 1] - pos[u * 3 + 1]) * s;
      o[2] = pos[u * 3 + 2] + (pos[v * 3 + 2] - pos[u * 3 + 2]) * s;
      o[3] = D[u] + (D[v] - D[u]) * s;
      k++;
    }
    if (k === 2) penSeg(f, L, L.t1, pa[0], pa[1], pa[2], pb[0], pb[1], pb[2], pa[3], pb[3]);
  }
  const F = P.feat;
  const FD = f.fdist;
  for (let s = 0; s < P.nF; s++) {
    const i = s * 6;
    const da = FD ? FD[s * 2] : 0;
    const db = FD ? FD[s * 2 + 1] : 0;
    const layer = P.fLayer[s] === 2 ? L.t2 : L.t3;
    penSeg(f, L, layer, F[i], F[i + 1], F[i + 2], F[i + 3], F[i + 4], F[i + 5], da, db);
    if (f.ghost && P.fGhost[s]) {
      const len = Math.hypot(F[i + 3] - F[i], F[i + 4] - F[i + 1], F[i + 5] - F[i + 2]);
      if (Math.max(0, f.R - da) + Math.max(0, f.R - db) >= len) L.ghost.seg(F[i], F[i + 1], F[i + 2], F[i + 3], F[i + 4], F[i + 5], f.base);
    }
  }
  for (const l of [L.t1, L.t2, L.t3, L.ghost, L.glowW, L.glowC]) l.commit();
};
