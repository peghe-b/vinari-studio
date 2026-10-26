// Phone's "loupe" staging (the default "device" and "tilt" live in Phone.tsx): the whole device, small, at the left,
// and a round loupe beside it that magnifies the talked-about element 2x, a hairline leader from the spot on
// the device to the loupe. The loupe follows the highlights (their centres) or else the focus keys; a highlight's band
// is drawn inside the loupe, large. Props as Phone: src, y/x (the spot at the start), focus, highlight, tap
// (a ring on the device); callout, zoom and cropBottom are the device's own and are not drawn here.
// From film KIT_FROM (v110) on, a scene with highlights draws the loupe CONCENTRIC with the element (the reviewer, 2026-10-19:
// the round loupe clipped the pill and its outline mid-word, its source circle cut through the words under it, and it covered
// the device's edge): on the device the element's own outline (no circle), and beside the device a rounded box concentric
// with that outline (a pill's a stadium) holding the WHOLE element and its outline magnified, joined to the device's side by
// two lines that never cross the screen; an element too wide to grow beside the device (a full-width button) gets its box
// UNDER the device instead, full width. Films up to v109 keep the round loupe they were made with.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {useLayer} from '../../lib/layer';
import {growRing, mixRing, outlineOn, type Ring} from '../../lib/outline.mjs';
import {useRings} from '../../lib/outline-px';
import {ScreenImg} from '../../lib/screen';
import {C, filmNo, halo, isLight, THEME, type Tone, toneLine} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';

type At = number | string;
type Hl = {y: number; h: number; x?: number; w?: number; tone?: Tone; at?: At; r?: number | 'pill'; snap?: boolean; gap?: number}; // r/snap/gap: Phone.tsx
type P = {src: string; y?: number; x?: number; focus?: {y: number; x?: number; at?: At}[]; highlight?: Hl | Hl[]; tap?: {x: number; y: number; at?: At} | {x: number; y: number; at?: At}[]; bright?: number};

const SRC_W = 1080;
const SRC_H = 2346;
const DW = 372; // the screen's width on the device
const DH = (DW * SRC_H) / SRC_W; // 808
const BZ = 11;
const DX = 128; // the screen's left edge
const DY = 420; // the screen's top
const LR = 250; // the loupe's radius
const LX = 700;
const MAG = 2;

export const Loupe: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const layer = useLayer();
  const base = lead(ctx);
  const enter = spr(frame, entrance(ctx), 'enterXL');
  const lum = ctx.index === 0 ? prog(frame, base + 4, 18) : 0.6 + 0.4 * prog(frame, base, 8);
  const hls = ([] as Hl[]).concat(p.highlight ?? []).map((h) => ({h, s: h.at !== undefined ? cueFrame(ctx, h.at) : base + 26})).sort((a, b) => a.s - b.s);
  // the spots the loupe visits: the start, then every highlight's centre (or the focus keys when there is none)
  const keys = [
    {f: base, x: p.x ?? 0.5, y: p.y ?? 0.3},
    ...(hls.length ? hls.map(({h, s}) => ({f: s - 6, x: Math.min((h.x ?? 0.03) + (h.w ?? 0.94) / 2, (h.x ?? 0.03) + (LR - 40) / (DW * MAG)), y: h.y + h.h / 2})) : (p.focus ?? []).map((k) => ({f: k.at !== undefined ? cueFrame(ctx, k.at) : base + 24, x: k.x ?? 0.5, y: k.y}))),
  ].sort((a, b) => a.f - b.f);
  let fx = keys[0].x;
  let fy = keys[0].y;
  for (let i = 1; i < keys.length; i++) {
    const t = prog(frame, keys[i].f, 22, ease.camera);
    fx += (keys[i].x - fx) * t;
    fy += (keys[i].y - fy) * t;
  }
  const open = spr(frame, (keys[1]?.f ?? base + 14) - 10, 'enterXL');
  // the spot on the device, the loupe's centre beside it (kept above stage 1080 minus its radius: nothing under the like column)
  const sx = DX + fx * DW;
  const sy = DY + fy * DH;
  const ly = Math.max(330 + LR + 30, Math.min(1080 - LR - 20, sy));
  const light = isLight();
  const bright = Math.min(1, Math.max(0.9, p.bright ?? THEME.screenBright));
  const shot: React.CSSProperties = light ? {opacity: lum} : {filter: `brightness(${bright * lum})${THEME.screenFilter === 'none' ? '' : ` ${THEME.screenFilter}`}`};
  const hlIdx = hls.filter((e) => frame >= e.s).length - 1;
  const hl = hlIdx >= 0 ? hls[hlIdx].h : null;
  const hlT = hlIdx >= 0 ? prog(frame, hls[hlIdx].s, 10) : 0;
  // from film KIT_FROM on the band is concentric with the element (src/lib/outline.mjs): its border's inner edge is the ring
  const rings = useRings(outlineOn(filmNo()) ? staticFile(`screens/${p.src}.jpg`) : null, hls.map((e) => e.h));
  const ring = hlIdx >= 0 ? rings[hlIdx] : null;
  if (outlineOn(filmNo()) && hls.length && rings.every(Boolean)) return <RingLoupe p={p} ctx={ctx} hls={hls} rings={rings as Ring[]} />;
  const taps = ([] as {x: number; y: number; at?: At}[]).concat(p.tap ?? []).map((t) => ({...t, f: t.at !== undefined ? cueFrame(ctx, t.at) : base + 30}));
  const ringR = LR / MAG;
  // the magnified capture inside the loupe: the spot at the loupe's centre
  const mw = DW * MAG;
  const mh = DH * MAG;
  const ix = LR - fx * mw;
  const iy = LR - fy * mh;
  const lead0 = {x: sx + ringR * 0.72, y: sy - ringR * 0.72};
  const dx = LX - lead0.x;
  const dy = ly - lead0.y;
  const d = Math.hypot(dx, dy) || 1;
  const lead1 = {x: LX - (dx / d) * LR, y: ly - (dy / d) * LR};
  return (
    <>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - enter) * 50}px)`, opacity: Math.min(1, enter * 1.4)}}>
        {/* the whole device, small */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={DX - BZ} y={DY - BZ} width={DW + 2 * BZ} height={DH + 2 * BZ} rx={58} fill="none" stroke={C.ink} strokeOpacity={0.85} strokeWidth={2} />
        </svg>
        <div style={{position: 'absolute', left: DX, top: DY, width: DW, height: DH, borderRadius: 48, overflow: 'hidden'}}>
          {layer === 'text' ? null : <ScreenImg src={p.src} style={{position: 'absolute', inset: 0, width: DW, height: DH, ...shot}} />}
        </div>
        {/* the spot, the leader, the loupe */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <circle cx={sx} cy={sy} r={ringR} fill="none" stroke={C.ink} strokeWidth={2} opacity={open} />
          <line x1={lead0.x} y1={lead0.y} x2={lerp(lead0.x, lead1.x, open)} y2={lerp(lead0.y, lead1.y, open)} stroke={C.ink} strokeWidth={1.5} opacity={0.7 * open} />
          {taps.map((t, i) => {
            const k = Math.max(0, Math.min(1, (frame - t.f) / 16));
            return frame >= t.f && k < 1 ? <circle key={i} cx={DX + t.x * DW} cy={DY + t.y * DH} r={14 + 22 * k} fill="none" stroke={C.ink} strokeWidth={3} opacity={1 - k} /> : null;
          })}
        </svg>
        <div style={{position: 'absolute', left: LX - LR, top: ly - LR, width: 2 * LR, height: 2 * LR, borderRadius: '50%', overflow: 'hidden', transform: `scale(${open})`, background: C.bg, boxShadow: `0 0 0 2px ${C.ink}, 0 24px 60px ${halo(C.shade, 0.5)}`}}>
          {layer === 'text' ? null : <ScreenImg src={p.src} style={{position: 'absolute', left: ix, top: iy, width: mw, height: mh, ...shot}} />}
          {hl ? (
            <div
              style={{
                position: 'absolute',
                ...(ring
                  ? {left: ix + (ring.x0 * mw) / SRC_W - 4, top: iy + (ring.y0 * mh) / SRC_H - 4, width: ((ring.x1 - ring.x0) * mw) / SRC_W + 8, height: ((ring.y1 - ring.y0) * mh) / SRC_H + 8, borderRadius: (ring.r * mw) / SRC_W + 4}
                  : {left: ix + (hl.x ?? 0.03) * mw, top: iy + hl.y * mh, width: (hl.w ?? 0.94) * mw, height: hl.h * mh, borderRadius: 26}),
                border: `4px solid ${toneLine(hl.tone ?? 'up')}`,
                opacity: hlT,
                boxShadow: `0 0 24px ${halo(toneLine(hl.tone ?? 'up'), 0.33)}`,
              }}
            />
          ) : null}
        </div>
      </div>
      <Sfx name="asmr-slide" at={base} volume={0.42} /* event: the phone slides in */ />
      <Sfx name="asmr-air-long" at={Math.max(0, (keys[1]?.f ?? base + 14) - 12)} volume={0.22} len={40} fade={12} /* event: the loupe opens */ />
      {hls.map(({s}, i) => (
        <React.Fragment key={i}>
          <Sfx name="cc0-click-soft" at={s} volume={0.5} /* event: a band lands in the loupe */ />
          <Haptic kind={i === 0 ? 'light' : 'selection'} at={s} volume={0.38} />
        </React.Fragment>
      ))}
      {taps.map((t, i) => (
        <React.Fragment key={`t${i}`}>
          <Sfx name="asmr-tap" at={t.f} volume={0.55} /* event: a finger taps the screen */ />
          <Haptic kind="light" at={t.f} volume={0.42} />
        </React.Fragment>
      ))}
    </>
  );
};

// ---- v110 on: the loupe concentric with the element ------------------------------------------------------------------------
const KDEV = DW / SRC_W; // frame px per capture px on the device
const PAD = 18; // capture px of the screen round the outline inside the loupe
const SW = 4; // the outline's stroke in the loupe (frame px)
const SW_DEV = 2.5; // and on the device
// stage units (src/tokens.ts STAGE): the column beside the device inside the content box, kept above stage 1060 (the like
// column below 1080), and the band under the device, left of L.lowRight and above L.pictureBottom-ish 1380 (frame 1440, the
// subtitle's letters start under it)
const SIDE = {x0: DX + DW + BZ + 36, x1: 960, maxH: 480};
const UNDER = {x0: 120, x1: 850, y0: DY + DH + BZ + 24, y1: 1380};

const RingLoupe: React.FC<{p: P; ctx: SceneCtx; hls: {h: Hl; s: number}[]; rings: Ring[]}> = ({p, ctx, hls, rings}) => {
  const frame = useCurrentFrame();
  const layer = useLayer();
  const base = lead(ctx);
  const enter = spr(frame, entrance(ctx), 'enterXL');
  const lum = ctx.index === 0 ? prog(frame, base + 4, 18) : 0.6 + 0.4 * prog(frame, base, 8);
  const light = isLight();
  const bright = Math.min(1, Math.max(0.9, p.bright ?? THEME.screenBright));
  const shot: React.CSSProperties = light ? {opacity: lum} : {filter: `brightness(${bright * lum})${THEME.screenFilter === 'none' ? '' : ` ${THEME.screenFilter}`}`};
  // the ring now (capture px, the outline's inner edge): from one highlight's to the next
  let g = rings[0];
  for (let i = 1; i < hls.length; i++) g = mixRing(g, rings[i], prog(frame, hls[i].s - 6, 22, ease.camera));
  const idx = Math.max(0, hls.filter((e) => frame >= e.s).length - 1);
  const tone = toneLine(hls[idx].h.tone ?? 'up');
  const shown = prog(frame, hls[0].s, 10);
  const open = spr(frame, hls[0].s - 10, 'enterXL');
  const crop = growRing(g, PAD);
  const cw = crop.x1 - crop.x0;
  const ch = crop.y1 - crop.y0;
  // beside the device while the element grows there (1.5 times its size on the device at least), else under it
  const zSide = Math.min(MAG * KDEV, (SIDE.x1 - SIDE.x0) / cw, SIDE.maxH / ch);
  const beside = zSide >= 1.5 * KDEV;
  const z = beside ? zSide : Math.min(MAG * KDEV, (UNDER.x1 - UNDER.x0) / cw, (UNDER.y1 - UNDER.y0) / ch);
  const lw = cw * z;
  const lh = ch * z;
  const dev = {x: DX + g.x0 * KDEV, y: DY + g.y0 * KDEV, w: (g.x1 - g.x0) * KDEV, h: (g.y1 - g.y0) * KDEV, r: g.r * KDEV};
  const lx = beside ? SIDE.x0 + (SIDE.x1 - SIDE.x0 - lw) / 2 : Math.max(UNDER.x0, Math.min(UNDER.x1 - lw, dev.x + dev.w / 2 - lw / 2));
  const ly = beside ? Math.max(350, Math.min(1060 - lh, dev.y + dev.h / 2 - lh / 2)) : UNDER.y0;
  const lr = (g.r + PAD) * z;
  // the two lines, never over the screen: beside, from the device's side level with the outline's ends to the loupe's facing
  // corners; under, straight down from the device's foot at the outline's two ends to the loupe's top edge
  const topAt = (x: number) => {
    const c = Math.min(Math.max(x, lx + lr), lx + lw - lr);
    const dx = Math.min(lr, Math.abs(x - c));
    return ly + lr - Math.sqrt(Math.max(0, lr * lr - dx * dx));
  };
  const foot = DY + DH + BZ + 2;
  const lines = beside
    ? [
        [{x: DX + DW + BZ + 2, y: dev.y - SW_DEV}, {x: lx + lr * 0.29, y: ly + lr * 0.29}],
        [{x: DX + DW + BZ + 2, y: dev.y + dev.h + SW_DEV}, {x: lx + lr * 0.29, y: ly + lh - lr * 0.29}],
      ]
    : [dev.x - SW_DEV, dev.x + dev.w + SW_DEV].map((x) => [{x, y: foot}, {x, y: topAt(x) - 2}]);
  const box = (b: {x: number; y: number; w: number; h: number; r: number}, sw: number) => ({left: b.x - sw, top: b.y - sw, width: b.w + 2 * sw, height: b.h + 2 * sw, borderRadius: b.r + sw});
  const taps = ([] as {x: number; y: number; at?: At}[]).concat(p.tap ?? []).map((t) => ({...t, f: t.at !== undefined ? cueFrame(ctx, t.at) : base + 30}));
  return (
    <>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - enter) * 50}px)`, opacity: Math.min(1, enter * 1.4)}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={DX - BZ} y={DY - BZ} width={DW + 2 * BZ} height={DH + 2 * BZ} rx={58} fill="none" stroke={C.ink} strokeOpacity={0.85} strokeWidth={2} />
        </svg>
        <div style={{position: 'absolute', left: DX, top: DY, width: DW, height: DH, borderRadius: 48, overflow: 'hidden'}}>
          {layer === 'text' ? null : <ScreenImg src={p.src} style={{position: 'absolute', inset: 0, width: DW, height: DH, ...shot}} />}
        </div>
        {/* the element's outline on the device (concentric: the ring is its inner edge), the two lines */}
        <div style={{position: 'absolute', ...box(dev, SW_DEV), border: `${SW_DEV}px solid ${tone}`, opacity: shown}} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {lines.map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={lerp(a.x, b.x, open)} y2={lerp(a.y, b.y, open)} stroke={C.ink} strokeWidth={1.5} opacity={0.7 * open} />
          ))}
          {taps.map((t, i) => {
            const k = Math.max(0, Math.min(1, (frame - t.f) / 16));
            return frame >= t.f && k < 1 ? <circle key={i} cx={DX + t.x * DW} cy={DY + t.y * DH} r={14 + 22 * k} fill="none" stroke={C.ink} strokeWidth={3} opacity={1 - k} /> : null;
          })}
        </svg>
        {/* the loupe: concentric with the outline, the whole element and its outline in it */}
        <div style={{position: 'absolute', left: lx, top: ly, width: lw, height: lh, borderRadius: lr, overflow: 'hidden', transform: `scale(${open})`, background: C.bg, boxShadow: `0 0 0 2px ${C.ink}, 0 24px 60px ${halo(C.shade, 0.5)}`}}>
          {layer === 'text' ? null : <ScreenImg src={p.src} style={{position: 'absolute', left: -crop.x0 * z, top: -crop.y0 * z, width: SRC_W * z, height: SRC_H * z, maxWidth: 'none', ...shot}} />}
          <div style={{position: 'absolute', ...box({x: PAD * z, y: PAD * z, w: (g.x1 - g.x0) * z, h: (g.y1 - g.y0) * z, r: g.r * z}, SW), border: `${SW}px solid ${tone}`, opacity: shown, boxShadow: `0 0 24px ${halo(tone, 0.33)}`}} />
        </div>
      </div>
      <Sfx name="asmr-slide" at={base} volume={0.42} /* event: the phone slides in */ />
      <Sfx name="asmr-air-long" at={Math.max(0, hls[0].s - 22)} volume={0.22} len={40} fade={12} /* event: the loupe opens */ />
      {hls.map(({s}, i) => (
        <React.Fragment key={i}>
          <Sfx name="cc0-click-soft" at={s} volume={0.5} /* event: a band lands in the loupe */ />
          <Haptic kind={i === 0 ? 'light' : 'selection'} at={s} volume={0.38} />
        </React.Fragment>
      ))}
      {taps.map((t, i) => (
        <React.Fragment key={`t${i}`}>
          <Sfx name="asmr-tap" at={t.f} volume={0.55} /* event: a finger taps the screen */ />
          <Haptic kind="light" at={t.f} volume={0.42} />
        </React.Fragment>
      ))}
    </>
  );
};
