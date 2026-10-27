import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {ScreenImg} from '../lib/screen';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {CAP, drift, FitText, HeroPhone, phoneGeom, S, shadow, tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Pt = {
  /** the spot on the capture, in capture px (1080 x 2346) */
  x: number;
  y: number;
  /** what it is or what it does there (3 words at most: „ფასი აქ ჩანს", „შეეხე აქ") */
  label: string;
  /** the chunk the cursor presses it on (default: evenly spaced, 36 to 60 frames a point) */
  at?: number | string;
};
type P = {
  /** a current capture (public/screens/<screen>.jpg; never a retired or locked one) */
  screen: string;
  /** 2 or 3 spots, in the order the voice names them (tools/ci/p2lint.mjs TOUR_POINTS) */
  points: Pt[];
  /** the loupe's magnification over the phone's own scale (2 to 2.6; default 2.3: the capture at about its own size) */
  zoom?: number;
};

/** the loupe's diameter (stage px) and the phone's height: the phone on the left, the loupe and its label in the column
 *  right of it (stage x 618..944; the label narrows to x 894 in TikTok's action column band) */
const LOUPE = 280;
const PHONE_H = 930;
const GAP = 40;
const layout = () => {
  const w0 = phoneGeom(PHONE_H).w;
  const phone = phoneGeom(PHONE_H, S.left + w0 / 2, S.cy);
  const labelX = phone.x + phone.w + GAP;
  const labelW = S.right - labelX;
  const loupeX = labelX + LOUPE / 2 + 3;
  // the loupe sits level with its spot, kept whole in the stage with room for a 2-line label under it
  const loupeY = (y: number) => Math.min(S.bottom - (LOUPE / 2 + 26 + 2 * 60 + 10), Math.max(S.top + LOUPE / 2 + 12, y));
  return {phone, labelX, labelW, loupeX, loupeY};
};

// ScreenTour (r3; "UI zoom-in with a cursor and callouts on the real current screen"): the WHOLE hero phone on the left with
// a real capture; a hotspot cursor (Apple's preview convention: a ring, never a finger) glides from spot to spot on
// BEZ.camera and presses each one (1 -> 0.82 over 3 frames, a ripple, the app tick on the press frame); a round loupe on the
// right shows that spot at about the capture's own size (sharp: cut from the capture, never an upscaled frame), a dotted
// leader joins the two, the spot's number sits on the loupe and its label rises under it. A pressed spot keeps a small
// numbered dot, so the last frame reads as a map of the screen. Phone and loupe are whole inside the stage, the label column
// keeps out of TikTok's action column (layout below).
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
  // the cursor: on the phone at the current spot, gliding to the next in the 14 frames before its press
  const sx = (q: Pt) => g.screen.x + q.x * k;
  const sy = (q: Pt) => g.screen.y + q.y * k;
  const cur = Math.max(0, at.reduce((c, f, i) => (frame >= f - 14 ? i : c), 0));
  const glide = cur > 0 ? ease.camera(Math.min(1, Math.max(0, (frame - (at[cur] - 14)) / 14))) : 1;
  const prev = pts[Math.max(0, cur - 1)];
  const q = pts[cur];
  const cx = cur > 0 ? sx(prev) + (sx(q) - sx(prev)) * glide : sx(q);
  const cy = cur > 0 ? sy(prev) + (sy(q) - sy(prev)) * glide : sy(q);
  const cursorIn = prog(frame, at[0] - 16, 10, ease.enter);
  const d = frame - at[cur];
  const ringS = d < 0 ? 1 : d < 3 ? 1 - 0.18 * (d / 3) : d < 8 ? 0.82 + 0.18 * ((d - 3) / 5) : 1;
  const ripple = d >= 0 && d < 16 ? d / 16 : -1;
  // the loupe follows the spot's height (clamped so it and its label stay in the stage)
  const loupeY = (i: number) => L.loupeY(sy(pts[i]));
  const ly = cur > 0 ? loupeY(cur - 1) + (loupeY(cur) - loupeY(cur - 1)) * glide : loupeY(0);
  const lz = Math.min(2.6, Math.max(2, p.zoom ?? 2.3)) * k;
  const R = LOUPE / 2;
  // the loupe's content pans with the cursor (in capture px)
  const capX = cur > 0 ? prev.x + (q.x - prev.x) * glide : q.x;
  const capY = cur > 0 ? prev.y + (q.y - prev.y) * glide : q.y;
  const loupeOn = spr(frame, at[0] - 4, 'enterXL');
  const lead = prog(frame, at[cur] + 2, 8, ease.pen);
  // the leader: from the spot's edge to the loupe's rim, dotted
  const ang = Math.atan2(ly - cy, L.loupeX - cx);
  const x1 = cx + Math.cos(ang) * 30;
  const y1 = cy + Math.sin(ang) * 30;
  const x2 = L.loupeX - Math.cos(ang) * (R + 10);
  const y2 = ly - Math.sin(ang) * (R + 10);
  const ink = tone('ink');
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: (cx + L.loupeX) / 2, y: (cy + ly) / 2}, 0.01)}}>
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter * 1.3), transform: `translateY(${(1 - enter) * 60}px)`}}>
        <HeroPhone g={g} screen={p.screen} />
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        {/* the spots already pressed keep a numbered dot */}
        {pts.map((s, i) =>
          i < cur || (i === cur && d >= 10) ? (
            <g key={i} opacity={prog(frame, at[i] + 10, 6)}>
              <circle cx={sx(s)} cy={sy(s)} r={21} fill={ink} />
              <circle cx={sx(s)} cy={sy(s)} r={27} fill="none" stroke={C.surface} strokeWidth={4} />
            </g>
          ) : null,
        )}
        {/* the cursor ring, its press and its ripple */}
        <g opacity={cursorIn * (d >= 10 && cur === n - 1 ? 1 - prog(frame, at[cur] + 10, 8) : 1)}>
          <circle cx={cx} cy={cy} r={44 * ringS} fill={ink} opacity={0.14} />
          <circle cx={cx} cy={cy} r={44 * ringS} fill="none" stroke={ink} strokeWidth={5} />
          {ripple >= 0 ? <circle cx={cx} cy={cy} r={44 + 64 * ease.whipOut(ripple)} fill="none" stroke={ink} strokeWidth={4 * (1 - ripple)} opacity={1 - ripple} /> : null}
        </g>
        <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * lead} y2={y1 + (y2 - y1) * lead} stroke={ink} strokeWidth={4} strokeLinecap="round" strokeDasharray="2 12" opacity={loupeOn} />
      </svg>
      {/* the numbers of the pressed spots (text layer) */}
      {pts.map((s, i) =>
        i < cur || (i === cur && d >= 10) ? (
          <div key={i} className={TXT} style={{position: 'absolute', left: sx(s) - 21, top: sy(s) - 21, width: 42, height: 42, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 30, lineHeight: '42px', color: C.surface, opacity: prog(frame, at[i] + 10, 6)}}>
            {i + 1}
          </div>
        ) : null,
      )}
      {/* the loupe: the capture at about its own size round the spot, whole */}
      <div
        className="vn-obj"
        style={{position: 'absolute', left: L.loupeX - R, top: ly - R, width: 2 * R, height: 2 * R, borderRadius: '50%', overflow: 'hidden', background: '#FFFFFF', boxShadow: `${shadow(1.3)}, 0 0 0 6px ${ink}`, opacity: Math.min(1, loupeOn * 1.4), transform: `scale(${0.7 + 0.3 * Math.min(1, loupeOn)})`}}
      >
        <ScreenImg src={p.screen} style={{position: 'absolute', left: R - capX * lz, top: R - capY * lz, width: CAP.w * lz, height: CAP.h * lz, maxWidth: 'none'}} />
      </div>
      {/* the spot's number on the loupe's rim and its label under the loupe */}
      <div className={TXT} style={{position: 'absolute', left: L.loupeX - R - 8, top: ly - R - 8, width: 68, height: 68, borderRadius: 34, background: ink, color: C.surface, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 40, lineHeight: '68px', opacity: Math.min(1, loupeOn * 1.4)}}>
        {cur + 1}
      </div>
      <FitText key={cur} text={q.label} x={L.labelX} y={ly + R + 26} w={L.labelW} size={56} min={36} maxLines={2} weight={700} at={at[cur] + 6} />
      {at.map((f, i) => (
        <Sfx key={i} name="app-tick" at={f} volume={0.4} /* event: the cursor presses the spot (the press frame) */ />
      ))}
      <Sfx name="app-sheet" at={at[0] - 4} volume={0.3} /* event: the loupe opens */ />
    </div>
  );
};
