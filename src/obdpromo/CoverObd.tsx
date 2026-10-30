// The diagnostics promo's pinned Reels cover v3 (the owner, 2026-10-15: in the style of his chosen navigator cover A and the QR
// cover C): white; the wordmark lockup, the small kicker „საქართველოში პირველად", the big two-line headline „დიაგნოსტიკა /
// ქართულად" in condensed Mtavruli (black only, no line under any text), and raised under it the feature's own big graphic,
// whole, inside the grid's 3:4 crop (y 240..1680): a refined 3D ELM327 adapter plugged into the 16-pin port of a light knee
// panel, its LED lit, the amber check-engine symbol glowing above it and a calm scan pulse spreading over the panel.
// The adapter is a real perspective model: rounded-trapezoid sections extruded (the port's bezel, the plug, the body, a chamfer
// to its end face), every facet shaded by its normal (a soft key light from the upper left, a gloss highlight), drawn far to
// near; the label and the LED sit on the end face through its own perspective.
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {capsLatin, mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {ENGINE_D} from './kit/cluster';
import {INK} from './kit/stage';

const PAD = 72;
const TOP = 300;
const ROW_H = 48;
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;
const AMBER = '#FFB020';

type P2 = [number, number];
type V3 = [number, number, number];
type Cam = {yaw: number; pitch: number; dist: number; f: number; cx: number; cy: number};
type Pt = {x: number; y: number; z: number};

const D2R = Math.PI / 180;
const rot = (c: Cam, p: V3): V3 => {
  const cy = Math.cos(c.yaw * D2R);
  const sy = Math.sin(c.yaw * D2R);
  const x1 = p[0] * cy + p[2] * sy;
  const z1 = -p[0] * sy + p[2] * cy;
  const cp = Math.cos(c.pitch * D2R);
  const sp = Math.sin(c.pitch * D2R);
  return [x1, p[1] * cp - z1 * sp, p[1] * sp + z1 * cp];
};
const project = (c: Cam, p: V3): Pt => {
  const [x, y, z] = rot(c, p);
  const d = c.dist - z;
  const s = c.f / d;
  return {x: c.cx + x * s, y: c.cy + y * s, z: d};
};
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** a rounded trapezoid (the J1962 port's shape), centred, wider on top: `wt` top width, `wb` bottom width, `h` height */
const section = (wt: number, wb: number, h: number, r: number, n = 7): P2[] => {
  const v: P2[] = [
    [-wt / 2, -h / 2],
    [wt / 2, -h / 2],
    [wb / 2, h / 2],
    [-wb / 2, h / 2],
  ];
  const out: P2[] = [];
  for (let i = 0; i < 4; i++) {
    const p = v[i];
    const a = v[(i + 3) % 4];
    const b = v[(i + 1) % 4];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const qa: P2 = [p[0] + ((a[0] - p[0]) * r) / la, p[1] + ((a[1] - p[1]) * r) / la];
    const qb: P2 = [p[0] + ((b[0] - p[0]) * r) / lb, p[1] + ((b[1] - p[1]) * r) / lb];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      out.push([(1 - t) ** 2 * qa[0] + 2 * (1 - t) * t * p[0] + t * t * qb[0], (1 - t) ** 2 * qa[1] + 2 * (1 - t) * t * p[1] + t * t * qb[1]]);
    }
  }
  return out;
};
const scaled = (s: P2[], k: number, dx = 0, dy = 0): P2[] => s.map(([x, y]) => [x * k + dx, y * k + dy]);

type Material = {lo: [number, number, number]; hi: [number, number, number]; gloss: number; shine: number};
const PLASTIC: Material = {lo: [9, 10, 12], hi: [92, 97, 108], gloss: 0.5, shine: 26};
const BEZEL: Material = {lo: [40, 43, 49], hi: [150, 155, 164], gloss: 0.25, shine: 14};
const LIGHT = norm([-0.5, -0.78, 0.62]);
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
const shade = (c: Cam, n: V3, m: Material) => {
  const nv = norm(rot(c, n));
  const lam = Math.max(0, dot(nv, LIGHT));
  const spec = Math.max(0, dot(nv, HALF)) ** m.shine * m.gloss;
  const ch = (i: number) => Math.round(Math.min(255, m.lo[i] + (m.hi[i] - m.lo[i]) * (0.18 + 0.82 * lam) + 255 * spec));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
};
type Face = {d: string; fill: string; z: number};
const poly = (pts: Pt[]) => `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`;
/** the visible side facets of a section swept from (s0 at z0) to (s1 at z1), shaded */
const sweep = (c: Cam, s0: P2[], z0: number, s1: P2[], z1: number, m: Material): Face[] => {
  const faces: Face[] = [];
  const camW = rot({...c, yaw: -c.yaw, pitch: 0}, rot({yaw: 0, pitch: -c.pitch, dist: 0, f: 0, cx: 0, cy: 0}, [0, 0, c.dist]));
  for (let i = 0; i < s0.length; i++) {
    const j = (i + 1) % s0.length;
    const a: V3 = [s0[i][0], s0[i][1], z0];
    const b: V3 = [s0[j][0], s0[j][1], z0];
    const cc: V3 = [s1[j][0], s1[j][1], z1];
    const d: V3 = [s1[i][0], s1[i][1], z1];
    let n = norm(cross(sub3(b, a), sub3(d, a)));
    const mid: V3 = [(a[0] + b[0] + cc[0] + d[0]) / 4, (a[1] + b[1] + cc[1] + d[1]) / 4, (a[2] + b[2] + cc[2] + d[2]) / 4];
    if (n[0] * mid[0] + n[1] * mid[1] < 0) n = [-n[0], -n[1], -n[2]];
    if (dot(n, sub3(camW, mid)) <= 0) continue;
    const pts = [a, b, cc, d].map((p) => project(c, p));
    faces.push({d: poly(pts), fill: shade(c, n, m), z: pts.reduce((s, p) => s + p.z, 0) / 4});
  }
  return faces.sort((x, y) => y.z - x.z);
};
const flat = (c: Cam, s: P2[], z: number) => poly(s.map(([x, y]) => project(c, [x, y, z])));
/** the SVG matrix that lays face-local (x, y) on the plane z through the camera (an affine fit around `o`) */
const faceMatrix = (c: Cam, z: number, o: P2 = [0, 0]) => {
  const p0 = project(c, [o[0], o[1], z]);
  const px = project(c, [o[0] + 100, o[1], z]);
  const py = project(c, [o[0], o[1] + 100, z]);
  const a = (px.x - p0.x) / 100;
  const b = (px.y - p0.y) / 100;
  const cc = (py.x - p0.x) / 100;
  const d = (py.y - p0.y) / 100;
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${cc.toFixed(4)} ${d.toFixed(4)} ${(p0.x - a * o[0] - cc * o[1]).toFixed(2)} ${(p0.y - b * o[0] - d * o[1]).toFixed(2)})`;
};

// the model (world px; the panel is z = 0, +z toward the camera, y down)
const HOLE = section(440, 316, 210, 34);
const BEZ_OUT = scaled(section(440, 316, 210, 46), 1.46);
const BEZ_IN = scaled(HOLE, 1.04);
const PLUG = section(414, 296, 190, 30);
const BODY = section(472, 384, 246, 58);
const Z_BEZ = 34;
const Z_BODY0 = 52;
const Z_BODY1 = 300;
const Z_END = 322;
const END = scaled(BODY, 0.9);

export type ObdLook = {yaw: number; pitch: number; scale: number; cy: number; checkX: number; checkY: number; checkSize: number; rings: number[]};

export const ObdPicture: React.FC<{top: number; look: ObdLook; uid: string}> = ({top, look, uid}) => {
  const cam: Cam = {yaw: look.yaw, pitch: look.pitch, dist: 2400, f: 2400 * look.scale, cx: 540, cy: look.cy};
  const P = (p: V3) => project(cam, p);
  // the panel: a big light plane (its far side melts into the paper under the headline)
  const panel = poly(([[-2200, -1500], [2200, -1500], [2200, 1800], [-2200, 1800]] as P2[]).map(([x, y]) => P([x, y, 0])));
  const ring = (r: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(P([Math.cos(a) * r, Math.sin(a) * r * 0.92 + 10, 0]));
    }
    return poly(pts);
  };
  const bezSides = sweep(cam, BEZ_OUT, 0, BEZ_OUT, Z_BEZ, BEZEL);
  const bezLip = sweep(cam, BEZ_OUT, Z_BEZ, scaled(BEZ_OUT, 0.97), Z_BEZ + 6, BEZEL);
  const plug = sweep(cam, PLUG, Z_BEZ - 30, PLUG, Z_BODY0, PLASTIC);
  const body = sweep(cam, BODY, Z_BODY0, BODY, Z_BODY1, PLASTIC);
  const chamfer = sweep(cam, BODY, Z_BODY1, END, Z_END, PLASTIC);
  const endM = faceMatrix(cam, Z_END);
  const bezFront = `${flat(cam, scaled(BEZ_OUT, 0.97), Z_BEZ + 6)} ${flat(cam, BEZ_IN, Z_BEZ + 6)}`;
  const shadow = flat(cam, scaled(BODY, 1.02, 70, 120), 0);
  const ck = look.checkSize / 24;
  const ledX = 132;
  const ledY = 34;
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height: 1920 - top, overflow: 'hidden'}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: -top}}>
        <defs>
          <radialGradient id={`${uid}pan`} cx="0.42" cy="0.55" r="0.75">
            <stop offset="0" stopColor="#F4F4F5" />
            <stop offset="0.6" stopColor="#E7E8EA" />
            <stop offset="1" stopColor="#D9DADD" />
          </radialGradient>
          <linearGradient id={`${uid}end`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#30333A" />
            <stop offset="0.45" stopColor="#17191D" />
            <stop offset="1" stopColor="#0A0B0D" />
          </linearGradient>
          <radialGradient id={`${uid}led`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
            <stop offset="0.25" stopColor="#F2FFF6" stopOpacity={0.55} />
            <stop offset="1" stopColor="#F2FFF6" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${uid}amb`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.5} />
            <stop offset="0.4" stopColor={AMBER} stopOpacity={0.16} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          <filter id={`${uid}sh`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={34} />
          </filter>
          <filter id={`${uid}soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2.2} />
          </filter>
          <filter id={`${uid}ao`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={10} />
          </filter>
        </defs>
        <path d={panel} fill={`url(#${uid}pan)`} />
        {/* the scan pulse: calm rings spreading over the panel from the port */}
        {look.rings.map((r, i) => (
          <path key={r} d={ring(r)} fill="none" stroke={INK} strokeWidth={7 - i * 1.5} opacity={0.11 - i * 0.03} />
        ))}
        {/* the adapter's soft shadow on the panel, the bezel's contact shadow */}
        <path d={shadow} fill="#000" opacity={0.3} filter={`url(#${uid}sh)`} />
        <path d={flat(cam, scaled(BEZ_OUT, 1.04, 6, 14), 0)} fill="#000" opacity={0.35} filter={`url(#${uid}ao)`} />
        {/* the port's bezel, its lip, the dark mouth */}
        {bezSides.map((f, i) => (
          <path key={`b${i}`} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.8} />
        ))}
        {bezLip.map((f, i) => (
          <path key={`l${i}`} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.8} />
        ))}
        <path d={bezFront} fill="#3E424A" fillRule="evenodd" />
        <path d={flat(cam, BEZ_IN, Z_BEZ + 6)} fill="#050506" />
        {/* the plug in the mouth, then the body, its chamfer, its end face */}
        {plug.map((f, i) => (
          <path key={`p${i}`} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.8} />
        ))}
        {body.map((f, i) => (
          <path key={`y${i}`} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.8} />
        ))}
        {chamfer.map((f, i) => (
          <path key={`c${i}`} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.8} />
        ))}
        <path d={flat(cam, END, Z_END)} fill={`url(#${uid}end)`} />
        <g transform={endM}>
          <text x={-172} y={-6} fontFamily="FiraGO" fontWeight={700} fontSize={60} fill="#ECECEC" letterSpacing={3}>
            ELM327
          </text>
          <text x={-170} y={44} fontFamily="FiraGO" fontWeight={500} fontSize={30} fill="#8E929B" letterSpacing={5}>
            OBD-II
          </text>
          <circle cx={ledX} cy={ledY} r={110} fill={`url(#${uid}led)`} />
          <circle cx={ledX} cy={ledY} r={17} fill="#FFFFFF" />
          <circle cx={ledX} cy={ledY} r={22} fill="none" stroke="#3A3E46" strokeWidth={5} />
        </g>
        {/* the amber check-engine symbol glowing above it */}
        <circle cx={look.checkX} cy={look.checkY} r={look.checkSize * 1.05} fill={`url(#${uid}amb)`} />
        <g transform={`translate(${look.checkX - 12 * ck} ${look.checkY - 12 * ck}) scale(${ck})`}>
          <path d={ENGINE_D} fill="none" stroke={AMBER} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" opacity={0.6} filter={`url(#${uid}soft)`} />
          <path d={ENGINE_D} fill="none" stroke="#FFBE3C" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 150, background: 'linear-gradient(#FFFFFF, rgba(255,255,255,0))'}} />
    </div>
  );
};

const LOOKS: Record<'A' | 'B', ObdLook> = {
  A: {yaw: 30, pitch: -20, scale: 1.02, cy: 1330, checkX: 540, checkY: 965, checkSize: 190, rings: [470, 610, 750]},
  B: {yaw: -34, pitch: -16, scale: 1.08, cy: 1350, checkX: 760, checkY: 960, checkSize: 170, rings: [480, 630]},
};

/** `variant` A: the kicker as a borderless pill top right (the QR cover C's row); B: the kicker as a small line over the
 *  headline, the adapter turned the other way */
export const ObdCover: React.FC<{variant?: 'A' | 'B'}> = ({variant = 'A'}) => {
  const lines = ['დიაგნოსტიკა', 'ქართულად'].map(mtav);
  const kicker = mtav(capsLatin('საქართველოში პირველად'));
  const headMax = 150;
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender('fit the cover headline'));
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const widest = Math.max(...lines.map((l) => textWidth(l, `600 ${headMax}px ${F.sans}`)));
        setSize(Math.min(headMax, Math.floor((headMax * MAX_W) / widest)));
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  const fs = size ?? headMax;
  const headTop = variant === 'A' ? TOP + ROW_H + 64 : TOP + ROW_H + 120;
  const headBottom = headTop + lines.length * fs * HEAD_LH;
  return (
    <AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
      <ObdPicture top={headBottom + 10} look={LOOKS[variant]} uid={`oc${variant}`} />
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(0.045)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(0.045)'}} />
      </div>
      {variant === 'A' ? (
        <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
          <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px 0 18px', borderRadius: ROW_H, background: '#F1F1F2', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK, whiteSpace: 'nowrap'}}>
            <div style={{width: 10, height: 10, borderRadius: 10, background: AMBER}} />
            {kicker}
          </div>
        </div>
      ) : (
        <div style={{position: 'absolute', top: TOP + ROW_H + 52, left: PAD, display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.mono, fontSize: 26, letterSpacing: '0.08em', color: INK, whiteSpace: 'nowrap'}}>
          <div style={{width: 12, height: 12, borderRadius: 12, background: AMBER}} />
          {kicker}
        </div>
      )}
      <div style={{position: 'absolute', top: headTop, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: size ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
