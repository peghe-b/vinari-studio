// src/scenes/illo/poses.ts: the 21 poses of the kit's characters (src/scenes/illo/figure.tsx draws them).
//
// A pose is evaluated to numbers (PoseV) for a frame, so two poses blend (acting.ts: torso first, arms +2 frames, head
// +3, SPRING.enter), and the time-driven ones (walk, jump, wave) are functions of the frame. Angles use the kit's limb
// convention (rig.tsx): 0 = pointing down, + = toward screen right; an elbow or a knee is relative to its parent. Left
// and right are SCREEN left and right of an unflipped figure (a flipped figure mirrors the whole drawing).
// Arms that reach a body point (the phone at the ear, a palm over the eyes, hands on the head, crossed arms, hands on
// the knees) are solved by two-bone IK against the real skeleton, so they land on the spot at any width or turn.
//
//   s, e     shoulder and elbow angles (or `ik`: the wrist's target in torso units, `bend` the elbow's side)
//   up/fore  upper arm / forearm length (x 16 / 14 u): under 1 = foreshortened toward the camera
//   hand     mitten | point | pointYou | palm | thumb | grip | none (in a pocket);  hs: the hand's scale
//   ha       the hand's angle (follows the forearm unless the pose fixes it: a thumb up, a palm over the eyes)
//   z        auto (the far arm goes behind the torso when turned) | front | over (over the head and hair)
//   legs     planted (two-bone IK to the ground at +-feet) or FK angles (walk, jump, hidden when sitting)
import {deepFreeze} from './palette';
import {angOf, clamp, dir, ik2, lerp, lerpAng, type Pt} from './rig';

export type Pose =
  | 'stand' | 'wave' | 'point' | 'pointYou' | 'phoneEar' | 'phoneLook' | 'shrug' | 'facepalm' | 'handsHead' | 'thumbsUp'
  | 'armsUp' | 'crossArms' | 'hold' | 'offer' | 'reject' | 'confident' | 'slumped' | 'crouch' | 'sitDrive' | 'walk' | 'jump';
export const POSE_NAMES: readonly Pose[] = deepFreeze([
  'stand', 'wave', 'point', 'pointYou', 'phoneEar', 'phoneLook', 'shrug', 'facepalm', 'handsHead', 'thumbsUp', 'armsUp',
  'crossArms', 'hold', 'offer', 'reject', 'confident', 'slumped', 'crouch', 'sitDrive', 'walk', 'jump',
] as Pose[]);

export type HandKind = 'mitten' | 'point' | 'pointYou' | 'palm' | 'thumb' | 'grip' | 'none';
export type ArmZ = 'auto' | 'front' | 'over';
export type HoldSide = 'l' | 'r' | 'both' | null;

/** One arm, evaluated. */
export type ArmV = {s: number; e: number; up: number; fore: number; ha: number; hs: number; hand: HandKind; z: ArmZ};
/** A pose, evaluated for one frame. */
export type PoseV = {
  l: ArmV;
  r: ArmV;
  ll: [number, number]; // FK legs: [hip, knee]
  rl: [number, number];
  plant: number; // 1 = legs reach the ground by IK at +-feet, 0 = FK angles
  ground: number; // 1 = the lowest foot is kept on the ground (walk)
  feet: number; // half the distance between the ankles when planted (u)
  thigh: number; // thigh length x (under 1: the knees come toward the camera, a crouch)
  hideLegs: number; // 1 = no legs (sitting in a car)
  tilt: number; // head, degrees (clockwise on screen)
  headDrop: number; // head down (u)
  lean: number; // torso, degrees (clockwise)
  lift: number; // hips down (+) or up (-), u
  shoulders: number; // shoulders up (+), u
  chest: number; // torso scaleY
  squash: number; // whole figure scaleY from the feet (a landing)
  lookY: number; // eyes down (+)
  turn: number; // the pose's own turn (when turnK > 0)
  turnK: number; // 0 = keep the figure's turn, 1 = this pose's
  hold: HoldSide; // which hand holds the item
  itemRot: number; // the held item's rotation (degrees)
};

/** What a pose needs to know about the body it is evaluated on. */
export type PoseCtx = {
  frame: number; // the frame (cycles)
  t: number; // frames since this pose's act began (a jump's arc, a wave's start)
  seed: number;
  sl: Pt; // the screen-left shoulder joint in torso units
  sr: Pt; // the screen-right shoulder joint
};

type ArmDef = {
  s?: number;
  e?: number;
  ik?: Pt;
  bend?: 1 | -1;
  up?: number;
  fore?: number;
  hand?: HandKind;
  hs?: number;
  ha?: number; // a fixed hand angle
  wrist?: number; // a wrist bend added to the forearm's angle
  z?: ArmZ;
};
type PoseDef = {
  l: ArmDef;
  r: ArmDef;
  legs?: {l: [number, number]; r: [number, number]};
  plant?: number;
  feet?: number;
  thigh?: number;
  hideLegs?: number;
  tilt?: number;
  headDrop?: number;
  lean?: number;
  lift?: number;
  shoulders?: number;
  chest?: number;
  lookY?: number;
  turn?: number;
  hold?: HoldSide;
  itemRot?: number;
};

const L_STAND: ArmDef = {s: -6, e: 5, hand: 'mitten'};
const R_STAND: ArmDef = {s: 6, e: -5, hand: 'mitten'};

/** The static table (time-driven parts are added in evalPose). Torso units: the shoulder joints sit at (+-10.5, -73). */
const DEF: Record<Exclude<Pose, 'walk' | 'jump'>, PoseDef> = {
  stand: {l: L_STAND, r: R_STAND},
  wave: {l: L_STAND, r: {s: 128, e: 50, hand: 'palm', z: 'front'}, tilt: 4},
  point: {l: L_STAND, r: {s: 92, e: -3, hand: 'point', z: 'front'}, turn: 0.4, tilt: 1},
  pointYou: {l: L_STAND, r: {ik: [6.0, -63.5], bend: 1, up: 0.8, fore: 0.55, hand: 'pointYou', hs: 1.45, ha: 202, z: 'front'}, tilt: -3, lean: -1.5},
  phoneEar: {l: L_STAND, r: {ik: [11.2, -78.6], bend: -1, up: 0.72, hand: 'grip', ha: 186, z: 'over'}, tilt: 6, hold: 'r', itemRot: -6},
  phoneLook: {
    l: {ik: [-2.6, -62.5], bend: -1, up: 0.92, fore: 0.82, hand: 'grip', ha: 172, z: 'front'},
    r: {ik: [2.6, -62.5], bend: 1, up: 0.92, fore: 0.82, hand: 'grip', ha: 188, z: 'front'},
    tilt: -4,
    headDrop: 1.2,
    lookY: 0.55,
    hold: 'both',
  },
  shrug: {l: {s: -28, e: -72, hand: 'palm', z: 'front'}, r: {s: 28, e: 72, hand: 'palm', z: 'front'}, shoulders: 2.6, tilt: 6},
  facepalm: {l: L_STAND, r: {ik: [5.4, -81.6], bend: 1, up: 0.55, hand: 'palm', ha: 205, z: 'over'}, tilt: 7, headDrop: 0.8},
  handsHead: {
    l: {ik: [-9.2, -84.2], bend: 1, up: 0.9, hand: 'palm', ha: 172, z: 'over'},
    r: {ik: [9.2, -84.2], bend: -1, up: 0.9, hand: 'palm', ha: 188, z: 'over'},
  },
  thumbsUp: {l: L_STAND, r: {s: 34, e: 124, hand: 'thumb', ha: 180, z: 'front'}},
  armsUp: {l: {s: -158, e: -12, hand: 'palm', z: 'front'}, r: {s: 158, e: 12, hand: 'palm', z: 'front'}, tilt: -3, lookY: -0.3},
  crossArms: {
    l: {ik: [3.6, -64.4], bend: -1, up: 0.94, hand: 'mitten', z: 'front'},
    r: {ik: [-3.6, -63.4], bend: 1, up: 0.94, hand: 'mitten', z: 'front'},
  },
  hold: {l: L_STAND, r: {ik: [11.8, -54.5], bend: 1, up: 0.95, fore: 0.42, hand: 'grip', ha: 180, z: 'front'}, hold: 'r'},
  offer: {
    l: {ik: [-1.8, -57.5], bend: -1, up: 0.9, fore: 0.8, hand: 'grip', ha: 168, z: 'front'},
    r: {ik: [1.8, -57.5], bend: 1, up: 0.9, fore: 0.8, hand: 'grip', ha: 192, z: 'front'},
    hold: 'both',
    lean: 2,
  },
  reject: {l: L_STAND, r: {s: 86, e: -6, hand: 'palm', ha: 182, z: 'front'}, turn: -0.55, lean: -3, tilt: -5},
  confident: {l: {s: -11, e: 23, fore: 0.82, hand: 'none'}, r: {s: 11, e: -23, fore: 0.82, hand: 'none'}, feet: 10, tilt: -4, chest: 1.03, shoulders: 0.4},
  slumped: {l: {s: -2, e: 2, hand: 'mitten'}, r: {s: 2, e: -2, hand: 'mitten'}, tilt: 9, lean: 3, shoulders: -2, lift: 0.8, lookY: 0.45, headDrop: 0.6},
  crouch: {
    l: {ik: [-6.2, -40], bend: -1, hand: 'mitten', z: 'front'},
    r: {ik: [6.2, -40], bend: 1, hand: 'mitten', z: 'front'},
    lift: 17,
    chest: 0.9,
    feet: 9.5,
    thigh: 0.62,
  },
  sitDrive: {
    l: {ik: [-8.2, -60], bend: -1, up: 0.9, fore: 0.8, hand: 'grip', ha: 160, z: 'front'},
    r: {ik: [8.2, -60], bend: 1, up: 0.9, fore: 0.8, hand: 'grip', ha: 200, z: 'front'},
    hideLegs: 1,
  },
};

const UPPER = 16;
const FORE = 14;

const arm = (d: ArmDef, sh: Pt): ArmV => {
  const up = d.up ?? 1;
  const fore = d.fore ?? 1;
  let s = d.s ?? 0;
  let e = d.e ?? 0;
  if (d.ik) [s, e] = ik2(sh[0], sh[1], d.ik[0], d.ik[1], UPPER * up, FORE * fore, d.bend ?? 1);
  const ha = d.ha ?? s + e + (d.wrist ?? 0);
  return {s, e, up, fore, ha, hs: d.hs ?? 1, hand: d.hand ?? 'mitten', z: d.z ?? 'auto'};
};

const base = (d: PoseDef, c: PoseCtx): PoseV => ({
  l: arm(d.l, c.sl),
  r: arm(d.r, c.sr),
  ll: d.legs?.l ?? [-3, 0],
  rl: d.legs?.r ?? [3, 0],
  plant: d.plant ?? 1,
  ground: 0,
  feet: d.feet ?? 7.6,
  thigh: d.thigh ?? 1,
  hideLegs: d.hideLegs ?? 0,
  tilt: d.tilt ?? 0,
  headDrop: d.headDrop ?? 0,
  lean: d.lean ?? 0,
  lift: d.lift ?? 0,
  shoulders: d.shoulders ?? 0,
  chest: d.chest ?? 1,
  squash: 1,
  lookY: d.lookY ?? 0,
  turn: d.turn ?? 0,
  turnK: d.turn === undefined ? 0 : 1,
  hold: d.hold ?? (d.r.hand === 'grip' ? 'r' : null),
  itemRot: d.itemRot ?? 0,
});

/** A pose at a frame: the table, plus the walk cycle, the jump's arc and the wave's swing. */
export const evalPose = (name: Pose, c: PoseCtx): PoseV => {
  if (name === 'walk') {
    // a 24-frame cycle in a three-quarter view (turn 0.8; a flipped figure walks left): legs +-22, knees 0..35 in the
    // swing, arms counter +-16, the body bobs 1.5 u (kept on the ground by the lowest foot)
    const ph = (2 * Math.PI * c.frame) / 24 + c.seed * 0.7;
    const leg = (p: number): [number, number] => [22 * Math.sin(p), -(4 + 31 * Math.max(0, Math.cos(p)) ** 1.4)];
    const armW = (p: number, side: 1 | -1): ArmDef => {
      const sw = -16 * Math.sin(p);
      return {s: sw + 2 * side, e: 8 + 16 * Math.max(0, -Math.sin(p)), hand: 'mitten'};
    };
    const v = base({l: armW(ph, -1), r: armW(ph + Math.PI, 1), legs: {l: leg(ph), r: leg(ph + Math.PI)}, plant: 0, turn: 0.8, lean: 2}, c);
    return {...v, ground: 1};
  }
  if (name === 'jump') {
    // the lift arc 0 -> 40 u -> 0 over 18 frames (legs tucked in the air), a 0.94 squash on landing
    const t = c.t;
    const air = t >= 0 && t <= 18 ? Math.sin((Math.PI * t) / 18) : 0;
    const land = t > 18 && t < 30 ? Math.sin((Math.PI * (t - 18)) / 12) : 0;
    const pre = t < 0 && t > -6 ? Math.sin((Math.PI * -t) / 6) : 0;
    const v = base({...DEF.armsUp, legs: {l: [-42 * air, 96 * air], r: [42 * air, -96 * air]}, plant: 1 - air, lift: -40 * air + 5 * pre + 4 * land}, c);
    return {...v, squash: 1 - 0.06 * land};
  }
  const d = DEF[name] ?? DEF.stand;
  const v = base(d, c);
  if (name === 'wave') {
    const sw = 15 * Math.sin((2 * Math.PI * Math.max(0, c.t)) / 14);
    v.r = {...v.r, e: v.r.e + sw, ha: v.r.ha + sw * 1.4};
  }
  return v;
};

const mixArm = (a: ArmV, b: ArmV, t: number): ArmV => ({
  s: lerpAng(a.s, b.s, t),
  e: lerpAng(a.e, b.e, t),
  up: lerp(a.up, b.up, t),
  fore: lerp(a.fore, b.fore, t),
  ha: lerpAng(a.ha, b.ha, t),
  hs: lerp(a.hs, b.hs, t),
  hand: t < 0.5 ? a.hand : b.hand,
  z: t < 0.5 ? a.z : b.z,
});
/** Two poses blended with overlapping action: tb (torso, legs), ta (arms), th (head) are separate progresses. */
export const mixPose = (a: PoseV, b: PoseV, tb: number, ta: number, th: number): PoseV => {
  const L = (x: number, y: number, t = tb) => lerp(x, y, t);
  return {
    l: mixArm(a.l, b.l, ta),
    r: mixArm(a.r, b.r, ta),
    ll: [lerpAng(a.ll[0], b.ll[0], tb), lerpAng(a.ll[1], b.ll[1], tb)],
    rl: [lerpAng(a.rl[0], b.rl[0], tb), lerpAng(a.rl[1], b.rl[1], tb)],
    plant: L(a.plant, b.plant),
    ground: L(a.ground, b.ground),
    feet: L(a.feet, b.feet),
    thigh: L(a.thigh, b.thigh),
    hideLegs: tb < 0.5 ? a.hideLegs : b.hideLegs,
    tilt: L(a.tilt, b.tilt, th),
    headDrop: L(a.headDrop, b.headDrop, th),
    lean: L(a.lean, b.lean),
    lift: L(a.lift, b.lift),
    shoulders: L(a.shoulders, b.shoulders),
    chest: L(a.chest, b.chest),
    squash: L(a.squash, b.squash),
    lookY: L(a.lookY, b.lookY, th),
    turn: lerp(a.turnK ? a.turn : b.turn, b.turnK ? b.turn : a.turn, tb),
    turnK: L(a.turnK, b.turnK),
    hold: ta < 0.5 ? a.hold : b.hold,
    itemRot: L(a.itemRot, b.itemRot, ta),
  };
};

export const isPose = (v: unknown): v is Pose => typeof v === 'string' && (POSE_NAMES as readonly string[]).includes(v);
/** The forearm's direction of an evaluated arm (for a held item or an effect at the hand). */
export const forearmDir = (a: ArmV) => dir(a.s + a.e);
export {angOf, clamp};
