// Ink: the hand marker on film, the humour kit's (ported on 2026-10-31 from phase 2, tag before-rollback-1030): a circle, an
// underline, a strike, a tick, an arrow, a bracket or a badge drawn on in 6 to 16 frames a stroke, its width breathing
// +-12 % (@remotion/noise). A mark stays until the shot ends and fades over its last 6 frames. The geometry and the rules are
// src/lib/ink.mjs: at most 3 marks at once, none under the caption band, every mark inside its room and out of TikTok's
// action column; a ring that cannot fit is an underline. Each mark's first frame has its quiet cue (asmr-tick-fine; a strike
// asmr-strike, a tick asmr-check), never a pencil (the owner's rule 28). ShoutType, SideCar and NewsCard draw the hinge with it.
//
//   <Ink marks={[{kind: 'circle', box: {x, y, w, h}, at: 12}]} end={ctx.dur} />
import React from 'react';
import {noise2D} from '@remotion/noise';
import {Easing, useCurrentFrame} from 'remotion';
import {INK_FADE, inkFrames, inkPlan, inkSound, inkStrokes, inkTone, polyLen} from '../../lib/ink.mjs';
import type {InkBox, InkKind, InkPt} from '../../lib/ink.mjs';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {C, F} from '../../tokens';
import {Sfx} from '../common';
import {S, tone} from './paper';

/** the pen's curve (phase 2's BEZ.pen): a quick start, a long soft landing */
const pen = Easing.bezier(0.45, 0, 0.2, 1);

export type InkMark = {kind: InkKind; box: InkBox; at: number; seed?: number; label?: string; within?: InkBox};

/** The first n px of a polyline. */
const cut = (pts: InkPt[], n: number): InkPt[] => {
  const out: InkPt[] = [pts[0]];
  let left = n;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= left) out.push(b);
    else out.push([a[0] + ((b[0] - a[0]) * left) / d, a[1] + ((b[1] - a[1]) * left) / d]);
    left -= d;
  }
  return out;
};

/** A stroke as a filled ribbon: tapered at both ends, its width breathing with the noise. */
const ribbon = (pts: InkPt[], w: number, seed: string) => {
  if (pts.length < 2) return '';
  const L: InkPt[] = [];
  const R: InkPt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const u = i / (pts.length - 1);
    const taper = 0.55 + 0.45 * Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, u)), 0.7));
    const hw = (w / 2) * taper * (1 + 0.12 * noise2D(seed, i / 9, 0));
    L.push([p[0] - (dy / d) * hw, p[1] + (dx / d) * hw]);
    R.push([p[0] + (dy / d) * hw, p[1] - (dx / d) * hw]);
  });
  const f = (p: InkPt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return `M${L.map(f).join(' L')} L${R.reverse().map(f).join(' L')} Z`;
};

export const Ink: React.FC<{marks: InkMark[]; end?: number; width?: number; room?: InkBox; sound?: boolean; color?: string}> = ({marks, end, width = 12, room = {x: S.left, y: S.top, w: S.right - S.left, h: S.bottom - S.top}, sound = true, color: own}) => {
  const frame = useCurrentFrame();
  const {shown} = inkPlan(marks, {bottom: S.bottom, room});
  const fade = end === undefined ? 1 : Math.min(1, Math.max(0, (end - frame) / INK_FADE));
  return (
    <>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', opacity: fade}}>
        {shown.map((m, i) => {
          const strokes = inkStrokes(m.kind, m.box, m.seed ?? i + 1, m.within ?? room);
          // `own`: a mark over a dark photo in a light film (ShoutType's photo) is drawn in white, never ink on black
          const color = m.kind !== 'strike' && m.kind !== 'tick' && own ? own : tone(inkTone(m.kind));
          let t0 = m.at;
          return (
            <g key={i}>
              {strokes.map((pts, j) => {
                const len = polyLen(pts);
                const dur = inkFrames(len);
                const start = t0 + (j ? 2 : 0);
                t0 = start + dur;
                if (frame < start) return null;
                const u = pen(Math.min(1, (frame - start) / dur));
                const part = u >= 1 ? pts : cut(pts, len * u);
                const tip = part[part.length - 1];
                return (
                  <g key={j}>
                    <path d={ribbon(part, width, `ink-${i}-${j}`)} fill={color} />
                    <circle cx={part[0][0]} cy={part[0][1]} r={width * 0.28} fill={color} />
                    <circle cx={tip[0]} cy={tip[1]} r={width * 0.28} fill={color} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {shown.map((m, i) =>
        m.kind === 'badge' && m.label ? (
          <Badge key={`b${i}`} m={m} room={m.within ?? room} fade={fade} />
        ) : null,
      )}
      {sound ? shown.map((m, i) => <Sfx key={`s${i}`} name={inkSound(m.kind)} at={m.at} volume={0.3} /* event: the mark's first frame */ />) : null}
    </>
  );
};

/** A badge's label: a short word or number inside its ring (FiraGO 40 px, the ink). */
const Badge: React.FC<{m: InkMark; room: InkBox; fade: number}> = ({m, room, fade}) => {
  const frame = useCurrentFrame();
  const s = inkStrokes('badge', m.box, m.seed ?? 1, room)[0];
  const xs = s.map((p) => p[0]);
  const ys = s.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const on = Math.min(1, Math.max(0, (frame - m.at - 6) / 5));
  return (
    <div className={TXT} style={{position: 'absolute', left: cx - 60, width: 120, top: cy - 24, height: 48, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 40, lineHeight: '48px', color: C.ink, opacity: on * fade}}>
      {mtav(m.label ?? '')}
    </div>
  );
};
