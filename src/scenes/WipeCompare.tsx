import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {ease, spr} from '../lib/anim';
import {photoFile} from '../lib/photo';
import {ScreenImg} from '../lib/screen';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {CAP, Card, drift, FitText, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Side = {label: string; src?: string; screen?: string};
type P = {
  /** before (left label) and after (right label): a photo (public/photos) or a current capture */
  a: Side;
  b: Side;
  /** the chunk the handle drags on */
  at?: number;
};

// WipeCompare (phase 2): before and after in one card; a drag handle crosses it on BEZ.data and the after side wipes over
// the before. Photos in greyscale (the P2 look), a real screen in its own colour. Both pictures whole in the card.
export const WipeCompare: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(0, base) + 16;
  const screens = !!(p.a.screen || p.b.screen);
  const cw = screens ? Math.min(S.right - S.left, ((S.bottom - S.top - 140) * CAP.w) / CAP.h) : S.right - S.left;
  const ch = screens ? (cw * CAP.h) / CAP.w : 860;
  const x = S.cx - cw / 2;
  const y = S.top + 100;
  const u = ease.data(Math.min(1, Math.max(0, (frame - at) / 26)));
  const hx = cw * (0.92 - 0.84 * u);
  const enter = spr(frame, base, 'enter');
  const pic = (s: Side) =>
    s.screen ? <ScreenImg src={s.screen} style={{position: 'absolute', left: 0, top: 0, width: cw, height: ch}} /> : s.src ? <Img src={photoFile(s.src)} style={{position: 'absolute', left: 0, top: 0, width: cw, height: ch, objectFit: 'cover', filter: 'grayscale(1) contrast(1.08)'}} /> : null;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: x + hx, y: y + ch / 2})}}>
      <FitText text={p.a.label} x={S.left} y={S.top} w={(S.right - S.left) / 2 - 20} size={56} min={36} maxLines={1} weight={700} t="quiet" at={base + 4} />
      <FitText text={p.b.label} x={S.right} y={S.top} w={(S.right - S.left) / 2 - 20} size={56} min={36} maxLines={1} weight={700} align="right" at={at + 6} />
      <Card x={x} y={y} w={cw} h={ch} r={screens ? 44 : 32} style={{opacity: Math.min(1, enter * 1.4)}}>
        {pic(p.a)}
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${hx}px)`}}>{pic(p.b)}</div>
        <div style={{position: 'absolute', left: hx - 3, top: 0, width: 6, height: ch, background: C.surface, boxShadow: '0 0 0 2px rgba(11,11,11,0.25)'}} />
        <div style={{position: 'absolute', left: hx - 38, top: ch / 2 - 38, width: 76, height: 76, borderRadius: 38, background: C.surface, boxShadow: '0 6px 18px rgba(11,11,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={44} height={24} viewBox="0 0 44 24">
            <path d="M14 3 L4 12 L14 21 M30 3 L40 12 L30 21" fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Card>
      <Sfx name="asmr-slide" at={at} volume={0.3} /* event: the handle drags */ />
    </div>
  );
};
