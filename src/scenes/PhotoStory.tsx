import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {useCamera} from '../lib/camera';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {Grade, kenBurns, KBMove, PhotoCredits, photoCredit, photoInfo, PhotoPlate, Rect} from '../lib/photo';
import {punchFrames, Words} from '../lib/textfx';
import {C, F, isLight, L, rgba, THEME, Tone, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, lead, Sfx, SourceLine} from './common';
import {headlineRows, HeadlineBlock, KHLine, normLines} from './KineticHeadline';

// ---- PhotoStory: a real photo, alive (2026-10-06, the stories category: real people and history) -------------------
// A licensed archival or modern photo (public/photos, catalogue photos.json with its licence and credit: lib/photo.tsx),
// graded into the film's look and MOVING: an eased Ken Burns already running on the cut, the camera's kicks and a
// handheld breath on top, grain, a vignette on the dark film, a neutral light leak, a name strip, kinetic lines, and
// the licence's credit, always, for as long as the photo is on screen (lower left, the clean text layer).
// Props (src required):
//   src        a file of public/photos without .jpg (its catalogue line must carry the licence fields for an archival
//              photo; build-index refuses one without)
//   staging    "bleed" (default: edge to edge between the meta bar and the subtitle, hard edges) | "print" (the photo
//              as a physical print dropping onto the field, `more` prints landing on it: the evidence board) |
//              "window" (a 4:5 plate with a hairline) | "depth" (bleed with a two-plane parallax split, only with a
//              vetted `subject` outline in the catalogue; otherwise bleed)
//   move       push (default) | pull | pan-left | pan-right | pan-up | pan-down;  amount: 0.12 (push, max 0.25), pan 0.12
//   center     {x, y} photo fractions: the push target (and a match cut's point)
//   grade      "mono" (default: the film's duotone) | "archival" (mono, gate weave, heavier grain) | "color" (modern
//              hero shots only);  contrast 1.25;  grain 0.55;  vignette 0.45 on the dark film (0 on paper)
//   leak       a chunk or "1.2s": a neutral light passes over the photo there (the dark film only)
//   who        {name, note, at}: the name strip (a person or a car: "ბერტა ბენცი", note "1888 · მანჰაიმი")
//   lines      kinetic lines over the lower part (KineticHeadline's rules, masked words, "*punch*")
//   ring       {x, y, r, at, tone}: a ring drawn around a point of the photo (fractions; r a share of the view's width)
//   print      {rot, at}: the print's tilt (-3..3, default -2) and the drop's cue;  more: [{src, at, rot}] (up to 2)
//   parallax   depth: 0..1 (0.6);  shutter: a camera click on the print's first drop;  source: the mono source line
// Camera: band (inside the photo's window: the window's edges never move); kicks on the name and the punch words.

type At = number | string;
type P = {
  src: string;
  staging?: 'bleed' | 'print' | 'window' | 'depth';
  move?: KBMove;
  amount?: number;
  center?: {x?: number; y?: number};
  grade?: Grade;
  contrast?: number;
  grain?: number;
  vignette?: number;
  leak?: At | false;
  who?: {name: string; note?: string; at?: At};
  lines?: KHLine[];
  ring?: {x: number; y: number; r?: number; at?: At; tone?: Tone};
  print?: {rot?: number; at?: At};
  more?: {src: string; at: At; rot?: number}[];
  parallax?: number;
  shutter?: boolean;
  source?: string;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const BAND: Rect = {x: 20, y: L.graphicsTop, w: 1040, h: L.graphicsBottom - L.graphicsTop};

/** The view (stage px) of a staging. */
const viewOf = (p: P): Rect => {
  const st = p.staging ?? 'bleed';
  if (st === 'window') return {x: 540 - 320, y: L.contentMid - 400, w: 640, h: 800};
  if (st === 'print') {
    const i = photoInfo(p.src);
    const ar = clamp(i ? i.w / i.h : 1.4, 0.62, 1.6);
    const w = ar >= 1 ? 760 : Math.min(760, 820 * ar);
    const h = w / ar;
    return {x: 540 - w / 2, y: L.contentMid - 40 - h / 2, w, h};
  }
  return BAND;
};

/** When the name strip and the lines land (the scene and its camera kicks agree). */
export const psTimes = (p: P, ctx: SceneCtx) => {
  const e = entrance(ctx);
  const who = p.who ? Math.max(e + 6, p.who.at !== undefined ? cueFrame(ctx, p.who.at) : e + 16) : null;
  const rows = p.lines?.length ? headlineRows(normLines(p.lines), ctx, 'mask', 92, 760, Math.max(e + 4, (who ?? e) + 10)) : [];
  return {who, rows};
};
export const psKicks = (p: P, ctx: SceneCtx) => {
  const {who, rows} = psTimes(p, ctx);
  return [...(who !== null ? [who] : []), ...rows.flatMap((r) => punchFrames(r.text, r.start, r.fx))];
};

export const PhotoStory: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const light = isLight();
  const staging = p.staging ?? 'bleed';
  const info = photoInfo(p.src);
  const subject = info?.subject && info.subject.length >= 6 ? info.subject : null;
  const st = staging === 'depth' && !subject ? 'bleed' : staging;
  const view = viewOf({...p, staging: st});
  const img = info ?? {w: view.w, h: view.h};
  const t = clamp((frame - e) / Math.max(1, ctx.dur - e), 0, 1.2);
  const pp = t >= 1 ? 1 + (t - 1) * 0.154 : ease.drift(t);
  const move: KBMove = p.move ?? (st === 'window' ? 'pan-right' : 'push');
  const pan = move.startsWith('pan');
  const amount = clamp(p.amount ?? (st === 'print' ? 0.06 : 0.12), 0, pan ? 0.2 : 0.25);
  const center = {x: clamp(p.center?.x ?? 0.5, 0, 1), y: clamp(p.center?.y ?? 0.45, 0, 1)};
  const grade: Grade = p.grade ?? 'mono';
  const contrast = clamp(p.contrast ?? 1.25, 0, 2);
  const grain = clamp(p.grain ?? 0.55, 0, 1);
  const vignette = light ? 0 : clamp(p.vignette ?? 0.45, 0, 0.9);
  const leakAt = p.leak === undefined || p.leak === false ? null : cueFrame(ctx, p.leak);
  const cam = useCamera(1, {move: st === 'print'}); // a print moves with the camera; a bleed's Ken Burns is its move
  const {who: whoAt, rows} = psTimes(p, ctx);
  const id = `vn-ps-${ctx.index}`;
  const credits = [photoCredit(p.src), ...(st === 'print' ? (p.more ?? []).slice(0, 2).map((m) => photoCredit(m.src)) : [])];

  // ---- the picture ----
  let picture: React.ReactNode;
  if (st === 'print') {
    const dropAt = p.print?.at !== undefined ? cueFrame(ctx, p.print.at) : e;
    const rot = clamp(p.print?.rot ?? -2, -3, 3);
    const prints = [{src: p.src, at: dropAt, rot, dx: 0, dy: 0}, ...(p.more ?? []).slice(0, 2).map((m, i) => ({src: m.src, at: cueFrame(ctx, m.at), rot: clamp(m.rot ?? (i ? 2.5 : 3), -4, 4), dx: i ? -50 : 60, dy: i ? 150 : 80}))];
    picture = (
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
        <div style={{position: 'absolute', inset: 0, ...cam}}>
          {prints.map((pr, i) => {
            const k = spr(frame, pr.at, 'enterXL');
            if (frame < pr.at) return null;
            const pi = photoInfo(pr.src);
            const ar = clamp(pi ? pi.w / pi.h : 1.4, 0.62, 1.6);
            const w = i === 0 ? view.w : view.w * 0.62;
            const h = w / ar;
            const x = (i === 0 ? view.x : 540 - w / 2) + pr.dx;
            const y = (i === 0 ? view.y : L.contentMid - h / 2) + pr.dy;
            const border = 18;
            const tf = `translateY(${((1 - k) * -40).toFixed(2)}px) rotate(${(pr.rot + 3 * (1 - k)).toFixed(3)}deg) scale(${(1.12 - 0.12 * k).toFixed(4)})`;
            const pv: Rect = {x: x + border, y: y + border, w: w - 2 * border, h: h - 2 * border};
            const z = 1 + 0.06 * pp;
            return (
              <div key={i} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: tf, transformOrigin: `${x + w / 2}px ${y + h / 2}px`, opacity: Math.min(1, k * 3)}}>
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    backgroundColor: light ? C.surface : C.ink,
                    boxShadow: `0 24px 60px ${rgba(C.shade, 0.5 * THEME.shadowK)}${light ? `, inset 0 0 0 1px ${C.stripEdge}` : ''}`,
                  }}
                />
                <PhotoPlate src={pr.src} id={`${id}-${i}`} view={pv} z={z} u={i === 0 ? center.x : 0.5} v={i === 0 ? center.y : 0.45} grade={grade} contrast={contrast} grain={grain * 0.8} weave={grade === 'archival'} />
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (st === 'depth' && subject) {
    const par = clamp(0.6, 0, 1);
    const A = amount;
    const bgRect = kenBurns(move, view, img, A * 0.6, pp, center);
    const cx = subject.reduce((s, q) => s + q[0], 0) / subject.length;
    const cy = subject.reduce((s, q) => s + q[1], 0) / subject.length;
    const P0 = {x: bgRect.x + cx * bgRect.w, y: bgRect.y + cy * bgRect.h};
    const f = (1 + A * pp * (0.6 + (p.parallax ?? par))) / (1 + A * pp * 0.6);
    const fgRect = {x: P0.x - cx * bgRect.w * f, y: P0.y - cy * bgRect.h * f, w: bgRect.w * f, h: bgRect.h * f};
    const poly = `polygon(${subject.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(', ')})`;
    picture = (
      <>
        <PhotoPlate src={p.src} id={`${id}-b`} view={view} z={1} u={0} v={0} rect={bgRect} grade={grade} contrast={contrast} dark={0.85} grain={grain} vignette={vignette} leak={leakAt} camera={cam} weave={grade === 'archival'} />
        <PhotoPlate src={p.src} id={`${id}-f`} view={view} z={1} u={0} v={0} rect={fgRect} grade={grade} contrast={contrast} grain={0} camera={cam} clip={poly} weave={grade === 'archival'} />
        {rows.length ? <div style={{position: 'absolute', left: view.x, top: view.y + view.h * 0.48, width: view.w, height: view.h * 0.52, background: `linear-gradient(180deg, ${rgba(C.bg, 0)} 0%, ${rgba(C.bg, light ? 0.7 : 0.66)} 62%)`}} /> : null}
      </>
    );
  } else {
    const rect = kenBurns(move, view, img, amount, pp, center);
    picture = (
      <PhotoPlate src={p.src} id={id} view={view} z={1} u={0} v={0} rect={rect} grade={grade} contrast={contrast} grain={grain} vignette={st === 'window' ? vignette * 0.6 : vignette} leak={leakAt} camera={cam} weave={grade === 'archival'} edge={st === 'window'}>
        {/* a scrim under the kinetic lines, inside the picture (never a fade at its edge) */}
        {rows.length ? <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', background: `linear-gradient(180deg, ${rgba(C.bg, 0)} 0%, ${rgba(C.bg, light ? 0.7 : 0.66)} 62%)`}} /> : null}
      </PhotoPlate>
    );
  }

  // ---- the ring (mark-subject) ----
  let ring: React.ReactNode = null;
  if (p.ring && st !== 'print') {
    const rect = kenBurns(move, view, img, amount, pp, center);
    // the hook's ring is its first event (frame 4, mark-subject); a later scene draws it once the cut has landed
    const at = p.ring.at !== undefined ? Math.max(ctx.index === 0 ? 4 : e + 6, cueFrame(ctx, p.ring.at)) : ctx.index === 0 ? 4 : e + 14;
    const k = prog(frame, at, 12, ease.drawOn);
    const rr = clamp(p.ring.r ?? 0.14, 0.04, 0.4) * view.w;
    const x = rect.x + p.ring.x * rect.w;
    const y = rect.y + p.ring.y * rect.h;
    const len = 2 * Math.PI * rr;
    ring = (
      <div style={{position: 'absolute', left: view.x, top: view.y, width: view.w, height: view.h, overflow: 'hidden'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', left: -view.x, top: -view.y, ...cam}}>
          <circle cx={x} cy={y} r={rr} fill="none" stroke={toneLine(p.ring.tone ?? 'neutral')} strokeWidth={3} strokeDasharray={len} strokeDashoffset={len * (1 - k)} transform={`rotate(-80 ${x} ${y})`} strokeLinecap="round" />
        </svg>
        <Sfx name="asmr-pencil-short" at={Math.max(0, at)} volume={0.4} />
      </div>
    );
  }

  // ---- the name strip ----
  let whoNode: React.ReactNode = null;
  if (p.who && whoAt !== null) {
    const name = mtav(capsLatin(p.who.name));
    const nameSize = 52;
    const nameW = Math.min(780, textWidth(name, `600 ${nameSize}px ${F.sans}`, -0.01 * nameSize) + 2 * 18);
    const strip = prog(frame, whoAt, 8, ease.whipOut);
    const bottom = st === 'bleed' || st === 'depth' ? view.y + view.h : Math.min(L.graphicsBottom, view.y + view.h + 150);
    const top = bottom - 170;
    const note = p.who.note ? mtav(capsLatin(p.who.note)) : '';
    whoNode = (
      <>
        <div style={{position: 'absolute', left: L.side - 6, top, width: nameW, height: nameSize * 1.36, backgroundColor: C.strip, boxShadow: `inset 0 0 0 1.5px ${C.stripEdge}`, transformOrigin: 'left center', transform: `scaleX(${strip.toFixed(4)})`}} />
        <div style={{position: 'absolute', left: L.side + 12, top: top + 4, whiteSpace: 'nowrap'}}>
          <Words text={p.who.name} at={whoAt + 3} fx="mask" size={nameSize} color={C.onStrip} sound={false} />
        </div>
        {note ? (
          <div className={TXT} style={{position: 'absolute', left: L.side - 6, top: top + nameSize * 1.36 + 8, padding: '4px 10px', backgroundColor: C.bg, color: C.ink2, fontFamily: F.mono, fontSize: 26, letterSpacing: '0.05em', whiteSpace: 'nowrap', opacity: prog(frame, whoAt + 8, 6)}}>
            {note.slice(0, Math.max(0, Math.floor((frame - whoAt - 8) * 1.6)))}
          </div>
        ) : null}
        <Sfx name="asmr-strike" at={Math.max(0, whoAt)} volume={0.4} len={11} />
        <Haptic kind="light" at={Math.max(0, whoAt + 4)} volume={0.34} />
      </>
    );
  }

  // ---- the lines, the credit ----
  const linesY = (st === 'bleed' || st === 'depth' ? view.y + view.h : L.contentBottom) - (p.who ? 330 : 210) - (rows.length - 1) * 50;
  const creditBottom = st === 'bleed' || st === 'depth' ? view.y + view.h - 4 : Math.min(L.graphicsBottom - 4, view.y + view.h + 44);
  const dropAt = st === 'print' ? (p.print?.at !== undefined ? cueFrame(ctx, p.print.at) : e) : null;
  return (
    <>
      {picture}
      {ring}
      {rows.length ? <HeadlineBlock rows={rows} y={linesY} align="left" /> : null}
      {whoNode}
      <PhotoCredits lines={credits} bottom={creditBottom} />
      <SourceLine text={p.source} at={base + 24} y={creditBottom - 70} />
      {/* events: a print drops (a card placed, a soft haptic; the camera click on the first one when asked), the leak's swell */}
      {st === 'print' && dropAt !== null ? (
        <>
          {p.shutter && dropAt >= 0 ? <Sfx name="asmr-camera" at={dropAt} volume={0.35} /> : null}
          {dropAt + 6 >= 0 ? <Sfx name="cc0-card-place" at={Math.max(0, dropAt + 6)} volume={0.5} /> : null}
          <Haptic kind="soft" at={Math.max(0, dropAt + 6)} />
          {(p.more ?? []).slice(0, 2).map((m, i) => (
            <React.Fragment key={i}>
              <Sfx name="cc0-card-place" at={Math.max(0, cueFrame(ctx, m.at) + 6)} volume={0.46} />
              <Haptic kind="soft" at={Math.max(0, cueFrame(ctx, m.at) + 6)} volume={0.4} />
            </React.Fragment>
          ))}
        </>
      ) : null}
      {leakAt !== null && !light ? <Sfx name="asmr-swell" at={Math.max(0, leakAt)} volume={0.25} /> : null}
    </>
  );
};
