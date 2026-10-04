// v70-in-hand: the document lives in the phone. A line-art globe waits outside a dashed ring around the phone; on
// the chunk `at` a copy of the document lifts towards the globe, meets the ring, and slides back home. The globe
// greys out under a slash, a check lands on the card, "ტელეფონში" settles under the phone.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  at?: number | string; // chunk where the copy tries to leave
  title?: string; // the card's heading
  label?: string; // the word under the phone at the end
  tone?: Tone;
};

// stage geometry
const CX = 540;
const RING_Y = 880;
const RING_R = 320;
const PH = {x: 410, y: 620, w: 260, h: 520, r: 42};
const CARD = {x: 436, y: 730, w: 208, h: 270};
const GLOBE = {x: 830, y: 500, r: 84};
// the unit vector from the ring's centre to the globe
const DX = (830 - 540) / Math.hypot(290, 380);
const DY = -380 / Math.hypot(290, 380);

/** The card: a heading, a photo square, four text lines (drawn, no real data). */
const Doc: React.FC<{x: number; y: number; s: number; o: number; stroke: string}> = ({x, y, s, o, stroke}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <rect x={-CARD.w / 2} y={-CARD.h / 2} width={CARD.w} height={CARD.h} rx={14} fill={C.surface} stroke={stroke} strokeWidth={2} />
    <rect x={-CARD.w / 2 + 20} y={-CARD.h / 2 + 64} width={58} height={70} rx={6} fill="none" stroke={rgba(C.ink, 0.55)} strokeWidth={1.6} />
    <line x1={-CARD.w / 2 + 92} x2={CARD.w / 2 - 20} y1={-CARD.h / 2 + 78} y2={-CARD.h / 2 + 78} stroke={rgba(C.ink, 0.45)} strokeWidth={3} strokeLinecap="round" />
    <line x1={-CARD.w / 2 + 92} x2={CARD.w / 2 - 44} y1={-CARD.h / 2 + 100} y2={-CARD.h / 2 + 100} stroke={rgba(C.ink, 0.3)} strokeWidth={3} strokeLinecap="round" />
    <line x1={-CARD.w / 2 + 92} x2={CARD.w / 2 - 60} y1={-CARD.h / 2 + 122} y2={-CARD.h / 2 + 122} stroke={rgba(C.ink, 0.3)} strokeWidth={3} strokeLinecap="round" />
    <line x1={-CARD.w / 2 + 20} x2={CARD.w / 2 - 20} y1={-CARD.h / 2 + 168} y2={-CARD.h / 2 + 168} stroke={rgba(C.ink, 0.3)} strokeWidth={3} strokeLinecap="round" />
    <line x1={-CARD.w / 2 + 20} x2={CARD.w / 2 - 50} y1={-CARD.h / 2 + 192} y2={-CARD.h / 2 + 192} stroke={rgba(C.ink, 0.3)} strokeWidth={3} strokeLinecap="round" />
    <line x1={-CARD.w / 2 + 20} x2={CARD.w / 2 - 80} y1={-CARD.h / 2 + 216} y2={-CARD.h / 2 + 216} stroke={rgba(C.ink, 0.3)} strokeWidth={3} strokeLinecap="round" />
  </g>
);

export const V70InHand: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const first = ctx.index === 0;
  const draw = first ? 1 : prog(frame, e, 24, ease.drawOn);
  const tone = p.tone ?? 'up';

  // the attempt: out to the ring, a bump, back home
  const go = Math.max(base + 10, cueFrame(ctx, p.at ?? 1));
  const out = prog(frame, go, 14, ease.camera);
  const hit = go + 14;
  const back = prog(frame, hit + 2, 14, ease.camera);
  const home = hit + 16;
  const bump = frame >= hit ? Math.max(0, 1 - (frame - hit) / 14) : 0;
  const settle = spr(frame, home, 'land');
  const check = spr(frame, home + 2, 'land');

  // the copy's path: from the card's centre to the ring along the globe's direction
  const sx = CX;
  const sy = CARD.y + CARD.h / 2;
  const hx = CX + DX * RING_R;
  const hy = RING_Y + DY * RING_R;
  const k = out * (1 - back);
  const gx = lerp(sx, hx - DX * 40, k);
  const gy = lerp(sy, hy - DY * 40, k);
  const gs = lerp(1, 0.42, Math.min(1, k * 1.6));
  const ghostOn = frame >= go && frame < home + 1;

  // the dotted way towards the globe, cut at the ring
  const wayLen = Math.hypot(hx - sx, hy - sy);
  const way = prog(frame, go - 6, 14, ease.drawOn) * (1 - prog(frame, home, 12, ease.camera));

  // the globe greys out after the copy comes home
  const off = prog(frame, home, 14, ease.camera);
  const slash = prog(frame, home + 2, 12, ease.drawOn);

  // a slow push over the whole scene
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const ringStroke = bump > 0 ? toneBig(tone) : rgba(C.ink, 0.42);
  const ringW = 1.8 + bump * 2.2;

  const title = mtav(p.title ?? 'ტექპასპორტი');
  const tSize = Math.min(26, Math.floor((26 * (CARD.w - 36)) / Math.max(1, textWidth(title, `600 26px ${F.sans}`))));
  const label = mtav(p.label ?? 'ტელეფონში');
  const lSize = Math.min(52, Math.floor((52 * 600) / Math.max(1, textWidth(label, `600 52px ${F.sans}`))));
  const ringLen = 2 * Math.PI * RING_R;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${CX}px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the ring around the phone: the document's own space */}
          <circle cx={CX} cy={RING_Y} r={RING_R + bump * 6} fill="none" stroke={ringStroke} strokeWidth={ringW} strokeDasharray="3 11" strokeLinecap="round" opacity={draw} strokeDashoffset={ringLen * (1 - draw)} transform={`rotate(-90 ${CX} ${RING_Y})`} />
          {bump > 0 ? <circle cx={hx} cy={hy} r={14 + (1 - bump) * 40} fill="none" stroke={toneBig(tone)} strokeWidth={2} opacity={bump} /> : null}

          {/* the globe outside */}
          <g opacity={draw * lerp(1, 0.38, off)}>
            <circle cx={GLOBE.x} cy={GLOBE.y} r={GLOBE.r} fill="none" stroke={C.ink2} strokeWidth={2} />
            <ellipse cx={GLOBE.x} cy={GLOBE.y} rx={GLOBE.r * 0.45} ry={GLOBE.r} fill="none" stroke={C.ink2} strokeWidth={1.5} />
            <line x1={GLOBE.x} x2={GLOBE.x} y1={GLOBE.y - GLOBE.r} y2={GLOBE.y + GLOBE.r} stroke={C.ink2} strokeWidth={1.5} />
            <line x1={GLOBE.x - GLOBE.r} x2={GLOBE.x + GLOBE.r} y1={GLOBE.y} y2={GLOBE.y} stroke={C.ink2} strokeWidth={1.5} />
            <path d={`M ${GLOBE.x - GLOBE.r * 0.86} ${GLOBE.y - GLOBE.r * 0.5} Q ${GLOBE.x} ${GLOBE.y - GLOBE.r * 0.36} ${GLOBE.x + GLOBE.r * 0.86} ${GLOBE.y - GLOBE.r * 0.5}`} fill="none" stroke={C.ink2} strokeWidth={1.5} />
            <path d={`M ${GLOBE.x - GLOBE.r * 0.86} ${GLOBE.y + GLOBE.r * 0.5} Q ${GLOBE.x} ${GLOBE.y + GLOBE.r * 0.36} ${GLOBE.x + GLOBE.r * 0.86} ${GLOBE.y + GLOBE.r * 0.5}`} fill="none" stroke={C.ink2} strokeWidth={1.5} />
          </g>
          {slash > 0 ? (
            <line x1={GLOBE.x - GLOBE.r * 1.1} y1={GLOBE.y + GLOBE.r * 1.1} x2={GLOBE.x - GLOBE.r * 1.1 + GLOBE.r * 2.2 * slash} y2={GLOBE.y + GLOBE.r * 1.1 - GLOBE.r * 2.2 * slash} stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
          ) : null}

          {/* the dotted way, never past the ring */}
          {way > 0 ? (
            <line x1={sx} y1={sy} x2={sx + (hx - sx) * way} y2={sy + (hy - sy) * way} stroke={rgba(C.ink, 0.5)} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" opacity={wayLen > 0 ? 1 : 0} />
          ) : null}

          {/* the phone */}
          <g opacity={draw}>
            <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={PH.r} fill={C.bg} stroke={C.ink} strokeWidth={2.4} />
            <rect x={CX - 38} y={PH.y + 18} width={76} height={20} rx={10} fill={C.ink} />
          </g>
          <Doc x={sx} y={sy} s={1} o={draw} stroke={frame >= home + 2 ? toneBig(tone) : C.rule} />

          {/* the copy that tries to leave */}
          {ghostOn ? <Doc x={gx} y={gy} s={gs} o={0.92} stroke={C.ink} /> : null}

          {/* the check on the card */}
          {check > 0 ? (
            <g transform={`translate(${CX + CARD.w / 2 - 6} ${CARD.y + CARD.h - 6}) scale(${check})`}>
              <circle r={26} fill={toneBig(tone)} />
              <path d="M -11 1 L -3 9 L 12 -8" fill="none" stroke={C.bg} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
        </svg>
        <div className={TXT} style={{position: 'absolute', left: CARD.x + 18, width: CARD.w - 36, top: CARD.y + 18, fontFamily: F.sans, fontWeight: 600, fontSize: tSize, color: C.ink, opacity: draw, whiteSpace: 'nowrap'}}>
          {title}
        </div>
        <div className={TXT} style={{position: 'absolute', left: CX - 320, width: 640, top: RING_Y + RING_R + 26, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: lSize, color: toneBig(tone), opacity: settle, transform: `translateY(${(1 - settle) * 16}px)`, whiteSpace: 'nowrap'}}>
          {label}
        </div>
      </div>
      <Sfx name="asmr-air" at={go} volume={0.35} />
      <Sfx name="asmr-knock" at={hit} volume={0.45} />
      <Haptic kind="light" at={hit} />
      <Sfx name="asmr-paper" at={hit + 6} volume={0.35} />
      <Sfx name="asmr-check" at={home + 2} volume={0.45} />
    </PictureBand>
  );
};
