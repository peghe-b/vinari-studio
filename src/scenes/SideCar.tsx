import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {S} from './kit/p2';

/** A head-and-shoulders silhouette in strict profile (facing right), solid ink like a cut-paper portrait, never a face (no
 *  eye, no mouth line): the brow, the nose, the lips and the chin are the outline only. Talking (r3, 2026-10-27: the p2
 *  bust read as a default avatar icon and its three speech strokes as a cartoon): the jaw drops, the lips part (the
 *  shout), and nothing else is drawn. A woman: long hair falling behind the neck. */
export const SideFigure: React.FC<{sex: 'm' | 'f'; x: number; y: number; size: number; talking?: boolean; frame: number; flip?: boolean}> = ({sex, x, y, size, talking, frame, flip}) => {
  const j = talking ? 4 + 10 * Math.abs(Math.sin(frame * 0.75)) : 0; // the jaw's drop
  const k = size / 300;
  const head =
    `M -38 104 C -44 66 -70 36 -86 -6 C -108 -60 -98 -128 -48 -158 C 2 -188 72 -176 94 -124 C 102 -104 102 -92 106 -80 ` +
    `L 113 -68 C 109 -60 107 -54 111 -46 L 141 -8 C 146 -1 141 6 131 8 L 118 11 C 121 16 123 21 120 ${25 + j * 0.15} ` +
    `L ${104 - j * 0.3} ${30 + j * 0.45} L ${117 - j * 0.1} ${44 + j} C ${121} ${53 + j} ${117} ${60 + j} ${110} ${64 + j} ` +
    `C ${106} ${76 + j * 0.8} ${96} ${84 + j * 0.6} 80 ${86 + j * 0.4} C 60 89 42 92 36 102 L 36 120 ` +
    `C 104 130 152 168 162 232 L -162 232 C -152 168 -104 132 -40 122 Z`;
  const hair =
    sex === 'f'
      ? 'M -52 -160 C 10 -196 84 -178 100 -118 C 80 -136 30 -142 -4 -122 C -30 -96 -40 -40 -36 20 C -34 70 -20 110 -6 150 C -60 150 -112 128 -120 70 C -132 0 -126 -110 -52 -160 Z'
      : ''; // a man: the skull's own outline is his short hair (a separate cap left a notch at the brow)
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <g className="vn-fig" transform={`translate(${x} ${y}) scale(${flip ? -k : k} ${k})`} fill={C.ink}>
        <path d={head} />
        {hair ? <path d={hair} /> : null}
      </g>
    </svg>
  );
};

type P = {sex: 'm' | 'f'; window?: number};

// SideCar (phase 2, the humour kit): the car beside you in the jam, a modern profile in ink on paper, its window rolling
// down (the window motor) and the character leaning out as a silhouette in profile while he speaks.
export const SideCar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const talking = (ctx.speech ?? []).some(([a, z]) => frame >= a && frame <= z);
  const down = Math.min(1, Math.max(0, frame / 14));
  const cy = S.top + 620;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <g className="vn-obj" fill="none" stroke={C.ink} strokeWidth={10} strokeLinejoin="round">
          {/* a 2020s crossover in profile: a long roof, a fast screen, short overhangs */}
          <path d={`M ${S.left + 20} ${cy + 140} L ${S.left + 30} ${cy + 40} C ${S.left + 60} ${cy + 10} ${S.left + 160} ${cy} ${S.left + 250} ${cy - 10} L ${S.left + 380} ${cy - 130} C ${S.left + 420} ${cy - 160} ${S.left + 620} ${cy - 165} ${S.left + 700} ${cy - 130} L ${S.left + 800} ${cy - 20} C ${S.left + 830} ${cy} ${S.left + 840} ${cy + 40} ${S.left + 840} ${cy + 140} Z`} fill={C.surface} />
          <circle cx={S.left + 190} cy={cy + 150} r={78} fill={C.ink} />
          <circle cx={S.left + 670} cy={cy + 150} r={78} fill={C.ink} />
          <path d={`M ${S.left + 400} ${cy - 110} L ${S.left + 560} ${cy - 118} L ${S.left + 560} ${cy - 20} L ${S.left + 330} ${cy - 20} Z`} fill={C.bg} />
          <rect x={S.left + 400} y={cy - 118 + 98 * down} width={160} height={Math.max(0, 98 * (1 - down))} fill={C.ink} opacity={0.85} stroke="none" />
        </g>
      </svg>
      <SideFigure sex={p.sex} x={S.left + 470} y={cy - 220} size={240} talking={talking} frame={frame} />
    </>
  );
};
