import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ease, lerp, prog, spr} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {C, F, halo, isLight, rgba, SAFE, STAGE, THEME, Tone, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, lead, Sfx} from './common';

// Screens in public/screens are 1080 x 2346 JPEGs of real app captures (never edited:
// only cropped, zoomed and dimmed).
const SRC_W = 1080;
const SRC_H = 2346;

type At = number | string; // a chunk of the scene, or seconds from the scene start ("1.2s")
type Focus = {y: number; x?: number; zoom?: number; at?: At};
type Highlight = {y: number; h: number; x?: number; w?: number; tone?: Tone; at?: At};
type P = {
  src: string;
  y?: number; // screen fraction (0..1) kept at the window centre at the start (0 = top of the screen)
  x?: number; // the push's pivot at the start (screen fraction, default 0.5)
  // how large the device is drawn, in the classic units the specs were framed in (1 = the old 560
  // window; 1.45 = as wide as the Reels safe zone allows, the most). The device now RESTS at 1.137 of
  // that (bigger by default), so a zoom up to 1.137 is the rest size and 1.2 .. 1.45 are the pushes,
  // exactly as wide as they were framed. The push at the start (default 1): the Phone lands framed.
  zoom?: number;
  // later moves: pan to y, and push the whole device in to `zoom` around x/y. A FIRST key
  // whose `at` is the scene's start ("0s"; on the video's first scene also 0) is not a move: it is the
  // framing the Phone lands in (the same as y/x/zoom above).
  focus?: Focus[];
  highlight?: Highlight | Highlight[]; // boxes on the screen, each from its chunk; the latest one wins
  callout?: {text: string; value?: string; tone?: Tone; at?: At};
  tap?: {x: number; y: number; at?: At} | {x: number; y: number; at?: At}[];
  // screen brightness on the dark film, default 0.96 (THEME.screenBright) and never under 0.9: the
  // owner wants the real screens bright and readable, never a dimmed grey slab (older specs' 0.5-0.66
  // are lifted). The light theme ignores it: there the captures play at their natural brightness.
  bright?: number;
  // hide the capture from this screen fraction down (0..1, a short fade above it): keeps a floating
  // bar out of the shot, e.g. 05-customs' "პორტფოლიო" pill from 0.814 ("cropBottom": 0.8)
  cropBottom?: number;
};

// The device fills the stage's content box: the window is 640 wide (704 frame px at rest, 2/3 of the
// frame) and runs from just under the meta bar to the content box's bottom (stage 372..1100). A
// push-in is capped where the outline meets the Reels safe zone (zSafe: 1.274 at x 0.5), which is
// the largest the device can be drawn whole.
const WIN_W = 640;
const WIN_TOP = 372;
const WIN_H = 728;
const FADE_AT = 0.84; // the window fades out over its last 16 % (never a hard bottom edge)
const BOTTOM = 1100; // stage: nothing of the device draws below the content box (frame 1132)
const BEZEL = 12;
const R = Math.round(WIN_W * 0.1409);
const X0 = (1080 - WIN_W) / 2;
const TOP = WIN_TOP - BEZEL; // the device's top edge at rest (360): the meta bar ends just above
const PIN = 40; // px a push-in may slide the device down to keep its top edge in view
const ZMAX = 1.8;
// `zoom` keeps the units the specs were framed in: the old 560 window with its bezel (584 wide). This
// window is 664 wide with its bezel, so a spec's zoom scales by 584 / 664 (1.45, the old safe maximum,
// lands on this window's own safe maximum, 1.274 at x 0.5).
const CLASSIC = (560 + 2 * 12) / (640 + 2 * 12);
const DRIFT = 1.01; // Promo's SceneHost drift: the whole scene scales up to 1 % about stage x 540

/** The deepest push that keeps the device's outline inside the Reels safe zone (frame x SAFE.left ..
 *  SAFE.right) for a pivot at stage x `px`: the outline (stage X0 - BEZEL .. X0 + WIN_W + BEZEL)
 *  scales by z about px, then by the drift about 540, then by STAGE.s into the frame. */
const zSafe = (px: number) => {
  const inv = (fx: number) => 540 + ((fx - STAGE.x) / STAGE.s - 540) / DRIFT; // frame x -> stage x before the drift
  const lo = inv(SAFE.left);
  const hi = inv(SAFE.right);
  const dl = X0 - BEZEL;
  const dr = X0 + WIN_W + BEZEL;
  const zl = px > dl ? (px - lo) / (px - dl) : ZMAX;
  const zr = dr > px ? (hi - px) / (dr - px) : ZMAX;
  return Math.max(1, Math.min(ZMAX, zl, zr));
};
const warned = new Set<string>();
const warnOnce = (key: string, msg: string) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
};

// A real capture inside a line-art iPhone that fades out at the bottom, so the light screen
// never reaches the subtitle band. Push-ins scale the whole device like a camera move: the
// UI is never sliced by the bezel.
export const Phone: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const first = ctx.index === 0;
  // A later Phone lands on a picture: the device is already 10 frames into its slide on the cut
  // frame, fully outlined, the screen at 60 % and brightening. Only the first scene draws on.
  const enter = spr(frame, entrance(ctx), 'enterXL');
  const lum = first ? prog(frame, base + 4, 18) : 0.6 + 0.4 * prog(frame, base, 8);
  const outline = first ? prog(frame, base, 18, ease.drawOn) : 1;

  // focus track, sorted by time; each move eases from wherever the previous one got to. A first key
  // at the scene's start (frame <= 0 on a later scene, <= base on the first) is the landing framing.
  const zOf = (z: number | undefined, x: number, what: string) => {
    const asked = Math.min(ZMAX, Math.max(1, z ?? 1));
    const want = Math.max(1, asked * CLASSIC); // classic units -> this window's own scale
    const cap = zSafe(X0 + x * WIN_W);
    if (want > cap + 0.02) warnOnce(`${p.src}|${what}|${asked}|${x}`, `Phone ${p.src}: ${what} zoom ${asked} at x ${x} would push the device outside the Reels safe zone; it lands at the largest safe framing`);
    return Math.min(want, cap);
  };
  const moves = (p.focus ?? [])
    .map((k, i) => ({f: k.at !== undefined ? cueFrame(ctx, k.at) : base + 24, y: k.y, x: k.x ?? 0.5, z: zOf(k.zoom, k.x ?? 0.5, `focus[${i}]`)}))
    .sort((a, b) => a.f - b.f);
  const landsFramed = moves.length > 0 && moves[0].f <= (first ? base : 0);
  const keys = [landsFramed ? {...moves[0], f: base} : {f: base, y: p.y ?? 0, x: p.x ?? 0.5, z: zOf(p.zoom, p.x ?? 0.5, 'start')}, ...moves.slice(landsFramed ? 1 : 0)];
  let fy = keys[0].y;
  let fx = keys[0].x;
  let z = keys[0].z;
  for (let i = 1; i < keys.length; i++) {
    const t = prog(frame, keys[i].f, 28, ease.camera);
    fy += (keys[i].y - fy) * t;
    fx += (keys[i].x - fx) * t;
    z += (keys[i].z - z) * t;
  }
  // a pan and a push easing together can still swing the outline out between two safe keys
  z = Math.min(z, zSafe(X0 + fx * WIN_W));
  const imgH = (WIN_W * SRC_H) / SRC_W;
  const ty = Math.min(0, Math.max(WIN_H - imgH, WIN_H / 2 - fy * imgH));
  // the push-in pivots on the focus point as it sits on the page
  const px = X0 + fx * WIN_W;
  const py = WIN_TOP + ty + fy * imgH;
  // A pivot low on the page lifts the device's top edge by (py - TOP)(z - 1). A gentle push keeps
  // the whole device: it slides down (up to PIN px) so its top stays at 360. A deeper push crops
  // it like a camera would: the top then passes under a mask that starts below the meta bar, so
  // no outline, status bar or screen title ever draws behind the meta text.
  const topZ = py + (TOP - py) * z;
  const dy = Math.min(PIN, Math.max(0, TOP - topZ));
  const rise = Math.max(0, TOP - (topZ + dy));
  const crop = Math.min(1, rise / 24);
  const maskTop = `transparent ${300 + 60 * crop}px, #000 ${348 + 72 * crop}px`;

  // Highlights in time order. The dim layer fades in once, with the first band; a later band
  // slides from the previous one (no flash of undimmed screen between them).
  const hlList = ([] as Highlight[])
    .concat(p.highlight ?? [])
    .map((h) => ({h, s: h.at !== undefined ? cueFrame(ctx, h.at) : base + 26}))
    .sort((a, b) => a.s - b.s);
  const hlStarts = hlList.map((e) => e.s);
  const hlIdx = hlStarts.filter((s) => frame >= s).length - 1;
  const dimT = hlList.length ? prog(frame, hlStarts[0], 12) : 0;
  const hl = (() => {
    if (hlIdx < 0) return null;
    const cur = hlList[hlIdx].h;
    const prev = hlIdx > 0 ? hlList[hlIdx - 1].h : null;
    if (!prev) return cur;
    const k = prog(frame, hlStarts[hlIdx], 14, ease.camera);
    const x0 = prev.x ?? 0.03;
    const w0 = prev.w ?? 0.94;
    return {...cur, y: lerp(prev.y, cur.y, k), h: lerp(prev.h, cur.h, k), x: lerp(x0, cur.x ?? 0.03, k), w: lerp(w0, cur.w ?? 0.94, k)};
  })();
  const hlT = hl ? (hlIdx === 0 ? prog(frame, hlStarts[0], 12) : 1) : 0;

  const co = p.callout;
  const coAt = co ? (co.at !== undefined ? cueFrame(ctx, co.at) : (hlStarts[0] ?? base + 26) + 8) : 0;
  const taps = ([] as {x: number; y: number; at?: number | string}[]).concat(p.tap ?? []);
  const tapAts = taps.map((t) => (t.at !== undefined ? cueFrame(ctx, t.at) : base + 30));

  const mask = `linear-gradient(to bottom, #000 0%, #000 ${FADE_AT * 100}%, transparent 100%)`;
  const per = 2 * (WIN_W + 2 * BEZEL) + 2 * (WIN_H + 200);
  // The capture: on the dark film it wakes from black (brightness) to nearly full; on the light
  // theme it fades up from the paper (opacity) and plays at its natural brightness.
  const light = isLight();
  const bright = Math.min(1, Math.max(0.9, p.bright ?? THEME.screenBright));
  const shot: React.CSSProperties = light ? {opacity: lum} : {filter: `brightness(${bright * lum})${THEME.screenFilter === 'none' ? '' : ` ${THEME.screenFilter}`}`};
  const cut = p.cropBottom !== undefined ? Math.max(0.05, Math.min(1, p.cropBottom)) * imgH : null;
  const cropMask = cut !== null ? `linear-gradient(to bottom, #000 ${Math.max(0, cut - 28)}px, transparent ${cut}px)` : undefined;
  // the device's foot: where the screen ends in the window (the window's bottom, or higher when
  // cropBottom hides the capture's foot); the outline dissolves with the screen, never an empty frame
  const footY = cut !== null ? Math.max(120, Math.min(WIN_H, ty + cut)) : WIN_H;
  const footFade = WIN_H * (1 - FADE_AT);
  const hlBox = hl ? {left: (hl.x ?? 0.03) * WIN_W, width: (hl.w ?? 0.94) * WIN_W, top: ty + hl.y * imgH, height: hl.h * imgH} : null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        WebkitMaskImage: `linear-gradient(to bottom, ${maskTop}, #000 ${BOTTOM - 36}px, transparent ${BOTTOM}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - enter) * 40 + dy}px) scale(${z})`,
          transformOrigin: `${px}px ${py}px`,
          opacity: Math.min(1, enter * 1.4),
        }}
      >
        {/* line-art device outline */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, WebkitMaskImage: `linear-gradient(to bottom, #000 0, #000 ${WIN_TOP + footY - footFade}px, transparent ${WIN_TOP + footY}px)`}}>
          <rect
            x={X0 - BEZEL}
            y={WIN_TOP - BEZEL}
            width={WIN_W + 2 * BEZEL}
            height={WIN_H + 200}
            rx={R + BEZEL}
            fill="none"
            stroke={C.ink}
            strokeOpacity={0.85}
            strokeWidth={2 / z}
            strokeDasharray={per}
            strokeDashoffset={per * (1 - outline)}
          />
        </svg>
        <div style={{position: 'absolute', left: X0, top: WIN_TOP, width: WIN_W, height: WIN_H, overflow: 'hidden', borderTopLeftRadius: R, borderTopRightRadius: R, WebkitMaskImage: mask}}>
          <Img
            src={staticFile(`screens/${p.src}.jpg`)}
            style={{position: 'absolute', left: 0, top: ty, width: WIN_W, height: imgH, ...shot, WebkitMaskImage: cropMask, maskImage: cropMask}}
          />
          {hl && hlBox ? (
            <>
              {/* dim everything but the highlight's own box: a cut-out, its corners rounded like the box
                  (a huge spread shadow of a transparent box, clipped by the window) */}
              <div
                style={{
                  position: 'absolute',
                  ...hlBox,
                  borderRadius: 14,
                  boxShadow: `0 0 0 ${2 * WIN_H + imgH}px ${rgba(light ? C.bg : C.shade, THEME.dimA)}`,
                  opacity: dimT,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  ...hlBox,
                  border: `${3 / z}px solid ${toneLine(hl.tone ?? 'up')}`,
                  borderRadius: 14,
                  opacity: hlT,
                  transform: `scale(${0.96 + 0.04 * hlT})`,
                  boxShadow: `0 0 24px ${halo(toneLine(hl.tone ?? 'up'), 0.33)}`,
                }}
              />
            </>
          ) : null}
          {taps.map((t, i) => {
            const k = interpolate(frame, [tapAts[i], tapAts[i] + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const on = frame >= tapAts[i] && k < 1;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: t.x * WIN_W - 44,
                  top: ty + t.y * imgH - 44,
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  border: `4px solid ${rgba(C.ink, 0.95)}`,
                  boxShadow: `0 0 0 3px ${rgba(C.onInk, light ? 0.7 : 0.45)}`,
                  opacity: on ? 1 - k : 0,
                  transform: `scale(${0.55 + 0.6 * k})`,
                }}
              />
            );
          })}
        </div>
      </div>
      {co ? (
        // over the window's faded foot, on a soft pill of the field so it reads over the screen
        <div style={{position: 'absolute', top: BOTTOM - 124, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: spr(frame, coAt)}}>
          <div style={{textAlign: 'center', padding: '8px 28px 10px', borderRadius: 22, background: rgba(C.bg, 0.86)}}>
            {co.value ? (
              <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 64, color: toneLine(co.tone), fontFeatureSettings: '"tnum" 1'}}>{co.value}</div>
            ) : null}
            <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: '0.05em', color: C.ink2}}>{capsLatin(co.text)}</div>
          </div>
        </div>
      ) : null}
      <Sfx name="asmr-slide" at={base} volume={0.42} /* event: the phone slides in (enterXL) */ />
      {/* event: the device comes to rest (the slide's faint touch, 10 frames in), unless a tap or a band is already there */}
      {[...tapAts, ...hlStarts].some((a) => Math.abs(a - (base + 10)) < 8) ? null : <Haptic kind="soft" at={base + 10} volume={0.4} />}
      {keys.slice(1).map((k, i) =>
        k.z > 1.05 && k.f - 10 >= 0 ? <Sfx key={`push${i}`} name="asmr-air-long" at={k.f - 10} volume={0.26} len={40} fade={12} /* event: the camera pushes in (28 frames) */ /> : null,
      )}
      {tapAts.map((a, i) => (
        <React.Fragment key={`tap${i}`}>
          <Sfx name="asmr-tap" at={a} volume={0.55} /* event: a finger taps the screen */ />
          <Haptic kind="light" at={a} volume={0.42} />
        </React.Fragment>
      ))}
      {hlStarts.map((a, i) => (
        <React.Fragment key={`hl${i}`}>
          <Sfx name="cc0-click-soft" at={a} volume={0.5} /* event: a highlight band lands: a soft real click (cc0) under its haptic */ />
          {/* the first band lands (light), a later one moves on from the last (selection); a tap on the same frame already has its haptic */}
          {tapAts.some((t) => Math.abs(t - a) <= 3) ? null : <Haptic kind={i === 0 ? 'light' : 'selection'} at={a} volume={i === 0 ? 0.4 : 0.34} />}
        </React.Fragment>
      ))}
      {co ? <Sfx name="asmr-knock" at={coAt} volume={0.36} /* event: the callout appears */ /> : null}
      {co ? <Haptic kind={co.value ? 'medium' : 'light'} at={coAt} /* event: the callout's value lands */ /> : null}
    </div>
  );
};
