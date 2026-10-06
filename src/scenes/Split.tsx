import React from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {useCamera} from '../lib/camera';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {PhotoCredits, photoCredit, PhotoPlate, Rect} from '../lib/photo';
import {Words} from '../lib/textfx';
import {C, F, FPS, L, rgba, SPRING, Tone, toneBig} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Sfx} from './common';

// ---- Split: then and now (2026-10-06, the stories category) -------------------------------------------------------------
// Two real photos, one moment apart: a car then and now, a road before and after, a record and the one that broke it.
//   wipe (default)  both full bleed; at `at` a divider sweeps from the right edge to `hold` (half the band) in 20 frames
//                   and b shows right of it; the two drift apart like parallax; a mono chip on each side ("label · year")
//   stack           a on top, b below (1040 x 500 each); b rises at `at`, a steps back; the two years at the seam
//   slide           a slides out left as b slides in (12 frames), then both shrink to side by side cards
// Props: a*, b* {src, label, year, center}, staging, at (chunk or "1.2s"; default the entrance + 20), hold (0.5),
// tone (the years' colour), caption (a masked line under the picture). Each photo's credit is shown while it is.

type At = number | string;
type Side = {src: string; label?: string; year?: string; center?: {x?: number; y?: number}};
type P = {a: Side; b: Side; staging?: 'wipe' | 'stack' | 'slide'; at?: At; hold?: number; tone?: Tone; caption?: string};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const BAND: Rect = {x: 20, y: L.graphicsTop, w: 1040, h: L.graphicsBottom - L.graphicsTop};

export const spAt = (p: P, ctx: SceneCtx) => {
  const e = entrance(ctx);
  return p.at !== undefined ? Math.max(e + 8, cueFrame(ctx, p.at)) : e + 20;
};
export const spKicks = (p: P, ctx: SceneCtx) => [spAt(p, ctx) + 16];

const Chip: React.FC<{text: string; x: number; y: number; at: number; align?: 'left' | 'right'}> = ({text, x, y, at, align = 'left'}) => {
  const frame = useCurrentFrame();
  const shown = mtav(capsLatin(text));
  const n = Math.max(0, Math.floor((frame - at) * 1.6));
  if (frame < at) return null;
  return (
    <div className={TXT} style={{position: 'absolute', top: y, left: align === 'left' ? x : undefined, right: align === 'right' ? 1080 - x : undefined, padding: '5px 10px', backgroundColor: C.bg, color: C.ink, fontFamily: F.mono, fontSize: 26, letterSpacing: '0.05em', whiteSpace: 'nowrap'}}>
      {shown.slice(0, n)}
    </div>
  );
};

export const Split: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const st = p.staging ?? 'wipe';
  const at = spAt(p, ctx);
  const cam = useCamera(1, {move: false});
  const t = clamp((frame - e) / Math.max(1, ctx.dur - e), 0, 1.2);
  const pp = t >= 1 ? 1 + (t - 1) * 0.154 : ease.drift(t);
  const id = `vn-sp-${ctx.index}`;
  const tag = (s: Side) => [s.label, s.year].filter(Boolean).join(' · ');
  const ca = {x: clamp(p.a.center?.x ?? 0.5, 0, 1), y: clamp(p.a.center?.y ?? 0.45, 0, 1)};
  const cb = {x: clamp(p.b.center?.x ?? 0.5, 0, 1), y: clamp(p.b.center?.y ?? 0.45, 0, 1)};
  let body: React.ReactNode = null;
  let credits: string[] = [];
  let sounds: React.ReactNode = null;
  if (st === 'wipe') {
    const hold = clamp(p.hold ?? 0.5, 0.2, 0.8);
    const k = prog(frame, at, 20, ease.camera);
    const x = BAND.x + BAND.w * (1 - (1 - hold) * k);
    body = (
      <>
        <PhotoPlate src={p.a.src} id={`${id}-a`} view={BAND} z={1.06} u={ca.x + 0.015 * pp} v={ca.y} camera={cam} vignette={0.4} />
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${x.toFixed(1)}px)`}}>
          <PhotoPlate src={p.b.src} id={`${id}-b`} view={BAND} z={1.06} u={cb.x - 0.015 * pp} v={cb.y} camera={cam} vignette={0.4} />
        </div>
        {k > 0 ? (
          <>
            <div style={{position: 'absolute', left: x - 1, top: BAND.y, width: 2, height: BAND.h, backgroundColor: C.ink}} />
            <div style={{position: 'absolute', left: x - 9, top: L.contentMid - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.ink}} />
          </>
        ) : null}
        {tag(p.a) ? <Chip text={tag(p.a)} x={L.side} y={BAND.y + 40} at={e + 6} /> : null}
        {tag(p.b) && k > 0.4 ? <Chip text={tag(p.b)} x={Math.max(x + 20, 560)} y={BAND.y + 40} at={at + 10} /> : null}
      </>
    );
    credits = [photoCredit(p.a.src), k > 0 ? photoCredit(p.b.src) : ''];
    sounds = (
      <>
        <Sfx name="asmr-slide" at={Math.max(0, at)} volume={0.35} />
        <Haptic kind="light" at={Math.max(0, at + 16)} />
      </>
    );
  } else if (st === 'stack') {
    const h = L.contentMid - 4 - L.graphicsTop; // two bands from the band's top to its middle and down, cut hard
    const top: Rect = {x: 20, y: L.graphicsTop, w: 1040, h};
    const bot: Rect = {x: 20, y: L.contentMid + 4, w: 1040, h};
    const k = frame < at ? 0 : spring({frame: frame - at, fps: FPS, config: SPRING.enterXL});
    const dimA = 0.4 * prog(frame, at + 10, 10);
    const yb = (1 - k) * 560;
    body = (
      <>
        <PhotoPlate src={p.a.src} id={`${id}-a`} view={top} z={1 + 0.05 * pp} u={ca.x} v={ca.y} camera={cam} />
        <div style={{position: 'absolute', left: top.x, top: top.y, width: top.w, height: top.h, backgroundColor: rgba(C.bg, dimA)}} />
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${yb.toFixed(1)}px)`, opacity: frame < at ? 0 : 1}}>
            <PhotoPlate src={p.b.src} id={`${id}-b`} view={bot} z={1 + 0.05 * pp} u={cb.x} v={cb.y} camera={cam} />
          </div>
        </div>
        {p.a.year ? (
          <div className={TXT} style={{position: 'absolute', left: L.side, top: L.contentMid - 66, fontFamily: F.sans, fontWeight: 600, fontSize: 96, lineHeight: 1, color: toneBig(p.tone), backgroundColor: C.bg, padding: '6px 14px', opacity: prog(frame, e + 4, 6)}}>
            {mtav(p.a.year)}
          </div>
        ) : null}
        {p.b.year && k > 0.5 ? (
          <div className={TXT} style={{position: 'absolute', right: 1080 - L.safeRight, top: L.contentMid - 30, fontFamily: F.sans, fontWeight: 600, fontSize: 96, lineHeight: 1, color: toneBig(p.tone), backgroundColor: C.bg, padding: '6px 14px', transform: `scale(${(1.12 - 0.12 * spr(frame, at + 8, 'punch')).toFixed(4)})`}}>
            {mtav(p.b.year)}
          </div>
        ) : null}
        {p.a.label ? <Chip text={p.a.label} x={L.side} y={top.y + 24} at={e + 8} /> : null}
        {p.b.label && k > 0.6 ? <Chip text={p.b.label} x={L.side} y={bot.y + h - 70} at={at + 12} /> : null}
      </>
    );
    credits = [photoCredit(p.a.src), k > 0 ? photoCredit(p.b.src) : ''];
    sounds = (
      <>
        <Sfx name="cc0-card-slide" at={Math.max(0, at)} volume={0.4} />
        <Haptic kind="soft" at={Math.max(0, at + 10)} />
      </>
    );
  } else {
    // slide: a out left, b in from the right, then both settle side by side as two cards
    const k = prog(frame, at, 12, ease.snap);
    const m = frame < at + 14 ? 0 : spring({frame: frame - at - 14, fps: FPS, config: SPRING.enter});
    const cardW = BAND.w * 0.47;
    const cardH = 640;
    const cy = L.contentMid - cardH / 2;
    const ra: Rect = {x: (BAND.x - BAND.w * k) * (1 - m) + (BAND.x + 0.02 * BAND.w) * m, y: BAND.y + (cy - BAND.y) * m, w: BAND.w + (cardW - BAND.w) * m, h: BAND.h + (cardH - BAND.h) * m};
    const rbX = BAND.x + BAND.w * (1 - k);
    const rb: Rect = {x: rbX + (BAND.x + BAND.w * 0.51 - rbX) * m, y: BAND.y + (cy - BAND.y) * m, w: BAND.w + (cardW - BAND.w) * m, h: BAND.h + (cardH - BAND.h) * m};
    body = (
      <>
        {m > 0 || k < 1 ? <PhotoPlate src={p.a.src} id={`${id}-a`} view={ra} z={1.04} u={ca.x} v={ca.y} camera={cam} edge={m > 0} /> : null}
        {frame >= at ? <PhotoPlate src={p.b.src} id={`${id}-b`} view={rb} z={1.04} u={cb.x} v={cb.y} camera={cam} edge={m > 0} /> : null}
        {m > 0.6 && tag(p.a) ? <Chip text={tag(p.a)} x={ra.x} y={ra.y + ra.h + 16} at={at + 24} /> : null}
        {m > 0.6 && tag(p.b) ? <Chip text={tag(p.b)} x={rb.x} y={rb.y + rb.h + 16} at={at + 28} /> : null}
      </>
    );
    credits = [m > 0 || k < 1 ? photoCredit(p.a.src) : '', frame >= at ? photoCredit(p.b.src) : ''];
    sounds = (
      <>
        <Sfx name="asmr-slide" at={Math.max(0, at)} volume={0.35} />
        <Sfx name="cc0-card-place" at={Math.max(0, at + 18)} volume={0.4} />
        <Haptic kind="soft" at={Math.max(0, at + 18)} />
      </>
    );
  }
  return (
    <>
      {body}
      {p.caption ? (
        <div style={{position: 'absolute', top: L.contentBottom - 40, left: L.side, whiteSpace: 'nowrap'}}>
          <Words text={p.caption} at={Math.max(e + 10, at + 20)} fx="mask" size={44} sound={false} />
        </div>
      ) : null}
      <PhotoCredits lines={credits} bottom={BAND.y + BAND.h - 4} />
      {sounds}
    </>
  );
};
