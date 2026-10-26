import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines} from '../lib/textfit.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import {card, drift, FitText, S, shadow, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Row = {label: string; value: string; t?: P2Tone; at?: number};
type P = {
  /** the receipt's head: what it is the cost of (3 words at most) */
  title?: string;
  rows: Row[];
  total: {label: string; value: string; t?: P2Tone};
  /** the chunk the total prints on (default after the last row) */
  totalAt?: number;
  /** a source line under the receipt (required for a real figure) */
  source?: string;
};

const W = 780;
const ROW_H = 92;

// Receipt (phase 2; the owner hates the customs bar chart): a cost built up line by line like a till receipt, white paper
// with a torn foot on the paper field. Each row prints with the paper sound, the total under a double rule, circled. Colour
// is data only: the total in red when it costs the viewer (one hue a frame).
export const Receipt: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const rows = (p.rows ?? []).slice(0, 6);
  const rowAt = rows.map((r, i) => (r.at !== undefined ? cueFrame(ctx, r.at) : Math.max(0, base) + 10 + i * 9));
  const totalAt = p.totalAt !== undefined ? cueFrame(ctx, p.totalAt) : (rowAt[rowAt.length - 1] ?? 10) + 14;
  const head = p.title ? 120 : 40;
  const H = head + rows.length * ROW_H + 60 + 130 + 40;
  const x = S.cx - W / 2;
  const y = Math.max(S.top + 10, S.cy - H / 2 - 30);
  const enter = spr(frame, base, 'enterXL');
  // the paper's torn foot: a zigzag
  const teeth = Array.from({length: 27}, (_, i) => `${(i * W) / 26},${i % 2 ? 0 : 18}`).join(' ');
  const totalY = y + head + rows.length * ROW_H + 60;
  const labelW = W - 120 - 260;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: totalY})}}>
      <div className="vn-obj" style={{position: 'absolute', left: x, top: y, width: W, height: H, opacity: Math.min(1, enter * 1.4), transform: `translateY(${(1 - enter) * 80}px)`}}>
        <div style={{position: 'absolute', inset: 0, bottom: 18, background: card(), boxShadow: shadow(), borderRadius: '18px 18px 0 0'}} />
        <svg width={W} height={18} style={{position: 'absolute', left: 0, bottom: 0}}>
          <polygon points={`0,0 ${teeth} ${W},0`} fill={card()} />
        </svg>
      </div>
      {p.title ? <FitText text={p.title} x={x + 60} y={y + 40} w={W - 120} size={50} min={36} maxLines={1} weight={700} at={base + 4} /> : null}
      {p.title ? <div style={{position: 'absolute', left: x + 60, width: W - 120, top: y + 108, borderTop: `3px dashed ${C.rule}`}} /> : null}
      {rows.map((r, i) => {
        const a = rowAt[i];
        const on = prog(frame, a, 6, ease.enter);
        const ry = y + head + i * ROW_H + 20;
        const lf = fitLines(r.label, labelW, 1, 46, {weight: 500, mtav: true, min: 34});
        return (
          <React.Fragment key={i}>
            <div className={TXT} style={{position: 'absolute', left: x + 60, width: labelW, top: ry, fontFamily: F.sans, fontWeight: 500, fontSize: lf.size, lineHeight: '60px', color: C.ink, whiteSpace: 'nowrap', opacity: on, clipPath: `inset(0 ${(1 - on) * 100}% 0 0)`}}>
              {mtav(lf.lines[0] ?? '')}
            </div>
            <div className={TXT} style={{position: 'absolute', left: x + W - 60 - 260, width: 260, top: ry, textAlign: 'right', fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: '60px', color: tone(r.t), fontFeatureSettings: '"tnum" 1', whiteSpace: 'nowrap', opacity: on}}>
              {r.value}
            </div>
            <Sfx name="asmr-paper" at={a} volume={0.24} /* event: a line prints */ />
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: x + 60, width: W - 120, top: totalY - 14, height: 10, borderTop: `3px solid ${C.ink}`, borderBottom: `3px solid ${C.ink}`, opacity: prog(frame, totalAt - 4, 6)}} />
      <FitText text={p.total.label} x={x + 60} y={totalY + 22} w={labelW} size={52} min={36} maxLines={1} weight={700} at={totalAt} anim="rise" />
      <div className={TXT} style={{position: 'absolute', left: x + W - 60 - 320, width: 320, top: totalY + 8, textAlign: 'right', fontFamily: F.sans, fontWeight: 700, fontSize: 84, lineHeight: '96px', color: tone(p.total.t ?? 'red'), fontFeatureSettings: '"tnum" 1', whiteSpace: 'nowrap', opacity: prog(frame, totalAt, 5), transform: `scale(${1.2 - 0.2 * Math.min(1, spr(frame, totalAt, 'punch'))})`, transformOrigin: 'right center'}}>
        {p.total.value}
      </div>
      <Ink marks={[{kind: 'circle', box: {x: x + W - 60 - 300, y: totalY + 14, w: 300, h: 84}, at: totalAt + 10}]} end={ctx.dur} />
      {p.source ? <FitText text={p.source} x={x} y={y + H + 30} w={W} size={34} min={30} maxLines={1} weight={500} t="quiet" at={totalAt + 6} anim="none" /> : null}
      <Sfx name="asmr-paper-tear" at={totalAt} volume={0.3} /* event: the total prints */ />
    </div>
  );
};
