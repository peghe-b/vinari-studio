// The hand-drawn marker of the approved covers (a TS port of ~/.vinari-tools/3d-tbilisi/sketch.py, the owner's ticked
// Marketing/21 and 23 covers: the circled bar, the struck 98 000, the circled 186 000): one ink stroke per mark, drawn by hand
// (low-frequency wobble, the ellipse 1.12 turns from 200 degrees and drifting outward, the stroke thin at its ends), seeded
// so one film always gets the same stroke. Static: a cover is a still. Placed in the coordinate space of what it marks: the
// card's, or the tilted screen's own plane (so it tilts with the screen).
import React from 'react';
import type {CoverMark} from '../types';

export type Box = {x: number; y: number; w: number; h: number};
type Pt = [number, number];

/** a small seeded PRNG (mulberry32) and a normal draw (Box-Muller) */
const rng = (seed: number) => {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(Math.max(1e-9, next()))) * Math.cos(2 * Math.PI * next());
};

/** sketch.py _noise1: eight low sines with random weights, n samples */
const noise = (seed: number, n: number) => {
  const r = rng(seed * 7919 + 13);
  const k = Array.from({length: 8}, () => r());
  return Array.from({length: n}, (_, j) => {
    const t = n > 1 ? j / (n - 1) : 0;
    let s = 0;
    for (let i = 0; i < 8; i++) s += (k[i] * Math.sin((i + 1) * Math.PI * t + seed * 0.7 + i)) / (i + 1);
    return s / 2.2;
  });
};

/** The hand ellipse: 1.1 turns from 200 degrees, drifting outward a little, wobbling; its wobble only ever goes OUTSIDE rx, ry
 *  (the radii divided by their smallest), so the ring the layout measured (src/cover/layout.mjs ringFor: the glyphs' corners
 *  inside with a gap) is the ring's inner edge, and its outer edge stays within RING_OUT of it. */
const ellipse = (cx: number, cy: number, rx: number, ry: number, rot: number, seed: number, n = 180): Pt[] => {
  const j = noise(seed, n).map((v) => v * 0.035);
  const a0 = (200 * Math.PI) / 180;
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  const rs = j.map((v, i) => 1 + Math.max(-0.025, Math.min(0.025, v)) + 0.015 * (i / (n - 1))); // the drift: drawn by hand (max / min <= 1.067)
  const lo = Math.min(...rs);
  return Array.from({length: n}, (_, i) => {
    const u = i / (n - 1);
    const a = a0 + u * 2 * Math.PI * 1.1;
    const r = rs[i] / lo;
    const x = rx * r * Math.cos(a);
    const y = ry * r * Math.sin(a);
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
};

const line = (p0: Pt, p1: Pt, bow: number, seed: number, n = 60): Pt[] => {
  const j = noise(seed, n).map((v) => v * 0.012);
  const [x0, y0] = p0;
  const dx = p1[0] - x0;
  const dy = p1[1] - y0;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  return Array.from({length: n}, (_, i) => {
    const u = i / (n - 1);
    const b = Math.sin(u * Math.PI) * bow * L + j[i] * L;
    return [x0 + dx * u + nx * b, y0 + dy * u + ny * b];
  });
};

const head = (tip: Pt, from: Pt, size: number): Pt[][] => {
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  return [2.6, -2.6].map((da) => [[tip[0] + size * Math.cos(ang + da), tip[1] + size * Math.sin(ang + da)], tip] as Pt[]);
};

/** The strokes of one mark around (or at) the box b; `room` keeps an arrow inside its canvas. */
export const markStrokes = (kind: CoverMark, b: Box, seed: number, room: Box, padXY?: readonly [number, number], turn?: number): Pt[][] => {
  const pad = Math.max(22, Math.min(60, b.w * 0.08));
  const [px, py] = padXY ?? [pad, pad * 0.75];
  switch (kind) {
    case 'circle':
      return [ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + px, b.h / 2 + py, turn ?? -3 - (seed % 4), seed)];
    case 'underline':
      return [line([b.x - 6, b.y + b.h + 16], [b.x + b.w + 10, b.y + b.h + 9], 0.04, seed)];
    case 'strike':
      return [line([b.x - 12, b.y + b.h * 0.6], [b.x + b.w + 16, b.y + b.h * 0.44], 0.03, seed)];
    case 'arrow': {
      // from up and right of the box down onto its upper right corner, kept inside the room
      const tip: Pt = [Math.min(b.x + b.w + 26, room.x + room.w - 40), b.y + Math.min(18, b.h * 0.2)];
      const from: Pt = [Math.min(tip[0] + 150, room.x + room.w - 24), Math.max(room.y + 20, tip[1] - 110)];
      const shaft = line(from, tip, 0.12, seed);
      return [shaft, ...head(shaft[shaft.length - 1], shaft[shaft.length - 6], 30)];
    }
    case 'tick': {
      // inside its box, centred (the layout puts the box where the tick goes: inside the card it marks, never past its edge)
      const s = Math.min(72, Math.max(40, Math.min(b.w, b.h) * 0.95));
      const cx = Math.min(b.x + b.w / 2 + s * 0.06, room.x + room.w - s * 0.7);
      const cy = b.y + b.h / 2;
      const a = line([cx - s * 0.5, cy], [cx - s * 0.1, cy + s * 0.42], 0.04, seed, 24);
      const c = line([cx - s * 0.1, cy + s * 0.42], [cx + s * 0.62, cy - s * 0.5], -0.05, seed + 1, 40);
      return [[...a, ...c.slice(1)]];
    }
  }
  return [];
};

/** A stroke as a filled ribbon: the marker's width tapers in at the start and out at the end (sketch.py's 0.55 + 0.45 sin). */
const ribbon = (pts: Pt[], w: number) => {
  if (pts.length < 2) return '';
  const L: Pt[] = [];
  const R: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const u = i / (pts.length - 1);
    const hw = (w / 2) * (0.55 + 0.45 * Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, u)), 0.7)));
    L.push([p[0] - (dy / d) * hw, p[1] + (dx / d) * hw]);
    R.push([p[0] + (dy / d) * hw, p[1] - (dx / d) * hw]);
  });
  const f = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return `M${L.map(f).join(' L')} L${R.reverse().map(f).join(' L')} Z`;
};

/** one mark: its kind, the box it marks, its seed; `pad` the ellipse's room round the box ([x, y], default by its size) */
export type MarkSpec = {kind: CoverMark; box: Box; seed: number; pad?: readonly [number, number]; rot?: number};

/** The marks as one SVG over a canvas of w x h (its coordinate space), in ink. */
export const Marks: React.FC<{marks: MarkSpec[]; w: number; h: number; color?: string; width?: number; style?: React.CSSProperties}> = ({marks, w, h, color = '#0E0E0E', width = 11, style}) => {
  const room = {x: 0, y: 0, w, h};
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}>
      {marks.flatMap((m, i) =>
        markStrokes(m.kind, m.box, m.seed, room, m.pad, m.rot).map((pts, j) => (
          <g key={`${i}-${j}`}>
            <path d={ribbon(pts, width)} fill={color} />
            {/* round ends */}
            <circle cx={pts[0][0]} cy={pts[0][1]} r={width * 0.28} fill={color} />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={width * 0.28} fill={color} />
          </g>
        )),
      )}
    </svg>
  );
};

/** A mark field of the spec ("circle" or ["circle", "arrow"]) as a list. */
export const marksOf = (m: CoverMark | CoverMark[] | undefined): CoverMark[] => (m === undefined ? [] : Array.isArray(m) ? m : [m]);
