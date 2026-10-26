import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, rand} from '../lib/anim';
import {C, isLight} from '../tokens';
import type {SceneCtx} from '../types';
import {S} from './kit/p2';
import {Sfx} from './common';

type P = {
  /** cars in the jam (6 to 12) */
  cars?: number;
  /** which car honks (its index), and the frames it honks on (default: 0, 9, 18: three escalations) */
  honker?: number;
  honks?: number[];
  seed?: number;
};

// a modern car seen from straight above (a 2020s silhouette: long glasshouse, short overhangs, mirrors), 1 unit = 1 px
const TOP_CARS = [
  {w: 92, h: 200, r: 34, glass: [0.24, 0.62]}, // a hatch
  {w: 96, h: 222, r: 30, glass: [0.28, 0.6]}, // a saloon
  {w: 102, h: 214, r: 26, glass: [0.22, 0.7]}, // an SUV
  {w: 90, h: 190, r: 36, glass: [0.2, 0.64]}, // a city car
  {w: 100, h: 236, r: 28, glass: [0.26, 0.58]}, // an estate
  {w: 98, h: 206, r: 40, glass: [0.3, 0.58]}, // a coupe-crossover
];
export const TopCar: React.FC<{x: number; y: number; kind: number; hl?: boolean}> = ({x, y, kind, hl}) => {
  const c = TOP_CARS[kind % TOP_CARS.length];
  const ink = C.ink;
  return (
    <g transform={`translate(${x - c.w / 2} ${y - c.h / 2})`}>
      <rect x={-7} y={c.h * 0.3} width={10} height={16} rx={4} fill={ink} />
      <rect x={c.w - 3} y={c.h * 0.3} width={10} height={16} rx={4} fill={ink} />
      <rect width={c.w} height={c.h} rx={c.r} fill={hl ? ink : C.surface} stroke={ink} strokeWidth={5} />
      <rect x={10} y={c.h * c.glass[0]} width={c.w - 20} height={c.h * (c.glass[1] - c.glass[0])} rx={c.r * 0.55} fill={hl ? C.surface : ink} opacity={hl ? 0.22 : 0.85} />
    </g>
  );
};

// JamGrid (phase 2, the humour kit): a Tbilisi jam from straight above in ink on paper: lanes, modern car outlines packed
// bumper to bumper, one car (the honker) in solid ink, its horn drawn as concentric rings (HornRings) that pulse on each
// honk: three escalations, the third the biggest. The honks' sounds are the beat's "sfx" (the horn set); the rings
// follow the frames given here.
export const JamGrid: React.FC<{p: P; ctx: SceneCtx}> = ({p}) => {
  const frame = useCurrentFrame();
  const n = Math.max(6, Math.min(12, p.cars ?? 9));
  const seed = p.seed ?? 5;
  const lanes = [S.cx - 260, S.cx - 90, S.cx + 90, S.cx + 260];
  const honker = (p.honker ?? 4) % n;
  const honks = p.honks ?? [0, 9, 18];
  const cars = Array.from({length: n}, (_, i) => {
    const lane = i % lanes.length;
    const row = Math.floor(i / lanes.length);
    return {x: lanes[lane] + (rand(seed + i) - 0.5) * 16, y: S.top + 140 + row * 290 + (rand(seed * 2 + i) - 0.5) * 60 + (lane % 2) * 120, kind: Math.floor(rand(seed * 3 + i) * 6)};
  });
  const h = cars[honker];
  const road = isLight() ? '#E6E6E6' : '#202020';
  const creep = 6 * ease.drift(Math.min(1, frame / 90)); // the jam creeps a few px, never flows
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <rect x={S.left - 30} y={S.top - 20} width={S.right - S.left + 60} height={S.bottom - S.top + 40} rx={24} fill={road} />
      {[S.cx - 175, S.cx, S.cx + 175].map((x, i) => (
        <line key={i} x1={x} y1={S.top} x2={x} y2={S.bottom} stroke={C.surface} strokeWidth={6} strokeDasharray={i === 1 ? '0' : '40 34'} />
      ))}
      <g transform={`translate(0 ${-creep})`} className="vn-obj">
        {cars.map((c, i) => (
          <TopCar key={i} x={c.x} y={c.y} kind={c.kind} hl={i === honker} />
        ))}
      </g>
      {honks.map((f, k) => {
        const d = frame - f;
        if (d < 0 || d > 22) return null;
        const u = d / 22;
        const big = 1 + k * 0.45;
        return [0, 1, 2].map((r) => (
          <circle key={`${k}-${r}`} cx={h.x} cy={h.y - creep - 60} r={(60 + r * 46) * big * ease.whipOut(Math.min(1, u * 1.4))} fill="none" stroke={C.ink} strokeWidth={8 - r * 2} opacity={(1 - u) * (1 - r * 0.25)} />
        ));
      })}
    </svg>
  );
};
