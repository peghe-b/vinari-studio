import React from 'react';
import {useCurrentFrame} from 'remotion';
import {prog, spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, L, T, Tone, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, Sfx, SourceLine, vary} from './common';

type P = {n: number; cols?: number; filled?: number; big?: string; label?: string; tone?: Tone; at?: number; source?: string; check?: boolean};

// n unit cells filling one by one (29/29 matches, 187 measured months, 11 mechanic types).
export const Grid: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx); // the empty cells stand on the cut frame of a later scene
  const cols = p.cols ?? Math.ceil(Math.sqrt(p.n * 1.4));
  const rows = Math.ceil(p.n / cols);
  const filled = p.filled ?? p.n;
  const width = 1080 - 2 * L.side;
  const gap = 12;
  // cells up to 150 px; the grid never grows past 560 px tall (440 before the content box grew to
  // stage 1280), so the count, label and source keep their room under it, left of the like column
  const cell = Math.min(150, Math.floor((width - (cols - 1) * gap) / cols), Math.floor((560 - (rows - 1) * gap) / rows));
  const gridW = cols * cell + (cols - 1) * gap;
  const x0 = (1080 - gridW) / 2;
  // the block (cells, the big count, its label and source: about 234 px under the cells) is centred on the
  // content box (it sat at a fixed 440 and left the box's lower third empty)
  const y0 = Math.max(420, Math.round(L.contentMid - (rows * (cell + gap) + 234) / 2));
  const start = p.at !== undefined ? cueFrame(ctx, p.at) : base + 10;
  const stagger = Math.max(0.6, Math.min(2.2, 34 / filled));
  const fillEnd = start + filled * stagger;
  const color = toneLine(p.tone ?? 'up');
  const bigY = y0 + rows * (cell + gap) + 24;
  // the big word never wraps and ends left of the like column when it reaches below stage L.lowY (v5's
  // "ᲮᲝᲓᲝᲕᲝᲠᲘ" touched the heart); it shrinks to fit like a Title line
  const bigText = p.big !== undefined ? mtav(p.big) : `${p.n} / ${p.n}`;
  const bigRight = bigY + T.statL > L.lowY ? L.lowRight : L.safeRight;
  const bigSize = Math.min(T.statL, Math.floor((T.statL * (bigRight - x0)) / Math.max(1, textWidth(bigText, `600 ${T.statL}px ${F.sans}`))));
  const ticks = Array.from({length: Math.min(filled, 12)}, (_, i) => Math.round(start + (i * filled * stagger) / Math.min(filled, 12)));
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: p.n}, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = x0 + c * (cell + gap);
          const y = y0 + r * (cell + gap);
          const appear = prog(frame, e + (i % cols) * 1 + r * 1, 10);
          const on = i < filled ? prog(frame, start + i * stagger, 6) : 0;
          return (
            <g key={i} opacity={appear}>
              <rect x={x} y={y} width={cell} height={cell} rx={6} fill={color} fillOpacity={0.16 * on} stroke={on > 0.01 ? color : C.rule} strokeWidth={on > 0.01 ? 2.5 : 1.5} />
              {p.check !== false && on > 0.01 ? (
                <path
                  d={`M ${x + cell * 0.28} ${y + cell * 0.53} L ${x + cell * 0.44} ${y + cell * 0.68} L ${x + cell * 0.73} ${y + cell * 0.36}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={60}
                  strokeDashoffset={60 * (1 - on)}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div
        className={TXT}
        style={{
          position: 'absolute',
          top: bigY,
          left: x0,
          fontFamily: F.sans,
          fontWeight: 600,
          fontSize: bigSize,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          fontFeatureSettings: '"tnum" 1',
          color: toneLine(p.tone ?? 'up'),
          opacity: spr(frame, fillEnd - 4),
          transform: `translateY(${(1 - spr(frame, fillEnd - 4)) * 20}px)`,
        }}
      >
        {p.big !== undefined ? mtav(p.big) : `${Math.round(Math.min(filled, Math.max(0, (frame - start) / stagger)))} / ${p.n}`}
      </div>
      {p.label ? <MonoLabel text={p.label} at={fillEnd + 4} style={{position: 'absolute', top: bigY + 138, left: x0}} size={T.meta} /> : null}
      <SourceLine text={p.source} at={fillEnd + 10} y={bigY + 180} sfx={p.label ? false : undefined} />
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          {p.check !== false ? (
            <Sfx name="asmr-check" at={t} volume={0.42 * vary(i)} /* event: cells fill, their checks draw */ />
          ) : (
            <Sfx name="asmr-tick-fine" at={t} volume={0.5 * vary(i)} /* event: cells fill */ />
          )}
          {/* a selection haptic on every other step (the ticks are 3 frames apart), never on the landing's frame */}
          {i % 2 === 0 && fillEnd - t >= 3 ? <Haptic kind="selection" at={t} volume={0.24 * vary(i + 30, 0.2)} /> : null}
        </React.Fragment>
      ))}
      {/* event: the count lands. Green checks all in: the confirmed-good double tap and one quiet glint */}
      {p.check !== false && (p.tone ?? 'up') === 'up' ? (
        <>
          <Sfx name="asmr-land" at={fillEnd} volume={0.55} />
          <Haptic kind="success" at={fillEnd} volume={0.44} />
          <Sfx name="asmr-shimmer" at={fillEnd + 3} volume={0.4} />
        </>
      ) : (
        <Land at={fillEnd} volume={0.55} />
      )}
    </>
  );
};
