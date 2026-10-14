// The car beats' shared pieces (CarPlayBeat, Arrival, Redemption), in the white world's daylight and the studio's kit
// language (src/scenes/illo): flat planes of the illustration greys, one soft light from the top left, the film's cobalt
// only on what matters. Frame-driven, deterministic, colours only from C.
//
//   useUid()                  a clean id for the kit's gradients (IlloDefs / DefsSvg)
//   camSvg / camCss           one camera: the stage point (fx, fy) at the frame's centre, scaled s (svg and css twins)
//   <Ground y/>               the land from the horizon down (the road's verges stop at 60 m: no paper strip at the sides)
//   <Poplars v d xs/>         Georgian roadside poplars streaming by in the kit's perspective (road.tsx view/pt), far to near
//   <Cloud x y s/>            a soft fair-weather cloud: a white top, a pale underside
//   <Pin x y s/>              the destination pin in the film's cobalt, lit from the top left
import React, {useId} from 'react';
import {C} from '../tokens';
import {mix} from '../scenes/illo/palette';
import {pt, scaleAt, type View} from '../scenes/illo/road';
import {circ, rr, smooth} from '../scenes/illo/solid';
import {clamp, hash} from './lib';

export const useUid = () => useId().replace(/[^A-Za-z0-9]/g, '');

const f2 = (v: number) => v.toFixed(2);
/** svg: the stage point (fx, fy) lands on the frame's centre, scaled s, turned rot degrees about it */
export const camSvg = (s: number, fx: number, fy: number, rot = 0) => `translate(540 960) scale(${s.toFixed(4)}) rotate(${f2(rot)}) translate(${f2(-fx)} ${f2(-fy)})`;
/** css: the same camera for an HTML layer of the stage's size (transform-origin 0 0) */
export const camCss = (s: number, fx: number, fy: number) => `translate(540px, 960px) scale(${s.toFixed(4)}) translate(${f2(-fx)}px, ${f2(-fy)}px)`;

/** the land under the horizon, wide enough for any camera */
export const Ground: React.FC<{y: number; fill?: string}> = ({y, fill}) => <rect x={-1200} y={y} width={3480} height={3000} fill={fill ?? C.il2} />;

// ---- poplars ---------------------------------------------------------------------------------------------------------
const poplarD = (x: number, y: number, h: number) => {
  const w = h * 0.24;
  return smooth(
    [
      [x, y - h],
      [x + w * 0.5, y - h * 0.6],
      [x + w * 0.44, y - h * 0.26],
      [x + w * 0.14, y - h * 0.1],
      [x - w * 0.14, y - h * 0.1],
      [x - w * 0.44, y - h * 0.26],
      [x - w * 0.5, y - h * 0.6],
    ],
    true,
  );
};
/** the shade side of a crown (the light comes from the top left) */
const poplarShadeD = (x: number, y: number, h: number) => {
  const w = h * 0.24;
  return smooth(
    [
      [x + w * 0.03, y - h * 0.97],
      [x + w * 0.5, y - h * 0.6],
      [x + w * 0.44, y - h * 0.26],
      [x + w * 0.14, y - h * 0.1],
      [x + w * 0.02, y - h * 0.1],
      [x + w * 0.16, y - h * 0.5],
    ],
    true,
  );
};
export const Poplars: React.FC<{v: View; d: number; xs: number[]; every?: number; h?: number; zMin?: number; zMax?: number; seed?: number}> = ({
  v,
  d,
  xs,
  every = 13,
  h = 11,
  zMin = 2.4,
  zMax = 160,
  seed = 1,
}) => {
  const items: {z: number; x: number; y: number; hh: number; key: string}[] = [];
  xs.forEach((X, j) => {
    const phase = j * every * 0.45;
    const n0 = Math.ceil((d + zMin - phase) / every);
    for (let n = n0; n < n0 + 80; n++) {
      const z = n * every + phase - d;
      if (z > zMax) break;
      const [x, y] = pt(v, X + hash(n, j + seed) * 0.9, z);
      const hh = h * (0.82 + 0.36 * ((hash(n, j + seed, 2) + 1) / 2)) * scaleAt(v, z);
      if (hh < 4) continue;
      items.push({z, x, y, hh, key: `${j}-${n}`});
    }
  });
  items.sort((a, b) => b.z - a.z);
  return <g>{items.map((it) => poplar(it))}</g>;
};
/** one poplar standing at (x, y), hh px tall, z metres away (it pales with the distance) */
export const poplar = (it: {x: number; y: number; hh: number; z: number; key: string}) => {
  const fz = clamp((it.z - 6) / 120);
  const lit = mix(C.il3, C.il1, fz * 0.85);
  const sh = mix(C.il4, C.il2, fz * 0.85);
  const trunk = mix(C.il5, C.il2, fz);
  return (
    <g key={it.key}>
      <path d={rr(it.x - it.hh * 0.022, it.y - it.hh * 0.16, it.hh * 0.044, it.hh * 0.16, 0)} fill={trunk} />
      <path d={poplarD(it.x, it.y, it.hh)} fill={lit} />
      <path d={poplarShadeD(it.x, it.y, it.hh)} fill={sh} />
    </g>
  );
};

// ---- a cloud ----------------------------------------------------------------------------------------------------------
export const Cloud: React.FC<{x: number; y: number; s?: number; opacity?: number}> = ({x, y, s = 1, opacity = 1}) => {
  const top = circ(x - 72 * s, y - 2 * s, 44 * s) + circ(x - 8 * s, y - 30 * s, 62 * s) + circ(x + 66 * s, y - 8 * s, 48 * s) + rr(x - 116 * s, y - 4 * s, 230 * s, 46 * s, 23 * s);
  return (
    <g opacity={opacity}>
      <path d={top} fill={C.il0} />
      <path d={rr(x - 104 * s, y + 20 * s, 206 * s, 22 * s, 11 * s)} fill={C.il1} />
    </g>
  );
};

// ---- the destination pin ------------------------------------------------------------------------------------------------
const PIN = 'M0 0C-10 -22 -38 -42 -38 -76A38 38 0 1 1 38 -76C38 -42 10 -22 0 0Z';
const PIN_LIT = 'M-30 -98A38 38 0 0 1 4 -114C-18 -104 -28 -86 -26 -62C-24 -46 -14 -30 -2 -12C-16 -30 -38 -50 -36 -78C-36 -86 -34 -92 -30 -98Z';
/** the pin, its tip at (x, y); s scales it (1 = 114 px tall), sx / sy squash it on a landing */
export const Pin: React.FC<{x: number; y: number; s?: number; sx?: number; sy?: number}> = ({x, y, s = 1, sx = 1, sy = 1}) => (
  <g transform={`translate(${f2(x)} ${f2(y)}) scale(${f2(s * sx)} ${f2(s * sy)})`}>
    <path d={PIN} fill={mix(C.accA, C.il7, 0.3)} />
    <path d={PIN} fill={C.accA} transform="translate(-3 -1) scale(0.93 0.99)" />
    <path d={PIN_LIT} fill={mix(C.accA, C.il0, 0.45)} opacity={0.75} />
    <circle cx={0} cy={-76} r={15} fill={C.il0} />
  </g>
);
