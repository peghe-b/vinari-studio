import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {S} from './kit/p2';

/** A head-and-shoulders silhouette in profile, solid ink, never a face (no eye, no mouth line): talking shows as the jaw
 *  dropping a few px and three short speech strokes in front of it. */
export const SideFigure: React.FC<{sex: 'm' | 'f'; x: number; y: number; size: number; talking?: boolean; frame: number; flip?: boolean}> = ({sex, x, y, size, talking, frame, flip}) => {
  const jaw = talking ? 6 * Math.abs(Math.sin(frame * 0.9)) : 0;
  const k = size / 300;
  const hair = sex === 'f' ? 'M -70 -150 C -120 -140 -128 -40 -110 40 C -100 70 -80 80 -60 70 L -60 -90 Z' : '';
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        <g className="vn-fig" transform={`translate(${x} ${y}) scale(${flip ? -k : k} ${k})`} fill={C.ink}>
          {hair ? <path d={hair} /> : null}
          <path d={`M -60 -150 C -10 -175 55 -160 70 -110 C 80 -80 78 -60 92 -40 C 98 -30 88 -24 80 -22 C 84 -10 80 0 74 4 C 78 14 ${74 + jaw * 0.2} ${24 + jaw} 60 ${30 + jaw} C 50 ${36 + jaw} 40 40 30 60 L 30 100 C 90 110 140 150 150 220 L -150 220 C -140 150 -100 112 -40 100 L -40 60 C -80 40 -100 0 -96 -60 C -92 -110 -80 -140 -60 -150 Z`} />
        </g>
        {talking
          ? [0, 1, 2].map((i) => {
              const a = (-0.5 + i * 0.5) * (flip ? -1 : 1);
              const r0 = 120 * k;
              const cx = x + (flip ? -1 : 1) * 95 * k;
              const cy = y - 20 * k;
              return <line key={i} x1={cx + Math.cos(a) * r0 * 0.4 * (flip ? -1 : 1)} y1={cy + Math.sin(a) * r0 * 0.4} x2={cx + Math.cos(a) * r0 * (flip ? -1 : 1)} y2={cy + Math.sin(a) * r0} stroke={C.ink} strokeWidth={8} strokeLinecap="round" opacity={0.5 + 0.5 * Math.abs(Math.sin(frame * 0.6 + i))} />;
            })
          : null}
      </svg>
    </>
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
