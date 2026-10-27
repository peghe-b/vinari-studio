// GL transitions (r3, 2026-10-27; the owner: "make the studio AMAZINGLY stronger", refined black and white): five shader
// transitions after the gl-transitions collection (github.com/gl-transitions/gl-transitions, MIT; the authors are named per
// transition below). A Remotion scene is DOM, not a texture, so a shader cannot sample the two shots; what it draws instead
// is the MASK: for every pixel of the frame how much of the incoming shot shows (0..1). The render (src/lib/glmask.ts) draws
// that mask with WebGL 2 (Chrome's ANGLE on the Mac, ANGLE on SwiftShader, "swangle", on a GitHub runner), and lays it as a
// CSS mask on the incoming shot and its inverse on the outgoing one, both layers (the pictures and the clean text layer)
// alike; two of them also draw an ink hairline on the moving edge. Everything is a pure function of (type, progress,
// direction, seed, focus): frame-deterministic, the same in every Chrome tab. This file is the one source: the catalogue,
// the rules, the GLSL, and the same maths in JavaScript (the fallback when a browser has no WebGL 2, and the self-test's
// reference; tools/ci/glprobe.py compares the two on the cloud's render).
//
// Rules (phase 2 only, src/lib/p2.mjs P2_FROM; older films render as made; asked for by the writer, the planner never picks
// one by itself): a scene's "transition": "gl-..." or {"type": "gl-...", "frames": 8..14}; at most GL_RULES.max a film, each
// type once, GL_RULES.gap frames apart, never on the cut into shot 1 before frame GL_RULES.hookFrames, never into the
// EndCard or out of / into a text-heavy shot (textHeavy: a headline, a quote, a receipt, a card, an app screen, a scene
// with more than GL_RULES.words words), never between two framed photos (GL_PLATE: two plates never line up, so the edge
// shows both frames and a corner of the old one sticks out), never next to a crash, a drop or a twist.
//
// The r3 review (2026-10-27) dropped gl-gridflip and gl-windowslice (they read as jagged stepped bars and a stepped wipe
// with hairlines, not the owner's refined look): they come back only redesigned and proven in a fixture film.
//
//   node src/lib/gltrans.mjs --test   the self-test
export const GL_W = 1080;
export const GL_H = 1920;
/** The stage's centre of interest (src/lib/p2.mjs P2_STAGE cx, cy in frame px) */
export const GL_FOCUS = Object.freeze({x: 540, y: 885});

/** The catalogue. frames: the default window (8..14); rim: the ink hairline on the moving edge; ink: its opacity; zoom: the
 *  outgoing grows and the incoming settles (the DOM moves with the mask); sfx: the owner's existing sounds (unchanged). */
export const GL_TRANSITIONS = Object.freeze({
  'gl-softwipe': {n: 1, frames: 10, rim: true, about: 'a slanted wipe with a soft 8 % edge and an ink hairline on it', source: 'directionalwipe.glsl (gre, MIT)', sfx: (c, pre) => [{name: 'asmr-slide', at: c - pre, volume: 0.3}]},
  'gl-inkbleed': {n: 2, frames: 12, rim: false, about: 'the incoming spreads out of the centre like ink in paper: one blob with a ragged, lobed edge (no islands, no specks)', source: 'perlin.glsl (Rich Harris, MIT), the noise on the edge\'s radius', sfx: (c, pre) => [{name: 'asmr-air-long', at: c - pre, volume: 0.22, len: 14}]},
  'gl-squares': {n: 3, frames: 12, rim: false, about: 'a diagonal wave of true squares, each opening from its centre (120 px cells), a finished one whole to its borders', source: 'squareswire.glsl (gre, MIT)', sfx: (c, pre) => [{name: 'asmr-air-long', at: c - pre, volume: 0.2, len: 14}]},
  'gl-radial': {n: 6, frames: 12, rim: false, about: 'two soft hands open from 12 o\'clock both ways round the centre and meet at 6', source: 'radial.glsl (Xaychru, MIT), mirrored', sfx: (c, pre) => [{name: 'asmr-whoomp', at: c - pre, volume: 0.22}]},
  'gl-crosszoom': {n: 7, frames: 10, rim: true, zoom: true, about: 'a soft circle opens from the centre while the outgoing grows 6 % and the incoming settles from 5 %', source: 'CrossZoom.glsl (rectalogic, MIT), the blur left out', sfx: (c, pre) => [{name: 'asmr-whoomp', at: c - pre, volume: 0.26}]},
});
export const GL_IDS = Object.freeze(Object.keys(GL_TRANSITIONS));
export const isGl = (t) => typeof t === 'string' && Object.hasOwn(GL_TRANSITIONS, t);

export const GL_RULES = Object.freeze({max: 3, frames: [8, 14], gap: 150, hookFrames: 60, words: 6, rimInk: 0.55});

/** The scenes whose frame is words (a GL edge through a word is clutter): the headlines, quotes, receipts, cards, lists,
 *  chats and the app's screens (a phone never takes anything but a clean cut: src/lib/guard.mjs (d)). */
export const GL_TEXT_SCENES = new Set(['KineticHeadline', 'KeywordLift', 'ShoutType', 'Title', 'QuoteCard', 'Receipt', 'Ledger', 'List', 'NewsCard', 'Chat', 'Standings', 'DocCard', 'Versus', 'WhoCard', 'LapDelta', 'RankShift', 'Twist', 'FreezeTag', 'TypeDive', 'FilmTitleCard', 'Notification', 'Calendar', 'Phone', 'ScreenFocus', 'ScreenDeck', 'TapTrail', 'QRCard', 'Compare', 'Grid', 'EndCard', 'Callback']);
const QUIET_KEYS = new Set(['type', 'src', 'screen', 'name', 'staging', 'mode', 'move', 'grade', 't', 'tone', 'kind', 'look', 'transition', 'credit', 'source', 'camera', 'marks', 'aspect', 'from', 'to', 'focus', 'center', 'aim', 'unit']);
/** the words a scene's spec sets on screen (every string value but file names, modes and small credit lines) */
export const wordsOf = (sc) => {
  let n = 0;
  const walk = (v, key) => {
    if (QUIET_KEYS.has(key)) return;
    if (typeof v === 'string') n += v.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    else if (Array.isArray(v)) v.forEach((x) => walk(x, ''));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  if (sc && typeof sc === 'object') for (const [k, x] of Object.entries(sc)) walk(x, k);
  return n;
};
/** A shot's picture frame for GL_PLATE: 'plate' (a framed photo on the field: a print, a window, a photo shown whole) or
 *  null (a full-bleed photo, a chart, a map, an object). The node callers (tools/ci/fx.mjs, tools/ci/p2lint.mjs) pass
 *  tools/ci/glframe.mjs photoFrame, which reads the photo catalogue (a bleed photo that does not fit is a plate too); this
 *  default knows only the stagings that are always framed. */
export const plateOf = (sc) => (sc?.type === 'PhotoStory' && (sc.staging === 'print' || sc.staging === 'window') ? 'plate' : null);
/** why a shot is text-heavy, or null */
export const textHeavy = (sc, beat = null) => {
  if (!sc || typeof sc !== 'object') return 'no scene';
  if (GL_TEXT_SCENES.has(sc.type)) return `${sc.type} is words`;
  if (beat?.subs === 'inPicture') return 'its beat draws its words in the picture';
  const w = wordsOf(sc);
  return w > GL_RULES.words ? `${w} words on screen (${GL_RULES.words} at most)` : null;
};

/** the window of a GL cut: about a third before the cut (the incoming frozen on its frame 0), the rest after; a 3D incoming
 *  is never pre-rolled (tools/ci/fx.mjs) */
export const glFrames = (type, frames) => {
  const def = GL_TRANSITIONS[type]?.frames ?? 10;
  const n = Number.isInteger(frames) ? frames : def;
  return Math.min(GL_RULES.frames[1], Math.max(GL_RULES.frames[0], n));
};
export const glWindow = (type, frames, webglIn = false) => {
  const n = glFrames(type, frames);
  const pre = webglIn ? 0 : Math.round(n * 0.3);
  return {pre, post: n - pre};
};
/** the asked transition of a scene: {type, frames} or null */
export const glAsk = (sc) => {
  const t = sc?.transition;
  const type = typeof t === 'object' && t ? t.type : t;
  if (!isGl(type)) return null;
  return {type, frames: typeof t === 'object' && Number.isFinite(t.frames) ? t.frames : null};
};

/** Why the GL cut into shot k is refused, or null. shots: [{scene, beat (the beat object), from, to}] in film frames; used:
 *  the GL cuts already placed before k [{k, type, at}]; p2: the film is a phase-2 film; neighbours: the cut types next to it
 *  ({prev, next}: crash, drop ...) when the planner knows them. */
export const glRefusal = ({shots, k, type, frames = null, used = [], p2 = true, prevType = null, frameOf = plateOf}) => {
  if (!p2) return 'GL_P2 GL transitions are phase-2 only';
  if (!isGl(type)) return `GL_UNKNOWN "${type}" (${GL_IDS.join(', ')})`;
  if (frames !== null && (!Number.isInteger(frames) || frames < GL_RULES.frames[0] || frames > GL_RULES.frames[1])) return `GL_FRAMES ${type} over ${frames} frames (${GL_RULES.frames[0]}..${GL_RULES.frames[1]})`;
  const a = shots[k - 1];
  const b = shots[k];
  if (!a || !b) return 'GL_FIRST the first shot has no cut into it';
  if (b.scene?.type === 'EndCard') return 'GL_END never into the EndCard (a clean cut or a dip)';
  if (b.from < GL_RULES.hookFrames) return `GL_HOOK the cut at frame ${b.from} is inside the hook (frame ${GL_RULES.hookFrames} on)`;
  const ta = textHeavy(a.scene, a.beat);
  if (ta) return `GL_TEXT out of a text-heavy shot (${ta})`;
  const tb = textHeavy(b.scene, b.beat);
  if (tb) return `GL_TEXT into a text-heavy shot (${tb})`;
  if (frameOf(a.scene) === 'plate' && frameOf(b.scene) === 'plate') return 'GL_PLATE never between two framed photos (their frames never line up: both edges show and a corner of the old one sticks out); full-bleed photos or a photo into a chart';
  if (b.beat?.twist || b.beat?.drop || b.scene?.type === 'Twist' || ['crash', 'drop'].includes(prevType)) return 'GL_HIT never next to a twist, a crash or a drop';
  if (used.length >= GL_RULES.max) return `GL_MAX ${GL_RULES.max} GL transitions a film at most`;
  if (used.some((u) => u.type === type)) return `GL_TWICE ${type} once a film`;
  if (used.some((u) => u.k === k - 1)) return 'GL_NEXT two GL cuts in a row';
  const near = used.find((u) => Math.abs(b.from - u.at) < GL_RULES.gap);
  if (near) return `GL_GAP ${b.from - near.at} frames after the last one (${GL_RULES.gap} at least)`;
  const {pre, post} = glWindow(type, frames);
  if (pre > Math.floor((a.to - a.from) / 3) || post > Math.floor((b.to - b.from) / 3)) return `GL_SHORT a shot too short for a ${pre + post}-frame window (a third of each at most)`;
  return null;
};
/** the lint (tools/ci/p2lint.mjs): every asked GL transition of a film, in order, as the planner would judge it */
export const glProblems = (shots, {p2 = true, frameOf = plateOf} = {}) => {
  const out = [];
  const used = [];
  shots.forEach((s, k) => {
    const ask = glAsk(s.scene);
    if (!ask) return;
    const why = glRefusal({shots, k, type: ask.type, frames: ask.frames, used, p2, frameOf});
    if (why) out.push(`${why.split(' ')[0]} beats[${s.beatIndex ?? '?'}] ${s.scene.type} "transition" ${ask.type}: ${why.split(' ').slice(1).join(' ')}`);
    else used.push({k, type: ask.type, at: s.from});
  });
  return out;
};

// ---- the masks ------------------------------------------------------------------------------------------------------------
// Every mask is "how much of the INCOMING shows" at frame pixel (X, Y), 0..1, for an eased progress p in [0, 1]: exactly 0
// everywhere at p 0 and 1 everywhere at p 1 (the self-test samples it). Most are a time field t(X, Y) in [0, 1] (when that
// pixel turns) with a soft edge s: reveal = 1 - smoothstep(p (1 + s) - s, p (1 + s), t). The rim is the ink hairline on the
// edge's middle, in px. GLSL ES 3.00; the JavaScript twin below is the same maths line by line (float64 against float32:
// the cloud's probe compares them).

/** the progress of the GL mask at the window's u (src/lib/fx.ts uOf: (k + 0.5) / n): frame k of n is (k + 1) / (n + 1), never
 *  all of one shot (the cut itself is the last 0 and the next frame the last 1), on the camera's in-out curve */
export const glProgress = (u, n) => {
  const k = Math.max(0, Math.min(n - 1, Math.round(u * n - 0.5)));
  const x = (k + 1) / (n + 1);
  return x * x * (3 - 2 * x);
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;
// lowbias32 (Chris Wellons): the same 32-bit integer hash in GLSL (uint) and here (Math.imul)
const hash32 = (x) => {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const h2 = (ix, iy, seed) => Math.fround(hash32((Math.imul(ix >>> 0, 0x8da6b343) ^ hash32((iy ^ seed) >>> 0)) >>> 0) / 4294967295);
const vnoise = (x, y, seed) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy, seed);
  const b = h2(ix + 1, iy, seed);
  const c = h2(ix, iy + 1, seed);
  const d = h2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const fbm = (x, y, seed) => (vnoise(x, y, seed) * 0.5 + vnoise(x * 2, y * 2, seed + 17) * 0.25 + vnoise(x * 4, y * 4, seed + 31) * 0.125 + vnoise(x * 8, y * 8, seed + 47) * 0.0625) / 0.9375;
const OUT_LO = 0.92;
const reveal = (t, p, s) => 1 - smoothstep(p * (1 + s) - s, p * (1 + s), t);
const hair = (dpx) => 1 - smoothstep(0.6, 2.0, dpx);
const farthest = (fx, fy) => Math.max(Math.hypot(fx, fy), Math.hypot(GL_W - fx, fy), Math.hypot(fx, GL_H - fy), Math.hypot(GL_W - fx, GL_H - fy));
// the soft wipe's slant: the edge travels along (cos 18deg, -sin 18deg), mirrored for dir -1
const WIPE_A = (18 * Math.PI) / 180;
const SQ = 120; // the squares: px a cell
// a square opens slowly, then faster (q squared over its share of the wave), and is whole from SQ_SNAP of its side on: a
// nearly finished square never leaves a hairline gap round it (the r3 review: dark lines between the finished squares; the
// last 12 px close inside a frame in which the square grows about 18 px a side anyway), and once whole it covers 1 px past
// its borders:
// a finished square is exactly 1 to its edges and an unstarted one exactly 0 (the r3 review: the soft edge left every
// border at 0.46..0.93, a grid of seams over the finished picture that popped off one frame after the window)
const SQ_SNAP = 0.8;
// the ink bleed: the edge's radius is noise on the angle (one star-shaped blob from the centre: never an island, a speck or
// a hole; the r3 review: noise on the position left rings and droplets on blank paper), INK_A its depth, INK_RING the
// noise's circle (about 14 lobes, the finer octaves the raggedness), INK_S the soft edge (about 30 px)
const INK_K = 0.72;
const INK_A = 0.55;
const INK_RING = 1.8;
const INK_S = 0.022;
// the radial: two hands open from 12 o'clock (dir 1; 6 o'clock for -1) both ways and meet opposite, both soft (the r3
// review: one hand from a fixed start left a hard vertical seam down the middle through whatever stood there)
const RADIAL_S = 0.08;

/** {r: the incoming's share, rim: the ink hairline's alpha} at frame pixel (X, Y) */
export const maskAt = (type, X, Y, p, {dir = 1, seed = 1, focus = GL_FOCUS} = {}) => {
  if (p <= 0) return {r: 0, rim: 0};
  if (p >= 1) return {r: 1, rim: 0};
  switch (type) {
    case 'gl-softwipe': {
      const vx = Math.cos(WIPE_A) * dir;
      const vy = -Math.sin(WIPE_A);
      const lo = Math.min(0, vx * GL_W) + Math.min(0, vy * GL_H);
      const span = Math.abs(vx) * GL_W + Math.abs(vy) * GL_H;
      const t = (vx * X + vy * Y - lo) / span;
      const s = 0.08;
      const c = p * (1 + s) - s * 0.5;
      return {r: reveal(t, p, s), rim: hair(Math.abs(t - c) * span)};
    }
    case 'gl-inkbleed': {
      const dx = X - focus.x;
      const dy = Y - focus.y;
      const d = Math.hypot(dx, dy) / farthest(focus.x, focus.y);
      const th = Math.atan2(dy, dx);
      const n = fbm(8 + INK_RING * Math.cos(th), 8 + INK_RING * Math.sin(th), seed);
      const t = clamp((d * INK_K) / (1 + INK_A * (n - 0.5)), 0, 1);
      return {r: reveal(t, p, INK_S), rim: 0};
    }
    case 'gl-squares': {
      // squareswire: the wave runs along (1, -0.5) normalised to |x| + |y| = 1; read at the cell's centre, so every cell is a
      // true square (the original reads it per pixel: trapezoids), and a narrower smoothness (1.0, the original 1.6)
      const vx = 1 / 1.5;
      const vy = -0.5 / 1.5;
      const cx = (Math.floor(X / SQ) + 0.5) * SQ;
      const cy = (Math.floor(Y / SQ) + 0.5) * SQ;
      const t = vx * (cx / GL_W) + vy * (cy / GL_H) + 0.5 - (vx * 0.5 + vy * 0.5);
      const o = 1.0;
      const q = clamp((p * (1 + o) - t) / o, 0, 1);
      const g = q * q >= SQ_SNAP ? 1 : q * q;
      if (g <= 0) return {r: 0, rim: 0};
      if (g >= 1) return {r: 1, rim: 0};
      const half = g * (SQ / 2 + 1);
      const lx = Math.abs((X % SQ) - SQ / 2);
      const ly = Math.abs((Y % SQ) - SQ / 2);
      return {r: smoothstep(-0.75, 0.75, half - lx) * smoothstep(-0.75, 0.75, half - ly), rim: 0};
    }
    case 'gl-radial': {
      const dx = X - focus.x;
      const dy = Y - focus.y;
      const t = dx === 0 && dy === 0 ? 0 : Math.atan2(Math.abs(dx), -dy * dir) / Math.PI;
      return {r: reveal(t, p, RADIAL_S), rim: 0};
    }
    case 'gl-crosszoom': {
      const dmax = farthest(focus.x, focus.y);
      const d = Math.hypot(X - focus.x, Y - focus.y) / dmax;
      const s = 0.1;
      const c = p * (1 + s) - s * 0.5;
      return {r: reveal(d, p, s), rim: hair(Math.abs(d - c) * dmax)};
    }
    default:
      return {r: p >= 0.5 ? 1 : 0, rim: 0};
  }
};

/** The words during a GL window (the first cloud check, 2026-10-27: TEXT_COVER on the radial's hand and soft edge across
 *  the outgoing's „900 ₾ მერე"): a shot's words never ride the mask. The outgoing's words leave in the window's first third,
 *  the pictures turn into each other, the incoming's words land in its last third; the rim shows only while no word does. */
export const glTextOpacity = (role, p) => (role === 'out' ? 1 - smoothstep(0.04, 0.3, p) : smoothstep(0.7, 0.96, p));
export const glRimEnvelope = (p) => smoothstep(0.3, 0.4, p) * (1 - smoothstep(0.6, 0.7, p));

/** The DOM's own move under a zoom mask (gl-crosszoom): the outgoing's and the incoming's scale at p */
export const glZoom = (type, role, p) => (GL_TRANSITIONS[type]?.zoom ? (role === 'out' ? 1 + 0.06 * p : 1.05 - 0.05 * p) : 1);

/** The fragment shader (WebGL 2): uMode 0 the incoming's mask, 1 the outgoing's (1 - r), 2 the rim. gl_FragCoord is
 *  bottom-up: frame Y is flipped. uRes: the canvas size; the maths runs in frame px (1080 x 1920) at any canvas size. */
export const GLSL_VS = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;
export const GLSL_FS = `#version 300 es
precision highp float;
precision highp int;
uniform int uType;
uniform int uMode;
uniform float uP;
uniform float uDir;
uniform uint uSeed;
uniform vec2 uFocus;
uniform vec2 uRes;
out vec4 outColor;
const float GW = ${GL_W.toFixed(1)};
const float GH = ${GL_H.toFixed(1)};
const float TAU = 6.283185307179586;
uint hash32(uint x){ x ^= x >> 16u; x *= 0x7feb352du; x ^= x >> 15u; x *= 0x846ca68bu; x ^= x >> 16u; return x; }
float h2(int ix, int iy, uint seed){ return float(hash32((uint(ix) * 0x8da6b343u) ^ hash32(uint(iy) ^ seed))) / 4294967295.0; }
float vnoise(vec2 q, uint seed){
  vec2 i = floor(q); vec2 f = q - i; vec2 u = f * f * (3.0 - 2.0 * f);
  int ix = int(i.x); int iy = int(i.y);
  float a = h2(ix, iy, seed); float b = h2(ix + 1, iy, seed); float c = h2(ix, iy + 1, seed); float d = h2(ix + 1, iy + 1, seed);
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
float fbm(vec2 q, uint seed){
  return (vnoise(q, seed) * 0.5 + vnoise(q * 2.0, seed + 17u) * 0.25 + vnoise(q * 4.0, seed + 31u) * 0.125 + vnoise(q * 8.0, seed + 47u) * 0.0625) / 0.9375;
}
float reveal(float t, float p, float s){ return 1.0 - smoothstep(p * (1.0 + s) - s, p * (1.0 + s), t); }
float hair(float d){ return 1.0 - smoothstep(0.6, 2.0, d); }
float farthest(vec2 f){ return max(max(length(f), length(vec2(GW, 0.0) - f)), max(length(vec2(0.0, GH) - f), length(vec2(GW, GH) - f))); }
float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
void main(){
  vec2 P = vec2(gl_FragCoord.x * GW / uRes.x, (uRes.y - gl_FragCoord.y) * GH / uRes.y);
  float X = P.x; float Y = P.y; float p = uP;
  float r = 0.0; float rim = 0.0;
  if (p <= 0.0) { r = 0.0; }
  else if (p >= 1.0) { r = 1.0; }
  else if (uType == 1) {
    float A = ${WIPE_A.toFixed(10)};
    float vx = cos(A) * uDir; float vy = -sin(A);
    float lo = min(0.0, vx * GW) + min(0.0, vy * GH);
    float span = abs(vx) * GW + abs(vy) * GH;
    float t = (vx * X + vy * Y - lo) / span;
    float s = 0.08; float c = p * (1.0 + s) - s * 0.5;
    r = reveal(t, p, s); rim = hair(abs(t - c) * span);
  } else if (uType == 2) {
    vec2 D = P - uFocus;
    float d = length(D) / farthest(uFocus);
    float th = atan(D.y, D.x);
    float n = fbm(vec2(8.0 + ${INK_RING.toFixed(4)} * cos(th), 8.0 + ${INK_RING.toFixed(4)} * sin(th)), uSeed);
    float t = clamp(d * ${INK_K.toFixed(4)} / (1.0 + ${INK_A.toFixed(4)} * (n - 0.5)), 0.0, 1.0);
    r = reveal(t, p, ${INK_S.toFixed(4)});
  } else if (uType == 3) {
    float vx = 1.0 / 1.5; float vy = -0.5 / 1.5;
    float cx = (floor(X / ${SQ.toFixed(1)}) + 0.5) * ${SQ.toFixed(1)}; float cy = (floor(Y / ${SQ.toFixed(1)}) + 0.5) * ${SQ.toFixed(1)};
    float t = vx * (cx / GW) + vy * (cy / GH) + 0.5 - (vx * 0.5 + vy * 0.5);
    float o = 1.0;
    float q = clamp((p * (1.0 + o) - t) / o, 0.0, 1.0);
    float g = q * q >= ${SQ_SNAP.toFixed(4)} ? 1.0 : q * q;
    if (g <= 0.0) { r = 0.0; }
    else if (g >= 1.0) { r = 1.0; }
    else {
      float half_ = g * ${(SQ / 2 + 1).toFixed(1)};
      float lx = abs(mod(X, ${SQ.toFixed(1)}) - ${(SQ / 2).toFixed(1)});
      float ly = abs(mod(Y, ${SQ.toFixed(1)}) - ${(SQ / 2).toFixed(1)});
      r = ss(-0.75, 0.75, half_ - lx) * ss(-0.75, 0.75, half_ - ly);
    }
  } else if (uType == 6) {
    float dx = X - uFocus.x; float dy = Y - uFocus.y;
    float t = (dx == 0.0 && dy == 0.0) ? 0.0 : atan(abs(dx), -dy * uDir) / ${Math.PI.toFixed(10)};
    r = reveal(t, p, ${RADIAL_S.toFixed(4)});
  } else if (uType == 7) {
    float dmax = farthest(uFocus);
    float d = length(P - uFocus) / dmax;
    float s = 0.1; float c = p * (1.0 + s) - s * 0.5;
    r = reveal(d, p, s); rim = hair(abs(d - c) * dmax);
  } else { r = p >= 0.5 ? 1.0 : 0.0; }
  float a = uMode == 0 ? r : uMode == 1 ? 1.0 - ss(${OUT_LO.toFixed(4)}, 1.0, r) : rim;
  outColor = vec4(1.0, 1.0, 1.0, a);
}`;

/** The outgoing's mask under the incoming's r: whole until the incoming is nearly in (OUT_LO), then gone with it. Two soft
 *  masks that add to one (r and 1 - r) let the paper through the soft edge (r (1 - r): a light streak a quarter strong
 *  across two photos, the second cloud check's soft wipe); from r 0.5 (the third check) it was still up to 13 %, a pale
 *  band of paper across two dark photos (the r3 review, the soft wipe's frame 827); this one keeps it near 2 % (5 levels on
 *  a dark photo) while the incoming's clear parts still never show the outgoing once it is in. */
export const outShare = (r) => 1 - smoothstep(OUT_LO, 1, r);

/** a mask as RGBA bytes (white, alpha = the mask) on the CPU: the fallback and the reference. w x h samples at pixel centres
 *  of a frame scaled to w x h. mode: 0 in, 1 out, 2 rim. */
export const maskPixels = (type, p, mode, w, h, opts = {}) => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const {r, rim} = maskAt(type, ((i + 0.5) * GL_W) / w, ((j + 0.5) * GL_H) / h, p, opts);
      const a = mode === 0 ? r : mode === 1 ? outShare(r) : rim;
      const o = (j * w + i) * 4;
      px[o] = px[o + 1] = px[o + 2] = 255;
      px[o + 3] = Math.round(a * 255);
    }
  return px;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(GL_IDS.length >= 5 && GL_IDS.length <= 8 && GL_IDS.every((t) => t.startsWith('gl-')) && !isGl('gl-gridflip') && !isGl('gl-windowslice'), `${GL_IDS.length} GL transitions, 5 to 8; the grid flip and the window slice are out until redesigned`);
  ok(GL_IDS.every((t) => GL_TRANSITIONS[t].frames >= GL_RULES.frames[0] && GL_TRANSITIONS[t].frames <= GL_RULES.frames[1]), 'every default window is 8..14 frames');
  ok(new Set(GL_IDS.map((t) => GL_TRANSITIONS[t].n)).size === GL_IDS.length && GL_IDS.every((t) => GLSL_FS.includes(`uType == ${GL_TRANSITIONS[t].n}`)), 'every transition has its own branch in the shader');
  // the masks: nothing of the incoming at the start, all of it at the end, a share that only grows
  const grid = [];
  for (let j = 0; j < 24; j++) for (let i = 0; i < 14; i++) grid.push([(i + 0.37) * (GL_W / 14), (j + 0.61) * (GL_H / 24)]);
  for (const t of GL_IDS) {
    for (const opts of [{dir: 1, seed: 7}, {dir: -1, seed: 1234567, focus: {x: 300, y: 1400}}]) {
      const at = (p) => grid.map(([x, y]) => maskAt(t, x, y, p, opts).r);
      const lo = Math.max(...at(glProgress(0.5 / 12, 12)));
      const hi = Math.min(...at(glProgress(11.5 / 12, 12)));
      const zero = Math.max(...at(1e-4));
      const one = Math.min(...at(1 - 1e-4));
      let mono = true;
      let prev = at(0.001);
      for (let q = 1; q <= 20; q++) {
        const cur = at(q / 20 - 0.0005);
        if (cur.some((v, i) => v < prev[i] - 1e-9)) mono = false;
        prev = cur;
      }
      const mid = at(0.5);
      const share = mid.reduce((s, v) => s + v, 0) / mid.length;
      ok(zero < 0.004 && one > 0.996 && mono, `${t} (dir ${opts.dir}): 0 at the start (${zero.toFixed(4)}), 1 at the end (${one.toFixed(4)}), only grows`);
      ok(lo < 0.6 && hi > 0.4 && share > 0.08 && share < 0.92, `${t} (dir ${opts.dir}): the window's first frame is mostly the outgoing, its last mostly the incoming, half way both show (${(share * 100).toFixed(0)} %)`);
    }
  }
  // deterministic and seeded
  const a = maskPixels('gl-inkbleed', 0.5, 0, 27, 48, {seed: 3});
  const b = maskPixels('gl-inkbleed', 0.5, 0, 27, 48, {seed: 3});
  const c = maskPixels('gl-inkbleed', 0.5, 0, 27, 48, {seed: 4});
  ok(a.every((v, i) => v === b[i]) && c.some((v, i) => v !== a[i]), 'the ink bleed is the same twice for a seed and another for another seed');
  ok(maskPixels('gl-softwipe', 0.5, 2, 54, 96).some((v, i) => i % 4 === 3 && v > 100) && ['gl-squares', 'gl-inkbleed', 'gl-radial'].every((t) => !GL_TRANSITIONS[t].rim && maskPixels(t, 0.5, 2, 54, 96).every((v, i) => i % 4 !== 3 || v === 0)), 'the soft wipe draws its hairline; the squares, the ink bleed and the radial none (a hairline over blank paper reads as a stray line)');
  const inn = maskPixels('gl-radial', 0.4, 0, 30, 40);
  const out = maskPixels('gl-radial', 0.4, 1, 30, 40);
  ok(inn.some((v, i) => i % 4 === 3 && v > 20 && v < 230) && inn.every((v, i) => i % 4 !== 3 || (v <= 230 ? out[i] === 255 : v === 255 ? out[i] === 0 : true)), 'the outgoing stays whole until the incoming is nearly in, then leaves with it');
  const paper = Math.max(...Array.from({length: 1001}, (_, i) => (1 - i / 1000) * (1 - outShare(i / 1000))));
  ok(paper <= 0.025, `the paper through the soft edge stays under 2.5 % (${(paper * 100).toFixed(2)} %: no pale band across two dark photos)`);
  // the squares (the r3 review: borders below 1 drew a grid of seams): a finished square is exactly 1 to and across its
  // borders, an unstarted one exactly 0, every pixel of the frame, at the window's last frame and mid-way
  {
    const sqG = (X, Y, p) => {
      const t = (1 / 1.5) * (((Math.floor(X / SQ) + 0.5) * SQ) / GL_W) + (-0.5 / 1.5) * (((Math.floor(Y / SQ) + 0.5) * SQ) / GL_H) + 0.5 - (1 / 1.5 - 0.5 / 1.5) * 0.5;
      const q = clamp((p * 2 - t) / 1, 0, 1);
      return q * q >= SQ_SNAP ? 1 : q * q;
    };
    const last = [8, 10, 12, 14].map((n) => glProgress((n - 0.5) / n, n));
    let lastBad = 0;
    for (const p of last) {
      const inn = maskPixels('gl-squares', p, 0, GL_W, GL_H);
      const out = maskPixels('gl-squares', p, 1, GL_W, GL_H);
      for (let i = 3; i < inn.length; i += 4) if (inn[i] !== 255 || out[i] !== 0) lastBad++;
    }
    ok(lastBad === 0, `the squares at the window's last frame (8..14 frames): every pixel all incoming, borders and corners too (${lastBad} not)`);
    for (const p of [0.2, 0.5, 0.8]) {
      const inn = maskPixels('gl-squares', p, 0, GL_W, GL_H);
      let done = 0;
      let none = 0;
      let doneBad = 0;
      let noneBad = 0;
      for (let j = 0; j < GL_H; j++)
        for (let i = 0; i < GL_W; i++) {
          const g = sqG(i + 0.5, j + 0.5, p);
          const a = inn[(j * GL_W + i) * 4 + 3];
          if (g >= 1) (done++, a !== 255 && doneBad++);
          else if (g <= 0) (none++, a !== 0 && noneBad++);
        }
      ok(doneBad === 0 && noneBad === 0 && (p > 0.3 ? done > 0 : none > 0), `the squares at p ${p}: a finished square is whole to its borders (${doneBad} of ${done} px not), an unstarted one is nothing (${noneBad} of ${none} px not)`);
    }
  }
  // the ink bleed (the r3 review: rings, droplets and grey blotches): one blob from the centre, never an island or a hole:
  // along every ray from the focus the incoming's share only falls
  {
    let bad2 = 0;
    for (const opts of [{seed: 7}, {seed: 991, focus: {x: 300, y: 1400}}]) {
      const f = opts.focus ?? GL_FOCUS;
      for (const p of [0.15, 0.35, 0.5, 0.65, 0.85])
        for (let a = 0; a < 720; a++) {
          const th = (a / 720) * TAU;
          let prev = 2;
          for (let d = 0; d < 2300; d += 3) {
            const X = f.x + d * Math.cos(th);
            const Y = f.y + d * Math.sin(th);
            if (X < 0 || Y < 0 || X > GL_W || Y > GL_H) break;
            const r = maskAt('gl-inkbleed', X, Y, p, opts).r;
            if (r > prev + 1e-9) bad2++;
            prev = r;
          }
        }
    }
    ok(bad2 === 0, `the ink bleed is one blob from its centre at every step: no island, speck or hole (${bad2} rises along 720 rays)`);
  }
  // the radial (the r3 review: a hard seam at 12 o'clock through the frame): both hands soft, nowhere a step over 0.06 a px
  // on rows and columns 300 px and more from the centre
  {
    let step = 0;
    for (const p of [0.2, 0.35, 0.5, 0.65, 0.8])
      for (const dir of [1, -1]) {
        for (const Y of [GL_FOCUS.y - 700, GL_FOCUS.y - 300, GL_FOCUS.y + 300, GL_FOCUS.y + 700]) for (let X = 1; X < GL_W; X++) step = Math.max(step, Math.abs(maskAt('gl-radial', X + 0.5, Y, p, {dir}).r - maskAt('gl-radial', X - 0.5, Y, p, {dir}).r));
        for (const X of [GL_FOCUS.x - 300, GL_FOCUS.x + 300]) for (let Y = 1; Y < GL_H; Y++) step = Math.max(step, Math.abs(maskAt('gl-radial', X, Y + 0.5, p, {dir}).r - maskAt('gl-radial', X, Y - 0.5, p, {dir}).r));
      }
    ok(step < 0.06, `the radial's hands are both soft: the largest step a px is ${step.toFixed(3)}`);
  }
  ok(glProgress(0.5 / 10, 10) > 0 && glProgress(9.5 / 10, 10) < 1 && glProgress(0.5 / 10, 10) < glProgress(1.5 / 10, 10), 'frame k of n is (k + 1) / (n + 1) on the in-out curve');
  ok(glWindow('gl-inkbleed').pre + glWindow('gl-inkbleed').post === 12 && glWindow('gl-softwipe', 20).pre + glWindow('gl-softwipe', 20).post === 14 && glWindow('gl-softwipe', 10, true).pre === 0, 'the window: the default, clamped to 14, no pre-roll into 3D');
  ok([0.31, 0.5, 0.69].every((p) => glTextOpacity('out', p) === 0 && glTextOpacity('in', p) === 0) && glTextOpacity('out', 0.02) === 1 && glTextOpacity('in', 0.97) === 1 && [0.2, 0.29, 0.71, 0.9].every((p) => glRimEnvelope(p) === 0) && glRimEnvelope(0.5) === 1, 'words leave before the middle and land after it; the rim only while no word shows');
  ok(Math.abs(glZoom('gl-crosszoom', 'out', 1) - 1.06) < 1e-9 && glZoom('gl-squares', 'in', 0.3) === 1, 'only the cross zoom moves the shots');
  // the rules
  const shot = (type, from, to, extra = {}) => ({scene: {type, ...extra}, beat: {}, from, to});
  const film = [shot('FilmTitleCard', 0, 90), shot('PhotoStory', 90, 180, {src: 'x'}), shot('UnitGrid', 180, 300, {n: 32, label: 'ორი სიტყვა'}), shot('RouteTrace', 300, 420, {from: 'ვაკე', to: 'აეროპორტი', note: 'ოცდაორი წუთი'}), shot('PhotoStory', 420, 520, {src: 'y'}), shot('Receipt', 520, 640, {title: 'ქვითარი'}), shot('HeroObject', 640, 760), shot('EndCard', 760, 820)];
  ok(glRefusal({shots: film, k: 2, type: 'gl-inkbleed'}) === null, 'a photo into a unit grid at 6 s takes the ink bleed');
  ok(/^GL_TEXT/.test(glRefusal({shots: film, k: 1, type: 'gl-inkbleed'})), 'out of the title card (words): refused');
  ok(/^GL_TEXT/.test(glRefusal({shots: film, k: 5, type: 'gl-softwipe'})), 'into a receipt: refused');
  ok(/^GL_END/.test(glRefusal({shots: film, k: 7, type: 'gl-softwipe'})), 'into the EndCard: refused');
  ok(/^GL_HOOK/.test(glRefusal({shots: [shot('PhotoStory', 0, 40), shot('PhotoStory', 40, 140)], k: 1, type: 'gl-radial'})), 'inside the hook: refused');
  ok(/^GL_P2/.test(glRefusal({shots: film, k: 2, type: 'gl-inkbleed', p2: false})), 'an older film: refused');
  ok(/^GL_FRAMES/.test(glRefusal({shots: film, k: 2, type: 'gl-inkbleed', frames: 20})), 'twenty frames: refused');
  ok(/^GL_TWICE/.test(glRefusal({shots: film, k: 4, type: 'gl-inkbleed', used: [{k: 2, type: 'gl-inkbleed', at: 180}]})), 'the same type twice: refused');
  ok(/^GL_GAP/.test(glRefusal({shots: film, k: 4, type: 'gl-radial', used: [{k: 2, type: 'gl-inkbleed', at: 300}]})), 'two within 5 s: refused');
  ok(/^GL_NEXT/.test(glRefusal({shots: film, k: 3, type: 'gl-radial', used: [{k: 2, type: 'gl-inkbleed', at: 100}]})), 'two GL cuts in a row: refused');
  ok(/^GL_MAX/.test(glRefusal({shots: film, k: 4, type: 'gl-radial', used: [{k: 0, type: 'gl-squares', at: -900}, {k: 1, type: 'gl-softwipe', at: -600}, {k: 2, type: 'gl-inkbleed', at: -300}]})), 'a fourth: refused');
  ok(/^GL_TEXT/.test(glRefusal({shots: [film[0], film[1], shot('PhotoStory', 180, 300, {lines: ['ერთი ორი სამი ოთხი ხუთი ექვსი შვიდი']})], k: 2, type: 'gl-squares'})), 'a photo with seven words on it: refused');
  const plate = (src, staging) => shot('PhotoStory', 0, 0, {src, staging});
  const plates = [film[0], {...plate('a', 'print'), from: 90, to: 200}, {...plate('b', 'window'), from: 200, to: 320}];
  ok(/^GL_PLATE/.test(glRefusal({shots: plates, k: 2, type: 'gl-softwipe'})), 'a framed photo into a framed photo: refused');
  ok(glRefusal({shots: plates, k: 2, type: 'gl-softwipe', frameOf: () => null}) === null && glRefusal({shots: [film[0], plates[1], {...film[2], from: 200, to: 320}], k: 2, type: 'gl-softwipe'}) === null, 'two full-bleed photos, or a framed photo into a chart: allowed');
  ok(/^GL_HIT/.test(glRefusal({shots: [film[0], film[1], {...shot('HeroObject', 180, 300), beat: {twist: true}}], k: 2, type: 'gl-squares'})), 'into a twist: refused');
  ok(wordsOf({type: 'PhotoStory', src: 'a-b-c', credit: 'one two three four five six seven', lines: ['ერთი *ორი*']}) === 2, 'the words count what is on screen, not file names or credits');
  const lint = glProblems([film[0], film[1], {...film[2], scene: {...film[2].scene, transition: 'gl-inkbleed'}, beatIndex: 2}, {...film[3], scene: {...film[3].scene, transition: {type: 'gl-inkbleed', frames: 12}}, beatIndex: 3}, {...film[5], scene: {...film[5].scene, transition: 'gl-radial'}, beatIndex: 5}]);
  ok(lint.length === 2 && /^GL_TWICE beats\[3\]/.test(lint[0]) && /^GL_TEXT beats\[5\]/.test(lint[1]), `the lint: ${lint.join(' | ')}`);
  console.log(bad ? `gltrans: ${bad} failed` : 'gltrans: all ok');
  return bad;
};

if (typeof process !== 'undefined' && /gltrans\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest() ? 1 : 0);
