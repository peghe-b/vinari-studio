import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {ScreenImg} from '../lib/screen';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {P2_TT} from '../lib/p2.mjs';
import {TOUR_COL_W, TOUR_PHONE_H, tourLens} from '../lib/r3.mjs';
import {CAP, drift, fitHeight, FitText, HeroPhone, phoneGeom, S, shadow, tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Pt = {
  /** the element's CENTRE on the capture, in capture px (1080 x 2346): a button, a code, a price, never a gap */
  x: number;
  y: number;
  /** the element's box round that centre (capture px): the loupe shows it WHOLE (tools/ci/p2lint.mjs TOUR_POINTS: about
   *  560 x 470 at most), the pressed element keeps a thin outline */
  w?: number;
  h?: number;
  /** what the voice does not say: the term, the figure, the consequence (3 words at most, 2 lines of 275 px; DUP_SUBTITLE,
   *  TEXT_WIDE) */
  label: string;
  /** the chunk the cursor presses it on (default: evenly spaced, 36 to 60 frames a point) */
  at?: number | string;
};
type P = {
  /** a current capture (public/screens/<screen>.jpg; never a retired or locked one) */
  screen: string;
  /** 2 or 3 spots, in the order the voice names them (tools/ci/p2lint.mjs TOUR_POINTS) */
  points: Pt[];
  /** a point with no box: the loupe's magnification over the phone's own scale (2 to 2.6; default 2.3) */
  zoom?: number;
};

const PHONE_H = TOUR_PHONE_H;
const GAP = 40;
/** the phone on the left, the loupe and its label in the column right of it (stage x 618..893: left of TikTok's action
 *  column at every height), the pressed spots' numbers in the gap between the two */
const layout = () => {
  const w0 = phoneGeom(PHONE_H).w;
  const phone = phoneGeom(PHONE_H, S.left + w0 / 2, S.cy);
  const colX = phone.x + phone.w + GAP;
  const colW = Math.min(TOUR_COL_W, P2_TT.right - colX - 1);
  const markX = phone.x + phone.w + GAP / 2;
  return {phone, colX, colW, markX};
};
const MARK_R = 17;

// ScreenTour (r3; "UI zoom-in with a cursor and callouts on the real current screen"): the WHOLE hero phone on the left with
// a real capture; a hotspot cursor (Apple's preview convention: a ring, never a finger) glides from element to element on
// BEZ.camera and presses each one (1 -> 0.82 over 3 frames, a ripple, the app tick on the press frame), then fades so the
// app's own words read again. A lens shaped to the element (src/lib/r3.mjs tourLens) shows its whole box in the column right
// of the phone, sharp (cut from the capture), its label under it. Nothing is drawn ON the app's words (the review of
// 08a2624: the dots covered „ხელოსანთან", „გადამწყვეტი", „ციმციმებს", the leader crossed „არ ციმციმებს"): a pressed element
// keeps only a thin outline round its box, its number sits beside the phone at the element's height, and the dotted leader
// runs from that number to the lens in the gap, never across the screen. The last frame reads as a map of the screen.
export const ScreenTour: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const pts = (p.points ?? []).slice(0, 3);
  const n = pts.length;
  const L = layout();
  const g = L.phone;
  const k = g.k;
  const per = Math.min(60, Math.max(36, Math.floor((ctx.dur - 30) / Math.max(1, n))));
  const first = Math.max(base + 22, 16);
  const at = pts.map((q, i) => (q.at !== undefined ? cueFrame(ctx, q.at) : first + i * per));
  const enter = spr(frame, base, 'enterXL');
  if (!n) return null;
  const sx = (q: Pt) => g.screen.x + q.x * k;
  const sy = (q: Pt) => g.screen.y + q.y * k;
  const cur = Math.max(0, at.reduce((c, f, i) => (frame >= f - 14 ? i : c), 0));
  const glide = cur > 0 ? ease.camera(Math.min(1, Math.max(0, (frame - (at[cur] - 14)) / 14))) : 1;
  const mix = (a: number, b: number) => (cur > 0 ? a + (b - a) * glide : b);
  const prev = pts[Math.max(0, cur - 1)];
  const q = pts[cur];
  const cx = mix(sx(prev), sx(q));
  const cy = mix(sy(prev), sy(q));
  const d = frame - at[cur];
  // the cursor shows for the glide and the press, then fades off the element (its words read again)
  const cursorOp = d < 0 ? prog(frame, at[cur] - 16, 6, ease.enter) : 1 - prog(frame, at[cur] + 10, 8);
  const ringS = d < 0 ? 1 : d < 3 ? 1 - 0.18 * (d / 3) : d < 8 ? 0.82 + 0.18 * ((d - 3) / 5) : 1;
  const ripple = d >= 0 && d < 16 ? d / 16 : -1;
  // the lens of each point: its zoom and height, level with its element (kept whole in the stage with its 2-line label)
  const lens = pts.map((s) => tourLens(s, k, p.zoom, L.colW));
  const labelH = pts.map((s) => fitHeight(s.label, L.colW, 56, 2, 700, false, 1.04, 36));
  const lensY = (i: number) => Math.min(S.bottom - (lens[i].h / 2 + 22 + labelH[i] + 6), Math.max(S.top + lens[i].h / 2 + 12, sy(pts[i])));
  const ly = mix(lensY(Math.max(0, cur - 1)), lensY(cur));
  const lh = mix(lens[Math.max(0, cur - 1)].h, lens[cur].h);
  const lz = mix(lens[Math.max(0, cur - 1)].lz, lens[cur].lz);
  const capX = mix(prev.x, q.x);
  const capY = mix(prev.y, q.y);
  const lensOn = spr(frame, at[0] - 4, 'enterXL');
  const lead = prog(frame, at[cur] + 2, 8, ease.pen);
  // the leader: from the current number beside the phone to the lens's left edge, inside the gap
  const ey = Math.min(ly + lh / 2 - 18, Math.max(ly - lh / 2 + 18, cy));
  const ang = Math.atan2(ey - cy, L.colX - 6 - L.markX);
  const x1 = L.markX + Math.cos(ang) * (MARK_R + 6);
  const y1 = cy + Math.sin(ang) * (MARK_R + 6);
  const x2 = L.colX - 6;
  const ink = tone('ink');
  const pressed = (i: number) => i < cur || (i === cur && d >= 2);
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: (cx + L.colX) / 2, y: (cy + ly) / 2}, 0.01)}}>
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter * 1.3), transform: `translateY(${(1 - enter) * 60}px)`}}>
        <HeroPhone g={g} screen={p.screen} />
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        {/* a pressed element keeps a thin outline round its box (never a fill over its words) */}
        {pts.map((s, i) =>
          pressed(i) && Number(s.w) > 0 && Number(s.h) > 0 ? (
            <rect key={i} x={sx(s) - (Number(s.w) / 2 + 10) * k} y={sy(s) - (Number(s.h) / 2 + 10) * k} width={(Number(s.w) + 20) * k} height={(Number(s.h) + 20) * k} rx={Math.min(18, ((Number(s.h) + 20) * k) / 2)} fill="none" stroke={ink} strokeWidth={3} opacity={0.9 * prog(frame, at[i] + 2, 6)} />
          ) : null,
        )}
        {/* the cursor ring, its press and its ripple */}
        <g opacity={cursorOp}>
          <circle cx={cx} cy={cy} r={44 * ringS} fill={ink} opacity={0.1} />
          <circle cx={cx} cy={cy} r={44 * ringS} fill="none" stroke={ink} strokeWidth={5} />
          {ripple >= 0 ? <circle cx={cx} cy={cy} r={44 + 64 * ease.whipOut(ripple)} fill="none" stroke={ink} strokeWidth={4 * (1 - ripple)} opacity={1 - ripple} /> : null}
        </g>
        {/* the pressed elements' numbers, beside the phone at their height */}
        {pts.map((s, i) =>
          pressed(i) ? (
            <g key={i} opacity={prog(frame, at[i] + 2, 6)}>
              <circle cx={L.markX} cy={sy(s)} r={MARK_R} fill={ink} />
              <circle cx={L.markX} cy={sy(s)} r={MARK_R + 2} fill="none" stroke={C.surface} strokeWidth={3} />
            </g>
          ) : null,
        )}
        <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * lead} y2={y1 + (ey - y1) * lead} stroke={ink} strokeWidth={4} strokeLinecap="round" strokeDasharray="2 10" opacity={pressed(cur) ? lensOn : 0} />
      </svg>
      {pts.map((s, i) =>
        pressed(i) ? (
          <div key={i} className={TXT} style={{position: 'absolute', left: L.markX - MARK_R, top: sy(s) - MARK_R, width: 2 * MARK_R, height: 2 * MARK_R, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 24, lineHeight: `${2 * MARK_R}px`, color: C.surface, opacity: prog(frame, at[i] + 2, 6)}}>
            {i + 1}
          </div>
        ) : null,
      )}
      {/* the lens: the element's whole box at about the capture's own size, sharp */}
      <div
        className="vn-obj"
        style={{position: 'absolute', left: L.colX, top: ly - lh / 2, width: L.colW, height: lh, borderRadius: 22, overflow: 'hidden', background: '#FFFFFF', boxShadow: `${shadow(1.3)}, 0 0 0 5px ${ink}`, opacity: Math.min(1, lensOn * 1.4), transform: `scale(${0.7 + 0.3 * Math.min(1, lensOn)})`, transformOrigin: 'left center'}}
      >
        <ScreenImg src={p.screen} style={{position: 'absolute', left: L.colW / 2 - capX * lz, top: lh / 2 - capY * lz, width: CAP.w * lz, height: CAP.h * lz, maxWidth: 'none'}} />
      </div>
      <FitText key={cur} text={q.label} x={L.colX} y={ly + lh / 2 + 22} w={L.colW} size={56} min={36} maxLines={2} weight={700} at={at[cur] + 6} />
      {at.map((f, i) => (
        <Sfx key={i} name="app-tick" at={f} volume={0.4} /* event: the cursor presses the spot (the press frame) */ />
      ))}
      <Sfx name="app-sheet" at={at[0] - 4} volume={0.3} /* event: the lens opens */ />
    </div>
  );
};
