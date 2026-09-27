// src/scenes/film/_template.tsx: how to write a FILM SCENE, and a small working one to start from.
// (Not registered: a leading "_" is never a film. Copy it to <Name>.tsx; tools/ci/filmlint.mjs checks it.)
//
// WHAT IT IS. Every film designs at least one NEW visual for its key moment (the owner, 2026-09-27: "every film must
// think differently and try to make a good NEW graphic"): a new metaphor, camera and motion, refined and premium,
// thought afresh each time. It lives in src/scenes/film/<Name>.tsx, <Name> = the film's id in PascalCase
// (v26-night-scan -> V26NightScan), and exports ONE component of that name. The spec uses it like any scene:
//   "scene": {"type": "Film", "name": "V26NightScan", "at": 2, "label": "..."}   (your own props, any you like)
// The props arrive as `p` (the whole scene object), the timing as `ctx` (SceneCtx: dur, index, cues = the frames
// where the scene's subtitle chunks start, beats, speech). cueFrame(ctx, p.at) turns a chunk index or "1.2s" into a
// frame. Library scenes and stagings are fine for the other beats.
//
// WHAT IT MAY USE (filmlint refuses every other import, and names that are not exported):
//   react        React (default), Fragment, useMemo, useCallback, useId, memo; types freely
//   remotion     useCurrentFrame, useVideoConfig, interpolate, interpolateColors, spring, Easing, Sequence,
//                AbsoluteFill, Img, staticFile, random (seeded: random('seed-1'))
//   ../common    entrance, lead, cueFrame, CUT_IN, inSpeech, Sfx, Haptic, Land, toneHaptic, vary, TypeSfx,
//                SourceLine, MonoLabel, BrandMark (the scenes' own sound and label helpers), PictureBand (the hard cut)
//   ../../tokens C (the palette of the current look), F (font stacks), L (stage layout), SAFE, STAGE, SPRING, T,
//                rgba, halo, toneBig, toneText, toneLine, isLight, Tone
//   ../../lib/anim    prog, spr (the house springs: 'enter', 'enterXL', 'land', 'tap'), ease, lerp, rand, logZoom, typeOn
//   ../../lib/format  mtav (Georgian -> Mtavruli), capsLatin, fmt
//   ../../lib/layer   TXT       ../../lib/measure  textWidth       ../../types  SceneCtx (type)
//   building blocks: any scene module ("../Wire3D", "../Phone", "../QRCard" ...: render <Wire3D p={{...}} ctx={ctx}/>
//   inside yours when that is clean) and the staging parts ("../staging/qrParts": MODULES, QN, REASONS, ICONS)
//
// THE RULES (filmlint.mjs enforces the first ones; the rest is the house style, CLAUDE.md Style):
// - Pure drawing code. No network, no page APIs, no timers, no clock, no Math.random, no eval, no `this`, no
//   dangerouslySetInnerHTML, no URLs (images only as <Img src={staticFile('screens/...')}/>), no event handlers, no
//   useState/useEffect/useRef/ref. At most 30 KB. Nothing runs on import: a top-level const is a literal, a function,
//   or an object, array or arithmetic of those (Math.* is fine); compute the rest inside the component. Never change
//   C, L or anything imported (C and the tables are frozen: a write throws). A computed key is a number: a[2], a[i]
//   from your own for loop, a[+i] for a map index; for a name write a.b. A style that can load a file (background,
//   mask, filter, content ...) takes literals, numbers and colours (C.x, rgba(), halo(), toneBig()); use
//   backgroundColor for a plain colour you were passed.
// - Frame-driven only: everything is a function of useCurrentFrame() (prog, spr, interpolate). No CSS animation.
// - Text: every element that draws text has className={TXT} (it goes to the clean text layer, off the lens), and
//   Georgian goes through mtav() (Mtavruli at render time); Latin through capsLatin() if caps. No em dash, no "!",
//   no call to action, no store, no "myauto". Measure with textWidth(mtav(s), `600 48px ${F.sans}`) and shrink to fit.
// - Colour: only from C (C.ink, C.ink2, C.rule, C.surface, C.screen, C.shade ...) and toneBig/toneText/toneLine for
//   data (green good for the viewer, red costs the viewer, one saturated colour per shot). It must work on the black
//   film AND on the light paper: never a literal colour, halo() for glows (a whisper on paper).
// - Space: draw in STAGE units, a 1080 x 1920 box. Important things inside x 120..960, y 380..1280 (L.side,
//   L.contentTop, L.contentBottom); below y 1080 (L.lowY) nothing important right of x 850 (L.lowRight). A picture
//   may run down to L.graphicsBottom (1380) and is cut there, or at L.graphicsTop (370), on a clean hard edge: no
//   soft fades at the top or bottom. Nothing above y 345 (the meta bar). Wrap every moving picture in <PictureBand>
//   (outside your camera's scale/translate, as below) so it can never draw over the meta bar or the subtitle, and let
//   nothing linger half-cut on those lines: an object leaves the band whole or stays whole inside it.
// - The look: pollar's, premium: thin precise lines (1.5..2.5 px), generous space, one idea, a camera that moves
//   with intent (a push, a pan, a turn), springs that settle, a picture on the cut frame (start the entrance at
//   entrance(ctx), not at 0). Every subtitle chunk changes something. Never a slideshow of text.
// - Sound: the scene sounds its own events: <Sfx name="asmr-pencil" at={f}/> (names: CLAUDE.md, Sound), one
//   <Haptic kind="light" at={f}/> per visual event, <Land at={f}/> when a value lands. Keep sounds on lead(ctx) or
//   later (a cue before frame 0 is lost), at most about three at once.
// - Check it: node tools/ci/filmlint.mjs <Name>, then node tools/check.mjs <id> and READ out/<id>.sheet.png; refine
//   what looks cheap, crowded or off-centre, and check again.
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
  label?: string; // the word that lands at the end of the line
  at?: number | string; // chunk (or "1.2s") where the traveller sets off
  tone?: Tone;
};

// the path in stage units: a slow S from the upper left to the lower right of the content box
const PATH = 'M 180 520 C 520 520 560 1000 900 1000';
const LEN = 900; // about the path's length, for the draw-on dash

/** A route draws on, a dot travels it on the chunk `at`, and a label lands where it arrives. */
export const FilmTemplate: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx); // the picture is already there on the cut frame
  const base = lead(ctx); // sounds start here or later
  const draw = prog(frame, e, 26, ease.drawOn);
  const go = Math.max(base + 12, cueFrame(ctx, p.at ?? 1));
  const t = prog(frame, go, 34, ease.camera);
  const arrive = go + 34;
  const land = spr(frame, arrive, 'land');
  const tone = p.tone ?? 'up';
  // the dot's position along the cubic (the same control points as PATH)
  const bez = (a: number, b: number, c: number, d: number, u: number) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
  const x = bez(180, 520, 560, 900, t);
  const y = bez(520, 520, 1000, 1000, t);
  // a slow camera push over the whole scene (a picture never stands still)
  const push = lerp(1, 1.06, prog(frame, e, ctx.dur, ease.camera));
  const label = mtav(p.label ?? 'მივიდა');
  const size = Math.min(64, Math.floor((64 * 520) / Math.max(1, textWidth(label, `600 64px ${F.sans}`))));

  return (
    // the band cuts the picture on hard lines at L.graphicsTop / L.graphicsBottom; the camera moves inside it
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={PATH} fill="none" stroke={C.rule} strokeWidth={2} strokeDasharray={LEN} strokeDashoffset={LEN * (1 - draw)} strokeLinecap="round" />
          <path d={PATH} fill="none" stroke={toneBig(tone)} strokeWidth={2.4} strokeDasharray={LEN} strokeDashoffset={LEN * (1 - t)} strokeLinecap="round" />
          <circle cx={180} cy={520} r={7} fill={C.ink} opacity={draw} />
          {frame >= go ? <circle cx={x} cy={y} r={11} fill={toneBig(tone)} /> : null}
          <circle cx={900} cy={1000} r={18 + 26 * land} fill="none" stroke={rgba(C.ink, 0.5)} strokeWidth={1.5} opacity={frame >= arrive ? 1 - land * 0.6 : 0} />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 120, width: 780, top: 1060, textAlign: 'right', fontFamily: F.sans, fontWeight: 600, fontSize: size, color: C.ink, opacity: land, transform: `translateY(${(1 - land) * 18}px)`}}>
          {label}
        </div>
      </div>
      <Sfx name="asmr-pencil-short" at={base + 2} volume={0.4} />
      <Sfx name="asmr-air-long" at={go} volume={0.3} />
      <Sfx name="asmr-pop" at={arrive} volume={0.45} />
      <Haptic kind="light" at={arrive} />
    </PictureBand>
  );
};
