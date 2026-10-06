// src/scenes/illo/car.tsx: the Car part of the "Graphite" kit (spec 3.6): a refined 2020s car in four views, filled and
// softly shaded, never a line drawing and never a boxy 90s shape (memory: modern-cars-only). Raked windshield, slim LED
// light lines, a full-width rear light bar, flush handles, small mirrors, big multi-spoke wheels, a low smooth hood.
// No badge, no logo, no grille slab; plates are blank.
//
//   <Car uid x y len view body paint dir frame roll speed lights bob pitch lean dirt dent time .../>
//     x, y     side, rear, front: the ground point under the car's centre (where its shadow sits); top: its centre
//     len      the car's length in stage px (default 720). Every view of one car shares the scale: the rear view of a
//              720 px sedan is 281 px wide (carBox() gives any view's box)
//     view     side (default) | rear | front | top;  body: sedan (default) | suv | hatch | coupe | racer
//     paint    ramp step 1..5 (default 3), soft-shaded;  dir: side view 1 faces right (default), -1 faces left;
//              top view: `heading` in degrees (0 = nose up)
//     roll     stage px travelled: the wheels turn by 360 * roll / (pi * D); default speed * 26 px a frame
//     speed    0 parked .. 1 highway: the wheels blur, the suspension bobs (auto `bob`)
//     lights   {head, tail, brake, left, right, hazard, beam} 0..1: head and tail light up (white + a halo), brake
//              is the red accent with its halo, indicators blink at 2 Hz (ramped), beam a soft cone ahead (night)
//     bob      px the body sits lower (suspension), pitch deg (+ the nose dives: braking), lean deg (rear / front
//              views: the body rolls in a turn)
//     dirt     0..1 (one step duller, mud spray low on the sides);  dent 0..1 (a crease on the rear door, the rear
//              bumper's corner in the rear view)
//     cabin    (box) => ReactNode: drawn inside the side glass (a driver's head), box in stage px
//     number   racer only: a blank roundel with this number on the door and the roof
//
// Pure drawing code (Film scenes import the kit): frame-driven, deterministic, colours only from C through palette.ts,
// ids from useId(), no blur filter, no blend mode. Every shape is computed in the car's own units (length 1000) and
// mapped to stage px here, so hairlines and contours keep their pixel widths at any size.
import React, {useId} from 'react';
import {C, isLight, toneBig} from '../../tokens';
import {rand} from '../../lib/anim';
import {dark, deepFreeze, glowK, mix, tone, type Time} from './palette';
import {gid, paint, Shadow, Solid} from './solid';

export type CarBody = 'sedan' | 'suv' | 'hatch' | 'coupe' | 'racer';
export type CarView = 'side' | 'rear' | 'front' | 'top';
export type CarLights = {head?: number; tail?: number; brake?: number; left?: number; right?: number; hazard?: number; beam?: number};
export const CAR_BODIES: CarBody[] = ['sedan', 'suv', 'hatch', 'coupe', 'racer'];
export const CAR_VIEWS: CarView[] = ['side', 'rear', 'front', 'top'];
deepFreeze(CAR_BODIES);
deepFreeze(CAR_VIEWS);

// ---- geometry helpers ---------------------------------------------------------------------------------------------------
/** A point in car units; a third item 1 makes it a corner (the curve breaks there instead of flowing through). */
type K = [number, number] | [number, number, 1];
type Pt = [number, number];
const n1 = (v: number) => +v.toFixed(1);

/** A Catmull-Rom curve through points that may carry corners; closed by default. Points are already in px. */
const spline = (pts: K[], close = true) => {
  const n = pts.length;
  if (n < 2) return '';
  const corner = (i: number) => pts[i].length === 3 || (!close && (i === 0 || i === n - 1));
  const P = (i: number): Pt => {
    const j = close ? (i + n) % n : Math.max(0, Math.min(n - 1, i));
    return [pts[j][0], pts[j][1]];
  };
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`;
  const segs = close ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = i + 1;
    const p1 = P(i);
    const p2 = P(j);
    const p0 = corner(i) ? p1 : P(i - 1);
    const p3 = corner(j % n) && (close || j < n) ? p2 : P(j + 1);
    const k = 1 / 6;
    d += `C${n1(p1[0] + (p2[0] - p0[0]) * k)} ${n1(p1[1] + (p2[1] - p0[1]) * k)} ${n1(p2[0] - (p3[0] - p1[0]) * k)} ${n1(p2[1] - (p3[1] - p1[1]) * k)} ${n1(p2[0])} ${n1(p2[1])}`;
  }
  return d + (close ? 'Z' : '');
};
/** A wheel arch from the sill line up over the wheel and back down: from the front (larger x) to the rear, as body
 *  outline points (the ends are corners). */
const arch = (cx: number, cy: number, r: number, sill: number, n = 11): K[] => {
  const a0 = Math.asin(Math.max(-1, Math.min(1, (sill - cy) / r)));
  const out: K[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 - ((Math.PI + 2 * a0) * i) / n; // a0 .. -(pi + a0): right-below, over the top, left-below
    const p: K = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    out.push(i === 0 || i === n ? [p[0], p[1], 1] : p);
  }
  return out;
};
/** A circle as a path in px. */
const circle = (x: number, y: number, r: number) =>
  `M${n1(x - r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 1 ${n1(x + r)} ${n1(y)}A${n1(r)} ${n1(r)} 0 1 1 ${n1(x - r)} ${n1(y)}Z`;
/** A quad (four px points). */
const quad = (a: Pt, b: Pt, c: Pt, d: Pt) => `M${n1(a[0])} ${n1(a[1])}L${n1(b[0])} ${n1(b[1])}L${n1(c[0])} ${n1(c[1])}L${n1(d[0])} ${n1(d[1])}Z`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Mirror a right half (x >= 0, listed top to bottom) into a closed symmetric outline: right half down, left half up. */
const sym = (right: K[]): K[] => {
  const left = right
    .slice()
    .reverse()
    .filter((p) => Math.abs(p[0]) > 0.01)
    .map((p) => (p.length === 3 ? ([-p[0], p[1], 1] as K) : ([-p[0], p[1]] as K)));
  return [...right, ...left];
};

// ---- the side profiles (units: the car is `len` long, front at the larger x, ground y = 0, up is negative) -------------
type Side = {
  len: number;
  R: number; // tyre radius
  rimK: number; // the rim's radius as a share of R
  wheels: [number, number]; // rear, front wheel centre x
  archR: number;
  sill: number;
  height: number;
  body: K[];
  glass: K[];
  pillars: [Pt, Pt, number][]; // a pillar: top point, bottom point, width (clipped to the glass)
  doors: K[][]; // shut lines (open)
  crease: K[]; // the shoulder line (open): above it the surface turns up to the light
  lower: K[]; // the lower crease (open): below it the side turns away into shade
  head: K[];
  tail: K[];
  mirror: K[];
  handles: [number, number, number][]; // x, y, length
  dark?: K[][]; // black trim pieces (intake, diffuser, sill, cladding)
  flap?: [number, number, number, number]; // the fuel / charge door: x, y, w, h
  dent: Pt;
  extra?: 'racer';
};

const SEDAN: Side = (() => {
  const R = 89;
  const wr = 205;
  const wf = 802;
  const ar = 101;
  const sill = -42;
  const cy = -R;
  return {
    len: 1000, R, rimK: 0.7, wheels: [wr, wf], archR: ar, sill, height: 312,
    body: [
      [34, -224, 1], [96, -230], [160, -237], [238, -268], [322, -298], [420, -312], [505, -310], [566, -297], [634, -262], [702, -222, 1],
      [792, -212], [884, -197], [950, -178], [984, -158], [998, -126], [999, -84], [990, -50, 1],
      ...arch(wf, cy, ar, sill), ...arch(wr, cy, ar, sill),
      [46, -46, 1], [22, -72], [10, -118], [9, -168], [18, -206],
    ],
    glass: [[214, -233, 1], [266, -260], [340, -288], [432, -299], [508, -298], [556, -288], [610, -262], [680, -224, 1], [450, -227]],
    pillars: [[[452, -300], [464, -222], 15]],
    doors: [
      [[680, -223], [688, -170], [688, -45]],
      [[460, -226], [455, -45]],
      [[262, -231], [300, -176], [322, -116], [326, -45]],
    ],
    crease: [[888, -190], [700, -194], [450, -198], [250, -203], [52, -209]],
    lower: [[905, -80], [700, -88], [460, -94], [330, -98], [70, -106]],
    head: [[884, -190, 1], [950, -178], [984, -160], [996, -142, 1], [988, -134], [952, -158], [886, -179, 1]],
    tail: [[18, -200, 1], [34, -209], [92, -213, 1], [90, -204], [34, -201], [14, -188, 1]],
    mirror: [[674, -226, 1], [686, -244], [710, -249], [724, -241], [720, -227, 1]],
    handles: [[640, -196, 44], [392, -200, 40]],
    dark: [
      [[302, -56, 1], [700, -56, 1], [702, -40, 1], [300, -40, 1]],
      [[930, -82, 1], [994, -80], [997, -66, 1], [932, -66, 1]],
      [[30, -64, 1], [100, -62, 1], [104, -44, 1], [42, -44, 1]],
    ],
    flap: [128, -196, 26, 20],
    dent: [372, -134],
  };
})();

const SUV: Side = (() => {
  const R = 94;
  const wr = 200;
  const wf = 800;
  const ar = 110;
  const sill = -62;
  const cy = -R;
  return {
    len: 1000, R, rimK: 0.66, wheels: [wr, wf], archR: ar, sill, height: 404,
    body: [
      [22, -376, 1], [110, -394], [300, -404], [500, -404], [592, -394], [648, -352], [710, -294, 1],
      [800, -280], [900, -264], [966, -246], [992, -216], [998, -160], [994, -104], [982, -70, 1],
      ...arch(wf, cy, ar, sill), ...arch(wr, cy, ar, sill),
      [34, -66, 1], [14, -120], [8, -200], [10, -280], [15, -335],
    ],
    glass: [[96, -304, 1], [100, -366], [300, -378], [520, -378], [584, -370], [640, -334], [690, -298, 1], [400, -300], [100, -304, 1]],
    pillars: [[[478, -380], [488, -298], 16], [[232, -380], [228, -302], 26]],
    doors: [
      [[690, -298], [696, -230], [698, -66]],
      [[488, -300], [482, -66]],
      [[262, -302], [300, -200], [322, -130], [326, -66]],
    ],
    crease: [[882, -258], [700, -268], [450, -276], [200, -284], [30, -292]],
    lower: [[910, -110], [700, -118], [460, -124], [320, -128], [70, -136]],
    head: [[882, -258, 1], [950, -250], [984, -236], [994, -220, 1], [986, -212], [948, -232], [884, -248, 1]],
    tail: [[10, -318, 1], [22, -330], [86, -336, 1], [84, -326], [24, -322], [10, -308, 1]],
    mirror: [[690, -304, 1], [704, -326], [732, -330], [744, -318], [738, -302, 1]],
    handles: [[640, -276, 46], [418, -280, 42]],
    dark: [
      [[290, -84, 1], [700, -84, 1], [700, -62, 1], [290, -62, 1]],
      [[940, -108, 1], [994, -104], [992, -84, 1], [944, -86, 1]],
      [[18, -100, 1], [94, -96, 1], [96, -66, 1], [30, -66, 1]],
      // the arch cladding: a black band over each arch
      ...[wf, wr].map((x) => [...arch(x, cy, ar + 20, sill - 2, 13).map((p) => [p[0], p[1]] as K), ...arch(x, cy, ar, sill, 13).reverse().map((p) => [p[0], p[1]] as K)].map((p, i, a) => (i === 0 || i === a.length - 1 || i === 13 || i === 14 ? ([p[0], p[1], 1] as K) : p))),
    ],
    flap: [120, -290, 36, 26],
    dent: [372, -170],
  };
})();

const HATCH: Side = (() => {
  const R = 84;
  const wr = 160;
  const wf = 676;
  const ar = 96;
  const sill = -42;
  const cy = -R;
  return {
    len: 850, R, rimK: 0.68, wheels: [wr, wf], archR: ar, sill, height: 306,
    body: [
      [50, -294, 1], [104, -305], [200, -310], [330, -308], [424, -296], [486, -260], [560, -214, 1],
      [650, -200], [760, -182], [818, -164], [842, -132], [846, -90], [836, -50, 1],
      ...arch(wf, cy, ar, sill), ...arch(wr, cy, ar, sill),
      [30, -46, 1], [12, -88], [8, -140], [12, -192], [22, -222, 1], [40, -262], [56, -288],
    ],
    glass: [[118, -230, 1], [126, -280], [200, -294], [336, -294], [412, -286], [472, -254], [540, -218, 1], [330, -221], [122, -226, 1]],
    pillars: [[[350, -298], [360, -216], 15]],
    doors: [
      [[540, -218], [548, -160], [552, -45]],
      [[360, -220], [354, -45]],
      [[160, -228], [214, -170], [248, -110], [254, -45]],
    ],
    crease: [[740, -184], [560, -192], [340, -199], [140, -206], [18, -212]],
    lower: [[770, -78], [560, -86], [360, -92], [240, -96], [50, -102]],
    head: [[740, -184, 1], [796, -174], [826, -160], [838, -146, 1], [828, -138], [794, -156], [742, -174, 1]],
    tail: [[16, -214, 1], [26, -224], [84, -228, 1], [82, -218], [24, -216], [12, -204, 1]],
    mirror: [[536, -224, 1], [550, -244], [576, -248], [588, -238], [582, -224, 1]],
    handles: [[500, -196, 40], [300, -200, 36]],
    dark: [
      [[256, -56, 1], [576, -56, 1], [578, -40, 1], [254, -40, 1]],
      [[784, -82, 1], [840, -80], [844, -66, 1], [786, -66, 1]],
      [[20, -66, 1], [64, -64, 1], [66, -44, 1], [26, -44, 1]],
      [[26, -226, 1], [50, -294, 1], [60, -290], [38, -230, 1]],
    ],
    flap: [76, -196, 26, 20],
    dent: [292, -132],
  };
})();

const COUPE: Side = (() => {
  const R = 88;
  const wr = 205;
  const wf = 792;
  const ar = 101;
  const sill = -40;
  const cy = -R;
  return {
    len: 1000, R, rimK: 0.7, wheels: [wr, wf], archR: ar, sill, height: 284,
    body: [
      [26, -198, 1], [84, -208], [184, -234], [292, -266], [392, -282], [472, -278], [542, -256], [606, -218], [650, -198, 1],
      [760, -190], [878, -172], [952, -152], [988, -126], [998, -92], [992, -60], [980, -44, 1],
      ...arch(wf, cy, ar, sill), ...arch(wr, cy, ar, sill),
      [36, -44, 1], [12, -80], [6, -128], [11, -170],
    ],
    glass: [[204, -224, 1], [300, -258], [396, -272], [468, -268], [530, -246], [592, -214, 1], [400, -214], [210, -219, 1]],
    pillars: [[[330, -270], [340, -214], 9]],
    doors: [
      [[594, -214], [604, -150], [608, -43]],
      [[318, -219], [330, -150], [334, -43]],
    ],
    crease: [[872, -174], [660, -180], [420, -188], [220, -195], [40, -200]],
    lower: [[905, -74], [700, -80], [460, -86], [330, -90], [70, -98]],
    head: [[868, -174, 1], [944, -158], [982, -134], [994, -118, 1], [986, -112], [944, -142], [870, -165, 1]],
    tail: [[8, -178, 1], [24, -190], [96, -198, 1], [94, -188], [28, -182], [9, -170, 1]],
    mirror: [[590, -218, 1], [606, -236], [630, -240], [642, -230], [636, -216, 1]],
    handles: [[520, -186, 44]],
    dark: [
      [[310, -54, 1], [690, -54, 1], [692, -38, 1], [308, -38, 1]],
      [[930, -78, 1], [992, -76], [996, -60, 1], [932, -60, 1]],
      [[24, -64, 1], [110, -62, 1], [112, -42, 1], [34, -42, 1]],
    ],
    flap: [140, -186, 30, 22],
    dent: [450, -122],
  };
})();

const RACER: Side = (() => {
  const R = 92;
  const wr = 215;
  const wf = 790;
  const ar = 102;
  const sill = -24;
  const cy = -R;
  return {
    len: 1000, R, rimK: 0.72, wheels: [wr, wf], archR: ar, sill, height: 268,
    body: [
      [8, -150, 1], [40, -190], [120, -204], [215, -210], [300, -202], [380, -196], [440, -206], [500, -234], [560, -246], [612, -236], [652, -208, 1],
      [700, -184], [760, -206], [826, -210], [884, -192], [940, -146], [982, -96], [1000, -56], [996, -34, 1], [958, -24, 1],
      ...arch(wf, cy, ar, sill), ...arch(wr, cy, ar, sill),
      [26, -26, 1], [6, -70],
    ],
    glass: [[476, -214, 1], [508, -234], [560, -240], [604, -230], [636, -208, 1], [560, -204]],
    pillars: [],
    doors: [[[650, -200], [640, -120], [660, -40]]],
    crease: [[930, -150], [800, -164], [620, -150], [420, -160], [200, -168], [20, -150]],
    lower: [[960, -50], [700, -64], [460, -70], [300, -72], [40, -60]],
    head: [[900, -184, 1], [944, -150], [968, -122, 1], [958, -118], [934, -144], [896, -176, 1]],
    tail: [[6, -150, 1], [12, -166], [40, -170, 1], [40, -158], [12, -156, 1]],
    mirror: [[652, -210, 1], [664, -226], [690, -228], [698, -218], [690, -208, 1]],
    handles: [],
    dark: [[[620, -40, 1], [700, -40, 1], [700, -24, 1], [300, -24, 1], [300, -40, 1]]],
    dent: [560, -120],
    extra: 'racer',
  };
})();

const SIDES: Record<CarBody, Side> = {sedan: SEDAN, suv: SUV, hatch: HATCH, coupe: COUPE, racer: RACER};
deepFreeze(SIDES);

// ---- the end views (rear and front) and the top view: numbers per body ---------------------------------------------------
// End view units: the same scale as the side (a car 1000 long), x symmetric about 0.
type End = {
  half: number; // body half width at the hips
  H: number; // roof height
  deck: number; // y of the deck (rear) or the hood's back edge (front): the greenhouse's base
  roofHalf: number; // the roof's half width
  ghBase: number; // the greenhouse's half width at its base
  glass: [number, number, number, number]; // rear window: bottom half width, bottom y, top half width, top y
  wglass: [number, number, number, number]; // windshield (front view)
  tyre: [number, number]; // tyre outer x, inner x
  fender: number; // y of the fender's lower edge over the tyre (outboard)
  bumper: number; // y of the bumper's bottom between the tyres
  lamp: number; // y of the rear light bar
  head: number; // y of the headlights
  plate: number; // y of the rear plate's centre (0: no plate)
};
const ENDS: Record<CarBody, End> = {
  sedan: {half: 197, H: 312, deck: -216, roofHalf: 116, ghBase: 164, glass: [140, -224, 110, -294], wglass: [150, -222, 112, -298], tyre: [190, 140], fender: -76, bumper: -46, lamp: -198, head: -176, plate: -126},
  suv: {half: 204, H: 404, deck: -292, roofHalf: 142, ghBase: 174, glass: [148, -302, 126, -386], wglass: [154, -298, 128, -390], tyre: [196, 142], fender: -100, bumper: -66, lamp: -266, head: -246, plate: -160},
  hatch: {half: 190, H: 306, deck: -214, roofHalf: 126, ghBase: 160, glass: [134, -222, 114, -292], wglass: [146, -216, 112, -294], tyre: [184, 136], fender: -76, bumper: -46, lamp: -210, head: -170, plate: -128},
  coupe: {half: 202, H: 284, deck: -196, roofHalf: 104, ghBase: 158, glass: [126, -204, 96, -272], wglass: [140, -200, 100, -274], tyre: [196, 142], fender: -74, bumper: -42, lamp: -176, head: -150, plate: -112},
  racer: {half: 205, H: 252, deck: -186, roofHalf: 40, ghBase: 78, glass: [62, -194, 40, -240], wglass: [66, -194, 40, -244], tyre: [204, 140], fender: -70, bumper: -26, lamp: -150, head: -118, plate: 0},
};
deepFreeze(ENDS);

// Top view units: nose at y = -len/2 (up), x symmetric.
type Top = {
  half: number; // body half width
  cab: [number, number]; // the greenhouse (glass seen from above): the windshield's base y, the rear window's base y
  cabHalf: number;
  roof: [number, number]; // the roof panel: front y, rear y
  roofHalf: number;
  glassRoof: boolean; // a panoramic glass panel in the roof
  axles: [number, number];
};
const TOPS: Record<CarBody, Top> = {
  sedan: {half: 195, cab: [-205, 292], cabHalf: 166, roof: [-62, 178], roofHalf: 146, glassRoof: false, axles: [-298, 302]},
  suv: {half: 202, cab: [-222, 446], cabHalf: 178, roof: [-104, 428], roofHalf: 162, glassRoof: false, axles: [-300, 300]},
  hatch: {half: 190, cab: [-170, 382], cabHalf: 168, roof: [-52, 362], roofHalf: 150, glassRoof: false, axles: [-251, 269]},
  coupe: {half: 200, cab: [-178, 262], cabHalf: 158, roof: [-40, 152], roofHalf: 130, glassRoof: false, axles: [-292, 297]},
  racer: {half: 205, cab: [-150, 96], cabHalf: 88, roof: [-60, 56], roofHalf: 66, glassRoof: false, axles: [-290, 285]},
};
deepFreeze(TOPS);

/** The box a car of `len` px occupies in a view (stage px): width, height and, for side, rear and front, how far it rises
 *  above its ground point. Scenes lay out with it. */
export const carBox = (view: CarView = 'side', body: CarBody = 'sedan', len = 720) => {
  const s = len / 1000;
  const sd = SIDES[body];
  if (view === 'side') return {w: sd.len * s, h: sd.height * s};
  if (view === 'top') return {w: TOPS[body].half * 2 * s, h: sd.len * s};
  return {w: (ENDS[body].half + 22) * 2 * s, h: ENDS[body].H * s};
};

// ---- the Car ----------------------------------------------------------------------------------------------------------
export type CarP = {
  uid: string;
  x: number;
  y: number;
  len?: number;
  view?: CarView;
  body?: CarBody;
  paint?: number;
  dir?: 1 | -1;
  heading?: number;
  frame: number;
  roll?: number;
  speed?: number;
  lights?: CarLights;
  bob?: number;
  pitch?: number;
  lean?: number;
  dirt?: number;
  dent?: number;
  time?: Time;
  shadow?: boolean;
  cabin?: (box: {x: number; y: number; w: number; h: number}) => React.ReactNode;
  number?: string | number;
  seed?: number;
  opacity?: number;
};

/** Blink 0..1 at 2 Hz (15 frames: 8 on), ramped over 2 frames (the flicker rule). */
export const blink = (frame: number, phase = 0) => {
  const q = (((frame + phase) % 15) + 15) % 15;
  return q < 2 ? q / 2 : q < 8 ? 1 : q < 10 ? 1 - (q - 8) / 2 : 0;
};

const lightsOf = (l: CarLights | undefined, frame: number) => {
  const b = blink(frame);
  const hz = l?.hazard ?? 0;
  return {
    head: clamp(l?.head ?? 0, 0, 1),
    tail: clamp(l?.tail ?? 0, 0, 1),
    brake: clamp(l?.brake ?? 0, 0, 1),
    left: clamp(Math.max(l?.left ?? 0, hz), 0, 1) * b,
    right: clamp(Math.max(l?.right ?? 0, hz), 0, 1) * b,
    beam: clamp(l?.beam ?? 0, 0, 1),
  };
};

export const Car: React.FC<CarP> = (p) => {
  const view = p.view ?? 'side';
  if (view === 'top') return <CarTop {...p} />;
  if (view === 'rear' || view === 'front') return <CarEnd {...p} />;
  return <CarSide {...p} />;
};

/** Shared tone numbers: the paint step (duller with dirt), hairline width and the ground. */
const look = (p: CarP) => {
  const s = (p.len ?? 720) / 1000;
  const time = p.time ?? 'day';
  const dirt = clamp(p.dirt ?? 0, 0, 1);
  const pt = clamp(p.paint ?? 3, 1, 5) + dirt * 0.55 + (time === 'night' ? 1 : time === 'dusk' ? 0.5 : 0);
  return {s, time, dirt, pt, hw: clamp(1.9 * s + 0.2, 1, 1.8), onDark: dark(time), light: isLight() && !dark(time)};
};

// ---- wheels -------------------------------------------------------------------------------------------------------------
/** A wheel at (x, y) px, radius r px: tyre, sidewall, a 5-twin-spoke rim over the brake disc, a still caliper. */
const Wheel: React.FC<{uid: string; x: number; y: number; r: number; rimK: number; rot: number; blur: number; caliper: number; hw: number; light: boolean; onDark: boolean; dirt: number; seed: number}> = ({
  uid,
  x,
  y,
  r,
  rimK,
  rot,
  blur,
  caliper,
  hw,
  light,
  onDark,
  dirt,
  seed,
}) => {
  const rr = r * rimK;
  const spokes = (k: number, op: number) => {
    const out: string[] = [];
    for (let i = 0; i < 5; i++) {
      for (const off of [-6.5, 6.5]) {
        const a = ((rot + k + i * 72 + off * 0.35) * Math.PI) / 180;
        const a2 = a + ((off > 0 ? 1 : -1) * 0.13);
        const w0 = rr * 0.075;
        const w1 = rr * 0.1;
        const r0 = rr * 0.22;
        const r1 = rr * 0.9;
        const nx = (ang: number) => [Math.cos(ang + Math.PI / 2), Math.sin(ang + Math.PI / 2)];
        const [ux, uy] = nx(a);
        const [vx, vy] = nx(a2);
        out.push(
          quad(
            [x + Math.cos(a) * r0 + ux * w0, y + Math.sin(a) * r0 + uy * w0],
            [x + Math.cos(a2) * r1 + vx * w1, y + Math.sin(a2) * r1 + vy * w1],
            [x + Math.cos(a2) * r1 - vx * w1, y + Math.sin(a2) * r1 - vy * w1],
            [x + Math.cos(a) * r0 - ux * w0, y + Math.sin(a) * r0 - uy * w0],
          ),
        );
      }
    }
    return <path d={out.join('')} fill={paint(uid, 'soft-2')} opacity={op} />;
  };
  const ca = (-38 * Math.PI) / 180; // the caliper sits at the top front, still while the wheel turns
  const mud = dirt > 0.05;
  return (
    <g>
      <Solid uid={uid} d={circle(x, y, r)} tone={6} shade="soft" rim outline />
      <circle cx={x} cy={y} r={r * 0.9} fill="none" stroke={tone(onDark ? 5 : 5)} strokeWidth={hw} opacity={0.7} />
      {/* the rim's barrel (dark), the brake disc, the caliper, then the spokes and the lip */}
      <circle cx={x} cy={y} r={rr} fill={tone(7)} />
      <circle cx={x} cy={y} r={rr * 0.74} fill={paint(uid, 'ball-5')} />
      <circle cx={x} cy={y} r={rr * 0.74} fill="none" stroke={tone(6)} strokeWidth={hw} opacity={0.6} />
      <path
        d={spline(
          [
            [x + Math.cos(ca - 0.62) * rr * 0.6, y + Math.sin(ca - 0.62) * rr * 0.6, 1],
            [x + Math.cos(ca) * rr * 0.86, y + Math.sin(ca) * rr * 0.86],
            [x + Math.cos(ca + 0.62) * rr * 0.6, y + Math.sin(ca + 0.62) * rr * 0.6, 1],
            [x + Math.cos(ca) * rr * 0.5, y + Math.sin(ca) * rr * 0.5],
          ],
          true,
        )}
        fill={tone(caliper)}
      />
      {blur > 0.02 ? <circle cx={x} cy={y} r={rr * 0.92} fill={tone(2.6)} opacity={0.5 * blur} /> : null}
      {spokes(0, 1 - 0.55 * blur)}
      {blur > 0.02 ? spokes(-9, 0.4 * blur) : null}
      {blur > 0.02 ? spokes(-18, 0.25 * blur) : null}
      <circle cx={x} cy={y} r={rr * 0.95} fill="none" stroke={paint(uid, 'soft-1')} strokeWidth={rr * 0.1} />
      <circle cx={x} cy={y} r={rr * 0.2} fill={paint(uid, 'ball-2')} />
      <circle cx={x} cy={y} r={rr * 0.07} fill={tone(5)} />
      {light ? <circle cx={x} cy={y} r={r} fill="none" stroke={C.ilEdge} strokeWidth={1.8} /> : null}
      {mud ? <Speckle x={x} y={y} r={r} k={dirt} seed={seed} tone={4} /> : null}
    </g>
  );
};

/** Mud: seeded small blobs inside a circle or a box, denser low. */
const Speckle: React.FC<{x: number; y: number; r: number; k: number; seed: number; tone: number; box?: [number, number, number, number]}> = ({x, y, r, k, seed, tone: t, box}) => {
  const n = Math.round(10 + 34 * k);
  let d = '';
  for (let i = 0; i < n; i++) {
    const u = rand(seed * 1000 + i * 3.1);
    const v = rand(seed * 1000 + i * 3.1 + 1);
    const w = rand(seed * 1000 + i * 3.1 + 2);
    let px: number;
    let py: number;
    if (box) {
      px = box[0] + u * box[2];
      py = box[1] + box[3] * (1 - v * v); // denser low
    } else {
      const a = u * Math.PI * 2;
      const rad = r * Math.sqrt(v);
      px = x + Math.cos(a) * rad;
      py = y + Math.sin(a) * rad;
    }
    const rr = (box ? box[3] * 0.025 : r * 0.04) * (0.5 + w);
    d += `M${n1(px - rr)} ${n1(py)}a${n1(rr)} ${n1(rr * 0.8)} 0 1 1 ${n1(rr * 2)} 0a${n1(rr)} ${n1(rr * 0.8)} 0 1 1 ${n1(-rr * 2)} 0`;
  }
  return <path d={d} fill={tone(t)} opacity={0.35 + 0.45 * k} />;
};

// ---- side view ----------------------------------------------------------------------------------------------------------
const CarSide: React.FC<CarP> = (p) => {
  const id = useId();
  const sd = SIDES[p.body ?? 'sedan'];
  const {s, time, dirt, pt, hw, onDark, light} = look(p);
  const dir = p.dir ?? 1;
  const speed = clamp(p.speed ?? 0, 0, 1.5);
  const L = lightsOf(p.lights, p.frame);
  const roll = p.roll ?? speed * 26 * p.frame;
  const bob = p.bob ?? speed * 2.2 * Math.sin(p.frame / 5 + (p.seed ?? 0));
  const pitch = p.pitch ?? 0;
  const cx0 = sd.len / 2;
  const X = (u: number) => p.x + dir * (u - cx0) * s;
  const Y = (v: number) => p.y + v * s;
  const map = (pts: K[]): K[] => pts.map((q) => (q.length === 3 ? [X(q[0]), Y(q[1]), 1] : [X(q[0]), Y(q[1])]));
  const path = (pts: K[], close = true) => spline(map(pts), close);
  const clipB = gid(p.uid, `cb${id}`);
  const clipG = gid(p.uid, `cg${id}`);
  const bodyD = path(sd.body);
  const glassD = path(sd.glass);
  const top = Math.min(...sd.body.map((q) => q[1]));
  const pivot = [X((sd.wheels[0] + sd.wheels[1]) / 2), Y(-sd.R)];
  const R = sd.R * s;
  const D = 2 * R;
  const rot = dir * ((360 * roll) / (Math.PI * D));
  const blur = clamp((speed - 0.25) / 0.5, 0, 1);
  const band = (line: K[], up: boolean) => {
    // a closed region from a crease line to the body's top (up) or bottom, beyond the body's ends
    const ext = up ? top - 40 : 40;
    const pts: K[] = [[line[0][0] + 60, line[0][1], 1], ...line.slice(1, -1), [line[line.length - 1][0] - 60, line[line.length - 1][1], 1], [line[line.length - 1][0] - 60, ext, 1], [line[0][0] + 60, ext, 1]];
    return path(pts);
  };
  const paintI = Math.round(pt);
  const bodyTone = pt;
  const glassBox = (() => {
    const xs = sd.glass.map((q) => X(q[0]));
    const ys = sd.glass.map((q) => Y(q[1]));
    return {x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys)};
  })();
  // light parts
  const headOn = L.head;
  const tailOn = Math.max(L.tail, L.brake);
  const hc = sd.head.reduce((a, q) => [a[0] + q[0] / sd.head.length, a[1] + q[1] / sd.head.length], [0, 0]);
  const tc = sd.tail.reduce((a, q) => [a[0] + q[0] / sd.tail.length, a[1] + q[1] / sd.tail.length], [0, 0]);
  const gk = glowK(time);
  const red = toneBig('down');
  const ind = dir === 1 ? L.left : L.right;
  const flap = sd.flap;
  const isRacer = sd.extra === 'racer';
  return (
    <g opacity={p.opacity}>
      <defs>
        <clipPath id={clipB}>
          <path d={bodyD} />
        </clipPath>
        <clipPath id={clipG}>
          <path d={glassD} />
        </clipPath>
      </defs>
      {p.shadow !== false ? (
        <>
          <Shadow uid={p.uid} cx={p.x} cy={p.y} rx={sd.len * s * 0.52} ry={R * 0.32} k={0.9} />
          <Shadow uid={p.uid} cx={X(sd.wheels[0])} cy={p.y} rx={R * 1.1} ry={R * 0.16} k={1} />
          <Shadow uid={p.uid} cx={X(sd.wheels[1])} cy={p.y} rx={R * 1.1} ry={R * 0.16} k={1} />
        </>
      ) : null}
      {L.beam > 0 ? <Beam uid={p.uid} x={X(sd.len - 10)} y={Y(hc[1])} dir={dir} len={sd.len * s * 1.1} k={L.beam * gk} id={id} /> : null}
      <g transform={`translate(0 ${n1(bob)}) rotate(${n1(dir * pitch)} ${n1(pivot[0])} ${n1(pivot[1])})`}>
        {/* the wheel wells: the dark inside of each arch */}
        {sd.wheels.map((wx) => (
          <path key={wx} d={path([...arch(wx, -sd.R, sd.archR - 1, sd.sill)])} fill={tone(7)} />
        ))}
        {isRacer ? <RacerBack uid={p.uid} X={X} Y={Y} pt={bodyTone} time={time} /> : null}
        <Solid uid={p.uid} d={bodyD} tone={paintI} rim outline time={time} />
        <g clipPath={`url(#${clipB})`}>
          {Math.abs(bodyTone - paintI) > 0.05 ? <path d={bodyD} fill={tone(bodyTone)} opacity={0.6} /> : null}
          {/* the shoulder: everything above the crease faces the sky, a step lighter */}
          <path d={band(sd.crease, true)} fill={tone(bodyTone - 0.9)} opacity={onDark ? 0.55 : 0.75} />
          {/* the lower side turns away from the light */}
          <path d={band(sd.lower, false)} fill={tone(bodyTone + 1.1)} opacity={0.6} />
          {/* a soft reflection of the horizon along the doors */}
          <path d={band(sd.crease.map((q) => [q[0], q[1] + 24] as K), true)} fill="none" />
          {sd.dark?.map((d, i) => <path key={i} d={path(d)} fill={tone(6.2)} />)}
          {dirt > 0.05 ? (
            <>
              <path d={band(sd.lower.map((q) => [q[0], q[1] - 20 * dirt] as K), false)} fill={tone(4.6)} opacity={0.35 * dirt} />
              <Speckle x={0} y={0} r={0} k={dirt} seed={(p.seed ?? 1) + 7} tone={5} box={[X(0) < X(sd.len) ? X(0) : X(sd.len), Y(-150), sd.len * s, 120 * s]} />
            </>
          ) : null}
          {(p.dent ?? 0) > 0.02 ? <Dent X={X} Y={Y} at={sd.dent} k={p.dent ?? 0} s={s} pt={bodyTone} dir={dir} /> : null}
        </g>
        {/* the shoulder crease catches the light: one crisp line */}
        <path d={path(sd.crease, false)} fill="none" stroke={tone(bodyTone - 2.2)} strokeWidth={hw * 1.1} opacity={onDark ? 0.55 : 0.9} strokeLinecap="round" />
        {sd.doors.map((d, i) => (
          <path key={i} d={path(d, false)} fill="none" stroke={tone(bodyTone + 2.4)} strokeWidth={hw} strokeLinecap="round" opacity={0.85} />
        ))}
        {flap ? <rect x={Math.min(X(flap[0]), X(flap[0] + flap[2]))} y={Y(flap[1])} width={flap[2] * s} height={flap[3] * s} rx={6 * s} fill="none" stroke={tone(bodyTone + 2)} strokeWidth={hw * 0.8} opacity={0.45} /> : null}
        {sd.handles.map(([hx, hy, hl], i) => (
          <g key={i}>
            <path d={path([[hx, hy - 3.5, 1], [hx + hl, hy - 3.5, 1], [hx + hl, hy + 3.5, 1], [hx, hy + 3.5, 1]])} fill={tone(bodyTone - 0.8)} />
            <path d={path([[hx + 2, hy + 4.5], [hx + hl - 2, hy + 4.5]], false)} stroke={tone(bodyTone + 2.4)} strokeWidth={hw * 0.8} fill="none" opacity={0.8} />
          </g>
        ))}
        {/* the glass: dark, a cabin behind it, one diagonal reflection, black pillars */}
        <Solid uid={p.uid} d={glassD} tone="glass" shade="flat" time={time} />
        <g clipPath={`url(#${clipG})`}>
          {p.cabin ? <g opacity={0.92}>{p.cabin(glassBox)}</g> : null}
          {sd.pillars.map(([a, b, w], i) => (
            <path key={i} d={spline(map([[a[0] - w / 2, a[1] - 20, 1], [a[0] + w / 2, a[1] - 20, 1], [b[0] + w / 2, b[1] + 10, 1], [b[0] - w / 2, b[1] + 10, 1]]))} fill={tone(7)} />
          ))}
          <path
            d={spline(map([[sd.len * 0.36, top - 30, 1], [sd.len * 0.36 + 70, top - 30, 1], [sd.len * 0.36 - 40, 0, 1], [sd.len * 0.36 - 110, 0, 1]]))}
            fill={C.il0}
            opacity={onDark ? 0.09 : 0.16}
          />
          <path
            d={spline(map([[sd.len * 0.36 + 100, top - 30, 1], [sd.len * 0.36 + 122, top - 30, 1], [sd.len * 0.36 + 12, 0, 1], [sd.len * 0.36 - 10, 0, 1]]))}
            fill={C.il0}
            opacity={onDark ? 0.07 : 0.12}
          />
          {dirt > 0.3 ? <path d={glassD} fill={tone(4)} opacity={0.18 * dirt} /> : null}
        </g>
        {isRacer ? <RacerFront uid={p.uid} X={X} Y={Y} pt={bodyTone} hw={hw} time={time} number={p.number} s={s} /> : null}
        {/* the mirror */}
        <Solid uid={p.uid} d={path(sd.mirror)} tone={Math.round(bodyTone)} rim outline time={time} />
        {/* lights: a slim LED line at the front, the rear bar's wrap at the back */}
        {headOn > 0 ? <ellipse cx={X(hc[0] + 10)} cy={Y(hc[1])} rx={110 * s * (0.6 + 0.6 * headOn)} ry={46 * s * (0.6 + 0.6 * headOn)} fill={paint(p.uid, 'glow-ink')} opacity={headOn * gk} /> : null}
        <Solid uid={p.uid} d={path(sd.head)} tone={headOn > 0.5 ? 0 : onDark ? 1.6 : 0} shade="flat" outline={light} time={time} />
        {ind > 0 ? <path d={path(sd.head.slice(0, 3).concat([[sd.head[2][0] - 26, sd.head[2][1] + 6, 1]]))} fill={C.il0} opacity={ind} /> : null}
        {L.brake > 0 ? <ellipse cx={X(tc[0])} cy={Y(tc[1])} rx={90 * s * (0.7 + 0.5 * L.brake)} ry={44 * s} fill={paint(p.uid, 'glow-down')} opacity={L.brake * gk} /> : null}
        {L.tail > 0 && L.brake < 0.5 ? <ellipse cx={X(tc[0])} cy={Y(tc[1])} rx={70 * s} ry={30 * s} fill={paint(p.uid, 'glow-ink')} opacity={L.tail * 0.6 * gk} /> : null}
        <Solid uid={p.uid} d={path(sd.tail)} tone={tailOn > 0 ? 1 : 6} fill={L.brake > 0.05 ? red : undefined} shade="flat" outline={light} time={time} opacity={1} />
        {L.brake > 0.05 && L.brake < 1 ? <path d={path(sd.tail)} fill={tone(L.tail > 0 ? 1 : 6)} opacity={1 - L.brake} /> : null}
        {ind > 0 ? <path d={path(sd.tail.slice(0, 2).concat([[sd.tail[1][0] + 10, sd.tail[1][1] + 10, 1]]))} fill={C.il0} opacity={ind} /> : null}
      </g>
      {sd.wheels.map((wx, i) => (
        <Wheel
          key={wx}
          uid={p.uid}
          x={X(wx)}
          y={Y(-sd.R)}
          r={R}
          rimK={sd.rimK}
          rot={rot + i * 23}
          blur={blur}
          caliper={4}
          hw={hw}
          light={light}
          onDark={onDark}
          dirt={dirt}
          seed={(p.seed ?? 1) * 10 + i}
        />
      ))}
    </g>
  );
};

/** A dent: a shallow depression lit from the top left (its upper-left wall in shade, its lower-right wall catching the
 *  light), a crease through it and two bright scrapes where the paint came off. */
const Dent: React.FC<{X: (u: number) => number; Y: (v: number) => number; at: Pt; k: number; s: number; pt: number; dir: number}> = ({X, Y, at, k, s, pt, dir}) => {
  const [ux, uy] = at;
  const kk = Math.min(1, k);
  const rx = 62 * kk * s;
  const ry = 38 * kk * s;
  const cx = X(ux);
  const cy = Y(uy);
  const e = (ox: number, oy: number, sx = 1, sy = 1) => {
    const a = rx * sx;
    const b = ry * sy;
    return `M${n1(cx + ox - a)} ${n1(cy + oy)}a${n1(a)} ${n1(b)} 0 1 0 ${n1(2 * a)} 0a${n1(a)} ${n1(b)} 0 1 0 ${n1(-2 * a)} 0Z`;
  };
  const ln = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n1(cx + dir * x * rx)} ${n1(cy + y * ry)}`).join('');
  return (
    <g>
      {/* the shaded upper-left wall: the dent minus itself moved down-right */}
      <path d={e(0, 0) + e(rx * 0.22, ry * 0.3, 0.97, 0.97)} fillRule="evenodd" fill={tone(pt + 1.3)} opacity={0.9} />
      {/* the lit lower-right wall */}
      <path d={e(0, 0) + e(-rx * 0.18, -ry * 0.26, 0.97, 0.97)} fillRule="evenodd" fill={tone(pt - 1.1)} opacity={0.9} />
      <path d={e(0, 0, 0.78, 0.7)} fill={tone(pt + 0.45)} opacity={0.5} />
      <path d={ln([[-1.25, -0.25], [-0.35, 0.1], [0.3, -0.05], [1.2, -0.4]])} fill="none" stroke={tone(pt + 2.3)} strokeWidth={1.4} opacity={0.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d={ln([[-1.7, 0.55], [-0.2, 0.62]]) + ln([[0.25, 0.75], [1.5, 0.62]])} fill="none" stroke={C.il0} strokeWidth={1.4} opacity={0.65} strokeLinecap="round" />
    </g>
  );
};

/** A soft cone of light ahead of a headlight (night): a stretched halo, brightest at the lamp. */
const Beam: React.FC<{uid: string; x: number; y: number; dir: number; len: number; k: number; id: string}> = ({uid, x, y, dir, len, k, id}) => {
  const g = gid(uid, `bm${id}`);
  const x2 = x + dir * len;
  return (
    <g>
      <defs>
        <linearGradient id={g} x1={dir > 0 ? 0 : 1} y1={0} x2={dir > 0 ? 1 : 0} y2={0}>
          <stop offset={0} stopColor={C.il0} stopOpacity={0.42} />
          <stop offset={0.5} stopColor={C.il0} stopOpacity={0.12} />
          <stop offset={1} stopColor={C.il0} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${n1(x)} ${n1(y - 6)}L${n1(x2)} ${n1(y - len * 0.12)}L${n1(x2)} ${n1(y + len * 0.2)}L${n1(x)} ${n1(y + 8)}Z`} fill={`url(#${g})`} opacity={k} />
    </g>
  );
};

/** The racer's fin and wing (behind the body) */
const RacerBack: React.FC<{uid: string; X: (u: number) => number; Y: (v: number) => number; pt: number; time: Time}> = ({uid, X, Y, pt, time}) => {
  const m = (pts: K[]) => spline(pts.map((q) => (q.length === 3 ? [X(q[0]), Y(q[1]), 1] : [X(q[0]), Y(q[1])])) as K[]);
  return (
    <g>
      {/* the wing's struts and its plane */}
      <path d={m([[52, -200, 1], [62, -200, 1], [70, -262, 1], [60, -262, 1]])} fill={tone(6)} />
      <path d={m([[104, -204, 1], [114, -204, 1], [118, -262, 1], [108, -262, 1]])} fill={tone(6)} />
      <Solid uid={uid} d={m([[-6, -282, 1], [150, -276, 1], [148, -260, 1], [-4, -262, 1]])} tone={6} rim outline time={time} />
      <Solid uid={uid} d={m([[-10, -300, 1], [24, -298, 1], [24, -248, 1], [-6, -244, 1]])} tone={Math.round(pt + 1)} rim outline time={time} />
      {/* the shark fin along the engine cover */}
      <Solid uid={uid} d={m([[486, -236, 1], [340, -242], [200, -252], [150, -258, 1], [156, -212, 1], [420, -204, 1]])} tone={Math.round(pt) + 1} rim outline time={time} />
    </g>
  );
};
/** The racer's number roundel and splitter. */
const RacerFront: React.FC<{uid: string; X: (u: number) => number; Y: (v: number) => number; pt: number; hw: number; time: Time; number?: string | number; s: number}> = ({X, Y, number, s}) => {
  if (number === undefined) return null;
  const cx = X(560);
  const cy = Y(-128);
  const r = 46 * s;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.il0} />
      <text x={cx} y={cy + r * 0.36} textAnchor="middle" fontFamily="FiraGO, sans-serif" fontWeight={700} fontSize={r * 1.05} fill={C.il7}>
        {String(number)}
      </text>
    </g>
  );
};

// ---- rear and front views -----------------------------------------------------------------------------------------------
const CarEnd: React.FC<CarP> = (p) => {
  const id = useId();
  const body = p.body ?? 'sedan';
  const e = ENDS[body];
  const {s, time, dirt, pt, hw, onDark, light} = look(p);
  const front = p.view === 'front';
  const speed = clamp(p.speed ?? 0, 0, 1.5);
  const L = lightsOf(p.lights, p.frame);
  const roll = p.roll ?? speed * 26 * p.frame;
  const bob = p.bob ?? speed * 2.2 * Math.sin(p.frame / 5 + (p.seed ?? 0));
  const lean = p.lean ?? 0;
  const X = (u: number) => p.x + u * s;
  const Y = (v: number) => p.y + v * s;
  const map = (pts: K[]): K[] => pts.map((q) => (q.length === 3 ? [X(q[0]), Y(q[1]), 1] : [X(q[0]), Y(q[1])]));
  const path = (pts: K[], close = true) => spline(map(pts), close);
  const box = (x0: number, y0: number, x1: number, y1: number): K[] => [[x0, y0, 1], [x1, y0, 1], [x1, y1, 1], [x0, y1, 1]];
  const clipB = gid(p.uid, `eb${id}`);
  const clipG = gid(p.uid, `eg${id}`);
  const [to, ti] = e.tyre;
  const h = e.half;
  const dk = e.deck;
  const [gb, gby, gt, gty] = front ? e.wglass : e.glass;
  const isRacer = body === 'racer';
  const pi = Math.round(pt);
  // the outline: the greenhouse (roof, pillars) on the body (shoulders, hips, the fender over each tyre, the bumper)
  const right: K[] = [
    [0, -e.H],
    [e.roofHalf * 0.7, -e.H + 1],
    [e.roofHalf, -e.H + 8],
    [e.roofHalf + (e.ghBase - e.roofHalf) * 0.62 + 3, -e.H + (dk + e.H) * 0.5],
    [e.ghBase, dk - 6],
    [e.ghBase + 12, dk + 1],
    [h - 16, dk + 10],
    [h - 3, dk + 30],
    [h, dk + 64],
    [h - 2, e.fender - 28],
    [h - 7, e.fender, 1],
    [ti + 8, e.fender + 2, 1],
    [ti - 4, e.fender + 14],
    [ti - 7, e.bumper, 1],
    [0, e.bumper],
  ];
  const bodyD = path(sym(right));
  const glassD = path([[-gb, gby, 1], [-gt - 5, gty + 7], [-gt + 9, gty, 1], [gt - 9, gty, 1], [gt + 5, gty + 7], [gb, gby, 1]]);
  const red = toneBig('down');
  const gk = glowK(time);
  const tailOn = Math.max(L.tail, L.brake);
  const brk = L.brake > 0.05;
  const tread = ((roll * (front ? 1 : -1)) % 22 + 22) % 22;
  // the car's own left is on the picture's left seen from behind, on the right seen from the front
  const indSide = (side: number) => (front ? (side > 0 ? L.left : L.right) : side > 0 ? L.right : L.left);
  const lampY = front ? e.head : e.lamp;
  const lampEnd = (side: number): K[] => {
    const xo = h - 6;
    const xi = h - 62;
    const t = front ? 7 : 11;
    const pts: K[] = front
      ? [[xi, lampY - t / 2, 1], [xo, lampY - t / 2 - 5, 1], [xo + 2, lampY + t / 2 + 14, 1], [xo - 7, lampY + t / 2 + 14, 1], [xo - 9, lampY + t / 2 - 1, 1], [xi, lampY + t / 2, 1]]
      : [[xi, lampY - t / 2, 1], [xo, lampY - t / 2 - 3, 1], [xo + 3, lampY + t / 2, 1], [xi, lampY + t / 2, 1]];
    return pts.map((q) => [side * q[0], q[1], 1] as K);
  };
  return (
    <g opacity={p.opacity}>
      <defs>
        <clipPath id={clipB}>
          <path d={bodyD} />
        </clipPath>
        <clipPath id={clipG}>
          <path d={glassD} />
        </clipPath>
      </defs>
      {p.shadow !== false ? <Shadow uid={p.uid} cx={p.x} cy={p.y} rx={(h + 30) * s} ry={22 * s} k={1.2} /> : null}
      {/* the underbody's shadow between the wheels, then the tyres (their tread scrolls when the car rolls) */}
      <path d={path([[-ti, e.bumper - 6, 1], [ti, e.bumper - 6, 1], [ti - 10, e.bumper + 12, 1], [-ti + 10, e.bumper + 12, 1]])} fill={tone(onDark ? 7 : 6.2)} />
      {[-1, 1].map((side) => {
        const x0 = side > 0 ? ti : -to;
        const x1 = side > 0 ? to : -ti;
        const top = e.fender - 40;
        const lines: string[] = [];
        for (let k = -1; k < 8; k++) {
          const yy = top + 10 + k * 22 + tread;
          if (yy > e.fender + 4 && yy < -8) lines.push(`M${n1(X(x0 + 9))} ${n1(Y(yy))}H${n1(X(x1 - 9))}`);
        }
        return (
          <g key={side}>
            <Solid uid={p.uid} d={spline(map([[x0, top, 1], [x1, top, 1], [x1, -12], [x1 - 10, 0, 1], [x0 + 10, 0, 1], [x0, -12]]))} tone={6} rim outline time={time} />
            <path d={lines.join('')} stroke={tone(7)} strokeWidth={hw * 1.5} opacity={0.55} />
          </g>
        );
      })}
      <g transform={`translate(0 ${n1(bob)}) rotate(${n1(lean)} ${n1(p.x)} ${n1(Y(-e.H * 0.3))})`}>
        {/* mirrors on their stalks */}
        {!isRacer
          ? [-1, 1].map((side) => (
              <Solid
                key={side}
                uid={p.uid}
                d={path(([[e.ghBase - 8, dk - 26, 1], [e.ghBase + 30, dk - 34], [h + 14, dk - 33], [h + 19, dk - 20, 1], [h + 8, dk - 13, 1], [e.ghBase - 2, dk - 9, 1]] as K[]).map((q) => [side * q[0], q[1], 1] as K))}
                tone={pi}
                rim
                outline
                time={time}
              />
            ))
          : null}
        {isRacer && !front ? (
          <>
            {[-1, 1].map((side) => <path key={side} d={path(box(side * 64 - 5, -e.H + 6, side * 64 + 5, dk + 10))} fill={tone(6)} />)}
            <Solid uid={p.uid} d={path(box(-h + 8, -e.H - 6, h - 8, -e.H + 10))} tone={6} rim outline time={time} />
            {[-1, 1].map((side) => <Solid key={side} uid={p.uid} d={path(box(side * (h - 8) - 9, -e.H - 34, side * (h - 8) + 9, -e.H + 20))} tone={pi + 1} rim outline time={time} />)}
          </>
        ) : null}
        <Solid uid={p.uid} d={bodyD} tone={pi} rim outline time={time} />
        <g clipPath={`url(#${clipB})`}>
          {Math.abs(pt - pi) > 0.05 ? <path d={bodyD} fill={tone(pt)} opacity={0.6} /> : null}
          {/* the deck (or the hood) and the roof face the sky; the lower bumper and the right flank turn from the light */}
          <path d={path(box(-h - 20, dk - 10, h + 20, dk + (front ? 34 : 14)))} fill={tone(pt - 1.1)} opacity={0.6} />
          <path d={path(box(-h - 20, -e.H - 10, h + 20, -e.H + 8))} fill={tone(pt - 1)} opacity={0.5} />
          <path d={path([[-h - 20, e.fender - 20, 1], [h + 20, e.fender - 26, 1], [h + 20, 10, 1], [-h - 20, 10, 1]])} fill={tone(pt + 1)} opacity={0.5} />
          <path d={path(box(h - 30, dk, h + 20, 10))} fill={tone(pt + 1)} opacity={0.42} />
          <path d={path(box(-h - 20, dk, -h + 22, e.fender))} fill={tone(pt - 0.8)} opacity={0.38} />
          {/* the bumper's crease catches the light */}
          <path d={path([[-h + 14, e.fender - 30], [0, e.fender - 36], [h - 14, e.fender - 30]], false)} fill="none" stroke={tone(pt - 2)} strokeWidth={hw} opacity={onDark ? 0.5 : 0.85} />
          {/* lower trim: a diffuser at the back; an intake slot and two corner vents at the front */}
          {front ? (
            <>
              <path d={path([[-ti + 14, e.bumper - 30, 1], [ti - 14, e.bumper - 30, 1], [ti - 4, e.bumper - 12], [ti - 18, e.bumper - 4, 1], [-ti + 18, e.bumper - 4, 1], [-ti + 4, e.bumper - 12]])} fill={tone(6.4)} />
              {[-1, 1].map((side) => <path key={side} d={path([[side * (h - 40), e.fender - 46, 1], [side * (h - 30), e.fender - 46, 1], [side * (h - 24), e.fender - 6, 1], [side * (h - 36), e.fender - 6, 1]])} fill={tone(6.4)} />)}
            </>
          ) : (
            <>
              <path d={path([[-ti + 6, e.bumper - 22, 1], [ti - 6, e.bumper - 22, 1], [ti - 12, e.bumper + 2, 1], [-ti + 12, e.bumper + 2, 1]])} fill={tone(6.3)} />
              {[-1, 1].map((side) => <path key={side} d={path(box(side * (h - 46), e.fender - 22, side * (h - 16), e.fender - 15))} fill={tone(6.3)} />)}
            </>
          )}
          {/* shut lines: the trunk lid (rear) or the hood's edges (front) */}
          {!isRacer ? (
            <path
              d={
                front
                  ? path([[-e.ghBase + 4, dk + 2], [-h + 40, dk + 24], [-h + 66, e.head - 10]], false) + path([[e.ghBase - 4, dk + 2], [h - 40, dk + 24], [h - 66, e.head - 10]], false)
                  : path([[-e.ghBase + 14, dk + 3], [-e.ghBase + 6, e.lamp + 22], [-e.ghBase + 20, e.lamp + 40, 1], [e.ghBase - 20, e.lamp + 40, 1], [e.ghBase - 6, e.lamp + 22], [e.ghBase - 14, dk + 3]], false)
              }
              fill="none"
              stroke={tone(pt + 2.4)}
              strokeWidth={hw}
              opacity={0.7}
            />
          ) : null}
          {dirt > 0.05 ? <Speckle x={0} y={0} r={0} k={dirt} seed={(p.seed ?? 1) + 3} tone={5} box={[X(-h), Y(e.fender - 40), 2 * h * s, (40 - e.fender) * s]} /> : null}
          {(p.dent ?? 0) > 0.02 && !front ? <Dent X={X} Y={Y} at={[h - 66, e.fender - 30]} k={(p.dent ?? 0) * 0.75} s={s} pt={pt} dir={1} /> : null}
        </g>
        {/* the plate: blank, in a shallow recess */}
        {e.plate ? (
          <>
            <path d={path(box(-58, (front ? e.bumper - 52 : e.plate) - 18, 58, (front ? e.bumper - 52 : e.plate) + 18))} fill={tone(pt + 0.8)} opacity={0.6} />
            <path d={path(box(-50, (front ? e.bumper - 52 : e.plate) - 12, 50, (front ? e.bumper - 52 : e.plate) + 12))} fill={tone(onDark ? 1.3 : 0)} stroke={light ? C.ilEdge : 'none'} strokeWidth={1.2} />
          </>
        ) : null}
        {/* the glass */}
        <Solid uid={p.uid} d={glassD} tone="glass" shade="flat" time={time} />
        <g clipPath={`url(#${clipG})`}>
          <path d={path([[-gb * 0.32, gty - 10, 1], [-gb * 0.08, gty - 10, 1], [-gb * 0.55, gby + 10, 1], [-gb * 0.79, gby + 10, 1]])} fill={C.il0} opacity={onDark ? 0.09 : 0.16} />
          <path d={path([[gb * 0.02, gty - 10, 1], [gb * 0.11, gty - 10, 1], [-gb * 0.32, gby + 10, 1], [-gb * 0.41, gby + 10, 1]])} fill={C.il0} opacity={onDark ? 0.06 : 0.12} />
          {front && !isRacer ? <path d={path([[-gb + 16, gby - 5], [-gb * 0.25, gby - 13], [-gb * 0.08, gby - 9]], false) + path([[gb * 0.06, gby - 5], [gb * 0.66, gby - 13], [gb * 0.8, gby - 9]], false)} stroke={tone(6.5)} strokeWidth={hw * 1.5} fill="none" strokeLinecap="round" /> : null}
          {dirt > 0.3 ? <path d={glassD} fill={tone(4)} opacity={0.2 * dirt} /> : null}
        </g>
        {/* the third brake light at the top of the rear window */}
        {!front && !isRacer ? <path d={path(box(-36, gty + 3, 36, gty + 7))} fill={brk ? red : tone(6)} opacity={brk ? Math.max(0.6, L.brake) : 0.8} /> : null}
        {/* halos, then the lamps: the rear bar runs the full width; at the front two slim lamps and a thin line between */}
        {(front ? L.head : tailOn) > 0
          ? [-1, 1].map((side) => (
              <ellipse
                key={side}
                cx={X(side * (h - 36))}
                cy={Y(lampY)}
                rx={(front ? 120 : brk ? 100 : 70) * s}
                ry={(front ? 52 : brk ? 46 : 30) * s}
                fill={paint(p.uid, !front && brk ? 'glow-down' : 'glow-ink')}
                opacity={(front ? L.head : brk ? L.brake : L.tail * 0.55) * gk}
              />
            ))
          : null}
        <path
          d={path(box(-h + 58, lampY - (front ? 1.4 : 3), h - 58, lampY + (front ? 1.4 : 3)))}
          fill={!front && brk ? red : front ? (L.head > 0.3 ? C.il0 : tone(onDark ? 2 : 1)) : tailOn > 0 ? tone(1.2) : tone(6.2)}
        />
        {[-1, 1].map((side) => (
          <g key={side}>
            <Solid
              uid={p.uid}
              d={path(lampEnd(side))}
              tone={front ? (L.head > 0.3 ? 0 : onDark ? 1.6 : 0) : tailOn > 0 ? 1 : 6}
              fill={!front && brk ? red : undefined}
              shade="flat"
              outline={light}
              time={time}
            />
            {indSide(side) > 0 ? <path d={path(lampEnd(side).slice(1, 3).concat([[side * (h - 30), lampY + 6, 1], [side * (h - 30), lampY - 6, 1]]))} fill={C.il0} opacity={indSide(side)} /> : null}
          </g>
        ))}
      </g>
    </g>
  );
};

// ---- top view -----------------------------------------------------------------------------------------------------------
const CarTop: React.FC<CarP> = (p) => {
  const id = useId();
  const body = p.body ?? 'sedan';
  const tp = TOPS[body];
  const sd = SIDES[body];
  const {s, time, dirt, pt, hw, onDark, light} = look(p);
  const L = lightsOf(p.lights, p.frame);
  const half = sd.len / 2;
  const w = tp.half;
  const X = (u: number) => u * s;
  const Y = (v: number) => v * s;
  const map = (pts: K[]): K[] => pts.map((q) => (q.length === 3 ? [X(q[0]), Y(q[1]), 1] : [X(q[0]), Y(q[1])]));
  const path = (pts: K[], close = true) => spline(map(pts), close);
  const mirrorX = (pts: K[]): K[] => sym(pts);
  const clipB = gid(p.uid, `tb${id}`);
  const gradT = gid(p.uid, `tg${id}`);
  const nose = -half;
  const tail = half;
  const [aF, aR] = tp.axles;
  const pi = Math.round(pt);
  const outline = mirrorX([
    [0, nose],
    [w * 0.5, nose + 3],
    [w * 0.8, nose + 20],
    [w * 0.95, nose + 62],
    [w * 0.995, nose + 130],
    [w + 3, aF],
    [w - 7, (aF + aR) / 2],
    [w + 3, aR],
    [w * 0.99, tail - 100],
    [w * 0.92, tail - 34],
    [w * 0.7, tail - 6],
    [0, tail],
  ]);
  const bodyD = path(outline);
  const [c0, c1] = tp.cab;
  const ch = tp.cabHalf;
  const cabD = path(mirrorX([[0, c0 - 8], [ch * 0.82, c0], [ch, c0 + 46], [ch, c1 - 54], [ch * 0.84, c1], [0, c1 + 6]]));
  const [r0, r1] = tp.roof;
  const rh = tp.roofHalf;
  const roofD = path(mirrorX([[0, r0 - 4], [rh * 0.86, r0], [rh, r0 + 26], [rh, r1 - 24], [rh * 0.86, r1], [0, r1 + 3]]));
  const red = toneBig('down');
  const gk = glowK(time);
  const isRacer = body === 'racer';
  const ind = (side: number) => (side < 0 ? L.left : L.right);
  const tyreLen = sd.R * 2 * 0.86;
  return (
    <g transform={`translate(${n1(p.x)} ${n1(p.y)}) rotate(${n1(p.heading ?? 0)})`} opacity={p.opacity}>
      <defs>
        <clipPath id={clipB}>
          <path d={bodyD} />
        </clipPath>
        <linearGradient id={gradT} x1={0} y1={0} x2={1} y2={0}>
          <stop offset={0} stopColor={tone(pt - 0.9)} stopOpacity={0.7} />
          <stop offset={0.14} stopColor={tone(pt - 0.6)} stopOpacity={0.35} />
          <stop offset={0.45} stopColor={tone(pt - 0.5)} stopOpacity={0.25} />
          <stop offset={0.8} stopColor={tone(pt + 0.4)} stopOpacity={0.3} />
          <stop offset={1} stopColor={tone(pt + 1.4)} stopOpacity={0.75} />
        </linearGradient>
      </defs>
      {/* the shadow falls to the lower right (the key light is top left) */}
      {p.shadow !== false && isLight() ? <path d={bodyD} transform={`translate(${n1(12 * s)} ${n1(18 * s)})`} fill={C.shade} opacity={0.13} /> : null}
      {L.beam > 0 ? <ellipse cx={0} cy={Y(nose - 250)} rx={X(w * 1.3)} ry={Y(290)} fill={paint(p.uid, 'glow-ink')} opacity={L.beam * gk * 0.75} /> : null}
      {[aF, aR].map((ax) => [-1, 1].map((side) => <path key={`${ax}${side}`} d={path([[side * (w - 40), ax - tyreLen / 2, 1], [side * (w + 7), ax - tyreLen / 2, 1], [side * (w + 7), ax + tyreLen / 2, 1], [side * (w - 40), ax + tyreLen / 2, 1]])} fill={tone(6.4)} />))}
      {/* mirrors */}
      {!isRacer ? [-1, 1].map((side) => <Solid key={side} uid={p.uid} d={path(([[w - 8, c0 + 18, 1], [w + 34, c0 + 26], [w + 32, c0 + 44, 1], [w - 8, c0 + 46, 1]] as K[]).map((q) => [side * q[0], q[1], 1] as K))} tone={pi} rim outline time={time} />) : null}
      <Solid uid={p.uid} d={bodyD} tone={pi} rim outline time={time} />
      <g clipPath={`url(#${clipB})`}>
        {Math.abs(pt - pi) > 0.05 ? <path d={bodyD} fill={tone(pt)} opacity={0.6} /> : null}
        {/* the body is a soft dome: the flanks turn down, the left one toward the light, the right one away */}
        <path d={bodyD} fill={`url(#${gradT})`} />
        {/* the hood's two creases */}
        <path d={path([[-w * 0.44, nose + 50], [-w * 0.4, c0 - 16]], false)} stroke={tone(pt - 1.8)} strokeWidth={hw * 1.2} fill="none" opacity={onDark ? 0.5 : 0.85} />
        <path d={path([[w * 0.44, nose + 50], [w * 0.4, c0 - 16]], false)} stroke={tone(pt + 1.8)} strokeWidth={hw * 1.2} fill="none" opacity={0.5} />
        {dirt > 0.05 ? <Speckle x={0} y={0} r={0} k={dirt} seed={(p.seed ?? 1) + 5} tone={5} box={[X(-w), Y(nose), 2 * w * s, sd.len * s]} /> : null}
      </g>
      {/* the greenhouse: glass all round (windshield, side glass, rear window), the roof panel on top */}
      <path d={cabD} fill={C.ilGlass} />
      <path d={path([[-ch * 0.5, c0 + 6, 1], [-ch * 0.28, c0 + 4, 1], [-ch * 0.62, r0 - 6, 1], [-ch * 0.84, r0 - 4, 1]])} fill={C.il0} opacity={onDark ? 0.09 : 0.16} />
      {[-1, 1].map((side) => <path key={side} d={path([[side * rh, (r0 + r1) / 2 - 7, 1], [side * (ch + 1), (r0 + r1) / 2 - 9, 1], [side * (ch + 1), (r0 + r1) / 2 + 9, 1], [side * rh, (r0 + r1) / 2 + 7, 1]])} fill={tone(pt + 0.4)} />)}
      <Solid uid={p.uid} d={roofD} tone={pi} shade="soft" time={time} />
      <path d={roofD} fill={tone(pt - 0.6)} opacity={0.35} />
      {tp.glassRoof ? (
        <>
          <path d={path(mirrorX([[0, r0 + 10], [rh * 0.72, r0 + 12], [rh - 9, r0 + 32], [rh - 9, r1 - 28], [rh * 0.72, r1 - 10], [0, r1 - 8]]))} fill={C.ilGlass} />
          <path d={path([[-rh * 0.5, r0 + 18, 1], [-rh * 0.3, r0 + 18, 1], [-rh * 0.62, r1 - 16, 1], [-rh * 0.82, r1 - 16, 1]])} fill={C.il0} opacity={onDark ? 0.07 : 0.12} />
        </>
      ) : null}
      {body === 'suv' ? [-1, 1].map((side) => <path key={side} d={path([[side * (rh - 6), r0 + 30, 1], [side * (rh + 4), r0 + 30, 1], [side * (rh + 4), r1 - 30, 1], [side * (rh - 6), r1 - 30, 1]])} fill={tone(6)} />) : null}
      {isRacer ? (
        <>
          <Solid uid={p.uid} d={path([[-7, r1, 1], [7, r1, 1], [6, tail - 80, 1], [-6, tail - 80, 1]])} tone={pi + 1} shade="flat" time={time} />
          <Solid uid={p.uid} d={path([[-w - 4, tail - 84, 1], [w + 4, tail - 84, 1], [w + 4, tail - 30, 1], [-w - 4, tail - 30, 1]])} tone={6} rim outline time={time} />
          {p.number !== undefined ? (
            <g>
              <circle cx={0} cy={Y(-300)} r={X(62)} fill={C.il0} />
              <text x={0} y={Y(-300) + X(62) * 0.36} textAnchor="middle" fontFamily="FiraGO, sans-serif" fontWeight={700} fontSize={X(62) * 1.05} fill={C.il7}>
                {String(p.number)}
              </text>
            </g>
          ) : null}
        </>
      ) : null}
      {/* lights: two slim lamps along the nose, the bar across the tail */}
      {L.head > 0 ? [-1, 1].map((side) => <ellipse key={side} cx={X(side * w * 0.62)} cy={Y(nose + 16)} rx={X(84)} ry={X(46)} fill={paint(p.uid, 'glow-ink')} opacity={L.head * gk} />) : null}
      {[-1, 1].map((side) => (
        <path key={side} d={path(([[w * 0.34, nose + 10, 1], [w * 0.66, nose + 13], [w * 0.88, nose + 28, 1], [w * 0.86, nose + 38, 1], [w * 0.64, nose + 24], [w * 0.35, nose + 20, 1]] as K[]).map((q) => [side * q[0], q[1], 1] as K))} fill={L.head > 0.3 ? C.il0 : tone(onDark ? 1.6 : 0)} stroke={light ? C.ilEdge : 'none'} strokeWidth={1.2} />
      ))}
      {[-1, 1].map((side) => (ind(side) > 0 ? <circle key={side} cx={X(side * w * 0.86)} cy={Y(nose + 40)} r={X(12)} fill={C.il0} opacity={ind(side)} /> : null))}
      {L.brake > 0.05 ? <ellipse cx={0} cy={Y(tail - 8)} rx={X(w * 1.15)} ry={X(64)} fill={paint(p.uid, 'glow-down')} opacity={L.brake * gk} /> : null}
      <path d={path([[-w * 0.84, tail - 20, 1], [w * 0.84, tail - 20, 1], [w * 0.7, tail - 9, 1], [-w * 0.7, tail - 9, 1]])} fill={L.brake > 0.05 ? red : L.tail > 0 ? tone(1) : tone(6)} />
      {[-1, 1].map((side) => (ind(side) > 0 ? <circle key={side} cx={X(side * w * 0.8)} cy={Y(tail - 16)} r={X(11)} fill={C.il0} opacity={ind(side)} /> : null))}
    </g>
  );
};
