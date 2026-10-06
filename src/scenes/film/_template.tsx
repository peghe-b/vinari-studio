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
//   ../../lib/camera  CameraLayer (a plane of the picture that moves with the film's camera: depth 0.6 background,
//                     1 subject, 1.3 foreground: one move gives parallax), Hud (labels that never move), useKick (the
//                     camera's impact, 0..1, to flash a weight or a scale with it), kickEnv
//   ../../lib/textfx  Words (one line set word by word: fx "mask" | "slam" | "blur" | "stack" | "strike" | "type" |
//                     "decode"; "*word*" is a punch word that pops, turns bold and takes its tone), lineWidth
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
//   L.contentTop, L.contentBottom); below y 1080 (L.lowY) nothing important right of x 850 (L.lowRight). Wrap every
//   moving picture in <PictureBand> (outside your camera's scale/translate, as below). Two looks:
//   - A PICTURE (a scene, a place, people, a car in its world: the spec's "look": "illustrated", or "bleed": true) is
//     FULL BLEED (the owner, 2026-10-06: "no crop band at the top and bottom"): PictureBand cuts nothing, the meta bar
//     hides, and your picture must fill the WHOLE frame: draw its sky, wall, ground or road from L.bleedTop to
//     L.bleedBottom (stage 16..1872; a plane at depth 1.3 a little past them), never a band that ends on a line inside
//     the frame. The subtitle sits on your picture as it is (no shadow, no box): keep the subject in L.camSafe and the
//     words in the Hud, inside the content box.
//   - A DIAGRAM ("look": "diagram": a part explained, bars, a gauge) keeps the clean field: PictureBand cuts it at
//     L.graphicsTop (370) and L.graphicsBottom (1380) on clean hard edges (no soft fades), nothing above y 345 (the meta
//     bar), and nothing lingers half-cut on those lines: an object leaves the band whole or stays whole inside it.
// - The look: pollar's, premium: thin precise lines (1.5..2.5 px), generous space, one idea, springs that settle, a
//   picture on the cut frame (start the entrance at entrance(ctx), not at 0). Every subtitle chunk changes something.
//   Never a slideshow of text.
// - MOTION (2026-10-06, the owner: "the same trails every time, no camera, no motion"):
//   - Do not add your own scene-wide push or pan: the film's camera rig moves the camera (src/lib/camera.tsx). Put the
//     picture in <PictureBand camera={false}> with two or three <CameraLayer depth>s (a background at 0.6, the subject
//     at 1, a foreground at 1.3) and the labels in a <Hud>, and the one camera move gives depth.
//   - Keep important things inside L.camSafe (stage x 160..920, y 420..1240) or in the Hud.
//   - The overused motifs are draw-on routes, travelling dots, ripple rings, rise-in words and pop-ins: use one at
//     most (tools/ci/visual.mjs warns MOTIF_REPEAT). Think of a different picture for the idea.
//   - Give the key moment an IMPACT: name it `hitAt` in the spec (a chunk or "1.2s"): the camera kicks there; land a
//     punch word on it (<Words text="... *word*" fx="slam" .../>), a sound and one haptic.
// - Sound: the scene sounds its own events: <Sfx name="asmr-pencil" at={f}/> (names: CLAUDE.md, Sound), one
//   <Haptic kind="light" at={f}/> per visual event, <Land at={f}/> when a value lands. Keep sounds on lead(ctx) or
//   later (a cue before frame 0 is lost), at most about three at once.
// - Check it: node tools/ci/filmlint.mjs <Name>, then node tools/check.mjs <id> and READ out/<id>.sheet.png; refine
//   what looks cheap, crowded or off-centre, and check again.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';

type P = {
  hitAt?: number | string; // the key moment (a chunk or "1.2s"): the camera kicks, the gauge slams full, the word punches
  line?: string; // the line that lands on it, "*word*" = the punch
  label?: string; // a small readout in the HUD
  tone?: Tone;
};

// the gauge's ticks, in stage units around its centre (a picture of the idea, not decoration)
const TICKS = 24;
const CX = 540;
const CY = 760;

/** A gauge in depth: the background plane drifts less than the gauge (parallax), the needle slams to full on the key
 *  moment with the camera's kick, and the punch line lands under it. */
export const FilmTemplate: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx); // the picture is already there on the cut frame
  const base = lead(ctx); // sounds start here or later
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick(); // 0..1: the rig's impact on hitAt
  const tone = p.tone ?? 'up';
  const appear = spr(frame, e, 'enterXL');
  // the needle: idles low, then slams to full on the hit (a fast ease out, a small settle)
  const idle = 0.18 + 0.03 * Math.sin(frame / 9);
  const slam = prog(frame, hit, 8, ease.whipOut);
  const v = idle + (0.94 - idle) * slam;
  const a = (-120 + 240 * v) * (Math.PI / 180);
  const R = 250;
  return (
    // a diagram: the band cuts it on hard lines at L.graphicsTop / L.graphicsBottom (a "look": "illustrated" picture is
    // full bleed: nothing is cut, draw it to L.bleedTop / L.bleedBottom); camera={false}: our own planes move
    <PictureBand camera={false}>
      {/* background plane, depth 0.6: big quiet arcs in the rule colour */}
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5 * appear}}>
          {[420, 520, 640].map((r, i) => (
            <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke={C.rule} strokeWidth={1.5} />
          ))}
        </svg>
      </CameraLayer>
      {/* the subject, depth 1: the gauge, inside L.camSafe */}
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.94 + 0.06 * appear).toFixed(4)})`, transformOrigin: `${CX}px ${CY}px`}}>
          {Array.from({length: TICKS + 1}, (_, i) => {
            const t = (-120 + (240 * i) / TICKS) * (Math.PI / 180);
            const on = i / TICKS <= v;
            return (
              <line
                key={i}
                x1={CX + Math.sin(t) * (R - 34)}
                y1={CY - Math.cos(t) * (R - 34)}
                x2={CX + Math.sin(t) * R}
                y2={CY - Math.cos(t) * R}
                stroke={on && slam > 0 ? toneBig(tone) : C.ink2}
                strokeWidth={i % 6 === 0 ? 3 : 2}
                strokeLinecap="round"
              />
            );
          })}
          <line x1={CX} y1={CY} x2={CX + Math.sin(a) * (R - 60)} y2={CY - Math.cos(a) * (R - 60)} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={12 + 6 * kick} fill={C.ink} />
          <circle cx={CX} cy={CY} r={R + 26} fill="none" stroke={rgba(C.ink, 0.12 + 0.3 * kick)} strokeWidth={2} />
        </svg>
      </CameraLayer>
      {/* the HUD never moves: a readout that types on */}
      <Hud>
        <MonoLabel text={p.label ?? 'წნევა'} at={Math.max(base, e + 4)} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top}} />
      </Hud>
      {/* the punch line lands on the hit (its punch word pops and turns bold) */}
      <div style={{position: 'absolute', left: L.camSafe.left, top: 1110, whiteSpace: 'nowrap'}}>
        <Words text={p.line ?? 'ერთი *დარტყმა*'} at={hit} fx="slam" size={84} punchTone={tone} />
      </div>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.28} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
