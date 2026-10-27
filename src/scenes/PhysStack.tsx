import React from 'react';
import {useCurrentFrame} from 'remotion';
import {prog} from '../lib/anim';
import {stackLayout, stackSim} from '../lib/physics.mjs';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, Quiet, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {physClock, simFrame, Tag} from './kit/phys';
import {Sfx} from './common';

type Item = {label: string; value: number; shown?: string; hl?: boolean};
type P = {
  /** the comparison's title (2 lines at most) */
  title?: string;
  /** 2 or 3 columns: each value stacks value / per blocks */
  items: Item[];
  /** one block's worth (default the biggest value over 12, rounded to a nice step); the legend says it */
  per?: number;
  /** the values' unit (" ₾", " კმ") */
  unit?: string;
  /** whose figures they are: REQUIRED for real figures (tools/ci/physlint.mjs PHYS_SOURCE) */
  source?: string;
  /** the highlighted column's tone (default the film's accent) */
  t?: P2Tone;
  /** the chunk the blocks start falling on */
  at?: number | string;
  seed?: number;
};

// PhysStack (round 3): a comparison as blocks that drop into 2 or 3 columns and stack (src/lib/physics.mjs, Matter.js, a
// fixed clock from the shot's first frame). All columns rise together, block by block; the short ones stop first, the tall
// one keeps growing: the gap is felt. Each column's value lands on its settled top; one block is `per` (the legend).
export const PhysStack: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const {start, pour, simAt} = physClock(ctx, p.at);
  const items = (p.items ?? []).slice(0, 3);
  const props = {items: items.map((i) => ({value: i.value})), per: p.per, seed: p.seed, at: simAt};
  const L = stackLayout(props);
  const sim = stackSim(props);
  const sf = simFrame(frame, start);
  const a = sim.at(sf);
  const hasHl = items.some((i) => i.hl);
  const unit = p.unit ?? '';
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10));
  // a column is settled 16 frames after its last block was spawned (physics.mjs stackSim: block j of column c at j*every + c)
  const doneAt = L.counts.map((n, c) => start + simAt + Math.max(0, n - 1) * L.every + c + 16);
  const legendW = 230;
  const fill = (c: number) => (items[c]?.hl ? tone(p.t ?? 'accent') : hasHl ? C.ink2 : C.ink);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: L.floor - 220})}}>
      {p.title ? <FitText text={p.title} x={S.left} y={S.top + 4} w={S.right - S.left} size={84} min={48} maxLines={2} weight={700} at={Math.max(start, 0)} /> : null}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={S.left} x2={S.right} y1={L.floor + 3} y2={L.floor + 3} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={prog(frame, start + 2, 8)} />
        {sim.bodies.map((b, i) => {
          if (!a[i * 5 + 3]) return null;
          const c = b.plugin?.col ?? 0;
          const born = simAt + (b.plugin?.j ?? 0) * L.every + c;
          const pop = Math.min(1, Math.max(0, (sf - born + 1) / 4));
          const x = a[i * 5];
          const y = a[i * 5 + 1];
          const deg = (a[i * 5 + 2] * 180) / Math.PI;
          return (
            <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(3)}) scale(${(0.6 + 0.4 * pop).toFixed(4)})`} opacity={Math.min(1, pop * 1.5)}>
              <rect x={-L.bw / 2} y={-L.bh / 2} width={L.bw} height={L.bh} rx={7} fill={fill(c)} />
              <line x1={-L.bw / 2 + 14} x2={L.bw / 2 - 14} y1={-L.bh / 2 + 6} y2={-L.bh / 2 + 6} stroke="rgba(255,255,255,0.28)" strokeWidth={3} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {items.map((it, c) => {
        const top = L.floor - L.counts[c] * L.bh;
        return (
          <React.Fragment key={c}>
            <FitText text={it.shown ?? `${fmt(it.value)}${unit}`} x={L.cols[c]} y={top - 86} w={L.colW - 8} size={68} min={40} maxLines={1} weight={700} align="center" t={it.hl ? (p.t ?? 'accent') : 'ink'} at={doneAt[c]} anim="slam" latin />
            <FitText text={it.label} x={L.cols[c]} y={L.floor + 22} w={L.colW - 8} size={46} min={34} maxLines={1} weight={600} align="center" t={it.hl ? 'ink' : 'quiet'} at={Math.max(start, 0) + 4} anim="none" />
          </React.Fragment>
        );
      })}
      {p.source ? <Quiet text={p.source} x={S.left} y={L.floor + 84} w={S.right - S.left - legendW - 16} at={Math.max(...doneAt)} /> : null}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: prog(frame, pour + 6, 8)}}>
        <rect x={S.right - legendW} y={L.floor + 92} width={34} height={22} rx={4} fill={hasHl ? C.ink2 : C.ink} />
      </svg>
      <Tag text={`= ${fmt(L.per)}${unit}`} x={S.right - legendW + 46} y={L.floor + 84} size={34} weight={500} w={legendW - 46} opacity={prog(frame, pour + 6, 8)} latin />
      <Sfx name="cc0-wood-tap" at={start + simAt + 10} volume={0.3} /* event: the first blocks land */ />
      <Sfx name="cc0-wood-knock" at={Math.max(...doneAt) - 14} volume={0.3} /* event: the tall column's last block lands */ />
    </div>
  );
};
