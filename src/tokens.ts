// Design tokens for Vinari promo videos: 1080x1920, 30 fps.
// Colours come from the app itself (Tokens.swift / Semantic.swift): achromatic, and colour
// only ever carries data. Green = good for the viewer, red = costs the viewer.
// Springs are the app's own SwiftUI springs converted to stiffness/damping.

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// ---- Theme ----------------------------------------------------------------------------------------
// Two looks, one token table: "dark" (the default, the owner's pure black film) and "light" (the app's
// own light look, for a side-by-side comparison: spec "theme": "light" or the input prop
// {"theme":"light"}, make.sh --light). Promo calls setTheme() before anything renders, and every scene
// reads C at render time, so the theme is a token swap: a scene never asks which theme it is in,
// except where the two looks really differ in kind (THEME below: glows, the screen's brightness).
// Every white, grey and near-white is NEUTRAL (R = G = B; the owner, 2026-09-24: the whites read
// bluish, "მოლურჯო"): the old #EDEDF2 ink, the #F2F2F7 paper and the #xxxx0E / #...F7 greys are gone.
// The data colours are real, vivid red and green on both looks (the owner, 2026-09-24: the mint and the
// salmon of the dark film and the dull light-film pair did not read as green and red). Contrast (WCAG):
//   dark film on #000:     ink #F5F5F5 19.3:1, ink2 #8A8A8A 6.1:1, green #1FD14F 10.3:1, red #FF2A2A 5.6:1
//   light film on #F3F3F3: ink #0B0B0B 17.7:1, ink2 #6A6A6A 4.9:1, ink3 #858585 3.3:1 (quiet mono only),
//                          green text #0B7F2D 4.6:1 (line #0F9B37 3.3:1: strokes, fills, big numbers),
//                          red text #D60000 4.9:1 (line #E01B1B 4.4:1)
// The light values are otherwise the app's (Vinari/Design/Tokens.swift VN.C light) made neutral.
export type ThemeName = 'dark' | 'light';

const DARK = {
  // The field is pure black (owner, 2026-09-24): no gradient, no grid. The bg* names stay for the
  // scenes that use the field colour as a knockout (dark text on a light strip, a pin's fill).
  bg: '#000000',
  bgCenter: '#000000',
  bgMid: '#000000',
  bgEdge: '#000000',
  ink: '#F5F5F5', // a neutral near-white (the old #EDEDF2 read bluish; no bloom any more to hold it back)
  ink2: '#8A8A8A',
  ink3: '#7C7C7C',
  rule: '#5E5E5E',
  upLine: '#1FD14F', // a real green (hue 136), the same for lines and text on black
  upText: '#1FD14F',
  downLine: '#FF2A2A', // a real red (hue 0)
  downText: '#FF2A2A',
  // optional pollar-style single accent; only used when a spec sets "accent": "yellow"
  yellowLine: '#F5C518',
  yellowText: '#F7D154',
  // surfaces (a card, a tile, a banner), darkest to lightest on the dark film
  onInk: '#000000', // text on an ink or a data-coloured fill (a picked chip, a toned Title strip)
  strip: '#F5F5F5', // a neutral Title strip (the pollar cover look: dark text on a light strip) ...
  onStrip: '#000000', // ... and its text
  stripEdge: 'rgba(0,0,0,0)', // a hairline around the strip (none on the dark film)
  surface: '#141414', // a card on the field (the QR card)
  screen: '#0A0A0A', // a phone's lit screen drawn by a scene (the QR page)
  screenGlow: '#121212', // a lock screen: its lit centre ...
  screenEdge: '#080808', // ... and its edge
  iconTile: '#050505', // the app icon's tile (the notification banner)
  island: '#000000', // an iPhone's dynamic island
  shade: '#000000', // shadows and dims: the absence of light
  glassTop: 'rgba(42,42,42,0.86)', // a notification banner
  glassBot: 'rgba(26,26,26,0.9)',
  tileTop0: '#1D1D1D', // split-flap card, top half
  tileTop1: '#151515',
  tileBot0: '#111111', // bottom half
  tileBot1: '#0C0C0C',
  hinge: '#000000', // the split between the halves
  axle: '#262626', // the two axle pins
  sheen: '#FFFFFF', // a soft light passing over the mark
};
export type Palette = {[K in keyof typeof DARK]: string};

const LIGHT: Palette = {
  bg: '#F3F3F3', // the paper: a neutral near-white (the app's #F2F2F7 read bluish), white cards stand on it
  bgCenter: '#F3F3F3',
  bgMid: '#F3F3F3',
  bgEdge: '#F3F3F3',
  ink: '#0B0B0B', // 17.7:1 on paper (the brand SVGs' filter lands on the same value)
  ink2: '#6A6A6A', // 4.9:1
  ink3: '#858585', // 3.3:1: quiet mono lines only
  rule: '#A0A0A0', // decorative, never text
  upLine: '#0F9B37', // a real green, deep enough for paper: 3.3:1 (lines, fills, big numbers)
  upText: '#0B7F2D', // 4.6:1 (small text)
  downLine: '#E01B1B', // a real red: 4.4:1
  downText: '#D60000', // 4.9:1
  yellowLine: '#B98A00', // yellow cannot carry on white: a deep amber
  yellowText: '#9C7400',
  onInk: '#FFFFFF', // VN.C.onAccent light
  strip: '#FFFFFF', // on paper a neutral strip is a white card (VN.C.surface), never a black bar
  onStrip: '#0B0B0B',
  stripEdge: 'rgba(11,11,11,0.09)',
  surface: '#FFFFFF', // VN.C.surface light: a card stands above the paper
  screen: '#FFFFFF',
  screenGlow: '#FFFFFF',
  screenEdge: '#F4F4F4',
  iconTile: '#FFFFFF',
  island: '#0B0B0B',
  shade: '#0B0B0B', // the ink at an alpha, never pure black
  glassTop: 'rgba(255,255,255,0.94)',
  glassBot: 'rgba(252,252,252,0.96)',
  tileTop0: '#FFFFFF',
  tileTop1: '#FAFAFA',
  tileBot0: '#F7F7F7',
  tileBot1: '#EFEFEF',
  hinge: '#D6D6D6',
  axle: '#C7C7C7',
  sheen: '#FFFFFF',
};

/** The live token table: DARK or LIGHT, swapped by setTheme(). Always read it at render time. */
export const C: Palette = {...DARK};

// Knobs where the two looks differ in kind, not in colour.
const DARK_K = {
  glow: 1, // coloured halos (a green glow on black); on paper a halo reads as a smudge
  // Phone: the real screens read bright and crisp on the black film (the owner: never a dimmed grey
  // slab); the entrance still wakes them from 60 % so a cut never flashes
  screenBright: 0.96,
  screenFilter: 'none',
  dimA: 0.12, // Phone: a gentle veil over everything but a highlight (0.2 turned a neutral white screen into a grey slab)
  shadowK: 1, // how dark a drop shadow is
};
const LIGHT_K: typeof DARK_K = {
  glow: 0.3,
  screenBright: 1, // the captures are light: at full, natural brightness they belong here
  screenFilter: 'none',
  dimA: 0.24, // a light paper fog, not a black veil
  shadowK: 0.3,
};
export const THEME = {...DARK_K};

let themeName: ThemeName = 'dark';
/** Swap the token table. Promo (and Wide) call it once per render, before any scene reads C. */
export const setTheme = (t: unknown) => {
  themeName = t === 'light' ? 'light' : 'dark';
  Object.assign(C, themeName === 'light' ? LIGHT : DARK);
  Object.assign(THEME, themeName === 'light' ? LIGHT_K : DARK_K);
};
export const theme = (): ThemeName => themeName;
/** Black and white: every data colour becomes the ink (the designed cover, src/Cover.tsx). Call it
 *  right after setTheme(); the next setTheme() brings the colours back. */
export const setMono = () => {
  Object.assign(C, {upLine: C.ink, upText: C.ink, downLine: C.ink, downText: C.ink, yellowLine: C.ink, yellowText: C.ink});
};
export const isLight = () => themeName === 'light';

/** '#RRGGBB' + alpha -> 'rgba(r,g,b,a)'. */
export const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${+Math.max(0, Math.min(1, a)).toFixed(4)})`;
};
/** A coloured halo: full on the dark film, a whisper on paper (THEME.glow). */
export const halo = (hex: string, a: number) => rgba(hex, a * THEME.glow);

export type Tone = 'neutral' | 'up' | 'down' | 'accent';

let accentMode: 'brand' | 'yellow' = 'brand';
export const setAccentMode = (m: 'brand' | 'yellow' | undefined) => {
  accentMode = m === 'yellow' ? 'yellow' : 'brand';
};

// "accent" means: the one saturated colour of this video. Brand mode maps it to red
// (the cost the viewer pays), yellow mode to the pollar yellow.
export const toneLine = (t: Tone = 'neutral') =>
  t === 'up' ? C.upLine : t === 'down' ? C.downLine : t === 'accent' ? (accentMode === 'yellow' ? C.yellowLine : C.downLine) : C.ink;
export const toneText = (t: Tone = 'neutral') =>
  t === 'up' ? C.upText : t === 'down' ? C.downText : t === 'accent' ? (accentMode === 'yellow' ? C.yellowText : C.downText) : C.ink;
/** A BIG number or word (about 40 px and up: a Stat, a landed flap, a price tag, a Title line) takes the
 *  line variant: on paper the brighter, more vivid green (#0F9B37, 3.3:1, enough for large text) instead of
 *  the small-text forest green; on the black film the two are the same. */
export const toneBig = toneLine;

// FiraGO first (Latin, digits, ₾), NotoGeo for the Mtavruli FiraGO lacks (src/fonts.ts, lib/format.ts
// mtav()); Chrome falls back glyph by glyph. Measure text with these stacks, never with 'FiraGO' alone.
export const F = {
  sans: 'FiraGO, NotoGeo, sans-serif',
  mono: 'VinariMono, FiraGO, NotoGeo, monospace',
} as const;

// ---- Layout --------------------------------------------------------------------------------------
// Two coordinate spaces:
//
// 1. The FRAME: real 1080x1920 pixels. The meta bar, the subtitle line, the lens (VHS) layer and the
//    safe-zone overlay live here. SAFE is the Instagram Reels safe zone, measured on the owner's phone
//    screenshot of the posted v11 (out/ig-reference-v11.webp, 924x2000: the film shows at 0.939 scale,
//    45 px cropped each side, top at 0; frame = screenshot / 0.939, x + 45 first): the meta bar reads at
//    frame 274..298, the like / comment / share column starts at frame x 922 from y 1111 (the heart; its
//    count, comment, repost and send icons follow down to y 1589), the username row at y 1668, the
//    caption line at 1795. So: top 250, left 70, right 1025 above y 1110 and 887 below it, bottom 1620.
//
// 2. The STAGE: every scene is still drawn in the original 1080x1920 design space (content in
//    x 120..960, y 380..1280, the numbers in L below). Promo scales that whole stage once, by
//    STAGE.s about the content box: stage x 120..960 lands on 78..1002 (frame-centred, inside
//    70..1025), stage y 380..1280 on 340..1330. Below stage y 1080 (frame 1110) the right edge is
//    stage 850 (L.lowRight, frame 881): nothing important under the like column. Text and SVG
//    re-rasterise at the final size (crisp), and the three.js canvas renders at dpr STAGE.s (Wire3D), so
//    thin lines stay one sharp line. A scene never needs to know about the stage: keep writing scenes
//    in stage units.
// The owner, 2026-09-24 (after v11 on Instagram): the subtitle moves down WELL, into the free space
// over the username row (it sat at 1340 with ~300 px of nothing under it), and the graphics take the
// room it leaves: the content box grew from stage 1100 to 1280 (frame 1132 -> 1330).
export const SAFE = {
  top: 250,
  bottom: 1620, // the username row starts at frame 1668
  left: 70,
  right: 1025, // x where the safe area ends, y 250..1110
  split: 1110, // below this y the right column of buttons starts (the heart at 1111)
  rightLow: 887, // x where the safe area ends, y 1110..1620 (the icons start at 922)
} as const;

const STAGE_S = 1.1;
export const STAGE = {
  s: STAGE_S,
  // stage (540, 380) -> frame (540, 340): frame-centred (the upper safe block's own centre, 547.5, is
  // 7.5 px off and would put the whole film off-centre wherever there is no platform UI), just under
  // the meta bar
  x: 540 - 540 * STAGE_S,
  y: 340 - 380 * STAGE_S,
} as const;
/** A stage point in frame pixels. */
export const toFrame = (x: number, y: number) => ({x: STAGE.x + STAGE.s * x, y: STAGE.y + STAGE.s * y});

// L: stage units for scenes (side, contentTop, contentBottom, safeRight, lowY, lowRight), frame pixels
// for the two layers outside the stage (metaY, metaLeft/metaRight, subtitle*). tools/formats.mjs reads
// metaY and subtitleY from this file by regex: keep them plain numbers.
export const L = {
  side: 120,
  contentTop: 380,
  contentBottom: 1280, // frame 1330: 147 px over the subtitle's letters
  contentMid: 830, // the content box's centre (frame 835)
  safeRight: 960,
  lowY: 1080, // stage: below this (frame 1110) the like / comment column starts on the right ...
  lowRight: 850, // ... so anything important ends at stage x 850 (frame 881) there
  metaY: 268, // frame: top of the meta bar's line box (caps at about 274..296)
  metaLeft: 78, // frame: the content box's left edge (stage x 120)
  metaRight: 1002, // frame: the content box's right edge (stage x 960)
  subtitleY: 1500, // frame: centre of the subtitle line (Mtavruli letters 1477..1520 at 58 px), the band over the username row
  subtitleYWide: 1420, // frame: the same line when no platform UI is drawn (Promo ui "none", the 16:9 frame)
  // frame: centre x of the subtitle line. The lower safe block's own centre is (70 + 887) / 2 = 478,
  // but a line there sits 62 px left of the picture wherever the Reels UI is not drawn (a phone's
  // gallery, a chat, 16:9). 510 splits it: 30 px either way, invisible with or without the UI.
  subtitleX: 510,
  subtitleMaxW: 754, // frame: 510 +- 377 = 133..887, the right end on the like-button column's edge
} as const;

export const SPRING = {
  enter: {mass: 1, stiffness: 223.8, damping: 29.92}, // app .smooth(0.42)
  enterXL: {mass: 1, stiffness: 109.66, damping: 20.94}, // big objects
  land: {mass: 1, stiffness: 438.65, damping: 35.6}, // app .snappy(0.30), numbers landing
  tap: {mass: 1, stiffness: 1218.47, damping: 59.34},
} as const;

export const BEZ = {
  enter: [0.3, 0.7, 0.05, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  camera: [0.45, 0, 0.55, 1] as const,
  countUp: [0.16, 1, 0.3, 1] as const,
  drawOn: [0.65, 0, 0.35, 1] as const,
};

export const T = {
  stat: 176,
  statL: 120,
  statM: 88,
  headline: 72,
  subtitle: 58,
  subtitleSilent: 66, // a film without a voice: the subtitle line is the primary text
  caption: 42,
  meta: 28,
  source: 26,
  label: 26,
} as const;

// ---- The lens (src/layers/VHS.tsx) ----------------------------------------------------------------
// spec "vhs": 0..1, default VHS_DEFAULT (the designed strength: pollar's fringe, measured against
// out/pollar-reference-*.png), 0 = off. The fringe's reach scales with amount / VHS_DEFAULT.
export const VHS_DEFAULT = 0.38;

// ---- The voiced mix (Promo -> setMix, src/scenes/common.tsx) --------------------------------------
// The silent film plays the sound kit as balanced and make.sh lifts the whole cut to -20 LUFS, so
// there its events are close and clear. Under a voice the same kit sat 12-29 LU under it (v10, the
// loudest 100 ms of each event; median 22) and read as far away. A voiced film now sets the kit
// against its own voice's measured loudness and:
//   lift  dB over the kit's balance for every cue (Sfx, Haptic, Land, TypeSfx)
//   ceil  no single cue's loudest 100 ms comes closer than this many LU under the voice (the felt
//         thumps, the end card's hit): the voice always stays on top
//   dip   a sound still ringing under a spoken chunk steps back to this gain (a hit keeps its attack)
//   room  dB over the room tone's balance: audible in the pauses, never a hiss
// Measured with these values (./make.sh v10-right-hand-drive --mix): the five loudest events 6.1-8.9 LU
// under the voice (they were 12.5-21), the median event 12.4 (was 22.4), the room tone 36.8 LU under
// the voice in the pauses (was 44.3); after make.sh's -14 LUFS the events land about 10 dB louder than
// before. The voiced v10 measured -16.90 LUFS before loudnorm (the voice alone -17.2).
// Owner, 2026-09-24: "everything is too quiet, the ASMR sounds a bit louder": lift 7.5 -> 10 dB, the
// loudest cue may come to 5 LU under the voice (was 8), a gentler step back under words (0.75 -> 0.85).
// 2026-09-24, later: cues landing together (a tap and its haptic on one frame, a flap board's last flap,
// detent, land thump and haptic) summed to 2.1-3.5 LU under the voice although each one alone kept 5
// (v9, v11, v12). `stack`: no 100 ms of stacked cues comes closer than this many LU under the voice
// (scenes/common.tsx, the stack ceiling), the same as a lone cue at its ceiling; only the stacked moments
// step back, every lone cue and the median sound keep their level. Measured (./make.sh <id> --mix):
// the loudest moment 2.1 -> 4.6 LU under the voice (v11), 2.6 -> 4.9 (v9), 2.3 -> 4.9 (v12); the
// median event 6.0 -> 5.6, 7.2 -> 7.2, 7.1 -> 7.0.
export const MIX_VOICED = {lift: 10, ceil: 5, stack: 5, dip: 0.85, room: 6};
