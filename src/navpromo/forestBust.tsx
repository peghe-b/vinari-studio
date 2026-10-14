// The forest's close-ups of the lost man (the owner's rule: no flat cartoon faces, the people are the studio's
// "Silhouette light" style): his head and shoulders in the film's night palette (sil.tsx filmSilPal), the same man the
// full Figure draws (the flat cap, the moustache, a cropped cut, the leather jacket over a white tee). The head is
// forestHead.tsx's ManHead (the kit's three-quarter head, one outline whose jaw really drops); round it this file adds
// what a close-up needs: a man's neck of a man's length, the jaw's shadow on it, the jacket with its collar and the tee
// in a V that closes on the zip high on the chest (the subtitle's band below stays dark), a rim of the light on the
// dark silhouette. Head space: the crown y -50, the chin y +50, the face toward +x; (x, y) is the head's centre in
// frame px, s px per head unit.
import React, {useId} from 'react';
import {mix} from '../scenes/illo/palette';
import {filmSilPal} from '../scenes/illo/sil';
import {pathOf, type SilExpr, type V} from '../scenes/illo/silhead';
import {jawLine, jawPt, ManHead} from './forestHead';

type Pt = [number, number];
const rotP = (p: readonly number[], c: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};
const n2 = (v: number) => v.toFixed(2);

/** the expressions of the close-ups (the kit's SilExpr: lids, brows, mouth corners; the shout's opening is the jaw) */
export const BUST_EX: Record<'worried' | 'shout' | 'angry' | 'rage', SilExpr> = {
  worried: {lid: 0.62, smile: 0, brow: 2.2, browTilt: 22, curve: -0.5, open: 0, look: 0.9},
  shout: {lid: 0.72, smile: 0, brow: 3, browTilt: 16, curve: -0.7, open: 0, look: 0.2},
  angry: {lid: 0.5, smile: 0, brow: -1.6, browTilt: -22, curve: -0.8, open: 0, look: 0.2},
  rage: {lid: 0.6, smile: 0, brow: -0.8, browTilt: -24, curve: -0.9, open: 0, look: 0.1},
};

// the head nods about the top of the neck
const NOD_AT: Pt = [-5, 30];
// the body (head units): the jacket (the near shoulder broad and low on the left, the far one behind the chest), its two
// collar points, the tee in the opening down to the zip
const JACKET: V[] = [
  [-33, 58], [-50, 68], [-86, 84], [-122, 98], [-144, 116, 0.9], [-156, 146], [-162, 210], [-166, 330, 0], [118, 330, 0], [112, 220], [104, 150], [92, 112, 0.9],
  [72, 92], [46, 80], [26, 75], [10, 76], [-10, 72], [-24, 64],
];
const COLLAR_N: V[] = [[-35, 54, 0.5], [-27, 64], [-15, 74], [-4, 85], [4, 96], [9, 106, 0.2], [-4, 120, 0.2], [-22, 104], [-40, 86], [-50, 70, 0.5]];
const COLLAR_F: V[] = [[20, 72, 0.5], [33, 77], [47, 86], [62, 98, 0.4], [56, 122, 0.2], [38, 106], [26, 94], [17, 82, 0.5]];
const TEE: V[] = [[-18, 64], [-6, 73], [8, 76], [21, 72], [28, 84], [19, 97], [10, 107, 0.2], [2, 96], [-10, 82]];

/** the lost man's head and shoulders, close (see the file's header). jaw: degrees the jaw drops (a shout 12..17); nod: the
 *  head's tilt (negative: the chin up); level: the light's level (0.8 dim .. 1.15 bright); glow: a light on the face
 *  (head space) of strength k, the phone's; flip: he faces left */
export const ManBust: React.FC<{x: number; y: number; s: number; ex: SilExpr; jaw?: number; nod?: number; level?: number; flip?: boolean; glow?: {x: number; y: number; r: number; k: number}}> = ({
  x,
  y,
  s,
  ex,
  jaw = 0,
  nod = 0,
  level = 1,
  flip = false,
  glow,
}) => {
  const rid = useId().replace(/[^A-Za-z0-9]/g, '');
  const g = (n: string) => `mb${rid}${n}`;
  const pal = filmSilPal('night', level);
  const [deep, shadow, half] = pal.lit;
  const th = Math.max(0, jaw);
  // the throat leaves the jaw's underside (it follows the jaw down) and runs to the tee's collar
  const throatTop = rotP(jawPt(5, 47.6, 1, th), NOD_AT, nod);
  const throatMid: Pt = [throatTop[0] * 0.45 + 15.4 * 0.55, throatTop[1] * 0.45 + 64 * 0.55];
  const NECK: V[] = [[-36.6, 8], [-34, 26], [-31.8, 44], [-31.6, 56], [-33, 66, 0.6], [-8, 80], [19, 76, 0.6], [16.4, 68], throatMid, throatTop, [0, 30, 0.5], [-14, 10, 0.5], [-30, 2, 0.5]];
  // the jaw's shadow on the neck: the jaw's underside and the same line pushed down, faded downward
  const jl = jawLine(th);
  const a0 = jl[0];
  const a1 = jl[jl.length - 1];
  const ux = a1[0] - a0[0];
  const uy = a1[1] - a0[1];
  const ul = Math.hypot(ux, uy) || 1;
  let nx = -uy / ul;
  let ny = ux / ul;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const drop = 16;
  const shadowPts: V[] = [...jl.map((p) => [p[0] - nx * 2, p[1] - ny * 2] as V), ...[...jl].reverse().map((p) => [p[0] + nx * drop, p[1] + ny * drop] as V)];
  const mid: Pt = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2];
  const mirror = flip ? -1 : 1;
  return (
    <g transform={`translate(${n2(x)} ${n2(y)}) scale(${n2(s * mirror)} ${n2(s)})`}>
      <defs>
        <linearGradient id={g('neck')} gradientUnits="userSpaceOnUse" x1={-34} y1={20} x2={20} y2={80}>
          <stop offset="0" stopColor={mix(deep, shadow, 0.7)} />
          <stop offset="0.5" stopColor={shadow} />
          <stop offset="1" stopColor={half} />
        </linearGradient>
        <linearGradient id={g('tee')} gradientUnits="userSpaceOnUse" x1={24} y1={70} x2={4} y2={108}>
          <stop offset="0" stopColor={pal.white[0]} />
          <stop offset="0.5" stopColor={mix(pal.white[0], pal.white[1], 0.55)} />
          <stop offset="1" stopColor={mix(pal.white[1], pal.ink, 0.35)} />
        </linearGradient>
        <radialGradient id={g('sheen')} gradientUnits="userSpaceOnUse" cx={-98} cy={112} r={70}>
          <stop offset="0" stopColor={pal.sheen} stopOpacity="0.75" />
          <stop offset="1" stopColor={pal.sheen} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('chest')} gradientUnits="userSpaceOnUse" cx={74} cy={134} r={60}>
          <stop offset="0" stopColor={pal.sheen} stopOpacity="0.5" />
          <stop offset="1" stopColor={pal.sheen} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('jawSh')} gradientUnits="userSpaceOnUse" x1={mid[0]} y1={mid[1]} x2={mid[0] + nx * drop} y2={mid[1] + ny * drop}>
          <stop offset="0" stopColor={deep} stopOpacity="0.8" />
          <stop offset="0.45" stopColor={deep} stopOpacity="0.35" />
          <stop offset="1" stopColor={deep} stopOpacity="0" />
        </linearGradient>
        <filter id={g('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.6} />
        </filter>
        <clipPath id={g('jk')}>
          <path d={pathOf(JACKET)} />
        </clipPath>
        <clipPath id={g('nk')}>
          <path d={pathOf(NECK)} />
        </clipPath>
      </defs>
      {/* the body: the rim of the light round the dark jacket, the jacket, its leather sheen, the neck, the tee, the collar */}
      <path d={pathOf(JACKET)} fill={pal.rim} opacity={0.75} transform="translate(1.8 -2)" />
      <path d={pathOf(JACKET)} fill={pal.ink} />
      <g clipPath={`url(#${g('jk')})`}>
        <ellipse cx={-98} cy={112} rx={70} ry={44} fill={`url(#${g('sheen')})`} />
        <ellipse cx={74} cy={134} rx={60} ry={50} fill={`url(#${g('chest')})`} />
        {/* the near sleeve's seam and the zip */}
        <path d={pathOf([[-114, 108], [-106, 160], [-106, 330]], false)} stroke={pal.sheen} strokeWidth={0.8} fill="none" opacity={0.8} />
        <path d={pathOf([[10, 108], [13, 200], [16, 330]], false)} stroke={pal.sheen} strokeWidth={0.9} fill="none" opacity={0.7} />
      </g>
      <path d={pathOf(NECK)} fill={pal.rim} opacity={0.5} transform="translate(-1.2 -0.6)" />
      <path d={pathOf(NECK)} fill={`url(#${g('neck')})`} />
      <g clipPath={`url(#${g('nk')})`}>
        <g filter={`url(#${g('soft')})`}>
          {/* the long muscle from behind the ear to the collar's front, a soft deeper step; the jaw's shadow under it */}
          <path d={pathOf([[-16, 40], [-6, 52], [4, 66], [10, 78], [-2, 80], [-14, 60], [-24, 44]])} fill={deep} opacity={0.2} />
          <g transform={`rotate(${n2(nod)} ${NOD_AT[0]} ${NOD_AT[1]})`}>
            <path d={pathOf(shadowPts)} fill={`url(#${g('jawSh')})`} />
          </g>
        </g>
      </g>
      <path d={pathOf(TEE)} fill={`url(#${g('tee')})`} />
      <path d={pathOf([[-18, 64], [-6, 73], [8, 76], [21, 72]], false)} stroke={pal.white[1]} strokeWidth={1.4} fill="none" />
      <path d={pathOf(COLLAR_N)} fill={pal.rim} opacity={0.5} transform="translate(1.4 -1.4)" />
      <path d={pathOf(COLLAR_N)} fill={pal.ink2} />
      <path d={pathOf(COLLAR_F)} fill={pal.ink2} />
      <path d={pathOf([[-27, 64], [-15, 74], [-4, 85], [4, 96], [9, 106]], false)} stroke={pal.sheen} strokeWidth={0.9} fill="none" opacity={0.9} />
      <path d={pathOf([[33, 77], [47, 86], [62, 98]], false)} stroke={pal.rim} strokeWidth={1} fill="none" opacity={0.6} />
      {/* the head, nodding about the top of the neck */}
      <g transform={`rotate(${n2(nod)} ${NOD_AT[0]} ${NOD_AT[1]})`}>
        <ManHead uid={rid} pal={pal} ex={ex} jaw={th} tilt={nod} glow={glow} />
      </g>
    </g>
  );
};

/** an open hand, fingers spread (the S8 arms raised to the sky): the wrist at (0, 0), the fingers up (-y); 1 unit = 1 px
 *  at s 1. Lit by the night's light like the man's face, the moon's rim on its left edge. */
export const OpenHand: React.FC<{x: number; y: number; s: number; rot?: number; mirror?: boolean; spread?: number}> = ({x, y, s, rot = 0, mirror = false, spread = 1}) => {
  const rid = useId().replace(/[^A-Za-z0-9]/g, '');
  const pal = filmSilPal('night', 1);
  const [deep, shadow, half] = pal.lit;
  // a finger: from its base on the knuckle line, `len` long, `w` wide at the base, leaning `a` degrees out
  const finger = (bx: number, by: number, len: number, w: number, a: number) => {
    const r = (a * Math.PI) / 180;
    const ux = Math.sin(r);
    const uy = -Math.cos(r);
    const nx = -uy;
    const ny = ux;
    const P = (t: number, side: number, ww: number): V => [bx + ux * len * t + nx * ww * side, by + uy * len * t + ny * ww * side];
    return pathOf([P(0, -1, w / 2), P(0.45, -1, w * 0.47), P(0.86, -1, w * 0.4), [bx + ux * len, by + uy * len, 1], P(0.86, 1, w * 0.4), P(0.45, 1, w * 0.47), P(0, 1, w / 2)]);
  };
  const sp = spread;
  const fingers = [finger(-15, -50, 50, 15, -14 * sp), finger(-4, -56, 60, 15.5, -4 * sp), finger(8, -55, 56, 15, 6 * sp), finger(18, -48, 44, 13, 17 * sp)];
  const palm = pathOf([[-17, 0], [15, 0], [21, -18], [24, -42], [18, -56], [-4, -60], [-20, -54], [-22, -34]]);
  const thumb = pathOf([[-18, -14], [-30, -26], [-44, -40, 0.6], [-49, -48, 1], [-42, -50], [-33, -40], [-20, -32]]);
  return (
    <g transform={`translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)}) scale(${n2(mirror ? -s : s)} ${n2(s)})`}>
      <defs>
        <linearGradient id={`oh${rid}`} gradientUnits="userSpaceOnUse" x1={-30} y1={-110} x2={26} y2={0}>
          <stop offset="0" stopColor={half} />
          <stop offset="0.55" stopColor={shadow} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
      </defs>
      <g fill={pal.rim} opacity={0.7} transform="translate(-1.6 -1.4)">
        {fingers.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <path d={palm} />
        <path d={thumb} />
      </g>
      <g fill={`url(#oh${rid})`}>
        {fingers.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <path d={palm} />
        <path d={thumb} />
      </g>
      {/* the knuckles' creases and the palm's line, in the deep step */}
      <path d="M-14 -52Q-4 -57 8 -56Q14 -54 18 -50" stroke={deep} strokeWidth={1.2} fill="none" opacity={0.5} />
      <path d="M-16 -22Q-4 -30 14 -36" stroke={deep} strokeWidth={1.1} fill="none" opacity={0.4} />
    </g>
  );
};
