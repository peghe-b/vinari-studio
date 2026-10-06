import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, logZoom, prog, spr} from '../lib/anim';
import {useCamera} from '../lib/camera';
import {TXT} from '../lib/layer';
import {PhotoCredits, photoCredit, PhotoPlate} from '../lib/photo';
import {Words} from '../lib/textfx';
import {C, F, isLight, L, rgba, THEME, Tone, toneBig, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, lead, Sfx, SourceLine} from './common';

// ---- Timeline: years that travel (2026-10-06, the stories category) -----------------------------------------------------
// The years between two moments, crossed by the camera.
//   ruler (default)  a year ruler; the camera pans from event to event (18 to 24 frames a hop), each event pops a dot and
//                    a card (its year, its words, an optional photo thumb); earlier events step back; a year counter
//                    follows the pan
//   feed             the events as rows of a feed; the camera scrolls to each one
//   zoom             the whole span first (decades as dense ticks), then the camera zooms into the last event's year:
//                    "decades go by in a second"
// Props: from*, to* (years), events* [{year, label, at, tone, src}] (1..5; `at` a chunk or "1.2s", else evenly spread),
// staging, now (a "today" year written in the spec, never the clock), caption, source.

type At = number | string;
type Ev = {year: number; label: string; at?: At; tone?: Tone; src?: string};
type P = {from: number; to: number; events: Ev[]; staging?: 'ruler' | 'feed' | 'zoom'; now?: number | false; caption?: string; source?: string};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The events in year order with their frames (the scene and its camera kicks agree). */
export const tlEvents = (p: P, ctx: SceneCtx) => {
  const e = entrance(ctx);
  const evs = [...(p.events ?? [])].filter((x) => Number.isFinite(x?.year)).slice(0, 5).sort((a, b) => a.year - b.year);
  const n = Math.max(1, evs.length);
  const gap = Math.max(24, Math.floor((ctx.dur - e - 40) / n));
  let last = e + 4;
  return evs.map((ev, i) => {
    const want = ev.at !== undefined ? cueFrame(ctx, ev.at) : e + 18 + i * gap;
    const at = Math.max(last + 20, want, e + 14);
    last = at;
    return {...ev, f: at};
  });
};
export const tlKicks = (p: P, ctx: SceneCtx) => tlEvents(p, ctx).map((x) => x.f);

const LINE_Y = 860;
const ANCHOR = 380;

export const Timeline: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const st = p.staging ?? 'ruler';
  const cam = useCamera(1, {move: false});
  const evs = tlEvents(p, ctx);
  const from = Math.min(p.from, ...evs.map((x) => x.year));
  const to = Math.max(p.to, ...evs.map((x) => x.year));
  const appear = prog(frame, e, 10);
  const active = evs.reduce((a, x, i) => (frame >= x.f ? i : a), -1);
  const light = isLight();
  const thumbs = evs.filter((x) => x.src && frame >= x.f).map((x) => photoCredit(x.src as string));
  const t = clamp((frame - e) / Math.max(1, ctx.dur - e), 0, 1);

  const card = (ev: (typeof evs)[number], i: number, x: number, y: number, dim0: number) => {
    const k = spr(frame, ev.f, 'land');
    // an earlier event's words step aside when the next one lands (its year and dot stay, quieter)
    const next = evs[i + 1];
    const away = next ? prog(frame, next.f - 6, 10) : 0;
    const dim = dim0 < 1 ? Math.max(0, 1 - away) : dim0;
    const tone = ev.tone;
    return (
      <React.Fragment key={`c${i}`}>
        {ev.src ? (
          <div style={{position: 'absolute', left: x - 6, top: y - 400, width: 252, height: 192, backgroundColor: light ? C.surface : C.ink, boxShadow: `0 16px 40px ${rgba(C.shade, 0.45 * THEME.shadowK)}`, opacity: prog(frame, ev.f + 2, 8) * dim, transform: `translateY(${((1 - k) * 30).toFixed(1)}px) rotate(-1.5deg)`}}>
            <PhotoPlate src={ev.src} id={`vn-tl-${ctx.index}-${i}`} view={{x: 6, y: 6, w: 240, h: 180}} z={1} u={0.5} v={0.45} grain={0.4} />
          </div>
        ) : null}
        <div className={TXT} style={{position: 'absolute', left: x, top: y - 168, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.05em', color: tone ? toneBig(tone) : C.ink2, opacity: prog(frame, ev.f, 6) * Math.max(dim, 0.35), whiteSpace: 'nowrap'}}>
          {ev.year}
        </div>
        <div style={{position: 'absolute', left: x, top: y - 124, whiteSpace: 'nowrap', opacity: dim}}>
          <Words text={ev.label} at={ev.f + 3} fx="mask" size={40} sound={false} />
        </div>
      </React.Fragment>
    );
  };

  let body: React.ReactNode = null;
  if (st === 'feed') {
    const ROW = 220;
    const target = (i: number) => L.contentMid - 60 - i * ROW;
    let off = target(0) + 120;
    evs.forEach((x, i) => {
      off = off + (target(i) - off) * prog(frame, x.f - 16, 16, ease.whipOut);
    });
    body = (
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
        <div style={{position: 'absolute', inset: 0, ...cam}}>
          <div style={{position: 'absolute', left: L.side + 8, top: off - 40, width: 2, height: Math.max(1, (evs.length - 1) * ROW + 80), backgroundColor: C.rule, opacity: appear}} />
          {evs.map((x, i) => {
            const y = off + i * ROW;
            const on = i === active;
            const k = spr(frame, x.f, 'land');
            return (
              <React.Fragment key={i}>
                <div style={{position: 'absolute', left: L.side + 9 - 9 * k, top: y - 9 * k + 34, width: 18 * k, height: 18 * k, borderRadius: 9, backgroundColor: x.tone ? toneLine(x.tone) : C.ink, opacity: frame >= x.f ? 1 : 0}} />
                <div className={TXT} style={{position: 'absolute', left: L.side + 48, top: y, fontFamily: F.mono, fontSize: 64, lineHeight: 1, color: on ? (x.tone ? toneBig(x.tone) : C.ink) : C.ink2, opacity: frame >= x.f - 16 ? (on ? 1 : 0.55) : 0.2}}>
                  {x.year}
                </div>
                <div style={{position: 'absolute', left: L.side + 48, top: y + 80, whiteSpace: 'nowrap', opacity: on ? 1 : 0.5}}>
                  <Words text={x.label} at={x.f + 2} fx="mask" size={44} color={on ? C.ink : C.ink2} sound={false} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  } else if (st === 'zoom') {
    const last = evs[evs.length - 1];
    const span = Math.max(1, to - from);
    const k0 = 900 / span;
    const zt = last ? prog(frame, last.f - 30, 30, ease.camera) : 0;
    const zmax = clamp(span / 12, 6, 10);
    const Z = logZoom(1, zmax, zt);
    const yE = last?.year ?? (from + to) / 2;
    const xE0 = 90 + (yE - from) * k0;
    const xE = xE0 + (540 - xE0) * zt;
    const X = (yv: number) => xE + (yv - yE) * k0 * Z;
    const ticks: React.ReactNode[] = [];
    const yLo = Math.floor(from - 40 / (k0 * Z));
    const yHi = Math.ceil(to + 40 / (k0 * Z));
    for (let yv = Math.max(yLo, Math.floor(yE - 600 / (k0 * Z))); yv <= Math.min(yHi, Math.ceil(yE + 600 / (k0 * Z))); yv++) {
      const x = X(yv);
      if (x < 30 || x > 1050) continue;
      const big = yv % 10 === 0;
      ticks.push(<div key={yv} style={{position: 'absolute', left: x - (big ? 1 : 0.6), top: LINE_Y - (big ? 26 : 12), width: big ? 2 : 1.2, height: big ? 26 : 12, backgroundColor: big ? C.ink2 : C.rule, opacity: big ? 1 : clamp(k0 * Z / 6, 0.25, 1)}} />);
      if (big && k0 * Z * 10 > 70) ticks.push(<div key={`l${yv}`} className={TXT} style={{position: 'absolute', left: x - 60, width: 120, top: LINE_Y + 14, textAlign: 'center', fontFamily: F.mono, fontSize: 24, color: C.ink2, opacity: clamp((k0 * Z * 10 - 70) / 60, 0, 1)}}>{yv}</div>);
    }
    body = (
      <div style={{position: 'absolute', inset: 0, opacity: appear}}>
        <div style={{position: 'absolute', left: 30, right: 30, top: LINE_Y, height: 2, backgroundColor: C.rule}} />
        {ticks}
        {evs.map((x, i) => {
          const px = X(x.year);
          const k = spr(frame, x.f, 'land');
          return frame >= x.f && px > 20 && px < 1060 ? <div key={i} style={{position: 'absolute', left: px - 9 * k, top: LINE_Y - 9 * k + 1, width: 18 * k, height: 18 * k, borderRadius: 9, backgroundColor: x.tone ? toneLine(x.tone) : C.ink}} /> : null;
        })}
        {last && frame >= last.f ? card(last, evs.length - 1, clamp(X(last.year) - 20, L.side, 560), LINE_Y - 30, 1) : null}
      </div>
    );
  } else {
    // ruler: k so that neighbours stand 360 px apart (6..60 px a year)
    const gaps = evs.slice(1).map((x, i) => x.year - evs[i].year).filter((d) => d > 0);
    const k = clamp(gaps.length ? 360 / Math.min(...gaps) : 30, 6, 60);
    const target = (i: number) => ANCHOR - (evs[i].year - from) * k;
    let off = evs.length ? target(0) + 220 : ANCHOR;
    evs.forEach((x, i) => {
      const hop = clamp(Math.round(Math.abs(target(i) - off) / 30), 18, 24);
      off = off + (target(i) - off) * prog(frame, x.f - hop, hop, ease.camera);
    });
    const push = 1 + 0.03 * t;
    const X = (yv: number) => off + (yv - from) * k;
    const ticks: React.ReactNode[] = [];
    const y0 = Math.floor(from + (20 - off) / k) - 1;
    const y1 = Math.ceil(from + (1060 - off) / k) + 1;
    const every = k >= 8 ? 1 : 5;
    for (let yv = y0; yv <= y1; yv++) {
      const x = X(yv);
      const big = yv % 10 === 0;
      if (!big && yv % every) continue;
      ticks.push(<div key={yv} style={{position: 'absolute', left: x - (big ? 1 : 0.75), top: LINE_Y - (big ? 26 : 14), width: big ? 2 : 1.5, height: big ? 26 : 14, backgroundColor: big ? C.ink2 : C.rule}} />);
      if (big) ticks.push(<div key={`l${yv}`} className={TXT} style={{position: 'absolute', left: x - 60, width: 120, top: LINE_Y + 14, textAlign: 'center', fontFamily: F.mono, fontSize: 24, color: C.ink3}}>{yv}</div>);
    }
    const needle = Math.round(from + (ANCHOR - off) / k);
    body = (
      <>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
          <div style={{position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: `${ANCHOR}px ${LINE_Y}px`}}>
            <div style={{position: 'absolute', inset: 0, ...cam, opacity: appear}}>
              <div style={{position: 'absolute', left: 20, right: 20, top: LINE_Y, height: 2, backgroundColor: C.rule}} />
              {ticks}
              {p.now ? <div style={{position: 'absolute', left: X(p.now) - 1, top: LINE_Y - 60, width: 2, height: 120, backgroundColor: C.ink2, opacity: 0.6}} /> : null}
              {evs.map((x, i) => {
                const kk = spr(frame, x.f, 'land');
                const dim = i < active ? 0.45 : 1;
                return frame >= x.f ? (
                  <React.Fragment key={i}>
                    <div style={{position: 'absolute', left: X(x.year) - 9 * kk, top: LINE_Y - 9 * kk + 1, width: 18 * kk, height: 18 * kk, borderRadius: 9, backgroundColor: x.tone ? toneLine(x.tone) : C.ink, opacity: dim}} />
                    {card(x, i, X(x.year) - 4, LINE_Y - 30, dim)}
                  </React.Fragment>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <div className={TXT} style={{position: 'absolute', left: L.side, top: L.contentTop + 10, fontFamily: F.sans, fontWeight: 600, fontSize: 64, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: C.ink, opacity: appear}}>
          {needle}
        </div>
      </>
    );
  }
  return (
    <>
      {body}
      {p.caption ? (
        <div style={{position: 'absolute', top: L.contentBottom - 60, left: L.side, whiteSpace: 'nowrap'}}>
          <Words text={p.caption} at={e + 12} fx="mask" size={40} color={C.ink2} sound={false} />
        </div>
      ) : null}
      <PhotoCredits lines={thumbs} bottom={L.graphicsBottom - 4} />
      <SourceLine text={p.source} at={base + 24} />
      {/* events: the ruler rolls while the camera hops, each event pops (a dot, a light haptic); a feed row ticks */}
      {evs.map((x, i) => (
        <React.Fragment key={`s${i}`}>
          {st === 'ruler' && x.f - 20 >= 0 ? <Sfx name="asmr-detent-roll" at={x.f - 20} volume={0.3} len={20} fade={6} /> : null}
          {st === 'feed' && x.f - 14 >= 0 ? <Sfx name="asmr-ui-tick" at={x.f - 14} volume={0.4} /> : null}
          {st === 'zoom' && i === evs.length - 1 && x.f - 30 >= 0 ? <Sfx name="asmr-air-long" at={x.f - 30} volume={0.3} len={34} fade={10} /> : null}
          <Sfx name="asmr-pop" at={Math.max(0, x.f)} volume={0.4} />
          <Haptic kind="light" at={Math.max(0, x.f)} volume={0.36} />
        </React.Fragment>
      ))}
    </>
  );
};
