import React, {useMemo} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import CATALOG from '../../public/photos/photos.json';
import {ease, lerp, prog, rand, spr, typeOn} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {TXT, useLayer} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, halo, isLight, L, rgba, STAGE, T, Tone, toneBig, toneLine, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, lead, Sfx, toneHaptic, TypeSfx} from './common';

// ---- Photo ------------------------------------------------------------------------------------------
// A real photograph (public/photos, catalogue in public/photos/photos.json, licences in LICENSES.md)
// graded into the film's own look: a duotone from the field to the ink (dark film: black to #F5F5F5;
// light film: ink printed on the paper), a slow Ken Burns drift, a data-coloured highlight on the part
// the voice talks about, grain that matches the VHS noise, and a pollar-style cover with text strips.
//
// Props (all optional except src):
//   src        "engine-bay-clean": a file in public/photos without .jpg (or a public path with an extension)
//   mode       "frame" (default): the photo as a sharp-edged plate in the content box, caption lines under it
//              "bleed": edge to edge between the meta bar and the subtitle line, soft fades into the black
//              field (on paper a crisp printed band; the caption lines then sit on the paper under it)
//              "cover": bleed, graded darker, with pollar text `strips` over its lower part (a hook, a cover)
//   aspect     frame mode only: the plate's shape, "3:2" | "4:5" | "1:1" | "16:9" | a number (w/h), default 1.4
//   move       Ken Burns over the whole scene: "push" (default) | "pull" | "pan-left" | "pan-right" |
//              "pan-up" | "pan-down" | "none". A pan names the way the view travels over the photo.
//   amount     push/pull: the scale gained over the scene (0.07); pan: the distance as a share of the view (0.08)
//   center     {x, y}: photo fractions (0..1) the framing centres on and pushes into (0.5, 0.5). (Not
//              "focus": build-index reads a scene's focus as Phone's array of camera keys.)
//   zoom       >= 1: the framing it lands in (1 = the photo just covers the view)
//   highlight  one box or an array, each {x, y, w, h} in photo fractions (measure on the JPEG), plus
//              tone ("accent" default | up | down | neutral), at (chunk, or "1.2s"; default about 0.9 s in),
//              label (a mono chip on the box, types on), fill ("tone": the box printed in the data colour,
//              default | "photo": the photo's own colour inside the box | "none"), push (1.1..2: the camera
//              eases in on the box when it lands, like Phone's focus zoom), outline (false: no frame, only the
//              colour: a spot of data colour in the grey photo). The rest of the photo dims a little.
//   caption    a mono line (frame: under the plate; bleed/cover: at the bottom of the picture)
//   source     a quieter mono source line under the caption ("UNSPLASH" is never needed: no credit required)
//   strips     cover mode: lines of text on pollar strips, [string | {text, tone, at}], stacked above the
//              caption; a toned strip is filled with its data colour. `size` (76) shrinks to fit 840 px.
//              `stripStyle` "light" | "dark": a neutral strip's look; by default light on a dark photo (the
//              catalogue's `lum` < 0.35) and dark on a light one.
//   kicker     cover mode: a small mono tag above the strips
//   grade      "duotone" (default) | "color" (the photo as shot: only for a photo whose colour IS the data)
//   bright     dark film: the grade's light end, 0.3..1.1 (frame/bleed 0.94, cover 0.82);
//              paper: the ink density of the photo's darks, 0.5..0.97 (0.9)
//   contrast   0..2 (1): the S-curve of the grade
//   grain      0..1 (0.5): film grain on the photo, the VHS layer's noise at the frame's pixel size
//   shutter    true: a soft camera click when the photo lands (the cut already has its air)
//
// Example: {"type": "Photo", "src": "engine-bay-clean", "move": "push", "center": {"x": 0.44, "y": 0.45},
//   "highlight": {"x": 0.26, "y": 0.31, "w": 0.36, "h": 0.27, "label": "მიკროფონი აქ", "at": 1, "push": 1.3},
//   "caption": "კაპოტის ქვეშ"}   (specs/demo-photo.json has a cover, a plate, a bleed pan and a neutral box)
//
// Everything is frame-driven. Stage units (Promo scales the stage into the Reels safe zone): the frame
// plate lives in the content box (x 120..960, y 380..1280); a bleed photo spans the frame's width from
// stage y 345 (just under the meta bar) to 1285 (frame 1336, well above the subtitle line) and fades out
// at both ends, so the meta text and the subtitle always sit on the clean field. Labels, strips and
// caption lines never scale with the camera and stay inside the safe zone. The photo is graphics (the
// lens layer); labels, strips' words and captions are text (clean, lib/layer.ts).

type At = number | string;
type Box = {x: number; y: number; w: number; h: number; tone?: Tone; at?: At; label?: string; fill?: 'tone' | 'photo' | 'none'; outline?: boolean; push?: number};
type Strip = string | {text: string; tone?: Tone; at?: At};
type Move = 'push' | 'pull' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'none';
type P = {
  src: string;
  mode?: 'frame' | 'bleed' | 'cover';
  aspect?: string | number;
  move?: Move;
  amount?: number;
  center?: {x?: number; y?: number};
  zoom?: number;
  highlight?: Box | Box[];
  caption?: string;
  source?: string;
  strips?: Strip[];
  kicker?: string;
  size?: number;
  stripStyle?: 'light' | 'dark';
  grade?: 'duotone' | 'color';
  bright?: number;
  contrast?: number;
  grain?: number;
  shutter?: boolean;
};

type Rect = {x: number; y: number; w: number; h: number};

const SIZES = CATALOG as Record<string, {w: number; h: number; lum?: number; shows?: string}>;
const BLEED: Rect = {x: 20, y: 345, w: 1040, h: 940}; // stage: frame x -32..1112, y 302..1336
// on paper a dark photo cannot fade into the field (the fade reads as a grey smudge): a crisp printed
// band instead, a step lower under the meta bar, ending above the caption lines when there are any
const BAND_TOP = 370; // frame 330: 34 px under the meta text (358 put the band's fringed edge 15 px under it)
const BAND_BOTTOM = 1270; // frame 1319: a clear breath above the subtitle line
const BAND_BOTTOM_CAPTION = 1170;
const FADE_TOP = 64;
const FADE_BOTTOM = 170;
const PLATE_W = 840;
const BOX_H = L.contentBottom - L.contentTop; // 720
const CAP_GAP = 18;
const CAP_LINE = 44;
const HL_R = 4; // highlight corner radius (sharp, like a print)
// cover strips: the same geometry as Title's (left edge on frame 71, the widest ends at frame 1009)
const STRIP_OUT = 6;
const STRIP_PAD = 18;
const STRIP_MAX_W = PLATE_W + 2 * STRIP_OUT - 2 * STRIP_PAD;
const STRIP_BOTTOM = 1150;
const CAPTION_Y = 1192; // bleed/cover: first mono line (stage), inside the lower safe block's left part
const CAPTION_MAX_W = 700; // stage x 120..820: never beside the like column

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const warned = new Set<string>();
const warnOnce = (key: string, msg: string) => {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
};

const parseAspect = (a: unknown): number | null => {
  if (typeof a === 'number' && a > 0) return a;
  if (typeof a === 'string') {
    const m = /^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/.exec(a.trim());
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    const n = parseFloat(a);
    if (n > 0) return n;
  }
  return null;
};

const fileOf = (src: string) => (/[/.]/.test(src) ? staticFile(src) : staticFile(`photos/${src}.jpg`));

// ---- the grade --------------------------------------------------------------------------------------
const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix3 = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
/** Luminance 0..1 -> 0..1: black and white points, a gamma, then an S-curve (`contrast`). */
const curve = (x: number, contrast: number, gamma: number, bp = 0.035) => {
  let y = clamp((x - bp) / (0.965 - bp), 0, 1);
  y = Math.pow(y, gamma);
  const s = y * y * (3 - 2 * y);
  return clamp(y + (s - y) * Math.min(1, 0.6 * contrast), 0, 1);
};
/** feFuncR/G/B tables mapping the photo's luminance from `lo` to `hi`. */
const tables = (lo: number[], hi: number[], contrast: number, gamma: number, bp?: number) =>
  [0, 1, 2].map((ch) =>
    Array.from({length: 33}, (_, i) => {
      const y = curve(i / 32, contrast, gamma, bp);
      return (lo[ch] + (hi[ch] - lo[ch]) * y).toFixed(4);
    }).join(' '),
  );

const Duotone: React.FC<{id: string; t: string[]}> = ({id, t}) => (
  <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
    <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
    <feComponentTransfer>
      <feFuncR type="table" tableValues={t[0]} />
      <feFuncG type="table" tableValues={t[1]} />
      <feFuncB type="table" tableValues={t[2]} />
    </feComponentTransfer>
  </filter>
);

// ---- grain: the VHS layer's noise, a seeded grey tile under soft-light (black stays black) ----------
const TILE = 256;
const useGrainTile = () =>
  useMemo(() => {
    if (typeof document === 'undefined') return '';
    const cv = document.createElement('canvas');
    cv.width = TILE;
    cv.height = TILE;
    const g = cv.getContext('2d');
    if (!g) return '';
    const img = g.createImageData(TILE, TILE);
    for (let i = 0; i < TILE * TILE; i++) {
      const v = Math.floor(rand(i * 1.37 + 11) * 255);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }, []);

// ---- mono lines ---------------------------------------------------------------------------------------
const MonoLine: React.FC<{text: string; at: number; x: number; y: number; maxW: number; color: string; size: number; sfx: number | false}> = ({text, at, x, y, maxW, color, size, sfx}) => {
  const frame = useCurrentFrame();
  const shown = mtav(capsLatin(text));
  const w = textWidth(shown, `400 ${size}px ${F.mono}`, 0.05 * size);
  const fs = w > maxW ? Math.max(18, Math.floor((size * maxW) / w)) : size;
  return (
    <div className={TXT} style={{position: 'absolute', left: x, top: y, fontFamily: F.mono, fontSize: fs, letterSpacing: '0.05em', color, whiteSpace: 'nowrap'}}>
      {typeOn(shown, frame, at, 1.4)}
      {sfx ? <TypeSfx text={shown} at={at} cpf={1.4} volume={sfx} /> : null}
    </div>
  );
};

/** Set width of one strip line (FiraGO 600, letter-spacing -0.01em, 0.26em word gaps), as in Title. */
const lineWidth = (text: string, size: number) => {
  const words = text.split(' ');
  return words.reduce((w, x) => w + textWidth(x, `600 ${size}px ${F.sans}`, -0.01 * size), 0) + (words.length - 1) * size * 0.26;
};

export const Photo: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const layer = useLayer();
  const light = isLight();
  const base = lead(ctx);
  const ent = entrance(ctx);
  const mode = p.mode ?? 'frame';
  const bleed = mode !== 'frame';
  const idp = `vn-photo-${ctx.index}`;
  const tile = useGrainTile();

  // ---- the view (stage units) ----
  const lines = (p.caption ? 1 : 0) + (p.source ? 1 : 0);
  const capBlock = lines ? CAP_GAP + lines * CAP_LINE : 0;
  const view: Rect = (() => {
    if (bleed && !light) return BLEED;
    if (bleed) return {x: BLEED.x, y: BAND_TOP, w: BLEED.w, h: (lines ? BAND_BOTTOM_CAPTION : BAND_BOTTOM) - BAND_TOP};
    const ar = parseAspect(p.aspect) ?? 1.4;
    let w = PLATE_W;
    let h = w / ar;
    const maxH = BOX_H - capBlock;
    if (h > maxH) {
      h = maxH;
      w = h * ar;
    }
    const top = L.contentTop + Math.max(0, (BOX_H - h - capBlock) / 2);
    return {x: 540 - w / 2, y: Math.round(top), w, h};
  })();

  // ---- the photo's size (cover fit) ----
  const key = p.src.replace(/^photos\//, '').replace(/\.jpe?g$/i, '');
  const known = SIZES[key];
  if (!known) warnOnce(`size|${key}`, `Photo ${p.src}: not in public/photos/photos.json; framing assumes the view's own shape`);
  const img = known ? {w: known.w, h: known.h} : {w: view.w, h: view.h};
  const s0 = Math.max(view.w / img.w, view.h / img.h);
  const bw = img.w * s0; // the photo at zoom 1 (it just covers the view)
  const bh = img.h * s0;

  // ---- the camera ----
  const move: Move = p.move ?? 'push';
  const pan = move.startsWith('pan');
  const amt = Math.max(0, p.amount ?? (pan ? 0.08 : 0.07));
  const z0 = Math.max(1, p.zoom ?? 1);
  const fx = clamp(p.center?.x ?? 0.5, 0, 1);
  const fy = clamp(p.center?.y ?? 0.5, 0, 1);
  const e = clamp((frame - ent) / Math.max(1, ctx.dur - ent), 0, 1); // linear: the drift never stops
  /** Where the photo sits for zoom z centred on photo point (u, v): clamped so it always covers the view. */
  const place = (z: number, u: number, v: number): Rect => {
    const w = bw * z;
    const h = bh * z;
    return {
      x: clamp(view.x + view.w / 2 - u * w, view.x + view.w - w, view.x),
      y: clamp(view.y + view.h / 2 - v * h, view.y + view.h - h, view.y),
      w,
      h,
    };
  };
  const baseRect = ((): Rect => {
    if (!pan) {
      const z = move === 'push' ? z0 * (1 + amt * e) : move === 'pull' ? z0 * (1 + amt * (1 - e)) : z0;
      return place(z, fx, fy);
    }
    const horiz = move === 'pan-left' || move === 'pan-right';
    const dist = amt * (horiz ? view.w : view.h);
    // enough zoom that the photo reaches `dist` past the view along the pan, plus a breath of push
    const need = horiz ? (view.w + dist) / bw : (view.h + dist) / bh;
    const z = Math.max(z0, need) * (1 + 0.015 * e);
    const r = place(z, fx, fy);
    const dir = move === 'pan-left' || move === 'pan-up' ? 1 : -1; // the view travels left = the photo slides right
    if (horiz) {
      const lo = view.x + view.w - r.w;
      const hi = view.x;
      const c = clamp(r.x, lo + dist / 2, hi - dist / 2);
      return {...r, x: clamp(c + dir * (e - 0.5) * dist, lo, hi)};
    }
    const lo = view.y + view.h - r.h;
    const hi = view.y;
    const c = clamp(r.y, lo + dist / 2, hi - dist / 2);
    return {...r, y: clamp(c + dir * (e - 0.5) * dist, lo, hi)};
  })();

  // ---- highlights (in time order) ----
  const boxes = ([] as Box[])
    .concat(p.highlight ?? [])
    .map((b, i) => ({b, i, a: b.at !== undefined ? cueFrame(ctx, b.at) : base + 26}))
    .sort((m, n) => m.a - n.a);
  // a box with `push` eases the camera onto it (28 frames), the drift continuing underneath
  let R = baseRect;
  for (const {b, a} of boxes) {
    if (!b.push || b.push <= 1) continue;
    const k = prog(frame, a, 28, ease.camera);
    if (k <= 0) continue;
    const zb = R.w / bw;
    const t = place(Math.max(zb, z0 * Math.min(2, b.push)) * (1 + 0.012 * e), b.x + b.w / 2, b.y + b.h / 2);
    R = {x: lerp(R.x, t.x, k), y: lerp(R.y, t.y, k), w: lerp(R.w, t.w, k), h: lerp(R.h, t.h, k)};
  }
  const z = R.w / bw;
  const active = boxes.filter((m) => frame >= m.a);
  // the dim around the boxes comes with the first framed box; a spot (outline: false) only adds colour
  const framed = boxes.filter((m) => m.b.outline !== false);
  const holes = active.filter((m) => m.b.outline !== false);
  const dimT = framed.length ? prog(frame, framed[0].a, 12) : 0;

  // ---- grade ----
  const cover = mode === 'cover';
  const contrast = clamp(p.contrast ?? 1, 0, 2);
  const bright = clamp(p.bright ?? (cover ? 0.82 : 0.94), 0.3, 1.1);
  const field = rgb(C.bg);
  const ink = rgb(C.ink);
  // dark film: black to (a little under) the ink; paper: the darks printed in ink at `density`, the
  // lights left as paper
  const density = clamp(p.bright ?? 0.9, 0.5, 0.97);
  const mainLo = light ? mix3(field, ink, density) : field;
  const main = light ? tables(mainLo, field, contrast, 1.12) : tables(field, mix3(field, ink, bright), contrast, cover ? 1.15 : 1);
  const toneTables = (tone: Tone, spot: boolean) => {
    const t = rgb(toneLine(tone));
    // a framed box: on the black film only the photo's lights take the colour (a raised black point), so
    // it reads as a lit part, not a red rectangle; on paper the part is printed in the data colour's ink.
    // A spot (a light, a lamp) is lit in the colour on both: its darks stay the photo's own.
    if (spot || !light) return tables(mainLo, t, contrast, 0.85, 0.16);
    return tables(mix3(t, ink, 0.3), field, contrast, 1.1, 0.06);
  };
  const colour = p.grade === 'color';
  // a later scene lands on a picture that is still settling (brightness on the black film, a fade from
  // the paper on the light one); the first scene is composed at frame 0
  const settle = prog(frame, ent, 14);
  const lum = 0.72 + 0.28 * settle;
  const photoFilter = colour ? (light ? undefined : `brightness(${lum})`) : `url(#${idp}-g)${light ? '' : ` brightness(${lum})`}`;

  // ---- geometry helpers ----
  const local = (b: Box) => ({left: b.x * bw, top: b.y * bh, width: b.w * bw, height: b.h * bh}); // inside the photo layer
  const onStage = (b: Box): Rect => ({x: R.x + b.x * R.w, y: R.y + b.y * R.h, w: b.w * R.w, h: b.h * R.h});
  boxes.forEach(({b, i, a}) => {
    const s = onStage(b);
    if (frame === Math.max(0, a) && (s.x < L.side - 1 || s.x + s.w > L.safeRight + 1 || s.y < L.contentTop - 1 || s.y + s.h > L.contentBottom + 1))
      warnOnce(`${p.src}|hl${i}`, `Photo ${p.src}: highlight ${i} lands outside the content box (stage x ${Math.round(s.x)}..${Math.round(s.x + s.w)}, y ${Math.round(s.y)}..${Math.round(s.y + s.h)})`);
  });

  const mask = bleed && !light
    ? `linear-gradient(to bottom, transparent 0px, #000 ${FADE_TOP}px, #000 ${view.h - FADE_BOTTOM}px, transparent ${view.h}px)`
    : undefined;
  const imgStyle: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: bw, height: bh, maxWidth: 'none'};
  const gStep = Math.floor(frame / 2); // the grain changes every 2 frames, like the VHS noise
  const grain = clamp(p.grain ?? 0.5, 0, 1);

  // ---- strips (cover) ----
  const strips = (p.strips ?? []).map((s) => (typeof s === 'string' ? {text: mtav(s)} : {...s, text: mtav(s.text)}));
  const want = p.size ?? 76;
  const widest = Math.max(1, ...strips.map((s) => lineWidth(s.text, want)));
  const sSize = widest > STRIP_MAX_W ? Math.floor((want * STRIP_MAX_W) / widest) : want;
  const sLineH = Math.round(sSize * 1.32);
  const capTop = bleed && !light ? CAPTION_Y : view.y + view.h + CAP_GAP;
  // strips contrast with the photo: light strips on a dark photo (most of the library), dark on a light one
  const photoLum = known?.lum ?? 0.3;
  const lightStrips = p.stripStyle ? p.stripStyle === 'light' : photoLum < 0.35;
  const stripsTop = STRIP_BOTTOM - strips.length * sLineH;
  const stripStart = (s: {at?: At}, li: number) => Math.max(ent + 4 + li * 5, s.at !== undefined ? cueFrame(ctx, s.at) : ent + 4 + li * 5);

  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
        <defs>
          <Duotone id={`${idp}-g`} t={main} />
          {boxes.map(({b, i}) => ((b.fill ?? 'tone') === 'tone' ? <Duotone key={i} id={`${idp}-t${i}`} t={toneTables(b.tone ?? 'accent', b.outline === false)} /> : null))}
        </defs>
      </svg>

      {/* the view: the photo layer moves by one transform (no pixel snapping), clipped to the view */}
      <div
        style={{
          position: 'absolute',
          left: view.x,
          top: view.y,
          width: view.w,
          height: view.h,
          overflow: 'hidden',
          WebkitMaskImage: mask,
          maskImage: mask,
          opacity: light && !colour ? 0.35 + 0.65 * settle : 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: bw,
            height: bh,
            transformOrigin: '0 0',
            transform: `translate(${R.x - view.x}px, ${R.y - view.y}px) scale(${z})`,
          }}
        >
          {layer === 'text' ? null : <Img src={fileOf(p.src)} style={{...imgStyle, filter: photoFilter}} />}
          {/* the dim around the highlights: the photo layer with a hole per box (even-odd) */}
          {holes.length ? (
            <svg width={bw} height={bh} style={{position: 'absolute', left: 0, top: 0, opacity: dimT}}>
              <path
                fillRule="evenodd"
                fill={rgba(light ? C.bg : C.shade, light ? 0.3 : 0.36)} /* a light fog on paper: the photo stays readable */
                d={`M0 0H${bw}V${bh}H0Z ` + holes.map(({b}) => {
                  const r = local(b);
                  return `M${r.left} ${r.top}h${r.width}v${r.height}h${-r.width}Z`;
                }).join(' ')}
              />
            </svg>
          ) : null}
          {active.map(({b, i, a}) => {
            const fill = b.fill ?? 'tone';
            const r = local(b);
            const k = prog(frame, a, 10);
            const inset = `inset(${r.top}px ${bw - r.left - r.width}px ${bh - r.top - r.height}px ${r.left}px round ${HL_R / z}px)`;
            // a framed box is cut hard at its border; a spot fades out softly inside its box (an ellipse)
            const spot = b.outline === false;
            const spotMask = 'radial-gradient(closest-side, #000 45%, transparent 100%)';
            const cut: React.CSSProperties = spot
              ? {
                  WebkitMaskImage: spotMask,
                  maskImage: spotMask,
                  WebkitMaskSize: `${r.width}px ${r.height}px`,
                  maskSize: `${r.width}px ${r.height}px`,
                  WebkitMaskPosition: `${r.left}px ${r.top}px`,
                  maskPosition: `${r.left}px ${r.top}px`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                }
              : {clipPath: inset, WebkitClipPath: inset};
            const tl = toneLine(b.tone ?? 'accent');
            return (
              <React.Fragment key={i}>
                {fill !== 'none' && layer !== 'text' ? (
                  <Img
                    src={fileOf(p.src)}
                    style={{
                      ...imgStyle,
                      ...cut,
                      opacity: k,
                      filter: fill === 'tone' ? `url(#${idp}-t${i})` : light ? undefined : 'contrast(1.05)',
                    }}
                  />
                ) : null}
                {b.outline === false ? null : <div
                  style={{
                    position: 'absolute',
                    ...r,
                    boxSizing: 'border-box',
                    border: `${3 / z}px solid ${tl}`,
                    borderRadius: HL_R / z,
                    opacity: k,
                    transform: `scale(${1.04 - 0.04 * spr(frame, a)})`,
                    boxShadow: `0 0 ${24 / z}px ${halo(tl, 0.33)}`,
                  }}
                />}
              </React.Fragment>
            );
          })}
        </div>
        {/* grain: the frame's pixel size (the stage is scaled by STAGE.s), never scaled by the camera */}
        {tile && grain > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${tile})`,
              backgroundSize: `${TILE / STAGE.s}px ${TILE / STAGE.s}px`,
              backgroundPosition: `${Math.floor(rand(gStep * 3.3 + 0.7) * TILE)}px ${Math.floor(rand(gStep * 5.9 + 0.1) * TILE)}px`,
              opacity: (light ? 0.34 : 0.5) * grain,
              mixBlendMode: 'soft-light',
            }}
          />
        ) : null}
        {/* a hairline edge for the plate (a print's edge where the photo meets the field) */}
        {!bleed ? <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 1px ${rgba(C.ink, light ? 0.1 : 0.12)}`}} /> : null}
      </div>

      {/* labels: constant size, riding the box's top-left corner (under it when the box is high) */}
      {active.map(({b, i, a}) => {
        if (!b.label) return null;
        const s = onStage(b);
        const tone = b.tone ?? 'accent';
        const toned = tone !== 'neutral';
        const shown = mtav(capsLatin(b.label));
        const size = T.label;
        const w = textWidth(shown, `400 ${size}px ${F.mono}`, 0.05 * size) + 24;
        const h = size + 16;
        const above = s.y - h >= Math.max(view.y, L.contentTop) + 4;
        const x = clamp(s.x, Math.max(view.x, L.side), Math.min(view.x + view.w, L.safeRight) - w);
        const y = clamp(above ? s.y - h + 1 : s.y + s.h - 1, Math.max(view.y, L.contentTop), Math.min(view.y + view.h, L.contentBottom) - h);
        const at = a + 6;
        const k = prog(frame, at, 6);
        return (
          <div
            key={`label${i}`}
            className={TXT}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              height: h,
              padding: '0 12px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              background: toned ? toneLine(tone) : C.strip,
              color: toned ? C.onInk : C.onStrip,
              fontFamily: F.mono,
              fontSize: size,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              opacity: k,
              transformOrigin: above ? 'left bottom' : 'left top',
              transform: `scaleY(${0.6 + 0.4 * k})`,
            }}
          >
            <span style={{visibility: 'hidden'}}>{shown}</span>
            <span style={{position: 'absolute', left: 12}}>{typeOn(shown, frame, at, 1.2)}</span>
            <TypeSfx text={shown} at={at} cpf={1.2} volume={0.26} />
          </div>
        );
      })}

      {/* cover: a small tag and the pollar strips over the lower part of the photo */}
      {cover && p.kicker ? (
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: L.side,
            top: stripsTop - 52,
            padding: '5px 10px',
            background: C.bg,
            color: C.ink2,
            fontFamily: F.mono,
            fontSize: 24,
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            opacity: prog(frame, ent, 10),
          }}
        >
          {mtav(capsLatin(p.kicker))}
        </div>
      ) : null}
      {cover
        ? strips.map((s, li) => {
            const start = stripStart(s, li);
            const toned = Boolean(s.tone && s.tone !== 'neutral');
            // a light strip (Title's: the light strip on the black film, a white card on paper) on a dark
            // photo; on a light photo the dark strip (the field on the black film, ink on paper)
            const bg = toned ? toneBig(s.tone) : lightStrips ? C.strip : light ? C.ink : C.bg;
            const fg = toned ? C.onInk : lightStrips ? C.onStrip : light ? C.bg : C.ink;
            const stripP = prog(frame, start, 8);
            const words = s.text.split(' ');
            return (
              <div
                key={`strip${li}`}
                style={{
                  position: 'absolute',
                  top: stripsTop + li * sLineH,
                  left: L.side - STRIP_OUT,
                  fontFamily: F.sans,
                  fontWeight: 600,
                  fontSize: sSize,
                  lineHeight: 1.12,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  color: fg,
                }}
              >
                <span style={{position: 'relative', display: 'inline-block', padding: `4px ${STRIP_PAD}px 10px`}}>
                  <span style={{position: 'absolute', inset: 0, background: bg, transformOrigin: 'left center', transform: `scaleX(${stripP})`}} />
                  {words.map((w, wi) => {
                    const k = spr(frame, start + 4 + wi * 2);
                    return (
                      <span key={wi} className={TXT} style={{position: 'relative', display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 24}px)`, marginRight: wi < words.length - 1 ? sSize * 0.26 : 0}}>
                        {w}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })
        : null}

      {/* caption and source: mono, typed on */}
      {p.caption ? (
        <MonoLine text={p.caption} at={base + 18} x={bleed ? L.side : view.x} y={capTop} maxW={bleed ? CAPTION_MAX_W : view.w} color={C.ink2} size={T.label} sfx={0.26} />
      ) : null}
      {p.source ? (
        <MonoLine
          text={p.source}
          at={base + 24}
          x={bleed ? L.side : view.x}
          y={capTop + (p.caption ? CAP_LINE : 0)}
          maxW={bleed ? CAPTION_MAX_W : view.w}
          color={C.ink3}
          size={T.source}
          sfx={p.caption ? false : 0.22}
        />
      ) : null}

      {/* ---- sound ---- */}
      {p.shutter && base + 2 >= 0 ? <Sfx name="asmr-camera" at={base + 2} volume={0.4} /* event: the photo is taken */ /> : null}
      {boxes.map(({b, a}, n) => (
        <React.Fragment key={`hls${n}`}>
          {/* event: the camera eases in on the box (28 frames) */}
          {b.push && b.push > 1.05 && a - 10 >= 0 ? <Sfx name="asmr-air-long" at={a - 10} volume={0.26} len={40} fade={12} /> : null}
          {/* event: a highlight lands: a soft real click and a haptic in its data tone */}
          <Sfx name="cc0-click-soft" at={a} volume={0.5} />
          <Haptic kind={toneHaptic(b.tone ?? 'accent', n === 0 ? 'light' : 'selection')} at={a} volume={n === 0 ? 0.4 : 0.34} />
        </React.Fragment>
      ))}
      {cover
        ? strips.map((s, li) => {
            // a strip that waits for its own word swipes in with a sound; strips rising with the cut are silent
            const start = stripStart(s, li);
            if (start <= ent + 4 + li * 5) return null;
            return (
              <React.Fragment key={`ss${li}`}>
                <Sfx name="asmr-strike" at={start} volume={0.4} len={11} />
                <Haptic kind={toneHaptic(s.tone)} at={start + 4} volume={s.tone === 'down' ? 0.32 : 0.36} />
              </React.Fragment>
            );
          })
        : null}
    </>
  );
};
