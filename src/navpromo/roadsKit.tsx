// The road shots' kit (round, lane, camera; the owner, 2026-10-12, on the white line-art roads: "these graphics are
// terrible", "it all needs refining"): a day world in the studio's Graphite greys, so it sits with the white end card.
//   from above   light grass, a mid-grey asphalt with white paint, pale pavements on a kerb line, trees as soft balls of
//                foliage, roofs in two or four planes; one key light from the top left, so every shadow falls to the lower
//                right (the kit's own cars throw theirs the same way)
//   the route    the navigator's own line, ink on a white casing, as the app draws it (17-nav-drive)
//   the badges   the exits' numbers: a white pin with a soft shadow; the one that matters fills with the film's cobalt
//   the camera   a world point mapped to a screen anchor with a push, a turn and the punch on the cut (Forest's 6 %)
// Pure drawing code, frame-driven, deterministic, colours only from C.
import React, {useId} from 'react';
import {C, F} from '../tokens';
import {mix} from '../scenes/illo/palette';
import {circ, DefsSvg, Solid} from '../scenes/illo/solid';
import {clamp, E, H, lerp, W, type Pt} from './lib';
import {jit} from './refined';

export const useUid = () => useId().replace(/[^A-Za-z0-9]/g, '');

/** the day world from above: rough grass a step darker than the mown lawns, the pale pavement, the asphalt (2026-10-12, the
 *  critic: grass and pavement read as one grey; now each material has its own value) */
export const topTones = () => ({
  grass: mix(C.il2, C.il3, 0.2),
  grass2: mix(C.il1, C.il2, 0.55),
  lawn: mix(C.il1, C.il2, 0.5),
  hedge: mix(C.il3, C.il4, 0.55),
  pave: mix(C.il0, C.il1, 0.55),
  kerb: mix(C.il2, C.il3, 0.7),
  asphalt: mix(C.il3, C.il4, 0.5),
  paint: C.il0,
});

/** the ground's defs: soft mottling for the rough grass (a seamless tile of blurred blobs, lighter and darker) */
export const GroundDefs: React.FC<{uid: string}> = ({uid}) => {
  const TS = 620;
  const blobs: {x: number; y: number; rx: number; ry: number; dk: boolean}[] = [];
  for (let i = 0; i < 11; i++) blobs.push({x: jit(i, 61) * TS, y: jit(i, 62) * TS, rx: 70 + 90 * jit(i, 63), ry: 50 + 70 * jit(i, 64), dk: i % 3 !== 0});
  return (
    <defs>
      <radialGradient id={`${uid}blobDk`}>
        <stop offset="0" stopColor={C.il4} stopOpacity={0.2} />
        <stop offset="0.6" stopColor={C.il4} stopOpacity={0.08} />
        <stop offset="1" stopColor={C.il4} stopOpacity={0} />
      </radialGradient>
      <radialGradient id={`${uid}blobLt`}>
        <stop offset="0" stopColor={C.il0} stopOpacity={0.3} />
        <stop offset="1" stopColor={C.il0} stopOpacity={0} />
      </radialGradient>
      <pattern id={`${uid}mottle`} width={TS} height={TS} patternUnits="userSpaceOnUse">
        {blobs.flatMap((b, i) =>
          [-1, 0, 1].flatMap((ox) =>
            [-1, 0, 1].map((oy) => <ellipse key={`${i}${ox}${oy}`} cx={b.x + ox * TS} cy={b.y + oy * TS} rx={b.rx} ry={b.ry} fill={`url(#${uid}${b.dk ? 'blobDk' : 'blobLt'})`} />),
          ),
        )}
      </pattern>
    </defs>
  );
};
/** rough grass over a rect, mottled */
export const Grass: React.FC<{uid: string; x: number; y: number; w: number; h: number}> = ({uid, x, y, w, h}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={topTones().grass} />
    <rect x={x} y={y} width={w} height={h} fill={`url(#${uid}mottle)`} />
  </g>
);
/** a garden: a mown lawn with faint mowing stripes, a clipped hedge round it (a row of round shrubs, a gap for the gate),
 *  now and then a paved parking pad (x, y, w, h in the garden's own frame) */
export const Garden: React.FC<{x: number; y: number; w: number; h: number; rot?: number; seed?: number; pad?: [number, number, number, number]}> = ({x, y, w, h, rot = 0, seed = 1, pad}) => {
  const T = topTones();
  const hw = w / 2;
  const hh = h / 2;
  let stripes = '';
  for (let k = -hw + 22; k < hw; k += 44) stripes += `M${k.toFixed(1)} ${(-hh + 6).toFixed(1)}h22v${(h - 12).toFixed(1)}h-22Z`;
  const gap = 0.25 + 0.5 * jit(seed, 31);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)})`}>
      <rect x={-hw} y={-hh} width={w} height={h} rx={10} fill={T.lawn} />
      <path d={stripes} fill={C.il0} opacity={0.18} />
      {pad ? <rect x={pad[0] - pad[2] / 2} y={pad[1] - pad[3] / 2} width={pad[2]} height={pad[3]} rx={6} fill={T.pave} stroke={T.kerb} strokeWidth={2} /> : null}
      <path
        d={`M${(-hw + w * gap).toFixed(1)} ${-hh}H${hw}V${hh}H${-hw}V${-hh}H${(-hw + w * gap - 46).toFixed(1)}`}
        fill="none"
        stroke={C.shade}
        strokeOpacity={0.12}
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.1 13"
        transform="translate(4 5)"
      />
      <path
        d={`M${(-hw + w * gap).toFixed(1)} ${-hh}H${hw}V${hh}H${-hw}V${-hh}H${(-hw + w * gap - 46).toFixed(1)}`}
        fill="none"
        stroke={T.hedge}
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.1 13"
      />
    </g>
  );
};

// ---- the camera ---------------------------------------------------------------------------------------------------------
/** world point (x, y) lands on the screen at (ax, ay), scaled by s and turned by r degrees */
export type Cam = {x: number; y: number; s: number; r: number; ax: number; ay: number};
export const camT = (c: Cam) =>
  `translate(${c.ax.toFixed(2)} ${c.ay.toFixed(2)}) rotate(${c.r.toFixed(3)}) scale(${c.s.toFixed(4)}) translate(${(-c.x).toFixed(2)} ${(-c.y).toFixed(2)})`;
export const toScreen = (c: Cam, px: number, py: number): Pt => {
  const a = (c.r * Math.PI) / 180;
  const dx = (px - c.x) * c.s;
  const dy = (py - c.y) * c.s;
  return [c.ax + dx * Math.cos(a) - dy * Math.sin(a), c.ay + dx * Math.sin(a) + dy * Math.cos(a)];
};
/** the punch on the cut: 6 % bigger on the first frame, settled in 8 */
export const punch = (t: number) => 1 + 0.06 * (1 - E.out(clamp(t / 8)));

/** a drone's pitch: the ground plane leans back about (ox, oy) by `deg` under a CSS perspective of `p` px (one flat
 *  perspective() rotateX() transform: no nested 3D), so the road ahead recedes like the app's own tilted map */
export type Tilt = {deg: number; p: number; ox: number; oy: number};
/** where a frame point of the flat picture lands once the plane is tilted */
export const tiltPt = (tl: Tilt | undefined, q: Pt): Pt => {
  if (!tl) return q;
  const a = (tl.deg * Math.PI) / 180;
  const rx = q[0] - tl.ox;
  const ry = q[1] - tl.oy;
  const w = 1 - (ry * Math.sin(a)) / tl.p;
  return [tl.ox + rx / w, tl.oy + (ry * Math.cos(a)) / w];
};
const MX = 700;
const MY = 1000;
/** one top-down shot: the paper, the kit's defs, the world under the camera (tilted when asked: the plane is drawn MX / MY
 *  past the frame so its far edge never shows), then the upright layer (badges) */
export const TopSvg: React.FC<{uid: string; cam: Cam; children: React.ReactNode; hud?: React.ReactNode; tilt?: Tilt}> = ({uid, cam, children, hud, tilt}) => (
  <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
    <svg
      width={W + 2 * MX}
      height={H + 2 * MY}
      viewBox={`${-MX} ${-MY} ${W + 2 * MX} ${H + 2 * MY}`}
      style={{
        position: 'absolute',
        left: -MX,
        top: -MY,
        transform: tilt ? `perspective(${tilt.p}px) rotateX(${tilt.deg.toFixed(3)}deg)` : undefined,
        transformOrigin: tilt ? `${tilt.ox + MX}px ${tilt.oy + MY}px` : undefined,
      }}
    >
      <DefsSvg uid={uid} />
      <GroundDefs uid={uid} />
      <g transform={camT(cam)}>{children}</g>
    </svg>
    {hud ? (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        {hud}
      </svg>
    ) : null}
  </div>
);

// ---- paths along a way --------------------------------------------------------------------------------------------------
/** the point at arc length `s` (px) along a polyline */
export const atLen = (pts: Pt[], s: number): Pt => {
  let want = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (want <= d || i === pts.length - 1) {
      const k = d > 0 ? clamp(want / d) : 0;
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
    }
    want -= d;
  }
  return pts[pts.length - 1];
};
/** a smooth heading (degrees, 0 = nose up, + = to the right) at arc length s: the chord across +-14 px */
export const headingAt = (pts: Pt[], s: number) => {
  const a = atLen(pts, s - 14);
  const b = atLen(pts, s + 14);
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 90;
};
/** the rest of a polyline from arc length s: the point there, then every later point */
export const restFrom = (pts: Pt[], s: number): Pt[] => {
  let want = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (want <= d) {
      const k = d > 0 ? want / d : 0;
      return [[lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)], ...pts.slice(i)];
    }
    want -= d;
  }
  return [pts[pts.length - 1]];
};
/** a polyline as an SVG path */
export const lineD = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
/** a point's distance to a polyline */
export const distTo = (pts: Pt[], x: number, y: number) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy;
    const k = L2 > 0 ? clamp(((x - ax) * dx + (y - ay) * dy) / L2) : 0;
    best = Math.min(best, Math.hypot(x - (ax + k * dx), y - (ay + k * dy)));
  }
  return best;
};

// ---- the navigator's route line ------------------------------------------------------------------------------------------
/** ink on a white casing, as the app draws its route; `reveal` 0..1 draws it on from its start */
export const RouteLine: React.FC<{d: string; reveal?: number; w?: number}> = ({d, reveal = 1, w = 17}) => {
  if (reveal <= 0.002) return null;
  const da = reveal >= 1 ? undefined : `${(reveal * 1000).toFixed(1)} 4000`;
  return (
    <g>
      <path d={d} pathLength={1000} fill="none" stroke={C.il0} strokeWidth={w + 12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={da} />
      <path d={d} pathLength={1000} fill="none" stroke={C.ink} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={da} />
    </g>
  );
};

// ---- trees and roofs from above -------------------------------------------------------------------------------------------
/** a tree crown from above: a ring of puffs round a core, one ball light, its shadow to the lower right */
export const TreeTop: React.FC<{uid: string; x: number; y: number; r: number; seed: number; tone?: number}> = ({uid, x, y, r, seed, tone = 4}) => {
  let d = circ(x, y, r * 0.6);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + jit(seed, i) * 0.6;
    const rad = r * (0.34 + 0.12 * jit(seed, i + 7));
    const off = r - rad;
    d += circ(x + Math.cos(a) * off, y + Math.sin(a) * off, rad);
  }
  const sh = r * 0.3;
  return (
    <g>
      <path d={d} fill={C.shade} opacity={0.16} transform={`translate(${sh.toFixed(1)} ${(sh * 1.25).toFixed(1)})`} />
      <Solid uid={uid} d={d} tone={tone} shade="ball" />
      <circle cx={x - r * 0.26} cy={y - r * 0.3} r={r * 0.34} fill={C.il0} opacity={0.2} />
      <circle cx={x - r * 0.32} cy={y - r * 0.36} r={r * 0.14} fill={C.il0} opacity={0.22} />
    </g>
  );
};

export type RoofKind = 'gable' | 'hip' | 'flat';
/** a building from the drone (2026-10-12, the critic: the flat roofs were flat grey slabs): it stands `wall` px tall, so
 *  its roof is lifted toward the top of the picture and the wall facing the camera (south) shows below it, with windows;
 *  its shadow is the hull of the footprint and the lifted outline, cast to the lower right.
 *    flat    a pale deck inside a parapet (its top lit, the deck in its shade along the north and west), rooftop units with
 *            their own shadows, a row of skylights
 *    gable   two planes, the north one in the light, tile courses, a ridge, now and then a chimney
 *    hip     four planes the same way */
export const RoofTop: React.FC<{x: number; y: number; w: number; h: number; rot?: number; kind?: RoofKind; seed?: number; wall?: number}> = ({x, y, w, h, rot = 0, kind = 'gable', seed = 1, wall}) => {
  const cid = useUid();
  const hw = w / 2;
  const hh = h / 2;
  const wl = wall ?? (kind === 'flat' ? 34 + 12 * jit(seed, 21) : 22 + 8 * jit(seed, 21));
  const lit = mix(C.il0, C.il1, 0.35);
  const half = mix(C.il1, C.il2, 0.55);
  const dk = mix(C.il3, C.il4, 0.62);
  const edge = mix(C.il4, C.il5, 0.5);
  const plaster = mix(C.il1, C.il2, 0.25);
  const glass = mix(C.ilGlass, C.il4, 0.35);
  const P = (pts: Pt[]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join('') + 'Z';
  const R = (rx: number, ry: number, rw: number, rh: number) => `M${rx.toFixed(1)} ${ry.toFixed(1)}h${rw.toFixed(1)}v${rh.toFixed(1)}h${(-rw).toFixed(1)}Z`;
  // the shadow on the ground (the light from the upper left, fairly high)
  const sx = 0.55 * wl + 8;
  const sy = 0.7 * wl + 10;
  const shadow = P([[-hw, -hh], [hw, -hh], [hw + sx, -hh + sy], [hw + sx, hh + sy], [-hw + sx, hh + sy], [-hw, hh]]);
  // the south wall: plaster, a dark band under the eave, windows (two rows of ribbon glass on a flat-roofed block)
  const wy0 = hh - wl;
  let win = '';
  let sill = '';
  if (kind === 'flat') {
    const rows = 2;
    const rh = (wl - 10) / rows;
    for (let r = 0; r < rows; r++) {
      const yy = wy0 + 6 + r * rh + rh * 0.22;
      for (let xx = -hw + 10; xx < hw - 22; xx += 34) {
        win += R(xx, yy, 24, rh * 0.5);
        sill += R(xx - 1, yy + rh * 0.5, 26, 2);
      }
    }
  } else {
    const n = Math.max(2, Math.floor((w - 20) / 40));
    const door = Math.floor(jit(seed, 22) * n);
    for (let i = 0; i < n; i++) {
      const xx = -hw + 12 + ((w - 24) * (i + 0.5)) / n;
      if (i === door) win += R(xx - 7, wy0 + wl * 0.32, 14, wl * 0.68);
      else {
        win += R(xx - 7, wy0 + wl * 0.3, 14, wl * 0.4);
        sill += R(xx - 8, wy0 + wl * 0.7, 16, 2);
      }
    }
  }
  const wallNode = (
    <g>
      <path d={R(-hw, wy0, w, wl)} fill={plaster} />
      <path d={R(-hw, wy0, w, 5)} fill={C.shade} opacity={0.16} />
      <path d={win} fill={glass} opacity={0.82} />
      <path d={sill} fill={C.il0} opacity={0.8} />
      <path d={R(-hw, hh - 3, w, 3)} fill={edge} opacity={0.5} />
      <path d={R(-hw, wy0, w, wl)} fill="none" stroke={edge} strokeWidth={1.4} strokeOpacity={0.6} />
    </g>
  );
  // the roof, lifted by wl
  let planes: React.ReactNode;
  if (kind === 'flat') {
    const pw = Math.max(7, Math.min(w, h) * 0.05);
    const ix = -hw + pw;
    const iy = -hh + pw;
    const iw = w - 2 * pw;
    const ih = h - 2 * pw;
    const units: [number, number, number, number][] = [];
    const nu = 1 + Math.floor(jit(seed, 23) * 2.6);
    for (let k = 0; k < nu; k++) {
      const uw = iw * (0.14 + 0.1 * jit(seed, 24 + k));
      const uh = ih * (0.14 + 0.08 * jit(seed, 28 + k));
      units.push([ix + 12 + (iw - uw - 30) * jit(seed, 32 + k), iy + 14 + (ih * 0.5 - uh) * jit(seed, 36 + k), uw, uh]);
    }
    const sky: string[] = [];
    const ns = 3 + Math.floor(jit(seed, 40) * 3);
    const sw = Math.min(26, (iw - 40) / ns - 10);
    const syy = iy + ih * 0.66;
    for (let k = 0; k < ns; k++) sky.push(R(ix + 20 + k * (sw + 10), syy, sw, Math.min(34, ih * 0.2)));
    planes = (
      <>
        <rect x={-hw} y={-hh} width={w} height={h} rx={2} fill={lit} />
        <rect x={ix} y={iy} width={iw} height={ih} fill={mix(C.il1, C.il2, 0.4)} />
        <path d={`M${ix} ${iy}H${ix + iw}V${iy + 9}H${ix + 9}V${iy + ih}H${ix}Z`} fill={C.shade} opacity={0.13} />
        <path d={`M${ix} ${iy + ih}H${ix + iw}V${iy}`} fill="none" stroke={C.il0} strokeWidth={2} opacity={0.9} />
        {units.map(([ux, uy, uw, uh], i) => (
          <g key={i}>
            <rect x={ux + 6} y={uy + 8} width={uw} height={uh} fill={C.shade} opacity={0.14} />
            <rect x={ux} y={uy + uh - 5} width={uw} height={7} fill={mix(C.il2, C.il3, 0.6)} />
            <rect x={ux} y={uy - 2} width={uw} height={uh - 1} rx={2} fill={mix(C.il0, C.il1, 0.5)} stroke={edge} strokeWidth={1.2} strokeOpacity={0.55} />
            {uw > 26 && uh > 22 ? <circle cx={ux + uw / 2} cy={uy + uh / 2 - 2} r={Math.min(uw, uh) * 0.3} fill={mix(C.il2, C.il3, 0.5)} stroke={edge} strokeWidth={1} strokeOpacity={0.5} /> : null}
          </g>
        ))}
        {sky.map((d, i) => (
          <g key={`s${i}`}>
            <path d={d} fill={glass} opacity={0.75} />
            <path d={d} fill="none" stroke={C.il0} strokeWidth={1.6} opacity={0.8} />
          </g>
        ))}
        <rect x={-hw} y={-hh} width={w} height={h} rx={2} fill="none" stroke={edge} strokeWidth={1.6} strokeOpacity={0.75} />
      </>
    );
  } else {
    let tiles = '';
    const course = 8;
    const k = Math.min(hw, hh);
    if (w >= h) for (let yy = -hh + course; yy < hh; yy += course) tiles += `M${-hw} ${yy.toFixed(1)}H${hw}`;
    else for (let xx = -hw + course; xx < hw; xx += course) tiles += `M${xx.toFixed(1)} ${-hh}V${hh}`;
    const chimney = jit(seed, 41) > 0.45;
    const cx0 = (w >= h ? hw * (0.2 + 0.4 * jit(seed, 42)) : hw * 0.5) * (jit(seed, 43) > 0.5 ? 1 : -1);
    const cy0 = w >= h ? -hh * 0.45 : hh * (0.4 * jit(seed, 44) - 0.2);
    const clip = `rf${cid}`;
    if (kind === 'gable')
      planes =
        w >= h ? (
          <>
            <path d={P([[-hw, -hh], [hw, -hh], [hw, 0], [-hw, 0]])} fill={lit} />
            <path d={P([[-hw, 0], [hw, 0], [hw, hh], [-hw, hh]])} fill={dk} />
            <path d={tiles} stroke={edge} strokeWidth={1} opacity={0.22} />
            <path d={`M${-hw} 0H${hw}`} stroke={edge} strokeWidth={2.4} />
          </>
        ) : (
          <>
            <path d={P([[-hw, -hh], [0, -hh], [0, hh], [-hw, hh]])} fill={lit} />
            <path d={P([[0, -hh], [hw, -hh], [hw, hh], [0, hh]])} fill={dk} />
            <path d={tiles} stroke={edge} strokeWidth={1} opacity={0.22} />
            <path d={`M0 ${-hh}V${hh}`} stroke={edge} strokeWidth={2.4} />
          </>
        );
    else
      planes =
        w >= h ? (
          <>
            <defs>
              <clipPath id={clip}>
                <rect x={-hw} y={-hh} width={w} height={h} />
              </clipPath>
            </defs>
            <path d={P([[-hw, -hh], [hw, -hh], [hw - k, 0], [-hw + k, 0]])} fill={lit} />
            <path d={P([[-hw, hh], [hw, hh], [hw - k, 0], [-hw + k, 0]])} fill={dk} />
            <path d={P([[-hw, -hh], [-hw + k, 0], [-hw, hh]])} fill={half} />
            <path d={P([[hw, -hh], [hw - k, 0], [hw, hh]])} fill={mix(dk, half, 0.35)} />
            <path d={tiles} stroke={edge} strokeWidth={1} opacity={0.18} clipPath={`url(#${clip})`} />
            <path d={`M${-hw} ${-hh}L${-hw + k} 0L${-hw} ${hh}M${hw} ${-hh}L${hw - k} 0L${hw} ${hh}M${-hw + k} 0H${hw - k}`} stroke={edge} strokeWidth={2} fill="none" />
          </>
        ) : (
          <>
            <path d={P([[-hw, -hh], [-hw, hh], [0, hh - k], [0, -hh + k]])} fill={lit} />
            <path d={P([[hw, -hh], [hw, hh], [0, hh - k], [0, -hh + k]])} fill={dk} />
            <path d={P([[-hw, -hh], [hw, -hh], [0, -hh + k]])} fill={half} />
            <path d={P([[-hw, hh], [hw, hh], [0, hh - k]])} fill={mix(dk, half, 0.35)} />
            <path d={`M${-hw} ${-hh}L0 ${-hh + k}L${hw} ${-hh}M${-hw} ${hh}L0 ${hh - k}L${hw} ${hh}M0 ${-hh + k}V${hh - k}`} stroke={edge} strokeWidth={2} fill="none" />
          </>
        );
    if (chimney)
      planes = (
        <>
          {planes}
          <rect x={cx0 + 4} y={cy0 + 6} width={16} height={16} fill={C.shade} opacity={0.2} />
          <rect x={cx0 - 8} y={cy0 - 4} width={16} height={8} fill={mix(C.il2, C.il3, 0.7)} />
          <rect x={cx0 - 8} y={cy0 - 12} width={16} height={12} rx={1.5} fill={lit} stroke={edge} strokeWidth={1.2} />
        </>
      );
  }
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)})`}>
      <path d={shadow} fill={C.shade} opacity={0.15} />
      {wallNode}
      <g transform={`translate(0 ${(-wl).toFixed(1)})`}>
        {planes}
        {kind !== 'flat' ? <rect x={-hw} y={-hh} width={w} height={h} rx={1} fill="none" stroke={edge} strokeWidth={1.6} strokeOpacity={0.8} /> : null}
      </g>
    </g>
  );
};

// ---- the exit badge ---------------------------------------------------------------------------------------------------------
/** a number on a white pin whose tail points at (x, y); k the entrance spring (0 hidden), `on` 0..1 fills it with the film's
 *  cobalt, `ring` 0..1 a ring ringing out as it fills, `dim` fades it back once another one is chosen */
export const Badge: React.FC<{x: number; y: number; n: string; k: number; on?: number; ring?: number; dim?: number; R?: number}> = ({x, y, n, k, on = 0, ring = 0, dim = 1, R = 46}) => {
  if (k <= 0.001) return null;
  const tail = 16;
  const tip = `M${-R * 0.36} ${R * 0.84}L0 ${R + tail}L${R * 0.36} ${R * 0.84}Z`;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(4)})`} opacity={dim}>
      <g transform={`translate(0 ${-(R + tail)})`}>
        {ring > 0 && ring < 1 ? <circle r={R + 36 * E.out(ring)} fill="none" stroke={C.accA} strokeWidth={5} opacity={0.75 * (1 - ring)} /> : null}
        <g transform="translate(4 8)" opacity={0.16}>
          <path d={tip} fill={C.shade} />
          <circle r={R} fill={C.shade} />
        </g>
        <path d={tip} fill={C.il0} />
        <path d={tip} fill={C.accA} opacity={on} />
        <circle r={R} fill={C.il0} />
        <circle r={R} fill={C.accA} opacity={on} />
        <circle r={R - 1} fill="none" stroke={mix(C.il2, C.il3, 0.5)} strokeWidth={1.5} opacity={1 - on} />
        <text y={R * 0.37} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={R * 1.08} fill={C.ink} opacity={1 - on}>
          {n}
        </text>
        <text y={R * 0.37} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={R * 1.08} fill={C.il0} opacity={on}>
          {n}
        </text>
      </g>
    </g>
  );
};
