import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import {useCamera} from '../lib/camera';
import {PhotoCredits, photoCredit, PhotoPlate} from '../lib/photo';
import {punchFrames, TextFx} from '../lib/textfx';
import {C, isLight, L, rgba, Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from './common';
import {headlineRows, HeadlineBlock, KHLine, normLines} from './KineticHeadline';

// ---- Twist: the plot twist (2026-10-06, the stories category) ---------------------------------------------------------
// What the viewer believes (the setup: lines and or a photo), then at `at` the twist lands HARD.
//   crash (default)  the setup's camera accelerates and a veil rises for 10 frames, it holds one frame, then a white flash
//                    (an ink dip on paper), a lens glitch and a camera kick: the reveal slams in. The flash and the glitch
//                    are planned by tools/ci/fx.mjs (they count toward the film's caps and tools/flicker.py skips them).
//   whip             setup and reveal side by side; at `at` the camera whips from one to the other
//   glitch           no flash: a strong lens glitch and the reveal DECODES letter by letter
// A reveal of 1 to 3 words (one or two lines) is the film's key frame, the one his TikTok sound hits on: it is set
// centred at 360 / 300 / 260 px (one / two / three words; a long word still shrinks to 940 px), a longer one stays the
// 120 px left block. The reveal photo keeps its picture: a light veil on paper (0.14) with a soft field glow behind
// the words only, 0.4 on the dark film.
// Props: reveal* (KineticHeadline lines, "*punch*" allowed), setup {lines, src}, at (chunk or "1.2s"; default chunk 1,
// else "0.5s"), src (a photo revealed with the words), tone, staging. Without a setup the previous scene is the setup:
// the planner crash-cuts INTO this scene and the reveal lands right after the cut. One Twist (or crash) a film.

type At = number | string;
type P = {
  setup?: {lines?: KHLine[]; src?: string};
  reveal: KHLine[];
  at?: At;
  src?: string;
  tone?: Tone;
  staging?: 'crash' | 'whip' | 'glitch';
};

/** The reveal's frame T (the planner reads the same rule: tools/ci/fx.mjs twistAt). */
export const twistAt = (p: P, ctx: SceneCtx) => {
  const e = entrance(ctx);
  if (!p.setup) return Math.max(2, e + 4);
  if (p.at !== undefined) return Math.max(e + 16, cueFrame(ctx, p.at));
  return Math.max(e + 16, ctx.cues.length > 1 ? cueFrame(ctx, 1) : 15);
};
const revealFx = (st: string): TextFx => (st === 'glitch' ? 'decode' : 'slam');
/** The reveal's words (punch marks and spaces aside): a short reveal of 1 to 3 words is THE frame of the film, the one
 *  the sound hits on, so it fills the picture centred (2026-10-06: a 120 px "−1" at the left edge read as a footnote). */
const revealWords = (p: P) =>
  normLines(p.reveal)
    .flatMap((l) => String(l.text).replace(/\*/g, ' ').trim().split(/\s+/))
    .filter(Boolean).length;
export const revealShort = (p: P) => {
  const n = revealWords(p);
  return n >= 1 && n <= 3 && normLines(p.reveal).length <= 2;
};
const revealRows = (p: P, ctx: SceneCtx, T: number) => {
  const st = p.staging ?? 'crash';
  const n = revealWords(p);
  // short: 360 px for one word, 300 for two, 260 for three (the width rule still shrinks a long word to 940 px)
  const short = revealShort(p);
  const want = short ? (n === 1 ? 360 : n === 2 ? 300 : 260) : 120;
  // the scene's tone colours the punch words only ("*no.*"); a line's own tone colours its whole line
  const rows = headlineRows(normLines(p.reveal), ctx, 'slam', want, short ? 940 : 800, T + 1, revealFx(st));
  return rows.map((r, i) => ({...r, start: T + 1 + i * 3, punchTone: p.tone}));
};
export const twKicks = (p: P, ctx: SceneCtx) => {
  const T = twistAt(p, ctx);
  return [T, ...revealRows(p, ctx, T).flatMap((r) => punchFrames(r.text, r.start, r.fx))];
};

export const Twist: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const st = p.staging ?? 'crash';
  const T = twistAt(p, ctx);
  const cam = useCamera(1, {move: false});
  const view = {x: 20, y: L.graphicsTop, w: 1040, h: L.graphicsBottom - L.graphicsTop};
  const setupRows = p.setup?.lines?.length ? headlineRows(normLines(p.setup.lines), ctx, 'mask', 110, 800, e) : [];
  const rows = revealRows(p, ctx, T);
  const short = revealShort(p);
  // the photo stays a photo: on paper a light veil (a 50 % paper veil read as flat grey), a soft field glow only behind
  // the words; the dark film keeps a deeper veil (white words)
  const light = isLight();
  const setupVeil = light ? 0.34 : 0.5;
  const revealVeil = light ? 0.14 : 0.4;
  const before = frame < T;
  // crash: the setup accelerates into the hit (an extra push on whipIn) under a rising veil, then holds one frame
  const accel = st === 'crash' ? prog(Math.min(frame, T - 1), T - 10, 9, ease.whipIn) : 0;
  const veil = st === 'crash' && before ? 0.25 * accel : 0;
  const t = Math.min(1, Math.max(0, (frame - e) / Math.max(1, ctx.dur - e)));
  // whip: both planes side by side, the camera travels from one to the other in 8 frames
  const w = st === 'whip' ? prog(frame, T - 4, 8, ease.snap) : 0;
  const whipBlur = st === 'whip' ? 36 * Math.sin(Math.PI * Math.min(1, Math.max(0, (frame - (T - 4)) / 8))) : 0;
  const setupStyle: React.CSSProperties =
    st === 'whip'
      ? {transform: `translateX(${(-1080 * w).toFixed(1)}px)`, filter: whipBlur > 0.5 ? 'url(#vn-whip)' : undefined}
      : {transform: `scale(${(1 + 0.015 * accel).toFixed(4)})`, transformOrigin: `540px ${L.contentMid}px`};
  const revealStyle: React.CSSProperties = st === 'whip' ? {transform: `translateX(${(1080 * (1 - w)).toFixed(1)}px)`, filter: whipBlur > 0.5 ? 'url(#vn-whip)' : undefined} : {};
  const showSetup = st === 'whip' ? w < 1 : before;
  const showReveal = st === 'whip' ? w > 0 : !before;
  const credits = [p.setup?.src && showSetup ? photoCredit(p.setup.src) : '', p.src && showReveal ? photoCredit(p.src) : ''];
  return (
    <>
      {showSetup ? (
        <div style={{position: 'absolute', inset: 0, ...setupStyle}}>
          {p.setup?.src ? <PhotoPlate src={p.setup.src} id={`vn-tw-${ctx.index}-a`} view={view} z={1 + 0.05 * t} u={0.5} v={0.45} grade="archival" vignette={0.45} camera={cam} /> : null}
          {p.setup?.src ? <div style={{position: 'absolute', left: view.x, top: view.y, width: view.w, height: view.h, backgroundColor: rgba(C.bg, setupVeil)}} /> : null}
          {setupRows.length ? <HeadlineBlock rows={setupRows} y={L.contentMid} align="left" /> : null}
          {veil > 0 ? <div style={{position: 'absolute', inset: 0, backgroundColor: rgba(C.bg, veil)}} /> : null}
        </div>
      ) : null}
      {showReveal ? (
        <div style={{position: 'absolute', inset: 0, ...revealStyle}}>
          {p.src ? <PhotoPlate src={p.src} id={`vn-tw-${ctx.index}-b`} view={view} z={1.08 - 0.06 * prog(frame, T, 30, ease.whipOut)} u={0.5} v={0.45} grade="archival" vignette={0.45} camera={cam} /> : null}
          {p.src ? (
            <div
              style={{
                position: 'absolute',
                left: view.x,
                top: view.y,
                width: view.w,
                height: view.h,
                backgroundColor: rgba(C.bg, revealVeil),
                // the glow behind the words: the field colour at the centre, gone by the photo's edges
                backgroundImage: `radial-gradient(ellipse 62% 34% at 50% ${(((L.contentMid - view.y) / view.h) * 100).toFixed(1)}%, ${rgba(C.bg, light ? 0.62 : 0.35)} 0%, ${rgba(C.bg, 0)} 100%)`,
              }}
            />
          ) : null}
          <HeadlineBlock rows={rows} y={L.contentMid} align={short ? 'center' : 'left'} sound={false} />
        </div>
      ) : null}
      <PhotoCredits lines={credits} bottom={view.y + view.h - 4} />
      {/* events: the swell into the hit, the hit (whoomp, rigid haptic), the reveal lands; a glitch twist ticks */}
      {st === 'crash' && p.setup && T - 10 >= base ? <Sfx name="asmr-swell" at={Math.max(0, T - 10)} volume={0.3} /> : null}
      {/* without a setup the crash cut into this scene already sounds the hit (Promo, the transition's own cue) */}
      {p.setup && st !== 'glitch' && T - 1 >= 0 ? <Sfx name="asmr-whoomp" at={T - 1} volume={0.45} /> : null}
      {st === 'glitch' && T >= 0 ? <Sfx name="asmr-ui-tick-roll" at={T} volume={0.35} /> : null}
      {p.setup ? <Haptic kind="rigid" at={Math.max(0, T)} volume={0.38} /> : null}
      <Land at={T + 4} volume={0.5} />
    </>
  );
};
