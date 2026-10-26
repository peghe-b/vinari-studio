import React from 'react';
import {evolvePath} from '@remotion/paths';
import {useCurrentFrame} from 'remotion';
import {ease, rand, spr} from '../lib/anim';
import {C, isLight} from '../tokens';
import type {SceneCtx} from '../types';
import {Card, drift, FitText, S} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Pin = {label: string; x: number; y: number};
type P = {
  /** 2 to 4 places on the story's map, at map fractions (x, y 0..1) */
  pins: Pin[];
  /** a short fact under the map („1 600 კმ 10 საათში") */
  note?: string;
  seed?: number;
  at?: number;
};

// StoryMap (phase 2, the story kit): where the story happened, as a drawn paper map (never a map tile): a seeded coast and
// roads in light grey, the pins drop in order and a dashed line joins them as the story travels.
export const StoryMap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // a film's first shot is settled at frame 0 (entrance() is its negative lead); later shots enter after the cut
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : base + 10;
  const pins = (p.pins ?? []).slice(0, 4);
  const cw = S.right - S.left;
  const ch = 760;
  const seed = p.seed ?? 3;
  const pts = pins.map((q) => ({x: 60 + q.x * (cw - 120), y: 60 + q.y * (ch - 120), label: q.label}));
  const coast = `M -20 ${ch * 0.7} ${Array.from({length: 9}, (_, i) => `L ${(i + 1) * (cw / 8)} ${ch * (0.62 + 0.16 * rand(seed + i))}`).join(' ')} L ${cw + 20} ${ch + 20} L -20 ${ch + 20} Z`;
  const path = pts.length > 1 ? `M ${pts[0].x} ${pts[0].y} ${pts.slice(1).map((q) => `L ${q.x} ${q.y}`).join(' ')}` : '';
  const u = ease.data(Math.min(1, Math.max(0, (frame - at) / (18 * Math.max(1, pts.length - 1)))));
  const ev = path ? evolvePath(u, path) : null;
  const grey = isLight() ? '#E4E4E4' : '#2A2A2A';
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur)}}>
      <Card x={S.left} y={S.top + 20} w={cw} h={ch} r={32}>
        <svg width={cw} height={ch} style={{position: 'absolute', left: 0, top: 0}}>
          <path d={coast} fill={grey} />
          {Array.from({length: 6}, (_, i) => (
            <path key={i} d={`M ${-20} ${80 + i * 110 + 30 * rand(seed * 3 + i)} C ${cw * 0.4} ${60 + i * 110}, ${cw * 0.6} ${120 + i * 110}, ${cw + 20} ${90 + i * 110}`} fill="none" stroke={grey} strokeWidth={10} strokeLinecap="round" />
          ))}
          {ev ? (
            <>
              <mask id={`sm-${ctx.index}`}>
                <path d={path} fill="none" stroke="#FFFFFF" strokeWidth={16} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
              </mask>
              <path d={path} fill="none" stroke={C.ink} strokeWidth={8} strokeDasharray="18 14" strokeLinecap="round" mask={`url(#sm-${ctx.index})`} />
            </>
          ) : null}
          {pts.map((q, i) => {
            const s = spr(frame, at + i * 18, 'punch');
            return <circle key={i} cx={q.x} cy={q.y} r={18 * Math.max(0, s)} fill={C.ink} stroke={C.surface} strokeWidth={6} />;
          })}
        </svg>
      </Card>
      {pts.map((q, i) => (
        <FitText key={i} text={q.label} x={Math.min(S.right - 150, Math.max(S.left + 150, S.left + q.x))} y={S.top + 20 + q.y + 30} w={300} size={44} min={32} maxLines={1} weight={700} align="center" at={at + i * 18 + 4} />
      ))}
      {p.note ? <FitText text={p.note} x={S.left} y={S.top + ch + 60} w={cw} size={64} min={40} maxLines={1} weight={700} at={at + 18 * pts.length} /> : null}
      {pts.map((_, i) => (
        <Sfx key={i} name="asmr-drop" at={at + i * 18} volume={0.28} /* event: a pin drops */ />
      ))}
    </div>
  );
};
