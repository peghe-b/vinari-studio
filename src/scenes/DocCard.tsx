import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {Card, drift, FitText, S, shadow, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Field = {label: string; value: string};
type P = {
  /** the paper's head (a patent, a ticket, a licence, a telegram: 3 words) */
  title: string;
  fields: Field[];
  /** the stamp across it („უარი", „PATENT", „1896") */
  stamp?: string;
  stampT?: P2Tone;
  at?: number;
};

// DocCard (phase 2, the story kit): a document of the story set in type (never a scan of a real one): a head, up to 4
// labelled fields filling in, and a stamp that slams across it with a knock.
export const DocCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // a film's first shot is settled at frame 0 (entrance() is its negative lead); later shots enter after the cut
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 30;
  const fields = (p.fields ?? []).slice(0, 4);
  const w = S.right - S.left - 60;
  const h = 200 + fields.length * 150 + (p.stamp ? 190 : 0);
  const x = S.left + 30;
  const y = Math.max(S.top + 10, S.cy - h / 2 - 20);
  const s = spr(frame, base, 'enter');
  const st = spr(frame, at, 'punch');
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: y + h / 2})}}>
      <Card x={x} y={y} w={w} h={h} r={14} style={{opacity: Math.min(1, s * 1.4), transform: `rotate(-1.2deg) translateY(${(1 - s) * 60}px)`}}>
        <div style={{position: 'absolute', left: 30, right: 30, top: 140, borderTop: `3px solid ${C.ink}`}} />
      </Card>
      <FitText text={p.title} x={x + 40} y={y + 44} w={w - 80} size={64} min={40} maxLines={1} weight={700} at={base + 4} />
      {fields.map((f, i) => {
        const fy = y + 180 + i * 150;
        return (
          <React.Fragment key={i}>
            <FitText text={f.label} x={x + 40} y={fy} w={w - 80} size={36} min={30} maxLines={1} weight={500} t="quiet" at={base + 8 + i * 6} anim="none" />
            <FitText text={f.value} x={x + 40} y={fy + 46} w={w - 80} size={56} min={36} maxLines={1} weight={700} at={base + 10 + i * 6} />
            <div style={{position: 'absolute', left: x + 40, top: fy + 118, width: (w - 80) * prog(frame, base + 8 + i * 6, 10, ease.pen), borderTop: `2px dashed ${C.rule}`}} />
          </React.Fragment>
        );
      })}
      {p.stamp ? (
        <div className="vn-t" style={{position: 'absolute', left: x + w - 420, top: y + h - 185, width: 380, height: 150, border: `8px solid ${tone(p.stampT ?? 'red')}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 700, fontSize: 72, color: tone(p.stampT ?? 'red'), background: 'rgba(255,255,255,0.6)', boxShadow: shadow(0.3), transform: `rotate(-9deg) scale(${(1.6 - 0.6 * Math.min(1, st)).toFixed(3)})`, opacity: frame < at ? 0 : Math.min(1, st * 1.5)}}>
          {p.stamp}
        </div>
      ) : null}
      {p.stamp ? <Sfx name="asmr-knock" at={at} volume={0.42} /* event: the stamp */ /> : null}
      <Sfx name="asmr-paper" at={base + 2} volume={0.28} /* event: the paper lands */ />
    </div>
  );
};
