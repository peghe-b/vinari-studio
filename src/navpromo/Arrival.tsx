// ARRIVAL, the payoff of the forest's „You have arrived." (the owner, 2026-10-12: refined like the new forest, real motion,
// everything whole; round 2: the car whole from its first frame, the man bigger, the cow smaller, the house really on the
// car's RIGHT as Alice says): a calm village street in the white world's daylight. Pale snowy mountains far off, a walnut
// tree and cypresses, a two-storey village house with a wooden balcony behind a plastered garden wall and its wrought
// gate. The cobalt coupe (the forest's car) drives in from the right, heading LEFT, so the houses behind the road are on
// its right side: the camera tracks it (the world slides by on three planes of parallax while the car, whole from the
// first frame, eases only a little across the frame), it brakes (its brake light, the nose dips and settles) and stops just
// short of the gate; the destination pin drops in front of the gate, ahead on the car's right; the forest's bubble „YOU
// HAVE ARRIVED." pops over the car (its tail on the car's cabin) and a red line strikes it out; on the music's lift the
// lost man (refined.tsx MAN, the studio's Figure, its poses blended) stands up through the open sunroof, big enough to
// read, and dances, lit by the day (light skin, a dark grey suit with a lit side, no cobalt on him), with a camera punch
// toward him; the cow (refined.tsx Cow's head redrawn by day, small) peeks over the wall beside the gate and nods along;
// a little confetti. Everything that matters stays whole and above the subtitle line.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F} from '../tokens';
import {Backdrop} from '../scenes/illo/backdrop';
import {Car, carBox} from '../scenes/illo/car';
import {circ, DefsSvg, paint, rr, smooth, Solid} from '../scenes/illo/solid';
import {Figure} from '../scenes/illo/figure';
import type {Act} from '../scenes/illo/acting';
import {mix} from '../scenes/illo/palette';
import {SilPalCtx, type SilPal} from '../scenes/illo/sil';
import {MAN} from './refined';
import {Cloud, Pin, useUid} from './carKit';
import {clamp, E, ev, fr, hash, lerp, prog, shot, sp} from './lib';

const W = 1080;
const H = 1920;
const ROAD = 1300; // the car's ground
const WALL = 1080; // the garden wall's top
const WALL_B = 1184; // its foot (the pavement)
const CAR_LEN = 600;
const CAR_X = 674; // where the car stops (frame x of its centre): its nose at 374, just short of the gate
const CAR_X0 = 722; // where it is on the first frame: whole (its tail at 1022, 1037 under the cut's punch)
const PAN0 = 520; // how far the world slides while the camera tracks the car
const HX0 = 134; // the house (its left eave about 30 px inside the frame at the dance's punch)
const HX1 = 504;
const GATE0 = 266; // the gate, in front of the house's door
const GATE1 = 372;
const PIN_X = (GATE0 + GATE1) / 2;
const COW_X = 466; // beside the gate's right post, below the balcony
const COW_S = 0.3;
const MAN_SIZE = 360; // his standing height: bigger than the coupe's true scale, so his dance reads
const OX = 662; // the camera's push centre: the car and the man
const OY = 1000;

// the bubble: its tail at the lower right, aimed down at the car's cabin
const BUBBLE = 'M-234 -76H234Q270 -76 270 -40V40Q270 76 234 76H112L78 140L56 76H-234Q-270 76 -270 40V-40Q-270 -76 -234 -76Z';
const BUBBLE_X = 624;
const BUBBLE_Y = 560;

/** the man's day light (the film's people are lit by the accent: here the sun lights him, so no cobalt on his skin): light
 *  grey skin, a dark grey suit; `lit` the suit's lit side (drawn again over the left of him through a soft mask) */
const dayPal = (lit: boolean) => (): SilPal => ({
  dark: false,
  ink: lit ? mix(C.il5, C.il6, 0.25) : C.il6,
  ink2: lit ? C.il6 : mix(C.il6, C.il7, 0.45),
  sheen: C.il4,
  rim: C.il3,
  lit: [mix(C.ilSkin2, C.il4, 0.5), C.ilSkin2, C.ilSkin, C.il0],
  white: [C.il0, C.il1],
  feature: C.il7,
  grey: C.il3,
  b: C.il4,
});
const PAL = dayPal(false);
const PAL_LIT = dayPal(true);

/** the cow's head by day, front on, chewing (refined.tsx Cow redrawn: a white head with one dark patch, the same contour
 *  round every part, horns and ears included) */
const DayCow: React.FC<{uid: string; x: number; y: number; s: number; chew: number}> = ({uid, x, y, s, chew}) => {
  const j = Math.sin(chew) * 9;
  const edge = {stroke: C.ilEdge, strokeWidth: 1.8, vectorEffect: 'non-scaling-stroke' as const, strokeLinejoin: 'round' as const};
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* horns and ears behind the head */}
      <path d="M-92 -118Q-136 -176 -186 -168Q-146 -150 -118 -100Z" fill={paint(uid, 'soft-1')} {...edge} />
      <path d="M92 -118Q136 -176 186 -168Q146 -150 118 -100Z" fill={paint(uid, 'soft-1')} {...edge} />
      <ellipse cx={-178} cy={-74} rx={66} ry={27} transform="rotate(-22 -178 -74)" fill={paint(uid, 'soft-0')} {...edge} />
      <ellipse cx={-180} cy={-72} rx={42} ry={14} transform="rotate(-22 -180 -72)" fill={C.il3} />
      <ellipse cx={178} cy={-74} rx={66} ry={27} transform="rotate(22 178 -74)" fill={paint(uid, 'soft-1')} {...edge} />
      <ellipse cx={180} cy={-72} rx={42} ry={14} transform="rotate(22 180 -72)" fill={C.il4} />
      {/* the head: white in the sun, one dark patch over the left eye, a soft shade down the right */}
      <path d="M-112 -128C-156 -126 -166 -60 -154 4C-142 74 -112 124 -98 168L98 168C112 124 142 74 154 4C166 -60 156 -126 112 -128Z" fill={paint(uid, 'soft-0')} {...edge} />
      <path d="M-154 -40C-128 -112 -46 -132 -18 -96C-4 -46 -62 12 -146 34C-152 10 -156 -14 -154 -40Z" fill={C.il6} />
      <path d="M118 -126C150 -116 162 -60 154 4C144 70 116 122 102 168L60 168C96 110 126 30 118 -126Z" fill={C.il2} opacity={0.6} />
      <path d="M-30 -120C-6 -138 34 -138 52 -118C34 -104 -10 -102 -30 -120Z" fill={C.il6} opacity={0.85} />
      {/* the eyes: dark, the sky in them */}
      <ellipse cx={-76} cy={-12} rx={20} ry={25} fill={C.il7} />
      <ellipse cx={76} cy={-12} rx={20} ry={25} fill={C.il7} />
      <circle cx={-70} cy={-20} r={6} fill={C.il0} />
      <circle cx={82} cy={-20} r={6} fill={C.il0} />
      {/* the muzzle chews */}
      <g transform={`translate(${j.toFixed(1)} 0)`}>
        <ellipse cx={0} cy={174} rx={118} ry={72} fill={paint(uid, 'soft-2')} {...edge} />
        <ellipse cx={-42} cy={176} rx={14} ry={21} fill={C.il5} />
        <ellipse cx={42} cy={176} rx={14} ry={21} fill={C.il5} />
        <path d="M-46 224Q0 238 46 224" stroke={C.il5} strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};

/** a window: a white frame, dark glass, one reflection, the mullion */
const Win: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => (
  <g>
    <path d={rr(x - 5, y - 5, w + 10, h + 10, 4)} fill={C.il0} stroke={C.ilEdge} strokeWidth={1.2} />
    <path d={rr(x, y, w, h, 2)} fill={C.il5} />
    <path d={`M${x} ${y + h * 0.62}L${x + w * 0.62} ${y}H${x + w * 0.86}L${x} ${y + h * 0.92}Z`} fill={C.il0} opacity={0.2} />
    <path d={rr(x + w / 2 - 1.5, y, 3, h, 0)} fill={C.il0} opacity={0.9} />
  </g>
);

/** the village house: two floors, a hipped tin roof and its chimney, a wooden balcony across the upper floor */
const House: React.FC<{uid: string}> = ({uid}) => {
  const x0 = HX0;
  const x1 = HX1;
  const top = 846;
  const mid = 1004;
  const cx = (x0 + x1) / 2;
  let rail = '';
  for (let x = x0 + 16; x < x1 - 12; x += 17) rail += rr(x, mid - 54, 5, 44, 1.5);
  return (
    <g>
      <Solid uid={uid} d={rr(x1 - 150, top - 160, 32, 92, 3)} tone={3} outline />
      <Solid uid={uid} d={rr(x0 + 12, top, x1 - x0 - 24, WALL_B - top)} tone={1} outline />
      <path d={rr(x0 + 13, top + 12, x1 - x0 - 26, 18, 0)} fill={C.il2} opacity={0.85} />
      <Solid uid={uid} d={`M${x0 - 30} ${top + 12}L${x1 + 30} ${top + 12}L${x1 - 74} ${top - 118}L${x0 + 74} ${top - 118}Z`} tone={4} outline />
      <path d={`M${x0 - 30} ${top + 12}L${x1 + 30} ${top + 12}L${x1 + 22} ${top + 2}L${x0 - 22} ${top + 2}Z`} fill={C.il5} />
      {/* the upper floor: two windows and the balcony door */}
      <Win x={x0 + 52} y={top + 46} w={64} h={82} />
      <Win x={x1 - 116} y={top + 46} w={64} h={82} />
      <path d={rr(cx - 32, top + 38, 64, mid - top - 48, 3)} fill={C.il5} stroke={C.ilEdge} strokeWidth={1.2} />
      <path d={`M${cx - 32} ${top + 90}L${cx + 4} ${top + 38}H${cx + 22}L${cx - 32} ${top + 118}Z`} fill={C.il0} opacity={0.18} />
      {/* the wooden balcony: a railing of slim balusters, its rail and floor, a post at each corner up to the eaves */}
      <path d={rail} fill={C.il3} />
      <Solid uid={uid} d={rr(x0 + 6, mid - 62, x1 - x0 - 12, 9, 2)} tone={3} outline />
      <Solid uid={uid} d={rr(x0 + 2, mid - 12, x1 - x0 - 4, 14, 2)} tone={3} outline />
      {[x0 + 16, x1 - 16].map((x) => (
        <Solid key={x} uid={uid} d={rr(x - 6, top + 12, 12, WALL_B - top - 12, 2)} tone={2} outline />
      ))}
      {/* the ground floor: the door and two windows (the wall hides their feet) */}
      <path d={rr(cx - 34, mid + 30, 68, WALL_B - mid - 30, 3)} fill={C.il4} stroke={C.ilEdge} strokeWidth={1.2} />
      <Win x={x0 + 52} y={mid + 44} w={64} h={60} />
      <Win x={x1 - 116} y={mid + 44} w={64} h={60} />
    </g>
  );
};

/** a walnut tree: a soft round crown of several masses (one outline round the whole), a forked trunk */
const Walnut: React.FC<{uid: string; x: number; y: number}> = ({uid, x, y}) => {
  const crown = circ(x - 70, y - 214, 86) + circ(x + 40, y - 250, 98) + circ(x - 12, y - 318, 90) + circ(x + 92, y - 180, 66) + circ(x - 116, y - 156, 56);
  return (
    <g>
      <Solid uid={uid} d={`M${x - 12} ${y}L${x - 9} ${y - 170}L${x - 40} ${y - 230}L${x - 30} ${y - 236}L${x} ${y - 196}L${x + 26} ${y - 246}L${x + 36} ${y - 240}L${x + 10} ${y - 170}L${x + 13} ${y}Z`} tone={5} />
      <path d={crown} fill={paint(uid, 'soft-2')} stroke={C.ilEdge} strokeWidth={3.6} strokeLinejoin="round" paintOrder="stroke" />
      <path d={circ(x + 52, y - 222, 44) + circ(x + 98, y - 164, 32) + circ(x + 12, y - 292, 38)} fill={C.il3} opacity={0.4} />
    </g>
  );
};

/** a cypress: a slim flame, its foot at (x, b) */
const cypress = (x: number, b: number, h: number) =>
  smooth(
    [
      [x, b - h],
      [x + h * 0.1, b - h * 0.72],
      [x + h * 0.118, b - h * 0.32],
      [x + h * 0.07, b],
      [x - h * 0.07, b],
      [x - h * 0.118, b - h * 0.32],
      [x - h * 0.1, b - h * 0.72],
    ],
    true,
  );

/** the plastered garden wall from x0 to x1, its cap */
const Wall: React.FC<{uid: string; x0: number; x1: number}> = ({uid, x0, x1}) => (
  <g>
    <Solid uid={uid} d={rr(x0, WALL, x1 - x0, WALL_B - WALL, 0)} tone={1} outline />
    <Solid uid={uid} d={rr(x0 - 6, WALL - 12, x1 - x0 + 12, 16, 4)} tone={2} outline />
  </g>
);

/** the wrought gate between its two posts */
const Gate: React.FC<{uid: string}> = ({uid}) => {
  const g0 = GATE0;
  const g1 = GATE1;
  const y0 = 1052;
  const y1 = 1180;
  let bars = '';
  for (let x = g0 + 11; x < g1 - 6; x += 10.5) bars += rr(x, y0 + 4, 3, y1 - y0 - 8, 1);
  return (
    <g>
      <path d={bars} fill={C.il5} />
      <path d={rr(g0 + 3, y0, g1 - g0 - 6, y1 - y0, 2)} fill="none" stroke={C.il5} strokeWidth={5} />
      <path d={`M${g0 + 3} ${y0}Q${(g0 + g1) / 2} ${y0 - 30} ${g1 - 3} ${y0}`} fill="none" stroke={C.il5} strokeWidth={5} />
      <path d={rr((g0 + g1) / 2 - 2, y0 - 14, 4, y1 - y0 + 14, 1)} fill={C.il5} />
      <path d={rr(g0 + 3, y0 + 40, g1 - g0 - 6, 4, 1)} fill={C.il5} />
      {[g0 - 26, g1].map((x) => (
        <g key={x}>
          <Solid uid={uid} d={rr(x, 1032, 26, WALL_B - 1032, 0)} tone={2} outline />
          <Solid uid={uid} d={rr(x - 6, 1020, 38, 14, 3)} tone={3} outline />
        </g>
      ))}
    </g>
  );
};

/** a grass clump on the near verge */
const tuft = (x: number, y: number, s: number) =>
  `M${x - 30 * s} ${y}C${x - 26 * s} ${y - 30 * s} ${x - 14 * s} ${y - 44 * s} ${x - 10 * s} ${y - 52 * s}C${x - 6 * s} ${y - 30 * s} ${x - 2 * s} ${y - 20 * s} ${x} ${y - 14 * s}C${x + 4 * s} ${y - 38 * s} ${x + 12 * s} ${y - 58 * s} ${x + 18 * s} ${y - 66 * s}C${x + 20 * s} ${y - 40 * s} ${x + 22 * s} ${y - 20 * s} ${x + 30 * s} ${y}Z`;

export const Arrival: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const base = fr(shot('arrival').from);
  const end = fr(shot('arrival').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const strike = L('strike');
  const pin = L('pin');
  const dance = L('dance');
  // the glide: the camera tracks the car in from the right and settles; the world slides by (by plane), the car eases only
  // a little across the frame, so it is whole from its first frame
  const g = E.out(prog(t, 0, 26));
  const pan = -PAN0 * (1 - g);
  const carX = lerp(CAR_X0, CAR_X, g) - pan; // in the street's coordinates
  const travel = CAR_X0 - CAR_X + PAN0;
  const brake = clamp((t - 5) / 3) * (1 - clamp((t - 34) / 8));
  const pitch = t < 22 ? 1.6 * E.out(clamp((t - 6) / 10)) : 1.6 * Math.exp(-(t - 22) / 6) * Math.cos((t - 22) / 2.6);
  const box = carBox('side', 'coupe', CAR_LEN);
  // the camera: a punch on the cut, a slow push, a punch toward the man on the music's lift
  const cut = 0.04 * (1 - E.out(clamp(t / 8)));
  const punch = 0.085 * sp(t, dance, 200, 15);
  const S = (1 + 0.035 * E.sine(clamp(t / end))) * (1 + cut) + punch;
  // the bubble, struck out
  const bk = sp(t, 0, 260, 15);
  const sk = E.out(clamp((t - strike - 3) / 6));
  const after = t - strike - 9;
  const wob = after > 0 ? 3 * Math.exp(-after / 5) * Math.sin(after * 1.4) : 0;
  // the pin drops and lands
  const drop = clamp((t - pin) / 6);
  const land = t - pin - 6;
  const pinY = lerp(WALL_B + 14 - 460, WALL_B + 14, E.in2(drop));
  const squash = land >= 0 ? 1 - 0.2 * Math.exp(-land / 3.5) * Math.cos(land / 1.5) : 1;
  // the man through the sunroof, the cow over the wall
  const dancing = t >= dance;
  const sway = dancing ? 4 * Math.sin(((t - dance) / 5) * Math.PI) : 0;
  const hop = dancing ? Math.abs(Math.sin(((t - dance) / 5) * Math.PI)) : 0;
  const pop = sp(t, dance - 8, 220, 14);
  // the sunroof: over the roof's crest (the coupe's roof peaks about 7 % of its length behind its centre; it faces left)
  const roofX = carX + CAR_LEN * 0.07;
  const roofY = ROAD - box.h;
  const slotY = roofY + 3;
  // he stands up through it: his waist at the opening (feet 53 % of his height under it), rising out of it on the pop
  const feetY = slotY + MAN_SIZE * 0.53 + (1 - pop) * MAN_SIZE * 0.6 - 10 * hop;
  const cowK = sp(t, dance - 6, 190, 12);
  const cowY = 1046 + (1 - cowK) * 130;
  const nod = dancing ? 7 * Math.sin(((t - dance) / 5) * Math.PI) : 0;
  // his dance: arms up and a wave in turn on the beat, each pose blended in (the kit's acting springs)
  const moves: Act[] = Array.from({length: 8}, (_, i) => ({at: dance + i * 5, pose: i % 2 ? 'wave' : 'armsUp', face: 'laugh'}));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, background: C.bg}}>
      <DefsSvg uid={uid} />
      <defs>
        <linearGradient id={`${uid}verge`} gradientUnits="userSpaceOnUse" x1={0} y1={1402} x2={0} y2={2000}>
          <stop offset="0" stopColor={C.il1} />
          <stop offset="1" stopColor={C.il2} stopOpacity={0.9} />
        </linearGradient>
        <clipPath id={`${uid}roof`}>
          <rect x={-1500} y={-1500} width={4000} height={slotY + 1500} />
        </clipPath>
        {/* the suit's lit side: the left of him (the light comes from the top left), softly */}
        <linearGradient id={`${uid}litg`} gradientUnits="userSpaceOnUse" x1={roofX - MAN_SIZE * 0.16} y1={0} x2={roofX + MAN_SIZE * 0.06} y2={0}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id={`${uid}litm`} maskUnits="userSpaceOnUse" x={-1500} y={-1500} width={4000} height={4000}>
          <rect x={-1500} y={-1500} width={4000} height={4000} fill={`url(#${uid}litg)`} />
        </mask>
      </defs>
      <rect width={W} height={H} fill={C.bg} />
      <g transform={`translate(${OX} ${OY}) scale(${S.toFixed(4)}) translate(${-OX} ${-OY})`}>
        {/* far: the clouds, the mountains */}
        <g transform={`translate(${(pan * 0.3).toFixed(1)} 0)`}>
          <Cloud x={250 - t * 0.5} y={300} s={0.9} />
          <Cloud x={840 - t * 0.35} y={420} s={0.65} />
          <Backdrop kind="mountains" uid={uid} frame={t} time="day" base={1068} drift={0.15} />
        </g>
        {/* the street */}
        <g transform={`translate(${pan.toFixed(1)} 0)`}>
          <rect x={-800} y={1050} width={2700} height={150} fill={C.il1} />
          {/* the trees the camera passes on its way in, then the walnut and two cypresses right of the house */}
          <Solid uid={uid} d={cypress(1560, WALL + 6, 330)} tone={4} outline />
          <g transform={`translate(1330 ${WALL + 6}) scale(-0.84 0.84) translate(-1330 ${-(WALL + 6)})`}>
            <Walnut uid={uid} x={1330} y={WALL + 6} />
          </g>
          <Solid uid={uid} d={cypress(1010, WALL + 6, 360)} tone={4} outline />
          <Solid uid={uid} d={cypress(1088, WALL + 6, 280)} tone={4} outline />
          <Walnut uid={uid} x={820} y={WALL + 6} />
          <House uid={uid} />
          {t >= dance - 6 ? (
            <g transform={`rotate(${nod.toFixed(2)} ${COW_X} ${cowY + 60})`}>
              <DayCow uid={uid} x={COW_X} y={cowY} s={COW_S} chew={t * 0.7} />
            </g>
          ) : null}
          <Wall uid={uid} x0={-800} x1={GATE0 - 24} />
          <Wall uid={uid} x0={GATE1 + 24} x1={1900} />
          <Gate uid={uid} />
          {/* the pavement, its kerb, the road */}
          <rect x={-800} y={WALL_B - 2} width={2700} height={30} fill={C.il0} />
          <rect x={-800} y={WALL_B - 2} width={2700} height={1.8} fill={C.ilEdge} opacity={0.5} />
          <rect x={-800} y={1212} width={2700} height={12} fill={C.il3} />
          <rect x={-800} y={1224} width={2700} height={170} fill={C.il3} />
          <rect x={-800} y={1262} width={2700} height={14} fill={C.il2} opacity={0.35} />
          <rect x={-800} y={1338} width={2700} height={14} fill={C.il2} opacity={0.35} />
          {/* the pin in front of the gate */}
          {t >= pin ? (
            <g>
              <ellipse cx={PIN_X} cy={WALL_B + 14} rx={34 * (0.4 + 0.6 * drop)} ry={8 * (0.4 + 0.6 * drop)} fill={C.il4} opacity={0.4 * drop} />
              {land >= 0 && land < 16 ? (
                <ellipse cx={PIN_X} cy={WALL_B + 14} rx={30 + land * 7} ry={(30 + land * 7) * 0.24} fill="none" stroke={C.accA} strokeWidth={3.5 * (1 - land / 16)} opacity={0.8 * (1 - land / 16)} />
              ) : null}
              <Pin x={PIN_X} y={pinY} s={1.3} sx={2 - squash} sy={squash} />
            </g>
          ) : null}
          <Car uid={uid} x={carX} y={ROAD} len={CAR_LEN} view="side" body="coupe" paint="a" dir={-1} frame={t} roll={travel * g} speed={0.5 * (1 - g)} pitch={pitch} lights={{tail: 0.4, brake}} />
          {/* the open sunroof, and the man standing up through it (clipped at the opening, so his waist comes out of it) */}
          {t >= dance - 8 ? (
            <g>
              <ellipse cx={roofX} cy={slotY} rx={62} ry={9} fill={C.il7} />
              <path d={`M${(roofX - 60).toFixed(1)} ${slotY + 2}Q${roofX.toFixed(1)} ${slotY + 12} ${(roofX + 60).toFixed(1)} ${slotY + 2}`} fill="none" stroke={C.il0} strokeWidth={2} opacity={0.55} />
              <g clipPath={`url(#${uid}roof)`}>
                <g transform={`rotate(${sway.toFixed(2)} ${roofX.toFixed(1)} ${slotY})`}>
                  <SilPalCtx.Provider value={PAL}>
                    <Figure uid={uid} cast={MAN} frame={t} x={roofX} y={feetY} size={MAN_SIZE} pose="wave" face="smile" turn={-0.3} time="day" acts={moves} />
                  </SilPalCtx.Provider>
                  <g mask={`url(#${uid}litm)`}>
                    <SilPalCtx.Provider value={PAL_LIT}>
                      <Figure uid={uid} cast={MAN} frame={t} x={roofX} y={feetY} size={MAN_SIZE} pose="wave" face="smile" turn={-0.3} time="day" acts={moves} />
                    </SilPalCtx.Provider>
                  </g>
                </g>
              </g>
            </g>
          ) : null}
          {/* the forest's bubble, struck out */}
          <g transform={`translate(${(BUBBLE_X + lerp(CAR_X0, CAR_X, g) - CAR_X - pan).toFixed(1)} ${(BUBBLE_Y + 26 * (1 - bk)).toFixed(1)}) scale(${(0.5 + 0.5 * bk).toFixed(3)}) rotate(${(-wob + 4 * (1 - bk)).toFixed(2)})`} opacity={clamp(bk * 2)}>
            <path d={BUBBLE} transform="translate(8 12)" fill={C.il2} opacity={0.55} />
            <path d={BUBBLE} fill={C.il0} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
            <text x={0} y={16} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={44} letterSpacing={0.5} fill={C.ink}>
              YOU HAVE ARRIVED.
            </text>
            {sk > 0 ? <path d={`M-236 2L${(-236 + 472 * sk).toFixed(1)} ${(2 - 10 * sk).toFixed(1)}`} stroke={C.downLine} strokeWidth={10} strokeLinecap="round" /> : null}
          </g>
          {/* a little confetti from the sunroof on the lift: greys and ink, a few in the film's colour */}
          {dancing
            ? Array.from({length: 28}, (_, i) => {
                const tt = t - dance;
                const a = ((-90 + hash(i, 1) * 70) * Math.PI) / 180;
                const v = 14 + 8 * (hash(i, 2) + 1);
                const q = (1 - 0.9 ** tt) / 0.1;
                const x = roofX + Math.cos(a) * v * q + 10 * Math.sin(tt / 6 + i);
                const y = slotY - 120 + Math.sin(a) * v * q + 2.6 * Math.max(0, tt - 6);
                const col = i % 9 === 4 ? C.accA : [C.il4, C.il5, C.ink, C.il3][i % 4];
                const flip = Math.abs(Math.cos(tt * 0.3 + i)) * 0.9 + 0.1;
                return <rect key={i} x={-7} y={-4} width={14} height={8} rx={2} fill={col} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(i * 47 + tt * 9).toFixed(1)}) scale(${flip.toFixed(2)} 1)`} />;
              })
            : null}
        </g>
        {/* near: the verge, a few grass clumps (faster: parallax) */}
        <g transform={`translate(${(pan * 1.4).toFixed(1)} 0)`}>
          <rect x={-800} y={1392} width={2700} height={10} fill={C.il4} />
          <rect x={-800} y={1402} width={2700} height={900} fill={`url(#${uid}verge)`} />
          <path d={tuft(110, 1770, 1.3) + tuft(160, 1780, 0.9) + tuft(500, 1820, 1) + tuft(880, 1760, 1.2) + tuft(930, 1772, 0.8) + tuft(1320, 1790, 1.1) + tuft(1370, 1800, 0.8) + tuft(1760, 1770, 1.2) + tuft(2150, 1810, 1)} fill={C.il2} />
        </g>
      </g>
    </svg>
  );
};
