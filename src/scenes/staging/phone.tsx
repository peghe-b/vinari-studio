// Phone's "loupe" staging (the default "device" and "tilt" live in Phone.tsx): the whole device, small, at the left,
// and a round loupe beside it that magnifies the talked-about element 2x, a hairline leader from the spot on
// the device to the loupe. The loupe follows the highlights (their centres) or else the focus keys; a highlight's band
// is drawn inside the loupe, large. Props as Phone: src, y/x (the spot at the start), focus, highlight, tap
// (a ring on the device); callout, zoom and cropBottom are the device's own and are not drawn here.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {useLayer} from '../../lib/layer';
import {C, halo, isLight, THEME, type Tone, toneLine} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';

type At = number | string;
type Hl = {y: number; h: number; x?: number; w?: number; tone?: Tone; at?: At};
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
          {layer === 'text' ? null : <Img src={staticFile(`screens/${p.src}.jpg`)} style={{position: 'absolute', inset: 0, width: DW, height: DH, ...shot}} />}
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
          {layer === 'text' ? null : <Img src={staticFile(`screens/${p.src}.jpg`)} style={{position: 'absolute', left: ix, top: iy, width: mw, height: mh, ...shot}} />}
          {hl ? (
            <div
              style={{
                position: 'absolute',
                left: ix + (hl.x ?? 0.03) * mw,
                top: iy + hl.y * mh,
                width: (hl.w ?? 0.94) * mw,
                height: hl.h * mh,
                border: `4px solid ${toneLine(hl.tone ?? 'up')}`,
                borderRadius: 26,
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
