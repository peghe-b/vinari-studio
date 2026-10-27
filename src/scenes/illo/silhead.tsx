// src/scenes/illo/silhead.tsx: the heads of the "Silhouette light" people (sil.tsx; films from CHAR_FROM, wardrobe.mjs).
//
// The owner, 2026-10-12, on the round-headed cartoon people: "a disaster". His references (out/char-ref/): elegant adults,
// small sculpted heads on long necks, a strict profile or a three-quarter view, the face revealed by ONE soft light of a
// single hue, closed or lowered eyes, no outline, black and white plus that one hue. So a head here is an anatomical
// silhouette (the skull's back, a brow ridge, the nasion, a real nose, lips, a chin, the jaw's angle) filled with the
// light's ramp, and a few precise marks inside the light (a lid, a brow, a nostril, the lips); the plane turned from the
// light (the side of the face, the eye socket, under the nose and the jaw) is a soft deeper step, never a line. Hair,
// beard, hats and glasses are crisp ink shapes with one hairline of sheen.
//
// HEAD SPACE: the crown at y = -50, the chin at y = +50 (100 units = the head's height), the eye line at y = 0, the face
// toward +x. One transform places a head (sil.tsx: about 12.6 u of a 100 u figure, or a close-up).
//
//   <SilHead view look ex pal uid lit/>    view 'profile' | 'three'; ex: the expression (lids, brows, mouth)
//   pathOf(points, closed, m)              the outline tool every sil shape is written with
//   HEAD_PIVOT, HEAD_NECK                  where the neck meets the head (head space), per view
import React from 'react';
import {mix} from './palette';
import {ap, type Mx, type Pt} from './rig';

/** A point of an authored outline: [x, y] or [x, y, smoothness 0..1] (1 a smooth curve through it, 0 a corner). */
export type V = readonly [number, number] | readonly [number, number, number];

const f2 = (n: number) => String(Math.round(n * 100) / 100);

/** An outline through the points (a Catmull-Rom spline with a smoothness per point), optionally through a matrix. */
export const pathOf = (pts: readonly V[], closed = true, m?: Mx, k = 1): string => {
  const n = pts.length;
  if (n < 2) return '';
  const Q: Pt[] = pts.map((p) => (m ? ap(m, p[0], p[1]) : [p[0], p[1]]));
  const S = pts.map((p) => (p.length > 2 ? (p[2] as number) : 1));
  const at = (i: number) => (closed ? Q[(i + n) % n] : Q[Math.max(0, Math.min(n - 1, i))]);
  const sAt = (i: number) => (closed ? S[(i + n) % n] : S[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f2(Q[0][0])} ${f2(Q[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const s1 = (sAt(i) * k) / 6;
    const s2 = (sAt(i + 1) * k) / 6;
    d += `C${f2(p1[0] + (p2[0] - p0[0]) * s1)} ${f2(p1[1] + (p2[1] - p0[1]) * s1)} ${f2(p2[0] - (p3[0] - p1[0]) * s2)} ${f2(p2[1] - (p3[1] - p1[1]) * s2)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
};

/** A gradient or clip id from a React id (only [A-Za-z0-9_-]). */
export const sid = (uid: string, name: string) => `sl${String(uid).replace(/[^A-Za-z0-9_-]/g, '')}-${name}`;

// ---- the light ---------------------------------------------------------------------------------------------------------
/** The look of a picture: the ink of the silhouettes and the ramp of the one light. */
export type SilPal = {
  dark: boolean; // the figure stands on a dark ground (the black film, a night): it gets a rim of the light
  ink: string; // the silhouette
  ink2: string; // a limb or a panel behind or in front of the body, one quiet step from the ink
  sheen: string; // a hairline of light along an edge (hair, a lapel, the near arm)
  rim: string; // the light's rim on a dark ground
  lit: readonly [string, string, string, string]; // the skin's light: deep, shadow, half, highlight
  white: readonly [string, string]; // a white garment: lit, in shade (a step of the hue)
  feature: string; // lids, brows, lips
  grey: string; // grey hair
  b: string; // the pair's second colour (an earring, a pocket square)
};

// ---- profile outlines (face and skull), clockwise from the crown -----------------------------------------------------
const PRO_M: V[] = [
  [-6, -50], [12, -47.6], [25.6, -39.4], [33, -28], [36.4, -16], [37.8, -7.6, 0.55], [35.9, -2.8, 0.3],
  [37.6, 3], [41.4, 10.6], [45.4, 17.2, 0.55], [44.6, 20.2, 0.5], [39.8, 22.3, 0.15],
  [40.5, 25.6], [41, 28.2, 0.5], [38.5, 30.4, 0.15], [39.5, 32.4], [38.6, 35.3, 0.5], [35.8, 38.3, 0.5],
  [37.5, 43], [37.3, 47.2, 0.7], [33.4, 50.2, 0.6], [24, 50.6], [12.4, 47], [3, 41.4, 0.55],
  [-1.6, 34], [-8, 29.6], [-19.6, 25.6, 0.6], [-31.6, 18.6], [-41.6, 5], [-46.4, -12], [-42, -31], [-28.6, -44.4],
];
const PRO_F: V[] = [
  [-6, -50], [11, -47.8], [24.4, -40], [31.6, -29], [34.4, -17], [35.2, -8, 0.6], [33.8, -2.2, 0.35],
  [35.4, 4], [38.6, 11], [41.2, 15.8, 0.6], [40.4, 18.6, 0.55], [36.4, 20.6, 0.15],
  [37, 23.6], [38.2, 26.2, 0.5], [35.8, 29, 0.15], [37.4, 31.2], [36.6, 34.4, 0.5], [33.4, 37.4, 0.5],
  [34.6, 41.4], [34.4, 45, 0.7], [31, 48.6, 0.6], [22.4, 49.6], [11.6, 45.8], [2.6, 40.2, 0.6],
  [-1.8, 33], [-8, 29], [-19, 25.2, 0.6], [-31, 18.2], [-40.8, 5], [-45.4, -12], [-41.2, -31], [-28, -44.4],
];
const PRO_O: V[] = [
  [-6, -50], [12, -47.6], [25.6, -39.6], [33, -28.4], [36.2, -16.4], [38, -7.8, 0.5], [35.6, -2.4, 0.3],
  [37.8, 3.6], [42.2, 11.6], [46.6, 18.6, 0.55], [45.2, 21.6, 0.5], [39.8, 23.4, 0.15],
  [40.2, 26.4], [40.4, 28.8, 0.5], [38.2, 31, 0.15], [39, 33], [37.8, 35.8, 0.5], [35, 39, 0.5],
  [36.8, 43.4], [36.4, 47.6, 0.7], [32.4, 51, 0.6], [23.6, 52.4], [13, 49.4], [3.6, 43.4, 0.8],
  [-1.6, 34.6], [-8, 29.8], [-19.6, 25.6, 0.6], [-31.6, 18.6], [-41.6, 5], [-46.4, -12], [-42, -31], [-28.6, -44.4],
];
// the side of the face, turned from a light that comes from where the face looks: everything left of this line
const PRO_SIDE_M: V[] = [[31.6, -34], [30.4, -18], [27, -6, 0.6], [24, 4], [27.4, 16], [31, 26], [31, 37], [28.6, 46], [24, 60], [-60, 60], [-60, -34]];
const PRO_SIDE_F: V[] = [[29.6, -34], [28.8, -18], [25.6, -6.4, 0.6], [23.4, 4], [26.6, 16], [29.6, 25.6], [29.2, 36], [26.8, 45], [22, 60], [-60, 60], [-60, -34]];

// ---- three-quarter outlines: the editorial three-quarter (the face turned about 30 degrees from the profile toward the
// viewer): the profile's line still carries the nose, the lips and the chin, the near eye opens into an almond, the far
// eye shows as a short lid behind the bridge, the near cheek and the jaw widen toward the ear
const TQ_M: V[] = [
  [-6, -50], [12, -48], [25, -40.2], [31.4, -29.6], [34.4, -17.4], [35.4, -8.6, 0.55], [33.6, -3.2, 0.35],
  [35.4, 3], [38.6, 10.4], [41.6, 16.4, 0.55], [40.6, 19.4, 0.5], [36.4, 21.4, 0.15], [36.8, 24.6], [37, 27.4, 0.5],
  [35, 29.6, 0.15], [35.6, 31.6], [34.6, 34.4, 0.5], [32.2, 37.4, 0.5], [33.6, 42], [33, 46.4, 0.7], [28.6, 50, 0.6],
  [19, 51.6], [8, 49], [-2, 42.6, 0.55], [-6.4, 35], [-10.4, 29.6], [-19.6, 25, 0.6], [-30, 18], [-38.6, 4.6], [-42.6, -12],
  [-38.8, -31], [-26.6, -44.4],
];
const TQ_F: V[] = [
  [-6, -50], [11, -48], [23.6, -40.6], [30, -30], [32.6, -18], [33.2, -9, 0.6], [32, -3, 0.4],
  [33.4, 3.6], [35.8, 10.6], [38, 15.2, 0.6], [37.2, 18, 0.55], [33.6, 19.8, 0.15], [34, 22.8], [35, 25.6, 0.5],
  [33, 28.2, 0.15], [34.2, 30.4], [33.6, 33.6, 0.5], [30.6, 36.6, 0.5], [31.6, 40.8], [31.2, 44.6, 0.7], [27.4, 48.2, 0.6],
  [18.4, 49.8], [7.6, 47], [-2, 41, 0.6], [-6.4, 34], [-10.2, 29], [-19, 24.6, 0.6], [-29.4, 17.6], [-37.8, 4.6], [-41.8, -12],
  [-38, -31], [-26, -44.4],
];
const TQ_O: V[] = [
  [-6, -50], [12, -48], [25, -40.2], [31.4, -29.8], [34.4, -17.6], [35.6, -8.8, 0.5], [33.4, -2.8, 0.35],
  [35.6, 3.6], [39.2, 11.2], [42.6, 17.8, 0.55], [41.4, 21, 0.5], [36.6, 22.8, 0.15], [36.6, 25.8], [36.6, 28.6, 0.5],
  [34.6, 30.8, 0.15], [35.2, 32.8], [34, 35.6, 0.5], [31.4, 38.8, 0.5], [33, 43.2], [32.4, 47.6, 0.7], [27.8, 51.4, 0.6],
  [18.6, 53], [8, 50.6], [-2, 44.6, 0.8], [-6.4, 36], [-10.4, 30], [-19.6, 25, 0.6], [-30, 18], [-38.6, 4.6], [-42.6, -12],
  [-38.8, -31], [-26.6, -44.4],
];
// the near side of a three-quarter face (turned from the light): everything left of this line, a soft gradient
const TQ_SIDE: V[] = [[10, -40], [10.6, -22], [12.6, -8, 0.6], [11.4, 3], [14, 14], [18.6, 26], [21, 36], [21, 46], [18, 60], [-60, 60], [-60, -40]];

/** Where the neck meets the head (head space): its front line leaves the jaw at `front`, its back line the skull at
 *  `back`; `pivot` is the joint the head turns about. */
export const HEAD_NECK = {
  profile: {front: [14, 47] as Pt, back: [-21.6, 27.6] as Pt, pivot: [-4, 30] as Pt},
  three: {front: [10, 47] as Pt, back: [-19.6, 25.4] as Pt, pivot: [-5, 30] as Pt},
};

// ---- hair: the skull's top arc, offset outward (procedural), and the line it meets the face along -------------------
// profile: the skull from the hairline over the crown to the nape; a thickness per point; the inner line back along
// the temple, around the ear, the sideburn
const P_SKULL: Pt[] = [[33.2, -27.6], [25.6, -39.4], [12, -47.6], [-6, -50], [-28.6, -44.4], [-42, -31], [-46.4, -12], [-41.6, 5], [-31.6, 18.6], [-19.6, 25.6]];
const P_CENTER: Pt = [-5, -4];
const P_LINE_M: V[] = [[-17.4, 22, 0.6], [-16.8, 9], [-15.6, -2.6], [-10.6, -7.6], [-2.6, -6.6, 0.5], [0.4, 0.6], [1.6, 8.6, 0.3], [4.6, 8.6, 0.3], [5.4, -2.4], [9, -14], [17, -22.6], [27.6, -26.6]];
const P_LINE_F: V[] = [[-17.4, 21, 0.6], [-17, 8], [-15.8, -2.6], [-10.6, -8], [-3, -7.6, 0.5], [-0.2, -2.4], [1.6, 2.6, 0.3], [3.6, 2.4, 0.3], [4.6, -5], [8.4, -15], [16.4, -23], [26.6, -27]];
const P_LINE_REC: V[] = [[-17.4, 22, 0.6], [-16.8, 9], [-15.6, -2.6], [-10.6, -7.6], [-2.6, -6.6, 0.5], [0.4, 0.6], [1.6, 8, 0.3], [4.2, 8, 0.3], [4.4, -3], [6.6, -16], [8.6, -30], [13, -40.6]];
// three-quarter: the same arc a little narrower (the skull turned), the hairline a little further back
const T_SKULL: Pt[] = [[31.2, -28.6], [24.6, -40], [12, -48], [-6, -50], [-26.6, -44.4], [-38.8, -31], [-42.6, -12], [-38.6, 4.6], [-30, 18], [-19.6, 25]];
const T_CENTER: Pt = [-5, -4];
const T_LINE_M: V[] = [[-17, 21.6, 0.6], [-17.4, 9], [-16.4, -2.6], [-11.6, -7.6], [-4.6, -6.6, 0.5], [-2.4, 0.6], [-1.4, 8.6, 0.3], [1.6, 8.6, 0.3], [2.4, -2.4], [6.6, -14.6], [15.6, -23.2], [26.4, -27.4]];
const T_LINE_F: V[] = [[-17, 21, 0.6], [-17.4, 8], [-16.6, -2.6], [-11.6, -8], [-5, -7.6, 0.5], [-2.8, -2.4], [-1.4, 2.6, 0.3], [0.6, 2.4, 0.3], [1.6, -5], [6, -15.6], [15, -23.6], [25.6, -27.8]];
const T_LINE_REC: V[] = [[-17, 21.6, 0.6], [-17.4, 9], [-16.4, -2.6], [-11.6, -7.6], [-4.6, -6.6, 0.5], [-2.4, 0.6], [-1.4, 8, 0.3], [1.2, 8, 0.3], [1.4, -3], [3.6, -16], [6, -30], [10.6, -40.6]];

/** The hair styles a sil head draws (wardrobe.mjs's 21 map onto these). */
export type SilHair = 'crop' | 'buzz' | 'swept' | 'quiff' | 'curly' | 'receding' | 'bald' | 'manbun' | 'pixie' | 'bob' | 'lob' | 'sleek' | 'bun' | 'pony' | 'long' | 'waves';

// thickness along the skull arc (front .. nape) per style; `lift` raises the front point (a quiff's overhang)
const THICK: Record<SilHair, {t: number[]; lift?: number; fwd?: number; bump?: number}> = {
  crop: {t: [2.6, 5, 4, 2.8, 2.1, 1.8, 1.6, 1.3, 1, 0.4], lift: 1.2, fwd: 1},
  buzz: {t: [1.4, 3.2, 3.4, 3.2, 2.8, 2.4, 2, 1.6, 1.1, 0.5]},
  swept: {t: [5, 8.4, 5, 3, 2.2, 1.9, 1.6, 1.3, 1, 0.4], lift: 3.6, fwd: 3.4},
  quiff: {t: [7.6, 11, 6.6, 3.6, 2.4, 2, 1.7, 1.4, 1, 0.4], lift: 5.4, fwd: 4.4},
  curly: {t: [5.6, 9, 9, 7.6, 6, 4.8, 3.8, 2.8, 1.8, 0.6], bump: 1.4},
  receding: {t: [1, 2.6, 3.2, 3, 2.6, 2.3, 2, 1.6, 1.1, 0.4]},
  bald: {t: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
  manbun: {t: [2.4, 4.6, 4.8, 4.4, 3.8, 3.2, 2.6, 2, 1.4, 0.6]},
  pixie: {t: [4.6, 7.4, 7, 5.8, 4.6, 3.6, 2.8, 2.1, 1.4, 0.6], lift: 1.2, fwd: 2.4},
  bob: {t: [3.6, 6.2, 5.2, 4, 3.2, 2.8, 2.8, 2.8, 2.8, 2.8]},
  lob: {t: [4.2, 7.2, 6.4, 5.2, 4.4, 4, 4, 4, 4, 4]},
  sleek: {t: [2.4, 4.4, 4.2, 3.6, 3, 2.6, 2.2, 1.8, 1.4, 0.8]},
  bun: {t: [2.4, 4.4, 4.2, 3.6, 3, 2.6, 2.2, 1.8, 1.4, 0.8]},
  pony: {t: [2.4, 4.4, 4.2, 3.6, 3, 2.6, 2.2, 1.8, 1.4, 0.8]},
  long: {t: [4, 6.6, 6, 5, 4.4, 4, 4, 4, 4, 4]},
  waves: {t: [4.6, 7.4, 6.8, 5.8, 5, 4.6, 4.4, 4.4, 4.4, 4.4], bump: 1.1},
};

/** The hair's outer arc: the skull points pushed out from the head's centre by the style's thickness. */
const hairArc = (skull: Pt[], ctr: Pt, s: (typeof THICK)[SilHair]): V[] => {
  const n = skull.length;
  const out: V[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = skull[i];
    const dx = x - ctr[0];
    const dy = y - ctr[1];
    const L = Math.hypot(dx, dy) || 1;
    // the thickness table has 10 stops: sample it along the arc
    const u = (i / (n - 1)) * (s.t.length - 1);
    const i0 = Math.floor(u);
    const t = s.t[i0] + (s.t[Math.min(s.t.length - 1, i0 + 1)] - s.t[i0]) * (u - i0);
    let px = x + (dx / L) * t;
    let py = y + (dy / L) * t;
    if (i === 0) {
      px += s.fwd ?? 0;
      py -= s.lift ?? 0;
    }
    out.push([px, py, i === 0 ? 0.5 : 1]);
    if (s.bump && i < n - 1) {
      // curls: a small bump between two points
      const [x2, y2] = skull[i + 1];
      const mx = (x + x2) / 2;
      const my = (y + y2) / 2;
      const mdx = mx - ctr[0];
      const mdy = my - ctr[1];
      const ml = Math.hypot(mdx, mdy) || 1;
      out.push([mx + (mdx / ml) * (t + s.bump * 1.6), my + (mdy / ml) * (t + s.bump * 1.6)]);
    }
  }
  return out;
};

// long hair (bob, lob, long, waves), profile space: over the crown like the short styles, then it falls behind the neck to
// the jaw (bob: it covers the ear, its line running down in front of it) or past the shoulders (tucked behind the ear)
const longHair = (kind: SilHair, s: (typeof THICK)[SilHair]): V[] => {
  const arc = hairArc(P_SKULL.slice(0, 7), P_CENTER, s);
  if (kind === 'bob')
    return [...arc, [-49.2, 4], [-47.6, 18], [-43.6, 27, 0.4], [-28, 33.4, 0.2], [-6, 38.6, 0.15], [-2.4, 30], [0.4, 14], [3, 0], [6.6, -12], [14, -21], [25, -26.6]];
  const len = kind === 'lob' ? 58 : 84;
  const w = kind === 'waves' ? 2.2 : 0;
  return [
    ...arc,
    [-50.4, 4], [-50.6 - w, 24], [-49 + w, 24 + (len - 24) * 0.5], [-46.6 - w, len - 6], [-42, len + 2, 0.4], [-33, len + 3, 0.3],
    [-26, len - 8, 0.5], [-23.4, 34], [-20, 20], [-17.8, 6], [-15.8, -2.6], [-10.6, -8], [-3, -7.6, 0.5], [-0.2, -2.4],
    [1.6, 2.6, 0.3], [3.6, 2.4, 0.3], [4.6, -5], [8.4, -15], [16.4, -23], [26.6, -27],
  ];
};

/** An expression for the head (sil.tsx derives it from faces.ts). */
export type SilExpr = {
  lid: number; // 0 closed .. 0.5 lowered .. 1 open (still minimal: a lid line over a dark iris, no white)
  smile: number; // the lower lid lifts (a smile's eyes), 0..1
  brow: number; // brows up (+) or down (-), head units, about -2..4
  browTilt: number; // inner ends up (+, worry) or down (-, anger), degrees
  curve: number; // the mouth's corners, -1 down .. 1 up
  open: number; // the mouth opens 0..1 (a small dark opening, never teeth)
  look: number; // the eyes' shift toward the light (+) or down (-): a phone, the floor
};
export const EXPR0: SilExpr = {lid: 0.2, smile: 0, brow: 0, browTilt: 0, curve: 0.05, open: 0, look: 0};

export type HeadLook = {
  fem: boolean;
  age: number; // 0 young, 1 the fifties, 2 older
  hair: SilHair;
  hairCol: string; // ink, or grey
  beard: 'stubble' | 'short' | 'full' | 'tache' | 'goatee' | null;
  glasses: 'round' | 'rect' | 'shades' | 'aviator' | 'shadesUp' | null;
  hat: 'cap' | 'capBack' | 'beanie' | 'flatCap' | 'peaked' | null;
  hatCol: string;
  earring: 'stud' | 'hoop' | null;
};

/** blank (phase 2, src/lib/p2.mjs; the p3 prove run, 2026-10-27: the P2 path still drew an eye, a nose, an open mouth): the
 *  head as a SILHOUETTE: its lit shape, the hair and the ear's outline only; no eye, brow, nostril, lips, socket or nose shading,
 *  no beard or moustache, no ear detail, earring or glasses. The owner's rule: silhouettes or none, never a cartoon face. */
type HeadP = {view: 'profile' | 'three'; look: HeadLook; ex: SilExpr; pal: SilPal; uid: string; tilt?: number; detail?: boolean; blank?: boolean};

/** An eye: a closed lid (a fine crescent), a lowered lid over a dark iris, or an open almond (minimal, no white). */
const eyeOf = (x0: number, x1: number, y: number, ex: SilExpr, fem: boolean, col: string, w: number, front: 1 | -1, key: string): React.ReactNode => {
  const L = x1 - x0;
  const at = (t: number, dy: number): V => [x0 + L * t, y + dy];
  const lid = Math.max(0, Math.min(1, ex.lid));
  const sm = Math.max(0, Math.min(1, ex.smile));
  const fx = front > 0 ? 1 : 0; // the eye's front end (t) for a profile eye
  const g: React.ReactNode[] = [];
  if (lid < 0.32) {
    // closed: a crescent that sags (or, smiling, lifts), a few fine lashes for her
    const sag = (1.7 - 3.4 * sm) * w;
    g.push(<path key="c" d={pathOf([at(0, -0.2), at(0.5, sag - 0.1), at(1, 0.6 * w), at(1, 1.25 * w), at(0.5, sag + 1.05 * w), at(0, 0.45 * w)])} fill={col} />);
    if (fem)
      g.push(
        <path
          key="l"
          d={[0.25, 0.45, 0.65, 0.85]
            .map((t) => {
              const tt = fx ? t : 1 - t;
              const [px, py] = at(tt, sag * (1 - Math.abs(tt - 0.5) * 1.6) + 0.9 * w);
              return `M${f2(px)} ${f2(py)}L${f2(px + front * 0.9 * w)} ${f2(py + 2.1 * w)}`;
            })
            .join('')}
          stroke={col}
          strokeWidth={0.55 * w}
          strokeLinecap="round"
          fill="none"
        />,
      );
  } else {
    const o = (lid - 0.32) / 0.68; // 0 lowered .. 1 open
    const up = -(1.0 + 2.2 * o) * w;
    const lo = (1.2 + 0.6 * o - 1.2 * sm) * w;
    const lk = ex.look * 0.18 * L;
    // the iris: a dark lens under the lid, its lower edge held by the lower lid
    g.push(<path key="i" d={pathOf([at(0.3 + lk / L, up * 0.6), at(0.78 + lk / L, up * 0.55), at(0.82 + lk / L, lo * 0.8), at(0.36 + lk / L, lo * 0.85)])} fill={col} opacity={0.85} />);
    // the upper lid: a firm line that thickens to the outer corner
    g.push(<path key="u" d={pathOf([at(-0.02, 0.4), at(0.4, up - 0.2), at(1.02, 0.2), at(0.98, 0.9), at(0.42, up + 0.9), at(0.04, 1.0)])} fill={col} />);
    if (fem) g.push(<path key="w" d={pathOf([at(fx ? 1.0 : 0, 0.1), at(fx ? 1.22 : -0.22, -1.4 * w), at(fx ? 1.04 : -0.04, 0.9)])} fill={col} />);
  }
  return <g key={key}>{g}</g>;
};

/** A brow: a tapered stroke (filled), raised and tilted by the expression. */
const browOf = (x0: number, x1: number, y: number, ex: SilExpr, fem: boolean, col: string, w: number, inner: 0 | 1, key: string): React.ReactNode => {
  const L = x1 - x0;
  const lift = -ex.brow;
  const tilt = (ex.browTilt * Math.PI) / 180;
  // the inner end rises with tilt; inner = which end (t = 0 or 1) is toward the nose
  const yAt = (t: number) => y + lift + (inner === 1 ? t : 1 - t) * -Math.tan(tilt) * L * 0.45;
  const th = (fem ? 0.9 : 1.35) * w;
  const top: V[] = [[x0, yAt(0) + 0.2], [x0 + L * 0.45, yAt(0.45) - th * 0.9 - (fem ? 0.9 : 0.5)], [x1, yAt(1) + 0.3 * w]];
  const bot: V[] = [[x1, yAt(1) + 0.6 * w], [x0 + L * 0.45, yAt(0.45) + th * 0.2 - (fem ? 0.9 : 0.5)], [x0, yAt(0) + th]];
  return <path key={key} d={pathOf([...top, ...bot])} fill={col} />;
};

/** A sculpted head (see the file's header). */
export const SilHead: React.FC<HeadP> = ({view, look, ex, pal, uid, tilt = 0, detail = true, blank = false}) => {
  const id = (n: string) => sid(uid, n);
  const [deep, shadow, half, hi] = pal.lit;
  const fem = look.fem;
  const old = look.age >= 2;
  const pro = view === 'profile';
  const outline = pro ? (fem ? PRO_F : old ? PRO_O : PRO_M) : fem ? TQ_F : old ? TQ_O : TQ_M;
  const d = pathOf(outline);
  const feat = pal.feature;
  const gt = `rotate(${f2(-tilt)} 0 0)`; // the light stays put while the head tilts: a raised chin walks into it
  const hairS = THICK[look.hair];
  const hatOn = !!look.hat;
  const hairCol = look.hairCol;
  const sheen = look.hairCol === pal.ink ? pal.sheen : mix(look.hairCol, '#FFFFFF', 0.35);
  const longFall = look.hair === 'bob' || look.hair === 'lob' || look.hair === 'long' || look.hair === 'waves';
  const skull = pro ? P_SKULL : T_SKULL;
  const ctr = pro ? P_CENTER : T_CENTER;
  const line = look.hair === 'receding' ? (pro ? P_LINE_REC : T_LINE_REC) : fem ? (pro ? P_LINE_F : T_LINE_F) : pro ? P_LINE_M : T_LINE_M;
  // the hair mass: the outer arc (forward), then the inner line (back to front reversed)
  let hairD = '';
  if (look.hair !== 'bald') {
    const thin = look.age >= 2 ? 0.62 : 1; // older hair lies closer to the skull
    // a man's short cut ends above the nape: the arc stops behind the skull's base, the neck's skin shows under it
    const short = !fem && !longFall && look.hair !== 'manbun';
    const sk = short ? [...skull.slice(0, 7), [pro ? -40 : -37, pro ? 10 : 9.6] as Pt] : skull;
    const arc = hairArc(sk, ctr, hatOn ? THICK.buzz : {...hairS, t: hairS.t.map((v) => v * thin), lift: (hairS.lift ?? 0) * thin});
    if (longFall && !hatOn) {
      const pts = longHair(look.hair, hairS);
      // the three-quarter: the same fall, the skull a little narrower
      hairD = pathOf(pro ? pts : pts.map((q) => [q[0] * 0.94 - 1.6, q[1], q.length > 2 ? (q[2] as number) : 1] as const));
    } else if (look.hair === 'receding' && !hatOn) {
      // the crown bare: the hair a band from behind the crown round the back of the head and over the ears
      const band = hairArc(sk.slice(3), ctr, {t: [1.8, 2.2, 2.4, 2.2, 1.8, 1.2, 0.6], lift: 0, fwd: 0});
      hairD = pathOf([...band, [pro ? -27 : -26, 14.6, 0.6], [-18, 15, 0.6], [-17, 7], [-15.6, -2.6], [-10.6, -7.6], [-3.6, -6.2, 0.5], [0.2, 0.4], [1.2, 7.6, 0.3], [3.6, 7.6, 0.3], [3.8, -3], [1, -12], [-6, -22], [-14, -34], [-16, -44]]);
    } else hairD = pathOf([...arc, ...(short ? [[pro ? -27 : -26, 14.6, 0.6] as V, [-18, 15, 0.6] as V, ...line.slice(2)] : line)]);
  }
  // sheen: two strands of light that follow the hair's flow from the front over the crown
  const sheenD = look.hair === 'bald' || look.hair === 'buzz' || look.hair === 'receding' || hatOn
    ? ''
    : pathOf([[31.6, -36.6], [23.6, -48], [8, -53.8], [-10, -52.6], [-26, -46]], false) +
      pathOf([[28.6, -32.6], [20, -42.4], [5, -47.8], [-13, -46.6], [-29, -39.6]], false) +
      pathOf([[25, -29.6], [14.6, -37], [-1, -41.6], [-18, -40], [-32, -32]], false);
  // a bun, a top knot or a ponytail
  const extra: React.ReactNode[] = [];
  if (!hatOn && (look.hair === 'bun' || look.hair === 'manbun')) {
    const bx = pro ? (look.hair === 'manbun' ? -30 : -47) : look.hair === 'manbun' ? -31 : -43;
    const by = look.hair === 'manbun' ? -44 : 12;
    const r = look.hair === 'manbun' ? 8 : 10.4;
    extra.push(<ellipse key="bun" cx={bx} cy={by} rx={r} ry={r * 0.92} fill={hairCol} />);
  }
  if (!hatOn && look.hair === 'pony') {
    // gathered at the nape, a braid hanging down the back: leaf-shaped plaits that taper
    const bx = pro ? -42 : -40;
    const plaits: React.ReactNode[] = [<path key="tie" d={pathOf([[bx + 4, 6], [bx - 6, 4], [bx - 8.6, 16], [bx - 2, 24], [bx + 4, 18]])} fill={hairCol} />];
    for (let i = 0; i < 9; i++) {
      const y = 20 + i * 9.4;
      const w = 5.6 - i * 0.42;
      const x = bx - 3 - i * 0.5 + (i % 2 ? 1.2 : -1.2);
      plaits.push(<path key={`pl${i}`} d={pathOf([[x, y - 1], [x + w, y + 4.6], [x + (i % 2 ? -0.6 : 0.6), y + 11.4], [x - w, y + 4.6]])} fill={hairCol} />);
    }
    extra.push(<g key="pony">{plaits}</g>);
  }
  // the nose's shadow side, the plane under it, under the lower lip (profile); the near-side shading (three-quarter)
  const shade = (k: string, pts: V[], op: number) => <path key={k} d={pathOf(pts)} fill={deep} opacity={op} />;

  // ---- features ----
  const feats: React.ReactNode[] = [];
  const lip = mix(deep, feat, 0.45);
  if (pro) {
    const ex0 = fem ? 23.6 : 24;
    const ex1 = fem ? 31 : 31.6;
    feats.push(eyeOf(ex0, ex1, fem ? -0.4 : 0.2, ex, fem, feat, fem ? 0.95 : 0.9, 1, 'eye'));
    feats.push(browOf(ex0 - 0.6, ex1 + 3.4, fem ? -8.2 : -6.6, ex, fem, feat, 1, 1, 'brow'));
    // the nostril's wing
    feats.push(<path key="nos" d={fem ? 'M34.8 14.2C35.5 16.4 36.4 17.8 38.2 18.8' : old ? 'M37.8 15.8C38.8 18.6 39.8 20.4 42.2 21.6' : 'M36.8 14.8C37.7 17.6 38.7 19.3 40.8 20.4'} stroke={feat} strokeWidth={0.85} strokeLinecap="round" fill="none" opacity={0.6} />);
    // the lips: a closed line (him) or a soft dark lip shape (her); open, a small dark gap; the corner lifts with a smile
    const cy = fem ? 29 : 30.4;
    const cx = fem ? 35.6 : 38.4;
    const cl = -ex.curve * 1.4;
    if (ex.open > 0.08) {
      const o = ex.open * (fem ? 4.4 : 4.8);
      feats.push(<path key="mo" d={pathOf([[cx + 1.4, cy - 0.8 - o * 0.25, 0.3], [cx - 3.6, cy + cl - 0.6], [cx - 3.4, cy + cl + 0.4], [cx + 0.8, cy + o, 0.4], [cx + 2.2, cy + o * 0.45]])} fill={feat} />);
    } else if (fem) {
      feats.push(<path key="mo" d={pathOf([[37.4, 24.4], [37.8, 25.8], [cx, cy - 0.2, 0.2], [37, 30.6], [36.4, 33], [34.2, 33.6], [32.2, 31 + cl * 0.5], [32, 28.4 + cl], [33.2, 26]])} fill={lip} />);
    } else {
      feats.push(<path key="mo" d={`M${cx - 0.4} ${cy}C${cx - 2.4} ${cy + 0.3} ${cx - 4} ${cy + 0.3 + cl * 0.4} ${cx - 5.4} ${cy + cl}`} stroke={feat} strokeWidth={1.05} strokeLinecap="round" fill="none" />);
    }
    if (look.age >= 1 && !fem) feats.push(<path key="fold" d="M33.4 22.6C30.8 26 30.6 29.6 31.6 32" stroke={deep} strokeWidth={0.9} fill="none" opacity={0.45} />);
  } else {
    // the editorial three-quarter: the near eye an almond facing us, the far one a short lid behind the bridge
    const ey = fem ? -0.2 : 0.4;
    feats.push(eyeOf(fem ? 15.4 : 15, fem ? 26 : 26.4, ey, ex, fem, feat, fem ? 1.0 : 0.95, 1, 'eyeN'));
    feats.push(eyeOf(30.4, fem ? 33 : 33.4, ey - 0.4, {...ex, lid: Math.min(ex.lid, 0.3)}, false, feat, 0.6, 1, 'eyeF'));
    feats.push(browOf(fem ? 14.4 : 13.6, fem ? 27.4 : 27.8, fem ? -8.4 : -6.8, ex, fem, feat, 1, 1, 'browN'));
    feats.push(browOf(30, fem ? 33.6 : 34.6, fem ? -8.6 : -7, ex, fem, feat, 0.7, 0, 'browF'));
    feats.push(<path key="nos" d={fem ? 'M31.6 14.4C32.3 16.4 33.2 17.8 35.2 18.8' : 'M33.4 15.2C34.1 17.6 35.1 19.2 37.2 20.4'} stroke={feat} strokeWidth={0.9} strokeLinecap="round" fill="none" opacity={0.65} />);
    const cl = -ex.curve * 1.5;
    const cx = fem ? 33 : 35;
    const cy = fem ? 28.2 : 29.8;
    if (ex.open > 0.08) {
      const o = ex.open * 4.8;
      feats.push(<path key="mo" d={pathOf([[cx + 1.2, cy - 0.8 - o * 0.2, 0.3], [cx - 7.4, cy + cl - 0.4], [cx - 7.2, cy + cl + 0.6], [cx - 1.4, cy + o, 0.4], [cx + 1.6, cy + o * 0.5]])} fill={feat} />);
    } else if (fem) {
      feats.push(<path key="mo" d={pathOf([[34.6, 23.6], [35, 25], [cx, cy - 0.2, 0.2], [34.2, 29.8], [33.4, 32.6], [30.6, 33], [27.6, 30.8 + cl * 0.6], [27.2, 28.8 + cl], [29.8, 26.4]])} fill={lip} />);
    } else {
      feats.push(<path key="mo" d={`M${cx - 0.4} ${cy}C${cx - 3} ${cy + 0.4} ${cx - 5.6} ${cy + 0.4 + cl * 0.4} ${cx - 7.8} ${cy + cl}`} stroke={feat} strokeWidth={1.1} strokeLinecap="round" fill="none" />);
    }
    if (look.age >= 1 && !fem) feats.push(<path key="fold" d="M30.4 22.6C27.8 26 27.4 29.6 28.4 32.4" stroke={deep} strokeWidth={0.9} fill="none" opacity={0.45} />);
  }

  // ---- beard ----
  const beardD = (() => {
    if (!look.beard) return '';
    {
      const full = look.beard === 'full' || look.beard === 'short' || look.beard === 'stubble';
      const chinOnly = look.beard === 'goatee';
      const tache: V[] = [[31.4, 28.6, 0.3], [34.6, 25.4], [39.2, 23.8], [40.8, 25.8, 0.4], [38.8, 28.4, 0.3], [35, 29]];
      if (look.beard === 'tache') return pathOf(tache);
      if (chinOnly) return pathOf([[31, 34, 0.3], [36, 33.6], [38.8, 37], [39, 43], [37, 49.6, 0.5], [31, 51.4], [27, 46], [28, 38]]) + pathOf(tache);
      if (full) {
        const ext = look.beard === 'full' ? 3.2 : 0;
        return pathOf([[1.8, 8, 0.3], [4.4, 9], [8.4, 22], [17, 30.6], [26.6, 32], [31.4, 31.4, 0.4], [33.6, 33.2], [35.8, 36.2, 0.4], [34.2, 38.6], [37 + ext * 0.3, 43], [38 + ext * 0.4, 47 + ext * 0.4], [34.4, 52.4 + ext, 0.6], [24.6, 54.4 + ext], [12, 50 + ext * 0.6], [1.6, 42.6, 0.5], [-2.6, 33], [-4, 22]]) + pathOf(tache);
      }
      return '';
    }
    return '';
  })();
  const beardOp = look.beard === 'stubble' ? 0.16 : look.hairCol === pal.ink ? 1 : 0.8;

  // ---- the ear ----
  const earD = pathOf([[-4.6, -2.4], [-9, -5.2], [-14.4, -4.4], [-17.4, -0.4], [-17.6, 6.6], [-15.4, 12.6], [-11.8, 17.8], [-8.6, 20, 0.7], [-6, 18.6], [-5, 13.4], [-4.3, 7.4], [-3.8, 1.6]]);
  const earIn = 'M-8.6 -1.2C-11.6 -2 -14 -0.8 -14.8 2.8C-15.6 6.4 -14.2 10 -11.8 12.6';
  const back = pro ? undefined : 'translate(-3 0)'; // the three-quarter's ear, beard and hat: the profile's, a little back
  const earOn = !(look.hair === 'bob' && !hatOn);
  const earAt: Pt = pro ? [-9.4, 21.4] : [-12.4, 21.4];

  // ---- hats (ink, over the hair) ----
  const hatD = (() => {
    const h = look.hat;
    if (!h) return '';
      if (h === 'flatCap') return pathOf([[39.6, -27, 0.3], [44, -31.4, 0.3], [34, -35.6], [28, -45], [12, -53.4], [-10, -54.4], [-30, -48], [-44, -33.6], [-47, -20, 0.4], [-38, -24], [-20, -26.6], [4, -27.4], [30, -27.6]]);
      if (h === 'peaked') return pathOf([[45, -24.4, 0.2], [40, -28.2], [34, -31], [31, -42], [26, -55.6], [8, -61.6], [-20, -60], [-40, -51.4], [-47, -38], [-44.6, -27, 0.4], [-30, -26], [-6, -26.4], [20, -25.6, 0.3], [34, -24.2, 0.2]]);
      if (h === 'beanie') return pathOf([[35.6, -24.6, 0.3], [36.4, -33], [31.6, -45], [18, -56.6], [-2, -60.6], [-22, -57], [-38, -46], [-47.4, -30], [-48, -16, 0.4], [-30, -19.6], [-6, -22.4], [20, -24.6]]);
      if (h === 'cap') return pathOf([[52, -22.6, 0.2], [44, -27.8], [34.4, -29.4], [30.6, -40], [18, -52], [-2, -56.4], [-22, -52.6], [-38, -42], [-46, -27], [-44.6, -18.4, 0.4], [-28, -22.4], [-4, -25.4], [24, -26], [40, -24.6, 0.2]]);
      if (h === 'capBack') return pathOf([[35, -26, 0.3], [34.4, -34], [28, -46], [14, -54], [-4, -56.4], [-24, -52], [-38, -42], [-48, -36, 0.2], [-60, -30.4, 0.2], [-46, -24.6], [-30, -22.6], [-6, -24.4], [22, -26.6]]);
    return '';
  })();
  const badgeAt: Pt | null = look.hat === 'peaked' ? [24, -40] : null;

  // ---- glasses (an ink frame; shades fill the lens) ----
  const glassD = (() => {
    const g = look.glasses;
    if (!g || g === 'shadesUp') return null;
    const fill = g === 'shades' || g === 'aviator';
    if (pro) {
      const lens = g === 'round' ? 'M25 -4.2C29.6 -5.4 33.6 -3.6 33.4 1C33.2 5.2 28.6 6.2 25.8 4.6C23.8 3 23.6 -2.2 25 -4.2Z' : 'M24.2 -3.8L33.6 -4C34.4 -0.2 34.2 3.2 32.6 5.4L26 5.6C24.4 3.6 23.8 0 24.2 -3.8Z';
      return {lens, temple: 'M24.4 -2.6L-4.6 -4.6', fill};
    }
    const lens = g === 'round'
      ? 'M14.4 -4.6C19.4 -6.2 26 -5.4 27 -0.8C27.8 4 23 6.8 18.8 6C14.6 5.2 12.6 -1.4 14.4 -4.6ZM30.8 -4.4C32.6 -5 34.4 -4.4 34.6 -1.4C34.8 2 33.4 4.6 31.6 4.6C30.4 3.4 30 -1.4 30.8 -4.4Z'
      : 'M13 -4.4L27.4 -4.6C28.2 -0.6 27.8 3 25.8 5.6L15 5.8C13 3.4 12.4 -0.6 13 -4.4ZM30.6 -4.4L34.8 -4.6C35.4 -1 35.2 2.4 34.2 4.8L31.4 5C30.6 3 30.2 -0.6 30.6 -4.4Z';
    return {lens, temple: 'M27.4 -3.6C28.4 -4.6 29.6 -4.8 30.6 -3.8M13 -3.6L-4.6 -4.8', fill};
  })();

  return (
    <g>
      <defs>
        {pro ? (
          <linearGradient id={id('face')} gradientUnits="userSpaceOnUse" x1={-24} y1={-30} x2={38} y2={30} gradientTransform={gt}>
            <stop offset="0" stopColor={deep} />
            <stop offset="0.42" stopColor={shadow} />
            <stop offset="0.76" stopColor={half} />
            <stop offset="1" stopColor={hi} />
          </linearGradient>
        ) : (
          <linearGradient id={id('face')} gradientUnits="userSpaceOnUse" x1={-26} y1={-30} x2={36} y2={30} gradientTransform={gt}>
            <stop offset="0" stopColor={deep} />
            <stop offset="0.42" stopColor={shadow} />
            <stop offset="0.76" stopColor={half} />
            <stop offset="1" stopColor={hi} />
          </linearGradient>
        )}
        <linearGradient id={id('side')} gradientUnits="userSpaceOnUse" x1={pro ? 30 : 20} y1={0} x2={pro ? 10 : 2} y2={6} gradientTransform={gt}>
          <stop offset="0" stopColor={deep} stopOpacity={0} />
          <stop offset="0.5" stopColor={deep} stopOpacity={0.18} />
          <stop offset="1" stopColor={deep} stopOpacity={0.3} />
        </linearGradient>
        <radialGradient id={id('sock')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={deep} stopOpacity={0.5} />
          <stop offset="1" stopColor={deep} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('cheek')} cx={pro ? 29 : 26} cy={10} r={pro ? 9.6 : 10.6} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={hi} stopOpacity={0.5} />
          <stop offset="1" stopColor={hi} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('ear')} gradientUnits="userSpaceOnUse" x1={-6} y1={-6} x2={-18} y2={22}>
          <stop offset="0" stopColor={mix(shadow, half, 0.25)} />
          <stop offset="1" stopColor={mix(deep, shadow, 0.55)} />
        </linearGradient>
        <clipPath id={id('clip')}>
          <path d={d} />
        </clipPath>
        <linearGradient id={id('hair')} gradientUnits="userSpaceOnUse" x1={30} y1={-56} x2={-40} y2={20}>
          <stop offset="0" stopColor={mix(pal.ink, '#FFFFFF', pal.dark ? 0.16 : 0.13)} />
          <stop offset="0.45" stopColor={pal.ink} />
        </linearGradient>
        <clipPath id={id('hairClip')}>
          <path d={hairD || 'M0 0Z'} />
        </clipPath>
        <clipPath id={id('front')}>
          <rect x={pro ? 22 : 20} y={-40} width={40} height={100} />
        </clipPath>
      </defs>
      {extra}
      <path d={d} fill={`url(#${id('face')})`} />
      <g clipPath={`url(#${id('clip')})`}>
        <path d={pathOf(pro ? (fem ? PRO_SIDE_F : PRO_SIDE_M) : TQ_SIDE)} fill={`url(#${id('side')})`} />
        {blank ? null : pro ? (
          <>
            <ellipse cx={fem ? 27.6 : 28.4} cy={-1} rx={7.4} ry={4.6} fill={`url(#${id('sock')})`} />
            {shade('nose', fem ? [[33.6, 1], [36.2, 8], [38.8, 13.6], [36.8, 18], [33.8, 16.6], [32.6, 8]] : [[35.4, 1], [38.4, 8.4], [41.2, 15], [38.8, 19.6], [35.6, 17.8], [34.2, 8.4]], 0.16)}
            {shade('chin', fem ? [[31, 37.4], [33.6, 38.4], [33.2, 41.8], [30.2, 41]] : [[32.8, 38.8], [35.6, 40], [35.2, 43.4], [32.2, 42.2]], 0.22)}
          </>
        ) : (
          <>
            <ellipse cx={21} cy={-0.8} rx={8.6} ry={5.2} fill={`url(#${id('sock')})`} />
            {shade('nose', fem ? [[29.6, 1.6], [32, 1.4], [36.4, 12.4], [33.8, 18.4], [30.4, 16.8]] : [[31.4, 1.6], [34, 1.4], [39, 13], [36, 19.4], [32.4, 17.6]], 0.18)}
            {shade('chin', fem ? [[28.4, 36.6], [31, 37.6], [30.6, 41], [27.6, 40.2]] : [[30, 37.8], [32.8, 39], [32.4, 42.4], [29.4, 41.2]], 0.2)}
          </>
        )}
        <rect x={10} y={-2} width={34} height={26} fill={`url(#${id('cheek')})`} />
        <path d={d} fill="none" stroke={hi} strokeWidth={5} opacity={0.32} clipPath={`url(#${id('front')})`} />
        {blank ? null : feats}
      </g>
      {beardD && !blank ? <path d={beardD} fill={look.beard === 'stubble' ? mix(deep, pal.ink, 0.35) : hairCol} opacity={look.beard === 'stubble' ? 0.42 : beardOp} transform={back} /> : null}
      {earOn ? (
        <g transform={back}>
          <path d={earD} fill={`url(#${id('ear')})`} />
          {detail && !blank ? <path d={earIn} stroke={deep} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.55} /> : null}
        </g>
      ) : null}
      {look.earring && !blank ? (
        look.earring === 'stud' ? (
          <circle cx={earAt[0]} cy={earAt[1] + (earOn ? 0 : 2)} r={1.5} fill={pal.b} />
        ) : (
          <ellipse cx={earAt[0]} cy={earAt[1] + 4.2} rx={3} ry={3.6} fill="none" stroke={pal.b} strokeWidth={0.9} />
        )
      ) : null}
      {hairD && pal.dark ? <path d={hairD} fill={pal.rim} opacity={0.6} transform="translate(1.4 -1.2)" /> : null}
      {hairD ? <path d={hairD} fill={hairCol === pal.ink ? `url(#${id('hair')})` : hairCol} /> : null}
      {sheenD && detail ? <path d={sheenD} stroke={sheen} strokeWidth={0.6} fill="none" opacity={0.55} strokeLinecap="round" transform={pro ? undefined : 'translate(-2 0)'} clipPath={`url(#${id('hairClip')})`} /> : null}
      {hatD ? <path d={hatD} fill={look.hatCol} transform={back} /> : null}
      {badgeAt ? <circle cx={badgeAt[0]} cy={badgeAt[1]} r={2.6} fill={pal.b} transform={back} /> : null}
      {glassD && !blank ? (
        <g>
          {glassD.fill ? <path d={glassD.lens} fill={pal.ink} /> : null}
          <path d={glassD.lens} fill="none" stroke={pal.ink} strokeWidth={1.2} strokeLinejoin="round" />
          <path d={glassD.temple} fill="none" stroke={pal.ink} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ) : null}
      {look.glasses === 'shadesUp' && !hatOn && !blank ? <path d={pro ? 'M22 -40C26 -42 31 -41 33 -37L30 -34.4C27 -36 24 -36.4 21 -35.6Z' : 'M-4 -38C2 -40.6 10 -40.6 14 -37.6L13 -34.6C8 -36 1 -36 -3.6 -34.4ZM18 -37.4C22 -39.2 27 -39 29.4 -36.4L28.4 -34C25 -35 21.6 -35.2 18.4 -34.6Z'} fill={pal.ink} /> : null}
    </g>
  );
};
