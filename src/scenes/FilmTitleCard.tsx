import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {fitLines} from '../lib/textfit.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {Ink} from './kit/ink';
import type {InkMark} from './kit/ink';
import {Card, drift, FitText, fitHeight, Quiet, RollDigits, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

export const TITLE_CARD_KINDS = ['stat', 'bars', 'versus', 'receipt', 'grid'] as const;
type Kind = (typeof TITLE_CARD_KINDS)[number];
type Row = {label: string; value: number | string; t?: P2Tone; hl?: boolean};
type P = {
  /** the film's claim, 2 lines at most (Mkhedruli; set in Mtavruli) */
  title: string;
  /** the signature graphic: ONE of stat, bars, versus, receipt, grid (REPEAT_TEMPLATE: never the kind of the last 2 films) */
  kind: Kind;
  /** stat: the number as shown and its unit; grid: n of 100 */
  value?: string | number;
  unit?: string;
  label?: string;
  /** bars / versus / receipt rows (bars from zero, at most 4; versus exactly 2; receipt up to 3 plus `total`) */
  rows?: Row[];
  total?: {label: string; value: string; t?: P2Tone};
  /** whose figure it is */
  source?: string;
  /** the hand mark on the hero (default by kind) */
  mark?: InkMark['kind'];
  at?: number;
};

const W = S.right - S.left;

// FilmTitleCard (phase 2): the film's ONE signature infographic, designed on purpose: a claim in Mtavruli over a white card
// carrying a stat, bars, a versus, a receipt or a unit grid, with a hand mark on the thing that matters. The film opens or
// closes on it, and the cover is the same card (black and white: the hero's data colour turns ink on the cover).
export const FilmTitleCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = Math.max(0, entrance(ctx));
  const hook = ctx.index === 0;
  // as the film's first shot: the claim and the card are up at frame 0, the number reads, the mark draws by frame 6
  const at = hook ? 0 : p.at !== undefined ? cueFrame(ctx, p.at) : base + 10;
  const titleH = fitHeight(p.title, W, 150, 2, 700, false, 1.0, 72);
  const cardY = S.top + titleH + 50;
  const cardH = Math.min(S.bottom - cardY - (p.source ? 60 : 10), 700);
  const enter = hook ? 1 : spr(frame, base + 4, 'enter');
  const inner = {x: S.left + 50, y: cardY + 50, w: W - 100, h: cardH - 100};
  let body: React.ReactNode = null;
  let hero: InkMark['box'] = {x: inner.x, y: inner.y, w: inner.w, h: 160};
  const rows = (p.rows ?? []).slice(0, p.kind === 'versus' ? 2 : p.kind === 'receipt' ? 3 : 4);
  if (p.kind === 'stat') {
    const v = String(p.value ?? '');
    const size = Math.min(300, Math.floor((inner.w - 40) / Math.max(1, v.length * 0.62 + (p.unit ? (p.unit.length + 1) * 0.5 : 0))));
    hero = {x: inner.x, y: inner.y + 40, w: Math.min(inner.w, v.length * size * 0.62), h: size * 0.9};
    body = (
      <>
        <div style={{position: 'absolute', left: inner.x, top: inner.y + 30}}>
          <RollDigits text={v} at={at} size={size} t="accent" settled={hook} />
          {p.unit ? <span className={TXT} style={{fontFamily: F.sans, fontWeight: 700, fontSize: size * 0.42, color: C.ink, marginLeft: 14}}>{p.unit}</span> : null}
        </div>
        {p.label ? <FitText text={p.label} x={inner.x} y={inner.y + 40 + size * 1.1} w={inner.w} size={56} min={36} maxLines={2} weight={600} t="quiet" at={at + 10} /> : null}
      </>
    );
  } else if (p.kind === 'bars') {
    const nums = rows.map((r) => Number(r.value) || 0);
    const max = Math.max(...nums, 1e-9);
    const rowH = inner.h / Math.max(1, rows.length);
    const hi = Math.max(0, rows.findIndex((r) => r.hl));
    hero = {x: inner.x, y: inner.y + hi * rowH + 10, w: inner.w, h: rowH - 20};
    body = rows.map((r, i) => {
      const g = prog(frame, at + i * 5, 18, ease.data);
      const lf = fitLines(r.label, inner.w, 1, 44, {weight: 600, mtav: true, min: 34});
      return (
        <React.Fragment key={i}>
          <div className={TXT} style={{position: 'absolute', left: inner.x, top: inner.y + i * rowH, fontFamily: F.sans, fontWeight: 600, fontSize: lf.size, lineHeight: '54px', color: C.ink, whiteSpace: 'nowrap'}}>{mtav(lf.lines[0] ?? '')}</div>
          <div style={{position: 'absolute', left: inner.x, top: inner.y + i * rowH + 62, width: Math.max(6, ((inner.w - 170) * nums[i] * g) / max), height: Math.min(56, rowH - 90), borderRadius: 10, background: r.hl ? tone('accent') : C.ink2}} />
          <div className={TXT} style={{position: 'absolute', left: inner.x + ((inner.w - 170) * nums[i] * g) / max + 16, top: inner.y + i * rowH + 58, fontFamily: F.sans, fontWeight: 700, fontSize: 48, color: r.hl ? tone('accent') : C.ink, fontFeatureSettings: '"tnum" 1', opacity: g}}>{String(r.value)}</div>
        </React.Fragment>
      );
    });
  } else if (p.kind === 'versus') {
    const half = (inner.w - 40) / 2;
    hero = {x: inner.x + half + 40, y: inner.y + 80, w: half, h: 200};
    body = (
      <>
        <div style={{position: 'absolute', left: inner.x + half + 18, top: inner.y, width: 4, height: inner.h, background: C.rule}} />
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <FitText text={r.label} x={inner.x + i * (half + 40)} y={inner.y + 10} w={half} size={52} min={34} maxLines={2} weight={600} t="quiet" at={at + i * 8} />
            <FitText text={String(r.value)} x={inner.x + i * (half + 40)} y={inner.y + 150} w={half} size={170} min={70} maxLines={1} weight={700} t={r.t ?? (i === 1 ? 'accent' : 'ink')} at={at + 6 + i * 8} anim="slam" latin={/^[\d\s.,%₾$€+-]+$/.test(String(r.value))} />
          </React.Fragment>
        ))}
      </>
    );
  } else if (p.kind === 'receipt') {
    const rowH = 84;
    body = (
      <>
        {rows.map((r, i) => {
          const on = prog(frame, at + i * 7, 6);
          return (
            <React.Fragment key={i}>
              <FitText text={r.label} x={inner.x} y={inner.y + i * rowH} w={inner.w - 300} size={46} min={34} maxLines={1} weight={500} at={at + i * 7} anim="none" />
              <div className={TXT} style={{position: 'absolute', left: inner.x + inner.w - 280, width: 280, top: inner.y + i * rowH, textAlign: 'right', fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: '56px', color: C.ink, opacity: on}}>{String(r.value)}</div>
            </React.Fragment>
          );
        })}
        <div style={{position: 'absolute', left: inner.x, width: inner.w, top: inner.y + rows.length * rowH + 10, height: 10, borderTop: `3px solid ${C.ink}`, borderBottom: `3px solid ${C.ink}`}} />
        {p.total ? <FitText text={p.total.label} x={inner.x} y={inner.y + rows.length * rowH + 50} w={inner.w - 340} size={52} min={36} maxLines={1} weight={700} at={at + 24} /> : null}
        {p.total ? <div className={TXT} style={{position: 'absolute', left: inner.x + inner.w - 340, width: 340, top: inner.y + rows.length * rowH + 34, textAlign: 'right', fontFamily: F.sans, fontWeight: 700, fontSize: 88, color: tone(p.total.t ?? 'red'), opacity: prog(frame, at + 24, 5)}}>{p.total.value}</div> : null}
      </>
    );
    hero = {x: inner.x + inner.w - 320, y: inner.y + rows.length * rowH + 40, w: 320, h: 90};
  } else if (p.kind === 'grid') {
    const n = Math.max(0, Math.min(100, Math.round(Number(p.value) || 0)));
    const cell = Math.min(52, (inner.h - 140) / 10, inner.w / 10);
    const filled = Math.round(n * ease.data(Math.min(1, Math.max(0, (frame - at) / 24))));
    body = (
      <>
        <div style={{position: 'absolute', left: inner.x, top: inner.y - 10}}>
          <RollDigits text={String(n)} at={at} size={120} t="accent" settled={hook} />
          <span className={TXT} style={{fontFamily: F.sans, fontWeight: 600, fontSize: 52, color: C.ink2, marginLeft: 10}}>/100</span>
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {Array.from({length: 100}, (_, i) => (
            <circle key={i} cx={inner.x + (i % 10) * cell + cell / 2} cy={inner.y + 150 + Math.floor(i / 10) * cell + cell / 2} r={cell * 0.36} fill={i < filled ? tone('accent') : 'none'} stroke={i < filled ? 'none' : C.rule} strokeWidth={3} />
          ))}
        </svg>
      </>
    );
    hero = {x: inner.x, y: inner.y - 10, w: 300, h: 130};
  }
  const mark: InkMark = {kind: p.mark ?? (p.kind === 'bars' ? 'arrow' : p.kind === 'receipt' ? 'circle' : 'underline'), box: hero, at: hook ? 4 : at + 26};
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <FitText text={p.title} x={S.left} y={S.top} w={W} size={150} min={72} maxLines={2} weight={700} at={hook ? 0 : base} anim={hook ? 'none' : 'rise'} lineHeight={1.0} />
      <Card x={S.left} y={cardY} w={W} h={cardH} style={{opacity: Math.min(1, enter * 1.4), transform: `translateY(${(1 - enter) * 50}px)`}} />
      {body}
      <Ink marks={[mark]} end={ctx.dur} />
      {p.source ? <Quiet text={p.source} x={S.left} y={cardY + cardH + 14} w={W} at={at + 20} /> : null}
      <Sfx name="asmr-land" at={at} volume={0.36} /* event: the card's figure lands */ />
    </div>
  );
};
