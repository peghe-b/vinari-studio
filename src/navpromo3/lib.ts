// The navigator + CarPlay promo's small helpers (a copy of the diagnostics promo's) (copied, not imported, from the studio's lib so a change there never breaks this film).
import {spring} from 'remotion';
import timeline from './timeline.json';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

export type Shot = {id: string; from: number; to: number; live?: boolean};
export type Sub = {text: string; start: number; end: number; tone: 'white' | 'ink'; censor?: boolean; phone?: boolean; small?: boolean};
export type Timeline = {total: number; fps: number; shots: Shot[]; events: Record<string, number | number[] | null>; subs: Sub[]; music: Record<string, number>};
export const TL = timeline as unknown as Timeline;

/** seconds -> frames */
export const fr = (s: number) => Math.round(s * FPS);
export const TOTAL = fr(TL.total);
/** a cross-dissolve between two white shots (frames) */
export const XFADE = 10;
export const ev = (name: string): number => {
  const v = TL.events[name];
  if (typeof v !== 'number') throw new Error(`navpromo3: event ${name} is not a number`);
  return v;
};
export const evs = (name: string): number[] => {
  const v = TL.events[name];
  if (!Array.isArray(v)) throw new Error(`navpromo3: event ${name} is not a list`);
  return v;
};
export const shot = (id: string): Shot => {
  const s = TL.shots.find((x) => x.id === id);
  if (!s) throw new Error(`navpromo3: no shot ${id}`);
  return s;
};
/** an absolute time (s) as a frame of the shot */
export const local = (id: string, sec: number) => fr(sec) - fr(shot(id).from);

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (frame: number, start: number, dur: number) => clamp((frame - start) / Math.max(1, dur));
export const E = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t: number) => 1 - (1 - t) ** 3,
  out2: (t: number) => 1 - (1 - t) ** 2,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  in: (t: number) => t * t * t,
  in2: (t: number) => t * t,
  sine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  outBack: (t: number) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};
/** a spring 0 -> 1 from `start` (frames) */
export const sp = (frame: number, start: number, stiffness = 140, damping = 18, mass = 1) =>
  frame < start ? 0 : spring({frame: frame - start, fps: FPS, config: {stiffness, damping, mass}});
/** a damped shake: the offset at `frame` of a hit at `at` (px amplitude, ~period frames) */
export const shake = (frame: number, at: number, amp = 10, dur = 10, seed = 1) => {
  const k = frame - at;
  if (k < 0 || k > dur) return 0;
  const decay = 1 - k / dur;
  return amp * decay * Math.sin(k * 2.1 + seed) * (k % 2 === 0 ? 1 : -0.7);
};

/** deterministic hash noise in [-1, 1] */
export const hash = (a: number, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
};
export const rnd = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** the dark shots (white subtitle); the rest are the white world (ink); build/plan.py's DARK is the same list */
export const DARK = new Set(['hook', 'lap', 'screen', 'face', 'feet', 'sign', 'missed', 'drop', 'floor', 'sigh', 'black', 'cpwake', 'plug', 'tapicon', 'where', 'hands', 'speakers', 'calm', 'arrived', 'out']);

/** the ink and the field of the white world (R = G = B) */
export const INK = '#0B0B0B';
export const INK2 = '#6A6A6A';
export const INK3 = '#858585';
export const PAPER = '#FFFFFF';
export const GREEN = '#0F9B37';
export const RED = '#E01B1B';

/** points along a polyline at arc-length fraction t (0..1) */
export type Pt = [number, number];
export const polyLen = (pts: Pt[]) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};
export const alongPoly = (pts: Pt[], t: number): {p: Pt; a: number} => {
  const L = polyLen(pts);
  let want = clamp(t) * L;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (want <= d || i === pts.length - 1) {
      const k = d > 0 ? clamp(want / d) : 0;
      return {p: [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)], a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])};
    }
    want -= d;
  }
  return {p: pts[pts.length - 1], a: 0};
};
/** a smooth Catmull-Rom path through points (SVG d) */
export const smoothPath = (pts: Pt[], close = false) => {
  if (pts.length < 2) return '';
  const P = close ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return close ? `${d}Z` : d;
};
/** dense samples of a Catmull-Rom curve (for arc length and placing things on it) */
export const sampleSmooth = (pts: Pt[], per = 16): Pt[] => {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
