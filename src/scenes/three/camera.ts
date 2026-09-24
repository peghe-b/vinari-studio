import * as THREE from 'three';

// A telephoto camera that never stops: slow orbit, a slight rise and a slow dolly-in over the
// scene. Framing is automatic: the model's projected outline is fitted into a target rectangle
// (in canvas pixels) for the whole drift, then kept centred on it with a view offset.

export type Shot = 'hero' | 'side' | 'top' | 'front' | 'rear';

export const SHOTS: Record<Shot, {az: number; el: number; fov: number; orbit: number; rise: number; fill: number}> = {
  hero: {az: 38, el: 13, fov: 15, orbit: 10, rise: 1.5, fill: 0.94},
  side: {az: 90, el: 3, fov: 12, orbit: 5, rise: 1, fill: 0.96},
  top: {az: 90, el: 68, fov: 14, orbit: 7, rise: -3, fill: 0.9},
  front: {az: 8, el: 7, fov: 14, orbit: 8, rise: 1.2, fill: 0.72},
  rear: {az: 172, el: 9, fov: 14, orbit: -8, rise: 1.2, fill: 0.72},
};

export type Rect = {x0: number; y0: number; x1: number; y1: number};

export type ViewInput = {
  az: number; // degrees, 0 = looking at the front (+z) of the model
  el: number;
  orbit: number; // degrees added over the scene
  rise: number; // elevation degrees added over the scene
  dolly: number; // fraction the camera closes in over the scene
  fov: number;
  fill: number; // fraction of the target rectangle the model may use
  dist?: number; // explicit distance (overrides the fit)
  /** Wire3D `move`: the model's slide along world x at scene progress t, in px at the target's
   *  depth (the world offset is px * tan(fov/2) / (h/2) * camera distance). The fit keeps the
   *  sliding model's height inside the rect, and the framing is centred on the whole path. */
  slide?: (t: number) => number;
};

export type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number; offX: number; offY: number; top: number; bottom: number}; // top/bottom: the model's outline in canvas px

const drift = (t: number) => {
  // mostly linear so the camera is visibly moving from the first to the last frame,
  // with just enough ease to avoid a mechanical feel
  const c = Math.min(1, Math.max(0, t));
  const s = c * c * (3 - 2 * c);
  return c * 0.7 + s * 0.3;
};

const place = (cam: THREE.PerspectiveCamera, target: THREE.Vector3, az: number, el: number, d: number, fov: number, w: number, h: number) => {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  cam.fov = fov;
  cam.aspect = w / h;
  cam.near = Math.max(0.1, d - 12);
  cam.far = d + 12;
  cam.position.set(target.x + d * Math.cos(e) * Math.sin(a), target.y + d * Math.sin(e), target.z + d * Math.cos(e) * Math.cos(a));
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  cam.clearViewOffset();
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
};

const v = new THREE.Vector3();
const bounds = (cam: THREE.PerspectiveCamera, pts: Float32Array, w: number, h: number) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    v.set(pts[i], pts[i + 1], pts[i + 2]).project(cam);
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return {x0, y0, x1, y1};
};

export type Fit = {base: number; target: THREE.Vector3};

/** World x offset of the sliding model at scene progress t for a camera at distance d. */
const slideX = (vi: ViewInput, t: number, d: number, h: number) => (vi.slide ? (vi.slide(t) * Math.tan(((vi.fov / 2) * Math.PI) / 180) * d) / (h / 2) : 0);

const shifted = (hull: Float32Array, dx: number) => {
  if (!dx) return hull;
  const out = new Float32Array(hull);
  for (let i = 0; i < out.length; i += 3) out[i] += dx;
  return out;
};

/** Vertical extent of the model over its whole slide, measured from the at-rest centre: a model
 *  sliding toward the camera grows and sinks, so the fit and the framing must see all of it. */
const slideSpan = (cam: THREE.PerspectiveCamera, hull: Float32Array, vi: ViewInput, d: number, w: number, h: number, b0: {y0: number; y1: number}) => {
  let y0 = b0.y0;
  let y1 = b0.y1;
  if (vi.slide) {
    for (let i = 0; i <= 12; i++) {
      const b = bounds(cam, shifted(hull, slideX(vi, i / 12, d, h)), w, h);
      y0 = Math.min(y0, b.y0);
      y1 = Math.max(y1, b.y1);
    }
  }
  return {y0, y1};
};

/** Base distance so the model fills `fill` of the rect at every sampled moment of the drift (and,
 *  with a slide, keeps its whole height in the rect wherever it is on its path). */
export const fitView = (hull: Float32Array, box: THREE.Box3, vi: ViewInput, rect: Rect, w: number, h: number): Fit => {
  const target = box.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera();
  const rw = (rect.x1 - rect.x0) * vi.fill;
  const rh = (rect.y1 - rect.y0) * vi.fill;
  // a model that slides stays centred on its rest position (the marker), so at the ends of its path
  // it must still be inside the frame: its half width plus the longest slide within HALF_AVAIL (the
  // visible stage is x 49..1031 once Promo scales it by 1.1; 30 px of air). A long model (the
  // container ship) is sized by its path, a short one by the rect as before.
  const maxSlide = vi.slide ? Math.max(...Array.from({length: 13}, (_, i) => Math.abs(vi.slide!(i / 12)))) : 0;
  const HALF_AVAIL = 460;
  let base = 0;
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const k = drift(t);
    const az = vi.az + vi.orbit * k;
    const el = vi.el + vi.rise * k;
    let d = 20;
    for (let it = 0; it < 5; it++) {
      place(cam, target, az, el, d, vi.fov, w, h);
      const b = bounds(cam, hull, w, h);
      const s = slideSpan(cam, hull, vi, d, w, h, b);
      let r = Math.max((b.x1 - b.x0) / rw, (s.y1 - s.y0) / rh);
      if (vi.slide) r = Math.max(r, (b.x1 - b.x0) / 2 / Math.max(60, HALF_AVAIL - maxSlide));
      d *= r;
    }
    base = Math.max(base, d / (1 - vi.dolly * k));
  }
  return {base, target};
};

const scratch = new THREE.PerspectiveCamera();

/** Camera for scene progress t (0..1). `hull` is the model at rest (no `move`). */
export const viewAt = (fit: Fit, hull: Float32Array, vi: ViewInput, rect: Rect, w: number, h: number, t: number): View => {
  const k = drift(t);
  const az = vi.az + vi.orbit * k;
  const el = vi.el + vi.rise * k;
  const d = (vi.dist ?? fit.base) * (1 - vi.dolly * k);
  place(scratch, fit.target, az, el, d, vi.fov, w, h);
  const b = bounds(scratch, hull, w, h);
  // with a slide, centre the whole path's height on the rect (x stays on the model at rest)
  const s = slideSpan(scratch, hull, vi, d, w, h, b);
  return {
    pos: scratch.position.clone(),
    target: fit.target.clone(),
    fov: vi.fov,
    offX: (b.x0 + b.x1) / 2 - (rect.x0 + rect.x1) / 2,
    offY: (s.y0 + s.y1) / 2 - (rect.y0 + rect.y1) / 2,
    top: (rect.y0 + rect.y1) / 2 - (s.y1 - s.y0) / 2,
    bottom: (rect.y0 + rect.y1) / 2 + (s.y1 - s.y0) / 2,
  };
};

export const applyView = (cam: THREE.PerspectiveCamera, view: View, w: number, h: number) => {
  const d = view.pos.distanceTo(view.target);
  cam.fov = view.fov;
  cam.aspect = w / h;
  cam.near = Math.max(0.1, d - 12);
  cam.far = d + 30;
  cam.position.copy(view.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(view.target);
  cam.setViewOffset(w, h, view.offX, view.offY, w, h);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
};

/** Canvas pixel position of a world point under `view`. */
export const projectPoint = (view: View, p: THREE.Vector3, w: number, h: number) => {
  applyView(scratch, view, w, h);
  v.copy(p).project(scratch);
  return {x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1};
};
