// src/scenes/illo/figure.tsx: the kit's characters ("Graphite" look). Not a stick figure: a flat-shaded adult with a
// face, hair, clothes and hands, built from filled shapes on a 2D skeleton (forward kinematics, two-bone IK for hands
// that reach a body point and for planted feet).
//
//   <Figure uid cast x y size crop face pose turn flip hold acts lod idle frame time fx/>
//     uid     the scene's IlloDefs uid (rim and skin gradients; without it the figure paints flat, no rim)
//     cast    a preset ('me', 'friend', 'girl', 'mom', 'grandpa', 'mechanic', 'seller', 'officer', 'boss', 'crowd') or
//             {is, seed, face, pose, hold, turn, flip}; props override the cast's fields
//     x, y    crop 'full': the feet's centre on the ground. 'bust' and 'head': the head's centre
//     size    the standing height in stage px (the head is about 1/5.5 of it); under 180 px the LOD drops to 'lo'
//     crop    'full' (default) | 'bust' (head to hips; the band cuts below) | 'head' (head, neck, shoulders: avatars)
//     face, pose, turn (-1..1: the face and body turn toward screen left / right), flip (mirror), hold (an Item)
//     acts    frame-based beats [{at, face, pose, fx, turn, hold}] (acting.ts; a scene converts chunk indexes with
//             actsAt): faces blend over 6 frames, poses with SPRING.enter and overlapping action (torso, arms +2, head +3)
//     idle    breath, blink, head sway, weight shift, eye saccades (default on; phases from the seed)
//     time    the ground under the figure ('day' | 'night' | 'dusk'): the rim on a dark ground, ink outlines on paper
//
// Units: the figure is drawn in u (100 u = its standing height, feet at the origin, y up negative) and placed with one
// translate + scale; every part is posed through the matrices of rig.tsx, so the key light stays top left on screen.
// Pure drawing code (Film scenes import the kit): frame-driven, no state, no randomness (rand(seed) only), colours only
// from C through palette.ts; one useId for the figure's clip paths.
import React, {useId} from 'react';
import {spr, rand} from '../../lib/anim';
import {C, isLight} from '../../tokens';
import {resolveActs, type Act} from './acting';
import {FACE, mixFace, type Face, type FaceParams} from './faces';
import {FaceFx, type FaceFxKind} from './fx';
import {dark, deepFreeze, ground, mix, tone, type Time} from './palette';
import {evalPose, mixPose, type ArmV, type HandKind, type Pose, type PoseV} from './poses';
import {drawItem, type Item} from './props';
import {E, I, K, K2, P, S, ap, chain, clamp, dir, ik2, lerp, piece, rot, scl, toD, toLine, tr, type Ink, type Mx, type Pt} from './rig';
import {gid, paint} from './solid';

// ---- presets ------------------------------------------------------------------------------------------------------------
export type Preset = 'me' | 'friend' | 'girl' | 'mom' | 'grandpa' | 'mechanic' | 'seller' | 'officer' | 'boss' | 'crowd';
export const PRESETS_LIST: readonly Preset[] = deepFreeze(['me', 'friend', 'girl', 'mom', 'grandpa', 'mechanic', 'seller', 'officer', 'boss', 'crowd'] as Preset[]);
export type Cast = Preset | {is: Preset; seed?: number; face?: Face; pose?: Pose; hold?: Item | null; turn?: number; flip?: boolean};

type Hair = 'side' | 'neat' | 'short' | 'long' | 'bob' | 'slick' | 'buzz' | 'curly' | 'bun' | 'ponytail' | 'grey';
type Hat = 'cap' | 'capBack' | 'flatCap' | 'peaked';
type Top = 'hoodie' | 'tee' | 'jacket' | 'top' | 'cardigan' | 'overalls' | 'leather' | 'uniform' | 'suit';
/** A character's look: ramp steps (0 lightest .. 7 darkest) for every garment. */
export type Look = {
  hair: Hair;
  hairTone: number;
  hat?: Hat;
  hatTone?: number;
  top: Top;
  topTone: number;
  inner?: number; // the layer under an open top (a tee, a blouse, a shirt) or the overalls' tone
  sleeve?: 'long' | 'short';
  legs: number;
  shoe: number;
  sole?: number; // a sneaker's light sole
  glasses?: 'round' | 'shades' | 'shadesUp';
  moustache?: number;
  stubble?: boolean;
  tie?: number;
  rag?: number;
  belt?: number;
  sh?: number; // shoulder width x
  wa?: number; // waist and hips x
};

/** The ten casts (spec 3.5). */
export const PRESETS: Readonly<Record<Exclude<Preset, 'crowd'>, Look>> = deepFreeze({
  me: {hair: 'side', hairTone: 6, top: 'hoodie', topTone: 4, legs: 5, shoe: 1, sole: 0},
  friend: {hair: 'short', hairTone: 6, hat: 'cap', hatTone: 6, top: 'jacket', topTone: 5, inner: 2, legs: 3, shoe: 6, sole: 1},
  girl: {hair: 'long', hairTone: 6, top: 'top', topTone: 0, sleeve: 'short', legs: 5, shoe: 1, sole: 0, sh: 0.9, wa: 0.88},
  mom: {hair: 'bob', hairTone: 5, glasses: 'round', top: 'cardigan', topTone: 3, inner: 1, legs: 6, shoe: 6, sh: 0.92, wa: 0.96},
  grandpa: {hair: 'grey', hairTone: 1, hat: 'flatCap', hatTone: 5, moustache: 1, top: 'cardigan', topTone: 4, inner: 1, legs: 6, shoe: 7},
  mechanic: {hair: 'short', hairTone: 6, hat: 'capBack', hatTone: 6, stubble: true, top: 'overalls', topTone: 2, inner: 5, sleeve: 'short', legs: 5, shoe: 7, rag: 2},
  seller: {hair: 'slick', hairTone: 6, glasses: 'shadesUp', moustache: 6, top: 'leather', topTone: 6, legs: 4, shoe: 7},
  officer: {hair: 'short', hairTone: 6, hat: 'peaked', hatTone: 6, top: 'uniform', topTone: 5, legs: 6, shoe: 7, belt: 7, sh: 1.05},
  boss: {hair: 'neat', hairTone: 6, top: 'suit', topTone: 6, inner: 0, tie: 4, legs: 6, shoe: 7, sh: 1.05},
});

const CROWD_HAIR: Hair[] = ['short', 'side', 'long', 'bob', 'curly', 'bun', 'ponytail', 'buzz'];
const CROWD_TOP: Top[] = ['tee', 'hoodie', 'top', 'jacket', 'cardigan', 'tee', 'hoodie', 'jacket'];
/** A crowd member from its seed: one of 8 hairstyles, a top il1..il5, trousers il4..il6. */
export const crowdLook = (seed: number): Look => {
  const r = (i: number) => rand(seed * 977 + i * 13.1);
  const hair = CROWD_HAIR[Math.floor(r(1) * CROWD_HAIR.length) % CROWD_HAIR.length];
  const fem = hair === 'long' || hair === 'bob' || hair === 'bun' || hair === 'ponytail';
  const top = fem && r(2) < 0.5 ? 'top' : CROWD_TOP[Math.floor(r(3) * CROWD_TOP.length) % CROWD_TOP.length];
  const topTone = 1 + Math.floor(r(4) * 5);
  return {
    hair,
    hairTone: r(5) < 0.15 ? 2 : r(5) < 0.45 ? 5 : 6,
    top,
    topTone,
    inner: topTone > 3 ? 1 : 5,
    sleeve: top === 'tee' || top === 'top' ? 'short' : 'long',
    legs: 4 + Math.floor(r(6) * 3),
    shoe: r(7) < 0.5 ? 1 : 6,
    sole: 0,
    glasses: r(8) < 0.15 ? 'round' : undefined,
    sh: fem ? 0.9 : 0.96 + r(9) * 0.1,
    wa: fem ? 0.9 : 0.96 + r(10) * 0.08,
  };
};

const SEEDS: Record<Preset, number> = {me: 1, friend: 2, girl: 3, mom: 4, grandpa: 5, mechanic: 6, seller: 7, officer: 8, boss: 9, crowd: 10};

// ---- hands (hand space: the wrist at the origin, +y along the hand, the thumb on -x) ---------------------------------
const HAND_FIST: Pt[] = [[-2.2, -0.3], [2.2, -0.3], [2.9, 1.6], [3.0, 4.0], [2.3, 5.4], [0, 5.85], [-2.3, 5.4], [-2.9, 3.8], [-2.8, 1.6]];
const HAND_RELAX: Pt[] = [[-1.9, -0.3], [1.9, -0.3], [2.55, 1.8], [2.75, 4.2], [2.4, 6.2], [1.1, 7.35], [-0.6, 7.25], [-1.8, 6.2], [-2.3, 4.0], [-2.3, 1.8]];
const handShapes = (m: Mx, kind: HandKind, hi: boolean): {d: string; lines: string; tip?: Pt} => {
  if (!hi) return {d: toD(S(m, HAND_RELAX)), lines: ''};
  switch (kind) {
    case 'mitten':
      return {d: toD(S(m, HAND_RELAX), K(m, -1.7, 1.3, 1.0, -3.0, 3.9, 0.85)), lines: toLine(P(m, 'M-0.15 5.3L-0.25 7.0')) + toLine(P(m, 'M1.25 5.2L1.3 6.7'))};
    case 'palm': {
      const fingers = [
        [-1.95, 3.0, -0.5],
        [-0.65, 3.8, -0.15],
        [0.65, 3.6, 0.15],
        [1.95, 2.8, 0.45],
      ].map(([x, l, dx]) => K(m, x, 4.0, 0.8, x + dx, 4.0 + l, 0.7));
      return {d: toD(S(m, [[-2.4, -0.2], [2.4, -0.2], [2.9, 2.4], [2.8, 4.6], [-2.8, 4.6], [-2.9, 2.4]]), ...fingers, K(m, -2.2, 1.6, 0.95, -4.4, 3.8, 0.8)), lines: ''};
    }
    case 'point':
      return {
        d: toD(S(m, HAND_FIST), K(m, -1.45, 4.0, 0.95, -1.45, 10.0, 0.85)),
        lines: toLine(P(m, 'M0.1 4.6L2.4 4.6')) + toLine(P(m, 'M0.1 3.0L2.7 3.0')) + toLine(P(m, 'M-2.6 1.6L-1.0 3.6')),
      };
    case 'pointYou':
      // the index toward the camera: short (foreshortened), thick, its nail showing
      return {
        d: toD(S(m, HAND_FIST), K(m, -1.3, 3.8, 1.15, -1.5, 8.2, 1.2)),
        lines: toLine(P(m, 'M0.2 4.6L2.4 4.6')) + toLine(P(m, 'M0.2 3.0L2.7 3.0')) + toLine(P(m, 'M-2.6 1.6L-1.0 3.6')),
        tip: [-1.5, 8.0],
      };
    case 'thumb':
      return {d: toD(S(m, HAND_FIST), K(m, -0.9, 4.6, 1.15, -1.0, 9.0, 1.02)), lines: toLine(P(m, 'M-0.1 1.5L2.7 1.5')) + toLine(P(m, 'M-0.1 2.8L2.9 2.8')) + toLine(P(m, 'M-0.1 4.1L2.6 4.1'))};
    case 'grip':
      return {d: toD(S(m, HAND_FIST), K(m, -2.6, 1.5, 1.05, -0.4, 3.5, 0.95)), lines: toLine(P(m, 'M0.8 1.3L2.7 1.3')) + toLine(P(m, 'M0.8 2.6L2.9 2.6')) + toLine(P(m, 'M0.8 3.9L2.7 3.9'))};
    default:
      return {d: '', lines: ''};
  }
};

// ---- the face -----------------------------------------------------------------------------------------------------------
type FaceDraw = {fp: FaceParams; blink: number; look: Pt; tn: number; hi: boolean};
const eyeY = -90.5;

/** Eyes, nose and mouth in head space (head centre (0, -90)). */
const drawFace = (ink: Ink, H: Mx, f: FaceDraw, look: Look, mouthClip: string): React.ReactNode[] => {
  const {fp, tn, hi} = f;
  const ta = Math.abs(tn);
  const fs = 2.4 * tn;
  const out: React.ReactNode[] = [];
  const feat = C.ilFeature;
  const open = fp.eyeOpen * f.blink;
  const lx = clamp(fp.lookX + f.look[0], -0.6, 0.6);
  const ly = clamp(fp.lookY + f.look[1], -0.6, 0.6);
  // eyes
  for (const side of [-1, 1] as const) {
    const far = ta > 0.05 && Math.sign(tn) === side;
    const wf = far ? 1 - 0.25 * ta : 1;
    const ex = fs + side * 3.2 * (1 - 0.12 * ta);
    const ey = eyeY;
    const rx = 0.95 * wf * (open > 1 ? 1 + 0.25 * (open - 1) : 1);
    const ry = 1.3 * open;
    const key = side < 0 ? 'eL' : 'eR';
    if (!hi) {
      out.push(<path key={key} d={toD(E(H, ex + lx * 0.5, ey + ly * 0.5, 0.95 * wf, Math.max(0.25, 1.05 * Math.min(1, open))))} fill={feat} />);
      continue;
    }
    if (ry < 0.34) {
      // a closed eye: a lid line, arched up when laughing, a soft downward arc in a blink
      const c = lerp(0.55, -1.25, clamp(fp.eyeSmile, 0, 1));
      out.push(
        <path
          key={key}
          d={toLine(P(H, `M${ex - 1.2 * wf} ${ey + 0.2}Q${ex} ${ey + 0.2 + c * 1.6} ${ex + 1.2 * wf} ${ey + 0.2}`))}
          stroke={feat}
          strokeWidth={0.62}
          strokeLinecap="round"
          fill="none"
        />,
      );
      continue;
    }
    if (fp.pupil < 0.97) {
      const sx = rx * 1.45;
      const sy = ry * 1.12;
      out.push(<path key={`${key}w`} d={toD(E(H, ex, ey, sx, sy))} fill={C.il0} stroke={feat} strokeWidth={0.32} />);
      const pr = Math.min(sx, sy) * fp.pupil;
      out.push(<path key={`${key}p`} d={toD(E(H, ex + lx * 0.5, ey + ly * 0.6, pr * 0.78, pr * 0.92))} fill={feat} />);
      out.push(<path key={`${key}c`} d={toD(E(H, ex + lx * 0.5 + pr * 0.32, ey + ly * 0.6 - pr * 0.36, 0.34))} fill={C.il0} />);
      continue;
    }
    const cx = ex + lx * 0.6;
    const cy = ey + ly * 0.6;
    const b = 1.333 * ry * (1 - 1.7 * clamp(fp.eyeSmile, 0, 1));
    const d = `M${cx - rx} ${cy}C${cx - rx} ${cy - 1.333 * ry} ${cx + rx} ${cy - 1.333 * ry} ${cx + rx} ${cy}C${cx + rx} ${cy + b} ${cx - rx} ${cy + b} ${cx - rx} ${cy}Z`;
    out.push(<path key={key} d={toD(P(H, d))} fill={feat} />);
    if (ry > 0.7 && b > -0.2) out.push(<path key={`${key}c`} d={toD(E(H, cx + 0.36 * rx, cy - 0.42 * ry, 0.42 * Math.min(1, ry / 1.3)))} fill={C.il0} />);
  }
  // nose: the shadow under its tip, a little to the side away from the light
  if (hi) out.push(<path key="nose" d={toD(P(H, `M${fs * 1.3 - 1.0} ${-86.9}C${fs * 1.3 - 0.6} ${-86.1} ${fs * 1.3 + 0.7} ${-86.0} ${fs * 1.3 + 1.05} ${-86.9}C${fs * 1.3 + 0.5} ${-86.6} ${fs * 1.3 - 0.4} ${-86.6} ${fs * 1.3 - 1.0} ${-86.9}Z`))} fill={C.ilSkin2} />);
  else out.push(<path key="nose" d={toD(E(H, fs * 1.3, -86.7, 0.7, 0.35))} fill={C.ilSkin2} />);
  // mouth: one path from six numbers; teeth and tongue clipped inside it
  const mcx = fs * 0.95;
  const cy = -84.2;
  const w = fp.mw * (1 - 0.22 * ta);
  const cv = clamp(fp.curve, -1, 1);
  const yl = cy - 1.5 * cv + 0.2 * fp.skew;
  const yr = cy - 1.5 * cv - 1.0 * fp.skew;
  const op = clamp(fp.open, 0, 1);
  const yu = cy + 0.15 * cv - 0.9 * op * (1 - 0.6 * Math.max(0, cv)) - 0.2 * fp.skew;
  const ylo = yu + 0.62 + 3.0 * op + 0.9 * Math.max(0, cv) * op;
  const rho = clamp(op * 1.4, 0, 1) * (1 - 0.65 * Math.max(0, cv));
  const Lx = mcx - w / 2 + 0.15 * fp.skew;
  const Rx = mcx + w / 2 + 0.15 * fp.skew;
  const hx = (1 - rho) * 0.3 * w;
  const Y = (mid: number) => (8 * mid - yl - yr) / 6;
  const mouthD = `M${Lx} ${yl}C${Lx + hx} ${Y(yu)} ${Rx - hx} ${Y(yu)} ${Rx} ${yr}C${Rx - hx} ${Y(ylo)} ${Lx + hx} ${Y(ylo)} ${Lx} ${yl}Z`;
  const md = toD(P(H, mouthD));
  out.push(<path key="mouth" d={md} fill={C.ilFeature} />);
  if (hi && op > 0.12) {
    const yt = yu + 0.4 * (ylo - yu);
    const teeth = `M${Lx} ${yl - 0.4}C${Lx + hx} ${Y(yu) - 0.6} ${Rx - hx} ${Y(yu) - 0.6} ${Rx} ${yr - 0.4}L${Rx} ${yr}C${Rx - hx} ${Y(yt)} ${Lx + hx} ${Y(yt)} ${Lx} ${yl}Z`;
    out.push(
      <g key="mouthIn">
        <clipPath id={mouthClip}>
          <path d={md} />
        </clipPath>
        <g clipPath={`url(#${mouthClip})`}>
          {fp.tongue > 0.05 ? <path d={toD(E(H, mcx + 0.2 * w * fp.skew, ylo + 0.2, w * 0.26, (ylo - yu) * 0.36))} fill={mix(C.ilSkin2, C.ilFeature, 0.45)} opacity={clamp(fp.tongue, 0, 1)} /> : null}
          {fp.teeth > 0.05 ? <path d={toD(P(H, teeth))} fill={C.il0} opacity={clamp(fp.teeth, 0, 1)} /> : null}
        </g>
      </g>,
    );
  }
  if (look.stubble && hi) {
    out.unshift(
      <path
        key="stubble"
        d={toD(S(H, [[-7.7, -86.6], [-6.1, -83.0], [-3.1, -81.2], [0, -80.95], [3.1, -81.2], [6.1, -83.0], [7.7, -86.6], [4.9, -85.2], [2.4, -83.0], [0, -82.6], [-2.4, -83.0], [-4.9, -85.2]]))}
        fill={C.ilSkin2}
        opacity={0.55}
      />,
    );
  }
  if (look.moustache !== undefined) {
    const t = look.moustache;
    out.push(
      piece(ink, 'moust', toD(S(H, [[mcx - 3.6, -84.9], [mcx - 1.7, -86.4], [mcx, -85.9], [mcx + 1.7, -86.4], [mcx + 3.6, -84.9], [mcx + 2.6, -84.5], [mcx, -85.1], [mcx - 2.6, -84.5]])), {
        fill: tone(t),
        shade: tone(t + 0.9),
        off: 0.35,
        cut: true,
        rim: true,
      }),
    );
  }
  return out;
};

/** Brows: rounded bars over the eyes; tilt lifts the inner ends, asym lifts the screen-right one (the smirk). */
const drawBrows = (ink: Ink, H: Mx, fp: FaceParams, tn: number): React.ReactNode[] => {
  const ta = Math.abs(tn);
  const fs = 2.4 * tn;
  return ([-1, 1] as const).map((side) => {
    const far = ta > 0.05 && Math.sign(tn) === side;
    const wf = far ? 1 - 0.25 * ta : 1;
    const bx = fs + side * 3.35 * (1 - 0.12 * ta);
    const by = eyeY - 3.6 + fp.browY - (side > 0 ? fp.browAsym * 1.0 : 0) - (fp.eyeOpen > 1 ? (fp.eyeOpen - 1) * 1.4 : 0);
    const a = side * fp.browTilt - (side > 0 ? 9 * fp.browAsym : 0);
    const m = chain(H, tr(bx, by), rot(a), scl(wf, 1));
    return <path key={side < 0 ? 'bL' : 'bR'} d={toD(K(m, -side * 1.85, 0.12, 0.66, side * 1.85, -0.1, 0.5))} fill={C.ilFeature} />;
  });
};

// ---- hair, hats, glasses (head space) ----------------------------------------------------------------------------------
const mirrorPts = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [-x, y] as Pt).reverse();
const sym = (half: Pt[]): Pt[] => [...half, ...mirrorPts(half)];

const HAIR_FRONT: Record<Hair, Pt[]> = {
  side: [[-8.7, -88.2], [-9.3, -93.2], [-8.3, -97.8], [-5.2, -100.9], [-0.6, -101.9], [4.4, -101.3], [7.8, -99.1], [9.4, -95.4], [9.0, -90.6], [8.4, -88.5], [7.7, -91.6], [6.4, -94.9], [3.2, -96.6], [-1.0, -97.4], [-4.6, -96.6], [-7.1, -93.8], [-7.7, -89.6]],
  neat: [[8.5, -88.6], [9.0, -93.4], [8.0, -97.9], [5.0, -100.6], [0.6, -101.4], [-4.2, -100.9], [-7.6, -98.9], [-9.1, -95.3], [-8.8, -90.6], [-8.3, -88.7], [-7.6, -91.8], [-6.2, -95.0], [-3.0, -96.8], [1.0, -97.4], [4.6, -96.6], [7.0, -93.8], [7.6, -89.6]],
  short: [[-8.6, -88.8], [-9.0, -93.5], [-7.9, -97.9], [-4.6, -100.6], [0, -101.3], [4.6, -100.6], [7.9, -97.9], [9.0, -93.5], [8.6, -88.8], [7.8, -92.0], [5.6, -95.8], [1.8, -96.9], [-1.8, -96.9], [-5.6, -95.8], [-7.8, -92.0]],
  buzz: [[-8.5, -89.4], [-8.8, -93.8], [-7.6, -97.8], [-4.4, -100.2], [0, -100.8], [4.4, -100.2], [7.6, -97.8], [8.8, -93.8], [8.5, -89.4], [7.9, -92.6], [5.8, -96.2], [1.8, -97.4], [-1.8, -97.4], [-5.8, -96.2], [-7.9, -92.6]],
  long: [[-0.4, -102.0], [5.6, -101.2], [9.4, -97.4], [10.6, -90.2], [10.8, -82.0], [11.4, -74.6], [10.2, -72.2], [8.2, -73.4], [7.6, -79.6], [7.9, -86.6], [7.0, -92.6], [3.6, -96.0], [-0.6, -97.4], [-3.2, -96.6], [-6.8, -93.0], [-7.9, -86.6], [-7.6, -79.6], [-8.2, -73.4], [-10.2, -72.2], [-11.4, -74.6], [-10.8, -82.0], [-10.6, -90.2], [-9.4, -97.4], [-5.6, -101.4]],
  bob: [[-0.4, -101.8], [5.6, -101.0], [9.4, -97.2], [10.6, -90.0], [10.7, -83.6], [9.1, -81.0], [7.8, -83.2], [7.8, -88.4], [6.8, -93.4], [2.0, -95.9], [-3.6, -95.4], [-6.8, -92.0], [-7.8, -88.4], [-7.8, -83.2], [-9.1, -81.0], [-10.7, -83.6], [-10.6, -90.0], [-9.4, -97.2], [-5.6, -101.0]],
  slick: [[-8.6, -89.4], [-9.2, -94.0], [-8.0, -98.6], [-4.6, -101.4], [0, -102.0], [4.6, -101.4], [8.0, -98.6], [9.2, -94.0], [8.6, -89.4], [7.8, -93.2], [6.0, -96.6], [2.6, -97.8], [-2.6, -97.8], [-6.0, -96.6], [-7.8, -93.2]],
  bun: [[-8.4, -88.4], [-9.0, -94], [-7.6, -99], [-3.8, -101.6], [0, -102], [3.8, -101.6], [7.6, -99], [9.0, -94], [8.4, -88.4], [7.6, -92.6], [4.8, -96.4], [0, -97.6], [-4.8, -96.4], [-7.6, -92.6]],
  ponytail: [[-8.4, -88.4], [-9.0, -94], [-7.6, -99], [-3.8, -101.6], [0, -102], [3.8, -101.6], [7.6, -99], [9.0, -94], [8.4, -88.4], [7.6, -92.6], [4.8, -96.4], [0, -97.6], [-4.8, -96.4], [-7.6, -92.6]],
  curly: [],
  grey: [],
};
const curlyPts = (): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (1.08 + (i / 14) * 0.84 * 1.0) + 0; // from the left temple over the top to the right
    const r = 10.4 + (i % 2 ? 1.0 : -0.1);
    out.push([Math.cos(a) * r * 0.98, -91.4 + Math.sin(a) * r * 1.02]);
  }
  return [...out, [8.0, -89.6], [6.4, -94.8], [2.4, -96.6], [-2.4, -96.6], [-6.4, -94.8], [-8.0, -89.6]];
};
const HAIR_BACK: Partial<Record<Hair, Pt[]>> = {
  long: [[-10.6, -96], [-7.6, -101.6], [0, -103.2], [7.6, -101.6], [10.6, -96], [11.6, -84], [12.6, -70], [11.2, -64.4], [0, -63.6], [-11.2, -64.4], [-12.6, -70], [-11.6, -84]],
  bob: [[-10.4, -95], [-7.6, -101.4], [0, -103], [7.6, -101.4], [10.4, -95], [11.1, -86], [10.4, -80.8], [0, -80.4], [-10.4, -80.8], [-11.1, -86]],
  ponytail: [[4.6, -99.0], [9.6, -97.4], [12.4, -89.0], [12.0, -77.0], [10.2, -72.0], [9.0, -79.0], [8.0, -90.0]],
};

// ---- the Figure ---------------------------------------------------------------------------------------------------------
export type FxNow = {kind: FaceFxKind; at: number};
export type FigureP = {
  uid?: string;
  cast: Cast;
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
  fx?: readonly FxNow[];
  look?: Pt; // an extra eye direction (u, +-0.6): toward a phone, a partner
  opacity?: number;
  /** A small tone shift for a back-row crowd member (one step darker on the dark film, lighter on paper). */
  dim?: number;
  itemSide?: 'back' | 'front';
};

const UPPER = 16;
const FORE = 14;
/** Held items are drawn a little larger than life, so they read at phone size. */
const ITEM_SCALE = 1.3;

/** A posable, expressive character (see the file's header). */
export const Figure: React.FC<FigureP> = (p) => {
  const rid = useId();
  const fid = gid(rid, 'fg');
  const c = typeof p.cast === 'string' ? {is: p.cast} : p.cast;
  const preset = c.is ?? 'me';
  const seed = c.seed ?? SEEDS[preset] ?? 1;
  const look: Look = preset === 'crowd' ? crowdLook(seed) : PRESETS[preset] ?? PRESETS.me;
  const frame = p.frame;
  const time = p.time ?? 'day';
  const k = Math.max(1e-3, p.size / 100);
  const hi = (p.lod ?? (p.size < 180 ? 'lo' : 'hi')) === 'hi';
  const crop = p.crop ?? 'full';
  const flip = p.flip ?? c.flip ?? false;
  const idle = p.idle !== false;
  const dimK = p.dim ?? 0;
  const T = (n: number) => tone(n + (isLight() && time === 'day' ? -dimK : dimK));

  // ---- acting: what the face, the pose, the turn and the item are now ----
  const st = resolveActs(frame, {face: p.face ?? c.face ?? 'neutral', pose: p.pose ?? c.pose ?? 'stand', turn: p.turn ?? c.turn ?? 0, hold: p.hold !== undefined ? p.hold : c.hold}, p.acts);
  const fp0 = mixFace(FACE[st.face.a] ?? FACE.neutral, FACE[st.face.b] ?? FACE.neutral, st.face.t);
  const ph = (n: number) => rand(seed * 31 + n) * Math.PI * 2;

  // ---- idle -----------------------------------------------------------------------------------------------------------
  const breath = idle ? 1 + 0.012 * Math.sin((2 * Math.PI * frame) / 90 + ph(1)) : 1;
  const sway = idle ? 1.2 * Math.sin((2 * Math.PI * frame) / 70 + ph(2)) : 0;
  const shift = idle ? 1.5 * Math.sin((2 * Math.PI * frame) / 110 + ph(3)) : 0;
  let blink = 1;
  let sacc: Pt = [0, 0];
  if (idle) {
    // blinks every 75..130 frames, 6 frames each; saccades every 35..60 frames
    let b = -240 + Math.floor(rand(seed * 7.3) * 80);
    let i = 0;
    while (b <= frame && i < 400) {
      const into = frame - b;
      if (into >= 0 && into < 6) blink = [1, 0.5, 0.05, 0.05, 0.5, 1][into];
      b += 75 + Math.floor(rand(seed * 17 + i) * 55);
      i++;
    }
    let s = -240 + Math.floor(rand(seed * 5.1) * 40);
    let j = 0;
    while (s <= frame && j < 400) {
      sacc = [(rand(seed * 23 + j) - 0.5) * 0.8, (rand(seed * 29 + j) - 0.5) * 0.4];
      s += 35 + Math.floor(rand(seed * 11 + j) * 25);
      j++;
    }
  }

  // ---- the pose: two evaluated poses blended with overlapping action ----------------------------------------------
  const pAt = Number.isFinite(st.pose.at) ? st.pose.at : -1e6;
  const tb = pAt < -1e5 ? 1 : spr(frame, pAt, 'enter');
  const ta = pAt < -1e5 ? 1 : spr(frame, pAt + 2, 'enter');
  const th = pAt < -1e5 ? 1 : spr(frame, pAt + 3, 'enter');
  const turnBase = st.turn.at > -1e9 && Number.isFinite(st.turn.at) ? lerp(st.turn.a, st.turn.b, spr(frame, st.turn.at, 'enter')) : st.turn.b;
  const sh = look.sh ?? 1;
  const wa = look.wa ?? 1;
  const shoulderAt = (tn: number): [Pt, Pt] => {
    const wS = 1 - 0.58 * Math.abs(tn);
    const cx = 0.9 * tn;
    return [
      [cx - 10.5 * wS * sh, -73],
      [cx + 10.5 * wS * sh, -73],
    ];
  };
  const pre = (name: Pose, at: number, tn: number) => {
    const [sl, sr] = shoulderAt(tn);
    return evalPose(name, {frame, t: frame - at, seed, sl, sr});
  };
  const pB0 = pre(st.pose.b, pAt, turnBase);
  const pA0 = pre(st.pose.a, Number.isFinite(st.pose.aAt) ? st.pose.aAt : -1e6, turnBase);
  const tnGuess = clamp(lerp(pA0.turnK ? pA0.turn : turnBase, pB0.turnK ? pB0.turn : turnBase, tb), -1, 1);
  const pA = pre(st.pose.a, Number.isFinite(st.pose.aAt) ? st.pose.aAt : -1e6, tnGuess);
  const pB = pre(st.pose.b, pAt, tnGuess);
  const pv: PoseV = tb >= 0.999 && ta >= 0.999 && th >= 0.999 ? pB : mixPose(pA, pB, tb, ta, th);
  const tn = clamp(lerp(turnBase, pv.turn, pv.turnK), -1, 1);
  const tAbs = Math.abs(tn);
  const wB = 1 - 0.38 * tAbs;
  const wH = 1 - 0.62 * tAbs;
  const cx = 0.9 * tn;

  // ---- the skeleton ---------------------------------------------------------------------------------------------------
  const F: Mx = flip ? scl(-1, 1) : I;
  const sq = pv.squash;
  const R0 = chain(F, scl(1 + (1 - sq) * 0.6, sq, 0, 0));
  const hx = shift * (1 - 0.7 * pv.ground);
  const hy = -46 + pv.lift;
  // legs in pelvis space (standing coordinates; the pelvis moves by (hx, hy + 46 + bob))
  const offY = hy + 46;
  const legAng = (side: -1 | 1): [number, number] => {
    const fk = side < 0 ? pv.ll : pv.rl;
    if (pv.plant < 0.001) return fk;
    const hipX = side * 5.2 * wH;
    const fx = side * pv.feet * (1 - 0.55 * tAbs) + (tAbs > 0.3 ? -side * 0 : 0);
    const bend: 1 | -1 = tAbs > 0.45 ? (tn > 0 ? 1 : -1) : side;
    const ikA = ik2(hipX, -46, fx - hx, -2.6 - offY, 22 * pv.thigh, 22, bend);
    if (pv.plant > 0.999) return ikA;
    return [lerp(fk[0], ikA[0], pv.plant), lerp(fk[1], ikA[1], pv.plant)];
  };
  const leg = (side: -1 | 1) => {
    const [a1, a2] = legAng(side);
    const hip: Pt = [side * 5.2 * wH, -46];
    const [d1x, d1y] = dir(a1);
    const knee: Pt = [hip[0] + 22 * pv.thigh * d1x, hip[1] + 22 * pv.thigh * d1y];
    const [d2x, d2y] = dir(a1 + a2);
    const ankle: Pt = [knee[0] + 22 * d2x, knee[1] + 22 * d2y];
    return {hip, knee, ankle};
  };
  const LL = leg(-1);
  const RL = leg(1);
  const lowest = Math.max(LL.ankle[1], RL.ankle[1]) + offY;
  const bob = pv.ground > 0 ? (-2.6 - lowest) * pv.ground : 0;
  const Pm = chain(R0, tr(hx, offY + bob));
  const Tm = chain(R0, tr(hx, offY + bob), rot(pv.lean, 0, -46), scl(1, breath * pv.chest, 0, -46));
  const Pel = chain(R0, tr(hx, offY + bob), rot(pv.lean * 0.4, 0, -46));
  const laugh = fp0.bob > 0.01 ? fp0.bob * Math.abs(Math.sin((Math.PI * 2 * frame) / 15)) : 0;
  const Hm = chain(Tm, tr(0.6 * tn, pv.headDrop - pv.shoulders * 0.25), rot(pv.tilt + sway, 0, -79), tr(0, -laugh * 0.8));
  const [slx, sly] = shoulderAt(tn)[0];
  const [srx] = shoulderAt(tn)[1];
  const shY = sly - pv.shoulders;

  // ---- ink ------------------------------------------------------------------------------------------------------------
  const onDark = dark(time);
  const ink: Ink = {id: fid, uid: p.uid, k, hi, onDark, cut: isLight() && time !== 'day' ? ground(time) : C.ilCut, lx: 1.2, ly: 1.6};
  const skin = dimK ? mix(C.ilSkin, ground(time), 0.22 * dimK) : C.ilSkin;
  const skin2 = dimK ? mix(C.ilSkin2, ground(time), 0.22 * dimK) : C.ilSkin2;
  const nodes: React.ReactNode[] = [];
  const push = (n: React.ReactNode) => {
    if (n) nodes.push(n);
  };

  // ---- the contact shadow (paper only) ----
  if (crop === 'full' && p.uid && isLight() && pv.hideLegs < 0.5) {
    const air = clamp(-(pv.lift + bob) / 40, 0, 1);
    const [gx] = ap(F, hx, 0);
    push(<ellipse key="shadow" cx={gx} cy={0.3} rx={14 * (1 - 0.45 * air)} ry={2.0 * (1 - 0.45 * air)} fill={paint(p.uid, 'shade')} opacity={1 - 0.5 * air} />);
  }

  // ---- back hair ----
  const hairT = look.hairTone;
  const back = look.hair === 'curly' ? null : HAIR_BACK[look.hair];
  if (back && crop !== 'head') push(piece(ink, 'hairB', toD(S(Hm, back.map(([x, y]) => [x - 1.0 * tn, y] as Pt))), {fill: T(hairT + 0.45), shade: T(hairT + 1.1), off: 1.2, cut: true, rim: true}));
  else if (back) push(piece(ink, 'hairB', toD(S(Hm, back.map(([x, y]) => [x - 1.0 * tn, y] as Pt))), {fill: T(hairT + 0.45), cut: true, rim: true}));

  // ---- arms (built now, drawn in their layers) ----
  type ArmOut = {sleeve: React.ReactNode[]; hand: React.ReactNode[]; center: Pt; z: 'back' | 'front' | 'over'};
  const topT = look.topTone;
  const sleeveT = topT;
  const short = (look.sleeve ?? 'long') === 'short';
  const buildArm = (side: -1 | 1, a: ArmV): ArmOut => {
    const S0: Pt = [side < 0 ? slx : srx, shY];
    const lu = UPPER * a.up;
    const lf = FORE * a.fore;
    const [ux, uy] = dir(a.s);
    const elbow: Pt = [S0[0] + lu * ux, S0[1] + lu * uy];
    const [fx, fy] = dir(a.s + a.e);
    const wrist: Pt = [elbow[0] + lf * fx, elbow[1] + lf * fy];
    const key = side < 0 ? 'aL' : 'aR';
    const arm = toD(K2(Tm, S0, 3.0, elbow, 2.6, wrist, 2.2));
    const sleeve: React.ReactNode[] = [];
    if (short) {
      sleeve.push(piece(ink, `${key}s`, arm, {fill: skin, shade: skin2, off: 0.9, cut: true, rim: true}));
      const se: Pt = [S0[0] + lu * 0.46 * ux, S0[1] + lu * 0.46 * uy];
      sleeve.push(piece(ink, `${key}v`, toD(K(Tm, S0[0], S0[1], 3.35, se[0], se[1], 3.05)), {fill: T(topT), shade: T(topT + 0.85), off: 0.9, cut: true, rim: true}));
    } else {
      sleeve.push(piece(ink, `${key}s`, arm, {fill: T(sleeveT), shade: T(sleeveT + 0.85), off: 0.9, cut: true, rim: true}));
      if (hi && (look.top === 'hoodie' || look.top === 'cardigan')) {
        const c0: Pt = [wrist[0] - 2.4 * fx, wrist[1] - 2.4 * fy];
        sleeve.push(piece(ink, `${key}c`, toD(K(Tm, c0[0], c0[1], 2.4, wrist[0], wrist[1], 2.3)), {fill: T(sleeveT + 0.35), shade: T(sleeveT + 1.1), off: 0.6, edge: false}));
      }
      if (hi && look.top === 'suit') {
        const c0: Pt = [wrist[0] - 0.4 * fx, wrist[1] - 0.4 * fy];
        sleeve.push(piece(ink, `${key}c`, toD(K(Tm, c0[0], c0[1], 2.25, wrist[0] + 0.9 * fx, wrist[1] + 0.9 * fy, 2.2)), {fill: tone(0), shade: tone(1.2), off: 0.5, cut: true}));
      }
    }
    // the hand: thumb toward the body's midline (it turns over when the arm rises)
    const haR = (a.ha * Math.PI) / 180;
    const mx = side * Math.cos(haR) - 0.3 * Math.sin(haR) >= 0 ? 1 : -1;
    const Hd = chain(Tm, tr(wrist[0], wrist[1]), rot(-a.ha), scl(a.hs * mx, a.hs));
    const hs = handShapes(Hd, a.hand, hi);
    const hand: React.ReactNode[] = [];
    if (a.hand !== 'none' && hs.d) {
      hand.push(piece(ink, `${key}h`, hs.d, {fill: skin, shade: skin2, off: 0.55, cut: true, rim: true}));
      if (hi && hs.lines) hand.push(<path key={`${key}l`} d={hs.lines} stroke={skin2} strokeWidth={0.42} strokeLinecap="round" fill="none" />);
      if (hi && 'tip' in hs && hs.tip) hand.push(<path key={`${key}n`} d={toD(E(Hd, hs.tip[0], hs.tip[1], 0.82, 0.62))} fill={mix(skin, C.il0, 0.5)} />);
    }
    const [hdx, hdy] = dir(a.ha);
    const center: Pt = [wrist[0] + 3.4 * a.hs * hdx, wrist[1] + 3.4 * a.hs * hdy];
    const far = tAbs > 0.3 && Math.sign(tn) === side;
    const z = a.z === 'over' ? 'over' : a.z === 'front' ? 'front' : far ? 'back' : 'front';
    return {sleeve, hand, center, z};
  };
  const showArms = crop !== 'head';
  const AL = showArms ? buildArm(-1, pv.l) : null;
  const AR = showArms ? buildArm(1, pv.r) : null;
  const item = st.hold ?? null;
  const itemNode = (where: 'l' | 'r' | 'both'): React.ReactNode => {
    if (!item || !AL || !AR) return null;
    const ctr: Pt = where === 'l' ? AL.center : where === 'r' ? AR.center : [(AL.center[0] + AR.center[0]) / 2, (AL.center[1] + AR.center[1]) / 2 - 1];
    const im = chain(Tm, tr(ctr[0], ctr[1]), rot(pv.itemRot * (where === 'l' ? -1 : 1)), scl(ITEM_SCALE));
    return drawItem(ink, im, item, {frame, side: p.itemSide});
  };
  const holdSide = item ? pv.hold ?? 'r' : null;
  const drawArmLayer = (z: 'back' | 'front' | 'over') => {
    if (!AL || !AR) return;
    const inL = AL.z === z;
    const inR = AR.z === z;
    if (holdSide === 'both' && inL && inR) {
      AL.sleeve.forEach(push);
      AR.sleeve.forEach(push);
      push(itemNode('both'));
      AL.hand.forEach(push);
      AR.hand.forEach(push);
      return;
    }
    if (inL) {
      AL.sleeve.forEach(push);
      if (holdSide === 'l' || (holdSide === 'both' && !inR)) push(itemNode('l'));
      AL.hand.forEach(push);
    }
    if (inR) {
      AR.sleeve.forEach(push);
      if (holdSide === 'r' || (holdSide === 'both' && !inL)) push(itemNode('r'));
      AR.hand.forEach(push);
    }
  };

  drawArmLayer('back');

  // ---- legs (far first) ----
  if (crop === 'full' && pv.hideLegs < 0.5) {
    const legT = look.top === 'overalls' ? look.inner ?? look.legs : look.legs;
    const order: (-1 | 1)[] = tn > 0.05 ? [1, -1] : tn < -0.05 ? [-1, 1] : [-1, 1];
    for (const side of order) {
      const L = side < 0 ? LL : RL;
      const key = side < 0 ? 'lL' : 'lR';
      const d = toD(K2(Pm, L.hip, 4.1, L.knee, 3.15, L.ankle, 2.55));
      push(piece(ink, key, d, {fill: T(legT), shade: T(legT + 0.85), off: 1, cut: true, rim: true}));
      // the shoe: front view a rounded toe out to the side, three-quarter view a long shoe pointing where he faces
      const toeDir = tAbs > 0.35 ? (tn > 0 ? 1 : -1) : side;
      const len = 1 + 0.6 * Math.min(1, tAbs * 1.4);
      const Sm = chain(Pm, tr(L.ankle[0], L.ankle[1]), scl(toeDir, 1));
      const shoeD = toD(S(Sm, [[-3.0, -1.1], [0.2, -2.0], [3.0 * len, -1.2], [4.7 * len, 0.8], [4.6 * len, 2.6], [-3.1, 2.6], [-3.5, 0.8]]));
      push(piece(ink, `${key}f`, shoeD, {fill: T(look.shoe), shade: T(look.shoe + 0.9), off: 0.6, cut: true, rim: true}));
      if (look.sole !== undefined && hi) push(piece(ink, `${key}o`, toD(P(Sm, `M-3.4 1.7L${4.75 * len} 1.7L${4.6 * len} 2.75L-3.2 2.75Z`)), {fill: T(look.sole), edge: false}));
      if (hi) push(<path key={`${key}hem`} d={toLine(P(Pm, `M${L.ankle[0] - 2.7} ${L.ankle[1] - 0.9}L${L.ankle[0] + 2.7} ${L.ankle[1] - 0.9}`))} stroke={T(legT + 1.2)} strokeWidth={0.4} fill="none" />);
    }
  }

  // ---- pelvis (the trousers' top) ----
  const legT0 = look.top === 'overalls' ? look.inner ?? look.legs : look.legs;
  if (crop !== 'head') {
    const pts: Pt[] = [[-9.2, -50.5], [9.2, -50.5], [9.55, -46.6], [9.0, -42.6], [4, -41.0], [0, -41.6], [-4, -41.0], [-9.0, -42.6], [-9.55, -46.6]];
    push(piece(ink, 'pel', toD(S(Pel, pts.map(([x, y]) => [cx * 0.6 + x * wB * wa, y] as Pt))), {fill: T(legT0), shade: T(legT0 + 0.85), off: 1.2, cut: true, rim: true}));
    if (look.belt !== undefined && hi) {
      push(piece(ink, 'belt', toD(P(Pel, `M${cx * 0.6 - 9.8 * wB} -51.6L${cx * 0.6 + 9.8 * wB} -51.6L${cx * 0.6 + 10 * wB} -49.2L${cx * 0.6 - 10 * wB} -49.2Z`)), {fill: T(look.belt), edge: false}));
      push(piece(ink, 'buckle', toD(P(Pel, `M${cx - 1.3} -51.9L${cx + 1.3} -51.9L${cx + 1.3} -48.9L${cx - 1.3} -48.9Z`)), {fill: tone(2), shade: tone(3.4), off: 0.3}));
    }
  }

  // ---- torso ----
  const X = (x: number) => cx + x * wB;
  const s1 = 12.5 * sh;
  const half: Pt[] = [[4.6, -78.8], [9.4, -78.0], [s1, -74.6], [s1 * 0.965, -68.6], [10.7 * (sh + wa) * 0.5, -62], [9.0 * wa, -54.5], [10.0 * wa, -48.6], [9.7 * wa, -45.2]];
  const hemY = look.top === 'suit' || look.top === 'leather' ? -43.4 : -44.6;
  const torsoPts: Pt[] = [[0, -78.6], ...half, [0, hemY], ...mirrorPts(half)].map(([x, y]) => [X(x), y === -45.2 && (look.top === 'suit' || look.top === 'leather') ? -43.8 : y] as Pt);
  const torsoD = toD(S(Tm, torsoPts));
  push(piece(ink, 'torso', torsoD, {fill: T(topT), shade: T(topT + 0.85), off: 1.7, cut: true, rim: true, rimK: look.top === 'leather' ? 1.7 : 1}));
  const det = (key: string, d: string, fill: string, extra: Partial<Parameters<typeof piece>[3]> = {}) => push(piece(ink, key, d, {fill, edge: false, ...extra}));
  const lineD = (key: string, d: string, col: string, px = 1.4) => push(<path key={key} d={toLine(P(Tm, d))} stroke={col} strokeWidth={px / k} strokeLinecap="round" fill="none" />);
  const xs = (x: number) => X(x).toFixed(2);
  if (look.top === 'hoodie' && hi) {
    det('hem', toD(P(Tm, `M${xs(-9.9 * wa)} -47.8L${xs(9.9 * wa)} -47.8L${xs(9.7 * wa)} -45.2L${xs(0)} -44.6L${xs(-9.7 * wa)} -45.2Z`)), T(topT + 0.3));
    push(<path key="pocket" d={toLine(P(Tm, `M${xs(-6.8)} -49.4L${xs(-5.2)} -56.8L${xs(5.2)} -56.8L${xs(6.8)} -49.4`))} stroke={T(topT + 1.1)} strokeWidth={1.6 / k} fill="none" strokeLinejoin="round" />);
  }
  if (look.top === 'jacket') {
    det('inner', toD(P(Tm, `M${xs(-3.9)} -78.6L${xs(3.9)} -78.6L${xs(3.1)} -44.9L${xs(-3.1)} -44.9Z`)), T(look.inner ?? 2), {shade: T((look.inner ?? 2) + 0.7), off: 0.8, cut: true, edge: true});
    for (const s of [-1, 1]) det(`col${s}`, toD(S(Tm, [[X(s * 4.6), -79.2], [X(s * 8.8), -79.3], [X(s * 7.6), -75.6], [X(s * 3.6), -69.8], [X(s * 3.1), -74.2]])), T(topT - 0.4), {shade: T(topT + 0.5), off: 0.6, cut: true, edge: true, rim: true});
  }
  if (look.top === 'cardigan') {
    det('inner', toD(P(Tm, `M${xs(-4.3)} -78.6L${xs(4.3)} -78.6L${xs(0.7)} -60L${xs(-0.7)} -60Z`)), T(look.inner ?? 1), {cut: true, edge: true});
    if (preset === 'grandpa') for (const s of [-1, 1]) det(`cl${s}`, toD(P(Tm, `M${xs(s * 4.4)} -78.7L${xs(s * 0.6)} -76.2L${xs(s * 2.4)} -74.2Z`)), T(look.inner ?? 1), {shade: T((look.inner ?? 1) + 1), off: 0.4, cut: true, edge: true});
    if (hi) {
      lineD('plk', `M${xs(0.3)} -60L${xs(0.3)} -44.8`, T(topT + 1.2));
      det('btn', toD(E(Tm, X(1.2), -56.4, 0.62), E(Tm, X(1.2), -51.4, 0.62)), T(topT + 1.6));
    }
  }
  if (look.top === 'top' && crop !== 'head') {
    det('scoop', toD(S(Tm, [[X(-5.0), -78.7], [X(5.0), -78.7], [X(3.7), -75.2], [X(0), -73.9], [X(-3.7), -75.2]])), skin, {shade: skin2, off: 0.6, cut: true, edge: true});
  }
  if (look.top === 'tee' && hi) {
    det('crew', toD(S(Tm, [[X(-5.0), -78.8], [X(-3.4), -76.4], [X(0), -75.6], [X(3.4), -76.4], [X(5.0), -78.8], [X(3.6), -78.9], [X(2.4), -77.6], [X(0), -77.0], [X(-2.4), -77.6], [X(-3.6), -78.9]])), T(topT + 0.55));
  }
  if (look.top === 'overalls') {
    const ov = look.inner ?? 5;
    det('bib', toD(P(Tm, `M${xs(-6.4)} -63.4L${xs(6.4)} -63.4L${xs(6.7)} -45L${xs(-6.7)} -45Z`)), T(ov), {shade: T(ov + 0.85), off: 1, cut: true, edge: true, rim: true});
    for (const s of [-1, 1]) det(`st${s}`, toD(K(Tm, X(s * 5.4), -62.8, 1.05, X(s * 7.8), -77.8, 1.05)), T(ov), {shade: T(ov + 0.8), off: 0.5, cut: true, edge: true, rim: true});
    if (hi) {
      det('btns', toD(E(Tm, X(-5.4), -62.5, 0.7), E(Tm, X(5.4), -62.5, 0.7)), tone(1));
      lineD('bibp', `M${xs(-3)} -59.6L${xs(3)} -59.6L${xs(3)} -55L${xs(-3)} -55Z`, T(ov + 1.2));
    }
  }
  if (look.top === 'leather') {
    for (const s of [-1, 1]) det(`col${s}`, toD(S(Tm, [[X(s * 4.4), -79.4], [X(s * 9.2), -79.5], [X(s * 8.1), -76.0], [X(s * 4.0), -74.0]])), T(topT - 0.5), {shade: T(topT + 0.4), off: 0.5, cut: true, edge: true, rim: true});
    if (hi) lineD('zip', `M${xs(0.7)} -75.8L${xs(0.9)} -44`, T(topT - 2.2), 1.6);
  }
  if (look.top === 'uniform') {
    for (const s of [-1, 1]) det(`col${s}`, toD(P(Tm, `M${xs(s * 4.6)} -79.2L${xs(s * 0.3)} -76.0L${xs(s * 3.6)} -72.6L${xs(s * 6.6)} -77.6Z`)), T(topT - 0.35), {shade: T(topT + 0.5), off: 0.4, cut: true, edge: true, rim: true});
    if (hi) {
      lineD('plk', `M${xs(0)} -76L${xs(0)} -50`, T(topT + 1.2));
      det('btn', toD(E(Tm, X(0.9), -71.5, 0.5), E(Tm, X(0.9), -65.5, 0.5), E(Tm, X(0.9), -59.5, 0.5), E(Tm, X(0.9), -53.5, 0.5)), T(topT - 1.4));
      for (const s of [-1, 1]) {
        lineD(`pk${s}`, `M${xs(s * 3.0)} -70.6L${xs(s * 8.0)} -70.6L${xs(s * 7.8)} -64.2L${xs(s * 3.2)} -64.2Z`, T(topT + 1.2));
        lineD(`pf${s}`, `M${xs(s * 3.0)} -68.6L${xs(s * 8.0)} -68.6`, T(topT + 1.2));
      }
    }
  }
  if (look.top === 'suit') {
    det('shirt', toD(P(Tm, `M${xs(-4.1)} -78.6L${xs(4.1)} -78.6L${xs(1.0)} -58.4L${xs(-1.0)} -58.4Z`)), tone(look.inner ?? 0), {shade: tone((look.inner ?? 0) + 1), off: 0.5, cut: true, edge: true});
    const tie = look.tie ?? 4;
    det('tie', toD(P(Tm, `M${xs(-0.8)} -76.0L${xs(0.8)} -76.0L${xs(1.6)} -62.4L${xs(0)} -60.4L${xs(-1.6)} -62.4Z`)), T(tie), {shade: T(tie + 0.9), off: 0.35, cut: true, edge: true});
    det('knot', toD(P(Tm, `M${xs(-1.25)} -78.3L${xs(1.25)} -78.3L${xs(0.85)} -75.9L${xs(-0.85)} -75.9Z`)), T(tie - 0.3), {cut: true, edge: true});
    for (const s of [-1, 1]) {
      det(`sc${s}`, toD(P(Tm, `M${xs(s * 4.3)} -78.8L${xs(s * 1.4)} -77.2L${xs(s * 3.0)} -75.4Z`)), tone(0), {cut: true, edge: true});
      det(`lp${s}`, toD(S(Tm, [[X(s * 4.3), -79.0], [X(s * 6.8), -77.4], [X(s * 5.6), -74.0], [X(s * 6.6), -70.6], [X(s * 1.3), -58.6], [X(s * 3.0), -66.0]])), T(topT - 0.45), {shade: T(topT + 0.4), off: 0.5, cut: true, edge: true, rim: true});
    }
    if (hi) det('btn', toD(E(Tm, X(0.7), -55.2, 0.6), E(Tm, X(0.7), -50.4, 0.6)), T(topT + 1.2));
  }
  if (look.rag !== undefined && crop === 'full') {
    det('rag', toD(S(Pel, [[X(7.0), -48.8], [X(9.8), -49.3], [X(10.7), -44], [X(9.6), -39.8], [X(8.0), -41.6], [X(7.2), -44.4]])), tone(look.rag), {shade: tone(look.rag + 1), off: 0.5, cut: true, edge: true, rim: true});
  }

  // ---- neck, collar ----
  push(piece(ink, 'neck', toD(K(Tm, cx + 0.3 * tn, -82.6, 2.9, cx, -76.8, 3.15)), {fill: skin2, cut: false}));
  if (look.top === 'hoodie') {
    const outer: Pt[] = [[-7.8, -80.4], [-6.5, -77.1], [-3.5, -75.0], [0, -74.3], [3.5, -75.0], [6.5, -77.1], [7.8, -80.4]];
    const inner: Pt[] = [[5.2, -80.8], [3.6, -78.1], [0, -76.7], [-3.6, -78.1], [-5.2, -80.8]];
    push(piece(ink, 'hood', toD(S(Tm, [...outer, ...inner].map(([x, y]) => [X(x), y] as Pt))), {fill: T(topT - 0.35), shade: T(topT + 0.55), off: 0.7, cut: true, rim: true}));
    if (hi)
      for (const s of [-1, 1]) {
        push(piece(ink, `ds${s}`, toD(K(Tm, X(s * 1.7), -75.6, 0.36, X(s * 2.0), -68.6, 0.33)), {fill: tone(1), edge: false}));
        push(piece(ink, `dt${s}`, toD(K(Tm, X(s * 2.0), -69.0, 0.45, X(s * 2.05), -67.6, 0.42)), {fill: T(topT + 1.6), edge: false}));
      }
  }

  // ---- the head ----
  const fs = 2.4 * tn;
  // ears (behind the head): the far ear hides when turned
  if (hi)
    for (const side of [-1, 1] as const) {
      const far = Math.sign(tn) === side;
      if (far && tAbs > 0.35) continue;
      const ex = side * 8.2 + (far ? 0 : -side * 3.4 * tAbs) + (far ? -side * 1.6 * tAbs : 0);
      push(piece(ink, side < 0 ? 'earL' : 'earR', toD(E(Hm, ex, -89.8, 1.75, 2.25)), {fill: skin, shade: skin2, off: 0.6, cut: true, rim: true}));
      push(<path key={side < 0 ? 'eiL' : 'eiR'} d={toD(E(Hm, ex + side * 0.2, -89.6, 0.75, 1.15))} fill={skin2} />);
    }
  const headPts: Pt[] = [[0, -99.3], [5.2, -98.4], [7.9, -95.3], [8.45, -90.5], [7.9, -85.8], [6.0, -82.6], [3.0, -80.95], [0, -80.6], [-3.0, -80.95], [-6.0, -82.6], [-7.9, -85.8], [-8.45, -90.5], [-7.9, -95.3], [-5.2, -98.4]];
  const headD = toD(S(Hm, headPts.map(([x, y]) => [x + (y > -86 ? 0.5 * tn * ((y + 86) / 5.4) : 0), y] as Pt)));
  push(piece(ink, 'head', headD, {fill: p.uid && hi ? paint(p.uid, 'ball-skin') : skin, shade: skin2, off: 0.9, cut: true, rim: true}));
  drawFace(ink, Hm, {fp: fp0, blink, look: [sacc[0] + (p.look?.[0] ?? 0), sacc[1] + (p.look?.[1] ?? 0) + pv.lookY], tn, hi}, look, `${fid}-mouth`).forEach(push);
  // round glasses (before the hair: the fringe may fall over the frame)
  if (look.glasses === 'round') {
    const g: React.ReactNode[] = [];
    const fsx = fs;
    const pts = ([-1, 1] as const).map((s) => fsx + s * 3.2 * (1 - 0.12 * tAbs));
    g.push(<path key="lens" d={toD(E(Hm, pts[0], -90.4, 2.45, 2.25), E(Hm, pts[1], -90.4, 2.45, 2.25))} fill={C.il0} fillOpacity={0.14} stroke={C.ilFeature} strokeWidth={0.45} />);
    g.push(<path key="bridge" d={toLine(P(Hm, `M${pts[0] + 2.4} -90.9Q${fsx} -92 ${pts[1] - 2.4} -90.9`))} stroke={C.ilFeature} strokeWidth={0.45} fill="none" />);
    if (hi) g.push(<path key="tmp" d={toLine(P(Hm, `M${pts[0] - 2.45} -90.8L-8.2 -91.3`)) + toLine(P(Hm, `M${pts[1] + 2.45} -90.8L8.2 -91.3`))} stroke={C.ilFeature} strokeWidth={0.42} fill="none" />);
    push(<g key="glasses">{g}</g>);
  }
  // hair (front)
  const hs = 1.2 * tn;
  const front = look.hair === 'curly' ? curlyPts() : HAIR_FRONT[look.hair];
  if (front && front.length) {
    push(piece(ink, 'hairF', toD(S(Hm, front.map(([x, y]) => [x + hs * Math.max(0, (y + 104) / 14), y] as Pt))), {fill: T(hairT), shade: T(hairT + 0.8), off: 0.9, cut: true, rim: true}));
    if (hi && look.hair !== 'buzz') push(<path key="sheen" d={toD(S(Hm, [[-5.8 + hs, -99.5], [-1.4 + hs, -100.9], [2.8 + hs, -100.5], [-1.2 + hs, -99.7]]))} fill={T(hairT - 1.1)} opacity={0.75} />);
  }
  if (look.hair === 'grey') {
    for (const s of [-1, 1]) {
      const pts: Pt[] = [[-8.9, -88.6], [-9.7, -92.4], [-8.7, -95.4], [-7.4, -94.0], [-7.7, -90.4]];
      push(piece(ink, `gh${s}`, toD(S(Hm, s < 0 ? pts : mirrorPts(pts))), {fill: T(hairT), shade: T(hairT + 1), off: 0.4, cut: true, rim: true}));
    }
  }
  if (look.hair === 'bun') push(piece(ink, 'bun', toD(E(Hm, 0.6 * tn, -103.2, 3.3, 2.9)), {fill: T(hairT), shade: T(hairT + 0.8), off: 0.6, cut: true, rim: true}));
  if (look.hair === 'slick' && hi) push(<path key="comb" d={toLine(P(Hm, `M${-3 + hs} -97.6C${-2.4 + hs} -99.6 ${-1 + hs} -100.8 ${1 + hs} -101.4`)) + toLine(P(Hm, `M${1.6 + hs} -97.8C${2.4 + hs} -99.6 ${3.6 + hs} -100.6 ${5 + hs} -100.8`))} stroke={T(hairT - 1.4)} strokeWidth={0.4} fill="none" strokeLinecap="round" />);
  // hats
  const hatT = look.hatTone ?? 6;
  const hh = (pts: Pt[], dx: number): Pt[] => pts.map(([x, y]) => [x + dx, y] as Pt);
  if (look.hat === 'cap' || look.hat === 'capBack') {
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-9.3, -95.2], [-9.0, -99.2], [-6.4, -102.8], [0, -104.0], [6.4, -102.8], [9.0, -99.2], [9.3, -95.2], [0, -95.9]], 0.6 * tn))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.9, cut: true, rim: true}));
    if (hi) push(<path key="hatSeam" d={toLine(P(Hm, `M${0.6 * tn} -103.9C${0.8 * tn} -100 ${0.9 * tn} -98 ${1.0 * tn} -96`))} stroke={T(hatT + 1.2)} strokeWidth={0.36} fill="none" />);
    push(<path key="hatBtn" d={toD(E(Hm, 0.6 * tn, -103.9, 0.75, 0.55))} fill={T(hatT + 1)} />);
    if (look.hat === 'cap') push(piece(ink, 'hatBrim', toD(S(Hm, hh([[-9.7, -95.6], [-5, -96.6], [0, -97.0], [5, -96.6], [9.7, -95.6], [6, -94.6], [0, -94.3], [-6, -94.6]], 1.6 * tn))), {fill: T(hatT - 0.3), shade: T(hatT + 0.9), off: 0.6, cut: true, rim: true}));
    else push(piece(ink, 'hatGap', toD(P(Hm, `M${-2.0 + 0.8 * tn} -95.6C${-2.0 + 0.8 * tn} -98.2 ${2.0 + 0.8 * tn} -98.2 ${2.0 + 0.8 * tn} -95.6Z`)), {fill: T(hairT), edge: false}));
  }
  if (look.hat === 'flatCap') {
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-9.9, -95.6], [-10.3, -98.6], [-7.4, -101.4], [-1.6, -102.4], [5.4, -102.0], [10.3, -99.8], [11.0, -97.2], [9.9, -95.4], [0, -96.2]], 0.6 * tn))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.9, cut: true, rim: true}));
    push(piece(ink, 'hatBrim', toD(S(Hm, hh([[-8.8, -95.9], [0, -96.9], [8.8, -95.9], [6.4, -94.9], [0, -94.6], [-6.4, -94.9]], 1.5 * tn))), {fill: T(hatT + 0.5), shade: T(hatT + 1.2), off: 0.5, cut: true, rim: true}));
    if (hi) push(<path key="hatSeam" d={toLine(P(Hm, `M${-6 + 0.6 * tn} -96.6C${-2 + 0.6 * tn} -99.8 ${4 + 0.6 * tn} -101 ${8.6 + 0.6 * tn} -100.2`))} stroke={T(hatT + 1.2)} strokeWidth={0.36} fill="none" />);
  }
  if (look.hat === 'peaked') {
    const dx = 0.6 * tn;
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-8.6, -98.6], [-11.8, -104.0], [-9.9, -106.2], [0, -107.0], [9.9, -106.2], [11.8, -104.0], [8.6, -98.6], [0, -99.0]], dx))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.9, cut: true, rim: true}));
    push(piece(ink, 'hatBand', toD(P(Hm, `M${-8.9 + dx} -99.6L${8.9 + dx} -99.6L${8.8 + dx} -96.2L${-8.8 + dx} -96.2Z`)), {fill: T(hatT + 0.7), cut: true, rim: true}));
    push(piece(ink, 'hatBadge', toD(E(Hm, dx, -102.6, 1.55)), {fill: tone(1), shade: tone(2.6), off: 0.4, cut: true}));
    push(<path key="hatBadgeIn" d={toD(E(Hm, dx, -102.6, 0.7))} fill={tone(3)} />);
    push(piece(ink, 'hatVisor', toD(S(Hm, hh([[-9.0, -96.6], [0, -97.0], [9.0, -96.6], [6.8, -95.1], [0, -94.6], [-6.8, -95.1]], 1.6 * tn))), {fill: tone(7), cut: true, rim: true}));
    if (hi) push(<path key="visorHi" d={toLine(P(Hm, `M${-5 + 1.6 * tn} -96.3Q${1.6 * tn} -96.7 ${5 + 1.6 * tn} -96.3`))} stroke={C.il0} strokeOpacity={0.35} strokeWidth={0.4} fill="none" strokeLinecap="round" />);
  }
  // sunglasses: on the eyes (the cool face slides them down) or pushed up on the head
  const shadesOn = Math.max(fp0.shades, look.glasses === 'shades' ? 1 : 0);
  const drawShades = (y: number, sc: number, op: number, key: string) => {
    const g: React.ReactNode[] = [];
    const lens: Pt[] = [[-2.7, -1.5], [2.5, -1.6], [2.4, 0.9], [0.8, 1.9], [-1.8, 1.7], [-2.8, 0.3]];
    for (const s of [-1, 1] as const) {
      const far = tAbs > 0.05 && Math.sign(tn) === s;
      const ex = fs + s * 3.3 * (1 - 0.12 * tAbs);
      const m = chain(Hm, tr(ex, y), scl(sc * (far ? 1 - 0.25 * tAbs : 1) * -s, sc));
      g.push(<path key={`${key}l${s}`} d={toD(S(m, lens))} fill={C.ilFeature} />);
      if (hi) g.push(<path key={`${key}g${s}`} d={toD(P(m, 'M-0.6 -1.3L0.5 -1.3L-0.9 1.3L-1.9 1.3Z'))} fill={C.il0} opacity={0.42} />);
    }
    g.push(<path key={`${key}b`} d={toLine(P(Hm, `M${fs - 1} ${y - 0.9}Q${fs} ${y - 1.5} ${fs + 1} ${y - 0.9}`))} stroke={C.ilFeature} strokeWidth={0.7} fill="none" />);
    push(
      <g key={key} opacity={op}>
        {g}
      </g>,
    );
  };
  if (shadesOn > 0.02) drawShades(-90.6 - (1 - shadesOn) * 5, 1, clamp(shadesOn * 1.6, 0, 1), 'shades');
  if (look.glasses === 'shadesUp') drawShades(-98.6, 0.92, 1, 'shadesUp');
  // brows last (over a fringe or a brim: the expression must read)
  drawBrows(ink, Hm, fp0, tn).forEach(push);

  // ---- arms in front, then over the head ----
  drawArmLayer('front');
  drawArmLayer('over');

  // ---- effects at the head (or at a hand) ----
  const fxList = [...st.fx, ...(p.fx ?? [])];
  const headC = ap(Hm, 0, -90);
  const side = (flip ? -1 : 1) * (tn < -0.1 ? -1 : 1);
  fxList.forEach((e, i) => {
    let at: Pt = headC;
    if (e.kind === 'zap' && AR) at = ap(Tm, AR.center[0], AR.center[1]);
    push(<FaceFx key={`fx${i}${e.kind}`} kind={e.kind} frame={frame} x={at[0]} y={at[1]} size={18.4} at={e.at} side={side as 1 | -1} time={time} uid={p.uid} tone={e.kind === 'zap' || e.kind === 'hearts' ? 'down' : undefined} />);
  });

  const x0 = p.x;
  const y0 = crop === 'full' ? p.y : p.y + 90 * k;
  return (
    <g transform={`translate(${x0.toFixed(2)} ${y0.toFixed(2)}) scale(${k.toFixed(4)})`} opacity={p.opacity}>
      {nodes}
    </g>
  );
};

/** A figure's head centre in stage px for crop 'full' at (x, y) with `size` (for bubbles, effects, a camera origin). */
export const headAt = (x: number, y: number, size: number): Pt => [x, y - 0.9 * size];
