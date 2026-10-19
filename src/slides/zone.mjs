// The Instagram Story slides' layout, shared by the render (src/slides/Slides.tsx places every element from these boxes) and
// the tools (tools/ci/slides.mjs lints a set with it and its --test proves every layout stays inside the zone; tools/slides.mjs
// checks the rendered pixels too). Pure JS: no React, no DOM.
//
// The owner, 2026-10-19 (evening, on the tilted 3D phones): "I don't want this tilted, bent mockup. It must be BIG; some phones
// coming up from the bottom, big. The headline BIG, LEFT-aligned, like on the covers. More graphics: lines, teaching graphics."
// Three directions answered it (A "hero rise", B "tutorial callouts", C "loupe + bands"); his verdict: "all three are good",
// and one complaint for all of them: the box drawn round an element must follow the element's own shape (a pill gets a pill,
// a card with 24 px corners 24 + the gap: CONCENTRIC, an even gap, never touching it). So ONE system offers the three as
// LOOKS a slide picks (the spec's "look"), so a set varies from slide to slide:
//   plain     (cover, end) the phone RISING from the bottom edge, 86 % of the frame wide, centred; a cover may outline its
//             `row` (the outline alone, no line); the end adds the recap (1-2-3-check, one disc a step) under its line
//   rail      (cover, step; A) the phone RISING, 82 % wide, right of a rail: a dot and a short bold `label` under the title,
//             a thin line from the dot down the rail and into the element's outline. For an element HIGH on its screen (the
//             rising phone shows about its top half inside the zone)
//   band      (cover, step; C) the phone RISING, 82 % wide, centred: a line across the element's row, past both edges of
//             the phone, coming down from the `body` under the title (its label), its dots ON the outline where it meets it;
//             no band where every height of the row would cross a side button. For a full-width row high on its screen
//   callouts  (step; B) the phone at the right edge, as big as its lowest point lets it (rising off the frame when its foot
//             would pass footMax), right of a column of 1 to 3 numbered `callouts` (the labels as big as the column lets
//             them keep to two lines) and the `body` in the column's largest free stretch (no dead column), each callout a
//             thin leader ending on a dot at its element (never on a word or a digit: a point inside the outlined element
//             lands on the outline, another one on the nearest clean spot or on its element's own side line). For a step
//             whose elements sit low or spread
//   loupe     (step; C) the WHOLE phone at one side, the element ENLARGED in a loupe in the free column on the other side,
//             joined to its outline by two lines tangent to both (the side and the height where they cross the fewest
//             words and no side button), the `body` its caption. For a SMALL element (a toggle, a tile, a button) near the
//             screen's edge
// Every outline, band joint and loupe frame is concentric with its element: src/slides/probe.mjs measures the element's real
// box and corner radius on the capture (or the spec's row.r: capture px, or "pill"), the outline runs an even gap outside it
// (STROKE.gap, the ONE gap; less only where a neighbour or the screen's edge is closer: probe.free) with radius r + gap; the
// loupe's crop pads the element evenly and its frame's radius is (r + pad) times the zoom. The lint measures every outline's
// gap again on the capture's own edges (probe.edges: left against right, top against bottom, GAP_EVEN px apart at most) and
// refuses a row that reaches past its element (a tile and its label). No tap ring: the outline is the mark (the reviewer,
// 2026-10-19). No line enters the phone's side within STROKE.btn of a side button (BUTTONS).
// The text: the covers' type (the condensed Mtavruli at weight 600), huge, LEFT-aligned at x 72; a cover's headline stays ONE
// line while that line gets 80 % of the biggest size (A); a small label over it (the kicker, or "ნაბიჯი 2 / 3" on a step).
// The phone is FLAT and straight (no turn, no perspective, no shadow): a black body, a thin titanium rim, the real screen.
// A rising phone's lower body runs off the frame's bottom; a whole phone's foot may sit under the reply bar (to y 1868), its
// top and sides never cut; everything a graphic touches stays above KEY (y 1560).
// The zone (Instagram's Story safe zone, 1080 x 1920): the profile row and the progress bars cover the top ~250 px, the reply
// bar the bottom ~340 px, the side margin is ~65 px: nothing that matters goes above y 250, below y 1580, left of x 65 or right
// of x 1015 (STORY.edge; the text keeps 72 px, STORY.side). Only a phone's lower body runs below 1580.
//
//   layoutSlide(slide, {measure, steps, probe})  -> {layout, look, mode, boxes, sizes, phone, screen, vis, element, outline,
//     tap, callouts, rail, band, loupe, recap, notes, problems}. measure(text, size, weight, caps, track) is the text's width
//     (default: the fonts' own advances, ./metrics.mjs, the same in Node and the render); steps: the set's number of steps;
//     probe: the slide's capture probe (./probe.mjs) or null (then the spec's row is the element, its radius row.r or a
//     default). Every box in frame px; `problems` says what does not fit (the lint refuses it), `notes` what may read badly
//   layoutSet(slides, {measure, probeOf})  -> every slide's layout; probeOf(screen) gives a capture's probe
//   lookOf(slide), placeOf(slide), regionOf(row), roundRect(box, r), tangents(a, b, side), belowZone(layout), measure, mtav,
//   headLines, splitLines and the constants below
import {FIRA, NOTO} from './metrics.mjs';

export const STORY = Object.freeze({w: 1080, h: 1920, top: 250, bottom: 1580, edge: 65, side: 72});
/** the composition "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT); its still is taken at i * SLOT + SETTLED */
export const SLOT = 300;
export const SETTLED = 240;
/** every point a graphic touches (an outline, a dot, a loupe, a line's end) stays above this: the reply bar starts at 1580 */
export const KEY = 1560;
/** the flat iPhone, front-facing: the display d px wide, the bezel bez * d a side, the screen's corner r * d, the capture
 *  1080 x 2346 (sh = its height / width), the side buttons btn * d past the body. The proportions are the 3D iPhone's
 *  (src/scenes/kit/phone3d.tsx BEZ, SCR_R, SRC_W, SRC_H; tools/ci/slides.mjs --test holds them in step) */
export const FLAT = Object.freeze({bez: 0.034, r: 0.1409, sh: 2346 / 1080, btn: 0.0085});
/** the side buttons (the action button and the volume keys on the left, the side button on the right): where each starts and
 *  how long it is, shares of the body's height. Slides.tsx draws them from here, and no line enters the phone's side within
 *  STROKE.btn of one (the reviewer, 2026-10-19: "leader lines run through hardware buttons") */
export const BUTTONS = Object.freeze([
  {left: true, at: 0.148, len: 0.04},
  {left: true, at: 0.215, len: 0.068},
  {left: true, at: 0.298, len: 0.068},
  {left: false, at: 0.24, len: 0.1},
]);
/** the frame y ranges of a phone's side buttons on one side ('left' | 'right'), each grown by STROKE.btn */
export const buttonsOf = (phone, side) => {
  if (!phone) return [];
  const h = bodyOf(phone.d).h;
  return BUTTONS.filter((b) => b.left === (side === 'left')).map((b) => ({y0: phone.y + b.at * h - STROKE.btn, y1: phone.y + (b.at + b.len) * h + STROKE.btn}));
};
/** a line may cross the phone's side at y */
export const clearOfButtons = (phone, side, y) => buttonsOf(phone, side).every((b) => y < b.y0 || y > b.y1);
/** Bands of a capture to paint over on a slide (capture px, each row's own background colour, top to bottom): the 1.0.4 home
 *  and menu were captured with the list scrolled under the floating bars, so half-hidden lines of text peek between them and
 *  read as a glitch on a big phone (the reviewer, 2026-10-19). The render lays these flat strips over them; nothing else of the
 *  capture is touched */
export const SCREEN_MASKS = Object.freeze({
  '25-menu-104': [
    {x0: 88, y0: 1855, x1: 690, y1: 1871, from: '#d4d4d4', to: '#d5d5d5'},
    {x0: 88, y0: 2008, x1: 748, y1: 2045, from: '#dbdbdb', to: '#dddddd'},
  ],
  '23-home-104': [
    {x0: 88, y0: 1855, x1: 690, y1: 1871, from: '#fbfbfb', to: '#f8f8f8'},
    {x0: 88, y0: 2008, x1: 748, y1: 2045, from: '#f0f0f0', to: '#eeeeee'},
  ],
});
export const CAP = Object.freeze({w: 1080, h: 2346});
/** the body's size at display width d */
export const bodyOf = (d) => ({w: d * (1 + 2 * FLAT.bez), h: d * (FLAT.sh + 2 * FLAT.bez)});
export const SLIDE_LAYOUTS = Object.freeze(['cover', 'step', 'end', 'picture', 'fact']);
/** the layouts that show the phone (a "screen" each). A picture and a fact have none: only a car-knowledge set (no app screen
 *  to show) takes them (tools/ci/slides.mjs PHONELESS) */
export const PHONE_LAYOUTS = Object.freeze(['cover', 'step', 'end']);
export const LOOKS = Object.freeze(['plain', 'rail', 'band', 'callouts', 'loupe']);
/** the looks each layout may take (the first its default when nothing in the spec says otherwise) */
export const LOOKS_OF = Object.freeze({cover: ['plain', 'rail', 'band'], step: ['callouts', 'rail', 'band', 'loupe'], end: ['plain']});
/** a rising phone: its body's share of the frame's width (plain: centred; band: centred, room for the band's ends; rail: from
 *  the rail's gutter to `right`), the rail's x, the least of its screen inside the zone */
export const RISE = Object.freeze({plain: 0.86, band: 0.82, railX: 99, railGap: 25, right: 1005, minVis: 0.3});
/** a whole phone: its body's right edge (callouts) or left edge (a loupe on the right), the lowest its foot may sit (under the
 *  reply bar, never cut by the frame), the gap to its column, its largest display width, the least body height (BIG) */
export const WHOLE = Object.freeze({right: 1004, left: 76, footMax: 1868, gap: 44, maxD: 640, minH: 1000});
/** the callouts look (B, the reviewer 2026-10-19: "phones too small, empty dead columns"): the phone at the right edge, as big
 *  as its lowest point lets it (rising off the frame when its foot would pass footMax), the column left of it at least `col`
 *  wide, `gap` between them, the phone's top `top` under the title; the labels' type grows from TYPE.call.size to `labelMax`
 *  while every label keeps to two lines; the `body` sits in the column, in its largest free stretch */
export const CALL = Object.freeze({col: 200, gap: 34, top: 26, right: 1008, maxD: 760, labelMax: 42, empty: 560});
/** the graphics (frame px): the leader's and the band's line, the outline's stroke, its even gap to the element (ONE value on
 *  every slide; less, never under gapMin, only where a neighbour or the screen's edge is closer), the white halo on each side
 *  of a line, a dot's radius, the tap ring's radius (no longer drawn: the outline marks the element), the clearance of a line
 *  from a side button, the least air between the outline and a neighbour */
export const STROKE = Object.freeze({line: 3, outline: 4, gap: 8, gapMin: 3, halo: 2.5, dot: 8, tap: 30, btn: 12, air: 3});
/** the most an outline's gap may differ between its left and right sides, or its top and bottom (frame px, measured on the
 *  capture's own edges: tools/ci/slides.mjs refuses more) */
export const GAP_EVEN = 3;
export const CALLOUTS_MAX = 3;
/** a callout's number disc, a rail's chip */
export const BADGE = Object.freeze({size: 46, gap: 14});
export const CHIP = 54;
/** the end's recap: discs of radius r, `step` px apart, the steps' numbers (`most` at most) and a check */
export const RECAP = Object.freeze({r: 28, step: 104, most: 7});
/** the loupe: its column's width, its height at most, the least it enlarges the element (times its size on the phone), the
 *  most (frame px per capture px over the phone's own), the even pad round the element (capture px, a share of its short side) */
export const LOUPE = Object.freeze({col: 284, maxH: 430, minGrow: 1.6, maxGrow: 3.4, pad: 0.32, padMin: 16, padMax: 44, gap: 26});
/** the type: sizes in px, the line height, the widest a line may run, the most lines; caps: the condensed Mtavruli (else
 *  FiraGO's own letters); track: letter spacing (em); one: a headline without "|" stays one line while it gets this share of
 *  max, else it breaks where its two lines come out biggest */
export const TYPE = Object.freeze({
  kicker: {size: 34, weight: 600, lh: 1.2, caps: true, track: 0.06},
  head: {max: 184, min: 104, weight: 600, lh: 1.02, w: 936, lines: 2, caps: true, track: -0.01, one: 0.8},
  title: {max: 140, min: 96, weight: 600, lh: 1.02, w: 936, lines: 2, caps: true, track: -0.01, one: 0.8},
  end: {max: 150, min: 96, weight: 600, lh: 1.03, w: 936, lines: 2, caps: true, track: -0.01, one: 0.8},
  ptitle: {max: 120, min: 70, weight: 600, lh: 1.04, w: 936, lines: 2, caps: true, track: -0.01, one: 0.85},
  body: {size: 40, weight: 400, lh: 1.28, w: 936, lines: 2, caps: false},
  label: {size: 40, weight: 700, lh: 1.15, lines: 1, caps: false},
  call: {size: 34, weight: 600, lh: 1.2, lines: 3, caps: false},
  cap: {size: 36, weight: 500, lh: 1.28, lines: 3, caps: false},
  note: {size: 34, weight: 500, lh: 1.25, w: 936, lines: 1, caps: false},
  big: {max: 300, min: 140, weight: 700, lh: 1, w: 936, caps: true},
});
const TOP = STORY.top + 14; // the first line's top, just under Instagram's bars
const L = STORY.side;
const W = STORY.w - 2 * STORY.side;
const FOOT = 1552; // a picture's bottom (car knowledge)
const LABEL_GAP = 30; // between two callouts in the column

/** "line one | line two" -> ['line one', 'line two'] */
export const splitLines = (s) =>
  String(s ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
/** Mkhedruli -> Mtavruli (src/lib/format.ts mtav) */
export const mtav = (s) => String(s).replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xbc0));
const nearest = (table, weight) => {
  const ks = Object.keys(table).map(Number);
  return table[ks.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a))];
};
/** the width (px) of `text` at `size`: the fonts' own advances (./metrics.mjs, no kerning); caps: through mtav(), the
 *  Mtavruli from NotoGeo, the rest from FiraGO; track: CSS letter-spacing in em, after every character */
export const measure = (text, size, weight = 700, caps = true, track = 0) => {
  const fira = nearest(FIRA, weight);
  const noto = nearest(NOTO, weight);
  let u = 0;
  let n = 0;
  for (const ch of caps ? mtav(text) : String(text)) {
    u += noto[ch] ?? fira[ch] ?? 600;
    n++;
  }
  return (u * size) / 1000 + track * size * n;
};
/** the old name: the same measure */
export const estimate = measure;

/** a paragraph's words, a number kept with its short unit („~97 MB", „5 წთ": never broken over two lines) */
const wordsOf = (para) =>
  para.split(/\s+/).reduce((acc, w) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && /\d$/.test(last) && [...w].length <= 3) acc[acc.length - 1] = `${last} ${w}`;
    else acc.push(w);
    return acc;
  }, []);
/** words wrapped into lines of `w` px */
const wrap = (text, t, w, m) => {
  const out = [];
  for (const para of splitLines(text)) {
    let cur = '';
    for (const word of wordsOf(para)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && m(next, t.size, t.weight, t.caps, t.track ?? 0) > w) {
        out.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) out.push(cur);
  }
  return out;
};
/** the narrowest width (px) that sets `text` in `lines` lines at most */
const narrowest = (text, t, lines, m) => {
  const words = splitLines(text).flatMap(wordsOf);
  let lo = Math.max(1, ...words.map((x) => m(x, t.size, t.weight, t.caps, t.track ?? 0)));
  let hi = Math.max(lo, m(splitLines(text).join(' '), t.size, t.weight, t.caps, t.track ?? 0));
  if (wrap(text, t, lo, m).length <= lines) return lo;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    if (wrap(text, t, mid, m).length <= lines) hi = mid;
    else lo = mid;
  }
  return hi;
};
/** the biggest size (max at most) at which every line fits w */
const fitSize = (lines, t, w, m) => {
  const widest = Math.max(1, ...lines.map((l) => m(l, t.max, t.weight, t.caps, t.track ?? 0)));
  return Math.min(t.max, Math.floor((t.max * w) / widest));
};
/** a headline's lines: the author's "|" breaks, else one line, or the two-line break that sets it biggest when one line
 *  would fall under t.one of max (on a tie the more even break) */
export const headLines = (text, t, w = t.w, m = measure) => {
  const given = splitLines(text);
  if (given.length !== 1) return given;
  const words = given[0].split(/\s+/);
  const one = fitSize(given, t, w, m);
  if (words.length < 2 || one >= t.one * t.max || t.lines < 2) return given;
  let best = given;
  let bestS = one;
  let bestD = Infinity;
  for (let i = 1; i < words.length; i++) {
    const c = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const s = fitSize(c, t, w, m);
    const d = Math.abs(m(c[0], 100, t.weight, t.caps) - m(c[1], 100, t.weight, t.caps));
    if (s > bestS + 0.5 || (Math.abs(s - bestS) <= 0.5 && best.length === 2 && d < bestD)) {
      best = c;
      bestS = s;
      bestD = d;
    }
  }
  return best;
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlapY = (a, b) => a.y < b.y + b.h && b.y < a.y + a.h;
/** a spec row {y, h[, x, w]} (capture fractions; x and w default to a full-width row) -> {x0, y0, x1, y1} fractions */
export const regionOf = (r) => {
  const x = Number.isFinite(r?.x) ? r.x : 0.03;
  const w = Number.isFinite(r?.w) ? r.w : 0.94;
  return {x0: x, y0: Number(r?.y ?? 0), x1: x + w, y1: Number(r?.y ?? 0) + Number(r?.h ?? 0)};
};
const hasRow = (s) => Boolean(s?.row && typeof s.row === 'object' && Number.isFinite(s.row.y) && Number.isFinite(s.row.h));

/** the slide's look: its own "look", else what its fields say (callouts, a loupe, a label), else its layout's default */
export const lookOf = (s) => {
  const layout = SLIDE_LAYOUTS.includes(s?.layout) ? s.layout : 'step';
  const ok = LOOKS_OF[layout];
  if (!ok) return null;
  if (ok.includes(s?.look)) return s.look;
  if (layout === 'step') return s?.loupe || s?.lift ? 'loupe' : typeof s?.label === 'string' && s.label.trim() && !(Array.isArray(s?.callouts) && s.callouts.length) ? 'rail' : 'callouts';
  if (layout === 'cover' && hasRow(s)) return typeof s?.label === 'string' && s.label.trim() ? 'rail' : 'band';
  return 'plain';
};
/** where the phone stands: rising ("rise") or whole ("whole") */
export const placeOf = (s) => {
  const look = lookOf(s);
  if (look === 'callouts' || look === 'loupe') return 'whole';
  if (look === 'plain' && s?.phone === 'whole') return 'whole';
  return 'rise';
};
/** the old name (B): the phone's placement */
export const modeOf = placeOf;

/** a rounded rectangle's path (SVG d), its corners of radius r (clamped to half its short side) */
export const roundRect = (b, r) => {
  const rr = clamp(r, 0, Math.min(b.w, b.h) / 2);
  const f = (v) => v.toFixed(2);
  const {x, y, w, h} = b;
  return `M${f(x + rr)} ${f(y)}H${f(x + w - rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x + w)} ${f(y + rr)}V${f(y + h - rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x + w - rr)} ${f(y + h)}H${f(x + rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x)} ${f(y + h - rr)}V${f(y + rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(x + rr)} ${f(y)}Z`;
};
/** the outer tangent of two circles {x, y, r} on one side: up (-1, the line over both) or down (1): [point on a, point on b] */
export const tangent = (a, b, up) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6 || d <= Math.abs(a.r - b.r)) return [{x: a.x, y: a.y + up * a.r}, {x: b.x, y: b.y + up * b.r}];
  const th = Math.atan2(dy, dx);
  const al = Math.acos((a.r - b.r) / d);
  const cands = [th + al, th - al].map((ang) => ({n: {x: Math.cos(ang), y: Math.sin(ang)}}));
  const c = cands.reduce((p, q) => (q.n.y * up > p.n.y * up ? q : p));
  return [
    {x: a.x + a.r * c.n.x, y: a.y + a.r * c.n.y},
    {x: b.x + b.r * c.n.x, y: b.y + b.r * c.n.y},
  ];
};
/** the two lines joining an outline and its loupe (rounded boxes {x, y, w, h, r}), tangent to both on the facing corners */
export const tangents = (o, l) => {
  const right = l.x >= o.x + o.w; // the loupe right of the outline
  const corner = (b, rightSide, bottom) => ({x: rightSide ? b.x + b.w - b.r : b.x + b.r, y: bottom ? b.y + b.h - b.r : b.y + b.r, r: b.r});
  return [false, true].map((bottom) => tangent(corner(o, right, bottom), corner(l, !right, bottom), bottom ? 1 : -1));
};

/** a capture point (px) on the frame, and back */
const toFrame = (scr, cx, cy) => ({x: scr.x + (cx / CAP.w) * scr.w, y: scr.y + (cy / CAP.h) * scr.h});
const toCap = (scr, p) => ({x: ((p.x - scr.x) / scr.w) * CAP.w, y: ((p.y - scr.y) / scr.h) * CAP.h});
/** the part of segment a..b inside box s (Liang-Barsky), or null */
const clip = (a, b, s) => {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - s.x],
    [dx, s.x + s.w - a.x],
    [-dy, a.y - s.y],
    [dy, s.y + s.h - a.y],
  ]) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  return t0 < t1 ? [{x: a.x + t0 * dx, y: a.y + t0 * dy}, {x: a.x + t1 * dx, y: a.y + t1 * dy}] : null;
};

/** Every element's box on one slide. */
export const layoutSlide = (slide, {measure: m = measure, steps = null, probe = null} = {}) => {
  const s = slide && typeof slide === 'object' ? slide : {};
  const layout = SLIDE_LAYOUTS.includes(s.layout) ? s.layout : 'step';
  const hasPhone = PHONE_LAYOUTS.includes(layout);
  const look = hasPhone ? lookOf(s) : null;
  const mode = hasPhone ? placeOf(s) : null;
  const boxes = {};
  const sizes = {};
  const problems = [];
  const notes = [];
  const out = {layout, look, mode, boxes, sizes, phone: null, screen: null, vis: null, element: null, outline: null, tap: null, callouts: [], rail: null, band: null, loupe: null, recap: null, notes, problems};
  const lineH = (t) => t.size * t.lh;
  const block = (key, y, text, t, maxLines, x = L, w = W) => {
    if (!text) return y;
    const ls = wrap(text, t, w, m);
    if (ls.length > maxLines) problems.push(`${key === 'note' ? 'the note' : `"${String(text).slice(0, 40)}"`} runs to ${ls.length} lines (${maxLines} at most${hasPhone ? ': the phone needs the room' : ''}): say less`);
    const h = Math.min(ls.length, maxLines) * lineH(t);
    sizes[`${key}Lines`] = ls.slice(0, maxLines);
    boxes[key] = {x, y, w, h};
    return y + h;
  };
  const kickerBlock = (y, text) => {
    if (!text) return y;
    const t = TYPE.kicker;
    if (m(text, t.size, t.weight, t.caps, t.track) > W) problems.push(`the kicker "${String(text).slice(0, 30)}" is too long for one line`);
    sizes.kicker = String(text);
    boxes.kicker = {x: L, y, w: W, h: lineH(t)};
    return y + boxes.kicker.h + 16;
  };
  /** the headline, LEFT-aligned at the text's edge like the covers */
  const headBlock = (key, y, text, t) => {
    const ls = headLines(text, t, t.w, m);
    if (!ls.length) return y;
    if (ls.length > t.lines) problems.push(`the ${key === 'title' ? "step's title" : 'headline'} has ${ls.length} lines (${t.lines} at most)`);
    const use = ls.slice(0, t.lines);
    const size = fitSize(use, t, t.w, m);
    if (size < t.min) problems.push(`"${use.join(' | ')}" is too long: ${size} px (${t.min} at least, the owner: BIG): ${use.length < 2 ? 'break it in two with "|"' : 'shorter words'}`);
    sizes[key] = Math.max(t.min, size);
    sizes[`${key}Lines`] = use;
    boxes[key] = {x: L - 2, y, w: t.w + 4, h: use.length * sizes[key] * t.lh};
    return y + boxes[key].h;
  };

  // ---- a car-knowledge set's picture and fact (no phone) -----------------------------------------------------------------
  if (layout === 'picture') {
    let y = headBlock('head', TOP + 12, s.title, TYPE.ptitle);
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, 2);
    const top = y + 30;
    if (FOOT - top < 600) problems.push(`the picture gets only ${Math.max(0, Math.round(FOOT - top))} px of height (600 at least): shorten the title or the body`);
    boxes.picture = {x: 0, y: top, w: STORY.w, h: Math.max(1, FOOT - top)};
    return finish(out);
  }
  if (layout === 'fact') {
    let y = TOP + 72;
    if (s.icon) {
      boxes.icon = {x: L, y, w: 160, h: 160};
      y += 160 + 36;
    }
    const big = String(s.big ?? '');
    const unit = String(s.unit ?? '');
    const t = TYPE.big;
    const wBig = m(`${big}${unit ? ` ${unit}` : ''}`, t.max, t.weight, t.caps);
    let size = wBig > t.w ? Math.floor((t.max * t.w) / wBig) : t.max;
    if (size < t.min) problems.push(`the big number "${big} ${unit}" is too long (it needs ${size} px; ${t.min} at least): a number and a short unit`);
    size = Math.max(t.min, size);
    sizes.big = size;
    boxes.big = {x: L, y, w: W, h: size * t.lh};
    y += size * t.lh + 30;
    y = headBlock('head', y, s.title, TYPE.ptitle);
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
    if (s.note) y = block('note', y + 16, s.note, TYPE.note, 2);
    if (y > FOOT) problems.push('the fact runs past the safe zone: a shorter title or body');
    const bs = Object.values(boxes);
    const y0 = Math.min(...bs.map((b) => b.y));
    const y1 = Math.max(...bs.map((b) => b.y + b.h));
    const dy = Math.max(TOP - y0, Math.min(FOOT - y1, (STORY.top + STORY.bottom) / 2 - (y0 + y1) / 2));
    for (const b of bs) b.y += dy;
    return finish(out);
  }

  // ---- the text: the label, the headline, the look's own words ------------------------------------------------------------
  const tHead = layout === 'cover' ? TYPE.head : layout === 'end' ? TYPE.end : TYPE.title;
  const headKey = layout === 'step' ? 'title' : 'head';
  let y = kickerBlock(TOP, layout === 'step' ? `ნაბიჯი ${Number(s.n ?? 1)}${steps ? ` / ${steps}` : ''}` : typeof s.kicker === 'string' ? s.kicker.trim() : '');
  y = headBlock(headKey, y, s.title, tHead);
  const label = typeof s.label === 'string' ? s.label.trim() : '';
  const row = hasRow(s) ? regionOf(s.row) : null;
  let calls = Array.isArray(s.callouts) ? s.callouts.filter((c) => c && typeof c === 'object') : [];
  if (look === 'plain') {
    if (layout === 'end' && steps >= 2 && s.recap !== false) {
      const n = Math.min(steps, RECAP.most);
      boxes.recap = {x: L, y: y + 30, w: n * RECAP.step + 2 * RECAP.r, h: 2 * RECAP.r};
      out.recap = {box: boxes.recap, n};
      y = boxes.recap.y + boxes.recap.h;
    }
    if (s.body) y = block('body', y + 22, s.body, TYPE.body, TYPE.body.lines);
    if (s.note) y = block('note', y + 14, s.note, TYPE.note, TYPE.note.lines);
    // a plain cover may outline its element (the outline alone, no line: the reviewer, 2026-10-19, on the QR cover's band that
    // ran into the side button); the end shows the phone calm
    if ((row && layout !== 'cover') || calls.length || s.loupe) problems.push(`a ${layout} in the plain look shows the phone calm: ${layout === 'cover' ? 'at most a "row" (its outline), no callout, no loupe (a cover that points at its element with a line takes "look": "rail" or "band")' : 'no row, no callout, no loupe'}`);
  } else if (look === 'rail') {
    if (!label) problems.push('the rail look needs a "label": the element\'s name or what to do there, 2 to 4 words („შეეხე ბარათს")');
    if (s.body) problems.push('the rail look has no "body" (its "label" says it, beside the chip)');
    const t = TYPE.label;
    const chipY = y + 32;
    const tx = L + CHIP + 20;
    const ls = label ? wrap(label, t, STORY.w - STORY.side - tx, m) : [];
    if (ls.length > 1) problems.push(`the label "${label.slice(0, 30)}" runs to ${ls.length} lines (one short line beside the chip)`);
    boxes.chip = {x: L, y: chipY, w: CHIP, h: CHIP};
    if (label) {
      sizes.labelLines = ls.slice(0, 1);
      boxes.label = {x: tx, y: chipY + (CHIP - lineH(t)) / 2, w: STORY.w - STORY.side - tx, h: lineH(t)};
    }
    y = chipY + CHIP;
    if (s.note) y = block('note', y + 14, s.note, TYPE.note, TYPE.note.lines);
  } else if (look === 'band') {
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, TYPE.body.lines);
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, TYPE.note.lines);
    if (label) problems.push('the band look takes its words from "body" (the line under the title), not "label"');
  } else if (look === 'callouts') {
    // with callouts the body sits in the column beside the phone (placed with them, below); without, one line under the title
    if (s.body && !calls.length) y = block('body', y + 18, s.body, TYPE.body, 1);
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, TYPE.note.lines);
    if (label) problems.push('the callouts look has no "label": its "callouts" name the elements');
  } else if (look === 'loupe') {
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, TYPE.note.lines);
    if (label) problems.push('the loupe look has no "label": its "body" is the loupe\'s caption');
    if (s.tap) problems.push('the loupe look has no "tap": the loupe shows the element big, its outline says "here"');
    if (calls.length) problems.push('the loupe look has no "callouts" (the loupe and its caption fill the column): "look": "callouts" for those');
  }
  if ((look === 'rail' || look === 'band' || look === 'loupe') && !row) problems.push(`the ${look} look needs a "row" (the element it points at)`);
  if (look !== 'callouts' && look !== 'plain' && calls.length && look !== 'loupe') problems.push(`the ${look} look has no "callouts" ("look": "callouts" for those)`);
  const textBottom = y;

  // ---- the element: its real box and corner radius on the capture (./probe.mjs), or the spec's row -----------------------
  let el = null; // capture px
  if (row) {
    const shp = probe?.shape ? probe.shape(row) : null;
    const box = shp?.found ? {x0: shp.x0, y0: shp.y0, x1: shp.x1, y1: shp.y1} : {x0: row.x0 * CAP.w, y0: row.y0 * CAP.h, x1: row.x1 * CAP.w, y1: row.y1 * CAP.h};
    const short = Math.min(box.x1 - box.x0, box.y1 - box.y0);
    let r = s.row.r === 'pill' ? short / 2 : Number.isFinite(s.row.r) ? s.row.r : shp?.r ?? Math.min(30, short / 2);
    r = clamp(r, 0, short / 2);
    el = {...box, r, pill: s.row.r === 'pill' || Boolean(shp?.pill && !Number.isFinite(s.row.r)), found: Boolean(shp?.found), closed: Boolean(shp?.found && shp?.closed), outlined: Boolean(shp?.outlined), ground: shp?.ground ?? null};
    if (shp?.found && shp.extended && !Number.isFinite(s.row.r) && s.row.r !== 'pill') problems.push('the row reaches past its element (a tile AND its label, a button and the words beside it): the outline would not follow the element\'s own shape: make the row the element alone (the gap keeps the outline off its label)');
    out.shape = {measured: Boolean(shp?.found), x0: Math.round(box.x0), y0: Math.round(box.y0), x1: Math.round(box.x1), y1: Math.round(box.y1), r: Math.round(r), pill: el.pill, from: Number.isFinite(s.row.r) || s.row.r === 'pill' ? 'spec' : shp?.found ? (shp.r !== null ? 'capture' : 'capture box, default radius') : 'spec row, default radius'};
  }
  const elV1 = el ? el.y1 / CAP.h : null;

  // ---- the phone ------------------------------------------------------------------------------------------------------------
  const BW = 1 + 2 * FLAT.bez;
  const BH = FLAT.sh + 2 * FLAT.bez;
  const place = (x, top, d, md) => {
    const b = bodyOf(d);
    out.phone = {mode: md, d, x, y: top, w: b.w, h: b.h};
    const bez = FLAT.bez * d;
    out.screen = {x: x + bez, y: top + bez, w: d, h: d * FLAT.sh};
    boxes.phone = {x, y: top, w: b.w, h: Math.max(1, Math.min(b.h, STORY.bottom - top))};
  };
  /** the lowest capture point (fraction) a graphic touches: the element's foot (its outline below it), a callout's point */
  const keyV = () => {
    const vs = [...calls.map((c) => Number(c.y) || 0)];
    if (el) vs.push(el.y1 / CAP.h + 0.012);
    if (s.tap && typeof s.tap === 'object' && Number.isFinite(s.tap.y)) vs.push(s.tap.y + 0.02);
    return vs.length ? Math.max(...vs) : 0;
  };
  // the callouts' column: wide enough for each label in two lines, the phone gets the rest
  const callT = TYPE.call;
  const needCol = () => {
    if (look === 'loupe') return LOUPE.col;
    if (!calls.length) return 0;
    const textW = Math.max(...calls.map((c) => narrowest(String(c.text ?? ''), callT, 2, m)));
    return clamp(BADGE.size + BADGE.gap + textW + 12, CALL.col, 400);
  };
  const wholeD = (top, room) => {
    const v = keyV();
    const dFoot = (WHOLE.footMax - top) / BH;
    const dKey = v > 0 ? (KEY - 8 - top) / (FLAT.bez + v * FLAT.sh) : Infinity;
    const dRoom = room / BW;
    return Math.min(WHOLE.maxD, dFoot, dKey, dRoom);
  };
  let side = null; // a loupe's side of the phone
  if (mode === 'rise') {
    const top = textBottom + (look === 'plain' ? 52 : 40);
    let x;
    let bw;
    if (look === 'rail') {
      x = RISE.railX + RISE.railGap;
      bw = RISE.right - x;
    } else {
      bw = STORY.w * (look === 'band' ? RISE.band : RISE.plain);
      x = (STORY.w - bw) / 2;
    }
    place(x, top, bw / BW, 'rise');
    out.vis = clamp((KEY - out.screen.y) / out.screen.h, 0, 1);
    if (out.vis < RISE.minVis) problems.push(`the rising phone shows only ${Math.round(out.vis * 100)} % of its screen inside the zone (${RISE.minVis * 100} % at least): a shorter headline, no sub-line`);
    if (el && keyV() > out.vis + 1e-6) problems.push(`the row (y ${row.y0.toFixed(2)}..${row.y1.toFixed(2)} of the screen) sits below what the rising phone shows (its top ${Math.floor(out.vis * 100)} %): a row that high, or "look": "callouts" or "loupe" (the whole phone)`);
  } else if (look === 'callouts') {
    // B, made BIG (the reviewer, 2026-10-19: phones at 53-57 % left dead columns): the phone at the right edge, its top just
    // under the title, as big as its lowest point lets it (the element's outline above KEY), rising off the frame when its
    // foot would pass footMax; the column left of it for the labels and the body. With no callouts: centred, as big
    const top = textBottom + CALL.top;
    const v = keyV();
    const dKey = v > 0 ? (KEY - 8 - top) / (FLAT.bez + v * FLAT.sh) : Infinity;
    const col = calls.length ? Math.max(CALL.col, needCol()) : 0;
    const room = calls.length ? CALL.right - (L + col + CALL.gap) : STORY.w - 2 * WHOLE.left;
    const d = Math.min(CALL.maxD, dKey, room / BW);
    const b = bodyOf(d);
    place(calls.length ? CALL.right - b.w : (STORY.w - b.w) / 2, top, d, top + b.h > WHOLE.footMax ? 'rise' : 'whole');
    out.mode = out.phone.mode;
    if (calls.length) out.colW = out.phone.x - CALL.gap - L;
    if (b.h < WHOLE.minH - 0.5) problems.push(`the text and the points leave the phone only ${Math.round(b.h)} px of height (${WHOLE.minH} at least: the phone is BIG): a one-line title, or points higher on the screen`);
    out.vis = clamp((KEY - out.screen.y) / out.screen.h, 0, 1);
    if (v > out.vis + 1e-6) problems.push(`a point at y ${v.toFixed(2)} of the screen falls under the reply bar: a higher element`);
  } else {
    const top = textBottom + WHOLE.gap;
    if (look === 'plain') {
      // nothing beside it: the whole phone centred, as big as the zone lets it (no empty column)
      const d = wholeD(top, STORY.w - 2 * WHOLE.left);
      place((STORY.w - bodyOf(d).w) / 2, top, d, 'whole');
    } else {
      const col = needCol();
      const room = WHOLE.right - (L + col + WHOLE.gap);
      const d = wholeD(top, room);
      // callouts: the phone right; a loupe: the phone on the side away from its element (its lines stay short), decided
      // below with the capture's words in view
      const wantRight = look === 'callouts' || !el || (el.x0 + el.x1) / 2 / CAP.w < 0.5;
      side = look === 'loupe' ? (wantRight ? 'left' : 'right') : null;
      place(look === 'loupe' && !wantRight ? WHOLE.left : WHOLE.right - bodyOf(d).w, top, d, 'whole');
      out.colW = col;
    }
    const b = bodyOf(out.phone.d);
    if (b.h < WHOLE.minH - 0.5) problems.push(`the text and the points leave the whole phone only ${Math.round(b.h)} px of height (${WHOLE.minH} at least: the phone is BIG): a one-line title, no sub-line, or points higher on the screen`);
    out.vis = clamp((KEY - out.screen.y) / out.screen.h, 0, 1);
    if (keyV() > out.vis + 1e-6) problems.push(`a point at y ${keyV().toFixed(2)} of the screen falls under the reply bar: a higher element`);
  }
  const scr = out.screen;
  const kf = scr.w / CAP.w; // frame px per capture px
  /** the share of a segment's run over the screen that crosses words (a run under 24 px only touches the screen's margin) */
  const capBusy = (a, b, strict = false) => {
    if (!probe?.busy) return 0;
    const seg = clip(a, b, {x: scr.x + 2, y: scr.y + 2, w: scr.w - 4, h: Math.min(scr.h, KEY - scr.y) - 4});
    if (!seg || (!strict && Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y) < 24)) return 0;
    return probe.busy(toCap(scr, seg[0]), toCap(scr, seg[1]));
  };

  /** a lane along y that runs alongside an edge (a tile's top a few px away): the colours 6 px over and under it differ along
   *  more than a fifth of its run on the screen */
  const hugs = (y, x0, x1) => {
    if (!probe?.hugs) return false;
    const a = Math.max(x0, scr.x + 2);
    const b = Math.min(x1, scr.x + scr.w - 2);
    if (b - a < 24) return false;
    return probe.hugs(toCap(scr, {x: a, y}), toCap(scr, {x: b, y}), 6 / kf) > 0.2;
  };

  // ---- the outline: concentric with the element, an even gap all round, never touching it --------------------------------
  if (el) {
    const E = {x: scr.x + el.x0 * kf, y: scr.y + el.y0 * kf, w: (el.x1 - el.x0) * kf, h: (el.y1 - el.y0) * kf, r: el.r * kf};
    out.element = E;
    const sw = STROKE.outline;
    // ONE gap on every slide (STROKE.gap); less only where the screen's edge or a neighbour is closer (a tile in a grid, a
    // button over the next one: the stroke keeps STROKE.air off it), never under gapMin. Its white halo goes outside only
    // where the neighbour leaves room for it (on a tight gutter it would paint over the app)
    const room = Math.min(E.x - scr.x, scr.x + scr.w - E.x - E.w, E.y - scr.y, scr.y + scr.h - E.y - E.h);
    const fr = el.found && probe?.free ? probe.free(el) : null;
    const near = Number.isFinite(fr?.min) ? fr.min * kf : Infinity;
    const gap = clamp(Math.min(STROKE.gap, room - sw - STROKE.halo, near - sw - STROKE.air), STROKE.gapMin, STROKE.gap);
    const g = gap + sw / 2; // the stroke's centre line
    out.outline = {x: E.x - g, y: E.y - g, w: E.w + 2 * g, h: E.h + 2 * g, r: E.r + g, gap, pill: el.pill, haloOut: near - gap - sw >= STROKE.halo + 1};
    if (near - gap - sw < 0.5) notes.push(`the outline touches the element's neighbour (${Math.round(near)} px free round it): a smaller row, or another look`);
  }
  const o = out.outline;
  if (o && probe?.busy) {
    // the outline never cuts through a label over or under its element (a row that ends in the middle of the words): its
    // top and bottom sides, the stroke and its halo, clear (its sides often run over a map's texture: not checked)
    const reach = STROKE.outline / 2 + (o.haloOut ? STROKE.halo : 0);
    for (const [k, yy, out1] of [
      ['top', o.y, -1],
      ['bottom', o.y + o.h, 1],
    ]) {
      if (o.w - 2 * o.r < 12) continue;
      const bz = Math.max(...[0, out1 * reach].map((dy) => capBusy({x: o.x + o.r, y: yy + dy}, {x: o.x + o.w - o.r, y: yy + dy}, true)));
      if (bz > 0.15) notes.push(`the outline's ${k} side runs through words or icons (${Math.round(bz * 100)} %): make the row take them in, or leave them out`);
    }
  }
  // the concentric check on the capture's own pixels (the reviewer, 2026-10-19: "add a check that fails when the left and right
  // gaps, or the top and bottom ones, differ by more than 3 px"): the element's edges found again, independently of the
  // probe's fill (the strongest step across each side's middle, or a drawn frame's first line), and the outline's stroke
  // measured against them
  if (o && el?.found && el.closed && probe?.edges) {
    const real = probe.edges(el, el.outlined);
    if (real) {
      const sw2 = STROKE.outline / 2;
      const gp = {l: scr.x + real.x0 * kf - (o.x + sw2), r: o.x + o.w - sw2 - (scr.x + real.x1 * kf), t: scr.y + real.y0 * kf - (o.y + sw2), b: o.y + o.h - sw2 - (scr.y + real.y1 * kf)};
      out.gaps = Object.fromEntries(Object.entries(gp).map(([k, v]) => [k, Math.round(v * 10) / 10]));
      if (Math.abs(gp.l - gp.r) > GAP_EVEN || Math.abs(gp.t - gp.b) > GAP_EVEN)
        problems.push(`the outline is not concentric with its element: its gap is ${out.gaps.l} px left, ${out.gaps.r} right, ${out.gaps.t} top, ${out.gaps.b} bottom (${GAP_EVEN} px apart at most): fix "row", or give "row.r"`);
    }
  }
  const ph0 = out.phone;
  /** where a line from the left meets the outline: its left side at y, on its straight part, clear of the phone's side
   *  buttons (the y nearest the one asked for); a pill's at its middle. null when no such y exists */
  const leftJoint = (yy) => {
    if (o.h - 2 * o.r <= 2) return {x: o.x, y: o.y + o.h / 2};
    const lo = o.y + o.r;
    const hi = o.y + o.h - o.r;
    const y0 = clamp(yy, lo, hi);
    for (let d = 0; d <= hi - lo; d += 2) for (const y1 of [y0 - d, y0 + d]) if (y1 >= lo && y1 <= hi && clearOfButtons(ph0, 'left', y1)) return {x: o.x, y: y1};
    return {x: o.x, y: y0};
  };
  /** how a line from the left reaches a point on the screen: straight along its height when that crosses no words and no
   *  side button, else along the nearest clear lane (the gap between two rows, clear of the buttons) and then straight up or
   *  down into it (the joint then on the outline's top or bottom side). -> {pts: [the screen's left edge .. the dot], dot,
   *  lane} */
  const approach = (dot, toOutline) => {
    const sx = scr.x - 1;
    const direct = {pts: [{x: sx, y: dot.y}, dot], dot, lane: null};
    // the last few px are under the dot (or the outline's stroke): what they cover is not crossed
    const end = {x: dot.x - (toOutline ? STROKE.outline : STROKE.dot + 4), y: dot.y};
    if (clearOfButtons(ph0, 'left', dot.y) && (!probe?.busy || end.x <= sx || capBusy({x: sx, y: dot.y}, end) <= 0.06)) return direct;
    // an outline: level with one of its rounded left corners, where a clear line meets the arc (the dot ON the arc)
    if (toOutline && probe?.busy && o.r > 6) {
      const ys = [];
      for (let t = 0.85; t >= 0.08; t -= 0.05) ys.push(o.y + o.r - t * o.r, o.y + o.h - o.r + t * o.r);
      for (const ly of ys) {
        if (ly < scr.y + 24 || ly > KEY - 6 || !clearOfButtons(ph0, 'left', ly)) continue;
        const dy = ly < o.y + o.h / 2 ? o.y + o.r - ly : ly - (o.y + o.h - o.r);
        const ax = o.x + o.r - Math.sqrt(Math.max(0, o.r * o.r - dy * dy));
        if ([-4, 0, 4].some((d) => capBusy({x: sx, y: ly + d}, {x: ax - STROKE.outline, y: ly + d}) > 0.02) || hugs(ly, sx, ax - 6)) continue;
        const jd = {x: ax, y: ly};
        return {pts: [{x: sx, y: ly}, jd], dot: jd, lane: ly};
      }
    }
    const top = toOutline ? o.y : dot.y;
    const bottom = toOutline ? o.y + o.h : dot.y;
    const jx = toOutline ? (o.w < 360 ? o.x + o.w / 2 : o.x + o.r + 36) : dot.x;
    for (let d = 6; d <= 220; d += 2) {
      for (const [ly, edge, dir] of [
        [top - d, top, -1],
        [bottom + d, bottom, 1],
      ]) {
        if (ly < scr.y + 24 || ly > KEY - 6 || !clearOfButtons(ph0, 'left', ly)) continue;
        // a lane: clear along the line and 4 px either side of it (the line and its halo never graze a word)
        if (probe?.busy && ([-4, 0, 4].some((dy) => capBusy({x: sx, y: ly + dy}, {x: jx, y: ly + dy}) > 0.02) || hugs(ly, sx, jx - 6))) continue;
        // a lane right next to the outline reads as a slip: the step into it is 14 px at least
        if (Math.abs(ly - edge) < 14) continue;
        if (probe?.busy && capBusy({x: jx, y: ly}, {x: jx, y: edge + dir * (STROKE.outline + 2)}, true) > 0.02) continue;
        const jd = {x: jx, y: edge};
        return {pts: [{x: sx, y: ly}, {x: jx, y: ly}, jd], dot: jd, lane: ly};
      }
    }
    return {...direct, busy: true};
  };

  // ---- the tap: the outline IS the mark (the reviewer, 2026-10-19: a ring as tall as a pill broke its round end, a ring in
  // an outlined tile was a third nested shape, and three ring styles came up across the slides): no ring is drawn on an
  // outlined element; "tap" is kept in old sets and draws nothing
  out.tap = null;

  // ---- rail (A): the dot, the line down the rail and into the outline ------------------------------------------------------
  if (look === 'rail' && o) {
    const cx = boxes.chip.x + CHIP / 2;
    const ap = approach(leftJoint(out.element.y + out.element.h / 2), true);
    const y0 = ap.pts[0].y;
    // ONE marker on every rail: a plain dot (a step's number is its "ნაბიჯი n / N" already)
    out.rail = {chip: boxes.chip, n: null, path: [{x: cx, y: boxes.chip.y + CHIP + 10}, {x: cx, y: y0}, ...ap.pts], dot: ap.dot};
    if (ap.busy) notes.push("the rail's line crosses the screen's words or a side button on its way in and no clear lane is near: an element nearer the screen's left edge, or another look");
  }

  // ---- band (C): one line across the row, past both edges of the phone ----------------------------------------------------
  // down from the body (its label) in the gutter left of the side buttons, across the row at a height that clears every side
  // button by STROKE.btn, its dots ON the outline where it meets it (never on a loose end: the reviewer, 2026-10-19, on a dot
  // beside the side button that read "press the side button"); with no such height, no band (the outline alone) and a note
  if (look === 'band' && o) {
    const lo = o.h - 2 * o.r > 2 ? o.y + o.r : o.y + o.h / 2;
    const hi = o.h - 2 * o.r > 2 ? o.y + o.h - o.r : o.y + o.h / 2;
    const mid = o.y + o.h / 2;
    let yy = null;
    for (let d = 0; yy === null && d <= (hi - lo) / 2 + 1; d += 2) for (const y1 of [mid - d, mid + d]) if (yy === null && y1 >= lo - 0.5 && y1 <= hi + 0.5 && clearOfButtons(ph0, 'left', y1) && clearOfButtons(ph0, 'right', y1)) yy = y1;
    if (yy === null || Math.abs(yy - mid) > 0.3 * o.h) notes.push('the band would cross a side button of the phone at every height of its row: "look": "plain" with the "row" (its outline alone), or "rail"');
    else {
      const btnW = FLAT.btn * ph0.d;
      const xl = Math.max(STORY.edge + 4, ph0.x - btnW - 14);
      const xr = Math.min(STORY.w - STORY.edge - 4, ph0.x + ph0.w + btnW + 26);
      const left = boxes.body ? [{x: xl, y: boxes.body.y + boxes.body.h + 22}, {x: xl, y: yy}, {x: o.x, y: yy}] : [{x: xl, y: yy}, {x: o.x, y: yy}];
      out.band = {left, right: [{x: o.x + o.w, y: yy}, {x: xr, y: yy}], dots: [{x: o.x, y: yy}, {x: o.x + o.w, y: yy}]};
      const bz = Math.max(capBusy({x: scr.x, y: yy}, {x: o.x, y: yy}), capBusy({x: o.x + o.w, y: yy}, {x: scr.x + scr.w, y: yy}));
      if (bz > 0.12) notes.push(`the band crosses the screen's words beside the element (${Math.round(bz * 100)} %): the band is for a full-width row`);
    }
  }

  // ---- callouts (B): a column of numbered labels, each line ending on a dot at its element ---------------------------------
  if (look === 'callouts' && calls.length) {
    if (calls.length > CALLOUTS_MAX) problems.push(`${calls.length} callouts (${CALLOUTS_MAX} at most)`);
    calls = calls.slice(0, CALLOUTS_MAX);
    const okCalls = calls.every((c) => typeof c.text === 'string' && c.text.trim() && Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1);
    if (!okCalls) problems.push('a callout is {"text", "x", "y"} (its point on the capture, fractions 0..1)');
    calls = calls.filter((c) => typeof c.text === 'string' && c.text.trim() && Number.isFinite(c.x) && Number.isFinite(c.y));
    const ph = out.phone;
    const colW = ph.x - CALL.gap - L;
    const textW = colW - BADGE.size - BADGE.gap - 12;
    if (textW < 120) problems.push(`the callouts' column is only ${Math.round(colW)} px wide: shorter labels`);
    // the labels as big as the column lets every one keep to two lines (the reviewer: fill the column, no dead band)
    let cs = callT.size;
    for (let sz = CALL.labelMax; sz > callT.size; sz -= 2) {
      if (calls.every((c) => wrap(String(c.text), {...callT, size: sz}, Math.max(120, textW), m).length <= 2)) {
        cs = sz;
        break;
      }
    }
    const cT = {...callT, size: cs};
    sizes.call = cs;
    const firstH = Math.max(BADGE.size, lineH(cT));
    const items = calls.map((c, i) => {
      const ls = wrap(String(c.text), cT, Math.max(120, textW), m);
      if (ls.length > cT.lines) problems.push(`callout ${i + 1} "${String(c.text).slice(0, 30)}" runs to ${ls.length} lines (${cT.lines} at most): two or three words`);
      const lines = ls.slice(0, cT.lines);
      // the dot: on the outline when the point is the outlined element, else the nearest spot clear of words and digits whose
      // height lets the line in clear of the side buttons
      const pc = {x: clamp(c.x, 0, 1) * CAP.w, y: clamp(c.y, 0, 1) * CAP.h};
      let dot;
      const onEl = Boolean(el && o && pc.x >= el.x0 - 4 && pc.x <= el.x1 + 4 && pc.y >= el.y0 - 4 && pc.y <= el.y1 + 4);
      if (onEl) dot = leftJoint(toFrame(scr, pc.x, pc.y).y);
      else {
        const rad = (STROKE.dot + 5) / kf;
        // a clean spot, or the element's own side (a bordered card's edge line: the dot sits ON it, never on a word)
        const ok = (x, y) => {
          if (!clearOfButtons(ph, 'left', toFrame(scr, x, y).y)) return null;
          if (!probe?.clean || probe.clean(x, y, rad)) return {x, y};
          const lx = probe.edgeLine ? probe.edgeLine(x, y, rad) : null;
          return lx === null ? null : {x: lx, y};
        };
        let sp = null;
        for (let d = 0; !sp && d <= 160; d += 4) for (const [dx, dy] of d ? [[-1, 0], [0, -1], [0, 1], [1, 0]] : [[0, 0]]) if (!sp) sp = ok(pc.x + dx * d, pc.y + dy * d);
        if (!sp) notes.push(`callout ${i + 1}'s point (${c.x}, ${c.y}) sits on words or an icon, or level with a side button, and no clear spot is near it: point at the element's left edge or a gap beside its icon`);
        dot = toFrame(scr, (sp ?? pc).x, (sp ?? pc).y);
      }
      const h = Math.max(BADGE.size, lines.length * lineH(cT));
      const ap = approach(dot, onEl);
      if (ap.busy) notes.push(`callout ${i + 1}'s line crosses the screen's words or a side button and no clear lane is near: a point nearer the screen's left edge`);
      return {n: i + 1, lines, h, dot: ap.dot, ap, want: ap.pts[0].y - firstH / 2, w: Math.max(...lines.map((l) => m(l, cT.size, cT.weight, false)))};
    });
    const lo = ph.y;
    const hi = STORY.bottom - 6; // the labels are words: the zone's own foot
    const order = items.map((_, i) => i).sort((a, b) => items[a].want - items[b].want);
    let cur = lo;
    for (const i of order) {
      const it = items[i];
      it.y = Math.max(cur, it.want);
      cur = it.y + it.h + LABEL_GAP;
    }
    let floor = hi;
    for (const i of [...order].reverse()) {
      const it = items[i];
      if (it.y + it.h > floor) it.y = floor - it.h;
      floor = it.y - LABEL_GAP;
    }
    if (items.some((it) => it.y < lo - 0.5)) problems.push('the callouts do not fit beside the phone: fewer callouts, shorter words');
    out.callouts = items.map((it) => {
      const mid = it.y + firstH / 2;
      const tx = L + BADGE.size + BADGE.gap;
      const from = {x: tx + Math.min(textW, it.w) + 16, y: mid};
      const knee = {x: ph.x - 22, y: mid};
      // a label that cannot sit level with its point: a right-angled step in the gutter beside the phone, never a slant
      const step = Math.abs(mid - it.ap.pts[0].y) > 0.5 ? [{x: knee.x, y: it.ap.pts[0].y}] : [];
      const path = [from, knee, ...step, ...it.ap.pts].filter((p, k, a) => !k || Math.hypot(p.x - a[k - 1].x, p.y - a[k - 1].y) > 0.5);
      return {n: it.n, lines: it.lines, badge: {x: L, y: mid - BADGE.size / 2, w: BADGE.size, h: BADGE.size}, box: {x: tx, y: mid - lineH(cT) / 2, w: textW, h: it.lines.length * lineH(cT)}, path, dot: it.dot, from, knee, target: it.dot};
    });
    // two leaders never cross: their order in the column is their points' order
    const ys = out.callouts.map((c) => c.box.y);
    if (ys.some((v, i) => i && v < ys[i - 1] - 0.5) && out.callouts.length > 1) notes.push('the callouts are not in their points\' order top to bottom: their lines may cross');
    // the body in the column, in its largest free stretch (top-aligned there; centred when it would leave a long empty run)
    const taken = out.callouts.map((c) => [Math.min(c.badge.y, c.box.y), Math.max(c.badge.y + c.badge.h, c.box.y + c.box.h)]).sort((a, b) => a[0] - b[0]);
    const freeRuns = (spans) => {
      const runs = [];
      let at = lo;
      for (const [a, b] of spans) {
        if (a > at) runs.push([at, a]);
        at = Math.max(at, b);
      }
      if (hi > at) runs.push([at, hi]);
      return runs;
    };
    if (typeof s.body === 'string' && s.body.trim()) {
      const bw = colW - 6;
      const ls = wrap(s.body.trim(), TYPE.body, bw, m);
      if (ls.length > 5) problems.push(`the body runs to ${ls.length} lines in the column beside the phone (5 at most): say less`);
      const bh = Math.min(ls.length, 5) * lineH(TYPE.body);
      const runs = freeRuns(taken)
        .map(([a, b]) => [a === lo ? a : a + LABEL_GAP, b === hi ? b : b - LABEL_GAP])
        .filter(([a, b]) => b - a >= bh);
      if (!runs.length) problems.push('the body does not fit in the column beside the callouts: a shorter body, or fewer callouts');
      else {
        const [a, b] = runs.reduce((p, q) => (q[1] - q[0] > p[1] - p[0] ? q : p));
        const yb = b - a - bh >= CALL.empty ? a + (b - a - bh) / 2 : a;
        boxes.body = {x: L, y: yb, w: bw, h: bh};
        sizes.bodyLines = ls.slice(0, 5);
        taken.push([yb, yb + bh]);
        taken.sort((p, q) => p[0] - q[0]);
      }
    }
    // no dead column: the longest empty run beside the phone
    const gapRun = freeRuns(taken).reduce((p, q) => Math.max(p, q[1] - q[0]), 0);
    out.emptyRun = Math.round(gapRun);
    if (gapRun >= 600) notes.push(`the column beside the phone stays empty for ${Math.round(gapRun)} px: a "body" there, or a callout on something in that stretch`);
  }

  // ---- loupe (C): the element enlarged in the free column, two lines tangent to its outline and the loupe -----------------
  if (look === 'loupe' && el && o) {
    const pad = clamp(LOUPE.pad * Math.min(el.x1 - el.x0, el.y1 - el.y0), LOUPE.padMin, LOUPE.padMax);
    const crop = {x0: el.x0 - pad, y0: el.y0 - pad, x1: el.x1 + pad, y1: el.y1 + pad};
    const cw = crop.x1 - crop.x0;
    const chh = crop.y1 - crop.y0;
    const capText = typeof s.body === 'string' ? s.body.trim() : '';
    /** one placement: the phone on `ph` side, the loupe beside it at height `at` ('mid' | 'top' | 'bottom'), at most maxH high */
    const tryLoupe = (phoneLeft, at, maxH) => {
      const d = out.phone.d;
      const bw = bodyOf(d).w;
      const px = phoneLeft ? WHOLE.left : WHOLE.right - bw;
      const sx = px + FLAT.bez * d;
      const sc = {x: sx, y: scr.y, w: scr.w, h: scr.h};
      const E = {x: sc.x + el.x0 * kf, y: sc.y + el.y0 * kf, w: (el.x1 - el.x0) * kf, h: (el.y1 - el.y0) * kf, r: el.r * kf};
      const oo = {...o, x: E.x - (out.element.x - o.x)};
      const colX0 = phoneLeft ? px + bw + WHOLE.gap : L;
      const colX1 = phoneLeft ? STORY.w - STORY.side : px - WHOLE.gap;
      const colW = colX1 - colX0;
      const z = Math.min(colW / cw, maxH / chh, kf * LOUPE.maxGrow);
      const lw = cw * z;
      const lh = chh * z;
      const capLines = capText ? wrap(capText, TYPE.cap, colW, m) : [];
      const capH = Math.min(capLines.length, TYPE.cap.lines) * lineH(TYPE.cap);
      const capGap = capH ? LOUPE.gap : 0;
      const lo = textBottom + 34;
      const hi = KEY - 6;
      const want = at === 'top' ? oo.y : at === 'bottom' ? oo.y + oo.h - lh : oo.y + oo.h / 2 - lh / 2;
      // the caption under the loupe, or over it: whichever lets the loupe sit nearer its element's height
      const lyBelow = clamp(want, lo, hi - lh - capGap - capH);
      const lyAbove = clamp(want, lo + capH + capGap, hi - lh);
      const capAbove = capH > 0 && Math.abs(lyAbove - want) < Math.abs(lyBelow - want) - 0.5;
      const ly = capAbove ? lyAbove : lyBelow;
      const lx = phoneLeft ? colX0 + (colW - lw) / 2 : colX1 - lw - (colW - lw) / 2;
      const box = {x: lx, y: ly, w: lw, h: lh};
      const lr = (el.r + pad) * z;
      const lines = tangents(oo, {...box, r: lr});
      const busy = Math.max(...lines.map(([a, b]) => {
        const seg = clip(a, b, {x: sc.x + 2, y: sc.y + 2, w: sc.w - 4, h: Math.min(sc.h, KEY - sc.y) - 4});
        return seg && probe?.busy && Math.hypot(seg[1].x - seg[0].x, seg[1].y - seg[0].y) >= 24 ? probe.busy({x: ((seg[0].x - sc.x) / sc.w) * CAP.w, y: ((seg[0].y - sc.y) / sc.h) * CAP.h}, {x: ((seg[1].x - sc.x) / sc.w) * CAP.w, y: ((seg[1].y - sc.y) / sc.h) * CAP.h}) : 0;
      }));
      const cap = capH ? {x: colX0, y: capAbove ? ly - capGap - capH : ly + lh + capGap, w: colW, h: capH} : null;
      // a line that enters the phone's side level with a side button (the reviewer, 2026-10-19: nav-3's upper loupe line ran
      // through the side button)
      const phv = {x: px, y: out.phone.y, d};
      const edgeX = phoneLeft ? px + bw : px;
      const btnHit = lines.some(([a, b]) => {
        if ((a.x - edgeX) * (b.x - edgeX) > 0 || Math.abs(b.x - a.x) < 1e-6) return false;
        const yy = a.y + ((edgeX - a.x) / (b.x - a.x)) * (b.y - a.y);
        return !clearOfButtons(phv, phoneLeft ? 'right' : 'left', yy);
      });
      return {phoneLeft, px, sc, E, oo, box, lr, z, lines, busy, btnHit, cap, capLines: capLines.slice(0, TYPE.cap.lines), capN: capLines.length, grow: z / kf, off: Math.abs(ly + lh / 2 - (oo.y + oo.h / 2))};
    };
    const prefLeft = side === 'left';
    const cands = [];
    for (const pl of [prefLeft, !prefLeft]) for (const at of ['mid', 'top', 'bottom']) for (const mh of [LOUPE.maxH, 340, 260]) cands.push(tryLoupe(pl, at, mh));
    // the fewest words crossed, then the loupe nearest its element's height, then the biggest
    const score = (c) => (c.grow < LOUPE.minGrow ? 9 : 0) + (c.btnHit ? 3 : 0) + c.busy * 4 + c.off / 1000 + (LOUPE.maxH - c.box.h) / 4000 + (c.phoneLeft === prefLeft ? 0 : 0.02);
    const best = cands.reduce((a, b) => (score(b) < score(a) ? b : a));
    // the phone moves to the chosen side
    if (best.phoneLeft !== (out.phone.x < STORY.w / 2)) {
      const dx = best.px - out.phone.x;
      out.phone.x += dx;
      scr.x += dx;
      boxes.phone.x += dx;
      out.element.x += dx;
      o.x += dx;
      if (out.tap) out.tap.x += dx;
    }
    side = best.phoneLeft ? 'left' : 'right';
    if (best.grow < LOUPE.minGrow - 0.01) problems.push(`the loupe would show the element only ${best.grow.toFixed(1)} times its size (${LOUPE.minGrow} at least): a loupe is for a small element (a toggle, a tile, a button); a wide row takes "look": "callouts", "rail" or "band"`);
    if (best.capN > TYPE.cap.lines) problems.push(`the loupe's caption "${capText.slice(0, 30)}" runs to ${best.capN} lines in its column (${TYPE.cap.lines} at most): say less`);
    if (best.btnHit) notes.push("the loupe's lines enter the phone's side level with a side button at every height: a whole phone higher or lower on its screen, or another look");
    if (best.busy > 0.12) notes.push(`the loupe's lines cross the screen's words (${Math.round(best.busy * 100)} %): a loupe is for an element near the screen's edge; else "look": "callouts"`);
    // a closed element sits alone in the loupe, on the colour round it (its neighbours' edges never show in the pad)
    const cut = el.closed && el.ground ? {x: pad * best.z, y: pad * best.z, w: (el.x1 - el.x0) * best.z, h: (el.y1 - el.y0) * best.z, r: el.r * best.z} : null;
    const ground = el.ground ? `rgb(${el.ground.map((v) => Math.round(v)).join(', ')})` : '#FFFFFF';
    out.loupe = {box: best.box, r: best.lr, crop, k: best.z, grow: best.grow, lines: best.lines, side, busy: best.busy, cut, ground};
    boxes.loupe = best.box;
    if (best.cap) {
      boxes.cap = best.cap;
      sizes.capLines = best.capLines;
    }
    // the loupe never covers the phone
    const pb = out.phone;
    if (best.box.x < pb.x + pb.w + 10 && best.box.x + best.box.w > pb.x - 10) problems.push('the loupe would cover the phone');
  }
  out.side = side;
  out.callouts.forEach((c, i) => {
    boxes[`call${i + 1}`] = {x: c.badge.x, y: Math.min(c.badge.y, c.box.y), w: c.box.x + c.box.w - c.badge.x, h: Math.max(c.badge.y + c.badge.h, c.box.y + c.box.h) - Math.min(c.badge.y, c.box.y)};
  });
  if (o) boxes.outline = {x: o.x - STROKE.outline, y: o.y - STROKE.outline, w: o.w + 2 * STROKE.outline, h: o.h + 2 * STROKE.outline};
  if (o && o.y + o.h + STROKE.outline > KEY + 0.5) problems.push(`the element's outline reaches y ${Math.round(o.y + o.h)}, under the reply bar (${KEY}): a higher element${mode === 'rise' ? ', or "look": "callouts" (the whole phone)' : ''}`);
  return finish(out);
};

/** the zone itself: every box between top and bottom (a phone's lower body aside), inside the frame's width */
function finish(out) {
  const {boxes, problems, phone} = out;
  for (const [k, b] of Object.entries(boxes)) {
    if (k === 'phone') {
      const btn = FLAT.btn * phone.d + 1;
      if (b.y < STORY.top - 0.5) problems.push(`the phone's top leaves the zone (y ${Math.round(b.y)})`);
      if (b.x - btn < STORY.edge - 0.5 || b.x + b.w + btn > STORY.w - STORY.edge + 0.5) problems.push(`the phone's side leaves the zone (x ${Math.round(b.x - btn)}..${Math.round(b.x + b.w + btn)})`);
      if (phone.mode === 'whole' && phone.y + phone.h > WHOLE.footMax + 0.5) problems.push(`the whole phone's foot runs to y ${Math.round(phone.y + phone.h)} (${WHOLE.footMax} at most: never cut by the frame)`);
      continue;
    }
    if (k === 'outline') continue;
    if (b.y < STORY.top - 0.5 || b.y + b.h > STORY.bottom + 0.5) problems.push(`${k} leaves the Story's safe zone (y ${Math.round(b.y)}..${Math.round(b.y + b.h)}; ${STORY.top}..${STORY.bottom})`);
    const x0 = k === 'picture' ? 0 : STORY.edge;
    if (b.x < x0 - 0.5 || b.x + b.w > STORY.w - x0 + 0.5) problems.push(`${k} runs past the side margin (x ${Math.round(b.x)}..${Math.round(b.x + b.w)})`);
  }
  out.problems = [...new Set(problems)];
  out.notes = [...new Set(out.notes)];
  return out;
}

/** Every slide of a set (a step knows how many steps the set has; the end recaps them). probeOf(screen) -> the capture's
 *  probe (./probe.mjs) or null */
export const layoutSet = (slides, {measure: m = measure, probeOf = null} = {}) => {
  const list = Array.isArray(slides) ? slides : [];
  const steps = list.filter((s) => s?.layout === 'step').length || null;
  return list.map((s) => layoutSlide(s, {measure: m, steps, probe: probeOf && typeof s?.screen === 'string' ? probeOf(s.screen) : null}));
};

/** the pixels a slide may draw below the zone's foot: its phone's lower body, its x range with the side buttons */
export const belowZone = (lay) => {
  const p = lay?.phone;
  if (!p || p.y + p.h <= STORY.bottom) return null;
  const btn = FLAT.btn * p.d + 2;
  return {x0: p.x - btn, x1: p.x + p.w + btn};
};
