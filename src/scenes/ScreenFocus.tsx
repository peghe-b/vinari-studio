import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {OUTLINE_GAP, OUTLINE_STROKE} from '../lib/outline.mjs';
import {C} from '../tokens';
import type {SceneCtx} from '../types';
import {Callout} from './kit/callout';
import {CAP, drift, HERO_H, HeroPhone, phoneGeom, S, shadow} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type P = {
  /** a current capture (public/screens/<screen>.jpg; never a retired one) */
  screen: string;
  /** the row to lift, in capture px (1080 x 2346): y and h, x and w default to the full width's card inset; r its corner */
  row: {y: number; h: number; x?: number; w?: number; r?: number};
  /** an optional label on the lifted row (52 px Mtavruli, 3 words at most) */
  label?: string;
  /** the chunk the focus starts on (default: 14 frames after the cut) */
  at?: number;
  /** the lift's scale (2 to 2.5) */
  zoom?: number;
};

// ScreenFocus (phase 2, the films audit: "a whole phone at 40 % of the width cannot be read"): a big WHOLE phone, then
// 1) the rest of the screen dims to 0.35 round a concentric cut-out and the outline draws, 2) the exact row is lifted out of
// the full-resolution capture at 2 to 2.5x (sharp: cut from the capture itself, never an upscaled frame), 3) it floats over
// the phone's other half with a shadow and a leader back into the screen, an optional Callout label, 4) it holds 30+ frames.
export const ScreenFocus: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const at = p.at !== undefined ? cueFrame(ctx, p.at) : Math.max(base + 14, 10);
  const g = phoneGeom(HERO_H);
  const k = g.k;
  const rx = p.row.x ?? 36;
  const rw = p.row.w ?? CAP.w - 2 * rx;
  const rr = p.row.r ?? 28;
  const row = {x: rx, y: p.row.y, w: rw, h: p.row.h};
  // the row in stage px
  const rs = {x: g.screen.x + row.x * k, y: g.screen.y + row.y * k, w: row.w * k, h: row.h * k};
  const zoom = Math.min(2.5, Math.max(2, p.zoom ?? 2.2));
  const liftW = Math.min(S.right - S.left, rs.w * zoom);
  const z = liftW / rs.w; // the real lift (capped so the card stays inside the stage)
  const liftH = rs.h * z;
  // the lifted card floats over the half of the phone the row is NOT in
  const upper = rs.y + rs.h / 2 < g.screen.y + g.screen.h / 2;
  const ly = upper ? Math.min(S.bottom - liftH - 20, rs.y + rs.h + 120) : Math.max(S.top + 20, rs.y - liftH - 120);
  const lx = S.cx - liftW / 2;
  const enter = spr(frame, base, 'enterXL');
  const dim = prog(frame, at, 10, ease.data) * 0.65;
  const ring = prog(frame, at + 4, 12, ease.pen);
  const lift = spr(frame, at + 14, 'enter');
  const ringLen = 2 * (row.w + row.h) + 8 * OUTLINE_GAP;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: rs.x + rs.w / 2, y: rs.y + rs.h / 2})}}>
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter * 1.3), transform: `translateY(${(1 - enter) * 60}px) scale(${0.96 + 0.04 * enter})`, transformOrigin: `${S.cx}px ${S.cy}px`}}>
        <HeroPhone g={g} screen={p.screen}>
          {/* the dim with a concentric cut-out round the row, then the outline (screen px) */}
          <svg width={CAP.w} height={CAP.h} style={{position: 'absolute', left: 0, top: 0}}>
            <defs>
              <mask id={`sf-cut-${ctx.index}`}>
                <rect width={CAP.w} height={CAP.h} fill="#fff" />
                <rect x={row.x} y={row.y} width={row.w} height={row.h} rx={rr} fill="#000" />
              </mask>
            </defs>
            <rect width={CAP.w} height={CAP.h} fill="#0B0B0B" opacity={dim} mask={`url(#sf-cut-${ctx.index})`} />
            <rect
              x={row.x - OUTLINE_GAP}
              y={row.y - OUTLINE_GAP}
              width={row.w + 2 * OUTLINE_GAP}
              height={row.h + 2 * OUTLINE_GAP}
              rx={rr + OUTLINE_GAP}
              fill="none"
              stroke={C.ink === '#0B0B0B' ? '#0B0B0B' : '#F5F5F5'}
              strokeWidth={OUTLINE_STROKE / k / 2.2}
              strokeDasharray={ringLen}
              strokeDashoffset={ringLen * (1 - ring)}
              opacity={ring > 0 ? 1 : 0}
            />
          </svg>
        </HeroPhone>
      </div>
      {/* the leader from the row into the lifted card */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        <line x1={rs.x + rs.w / 2} y1={upper ? rs.y + rs.h + 8 : rs.y - 8} x2={S.cx} y2={upper ? ly : ly + liftH} stroke={C.ink} strokeWidth={4} strokeLinecap="round" opacity={lift} strokeDasharray="2 12" />
      </svg>
      {/* the lifted row: cut from the full-resolution capture */}
      <div
        style={{
          position: 'absolute',
          left: lx,
          top: ly,
          width: liftW,
          height: liftH,
          borderRadius: rr * z * k,
          overflow: 'hidden',
          background: '#FFFFFF',
          boxShadow: shadow(1.4),
          opacity: Math.min(1, lift * 1.4),
          transform: `translateY(${(1 - lift) * (upper ? -40 : 40)}px) scale(${0.9 + 0.1 * lift})`,
          transformOrigin: 'center center',
        }}
      >
        <Img src={staticFile(`screens/${p.screen}.jpg`)} style={{position: 'absolute', left: -row.x * k * z, top: -row.y * k * z, width: CAP.w * k * z, height: CAP.h * k * z, maxWidth: 'none'}} />
      </div>
      {p.label ? <Callout anchor={{x: lx + liftW - 30, y: upper ? ly + liftH : ly}} text={p.label} at={at + 24} side="left" labelY={upper ? ly + liftH + 40 : ly - 110} sound={false} /> : null}
      <Sfx name="app-sheet" at={at + 14} volume={0.34} /* event: the row lifts out of the screen */ />
    </div>
  );
};
