// V41MemoryLine: the price line as memory draws it. A pencil sketches a wobbly line, it keeps changing its mind,
// a dot on "last year" doubts itself: it rises, it drops, and the line bends after it. Schematic, no numbers.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  from?: string; // the mono word under the left end
  to?: string; // the mono word under the right end
  morphAt?: number | string; // the sketch changes its mind
  dotAt?: number | string; // the marker and the dot drop on "last year"
  doubtAt?: number | string; // ghost dots: not sure
  upAt?: number | string; // the dot rises
  downAt?: number | string; // the dot drops
};

const X0 = 170;
const X1 = 910;
const BASE = 1060;
const MID = 820;
const N = 64;
const MU = 0.8; // where "last year" sits along the line

// two moods of the same memory
const shapeA = (u: number) => 88 * Math.sin(u * 5.2 + 0.5) + 46 * Math.sin(u * 13.1 + 1.3) + 16 * Math.sin(u * 29 + 0.2);
const shapeB = (u: number) => 80 * Math.sin(u * 4.1 + 2.2) + 52 * Math.sin(u * 11.3 + 0.1) + 18 * Math.sin(u * 25 + 2.6);

export const V41MemoryLine: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = Math.max(0, lead(ctx));
  const draw = prog(frame, e, 62, ease.drawOn);
  const fMorph = Math.max(base + 8, cueFrame(ctx, p.morphAt ?? 1));
  const fDot = Math.max(fMorph + 8, cueFrame(ctx, p.dotAt ?? 2));
  const fDoubt = Math.max(fDot + 8, cueFrame(ctx, p.doubtAt ?? 3));
  const fUp = Math.max(fDoubt + 8, cueFrame(ctx, p.upAt ?? 4));
  const fDown = Math.max(fUp + 8, cueFrame(ctx, p.downAt ?? 5));

  const morph = spr(frame, fMorph, 'enter');
  const wob = prog(frame, fMorph, 20, ease.camera);
  const dotIn = spr(frame, fDot, 'land');
  const doubt = spr(frame, fDoubt, 'enter');
  const up = spr(frame, fUp, 'land');
  const down = spr(frame, fDown, 'land');
  const off = -120 * up + 210 * down; // the dot's own doubt: up, then below where it began
  const smudge = lerp(0, 1, doubt);

  // the line: the mood blends A -> B, a slow tremble once it starts doubting, and it bends after the dot
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const g = Math.exp(-((u - MU) ** 2) / (2 * 0.07 * 0.07));
    const tremble = 5 * wob * Math.sin(frame * 0.11 + i * 0.63);
    ys.push(MID + lerp(shapeA(u), shapeB(u), morph) + tremble + off * g);
  }
  const pts = ys.map((y, i) => `${(X0 + ((X1 - X0) * i) / N).toFixed(1)},${y.toFixed(1)}`);
  const d = 'M ' + pts.join(' L ');
  const ghost = 'M ' + ys.map((y, i) => `${(X0 + ((X1 - X0) * i) / N + 2).toFixed(1)},${(y + 4 + 3 * Math.sin(i * 1.7)).toFixed(1)}`).join(' L ');

  const iDot = Math.round(MU * N);
  const dx = X0 + (X1 - X0) * MU;
  const dy = ys[iDot];
  const startY = MID + lerp(shapeA(MU), shapeB(MU), morph);
  // the pencil tip at the end of the drawn part
  const iTip = Math.min(N, Math.max(0, Math.round(draw * N)));
  const tipX = X0 + ((X1 - X0) * iTip) / N;
  const tipY = ys[iTip];

  const push = lerp(1, 1.08, prog(frame, e, ctx.dur, ease.camera));
  const ghosts = [-70, 55, -25];
  const fromW = mtav(p.from ?? 'ადრე');
  const toW = mtav(p.to ?? 'დღეს');

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${dx}px ${MID}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={X0} y1={BASE} x2={X1} y2={BASE} stroke={C.rule} strokeWidth={1.5} opacity={prog(frame, e, 20)} />
          <line x1={X0} y1={BASE - 8} x2={X0} y2={BASE + 8} stroke={C.rule} strokeWidth={1.5} />
          <line x1={X1} y1={BASE - 8} x2={X1} y2={BASE + 8} stroke={C.rule} strokeWidth={1.5} />
          {/* the second, looser pencil stroke: memory smudges as it doubts */}
          <path d={ghost} pathLength={1} fill="none" stroke={C.ink2} strokeWidth={1.6} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinecap="round" strokeLinejoin="round" opacity={0.35 + 0.3 * smudge} />
          <path d={d} pathLength={1} fill="none" stroke={C.ink} strokeWidth={2.4} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinecap="round" strokeLinejoin="round" opacity={1 - 0.35 * smudge} />
          {draw < 1 ? <circle cx={tipX} cy={tipY} r={5} fill={C.ink} /> : null}
          {/* "last year": the marker and the dot */}
          <line x1={dx} y1={BASE} x2={dx} y2={BASE - (BASE - 500) * dotIn} stroke={rgba(C.ink, 0.45)} strokeWidth={1.5} strokeDasharray="6 8" opacity={dotIn} />
          {ghosts.map((g, k) => {
            const a = spr(frame, fDoubt + k * 5, 'enter');
            return <circle key={k} cx={dx} cy={startY + g * a} r={9} fill="none" stroke={rgba(C.ink, 0.5)} strokeWidth={1.5} opacity={frame >= fDoubt + k * 5 ? a * (1 - 0.4 * down) : 0} />;
          })}
          {frame >= fUp ? <circle cx={dx} cy={startY - 120} r={6} fill={rgba(C.ink, 0.35)} opacity={up} /> : null}
          <circle cx={dx} cy={dy} r={26 + 18 * dotIn} fill="none" stroke={rgba(C.ink, 0.4)} strokeWidth={1.5} opacity={frame >= fDot ? 1 - dotIn * 0.85 : 0} />
          <circle cx={dx} cy={dy} r={12 * dotIn} fill={C.ink} opacity={frame >= fDot ? 1 : 0} />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: X0, top: BASE + 22, fontFamily: F.mono, fontSize: 26, color: C.ink2, opacity: prog(frame, e, 20)}}>
          {fromW}
        </div>
        <div className={TXT} style={{position: 'absolute', left: X1 - 300, width: 300, top: BASE + 22, textAlign: 'right', fontFamily: F.mono, fontSize: 26, color: C.ink2, opacity: prog(frame, e, 20)}}>
          {toW}
        </div>
        <div className={TXT} style={{position: 'absolute', left: dx - 60, width: 120, top: 430, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 64, color: C.ink, opacity: doubt * (1 - 0.6 * down), transform: `translateY(${(1 - doubt) * 14}px)`}}>
          ?
        </div>
      </div>
      <Sfx name="asmr-pencil-long" at={base + 2} volume={0.35} />
      <Sfx name="asmr-pencil-short" at={fMorph} volume={0.35} />
      <Sfx name="asmr-pop" at={fDot} volume={0.45} />
      <Haptic kind="light" at={fDot} />
      <Sfx name="asmr-tick-fine" at={fDoubt} volume={0.4} />
      <Sfx name="asmr-knock" at={fUp} volume={0.4} />
      <Haptic kind="light" at={fUp} />
      <Sfx name="asmr-knock" at={fDown} volume={0.35} />
      <Haptic kind="light" at={fDown} />
    </PictureBand>
  );
};
