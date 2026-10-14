// THE ROUNDABOUT and THE LANES, seen from above in the film's white day world (the owner, 2026-10-12: the line-art roads
// were "terrible"; rebuilt as refined illustrations from roadsKit.tsx and the studio's Car).
//   round  a real compact roundabout: two lanes round a planted island, kerbed corners, splitter islands, zebras, give-way
//          teeth, houses with walls and gardens between the arms. Alice counts the exits: a white pin rises on each, the
//          second fills with the film's cobalt. The cobalt hero coupe (the film's one hero car, the forest's and the
//          mountain's) comes in from the south on the navigator's route line, signals right and leaves by the second exit
//          north, while the lost man's grey sedan (never a twin of the hero) keeps lapping the inner lane, hazards blinking:
//          the gag. The sedan is phased against the hero (it stays more than 320 px from him all shot).
//   lane   an avenue to a fork, its right lane's arrows bending right: on „მარჯვენა ზოლი" the route line draws on, the hero
//          signals and glides into the right lane; the slip road opens ahead as the camera pulls back.
// In both a drone camera follows the hero: a push, a slow turn, the punch on the cut. Everything the voice points at stays
// whole and above the subtitle line (y 1440); every car on screen is whole (parked ones that would cross the frame's edge
// at any moment are left out, moving ones cross only the top and bottom edges, fast); the painted arrows fade out of the
// subtitle band. The subtitle's ink always reads on light ground: no crown, roof or parked car that would pass under the
// line at any moment of the shot is planted (the critic, 2026-10-12: the line sat on dark crowns and a house block), so
// the line rides on asphalt, pavement and lawns, with no band drawn. The motion lives in pure functions of the shot's
// frame (roundHero, roundCoupe, roundView, lanesView, lanesTraffic), so a check can run them.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {Car, carBox, type CarBody} from '../scenes/illo/car';
import {mix} from '../scenes/illo/palette';
import {smooth} from '../scenes/illo/solid';
import {clamp, E, ev, fr, H, lerp, polyLen, prog, shot, sp, W, type Pt} from './lib';
import {jit} from './refined';
import {atLen, Badge, distTo, Garden, Grass, headingAt, lineD, punch, restFrom, RoofTop, RouteLine, tiltPt, toScreen, topTones, TopSvg, TreeTop, useUid, type Cam, type RoofKind, type Tilt} from './roadsKit';

const D2R = Math.PI / 180;
/** the film's one hero car (forest, mountain, roads, arrival): the cobalt coupe; the lost man's lapping car is a grey sedan */
const HERO_BODY: CarBody = 'coupe';
const LOST_BODY: CarBody = 'sedan';
const n1 = (v: number) => v.toFixed(1);
const polyD = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n1(x)} ${n1(y)}`).join('') + 'Z';
const rectD = (x: number, y: number, w: number, h: number) => `M${n1(x)} ${n1(y)}H${n1(x + w)}V${n1(y + h)}H${n1(x)}Z`;

type Tree = {x: number; y: number; r: number; seed: number; tone?: number};
type Roof = {x: number; y: number; w: number; h: number; rot: number; kind: RoofKind; seed: number};
type Plot = {x: number; y: number; w: number; h: number; rot: number; seed: number; pad?: [number, number, number, number]};
type Parked = {x: number; y: number; heading: number; paint: number; body: CarBody};

/** a top-view car's screen box (its four corners and a margin for its shadow) under a world-to-screen map */
const carScreenBox = (toS: (x: number, y: number) => Pt, x: number, y: number, heading: number, len: number, body: CarBody) => {
  const b = carBox('top', body, len);
  const a = heading * D2R;
  const hw = b.w / 2 + 8;
  const hl = b.h / 2 + 8;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [u, v] of [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]] as Pt[]) {
    const q = toS(x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a));
    xs.push(q[0]);
    ys.push(q[1]);
  }
  return {x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)};
};
type SBox = ReturnType<typeof carScreenBox>;
/** on screen at all (any part inside the frame) */
const seen = (b: SBox) => b.x1 > 0 && b.x0 < W && b.y1 > 0 && b.y0 < H;
/** wholly inside the frame with a margin */
const whole = (b: SBox, m = 40) => b.x0 >= m && b.x1 <= W - m && b.y0 >= m && b.y1 <= H - m;

/** the subtitle line's letters (frame px: the line is centred on 510, 1500, at most 133..887 wide, its Mtavruli 1477..1520)
 *  with a little air round them; whatever is dark in the ground stays out of it */
const SUB_ZONE = {x0: 118, x1: 902, y0: 1436, y1: 1572};
const zoneHit = (cx: number, cy: number, r: number) => {
  const dx = Math.max(SUB_ZONE.x0 - cx, 0, cx - SUB_ZONE.x1);
  const dy = Math.max(SUB_ZONE.y0 - cy, 0, cy - SUB_ZONE.y1);
  return dx * dx + dy * dy < r * r;
};
/** does a round thing at world (x, y), world radius r, ever pass under the line in frames 0..dur of a shot */
const everUnderLine = (toSAt: (t: number) => (x: number, y: number) => Pt, dur: number, x: number, y: number, r: number) => {
  for (let t = 0; t <= dur; t++) {
    const toS = toSAt(t);
    const c = toS(x, y);
    const e = toS(x + r, y);
    if (zoneHit(c[0], c[1], Math.hypot(e[0] - c[0], e[1] - c[1]))) return true;
  }
  return false;
};
const boxUnderLine = (b: SBox) => b.x1 > SUB_ZONE.x0 && b.x0 < SUB_ZONE.x1 && b.y1 > SUB_ZONE.y0 && b.y0 < SUB_ZONE.y1;

// ---- the roundabout (world px: the ring's centre at 0, 0; y down; the arms east 0, south 90, west 180, north 270) ---------
const RI = 130; // the island's kerb (its apron inside)
const RO = 310; // the ring's outer kerb
const R_IN = 176; // the inner lane's centre: the lost man's lap
const R_OUT = 266; // the outer lane's centre: the hero's
const AW = 112; // an arm's half width
const PV = 30; // the pavement along a kerb
const XL = 62; // a lane's centre off an arm's axis
const FIL = 100; // the kerb's corner where an arm meets the ring
const SPW = 24; // the splitter island's half width at the ring
const ARMS = [0, 90, 180, 270];
const RE = Math.sqrt(RO * RO - AW * AW); // where an arm's edge meets the ring

/** a point of the arm at angle a: s along it from the centre, q across it (+ = the way out's side) */
const armPt = (a: number, s: number, q: number): Pt => {
  const c = Math.cos(a * D2R);
  const n = Math.sin(a * D2R);
  return [c * s - n * q, n * s + c * q];
};
const along = (a: number, s0: number, s1: number, q0: number, q1: number) => polyD([armPt(a, s0, q0), armPt(a, s1, q0), armPt(a, s1, q1), armPt(a, s0, q1)]);

/** the asphalt: the ring, four arms and their eight rounded kerb corners (separate paths: no winding holes) */
const ASPHALT: string[] = (() => {
  const out: string[] = [`M${-RO} 0A${RO} ${RO} 0 1 1 ${RO} 0A${RO} ${RO} 0 1 1 ${-RO} 0Z`];
  for (const a of ARMS) {
    out.push(along(a, 0, 2900, -AW, AW));
    for (const side of [-1, 1]) {
      const pm = armPt(a, RE, side * AW);
      const p1 = armPt(a, RE + FIL, side * AW);
      const th = (a + side * (Math.asin(AW / RO) / D2R + FIL / RO / D2R)) * D2R;
      const p2: Pt = [RO * Math.cos(th), RO * Math.sin(th)];
      const c1: Pt = [p1[0] + (pm[0] - p1[0]) * 0.56, p1[1] + (pm[1] - p1[1]) * 0.56];
      const c2: Pt = [p2[0] + side * Math.sin(th) * FIL * 0.56, p2[1] - side * Math.cos(th) * FIL * 0.56];
      out.push(`M${n1(pm[0])} ${n1(pm[1])}L${n1(p1[0])} ${n1(p1[1])}C${n1(c1[0])} ${n1(c1[1])} ${n1(c2[0])} ${n1(c2[1])} ${n1(p2[0])} ${n1(p2[1])}Z`);
    }
  }
  return out;
})();

/** the splitter islands: kerbed teardrops between the way in and the way out */
const SPLIT0 = RO + 18;
const SPLIT1 = RO + 236;
const splitW = (s: number) => {
  const k = (s - SPLIT0) / (SPLIT1 - SPLIT0);
  return k < 0 || k > 1 ? 0 : Math.max(4, SPW * (1 - k) ** 0.8);
};
const SPLITTERS: string[] = ARMS.map((a) => {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const s = lerp(SPLIT0, SPLIT1, i / 10);
    top.push(armPt(a, s, -splitW(s)));
    bot.push(armPt(a, s, splitW(s)));
  }
  return smooth([armPt(a, SPLIT0 - 14, 0), ...top, armPt(a, SPLIT1 + 8, 0), ...bot.reverse()], true);
});

/** the white paint: give-way teeth, zebras, the centre's dashes and the edge lines */
const ROUND_MARKS: string = (() => {
  let d = '';
  for (const a of ARMS) {
    for (const q of [-98, -76, -54]) {
      const s = Math.sqrt(RO * RO - q * q) + 8;
      d += polyD([armPt(a, s, q - 8), armPt(a, s + 22, q), armPt(a, s, q + 8)]);
    }
    for (const q of [-80, -55, -30, 30, 55, 80]) d += along(a, RO + 112, RO + 166, q - 6.5, q + 6.5);
    for (let s = RO + 270; s < 2900; s += 84) d += along(a, s, s + 42, -2.5, 2.5);
    for (const side of [-1, 1]) d += along(a, RE + FIL + 6, 2900, side * (AW - 12) - 2, side * (AW - 12) + 2);
  }
  return d;
})();

/** what stands round it: trees along the arms, houses in gardens (a hedge round each; now and then a car on its pad)
 *  between them */
export const AROUND = (() => {
  const trees: Tree[] = [];
  const roofs: Roof[] = [];
  const plots: Plot[] = [];
  const parked: Parked[] = [];
  for (const a of ARMS) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        const seed = a * 11 + i * 3 + (side > 0 ? 1 : 0);
        const s = RO + 250 + i * 170 + (jit(seed, 1) - 0.5) * 50;
        const r = 40 + 16 * jit(seed, 2);
        const [x, y] = armPt(a, s, side * (AW + PV + 52 + 10 * jit(seed, 3)));
        trees.push({x, y, r, seed});
      }
    }
  }
  const cells = [450, 750, 1050, 1350, 1650, 1950, 2250];
  const BODIES: CarBody[] = ['sedan', 'hatch', 'suv', 'ev'];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (let i = 0; i < cells.length; i++) {
        for (let j = 0; j < cells.length; j++) {
          const seed = (sx > 0 ? 1 : 2) * 1000 + (sy > 0 ? 1 : 2) * 100 + i * 10 + j;
          const cx = sx * cells[i] + (jit(seed, 1) - 0.5) * 40;
          const cy = sy * cells[j] + (jit(seed, 2) - 0.5) * 40;
          if (Math.hypot(cx, cy) < RO + 300) continue;
          const r = jit(seed, 3);
          if (r < 0.66) {
            const kind: RoofKind = r < 0.3 ? 'gable' : r < 0.5 ? 'hip' : 'flat';
            const big = kind === 'flat' ? 1.2 : 1;
            const turn = jit(seed, 7) > 0.6;
            const w0 = (120 + 60 * jit(seed, 4)) * big;
            const h0 = (95 + 45 * jit(seed, 5)) * big;
            const [w, h] = turn ? [h0, w0] : [w0, h0];
            const rot = (jit(seed, 6) - 0.5) * 10;
            const gside = jit(seed, 8) > 0.5 ? 1 : -1;
            const plot: Plot = {x: cx + gside * 18, y: cy - 6, w: Math.min(270, w + 150), h: Math.min(260, h + 120), rot, seed};
            if (jit(seed, 11) > 0.45) {
              const px = -gside * (plot.w / 2 - 34) - gside * 18;
              plot.pad = [px + gside * 18, 10, 62, 156];
              parked.push({x: cx + px, y: cy + 4, heading: jit(seed, 13) > 0.5 ? 0 : 180, paint: 1 + Math.floor(jit(seed, 14) * 4), body: BODIES[Math.floor(jit(seed, 15) * 4)]});
            }
            plots.push(plot);
            roofs.push({x: cx, y: cy, w, h, rot, kind, seed});
            trees.push({x: cx + gside * (w / 2 + 52), y: cy + (jit(seed, 9) - 0.5) * 70, r: 30 + 12 * jit(seed, 10), seed: seed + 5});
          } else {
            for (let k = 0; k < 3; k++) trees.push({x: cx + (jit(seed, 20 + k) - 0.5) * 150, y: cy + (jit(seed, 30 + k) - 0.5) * 150, r: 34 + 20 * jit(seed, 40 + k), seed: seed * 3 + k, tone: k === 1 ? 3 : 4});
          }
        }
      }
    }
  }
  return {trees, roofs, plots, parked};
})();
const ISLAND: Tree[] = [
  {x: -26, y: -30, r: 50, seed: 501},
  {x: 40, y: 22, r: 42, seed: 502, tone: 3},
  {x: -16, y: 50, r: 32, seed: 503, tone: 3},
];

/** the hero's way: up the south arm's way in, a smooth right into the outer lane, round it, a smooth right out by the north
 *  arm (the second exit); straights, cubic turns and the ring's arc, sampled densely (no spline kinks at the joins) */
const HERO: Pt[] = (() => {
  const pts: Pt[] = [];
  const cubic = (p0: Pt, c1: Pt, c2: Pt, p3: Pt) => {
    for (let i = 1; i <= 24; i++) {
      const k = i / 24;
      const m = 1 - k;
      pts.push([m * m * m * p0[0] + 3 * m * m * k * c1[0] + 3 * m * k * k * c2[0] + k * k * k * p3[0], m * m * m * p0[1] + 3 * m * m * k * c1[1] + 3 * m * k * k * c2[1] + k * k * k * p3[1]]);
    }
  };
  for (let y = 1400; y >= 420; y -= 20) pts.push([XL, y]);
  const A = 50 * D2R;
  const inP: Pt = [R_OUT * Math.cos(A), R_OUT * Math.sin(A)];
  cubic([XL, 420], [XL, 340], [inP[0] - Math.sin(A) * 80, inP[1] + Math.cos(A) * 80], inP);
  for (let a = 48; a >= -48; a -= 2) pts.push([R_OUT * Math.cos(a * D2R), R_OUT * Math.sin(a * D2R)]);
  const outP: Pt = [R_OUT * Math.cos(-A), R_OUT * Math.sin(-A)];
  pts.push(outP);
  cubic(outP, [outP[0] - Math.sin(A) * 80, outP[1] - Math.cos(A) * 80], [XL, -340], [XL, -420]);
  for (let y = -440; y >= -2000; y -= 20) pts.push([XL, y]);
  return pts;
})();
const HERO_LEN = polyLen(HERO);
const H_S0 = 1400 - 480; // on the first frame he is at y 480 (whole, above the subtitle line)
const H_S1 = HERO_LEN - (2000 - 600); // on the last at y -600

const RB = fr(shot('round').from);
export const ROUND_DUR = fr(shot('round').to) - RB;
const RE1 = fr(ev('exit1')) - RB;
const RE2 = fr(ev('exit2')) - RB;
/** the hero at frame t of the shot: in from the south, round the outer lane (a little slower in the ring), out by exit 2 */
export const roundHero = (t: number) => {
  const u = clamp(t / ROUND_DUR);
  const hs = H_S0 + (H_S1 - H_S0) * (u + 0.06 * Math.sin(2 * Math.PI * u));
  return {hs, p: atLen(HERO, hs), h: headingAt(HERO, hs)};
};
/** the lost man laps the inner lane, wavering a little, hazards on; phased against the hero so he stays across the ring
 *  from him (the critic, 2026-10-12: the old lap caught the hero at exit 2): never nearer than 320 px */
export const COUPE_TH0 = 0.18;
export const COUPE_W = 0.13;
export const roundCoupe = (t: number) => {
  const th = COUPE_TH0 - COUPE_W * t - 0.05 * Math.sin(t * 0.21);
  const lr = R_IN + 5 * Math.sin(t * 0.45);
  const dth = COUPE_W + 0.0105 * Math.cos(t * 0.21);
  // the heading along the lap (counter-clockwise on screen), plus the little weave of the radius
  const dr = 2.25 * Math.cos(t * 0.45);
  const vx = lr * Math.sin(th) * dth - dr * Math.cos(th);
  const vy = -lr * Math.cos(th) * dth - dr * Math.sin(th);
  return {x: lr * Math.cos(th), y: lr * Math.sin(th), h: (Math.atan2(vy, vx) * 180) / Math.PI + 90};
};
/** the drone: it leans toward the hero, eases back to show the whole ring while Alice counts, then follows him out */
export const roundView = (t: number) => {
  const u = clamp(t / ROUND_DUR);
  const hp = roundHero(t).p;
  const zoom = lerp(1.24, 1.08, E.inOut(clamp(t / 22))) + 0.1 * E.inOut(clamp((t - 26) / 30));
  const cam: Cam = {x: hp[0] * 0.42, y: hp[1] * 0.42, s: zoom * punch(t), r: lerp(-4, 4, E.inOut(u)), ax: 540, ay: 840};
  const tilt: Tilt = {deg: lerp(22, 14, E.inOut(u)), p: 1800, ox: 540, oy: 1000};
  return {cam, tilt, zoom};
};
const roundToS = (t: number) => {
  const v = roundView(t);
  return (x: number, y: number) => tiltPt(v.tilt, toScreen(v.cam, x, y));
};
/** the parked cars kept: whole on screen for the whole shot, or never on screen (a car never sits cut by the frame), and
 *  never under the subtitle line */
export const ROUND_PARKED: Parked[] = AROUND.parked.filter((c) => {
  for (let t = 0; t < ROUND_DUR; t++) {
    const b = carScreenBox(roundToS(t), c.x, c.y, c.heading, 128, c.body);
    if (seen(b) && !whole(b)) return false;
    if (boxUnderLine(b)) return false;
  }
  return true;
});
/** the crowns and the houses kept: none ever passes under the subtitle line (a crown with its shadow to the lower right; a
 *  house with its lifted roof, its wall and its shadow); the gardens stay, light lawns the line reads on */
export const ROUND_TREES: Tree[] = AROUND.trees.filter((tr) => !everUnderLine(roundToS, ROUND_DUR, tr.x + tr.r * 0.15, tr.y + tr.r * 0.1, tr.r * 1.3));
export const ROUND_ROOFS: Roof[] = AROUND.roofs.filter((r) => !everUnderLine(roundToS, ROUND_DUR, r.x + 6, r.y - 4, Math.hypot(r.w, r.h) / 2 + 34));

const RoundGround: React.FC<{uid: string}> = ({uid}) => {
  const T = topTones();
  const dash = (2 * Math.PI * ((RI + RO) / 2)) / 24;
  return (
    <g>
      <Grass uid={uid} x={-3400} y={-3400} w={6800} h={6800} />
      {AROUND.plots.map((p, i) => (
        <Garden key={`g${i}`} x={p.x} y={p.y} w={p.w} h={p.h} rot={p.rot} seed={p.seed} pad={p.pad} />
      ))}
      {ASPHALT.map((d, i) => (
        <path key={`p${i}`} d={d} fill={T.pave} stroke={T.pave} strokeWidth={PV * 2} strokeLinejoin="round" />
      ))}
      {ASPHALT.map((d, i) => (
        <path key={`k${i}`} d={d} fill="none" stroke={T.kerb} strokeWidth={6} strokeLinejoin="round" />
      ))}
      {ASPHALT.map((d, i) => (
        <path key={`a${i}`} d={d} fill={T.asphalt} />
      ))}
      {/* the island: an apron of setts round a lawn */}
      <circle r={RI} fill={T.pave} stroke={T.kerb} strokeWidth={5} />
      <circle r={RI - 13} fill="none" stroke={mix(C.il1, C.il2, 0.7)} strokeWidth={2.5} strokeDasharray="6 7" />
      <circle r={RI - 26} fill={T.lawn} stroke={T.kerb} strokeWidth={4} />
      {SPLITTERS.map((d, i) => (
        <path key={`s${i}`} d={d} fill={T.pave} stroke={T.kerb} strokeWidth={4} strokeLinejoin="round" />
      ))}
      <circle r={(RI + RO) / 2} fill="none" stroke={T.paint} strokeWidth={5} strokeDasharray={`30 ${(dash - 30).toFixed(2)}`} />
      <circle r={RI + 11} fill="none" stroke={T.paint} strokeWidth={4} />
      <path d={ROUND_MARKS} fill={T.paint} />
      {ROUND_PARKED.map((c, i) => (
        <Car key={`c${i}`} uid={uid} x={c.x} y={c.y} len={128} view="top" body={c.body} paint={c.paint} heading={c.heading} frame={0} />
      ))}
      {ROUND_ROOFS.map((r, i) => (
        <RoofTop key={`r${i}`} x={r.x} y={r.y} w={r.w} h={r.h} rot={r.rot} kind={r.kind} seed={r.seed} />
      ))}
      {[...ROUND_TREES, ...ISLAND].map((tr, i) => (
        <TreeTop key={`t${i}`} uid={uid} x={tr.x} y={tr.y} r={tr.r} seed={tr.seed} tone={tr.tone} />
      ))}
    </g>
  );
};

export const Roundabout: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const hero = roundHero(t);
  const g = roundCoupe(t);
  const {cam, tilt, zoom} = roundView(t);
  // the exits' pins (on the far side of each mouth, clear of his way out), upright whatever the drone's turn; the first
  // dims when the second is chosen and is gone before the drone carries it to the frame's edge
  const toS = roundToS(t);
  const pinR = 54 * zoom;
  const p1 = toS(...armPt(0, RO + 118, -XL));
  const p2 = toS(...armPt(270, RO + 118, -XL));
  const k1 = sp(t, RE1, 240, 13);
  const k2 = sp(t, RE2, 240, 13);
  const on2 = E.out(prog(t, RE2 + 3, 6));
  const dim1 = (1 - 0.5 * E.out(prog(t, RE2 + 3, 8))) * (1 - E.inOut(prog(t, RE2 + 10, 14)));
  const hud = (
    <>
      {dim1 > 0.01 ? <Badge x={Math.min(p1[0], W - pinR - 40)} y={p1[1]} n="1" R={54} k={k1 * zoom} dim={dim1} /> : null}
      <Badge x={clamp(p2[0], pinR + 40, W - pinR - 40)} y={Math.max(p2[1], 2 * pinR + 60)} n="2" R={54} k={k2 * zoom} on={on2} ring={prog(t, RE2 + 3, 16)} />
    </>
  );
  return (
    <TopSvg uid={uid} cam={cam} hud={hud} tilt={tilt}>
      <RoundGround uid={uid} />
      <RouteLine d={lineD(restFrom(HERO, hero.hs))} reveal={E.out(clamp((t + 5) / 12))} />
      <Car uid={uid} x={g.x} y={g.y} len={140} view="top" body={LOST_BODY} paint={4} heading={g.h} frame={t} speed={0.6} lights={{hazard: 1}} />
      <Car uid={uid} x={hero.p[0]} y={hero.p[1]} len={150} view="top" body={HERO_BODY} paint="a" heading={hero.h} frame={t} speed={0.5} lights={{right: t >= 21 && t < 40 ? 1 : 0}} />
    </TopSvg>
  );
};

// ---- the lanes (world px: our three lanes x -150..150 going up, a planted median, the far side's two lanes going down) -----
const LW = 100; // a lane
const YG = -1140; // the nose: above it the right lane leaves as the slip road
const Y0 = -3400;
const Y1 = 2400;
/** the slip road's centre: on up the right lane, then bending off to the right */
const SLIP: Pt[] = (() => {
  const p0: Pt = [100, YG - 40];
  const c1: Pt = [100, YG - 250];
  const c2: Pt = [170, YG - 430];
  const p3: Pt = [370, YG - 570];
  const out: Pt[] = [[100, YG + 300], p0];
  for (let i = 1; i <= 18; i++) {
    const k = i / 18;
    const m = 1 - k;
    out.push([m * m * m * p0[0] + 3 * m * m * k * c1[0] + 3 * m * k * k * c2[0] + k * k * k * p3[0], m * m * m * p0[1] + 3 * m * m * k * c1[1] + 3 * m * k * k * c2[1] + k * k * k * p3[1]]);
  }
  const dx = p3[0] - c2[0];
  const dy = p3[1] - c2[1];
  const dl = Math.hypot(dx, dy);
  out.push([p3[0] + (dx / dl) * 2200, p3[1] + (dy / dl) * 2200]);
  return out;
})();
const SLIP_D = lineD(SLIP);

/** lane arrows, pointing up (stretched along the lane, as painted): straight on, or bending right */
const ARROW_UP = 'M-7 60L-7 -16L-24 -16L0 -62L24 -16L7 -16L7 60Z';
const ARROW_RIGHT = 'M-7 64L-7 -2Q-7 -32 22 -32L26 -32L26 -54L60 -24L26 6L26 -14L22 -14Q7 -14 7 0L7 64Z';
const ARROW_SY = 1.5;

const LANE_MARKS: string = (() => {
  let d = '';
  const dashed = (x: number, from: number, to: number, w = 6) => {
    for (let y = to; y - 64 > from; y -= 130) d += rectD(x - w / 2, y - 64, w, 64);
  };
  const solid = (x: number, from: number, to: number, w = 5) => {
    d += rectD(x - w / 2, from, w, to - from);
  };
  dashed(-50, Y0, Y1);
  dashed(50, YG + 330, Y1);
  solid(50, YG - 30, YG + 330, 6);
  solid(-140, Y0, Y1);
  solid(140, YG + 20, Y1);
  solid(40, Y0, YG - 30);
  // the far side
  dashed(-340, Y0, Y1);
  solid(-430, Y0, Y1);
  solid(-250, Y0, Y1);
  // a few hatched chevrons in the nose
  for (let k = 0; k < 4; k++) {
    const y = YG - 70 - k * 46;
    d += polyD([[54, y], [62 + k * 9, y - 22], [62 + k * 9, y - 12], [54, y + 10]]);
  }
  return d;
})();
/** the painted arrow sets: one ahead of the lane change, one well behind it (none ever sits in the subtitle band for long;
 *  each arrow's opacity is masked out of it anyway) */
export const LANE_ARROW_YS = [-640, 560];
const ARROWS: {x: number; y: number; right: boolean}[] = [];
for (const y of LANE_ARROW_YS) for (const x of [-100, 0, 100]) ARROWS.push({x, y, right: x === 100});

/** what stands along it: verge trees, the median's shrubs, houses in gardens on both sides, kept clear of the slip road */
export const LANE_SIDE = (() => {
  const trees: Tree[] = [];
  const roofs: Roof[] = [];
  const plots: Plot[] = [];
  for (let i = 0; i < 36; i++) {
    const y = Y1 - 200 - i * 165 + (jit(i, 1) - 0.5) * 40;
    const xr = 238 + jit(i, 2) * 12;
    const rr = 40 + 14 * jit(i, 3);
    if (distTo(SLIP, xr, y) > LW / 2 + 34 + rr + 14) trees.push({x: xr, y, r: rr, seed: i * 5 + 1});
    trees.push({x: -528 - jit(i, 4) * 12, y: y + 60, r: 40 + 14 * jit(i, 5), seed: i * 5 + 2});
    if (i % 2 === 0) trees.push({x: -195, y: y + 30, r: 21 + 5 * jit(i, 6), seed: i * 5 + 3, tone: 3});
  }
  for (let i = 0; i < 21; i++) {
    const y = Y1 - 300 - i * 285 + (jit(i, 11) - 0.5) * 50;
    const seed = 300 + i;
    const r = jit(seed, 1);
    const kind: RoofKind = r < 0.4 ? 'gable' : r < 0.7 ? 'hip' : 'flat';
    const w = (kind === 'flat' ? 200 : 150) + 46 * jit(seed, 2);
    const h = (kind === 'flat' ? 165 : 125) + 36 * jit(seed, 3);
    const xr = 330 + w / 2 + jit(seed, 4) * 26;
    const rot = (jit(seed, 5) - 0.5) * 8;
    if (distTo(SLIP, xr, y) > LW / 2 + 34 + Math.hypot(w, h) / 2 + 20) {
      if (distTo(SLIP, xr, y) > LW / 2 + 34 + Math.hypot(w + 120, h + 110) / 2) plots.push({x: xr + 10, y: y + 4, w: w + 120, h: Math.min(250, h + 110), rot, seed});
      roofs.push({x: xr, y, w, h, rot, kind, seed});
      const tx = xr + w / 2 + 64;
      if (distTo(SLIP, tx, y + 50) > LW / 2 + 34 + 70) trees.push({x: tx, y: y + 50, r: 36 + 14 * jit(seed, 8), seed: seed + 7});
    } else if (distTo(SLIP, xr, y) > LW / 2 + 34 + 80) {
      trees.push({x: xr, y, r: 44 + 12 * jit(seed, 9), seed: seed + 9});
    }
    const kl: RoofKind = jit(seed, 12) < 0.45 ? 'hip' : jit(seed, 12) < 0.75 ? 'gable' : 'flat';
    const xl = -610 - h / 2 - jit(seed, 6) * 26;
    const rl = (jit(seed, 7) - 0.5) * 8;
    plots.push({x: xl - 8, y: y + 132, w: h + 110, h: Math.min(260, w + 100), rot: rl, seed: seed + 50});
    roofs.push({x: xl, y: y + 130, w: h, h: w, rot: rl, kind: kl, seed: seed + 50});
    trees.push({x: xl - h / 2 - 60, y: y + 190, r: 36 + 14 * jit(seed, 10), seed: seed + 11});
  }
  // the gore and the field inside the bend: a few trees
  for (const [x, y, r] of [
    [176, YG - 470, 40],
    [150, YG - 700, 46],
    [250, YG - 860, 52],
    [140, YG - 980, 38],
  ] as [number, number, number][]) {
    if (distTo(SLIP, x, y) > LW / 2 + 34 + r + 10) trees.push({x, y, r, seed: Math.round(x + y)});
  }
  return {trees, roofs, plots};
})();

const LB = fr(shot('lane').from);
export const LANE_DUR = fr(shot('lane').to) - LB;
const LANE_AT = fr(ev('lane')) - LB;
const LV = 18; // the hero's speed (px a frame)
/** the hero on up the middle lane, then a long, calm change into the right lane (a sine: no jolt at either end) */
const lhx = (f: number) => LW * E.sine(clamp((f - 4) / 34));
const lhy = (f: number) => -LV * f;
export const lanesHero = (t: number) => ({x: lhx(t), y: lhy(t), yaw: (Math.atan2(lhx(t + 0.5) - lhx(t - 0.5), LV) * 180) / Math.PI});
/** the drone follows him (the road a little right of centre, so the far side stays clear of the left edge), turning a
 *  little against his yaw, and pulls back and tilts up to open the fork */
export const lanesView = (t: number) => {
  const k = E.inOut(clamp(t / LANE_DUR));
  const cam: Cam = {x: -42 + lhx(t) * 0.45, y: lhy(t), s: lerp(1.3, 1.08, k) * punch(t), r: -0.35 * lanesHero(t).yaw, ax: 540, ay: 1100};
  const tilt: Tilt = {deg: lerp(16, 28, k), p: 1600, ox: 540, oy: 1100};
  return {cam, tilt};
};
const lanesToS = (t: number) => {
  const v = lanesView(t);
  return (x: number, y: number) => tiltPt(v.tilt, toScreen(v.cam, x, y));
};
/** the crowns and houses: no dark crown or house ever passes under the subtitle line. The verge's row keeps its rhythm:
 *  a crown that would is planted a pale tone (a lighter species, like the median's shrubs) the ink reads on */
export const LANE_TREES: Tree[] = LANE_SIDE.trees.map((tr) => (tr.tone === 3 || !everUnderLine(lanesToS, LANE_DUR, tr.x + tr.r * 0.15, tr.y + tr.r * 0.1, tr.r * 1.3) ? tr : {...tr, r: tr.r * 0.9, tone: 3}));
export const LANE_ROOFS: Roof[] = LANE_SIDE.roofs.filter((r) => !everUnderLine(lanesToS, LANE_DUR, r.x + 6, r.y - 4, Math.hypot(r.w, r.h) / 2 + 34));
/** the traffic: ahead in the left and middle lanes (slower than him), the far side's coming down its inner lane only (its
 *  outer lane runs too near the frame's left edge) */
export const LANE_FAR0 = [-1900, -2440];
export const lanesTraffic = (t: number): {x: number; y: number; h: number; body: CarBody; paint: number}[] => [
  {x: -100, y: -250 - 13.5 * t, h: 0, body: 'suv', paint: 2},
  {x: 0, y: -640 - 16 * t, h: 0, body: 'hatch', paint: 4},
  {x: -290, y: LANE_FAR0[0] + 22 * t, h: 180, body: 'sedan', paint: 3},
  {x: -290, y: LANE_FAR0[1] + 22 * t, h: 180, body: 'ev', paint: 1},
];
/** an arrow's opacity: it fades out of the subtitle band (screen y 1380..1620, a 60 px fade either side) */
const BAND0 = 1380;
const BAND1 = 1620;
const arrowAlpha = (toS: (x: number, y: number) => Pt, x: number, y: number) => {
  const a = toS(x, y - 62 * ARROW_SY)[1];
  const b = toS(x, y + 64 * ARROW_SY)[1];
  const y0 = Math.min(a, b);
  const y1 = Math.max(a, b);
  const gap = Math.max(BAND0 - y1, y0 - BAND1);
  return clamp(gap / 60);
};

const LanesGround: React.FC<{uid: string; toS: (x: number, y: number) => Pt}> = ({uid, toS}) => {
  const T = topTones();
  const H0 = Y1 - Y0;
  const asphalt = [rectD(-440, Y0, 200, H0), rectD(-150, YG, 300, Y1 - YG), rectD(-150, Y0, 200, YG - Y0 + 1)];
  const clip = `${uid}slipclip`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={-200} y={Y0} width={3000} height={YG - 30 - Y0} />
        </clipPath>
      </defs>
      <Grass uid={uid} x={-2600} y={Y0} w={5200} h={H0} />
      {LANE_SIDE.plots.map((p, i) => (
        <Garden key={`g${i}`} x={p.x} y={p.y} w={p.w} h={p.h} rot={p.rot} seed={p.seed} />
      ))}
      {/* the pavements: both outer ones, the median's kerbs, the gore, the slip road's */}
      <path d={rectD(-476, Y0, 36, H0) + rectD(-240, Y0, 90, H0) + rectD(150, YG, 36, Y1 - YG) + rectD(50, Y0, 30, YG - Y0)} fill={T.pave} />
      <path d={SLIP_D} fill="none" stroke={T.pave} strokeWidth={LW + 68} strokeLinejoin="round" />
      {/* the kerb lines, then the asphalt */}
      {asphalt.map((d, i) => (
        <path key={`k${i}`} d={d} fill="none" stroke={T.kerb} strokeWidth={6} />
      ))}
      <path d={SLIP_D} fill="none" stroke={T.kerb} strokeWidth={LW + 6} strokeLinejoin="round" />
      {asphalt.map((d, i) => (
        <path key={`a${i}`} d={d} fill={T.asphalt} />
      ))}
      <path d={SLIP_D} fill="none" stroke={T.asphalt} strokeWidth={LW} strokeLinejoin="round" />
      {/* the median's lawn */}
      <rect x={-222} y={Y0} width={54} height={H0} fill={T.lawn} stroke={T.kerb} strokeWidth={3} />
      {/* the paint: lanes, edges, the slip road's two edge lines, the arrows */}
      <path d={LANE_MARKS} fill={T.paint} />
      <g clipPath={`url(#${clip})`}>
        <path d={SLIP_D} fill="none" stroke={T.paint} strokeWidth={LW - 14} strokeLinejoin="round" />
        <path d={SLIP_D} fill="none" stroke={T.asphalt} strokeWidth={LW - 24} strokeLinejoin="round" />
      </g>
      {ARROWS.map((a, i) => {
        const al = arrowAlpha(toS, a.x, a.y);
        return al > 0.01 ? <path key={`ar${i}`} d={a.right ? ARROW_RIGHT : ARROW_UP} fill={T.paint} opacity={0.95 * al} transform={`translate(${a.x} ${a.y}) scale(1 ${ARROW_SY})`} /> : null;
      })}
      {LANE_ROOFS.map((r, i) => (
        <RoofTop key={`r${i}`} x={r.x} y={r.y} w={r.w} h={r.h} rot={r.rot} kind={r.kind} seed={r.seed} />
      ))}
      {LANE_TREES.map((tr, i) => (
        <TreeTop key={`t${i}`} uid={uid} x={tr.x} y={tr.y} r={tr.r} seed={tr.seed} tone={tr.tone} />
      ))}
    </g>
  );
};

export const Lanes: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const hero = lanesHero(t);
  const {cam, tilt} = lanesView(t);
  const toS = lanesToS(t);
  // the route: from him into the right lane and off with the slip road, drawn on as Alice says it
  const route: Pt[] = [];
  for (let f = t; f <= LANE_DUR; f++) route.push([lhx(f), lhy(f)]);
  for (const p of SLIP) if (p[1] < lhy(LANE_DUR) - 40) route.push(p);
  return (
    <TopSvg uid={uid} cam={cam} tilt={tilt}>
      <LanesGround uid={uid} toS={toS} />
      <RouteLine d={lineD(route)} reveal={E.out(prog(t, LANE_AT, 12))} />
      {lanesTraffic(t).map((c, i) => (
        <Car key={i} uid={uid} x={c.x} y={c.y} len={150} view="top" body={c.body} paint={c.paint} heading={c.h} frame={t} speed={0.6} />
      ))}
      <Car uid={uid} x={hero.x} y={hero.y} len={150} view="top" body={HERO_BODY} paint="a" heading={hero.yaw} frame={t} speed={0.6} lights={{right: t < 40 ? 1 : 0}} />
    </TopSvg>
  );
};

/** the checks a build can run (scratch tooling): screen boxes of every car, the lost sedan's distance to the hero */
export const roadsChecks = () => {
  const out: string[] = [];
  let minD = Infinity;
  let minAt = -1;
  for (let t = 0; t < ROUND_DUR; t++) {
    const h = roundHero(t).p;
    const g = roundCoupe(t);
    const d = Math.hypot(h[0] - g.x, h[1] - g.y);
    if (d < minD) {
      minD = d;
      minAt = t;
    }
    const toS = roundToS(t);
    for (const [name, b] of [
      ['hero', carScreenBox(toS, h[0], h[1], roundHero(t).h, 150, HERO_BODY)],
      ['lost', carScreenBox(toS, g.x, g.y, g.h, 140, LOST_BODY)],
    ] as [string, SBox][])
      if (seen(b) && !whole(b, 0)) out.push(`round t${t} ${name} cut ${JSON.stringify(b)}`);
  }
  out.push(`round lost-sedan min distance ${minD.toFixed(0)} at t${minAt}; parked kept ${ROUND_PARKED.length}/${AROUND.parked.length}`);
  for (let t = 0; t < LANE_DUR; t++) {
    const toS = lanesToS(t);
    lanesTraffic(t).forEach((c, i) => {
      const b = carScreenBox(toS, c.x, c.y, c.h, 150, c.body);
      if (seen(b) && !whole(b, 0)) out.push(`lane t${t} car${i} crossing ${b.x0.toFixed(0)}..${b.x1.toFixed(0)} x ${b.y0.toFixed(0)}..${b.y1.toFixed(0)}`);
      else if (seen(b) && b.x0 < 80) out.push(`lane t${t} car${i} near left edge ${b.x0.toFixed(0)}`);
    });
    const h = lanesHero(t);
    const hb = carScreenBox(toS, h.x, h.y, h.yaw, 150, HERO_BODY);
    if (!whole(hb)) out.push(`lane t${t} hero not whole`);
    ARROWS.forEach((a, i) => {
      const al = arrowAlpha(toS, a.x, a.y);
      const y = toS(a.x, a.y)[1];
      if (al < 0.99 && al > 0.01) out.push(`lane t${t} arrow${i} fading ${al.toFixed(2)} y${y.toFixed(0)}`);
    });
  }
  return out;
};
