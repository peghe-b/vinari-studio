import React from 'react';
import {useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {fitLines, textW} from '../lib/textfit.mjs';
import {Ink} from './kit/ink';
import {Card, drift, FitText, S, shadow, tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** the verified bank item (ci/news-bank.json); the card shows what the spec gives it */
  news: string;
  /** the headline in Georgian (the bank's ka.twist or a shorter one; 8 words at most) */
  headline?: string;
  /** the date as shown („2026 წლის 20 ოქტომბერი") and the source chip („matsne.gov.ge") */
  date?: string;
  source?: string;
  /** fact | claim | demo: the stamp across the card („ფაქტი", „დაპირება", „ჯერ დემო") */
  status?: 'fact' | 'claim' | 'demo';
  /** the hinge word to circle in the headline (as written) */
  hinge?: string;
  at?: number;
};

const STAMP = {fact: 'ფაქტი', claim: 'დაპირება', demo: 'ჯერ დემო'} as const;

// NewsCard (phase 2, the humour kit): the twist's true news as a card that reads in 1.8 s: a date stamp, a source chip, the
// headline set big, and the status stamp across it (a claim is stamped a claim); the hinge word circled.
export const NewsCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // a film's first shot is settled at frame 0 (entrance() is its negative lead); later shots enter after the cut
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 10;
  const w = S.right - S.left;
  const y = S.top + 40;
  const h = 820;
  const s = spr(frame, base, 'enter');
  const st = spr(frame, at + 16, 'punch');
  const status = p.status ?? 'fact';
  // the hinge word's box in the headline (HingeMark): the same fit FitText makes
  const fit = fitLines(p.headline ?? '', w - 100, 4, 96, {weight: 700, mtav: true, min: 52});
  const li = p.hinge ? fit.lines.findIndex((l) => l.includes(p.hinge!)) : -1;
  const hinge =
    li >= 0
      ? {x: S.left + 50 + textW(fit.lines[li].slice(0, fit.lines[li].indexOf(p.hinge!)), fit.size, {weight: 700, mtav: true}), y: y + 220 + li * fit.size * 1.08, w: textW(p.hinge!, fit.size, {weight: 700, mtav: true}), h: fit.size * 0.95}
      : null;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <Card x={S.left} y={y} w={w} h={h} r={30} style={{opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 60}px)`}} />
      {p.date ? <FitText text={p.date} x={S.left + 50} y={y + 50} w={w - 100} size={40} min={30} maxLines={1} weight={600} t="quiet" at={base + 4} anim="none" /> : null}
      {p.source ? (
        <div className="vn-t" style={{position: 'absolute', left: S.left + 50, top: y + 110, padding: '6px 18px', border: `3px solid ${C.ink}`, borderRadius: 999, fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 600, fontSize: 34, color: C.ink, opacity: Math.min(1, s * 1.4)}}>
          {p.source}
        </div>
      ) : null}
      <FitText text={p.headline ?? ''} x={S.left + 50} y={y + 220} w={w - 100} size={96} min={52} maxLines={4} weight={700} at={at} lineHeight={1.08} />
      <div className="vn-t" style={{position: 'absolute', left: S.right - 400, top: y + h - 210, width: 340, height: 130, border: `8px solid ${tone(status === 'fact' ? 'green' : 'red')}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 700, fontSize: 60, color: tone(status === 'fact' ? 'green' : 'red'), background: 'rgba(255,255,255,0.7)', boxShadow: shadow(0.3), transform: `rotate(-8deg) scale(${(1.6 - 0.6 * Math.min(1, st)).toFixed(3)})`, opacity: frame < at + 16 ? 0 : Math.min(1, st * 1.5)}}>
        {STAMP[status]}
      </div>
      {/* a ring round a word of a one-line headline; in a stacked headline a ring runs through the next line (the p3 run's
          TEXT_CLASH): the hinge on the last line is underlined, one on an upper line is left to the stamp */}
      {hinge && (fit.lines.length === 1 || li === fit.lines.length - 1) ? <Ink marks={[{kind: fit.lines.length === 1 ? 'circle' : 'underline', box: hinge, at: at + 24}]} end={ctx.dur} /> : null}
      <Sfx name="cc0-page-turn" at={base + 2} volume={0.3} /* event: the card lands */ />
      <Sfx name="asmr-knock" at={at + 16} volume={0.4} /* event: the status stamp */ />
    </div>
  );
};
