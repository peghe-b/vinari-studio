import React from 'react';
import {useCurrentFrame} from 'remotion';
import {prog} from '../lib/anim';
import {TXT} from '../lib/layer';
import {countLayout, countSim} from '../lib/physics.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {drift, FitText, Quiet, RollDigits, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {physClock, physLog, simFrame, vesselPath} from './kit/phys';
import {Sfx} from './common';

type P = {
  /** how many of `of` (the marked balls) */
  n: number;
  /** out of how many (100 at most; default 100) */
  of?: number;
  /** what the marked ones are (3 words at most, one line) */
  label: string;
  /** the left bin's word (the marked ones) and the right bin's (the rest): one short word each */
  yes?: string;
  no?: string;
  /** "32%" instead of "32/100" (only when of is 100) */
  pct?: boolean;
  /** whose figure it is: REQUIRED (tools/ci/physlint.mjs PHYS_SOURCE) */
  source?: string;
  /** the marked balls' tone: red (default), accent the film's one accent */
  t?: P2Tone;
  /** the chunk the pour starts on */
  at?: number | string;
  seed?: number;
};

// PhysCount (round 3): "N of M" as M balls pouring from above into two bins, the N marked ones (the data tone) into the
// left, the rest (grey) into the right, simulated (src/lib/physics.mjs, Matter.js) on a fixed clock from the shot's first
// frame. The piles' heights are the split; the figure rolls as they pour.
export const PhysCount: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const {start, pour, simAt} = physClock(ctx, p.at);
  const props = {n: p.n, of: p.of ?? 100, seed: p.seed, at: simAt};
  const L = countLayout(props);
  const sim = countSim(props);
  const sf = simFrame(frame, start);
  const a = sim.at(sf);
  physLog('PhysCount', sf, a);
  const col = tone(p.t ?? 'red');
  const pct = Boolean(p.pct) && L.of === 100;
  const rollDur = L.pour + 12;
  const doneAt = start + simAt + L.pour + 14;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: L.floor - 200})}}>
      <div style={{position: 'absolute', left: S.left, top: S.top + 4, display: 'flex', alignItems: 'baseline'}}>
        <RollDigits text={String(L.n)} at={pour + 4} size={170} t={p.t ?? 'red'} dur={rollDur} />
        <span className={TXT} style={{fontFamily: F.sans, fontWeight: 600, fontSize: pct ? 110 : 72, color: pct ? col : C.ink2, marginLeft: pct ? 4 : 16}}>{pct ? '%' : `/${L.of}`}</span>
      </div>
      <FitText text={p.label} x={S.left} y={S.top + 196} w={S.right - S.left} size={52} min={36} maxLines={1} weight={600} at={start + 4} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {sim.bodies.map((b, i) => {
          if (!a[i * 5 + 3]) return null;
          const born = simAt + Math.floor((i * L.pour) / L.of); // physics.mjs countSim: ball i's spawn frame
          const pop = Math.min(1, Math.max(0, (sf - born + 1) / 4));
          return <circle key={i} cx={a[i * 5]} cy={a[i * 5 + 1]} r={L.r * (0.55 + 0.45 * pop) * 0.96} fill={b.plugin?.mark ? col : C.ink2} />;
        })}
        {L.bins.map((bin, k) => (
          <path key={k} d={vesselPath(bin.x0 - L.wall / 2, bin.x1 + L.wall / 2, L.top, L.floor + L.wall / 2, 24)} fill="none" stroke={C.ink} strokeWidth={L.wall} strokeLinecap="round" strokeLinejoin="round" opacity={prog(frame, start + 2, 8)} />
        ))}
      </svg>
      {[
        {k: 0, text: `${L.n}${p.yes ? ` ${p.yes}` : ''}`, t: (p.t ?? 'red') as P2Tone},
        {k: 1, text: `${L.of - L.n}${p.no ? ` ${p.no}` : ''}`, t: 'quiet' as P2Tone},
      ].map(({k, text, t}) => (
        <FitText key={k} text={text} x={(L.bins[k].x0 + L.bins[k].x1) / 2} y={L.floor + 20} w={L.bins[k].x1 - L.bins[k].x0} size={48} min={34} maxLines={1} weight={700} align="center" t={t} at={doneAt} anim="rise" />
      ))}
      {p.source ? <Quiet text={p.source} x={S.left} y={L.floor + 86} w={S.right - S.left} at={doneAt} /> : null}
      <Sfx name="asmr-count-roll" at={pour + 4} volume={0.32} /* event: the balls start pouring */ />
      <Sfx name="cc0-chips-stack" at={start + simAt + 12} volume={0.24} /* event: the first balls land */ />
    </div>
  );
};
