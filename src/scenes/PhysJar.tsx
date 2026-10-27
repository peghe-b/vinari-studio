import React from 'react';
import {useCurrentFrame} from 'remotion';
import {prog} from '../lib/anim';
import {budgetY, jarLayout, jarSim, landing} from '../lib/physics.mjs';
import {TXT} from '../lib/layer';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, Quiet, RollDigits, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {Coin, Drop, physClock, physLog, simFrame, Tag, vesselPath} from './kit/phys';
import {Sfx} from './common';

type P = {
  /** the figure (a cost): its coins pour into the jar */
  value: number;
  /** the figure as it is shown when it is not the plain number ("1 200") */
  shown?: string;
  /** its unit after the number (" ₾", " ლ") */
  unit?: string;
  /** what the figure is (3 words at most, one line) */
  label: string;
  /** whose figure it is: REQUIRED for a real figure (tools/ci/physlint.mjs PHYS_SOURCE) */
  source?: string;
  /** what one coin (or drop) is worth: default a nice step that gives about 36 */
  per?: number;
  /** a budget: a dashed line where that much reaches in this jar (measured on its own pour), its tag on the right */
  of?: number;
  ofShown?: string;
  /** the budget line's word (one short word: „ბიუჯეტი", „ლიმიტი") */
  ofLabel?: string;
  /** coins (money) or drops (fuel) */
  kind?: 'coin' | 'drop';
  /** the data tone: red a cost (default), accent the film's one accent */
  t?: P2Tone;
  /** the chunk the pour starts on */
  at?: number | string;
  seed?: number;
};

// PhysJar (round 3): a cost as coins (or fuel drops) pouring into a jar, simulated (src/lib/physics.mjs, Matter.js) on a
// fixed clock from the shot's first frame: the same pile on every render. The figure rolls up as the coins fall; one coin
// is `per` (the legend says so); a budget is a dashed line where the budget's own coins reach, so the pile ends under it
// or heaps over it.
export const PhysJar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const {start, pour, simAt} = physClock(ctx, p.at);
  const props = {value: p.value, per: p.per, of: p.of, kind: p.kind, seed: p.seed, at: simAt};
  const L = jarLayout(props);
  const sim = jarSim(props);
  const sf = simFrame(frame, start);
  const a = sim.at(sf);
  physLog('PhysJar', sf, a);
  const col = tone(p.t ?? 'red');
  const drop = p.kind === 'drop';
  const unit = p.unit ?? '';
  const {jar} = L;
  const by = L.of ? budgetY(props) : null;
  const first = landing(sim, 0, simAt, simAt + 60);
  const rollDur = L.pour + 14;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10));
  const legendW = 230;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: (jar.x0 + jar.x1) / 2, y: jar.floor - 200})}}>
      <div style={{position: 'absolute', left: S.left, top: S.top + 4, display: 'flex', alignItems: 'baseline'}}>
        <RollDigits text={p.shown ?? fmt(p.value)} at={pour + 4} size={170} t={p.t ?? 'red'} dur={rollDur} />
        {unit.trim() ? <span className={TXT} style={{fontFamily: F.sans, fontWeight: 700, fontSize: 86, color: C.ink2, marginLeft: 18}}>{unit.trim()}</span> : null}
      </div>
      <FitText text={p.label} x={S.left} y={S.top + 196} w={S.right - S.left} size={52} min={36} maxLines={1} weight={600} at={start + 4} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {sim.bodies.map((_, i) => {
          if (!a[i * 5 + 3]) return null;
          const born = simAt + Math.floor((i * L.pour) / L.n); // physics.mjs jarSim: coin i's spawn frame
          const pop = Math.min(1, Math.max(0, (sf - born + 1) / 4));
          const x = a[i * 5];
          const y = a[i * 5 + 1];
          return drop ? <Drop key={i} x={x} y={y} r={L.r} speed={a[i * 5 + 4]} fill={col} pop={pop} /> : <Coin key={i} x={x} y={y} r={L.r} a={a[i * 5 + 2]} fill={col} pop={pop} />;
        })}
        <path d={vesselPath(jar.x0 - jar.wall / 2, jar.x1 + jar.wall / 2, jar.top - 10, jar.floor + jar.wall / 2, 26)} fill="none" stroke={C.ink} strokeWidth={jar.wall} strokeLinecap="round" strokeLinejoin="round" opacity={prog(frame, start + 2, 8)} />
        {by !== null ? <line x1={jar.x0 - 22} x2={jar.x1 + 22} y1={by} y2={by} stroke={C.ink} strokeWidth={5} strokeDasharray="18 12" strokeLinecap="round" opacity={prog(frame, pour - 6, 8)} /> : null}
      </svg>
      {by !== null ? (
        <>
          {p.ofLabel ? <FitText text={p.ofLabel} x={jar.x1 + 34} y={by - 96} w={894 - (jar.x1 + 34)} size={36} min={34} maxLines={1} weight={500} t="quiet" at={pour - 6} anim="none" /> : null}
          <FitText text={p.ofShown ?? `${fmt(L.of ?? 0)}${unit}`} x={jar.x1 + 34} y={by - 56} w={894 - (jar.x1 + 34)} size={46} min={34} maxLines={1} weight={700} at={pour - 6} anim="none" latin />
        </>
      ) : null}
      {p.source ? <Quiet text={p.source} x={S.left} y={jar.floor + 22} w={S.right - S.left - legendW - 16} at={pour + rollDur} /> : null}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: prog(frame, pour + 6, 8)}}>
        {drop ? <Drop x={S.right - legendW + 18} y={jar.floor + 46} r={13} speed={0} fill={col} /> : <Coin x={S.right - legendW + 18} y={jar.floor + 43} r={16} a={-0.6} fill={col} />}
      </svg>
      <Tag text={`= ${fmt(L.per)}${unit}`} x={S.right - legendW + 44} y={jar.floor + 22} size={34} weight={500} w={legendW - 44} opacity={prog(frame, pour + 6, 8)} latin />
      <Sfx name={drop ? 'asmr-drop' : 'cc0-chip'} at={start + (first ?? simAt + 12)} volume={0.32} /* event: the first coin lands */ />
      <Sfx name={drop ? 'asmr-swell' : 'cc0-chips-stack'} at={start + simAt + Math.round(L.pour * 0.6)} volume={0.28} /* event: the pile builds */ />
    </div>
  );
};
