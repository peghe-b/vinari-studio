import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import {photoFile} from '../lib/photo';
import type {SceneCtx} from '../types';
import {Card, drift, FitText, S, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Side = {label: string; value: string; src?: string; t?: P2Tone};
type P = {a: Side; b: Side; at?: number};

// Versus (phase 2, the story kit): two sides of the story face to face (two drivers, two cars, then and now): two white
// cards, each a photo (optional), a label and a figure; the second slams in on its cue, the hairline between them.
export const Versus: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // a film's first shot is settled at frame 0 (entrance() is its negative lead); later shots enter after the cut
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 16;
  const gap = 28;
  const w = (S.right - S.left - gap) / 2;
  const h = p.a.src || p.b.src ? S.bottom - S.top - 40 : 520;
  const side = (x: Side, i: number) => {
    const a = i === 0 ? base : at;
    const s = spr(frame, a, i === 0 ? 'enter' : 'punch');
    const cx = S.left + i * (w + gap);
    const ph = x.src ? h * 0.52 : 0;
    return (
      <React.Fragment key={i}>
        <Card x={cx} y={S.top + 20} w={w} h={h} r={28} style={{opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * (i ? -40 : 40)}px)`}}>
          {x.src ? <Img src={photoFile(x.src)} style={{position: 'absolute', left: 18, top: 18, width: w - 36, height: ph, objectFit: 'cover', borderRadius: 12, filter: 'grayscale(1) contrast(1.08)'}} /> : null}
        </Card>
        <FitText text={x.label} x={cx + 30} y={S.top + 60 + ph} w={w - 60} size={50} min={34} maxLines={2} weight={600} t="quiet" at={a + 4} />
        <FitText text={x.value} x={cx + 30} y={S.top + 200 + ph} w={w - 60} size={150} min={60} maxLines={1} weight={700} t={x.t ?? (i ? 'accent' : 'ink')} at={a + 8} anim="slam" latin={/^[\d\s.,:%₾$€+\-/]+$/.test(x.value)} />
        <Sfx name={i ? 'asmr-whoomp' : 'cc0-card-place'} at={a} volume={0.32} /* event: a side lands */ />
      </React.Fragment>
    );
  };
  return <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>{[p.a, p.b].map(side)}</div>;
};
