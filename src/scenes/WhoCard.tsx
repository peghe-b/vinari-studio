import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
import {spr} from '../lib/anim';
import {photoCredit, photoFile} from '../lib/photo';
import type {SceneCtx} from '../types';
import {Card, drift, FitText, Quiet, S, shadow} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** the story's own photo of the person (public/photos; greyscale) */
  src: string;
  /** who: the name as said (3 words at most) */
  name: string;
  /** what they are to the story („ფორმულა 1-ის მრბოლელი") */
  role: string;
  /** a year or a figure stamped on the card („1976") */
  stamp?: string;
  /** where on the photo the face is (fractions), so the crop keeps it */
  aim?: {x: number; y: number};
  at?: number;
};

// WhoCard (phase 2, the story kit): who this person is, as a composed card: the story's own photo in a tall window, the
// name big, the role under it, a stamp with the year; the photo's credit on the card.
export const WhoCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // a film's first shot is settled at frame 0 (entrance() is its negative lead); later shots enter after the cut
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 8;
  const w = S.right - S.left;
  const ph = 640;
  const s = spr(frame, base, 'enter');
  const st = spr(frame, at + 10, 'punch');
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <Card x={S.left} y={S.top} w={w} h={ph + 300} r={32} style={{opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 50}px)`}}>
        <Img src={photoFile(p.src)} style={{position: 'absolute', left: 24, top: 24, width: w - 48, height: ph, objectFit: 'cover', objectPosition: `${(p.aim?.x ?? 0.5) * 100}% ${(p.aim?.y ?? 0.3) * 100}%`, borderRadius: 14, filter: 'grayscale(1) contrast(1.08)'}} />
      </Card>
      <FitText text={p.name} x={S.left + 40} y={S.top + ph + 50} w={w - 80} size={88} min={52} maxLines={1} weight={700} at={at} />
      <FitText text={p.role} x={S.left + 40} y={S.top + ph + 160} w={w - 80} size={48} min={34} maxLines={1} weight={600} t="quiet" at={at + 6} />
      {p.stamp ? (
        <div className="vn-t" style={{position: 'absolute', left: S.right - 250, top: S.top + ph - 80, width: 230, height: 110, border: '6px solid #0B0B0B', borderRadius: 12, background: '#FFFFFF', boxShadow: shadow(0.6), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 700, fontSize: 64, color: '#0B0B0B', transform: `rotate(-6deg) scale(${(1.3 - 0.3 * Math.min(1, st)).toFixed(3)})`, opacity: Math.min(1, st * 1.4)}}>
          {p.stamp}
        </div>
      ) : null}
      {photoCredit(p.src) ? <Quiet text={photoCredit(p.src)} x={S.left + 40} y={S.top + ph + 236} w={w - 80} at={at + 10} /> : null}
      <Sfx name="cc0-card-place" at={base + 2} volume={0.3} /* event: the card lands */ />
      {p.stamp ? <Sfx name="asmr-knock" at={at + 10} volume={0.34} /* event: the stamp */ /> : null}
    </div>
  );
};
