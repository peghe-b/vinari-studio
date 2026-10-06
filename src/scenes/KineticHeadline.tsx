import React from 'react';
import {useCurrentFrame} from 'remotion';
import {prog} from '../lib/anim';
import {usePictureView} from '../lib/bleed';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {PhotoPlate, PhotoCredits, photoCredit} from '../lib/photo';
import {lineWidth, punchFrames, TextFx, Words} from '../lib/textfx';
import {C, F, L, rgba, Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, lead, SourceLine, TypeSfx} from './common';

// ---- KineticHeadline: the punchy line (2026-10-06, the stories category; any film may use it) ---------------------------
// 1 to 4 lines of big condensed Mtavruli that MOVE: a hook, a takeaway, a twist said out loud. "*word*" marks a punch word
// (at most 2 a line, 3 a scene): it pops, morphs to bold, takes its tone and kicks the camera (lib/textfx.tsx).
// Props:
//   lines*    [string | {text, at, tone, size, mono, strike, outline}]: `at` a chunk or "1.2s" (the line waits for it),
//             `size` a factor of the block's size, `mono` a small mono line, `strike` (strike staging) when line 1 is
//             struck, `outline` the words outlined until their punch fills them
//   staging   "mask" (default: words rise out of masks) | "slam" (words land from big, the punchline) | "stack" (a small
//             mono line, then a huge one, sliding in from alternate sides) | "strike" (line 1 is the belief and gets
//             struck, line 2 slams in) | "type" (line 1 typed in mono like a case file, line 2 big)
//   size      120 (stage px); the block shrinks so its widest line fits 800 px (760 over a photo)
//   align     "left" (default) | "center";  y: the block's centre (L.contentMid)
//   kicker    a small mono line above (a year and a place), typed
//   bg        {src, dim}: a real photo behind (public/photos, graded mono, veiled by `dim` 0.55), credited when needed
//   source    the mono source line
// Camera: free (the whole scene, at most 1.2 %); kicks on the punch words. Keep it short: one thought, read in a second.

type At = number | string;
export type KHLine = string | {text: string; at?: At; tone?: Tone; size?: number; mono?: boolean; strike?: At; outline?: boolean};
type P = {
  lines: KHLine[];
  staging?: 'mask' | 'slam' | 'stack' | 'strike' | 'type';
  size?: number;
  align?: 'left' | 'center';
  y?: number;
  kicker?: string;
  bg?: {src: string; dim?: number};
  source?: string;
};

export type Row = {text: string; fx: TextFx; start: number; size: number; mono: boolean; tone?: Tone; punchTone?: Tone; outline?: boolean; strikeAt?: number; side: 1 | -1; weight: number};
type LineN = {text: string; at?: At; tone?: Tone; size?: number; mono?: boolean; strike?: At; outline?: boolean};
export const normLines = (lines: KHLine[] | undefined): LineN[] => (lines ?? []).map((l) => (typeof l === 'string' ? {text: l} : l)).filter((l) => typeof l?.text === 'string' && l.text.trim() !== '');

/** The rows of a headline block: their motion, first frame and size, shrunk so the widest fits `maxW`. Pure (the
 *  camera's kicks use the same frames: lib/kicks.ts). `first` is the block's first frame. */
export const headlineRows = (lines: LineN[], ctx: SceneCtx, staging: string, want: number, maxW: number, first: number, fxAll?: TextFx): Row[] => {
  const startOf = (l: LineN, i: number, gap = 6) => Math.max(first + i * gap, l.at !== undefined ? cueFrame(ctx, l.at) : first + i * gap);
  const rows: Row[] = lines.map((l, i) => {
    const r: Row = {text: l.text, fx: fxAll ?? 'mask', start: startOf(l, i), size: want * (l.size ?? 1), mono: Boolean(l.mono), tone: l.tone, outline: l.outline, side: i % 2 ? -1 : 1, weight: 600};
    if (fxAll) return r;
    if (staging === 'slam') r.fx = 'slam';
    else if (staging === 'stack') {
      r.fx = 'stack';
      if (i % 2 === 0) {
        r.mono = true;
        r.size = Math.max(30, want * 0.34) * (l.size ?? 1);
        r.weight = 400;
      } else r.size = Math.min(180, want * 1.5) * (l.size ?? 1);
    } else if (staging === 'type' && i === 0) {
      r.fx = 'type';
      r.mono = true;
      r.size = Math.max(30, want * 0.36);
      r.weight = 400;
    } else if (staging === 'strike' && i === 1) r.fx = 'slam';
    return r;
  });
  if (staging === 'strike' && rows.length >= 2) {
    const l0 = lines[0];
    const at = l0.strike !== undefined ? cueFrame(ctx, l0.strike) : lines[1].at !== undefined ? cueFrame(ctx, lines[1].at) : first + 26;
    rows[0].strikeAt = Math.max(rows[0].start + 10, at);
    rows[1].start = rows[0].strikeAt + 4;
  }
  if (staging === 'type' && rows.length >= 2) {
    const typed = rows[0].start + Math.ceil(Array.from(rows[0].text).length / 1.4);
    for (let i = 1; i < rows.length; i++) rows[i].start = Math.max(rows[i].start, typed + 4 + (i - 1) * 6);
  }
  // shrink the whole block so its widest row fits
  const widest = Math.max(1, ...rows.map((r) => (r.fx === 'type' ? Array.from(mtav(r.text)).length * r.size * 0.62 : lineWidth(r.text, r.size, r.weight, r.mono))));
  const k = widest > maxW ? maxW / widest : 1;
  return rows.map((r) => ({...r, size: Math.floor(r.size * k)}));
};

/** The rows set in a block centred on y (stage px), left at x or centred on 540. */
export const HeadlineBlock: React.FC<{rows: Row[]; y: number; align: 'left' | 'center'; x?: number; sound?: boolean}> = ({rows, y, align, x = 140, sound = true}) => {
  const heights = rows.map((r) => r.size * (r.mono ? 1.5 : 1.12));
  const total = heights.reduce((a, b) => a + b, 0);
  let top = y - total / 2;
  return (
    <>
      {rows.map((r, i) => {
        const t = top;
        top += heights[i];
        return (
          <div key={i} style={{position: 'absolute', top: t, left: align === 'left' ? x : 0, right: align === 'left' ? undefined : 0, textAlign: align, whiteSpace: 'nowrap'}}>
            <Words text={r.text} at={r.start} fx={r.fx} size={r.size} weight={r.weight} mono={r.mono} tone={r.tone} punchTone={r.punchTone} color={r.mono ? C.ink2 : undefined} outline={r.outline} strikeAt={r.strikeAt} side={r.side} seed={i + 1} sound={sound} ls={r.mono ? 0.04 : -0.01} />
          </div>
        );
      })}
    </>
  );
};

const MAX_W = 800;
const MAX_W_BG = 760;

/** The scene's rows (KineticHeadline's props), for the scene and for its camera kicks. As the hook of a punch opening
 *  (cold-punch, question-slam: src/lib/fx.ts), frame 0 is composed and the first punch still lands after it (by frame
 *  6): a later line that carries a punch waits for it. */
export const khRows = (p: P, ctx: SceneCtx) => {
  const rows = headlineRows(normLines(p.lines), ctx, p.staging ?? 'mask', p.size ?? 120, p.bg ? MAX_W_BG : MAX_W, entrance(ctx));
  if (ctx.index !== 0 || !ctx.open || ctx.open.lead <= -45) return rows;
  let shift = 0;
  return rows.map((r, i) => {
    const first = r.fx === 'type' ? [] : punchFrames(r.text, r.start + shift, r.fx);
    if (i > 0 && first.length && first[0] < 6) shift = Math.max(shift, 6 - first[0]);
    return {...r, start: r.start + (i > 0 ? shift : 0)};
  });
};
/** The frames the camera kicks (the punch words). */
export const khKicks = (p: P, ctx: SceneCtx) => khRows(p, ctx).flatMap((r) => (r.fx === 'type' ? [] : punchFrames(r.text, r.start, r.fx)));

export const KineticHeadline: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const rows = khRows(p, ctx);
  const align = p.align ?? 'left';
  const y = p.y ?? L.contentMid;
  const heights = rows.map((r) => r.size * (r.mono ? 1.5 : 1.12));
  const top = y - heights.reduce((a, b) => a + b, 0) / 2;
  const kicker = p.kicker ? mtav(capsLatin(p.kicker)) : '';
  const dim = Math.max(0, Math.min(0.9, p.bg?.dim ?? 0.55));
  // a `bg` photo fills the whole frame (full bleed, the owner 2026-10-06); its credit keeps its place over the subtitle
  const view = usePictureView();
  const t = Math.min(1, Math.max(0, (frame - e) / Math.max(1, ctx.dur - e)));
  return (
    <>
      {p.bg?.src ? (
        <>
          <PhotoPlate src={p.bg.src} id={`vn-kh-${ctx.index}`} view={view} z={1 + 0.06 * t} u={0.5} v={0.45} grade="mono" contrast={1.25} grain={0.5} vignette={0.45} />
          <div style={{position: 'absolute', left: view.x, top: view.y, width: view.w, height: view.h, backgroundColor: rgba(C.bg, dim)}} />
          <PhotoCredits lines={[photoCredit(p.bg.src)]} bottom={L.graphicsBottom - 10} />
        </>
      ) : null}
      {kicker ? (
        <div className={TXT} style={{position: 'absolute', top: top - 64, left: align === 'left' ? 140 : 0, right: align === 'left' ? undefined : 0, textAlign: align, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.06em', color: C.ink2, whiteSpace: 'nowrap', opacity: prog(frame, e, 4)}}>
          {kicker.slice(0, Math.max(0, Math.floor((frame - e) * 1.4)))}
          <TypeSfx text={kicker} at={Math.max(base, e)} cpf={1.4} volume={0.24} rolls={1} />
        </div>
      ) : null}
      <HeadlineBlock rows={rows} y={y} align={align} />
      <SourceLine text={p.source} at={base + 24} />
    </>
  );
};
