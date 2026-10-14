// Ported from the QR promo's kit (kit/street.tsx, 2026-10-14) on 2026-10-15 for the CarNight scene.
// v4 (the owner, 2026-10-14: "a real street around the car"): the street her car stands in, as a world in metres seen by
// the car's own camera (kit/car3d.tsx's CarCam), so the drawn street and the 3D car share one perspective. Her car is at
// the origin, nose to +z, parked against the kerb on its right (+x). The near pavement runs to the right of it; the road,
// its centre line and the far pavement run off to the left; across the road a row of old Tbilisi houses (three to four
// floors, tall windows, wooden balconies with thin rails, shop fronts with awnings), street lamps and plane trees on both
// pavements. The white world's look (day: pale neutral greys, soft ink lines) or the evening (night: dark walls, warm lit
// windows and lamps). Planes are clipped at the camera's near plane, so a wall that runs past the camera never folds.
import React from 'react';
import type {CarCam} from './solidcar';

type P3 = [number, number, number];
type P2 = [number, number];

/** the camera's basis and projection (the same as three's PerspectiveCamera: vertical fov, aspect w / h) */
export const viewOf = (c: CarCam, w = 1080, h = 1920) => {
  const f = [c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]];
  const fl = Math.hypot(f[0], f[1], f[2]) || 1;
  const F = [f[0] / fl, f[1] / fl, f[2] / fl];
  // right = forward x up(0,1,0)
  let R = [-F[2], 0, F[0]];
  const rl = Math.hypot(R[0], R[1], R[2]) || 1;
  R = [R[0] / rl, R[1] / rl, R[2] / rl];
  const Up = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const t = 1 / Math.tan(((c.fov / 2) * Math.PI) / 180);
  const asp = w / h;
  const cam = (p: P3): P3 => {
    const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]];
    return [d[0] * R[0] + d[1] * R[1] + d[2] * R[2], d[0] * Up[0] + d[1] * Up[1] + d[2] * Up[2], d[0] * F[0] + d[1] * F[1] + d[2] * F[2]];
  };
  const scr = (q: P3): P2 => [((q[0] / q[2]) * (t / asp) + 1) * 0.5 * w, (1 - (q[1] / q[2]) * t) * 0.5 * h];
  /** a world polygon, clipped at the near plane, as an SVG path ('' when it is all behind the camera) */
  const poly = (pts: P3[], near = 0.15): string => {
    const q = pts.map(cam);
    const out: P3[] = [];
    for (let i = 0; i < q.length; i++) {
      const a = q[i];
      const b = q[(i + 1) % q.length];
      const ain = a[2] >= near;
      const bin = b[2] >= near;
      if (ain) out.push(a);
      if (ain !== bin) {
        const s = (near - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, near]);
      }
    }
    if (out.length < 2) return '';
    const s2 = out.map(scr);
    return `M${s2.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}${pts.length > 2 ? 'Z' : ''}`;
  };
  const pt = (p: P3): P2 | null => {
    const q = cam(p);
    return q[2] < 0.15 ? null : scr(q);
  };
  const depth = (p: P3) => cam(p)[2];
  return {poly, pt, depth, cam};
};

export type StreetLook = 'day' | 'night';
const PAL = {
  day: {sky: '#F4F4F4', road: '#E4E4E4', roadFar: '#ECECEC', line: '#FFFFFF', kerb: '#CFCFCF', walk: '#EDEDED', walkEdge: '#D8D8D8', wall: ['#E2E2E2', '#D9D9D9', '#E8E8E8', '#DDDDDD'], win: '#C4C8CC', winFrame: '#F6F6F6', shop: '#BFC4C9', ink: '#A9A9A9', ink2: '#C2C2C2', lamp: '#8E8E8E', tree: '#CFCFCF', treeDark: '#BDBDBD', glow: 0},
  night: {sky: '#16131A', road: '#1E1B1E', roadFar: '#242024', line: '#5A544C', kerb: '#3A342F', walk: '#2C2724', walkEdge: '#3E3631', wall: ['#2B2523', '#322A27', '#29231F', '#2E2724'], win: '#2B3442', winFrame: '#3A322C', shop: '#E3964E', ink: '#1A1616', ink2: '#3A332E', lamp: '#1C1A1B', tree: '#1F1C1A', treeDark: '#171513', glow: 1},
};

/** the houses across the road: [z from, z to, floors, wall tone, balconies] */
const HOUSES: [number, number, number, number, boolean][] = [
  [-40, -27, 4, 0, true],
  [-27, -16, 3, 1, false],
  [-16, -4, 4, 2, true],
  [-4, 6, 3, 3, true],
  [6, 17, 4, 1, false],
  [17, 30, 3, 0, true],
  [30, 44, 4, 2, true],
];
const FAR_X = -9.6; // the far facades
const FAR_KERB = -6.2;
const KERB = 1.22;
const NEAR_EDGE = 6.5;
const FLOOR_H = 3.3;

export const Street: React.FC<{cam: CarCam; look?: StreetLook; uid: string; w?: number; h?: number; lit?: number; nearTree?: boolean}> = ({cam, look = 'day', uid, w = 1080, h = 1920, lit = 1, nearTree = true}) => {
  const V = viewOf(cam, w, h);
  const C = PAL[look];
  const id = (n: string) => `st${uid}-${n}`;
  const els: React.ReactNode[] = [];
  const add = (key: string, d: string, fill: string, extra: React.SVGProps<SVGPathElement> = {}) => {
    if (d) els.push(<path key={key} d={d} fill={fill} {...extra} />);
  };
  const Z0 = -60;
  const Z1 = 80;
  // the ground: the far pavement, the road, the near pavement, the kerbs
  add('farwalk', V.poly([[FAR_X, 0.14, Z0], [FAR_X, 0.14, Z1], [FAR_KERB, 0.14, Z1], [FAR_KERB, 0.14, Z0]]), C.walk);
  add('farkerb', V.poly([[FAR_KERB, 0.14, Z0], [FAR_KERB, 0.14, Z1], [FAR_KERB, 0, Z1], [FAR_KERB, 0, Z0]]), C.kerb);
  add('road', V.poly([[FAR_KERB, 0, Z0], [FAR_KERB, 0, Z1], [KERB, 0, Z1], [KERB, 0, Z0]]), C.road);
  // the centre line (dashed) and the parking line
  for (let z = Z0; z < Z1; z += 6) add(`cl${z}`, V.poly([[-2.55, 0.002, z], [-2.55, 0.002, z + 3], [-2.4, 0.002, z + 3], [-2.4, 0.002, z]]), C.line, {opacity: look === 'day' ? 1 : 0.6});
  add('park', V.poly([[KERB - 2.25, 0.002, Z0], [KERB - 2.25, 0.002, Z1], [KERB - 2.17, 0.002, Z1], [KERB - 2.17, 0.002, Z0]]), C.line, {opacity: 0.7});
  add('kerb', V.poly([[KERB, 0, Z0], [KERB, 0, Z1], [KERB, 0.14, Z1], [KERB, 0.14, Z0]]), C.kerb);
  add('walk', V.poly([[KERB, 0.14, Z0], [KERB, 0.14, Z1], [NEAR_EDGE, 0.14, Z1], [NEAR_EDGE, 0.14, Z0]]), C.walk);
  // the pavement's slabs
  for (let z = Z0; z < Z1; z += 1.6) add(`sl${z}`, V.poly([[KERB + 0.2, 0.141, z], [NEAR_EDGE, 0.141, z], [NEAR_EDGE, 0.141, z + 0.03], [KERB + 0.2, 0.141, z + 0.03]]), C.walkEdge, {opacity: 0.8});
  add('kerbtop', V.poly([[KERB, 0.14, Z0], [KERB, 0.14, Z1], [KERB + 0.22, 0.14, Z1], [KERB + 0.22, 0.14, Z0]]), look === 'day' ? '#F7F7F7' : '#4A423C');
  // the houses across the road (their front plane at FAR_X, facing +x)
  HOUSES.forEach(([z0, z1, floors, tone, balc], i) => {
    const top = floors * FLOOR_H + 1.2;
    const wall = C.wall[tone];
    add(`h${i}`, V.poly([[FAR_X, 0, z0], [FAR_X, 0, z1], [FAR_X, top, z1], [FAR_X, top, z0]]), wall);
    // the cornice and the roof's eave
    add(`hc${i}`, V.poly([[FAR_X + 0.3, top - 0.35, z0 - 0.2], [FAR_X + 0.3, top - 0.35, z1 + 0.2], [FAR_X + 0.3, top, z1 + 0.2], [FAR_X + 0.3, top, z0 - 0.2]]), look === 'day' ? '#F2F2F2' : '#3A322D');
    add(`hl${i}`, V.poly([[FAR_X + 0.01, 0, z0], [FAR_X + 0.01, top, z0], [FAR_X + 0.01, top, z0 + 0.06], [FAR_X + 0.01, 0, z0 + 0.06]]), C.ink2);
    // the ground floor: shop fronts under awnings
    const n = Math.max(2, Math.round((z1 - z0) / 4));
    const bw = (z1 - z0) / n;
    for (let j = 0; j < n; j++) {
      const a = z0 + j * bw + 0.5;
      const b = z0 + (j + 1) * bw - 0.5;
      add(`s${i}${j}`, V.poly([[FAR_X + 0.02, 0.3, a], [FAR_X + 0.02, 0.3, b], [FAR_X + 0.02, 2.7, b], [FAR_X + 0.02, 2.7, a]]), C.shop, {opacity: look === 'night' ? 0.45 + 0.35 * ((i + j) % 2) * lit : 1});
      if ((i + j) % 2 === 0) add(`aw${i}${j}`, V.poly([[FAR_X + 0.02, 3.05, a - 0.2], [FAR_X + 0.02, 3.05, b + 0.2], [FAR_X + 1.1, 2.7, b + 0.2], [FAR_X + 1.1, 2.7, a - 0.2]]), look === 'day' ? '#D2D2D2' : '#3A2F28');
      // the upper floors' tall windows
      for (let f = 1; f < floors; f++) {
        const y0 = f * FLOOR_H + 0.7;
        const y1 = y0 + 1.9;
        const wa = z0 + j * bw + bw * 0.28;
        const wb = z0 + (j + 1) * bw - bw * 0.28;
        add(`wf${i}${j}${f}`, V.poly([[FAR_X + 0.02, y0 - 0.12, wa - 0.12], [FAR_X + 0.02, y0 - 0.12, wb + 0.12], [FAR_X + 0.02, y1 + 0.12, wb + 0.12], [FAR_X + 0.02, y1 + 0.12, wa - 0.12]]), C.winFrame);
        const on = look === 'night' && (i * 7 + j * 3 + f) % 3 === 0;
        add(`w${i}${j}${f}`, V.poly([[FAR_X + 0.03, y0, wa], [FAR_X + 0.03, y0, wb], [FAR_X + 0.03, y1, wb], [FAR_X + 0.03, y1, wa]]), on ? '#F0B070' : C.win, {opacity: on ? 0.85 * lit : 1});
        if (balc && f >= 1) {
          // a wooden balcony: its floor slab and a thin rail
          add(`b${i}${j}${f}`, V.poly([[FAR_X, y0 - 0.2, wa - 0.4], [FAR_X, y0 - 0.2, wb + 0.4], [FAR_X + 0.9, y0 - 0.2, wb + 0.4], [FAR_X + 0.9, y0 - 0.2, wa - 0.4]]), C.ink2);
          add(`br${i}${j}${f}`, V.poly([[FAR_X + 0.9, y0 - 0.2, wa - 0.4], [FAR_X + 0.9, y0 - 0.2, wb + 0.4], [FAR_X + 0.9, y0 + 0.75, wb + 0.4], [FAR_X + 0.9, y0 + 0.75, wa - 0.4]]), 'none', {stroke: C.ink, strokeWidth: 1.4, opacity: 0.8});
          for (let r = 0; r <= 6; r++) {
            const z = wa - 0.4 + ((wb - wa + 0.8) * r) / 6;
            const p0 = V.pt([FAR_X + 0.9, y0 - 0.2, z]);
            const p1 = V.pt([FAR_X + 0.9, y0 + 0.75, z]);
            if (p0 && p1) els.push(<line key={`bb${i}${j}${f}${r}`} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={C.ink} strokeWidth={1.1} opacity={0.6} />);
          }
        }
      }
    }
  });
  // a lamp and a plane tree (world x, z): drawn as their projected silhouettes; far side first, then the near side
  const lampAt = (x: number, z: number, key: string) => {
    const b = V.pt([x, 0.14, z]);
    const t = V.pt([x, 5.2, z]);
    const arm = V.pt([x + (x < 0 ? 1 : -1) * 1.1, 5.0, z]);
    if (!b || !t || !arm) return;
    const wpx = Math.max(1.5, (t[1] - b[1]) * -0.012);
    els.push(<line key={`${key}p`} x1={b[0]} y1={b[1]} x2={t[0]} y2={t[1]} stroke={C.lamp} strokeWidth={wpx} strokeLinecap="round" />);
    els.push(<path key={`${key}a`} d={`M${t[0]} ${t[1]}Q${(t[0] + arm[0]) / 2} ${t[1] - wpx * 3} ${arm[0]} ${arm[1]}`} stroke={C.lamp} strokeWidth={wpx * 0.8} fill="none" />);
    els.push(<ellipse key={`${key}h`} cx={arm[0]} cy={arm[1] + wpx * 1.6} rx={wpx * 3.2} ry={wpx * 1.6} fill={look === 'night' ? '#FFE2B0' : C.lamp} />);
    if (look === 'night') els.push(<circle key={`${key}g`} cx={arm[0]} cy={arm[1] + wpx * 2} r={wpx * 40} fill={`url(#${id('glow')})`} opacity={lit} />);
  };
  const treeAt = (x: number, z: number, key: string, s = 1) => {
    const b = V.pt([x, 0.14, z]);
    const t = V.pt([x, 3.4 * s, z]);
    const c = V.pt([x, 5.6 * s, z]);
    const side = V.pt([x, 5.6 * s, z + 2.2 * s]);
    if (!b || !t || !c || !side) return;
    const r = Math.max(8, Math.hypot(side[0] - c[0], side[1] - c[1]));
    const tw = Math.max(2, r * 0.09);
    els.push(<path key={`${key}t`} d={`M${b[0] - tw} ${b[1]}L${t[0] - tw * 0.6} ${t[1]}L${t[0] + tw * 0.6} ${t[1]}L${b[0] + tw} ${b[1]}Z`} fill={C.treeDark} />);
    const blobs: [number, number, number][] = [[0, 0, 1], [-0.62, 0.22, 0.72], [0.6, 0.18, 0.76], [-0.2, -0.5, 0.7], [0.32, -0.42, 0.62], [0, 0.45, 0.66]];
    blobs.forEach(([dx, dy, rr], j) => els.push(<circle key={`${key}c${j}`} cx={c[0] + dx * r} cy={c[1] + dy * r} r={rr * r} fill={j % 2 ? C.tree : C.treeDark} opacity={look === 'day' ? 0.9 : 1} />));
  };
  lampAt(-7.0, -14, 'fl1');
  treeAt(-7.4, -4, 'ft1');
  lampAt(-7.0, 10, 'fl2');
  treeAt(-7.4, 22, 'ft2');
  treeAt(-7.4, -26, 'ft3');
  if (nearTree) {
    treeAt(3.8, -9, 'nt1', 1.1);
    lampAt(2.0, 7.5, 'nl1');
  }
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look === 'day' ? '#FFFFFF' : '#0F0D12'} />
          <stop offset="1" stopColor={C.sky} />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE2B0" stopOpacity={0.55} />
          <stop offset="0.25" stopColor="#FFC27A" stopOpacity={0.18} />
          <stop offset="1" stopColor="#E89A52" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id('sky')})`} />
      {els}
    </svg>
  );
};
