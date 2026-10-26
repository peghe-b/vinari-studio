// COPY for the QR promo (2026-10-14): the trouser legs' rim stops at the hem (it ran up the blouse's back), a tucked
// blouse ends in a slim belt instead of a hard cut. Was src/scenes/illo/sil.tsx: the kit's people from CHAR_FROM on ("Silhouette light"; figure.tsx's Figure draws them for a
// film of that number or later, the old "Graphite" people for the films made before).
//
// The owner, 2026-10-12, on the round-headed people with cartoon faces: "a disaster". His references (out/char-ref/):
// premium editorial illustration. So a person here is an elegant adult of about eight heads (a small sculpted head on a
// long neck, long legs, a slim tall body), always seen in a strict profile or a three-quarter view (never from the
// front), drawn as a crisp near-black SILHOUETTE with no outline: the clothes are the silhouette's shape (a tailored
// jacket, a long coat, a dress, a turtleneck), a white garment is white turned by the light, and only the skin (the face,
// the neck, a V of the chest, the hands) is revealed by ONE soft light of a single hue: the film's object accent `a`
// (tokens.ts ACCENT_PAIRS; grey for a film without a pair and on the black-and-white cover). The mood is posture and
// light, not a cartoon face: the eyes are closed or lowered, a worried beat dims the light and drops the head, relief
// lifts the chin into it. On a dark ground (the black film, a night) the ink lifts a step and the light draws a rim.
//
// It keeps figure.tsx's whole props API (cast, x, y, size, crop, face, pose, turn, flip, hold, acts, lod, idle, frame,
// time, gaze, opacity, dim, itemSide, film): the same acting (acting.ts), the same 21 poses evaluated by poses.ts (the
// arms that reach a point of the body re-aimed at this body's head and chest), the same wardrobe (wardrobe.mjs: the
// outfit, its tones, the hair, the beard, glasses, hats, earrings), so every scene and Film made for the kit draws the new
// people unchanged. `turn` keeps its sense: its sign is where the person faces (0 = screen right), its size how far the
// body turns (under 0.75 the three-quarter view, from 0.75 the profile); `flip` mirrors all of it.
//
// Units: as figure.tsx (100 u = the standing height, the feet at the origin, y up negative); the drawing faces +x and an
// outer mirror turns it to the left. Pure drawing code: frame-driven, no state, no randomness (rand(seed) only).
import React, {useId} from 'react';
import {rand, spr} from '../../../lib/anim';
import {FIG} from '../../../lib/layer';
import {ACCENT_PAIRS, accentsOn, C, isLight, p2, type AccentName} from '../../../tokens';
import {resolveActs, type Act} from '../../illo/acting';
import {FACE, mixFace, type Face, type FaceParams} from '../../illo/faces';
import {dark, ground, mix, type Time} from '../../illo/palette';
import {evalPose, mixPose, type ArmV, type HandKind, type Pose, type PoseV} from '../../illo/poses';
import {drawItem, type Item} from '../../illo/props';
import {ap, chain, clamp, dir, ik2, lerp, rot, scl, tr, type Ink, type Mx, type Pt} from '../../illo/rig';
import {gid} from '../../illo/solid';
import {HEAD_NECK, pathOf, sid, SilHead, type HeadLook, type SilExpr, type SilHair, type SilPal, type V} from './silhead';
import type {Dress} from '../../illo/wardrobe.mjs';

export type {SilPal};

// ---- the light (one hue) ---------------------------------------------------------------------------------------------
const N_LIGHT = '#8C8C8C';
const N_DARK = '#8E8E8E';

/** The palette for a look (`light`), a light hue (null = neutral grey), the pair's second colour, the ground's time and
 *  the light's level (0.7 dim .. 1 .. 1.25 bright: a mood). */
export const silPal = (o: {light: boolean; hue: string | null; b?: string | null; time?: Time; level?: number}): SilPal => {
  const L = o.light;
  const onDark = !L || (o.time ?? 'day') !== 'day';
  const hue = o.hue ?? (L ? N_LIGHT : N_DARK);
  const lv = o.level ?? 1;
  const up = (c: string, k: number) => (k >= 0 ? mix(c, '#FFFFFF', k) : mix(c, '#000000', -k));
  const bb = lv - 1;
  const deep = up(mix(hue, '#000000', L ? 0.48 : 0.4), bb * 0.5);
  const shadow = up(hue, bb * 0.8);
  const half = up(mix(hue, '#FFFFFF', L ? 0.5 : 0.42), bb * 0.7);
  const hi = up(mix(hue, '#FFFFFF', L ? 0.9 : 0.84), Math.min(0, bb) * 0.8);
  return {
    dark: onDark,
    ink: onDark ? '#1B1B1B' : '#0B0B0B',
    ink2: onDark ? '#242424' : '#1A1A1A',
    sheen: onDark ? '#4C4C4C' : '#3C3C3C',
    rim: mix(hue, '#FFFFFF', onDark ? 0.3 : 0.55),
    lit: [deep, shadow, half, hi],
    white: [onDark ? '#EDEDED' : '#FFFFFF', mix(hue, onDark ? '#9A9A9A' : '#FFFFFF', onDark ? 0.45 : 0.42)],
    feature: '#0B0B0B',
    grey: onDark ? '#9A9A9A' : '#A4A4A4',
    b: o.b ?? (L ? '#6A6A6A' : '#8A8A8A'),
  };
};

/** The film's palette: its accent `a` as the light, `b` as the second colour (grey without a pair, or on the cover). */
export const filmSilPal = (time: Time = 'day', level = 1): SilPal =>
  silPal({light: isLight(), hue: accentsOn() ? C.accA : null, b: accentsOn() ? C.accB : null, time, level});

/** A palette by pair name, for sheets and galleries that show several films at once ('none': the grey light). */
export const pairSilPal = (name: AccentName | 'none', look: 'light' | 'dark', time: Time = 'day', level = 1): SilPal =>
  silPal({light: look === 'light', hue: name === 'none' ? null : ACCENT_PAIRS[name][look].a, b: name === 'none' ? null : ACCENT_PAIRS[name][look].b, time, level});

/** A sheet may set the palette for everything inside it (else every figure reads the film's). */
export const SilPalCtx = React.createContext<((time: Time, level: number) => SilPal) | null>(null);

const relevel = (p: SilPal, mk: (level: number) => SilPal, level: number): SilPal => (Math.abs(level - 1) < 1e-3 ? p : {...p, lit: mk(level).lit});

// ---- the body (u; facing +x) -----------------------------------------------------------------------------------------
const SHY = -80; // the shoulder joints
const HIPY = -50.5; // the hip joints
const THIGH = 24.6;
const SHIN = 24.0;
const UPPER = 17;
const FORE = 14;
const HK = 0.145; // head units -> u (the head is 14.5 u: about seven heads, a small head on a tall body)
const HEAD_X = 2.2; // the head's centre a little in front of the neck (the neck leans forward)
const HEAD_Y = -92.75;

/** A torso cross-section: the half-width seen from the front (W), the depth in front of the centre line (F) and behind
 *  it (B). A view at angle th (0 front .. 90 profile) shows sqrt((W cos)^2 + (F sin)^2) in front, the same with B behind. */
type Sec = readonly [number, number, number, number]; // y, W, F, B
const TORSO_M: readonly Sec[] = [
  [-83, 3, 2.2, 2.6], [-80.6, 10.2, 3.4, 4.4], [-76, 9.6, 4.8, 5], [-71, 9.1, 5.3, 4.7], [-66, 8.5, 4.8, 4.1],
  [-61.5, 7.9, 3.9, 3.4], [-55.5, 8.1, 3.8, 3.9], [-50.5, 8.5, 3.9, 5], [-46.5, 8.3, 3.4, 4.6],
];
const TORSO_F: readonly Sec[] = [
  [-83, 2.6, 2, 2.4], [-80.8, 8.6, 3.1, 4], [-76, 8, 4.6, 4.4], [-71, 7.8, 6, 4.1], [-66, 7, 4.6, 3.3],
  [-61.5, 6.2, 3.2, 2.7], [-55.5, 7.4, 3.4, 4], [-50.5, 8.9, 3.8, 5.6], [-46.5, 8.6, 3.2, 5],
];
const secAt = (T: readonly Sec[], y: number): Sec => {
  if (y <= T[0][0]) return T[0];
  for (let i = 1; i < T.length; i++)
    if (y <= T[i][0]) {
      const a = T[i - 1];
      const b = T[i];
      const t = (y - a[0]) / (b[0] - a[0]);
      return [y, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
    }
  return T[T.length - 1];
};

// what a garment is: its ease off the body, its hem, its opening at the neck (the V's bottom), what kind of collar
type Cut = {e: number; hem: number; v: number; kind: 'jacket' | 'coat' | 'top' | 'dress' | 'puffer'; neck: 'v' | 'crew' | 'high' | 'collar' | 'hood'};
const CUT: Record<string, Cut> = {
  suit: {e: 0.55, hem: -44.6, v: -66, kind: 'jacket', neck: 'v'},
  suitOpen: {e: 0.55, hem: -44.6, v: -64, kind: 'jacket', neck: 'v'},
  blazer: {e: 0.55, hem: -45, v: -66.6, kind: 'jacket', neck: 'v'},
  leather: {e: 0.5, hem: -48.6, v: -72, kind: 'jacket', neck: 'v'},
  bomber: {e: 0.9, hem: -49, v: -76, kind: 'jacket', neck: 'v'},
  denim: {e: 0.65, hem: -48.4, v: -72, kind: 'jacket', neck: 'v'},
  trench: {e: 0.85, hem: -23.6, v: -66, kind: 'coat', neck: 'v'},
  overcoat: {e: 0.9, hem: -22.6, v: -64, kind: 'coat', neck: 'v'},
  puffer: {e: 1.9, hem: -47.6, v: -79, kind: 'puffer', neck: 'high'},
  shirt: {e: 0.3, hem: -48.6, v: -77.4, kind: 'top', neck: 'collar'},
  polo: {e: 0.3, hem: -49, v: -78.4, kind: 'top', neck: 'collar'},
  turtleneck: {e: 0.2, hem: -49, v: -83, kind: 'top', neck: 'high'},
  knit: {e: 0.7, hem: -48.4, v: -80.6, kind: 'top', neck: 'crew'},
  hoodie: {e: 0.95, hem: -48, v: -80.6, kind: 'top', neck: 'hood'},
  tee: {e: 0.3, hem: -49, v: -81, kind: 'top', neck: 'crew'},
  cardigan: {e: 0.75, hem: -47, v: -68, kind: 'jacket', neck: 'v'},
  blouse: {e: 0.35, hem: -50, v: -75, kind: 'top', neck: 'v'},
  dress: {e: 0.25, hem: -57, v: -74, kind: 'dress', neck: 'v'},
  coverall: {e: 0.8, hem: -48.6, v: -77, kind: 'top', neck: 'collar'},
  uniform: {e: 0.45, hem: -48.6, v: -77, kind: 'top', neck: 'collar'},
};

const HAIR_MAP: Record<string, SilHair> = {
  crop: 'crop', side: 'swept', quiff: 'quiff', slick: 'swept', fade: 'crop', buzz: 'buzz', curly: 'curly', wavy: 'swept',
  manbun: 'manbun', textured: 'crop', receding: 'receding', bald: 'bald', long: 'long', waves: 'waves', bob: 'bob', lob: 'lob',
  pixie: 'pixie', pony: 'pony', bun: 'bun', curls: 'waves', lowbun: 'bun',
};

// ---- hands (hand space: the wrist at the origin, the fingers along +y, the thumb toward -x; 1 = 1 u) ----------------
const HANDS: Record<string, V[]> = {
  // a relaxed hand: the fingers together and a little curved, the thumb along its side
  mitten: [[-1.3, 0], [1.25, 0], [1.6, 2.2], [1.7, 4.2], [1.5, 6], [1.02, 7.5], [0.3, 8.1, 0.6], [-0.35, 7.6], [-0.68, 6], [-0.92, 4.7], [-1.62, 4.4, 0.5], [-1.98, 3.3, 0.5], [-1.72, 1.5]],
  // the index out, the others folded under it
  point: [[-1.6, 0], [1.5, 0], [1.95, 2.4], [2, 4.2], [1.55, 4.9], [1.4, 9.2], [0.85, 9.8, 0.6], [0.3, 9.2], [0.25, 5.7], [-0.9, 5.5], [-1.9, 4.5], [-2.2, 2.6], [-1.75, 1]],
  // a fist with the index toward the viewer (a short finger and its round tip)
  pointYou: [[-1.6, 0], [1.6, 0], [2.2, 2.4], [2.3, 4.6], [1.4, 5.9], [1.1, 7.2, 0.6], [-0.3, 7.4, 0.6], [-0.9, 5.9], [-2.1, 4.6], [-2.1, 2.4]],
  // an open hand: the fingers straight and together, the thumb spread
  palm: [[-1.5, 0], [1.5, 0], [2, 3], [2, 6], [1.6, 8.4], [0.5, 9.2, 0.6], [-0.7, 8.7], [-1.1, 6.3], [-1.45, 4.7], [-3.4, 3.7, 0.5], [-3.6, 2.8, 0.5], [-2.1, 1.5]],
  // a fist with the thumb along +y (thumbs up when the hand points up)
  thumb: [[-1.7, 0], [1.7, 0], [2.3, 2.4], [2.3, 4.4], [1.2, 5.1], [0.9, 7.9, 0.6], [-0.2, 8.2, 0.6], [-0.7, 5.3], [-2, 4.6], [-2.2, 2.2]],
  // closed around something
  grip: [[-1.6, 0], [1.6, 0], [2.2, 2.4], [2.3, 4.6], [1.3, 5.7], [-1, 5.7], [-2.1, 4.5], [-2.1, 2.2]],
};

// ---- the IK retargets: the poses that reach a point of the body, aimed at THIS body (torso units, facing +x) --------
// [x, y, which elbow, the hand's angle, the upper arm's foreshortening (an elbow toward the camera)]
type Aim = [number, number, 'down' | 'fwd' | 'up', number?, number?];
type Reach = {r?: Aim; l?: Aim; nod?: number};
const REACH = (F: number, hx: number): Partial<Record<Pose, Reach>> => ({
  // v2.1 (the AD: the phone sat over the front of his face): the hand at the EAR, behind the head's centre
  phoneEar: {r: [hx - 2.8, -85.2, 'down', 188, 0.6], nod: 2},
  phoneLook: {r: [hx + 5.4, -72.6, 'down', 152, 0.82], l: [hx + 6, -72, 'down', 156, 0.82], nod: 13},
  facepalm: {r: [hx + 3.6, -85.6, 'down', 196, 0.6], nod: 10},
  handsHead: {r: [hx - 4.4, -93.6, 'fwd', 200, 0.8], l: [hx - 3.4, -94.2, 'fwd', 196, 0.8], nod: 4},
  crossArms: {r: [F * 0.3, -67, 'down', 76, 0.56], l: [F * 0.5, -67.8, 'down', 70, 0.56]},
  hold: {r: [F + 5.2, -58.4, 'down', 112]},
  offer: {r: [F + 9.6, -63.4, 'down', 104], l: [F + 10.2, -62.8, 'down', 100]},
  sitDrive: {r: [F + 13.6, -63, 'down', 132], l: [F + 14.4, -64, 'down', 128]},
  pointYou: {r: [F + 6.6, -71.6, 'down', 104, 0.8]},
});

// ---- the Figure ------------------------------------------------------------------------------------------------------
export type SilFigureP = {
  uid?: string;
  look: Dress;
  seed: number;
  x: number;
  y: number;
  size: number;
  crop?: 'full' | 'bust' | 'head';
  face?: Face;
  pose?: Pose;
  turn?: number;
  flip?: boolean;
  hold?: Item | null;
  acts?: readonly Act[];
  lod?: 'hi' | 'lo';
  idle?: boolean;
  frame: number;
  time?: Time;
  gaze?: Pt;
  opacity?: number;
  dim?: number;
  itemSide?: 'back' | 'front';
  behind?: boolean;
  bend?: number; // v2 (diagpromo): the torso bent forward at the hips, degrees (a mechanic over an engine bay)
  belly?: number; // v2 (diagpromo): 0..1 a belly over the belt (the mechanic)
  cig?: number | null; // v2 (diagpromo): a cigarette in his lips: 0 jutting out .. 1 drooping; null none
  smoke?: number; // v2: its smoke wisp's strength 0..1
  stains?: boolean; // v2: a few faint oil stains on a light top
};

/** A smooth limb outline through joints with a radius each (a sleeve, a trouser leg, an arm): one side down, a round
 *  cap, the other side back. `bulge` swells the front (+) side at the middle of each segment (a calf, a forearm). */
const limb = (pts: Pt[], r: number[], bulge: number[] = [], cap0 = true): V[] => {
  const n = pts.length;
  const nrm: Pt[] = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  });
  const L: V[] = [];
  const R: V[] = [];
  for (let i = 0; i < n; i++) {
    L.push([pts[i][0] + nrm[i][0] * r[i], pts[i][1] + nrm[i][1] * r[i]]);
    R.push([pts[i][0] - nrm[i][0] * r[i], pts[i][1] - nrm[i][1] * r[i]]);
    if (i < n - 1 && bulge[i]) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      const rm = (r[i] + r[i + 1]) / 2;
      const nx = (nrm[i][0] + nrm[i + 1][0]) / 2;
      const ny = (nrm[i][1] + nrm[i + 1][1]) / 2;
      L.push([mx + nx * (rm + Math.max(0, bulge[i])), my + ny * (rm + Math.max(0, bulge[i]))]);
      R.push([mx - nx * (rm + Math.max(0, -bulge[i])), my - ny * (rm + Math.max(0, -bulge[i]))]);
    }
  }
  const e = pts[n - 1];
  const d = [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]];
  const dl = Math.hypot(d[0], d[1]) || 1;
  const capE: V = [e[0] + (d[0] / dl) * r[n - 1] * 0.9, e[1] + (d[1] / dl) * r[n - 1] * 0.9];
  const s = pts[0];
  const d0 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
  const dl0 = Math.hypot(d0[0], d0[1]) || 1;
  const capS: V = [s[0] - (d0[0] / dl0) * r[0] * 0.9, s[1] - (d0[1] / dl0) * r[0] * 0.9];
  return [...L, capE, ...R.reverse(), ...(cap0 ? [capS] : [])];
};

const lerpP = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** The person (see the file's header). */
/** A silhouette person; it keeps out of the subtitle band (lib/layer.ts FIG: the frame guards' probe finds it). */
export const SilFigure: React.FC<SilFigureP> = (p) => (
  <g className={FIG}>
    <SilFigureBody {...p} />
  </g>
);
const SilFigureBody: React.FC<SilFigureP> = (p) => {
  const rid = useId();
  const id = (n: string) => sid(rid, n);
  const mkPal = React.useContext(SilPalCtx);
  const look = p.look;
  const fem = look.fem;
  const seed = p.seed;
  const frame = p.frame;
  const time = p.time ?? 'day';
  const crop = p.crop ?? 'full';
  const k = Math.max(1e-3, p.size / 100);
  const hi = (p.lod ?? (p.size < 180 ? 'lo' : 'hi')) === 'hi';
  const idle = p.idle !== false;
  const T = fem ? TORSO_F : TORSO_M;
  const cut = CUT[look.outfit] ?? CUT.tee;

  // ---- acting ----
  const c0 = {face: p.face ?? 'neutral', pose: p.pose ?? 'stand', turn: p.turn ?? 0, hold: p.hold};
  const st = resolveActs(frame, {face: c0.face as Face, pose: c0.pose as Pose, turn: c0.turn, hold: c0.hold}, p.acts);
  // phase 2 (src/lib/p2.mjs; the p2 prove run, 2026-10-26: v136's me turned to the camera with face="cool" and "worried"):
  // a silhouette in strict PROFILE, never a face. The expression props are ignored, the turn is always the full profile
  // (its sign still says where the person faces); the mood is posture and light only.
  const p2Sil = p2();
  const fp: FaceParams = p2Sil ? FACE.neutral : mixFace(FACE[st.face.a] ?? FACE.neutral, FACE[st.face.b] ?? FACE.neutral, st.face.t);
  const ph = (n: number) => rand(seed * 31 + n) * Math.PI * 2;
  const breath = idle ? 1 + 0.01 * Math.sin((2 * Math.PI * frame) / 90 + ph(1)) : 1;
  const sway = idle ? 0.9 * Math.sin((2 * Math.PI * frame) / 80 + ph(2)) : 0;
  let blink = 1;
  if (idle) {
    let b = -240 + Math.floor(rand(seed * 7.3) * 80);
    let i = 0;
    while (b <= frame && i < 400) {
      const into = frame - b;
      if (into >= 0 && into < 6) blink = [1, 0.4, 0, 0, 0.4, 1][into];
      b += 85 + Math.floor(rand(seed * 17 + i) * 60);
      i++;
    }
  }

  // ---- the view: where the person faces (the turn's sign) and how far the body turns (its size) ----
  const pAt = Number.isFinite(st.pose.at) ? st.pose.at : -1e6;
  const tb = pAt < -1e5 ? 1 : spr(frame, pAt, 'enter');
  const ta = pAt < -1e5 ? 1 : spr(frame, pAt + 2, 'enter');
  const th = pAt < -1e5 ? 1 : spr(frame, pAt + 3, 'enter');
  const turnBase = st.turn.at > -1e9 && Number.isFinite(st.turn.at) ? lerp(st.turn.a, st.turn.b, spr(frame, st.turn.at, 'enter')) : st.turn.b;
  const face = turnBase < -0.02 ? -1 : 1;
  const flip = (p.flip ?? false) !== (face < 0);
  // the pose may turn the body further (a walk to the profile, a point to three quarters); never toward the front
  const poseTurn = (name: Pose) => (name === 'walk' ? 0.85 : name === 'point' || name === 'reject' ? 0.6 : 0);
  const turnMag = p2Sil ? 1 : clamp(Math.max(Math.abs(turnBase), lerp(poseTurn(st.pose.a), poseTurn(st.pose.b), tb), 0.5), 0.5, 1);
  const thDeg = lerp(58, 90, clamp((turnMag - 0.5) / 0.4, 0, 1));
  const cs = Math.cos((thDeg * Math.PI) / 180);
  const sn = Math.sin((thDeg * Math.PI) / 180);
  const profileK = clamp((turnMag - 0.7) / 0.1, 0, 1); // the head: three-quarter -> profile
  const xF = (y: number, e = 0) => {
    const s = secAt(T, y);
    return Math.sqrt(((s[1] + e) * cs) ** 2 + ((s[2] + e) * sn) ** 2);
  };
  const xB = (y: number, e = 0) => {
    const s = secAt(T, y);
    return -Math.sqrt(((s[1] + e) * cs) ** 2 + ((s[3] + e) * sn) ** 2);
  };
  const cF = (y: number) => secAt(T, y)[2] * sn; // the centre front line (where a V opens)
  // v2: the belly's bulge in front (u), strongest a hand above the belt, seen in profile and three quarters
  const bellyAt = (y: number) => (p.belly ?? 0) * 4.4 * Math.exp(-(((y + 56.5) / 6.6) ** 2)) * (0.35 + 0.65 * sn);
  const jx = (fem ? 8.4 : 9.8) * (look.build ?? 1);
  const shY = (fem ? SHY - 0.3 : SHY) - 0;
  const sNear: Pt = [-jx * cs + 0.5 * sn, shY];
  const sFar: Pt = [jx * cs - 0.2 * sn, shY - 0.3];

  // ---- the pose: poses.ts's angles, the reaching arms re-aimed at this body ----
  const Fchest = xF(-70);
  const reach = REACH(Fchest, HEAD_X);
  const armLen = (a: ArmV): [number, number] => [UPPER * a.up, FORE * a.fore];
  const solve = (name: Pose, at: number): PoseV => {
    const v = evalPose(name, {frame, t: frame - at, seed, sl: sFar, sr: sNear});
    const R = reach[name];
    if (!R) return v;
    const aim = (a: ArmV, s0: Pt, t?: Aim): ArmV => {
      if (!t) return a;
      const upK = t[4] ?? 0.98;
      const [l1, l2] = [UPPER * upK, FORE];
      const A = ik2(s0[0], s0[1], t[0], t[1], l1, l2, 1);
      const B = ik2(s0[0], s0[1], t[0], t[1], l1, l2, -1);
      const elbow = (q: [number, number]): Pt => [s0[0] + l1 * dir(q[0])[0], s0[1] + l1 * dir(q[0])[1]];
      const ea = elbow(A);
      const eb = elbow(B);
      const pick = t[2] === 'fwd' ? (ea[0] >= eb[0] ? A : B) : t[2] === 'up' ? (ea[1] <= eb[1] ? A : B) : ea[1] >= eb[1] ? A : B;
      return {...a, s: pick[0], e: pick[1], up: upK, fore: 1, ha: t[3] ?? pick[0] + pick[1]};
    };
    return {...v, r: aim(v.r, sNear, R.r), l: aim(v.l, sFar, R.l), tilt: v.tilt + (R.nod ?? 0)};
  };
  const pB = solve(st.pose.b, pAt);
  const pA = solve(st.pose.a, Number.isFinite(st.pose.aAt) ? st.pose.aAt : -1e6);
  const pv0: PoseV = tb >= 0.999 && ta >= 0.999 && th >= 0.999 ? pB : mixPose(pA, pB, tb, ta, th);
  // QR promo: `behind` sends raised arms behind the head (fixing her hair at the mirror: no forearm across the face)
  const pv: PoseV = p.behind ? {...pv0, l: pv0.l.z === 'over' ? {...pv0.l, z: 'front'} : pv0.l, r: pv0.r.z === 'over' ? {...pv0.r, z: 'front'} : pv0.r} : pv0;

  // ---- the expression: lids, brows, mouth; the mood is the light's level and the chin ----
  const lid0 = clamp(0.12 + (fp.eyeOpen - 0.5) * 0.72, 0, 1) * (1 - 0.85 * clamp(fp.eyeSmile, 0, 1));
  const ex: SilExpr = {
    lid: lid0 * blink,
    smile: clamp(fp.eyeSmile, 0, 1),
    brow: -fp.browY * 1.5,
    browTilt: fp.browTilt * 0.6,
    curve: fp.curve,
    open: fp.open * 0.8,
    look: -(fp.lookY + pv.lookY),
  };
  const worry = clamp(fp.browTilt / 18, 0, 1);
  const level = clamp(1 + 0.14 * clamp(fp.curve, 0, 1) * (1 - worry) - 0.24 * worry + 0.05 * clamp(-fp.browY - 1, 0, 1), 0.7, 1.25);
  const nodFace = 7 * clamp(fp.lookY, 0, 1) + 6 * worry - 7 * clamp(fp.bob, 0, 1) - 3 * clamp(fp.curve, 0, 1) * (1 - worry);
  const basePal = mkPal ? mkPal(time, 1) : filmSilPal(time, 1);
  const pal0 = relevel(basePal, (lv) => (mkPal ? mkPal(time, lv) : filmSilPal(time, lv)), level);
  const dimK = p.dim ?? 0;
  const pal: SilPal = dimK ? {...pal0, ink: mix(pal0.ink, ground(time), 0.12 * dimK), ink2: mix(pal0.ink2, ground(time), 0.12 * dimK)} : pal0;
  const toneCol = (t: number) => (t <= 2.5 ? 'white' : 'ink');

  // ---- the skeleton ----
  const R0: Mx = scl(1 + (1 - pv.squash) * 0.6, pv.squash, 0, 0);
  const shift = idle ? 0.9 * Math.sin((2 * Math.PI * frame) / 110 + ph(3)) * (1 - pv.ground) : 0;
  const hipY = HIPY;
  const hipN: Pt = [-4.6 * cs - 0.3 * sn, hipY];
  const hipF: Pt = [4.6 * cs + 0.3 * sn, hipY];
  const feetX = pv.feet * 0.78;
  const legOf = (side: 'n' | 'f') => {
    const h = side === 'n' ? hipN : hipF;
    const fk = side === 'n' ? pv.rl : pv.ll;
    let a1 = fk[0];
    let a2 = fk[1];
    if (pv.plant > 0.001) {
      const fx = side === 'n' ? -feetX * cs - 1.4 * sn : feetX * cs + 1.6 * sn;
      const A = ik2(h[0], h[1], fx, -2.2 - pv.lift, THIGH * pv.thigh, SHIN, 1);
      const B = ik2(h[0], h[1], fx, -2.2 - pv.lift, THIGH * pv.thigh, SHIN, -1);
      const kn = (q: [number, number]) => h[0] + THIGH * pv.thigh * dir(q[0])[0];
      const ik = kn(A) >= kn(B) ? A : B; // the knee bends forward
      a1 = lerp(a1, ik[0], pv.plant);
      a2 = lerp(a2, ik[1], pv.plant);
    }
    const knee: Pt = [h[0] + THIGH * pv.thigh * dir(a1)[0], h[1] + THIGH * pv.thigh * dir(a1)[1]];
    const ankle: Pt = [knee[0] + SHIN * dir(a1 + a2)[0], knee[1] + SHIN * dir(a1 + a2)[1]];
    return {hip: h, knee, ankle, a: a1 + a2};
  };
  const LN = legOf('n');
  const LF = legOf('f');
  const lowest = Math.max(LN.ankle[1], LF.ankle[1]) + pv.lift;
  const bob = pv.ground > 0 ? (-2.2 - lowest) * pv.ground : 0;
  const poise = (1 - pv.ground) * (1 - clamp(pv.hideLegs, 0, 1)) * sn; // the editorial stance: hips forward, chest back
  const Pm: Mx = chain(R0, tr(shift + 0.7 * poise, pv.lift + bob));
  const Tm: Mx = chain(R0, tr(shift + 0.7 * poise, pv.lift + bob), rot(pv.lean - 1.6 * poise + (p.bend ?? 0), 0, hipY), scl(1, breath * pv.chest, 0, hipY));
  const laugh = fp.bob > 0.01 ? fp.bob * Math.abs(Math.sin((Math.PI * 2 * frame) / 15)) * 0.5 : 0;
  const nod = pv.tilt + nodFace + sway * 0.6 - 5 * poise; // the chin a little up: the editorial head
  const headDrop = pv.headDrop + Math.max(0, nod) * 0.03;
  const pivot: Pt = [HEAD_X - 0.6, -89.6];
  // the head in torso space: over the neck, nodding about the top of the neck
  const Hm: Mx = chain(Tm, tr(0, headDrop * 0.8 - pv.shoulders * 0.2 - laugh), rot(nod, pivot[0], pivot[1]), tr(HEAD_X + 0.25 * headDrop, HEAD_Y), scl(HK));
  const shUp = -pv.shoulders;

  // ---- paint ----
  const nodes: React.ReactNode[] = [];
  const rimD: string[] = []; // the silhouette's parts, for the rim on a dark ground
  const rimLegD: string[] = []; // the trouser legs' rim: clipped to below the top's hem (it must not run up the blouse)
  const push = (n: React.ReactNode) => n && nodes.push(n);
  const inkFill = (key: string, d: string, col = pal.ink, rim = true) => {
    if (rim) rimD.push(d);
    return <path key={key} d={d} fill={col} />;
  };
  const whiteGrad = id('white');
  const skinGrad = id('skin');
  const neckGrad = id('neck');
  const garment = (key: string, d: string, tn: number, rim = true) => (toneCol(tn) === 'white' ? <path key={key} d={d} fill={`url(#${whiteGrad})`} /> : inkFill(key, d, pal.ink, rim));

  // contact shadow (paper, standing)
  if (crop === 'full' && !pal.dark && pv.hideLegs < 0.5) {
    const air = clamp(-(pv.lift + bob) / 40, 0, 1);
    push(<ellipse key="shadow" cx={shift + 1.5} cy={0.2} rx={11 * (1 - 0.4 * air)} ry={1.3 * (1 - 0.4 * air)} fill="#000000" opacity={0.09 * (1 - 0.5 * air)} />);
  }

  // ---- legs (trousers, or tights under a skirt) and shoes ----
  const legT = look.bottom === 'skirt' || look.outfit === 'dress' ? 7 : look.legs;
  const shoeT = look.shoe === 'sneaker' && look.shoeTone <= 2 ? look.shoeTone : 7;
  const bottomW = look.bottom === 'jeans' ? 0.35 : look.bottom === 'chinos' ? 0.3 : look.bottom === 'skirt' || look.outfit === 'dress' ? -0.35 : 0.55;
  const drawLeg = (L: ReturnType<typeof legOf>, key: string, far: boolean) => {
    const hip = ap(Pm, L.hip[0], L.hip[1]);
    const knee = ap(Pm, L.knee[0], L.knee[1]);
    const ank = ap(Pm, L.ankle[0], L.ankle[1]);
    const rT = fem ? [4.5, 2.6, 1.45] : [4.7, 2.85, 1.85];
    const d = pathOf(limb([[hip[0], hip[1] - 2], knee, ank], [rT[0] + bottomW, rT[1] + bottomW * 0.6, rT[2] + bottomW * 0.5], [0.5, fem ? 0.9 : 0.7]));
    const col = toneCol(legT) === 'white' && !far ? `url(#${whiteGrad})` : far ? pal.ink2 : pal.ink;
    if (col === pal.ink || col === pal.ink2) rimLegD.push(d);
    push(<path key={key} d={d} fill={col} />);
    // the shoe: a long, low last pointing where the person faces (foreshortened in three quarters)
    const fl = (fem ? 8.6 : 9.4) * (0.62 + 0.38 * sn);
    const pitch = clamp(L.a, -60, 60) * 0.5;
    const m = chain(tr(ank[0], ank[1]), rot(-pitch));
    const heel = look.shoe === 'heel';
    const sh: V[] = heel
      ? [[-1.9, -1.4], [1.2, -1.6], [fl * 0.55, 0.1], [fl, 1.25, 0.4], [fl * 0.62, 1.75], [0.2, 0.6], [-0.3, 2.0, 0.1], [-1.2, 2.1, 0.1], [-1.4, 0.6]]
      : [[-2, -1.3], [1, -1.5], [fl * 0.46, -0.45], [fl * 0.86, 0.5], [fl, 1.45, 0.45], [fl * 0.76, 1.95, 0.3], [-1.6, 1.95, 0.3], [-2.3, 0.6]];
    const sd = pathOf(sh, true, m);
    if (toneCol(shoeT) === 'white') push(<path key={`${key}s`} d={sd} fill={`url(#${whiteGrad})`} />);
    else {
      rimD.push(sd);
      push(<path key={`${key}s`} d={sd} fill={far ? pal.ink2 : pal.ink} />);
    }
  };

  // ---- arms ----
  type ArmOut = {nodes: React.ReactNode[]; wrist: Pt; ha: number; hand: HandKind; z: 'back' | 'front' | 'over' | 'behindHead'; key: string};
  const sleeve = look.sleeve;
  const sleeveT = look.tone;
  const buildArm = (a: ArmV, s0: Pt, far: boolean): ArmOut => {
    const key = far ? 'af' : 'an';
    const [lu, lf] = armLen(a);
    const S0: Pt = [s0[0], s0[1] + shUp];
    const elbow: Pt = [S0[0] + lu * dir(a.s)[0], S0[1] + lu * dir(a.s)[1]];
    const wrist: Pt = [elbow[0] + lf * dir(a.s + a.e)[0], elbow[1] + lf * dir(a.s + a.e)[1]];
    const P = (q: Pt) => ap(Tm, q[0], q[1]);
    const eW = cut.e * 0.55 + (cut.kind === 'puffer' ? 0.9 : 0);
    const r = fem ? [2.05, 1.65, 1.2] : [2.45, 1.95, 1.45];
    const out: React.ReactNode[] = [];
    const col = far ? pal.ink2 : pal.ink;
    const sleeveCol = (d: string, k2: string) => {
      if (toneCol(sleeveT) === 'white') return <path key={k2} d={d} fill={`url(#${whiteGrad})`} />;
      rimD.push(d);
      return <path key={k2} d={d} fill={col} />;
    };
    const skinArm = (pts: Pt[], rr: number[], k2: string) => <path key={k2} d={pathOf(limb(pts, rr, [0.35]))} fill={`url(#${skinGrad})`} />;
    if (sleeve === 'long') {
      out.push(sleeveCol(pathOf(limb([P([S0[0] + 0.4 * dir(a.s)[0], S0[1] + 1.2]), P(elbow), P(wrist)], [r[0] + eW, r[1] + eW, r[2] + eW * 0.8], [0, 0.25])), `${key}s`));
      if (!far && hi) out.push(<path key={`${key}e`} d={pathOf([P([S0[0] - (r[0] + eW) * 0.9, S0[1] + 3]), P([elbow[0] - (r[1] + eW) * 0.95 * Math.cos((a.s * Math.PI) / 180), elbow[1] + (r[1] + eW) * 0.95 * Math.sin((a.s * Math.PI) / 180)])], false)} stroke={toneCol(sleeveT) === 'white' ? pal.white[1] : pal.sheen} strokeWidth={0.3} fill="none" opacity={toneCol(sleeveT) === 'white' ? 0.9 : 0.5} />);
    } else {
      const t = sleeve === 'short' ? 0.55 : 1.35; // where the sleeve ends (0..1 the upper arm, 1..2 the forearm)
      const endP: Pt = t <= 1 ? lerpP(S0, elbow, t) : lerpP(elbow, wrist, t - 1);
      out.push(skinArm(t <= 1 ? [P(lerpP(S0, elbow, t - 0.05)), P(elbow), P(wrist)] : [P(lerpP(elbow, wrist, t - 1.05)), P(wrist)], t <= 1 ? [r[0] * 0.92, r[1] * 0.9, r[2] * 0.95] : [r[1] * 0.9, r[2] * 0.95], `${key}k`));
      out.push(sleeveCol(pathOf(limb(t <= 1 ? [P([S0[0], S0[1] - 0.6]), P(endP)] : [P([S0[0], S0[1] - 0.6]), P(elbow), P(endP)], t <= 1 ? [r[0] + eW, r[0] + eW + 0.25] : [r[0] + eW, r[1] + eW, r[1] + eW + 0.15])), `${key}s`));
    }
      const raised = wrist[1] < shY - 6 && elbow[1] < shY + 2 && a.z !== 'over';
    return {nodes: out, wrist: P(wrist), ha: a.ha + pv.lean, hand: a.hand, z: a.z === 'over' ? 'over' : raised ? (far ? 'back' : 'behindHead') : a.z === 'front' || !far ? 'front' : 'back', key};
  };
  const AN = buildArm(pv.r, sNear, false);
  const AF = buildArm(pv.l, sFar, true);
  const handSize = fem ? 0.84 : 0.94;
  const item = st.hold ?? null;
  const holdSide = item ? pv.hold ?? 'r' : null;
  // a held item turns with the torso's bend (a mechanic bent into a bay keeps the wrench in his fist, not upright beside it)
  const itemRot = pv.itemRot + (p.bend ?? 0);
  const itemAt = (hc: Pt, key: string) => {
    if (!item) return null;
    if (item === 'phone') {
      const pm = chain(tr(hc[0], hc[1]), rot(itemRot));
      return (
        <g key={key}>
          <path d={pathOf([[-1.55, -4.4, 0.2], [1.55, -4.4, 0.2], [1.55, 2.6, 0.2], [-1.55, 2.6, 0.2]], true, pm)} fill={pal.dark ? '#2A2A2A' : pal.ink} />
          <path d={pathOf([[-1.15, -4, 0.2], [1.15, -4, 0.2], [1.15, 2.2, 0.2], [-1.15, 2.2, 0.2]], true, pm)} fill={pal.lit[1]} opacity={0.22} />
        </g>
      );
    }
    const ink: Ink = {id: gid(rid, 'it'), uid: p.uid, k, hi, onDark: dark(time), cut: isLight() && time !== 'day' ? ground(time) : C.ilCut, lx: 1.1, ly: 1.5};
    return <g key={key}>{drawItem(ink, chain(tr(hc[0], hc[1]), rot(itemRot), scl(1.1)), item, {frame, side: p.itemSide})}</g>;
  };
  const handM = (A: ArmOut) => chain(tr(A.wrist[0], A.wrist[1]), rot(-A.ha), scl(-handSize, handSize));
  const handCtr = (A: ArmOut) => ap(handM(A), 0.2, 3.6);
  const drawHand = (A: ArmOut, side: 'r' | 'l') => {
    if (A.hand === 'none' && holdSide !== side) return null;
    const g: React.ReactNode[] = [];
    const holds = holdSide === side;
    if (holds) g.push(itemAt(handCtr(A), 'it'));
    const shape = HANDS[holds && A.hand === 'mitten' ? 'grip' : A.hand === 'none' ? 'grip' : A.hand] ?? HANDS.mitten;
    g.unshift(<path key="h" d={pathOf(shape, true, handM(A))} fill={`url(#${skinGrad})`} />);
    if (holdSide === 'both' && side === 'r') g.push(itemAt(lerpP(handCtr(A), handCtr(AF), 0.5), 'itb'));
    return <g key={`${A.key}h`}>{g}</g>;
  };

  // ---- the torso: the garment's silhouette, the neck, the opening ----
  const e = cut.e;
  const pad = cut.kind === 'jacket' || cut.kind === 'coat' ? 0.25 : 0;
  const hemY = cut.kind === 'dress' ? -57 : cut.hem;
  const long = cut.kind === 'coat';
  // the hem of a long coat swings back with the stride
  const stride = pv.ground > 0 ? (LN.knee[0] + LF.knee[0]) / 2 : 0;
  const hemBack = long ? clamp(Math.abs(LN.knee[0] - LF.knee[0]) * 0.3, 0, 5) : 0;
  const torsoPts = (): V[] => {
    const ys = [-80.6, -76, -71, -66, -61.5, -58.5, -55.5, -52.5, -50.5];
    const front: V[] = [];
    const back: V[] = [];
    const fShoulder = Math.max(xF(-80.6, e), sFar[0] + (fem ? 2.2 : 2.6) + pad);
    const bShoulder = Math.min(xB(-80.6, e), sNear[0] - (fem ? 2.2 : 2.6) - pad);
    for (const y of ys) {
      if (y < -78) continue;
      if (y > hemY) break;
      front.push([xF(y, e) + bellyAt(y), y]);
      back.push([xB(y, e), y]);
    }
    if (hemY > -50.5) {
      // below the hips: a coat falls straight to its hem (a little flare), a dress's top ends at the waist seam
      const fl = long ? 1.8 : 0.4;
      front.push([xF(-50.5, e) + fl * 0.5 + (long ? stride * 0.25 : 0), (hemY - 50.5) / 2]);
      front.push([xF(-50.5, e) + fl + (long ? stride * 0.4 : 0), hemY, 0.3]);
      back.push([xB(-50.5, e) - fl * 0.6 - hemBack * 0.4, (hemY - 50.5) / 2]);
      back.push([xB(-50.5, e) - fl - hemBack, hemY + 0.6, 0.3]);
    } else {
      front.push([xF(hemY, e) + bellyAt(hemY) * 0.85, hemY, 0.4]);
      back.push([xB(hemY, e), hemY, 0.4]);
    }
    // the top: the neck's base, then the trapezius sloping to the back shoulder and the collarbone to the front one
    const nbx = -2.2 * sn - 2.2 * cs;
    const nfx = 2.4 * sn + 2 * cs;
    return [
      [nfx + (fShoulder - nfx) * 0.45, -82.6 + shUp * 0.6], [fShoulder - 0.3, shY + 0.6 + shUp], [fShoulder, shY + 2.4 + shUp], ...front.slice(1),
      ...back.reverse().slice(0, -1), [bShoulder, shY + 2.4 + shUp], [bShoulder + 0.3, shY + 0.4 + shUp], [nbx + (bShoulder - nbx) * 0.45, -82.4 + shUp * 0.6],
      [nbx, -83.2 + shUp * 0.5], [nfx, -83.2 + shUp * 0.5],
    ];
  };
  const torsoD = pathOf(torsoPts(), true, Tm);
  // v2: a few faint oil stains on a light top (the mechanic's worn tee): soft blotches inside the torso
  const stainD = p.stains
    ? [
        [xF(-60, e) - 3.2, -60.5, 1.5, 1.1],
        [xF(-55, e) - 5.6, -54, 1.1, 0.8],
        [xF(-70, e) - 2.4, -69.5, 0.8, 0.65],
      ].map(([x, y, rx, ry]) => pathOf([[x - rx, y], [x - rx * 0.3, y - ry, 0.5], [x + rx, y - ry * 0.4, 0.5], [x + rx * 0.7, y + ry * 0.8, 0.5], [x - rx * 0.5, y + ry, 0.5]], true, Tm))
    : [];
  // the skirt (a dress's, or a skirt under a top): from the waist to the knee, a slight flare, swinging with the stride
  const skirt = look.outfit === 'dress' || look.bottom === 'skirt';
  const skirtD = skirt
    ? pathOf(
        [
          [xF(-61.5, 0.2), -61.5], [xF(-52, 0.6), -52], [xF(-50.5, 0.6) + 1.2 + stride * 0.3, -38], [xF(-50.5, 0.6) + 2.2 + stride * 0.45, -27.4, 0.3],
          [xB(-50.5, 0.6) - 2 - hemBack * 0.6, -27, 0.3], [xB(-50.5, 0.6) - 1, -40], [xB(-52, 0.8), -52], [xB(-61.5, 0.2), -61.5],
        ],
        true,
        Tm,
      )
    : '';
  const skirtT = look.outfit === 'dress' ? look.tone : look.legs;

  // the neck: from under the jaw and the skull's base down to the collar
  const nk = profileK > 0.5 ? HEAD_NECK.profile : HEAD_NECK.three;
  const nf = ap(Hm, nk.front[0], nk.front[1]);
  const nb = ap(Hm, nk.back[0], nk.back[1]);
  const nBase: [Pt, Pt] = [ap(Tm, -(fem ? 2.1 : 2.4) * sn - 2.2 * cs, -82.4 + shUp * 0.5), ap(Tm, (fem ? 2.3 : 2.6) * sn + 2 * cs, -82.4 + shUp * 0.5)];
  const nIn = ap(Hm, 0, 34); // inside the head: the neck's top edge hides under the jaw and the skull
  const neckD = pathOf([nb, [lerpP(nb, nBase[0], 0.55)[0] - 0.15, lerpP(nb, nBase[0], 0.55)[1]], nBase[0], [nBase[0][0] + 0.4, nBase[0][1] + 2], [nBase[1][0] - 0.4, nBase[1][1] + 2], nBase[1], lerpP(nf, nBase[1], 0.5), nf, nIn]);
  // the opening (a V of skin or of the inner garment), clipped to the torso
  const vY = cut.neck === 'high' ? -83 : cut.v;
  const vPts: V[] = [
    [-1.6 * sn - 1.4 * cs, -83.6], [cF(vY) - 0.2 * cs, vY, 0.2], [cF(vY) + 1.2 * cs + 0.4, vY + 0.8, 0.2], [xF(-77) + 2, -77],
    [xF(-80.6) + 2, -82], [2.8 * sn + 2 * cs, -84],
  ];
  const vD = pathOf(vPts, true, Tm);
  const innerT = cut.kind === 'top' || cut.kind === 'dress' ? -1 : look.inner === 'none' ? -1 : look.innerTone;
  const vFill = innerT < 0 ? `url(#${neckGrad})` : toneCol(innerT) === 'white' ? `url(#${whiteGrad})` : pal.ink2;

  // ---- the head ----
  const hairCol = look.hair === 'bald' ? pal.ink : look.hairTone <= 3 ? pal.grey : pal.ink;
  const hl: HeadLook = {
    fem,
    age: look.age,
    hair: HAIR_MAP[look.hair] ?? 'crop',
    hairCol,
    beard: (look.beard as HeadLook['beard']) ?? null,
    glasses: (look.glasses as HeadLook['glasses']) ?? null,
    hat: (look.hat as HeadLook['hat']) ?? null,
    hatCol: pal.ink,
    earring: look.earrings,
  };
  const headView = profileK >= 0.5 ? 'profile' : 'three';
  const mHead = `matrix(${Hm.map((v) => v.toFixed(4)).join(' ')})`;

  // ---- compose (back to front) ----
  const legsOn = crop === 'full' && pv.hideLegs < 0.5;
  if (legsOn) drawLeg(LF, 'legF', true);
  const armsOn = crop !== 'head';
  if (armsOn && AF.z === 'back') {
    AF.nodes.forEach(push);
    push(drawHand(AF, 'l'));
  }
  if (legsOn) drawLeg(LN, 'legN', false);
  // a hood behind the neck
  if (cut.neck === 'hood') push(inkFill('hood', pathOf([[-2.6, -83.6], [-6.4, -84.6], [-8.6, -81], [-7.4, -76.6], [-3, -78.6]], true, Tm), toneCol(look.tone) === 'white' ? pal.white[1] : pal.ink));
  push(<path key="neck" d={neckD} fill={`url(#${neckGrad})`} />);
  if (skirt && legsOn) push(garment('skirt', skirtD, skirtT));
  push(garment('torso', torsoD, look.tone));
  if (stainD.length && toneCol(look.tone) === 'white')
    push(
      <g key="stains" clipPath={`url(#${id('torsoClip')})`} opacity={0.32}>
        {stainD.map((d, i) => (
          <path key={i} d={d} fill={pal.lit[0]} />
        ))}
      </g>,
    );
  // a tucked blouse: a slim ink belt over the seam (the white top no longer ends in a hard cut on the trousers)
  if (look.outfit === 'blouse' && !skirt && legsOn && toneCol(look.tone) === 'white') {
    const yb = hemY;
    const belt = pathOf([[xB(yb - 1.5, e) - 0.05, yb - 1.5], [xF(yb - 1.5, e) + 0.05, yb - 1.65], [xF(yb, e) + 0.25, yb + 0.25, 0.2], [xB(yb, e) - 0.25, yb + 0.4, 0.2]], true, Tm);
    push(inkFill('belt', belt));
    if (hi) push(<path key="beltHi" d={pathOf([[xB(yb - 1.5, e) + 0.3, yb - 1.45], [xF(yb - 1.5, e) - 0.3, yb - 1.6]], false, Tm)} stroke={pal.sheen} strokeWidth={0.22} fill="none" opacity={0.9} />);
    if (hi) push(<path key="buckle" d={pathOf([[xF(yb, e) - 2.4, yb - 1.75, 0.2], [xF(yb, e) - 1.3, yb - 1.8, 0.2], [xF(yb, e) - 1.25, yb + 0.15, 0.2], [xF(yb, e) - 2.35, yb + 0.2, 0.2]], true, Tm)} fill="none" stroke={pal.lit[2]} strokeWidth={0.28} opacity={0.85} />);
    // two soft folds where the blouse gathers into the belt
    if (hi)
      for (const [fx, fl] of [[-1.6, 3.2], [2.2, 2.6]] as const)
        push(<path key={`fold${fx}`} d={pathOf([[fx, yb - 1.6], [fx + 0.5, yb - 1.6 - fl]], false, Tm)} stroke={pal.white[1]} strokeWidth={0.3} fill="none" opacity={0.7} />);
  }
  // the opening and what shows in it
  if (cut.neck !== 'high' && cut.neck !== 'crew' && cut.neck !== 'hood')
    push(
      <g key="v" clipPath={`url(#${id('torsoClip')})`}>
        <path d={vD} fill={vFill} />
        {look.tie !== null && look.tie !== undefined && innerT >= 0 && hi ? (
          <path d={pathOf([[cF(-82.6) + 0.1, -82.8], [cF(-80) + 0.8, -80.4], [cF(vY) + 0.9, vY + 1, 0.3], [cF(vY) - 0.4, vY + 0.4, 0.3], [cF(-80) - 0.2, -80.4]], true, Tm)} fill={pal.ink} />
        ) : null}
      </g>,
    );
  if (cut.neck === 'crew' && hi) push(<path key="crew" d={pathOf([[-2.4 * sn - 2 * cs, -83.4], [0.6, -81.6], [2.4 * sn + 2.2 * cs, -82.6]], false, Tm)} stroke={toneCol(look.tone) === 'white' ? pal.white[1] : pal.sheen} strokeWidth={0.4} fill="none" opacity={0.8} />);
  // a high collar (turtleneck, a puffer's stand collar, a turtleneck under a coat)
  const highCol = cut.neck === 'high' ? look.tone : (cut.kind === 'jacket' || cut.kind === 'coat') && look.inner === 'turtleneck' ? look.innerTone : -1;
  if (highCol >= 0) {
    const collar = pathOf([lerpP(nb, nBase[0], 0.55), [nBase[0][0] - 0.8, nBase[0][1] + 1.6], [nBase[1][0] + 0.8, nBase[1][1] + 1.6], lerpP(nf, nBase[1], 0.62), lerpP(nf, nBase[1], 0.48), lerpP(nb, nBase[0], 0.42)]);
    push(garment('collar', collar, highCol));
  }
  // lapel and seam lines: one hairline of sheen (the cloth's edge in the light)
  if (hi && (cut.kind === 'jacket' || cut.kind === 'coat')) {
    push(<path key="lap" d={pathOf([[-1.6 * sn - 1.4 * cs, -83.4], [cF(-76) - 1.2, -76.6], [cF(vY) - 0.2 * cs, vY]], false, Tm)} stroke={toneCol(look.tone) === 'white' ? pal.white[1] : pal.sheen} strokeWidth={0.32} fill="none" />);
    if (look.outfit === 'trench') push(<path key="belt" d={pathOf([[xB(-61.5, e) + 0.3, -61], [xF(-61.5, e) - 0.3, -61.6]], false, Tm)} stroke={toneCol(look.tone) === 'white' ? pal.white[1] : pal.sheen} strokeWidth={0.9} fill="none" />);
  }
  if (hi && cut.kind === 'puffer')
    for (const y of [-74, -66, -58, -51]) push(<path key={`pq${y}`} d={pathOf([[xB(y, e) + 0.4, y + 0.4], [xF(y, e) - 0.4, y - 0.4]], false, Tm)} stroke={toneCol(look.tone) === 'white' ? pal.white[1] : pal.sheen} strokeWidth={0.32} fill="none" />);
  if (hi && look.outfit === 'coverall') push(<path key="zip" d={pathOf([[cF(-79), -79], [cF(-60), -60], [cF(-49), -49]], false, Tm)} stroke={pal.sheen} strokeWidth={0.3} fill="none" />);
  if (look.scarf !== null && look.scarf !== undefined) {
    const sc = pathOf([lerpP(nb, nBase[0], 0.45), [nBase[0][0] - 1.4, nBase[0][1] + 2.2], [cF(-76) + 1.4, -74.6], [cF(-62) + 1.6, -62, 0.3], [cF(-62) + 3.6, -62.4, 0.3], [cF(-76) + 3.2, -77.4], [nBase[1][0] + 1.2, nBase[1][1] + 1], lerpP(nf, nBase[1], 0.5)].map((q, i): V => (i >= 2 && i <= 5 ? ap(Tm, q[0], q[1]) : [q[0], q[1]])));
    push(garment('scarf', sc, look.scarf));
  }
  // the far arm in front of the body (crossed arms, a phone in both hands)
  if (armsOn && AF.z === 'front') {
    AF.nodes.forEach(push);
    push(drawHand(AF, 'l'));
  }
  // a raised near arm: behind the head, in front of the body
  if (armsOn && AN.z === 'behindHead') {
    AN.nodes.forEach(push);
    push(drawHand(AN, 'r'));
  }
  // the head
  push(
    <g key="head" transform={mHead}>
      <SilHead view={headView} look={hl} ex={ex} pal={pal} uid={`${rid}h`} tilt={nod} detail={hi} />
      {p.cig !== null && p.cig !== undefined ? <Cigarette pro={headView === 'profile'} droop={p.cig} smoke={p.smoke ?? 0.6} frame={frame} seed={seed} /> : null}
    </g>,
  );
  // the near arm, then any arm over the head
  if (armsOn && AN.z !== 'over' && AN.z !== 'behindHead') {
    AN.nodes.forEach(push);
    push(drawHand(AN, 'r'));
  }
  if (armsOn && AF.z === 'over') {
    AF.nodes.forEach(push);
    push(drawHand(AF, 'l'));
  }
  if (armsOn && AN.z === 'over') {
    AN.nodes.forEach(push);
    push(drawHand(AN, 'r'));
  }

  // ---- place it ----
  const cropK = crop === 'head' ? 1.1 : 1; // the head crop's head as big as the old one's (an avatar, a driver)
  const kk = k * cropK;
  const y0 = crop === 'full' ? p.y : p.y + -HEAD_Y * kk;
  const mirror = flip ? ' scale(-1 1)' : '';
  const [deep, shadow, half, hiC] = pal.lit;
  return (
    <g transform={`translate(${p.x.toFixed(2)} ${y0.toFixed(2)}) scale(${kk.toFixed(4)})${mirror}`} opacity={p.opacity}>
      <defs>
        <linearGradient id={skinGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shadow} />
          <stop offset="0.6" stopColor={half} />
          <stop offset="1" stopColor={hiC} />
        </linearGradient>
        <linearGradient id={neckGrad} gradientUnits="userSpaceOnUse" x1={-4} y1={-90} x2={4} y2={-76}>
          <stop offset="0" stopColor={deep} />
          <stop offset="0.35" stopColor={shadow} />
          <stop offset="0.75" stopColor={half} />
          <stop offset="1" stopColor={hiC} />
        </linearGradient>
        <linearGradient id={whiteGrad} gradientUnits="userSpaceOnUse" x1={9} y1={-44} x2={-9} y2={-86}>
          <stop offset="0" stopColor={pal.white[0]} />
          <stop offset="0.5" stopColor={mix(pal.white[0], pal.white[1], 0.3)} />
          <stop offset="1" stopColor={pal.white[1]} />
        </linearGradient>
        <clipPath id={id('torsoClip')}>
          <path d={torsoD} />
        </clipPath>
        <clipPath id={id('legRim')}>
          <path d={pathOf([[-60, hemY + 0.6], [60, hemY + 0.6], [60, 12], [-60, 12]], true, Tm)} />
        </clipPath>
      </defs>
      {pal.dark && (rimD.length || rimLegD.length) ? (
        <g transform="translate(0.38 -0.3)" opacity={0.7}>
          {rimD.map((d, i) => (
            <path key={i} d={d} fill={pal.rim} />
          ))}
          {rimLegD.length ? (
            <g clipPath={skirt ? undefined : `url(#${id('legRim')})`}>
              {rimLegD.map((d, i) => (
                <path key={`l${i}`} d={d} fill={pal.rim} />
              ))}
            </g>
          ) : null}
        </g>
      ) : null}
      {nodes}
    </g>
  );
};

/** The head centre of a sil figure in stage px for crop 'full' at (x, y) with `size` (bubbles, effects). */
export const silHeadAt = (x: number, y: number, size: number): Pt => [x, y + (HEAD_Y / 100) * size];

/** A hand on its own in the new look (figure.tsx's Hand hands over to it from CHAR_FROM): the same props. (x, y) is the
 *  wrist in stage px, `angle` the hand's limb angle (0 = the fingers down, 180 = up), `scale` stage px per u, `side`
 *  which hand, `arm` a forearm stub of that many u behind the wrist in the `sleeve` tone (skin without one), `hold` an
 *  item in a grip. The hand is lit by the film's one light, the sleeve is ink (or white, turned by the light). */
export const SilHand: React.FC<{
  kind?: HandKind;
  x: number;
  y: number;
  angle?: number;
  scale: number;
  side?: 'l' | 'r';
  arm?: number;
  sleeve?: number;
  hold?: Item;
  uid?: string;
  frame?: number;
  time?: Time;
  lod?: 'hi' | 'lo';
}> = ({kind = 'mitten', x, y, angle = 0, scale, side = 'r', arm = 0, sleeve, hold, uid, frame = 0, time = 'day', lod}) => {
  const rid = useId();
  const mkPal = React.useContext(SilPalCtx);
  const pal = mkPal ? mkPal(time, 1) : filmSilPal(time, 1);
  const skin = sid(rid, 'hs');
  const white = sid(rid, 'hw');
  const [dx, dy] = dir(angle);
  const hiQ = (lod ?? (scale < 6 ? 'lo' : 'hi')) === 'hi';
  const nodes: React.ReactNode[] = [];
  const rims: string[] = [];
  if (arm > 0) {
    const d = pathOf(limb([[-arm * dx, -arm * dy], [0.4 * dx, 0.4 * dy]], [2.15, 1.8], [], true));
    const isWhite = sleeve !== undefined && sleeve <= 2.5;
    if (sleeve !== undefined && !isWhite) rims.push(d);
    nodes.push(<path key="arm" d={d} fill={sleeve === undefined ? `url(#${skin})` : isWhite ? `url(#${white})` : pal.ink} />);
  }
  const m = chain(rot(-angle), scl(side === 'l' ? -0.92 : 0.92, 0.92));
  if (hold) {
    const hc = ap(m, 0.2, 3.6);
    if (hold === 'phone') {
      const pm = chain(tr(hc[0], hc[1]), rot(-angle + 180));
      nodes.push(<path key="ph" d={pathOf([[-1.55, -4.4, 0.2], [1.55, -4.4, 0.2], [1.55, 2.6, 0.2], [-1.55, 2.6, 0.2]], true, pm)} fill={pal.dark ? '#2A2A2A' : pal.ink} />);
    } else {
      const ink: Ink = {id: gid(rid, 'it'), uid, k: Math.max(1e-3, scale), hi: hiQ, onDark: dark(time), cut: isLight() && time !== 'day' ? ground(time) : C.ilCut, lx: 1.1, ly: 1.5};
      nodes.push(<g key="it">{drawItem(ink, chain(tr(hc[0], hc[1]), scl(1.1)), hold, {frame})}</g>);
    }
  }
  if (kind !== 'none') nodes.push(<path key="hand" d={pathOf(HANDS[kind] ?? HANDS.mitten, true, m)} fill={`url(#${skin})`} />);
  const [, shadow, half, hiC] = pal.lit;
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`}>
      <defs>
        <linearGradient id={skin} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shadow} />
          <stop offset="0.6" stopColor={half} />
          <stop offset="1" stopColor={hiC} />
        </linearGradient>
        <linearGradient id={white} x1="1" y1="0.8" x2="0" y2="0.1">
          <stop offset="0" stopColor={pal.white[0]} />
          <stop offset="1" stopColor={pal.white[1]} />
        </linearGradient>
      </defs>
      {pal.dark && rims.length ? <path d={rims.join('')} fill={pal.rim} transform="translate(0.4 -0.3)" opacity={0.9} /> : null}
      {nodes}
    </g>
  );
};

/** v2 (diagpromo): the mechanic's cigarette, in HEAD space (the mouth's front corner at about (38, 30) in profile, (35, 30) in
 *  three quarters): a slim white stick with a filter and a faint ember, drooping from the lips (`droop` 0 out .. 1 hanging),
 *  and a thin smoke wisp that rises and sways (a soft white, never a hard line). Frame-driven. */
const Cigarette: React.FC<{pro: boolean; droop: number; smoke: number; frame: number; seed: number}> = ({pro, droop, smoke, frame, seed}) => {
  const mx0 = pro ? 37.6 : 34.2;
  const my0 = pro ? 31 : 30.4;
  const ang = ((14 + 46 * clamp(droop, 0, 1)) * Math.PI) / 180;
  const L = 27;
  const tip: Pt = [mx0 + Math.cos(ang) * L, my0 + Math.sin(ang) * L];
  const filt: Pt = [mx0 + Math.cos(ang) * 7.5, my0 + Math.sin(ang) * 7.5];
  const nx = -Math.sin(ang) * 1.7;
  const ny = Math.cos(ang) * 1.7;
  const body = `M${(mx0 + nx).toFixed(2)} ${(my0 + ny).toFixed(2)}L${(tip[0] + nx).toFixed(2)} ${(tip[1] + ny).toFixed(2)}L${(tip[0] - nx).toFixed(2)} ${(tip[1] - ny).toFixed(2)}L${(mx0 - nx).toFixed(2)} ${(my0 - ny).toFixed(2)}Z`;
  const fil = `M${(mx0 + nx).toFixed(2)} ${(my0 + ny).toFixed(2)}L${(filt[0] + nx).toFixed(2)} ${(filt[1] + ny).toFixed(2)}L${(filt[0] - nx).toFixed(2)} ${(filt[1] - ny).toFixed(2)}L${(mx0 - nx).toFixed(2)} ${(my0 - ny).toFixed(2)}Z`;
  const ash: Pt = [tip[0] - Math.cos(ang) * 2.2, tip[1] - Math.sin(ang) * 2.2];
  // the wisp: rises from the tip, sways, widens and fades
  const wisp: React.ReactNode[] = [];
  if (smoke > 0.01) {
    for (let w = 0; w < 2; w++) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        const y = tip[1] - 4 - u * 62;
        const x = tip[0] + 2 + Math.sin(u * 5.2 + frame / (17 + w * 5) + seed + w * 2) * (2 + 9 * u) + w * 3 * u;
        pts.push([x, y]);
      }
      const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join('');
      wisp.push(<path key={w} d={d} fill="none" stroke="#FFFFFF" strokeWidth={w ? 3.2 : 1.8} strokeLinecap="round" opacity={smoke * (w ? 0.09 : 0.16)} />);
    }
  }
  return (
    <g>
      {wisp}
      <path d={body} fill="#EDEAE4" />
      <path d={fil} fill="#C9A06A" />
      <circle cx={ash[0]} cy={ash[1]} r={1.75} fill="#8F8A84" />
      <circle cx={tip[0]} cy={tip[1]} r={1.8} fill="#FF7A2A" opacity={0.85} />
      <circle cx={tip[0]} cy={tip[1]} r={4.6} fill="#FF8A3C" opacity={0.18} />
    </g>
  );
};
