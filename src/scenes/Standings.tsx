import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines} from '../lib/textfit.mjs';
import {C, dataAccent, dataAccentOn, F} from '../tokens';
import type {SceneCtx} from '../types';
import {Card, drift, FitText, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Row = {name: string; value: string; hl?: boolean};
type P = {title?: string; rows: Row[]; at?: number; source?: string};

// Standings (phase 2, the story kit): a results table as it stood (a championship, a race, a record list), 6 rows at most,
// typed in row by row; the story's row highlighted (the film's data accent, else ink on a grey band) and circled.
export const Standings: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 8;
  const rows = (p.rows ?? []).slice(0, 6);
  const w = S.right - S.left;
  const top = S.top + (p.title ? 130 : 20);
  const rowH = Math.min(130, (S.bottom - top - 80) / Math.max(1, rows.length));
  const hlc = dataAccentOn() ? dataAccent() : C.ink;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      {p.title ? <FitText text={p.title} x={S.left} y={S.top} w={w} size={64} min={40} maxLines={1} weight={700} at={base} /> : null}
      <Card x={S.left} y={top} w={w} h={rows.length * rowH + 40} r={28} />
      {rows.map((r, i) => {
        const on = prog(frame, at + i * 5, 6, ease.enter);
        const y = top + 20 + i * rowH;
        const lf = fitLines(r.name, w - 340, 1, 48, {weight: r.hl ? 700 : 600, mtav: true, min: 34});
        return (
          <React.Fragment key={i}>
            {r.hl ? <div style={{position: 'absolute', left: S.left + 16, top: y + 6, width: w - 32, height: rowH - 12, borderRadius: 16, background: 'rgba(11,11,11,0.06)', opacity: on}} /> : null}
            <div className={TXT} style={{position: 'absolute', left: S.left + 40, top: y + rowH / 2 - 30, width: 70, fontFamily: F.sans, fontWeight: 700, fontSize: 48, lineHeight: '60px', color: C.ink2, opacity: on}}>{i + 1}</div>
            <div className={TXT} style={{position: 'absolute', left: S.left + 120, top: y + rowH / 2 - 30, fontFamily: F.sans, fontWeight: r.hl ? 700 : 600, fontSize: lf.size, lineHeight: '60px', color: r.hl ? hlc : C.ink, whiteSpace: 'nowrap', opacity: on, clipPath: `inset(0 ${(1 - on) * 100}% 0 0)`}}>{mtav(lf.lines[0] ?? '')}</div>
            <div className={TXT} style={{position: 'absolute', left: S.right - 240, width: 200, top: y + rowH / 2 - 30, textAlign: 'right', fontFamily: F.sans, fontWeight: 700, fontSize: 48, lineHeight: '60px', color: r.hl ? hlc : C.ink, fontFeatureSettings: '"tnum" 1', opacity: on}}>{r.value}</div>
          </React.Fragment>
        );
      })}
      {p.source ? <FitText text={p.source} x={S.left} y={top + rows.length * rowH + 60} w={w} size={34} min={30} maxLines={1} weight={500} t="quiet" at={at + 20} anim="none" /> : null}
      <Sfx name="asmr-ui-tick-roll" at={at} volume={0.26} /* event: the rows type in */ />
    </div>
  );
};
