import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {rand} from '../lib/anim';
import {C, H, isLight, L, rgba, W} from '../tokens';

// The VHS look over the whole frame, after the owner's reference reel (2026-09-24: "why isn't the
// glitch effect there?"), kept SHARP (2026-09-24: "ვიდეო შარპენ იყოს"): nothing here blurs the picture.
//   - chromatic aberration: part of red moves left and part of blue right, green stays. The part that
//     moves is only THICK, BRIGHT structure: the picture band is opened and closed first (a 3 px box
//     for the film's own polarity, 3 px along x for the other), so a line or a stroke 2 px or thinner
//     (the wireframe cars, hairlines, the small text on an app screen) never splits into three
//     coloured lines, and a threshold keeps dim greys out of it. What splits: big letters, digits, the
//     phone's screen edges, the end card's mark. The shift is whole pixels (3 px over the picture, 1 px
//     on the meta bar and the subtitle line), so nothing is resampled; the result is
//     src + shifted(m) - m, which leaves every flat area and the black field exactly as they were.
//   - scanlines: a 4 px pitch drawn as [light, dark, dark, light] rows, a pure 4 px sinusoid with no
//     2 px component: the old 1 px line every 4 px aliased into moire on phones after Instagram's
//     re-encode (its 2 px harmonic folds into a beat when the frame is scaled down). Darkening only
//     (black stays black), half strength on the text bands of the dark film.
//   - noise: a seeded grey tile in soft-light (leaves 0 at 0), moving every 2 frames; faint on purpose
//     (a stronger grain multiplied the file size, see `noise`).
//   - no bloom (it was an 8 px blur of everything bright: a haze around every letter).
//   - GLITCHES, short (3..5 frames), ONLY ON CUTS: most cuts get one (a frame before the cut to a few
//     after). The mid-shot glitch is gone (2026-09-24: it tore "$15,391" inside a highlight in v11 at
//     14.0 s). A glitch is a few horizontal slices of the picture thrown sideways, a chroma jump (the
//     split x2.6 for its first frames) and a tracking band (a thin strip of noise with a bright edge).
//     The slices of one glitch are chosen once and their offset eases in and out, so consecutive frames
//     stay alike: tools/flicker.py (which flags a frame unlike BOTH neighbours, a parallel render's
//     dropped layer) does not mistake a glitch for a broken frame. Only the slices are displaced (a
//     mask): the rest of the frame is never resampled, not even by the map's neutral grey.
//   - a soft tracking wobble: a band slides a few px and settles (6 frames, once in a 4 s window at most).
// Every glitch, wobble and band stays in the PICTURE band (frame y 328..1284, between the meta bar and
// the subtitle line): never across a word the viewer is reading. Nothing happens in the first 8
// frames (frame 0 is the cover and the loop point) nor on the end card after its cut.
//
// amount 0..1 (spec "vhs"): 0.5 is the reference reel's look (VHS_DEFAULT 0.38 is a little weaker, the
// owner 2026-09-24), 1 is twice as strong, 0 renders
// the children untouched. Light theme: lighter scanlines, the same fringe (on paper the thick DARK
// strokes are what the opening/closing keeps), noise and glitches.
// Cost: one SVG filter over the frame (six morphology passes over the picture band, no blur). Measured
// on v11 (541 frames, PNG capture): 51 s with the old filter (bloom), 58 s with every pass along x only,
// 72 s with all of them 3x3; this mix sits between. The bloom's blur is gone, the morphology is new.

const TILE = 256;
const useNoiseTile = () =>
  useMemo(() => {
    if (typeof document === 'undefined') return '';
    const cv = document.createElement('canvas');
    cv.width = TILE;
    cv.height = TILE;
    const ctx = cv.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(TILE, TILE);
    for (let i = 0; i < TILE * TILE; i++) {
      const v = Math.floor(rand(i + 1) * 255);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }, []);

const EDGE = 8; // px of field the filter sees past the frame's left and right edges
// frame px: the picture band, between the meta bar (its caps end at ~296) and the subtitle band (the
// line is centred on L.subtitleY = 1340; a 66 px silent line with its descenders spans ~1290..1400)
export const WOBBLE_TOP = L.metaY + 60; // 328
export const WOBBLE_BOTTOM = L.subtitleY - 56; // 1284
const P0 = WOBBLE_TOP;
const P1 = WOBBLE_BOTTOM;

// ---- the soft tracking wobble -------------------------------------------------------------------
const PERIOD = 120; // frames between wobbles, on average
const LEN = 6; // frames a wobble lasts
const ROLL = 7; // px the band rolls down per frame
const PROFILE = [0.15, 0.4, 0.7, 0.9, 1, 0.9, 0.7, 0.4, 0.15]; // 9 slices of 14 px
const SLICE = 14;
const ABOVE = (PROFILE.length / 2) * SLICE;
const BELOW = (PROFILE.length / 2) * SLICE + ROLL * (LEN - 1);

/** The wobble at `frame`: null, or its band (centre y, px), envelope 0..1 and direction. Never in
 *  the first 2 s (the hook, the cover), never within 8 frames of a cut, never on the end card. */
export const wobbleAt = (frame: number, total: number, cuts: number[] = [], quietFrom = total - 30) => {
  const k = Math.floor(frame / PERIOD);
  const start = k * PERIOD + 20 + Math.floor(rand(k * 5.17 + 1.3) * (PERIOD - 20 - LEN));
  const t = frame - start;
  if (t < 0 || t >= LEN || start < 60 || start + LEN > Math.min(total - 30, quietFrom)) return null;
  if (cuts.some((c) => c > start - 8 && c < start + LEN + 8)) return null;
  const env = Math.sin((Math.PI * (t + 0.5)) / LEN); // soft in, soft out
  const y0 = P0 + ABOVE;
  const y = y0 + rand(k * 3.71 + 0.9) * (P1 - BELOW - y0) + t * ROLL;
  const dir = rand(k * 9.13 + 2.1) < 0.5 ? -1 : 1;
  return {y, env, dir};
};

// ---- glitches ----------------------------------------------------------------------------------------
// a glitch's strength over its frames, by its length: it eases in and out, never strobes
const ENV: Record<number, number[]> = {2: [0.8, 0.6], 3: [0.6, 1, 0.5], 4: [0.55, 1, 0.8, 0.4], 5: [0.55, 1, 0.85, 0.6, 0.35]};

type Glitch = {t: number; len: number; seed: number; cut: boolean};

/** The glitch at `frame`: most cuts (4 in 5, seeded by the cut) glitch from the frame before the cut
 *  for 3..5 frames. Never mid-shot (a torn word in the middle of a shot reads as a broken file), none
 *  in the first 8 frames, none on the end card after its cut. */
export const glitchAt = (frame: number, total: number, cuts: number[] = [], quietFrom = total): Glitch | null => {
  if (frame < 8) return null;
  for (const c of cuts) {
    if (rand(c * 1.37 + 5.1) > 0.8) continue;
    const len = 3 + Math.floor(rand(c * 2.11 + 0.7) * 3);
    const t = frame - (c - 1);
    if (t >= 0 && t < len && c < quietFrom) return {t, len, seed: c * 7.31 + 0.5, cut: true}; // the end card's cut stays clean (a torn mark read as a fault)
  }
  return null;
};

type Band = {y: number; h: number; dx: number};
const MAX_SLICES = 9; // the wobble's 9 strips, or a glitch's 6 slices and its tracking band
const DSCALE = 128; // px of displacement at a full channel swing (a slice moves at most ~60 px)

/** The slices one glitch throws sideways (the same slices on every frame of it) and its tracking band. */
const glitchShape = (g: Glitch, k: number) => {
  const r = (i: number) => rand(g.seed * 13.1 + i * 7.77);
  const env = (ENV[g.len] ?? ENV[5])[Math.min(g.t, g.len - 1)];
  const n = 3 + Math.floor(r(1) * 4); // 3..6 slices
  const bands: Band[] = [];
  for (let i = 0; i < n; i++) {
    const h = Math.round(10 + r(10 + i) * 70);
    const y = Math.round(P0 + r(20 + i) * (P1 - P0 - h));
    const dir = r(30 + i) < 0.5 ? -1 : 1;
    const jitter = (rand(g.seed * 5.3 + i * 3.1 + g.t * 1.7) - 0.5) * 3; // a little life between frames
    bands.push({y, h, dx: (dir * (14 + r(40 + i) * 40) * env + jitter) * k});
  }
  const trackH = Math.round(12 + r(50) * 18);
  const track = r(51) < 0.75 ? {y: Math.round(P0 + r(52) * (P1 - P0 - trackH - 24) + g.t * 4), h: trackH, dx: (r(53) < 0.5 ? -1 : 1) * (6 + r(54) * 10) * env * k} : null;
  return {bands, track, env, jump: g.t < 2 ? 2.6 : 1};
};

type Props = {
  amount: number;
  total: number; // frames in the film
  cuts?: number[]; // scene cut frames: glitches land on most of them, the wobble keeps away
  quietFrom?: number; // the end card's first frame: nothing after it
  children: React.ReactNode;
};

export const VHS: React.FC<Props> = ({amount, total, cuts = [], quietFrom, children}) => {
  const frame = useCurrentFrame();
  const tile = useNoiseTile();
  const a = Math.max(0, Math.min(1, amount));
  const id = 'vinari-vhs';
  if (a <= 0) return <AbsoluteFill style={{backgroundColor: C.bg}}>{children}</AbsoluteFill>;

  const k = a / 0.5; // 1 at the default: the reference reel's strength
  const light = isLight();
  const quiet = quietFrom ?? total;
  const g = glitchAt(frame, total, cuts, quiet);
  const G = g ? glitchShape(g, k) : null;
  // whole pixels only: a fractional offset is resampled, and a resampled channel is a soft channel
  const splitA = Math.min(EDGE - 1, Math.round(2.5 * k * (G ? G.jump : 1))); // px over the picture (3 at the default)
  const splitB = Math.max(1, Math.min(2, Math.round(k))); // px on the meta bar and the subtitle line
  const mix = Math.min(0.8, 0.4 + 0.1 * k); // share of red / blue that moves (the rest keeps an edge white at its core)
  const THR = 0.3; // only what is brighter than this moves (on paper: the paper around a thick dark stroke)
  const gain = mix / (1 - THR);
  const rOpen = light ? '1 0' : '1'; // removes thin bright features (full 3x3 on the dark film)
  const rClose = light ? '1' : '1 0'; // removes thin dark features (full 3x3 on paper)
  // scanlines: rows [lo, hi, hi, lo] of darkening in every 4 px: a pure 4 px sinusoid (no 2 px
  // harmonic, so a phone's downscale has nothing to fold into moire). Mean darkening about 11 % on the
  // dark film (the old 1 px line took about 9.5 %, a soft 4 px ramp at 0.3 took 15 % and the cars looked dim)
  const scanLo = Math.min(0.3, (light ? 0.01 : 0.02) * k);
  const scanHi = Math.min(0.6, (light ? 0.07 : 0.2) * k);
  // soft-light grain. Kept low on purpose: at 0.42 x264 had to code it and a 21 s film grew from 3 MB
  // to 38 MB (v10, light) and rendered 20 % slower; at this level the look is the fringe, the lines
  // and the glitches, and the files stay small
  const noise = Math.min(0.4, (light ? 0.15 : 0.2) * k);
  const wob = g ? null : wobbleAt(frame, total, cuts, quiet);
  const amp = wob ? 9 * k * wob.env * wob.dir : 0;

  const step = Math.floor(frame / 2);
  const ox = Math.floor(rand(step * 3.1 + 0.2) * TILE);
  const oy = Math.floor(rand(step * 7.7 + 0.4) * TILE);
  const X = -EDGE;
  const WW = W + 2 * EDGE;
  // Slices (the wobble's soft band, a glitch's slices and its tracking band) are ONE displacement
  // map over the picture: a neutral grey field with a flat grey strip per slice (its grey = how far it
  // moves), read by a single feDisplacementMap, and only the strips of the displaced copy are kept (the
  // same floods, merged without the field, are the mask). The filter keeps the same shape on every
  // frame (idle: the strips sit at 1 px, the scale is 0). Adding and removing primitives rebuilt the
  // filter on the first frame of a wobble or a glitch, and those were the frames a parallel render wrote
  // tiled (v10 f195, v1 f266, 2026-09-24).
  const bands: Band[] = wob ? PROFILE.map((w, i) => ({y: Math.round(wob.y + (i - PROFILE.length / 2) * SLICE), h: SLICE, dx: amp * w})) : [...(G ? G.bands : []), ...(G && G.track ? [G.track] : [])];
  const strips: Band[] = Array.from({length: MAX_SLICES}, (_, i) => bands[i] ?? {y: P0, h: 1, dx: 0});
  // displacement: P'(x) = P(x + scale * (R - 0.5)), so a strip moving content by dx carries R = 0.5 - dx / scale
  const grey = (dx: number) => `rgb(${Math.max(0, Math.min(255, Math.round(127.5 - (255 * dx) / DSCALE)))},128,128)`;
  const shade = (x: number) => rgba(C.shade, x);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
        {/* the region reaches EDGE px past the frame's sides, over the layer's own field-coloured
            margin (the box shadow below): the channels shifted at the frame edge then pick up the field */}
        <filter id={id} x={X} y={0} width={WW} height={H} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          {/* m, the part that moves: the picture opened then closed with a 3 px box, so every feature
              2 px or thinner (bright on black, or dark on a bright screen / paper) is gone from it, then
              only what is brighter than THR, scaled to `mix` at full white (R and B; G never moves) */}
          {/* (the morphology is the filter's main cost, so it runs over the picture band only, where the
              thin lines are, and in full 3x3 only for the film's own polarity: thin BRIGHT lines on the
              dark film (opening), thin DARK lines on paper (closing); the other one runs along x only,
              which still clears every vertical and steep stroke, the ones a sideways split smears. The
              text bands above and below take the plain threshold: their split is 1 px and the
              subtitle's strokes are thick) */}
          <feMorphology in="SourceGraphic" operator="erode" radius={rOpen} x={X} y={P0} width={WW} height={P1 - P0} result="e1" />
          <feMorphology in="e1" operator="dilate" radius={rOpen} x={X} y={P0} width={WW} height={P1 - P0} result="o1" />
          <feMorphology in="o1" operator="dilate" radius={rClose} x={X} y={P0} width={WW} height={P1 - P0} result="d2" />
          <feMorphology in="d2" operator="erode" radius={rClose} x={X} y={P0} width={WW} height={P1 - P0} result="smA" />
          <feOffset in="SourceGraphic" dx={0} dy={0} x={X} y={0} width={WW} height={P0} result="smT" />
          <feOffset in="SourceGraphic" dx={0} dy={0} x={X} y={P1} width={WW} height={H - P1} result="smS" />
          <feMerge result="sm">
            <feMergeNode in="smT" />
            <feMergeNode in="smA" />
            <feMergeNode in="smS" />
          </feMerge>
          <feColorMatrix in="sm" type="matrix" values={`${gain} 0 0 0 ${-gain * THR}  0 0 0 0 0  0 0 ${gain} 0 ${-gain * THR}  0 0 0 0 1`} result="mv" />
          <feColorMatrix in="mv" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="r" />
          <feColorMatrix in="mv" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1" result="b" />
          {/* red moves left, blue right: wider over the picture than on the text bands above and below */}
          <feOffset in="r" dx={-splitA} x={X} y={P0} width={WW} height={P1 - P0} result="rA" />
          <feOffset in="r" dx={-splitB} x={X} y={0} width={WW} height={P0} result="rT" />
          <feOffset in="r" dx={-splitB} x={X} y={P1} width={WW} height={H - P1} result="rS" />
          <feOffset in="b" dx={splitA} x={X} y={P0} width={WW} height={P1 - P0} result="bA" />
          <feOffset in="b" dx={splitB} x={X} y={0} width={WW} height={P0} result="bT" />
          <feOffset in="b" dx={splitB} x={X} y={P1} width={WW} height={H - P1} result="bS" />
          <feMerge result="ro">
            <feMergeNode in="rT" />
            <feMergeNode in="rA" />
            <feMergeNode in="rS" />
          </feMerge>
          <feMerge result="bo">
            <feMergeNode in="bT" />
            <feMergeNode in="bA" />
            <feMergeNode in="bS" />
          </feMerge>
          <feComposite in="ro" in2="bo" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="rb" />
          {/* out = src + shifted(m) - m. Every image stays opaque (alpha 1), so the difference is carried
              around 128/255 (exact in 8 bits): d = shifted(m) + (1 - m) - 127/255, out = src + d - 128/255.
              Where nothing moves (a flat area, the black field, green) d is exactly 128/255 and the
              picture comes out untouched; the moved light never adds up past what was there */}
          <feColorMatrix in="mv" type="matrix" values="-1 0 0 0 1  0 0 0 0 1  0 0 -1 0 1  0 0 0 0 1" result="keep" />
          <feComposite in="rb" in2="keep" operator="arithmetic" k1={0} k2={1} k3={1} k4={-127 / 255} result="d" />
          <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1={0} k2={1} k3={1} k4={-128 / 255} result="lit" />
          {/* the slices: a displacement map (neutral field + one strip per slice), read once; only the
              strips of the displaced copy are laid over the picture */}
          <feFlood x={X} y={0} width={WW} height={H} floodColor="rgb(128,128,128)" result="k0" />
          {strips.map((s, i) => (
            <feFlood key={`k${i}`} x={X} y={s.y} width={WW} height={s.h} floodColor={grey(s.dx)} result={`k${i + 1}`} />
          ))}
          <feMerge result="map">
            <feMergeNode in="k0" />
            {strips.map((_, i) => (
              <feMergeNode key={`n${i}`} in={`k${i + 1}`} />
            ))}
          </feMerge>
          <feMerge result="mask">
            {strips.map((_, i) => (
              <feMergeNode key={`q${i}`} in={`k${i + 1}`} />
            ))}
          </feMerge>
          <feDisplacementMap in="lit" in2="map" scale={bands.length ? DSCALE : 0} xChannelSelector="R" yChannelSelector="G" result="moved" />
          <feComposite in="moved" in2="mask" operator="in" result="slices" />
          <feMerge>
            <feMergeNode in="lit" />
            <feMergeNode in="slices" />
          </feMerge>
        </filter>
      </svg>
      <AbsoluteFill style={{backgroundColor: C.bg, boxShadow: `0 0 0 ${EDGE}px ${C.bg}`, filter: `url(#${id})`}}>{children}</AbsoluteFill>
      {/* scanlines: rows [lo, hi, hi, lo] every 4 px, hard stops on whole pixels (exact per row),
          darkening only (the shade: black on the dark film, ink on paper); half strength on the meta
          bar and the subtitle line */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(180deg, ${shade(scanLo)} 0px, ${shade(scanLo)} 1px, ${shade(scanHi)} 1px, ${shade(scanHi)} 3px, ${shade(scanLo)} 3px, ${shade(scanLo)} 4px)`,
          // on black the lines only show on what is drawn, so the text bands can take half; on paper
          // the field itself carries them, and a lighter band would read as a stripe: uniform there
          WebkitMaskImage: light ? undefined : `linear-gradient(180deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) ${P0 - 24}px, #000 ${P0}px, #000 ${P1}px, rgba(0,0,0,0.5) ${P1 + 24}px, rgba(0,0,0,0.5) ${H}px)`,
        }}
      />
      {/* noise: soft-light leaves black at black */}
      {tile ? (
        <AbsoluteFill style={{pointerEvents: 'none', backgroundImage: `url(${tile})`, backgroundPosition: `${ox}px ${oy}px`, opacity: noise, mixBlendMode: 'soft-light'}} />
      ) : null}
      {/* the tracking band: a thin strip of noise with a bright top edge, only while a glitch runs */}
      {G && G.track && tile ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: G.track.y,
            height: G.track.h,
            pointerEvents: 'none',
            backgroundImage: `url(${tile})`,
            backgroundPosition: `${(ox * 3) % TILE}px ${oy}px`,
            backgroundSize: `${TILE}px ${Math.max(4, Math.round(G.track.h / 3))}px`,
            opacity: Math.min(0.6, 0.3 * k * G.env),
            mixBlendMode: light ? 'multiply' : 'screen',
            borderTop: `1px solid ${rgba(light ? C.shade : C.ink, 0.35 * G.env)}`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
