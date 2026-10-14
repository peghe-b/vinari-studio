// REDEMPTION AND THE ROAD AHEAD (the owner, 2026-10-12: "these graphics are terrible", "refine it like the forest"): the
// white world's calm day. The camera flies a little behind and to the right of the cobalt coupe (the forest's car) on a
// country road: dark asphalt with two tyre-worn bands, white edge lines and centre dashes, grassy verges with clumps and
// white roadside posts, a poplar row on the left whose shadows fall across the road, a sparser row out on the right, a
// guard rail on the outside of each bend, far snowy mountains and clouds. The road runs straight past the car, then winds
// in S-bends toward the horizon. The route glows ahead of the car in the film's cobalt (it starts under the car and comes
// out above its roof), light pulses running along it („აწი აღარ დაიკარგები."). On „ეს მხოლოდ დასაწყისია." the camera
// cranes up and the car pulls away; on the first two chip sounds a light pings out along the route (a cobalt ring on the
// ground at the first two bends), on the third one cobalt „მალე" chip lands at the end of the road, near the horizon (more
// to come, no invented feature names, no bare UI chips); the light at the end of the road blooms and the frame goes white,
// straight into the white end card. The road is our own ribbon in the kit's perspective (src/scenes/illo/road.tsx
// view/pt), so it can wind.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {C, F} from '../tokens';
import {Backdrop} from '../scenes/illo/backdrop';
import {Car} from '../scenes/illo/car';
import {mix} from '../scenes/illo/palette';
import {pt, scaleAt, view} from '../scenes/illo/road';
import {DefsSvg} from '../scenes/illo/solid';
import {Cloud, poplar, useUid} from './carKit';
import {clamp, E, ev, evs, fr, hash, lerp, prog, shot, sp} from './lib';

const W = 1080;
const H = 1920;
const RW = 3.2; // half the road's width (m)
const LANE = 1.6; // the right lane's centre
const SIDE = 0.9; // the camera flies this far right of the car's lane
const HY = 600; // the horizon (stage y)
/** the road's centre line (metres to the right) at w metres along it: straight past the car, then S-bends whose apexes
 *  are these knots (cosine eased between them, so every knot is an apex); the waypoints stand on the first three */
const KN: [number, number][] = [
  [-60, 0],
  [40, 0],
  [52, -3.4],
  [74, 4.2],
  [114, -8.5],
  [190, 3],
  [320, -9],
  [520, 4],
  [2000, 0],
];
const xc = (w: number) => {
  for (let i = 0; i < KN.length - 1; i++) {
    const [a, xa] = KN[i];
    const [b, xb] = KN[i + 1];
    if (w <= b) return xa + (xb - xa) * (0.5 - 0.5 * Math.cos(Math.PI * clamp((w - a) / (b - a))));
  }
  return 0;
};
const PINGS = [2, 3]; // the knots a light pings at on the first two chip sounds (the first two apexes: left, right)
const SOON_Z = 230; // how far ahead the „მალე" chip stands on the route (near the horizon)
/** the camera's travel (m): steady, then slowing while it cranes up (closed form of a speed easing 0.3 -> 0.12 m a frame) */
const travel = (t: number) => {
  const r = t < 40 ? 0 : t < 60 ? (t - 40) ** 2 / 40 : 10 + (t - 60);
  return 4 + 0.3 * t - 0.18 * r;
};

/** a grass clump, its foot's centre at (x, y), s px per metre (about half a metre tall) */
const clump = (x: number, y: number, s: number) => {
  const k = s * 0.5;
  return `M${(x - 0.62 * k).toFixed(1)} ${y.toFixed(1)}C${(x - 0.5 * k).toFixed(1)} ${(y - 0.6 * k).toFixed(1)} ${(x - 0.3 * k).toFixed(1)} ${(y - 0.86 * k).toFixed(1)} ${(x - 0.22 * k).toFixed(1)} ${(y - 1.04 * k).toFixed(1)}C${(x - 0.12 * k).toFixed(1)} ${(y - 0.6 * k).toFixed(1)} ${(x - 0.04 * k).toFixed(1)} ${(y - 0.4 * k).toFixed(1)} ${x.toFixed(1)} ${(y - 0.3 * k).toFixed(1)}C${(x + 0.08 * k).toFixed(1)} ${(y - 0.76 * k).toFixed(1)} ${(x + 0.24 * k).toFixed(1)} ${(y - 1.16 * k).toFixed(1)} ${(x + 0.36 * k).toFixed(1)} ${(y - 1.3 * k).toFixed(1)}C${(x + 0.4 * k).toFixed(1)} ${(y - 0.8 * k).toFixed(1)} ${(x + 0.46 * k).toFixed(1)} ${(y - 0.4 * k).toFixed(1)} ${(x + 0.62 * k).toFixed(1)} ${y.toFixed(1)}Z`;
};

export const Redemption: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const base = fr(shot('redeem').from);
  const end = fr(shot('redeem').to) - base;
  const rise = fr(ev('rise')) - base;
  const chips = evs('chips').map((s) => fr(s) - base);
  // the crane: the camera rises, the car pulls away (and keeps a little going after the camera slows)
  const up = E.inOut(prog(t, rise - 8, 36));
  const h = lerp(5, 11, up);
  const hy = HY;
  const zc = 10.5 + 0.8 * E.sine(clamp(t / Math.max(1, rise))) + 9 * E.inOut(prog(t, rise - 8, 46)) + 0.1 * Math.max(0, t - 70);
  const d = travel(t);
  const wCar = d + zc;
  const xCam = xc(d) + LANE + SIDE;
  // the camera turns to keep the car in the middle (a little breath on top)
  const vx = 540 - ((xc(wCar) + LANE - xCam) * 1000) / zc + 5 * Math.sin(t / 31);
  const vw = view({hy, vx, h, fp: 1000});
  const P = (X: number, z: number) => pt(vw, X - xCam, z);
  const zNear = Math.max(0.8, (h * 1000) / (2300 - hy));
  const f1 = (v: number) => v.toFixed(1);
  /** a strip of ground from off0 to off1 metres off the road's centre line, between za and zb metres ahead */
  const strip = (off0: number, off1: number, za: number, zb: number, n = 60) => {
    if (zb <= za) return '';
    const Lp: string[] = [];
    const Rp: string[] = [];
    for (let i = 0; i <= n; i++) {
      const z = za * (zb / za) ** (i / n);
      const c = xc(d + z);
      const [lx, ly] = P(c + off0, z);
      const [rx, ry] = P(c + off1, z);
      Lp.push(`${f1(lx)} ${f1(ly)}`);
      Rp.push(`${f1(rx)} ${f1(ry)}`);
    }
    return `M${Lp.join('L')}L${Rp.reverse().join('L')}Z`;
  };
  /** the same, between road positions wa and wb (fixed to the road) */
  const stripW = (off0: number, off1: number, wa: number, wb: number, n = 8) => strip(off0, off1, Math.max(zNear, wa - d), wb - d, n);
  // the fields beyond the verges: parcels in two quiet tones, a pale track between them, fixed to the road
  let fieldA = '';
  let fieldB = '';
  for (let n = Math.floor((d + zNear) / 30); n * 30 - d < 420; n++) {
    for (const side of [-1, 1]) {
      const o0 = RW + 5.6;
      const o1 = RW + 26 + 14 * ((hash(n, side + 11) + 1) / 2);
      const strip2 = side < 0 ? stripW(-o1, -o0, n * 30, n * 30 + 28, 6) : stripW(o0, o1, n * 30, n * 30 + 28, 6);
      if ((n + (side < 0 ? 0 : 1)) % 2 === 0) fieldA += strip2;
      else fieldB += strip2;
    }
  }
  // the centre line's dashes (3 m every 10 m), fixed to the road
  let dashes = '';
  for (let k = Math.ceil((d + zNear) / 10); k * 10 - d < 160; k++) dashes += stripW(-0.08, 0.08, k * 10, k * 10 + 3, 4);
  // the poplars: a row along the left verge, a sparser one far out on the right
  const trees: {x: number; y: number; hh: number; z: number; key: string; X: number; m: number}[] = [];
  [
    {side: -(RW + 2.6), every: 13, phase: 0},
    {side: RW + 8.5, every: 21, phase: 6},
  ].forEach((row, j) => {
    for (let n = Math.ceil((d + zNear + 0.5 - row.phase) / row.every); n * row.every + row.phase - d < 300; n++) {
      const w = n * row.every + row.phase;
      const z = w - d;
      const X = xc(w) + row.side + hash(n, j + 5) * 0.6;
      const m = 10 * (0.85 + 0.3 * ((hash(n, j + 5, 2) + 1) / 2));
      const [x, y] = P(X, z);
      const hh = m * scaleAt(vw, z);
      if (hh >= 4) trees.push({x, y, hh, z, key: `${j}-${n}`, X, m});
    }
  });
  trees.sort((a, b) => b.z - a.z);
  /** a tree in the day light: the near rows keep the kit's mid greys, only the far ones pale */
  const tree = (it: (typeof trees)[number]) => poplar({...it, z: 6 + Math.max(0, it.z - 40) * 0.55});
  // the poplars' shadows on the ground: the light comes from the top left, so they fall to the right and a little toward us
  const SUN: [number, number] = [0.82, -0.28];
  const PROF: [number, number][] = [
    [0, 0.02],
    [0.1, 0.034],
    [0.26, 0.1],
    [0.45, 0.12],
    [0.62, 0.115],
    [0.8, 0.08],
    [0.93, 0.035],
    [1, 0],
  ];
  const nrm = Math.hypot(SUN[0], SUN[1]);
  const shadowOf = (X: number, z0: number, m: number) => {
    const ux = -SUN[1] / nrm;
    const uz = SUN[0] / nrm;
    const A: string[] = [];
    const B: string[] = [];
    for (const [s, hw] of PROF) {
      const cx = X + SUN[0] * m * s;
      const cz = z0 + SUN[1] * m * s;
      const ww = hw * m;
      const [ax, ay] = P(cx + ux * ww, Math.max(zNear, cz + uz * ww));
      const [bx, by] = P(cx - ux * ww, Math.max(zNear, cz - uz * ww));
      A.push(`${f1(ax)} ${f1(ay)}`);
      B.push(`${f1(bx)} ${f1(by)}`);
    }
    return `M${A.join('L')}L${B.reverse().join('L')}Z`;
  };
  const shadows = trees
    .filter((it) => it.z < 150 && it.z > zNear + 5)
    .map((it) => shadowOf(it.X, it.z, it.m))
    .join('');
  // the verges' dressing, fixed to the road: grass clumps, white roadside posts, the guard rails on the bends' outsides
  let grass = '';
  let grassLit = '';
  for (let n = Math.ceil((d + zNear) / 1.9); n * 1.9 - d < 110; n++) {
    const w = n * 1.9;
    const z = w - d;
    for (const side of [-1, 1]) {
      const off = side * (RW + 0.55 + ((hash(n, side + 3) + 1) / 2) * 4.2);
      const [x, y] = P(xc(w) + off, z);
      const s = scaleAt(vw, z) * (0.8 + 0.5 * ((hash(n, side + 7) + 1) / 2));
      if (s * 0.5 < 5 || x < -200 || x > 1280) continue;
      grass += clump(x, y, s);
      grassLit += clump(x - s * 0.05, y, s * 0.72);
    }
  }
  const posts: React.ReactNode[] = [];
  for (let n = Math.ceil((d + zNear + 1) / 25); n * 25 - d < 160; n++) {
    const w = n * 25;
    const z = w - d;
    for (const side of [-1, 1]) {
      const [x, y] = P(xc(w) + side * (RW + 0.9), z);
      const s = scaleAt(vw, z);
      const ph = 1.0 * s;
      const pw = Math.max(1.5, 0.14 * s);
      // a post near the camera fades before its foot reaches the frame's bottom (never a post cut by the edge)
      const near = clamp((1860 - y) / 140);
      if (ph < 6 || near <= 0) continue;
      posts.push(
        <g key={`p${n}${side}`} opacity={near}>
          <ellipse cx={x + pw * 0.9} cy={y} rx={pw * 1.6} ry={pw * 0.45} fill={C.shade} opacity={0.12} />
          <rect x={x - pw / 2} y={y - ph} width={pw} height={ph} rx={pw * 0.3} fill={C.il0} />
          <rect x={x + pw * 0.05} y={y - ph} width={pw * 0.45} height={ph} fill={C.il1} />
          <rect x={x - pw / 2} y={y - ph * 0.82} width={pw} height={ph * 0.14} fill={C.il6} />
        </g>,
      );
    }
  }
  /** a guard rail on one side between road positions wa and wb: its posts and the two-tone beam */
  const rail = (side: number, wa: number, wb: number, key: string) => {
    const za = Math.max(zNear + 0.5, wa - d);
    const zb = wb - d;
    if (zb <= za) return null;
    const X = (w: number) => xc(w) + side * (RW + 0.75);
    const n = 24;
    const top: string[] = [];
    const mid: string[] = [];
    const bot: string[] = [];
    for (let i = 0; i <= n; i++) {
      const z = za + ((zb - za) * i) / n;
      const [x, y] = P(X(d + z), z);
      const s = scaleAt(vw, z);
      top.push(`${f1(x)} ${f1(y - 0.78 * s)}`);
      mid.push(`${f1(x)} ${f1(y - 0.64 * s)}`);
      bot.push(`${f1(x)} ${f1(y - 0.5 * s)}`);
    }
    let pd = '';
    for (let w = Math.ceil(wa / 3) * 3; w <= wb; w += 3) {
      const z = w - d;
      if (z < za) continue;
      const [x, y] = P(X(w), z);
      const s = scaleAt(vw, z);
      pd += `M${f1(x - 0.05 * s)} ${f1(y)}V${f1(y - 0.66 * s)}H${f1(x + 0.05 * s)}V${f1(y)}Z`;
    }
    return (
      <g key={key}>
        <path d={pd} fill={C.il4} />
        <path d={`M${top.join('L')}L${[...mid].reverse().join('L')}Z`} fill={C.il0} />
        <path d={`M${mid.join('L')}L${[...bot].reverse().join('L')}Z`} fill={C.il3} />
      </g>
    );
  };
  const rails = [2, 3, 4, 5].map((k) => {
    const [w, x] = KN[k];
    const side = Math.sign(x - KN[k - 1][1]) || 1;
    const span = (KN[k + 1][0] - KN[k - 1][0]) * 0.22;
    return rail(side, w - span, w + span, `r${k}`);
  });
  // the route: from under the car (its start hidden by the body) to the horizon in the right lane, drawn in on the first line
  const z0 = zc + 0.5;
  const zEnd = lerp(z0 + 0.5, 420, E.out(prog(t, 2, 30)));
  const pulses = [0, 1, 2, 3]
    .map((k) => {
      const zp = zc + 4 + ((((t * 1.3 + k * 24) % 96) + 96) % 96);
      return zp + 3.5 < zEnd ? strip(LANE - 0.2, LANE + 0.2, zp, zp + 3.5, 8) : '';
    })
    .join('');
  const [cx, cy] = P(xc(wCar) + LANE, zc);
  const len = 4.7 * scaleAt(vw, zc);
  // the car's own shadow: its footprint, cast a little to the right (soft)
  const footX = xc(wCar) + LANE;
  const foot = (() => {
    const pts: [number, number][] = [
      [footX - 0.85, zc + 0.1],
      [footX + 1.15, zc + 0.1],
      [footX + 1.2, zc + 3.4],
      [footX - 0.7, zc + 3.4],
    ];
    return 'M' + pts.map(([X, z]) => P(X, z).map(f1).join(' ')).join('L') + 'Z';
  })();
  // the light at the end of the road, then the white
  const [sx, sy] = P(xc(d + 700) + LANE, 700);
  const bloom = E.in2(prog(t, 60, end - 60));
  const white = E.in2(prog(t, end - 11, 10));
  const S = (1 + 0.04 * E.sine(clamp(t / end))) * (1 + 0.035 * (1 - E.out(clamp(t / 8))));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, background: C.bg}}>
      <DefsSvg uid={uid} />
      <defs>
        <linearGradient id={`${uid}sky`} gradientUnits="userSpaceOnUse" x1={0} y1={-200} x2={0} y2={hy}>
          <stop offset="0" stopColor={mix(C.il1, C.il0, 0.35)} />
          <stop offset="1" stopColor={C.il0} />
        </linearGradient>
        <radialGradient id={`${uid}sun`}>
          <stop offset="0" stopColor={C.il0} stopOpacity={1} />
          <stop offset="0.45" stopColor={C.il0} stopOpacity={0.6} />
          <stop offset="1" stopColor={C.il0} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}land`} gradientUnits="userSpaceOnUse" x1={0} y1={hy} x2={0} y2={H}>
          <stop offset="0" stopColor={mix(C.il1, C.il2, 0.4)} />
          <stop offset="0.3" stopColor={mix(C.il1, C.il2, 0.7)} />
          <stop offset="1" stopColor={C.il2} />
        </linearGradient>
        <linearGradient id={`${uid}verge`} gradientUnits="userSpaceOnUse" x1={0} y1={hy} x2={0} y2={H}>
          <stop offset="0" stopColor={mix(C.il2, C.il1, 0.3)} />
          <stop offset="0.35" stopColor={mix(C.il2, C.il3, 0.25)} />
          <stop offset="1" stopColor={mix(C.il2, C.il3, 0.55)} />
        </linearGradient>
        <linearGradient id={`${uid}road`} gradientUnits="userSpaceOnUse" x1={0} y1={hy} x2={0} y2={H}>
          <stop offset="0" stopColor={mix(C.il3, C.il2, 0.45)} />
          <stop offset="0.25" stopColor={mix(C.il3, C.il4, 0.2)} />
          <stop offset="1" stopColor={mix(C.il4, C.il3, 0.3)} />
        </linearGradient>
        <filter id={`${uid}glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
        <filter id={`${uid}soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={5} />
        </filter>
      </defs>
      <rect width={W} height={H} fill={C.bg} />
      <g transform={`translate(540 ${hy}) scale(${S.toFixed(4)}) translate(-540 ${-hy})`}>
        <rect x={-1200} y={-1200} width={3480} height={hy + 1202} fill={`url(#${uid}sky)`} />
        <g transform={`translate(${f1(-t * 0.3)} 0)`}>
          <Cloud x={230} y={190} s={0.95} />
          <Cloud x={860} y={120} s={0.8} />
          <Cloud x={690} y={330} s={0.6} opacity={0.9} />
        </g>
        <g transform={`translate(540 ${hy}) scale(0.78) translate(-540 ${-hy})`}>
          <Backdrop kind="mountains" uid={uid} frame={t} time="day" base={hy + 2} drift={0.1} seed={3} scroll={(vx - 540) * 0.25} />
        </g>
        <rect x={-1200} y={hy + 1} width={3480} height={3000} fill={`url(#${uid}land)`} />
        <path d={fieldA} fill={C.il2} opacity={0.45} />
        <path d={fieldB} fill={mix(C.il1, C.il0, 0.5)} opacity={0.7} />
        {/* the verges, the asphalt with its two tyre-worn bands, the edge lines, the centre dashes */}
        <path d={strip(-RW - 4.8, -RW, zNear, 400) + strip(RW, RW + 4.8, zNear, 400)} fill={`url(#${uid}verge)`} />
        <path d={strip(-RW - 0.12, RW + 0.12, zNear, 700, 90)} fill={`url(#${uid}road)`} />
        <path d={strip(LANE - 1.05, LANE - 0.55, zNear, 300, 70) + strip(LANE + 0.55, LANE + 1.05, zNear, 300, 70) + strip(-LANE - 1.05, -LANE - 0.55, zNear, 300, 70) + strip(-LANE + 0.55, -LANE + 1.05, zNear, 300, 70)} fill={C.il5} opacity={0.12} />
        <path d={strip(-RW + 0.2, -RW + 0.36, zNear, 320, 70) + strip(RW - 0.36, RW - 0.2, zNear, 320, 70)} fill={C.il0} opacity={0.92} />
        <path d={dashes} fill={C.il0} opacity={0.9} />
        {/* the poplars' shadows across the road and the verges, the car's own shadow */}
        <path d={shadows} fill={C.shade} opacity={0.1} />
        <path d={foot} fill={C.shade} opacity={0.18} filter={`url(#${uid}soft)`} />
        {/* the verges' dressing */}
        <path d={grass} fill={C.il3} />
        <path d={grassLit} fill={mix(C.il2, C.il3, 0.4)} />
        {posts}
        {rails}
        {/* the trees beyond the car, the light at the end of the road */}
        {trees.filter((it) => it.z > zc + 3).map(tree)}
        <circle cx={sx} cy={sy - 30} r={lerp(240, 1600, bloom)} fill={`url(#${uid}sun)`} opacity={lerp(0.4, 1, bloom)} />
        {/* the route ahead: a soft glow, the cobalt line, light pulses running along it (under the car: it starts there) */}
        <path d={strip(LANE - 0.55, LANE + 0.55, z0, zEnd, 90)} fill={C.accA} opacity={0.5} filter={`url(#${uid}glow)`} />
        <path d={strip(LANE - 0.3, LANE + 0.3, z0, zEnd, 90)} fill={C.accA} />
        {pulses ? <path d={pulses} fill={C.il0} opacity={0.7} /> : null}
        <Car uid={uid} x={cx} y={cy} len={len} view="rear" body="coupe" paint="a" frame={t} speed={0.5} lights={{tail: 0.55}} />
        {/* the road ahead: on the first two chip sounds a light runs out along the route (a ring on the ground at a bend),
            on the third the cobalt „მალე" lands at the end of the road: more to come */}
        {PINGS.map((k, i) => {
          const at = chips[i];
          const q = (t - at) / 18;
          const w = KN[k][0];
          const zw = w - d;
          if (q < 0 || q > 1 || zw < zNear + 2 || zEnd < zw) return null;
          const c = xc(w) + LANE;
          const rm = 0.4 + 3.2 * E.out(q);
          const ring = Array.from({length: 49}, (_, j) => {
            const a = (j / 48) * Math.PI * 2;
            return P(c + rm * Math.cos(a), zw + rm * 1.6 * Math.sin(a)).map(f1).join(' ');
          });
          const [px, py] = P(c, zw);
          const dot = Math.max(5, 0.5 * scaleAt(vw, zw));
          return (
            <g key={k}>
              <path d={`M${ring.join('L')}Z`} fill="none" stroke={C.accA} strokeWidth={5 * (1 - q) + 1.5} opacity={0.95 * (1 - q) ** 0.8} />
              <ellipse cx={px} cy={py} rx={dot * (1.6 - q)} ry={dot * 0.45 * (1.6 - q)} fill={C.il0} opacity={0.95 * (1 - q)} />
            </g>
          );
        })}
        {t >= chips[2] && zEnd > SOON_Z
          ? (() => {
              const k = sp(t, chips[2], 240, 12);
              const [x, y] = P(xc(d + SOON_Z) + LANE, SOON_Z);
              const q = (t - chips[2]) / 14;
              return (
                <g transform={`translate(${f1(x)} ${f1(y)})`}>
                  <ellipse cx={0} cy={0} rx={20 * k} ry={5.5 * k} fill={C.accA} opacity={0.5} />
                  <path d={`M0 0V${f1(-52 * k)}`} stroke={C.accA} strokeWidth={4.5} strokeLinecap="round" />
                  {q < 1 ? <circle cx={0} cy={-98} r={86 * k + 80 * E.out(q)} fill="none" stroke={C.accA} strokeWidth={5 * (1 - q) + 1} opacity={0.6 * (1 - q)} /> : null}
                  <g transform={`translate(0 -98) scale(${k.toFixed(3)}) rotate(${(-6 * (1 - k)).toFixed(2)})`}>
                    <rect x={-100} y={-42} width={200} height={84} rx={42} fill={C.accA} />
                    <rect x={-100} y={-42} width={200} height={84} rx={42} fill="none" stroke={C.il0} strokeWidth={4.5} />
                    <text x={0} y={16} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={46} fill={C.il0}>
                      {mtav('მალე')}
                    </text>
                  </g>
                </g>
              );
            })()
          : null}
        {/* the trees nearer than the car pass by */}
        {trees.filter((it) => it.z <= zc + 3).map(tree)}
      </g>
      {white > 0 ? <rect width={W} height={H} fill={C.il0} opacity={white} /> : null}
    </svg>
  );
};
