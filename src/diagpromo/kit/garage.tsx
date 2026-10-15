// The garage (act 1 and the callback): a small Tbilisi workshop as a world in metres seen by the car's own camera
// (kit/car3d.tsx's CarCam and kit/street.tsx's viewOf), so the drawn room, the 3D car and the people share one perspective.
// The car stands at the origin, nose to +z, on a two-post lift: the posts flank it at x = +-POST_X, their arms under the
// sills. The room: a dark poured floor with a drain line and soft reflections of the lamps, the back wall (x = -WALL_X)
// with a pegboard of tools and a long workbench, the side wall (z = -WALL_Z) with the roll-up door (closed at night, open
// to a pale morning street in the day look), a tyre stack and a tool chest, two enamel pendant lamps over the car.
//
//   night  the walnut-lamp feel of the studio: warm amber work light from the pendants, deep brown-black walls, every
//          lamp a soft cone and a pool on the floor (no hiss, no flicker: a calm glow)
//   day    the same room in the morning: the roll-up door open, cool daylight on the floor, the pendants off
//
// Two layers: <Garage layer="back"/> under the car's canvas, <Garage layer="front"/> over it (the near post, the near
// lamp's cone). Everything is SVG in frame px, frame-driven, no randomness.
import React from 'react';
import type {CarCam} from './car3d';
import {viewOf} from './street';

type P3 = [number, number, number];

export const POST_X = 1.62;
export const WALL_X = 4.6;
export const WALL_Z = 5.4;
const POST_H = 4.0;
const CEIL = 4.7;

export type GarageLook = 'night' | 'day';
const PAL = {
  night: {
    floor: '#1E1915', floorFar: '#2A221C', wall: '#2C241F', wall2: '#251E1A', wallHi: '#3A2E26', trim: '#14100D', board: '#3B3029', boardHole: '#2A221C',
    tool: '#120F0D', bench: '#4A382B', benchTop: '#6A5040', post: '#3B3836', postHi: '#57524D', arm: '#2C2A28', door: '#2B2521', doorRib: '#221C18',
    tyre: '#141210', tyreHi: '#2C2724', chest: '#5A2A22', chestHi: '#74382C', ceil: '#14100E', lampShade: '#1A1714', lampIn: '#FFD7A0', sky: '#15121A',
  },
  day: {
    floor: '#C9C9C9', floorFar: '#D7D7D7', wall: '#E3E3E3', wall2: '#DADADA', wallHi: '#EDEDED', trim: '#BDBDBD', board: '#D2D2D2', boardHole: '#C2C2C2',
    tool: '#8E8E8E', bench: '#B5B5B5', benchTop: '#CDCDCD', post: '#9C9C9C', postHi: '#BDBDBD', arm: '#8A8A8A', door: '#F4F4F4', doorRib: '#E2E2E2',
    tyre: '#4A4A4A', tyreHi: '#6A6A6A', chest: '#9A9A9A', chestHi: '#B4B4B4', ceil: '#E8E8E8', lampShade: '#7A7A7A', lampIn: '#EFEFEF', sky: '#FAFAFA',
  },
};

/** the two pendant lamps over the car (world), shared with the car's warm point lights */
export const LAMPS: P3[] = [
  [-0.2, 4.15, 2.4],
  [-0.2, 4.15, -1.6],
];

export const Garage: React.FC<{cam: CarCam; look?: GarageLook; uid: string; layer?: 'back' | 'front'; lift?: number; w?: number; h?: number; lit?: number; door?: number; workLamp?: P3 | null}> = ({
  cam,
  look = 'night',
  uid,
  layer = 'back',
  lift = 0.55,
  w = 1080,
  h = 1920,
  lit = 1,
  door,
  workLamp = null,
}) => {
  const V = viewOf(cam, w, h);
  const C = PAL[look];
  const id = (n: string) => `gar${uid}-${n}`;
  const els: React.ReactNode[] = [];
  const add = (key: string, d: string, fill: string, extra: React.SVGProps<SVGPathElement> = {}) => {
    if (d) els.push(<path key={key} d={d} fill={fill} {...extra} />);
  };
  const night = look === 'night';
  const doorOpen = door ?? (night ? 0 : 1);

  // a box (axis-aligned, world) as its visible faces, back to front by the camera's depth
  const box = (key: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, top: string, side: string, front: string, extra: React.SVGProps<SVGPathElement> = {}) => {
    const faces: {d: string; fill: string; depth: number}[] = [];
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    const camP = cam.pos;
    // +x face (toward the camera when the camera's x is larger)
    if (camP[0] > x1) faces.push({d: V.poly([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]), fill: side, depth: V.depth([x1, cy, cz])});
    if (camP[0] < x0) faces.push({d: V.poly([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]), fill: side, depth: V.depth([x0, cy, cz])});
    if (camP[2] > z1) faces.push({d: V.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]), fill: front, depth: V.depth([cx, cy, z1])});
    if (camP[2] < z0) faces.push({d: V.poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]), fill: front, depth: V.depth([cx, cy, z0])});
    if (camP[1] > y1) faces.push({d: V.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), fill: top, depth: V.depth([cx, y1, cz])});
    faces.sort((a, b) => b.depth - a.depth).forEach((f, i) => add(`${key}${i}`, f.d, f.fill, extra));
  };

  if (layer === 'back') {
    // ---- the room: floor, walls, ceiling ----
    add('ceil', V.poly([[-WALL_X, CEIL, -WALL_Z], [9, CEIL, -WALL_Z], [9, CEIL, 14], [-WALL_X, CEIL, 14]]), C.ceil);
    add('floor', V.poly([[-WALL_X, 0, -WALL_Z], [9, 0, -WALL_Z], [9, 0, 14], [-WALL_X, 0, 14]]), `url(#${id('floor')})`);
    // the back wall (x = -WALL_X, facing +x) and the side wall (z = -WALL_Z, facing +z)
    add('wallA', V.poly([[-WALL_X, 0, -WALL_Z], [-WALL_X, 0, 14], [-WALL_X, CEIL, 14], [-WALL_X, CEIL, -WALL_Z]]), C.wall);
    add('wallB', V.poly([[-WALL_X, 0, -WALL_Z], [9, 0, -WALL_Z], [9, CEIL, -WALL_Z], [-WALL_X, CEIL, -WALL_Z]]), C.wall2);
    // a dado: the lower wall a step darker (oil and years), its top edge a thin trim
    add('dadoA', V.poly([[-WALL_X + 0.01, 0, -WALL_Z], [-WALL_X + 0.01, 0, 14], [-WALL_X + 0.01, 1.1, 14], [-WALL_X + 0.01, 1.1, -WALL_Z]]), C.trim, {opacity: night ? 0.35 : 0.12});
    add('dadoB', V.poly([[-WALL_X, 0, -WALL_Z + 0.01], [9, 0, -WALL_Z + 0.01], [9, 1.1, -WALL_Z + 0.01], [-WALL_X, 1.1, -WALL_Z + 0.01]]), C.trim, {opacity: night ? 0.35 : 0.12});
    // the roll-up door in the side wall: its opening, the street beyond (day), the slats (night: shut)
    const dx0 = 1.0;
    const dx1 = 5.6;
    const dTop = 3.3;
    const openY = dTop * doorOpen;
    add('doorFrame', V.poly([[dx0 - 0.12, 0, -WALL_Z + 0.02], [dx1 + 0.12, 0, -WALL_Z + 0.02], [dx1 + 0.12, dTop + 0.14, -WALL_Z + 0.02], [dx0 - 0.12, dTop + 0.14, -WALL_Z + 0.02]]), C.trim);
    add('doorSky', V.poly([[dx0, 0, -WALL_Z + 0.03], [dx1, 0, -WALL_Z + 0.03], [dx1, dTop, -WALL_Z + 0.03], [dx0, dTop, -WALL_Z + 0.03]]), night ? C.sky : `url(#${id('outside')})`);
    if (doorOpen > 0.02) {
      // the morning street seen through the door: a pavement, a far wall with windows, a plane tree's shade
      add('outWalk', V.poly([[dx0, 0, -WALL_Z + 0.04], [dx1, 0, -WALL_Z + 0.04], [dx1, 0.5, -WALL_Z + 0.04], [dx0, 0.5, -WALL_Z + 0.04]]), night ? '#1C1A1E' : '#E9E9E9');
      for (let i = 0; i < 4; i++) {
        const a = dx0 + 0.45 + i * 1.15;
        add(`outWin${i}`, V.poly([[a, 1.2, -WALL_Z + 0.045], [a + 0.6, 1.2, -WALL_Z + 0.045], [a + 0.6, 2.5, -WALL_Z + 0.045], [a, 2.5, -WALL_Z + 0.045]]), night ? '#2A2630' : '#DCDCDC');
      }
    }
    if (doorOpen < 0.999) {
      add('door', V.poly([[dx0, openY, -WALL_Z + 0.05], [dx1, openY, -WALL_Z + 0.05], [dx1, dTop, -WALL_Z + 0.05], [dx0, dTop, -WALL_Z + 0.05]]), C.door);
      for (let y = openY + 0.18; y < dTop; y += 0.22)
        add(`rib${y.toFixed(2)}`, V.poly([[dx0, y, -WALL_Z + 0.055], [dx1, y, -WALL_Z + 0.055], [dx1, y + 0.025, -WALL_Z + 0.055], [dx0, y + 0.025, -WALL_Z + 0.055]]), C.doorRib);
    }
    if (!night) {
      // daylight through the open door lies on the floor as a soft trapezoid
      add('sunPool', V.poly([[dx0, 0.002, -WALL_Z], [dx1, 0.002, -WALL_Z], [dx1 + 1.4, 0.002, -WALL_Z + 4.6], [dx0 - 0.6, 0.002, -WALL_Z + 4.6]]), '#FFFFFF', {opacity: 0.55});
    }
    // ---- the pegboard and its tools on the back wall ----
    const bz0 = -3.6;
    const bz1 = 4.4;
    add('board', V.poly([[-WALL_X + 0.02, 1.35, bz0], [-WALL_X + 0.02, 1.35, bz1], [-WALL_X + 0.02, 2.65, bz1], [-WALL_X + 0.02, 2.65, bz0]]), C.board);
    // tool silhouettes: wrenches (a long bar with a ring), hammers, pliers; graded by size
    const TOOLS: [number, number, number, 'wrench' | 'hammer' | 'pliers'][] = [];
    for (let i = 0; i < 9; i++) TOOLS.push([bz0 + 0.35 + i * 0.16, 2.48, 0.32 + i * 0.035, 'wrench']);
    TOOLS.push([bz0 + 2.0, 2.45, 0.5, 'hammer'], [bz0 + 2.35, 2.45, 0.46, 'hammer'], [bz0 + 2.75, 2.42, 0.4, 'pliers'], [bz0 + 3.05, 2.42, 0.38, 'pliers']);
    for (let i = 0; i < 7; i++) TOOLS.push([bz0 + 3.45 + i * 0.2, 2.5, 0.28 + 0.03 * (i % 3), 'wrench']);
    TOOLS.push([bz0 + 5.2, 2.45, 0.5, 'hammer'], [bz0 + 5.6, 2.42, 0.42, 'pliers']);
    for (let i = 0; i < 8; i++) TOOLS.push([bz0 + 6.1 + i * 0.16, 2.48, 0.3 + i * 0.03, 'wrench']);
    TOOLS.forEach(([z, y, len, kind], i) => {
      const X = -WALL_X + 0.03;
      if (kind === 'wrench') {
        add(`tw${i}`, V.poly([[X, y - len, z - 0.018], [X, y - len, z + 0.018], [X, y, z + 0.018], [X, y, z - 0.018]]), C.tool);
        add(`twh${i}`, V.poly([[X, y - 0.02, z - 0.05], [X, y - 0.02, z + 0.05], [X, y + 0.06, z + 0.05], [X, y + 0.06, z - 0.05]]), C.tool);
        add(`twb${i}`, V.poly([[X, y - len - 0.05, z - 0.04], [X, y - len - 0.05, z + 0.04], [X, y - len + 0.02, z + 0.04], [X, y - len + 0.02, z - 0.04]]), C.tool);
      } else if (kind === 'hammer') {
        add(`th${i}`, V.poly([[X, y - len, z - 0.02], [X, y - len, z + 0.02], [X, y, z + 0.02], [X, y, z - 0.02]]), C.tool);
        add(`thh${i}`, V.poly([[X, y - 0.05, z - 0.11], [X, y - 0.05, z + 0.11], [X, y + 0.04, z + 0.11], [X, y + 0.04, z - 0.11]]), C.tool);
      } else {
        add(`tp${i}`, V.poly([[X, y - len, z - 0.05], [X, y - len, z - 0.02], [X, y, z + 0.015], [X, y, z - 0.015]]), C.tool);
        add(`tq${i}`, V.poly([[X, y - len, z + 0.02], [X, y - len, z + 0.05], [X, y, z + 0.015], [X, y, z - 0.015]]), C.tool);
      }
    });
    // ---- the workbench under the board: its top, its front with drawers ----
    box('bench', -WALL_X, -WALL_X + 0.75, 0, 0.92, -3.8, 4.6, C.benchTop, C.bench, C.bench);
    for (let i = 0; i < 6; i++) {
      const z0 = -3.6 + i * 1.32;
      add(`dr${i}`, V.poly([[-WALL_X + 0.76, 0.5, z0], [-WALL_X + 0.76, 0.5, z0 + 1.15], [-WALL_X + 0.76, 0.82, z0 + 1.15], [-WALL_X + 0.76, 0.82, z0]]), C.trim, {opacity: 0.5});
      add(`drh${i}`, V.poly([[-WALL_X + 0.77, 0.7, z0 + 0.45], [-WALL_X + 0.77, 0.7, z0 + 0.7], [-WALL_X + 0.77, 0.73, z0 + 0.7], [-WALL_X + 0.77, 0.73, z0 + 0.45]]), C.postHi, {opacity: 0.8});
    }
    // a vice and a parts tray on the bench
    box('vice', -WALL_X + 0.2, -WALL_X + 0.55, 0.92, 1.12, -2.9, -2.55, C.postHi, C.post, C.post);
    box('tray', -WALL_X + 0.15, -WALL_X + 0.6, 0.92, 0.99, -0.4, 0.4, C.postHi, C.arm, C.arm);
    // ---- the tool chest against the side wall, and a tyre stack ----
    box('chest', -3.4, -2.2, 0, 1.25, -WALL_Z, -WALL_Z + 0.62, C.chestHi, C.chest, C.chest);
    for (let i = 0; i < 5; i++) {
      const y0 = 0.08 + i * 0.23;
      add(`chd${i}`, V.poly([[-3.36, y0 + 0.18, -WALL_Z + 0.63], [-2.24, y0 + 0.18, -WALL_Z + 0.63], [-2.24, y0 + 0.2, -WALL_Z + 0.63], [-3.36, y0 + 0.2, -WALL_Z + 0.63]]), C.chestHi, {opacity: 0.9});
    }
    for (let i = 0; i < 4; i++) {
      const y0 = i * 0.24;
      box(`tyre${i}`, -1.6, -0.95, y0, y0 + 0.22, -WALL_Z + 0.1, -WALL_Z + 0.75, C.tyreHi, C.tyre, C.tyre);
    }
    // ---- the lamps' light on the floor: warm pools under the pendants (night) ----
    if (night) {
      LAMPS.forEach((L, i) => {
        const c = V.pt([L[0], 0, L[2]]);
        const r = V.pt([L[0] + 2.6, 0, L[2]]);
        if (c && r) els.push(<ellipse key={`pool${i}`} cx={c[0]} cy={c[1]} rx={Math.abs(r[0] - c[0]) * 1.1 + 160} ry={Math.max(60, Math.abs(r[0] - c[0]) * 0.42)} fill={`url(#${id('pool')})`} opacity={lit} />);
      });
    }
    // ---- the far post of the lift and its arms (behind the car) ----
    const post = (key: string, x: number) => {
      box(`${key}col`, x - 0.14, x + 0.14, 0, POST_H, -0.2, 0.2, C.postHi, C.post, C.postHi);
      // the carriage at the lift's height and its two arms reaching under the sill
      const sill = Math.sign(x) * 0.78;
      box(`${key}car`, x - 0.18, x + 0.18, lift - 0.12, lift + 0.12, -0.24, 0.24, C.postHi, C.arm, C.arm);
      box(`${key}armF`, Math.min(x, sill), Math.max(x, sill), lift - 0.06, lift - 0.0, 0.18, 0.95, C.arm, C.arm, C.arm);
      box(`${key}armR`, Math.min(x, sill), Math.max(x, sill), lift - 0.06, lift - 0.0, -1.05, -0.2, C.arm, C.arm, C.arm);
      box(`${key}base`, x - 0.3, x + 0.3, 0, 0.04, -0.34, 0.34, C.post, C.arm, C.arm);
    };
    post('pf', -POST_X);
    // the overhead beam between the posts (behind the car's roof line from this side)
    box('beam', -POST_X, POST_X, POST_H - 0.18, POST_H, -0.12, 0.12, C.postHi, C.post, C.post);
    // the pendants: a cord, an enamel cone, a warm bulb (night), the glow round it
    LAMPS.forEach((L, i) => {
      const top = V.pt([L[0], CEIL, L[2]]);
      const a = V.pt([L[0], L[1], L[2]]);
      const rr = V.pt([L[0], L[1], L[2] + 0.32]);
      if (!top || !a || !rr) return;
      const r = Math.max(10, Math.abs(rr[0] - a[0]) + Math.abs(rr[1] - a[1]));
      els.push(<line key={`cord${i}`} x1={top[0]} y1={top[1]} x2={a[0]} y2={a[1]} stroke={C.trim} strokeWidth={Math.max(1.5, r * 0.05)} />);
      els.push(<path key={`shade${i}`} d={`M${a[0] - r * 0.22} ${a[1]}L${a[0] + r * 0.22} ${a[1]}L${a[0] + r} ${a[1] + r * 0.55}Q${a[0]} ${a[1] + r * 0.7} ${a[0] - r} ${a[1] + r * 0.55}Z`} fill={C.lampShade} />);
      if (night) {
        els.push(<ellipse key={`bulb${i}`} cx={a[0]} cy={a[1] + r * 0.6} rx={r * 0.78} ry={r * 0.14} fill={C.lampIn} opacity={0.95 * lit} />);
        els.push(<circle key={`glow${i}`} cx={a[0]} cy={a[1] + r * 0.62} r={r * 5} fill={`url(#${id('glow')})`} opacity={0.9 * lit} />);
      }
    });
  } else {
    // ---- the near post (over the car) ----
    box('pncol', POST_X - 0.14, POST_X + 0.14, 0, POST_H, -0.2, 0.2, C.postHi, C.post, C.postHi);
    const sill = 0.78;
    box('pncar', POST_X - 0.18, POST_X + 0.18, lift - 0.12, lift + 0.12, -0.24, 0.24, C.postHi, C.arm, C.arm);
    box('pnbase', POST_X - 0.3, POST_X + 0.3, 0, 0.04, -0.34, 0.34, C.post, C.arm, C.arm);
    void sill;
    if (workLamp) {
      // the mechanic's work lamp hung under the car: a slim warm tube in a cage, its cable up to the sill, a soft glow
      const a = V.pt(workLamp);
      const b = V.pt([workLamp[0], workLamp[1] - 0.42, workLamp[2]]);
      const hook = V.pt([workLamp[0], lift, workLamp[2]]);
      if (a && b && hook) {
        const r = Math.max(6, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.16);
        els.push(<line key="wlc" x1={hook[0]} y1={hook[1]} x2={a[0]} y2={a[1]} stroke="#0E0B09" strokeWidth={Math.max(1.5, r * 0.25)} />);
        els.push(<circle key="wlg" cx={(a[0] + b[0]) / 2} cy={(a[1] + b[1]) / 2} r={r * 16} fill={`url(#${id('glow')})`} opacity={0.95 * lit} />);
        els.push(<line key="wlt" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#FFE6BE" strokeWidth={r * 1.4} strokeLinecap="round" opacity={lit} />);
        els.push(<line key="wlk" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#3A2C22" strokeWidth={r * 1.9} strokeLinecap="round" strokeDasharray={`${r * 0.35} ${r * 1.2}`} opacity={0.8} />);
      }
    }
    if (night) {
      // the warm light's haze in the air under the near lamp (a soft cone, very faint)
      const L = LAMPS[0];
      const a = V.pt([L[0], L[1], L[2]]);
      const f0 = V.pt([L[0] - 1.6, 0.2, L[2]]);
      const f1 = V.pt([L[0] + 1.6, 0.2, L[2]]);
      if (a && f0 && f1) els.push(<path key="cone" d={`M${a[0] - 18} ${a[1] + 20}L${a[0] + 18} ${a[1] + 20}L${f1[0]} ${f1[1]}L${f0[0]} ${f0[1]}Z`} fill={`url(#${id('cone')})`} opacity={0.5 * lit} />);
    }
  }

  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id={id('floor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.floorFar} />
          <stop offset="1" stopColor={C.floor} />
        </linearGradient>
        <linearGradient id={id('outside')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F1F1" />
        </linearGradient>
        <radialGradient id={id('pool')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F6B46A" stopOpacity={0.34} />
          <stop offset="0.45" stopColor="#E59A52" stopOpacity={0.12} />
          <stop offset="1" stopColor="#E59A52" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE0B0" stopOpacity={0.55} />
          <stop offset="0.18" stopColor="#FFC27A" stopOpacity={0.2} />
          <stop offset="1" stopColor="#E89A52" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('cone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity={0.22} />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
        </linearGradient>
      </defs>
      {els}
    </svg>
  );
};
