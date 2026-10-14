// CAMERA AND LIMIT, a joke that proves a feature (the owner, 2026-10-12, on the line-art road with the cardboard box: "these
// graphics are terrible"; rebuilt, then re-composed after the critic: the camera was a speck, the frame washed out). A low
// chase shot on a road out of town in the late-day light: the horizon low (y 770), the sun's haze behind the far city on the
// right, rows of trees down both verges, their long soft shadows (and the pole's) lying across the road toward us, the
// asphalt running from pale at the horizon to dark under the car. The hero, the film's cobalt coupe (the same car as in the
// forest, the mountain and the arrival), big, rides toward a speed camera on a pole just ahead on the right: a chunky housing
// with a sun visor, dark glass, a lens and a flash panel, already big on „წინ კამერაა" (200 px wide) and growing to 340 px
// as the car eases toward it (calm, inside the limit). Ink pulses ring out from it. The app's REAL speed sign (the red-ring
// '50' cropped from 17-nav-drive, never edited) springs in at the upper left, and an ink check lands on it on „ლიმიტში თუ
// ხარ". On „ის უბრალოდ ყუთია" the camera folds away and a plain cardboard box swings on the arm in its place, a lens and a
// flash doodled on its front in marker: the deadpan hold. No red and no green of our own (the critic, 2026-10-12: they
// fought the cobalt; the film keeps red for the arrival's strike-out): the car's tail lamps are the kit's, lit white.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, rgba} from '../tokens';
import {Backdrop} from '../scenes/illo/backdrop';
import {Car} from '../scenes/illo/car';
import {mix} from '../scenes/illo/palette';
import {circ, DefsSvg, paint, poly, rr, Shadow, smooth, Solid} from '../scenes/illo/solid';
import {SRC_H, SRC_W} from './Iphone';
import {clamp, E, ev, fr, H, lerp, prog, shot, sp, W, type Pt} from './lib';
import {jit} from './refined';
import {useUid} from './roadsKit';

// ---- the projection: a camera h m above the road, focal fp px, horizon hy, vanishing x vx; ox its sideways sway (m), bend
// px the far road's curve. A point X m right, Z m ahead, Y m up lands at proj(v, X, Z, Y) ---------------------------------------
type V = {fp: number; h: number; hy: number; vx: number; ox: number; bend: number};
const proj = (v: V, X: number, Z: number, Y = 0): Pt => {
  const z = Math.max(0.3, Z);
  return [v.vx + v.bend * Math.max(0, 1 - 6 / z) + ((X - v.ox) * v.fp) / z, v.hy + ((v.h - Y) * v.fp) / z];
};
const kAt = (v: V, Z: number) => v.fp / Math.max(0.3, Z);
/** the sun: ahead and to the right, fairly low; shadows fall toward us and to the left (ground direction dX, dZ), cot of
 *  its height */
const SUN: Pt = [-0.45, -0.893];
const COT = 2.6;
/** a ground polygon (X, Z in metres) on the screen, clipped to Z >= 3.2 m (nearer lies under the frame's bottom edge) */
const ZMIN = 3.2;
const ground = (v: V, pts: Pt[]) => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ina = a[1] >= ZMIN;
    const inb = b[1] >= ZMIN;
    if (ina) out.push(a);
    if (ina !== inb) {
      const k = (ZMIN - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * k, ZMIN]);
    }
  }
  if (out.length < 3) return '';
  // one winding for every shadow, so overlapping ones merge (nonzero fill) instead of cutting holes in each other
  let area = 0;
  for (let i = 0; i < out.length; i++) area += out[i][0] * out[(i + 1) % out.length][1] - out[(i + 1) % out.length][0] * out[i][1];
  return poly((area < 0 ? out.reverse() : out).map(([X, Z]) => proj(v, X, Z)));
};
/** the soft shadow of a blob of radius r at height y above (X, Z): an ellipse on the ground, stretched along the light */
const blobShadow = (v: V, X: number, Z: number, y: number, r: number, grow = 1) => {
  const cx = X + SUN[0] * y * COT;
  const cz = Z + SUN[1] * y * COT;
  const pts: Pt[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const u = Math.cos(a) * r * 1.5 * grow;
    const w = Math.sin(a) * r * grow;
    pts.push([cx + SUN[0] * u - SUN[1] * w, cz + SUN[1] * u + SUN[0] * w]);
  }
  return ground(v, pts);
};
/** a thin upright's shadow on the ground: from its foot along the light, `ht` m tall, `w` m wide */
const stickShadow = (v: V, X: number, Z: number, ht: number, w: number, from = 0) => {
  const L = ht * COT;
  const L0 = from * COT;
  const n: Pt = [-SUN[1] * w * 0.5, SUN[0] * w * 0.5];
  return ground(v, [
    [X + SUN[0] * L0 + n[0], Z + SUN[1] * L0 + n[1]],
    [X + SUN[0] * L + n[0], Z + SUN[1] * L + n[1]],
    [X + SUN[0] * L - n[0], Z + SUN[1] * L - n[1]],
    [X + SUN[0] * L0 - n[0], Z + SUN[1] * L0 - n[1]],
  ]);
};

// ---- the world (metres; Z of a fixed thing is its world Zw minus the distance travelled) ----------------------------------
const XP = 2.9; // the camera's pole, on the right shoulder
const ZP0 = 14.55; // the pole's distance on the first frame
const ZC = 6; // our car, its rear face this far ahead of the camera
const ROAD = {l: -6.1, r: 2.35, edgeL: -5.6, edgeR: 1.9, centre: -1.9};
type TreeW = {X: number; Zw: number; h: number; cr: number; seed: number};
const TREES: TreeW[] = (() => {
  const out: TreeW[] = [];
  for (let k = 0; k < 30; k++) {
    out.push({X: 9.2 + 2.6 * jit(k, 1), Zw: 8 + k * 8.4 + 3 * jit(k, 2), h: 6.8 + 2 * jit(k, 3), cr: 2.2 + 0.7 * jit(k, 4), seed: k * 2 + 1});
    out.push({X: -9.4 - 2.4 * jit(k, 5), Zw: 11 + k * 8.9 + 3 * jit(k, 6), h: 6.6 + 2 * jit(k, 7), cr: 2.1 + 0.7 * jit(k, 8), seed: k * 2 + 2});
  }
  return out;
})();

/** a tree from the side: a trunk and a crown of puffs, one ball light; far ones lighten into the haze */
const SideTree: React.FC<{uid: string; v: V; tr: TreeW; Z: number}> = ({uid, v, tr, Z}) => {
  const [fx, fy] = proj(v, tr.X, Z);
  const s = kAt(v, Z);
  const cr = tr.cr * s;
  const cx = fx;
  const cy = fy - (tr.h - tr.cr) * s;
  let d = circ(cx, cy, cr * 0.62);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + jit(tr.seed, i + 3) * 0.5;
    const rad = cr * (0.36 + 0.12 * jit(tr.seed, i + 11));
    const off = cr - rad;
    d += circ(cx + Math.cos(a) * off, cy + Math.sin(a) * off * 0.94, rad);
  }
  const haze = clamp((Z - 18) / 150) * 0.75;
  const trunk = rr(fx - 0.14 * s, fy - (tr.h - tr.cr * 1.4) * s, 0.28 * s, (tr.h - tr.cr * 1.4) * s, 0.08 * s);
  return (
    <g>
      <Shadow uid={uid} cx={fx - 0.4 * s} cy={fy} rx={0.9 * s} ry={0.14 * s} />
      <Solid uid={uid} d={trunk} tone={5} shade="flat" />
      <Solid uid={uid} d={d} tone={Z < 40 ? 4 : 3} shade="ball" />
      <circle cx={cx + cr * 0.3} cy={cy - cr * 0.32} r={cr * 0.34} fill={C.il0} opacity={0.18} />
      {haze > 0.02 ? <path d={d + trunk} fill={C.il0} opacity={haze} /> : null}
    </g>
  );
};

/** the road to the horizon in one smooth light, pale far, dark near: verges, asphalt, the edge lines, the centre's dashes
 *  streaming by, reflector posts; then the shadows lying across it */
const DayRoad: React.FC<{uid: string; v: V; d: number; shadows: [string, string]}> = ({uid, v, d, shadows}) => {
  const zs: number[] = [];
  for (let z = 2; z < 300; z *= 1.12) zs.push(z);
  const strip = (x0: number, x1: number, a = 2, b = 300) => {
    const mid = zs.filter((z) => z > a && z < b);
    const Z = [a, ...mid, b];
    return poly([...Z.map((z) => proj(v, x0, z)), ...Z.map((z) => proj(v, x1, z)).reverse()]);
  };
  const g = `${uid}road`;
  const gv = `${uid}verge`;
  let dashes = '';
  const off = ((d % 10) + 10) % 10;
  for (let k = 0; k < 30; k++) {
    const z0 = 2 + k * 10 - off;
    const z1 = z0 + 4;
    if (z1 < 2.1) continue;
    if (z0 > 200) break;
    dashes += strip(ROAD.centre - 0.07, ROAD.centre + 0.07, Math.max(2, z0), z1);
  }
  // the asphalt's own life: tar seams across the lanes and a few patched squares, streaming toward us (they carry the speed
  // in the near road, under the car and the subtitle)
  let seams = '';
  const k0 = Math.floor(d / 7);
  for (let kk = k0; kk < k0 + 13; kk++) {
    const z = kk * 7 + 2.3 * jit(kk, 51) - d + 3.3;
    if (z < 3.3 || z > 85) continue;
    const x0 = ROAD.l + 0.4 + 3 * jit(kk, 52);
    const x1 = Math.min(ROAD.r - 0.3, x0 + 2.5 + 4 * jit(kk, 53));
    const wob = 0.18 * (jit(kk, 54) - 0.5);
    seams += ground(v, [
      [x0, z],
      [x1, z + wob],
      [x1, z + wob + 0.06],
      [x0, z + 0.06],
    ]);
    if (jit(kk, 55) > 0.62) {
      const px = ROAD.l + 1 + 5.5 * jit(kk, 56);
      seams += ground(v, [
        [px, z + 1.2],
        [px + 1.1, z + 1.2],
        [px + 1.1, z + 2.6],
        [px, z + 2.6],
      ]);
    }
  }
  let posts = '';
  let caps = '';
  let postSh = '';
  const poff = ((d % 20) + 20) % 20;
  for (const X of [-6.5, 2.7]) {
    for (let k = 0; k < 14; k++) {
      const z = 4 + k * 20 - poff + (X > 0 ? 9 : 0);
      if (z < 3.4 || z > 220) continue;
      const [x, y] = proj(v, X, z);
      const s = kAt(v, z);
      const w = Math.max(1.5, 0.12 * s);
      if (x - w < 30 || x + w > W - 30) continue;
      posts += rr(x - w / 2, y - s, w, s, w * 0.3);
      caps += rr(x - w / 2, y - 0.9 * s, w, 0.14 * s, 0);
      postSh += stickShadow(v, X, z, 1, 0.12);
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={g} gradientUnits="userSpaceOnUse" x1="0" y1={v.hy} x2="0" y2={H}>
          <stop offset="0" stopColor={mix(C.il1, C.il2, 0.3)} />
          <stop offset="0.12" stopColor={C.il2} />
          <stop offset="0.4" stopColor={mix(C.il2, C.il3, 0.8)} />
          <stop offset="0.7" stopColor={mix(C.il3, C.il4, 0.55)} />
          <stop offset="1" stopColor={mix(C.il4, C.il5, 0.7)} />
        </linearGradient>
        <linearGradient id={`${uid}shfadeG`} gradientUnits="userSpaceOnUse" x1="0" y1={1250} x2="0" y2={1760}>
          <stop offset="0" stopColor={C.il0} />
          <stop offset="1" stopColor={C.shade} />
        </linearGradient>
        <linearGradient id={gv} gradientUnits="userSpaceOnUse" x1="0" y1={v.hy} x2="0" y2={H}>
          <stop offset="0" stopColor={C.il1} />
          <stop offset="0.15" stopColor={mix(C.il1, C.il2, 0.7)} />
          <stop offset="1" stopColor={mix(C.il3, C.il4, 0.35)} />
        </linearGradient>
      </defs>
      <rect x={-300} y={v.hy} width={1680} height={H - v.hy + 300} fill={`url(#${gv})`} />
      {/* the shoulders' gravel edge, then the asphalt */}
      <path d={strip(ROAD.l - 0.35, ROAD.r + 0.35)} fill={mix(C.il2, C.il3, 0.5)} opacity={0.7} />
      <path d={strip(ROAD.l, ROAD.r)} fill={`url(#${g})`} />
      <path d={seams} fill={C.il6} opacity={0.08} />
      <path d={strip(ROAD.edgeL - 0.075, ROAD.edgeL + 0.075) + strip(ROAD.edgeR - 0.075, ROAD.edgeR + 0.075)} fill={C.il0} opacity={0.92} />
      <path d={dashes} fill={C.il0} opacity={0.95} />
      {/* the shadows across it: the trees', the pole's, the posts'; they fade out toward the frame's bottom (the nearest ones
          would be huge there, and the subtitle sits on that road) */}
      <mask id={`${uid}shfade`} maskUnits="userSpaceOnUse" x={-400} y={v.hy - 10} width={1880} height={H - v.hy + 400}>
        <rect x={-400} y={v.hy - 10} width={1880} height={H - v.hy + 400} fill={`url(#${uid}shfadeG)`} />
      </mask>
      <g mask={`url(#${uid}shfade)`}>
        <path d={shadows[0]} fill={C.shade} opacity={0.06} />
        <path d={shadows[1] + postSh} fill={C.shade} opacity={0.1} />
      </g>
      <path d={posts} fill={C.il0} stroke={C.il3} strokeWidth={1} />
      <path d={caps} fill={C.il5} />
    </g>
  );
};

/** a hand-drawn ring in marker (a little wobble, the ends overlapping) */
const doodle = (cx: number, cy: number, r: number) => {
  const pts: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = -0.7 + (i / 28) * Math.PI * 2 * 1.07;
    const k = r * (1 + 0.05 * Math.sin(a * 3 + 0.7) + 0.03 * Math.sin(a * 5));
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k * 0.95]);
  }
  return smooth(pts);
};

/** the speed camera on its pole (XP m right, Z m ahead), and the cardboard box that takes its place */
const SpeedCam: React.FC<{uid: string; v: V; Z: number; t: number; camAt: number; boxAt: number}> = ({uid, v, Z, t, camAt, boxAt}) => {
  const [fx, fy] = proj(v, XP, Z);
  const s = kAt(v, Z);
  const vp: Pt = [v.vx + v.bend, v.hy];
  const X = (m: number) => fx + m * s;
  const Y = (m: number) => fy - m * s; // m metres up
  /** a box's front face and the two faces we see past it (its left and its underside: it hangs above our eyes, right of
   *  the road's vanishing point), `depth` metres deep */
  const faces = (l: number, tp: number, r: number, b: number, depth: number) => {
    const k = depth / (Z + depth);
    const sh = (p: Pt): Pt => [p[0] + (vp[0] - p[0]) * k, p[1] + (vp[1] - p[1]) * k];
    const tl: Pt = [l, tp];
    const bl: Pt = [l, b];
    const br: Pt = [r, b];
    return {left: poly([tl, bl, sh(bl), sh(tl)]), under: poly([bl, br, sh(br), sh(bl)]), front: rr(l, tp, r - l, b - tp, 0.07 * s)};
  };
  const hx = X(-1.5);
  const pivot: Pt = [hx, Y(5.1)];
  // the camera: a light housing with a sun visor over a dark window: the lens, a second small lens, the flash panel, a lamp
  const cw = 1.9 * s;
  const ch = 1.1 * s;
  const cl = hx - cw / 2;
  const ct = Y(4.97);
  const cam = faces(cl, ct, cl + cw, ct + ch, 0.8);
  const camK = 1 - E.in(clamp((t - boxAt + 2) / 5));
  const led = t < boxAt && t % 18 < 7;
  const lens: Pt = [cl + 0.5 * s, ct + 0.6 * s];
  const cc: Pt = [hx, ct + ch / 2];
  const pulse = (at: number) => {
    const p = prog(t, at, 20);
    return p > 0 && p < 1 ? (
      <g opacity={1 - E.in(p)}>
        <circle cx={cc[0]} cy={cc[1]} r={cw * 0.62 + 150 * E.out(p)} fill="none" stroke={C.il0} strokeWidth={11} opacity={0.7} />
        <circle cx={cc[0]} cy={cc[1]} r={cw * 0.62 + 150 * E.out(p)} fill="none" stroke={C.ink} strokeWidth={5} opacity={0.75} />
      </g>
    ) : null;
  };
  // the box: kraft card in the film's warm second accent, taped to the arm, swinging a little after it lands
  const boxK = sp(t, boxAt, 230, 11);
  const swing = t >= boxAt ? 8 * Math.sin((t - boxAt) * 0.42) * Math.exp(-(t - boxAt) / 15) : 0;
  const bw = 2.1 * s;
  const bh = 1.4 * s;
  const bl = hx - bw / 2;
  const bt = Y(5.06);
  const box = faces(bl, bt, bl + bw, bt + bh, 1.0);
  const kraft = mix(C.accB, C.il1, 0.36);
  const kraftDk = mix(C.accB, C.il4, 0.38);
  const kraftDeep = mix(C.accB, C.il5, 0.5);
  const tape = mix(C.accB, C.il0, 0.72);
  const ink = Math.max(2.4, 0.045 * s);
  const poof = prog(t, boxAt, 11);
  return (
    <g>
      {/* the pole: its foot, the controller's cabinet, the mast, the arm over the lane */}
      <Shadow uid={uid} cx={fx - 0.3 * s} cy={fy + 0.03 * s} rx={0.9 * s} ry={0.14 * s} />
      <Solid uid={uid} d={rr(X(-0.3), Y(0.14), 0.6 * s, 0.14 * s, 0.04 * s)} tone={3} outline />
      <Solid uid={uid} d={rr(X(-0.1), Y(5.3), 0.2 * s, 5.3 * s, 0.08 * s)} tone={3} outline />
      <Solid uid={uid} d={rr(X(-0.5), Y(1.95), 0.42 * s, 0.8 * s, 0.04 * s)} tone={2} outline />
      <path d={`M${X(-0.44)} ${Y(1.7)}H${X(-0.14)}M${X(-0.44)} ${Y(1.62)}H${X(-0.14)}M${X(-0.44)} ${Y(1.54)}H${X(-0.14)}`} stroke={C.il4} strokeWidth={Math.max(1, 0.025 * s)} />
      <Solid uid={uid} d={rr(X(-1.8), Y(5.24), 1.92 * s, 0.13 * s, 0.06 * s)} tone={3} outline />
      <Solid uid={uid} d={rr(X(-0.14), Y(5.34), 0.28 * s, 0.24 * s, 0.05 * s)} tone={4} outline />
      {camK > 0.01 ? (
        <g opacity={camK} transform={`translate(${pivot[0].toFixed(1)} ${pivot[1].toFixed(1)}) scale(1 ${camK.toFixed(3)}) translate(${(-pivot[0]).toFixed(1)} ${(-pivot[1]).toFixed(1)})`}>
          <path d={rr(hx - 0.08 * s, Y(5.12), 0.16 * s, 0.16 * s, 0.02 * s)} fill={C.il4} />
          <path d={cam.left} fill={C.il2} stroke={C.ilEdge} strokeWidth={1.6} strokeLinejoin="round" />
          <path d={cam.under} fill={C.il4} stroke={C.ilEdge} strokeWidth={1.6} strokeLinejoin="round" />
          <Solid uid={uid} d={cam.front} tone={1} outline />
          {/* the dark window, its glare, the lens, the second lens, the flash panel */}
          <path d={rr(cl + 0.12 * s, ct + 0.22 * s, cw - 0.24 * s, ch - 0.34 * s, 0.06 * s)} fill={C.ilGlass} />
          <circle cx={lens[0]} cy={lens[1]} r={0.27 * s} fill={C.il5} />
          <circle cx={lens[0]} cy={lens[1]} r={0.2 * s} fill={C.il7} />
          <circle cx={lens[0]} cy={lens[1]} r={0.1 * s} fill={mix(C.il6, C.il5, 0.5)} />
          <circle cx={lens[0] - 0.07 * s} cy={lens[1] - 0.07 * s} r={0.05 * s} fill={C.il0} opacity={0.9} />
          <circle cx={cl + 0.98 * s} cy={ct + 0.45 * s} r={0.09 * s} fill={C.il5} />
          <circle cx={cl + 0.98 * s} cy={ct + 0.45 * s} r={0.05 * s} fill={C.il7} />
          <path d={rr(cl + 1.18 * s, ct + 0.36 * s, 0.52 * s, 0.46 * s, 0.04 * s)} fill={mix(C.ilGlass, C.il4, 0.35)} />
          {[0, 1, 2, 3].flatMap((i) =>
            [0, 1, 2].map((j) => <circle key={`${i}${j}`} cx={cl + (1.26 + i * 0.12) * s} cy={ct + (0.46 + j * 0.13) * s} r={0.03 * s} fill={C.il3} opacity={0.75} />),
          )}
          <path d={poly([[cl + 0.3 * s, ct + 0.22 * s], [cl + 0.62 * s, ct + 0.22 * s], [cl + 0.36 * s, ct + 0.88 * s], [cl + 0.12 * s, ct + 0.88 * s]])} fill={C.il0} opacity={0.1} />
          {/* the sun visor, standing out over the window */}
          <Solid uid={uid} d={rr(cl - 0.08 * s, ct - 0.07 * s, cw + 0.16 * s, 0.17 * s, 0.04 * s)} tone={3} outline />
          <path d={rr(cl - 0.02 * s, ct + 0.1 * s, cw + 0.04 * s, 0.05 * s, 0)} fill={C.shade} opacity={0.18} />
          {/* the status lamp: a dark bead that winks white while the camera watches */}
          <circle cx={cl + cw - 0.2 * s} cy={ct + 0.32 * s} r={0.06 * s} fill={C.il5} />
          {led ? <circle cx={cl + cw - 0.215 * s} cy={ct + 0.305 * s} r={0.028 * s} fill={C.il0} /> : null}
          {pulse(camAt)}
          {pulse(camAt + 13)}
          {pulse(camAt + 26)}
        </g>
      ) : null}
      {boxK > 0.001 ? (
        <g transform={`rotate(${swing.toFixed(2)} ${pivot[0].toFixed(1)} ${pivot[1].toFixed(1)}) translate(${pivot[0].toFixed(1)} ${pivot[1].toFixed(1)}) scale(${(0.3 + 0.7 * boxK).toFixed(4)}) translate(${(-pivot[0]).toFixed(1)} ${(-pivot[1]).toFixed(1)})`}>
          <path d={box.left} fill={kraftDk} stroke={C.ilEdge} strokeWidth={1.6} strokeLinejoin="round" />
          <path d={box.under} fill={kraftDeep} stroke={C.ilEdge} strokeWidth={1.6} strokeLinejoin="round" />
          <path d={box.front} fill={kraft} />
          <path d={box.front} fill={paint(uid, 'soft-1')} opacity={0.3} />
          {/* the flaps' seam across the top, the tape down it, two straps of tape round the arm */}
          <path d={`M${bl + 0.04 * s} ${bt + 0.07 * s}H${bl + bw - 0.04 * s}`} stroke={kraftDk} strokeWidth={Math.max(1.5, 0.025 * s)} />
          <path d={box.front} fill="none" stroke={C.ilEdge} strokeWidth={1.8} />
          <path d={rr(hx - 0.12 * s, bt, 0.24 * s, 0.36 * s, 0.01 * s)} fill={tape} opacity={0.92} />
          {[-0.62, 0.62].map((o) => (
            <path key={o} d={rr(hx + (o - 0.065) * s, Y(5.28), 0.13 * s, bt - Y(5.28) + 0.3 * s, 0.015 * s)} fill={tape} stroke={C.ilEdge} strokeWidth={1} strokeOpacity={0.35} />
          ))}
          {/* the joke: a lens and the flash doodled on it in marker, where the camera's were */}
          <path d={doodle(bl + 0.62 * s, bt + 0.74 * s, 0.3 * s)} fill="none" stroke={C.ink} strokeWidth={ink} strokeLinecap="round" opacity={0.85} />
          <circle cx={bl + 0.62 * s} cy={bt + 0.74 * s} r={0.1 * s} fill={C.ink} opacity={0.85} />
          <path
            d={`M${bl + 1.2 * s} ${bt + 0.55 * s}L${bl + 1.74 * s} ${bt + 0.52 * s}L${bl + 1.76 * s} ${bt + 0.92 * s}L${bl + 1.19 * s} ${bt + 0.95 * s}Z`}
            fill="none"
            stroke={C.ink}
            strokeWidth={ink}
            strokeLinejoin="round"
            opacity={0.85}
          />
          <circle cx={bl + bw - 0.2 * s} cy={bt + 0.3 * s} r={0.05 * s} fill="none" stroke={C.ink} strokeWidth={ink * 0.8} opacity={0.85} />
        </g>
      ) : null}
      {poof > 0 && poof < 1 ? <circle cx={hx} cy={bt + bh / 2} r={s * (0.8 + 1.4 * E.out(poof))} fill="none" stroke={C.il0} strokeWidth={Math.max(2, 0.16 * s * (1 - poof))} opacity={1 - poof} /> : null}
    </g>
  );
};

export const CameraRoad: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const base = fr(shot('camera').from);
  const end = fr(shot('camera').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const signAt = L('sign');
  const camAt = L('cam');
  const checkAt = L('check');
  const boxAt = L('box');
  // the drive: the car eases off as it nears the camera (calm, inside the limit); d metres travelled
  const vAt = (f: number) => lerp(0.088, 0.034, clamp(f / end));
  let d = 0;
  for (let i = 0; i < t; i++) d += vAt(i);
  const v: V = {fp: 1500, h: 2.5, hy: 770, vx: 470, ox: 0.1 * Math.sin((t + 10) / 32), bend: 26 * Math.sin((t + 30) / 40)};
  const zPole = ZP0 - d;
  // the camera: the punch on the cut about the car's wheels (it stays whole), a soft kick when the box lands
  const kick = t >= boxAt ? 0.025 * Math.exp(-(t - boxAt) / 7) * Math.cos((t - boxAt) * 0.45) : 0;
  const zoom = (1 + 0.025 * E.inOut(clamp(t / end)) + kick) * (1 + 0.06 * (1 - E.out(clamp(t / 8))));
  const O: Pt = [470, 1395];
  const toFrame = (p: Pt): Pt => [O[0] + (p[0] - O[0]) * zoom, O[1] + (p[1] - O[1]) * zoom];
  // the world, far to near; a verge tree is drawn only when at least 60 px of its crown is inside the frame
  const objs: {z: number; node: React.ReactNode}[] = [];
  let shOuter = '';
  let shCore = '';
  for (const tr of TREES) {
    const z = tr.Zw - d;
    if (z < 2.5 || z > 240) continue;
    if (z > 10 && z < 70) {
      shOuter += blobShadow(v, tr.X, z, tr.h - tr.cr, tr.cr, 1.22);
      shCore += blobShadow(v, tr.X, z, tr.h - tr.cr, tr.cr, 0.86) + stickShadow(v, tr.X, z, tr.h - tr.cr * 1.6, 0.3);
    }
    const [fx] = proj(v, tr.X, z);
    const r = tr.cr * kAt(v, z) * zoom;
    const cx = toFrame([fx, 0])[0];
    const inside = Math.min(W, cx + r) - Math.max(0, cx - r);
    if (inside < 60) continue;
    objs.push({z, node: <SideTree uid={uid} v={v} tr={tr} Z={z} />});
  }
  shCore += stickShadow(v, XP, zPole, 5.3, 0.2) + stickShadow(v, XP - 0.29, zPole, 1.95, 0.42, 1.15);
  shOuter += stickShadow(v, XP, zPole, 5.3, 0.42);
  objs.push({z: zPole, node: <SpeedCam uid={uid} v={v} Z={zPole} t={t} camAt={camAt} boxAt={boxAt} />});
  // our car, from behind, its tail lamps lit, its long shadow toward us
  const [cx, cy] = proj(v, 0.05 * Math.sin(t / 21), ZC);
  const cl = 4.7 * kAt(v, ZC);
  const bob = 1.2 * Math.sin(t / 4.1);
  const lean = 0.8 * Math.sin(t / 26);
  const carShadow = ground(v, [
    [-1.07, ZC],
    [1.07, ZC],
    [1.07 + SUN[0] * 2.2, ZC + SUN[1] * 2.2],
    [-1.07 + SUN[0] * 2.2, ZC + SUN[1] * 2.2],
  ]);
  objs.push({
    z: ZC,
    node: (
      <g>
        <path d={carShadow} fill={`url(#${uid}carsh)`} />
        <Car uid={uid} x={cx} y={cy} len={cl} view="rear" body="coupe" paint="a" frame={t} speed={0.25} bob={bob} lean={lean} lights={{tail: 1}} />
      </g>
    ),
  });
  objs.sort((a, b) => b.z - a.z);
  // the app's own sign, a round crop of the capture (its red ring centred on capture px (986, 547), radius 63)
  const SIGN = {cx: 986, cy: 547, r: 64.5};
  const SX = 215;
  const SY = 380;
  const SD = 184;
  const k = SD / (2 * SIGN.r);
  const sk = sp(t, signAt, 200, 13);
  const float = Math.sin(t / 13) * 3;
  const ck = sp(t, checkAt, 260, 12);
  const cp = prog(t, checkAt, 20);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.bg}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <DefsSvg uid={uid} />
        <defs>
          <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(C.il1, C.il2, 0.45)} />
            <stop offset="0.55" stopColor={mix(C.il0, C.il1, 0.5)} />
            <stop offset="1" stopColor={C.il0} />
          </linearGradient>
          <radialGradient id={`${uid}sun`}>
            <stop offset="0" stopColor={C.il0} stopOpacity={1} />
            <stop offset="0.35" stopColor={C.il0} stopOpacity={0.7} />
            <stop offset="1" stopColor={C.il0} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${uid}haze`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.il0} stopOpacity={0} />
            <stop offset="0.7" stopColor={C.il0} stopOpacity={0.55} />
            <stop offset="1" stopColor={C.il0} stopOpacity={0.75} />
          </linearGradient>
          <linearGradient id={`${uid}carsh`} gradientUnits="userSpaceOnUse" x1={cx} y1={cy} x2={cx - 200} y2={cy + 330}>
            <stop offset="0" stopColor={C.shade} stopOpacity={0.2} />
            <stop offset="1" stopColor={C.shade} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${O[0]} ${O[1]}) scale(${zoom.toFixed(4)}) translate(${-O[0]} ${-O[1]})`}>
          <rect x={-300} y={-500} width={1680} height={v.hy + 510} fill={`url(#${uid}sky)`} />
          <circle cx={760 + v.bend * 0.6} cy={v.hy - 40} r={560} fill={`url(#${uid}sun)`} />
          <g transform={`translate(${v.vx + v.bend} ${v.hy}) scale(0.62) translate(${-(v.vx + v.bend)} ${-v.hy})`} opacity={0.55}>
            <Backdrop kind="city" uid={uid} frame={t} time="day" base={v.hy + 2} drift={0.1} />
          </g>
          <rect x={-300} y={v.hy - 330} width={1680} height={332} fill={`url(#${uid}haze)`} />
          <DayRoad uid={uid} v={v} d={d} shadows={[shOuter, shCore]} />
          {objs.map((o, i) => (
            <React.Fragment key={i}>{o.node}</React.Fragment>
          ))}
        </g>
      </svg>
      {t >= signAt ? (
        <div
          style={{
            position: 'absolute',
            left: SX - SD / 2,
            top: SY - SD / 2 + float,
            width: SD,
            height: SD,
            borderRadius: '50%',
            overflow: 'hidden',
            background: C.il0,
            boxShadow: `0 14px 34px ${rgba(C.shade, 0.22)}`,
            transform: `scale(${sk.toFixed(4)}) rotate(${((1 - sk) * -16).toFixed(2)}deg)`,
          }}
        >
          <Img src={staticFile('screens/17-nav-drive.jpg')} style={{position: 'absolute', left: -(SIGN.cx - SIGN.r) * k, top: -(SIGN.cy - SIGN.r) * k, width: SRC_W * k, height: SRC_H * k}} />
        </div>
      ) : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        {cp > 0 && cp < 1 ? <circle cx={SX} cy={SY + float} r={SD / 2 + 6 + 46 * E.out(cp)} fill="none" stroke={C.ink} strokeWidth={5} opacity={0.5 * (1 - cp)} /> : null}
        {t >= checkAt ? (
          <g transform={`translate(${SX + 66} ${(SY + 66 + float).toFixed(1)}) scale(${ck.toFixed(4)})`}>
            <circle cx={3} cy={6} r={36} fill={C.shade} opacity={0.16} />
            <circle r={36} fill={C.ink} stroke={C.il0} strokeWidth={6} />
            <path d="M-15 1L-4 12L17 -10" fill="none" stroke={C.il0} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
      </svg>
    </div>
  );
};
