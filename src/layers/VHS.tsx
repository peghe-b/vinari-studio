import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {rand} from '../lib/anim';
import {C, H, isLight, L, rgba, VHS_DEFAULT, W} from '../tokens';

// The LENS over the graphics (the owner, 2026-09-24, after v11 on Instagram: the even RGB fringe, the
// scanlines and the grain read as blur on a phone; he showed pollar.news's look instead,
// out/pollar-reference-station.png and -paper.webp). Promo puts only the GRAPHICS layer in here (cars,
// charts, phones, maps, cards: lib/layer.ts); the scenes' text, the meta bar and the subtitle are drawn
// above it, untouched.
//   - radial chromatic aberration, like a lens: red is magnified a little, blue shrunk, green stays. The
//     frame's centre is exact; the fringe grows towards the edges and corners, red outside, blue/cyan
//     inside, as in the references. Chrome's feDisplacementMap samples the nearest pixel (measured: a 0.5 px
//     offset moves a 1 px line by a whole pixel, never splits it), so the offsets are whole pixels: R-to-B
//     1 px from 150 px off the centre (x 540, y 930, per axis), then one more every 80 px (230, 310, 390,
//     470), 5 px at most. The moved red and blue are then blurred (sigma 1, SIG) outside the centre only,
//     through a smooth radial weight (0 within 120 px of the centre, 1 from 300 px; a point light over a flat
//     surface gives N.L = z / sqrt(r^2 + z^2), remapped), so a fringe is a soft gradient like pollar's, not
//     three hard strands, and it survives 4:2:0 (a 1 px chroma strand does not). Measured the same way as
//     the references (after our x264 and an Instagram-like CRF 23 re-encode, at the screenshots' scale; red
//     outward, video px): ours 0 / 0.3 / 1.9 / 3.6 / 3.4 at r 0-150 / 150-300 / 300-450 / 450-600 /
//     600-750; pollar's station 0.8 / 1.4 / 2.9 / 3.5 / 3.5; its paper 0.7 / 2.2 / 4.2 / 5.3. The profile is
//     separable (x from x, y from y): two displacement maps built from flat floods (no image to load),
//     integer offsets (the map's greys carry +0.02 px, never a resample).
//   - no scanlines, no grain, no wobble on a still shot: the picture between the cuts is clean.
//   - GLITCHES, short and subtle, ONLY ON CUTS: most cuts get one (the frame before the cut to a few
//     after): 2-4 thin horizontal slices of the graphics thrown sideways (the slices of one glitch are
//     chosen once and their offset eases in and out, so tools/flicker.py never mistakes it for a broken
//     frame), the fringe jumping one pixel wider for 2 frames, and a faint tracking band. Only the
//     graphics tear: the text layer above stays still. Nothing in the first 8 frames (the cover, the loop
//     point) nor on the end card after its cut.
// amount 0..1 (spec "vhs", default VHS_DEFAULT): the fringe's reach scales with it (2x the default
// starts every step at half the distance); 0 renders the children untouched (the cover).
// The filter keeps the same primitives on every frame (only flood colours change): adding primitives on
// a glitch's first frame made a parallel render write tiled frames (v10 f195, v1 f266, 2026-09-24).
// Measured on v11 (541 frames, 2026-09-24, the soft lens): the whole ./make.sh ran in 82 s with the scenes
// rendered twice (lens and text layers), flicker worst 0.04; the mp4 is 4.5 MB at CRF 16 (9.7 MB with the
// old grain and scanlines). Sharpness against the same frame without any effect (12 frames of v11/v12,
// phone size: Lanczos to 924 px and x264 CRF 23), edges kept / edge sharpness: the lens core (frame x
// 370..710, y 740..1120) 99.4 % / 97.2 % (the old VHS 92.9 % / 92.1 %); the centre x 270..810, y 480..1200
// 99.1 % / 93.8 % (94.6 % / 90.8 %).

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

const EDGE = 64; // px of field the filter sees past the frame's edges: more than a channel's offset plus a glitch slice's
// throw (8 px let a torn slice pull in the edge where blue had sampled outside the region: yellow slivers on paper)
// the lens's centre: the frame's centre, a little up towards the picture's own (the content box is
// frame 340..1330, the subtitle below it is text)
export const LENS_CX = 540;
export const LENS_CY = 930;
// distance (frame px, per axis) where the R-to-B split grows one more pixel: red takes the odd steps
// (outward), blue the even ones (inward)
const STEPS = [150, 230, 310, 390, 470];
const R_X = STEPS.filter((_, i) => i % 2 === 0);
const B_X = STEPS.filter((_, i) => i % 2 === 1);
const R_Y = R_X;
const B_Y = B_X;
const SC = 255 / 24; // displacement scale: one pixel = 24 grey levels (offsets up to +-5 px stay in range)
const SIG = 1; // the fringe's softness: the moved red and blue are blurred by this much outside the centre
const LZ = 420; // the point light's height over the frame (the weight's curve)
const W0 = 120; // the weight is 0 within this radius (the centre stays exact) ...
const W1 = 300; // ... and 1 beyond this one
// the band glitches may tear: the picture, between the meta bar and the subtitle line
const P0 = L.metaY + 60; // 328
const P1 = L.subtitleY - 110; // 1390

// ---- glitches ----------------------------------------------------------------------------------------
// a glitch's strength over its frames, by its length: it eases in and out, never strobes
const ENV: Record<number, number[]> = {2: [0.8, 0.6], 3: [0.6, 1, 0.5], 4: [0.55, 1, 0.8, 0.4], 5: [0.55, 1, 0.85, 0.6, 0.35]};

type Glitch = {t: number; len: number; seed: number; cut: boolean};

/** The glitch at `frame`: most cuts (4 in 5, seeded by the cut) glitch from the frame before the cut
 *  for 3..5 frames. Never mid-shot, none in the first 8 frames, none on the end card after its cut. */
export const glitchAt = (frame: number, total: number, cuts: number[] = [], quietFrom = total): Glitch | null => {
  if (frame < 8) return null;
  for (const c of cuts) {
    if (rand(c * 1.37 + 5.1) > 0.8) continue;
    const len = 3 + Math.floor(rand(c * 2.11 + 0.7) * 3);
    const t = frame - (c - 1);
    if (t >= 0 && t < len && c < quietFrom) return {t, len, seed: c * 7.31 + 0.5, cut: true}; // the end card's cut stays clean
  }
  return null;
};

type Band = {y: number; h: number; dx: number};
const MAX_SLICES = 5; // a glitch's slices and its tracking band
const DSCALE = 128; // px of displacement at a full channel swing (a slice moves at most ~30 px)

/** The slices one glitch throws sideways (the same slices on every frame of it) and its tracking band. */
const glitchShape = (g: Glitch, k: number) => {
  const r = (i: number) => rand(g.seed * 13.1 + i * 7.77);
  const env = (ENV[g.len] ?? ENV[5])[Math.min(g.t, g.len - 1)];
  const n = 2 + Math.floor(r(1) * 3); // 2..4 slices
  const bands: Band[] = [];
  for (let i = 0; i < n; i++) {
    const h = Math.round(8 + r(10 + i) * 44);
    const y = Math.round(P0 + r(20 + i) * (P1 - P0 - h));
    const dir = r(30 + i) < 0.5 ? -1 : 1;
    const jitter = (rand(g.seed * 5.3 + i * 3.1 + g.t * 1.7) - 0.5) * 2; // a little life between frames
    bands.push({y, h, dx: (dir * (8 + r(40 + i) * 22) * env + jitter) * k});
  }
  const trackH = Math.round(10 + r(50) * 14);
  const track = r(51) < 0.6 ? {y: Math.round(P0 + r(52) * (P1 - P0 - trackH - 24) + g.t * 4), h: trackH, dx: (r(53) < 0.5 ? -1 : 1) * (4 + r(54) * 6) * env * k} : null;
  return {bands, track, env, jump: g.t < 2 ? 1 : 0};
};

/** Flat strips of one axis: [from, to, pixels] with the channel's step count at that distance. */
const strips = (steps: number[], centre: number, size: number, k: number): [number, number, number][] => {
  const at = steps.map((d) => Math.max(40, d / k));
  const cuts = [...at.map((d) => centre - d).reverse(), ...at.map((d) => centre + d)];
  const edges = [-EDGE, ...cuts.map((c) => Math.round(Math.min(size + EDGE, Math.max(-EDGE, c)))), size + EDGE];
  const n = steps.length;
  const out: [number, number, number][] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const level = i < n ? n - i : i > n ? i - n : 0; // steps outward from the centre strip
    const side = i < n ? -1 : i > n ? 1 : 0;
    if (edges[i + 1] > edges[i]) out.push([edges[i], edges[i + 1], side * level]);
  }
  return out;
};
/** The map's grey for a sampling offset of `d` whole pixels (P'(x) = P(x + SC * (grey/255 - 0.5))): an
 *  integer grey, +0.02 px off the exact offset, so the nearest sample is always the whole pixel meant. */
const grey = (d: number) => Math.max(0, Math.min(255, 128 + Math.round((d * 255) / SC)));

type Props = {
  amount: number;
  total: number; // frames in the film
  cuts?: number[]; // scene cut frames: glitches land on most of them
  quietFrom?: number; // the end card's first frame: nothing after it
  children: React.ReactNode;
};

export const VHS: React.FC<Props> = ({amount, total, cuts = [], quietFrom, children}) => {
  const frame = useCurrentFrame();
  const tile = useNoiseTile();
  const a = Math.max(0, Math.min(1, amount));
  const id = 'vinari-lens';
  if (a <= 0) return <AbsoluteFill style={{backgroundColor: C.bg}}>{children}</AbsoluteFill>;

  const k = a / VHS_DEFAULT; // 1 at the default
  // the blur weight: N.L of the point light at r, remapped so w = 0 at W0 / k and 1 at W1 / k
  const nl = (r: number) => LZ / Math.hypot(r, LZ);
  const v0 = nl(W0 / k);
  const v1 = nl(W1 / k);
  const wa = -1 / (v0 - v1);
  const wb = v0 / (v0 - v1);
  const light = isLight();
  const quiet = quietFrom ?? total;
  const g = glitchAt(frame, total, cuts, quiet);
  const G = g ? glitchShape(g, Math.min(1.6, k)) : null;
  const jump = G ? G.jump : 0; // a glitch's first frames: red one more pixel left, blue one more right

  // the two lens maps: R carries the x offset, G the y offset (the channel is sampled from there)
  const X = -EDGE;
  const Y = -EDGE;
  const WW = W + 2 * EDGE;
  const HH = H + 2 * EDGE;
  // red is magnified: a pixel right of the centre takes its red from the left (offset -step)
  const rx = strips(R_X, LENS_CX, W, k).map(([x0, x1, s]) => [x0, x1, grey(-s + jump)] as const);
  const ry = strips(R_Y, LENS_CY, H, k).map(([y0, y1, s]) => [y0, y1, grey(-s)] as const);
  // blue is shrunk: it samples from further out
  const bx = strips(B_X, LENS_CX, W, k).map(([x0, x1, s]) => [x0, x1, grey(s - jump)] as const);
  const by = strips(B_Y, LENS_CY, H, k).map(([y0, y1, s]) => [y0, y1, grey(s)] as const);

  // glitch slices: ONE displacement map over the lens output (a neutral field plus one strip per
  // slice), and only the strips of the displaced copy are kept (the same floods are the mask)
  const bands: Band[] = G ? [...G.bands, ...(G.track ? [G.track] : [])] : [];
  const slices: Band[] = Array.from({length: MAX_SLICES}, (_, i) => bands[i] ?? {y: P0, h: 1, dx: 0});
  const sgrey = (dx: number) => `rgb(${Math.max(0, Math.min(255, Math.round(127.5 - (255 * dx) / DSCALE)))},128,128)`;

  const step = Math.floor(frame / 2);
  const ox = Math.floor(rand(step * 3.1 + 0.2) * TILE);
  const oy = Math.floor(rand(step * 7.7 + 0.4) * TILE);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
        <filter id={id} x={X} y={Y} width={WW} height={HH} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          {/* the maps: flat strips, x offsets in R, y offsets in G, added together */}
          {rx.map(([x0, x1, v], i) => (
            <feFlood key={`rx${i}`} x={x0} y={Y} width={x1 - x0} height={HH} floodColor={`rgb(${v},0,0)`} result={`rx${i}`} />
          ))}
          <feMerge result="rX">{rx.map((_, i) => <feMergeNode key={i} in={`rx${i}`} />)}</feMerge>
          {ry.map(([y0, y1, v], i) => (
            <feFlood key={`ry${i}`} x={X} y={y0} width={WW} height={y1 - y0} floodColor={`rgb(0,${v},0)`} result={`ry${i}`} />
          ))}
          <feMerge result="rY">{ry.map((_, i) => <feMergeNode key={i} in={`ry${i}`} />)}</feMerge>
          <feComposite in="rX" in2="rY" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="mapR" />
          {bx.map(([x0, x1, v], i) => (
            <feFlood key={`bx${i}`} x={x0} y={Y} width={x1 - x0} height={HH} floodColor={`rgb(${v},0,0)`} result={`bx${i}`} />
          ))}
          <feMerge result="bX">{bx.map((_, i) => <feMergeNode key={i} in={`bx${i}`} />)}</feMerge>
          {by.map(([y0, y1, v], i) => (
            <feFlood key={`by${i}`} x={X} y={y0} width={WW} height={y1 - y0} floodColor={`rgb(0,${v},0)`} result={`by${i}`} />
          ))}
          <feMerge result="bY">{by.map((_, i) => <feMergeNode key={i} in={`by${i}`} />)}</feMerge>
          <feComposite in="bX" in2="bY" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="mapB" />
          {/* the channels: red and blue displaced by their maps, green as it is, added back together */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feDisplacementMap in="r" in2="mapR" scale={SC} xChannelSelector="R" yChannelSelector="G" result="r2" />
          <feDisplacementMap in="b" in2="mapB" scale={SC} xChannelSelector="R" yChannelSelector="G" result="b2" />
          {/* the fringe is soft, like a lens: the moved red and blue are blurred a little ... */}
          <feGaussianBlur in="r2" stdDeviation={SIG} result="r2b" />
          <feGaussianBlur in="b2" stdDeviation={SIG} result="b2b" />
          {/* ... outside the centre only: a smooth radial weight (0 in the centre, 1 from W1 out) from a point
              light over a flat surface (N.L = z / sqrt(r^2 + z^2)), remapped */}
          <feFlood x={X} y={Y} width={WW} height={HH} floodColor="#ffffff" result="flat" />
          <feDiffuseLighting in="flat" surfaceScale={0} diffuseConstant={1} lightingColor="#ffffff" result="lit">
            <fePointLight x={LENS_CX} y={LENS_CY} z={LZ} />
          </feDiffuseLighting>
          <feComponentTransfer in="lit" result="w">
            <feFuncR type="linear" slope={wa} intercept={wb} />
            <feFuncG type="linear" slope={wa} intercept={wb} />
            <feFuncB type="linear" slope={wa} intercept={wb} />
          </feComponentTransfer>
          <feComponentTransfer in="lit" result="wi">
            <feFuncR type="linear" slope={-wa} intercept={1 - wb} />
            <feFuncG type="linear" slope={-wa} intercept={1 - wb} />
            <feFuncB type="linear" slope={-wa} intercept={1 - wb} />
          </feComponentTransfer>
          <feComposite in="r2b" in2="w" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="rA" />
          <feComposite in="r2" in2="wi" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="rB" />
          <feComposite in="b2b" in2="w" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="bA" />
          <feComposite in="b2" in2="wi" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} result="bB" />
          <feComposite in="rA" in2="rB" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="rm" />
          <feComposite in="bA" in2="bB" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="bm" />
          <feComposite in="rm" in2="g" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="rg" />
          <feComposite in="rg" in2="bm" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="lens" />
          {/* the glitch slices (idle: every strip is 1 px and the scale is 0) */}
          <feFlood x={X} y={Y} width={WW} height={HH} floodColor="rgb(128,128,128)" result="k0" />
          {slices.map((s, i) => (
            <feFlood key={`k${i}`} x={X} y={s.y} width={WW} height={s.h} floodColor={sgrey(s.dx)} result={`k${i + 1}`} />
          ))}
          <feMerge result="smap">
            <feMergeNode in="k0" />
            {slices.map((_, i) => (
              <feMergeNode key={`n${i}`} in={`k${i + 1}`} />
            ))}
          </feMerge>
          <feMerge result="smask">
            {slices.map((_, i) => (
              <feMergeNode key={`q${i}`} in={`k${i + 1}`} />
            ))}
          </feMerge>
          <feDisplacementMap in="lens" in2="smap" scale={bands.length ? DSCALE : 0} xChannelSelector="R" yChannelSelector="G" result="moved" />
          <feComposite in="moved" in2="smask" operator="in" result="torn" />
          <feMerge>
            <feMergeNode in="lens" />
            <feMergeNode in="torn" />
          </feMerge>
        </filter>
      </svg>
      <AbsoluteFill style={{backgroundColor: C.bg, boxShadow: `0 0 0 ${EDGE}px ${C.bg}`, filter: `url(#${id})`}}>{children}</AbsoluteFill>
      {/* the tracking band: a thin, faint strip of noise with a soft edge, only while a glitch runs */}
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
            opacity: Math.min(0.35, 0.18 * k * G.env),
            mixBlendMode: light ? 'multiply' : 'screen',
            borderTop: `1px solid ${rgba(light ? C.shade : C.ink, 0.22 * G.env)}`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
