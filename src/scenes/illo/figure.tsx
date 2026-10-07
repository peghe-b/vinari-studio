// src/scenes/illo/figure.tsx: the kit's people ("Graphite" look). Not a stick figure: a refined, softly shaded adult
// with a face, hair, real clothes and hands with fingers, built from filled shapes on a 2D skeleton (forward kinematics,
// two-bone IK for hands that reach a body point and for planted feet). Proportions of about 6.3 heads (the owner,
// 2026-10-07: "refine them", "a NEW character every time, refined, in a suit"): a smaller head, long legs, a V-taper or
// a waist, tailored jackets, coats, knitwear, dresses, shoes with soles.
//
//   <Figure uid cast x y size crop face pose turn flip hold acts lod idle frame time fx film/>
//     uid     the scene's IlloDefs uid (rim and skin gradients; without it the figure paints flat, no rim)
//     cast    a role ('me', 'friend', 'girl', 'ex', 'man', 'woman', 'mom', 'dad', 'grandpa', 'grandma', 'mechanic',
//             'seller', 'buyer', 'officer', 'boss', 'neighbour', 'crowd') or {is, seed, face, pose, hold, turn, flip}
//             plus the wardrobe picks (wardrobe.d.mts CastPick): outfit (suit | suitOpen | blazer | leather | bomber |
//             denim | trench | overcoat | puffer | shirt | polo | turtleneck | knit | hoodie | tee | cardigan | blouse |
//             dress | coverall | uniform), hair (crop | side | quiff | slick | fade | buzz | curly | wavy | manbun |
//             textured | receding | bald | long | waves | bob | lob | pixie | pony | bun | curls | lowbun), hairTone 0..7,
//             skin 0..3, tone (the outfit's 0..7), legs, beard (stubble | short | full | tache | goatee | none),
//             glasses (round | rect | shades | aviator | shadesUp | none), hat (cap | capBack | beanie | flatCap | peaked |
//             none), shoe, bottom (trousers | jeans | chinos | skirt), gender ('m' | 'f'), age (young | adult | old),
//             extras [watch, chain, earrings, hoops, bag, scarf, tie], look (a number: another person of the same role)
//             A NEW person every film: what the spec leaves out is the role's look in THIS film (wardrobe.mjs: seeded by
//             the film's number and the role, the same person all through the film, never the outfit and hair of the
//             three films before; "me" is a woman when a woman's voice reads the film)
//     x, y    crop 'full': the feet's centre on the ground. 'bust' and 'head': the head's centre
//     size    the standing height in stage px (the head is about 1/6.3 of it); under 180 px the LOD drops to 'lo'
//     crop    'full' (default) | 'bust' (head to hips; the band cuts below) | 'head' (head, neck, shoulders: avatars)
//     face, pose, turn (-1..1: the face and body turn toward screen left / right), flip (mirrors all of it, the turn
//             too: a flipped walk goes left), hold (an Item), gaze (an extra eye shift toward a phone or a partner)
//     acts    frame-based beats [{at, face, pose, fx, turn, hold}] (acting.ts; a scene converts chunk indexes with
//             actsAt): faces blend over 6 frames, poses with SPRING.enter and overlapping action (torso, arms +2, head +3)
//     idle    breath, blink, head sway, weight shift, eye saccades (default on; phases from the seed)
//     time    the ground under the figure ('day' | 'night' | 'dusk'): the rim on a dark ground, ink outlines on paper
//     film    whose people (a film id or number; default the film being rendered): the gallery shows other films' casts
//
// Units: the figure is drawn in u (100 u = its standing height, feet at the origin, y up negative, the head's centre at
// (0, -90)) and placed with one translate + scale; every part is posed through the matrices of rig.tsx, so the key light
// stays top left on screen. Pure drawing code (Film scenes import the kit): frame-driven, no state, no randomness (the
// wardrobe's hash and rand(seed) only), colours only from C through palette.ts; one useId for the figure's clip paths.
import React, {useId} from 'react';
import {useVideoConfig} from 'remotion';
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
import {castDress, dressOf, filmKey, lookLine, BEARDS, GLASSES, HAIRS, HATS, OUTFITS, ROLES, SHOES, type CastPick, type Dress, type Role} from './wardrobe.mjs';

export {lookLine, BEARDS, GLASSES, HAIRS, HATS, OUTFITS, SHOES};
export type {CastPick, Dress};

// ---- roles (the old "presets": every old name still works) ----------------------------------------------------------
export type Preset = Role;
export const PRESETS_LIST: readonly Preset[] = ROLES;
export type Cast = Preset | ({is: Preset; seed?: number; face?: Face; pose?: Pose; hold?: Item | null; turn?: number; flip?: boolean} & CastPick);
/** A person's look (wardrobe.mjs Dress). */
export type Look = Dress;
/** Each role's look in a neutral film (the gallery's reference; a film draws its own people). */
export const PRESETS: Readonly<Record<Preset, Look>> = deepFreeze(Object.fromEntries(ROLES.map((r) => [r, dressOf(r, 1)])) as Record<Preset, Look>);
/** A crowd member from its seed (a neutral film's crowd). */
export const crowdLook = (seed: number): Look => dressOf('crowd', 1, {variant: seed});
/** The look of a role in a film (id or number): what a Figure with that cast draws there. */
export const castLook = (cast: Cast, film: string | number, voice?: string): Look => castDress(cast, filmKey(film), {voice});

const SEEDS: Record<string, number> = {me: 1, friend: 2, girl: 3, mom: 4, grandpa: 5, mechanic: 6, seller: 7, officer: 8, boss: 9, crowd: 10, ex: 11, man: 12, woman: 13, dad: 14, grandma: 15, buyer: 16, neighbour: 17};

// ---- the body ---------------------------------------------------------------------------------------------------------
const SHY = -75.4; // the shoulder joints
const HIPY = -50.6; // the hip joints (the crotch about 5 u under them: the legs are 46 % of the height)
const THIGH = 24.4;
const SHIN = 23.9;
const UPPER = 16;
const FORE = 14;
/** The head (head space is drawn at 1:1 and scaled by this about the chin's top: about 6.6 heads in all). */
const HEAD_K = 0.93;
/** Held items are drawn a little larger than life, so they read at phone size. */
const ITEM_SCALE = 1.25;
type Body = {jx: number; neck: number; waist: number; hip: number; hipJ: number; arm: [number, number, number]; leg: [number, number, number]; hw: number};
const BODY: {m: Body; f: Body} = {
  // jx: the shoulder joint (the trunk's shoulder point is about 1 u outside it; the arms hang outside the chest)
  m: {jx: 9.6, neck: 2.75, waist: 8.1, hip: 8.7, hipJ: 4.9, arm: [2.75, 2.25, 1.7], leg: [4.7, 3.35, 2.25], hw: 7.25},
  f: {jx: 8.2, neck: 2.2, waist: 6.7, hip: 9.6, hipJ: 5.1, arm: [2.3, 1.88, 1.42], leg: [4.55, 3.05, 1.92], hw: 6.95},
};
// how much a garment stands off the body (u): a sleeve's extra radius, the torso's ease, a jacket's padded shoulder
const EASE: Record<string, {e: number; sl: number; pad: number; hem: number}> = {
  suit: {e: 0.6, sl: 0.5, pad: 0.6, hem: -45.0},
  suitOpen: {e: 0.6, sl: 0.5, pad: 0.6, hem: -45.0},
  blazer: {e: 0.6, sl: 0.5, pad: 0.55, hem: -45.4},
  leather: {e: 0.55, sl: 0.5, pad: 0.35, hem: -48.6},
  bomber: {e: 1.0, sl: 0.7, pad: 0.2, hem: -48.8},
  denim: {e: 0.7, sl: 0.55, pad: 0.25, hem: -48.4},
  trench: {e: 0.9, sl: 0.55, pad: 0.45, hem: -27.0},
  overcoat: {e: 0.9, sl: 0.6, pad: 0.5, hem: -25.6},
  puffer: {e: 1.9, sl: 1.2, pad: 0.4, hem: -47.4},
  shirt: {e: 0.35, sl: 0.28, pad: 0, hem: -48.4},
  polo: {e: 0.3, sl: 0.4, pad: 0, hem: -48.8},
  turtleneck: {e: 0.2, sl: 0.2, pad: 0, hem: -49.0},
  knit: {e: 0.75, sl: 0.45, pad: 0, hem: -48.2},
  hoodie: {e: 1.0, sl: 0.55, pad: 0, hem: -47.8},
  tee: {e: 0.35, sl: 0.4, pad: 0, hem: -48.8},
  cardigan: {e: 0.8, sl: 0.45, pad: 0, hem: -46.8},
  blouse: {e: 0.4, sl: 0.32, pad: 0, hem: -50.0},
  dress: {e: 0.25, sl: 0.32, pad: 0, hem: -57.2},
  coverall: {e: 0.85, sl: 0.45, pad: 0.1, hem: -48.4},
  uniform: {e: 0.5, sl: 0.38, pad: 0.15, hem: -48.4},
};
const JACKETS = new Set(['suit', 'suitOpen', 'blazer', 'leather', 'bomber', 'denim', 'trench', 'overcoat', 'puffer']);

/** The skin of tone n (0 fair .. 3 olive / tan): base, shade, the head's ball gradient. */
const skinOf = (n: number): [string, string, string] => {
  const s = Math.round(clamp(n, 0, 3));
  if (s === 1) return [C.ilSkin, C.ilSkin2, 'ball-skin'];
  const k = s === 0 ? -0.35 : s === 2 ? 0.2 : 0.38;
  return k < 0 ? [mix(C.ilSkin, C.il0, -k), mix(C.ilSkin2, C.ilSkin, -k * 0.6), `ball-skin${s}`] : [mix(C.ilSkin, C.il3, k), mix(C.ilSkin2, C.il4, k), `ball-skin${s}`];
};

// ---- hands (hand space: the wrist at the origin, +y along the hand, the thumb on -x) ----------------------------------
const FIST: Pt[] = [[-2.0, -0.3], [2.0, -0.3], [2.5, 1.5], [2.6, 3.5], [2.3, 4.7], [-2.3, 4.7], [-2.6, 3.4], [-2.45, 1.5]];
type HandOut = {d: string; lines: string; nails: Pt[]; tip?: Pt};
/** The hand's silhouette (one path: the fingers' scallops read as fingers), its creases and its nails. */
const handShapes = (m: Mx, kind: HandKind, hi: boolean): HandOut => {
  const line = (d: string) => toLine(P(m, d));
  switch (kind) {
    case 'mitten': {
      // relaxed: the back of the hand, four slim fingers a little curled and fanned, the thumb apart
      const F: [number, number, number, number][] = [
        [-1.32, 3.0, -5, 0.5],
        [-0.42, 3.35, -1, 0.52],
        [0.5, 3.15, 3, 0.49],
        [1.36, 2.55, 8, 0.43],
      ];
      const shapes = [S(m, [[-1.75, -0.25], [1.75, -0.25], [2.15, 1.4], [2.1, 3.4], [1.7, 4.1], [-1.5, 4.15], [-1.95, 3.2], [-1.95, 1.4]])];
      const lines: string[] = [];
      const nails: Pt[] = [];
      F.forEach(([x, l, a, r], i) => {
        const [dx, dy] = dir(a);
        const mid: Pt = [x + dx * l * 0.55, 3.6 + dy * l * 0.55];
        const [ex, ey] = dir(a - 10);
        const tip: Pt = [mid[0] + ex * l * 0.45, mid[1] + ey * l * 0.45];
        shapes.push(K(m, x, 3.5, r, mid[0], mid[1], r * 0.94), K(m, mid[0], mid[1], r * 0.92, tip[0], tip[1], r * 0.8));
        nails.push(tip);
        if (i < 3) {
          const nx = (x + F[i + 1][0]) / 2;
          lines.push(line(`M${nx} 3.9L${nx + 0.12} ${3.9 + Math.min(l, F[i + 1][1]) * 0.78}`));
        }
      });
      shapes.push(K(m, -1.7, 1.2, 0.86, -2.55, 3.05, 0.68), K(m, -2.55, 3.05, 0.66, -2.45, 4.45, 0.52));
      nails.push([-2.45, 4.45]);
      if (!hi) return {d: toD(S(m, [[-1.9, -0.3], [1.9, -0.3], [2.4, 2.0], [2.2, 5.6], [1.2, 7.0], [-0.6, 7.1], [-1.9, 6.0], [-2.6, 4.2], [-2.2, 1.6]])), lines: '', nails: []};
      return {d: toD(...shapes), lines: lines.join('') + line('M-1.55 1.9Q-1.95 2.9 -2.05 3.6'), nails};
    }
    case 'palm': {
      // open and spread: the wave, a stop, a shrug
      const F: [number, number, number, number][] = [
        [-1.5, 3.3, -14, 0.52],
        [-0.5, 3.7, -4, 0.54],
        [0.55, 3.5, 5, 0.5],
        [1.5, 2.8, 15, 0.44],
      ];
      const shapes = [S(m, [[-2.1, -0.25], [2.1, -0.25], [2.5, 1.8], [2.3, 4.0], [-2.3, 4.05], [-2.5, 1.8]])];
      const nails: Pt[] = [];
      for (const [x, l, a, r] of F) {
        const [dx, dy] = dir(a);
        const tip: Pt = [x + dx * l, 3.7 + dy * l];
        shapes.push(K(m, x, 3.6, r, tip[0], tip[1], r * 0.82));
        nails.push(tip);
      }
      shapes.push(K(m, -2.0, 1.2, 0.95, -3.7, 3.0, 0.72), K(m, -3.7, 3.0, 0.7, -4.4, 4.3, 0.56));
      nails.push([-4.4, 4.3]);
      return {d: toD(...shapes), lines: hi ? line('M-1.0 1.2Q-0.4 2.6 0.2 3.5') : '', nails};
    }
    case 'point': {
      // the index out (two joints), the other three curled into the palm, the thumb along them
      const shapes = [S(m, FIST), E(m, 0.1, 4.75, 0.72, 0.66), E(m, 1.05, 4.65, 0.68, 0.62), E(m, 1.9, 4.35, 0.6, 0.56)];
      shapes.push(K(m, -1.35, 4.0, 0.64, -1.42, 6.9, 0.57), K(m, -1.42, 6.9, 0.56, -1.45, 9.4, 0.48));
      shapes.push(K(m, -2.35, 1.6, 0.84, -0.9, 3.9, 0.7));
      return {
        d: toD(...shapes),
        lines: hi ? line('M0.6 4.1L0.62 5.2') + line('M1.5 3.9L1.5 4.9') + line('M-0.45 4.15L-0.4 5.25') + line('M-1.75 6.9L-1.15 6.9') : '',
        nails: [[-1.45, 9.4]],
      };
    }
    case 'pointYou':
      // the index toward the camera: short (foreshortened), thick, its nail showing
      return {
        d: toD(S(m, FIST), E(m, 0.2, 4.7, 0.72, 0.66), E(m, 1.15, 4.55, 0.68, 0.62), K(m, -1.3, 3.8, 1.1, -1.45, 8.0, 1.12), K(m, -2.35, 1.6, 0.84, -0.6, 3.6, 0.7)),
        lines: hi ? line('M0.7 4.1L0.72 5.1') + line('M1.6 3.9L1.6 4.8') + line('M-2.4 6.2Q-1.45 6.6 -0.5 6.2') : '',
        nails: [],
        tip: [-1.45, 7.9],
      };
    case 'thumb': {
      // a fist seen from the side, the fingers stacked, the thumb up
      const shapes = [S(m, FIST), E(m, 2.35, 1.2, 0.72, 0.7), E(m, 2.5, 2.4, 0.76, 0.72), E(m, 2.45, 3.6, 0.74, 0.7), E(m, 2.2, 4.6, 0.66, 0.62)];
      shapes.push(K(m, -0.9, 4.3, 1.0, -1.0, 6.6, 0.9), K(m, -1.0, 6.6, 0.88, -1.05, 8.6, 0.8));
      return {d: toD(...shapes), lines: hi ? line('M0.8 1.8L2.5 1.8') + line('M0.8 3.0L2.7 3.0') + line('M0.8 4.15L2.55 4.15') + line('M-1.75 6.5L-0.3 6.5') : '', nails: [[-1.05, 8.6]]};
    }
    case 'grip': {
      // holding something: the knuckles' row across the front, the thumb wrapped over
      const shapes = [S(m, FIST), E(m, -1.55, 4.85, 0.7, 0.64), E(m, -0.5, 5.1, 0.74, 0.66), E(m, 0.58, 5.05, 0.72, 0.64), E(m, 1.55, 4.75, 0.64, 0.58)];
      shapes.push(K(m, -2.5, 1.6, 0.95, -0.2, 3.7, 0.8));
      return {d: toD(...shapes), lines: hi ? line('M-1.02 4.3L-1.0 5.4') + line('M0.05 4.35L0.05 5.55') + line('M1.1 4.3L1.08 5.35') + line('M-1.6 2.5Q-0.9 3.0 -0.5 3.6') : '', nails: [[-0.25, 3.7]]};
    }
    default:
      return {d: '', lines: '', nails: []};
  }
};

// ---- the face (head space: the head's centre (0, -90)) --------------------------------------------------------------
type FaceDraw = {fp: FaceParams; blink: number; look: Pt; tn: number; hi: boolean; detail: boolean; skin: string; skin2: string; jaw: (pts: Pt[]) => Pt[]};
const EYE_Y = -90.1;
const EYE_SEP = 2.75;
const MOUTH_Y = -84.55;

/** Eyes, nose, mouth, lips and the lines of age. */
const drawFace = (ink: Ink, H: Mx, f: FaceDraw, look: Look, clip: string): React.ReactNode[] => {
  const {fp, tn, hi, detail, skin, skin2} = f;
  const ta = Math.abs(tn);
  const fs = 2.2 * tn;
  const out: React.ReactNode[] = [];
  const feat = C.ilFeature;
  const open = fp.eyeOpen * f.blink;
  const lx = clamp(fp.lookX + f.look[0], -0.6, 0.6);
  const ly = clamp(fp.lookY + f.look[1], -0.6, 0.6);
  const fem = look.fem;
  // eyes: an almond with its white, the iris and a catchlight, the upper lid's line (a lash flick for her)
  for (const side of [-1, 1] as const) {
    const far = ta > 0.05 && Math.sign(tn) === side;
    const wf = far ? 1 - 0.3 * ta : 1;
    const ex = fs + side * EYE_SEP * (1 - 0.12 * ta);
    const ey = EYE_Y;
    const rx = (fem ? 1.34 : 1.28) * wf * (open > 1 ? 1 + 0.25 * (open - 1) : 1);
    const ry = 0.9 * open * (open > 1 ? 1.12 : 1);
    const key = side < 0 ? 'eL' : 'eR';
    if (!hi) {
      out.push(<path key={key} d={toD(E(H, ex + lx * 0.4, ey + ly * 0.4, 0.82 * wf, Math.max(0.22, 0.9 * Math.min(1, open))))} fill={feat} />);
      continue;
    }
    if (ry < 0.27) {
      // closed: a lid line, arched up when laughing, a soft downward arc in a blink
      const c = lerp(0.5, -1.15, clamp(fp.eyeSmile, 0, 1));
      out.push(<path key={key} d={toLine(P(H, `M${ex - 1.15 * wf} ${ey + 0.15}Q${ex} ${ey + 0.15 + c * 1.5} ${ex + 1.15 * wf} ${ey + 0.15}`))} stroke={feat} strokeWidth={fem ? 0.5 : 0.44} strokeLinecap="round" fill="none" />);
      continue;
    }
    const up = ey - ry * 1.33;
    const lo = ey + ry * 1.0 * (1 - 1.15 * clamp(fp.eyeSmile, 0, 1));
    const L: Pt = [ex - rx, ey + 0.08];
    const R: Pt = [ex + rx, ey + 0.08];
    const tilt = side * 0.12; // the outer corner a hair higher
    const almond = `M${L[0]} ${L[1] - (side < 0 ? tilt : -tilt)}C${ex - rx * 0.55} ${up} ${ex + rx * 0.55} ${up} ${R[0]} ${R[1] - (side > 0 ? tilt : -tilt)}C${ex + rx * 0.5} ${lo} ${ex - rx * 0.5} ${lo} ${L[0]} ${L[1] - (side < 0 ? tilt : -tilt)}Z`;
    const ad = toD(P(H, almond));
    const ir = Math.min(0.66, ry * 1.2) * (fp.pupil < 0.97 ? 0.62 + 0.2 * fp.pupil : 1);
    const icx = ex + lx * 0.55;
    const icy = ey + ly * 0.45 + 0.05;
    if (detail) {
      const cid = `${clip}-${key}`;
      out.push(
        <g key={key}>
          <clipPath id={cid}>
            <path d={ad} />
          </clipPath>
          <path d={ad} fill={mix(C.il0, skin, 0.18)} stroke={fp.pupil < 0.97 ? feat : 'none'} strokeWidth={0.26} />
          <g clipPath={`url(#${cid})`}>
            <path d={toD(E(H, icx, icy, ir, ir))} fill={mix(feat, C.il4, 0.16)} />
            <path d={toD(E(H, icx, icy, ir * 0.5, ir * 0.5))} fill={feat} />
            <path d={toD(E(H, icx + ir * 0.38, icy - ir * 0.4, ir * 0.24))} fill={C.il0} />
            <path d={toD(P(H, `M${L[0] - 0.2} ${up - 0.6}L${R[0] + 0.2} ${up - 0.6}L${R[0] + 0.2} ${ey - ry * 0.55}C${ex + rx * 0.4} ${ey - ry * 0.95} ${ex - rx * 0.4} ${ey - ry * 0.95} ${L[0] - 0.2} ${ey - ry * 0.55}Z`))} fill={feat} opacity={0.22} />
          </g>
        </g>,
      );
    } else {
      out.push(<path key={key} d={ad} fill={feat} />);
      out.push(<path key={`${key}c`} d={toD(E(H, icx + 0.32, icy - 0.3, 0.22))} fill={C.il0} />);
    }
    // the upper lid (and for her the lash's flick at the outer corner)
    const oc: Pt = side < 0 ? L : R;
    const lid = `M${L[0] - 0.05} ${L[1] - (side < 0 ? tilt : -tilt)}C${ex - rx * 0.55} ${up} ${ex + rx * 0.55} ${up} ${R[0] + 0.05} ${R[1] - (side > 0 ? tilt : -tilt)}`;
    out.push(<path key={`${key}l`} d={toLine(P(H, lid))} stroke={feat} strokeWidth={fem ? 0.46 : 0.34} strokeLinecap="round" fill="none" />);
    if (fem) out.push(<path key={`${key}k`} d={toD(P(H, `M${oc[0] - side * 0.35} ${oc[1] - 0.28}L${oc[0] + side * 0.62} ${oc[1] - 0.72}L${oc[0] + side * 0.12} ${oc[1] + 0.02}Z`))} fill={feat} />);
    if (detail && look.age > 0) out.push(<path key={`${key}u`} d={toLine(P(H, `M${ex - rx * 0.7} ${lo + 0.5}Q${ex} ${lo + 0.95} ${ex + rx * 0.7} ${lo + 0.5}`))} stroke={skin2} strokeWidth={0.2} fill="none" opacity={look.age > 1 ? 0.9 : 0.5} />);
  }
  // nose: the shaded side of the bridge (away from the light) and the shadow under its tip
  const nx = fs * 1.25;
  if (hi) {
    out.push(<path key="nb" d={toD(P(H, `M${nx + 0.25} ${-89.3}Q${nx + 0.95} ${-88.2} ${nx + 1.0} ${-87.1}L${nx + 0.55} ${-87.25}Q${nx + 0.55} ${-88.3} ${nx + 0.1} ${-89.2}Z`))} fill={skin2} opacity={0.75} />);
    const nw = fem ? 0.9 : 1.08;
    out.push(<path key="nose" d={toD(P(H, `M${nx - nw} ${-86.75}C${nx - nw * 0.6} ${-85.95} ${nx + nw * 0.7} ${-85.9} ${nx + nw * 1.05} ${-86.75}C${nx + nw * 0.45} ${-86.4} ${nx - nw * 0.4} ${-86.4} ${nx - nw} ${-86.75}Z`))} fill={skin2} />);
    out.push(<path key="nh" d={toD(E(H, nx - 0.2, -87.5, 0.32, 0.22))} fill={mix(skin, C.il0, 0.5)} opacity={0.7} />);
  } else out.push(<path key="nose" d={toD(E(H, nx, -86.6, 0.6, 0.3))} fill={skin2} />);
  // mouth: one path from six numbers; teeth and tongue clipped inside it
  const mcx = fs * 0.95;
  const cy = MOUTH_Y;
  const w = fp.mw * 0.78 * (1 - 0.22 * ta);
  const cv = clamp(fp.curve, -1, 1);
  const yl = cy - 1.15 * cv + 0.18 * fp.skew;
  const yr = cy - 1.15 * cv - 0.85 * fp.skew;
  const op = clamp(fp.open, 0, 1);
  const yu = cy + 0.12 * cv - 0.75 * op * (1 - 0.6 * Math.max(0, cv)) - 0.18 * fp.skew;
  const ylo = yu + 0.5 + 2.45 * op + 0.75 * Math.max(0, cv) * op;
  const rho = clamp(op * 1.4, 0, 1) * (1 - 0.65 * Math.max(0, cv));
  const Lx = mcx - w / 2 + 0.12 * fp.skew;
  const Rx = mcx + w / 2 + 0.12 * fp.skew;
  const hx = (1 - rho) * 0.3 * w;
  const Y = (mid: number) => (8 * mid - yl - yr) / 6;
  const mouthD = `M${Lx} ${yl}C${Lx + hx} ${Y(yu)} ${Rx - hx} ${Y(yu)} ${Rx} ${yr}C${Rx - hx} ${Y(ylo)} ${Lx + hx} ${Y(ylo)} ${Lx} ${yl}Z`;
  const md = toD(P(H, mouthD));
  if (hi && detail) {
    // lips: hers a soft darker pair, his only the shadow under the lower lip
    if (fem) {
      const lip = mix(skin2, feat, 0.3);
      out.push(<path key="ul" d={toD(P(H, `M${Lx - 0.1} ${yl}C${Lx + w * 0.22} ${Y(yu) - 0.7} ${mcx - 0.35} ${Math.min(yl, yr) - 0.75} ${mcx} ${Math.min(yl, yr) - 0.48}C${mcx + 0.35} ${Math.min(yl, yr) - 0.75} ${Rx - w * 0.22} ${Y(yu) - 0.7} ${Rx + 0.1} ${yr}Z`))} fill={lip} opacity={0.75} />);
      out.push(<path key="ll" d={toD(P(H, `M${Lx + 0.1} ${yl + 0.05}C${Lx + w * 0.25} ${Y(ylo) + 1.05} ${Rx - w * 0.25} ${Y(ylo) + 1.05} ${Rx - 0.1} ${yr + 0.05}Z`))} fill={mix(skin2, feat, 0.16)} opacity={0.75} />);
    } else out.push(<path key="ll" d={toD(E(H, mcx, Math.max(yl, yr) + 0.95 + 1.8 * op, w * 0.26, 0.3))} fill={skin2} opacity={0.55} />);
  }
  out.push(<path key="mouth" d={md} fill={feat} />);
  if (hi && op > 0.12) {
    const yt = yu + 0.4 * (ylo - yu);
    const teeth = `M${Lx} ${yl - 0.4}C${Lx + hx} ${Y(yu) - 0.6} ${Rx - hx} ${Y(yu) - 0.6} ${Rx} ${yr - 0.4}L${Rx} ${yr}C${Rx - hx} ${Y(yt)} ${Lx + hx} ${Y(yt)} ${Lx} ${yl}Z`;
    out.push(
      <g key="mouthIn">
        <clipPath id={`${clip}-m`}>
          <path d={md} />
        </clipPath>
        <g clipPath={`url(#${clip}-m)`}>
          {fp.tongue > 0.05 ? <path d={toD(E(H, mcx + 0.2 * w * fp.skew, ylo + 0.2, w * 0.26, (ylo - yu) * 0.36))} fill={mix(skin2, feat, 0.45)} opacity={clamp(fp.tongue, 0, 1)} /> : null}
          {fp.teeth > 0.05 ? <path d={toD(P(H, teeth))} fill={C.il0} opacity={clamp(fp.teeth, 0, 1)} /> : null}
        </g>
      </g>,
    );
  }
  // age: the folds from the nose to the mouth's corners, the forehead's lines
  if (hi && detail && look.age > 0) {
    const o = look.age > 1 ? 0.95 : 0.55;
    for (const s of [-1, 1]) out.push(<path key={`nl${s}`} d={toLine(P(H, `M${nx + s * 1.25} ${-86.6}Q${mcx + s * (w / 2 + 0.75)} ${-85.6} ${mcx + s * (w / 2 + 0.45)} ${-83.9}`))} stroke={skin2} strokeWidth={0.22} fill="none" opacity={o} />);
    if (look.age > 1) out.push(<path key="fh" d={toLine(P(H, `M${fs - 2.6} -94.4Q${fs} -94.9 ${fs + 2.6} -94.4`)) + toLine(P(H, `M${fs - 1.8} -95.4Q${fs} -95.8 ${fs + 1.8} -95.4`))} stroke={skin2} strokeWidth={0.2} fill="none" />);
  }
  return out;
};

/** Facial hair (under the mouth, which draws over it): stubble, a short or full beard, a moustache, a goatee. */
const drawBeard = (ink: Ink, H: Mx, look: Look, tn: number, T: (n: number) => string, jaw: (pts: Pt[]) => Pt[], hi: boolean): React.ReactNode[] => {
  const b = look.beard;
  if (!b) return [];
  const t = look.hairTone;
  const mcx = 2.2 * tn * 0.95;
  const out: React.ReactNode[] = [];
  const tache = (thick: number): Pt[] => [[mcx - 2.7, -84.8], [mcx - 1.6, -85.8 - thick], [mcx, -85.55 - thick * 0.6], [mcx + 1.6, -85.8 - thick], [mcx + 2.7, -84.8], [mcx + 2.0, -84.7], [mcx, -85.05], [mcx - 2.0, -84.7]];
  if (b === 'stubble') {
    out.push(<path key="stb" d={toD(S(H, jaw([[-7.1, -88.8], [-6.9, -86.0], [-5.6, -83.5], [-3.0, -82.0], [0, -81.75], [3.0, -82.0], [5.6, -83.5], [6.9, -86.0], [7.1, -88.8], [6.2, -87.6], [5.1, -85.7], [3.0, -84.6], [0, -83.6], [-3.0, -84.6], [-5.1, -85.7], [-6.2, -87.6]])), S(H, tache(0)))} fill={T(t)} opacity={0.24} />);
    return out;
  }
  if (b === 'short' || b === 'full') {
    const f = b === 'full' ? 1 : 0;
    const pts: Pt[] = [[-7.05, -89.4], [-7.0 - 0.15 * f, -86.6], [-5.9 - 0.25 * f, -83.6], [-3.4 - 0.2 * f, -81.9 - 0.6 * f], [0, -81.4 - 1.1 * f], [3.4 + 0.2 * f, -81.9 - 0.6 * f], [5.9 + 0.25 * f, -83.6], [7.0 + 0.15 * f, -86.6], [7.05, -89.4], [6.45, -89.2], [6.0, -87.4 + 0.3 * f], [4.6, -86.4 + 0.2 * f], [3.0, -85.7], [1.7, -84.1], [0, -83.8], [-1.7, -84.1], [-3.0, -85.7], [-4.6, -86.4 + 0.2 * f], [-6.0, -87.4 + 0.3 * f], [-6.45, -89.2]];
    out.push(piece(ink, 'beard', toD(S(H, jaw(pts)), S(H, tache(0.15 + 0.15 * f))), {fill: T(t), shade: T(t + 0.7), off: 0.4, rim: true}));
    if (hi) out.push(<path key="bh" d={toLine(P(H, `M${-4.2} -84.6Q${-3.2} -83.0 ${-1.8} -82.6`))} stroke={T(t - 1.4)} strokeWidth={0.26} fill="none" opacity={0.55} strokeLinecap="round" />);
    return out;
  }
  if (b === 'goatee') {
    out.push(piece(ink, 'beard', toD(S(H, jaw([[mcx - 2.0, -83.5], [mcx - 1.3, -81.5], [mcx, -81.0], [mcx + 1.3, -81.5], [mcx + 2.0, -83.5], [mcx + 0.9, -83.35], [mcx, -83.65], [mcx - 0.9, -83.35]])), S(H, tache(0.1))), {fill: T(t), shade: T(t + 0.7), off: 0.3, rim: true}));
    return out;
  }
  out.push(piece(ink, 'beard', toD(S(H, tache(0.32))), {fill: T(t), shade: T(t + 0.8), off: 0.35, rim: true}));
  return out;
};

/** Brows: tapered, his thicker and straighter, hers slim and arched; tilt lifts the inner ends, asym the right one. */
const drawBrows = (H: Mx, fp: FaceParams, tn: number, look: Look, color: string): React.ReactNode[] => {
  const ta = Math.abs(tn);
  const fs = 2.2 * tn;
  return ([-1, 1] as const).map((side) => {
    const far = ta > 0.05 && Math.sign(tn) === side;
    const wf = far ? 1 - 0.3 * ta : 1;
    const bx = fs + side * 2.95 * (1 - 0.12 * ta);
    const by = EYE_Y - 2.35 + fp.browY * 0.85 - (side > 0 ? fp.browAsym * 0.9 : 0) - (fp.eyeOpen > 1 ? (fp.eyeOpen - 1) * 1.2 : 0);
    const a = side * fp.browTilt - (side > 0 ? 9 * fp.browAsym : 0);
    const m = chain(H, tr(bx, by), rot(a), scl(wf, 1));
    const d = look.fem
      ? toD(K(m, -side * 1.55, 0.18, 0.3, -side * 0.15, -0.3, 0.26), K(m, -side * 0.15, -0.3, 0.26, side * 1.5, 0.15, 0.14))
      : toD(K(m, -side * 1.6, 0.1, 0.46 + (look.age > 1 ? 0.06 : 0), -side * 0.1, -0.12, 0.4), K(m, -side * 0.1, -0.12, 0.4, side * 1.55, 0.12, 0.27));
    return <path key={side < 0 ? 'bL' : 'bR'} d={d} fill={color} />;
  });
};

// ---- hair (head space) ------------------------------------------------------------------------------------------------
const mirrorPts = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [-x, y] as Pt).reverse();
type HairDef = {front?: Pt[]; back?: Pt[]; side?: Pt[]; faded?: boolean; thin?: number; part?: string; strands?: string[]};
const SLEEK: Pt[] = [[-7.15, -88.6], [-7.65, -93.4], [-7.0, -97.2], [-4.6, -99.8], [-0.2, -100.6], [4.4, -99.8], [7.0, -97.2], [7.65, -93.4], [7.15, -88.6], [6.6, -91.6], [5.2, -94.6], [2.4, -95.9], [-0.2, -96.2], [-2.6, -95.9], [-5.2, -94.6], [-6.6, -91.6]];
/** A short men's cut: the sideburns on the face in front of the ears, the hair stopping above the ears, then the top's
 *  contour (left temple over the crown to the right temple) and the hairline (right to left). */
const SB_L: Pt[] = [[-6.25, -88.3], [-6.85, -88.5], [-6.95, -90.6], [-7.45, -91.5]];
const SB_R: Pt[] = mirrorPts(SB_L);
const cut = (top: Pt[], line: Pt[]): Pt[] => [...SB_L, ...top, ...SB_R, [6.3, -92.4], ...line, [-6.3, -92.4]];
const LINE: Pt[] = [[5.2, -95.0], [2.6, -95.9], [-0.4, -96.1], [-3.2, -95.8], [-5.3, -94.8]];
const SLICK_TOP: Pt[] = [[-7.75, -94.2], [-6.9, -97.6], [-4.3, -99.7], [0, -100.4], [4.3, -99.7], [6.9, -97.6], [7.75, -94.2]];
const SLICK_LINE: Pt[] = [[5.2, -95.9], [2.6, -96.9], [0, -97.1], [-2.6, -96.9], [-5.2, -95.9]];
const curls = (cx: number, cy: number, r: number, a0: number, a1: number, n: number, amp: number, ry = 1): Pt[] => {
  // round scallops: each curl a valley and two crest points
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    for (const [t, rr] of [[0, r], [0.33, r + amp], [0.67, r + amp]] as const) {
      const a = a0 + ((a1 - a0) * (i + t)) / n;
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * ry]);
    }
  }
  const a = a1;
  out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * ry]);
  return out;
};
const HAIR: Record<string, HairDef> = {
  // short cuts hug the skull, stop above the ears, the sideburns on the face, the temples receding a little
  crop: {front: cut([[-7.75, -93.6], [-7.2, -96.6], [-5.0, -99.0], [-1.0, -99.8], [3.2, -99.5], [6.3, -97.7], [7.65, -94.6]], LINE), strands: ['M-4.8 -97.6Q-2.4 -99.1 0.4 -99.3']},
  side: {
    front: cut([[-7.8, -93.8], [-7.3, -97.2], [-5.2, -99.9], [-1.8, -101.0], [2.4, -101.0], [5.8, -99.6], [7.6, -96.6], [7.7, -93.6]], [[5.4, -95.2], [2.6, -96.4], [-0.6, -96.8], [-3.4, -96.5], [-5.4, -95.2]]),
    part: 'M-3.2 -100.6Q-3.0 -99.0 -2.9 -97.2',
    strands: ['M-2.2 -100.2Q1.6 -100.6 4.8 -98.6', 'M-1.4 -98.8Q1.8 -99.1 4.4 -97.4'],
  },
  quiff: {front: cut([[-7.7, -93.6], [-7.1, -96.8], [-5.2, -99.6], [-2.6, -101.6], [0.6, -102.4], [3.8, -101.9], [6.4, -100.0], [7.6, -96.8], [7.65, -93.6]], [[5.4, -95.6], [3.4, -97.4], [0.6, -97.8], [-2.2, -97.2], [-4.8, -95.8]]), strands: ['M-3.6 -99.8Q-0.6 -102.0 3.0 -101.4', 'M-2.0 -98.6Q0.8 -100.4 4.2 -99.8']},
  slick: {front: cut(SLICK_TOP, SLICK_LINE), strands: ['M-3.4 -97.2C-3.0 -98.8 -1.6 -99.7 0.6 -100.0', 'M1.0 -97.3C1.8 -98.8 3.2 -99.4 5.0 -99.3', 'M-5.4 -95.9C-4.9 -97.4 -4.0 -98.4 -2.6 -99.2']},
  fade: {front: [[-6.4, -94.6], [-6.4, -97.6], [-4.4, -100.0], [-0.6, -100.9], [3.6, -100.4], [6.2, -98.2], [6.5, -94.8], [5.3, -95.9], [2.8, -96.6], [-0.4, -96.7], [-3.4, -96.4], [-5.4, -95.6]], side: [...SB_L, [-7.6, -94.0], [-6.7, -96.4], [-6.2, -94.6], [-6.3, -92.0]], faded: true, strands: ['M-4.0 -98.8Q-1.2 -100.4 2.0 -100.0']},
  buzz: {front: cut([[-7.6, -94.0], [-6.8, -96.8], [-4.4, -98.8], [0, -99.4], [4.4, -98.8], [6.8, -96.8], [7.6, -94.0]], [[5.6, -94.8], [3.0, -95.6], [0, -95.8], [-3.0, -95.6], [-5.6, -94.8]]), thin: 0.72},
  curly: {front: [[-6.3, -91.6], [-7.2, -92.0], ...curls(0, -93.8, 7.7, Math.PI * 1.1, Math.PI * 1.9, 8, 0.9, 1.0), [7.2, -92.0], [6.3, -91.6], [6.2, -92.8], [5.2, -95.0], [2.4, -96.0], [-1.0, -96.1], [-4.4, -95.4], [-6.2, -92.8]], side: [...SB_L, [-7.4, -93.0], [-6.3, -92.6], [-6.3, -90.4]], faded: true},
  wavy: {front: [[-7.4, -86.8], [-8.0, -90.6], [-7.9, -95.2], [-5.8, -99.4], [-1.8, -100.9], [2.8, -100.6], [6.4, -98.8], [8.0, -95.0], [8.1, -90.0], [7.6, -86.6], [6.9, -87.6], [6.6, -91.2], [5.2, -94.6], [1.8, -96.2], [-2.2, -95.8], [-5.2, -94.4], [-6.5, -91.0], [-6.7, -87.6]], strands: ['M-5.4 -97.4Q-2.8 -99.8 0.6 -99.7', 'M3.0 -99.2Q5.6 -97.8 6.6 -94.6']},
  manbun: {front: cut(SLICK_TOP, SLICK_LINE), strands: ['M-3.4 -97.2C-3.0 -98.8 -1.6 -99.7 0.6 -100.0', 'M1.0 -97.3C1.8 -98.8 3.2 -99.4 5.0 -99.3']},
  textured: {front: cut([[-7.75, -93.4], [-7.0, -96.8], [-5.4, -99.2], [-4.0, -99.5], [-3.0, -100.6], [-1.6, -100.2], [-0.6, -101.2], [0.8, -100.6], [2.0, -101.3], [3.4, -100.4], [4.8, -100.5], [6.2, -98.8], [7.4, -96.4], [7.65, -93.2]], [[5.4, -94.6], [3.4, -95.2], [1.6, -94.7], [-0.4, -95.5], [-2.6, -95.1], [-5.2, -94.7]])},
  receding: {side: [...SB_L, [-7.6, -94.2], [-6.9, -96.4], [-6.15, -95.2], [-6.3, -92.0]], front: [[-5.6, -97.0], [-3.0, -99.2], [1.0, -99.6], [4.6, -98.4], [5.8, -96.9], [3.0, -97.9], [-1.0, -98.3], [-4.0, -97.5]], thin: 0.45},
  bald: {},
  long: {
    front: [[-6.75, -80.8], [-7.35, -86.0], [-7.6, -91.6], [-7.0, -96.2], [-4.6, -99.5], [-0.2, -100.7], [4.4, -99.7], [7.1, -96.4], [7.65, -91.4], [7.4, -86.0], [6.85, -80.8], [6.2, -81.2], [6.0, -86.4], [5.6, -91.8], [3.6, -95.4], [0.3, -96.7], [-3.2, -95.4], [-5.4, -92.0], [-6.0, -86.4], [-6.2, -81.2]],
    back: [[-7.6, -95.4], [-5.8, -99.8], [0, -101.2], [5.8, -99.8], [7.6, -95.4], [8.3, -87.0], [8.9, -75.6], [9.5, -65.2], [7.0, -63.4], [0, -63.9], [-7.0, -63.4], [-9.5, -65.2], [-8.9, -75.6], [-8.3, -87.0]],
    part: 'M0.3 -100.6L0.3 -96.9',
    strands: ['M-4.8 -97.6Q-6.4 -93.0 -6.8 -86.0', 'M4.0 -98.4Q6.2 -94.6 6.8 -88.0'],
  },
  waves: {
    front: [[-6.6, -80.4], [-7.5, -84.0], [-7.2, -88.0], [-7.7, -92.0], [-7.0, -96.2], [-4.6, -99.5], [-0.2, -100.7], [4.4, -99.7], [7.1, -96.4], [7.75, -92.0], [7.3, -88.0], [7.6, -84.0], [6.8, -80.4], [6.2, -81.0], [6.3, -84.6], [5.8, -88.6], [5.4, -92.4], [3.4, -95.4], [-1.2, -96.6], [-4.2, -94.6], [-5.6, -91.6], [-6.1, -87.8], [-5.8, -84.4], [-6.2, -81.0]],
    back: [[-7.6, -95.4], [-5.8, -99.8], [0, -101.2], [5.8, -99.8], [7.6, -95.4], [8.6, -88.0], [8.0, -82.0], [9.4, -76.0], [8.8, -70.6], [10.2, -65.6], [7.4, -62.8], [0, -63.2], [-7.4, -62.8], [-10.2, -65.6], [-8.8, -70.6], [-9.4, -76.0], [-8.0, -82.0], [-8.6, -88.0]],
    part: 'M-1.2 -100.4Q-1.3 -98.4 -1.2 -96.6',
    strands: ['M-4.6 -97.8Q-6.8 -94.0 -6.4 -89.0', 'M3.8 -98.6Q6.6 -95.6 6.6 -90.4'],
  },
  bob: {
    front: [[-7.0, -82.8], [-7.7, -88.6], [-7.6, -94.6], [-5.2, -99.0], [-0.8, -100.6], [4.2, -99.8], [7.2, -96.6], [7.9, -90.6], [7.7, -84.4], [7.0, -82.3], [6.3, -83.0], [6.2, -87.6], [5.6, -92.4], [3.2, -95.2], [-0.4, -96.1], [-1.8, -95.2], [-4.6, -94.6], [-5.9, -91.4], [-6.2, -86.8], [-6.3, -82.9]],
    back: [[-7.8, -94.6], [-5.6, -99.8], [0, -101.0], [5.6, -99.8], [7.8, -94.6], [8.3, -86.6], [8.0, -81.8], [0, -81.4], [-8.0, -81.8], [-8.3, -86.6]],
    part: 'M-1.9 -100.5Q-1.9 -98.2 -1.8 -95.6',
    strands: ['M-1.0 -99.6Q3.6 -99.4 6.4 -94.0'],
  },
  lob: {
    front: [[-6.8, -78.6], [-7.6, -85.0], [-7.7, -91.2], [-7.1, -96.0], [-4.8, -99.4], [-0.6, -100.6], [4.2, -99.8], [7.2, -96.4], [7.9, -90.6], [7.7, -84.0], [7.0, -78.4], [6.3, -79.0], [6.2, -85.2], [5.7, -91.8], [3.4, -95.2], [0.4, -96.2], [-2.6, -95.4], [-5.2, -92.6], [-6.0, -86.8], [-6.2, -79.0]],
    back: [[-7.8, -94.6], [-5.6, -99.8], [0, -101.0], [5.6, -99.8], [7.8, -94.6], [8.6, -86.0], [8.8, -77.6], [0, -76.8], [-8.8, -77.6], [-8.6, -86.0]],
    part: 'M0.4 -100.5L0.4 -96.4',
    strands: ['M-4.4 -97.8Q-6.6 -93.6 -6.6 -86.0'],
  },
  pixie: {front: [[-7.1, -88.4], [-7.6, -93.2], [-7.0, -97.2], [-4.4, -99.8], [-0.2, -100.7], [4.0, -100.0], [6.8, -97.6], [7.65, -93.4], [7.3, -88.8], [6.6, -91.2], [5.6, -93.8], [2.6, -94.8], [-0.8, -94.0], [-3.6, -92.8], [-5.6, -92.2], [-6.5, -90.4]], strands: ['M-3.6 -98.6Q0.6 -99.6 4.4 -96.6']},
  pony: {front: SLEEK, back: [[3.4, -100.6], [7.2, -100.8], [10.2, -97.6], [11.0, -90.8], [10.4, -82.6], [8.8, -77.4], [7.8, -80.4], [8.4, -87.6], [7.8, -94.6], [5.4, -97.8]], strands: ['M-3.4 -97.4C-3.0 -99.0 -1.6 -100.0 0.6 -100.3', 'M1.0 -97.5C1.8 -99.0 3.2 -99.7 5.0 -99.6']},
  bun: {front: SLEEK, strands: ['M-3.4 -97.4C-3.0 -99.0 -1.6 -100.0 0.6 -100.3']},
  lowbun: {front: SLEEK, strands: ['M-3.4 -97.4C-3.0 -99.0 -1.6 -100.0 0.6 -100.3', 'M1.0 -97.5C1.8 -99.0 3.2 -99.7 5.0 -99.6']},
  curls: {
    front: [...curls(0, -91.8, 8.5, Math.PI * 0.62, Math.PI * 2.38, 13, 1.0, 1.08), [6.4, -82.0], [6.0, -87.4], [5.4, -92.4], [2.4, -95.0], [-1.6, -95.4], [-4.8, -93.6], [-6.0, -88.4], [-6.4, -82.0]],
    back: [...curls(0, -88.0, 10.0, Math.PI * 0.2, Math.PI * 0.8, 5, 1.0, 1.25), [-8.8, -88], [-7.8, -96], [0, -101], [7.8, -96], [8.8, -88]],
  },
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
  gaze?: Pt; // an extra eye direction (u, +-0.6): toward a phone, a partner
  opacity?: number;
  /** A small tone shift for a back-row crowd member (one step darker on the dark film, lighter on paper). */
  dim?: number;
  itemSide?: 'back' | 'front';
  /** Whose people: a film id or number (default the film being rendered). */
  film?: string | number;
};

/** The film being rendered: its id (for its people) and its voice ("me" is a woman when a woman reads it). */
const useFilm = (): {id: string; voice?: string} => {
  const vc = useVideoConfig();
  const spec = (vc.props as {spec?: {voice?: unknown}} | undefined)?.spec;
  return {id: vc.id, voice: typeof spec?.voice === 'string' ? spec.voice : undefined};
};
/** The look a cast has in the film being rendered (a scene that dresses a hand or a sleeve like the film's "me"). */
export const useCastLook = (cast: Cast = 'me', film?: string | number): Look => {
  const f = useFilm();
  return castDress(cast, filmKey(film ?? f.id), {voice: f.voice});
};

/** A posable, expressive person (see the file's header). */
export const Figure: React.FC<FigureP> = (p) => {
  const rid = useId();
  const film = useFilm();
  const fid = gid(rid, 'fg');
  const c = typeof p.cast === 'string' ? {is: p.cast} : p.cast;
  const preset = (c.is ?? 'me') as Preset;
  const seed = c.seed ?? SEEDS[preset] ?? 1;
  const look: Look = castDress(c, filmKey(p.film ?? film.id), {voice: film.voice});
  const B = look.fem ? BODY.f : BODY.m;
  const ez = EASE[look.outfit] ?? EASE.tee;
  const frame = p.frame;
  const time = p.time ?? 'day';
  const k = Math.max(1e-3, p.size / 100);
  const hi = (p.lod ?? (p.size < 180 ? 'lo' : 'hi')) === 'hi';
  const detail = hi && p.size >= 420;
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
  const shift = idle ? 1.4 * Math.sin((2 * Math.PI * frame) / 110 + ph(3)) : 0;
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
  const sh = B.jx * look.build;
  const shoulderAt = (tn: number): [Pt, Pt] => {
    const wS = 1 - 0.56 * Math.abs(tn);
    const cx = 0.9 * tn;
    return [
      [cx - sh * wS, SHY],
      [cx + sh * wS, SHY],
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
  const wB = 1 - 0.36 * tAbs;
  const wH = 1 - 0.6 * tAbs;
  const cx = 0.9 * tn;

  // ---- the skeleton ---------------------------------------------------------------------------------------------------
  const F: Mx = flip ? scl(-1, 1) : I;
  const sq = pv.squash;
  const R0 = chain(F, scl(1 + (1 - sq) * 0.6, sq, 0, 0));
  const hx = shift * (1 - 0.7 * pv.ground);
  const offY = pv.lift;
  const legAng = (side: -1 | 1): [number, number] => {
    const fk = side < 0 ? pv.ll : pv.rl;
    if (pv.plant < 0.001) return fk;
    const hipX = side * B.hipJ * wH;
    const fx = side * pv.feet * 0.78 * (1 - 0.55 * tAbs);
    const bend: 1 | -1 = tAbs > 0.45 ? (tn > 0 ? 1 : -1) : side;
    const ikA = ik2(hipX, HIPY, fx - hx, -2.6 - offY, THIGH * pv.thigh, SHIN, bend);
    if (pv.plant > 0.999) return ikA;
    return [lerp(fk[0], ikA[0], pv.plant), lerp(fk[1], ikA[1], pv.plant)];
  };
  const leg = (side: -1 | 1) => {
    const [a1, a2] = legAng(side);
    const hip: Pt = [side * B.hipJ * wH, HIPY];
    const [d1x, d1y] = dir(a1);
    const knee: Pt = [hip[0] + THIGH * pv.thigh * d1x, hip[1] + THIGH * pv.thigh * d1y];
    const [d2x, d2y] = dir(a1 + a2);
    const ankle: Pt = [knee[0] + SHIN * d2x, knee[1] + SHIN * d2y];
    return {hip, knee, ankle, a: a1 + a2};
  };
  const LL = leg(-1);
  const RL = leg(1);
  const lowest = Math.max(LL.ankle[1], RL.ankle[1]) + offY;
  const bob = pv.ground > 0 ? (-2.6 - lowest) * pv.ground : 0;
  const Pm = chain(R0, tr(hx, offY + bob));
  const Tm = chain(R0, tr(hx, offY + bob), rot(pv.lean, 0, HIPY), scl(1, breath * pv.chest, 0, HIPY));
  const Pel = chain(R0, tr(hx, offY + bob), rot(pv.lean * 0.4, 0, HIPY));
  const laugh = fp0.bob > 0.01 ? fp0.bob * Math.abs(Math.sin((Math.PI * 2 * frame) / 15)) : 0;
  const Hm = chain(Tm, tr(0.55 * tn, pv.headDrop - pv.shoulders * 0.25), rot(pv.tilt + sway, 0, -80.5), tr(0, -laugh * 0.7), scl(HEAD_K, HEAD_K, 0, -89));
  const [slx, sly] = shoulderAt(tn)[0];
  const [srx] = shoulderAt(tn)[1];
  const shY = sly - pv.shoulders;

  // ---- ink ------------------------------------------------------------------------------------------------------------
  const onDark = dark(time);
  const ink: Ink = {id: fid, uid: p.uid, k, hi, onDark, cut: isLight() && time !== 'day' ? ground(time) : C.ilCut, lx: 1.1, ly: 1.5};
  const [skinA, skinB, ballName] = skinOf(look.skin);
  const skin = dimK ? mix(skinA, ground(time), 0.22 * dimK) : skinA;
  const skin2 = dimK ? mix(skinB, ground(time), 0.22 * dimK) : skinB;
  const nodes: React.ReactNode[] = [];
  const push = (n: React.ReactNode) => {
    if (n) nodes.push(n);
  };
  const topT = look.tone;
  const innerT = look.innerTone;
  const out = look.outfit;
  const jacket = JACKETS.has(out);
  const long = out === 'trench' || out === 'overcoat';

  // ---- the contact shadow (paper only) ----
  if (crop === 'full' && p.uid && isLight() && pv.hideLegs < 0.5) {
    const air = clamp(-(pv.lift + bob) / 40, 0, 1);
    const [gx] = ap(F, hx, 0);
    push(<ellipse key="shadow" cx={gx} cy={0.3} rx={13 * (1 - 0.45 * air)} ry={1.8 * (1 - 0.45 * air)} fill={paint(p.uid, 'shade')} opacity={1 - 0.5 * air} />);
  }

  // ---- back hair (long hair behind the shoulders, a ponytail, a low bun) ----
  const hairT = look.hairTone;
  const hd = HAIR[look.hair] ?? HAIR.crop;
  const hairShift = (pts: Pt[], k0 = 1): Pt[] => pts.map(([x, y]) => [x - 0.9 * tn * k0, y] as Pt);
  if (hd.back && crop !== 'head') push(piece(ink, 'hairB', toD(S(Hm, hairShift(hd.back))), {fill: T(hairT + 0.45), shade: T(hairT + 1.1), off: 1.1, cut: true, rim: true}));
  else if (hd.back) push(piece(ink, 'hairB', toD(S(Hm, hairShift(hd.back).filter(([, y]) => y < -78))), {fill: T(hairT + 0.45), cut: true, rim: true}));
  if (look.hair === 'lowbun') push(piece(ink, 'bunB', toD(E(Hm, 5.6 - 2.4 * tn, -86.4, 2.4, 2.2)), {fill: T(hairT + 0.3), shade: T(hairT + 1), off: 0.5, cut: true, rim: true}));

  // ---- arms (built now, drawn in their layers) ----
  // an arm in two parts: the upper arm (drawn under the torso in a front view, so a sleeve grows out of the shoulder line)
  // and the forearm with its cuff (with the hand, in the arm's layer)
  type ArmOut = {upper: React.ReactNode[]; sleeve: React.ReactNode[]; hand: React.ReactNode[]; center: Pt; z: 'back' | 'front' | 'over'; tuck: boolean};
  const sleeveKind = look.sleeve;
  const sl = ez.sl;
  const buildArm = (side: -1 | 1, a: ArmV): ArmOut => {
    const S0: Pt = [side < 0 ? slx : srx, shY];
    const lu = UPPER * a.up;
    const lf = FORE * a.fore;
    const [ux, uy] = dir(a.s);
    const elbow: Pt = [S0[0] + lu * ux, S0[1] + lu * uy];
    const [fx, fy] = dir(a.s + a.e);
    const wrist: Pt = [elbow[0] + lf * fx, elbow[1] + lf * fy];
    const key = side < 0 ? 'aL' : 'aR';
    const [r1, r2, r3] = B.arm;
    const sleeve: React.ReactNode[] = [];
    const upper: React.ReactNode[] = [];
    const cloth = (key2: string, d: string, t: number) => piece(ink, key2, d, {fill: T(t), shade: T(t + 0.85), off: 0.85, cut: true, rim: true, rimK: out === 'leather' ? 1.6 : 1});
    const at = (t: number): Pt => (t <= 1 ? [S0[0] + (elbow[0] - S0[0]) * t, S0[1] + (elbow[1] - S0[1]) * t] : [elbow[0] + (wrist[0] - elbow[0]) * (t - 1), elbow[1] + (wrist[1] - elbow[1]) * (t - 1)]);
    if (sleeveKind === 'long') {
      upper.push(cloth(`${key}u`, toD(K(Tm, S0[0] + 1.2 * ux, S0[1] + 1.2 * uy, r1 + sl, elbow[0], elbow[1], r2 + sl)), topT));
      sleeve.push(piece(ink, `${key}s`, toD(K(Tm, elbow[0], elbow[1], r2 + sl, wrist[0], wrist[1], r3 + sl * 0.9)), {fill: T(topT), shade: T(topT + 0.85), off: 0.85, rim: true, rimK: out === 'leather' ? 1.6 : 1}));
      if (hi) {
        // the cuff: a shirt's under a suit, a rib on knitwear and bombers, a puffer's wide band
        const cuffIn: Pt = [wrist[0] - 1.25 * fx, wrist[1] - 1.25 * fy];
        if (out === 'suit' || out === 'suitOpen' || (out === 'blazer' && look.inner === 'shirt') || (long && look.inner === 'shirt')) {
          const c0: Pt = [wrist[0] - 0.2 * fx, wrist[1] - 0.2 * fy];
          sleeve.push(piece(ink, `${key}c`, toD(K(Tm, c0[0], c0[1], r3 + 0.25, wrist[0] + 0.75 * fx, wrist[1] + 0.75 * fy, r3 + 0.2)), {fill: tone(innerT), shade: tone(innerT + 1), off: 0.4, cut: true}));
        } else if (out === 'bomber' || out === 'knit' || out === 'hoodie' || out === 'cardigan' || out === 'puffer' || out === 'turtleneck') {
          const rib = out === 'puffer' ? 0.2 : 0.5;
          sleeve.push(piece(ink, `${key}c`, toD(K(Tm, cuffIn[0], cuffIn[1], r3 + sl * 0.8, wrist[0], wrist[1], r3 + sl * 0.7)), {fill: T(topT + rib), shade: T(topT + rib + 0.8), off: 0.5, cut: true, edge: false}));
        } else if (out === 'shirt' || out === 'blouse' || out === 'uniform') {
          sleeve.push(<path key={`${key}cl`} d={toLine(P(Tm, `M${cuffIn[0] - (r3 + sl) * fy} ${cuffIn[1] + (r3 + sl) * fx}L${cuffIn[0] + (r3 + sl) * fy} ${cuffIn[1] - (r3 + sl) * fx}`))} stroke={T(topT + 1.1)} strokeWidth={0.22} fill="none" />);
        }
        if (out === 'puffer')
          for (const t of [0.42, 0.85, 1.45]) {
            const q = at(t);
            const dx2 = t <= 1 ? ux : fx;
            const dy2 = t <= 1 ? uy : fy;
            const rr = (t <= 1 ? lerp(r1, r2, t) : lerp(r2, r3, t - 1)) + sl;
            sleeve.push(<path key={`${key}q${t}`} d={toLine(P(Tm, `M${q[0] - rr * dy2} ${q[1] + rr * dx2}Q${q[0] + 0.5 * dx2} ${q[1] + 0.5 * dy2} ${q[0] + rr * dy2} ${q[1] - rr * dx2}`))} stroke={T(topT + 1.2)} strokeWidth={0.3} fill="none" />);
          }
        if (out === 'bomber' && side < 0) {
          const q = at(0.45);
          upper.push(<path key={`${key}pk`} d={toD(E(Tm, q[0] - 0.4 * uy, q[1] + 0.4 * ux, 0.95, 0.7))} fill={T(topT + 0.7)} />);
        }
      }
    } else {
      // short or rolled: the bare arm, then the sleeve to mid upper arm (short) or just above the elbow (rolled)
      upper.push(piece(ink, `${key}k`, toD(K(Tm, S0[0] + 1.2 * ux, S0[1] + 1.2 * uy, r1, elbow[0], elbow[1], r2)), {fill: skin, shade: skin2, off: 0.85, cut: true, rim: true}));
      sleeve.push(piece(ink, `${key}f`, toD(K(Tm, elbow[0], elbow[1], r2, wrist[0], wrist[1], r3)), {fill: skin, shade: skin2, off: 0.85, rim: true}));
      const end = sleeveKind === 'short' ? 0.52 : 0.86;
      const se = at(end);
      const re = lerp(r1, r2, end) + sl;
      upper.push(cloth(`${key}v`, toD(K(Tm, S0[0] + 1.2 * ux, S0[1] + 1.2 * uy, r1 + sl, se[0], se[1], re)), topT));
      if (hi) {
        // the hem or the rolled cuff: a band across the arm
        const b0 = at(end - (sleeveKind === 'rolled' ? 0.16 : 0.07));
        const w0 = re + (sleeveKind === 'rolled' ? 0.22 : 0.02);
        const band = `M${b0[0] - w0 * uy} ${b0[1] + w0 * ux}L${b0[0] + w0 * uy} ${b0[1] - w0 * ux}L${se[0] + w0 * uy} ${se[1] - w0 * ux}L${se[0] - w0 * uy} ${se[1] + w0 * ux}Z`;
        upper.push(piece(ink, `${key}b`, toD(P(Tm, band)), sleeveKind === 'rolled' ? {fill: T(topT - 0.3), shade: T(topT + 0.45), off: 0.3, cut: true} : {fill: T(topT + (out === 'polo' ? 0.5 : 0.3)), edge: false}));
      }
    }
    // the hand: thumb toward the body's midline (it turns over when the arm rises)
    const haR = (a.ha * Math.PI) / 180;
    const mx = side * Math.cos(haR) - 0.3 * Math.sin(haR) >= 0 ? 1 : -1;
    const Hd = chain(Tm, tr(wrist[0], wrist[1]), rot(-a.ha), scl(a.hs * mx * 0.94, a.hs * 0.94));
    const hs = handShapes(Hd, a.hand, hi);
    const hand: React.ReactNode[] = [];
    // a watch on the left wrist (the screen-left arm of an unflipped figure)
    if (look.watch && side < 0 && hi) {
      const w0: Pt = [wrist[0] - 1.2 * fx, wrist[1] - 1.2 * fy];
      const w1: Pt = [wrist[0] - 0.35 * fx, wrist[1] - 0.35 * fy];
      hand.push(piece(ink, `${key}w`, toD(K(Tm, w0[0], w0[1], r3 + 0.35, w1[0], w1[1], r3 + 0.3)), {fill: tone(7), shade: tone(7), edge: false, cut: true}));
      hand.push(<path key={`${key}wf`} d={toD(E(Tm, (w0[0] + w1[0]) / 2 + 0.25 * fy, (w0[1] + w1[1]) / 2 - 0.25 * fx, 0.62, 0.62))} fill={tone(1)} />);
    }
    if (a.hand !== 'none' && hs.d) {
      hand.push(piece(ink, `${key}h`, hs.d, {fill: skin, shade: skin2, off: 0.5, cut: true, rim: true}));
      if (hi && hs.lines) hand.push(<path key={`${key}l`} d={hs.lines} stroke={mix(skin2, C.ilFeature, 0.15)} strokeWidth={0.22} strokeLinecap="round" fill="none" />);
      if (detail && hs.nails.length && k * a.hs > 9) hand.push(<path key={`${key}n`} d={toD(...hs.nails.map(([x, y]) => E(Hd, x, y - 0.32, 0.26, 0.3)))} fill={mix(skin, C.il0, 0.35)} opacity={0.8} />);
      if (hi && 'tip' in hs && hs.tip) hand.push(<path key={`${key}t`} d={toD(E(Hd, hs.tip[0], hs.tip[1], 0.8, 0.6))} fill={mix(skin, C.il0, 0.5)} />);
    }
    const [hdx, hdy] = dir(a.ha);
    const center: Pt = [wrist[0] + 3.4 * a.hs * hdx, wrist[1] + 3.4 * a.hs * hdy];
    const far = tAbs > 0.3 && Math.sign(tn) === side;
    const z = a.z === 'over' ? 'over' : a.z === 'front' ? 'front' : far ? 'back' : 'front';
    // the upper arm goes under the torso unless the figure is turned and this is the near arm
    const tuck = z !== 'back' && !(tAbs > 0.3 && Math.sign(tn) === -side);
    return {upper, sleeve: tuck ? sleeve : [...upper, ...sleeve], hand, center, z, tuck};
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

  // ---- legs (far first): trousers or bare legs, then the shoes ----
  const bare = look.bottom === 'skirt' || out === 'dress';
  const tights = bare && (look.age > 0 || look.shoe === 'boot' || look.shoe === 'chelsea');
  const legT = out === 'coverall' ? topT : look.legs;
  const legR: [number, number, number] = bare ? B.leg : look.bottom === 'trousers' || out === 'coverall' || out === 'uniform' ? [B.leg[0] + 0.45, B.leg[1] + 0.6, B.leg[2] + 0.85] : [B.leg[0] + 0.25, B.leg[1] + 0.35, B.leg[2] + 0.5];
  if (crop === 'full' && pv.hideLegs < 0.5) {
    const order: (-1 | 1)[] = tn > 0.05 ? [1, -1] : tn < -0.05 ? [-1, 1] : [-1, 1];
    for (const side of order) {
      const L = side < 0 ? LL : RL;
      const key = side < 0 ? 'lL' : 'lR';
      const [sdx, sdy] = dir(L.a);
      const boot = look.shoe === 'boot' || look.shoe === 'chelsea';
      const legEnd: Pt = bare ? L.ankle : [L.ankle[0] - (boot ? 3.2 : 1.6) * sdx, L.ankle[1] - (boot ? 3.2 : 1.6) * sdy];
      const toeDir = tAbs > 0.35 ? (tn > 0 ? 1 : -1) : side;
      const len = 1 + 0.55 * Math.min(1, tAbs * 1.4);
      const Sm = chain(Pm, tr(L.ankle[0], L.ankle[1]), scl(toeDir, 1));
      // the leg: skin or tights under a skirt, else the trouser leg down to a flat hem on the shoe
      if (bare) push(piece(ink, key, toD(K2(Pm, L.hip, legR[0], L.knee, legR[1], legEnd, legR[2])), tights ? {fill: T(6.4), shade: T(7), off: 0.8, cut: true, rim: true} : {fill: skin, shade: skin2, off: 0.8, cut: true, rim: true}));
      // the shoe (a sole band, the upper, its line)
      const shoe = look.shoe;
      const sT = look.shoeTone;
      const soleT = look.sole ?? Math.min(7, sT + 0.8);
      const sp = (pts: Pt[]) => toD(S(Sm, pts.map(([x, y]) => [x >= 0 ? x * len : x, y] as Pt)));
      if (shoe === 'heel') {
        push(piece(ink, `${key}o`, sp([[-2.1, 0.5], [-1.3, 0.5], [-1.45, 2.65], [-2.0, 2.65]]), {fill: T(7), cut: true, rim: true}));
        push(piece(ink, `${key}f`, sp([[-2.2, -1.1], [0.2, -0.9], [2.4, 0.1], [4.2, 1.35], [4.7, 2.2], [3.6, 2.35], [1.2, 1.6], [-0.6, 0.9], [-2.0, 0.85]]), {fill: T(sT), shade: T(sT + 0.9), off: 0.5, cut: true, rim: true}));
      } else if (shoe === 'flat') {
        push(piece(ink, `${key}f`, sp([[-2.6, -0.5], [0.0, -0.85], [2.4, -0.45], [4.2, 0.65], [4.55, 1.6], [4.1, 2.2], [-2.6, 2.2], [-3.0, 1.0]]), {fill: T(sT), shade: T(sT + 0.9), off: 0.5, cut: true, rim: true}));
      } else if (shoe === 'boot' || shoe === 'chelsea') {
        const work = shoe === 'boot';
        push(piece(ink, `${key}o`, sp([[-3.3, 1.5], [4.7, 1.5], [5.0, 2.3], [4.6, work ? 3.25 : 2.9], [-3.1, work ? 3.25 : 2.9], [-3.5, 2.3]]), {fill: T(7), shade: T(7), off: 0.3, cut: true, rim: true}));
        push(piece(ink, `${key}f`, sp([[-2.7, work ? -5.6 : -4.8], [1.4, work ? -5.6 : -4.8], [1.7, -1.7], [3.2, -0.9], [4.7, 0.5], [4.8, 1.7], [-2.9, 1.7], [-3.1, -1.2]]), {fill: T(sT), shade: T(sT + 0.9), off: 0.6, cut: true, rim: true}));
        if (hi) push(<path key={`${key}e`} d={shoe === 'chelsea' ? toD(S(Sm, [[-1.6, -4.6], [0.6, -4.6], [0.4, -1.6], [-1.4, -1.6]])) : toLine(P(Sm, 'M0.2 -4.6L1.4 -3.6M0.2 -3.4L1.5 -2.4M0.3 -2.2L1.9 -1.3'))} fill={shoe === 'chelsea' ? T(sT + 0.6) : 'none'} stroke={shoe === 'chelsea' ? 'none' : T(sT - 1.6)} strokeWidth={0.26} />);
      } else {
        // sneaker, derby, loafer
        const sneaker = shoe === 'sneaker';
        push(piece(ink, `${key}o`, sp(sneaker ? [[-3.4, 1.0], [4.65, 1.0], [5.0, 1.8], [4.6, 2.85], [-3.2, 2.85], [-3.6, 1.9]] : [[-3.0, 1.55], [4.9, 1.55], [5.1, 2.1], [4.6, 2.6], [-2.6, 2.6], [-3.0, 2.1]]), {fill: T(soleT), shade: T(soleT + 0.6), off: 0.3, cut: true, rim: true}));
        if (!sneaker) push(piece(ink, `${key}hb`, sp([[-3.0, 2.0], [-1.0, 2.0], [-1.0, 2.95], [-2.8, 2.95]]), {fill: T(7), edge: false}));
        push(piece(ink, `${key}f`, sp(sneaker ? [[-2.9, -1.6], [-0.6, -2.2], [2.0, -1.7], [3.8, -0.6], [4.5, 0.9], [4.3, 1.55], [-2.9, 1.55], [-3.4, 0.4]] : [[-2.7, -1.35], [-0.4, -1.65], [2.4, -1.15], [4.4, 0.0], [5.0, 1.15], [4.6, 1.75], [-2.6, 1.75], [-3.1, 0.6]]), {fill: T(sT), shade: T(sT + 0.9), off: 0.6, cut: true, rim: true}));
        if (hi && sneaker) push(<path key={`${key}lc`} d={toLine(P(Sm, `M${-0.6 * len} -1.0Q${1.0 * len} -0.4 ${2.2 * len} 0.4`))} stroke={T(sT > 3 ? sT - 2.4 : sT + 1.6)} strokeWidth={0.32} strokeLinecap="round" fill="none" />);
        if (hi && shoe === 'loafer') push(<path key={`${key}lc`} d={toLine(P(Sm, `M${1.2 * len} -0.9Q${2.2 * len} -0.3 ${3.0 * len} 0.3`))} stroke={T(sT - 1.4)} strokeWidth={0.3} fill="none" />);
      }
      if (!bare) {
        // the trouser leg over the shoe's collar: one silhouette down to a flat hem
        const Hm2 = chain(Pm, tr(legEnd[0], legEnd[1]), rot(-L.a));
        const hw = legR[2];
        const legD = toD(K2(Pm, L.hip, legR[0], L.knee, legR[1], legEnd, hw), P(Hm2, `M${-hw} -1.4L${hw} -1.4L${hw + 0.08} 0.2C${hw * 0.7} 0.42 ${-hw * 0.7} 0.42 ${-hw - 0.08} 0.2Z`));
        push(piece(ink, key, legD, {fill: T(legT), shade: T(legT + 0.85), off: 1, cut: true, rim: true}));
        if (hi && (look.bottom === 'trousers' || out === 'uniform') && out !== 'coverall') {
          // the crease: a light line down the front of the leg
          const m1: Pt = [lerp(L.hip[0], L.knee[0], 0.45), lerp(L.hip[1], L.knee[1], 0.45)];
          push(<path key={`${key}cr`} d={toLine(P(Pm, `M${m1[0]} ${m1[1]}L${L.knee[0]} ${L.knee[1]}L${legEnd[0] - 0.6 * sdx} ${legEnd[1] - 0.6 * sdy}`))} stroke={T(legT - 0.7)} strokeWidth={0.24} fill="none" opacity={0.8} />);
        }
        if (hi && look.bottom === 'chinos') {
          const c0: Pt = [legEnd[0] - 1.1 * sdx, legEnd[1] - 1.1 * sdy];
          push(piece(ink, `${key}cf`, toD(K(Pm, c0[0], c0[1], hw + 0.12, legEnd[0], legEnd[1], hw + 0.12)), {fill: T(legT - 0.35), edge: false}));
        }
      }
    }
  }

  // ---- the hips: the trousers' top (or the coverall's), a skirt, a dress's skirt ----
  const X = (x: number) => cx + x * wB;
  const xs = (x: number) => X(x).toFixed(2);
  const hipW = B.hip;
  if (crop !== 'head' && !bare) {
    const pts: Pt[] = [[-hipW - 0.2, -55.4], [hipW + 0.2, -55.4], [hipW + 0.35, -50.6], [hipW - 0.1, -46.4], [3.6, -44.8], [0, -45.6], [-3.6, -44.8], [-hipW + 0.1, -46.4], [-hipW - 0.35, -50.6]];
    push(piece(ink, 'pel', toD(S(Pel, pts.map(([x, y]) => [cx * 0.6 + x * wB, y] as Pt))), {fill: T(legT), shade: T(legT + 0.85), off: 1.1, cut: true, rim: true}));
  }
  if (crop !== 'head' && bare) {
    // the skirt (with a top) or the dress's: from the waist to above the knee, a gentle A-line
    const skT = out === 'dress' ? topT : look.legs;
    const flare = out === 'dress' ? 2.4 : 1.6;
    const pts: Pt[] = [[-B.waist - 0.4, -58.2], [B.waist + 0.4, -58.2], [hipW + 0.6, -51.4], [hipW + 0.9 + flare * 0.5, -40], [hipW + 1.0 + flare, -27.6], [0, -27.0], [-hipW - 1.0 - flare, -27.6], [-hipW - 0.9 - flare * 0.5, -40], [-hipW - 0.6, -51.4]];
    push(piece(ink, 'skirt', toD(S(Pel, pts.map(([x, y]) => [cx * 0.6 + x * wB, y] as Pt))), {fill: T(skT), shade: T(skT + 0.85), off: 1.1, cut: true, rim: true}));
    if (hi) push(<path key="skf" d={toLine(P(Pel, `M${xs(2.2)} -49L${xs(3.4)} -28.4`)) + toLine(P(Pel, `M${xs(-3.2)} -47L${xs(-4.6)} -28.6`))} stroke={T(skT + 0.9)} strokeWidth={0.26} fill="none" opacity={0.7} />);
  }

  // ---- the torso: the garment's body ----
  const e = ez.e;
  const sx = sh;
  const pad = ez.pad;
  const hemY = look.tucked ? -53.6 : look.bottom === 'skirt' && !jacket ? Math.max(ez.hem, -56.6) : ez.hem;
  const half: Pt[] = [
    [3.2 + 0.1 * e, -78.4],
    [6.2 + 0.2 * e, -77.6],
    [sx + 1.0 + 0.3 * e + 0.5 * pad, -75.9],
    [sx + 1.2 + 0.35 * e + 0.4 * pad, -73.4],
    [sx - 0.3 + 0.45 * e, -68.6],
    [sx - (look.fem ? 0.5 : 0.6) + 0.4 * e, -63.4],
    [B.waist + 0.6 * e + (out === 'bomber' || out === 'puffer' ? 1.0 : 0), -57.6],
  ];
  if (hemY < -53) half.push([hipW + 0.45 * e - (out === 'bomber' ? 0.6 : 0), hemY + 0.6]);
  else {
    half.push([hipW + 0.5 * e, -51.8]);
    if (hemY > -42) half.push([hipW + 0.5 * e + 0.6, -41.0]);
  }
  const hemX = long ? hipW + 0.5 * e + 1.2 : hemY < -53 ? hipW + 0.45 * e - (out === 'bomber' ? 0.6 : 0) : hipW + 0.5 * e - (out === 'bomber' ? 0.8 : 0.1);
  const torsoPts: Pt[] = [[0, -78.0], ...half, [hemX, hemY], [0, hemY + (long ? 0.4 : 0.25)], [-hemX, hemY], ...mirrorPts(half)].map(([x, y]) => [X(x), y] as Pt);
  if (AL?.tuck) AL.upper.forEach(push);
  if (AR?.tuck) AR.upper.forEach(push);
  push(piece(ink, 'torso', toD(S(Tm, torsoPts)), {fill: T(topT), shade: T(topT + 0.85), off: 1.6, cut: true, rim: true, rimK: out === 'leather' ? 1.7 : 1}));
  const det = (key: string, d: string, fill: string, extra: Partial<Parameters<typeof piece>[3]> = {}) => push(piece(ink, key, d, {fill, edge: false, ...extra}));
  const lineD = (key: string, d: string, col: string, px = 1.3, op = 1) => push(<path key={key} d={toLine(P(Tm, d))} stroke={col} strokeWidth={px / k} strokeLinecap="round" fill="none" opacity={op} />);
  const btns = (key: string, x: number, ys: number[], t: number, r = 0.42) => det(key, toD(...ys.map((y) => E(Tm, X(x), y, r))), T(t));
  const edgeCol = T(topT + 1.2);
  // the inner layer that shows in an open front (a tee, a shirt, a turtleneck, a knit, a blouse)
  const innerKind = look.inner;
  const openFront = out === 'suitOpen' || out === 'blazer' || out === 'overcoat' || out === 'cardigan' || out === 'denim';
  if (openFront && long) det('gap', toD(P(Tm, `M${xs(-2.9)} -52L${xs(2.9)} -52L${xs(2.9)} ${hemY + 0.6}L${xs(-2.9)} ${hemY + 0.6}Z`)), T(look.legs), {cut: true, edge: true});
  if (openFront && innerKind !== 'none') det('inner', toD(P(Tm, `M${xs(-3.6)} -78.4L${xs(3.6)} -78.4L${xs(2.7)} ${Math.min(hemY + 1, -50.8)}L${xs(-2.7)} ${Math.min(hemY + 1, -50.8)}Z`)), T(innerT), {shade: T(innerT + 0.7), off: 0.7, cut: true, edge: true});
  if (out === 'suit') {
    det('inner', toD(P(Tm, `M${xs(-3.5)} -78.4L${xs(3.5)} -78.4L${xs(0)} -59.4Z`)), tone(innerT), {shade: tone(innerT + 1), off: 0.5, cut: true, edge: true});
    det('below', toD(P(Tm, `M${xs(-0.4)} -59.6L${xs(0.4)} -59.6L${xs(2.6)} ${hemY + 0.3}L${xs(-2.6)} ${hemY + 0.3}Z`)), T(look.legs + 0.3), {cut: true, edge: true});
  }
  if (out === 'leather' || out === 'bomber' || out === 'trench') det('inner', toD(P(Tm, `M${xs(-3.3)} -78.4L${xs(3.3)} -78.4L${xs(out === 'leather' ? 2.4 : 1.4)} ${out === 'leather' ? -70.5 : -73.2}L${xs(-1.4)} ${out === 'leather' ? -72.5 : -73.2}Z`)), T(innerT), {cut: true, edge: true});

  // ---- the neck: skin (a shaded underside), an open collar's V ----
  const openV = (out === 'suitOpen' && innerKind === 'shirt') || (out === 'shirt' && !look.tie) || out === 'polo' || out === 'uniform' || out === 'blouse' || out === 'coverall' || (out === 'dress' && look.tone % 2 === 0) || (out === 'cardigan' && innerKind === 'blouse');
  push(piece(ink, 'neck', toD(K(Tm, cx + 0.3 * tn, -83.4, B.neck * 0.95, cx, -77.6, B.neck)), {fill: mix(skin, skin2, 0.6), cut: false}));
  if (openV) det('vee', toD(P(Tm, `M${xs(-1.9)} -78.6L${xs(1.9)} -78.6L${xs(0)} ${out === 'blouse' || out === 'dress' ? -72.6 : -74.4}Z`)), mix(skin, skin2, 0.35));

  // ---- collars, the inner's neckline, the tie ----
  const crew = (key: string, t: number) => det(key, toD(S(Tm, [[X(-3.5), -78.6], [X(-2.4), -76.7], [X(0), -76.0], [X(2.4), -76.7], [X(3.5), -78.6], [X(2.6), -78.5], [X(1.6), -77.5], [X(0), -77.1], [X(-1.6), -77.5], [X(-2.6), -78.5]])), T(t), {cut: true, edge: true});
  const shirtCollar = (key: string, t: number, closed: boolean) => {
    for (const s of [-1, 1]) det(`${key}${s}`, toD(P(Tm, `M${xs(s * 3.5)} -79.2L${xs(s * (closed ? 0.25 : 1.3))} ${closed ? -77.0 : -76.6}L${xs(s * (closed ? 0.9 : 2.2))} -74.7L${xs(s * 4.1)} -76.9Z`)), T(t), {shade: T(t + 0.8), off: 0.35, cut: true, edge: true, rim: true});
  };
  const turtle = (key: string, t: number) => {
    // a fitted roll neck: just wider than the neck, folded once
    const nw = B.neck + 0.45;
    det(key, toD(S(Tm, [[X(-nw), -81.0], [X(nw), -81.0], [X(nw + 0.7), -76.6], [X(0), -76.0], [X(-nw - 0.7), -76.6]])), T(t), {shade: T(t + 0.8), off: 0.45, cut: true, edge: true, rim: true});
    if (hi) lineD(`${key}a`, `M${xs(-nw - 0.2)} -78.7Q${xs(0)} -78.0 ${xs(nw + 0.2)} -78.7`, T(t + 0.9), 1.0, 0.7);
  };
  const showInnerCollar = openFront || out === 'suit' || out === 'leather' || out === 'bomber' || out === 'trench';
  if (showInnerCollar) {
    if (innerKind === 'turtleneck') turtle('tn', innerT);
    else if (innerKind === 'shirt') shirtCollar('sc', innerT, out === 'suit' || look.tie !== null);
    else if (innerKind === 'tee' || innerKind === 'knit') crew('crw', innerT + 0.4);
    else if (innerKind === 'blouse') for (const s of [-1, 1]) det(`bc${s}`, toD(P(Tm, `M${xs(s * 3.2)} -78.9L${xs(s * 0.4)} -73.6L${xs(s * 1.6)} -73.9L${xs(s * 3.9)} -77.6Z`)), T(innerT), {cut: true, edge: true});
  }
  if (look.tie !== null) {
    const ti = look.tie;
    det('knot', toD(P(Tm, `M${xs(-0.95)} -77.6L${xs(0.95)} -77.6L${xs(0.7)} -75.7L${xs(-0.7)} -75.7Z`)), T(ti - 0.3), {cut: true, edge: true});
    det('tie', toD(P(Tm, `M${xs(-0.7)} -75.8L${xs(0.7)} -75.8L${xs(1.35)} -63.2L${xs(0)} -61.4L${xs(-1.35)} -63.2Z`)), T(ti), {shade: T(ti + 0.9), off: 0.3, cut: true, edge: true});
  }

  // ---- the garment's own details ----
  if (out === 'suit' || out === 'suitOpen' || out === 'blazer' || out === 'overcoat') {
    // notched lapels; a closed suit's meet at the button, an open front's run down its edges
    const low = out === 'suit' ? -59.6 : out === 'overcoat' ? -61.0 : -62.4;
    const wide = out === 'overcoat' ? 1.2 : out === 'blazer' ? -0.2 : 0;
    for (const s of [-1, 1]) {
      const inX = out === 'suit' ? 0.45 : 2.85;
      det(`lp${s}`, toD(P(Tm, `M${xs(s * 3.5)} -78.7L${xs(s * 6.0)} -77.7L${xs(s * 6.4)} -73.9L${xs(s * 5.3)} -73.4L${xs(s * (7.4 + wide))} -71.6L${xs(s * inX)} ${low}L${xs(s * (inX + 0.5))} ${low + 3.4}L${xs(s * 2.9)} -73.6Z`)), T(topT - 0.45), {shade: T(topT + 0.35), off: 0.45, cut: true, edge: true, rim: true});
      if (out !== 'suit') lineD(`fe${s}`, `M${xs(s * inX)} ${low}L${xs(s * 2.75)} ${hemY + 0.3}`, edgeCol, 1.2);
    }
    if (out === 'suit') {
      btns('btn', 0.35, [-59.6, -54.0], topT + 1.2);
      if (hi) lineD('cut', `M${xs(0.45)} -59.6Q${xs(1.2)} -50 ${xs(2.6)} ${hemY + 0.3}`, edgeCol, 1.1);
    } else if (out === 'overcoat') btns('btn', -2.7, [-58.6, -50.2, -41.8, -33.4], topT + 1.3, 0.48);
    if (hi) {
      // the breast pocket's welt (the wearer's left: screen right) and the hip pockets' flaps
      lineD('bp', `M${xs(4.2)} -66.4L${xs(7.3)} -66.9`, edgeCol, 1.1);
      if (out === 'suit' && look.role === 'boss') det('sq', toD(P(Tm, `M${xs(4.6)} -66.6L${xs(5.6)} -68.1L${xs(6.4)} -66.8Z`)), tone(0), {edge: false});
      for (const s of [-1, 1]) lineD(`hp${s}`, `M${xs(s * 3.6)} ${out === 'overcoat' ? -46.4 : -50.2}L${xs(s * 8.2)} ${out === 'overcoat' ? -46.8 : -50.5}`, edgeCol, 1.1);
      if (out === 'overcoat') lineD('cl', `M${xs(0)} ${hemY + 0.4}L${xs(0)} ${hemY + 6}`, edgeCol, 1.0, 0);
    }
  }
  if (out === 'trench') {
    // double-breasted, belted: wide collar and lapels, two rows of buttons, the storm flap, the belt, the skirt's opening
    for (const s of [-1, 1]) det(`lp${s}`, toD(P(Tm, `M${xs(s * 3.3)} -79.0L${xs(s * 7.0)} -78.0L${xs(s * 7.6)} -72.4L${xs(s * 6.0)} -71.6L${xs(s * 7.8)} -69.0L${xs(s * 1.9)} -64.6L${xs(s * 2.6)} -72.8Z`)), T(topT - 0.4), {shade: T(topT + 0.4), off: 0.45, cut: true, edge: true, rim: true});
    if (hi) {
      det('flap', toD(P(Tm, `M${xs(3.4)} -74.4L${xs(9.6)} -72.2L${xs(9.2)} -66.4L${xs(4.2)} -67.6Z`)), T(topT - 0.2), {shade: T(topT + 0.5), off: 0.4, cut: true, edge: true});
      btns('btnA', -2.2, [-62.4, -52.4, -46.4], topT + 1.5, 0.5);
      btns('btnB', 3.4, [-62.4, -52.4, -46.4], topT + 1.5, 0.5);
      lineD('ope', `M${xs(1.6)} -64.4L${xs(1.9)} ${hemY + 0.4}`, edgeCol, 1.2);
      for (const s of [-1, 1]) det(`ep${s}`, toD(K(Tm, X(s * (sx - 1.8)), -76.2, 0.55, X(s * (sx + 0.4)), -75.8, 0.5)), T(topT - 0.3), {edge: false});
    }
    det('belt', toD(P(Tm, `M${xs(-B.waist - 1.0)} -58.8L${xs(B.waist + 1.0)} -58.8L${xs(B.waist + 1.0)} -56.4L${xs(-B.waist - 1.0)} -56.4Z`)), T(topT + 0.4), {shade: T(topT + 1.1), off: 0.4, cut: true, edge: true});
    det('buckle', toD(P(Tm, `M${xs(-0.9)} -59.2L${xs(1.3)} -59.2L${xs(1.3)} -56.0L${xs(-0.9)} -56.0Z`)), T(topT + 1.6), {edge: false});
    if (hi) det('tail', toD(K(Tm, X(-1.6), -57.2, 0.5, X(-2.6), -51.8, 0.45)), T(topT + 0.4), {edge: false});
  }
  if (out === 'leather') {
    // the biker: wide lapels, the zip running across the chest, the belt at the hem
    det('lpL', toD(P(Tm, `M${xs(-3.4)} -78.8L${xs(-7.6)} -77.6L${xs(-8.2)} -72.0L${xs(-3.0)} -64.6L${xs(-1.4)} -72.6Z`)), T(topT - 0.55), {shade: T(topT + 0.3), off: 0.45, cut: true, edge: true, rim: true, rimK: 1.6});
    det('lpR', toD(P(Tm, `M${xs(3.4)} -78.8L${xs(7.6)} -77.6L${xs(7.0)} -72.6L${xs(3.0)} -70.0Z`)), T(topT - 0.55), {shade: T(topT + 0.3), off: 0.45, cut: true, edge: true, rim: true, rimK: 1.6});
    if (hi) {
      lineD('zip', `M${xs(3.0)} -70.0L${xs(-0.6)} -60.0L${xs(-0.5)} ${hemY + 2.6}`, tone(1), 1.3, 0.85);
      lineD('zp1', `M${xs(-5.4)} -60.4L${xs(-2.6)} -57.4`, tone(1), 1.1, 0.6);
      lineD('zp2', `M${xs(5.6)} -63.2L${xs(3.4)} -59.6`, tone(1), 1.1, 0.6);
    }
    det('belt', toD(P(Tm, `M${xs(-hemX)} ${hemY - 1.8}L${xs(hemX)} ${hemY - 1.8}L${xs(hemX)} ${hemY}L${xs(-hemX)} ${hemY}Z`)), T(topT + 0.3), {edge: false});
    det('buckle', toD(P(Tm, `M${xs(-7.2)} ${hemY - 2.1}L${xs(-5.4)} ${hemY - 2.1}L${xs(-5.4)} ${hemY + 0.3}L${xs(-7.2)} ${hemY + 0.3}Z`)), tone(1.5), {edge: false});
  }
  if (out === 'bomber') {
    det('rib', toD(S(Tm, [[X(-3.7), -79.0], [X(-2.4), -76.6], [X(2.4), -76.6], [X(3.7), -79.0], [X(2.6), -78.8], [X(1.6), -77.6], [X(-1.6), -77.6], [X(-2.6), -78.8]])), T(topT + 0.55), {cut: true, edge: true});
    det('hem', toD(P(Tm, `M${xs(-hemX - 0.1)} ${hemY - 2.6}L${xs(hemX + 0.1)} ${hemY - 2.6}L${xs(hemX)} ${hemY}L${xs(-hemX)} ${hemY}Z`)), T(topT + 0.5), {edge: false});
    if (hi) {
      lineD('zip', `M${xs(0.2)} -73.2L${xs(0.25)} ${hemY}`, T(topT + 1.4), 1.2);
      for (let i = -3; i <= 3; i++) lineD(`rb${i}`, `M${xs(i * 2.3)} ${hemY - 2.4}L${xs(i * 2.3)} ${hemY - 0.2}`, T(topT + 1.2), 0.8, 0.6);
      lineD('pk', `M${xs(-7.6)} -59.4L${xs(-5.4)} -54.0`, T(topT + 1.2), 1.1);
    }
  }
  if (out === 'denim') {
    for (const s of [-1, 1]) det(`col${s}`, toD(P(Tm, `M${xs(s * 3.4)} -79.0L${xs(s * 6.6)} -78.2L${xs(s * 6.0)} -74.4L${xs(s * 2.8)} -73.8Z`)), T(topT - 0.4), {shade: T(topT + 0.5), off: 0.35, cut: true, edge: true, rim: true});
    if (hi) {
      for (const s of [-1, 1]) {
        lineD(`pk${s}`, `M${xs(s * 3.6)} -69.4L${xs(s * 7.6)} -69.4L${xs(s * 7.4)} -64.6L${xs(s * 3.8)} -64.6Z`, T(topT - 0.9), 1.0, 0.85);
        lineD(`fl${s}`, `M${xs(s * 3.6)} -69.4L${xs(s * 5.6)} -67.2L${xs(s * 7.6)} -69.4`, T(topT - 0.9), 1.0, 0.85);
        lineD(`yk${s}`, `M${xs(s * 3.0)} -71.4L${xs(s * (sx + 0.6))} -71.0`, T(topT - 0.9), 0.9, 0.7);
      }
      det('wb', toD(P(Tm, `M${xs(-hemX)} ${hemY - 2.0}L${xs(hemX)} ${hemY - 2.0}L${xs(hemX)} ${hemY}L${xs(-hemX)} ${hemY}Z`)), T(topT + 0.35), {edge: false});
      btns('btn', 3.0, [-66.8, -60.6, -54.6, hemY - 1.0], topT - 1.6, 0.4);
    }
  }
  if (out === 'puffer') {
    det('col', toD(S(Tm, [[X(-3.7), -80.6], [X(3.7), -80.6], [X(4.4), -76.0], [X(0), -75.3], [X(-4.4), -76.0]])), T(topT), {shade: T(topT + 0.8), off: 0.5, cut: true, edge: true, rim: true});
    if (hi) {
      for (const y of [-71.4, -66.2, -61.0, -55.8, -50.6]) lineD(`q${y}`, `M${xs(-sx - 0.1)} ${y}Q${xs(0)} ${y + 0.9} ${xs(sx + 0.1)} ${y}`, T(topT + 1.25), 1.3);
      lineD('zip', `M${xs(0.3)} -80.2L${xs(0.35)} ${hemY}`, T(topT + 1.5), 1.2);
    }
  }
  if (out === 'shirt' || out === 'uniform') {
    shirtCollar('col', topT - 0.25, Boolean(look.tie));
    if (hi) {
      lineD('plk', `M${xs(0.25)} -74.6L${xs(0.25)} ${hemY}`, T(topT + 1.0), 1.1);
      btns('btn', 0.75, [-71.2, -65.8, -60.4, -55.0, -49.6].filter((y) => y > hemY + 1), topT + 1.4, 0.32);
      if (!look.fem || out === 'uniform') lineD('pk', `M${xs(3.4)} -69.6L${xs(7.2)} -69.6L${xs(7.0)} -64.2L${xs(3.6)} -64.2Z`, T(topT + 0.9), 1.0, 0.9);
      if (out === 'uniform') {
        lineD('pk2', `M${xs(-3.4)} -69.6L${xs(-7.2)} -69.6L${xs(-7.0)} -64.2L${xs(-3.6)} -64.2Z`, T(topT + 0.9), 1.0, 0.9);
        for (const s of [-1, 1]) det(`ep${s}`, toD(K(Tm, X(s * (sx - 2.4)), -76.6, 0.6, X(s * (sx + 0.5)), -75.9, 0.55)), T(topT + 0.8), {edge: false});
        det('badge', toD(P(Tm, `M${xs(-5.2)} -73.4L${xs(-4.6)} -72.0L${xs(-3.4)} -72.4L${xs(-4.2)} -71.2L${xs(-3.8)} -69.8L${xs(-5.2)} -70.6L${xs(-6.6)} -69.8L${xs(-6.2)} -71.2L${xs(-7.0)} -72.4L${xs(-5.8)} -72.0Z`)), tone(1), {edge: false});
        det('name', toD(P(Tm, `M${xs(3.6)} -72.6L${xs(7.0)} -72.6L${xs(7.0)} -71.4L${xs(3.6)} -71.4Z`)), tone(1.5), {edge: false});
      }
    }
  }
  if (out === 'polo') {
    for (const s of [-1, 1]) det(`col${s}`, toD(P(Tm, `M${xs(s * 3.4)} -79.0L${xs(s * 1.0)} -76.4L${xs(s * 1.9)} -74.8L${xs(s * 4.6)} -76.8Z`)), T(topT - 0.3), {shade: T(topT + 0.6), off: 0.3, cut: true, edge: true, rim: true});
    if (hi) {
      lineD('plk', `M${xs(-0.9)} -76.2L${xs(-0.9)} -68.6L${xs(0.9)} -68.6L${xs(0.9)} -76.2`, T(topT + 1.0), 1.0);
      btns('btn', 0, [-73.4, -70.4], topT + 1.4, 0.3);
    }
  }
  if (out === 'turtleneck') turtle('tn', topT - 0.2);
  if (out === 'knit' || out === 'tee' || out === 'hoodie') {
    if (out !== 'hoodie') crew('crw', topT + (out === 'knit' ? 0.5 : 0.4));
    if (out === 'knit' && innerKind === 'shirt') shirtCollar('sc', innerT, true);
    if (out === 'knit' || out === 'hoodie') det('hem', toD(P(Tm, `M${xs(-hemX)} ${hemY - 2.4}L${xs(hemX)} ${hemY - 2.4}L${xs(hemX - 0.1)} ${hemY}L${xs(-hemX + 0.1)} ${hemY}Z`)), T(topT + 0.45), {edge: false});
    if (hi && out === 'knit') for (const x of [-4.6, -1.6, 1.6, 4.6]) lineD(`kr${x}`, `M${xs(x)} -73.4L${xs(x * 0.92)} ${hemY - 2.6}`, T(topT + 0.6), 1.0, 0.55);
  }
  if (out === 'hoodie') {
    const outer: Pt[] = [[-7.4, -80.2], [-6.2, -76.9], [-3.4, -74.9], [0, -74.2], [3.4, -74.9], [6.2, -76.9], [7.4, -80.2]];
    const inner: Pt[] = [[5.0, -80.6], [3.5, -78.0], [0, -76.6], [-3.5, -78.0], [-5.0, -80.6]];
    det('hood', toD(S(Tm, [...outer, ...inner].map(([x, y]) => [X(x), y] as Pt))), T(topT - 0.35), {shade: T(topT + 0.55), off: 0.6, cut: true, edge: true, rim: true});
    if (hi) {
      for (const s of [-1, 1]) det(`ds${s}`, toD(K(Tm, X(s * 1.6), -75.4, 0.3, X(s * 1.85), -69.4, 0.28)), tone(1));
      lineD('pocket', `M${xs(-6.4)} ${hemY - 2.6}L${xs(-5.0)} -57.4L${xs(5.0)} -57.4L${xs(6.4)} ${hemY - 2.6}`, T(topT + 1.0), 1.3);
    }
  }
  if (out === 'cardigan') {
    for (const s of [-1, 1]) lineD(`ce${s}`, `M${xs(s * 3.5)} -78.4L${xs(s * 0.7)} -62L${xs(s * 0.7)} ${hemY}`, T(topT + 1.0), 1.4);
    det('pk', toD(P(Tm, `M${xs(-3.0)} -62L${xs(3.0)} -62L${xs(2.7)} ${hemY + 1}L${xs(-2.7)} ${hemY + 1}Z`)), T(topT), {edge: false});
    lineD('plk', `M${xs(0.2)} -62L${xs(0.2)} ${hemY}`, T(topT + 1.1), 1.2);
    btns('btn', 0.9, [-59.4, -54.2, -49.0], topT + 1.6, 0.42);
    det('hem', toD(P(Tm, `M${xs(-hemX)} ${hemY - 2.2}L${xs(hemX)} ${hemY - 2.2}L${xs(hemX - 0.1)} ${hemY}L${xs(-hemX + 0.1)} ${hemY}Z`)), T(topT + 0.4), {edge: false});
  }
  if (out === 'blouse' && hi) {
    for (const s of [-1, 1]) lineD(`bl${s}`, `M${xs(s * 3.3)} -78.6Q${xs(s * 1.9)} -75.6 ${xs(0)} -72.6`, T(topT + 0.9), 1.2);
    lineD('dr', `M${xs(-3.6)} -60.4Q${xs(-2.4)} -55.4 ${xs(-3.0)} ${hemY + 1}`, T(topT + 0.8), 1.0, 0.6);
  }
  if (out === 'dress') {
    // the neckline (a V on light dresses, a scoop on dark ones), the waist's seam
    if (look.tone % 2 === 1) det('scoop', toD(S(Tm, [[X(-4.4), -78.4], [X(4.4), -78.4], [X(3.4), -74.6], [X(0), -73.4], [X(-3.4), -74.6]])), mix(skin, skin2, 0.35), {edge: true, cut: true});
    else for (const s of [-1, 1]) lineD(`dv${s}`, `M${xs(s * 3.3)} -78.6L${xs(0)} -72.6`, T(topT + 0.9), 1.2);
    det('waist', toD(P(Tm, `M${xs(-B.waist - 0.4)} -58.8L${xs(B.waist + 0.4)} -58.8L${xs(B.waist + 0.4)} -57.4L${xs(-B.waist - 0.4)} -57.4Z`)), T(topT + 0.6), {edge: false});
  }
  if (out === 'coverall') {
    shirtCollar('col', topT - 0.3, false);
    if (hi) {
      lineD('zip', `M${xs(0.2)} -74.6L${xs(0.2)} ${hemY}`, T(topT + 1.3), 1.3);
      for (const s of [-1, 1]) {
        lineD(`pk${s}`, `M${xs(s * 2.8)} -69.4L${xs(s * 7.0)} -69.4L${xs(s * 6.8)} -63.6L${xs(s * 3.0)} -63.6Z`, T(topT + 1.0), 1.0);
        det(`pf${s}`, toD(P(Tm, `M${xs(s * 2.8)} -69.6L${xs(s * 7.0)} -69.6L${xs(s * 7.0)} -67.8L${xs(s * 2.8)} -67.8Z`)), T(topT + 0.4), {edge: false});
      }
      det('patch', toD(P(Tm, `M${xs(3.2)} -72.8L${xs(6.8)} -72.8L${xs(6.8)} -71.0L${xs(3.2)} -71.0Z`)), tone(0.5), {edge: false});
    }
    det('belt', toD(P(Tm, `M${xs(-B.waist - 0.9)} -57.8L${xs(B.waist + 0.9)} -57.8L${xs(B.waist + 0.9)} -55.8L${xs(-B.waist - 0.9)} -55.8Z`)), T(topT + 0.7), {edge: false});
  }
  // a tucked top: the belt over the seam
  if (look.tucked && crop !== 'head') {
    det('belt', toD(P(Tm, `M${xs(-hipW - 0.35)} -54.6L${xs(hipW + 0.35)} -54.6L${xs(hipW + 0.4)} -52.6L${xs(-hipW - 0.4)} -52.6Z`)), tone(7), {cut: true, edge: true});
    det('buckle', toD(P(Tm, `M${xs(-0.9)} -54.9L${xs(1.1)} -54.9L${xs(1.1)} -52.3L${xs(-0.9)} -52.3Z`)), tone(out === 'uniform' ? 2 : 3), {edge: false});
  }
  if (out === 'coverall' && crop === 'full') det('rag', toD(S(Pel, [[X(7.4), -50.4], [X(10.0), -50.8], [X(10.9), -45.6], [X(9.8), -41.6], [X(8.2), -43.4], [X(7.6), -46.2]])), tone(2), {shade: tone(3), off: 0.5, cut: true, edge: true, rim: true});
  // accessories on the body: a chain, a scarf, a crossbody bag
  if (look.chain && hi) {
    lineD('chain', `M${xs(-2.6)} -77.8Q${xs(0)} -73.0 ${xs(2.6)} -77.8`, tone(0.6), 1.3);
    det('pend', toD(E(Tm, X(0), -73.6, 0.5)), tone(0.6));
  }
  if (look.scarf !== null) {
    const sc = look.scarf;
    det('scarf', toD(S(Tm, [[X(-4.5), -79.4], [X(4.5), -79.4], [X(4.9), -75.6], [X(0), -74.2], [X(-4.9), -75.6]])), T(sc), {shade: T(sc + 0.8), off: 0.5, cut: true, edge: true, rim: true});
    det('scarfE', toD(P(Tm, `M${xs(-3.2)} -76.0L${xs(-0.6)} -75.6L${xs(-1.0)} -61.4L${xs(-3.6)} -61.8Z`)), T(sc + 0.25), {shade: T(sc + 0.9), off: 0.4, cut: true, edge: true, rim: true});
  }
  if (look.bag && crop !== 'head') {
    lineD('strap', `M${xs(6.8)} -76.8L${xs(-6.6)} -57.6`, tone(7), 1.8);
    det('bag', toD(P(Tm, `M${xs(-10.0)} -58.4L${xs(-4.6)} -58.4L${xs(-4.4)} -51.8L${xs(-10.2)} -51.8Z`)), tone(6.5), {shade: tone(7), off: 0.4, cut: true, edge: true, rim: true});
    if (hi) lineD('flap', `M${xs(-10.0)} -56.4L${xs(-4.6)} -56.4`, tone(5), 1.0);
  }

  // ---- the head ----
  const fs = 2.2 * tn;
  const jaw = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x + (y > -86 ? 0.45 * tn * ((y + 86) / 4.2) : 0), y] as Pt);
  // ears (behind the head): the far ear hides when turned
  const earsShow = !['long', 'waves', 'bob', 'lob', 'curls', 'wavy'].includes(look.hair) || look.hat === 'peaked';
  if (hi && earsShow)
    for (const side of [-1, 1] as const) {
      const far = Math.sign(tn) === side;
      if (far && tAbs > 0.35) continue;
      const ex = side * (B.hw - 0.05) + (far ? 0 : -side * 3.0 * tAbs) + (far ? -side * 1.4 * tAbs : 0);
      push(piece(ink, side < 0 ? 'earL' : 'earR', toD(E(Hm, ex, -89.3, 1.15, 1.75)), {fill: skin, shade: skin2, off: 0.5, cut: true, rim: true}));
      push(<path key={side < 0 ? 'eiL' : 'eiR'} d={toD(E(Hm, ex + side * 0.15, -89.2, 0.5, 0.95))} fill={skin2} />);
    }
  const w = B.hw;
  const headPts: Pt[] = look.fem
    ? [[0, -98.2], [4.5, -97.5], [6.65, -95.0], [w + 0.05, -91.2], [w - 0.15, -88.0], [6.0, -85.2], [4.3, -83.2], [2.1, -82.2], [0, -82.0]]
    : [[0, -98.4], [4.7, -97.7], [6.9, -95.2], [w + 0.1, -91.2], [w - 0.1, -88.0], [6.6, -85.4], [5.1, -83.3], [2.6, -82.1], [0, -81.8]];
  const headAll = [...headPts, ...mirrorPts(headPts).slice(1, -1)];
  const headD = toD(S(Hm, jaw(headAll)));
  push(piece(ink, 'head', headD, {fill: p.uid && hi ? paint(p.uid, ballName) : skin, shade: skin2, off: 0.85, cut: true, rim: true}));
  drawBeard(ink, Hm, look, tn, T, jaw, hi).forEach(push);
  drawFace(ink, Hm, {fp: fp0, blink, look: [sacc[0] + (p.gaze?.[0] ?? 0), sacc[1] + (p.gaze?.[1] ?? 0) + pv.lookY], tn, hi, detail, skin, skin2, jaw}, look, `${fid}-f`).forEach(push);
  // hair (front): the shape, its lit strands, the part, a faded side
  const hs = 1.1 * tn;
  const hx2 = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x + hs * Math.max(0, (y + 104) / 14), y] as Pt);
  const hatOn = look.hat !== null;
  if (hd.side)
    for (const s of [-1, 1]) {
      const pts = s < 0 ? hd.side : mirrorPts(hd.side);
      push(piece(ink, `hs${s}`, toD(S(Hm, hx2(pts))), {fill: T(hairT), shade: T(hairT + 0.7), off: 0.4, cut: !hd.faded, rim: true, opacity: hd.faded ? 0.42 : look.hair === 'receding' ? 0.95 : 1}));
    }
  if (hd.front && hd.front.length) {
    push(piece(ink, 'hairF', toD(S(Hm, hx2(hd.front))), {fill: T(hairT), shade: T(hairT + 0.8), off: 0.85, cut: !hd.thin, rim: true, opacity: hd.thin}));
    if (hi && !hatOn) {
      const lit = T(hairT - 1.5);
      for (const [i, sd] of (hd.strands ?? []).entries()) push(<path key={`str${i}`} d={toLine(P(chain(Hm, tr(hs * 0.5, 0)), sd))} stroke={lit} strokeWidth={0.32} strokeLinecap="round" fill="none" opacity={0.7} />);
      if (hd.part) push(<path key="part" d={toLine(P(chain(Hm, tr(hs * 0.5, 0)), hd.part))} stroke={T(hairT + 1.4)} strokeWidth={0.3} strokeLinecap="round" fill="none" />);
    }
  }
  if (look.hair === 'bald' && hi && !hatOn) push(<path key="sheen" d={toD(E(Hm, -2.8 + hs, -96.6, 2.0, 0.9))} fill={mix(skin, C.il0, 0.5)} opacity={0.6} />);
  if (look.hair === 'bun') push(piece(ink, 'bun', toD(E(Hm, 0.5 + 0.6 * tn, -102.0, 2.7, 2.3)), {fill: T(hairT), shade: T(hairT + 0.8), off: 0.6, cut: true, rim: true}));
  if (look.hair === 'manbun') push(piece(ink, 'bun', toD(E(Hm, 0.4 + 0.9 * tn, -101.4, 2.2, 1.8)), {fill: T(hairT), shade: T(hairT + 0.8), off: 0.5, cut: true, rim: true}));
  if (look.hair === 'pony' && hi) push(<path key="tie" d={toD(E(Hm, 6.0 - 1.2 * tn, -99.4, 0.7, 0.55))} fill={T(hairT + 1.4)} />);
  // glasses
  if (look.glasses === 'round' || look.glasses === 'rect') {
    const g: React.ReactNode[] = [];
    const pts = ([-1, 1] as const).map((s) => fs + s * EYE_SEP * (1 - 0.12 * tAbs));
    const lens = look.glasses === 'round' ? toD(E(Hm, pts[0], -90.2, 1.8, 1.65), E(Hm, pts[1], -90.2, 1.8, 1.65)) : toD(...pts.map((x) => P(Hm, `M${x - 1.95} -91.5Q${x - 1.95} -91.75 ${x - 1.6} -91.75L${x + 1.6} -91.75Q${x + 1.95} -91.75 ${x + 1.95} -91.5L${x + 1.85} -89.2Q${x + 1.8} -88.75 ${x + 1.3} -88.75L${x - 1.3} -88.75Q${x - 1.8} -88.75 ${x - 1.85} -89.2Z`)));
    g.push(<path key="lens" d={lens} fill={C.il0} fillOpacity={0.12} stroke={C.ilFeature} strokeWidth={look.glasses === 'rect' ? 0.42 : 0.36} />);
    g.push(<path key="bridge" d={toLine(P(Hm, `M${pts[0] + 1.75} -90.7Q${fs} -91.6 ${pts[1] - 1.75} -90.7`))} stroke={C.ilFeature} strokeWidth={0.36} fill="none" />);
    if (hi) g.push(<path key="tmp" d={toLine(P(Hm, `M${pts[0] - 1.9} -90.8L${-w + 0.2} -91.2`)) + toLine(P(Hm, `M${pts[1] + 1.9} -90.8L${w - 0.2} -91.2`))} stroke={C.ilFeature} strokeWidth={0.34} fill="none" />);
    push(<g key="glasses">{g}</g>);
  }
  // hats
  const hatT = look.hatTone;
  const hh = (pts: Pt[], dx: number): Pt[] => pts.map(([x, y]) => [x + dx, y] as Pt);
  if (look.hat === 'cap' || look.hat === 'capBack') {
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-7.9, -93.6], [-7.6, -97.6], [-5.4, -100.7], [0, -101.7], [5.4, -100.7], [7.6, -97.6], [7.9, -93.6], [0, -94.3]], 0.6 * tn))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.85, cut: true, rim: true}));
    if (hi) push(<path key="hatSeam" d={toLine(P(Hm, `M${0.6 * tn} -101.6C${0.8 * tn} -98.4 ${0.9 * tn} -96.4 ${1.0 * tn} -94.4`))} stroke={T(hatT + 1.2)} strokeWidth={0.32} fill="none" />);
    push(<path key="hatBtn" d={toD(E(Hm, 0.6 * tn, -101.6, 0.65, 0.48))} fill={T(hatT + 1)} />);
    if (look.hat === 'cap') push(piece(ink, 'hatBrim', toD(S(Hm, hh([[-8.2, -94.0], [-4.2, -94.9], [0, -95.2], [4.2, -94.9], [8.2, -94.0], [5.2, -92.9], [0, -92.6], [-5.2, -92.9]], 1.5 * tn))), {fill: T(hatT - 0.3), shade: T(hatT + 0.9), off: 0.5, cut: true, rim: true}));
    else push(piece(ink, 'hatGap', toD(P(Hm, `M${-1.8 + 0.8 * tn} -94.0C${-1.8 + 0.8 * tn} -96.2 ${1.8 + 0.8 * tn} -96.2 ${1.8 + 0.8 * tn} -94.0Z`)), {fill: T(hairT), edge: false}));
  }
  if (look.hat === 'beanie') {
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-7.9, -92.4], [-8.0, -96.0], [-6.6, -99.8], [-3.2, -102.0], [0, -102.4], [3.2, -102.0], [6.6, -99.8], [8.0, -96.0], [7.9, -92.4], [0, -93.0]], 0.6 * tn))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.85, cut: true, rim: true}));
    push(piece(ink, 'hatCuff', toD(S(Hm, hh([[-8.1, -95.6], [0, -96.2], [8.1, -95.6], [8.0, -92.2], [0, -92.8], [-8.0, -92.2]], 0.7 * tn))), {fill: T(hatT - 0.35), shade: T(hatT + 0.5), off: 0.4, cut: true, rim: true}));
    if (hi) for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) push(<path key={`rb${x}`} d={toLine(P(Hm, `M${x + 0.7 * tn} -95.4L${x + 0.7 * tn} -93.0`))} stroke={T(hatT + 0.9)} strokeWidth={0.26} fill="none" opacity={0.7} />);
  }
  if (look.hat === 'flatCap') {
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-8.4, -94.0], [-8.8, -96.8], [-6.4, -99.4], [-1.4, -100.4], [4.6, -100.0], [8.8, -98.0], [9.4, -95.6], [8.4, -93.8], [0, -94.6]], 0.6 * tn))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.85, cut: true, rim: true}));
    push(piece(ink, 'hatBrim', toD(S(Hm, hh([[-7.5, -94.3], [0, -95.2], [7.5, -94.3], [5.4, -93.4], [0, -93.1], [-5.4, -93.4]], 1.4 * tn))), {fill: T(hatT + 0.5), shade: T(hatT + 1.2), off: 0.45, cut: true, rim: true}));
  }
  if (look.hat === 'peaked') {
    const dx = 0.6 * tn;
    push(piece(ink, 'hatC', toD(S(Hm, hh([[-7.3, -96.8], [-10.0, -101.4], [-8.4, -103.4], [0, -104.1], [8.4, -103.4], [10.0, -101.4], [7.3, -96.8], [0, -97.2]], dx))), {fill: T(hatT), shade: T(hatT + 0.8), off: 0.85, cut: true, rim: true}));
    push(piece(ink, 'hatBand', toD(P(Hm, `M${-7.6 + dx} -97.7L${7.6 + dx} -97.7L${7.5 + dx} -94.8L${-7.5 + dx} -94.8Z`)), {fill: T(hatT + 0.7), cut: true, rim: true}));
    push(piece(ink, 'hatBadge', toD(E(Hm, dx, -100.2, 1.3)), {fill: tone(1), shade: tone(2.6), off: 0.35, cut: true}));
    push(<path key="hatBadgeIn" d={toD(E(Hm, dx, -100.2, 0.6))} fill={tone(3)} />);
    push(piece(ink, 'hatVisor', toD(S(Hm, hh([[-7.7, -95.3], [0, -95.6], [7.7, -95.3], [5.8, -94.0], [0, -93.6], [-5.8, -94.0]], 1.5 * tn))), {fill: tone(7), cut: true, rim: true}));
  }
  // earrings (a stud or a hoop under the lobe), when the ear shows or the hair stops above the jaw
  if (look.earrings && hi)
    for (const side of [-1, 1] as const) {
      const far = Math.sign(tn) === side;
      if (far && tAbs > 0.35) continue;
      const ex = side * (B.hw - 0.2) + (far ? -side * 1.4 * tAbs : -side * 3.0 * tAbs);
      if (look.earrings === 'stud') push(<path key={`er${side}`} d={toD(E(Hm, ex, -87.4, 0.36))} fill={tone(0.3)} />);
      else push(<path key={`er${side}`} d={toD(E(Hm, ex, -86.2, 0.85, 0.95))} fill="none" stroke={tone(0.6)} strokeWidth={0.26} />);
    }
  // sunglasses: on the eyes (the cool face slides them down), aviators, or pushed up on the head
  const shadesOn = Math.max(fp0.shades, look.glasses === 'shades' || look.glasses === 'aviator' ? 1 : 0);
  const drawShades = (y: number, sc: number, op: number, key: string, avi: boolean) => {
    const g: React.ReactNode[] = [];
    const lens: Pt[] = avi ? [[-2.0, -1.2], [2.0, -1.3], [2.1, 0.4], [0.9, 1.7], [-1.0, 1.6], [-2.2, 0.2]] : [[-2.3, -1.25], [2.15, -1.35], [2.05, 0.75], [0.7, 1.55], [-1.5, 1.45], [-2.4, 0.25]];
    for (const s of [-1, 1] as const) {
      const far = tAbs > 0.05 && Math.sign(tn) === s;
      const ex = fs + s * EYE_SEP * (1 - 0.12 * tAbs);
      const m = chain(Hm, tr(ex, y), scl(sc * (far ? 1 - 0.3 * tAbs : 1) * -s, sc));
      g.push(<path key={`${key}l${s}`} d={toD(S(m, lens))} fill={C.ilFeature} />);
      if (hi) g.push(<path key={`${key}g${s}`} d={toD(P(m, 'M-0.5 -1.1L0.4 -1.1L-0.8 1.1L-1.6 1.1Z'))} fill={C.il0} opacity={0.42} />);
    }
    g.push(<path key={`${key}b`} d={toLine(P(Hm, `M${fs - 0.9} ${y - 0.8}Q${fs} ${y - 1.3} ${fs + 0.9} ${y - 0.8}`))} stroke={C.ilFeature} strokeWidth={0.6} fill="none" />);
    push(
      <g key={key} opacity={op}>
        {g}
      </g>,
    );
  };
  if (shadesOn > 0.02) drawShades(-90.3 - (1 - shadesOn) * 4.5, 0.86, clamp(shadesOn * 1.6, 0, 1), 'shades', look.glasses === 'aviator');
  if (look.glasses === 'shadesUp' && !hatOn) drawShades(-97.4, 0.8, 1, 'shadesUp', false);
  // brows last (over a fringe or a brim: the expression must read)
  const browCol = hairT >= 5 || look.hair === 'bald' ? C.ilFeature : T(Math.min(7, hairT + 1.8));
  drawBrows(Hm, fp0, tn, look, browCol).forEach(push);

  // ---- arms in front, then over the head ----
  drawArmLayer('front');
  drawArmLayer('over');

  // ---- effects at the head (or at a hand) ----
  const fxList = [...st.fx, ...(p.fx ?? [])];
  const headC = ap(Hm, 0, -90);
  const side = (flip ? -1 : 1) * (tn < -0.1 ? -1 : 1);
  fxList.forEach((e2, i) => {
    let at: Pt = headC;
    if (e2.kind === 'zap' && AR) at = ap(Tm, AR.center[0], AR.center[1]);
    push(<FaceFx key={`fx${i}${e2.kind}`} kind={e2.kind} frame={frame} x={at[0]} y={at[1]} size={17} at={e2.at} side={side as 1 | -1} time={time} uid={p.uid} tone={e2.kind === 'zap' || e2.kind === 'hearts' ? 'down' : undefined} />);
  });

  const x0 = p.x;
  const y0 = crop === 'full' ? p.y : p.y + 90 * k;
  return (
    <g transform={`translate(${x0.toFixed(2)} ${y0.toFixed(2)}) scale(${k.toFixed(4)})`} opacity={p.opacity}>
      {nodes}
    </g>
  );
};

/** A hand on its own (hands on a steering wheel, a hand passing a key, a hand holding a gauge), drawn like the
 *  figure's: (x, y) is the wrist in stage px, `angle` the hand's limb angle (0 = fingers down, 180 = up), `scale` stage
 *  px per u (a hand is about 7.5 u long), `side` which hand ('r': the thumb on the hand's left when the fingers point
 *  down), `arm` a forearm stub of that many u behind the wrist in the `sleeve` tone (skin without one), `hold` an item
 *  in a grip. */
export const Hand: React.FC<{
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
  const id = gid(useId(), 'hd');
  const hi = (lod ?? (scale < 6 ? 'lo' : 'hi')) === 'hi';
  const ink: Ink = {id, uid, k: Math.max(1e-3, scale), hi, onDark: dark(time), cut: isLight() && time !== 'day' ? ground(time) : C.ilCut, lx: 1.1, ly: 1.5};
  const [dx, dy] = dir(angle);
  const nodes: React.ReactNode[] = [];
  if (arm > 0) {
    const fill = sleeve === undefined ? C.ilSkin : tone(sleeve);
    const shade = sleeve === undefined ? C.ilSkin2 : tone(sleeve + 0.85);
    nodes.push(piece(ink, 'arm', toD(K(I, -arm * dx, -arm * dy, 2.3, 0, 0, 2.05)), {fill, shade, off: 0.8, cut: true, rim: true}));
  }
  const Hd = chain(rot(-angle), scl(side === 'l' ? -1 : 1, 1));
  if (hold) nodes.push(drawItem(ink, chain(tr(3.4 * dx, 3.4 * dy), scl(ITEM_SCALE)), hold, {frame}));
  const hs = handShapes(Hd, kind, hi);
  if (hs.d) nodes.push(piece(ink, 'hand', hs.d, {fill: C.ilSkin, shade: C.ilSkin2, off: 0.5, cut: true, rim: true}));
  if (hi && hs.lines) nodes.push(<path key="lines" d={hs.lines} stroke={mix(C.ilSkin2, C.ilFeature, 0.15)} strokeWidth={0.22} strokeLinecap="round" fill="none" />);
  if (hi && scale > 9 && hs.nails.length) nodes.push(<path key="nails" d={toD(...hs.nails.map(([nx, ny]) => E(Hd, nx, ny - 0.32, 0.26, 0.3)))} fill={mix(C.ilSkin, C.il0, 0.35)} opacity={0.8} />);
  if (hi && hs.tip) nodes.push(<path key="tip" d={toD(E(Hd, hs.tip[0], hs.tip[1], 0.8, 0.6))} fill={mix(C.ilSkin, C.il0, 0.5)} />);
  return <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`}>{nodes}</g>;
};

/** A figure's head centre in stage px for crop 'full' at (x, y) with `size` (for bubbles, effects, a camera origin). */
export const headAt = (x: number, y: number, size: number): Pt => [x, y - 0.9 * size];
