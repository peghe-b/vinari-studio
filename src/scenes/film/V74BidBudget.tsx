// v74-bid-budget: the budget as one long bar. A bid marker runs to its far end ("all of it?"), then the costs that
// come after the hammer (the ship, the port, the tax) break off the right end, drop and line up as three cards in a
// queue, and the marker is pushed back to what is left: the bid, which turns green. Schematic: no numbers.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneText} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  budget?: string; // the bar's label
  bid?: string; // the marker's word
  costs?: string[]; // the three pieces, left to right
  runAt?: number | string; // the marker runs to the end
  splitAt?: number | string; // the costs break off
  lineAt?: number | string; // they land in the queue, one by one
};

const X0 = 150;
const X1 = 930;
const W = X1 - X0;
const BAR_Y = 700;
const BAR_H = 110;
const BID = 0.59; // where the bid ends on the bar (schematic)
const CUTS = [0.59, 0.74, 0.84, 1];
const ROW_Y = 960;
const ROW_H = 104;
const CARD_W = 232;
const GAP = 42;

export const V74BidBudget: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const costs = p.costs ?? ['გემი', 'პორტი', 'გადასახადი'];
  const run = Math.max(base + 8, cueFrame(ctx, p.runAt ?? 1));
  const split = Math.max(run + 20, cueFrame(ctx, p.splitAt ?? 2));
  const line = Math.max(split + 16, cueFrame(ctx, p.lineAt ?? 3));
  const STEP = 7;
  const settle = line + 3 * STEP + 8;

  const draw = prog(frame, e, 24, ease.drawOn);
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  // the marker: 0.3 at rest, runs to the end, then the costs push it back to the bid
  const runT = prog(frame, run, 22, ease.camera);
  const backT = prog(frame, split + 4, 26, ease.camera);
  const mark = lerp(lerp(0.3, 1, runT), BID, backT);
  const mx = X0 + W * mark;
  const green = spr(frame, settle, 'land');
  const bidTone = toneBig('up');

  // label sizes
  const tagWord = mtav(frame >= settle ? (p.bid ?? 'ბიდი') : `${p.bid ?? 'ბიდი'}?`);
  const budgetWord = mtav(p.budget ?? 'ბიუჯეტი');
  const cardSize = (s: string) => Math.min(36, Math.floor((36 * (CARD_W - 36)) / Math.max(1, textWidth(mtav(s), `600 36px ${F.sans}`))));

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the bar's outline draws on */}
          <rect x={X0} y={BAR_Y} width={W} height={BAR_H} rx={22} fill="none" stroke={C.rule} strokeWidth={2} strokeDasharray={2 * (W + BAR_H)} strokeDashoffset={2 * (W + BAR_H) * (1 - draw)} />
          {/* the bid part */}
          <rect x={X0 + 6} y={BAR_Y + 6} width={W * BID - 9} height={BAR_H - 12} rx={17} fill={green > 0.01 ? bidTone : C.ink} opacity={draw * 0.92} />
          {/* the three cost pieces: in the bar, then dropping into a queue */}
          {costs.slice(0, 3).map((_, i) => {
            const a = CUTS[+i];
            const b = CUTS[+i + 1];
            const t = prog(frame, split + i * 5, 24, ease.camera);
            const q = spr(frame, line + i * STEP, 'land');
            const x0 = X0 + W * a + 3;
            const w0 = W * (b - a) - 6;
            const x1 = X0 + (W - (3 * CARD_W + 2 * GAP)) / 2 + i * (CARD_W + GAP);
            const yy = lerp(BAR_Y + 6, lerp(BAR_Y + 150, ROW_Y, q), t);
            const x = lerp(x0, x1, Math.min(1, t * 1.2));
            const w = lerp(w0, CARD_W, Math.min(1, t * 1.2));
            const h = lerp(BAR_H - 12, ROW_H, t);
            return <rect key={i} x={x} y={yy} width={w} height={h} rx={lerp(17, 20, t)} fill={t > 0.02 ? C.surface : C.ink} stroke={t > 0.02 ? toneBig('down') : 'none'} strokeWidth={2.2} opacity={draw} />;
          })}
          {/* the marker */}
          <line x1={mx} y1={BAR_Y - 34} x2={mx} y2={BAR_Y + BAR_H + 22} stroke={green > 0.01 ? bidTone : C.ink} strokeWidth={3} strokeLinecap="round" opacity={draw} />
          <circle cx={mx} cy={BAR_Y - 34} r={6} fill={green > 0.01 ? bidTone : C.ink} opacity={draw} />
          {/* a soft ring when the bid settles */}
          <rect x={X0 + 6 - 14 * green} y={BAR_Y + 6 - 14 * green} width={W * BID - 9 + 28 * green} height={BAR_H - 12 + 28 * green} rx={24} fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={1.5} opacity={frame >= settle ? 1 - green * 0.7 : 0} />
        </svg>
        {/* the budget word, left over the bar */}
        <div className={TXT} style={{position: 'absolute', left: X0, top: BAR_Y - 74, fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: C.ink2, opacity: draw}}>
          {budgetWord}
        </div>
        {/* the marker's tag */}
        <div className={TXT} style={{position: 'absolute', left: mx - 200, width: 400, top: BAR_Y - 112, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 46, color: green > 0.01 ? bidTone : C.ink, opacity: draw * (frame < split + 4 || frame >= split + 30 ? 1 : 0.4)}}>
          {tagWord}
        </div>
        {/* the cost cards' words */}
        {costs.slice(0, 3).map((s, i) => {
          const q = spr(frame, line + i * STEP, 'land');
          const x1 = X0 + (W - (3 * CARD_W + 2 * GAP)) / 2 + i * (CARD_W + GAP);
          return (
            <div key={i} className={TXT} style={{position: 'absolute', left: x1, width: CARD_W, top: ROW_Y, height: ROW_H, lineHeight: `${ROW_H}px`, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: cardSize(s), color: toneText('down'), opacity: q, transform: `translateY(${(1 - q) * 12}px)`}}>
              {mtav(s)}
            </div>
          );
        })}
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.35} />
      <Sfx name="asmr-slide" at={run} volume={0.35} />
      <Sfx name="asmr-paper-tear" at={split} volume={0.35} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="asmr-knock" at={line + i * STEP} volume={0.4} />
      ))}
      <Haptic kind="light" at={split} />
      <Land at={settle} />
    </PictureBand>
  );
};
