import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines} from '../lib/textfit.mjs';
import {C, dataAccent, dataAccentOn, F} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Row = {label: string; a: number; b: number; hl?: boolean};
type P = {
  title?: string;
  /** at most 6 rows: their value before (a) and after (b) */
  rows: Row[];
  /** the unit after a value („₾", „%", „კმ") */
  unit?: string;
  /** the chunk the ranking shifts on */
  at?: number;
  source?: string;
};

// RankShift (phase 2): a ranking that changes in stages, never all at once: 1) the scale (the axis max moves to the new
// largest), 2) the values (each bar grows or shrinks), 3) the rows (they reorder). Bars start at zero. The highlighted row
// takes the film's data accent (or red when it has none); every other bar is ink grey.
export const RankShift: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const rows = (p.rows ?? []).slice(0, 6);
  const n = rows.length;
  if (!n) return null;
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(0, base) + 30;
  const s1 = ease.data(Math.min(1, Math.max(0, (frame - at) / 12))); // the scale
  const s2 = ease.data(Math.min(1, Math.max(0, (frame - at - 10) / 14))); // the values
  const s3 = ease.data(Math.min(1, Math.max(0, (frame - at - 22) / 14))); // the order
  const maxA = Math.max(...rows.map((r) => r.a), 1e-9);
  const maxB = Math.max(...rows.map((r) => r.b), 1e-9);
  const max = maxA + (maxB - maxA) * s1;
  const rankA = [...rows.keys()].sort((i, j) => rows[j].a - rows[i].a);
  const rankB = [...rows.keys()].sort((i, j) => rows[j].b - rows[i].b);
  const top = S.top + (p.title ? 150 : 40);
  const rowH = Math.min(190, (S.bottom - top - 80) / n);
  const labelW = 300;
  const barX = S.left + labelW + 20;
  const barW = S.right - barX - 150;
  const hl = dataAccentOn() ? dataAccent() : C.downLine;
  const grow = prog(frame, base + 4, 18, ease.data);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      {p.title ? <FitText text={p.title} x={S.left} y={S.top + 10} w={S.right - S.left} size={64} min={40} maxLines={1} weight={700} at={base + 2} /> : null}
      {rows.map((r, i) => {
        const ya = rankA.indexOf(i);
        const yb = rankB.indexOf(i);
        const y = top + (ya + (yb - ya) * s3) * rowH;
        const v = r.a + (r.b - r.a) * s2;
        const w = Math.max(4, (barW * v * grow) / max);
        const lf = fitLines(r.label, labelW, 1, 44, {weight: 600, mtav: true, min: 34});
        return (
          <React.Fragment key={i}>
            <div className={TXT} style={{position: 'absolute', left: S.left, width: labelW, top: y + rowH / 2 - 28, textAlign: 'right', fontFamily: F.sans, fontWeight: r.hl ? 700 : 600, fontSize: lf.size, lineHeight: '56px', color: C.ink, whiteSpace: 'nowrap'}}>
              {mtav(lf.lines[0] ?? '')}
            </div>
            <div className="vn-obj" style={{position: 'absolute', left: barX, top: y + rowH * 0.18, width: w, height: rowH * 0.64, borderRadius: 10, background: r.hl ? hl : C.ink2}} />
            <div className={TXT} style={{position: 'absolute', left: barX + w + 16, top: y + rowH / 2 - 28, fontFamily: F.sans, fontWeight: 700, fontSize: 44, lineHeight: '56px', color: r.hl ? hl : C.ink, fontFeatureSettings: '"tnum" 1', whiteSpace: 'nowrap'}}>
              {`${Math.round(v)}${p.unit ?? ''}`}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: barX, top: top - 10, width: 3, height: n * rowH + 20, background: C.ink}} />
      {p.source ? <FitText text={p.source} x={S.left} y={top + n * rowH + 30} w={S.right - S.left} size={34} min={30} maxLines={1} weight={500} t="quiet" at={at + 36} anim="none" /> : null}
      <Sfx name="asmr-slide" at={at + 22} volume={0.3} /* event: the rows reorder */ />
    </div>
  );
};
