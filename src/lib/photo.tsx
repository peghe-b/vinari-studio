import React, {useMemo} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import CATALOG from '../../public/photos/photos.json';
import {C, F, isLight, p2, rgba, STAGE} from '../tokens';
import {ease, prog, rand} from './anim';
import {mtav} from './format';
import {polished} from './guardrt';
import {TXT, useLayer} from './layer';
import {textWidth} from './measure';

// ---- photos for the story scenes (PhotoStory, Split, Timeline, a KineticHeadline or BigNumber background, Twist) ------
// The catalogue is public/photos/photos.json: every file's pixel size, mean luminance and what it shows, and for the
// archival photos (Wikimedia Commons and other open archives, curated on the Mac only: the cloud never downloads) the
// licence fields: "license" (PD-..., CC0, CC BY x.x, CC BY-SA x.x), "author", "source" (the file page), "credit" (the
// line the film shows and the post repeats, no dashes: "ფოტო: <author> · <licence> · Wikimedia Commons", plus
// " · დამუშავებული" when the licence asks to mark changes: our grade is one), "modified", "people", "subject" (a
// vetted outline in photo fractions, for PhotoStory's depth split), "brand" (a sponsor's wordmark on the subject: only
// whole, as a PhotoStory print). A file without "license" is one of the 41
// Unsplash photos (no credit needed: public/photos/LICENSES.md). tools/build-index.mjs refuses a story scene's photo
// that has a licence needing attribution but no credit, and a photo not in the catalogue.

export type PhotoInfo = {
  w: number;
  h: number;
  lum?: number;
  shows?: string;
  license?: string;
  author?: string;
  source?: string;
  credit?: string;
  modified?: boolean;
  people?: boolean;
  subject?: [number, number][];
  /** a sponsor's wordmark on the subject: shown only whole, as a PhotoStory print (tools/ci/stories.mjs brandProblems) */
  brand?: string;
};
const PHOTOS = CATALOG as unknown as Record<string, PhotoInfo>;
export const photoKey = (src: string) => src.replace(/^photos\//, '').replace(/\.jpe?g$/i, '');
export const photoInfo = (src: string): PhotoInfo | null => PHOTOS[photoKey(src)] ?? null;
export const photoFile = (src: string) => (/[/.]/.test(src) ? staticFile(src) : staticFile(`photos/${src}.jpg`));
/** The credit line a photo needs on screen ('' = none: an Unsplash file, public domain, CC0). */
export const photoCredit = (src: string) => {
  const i = photoInfo(src);
  if (!i?.license) return '';
  return i.credit ?? '';
};

export type Rect = {x: number; y: number; w: number; h: number};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Cover-fit: where the photo sits in `view` at zoom z (1 = it just covers) centred on photo point (u, v), clamped so it
 *  always covers the view. */
export const placePhoto = (view: Rect, img: {w: number; h: number}, z: number, u: number, v: number): Rect => {
  const s0 = Math.max(view.w / img.w, view.h / img.h);
  const w = img.w * s0 * z;
  const h = img.h * s0 * z;
  return {
    x: clamp(view.x + view.w / 2 - u * w, view.x + view.w - w, view.x),
    y: clamp(view.y + view.h / 2 - v * h, view.y + view.h - h, view.y),
    w,
    h,
  };
};

// ---- the grade (Photo's duotone, a little harder for the "aura" look) ----------------------------------------------
const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix3 = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const curve = (x: number, contrast: number, gamma: number, bp = 0.035) => {
  let y = clamp((x - bp) / (0.965 - bp), 0, 1);
  y = Math.pow(y, gamma);
  const s = y * y * (3 - 2 * y);
  return clamp(y + (s - y) * Math.min(1, 0.6 * contrast), 0, 1);
};
const tables = (lo: number[], hi: number[], contrast: number, gamma: number, bp?: number) =>
  [0, 1, 2].map((ch) =>
    Array.from({length: 33}, (_, i) => {
      const y = curve(i / 32, contrast, gamma, bp);
      return (lo[ch] + (hi[ch] - lo[ch]) * y).toFixed(4);
    }).join(' '),
  );
export type Grade = 'mono' | 'archival' | 'color';
/** The duotone tables of the film's look: black to (nearly) the ink on the dark film; ink printed on the paper. `dark`
 *  darkens the light end (a background plane, a dimmed photo under text). */
export const gradeTables = (contrast: number, dark = 1) => {
  const field = rgb(C.bg);
  const ink = rgb(C.ink);
  if (isLight()) return tables(mix3(field, ink, 0.9 * dark), field, contrast, 1.12);
  return tables(field, mix3(field, ink, 0.94 * dark), contrast, 1);
};
export const Duotone: React.FC<{id: string; t: string[]}> = ({id, t}) => (
  <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
    <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
    <feComponentTransfer>
      <feFuncR type="table" tableValues={t[0]} />
      <feFuncG type="table" tableValues={t[1]} />
      <feFuncB type="table" tableValues={t[2]} />
    </feComponentTransfer>
  </filter>
);

// ---- grain: a seeded grey tile under soft-light (black stays black), the frame's pixel size ----------------------------
const TILE = 256;
export const useGrainTile = () =>
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
/** A grain layer over a view (changes every 2 frames, so tools/flicker.py sees steps, never spikes). */
export const Grain: React.FC<{amount: number; tile: string; seed?: number}> = ({amount, tile, seed = 0}) => {
  const frame = useCurrentFrame();
  if (!tile || amount <= 0) return null;
  const step = Math.floor(frame / 2);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${tile})`,
        backgroundSize: `${TILE / STAGE.s}px ${TILE / STAGE.s}px`,
        backgroundPosition: `${Math.floor(rand(step * 3.3 + 0.7 + seed) * TILE)}px ${Math.floor(rand(step * 5.9 + 0.1 + seed) * TILE)}px`,
        opacity: (isLight() ? 0.34 : 0.5) * amount,
        mixBlendMode: 'soft-light',
        pointerEvents: 'none',
      }}
    />
  );
};

/** The vignette inside a photo's view (the dark film only: never on the field). */
export const Vignette: React.FC<{amount: number}> = ({amount}) =>
  amount > 0 && !isLight() ? (
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 70% at 50% 46%, transparent 58%, ${rgba(C.shade, amount)} 100%)`, pointerEvents: 'none'}} />
  ) : null;

/** A neutral light passing over the photo (the dark film only): a 900 px band sweeping across in 22 frames. */
export const LightLeak: React.FC<{at: number | null; width: number}> = ({at, width}) => {
  const frame = useCurrentFrame();
  if (at === null || isLight()) return null;
  const k = prog(frame, at, 22, ease.camera);
  if (k <= 0 || k >= 1) return null;
  const x = -900 + (width + 900) * k;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: x,
        width: 900,
        background: `linear-gradient(105deg, transparent 0%, ${rgba(C.sheen, 0.22)} 50%, transparent 100%)`,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

type PlateProps = {
  src: string;
  id: string; // a unique filter id in the film ("vn-ps-<scene>-<n>")
  view: Rect; // stage px: the clipped window
  z: number; // zoom (1 = cover)
  u: number; // the photo point the framing centres on
  v: number;
  grade?: Grade;
  contrast?: number;
  dark?: number; // 1 = the full grade; < 1 darker (a background plane, a photo under text)
  grain?: number;
  vignette?: number;
  leak?: number | null;
  camera?: React.CSSProperties; // the rig's transform (stage origin), applied to the photo plane
  weave?: boolean; // archival gate weave
  opacity?: number;
  clip?: string; // an extra clip-path on the photo plane (a depth foreground)
  children?: React.ReactNode; // drawn over the photo, inside the view (labels that belong to the picture)
  edge?: boolean; // a hairline print edge
  rect?: Rect; // the photo's own stage rect (overrides z, u, v: a Ken Burns pan, a depth plane)
};

/** One graded photo in a hard-edged view: the Ken Burns framing (z, u, v), the camera on top, the gate weave of an
 *  archival print, grain, the vignette and a light leak. The <Img> is skipped in the text layer (lib/layer.ts). */
export const PhotoPlate: React.FC<PlateProps> = ({src, id, view, z, u, v, grade = 'mono', contrast = 1.25, dark = 1, grain = 0.55, vignette = 0, leak = null, camera, weave, opacity = 1, clip, children, edge, rect}) => {
  const frame = useCurrentFrame();
  const layer = useLayer();
  const tile = useGrainTile();
  const info = photoInfo(src) ?? {w: view.w, h: view.h};
  const R = rect ?? placePhoto(view, info, z, u, v);
  const step = Math.floor(frame / 2);
  const jx = weave ? (rand(step * 2.7 + 1.3) - 0.5) * 1.4 : 0;
  const jy = weave ? (rand(step * 4.1 + 0.9) - 0.5) * 1.4 : 0;
  const flick = weave ? 1 + (rand(step * 6.3 + 2.2) - 0.5) * 0.03 : 1;
  // phase 2 (src/lib/p2.mjs): black and white; a colour photo renders in greyscale (the real app screens keep their colour)
  const colour = grade === 'color';
  const filter = colour ? (p2() ? 'grayscale(1) contrast(1.08)' : isLight() ? undefined : `contrast(${(0.9 + 0.1 * contrast).toFixed(3)})`) : `url(#${id})${flick !== 1 ? ` brightness(${flick.toFixed(4)})` : ''}`;
  const t = gradeTables(grade === 'archival' ? contrast * 1.1 : contrast, dark);
  return (
    <>
      {colour ? null : (
        <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
          <defs>
            <Duotone id={id} t={t} />
          </defs>
        </svg>
      )}
      <div style={{position: 'absolute', left: view.x, top: view.y, width: view.w, height: view.h, overflow: 'hidden', opacity}}>
        {/* a stage-sized frame inside the window, so the camera's origin is in stage px */}
        <div style={{position: 'absolute', left: -view.x, top: -view.y, width: 1080, height: 1920, ...camera}}>
          <div style={{position: 'absolute', left: R.x + jx, top: R.y + jy, width: R.w, height: R.h, clipPath: clip}}>
            {layer === 'text' ? null : <Img src={photoFile(src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', maxWidth: 'none', filter}} />}
          </div>
        </div>
        <Grain amount={grade === 'archival' ? Math.max(grain, 0.7) : grain} tile={tile} />
        <Vignette amount={vignette} />
        <LightLeak at={leak} width={view.w} />
        {edge ? <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 1px ${rgba(C.ink, isLight() ? 0.1 : 0.12)}`}} /> : null}
        {children}
      </div>
    </>
  );
};

export type KBMove = 'push' | 'pull' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'none';
/** The Ken Burns framing at progress p (0..1, any curve: the story scenes use ease.drift, so the move is visibly running
 *  on the cut): push/pull gain `amount` of zoom about `center`; a pan travels `amount` of the view (Photo's maths). */
export const kenBurns = (move: KBMove, view: Rect, img: {w: number; h: number}, amount: number, p: number, center: {x: number; y: number}, z0 = 1): Rect => {
  if (!move.startsWith('pan')) {
    const z = move === 'push' ? z0 * (1 + amount * p) : move === 'pull' ? z0 * (1 + amount * (1 - p)) : z0;
    return placePhoto(view, img, z, center.x, center.y);
  }
  const s0 = Math.max(view.w / img.w, view.h / img.h);
  const bw = img.w * s0;
  const bh = img.h * s0;
  const horiz = move === 'pan-left' || move === 'pan-right';
  const dist = amount * (horiz ? view.w : view.h);
  const need = horiz ? (view.w + dist) / bw : (view.h + dist) / bh;
  const z = Math.max(z0, need) * (1 + 0.015 * p);
  const r = placePhoto(view, img, z, center.x, center.y);
  const dir = move === 'pan-left' || move === 'pan-up' ? 1 : -1;
  if (horiz) {
    const lo = view.x + view.w - r.w;
    const hi = view.x;
    const c = clamp(r.x, lo + dist / 2, hi - dist / 2);
    return {...r, x: clamp(c + dir * (p - 0.5) * dist, lo, hi)};
  }
  const lo = view.y + view.h - r.h;
  const hi = view.y;
  const c = clamp(r.y, lo + dist / 2, hi - dist / 2);
  return {...r, y: clamp(c + dir * (p - 0.5) * dist, lo, hi)};
};

/** The photo credits a licence asks for (CC BY, CC BY-SA): mono 18 on a knockout, in the clean text layer, never moved
 *  by the camera, for as long as the photo is on screen. Several stack upwards from `bottom` (stage y). */
/** The polish guards (POLISH_FROM): big words never sit on a face. On v135-bertha-road "1888" and „ბერტა" covered Bertha's
 *  face in her portrait. A photo the catalogue marks `people` puts the words of a headline, a number or a twist low in
 *  the picture (stage y FACE_SAFE_Y, over the subtitle band: in a portrait the face is in its upper half), and a short
 *  reveal's words keep inside FACE_SAFE_W, clear of the frame's sides. Every other photo and every earlier film as made. */
export const FACE_SAFE_Y = 1130;
export const FACE_SAFE_W = 700;
export const hasPeople = (src: unknown) => {
  if (typeof src !== 'string' || !src) return false;
  const i = (CATALOG as unknown as Record<string, {people?: boolean}>)[src.replace(/^photos\//, '').replace(/\.jpe?g$/i, '')];
  return Boolean(i?.people);
};
/** The words' centre (stage y) over the photo `src`: `y` as made, or FACE_SAFE_Y in a polished film over people. */
export const wordsY = (src: unknown, y: number) => (polished() && hasPeople(src) ? Math.max(y, FACE_SAFE_Y) : y);
/** The words' widest row over the photo `src`: `w` as made, or at most FACE_SAFE_W in a polished film. */
export const wordsW = (src: unknown, w: number) => (polished() && typeof src === 'string' && src ? Math.min(w, FACE_SAFE_W) : w);

export const PhotoCredits: React.FC<{lines: string[]; bottom: number; left?: number; maxW?: number}> = ({lines, bottom, left = 120, maxW = 760}) => {
  const shown = [...new Set(lines.filter(Boolean))].map((t) => mtav(t));
  if (!shown.length) return null;
  // one size for all, so that the longest fits `maxW` (a credit is never cut short)
  const widest = Math.max(1, ...shown.map((t) => textWidth(t, `400 18px ${F.mono}`, 0.36)));
  const fs = widest + 16 > maxW ? Math.max(12, Math.floor((18 * (maxW - 16)) / widest)) : 18;
  // the polish guards (POLISH_FROM): the credit sat on top of the subtitle (v135-bertha-road, 15.5..18 s); a polished film
  // runs it up the picture's right edge instead, reading bottom to top like a press photo's credit, clear of the meta line
  // and of the subtitle band (stage x CREDIT_X, its foot at the picture band's foot less 60)
  if (polished()) {
    const foot = 1320;
    return (
      <>
        {shown.map((t, i) => {
          const len = (textWidth(t, `400 ${fs}px ${F.mono}`, 0.36) || widest) + 16;
          return (
            <div
              key={i}
              className={TXT}
              style={{
                position: 'absolute',
                left: 972 - (fs + 10) * (shown.length - i),
                top: Math.max(400, foot - len),
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                whiteSpace: 'nowrap',
                padding: '8px 3px',
                fontFamily: F.mono,
                fontSize: fs,
                letterSpacing: '0.02em',
                color: C.ink2,
                backgroundColor: rgba(C.bg, 0.55),
              }}
            >
              {t}
            </div>
          );
        })}
      </>
    );
  }
  return (
    <>
      {shown.map((t, i) => (
        <div
          key={i}
          className={TXT}
          style={{
            position: 'absolute',
            left,
            top: bottom - (fs + 12) * (shown.length - i),
            whiteSpace: 'nowrap',
            padding: '3px 8px',
            fontFamily: F.mono,
            fontSize: fs,
            letterSpacing: '0.02em',
            color: C.ink2,
            backgroundColor: rgba(C.bg, 0.55),
          }}
        >
          {t}
        </div>
      ))}
    </>
  );
};
