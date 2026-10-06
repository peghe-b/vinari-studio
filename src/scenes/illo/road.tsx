// src/scenes/illo/road.tsx: the road seen from a car (the "Graphite" kit, for Windshield, Drive's rear staging and a call
// in a dashboard mount): a real perspective, so lanes, posts and other cars stream toward the camera at the right speed.
//
//   view(o)              a projection: horizon y `hy`, vanishing x `vx` (a turn slides it), camera height `h` (m) and focal
//                        length `fp` (px); pt(X, Z) puts a ground point X metres to the right and Z metres ahead on the stage
//   <Road v d time lanes edge/>   the asphalt to the horizon, the edge lines, the dashed lane lines streaming by (`d` metres
//                        travelled), reflector posts on both sides, the verges; at night the headlights' pool on the road
//   <CarAhead v X Z .../>       a kit Car seen from behind at a point of the road (rear view, sized by its distance)
//   <Cabin uid time wheel hands turn mirror/>   the near plane of the driver's view: the roof liner, the A-pillars, the
//                        mirror, the dashboard top with a faint reflection and the wheel's upper arc with two hands at 10 and
//                        2 (Figure's Hand); `turn` turns the wheel (degrees)
//   <Wipers uid sweep/>  two blades from the cowl; sweep 0..1 is the arm's angle (-70 -> +10 deg)
//
// Pure drawing code, frame-driven, deterministic, colours only from C through palette.ts.
import React from 'react';
import {C, isLight} from '../../tokens';
import {Car, type CarBody, type CarLights} from './car';
import {Hand} from './figure';
import {dark, glowK, ground, mix, near, tone, type Time} from './palette';
import {FOOT, TOP} from './scene';
import {circ, paint, poly, rr, Solid} from './solid';

export type View = {hy: number; vx: number; h: number; fp: number; bend?: number};
export const view = (o: Partial<View> = {}): View => ({hy: 760, vx: 540, h: 1.25, fp: 1000, bend: 0, ...o});

/** A ground point X m right, Z m ahead -> stage px. `bend` (px) curves the far road toward one side (a turn). */
export const pt = (v: View, X: number, Z: number): [number, number] => {
  const z = Math.max(0.3, Z);
  const curve = (v.bend ?? 0) * Math.max(0, 1 - 6 / z);
  return [v.vx + curve + (X * v.fp) / z, v.hy + (v.h * v.fp) / z];
};
/** Stage px per metre at distance Z. */
export const scaleAt = (v: View, Z: number) => v.fp / Math.max(0.3, Z);

const quad = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]) => poly([a, b, c, d]);

/** The road's tones on this ground. */
export const roadTones = (time: Time) => {
  const dk = dark(time);
  return {
    asphalt: dk ? (time === 'night' ? mix(C.il7, ground(time), 0.25) : C.il7) : C.il4,
    asphaltFar: dk ? mix(C.il7, ground(time), 0.6) : mix(C.il4, C.il2, 0.7),
    verge: dk ? mix(C.il7, ground(time), 0.45) : C.il2,
    line: dk ? (time === 'night' ? C.il2 : C.il3) : C.il0,
    post: dk ? C.il5 : C.il1,
  };
};

type RoadP = {v: View; d: number; time?: Time; lanes?: number[]; edges?: [number, number]; dash?: [number, number]; posts?: number[]; far?: number; beam?: number; uid: string; postEvery?: number};
/** The road from the camera to the horizon. `lanes`: X of dashed lines; `edges`: X of the two solid edge lines. */
export const Road: React.FC<RoadP> = ({v, d, time = 'day', lanes = [-1.8], edges = [-5.4, 1.9], dash = [3, 9], posts = [-7.2, 3.6], far: zFar = 220, beam = 0, uid, postEvery = 25}) => {
  const t = roadTones(time);
  const zN = 1.1;
  const edgeL = edges[0] - 0.4;
  const edgeR = edges[1] + 1.2;
  // the asphalt in slices (near ones a step lighter by day: the key light grazes the near road)
  const slices: React.ReactNode[] = [];
  const zs = [zN, 4, 10, 25, 60, zFar];
  for (let i = 0; i < zs.length - 1; i++) {
    const a = zs[i];
    const b = zs[i + 1];
    const col = mix(t.asphalt, t.asphaltFar, i / (zs.length - 2));
    slices.push(<path key={`s${i}`} d={quad(pt(v, edgeL, a), pt(v, edgeR, a), pt(v, edgeR, b), pt(v, edgeL, b))} fill={col} />);
  }
  // verges: from the road's edge outward
  const vergeL = quad(pt(v, -60, zN), pt(v, edgeL, zN), pt(v, edgeL, zFar), pt(v, -60, zFar));
  const vergeR = quad(pt(v, edgeR, zN), pt(v, 60, zN), pt(v, 60, zFar), pt(v, edgeR, zFar));
  // solid edge lines (0.15 m), dashed lane lines
  const lineW = 0.14;
  let solid = '';
  for (const X of edges) {
    for (let i = 0; i < zs.length - 1; i++) solid += quad(pt(v, X - lineW / 2, zs[i]), pt(v, X + lineW / 2, zs[i]), pt(v, X + lineW / 2, zs[i + 1]), pt(v, X - lineW / 2, zs[i + 1]));
  }
  let dashes = '';
  const [dl, dp] = dash;
  const off = ((d % dp) + dp) % dp;
  for (const X of lanes) {
    for (let k = 0; k < 30; k++) {
      const z0 = zN + k * dp - off;
      const z1 = z0 + dl;
      if (z1 < zN) continue;
      if (z0 > 140) break;
      const a = Math.max(zN, z0);
      dashes += quad(pt(v, X - lineW / 2, a), pt(v, X + lineW / 2, a), pt(v, X + lineW / 2, z1), pt(v, X - lineW / 2, z1));
    }
  }
  // reflector posts: 1 m tall, every postEvery m, a light band near the top
  let postD = '';
  let capD = '';
  const poff = ((d % postEvery) + postEvery) % postEvery;
  for (const X of posts) {
    for (let k = 0; k < 12; k++) {
      const z = zN + 1 + k * postEvery - poff;
      if (z < 1.6 || z > 160) continue;
      const [x, y] = pt(v, X, z);
      const s = scaleAt(v, z);
      const w = Math.max(1.5, 0.12 * s);
      postD += rr(x - w / 2, y - 1.0 * s, w, 1.0 * s, w * 0.3);
      capD += rr(x - w / 2, y - 0.92 * s, w, 0.12 * s, 0);
    }
  }
  const [bx, by] = pt(v, 0, 9);
  return (
    <g>
      <path d={vergeL + vergeR} fill={t.verge} />
      {slices}
      {beam > 0 ? <ellipse cx={bx} cy={by} rx={scaleAt(v, 9) * 3.4} ry={scaleAt(v, 9) * 0.55} fill={paint(uid, 'glow-ink')} opacity={0.22 * beam * glowK(time)} /> : null}
      <path d={solid} fill={t.line} opacity={0.9} />
      <path d={dashes} fill={t.line} />
      <path d={postD} fill={t.post} />
      <path d={capD} fill={time === 'night' ? C.il0 : tone(dark(time) ? 2 : 4)} />
    </g>
  );
};

/** A kit Car seen from behind (or its front) at a point of the road, sized by its distance. */
export const CarAhead: React.FC<{v: View; X: number; Z: number; uid: string; frame: number; body?: CarBody; paint?: number; lights?: CarLights; time?: Time; front?: boolean; lean?: number; seed?: number}> = ({
  v,
  X,
  Z,
  uid,
  frame,
  body = 'sedan',
  paint: pn = 3,
  lights,
  time = 'day',
  front,
  lean,
  seed,
}) => {
  const [x, y] = pt(v, X, Z);
  const len = 4.7 * scaleAt(v, Z);
  if (len < 6) return null;
  return <Car uid={uid} x={x} y={y} len={len} view={front ? 'front' : 'rear'} body={body} paint={pn} frame={frame} lights={lights} time={time} lean={lean} seed={seed} />;
};

/** The near plane of the driver's view. */
export const Cabin: React.FC<{uid: string; time?: Time; turn?: number; frame: number; mirror?: boolean; hands?: boolean; glow?: number; sleeve?: number}> = ({uid, time = 'day', turn = 0, frame, mirror = true, hands = true, glow = 0, sleeve = 4}) => {
  const nt = near(time);
  const dk = dark(time);
  const deep = dk ? mix(C.il7, ground(time), 0.35) : C.il2;
  const top = 370;
  // the roof liner: from the top of the picture (full bleed: the frame's top, TOP) down to a soft curved lower edge
  const roof = `M-40 ${TOP}H1120V${top + 70}C860 ${top + 118} 220 ${top + 118} -40 ${top + 70}Z`;
  // the A-pillars: wedges leaning in from the corners
  const pillarL = `M-40 ${top + 60}C60 ${top + 90} 120 ${top + 110} 150 ${top + 120}L70 1190L-40 1210Z`;
  const pillarR = `M1120 ${top + 60}C1020 ${top + 90} 960 ${top + 110} 930 ${top + 120}L1010 1190L1120 1210Z`;
  // the dashboard top: a wide soft hump, the instrument hood over the wheel, down past the picture's foot (FOOT)
  const dash = `M-40 1170C200 1140 380 1132 540 1132C700 1132 880 1140 1120 1170V${FOOT}H-40Z`;
  const hood = `M300 1150C340 1100 420 1088 540 1088C660 1088 740 1100 780 1150Z`;
  // the wheel: an upper arc of a ring, turned
  const cx = 540;
  const cy = 1470;
  const R = 360;
  const r = 318;
  // the whole wheel (full bleed shows its lower half too: the band used to cut it at 1380): the rim as a ring, a hub and
  // three spokes turned with it
  const ring = `M${cx - R} ${cy}A${R} ${R} 0 1 1 ${cx + R} ${cy}A${R} ${R} 0 1 1 ${cx - R} ${cy}ZM${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  const spokes = `${rr(cx - r - 6, cy - 22, 2 * r + 12, 44, 18)}${rr(cx - 26, cy, 52, r + 6, 18)}${circ(cx, cy, 92)}`;
  const a = (deg: number) => ((deg - 90 + turn) * Math.PI) / 180;
  const handAt = (deg: number): [number, number] => [cx + 339 * Math.cos(a(deg)), cy + 339 * Math.sin(a(deg))];
  const [lx, ly] = handAt(-58);
  const [rx, ry] = handAt(58);
  return (
    <g>
      <Solid uid={uid} d={roof} tone={dk ? 7 : 1} shade="flat" fill={nt} time={time} />
      <Solid uid={uid} d={pillarL} tone={7} fill={nt} time={time} rim />
      <Solid uid={uid} d={pillarR} tone={7} fill={nt} time={time} />
      {mirror ? (
        <g>
          <path d={rr(528, top + 60, 24, 60, 8)} fill={deep} />
          <Solid uid={uid} d={rr(400, top + 104, 280, 74, 30)} tone={6} fill={dk ? C.il6 : C.il3} time={time} rim outline />
          <path d={rr(414, top + 116, 252, 50, 22)} fill={dk ? mix(C.il7, ground(time), 0.5) : C.il4} />
          <path d={`M430 ${top + 156}L470 ${top + 120}H500L460 ${top + 156}Z`} fill={C.il0} opacity={dk ? 0.08 : 0.25} />
        </g>
      ) : null}
      <Solid uid={uid} d={dash} tone={7} fill={nt} time={time} rim />
      {/* the windshield's base reflects the dash: a faint lighter band */}
      <path d={`M60 1150C260 1128 420 1122 540 1122C660 1122 820 1128 1020 1150L1020 1158C820 1138 660 1132 540 1132C420 1132 260 1138 60 1158Z`} fill={C.il0} opacity={dk ? 0.05 : 0.35} />
      <Solid uid={uid} d={hood} tone={7} fill={deep} time={time} />
      {glow > 0 ? <ellipse cx={540} cy={1135} rx={260} ry={40} fill={paint(uid, 'glow-ink')} opacity={0.15 * glow * glowK(time)} /> : null}
      <g>
        <Solid uid={uid} d={spokes} tone={dk ? 6 : 5} time={time} transform={`rotate(${turn.toFixed(2)} ${cx} ${cy})`} />
        <Solid uid={uid} d={ring} tone={dk ? 6 : 5} time={time} rim outline />
        {hands ? (
          <>
            <Hand uid={uid} kind="grip" x={lx - 30} y={ly + 70} angle={-150 + turn * 0.6} scale={21} side="l" arm={13} sleeve={sleeve} time={time} />
            <Hand uid={uid} kind="grip" x={rx + 30} y={ry + 70} angle={150 + turn * 0.6} scale={21} side="r" arm={13} sleeve={sleeve} time={time} />
          </>
        ) : null}
      </g>
    </g>
  );
};

/** Two wiper blades from the cowl; sweep 0 rests flat, 1 stands up (the arm's angle -70 -> +10 deg from vertical). */
export const Wipers: React.FC<{uid: string; sweep: number; time?: Time}> = ({uid, sweep, time = 'day'}) => {
  const ang = -78 + 82 * sweep; // degrees from vertical, negative = leaning left
  const arm = (px: number, py: number, len: number) => {
    const a = (ang * Math.PI) / 180;
    const ex = px + Math.sin(a) * len;
    const ey = py - Math.cos(a) * len;
    const nx = Math.cos(a) * 7;
    const ny = Math.sin(a) * 7;
    // the blade: a long thin rounded bar along the arm's last 80 %
    const bx0 = px + Math.sin(a) * len * 0.12;
    const by0 = py - Math.cos(a) * len * 0.12;
    return (
      <g>
        <path d={quad([px - nx * 0.6, py - ny * 0.6], [ex - nx * 0.6, ey - ny * 0.6], [ex + nx * 0.6, ey + ny * 0.6], [px + nx * 0.6, py + ny * 0.6])} fill={tone(6)} />
        <path d={quad([bx0 - nx, by0 - ny], [ex - nx, ey - ny], [ex + nx, ey + ny], [bx0 + nx, by0 + ny])} fill={dark(time) ? C.il6 : C.il5} />
      </g>
    );
  };
  void uid;
  return (
    <g>
      {arm(230, 1150, 470)}
      {arm(640, 1150, 470)}
    </g>
  );
};

/** Frames since a wiper blade last passed over (x, y) (Infinity when never): the Drops' `age`. */
export const wiperAge = (x: number, y: number, frame: number, start: number, period: number, len = 14) => {
  // the blade's angle sweeps up over len frames, rests, sweeps back down: it passes a point twice a period
  const pivots: [number, number][] = [
    [230, 1150],
    [640, 1150],
  ];
  let best = Infinity;
  for (const [px, py] of pivots) {
    const r = Math.hypot(x - px, y - py);
    if (r > 470 || y > py) continue;
    const angle = (Math.atan2(x - px, py - y) * 180) / Math.PI; // from vertical
    const s = (angle + 78) / 82; // the sweep value at which the blade passes this point
    if (s < 0 || s > 1) continue;
    for (let k = Math.floor((frame - start) / period); k >= Math.max(0, Math.floor((frame - start) / period) - 1); k--) {
      const t0 = start + k * period;
      const up = t0 + s * len;
      const down = t0 + len + 4 + (1 - s) * len;
      for (const pass of [down, up]) if (pass <= frame) best = Math.min(best, frame - pass);
    }
  }
  return best;
};
/** The wipers' sweep 0..1 at a frame: up over len frames, a 4-frame rest, back down, then parked until the next period. */
export const wiperSweep = (frame: number, start: number, period: number, len = 14) => {
  if (frame < start) return 0;
  const q = (frame - start) % period;
  const e = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  if (q < len) return e(q / len);
  if (q < len + 4) return 1;
  if (q < 2 * len + 4) return 1 - e((q - len - 4) / len);
  return 0;
};

export const isPaper = () => isLight();
