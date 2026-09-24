import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, logZoom, prog} from '../lib/anim';
import {capsLatin, fmt, mtav, NumFormat} from '../lib/format';
import {TXT} from '../lib/layer';
import {C, F, Tone, toneBig, toneLine, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, Haptic, lead, Sfx, SourceLine, vary} from './common';

type Item = {label: string; value: number; tone?: Tone; at?: number};
type P = {items: Item[]; format?: NumFormat; source?: string};

// pollar's scale comparison: squares whose AREA is the value, sharing a bottom-left corner,
// with a continuous log-space zoom-out so every step feels equally large.
export const Squares: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const items = [...p.items].sort((a, b) => a.value - b.value);
  const sides = items.map((i) => Math.sqrt(i.value));
  // the shared corner sits low in the content box (stage 380..1280): the biggest square (700) spans
  // x 150..850 (clear of the like column at its foot) and y 530..1230
  const ax = 150;
  const ay = 1230;
  const s0 = 700 / Math.max(1e-9, sides[0]);
  const s1 = Math.min(s0, 700 / Math.max(1e-9, sides[sides.length - 1]));
  const zt = prog(frame, base, Math.max(30, ctx.dur - 10), ease.camera);
  const s = logZoom(s0, s1, zt);
  const appear = items.map((it, i) => (it.at !== undefined ? cueFrame(ctx, it.at) : base + Math.round((i / items.length) * ctx.dur * 0.6)));
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {items.map((it, i) => {
          const side = sides[i] * s;
          const d = prog(frame, appear[i], 24, ease.drawOn);
          const per = side * 4;
          const col = toneLine(it.tone);
          return (
            <g key={i}>
              <rect x={ax} y={ay - side} width={side} height={side} fill={col} fillOpacity={it.tone && it.tone !== 'neutral' ? 0.1 * d : 0.035 * d} />
              <rect
                x={ax}
                y={ay - side}
                width={side}
                height={side}
                fill="none"
                stroke={col}
                strokeWidth={it.tone && it.tone !== 'neutral' ? 3 : 2}
                strokeDasharray={per}
                strokeDashoffset={per * (1 - d)}
              />
            </g>
          );
        })}
      </svg>
      {items.map((it, i) => {
        const side = sides[i] * s;
        const o = prog(frame, appear[i] + 10, 10);
        const small = side < 170;
        return (
          <div
            key={i}
            className={TXT}
            style={{
              position: 'absolute',
              left: ax + (small ? side + 18 : 18),
              top: ay - side + (small ? 0 : 16),
              fontFamily: F.mono,
              fontSize: 24,
              letterSpacing: '0.05em',
              color: C.ink2,
              opacity: o,
              whiteSpace: 'nowrap',
            }}
          >
            {mtav(capsLatin(it.label))}
            <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 46, letterSpacing: 0, color: toneBig(it.tone), fontFeatureSettings: '"tnum" 1'}}>{fmt(it.value, p.format ?? 'int')}</div>
          </div>
        );
      })}
      <SourceLine text={p.source} at={base + 30} y={1246} />
      {appear.map((a, i) => <Sfx key={i} name="asmr-pencil" at={a} volume={0.4 * vary(i, 0.15)} len={26} /* event: a square's outline draws (24 frames) */ />)}
      {appear.map((a, i) => <Haptic key={`h${i}`} kind="light" at={a + 24} volume={0.36 * vary(i + 5, 0.15)} /* event: the square closes, its value is in */ />)}
    </>
  );
};
