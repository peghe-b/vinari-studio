// The cover's one layout (2026-10-27, after the owner's „ერთდაიგივეებია, არც ჩანს წესიერად"): a PURE function that sets every
// position and every size of a cover before anything is drawn, and checks them against the 300 px gallery tile. The render
// (src/Cover.tsx, src/cover/Draw.tsx) draws exactly what it returns and the lints (tools/ci/cover.mjs, tools/check.mjs,
// tools/build-index.mjs) read the same numbers, so a check knows what will be on the cover and how big.
//
//   coverLayout(cover, ctx) -> {comp, head, ST, els, draw, hero, picture, problems}
//     cover  a resolved cover ({title, kind, <kind>: {...}}; ./pick.mjs turns older specs into one)
//     ctx    {regions, photoInfo(src), credit(src), pose, polSign, slab, seed, headFloor}
//     els    the texts and pictures with their tier and box (page px), what the checks read
//     draw   the primitives src/cover/Draw.tsx paints, in order (cards, texts, marks, the region, the phone, the photo)
//
// What the tile shows (design 2026-10-27, section 1): the site and Instagram's grid show the middle 3:4 of the cover, y
// 240..1680, at 300 to 390 px wide (0.278x to 0.36x). So nothing the viewer must read is under 96 px on the cover (27 px in
// the tile) and the hero is 240 px or more. Instagram draws its own marks top right and bottom left: no text there.
import {fitLines, sizeFor, textW} from '../lib/textfit.mjs';
import {lookOf} from './comps.mjs';

export const W = 1080;
export const H = 1920;
export const FRAME = Object.freeze({pad: 72, top: 300, rowH: 48, rule: 378, headTop: 434, headMax: 112, headMin: 96, headLH: 1.12, maxW: 936, gridTop: 240, gridBottom: 1680, side: 70, paBottom: 1630});
/** the type tiers, in cover px (in the 300 px tile: x 0.278) */
export const TIER = Object.freeze({HERO: 240, VERSUS: 150, READ: 96, LABEL: 64, FINE_MIN: 28, FINE_MAX: 44});
const ORDER = {FINE: 0, LABEL: 1, READ: 2, VERSUS: 3, HERO: 4};
/** Instagram's own marks on a grid tile: no LABEL-or-larger text inside them */
export const CORNERS = Object.freeze([
  {name: 'top right (Instagram\'s icon)', hit: (b) => b.x + b.w > 880 && b.y < 440},
  {name: 'bottom left (Instagram\'s view count)', hit: (b) => b.x < 460 && b.y + b.h > 1480},
]);
export const CROP = Object.freeze({x: 0, y: 240, w: 1080, h: 1440});

export const INK = '#0B0B0B';
export const INK2 = '#6A6A6A';
export const GREY = '#9A9A9A';
export const STRUCK = '#A6A6A6'; // a struck value: grey, still readable in the tile
export const TRACK = '#E8E8E8';
export const DISC = Object.freeze(['#111111', '#3A3A3A', '#5A5A5A']);
export const SHADOW = '0 16px 34px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)';
export const TAG_SHADOW = '0 24px 50px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.10)';
export const CAPTURE = Object.freeze({w: 1080, h: 2346});
/** the poses of the one tilted phone (perspective 1500): [rotateX, rotateY, rotateZ] */
export const POSES = Object.freeze({'left-lean': [12, -18, -6], 'right-lean': [12, 18, 6], 'left-back': [28, -10, -14], 'right-back': [28, 10, 14]});
export const PHONE_PERSPECTIVE = 1500;
export const CARPLAY_PERSPECTIVE = 2200;
export const CARPLAY_ANGLES = Object.freeze([10, -14, -2]);

const SEMI_M = {weight: 600, mtav: true};
const BOLD = {weight: 700};
const round = (x) => Math.round(x * 10) / 10;
const box = (x, y, w, h) => ({x: round(x), y: round(y), w: round(w), h: round(h)});
const union = (bs) => {
  const v = bs.filter(Boolean);
  if (!v.length) return null;
  const x0 = Math.min(...v.map((b) => b.x));
  const y0 = Math.min(...v.map((b) => b.y));
  const x1 = Math.max(...v.map((b) => b.x + b.w));
  const y1 = Math.max(...v.map((b) => b.y + b.h));
  return box(x0, y0, x1 - x0, y1 - y0);
};
const overlap = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
/** the box of a text line's glyphs inside its line box (FiraGO at line-height 1: digits and capitals from 0.15 to 0.84 em) */
const ink = (b, px) => box(b.x, b.y + 0.15 * px, b.w, 0.69 * px);
const MKHEDRULI = /[ა-ჰ]/;
/** the box a hand mark takes round a text: Mkhedruli has its x-height from about 0.42 em and tails below the baseline to
 *  about 1.02 em, so a strike crosses its middle and an underline runs under the tails (the 27 Oct test set: an underline
 *  through „ცილინდრი"'s tails and „არ"'s „რ") */
const markBox = (text, b, px, kind, {tight = false, mtav = false} = {}) => {
  // Mtavruli (the labels) and digits have no x-height and no tails: the cap band, so a strike runs through the middle of the
  // letters (the 27 Oct test set: the strike on „ქაღალდზე" ran through their lower halves)
  if (mtav || !MKHEDRULI.test(String(text ?? ''))) return ink(b, px);
  if (kind === 'strike') return box(b.x, b.y + 0.35 * px, b.w, 0.45 * px);
  // a line of a quote has the next line's tall letters 1.12 em under it: there the underline runs just under the baseline
  if (kind === 'underline') return box(b.x, b.y + 0.38 * px, b.w, (tight ? 0.5 : 0.66) * px);
  return box(b.x, b.y + 0.3 * px, b.w, 0.72 * px);
};
/** The hand ring round an ink box (w x h, page px), as Marker.tsx draws it: half-axes that keep the stroke's inner edge an
 *  even gap off every glyph, the box's corners included (the 27 Oct judges: the old ring, the box plus a pad, ran over the
 *  „5" and „W" of „5W-30", the first „0" of „05:00" and through „კმ" of „1,4 კმ", because an ellipse a pad wider than a box
 *  cuts its corners). An ellipse through the corners of the box grown by the gap, 1.45 times its half-height, then grown
 *  again until the corners are inside it at the hand's small turn. Marker.tsx keeps its wobble outside this ellipse, and up
 *  to RING_OUT outside it, which is what the layout keeps clear of the neighbours.
 *  -> {rx, ry, rot, pad: [x, y] (the room left/right and above/below the box), out: [x, y] (the same for the outer edge)} */
export const RING_OUT = 1.07;
export const ringFor = (w, h, {stroke = 16, seed = 1, t: tAsk} = {}) => {
  const g = Math.max(12, 0.08 * h) + stroke / 2;
  const a = w / 2 + g;
  const b = h / 2 + g;
  // round a wide value the ring is taller than flat (a wide value has height to spare, not width): t from 1.45 to 1.8
  // (a caller short of height, the stacked versus, asks for a flatter one: t 1.32)
  const t = tAsk ?? Math.min(1.8, Math.max(1.45, 1.45 + 0.15 * (w / Math.max(1, h) - 1.5)));
  let ry = t * b;
  let rx = a / Math.sqrt(1 - 1 / (t * t));
  // the hand turns the ring 2 to 4 degrees (less round a wide value, where a turn costs the most room)
  const rot = -(2 + (Math.abs(Math.round(seed)) % 3)) * Math.min(1, (1.6 * h) / Math.max(1, w));
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  let f = 0;
  for (const [x, y] of [[a, b], [a, -b], [-a, b], [-a, -b]]) f = Math.max(f, ((x * c + y * s) / rx) ** 2 + ((-x * s + y * c) / ry) ** 2);
  if (f > 1) {
    rx *= Math.sqrt(f);
    ry *= Math.sqrt(f);
  }
  const ox = RING_OUT * rx + stroke / 2;
  const oy = RING_OUT * ry + stroke / 2;
  return {rx, ry, rot, pad: [rx - w / 2, ry - h / 2], out: [ox - w / 2, oy - h / 2]};
};
/** the room a ring takes left and right of a value V px tall and vw wide (its outer edge) */
const ringPad = (vw, V, t) => ringFor(vw, 0.69 * V, {t}).out[0];
/** a hand circle round an ink box, with the ring's own size and turn */
const ringMark = (b, seed, {stroke = 16, color = INK, t} = {}) => {
  const r = ringFor(b.w, b.h, {stroke, seed, t});
  return {t: 'mark', kind: 'circle', box: b, seed, stroke, pad: r.pad, rot: r.rot, color, ring: r};
};

// ---- the 3D phone and display (moved here from TiltDevice.tsx, so the layout and the lints measure what is drawn) ------
const rad = (d) => (d * Math.PI) / 180;
/** A point of a plane (centred on its own centre, already scaled) turned like CSS rotateX(a) rotateY(b) rotateZ(c) (applied
 *  to the point as Rx(Ry(Rz p))) and projected by d / (d - z). */
export const projectPoint = (x0, y0, t, d) => {
  const [ax, ay, az] = t.map(rad);
  let x = x0 * Math.cos(az) - y0 * Math.sin(az);
  let y = x0 * Math.sin(az) + y0 * Math.cos(az);
  let z = 0;
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  const k = d / (d - z);
  return [x * k, y * k];
};
/** The box a w x h plane fills on the page after the turn and the perspective (centred on its own centre). */
export const projectedBox = (w, h, t, d) => {
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => projectPoint(x, y, t, d));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)};
};
/** Scale a w x h device so it fits the room once turned (a scale3d before the turn, so the box is measured on the scaled
 *  plane, a few rounds until it settles): the scale, the plane's centre on the page and the box it fills. */
export const fitDevice = (w, h, t, d, room, lift = 0.35) => {
  let k = 1;
  for (let i = 0; i < 8; i++) {
    const b = projectedBox(w * k, h * k, t, d);
    k *= Math.min((room.x1 - room.x0) / (b.x1 - b.x0), (room.y1 - room.y0) / (b.y1 - b.y0));
  }
  const b = projectedBox(w * k, h * k, t, d);
  const bh = b.y1 - b.y0;
  const cx = (room.x0 + room.x1) / 2 - (b.x0 + b.x1) / 2;
  const cy = room.y0 - b.y0 + Math.max(0, (room.y1 - room.y0 - bh) * lift);
  return {k, cx, cy, box: box(cx + b.x0, cy + b.y0, b.x1 - b.x0, bh), bottom: cy + b.y1};
};

// ---- the headline (the approved frame: FiraGO 600 Mtavruli, 112 px, shrink only, never under 96) -----------------------
const HEAD_OPTS = {weight: 600, mtav: true, tracking: -0.01};
/** the approved CarPlay cover keeps its own headline („ქართული ნავიგატორი | ახლა CarPlay-ზეც" is set at 84 px): the floor
 *  for a "carplay" cover is 80, so the cover the owner ticked can always be made again (the 27 Oct judges) */
export const CARPLAY_HEAD_MIN = 80;
export const headOf = (title, {floor = true, comp} = {}) => {
  const lines = String(title ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  const size = Math.min(FRAME.headMax, ...lines.map((l) => sizeFor(l, FRAME.maxW, FRAME.headMax, HEAD_OPTS)));
  const problems = [];
  const min = comp === 'carplay' ? CARPLAY_HEAD_MIN : FRAME.headMin;
  if (size < min) {
    lines.forEach((l, i) => {
      const w = textW(l, min, HEAD_OPTS);
      if (w > FRAME.maxW) problems.push(`COVER_TITLE_FIT cut words: line ${i + 1} „${l}" measures ${Math.round(w)} px at ${min}, the limit is ${FRAME.maxW} (about 14 Mtavruli letters a line)`);
    });
  }
  // the net keeps an older film's long headline (shrunk, as before) rather than cutting its words; a new film never does
  const px = floor ? size : size;
  const bottom = FRAME.headTop + lines.length * px * FRAME.headLH;
  return {lines, size: px, top: FRAME.headTop, bottom, ST: Math.ceil(bottom + 70), problems};
};

// ---- small builders -------------------------------------------------------------------------------------------------
const textEl = (els, draw, o) => {
  // o: {role, tier, text, px, x, y, w?, weight, mtav?, color?, align?, tracking?}
  const opts = {weight: o.weight ?? 700, mtav: Boolean(o.mtav), tracking: o.tracking ?? 0};
  const tw = textW(o.text, o.px, opts);
  const x = o.align === 'right' ? o.x - tw : o.align === 'center' ? o.x - tw / 2 : o.x;
  const b = box(x, o.y, tw, o.px);
  els.push({role: o.role, tier: o.tier, px: Math.round(o.px), box: b, text: o.text, ...(o.foot ? {foot: true} : {})});
  draw.push({t: 'text', role: o.role, ...(o.foot ? {foot: true} : {}), text: o.text, x: b.x, y: b.y, w: b.w, px: o.px, weight: opts.weight, mtav: opts.mtav, tracking: opts.tracking, color: o.color ?? INK});
  return b;
};
const tooSmall = (problems, what, px, need, fix) => {
  if (px < need) problems.push(`COVER_TEXT_SIZE ${what} comes out at ${Math.round(px)} px: it needs ${need} (${Math.round(need * 0.278)} px in the 300 px tile)${fix ? `; ${fix}` : ''}`);
};
const markOf = (kind, b, seed, extra = {}) => ({t: 'mark', kind, box: b, seed, stroke: extra.stroke ?? 14, pad: extra.pad, rot: extra.rot, color: extra.color ?? INK});

// ---- the compositions -------------------------------------------------------------------------------------------------
const stat = (d, L, ctx) => {
  const {ST, oneLine, els, draw, problems} = L;
  const slab = d.variant === 'slab' || Boolean(ctx.slab);
  const value = String(d.value);
  const unit = d.unit ? String(d.unit) : '';
  const mark = d.mark ?? 'circle';
  const left0 = slab ? 118 : 72;
  const room = slab ? 844 : 936;
  const maxV = slab ? 400 : oneLine ? 520 : 460;
  const vOpts = {weight: 700, tracking: -0.02};
  // the value's top: under the headline with the ring's top clear of it (the headline ends 70 px above ST); the ring's own
  // room above and below the digits is the ring's (ringFor), so a lone „7" in its round ring and a long „186 000" in a flat
  // one both clear their glyphs and their neighbours
  const geomAt = (V) => {
    const vw = textW(value, V, vOpts);
    const up = unit ? Math.max(TIER.READ, 0.3 * V) : 0;
    const uw = unit ? textW(unit, up, SEMI_M) : 0;
    const ring = mark === 'circle' ? ringFor(vw, 0.69 * V, {seed: ctx.seed}) : null;
    const rp = ring ? ring.out[0] : 0;
    const above = ring ? Math.max(0, ring.out[1] - 0.15 * V) : 0; // the ring above the value's line box
    const below = ring ? Math.max(0, ring.out[1] - 0.16 * V) : 0; // and below it (the line box ends 0.16 em under the digits)
    const top = slab ? ST + 60 + above : Math.max(ST + 10, ST - 46 + above);
    return {vw, up, uw, rp, ring, top, valueBottom: top + V + below, total: 2 * rp + vw + (unit ? 0.05 * V + uw : 0)};
  };
  // the label and the sub under the value stay above y 1478 (Instagram's view count): the value gives way first. The label
  // is set up to 124 px when the value is held by its width, not by the height (a wide code like „P0300" left a quarter of
  // the tile empty under a 100 px label: 27 Oct, round 2)
  const fitV = (lab) => {
    const after = (slab ? 0 : 36) + lab.lines.length * lab.size * 1.1 + (d.sub ? 28 + 64 : 0);
    let v = maxV;
    for (; v > 120; v -= 2) {
      const g = geomAt(v);
      // the slab holds the value with 50 px under it, and its label and sub still end above Instagram's mark (27 Oct, round
      // 3: a fixed 620 px slab pushed a two-line label under the grid line)
      if (g.total <= room && (slab ? g.valueBottom <= ST + 600 && g.valueBottom + 50 + 40 + after <= 1478 : g.valueBottom + after <= 1478)) break;
    }
    return v;
  };
  const labSmall = fitLines(String(d.label ?? ''), 936, 2, 100, {...SEMI_M, min: TIER.READ});
  const labBig = fitLines(String(d.label ?? ''), 936, 2, 124, {...SEMI_M, min: TIER.READ});
  const vSmall = fitV(labSmall);
  const vBig = labBig.fits ? fitV(labBig) : 0;
  const lab0 = vBig >= vSmall - 2 ? labBig : labSmall;
  let V = vBig >= vSmall - 2 ? vBig : vSmall;
  const m = geomAt(V);
  tooSmall(problems, `the stat value „${value}${unit ? ` ${unit}` : ''}"`, V, TIER.HERO, 'a shorter value or unit');
  const top = m.top;
  const slabH = slab ? Math.max(360, m.valueBottom + 50 - ST) : 0;
  if (slab) draw.push({t: 'card', x: 70, y: ST, w: 940, h: slabH, r: 40, fill: '#0E0E0E'});
  const vx = left0 + m.rp;
  const color = slab ? '#FFFFFF' : INK;
  const vb = textEl(els, draw, {role: 'value', tier: 'HERO', text: value, px: V, x: vx, y: top, weight: 700, tracking: -0.02, color});
  let ub = null;
  if (unit) {
    // on the value's baseline (0.835 em down a line-height-1 box), just outside the ring
    const ux = vx + m.vw + m.rp + 0.05 * V;
    ub = textEl(els, draw, {role: 'unit', tier: 'READ', text: unit, px: m.up, x: ux, y: top + 0.835 * V - 0.835 * m.up, weight: 600, mtav: true, color});
  }
  const digits = ink(vb, V);
  if (mark === 'circle') draw.push(ringMark(digits, ctx.seed, {stroke: 16, color: slab ? '#F3F3F3' : INK}));
  else draw.push(markOf('underline', box(digits.x, digits.y, digits.w, digits.h - 6), ctx.seed, {stroke: 16, color: slab ? '#F3F3F3' : INK}));
  // the label: Mtavruli, one or two lines at 96 to 100
  const lab = lab0;
  if (!lab.fits) tooSmall(problems, `the stat label „${d.label}"`, Math.min(TIER.READ - 1, sizeFor(String(d.label ?? ''), 936 * 2, 100, SEMI_M)), TIER.READ, 'cut words');
  let y = slab ? ST + slabH + 40 : m.valueBottom + 36;
  const labBoxes = lab.lines.map((line, i) => textEl(els, draw, {role: 'label', tier: 'READ', text: line, px: lab.size, x: 72, y: y + i * lab.size * 1.1, weight: 600, mtav: true}));
  y += lab.lines.length * lab.size * 1.1;
  if (d.sub) {
    const sp = Math.min(64, sizeFor(String(d.sub), 936, 64, {weight: 600}));
    tooSmall(problems, `the stat's sub-line`, sp, TIER.LABEL, 'cut words');
    textEl(els, draw, {role: 'sub', tier: 'LABEL', text: String(d.sub), px: sp, x: 72, y: y + 28, weight: 600, color: INK2});
  }
  if (d.source) {
    const sp = Math.max(TIER.FINE_MIN, Math.min(40, sizeFor(String(d.source), 700, 40, {weight: 500})));
    textEl(els, draw, {role: 'source', tier: 'FINE', text: String(d.source), px: sp, x: 1008, y: 1600 - 0.835 * sp, weight: 500, color: GREY, align: 'right', foot: true});
  }
  L.hero = union([vb, ub]);
  L.picture = union([slab ? box(70, ST, 940, slabH) : null, vb, ub, ...labBoxes]);
  if (slab) L.variant = 'slab';
};

const versus = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const sides = [d.a, d.b];
  const win = d.win === 'b' ? 1 : 0;
  // every second versus on the page is the black card (tools/ci/coverlog.mjs versusDark): two versus covers a few films
  // apart read as twins in the grid (the 27 Oct judges on „5W-30" and „სენსორი"), so they alternate the card's tone
  const dark = Boolean(ctx.dark);
  const T = dark
    ? {card: '#0E0E0E', label: '#A3A3A3', win: '#FFFFFF', lose: '#808080', mark: '#F3F3F3', rule: '#2E2E2E', disc: '#FFFFFF', discLose: '#5A5A5A', sym: '#0E0E0E'}
    : {card: '#FFFFFF', label: INK2, win: INK, lose: STRUCK, mark: INK, rule: TRACK, disc: '#111111', discLose: STRUCK, sym: '#FFFFFF'};
  const isIcon = sides.every((s) => s && s.icon !== undefined);
  const valueOf = (s) => `${s.value ?? ''}`;
  const vOpts = {weight: 700};
  const unitPx = (V) => Math.round(V * 0.37);
  const wordy = (s) => MKHEDRULI.test(valueOf(s));
  // the ring's shape: the side cards are short of width (the default, taller ring), the stack of height (a flatter one)
  let ringT;
  const wAt = (s, V, i, ringed = true) => {
    const vw = textW(valueOf(s), V, vOpts);
    const uw = s.unit ? 0.05 * V + textW(String(s.unit), unitPx(V), SEMI_M) : 0;
    return vw + uw + (i === win && ringed ? 2 * ringPad(vw, V, ringT) : 0);
  };
  const fitV = (s, i, room, max, ringed = true) => {
    let V = max;
    for (; V > 60 && wAt(s, V, i, ringed) > room; V -= 2);
    return V;
  };
  /** the room a value's mark takes above and below its line box (V px): the winner's ring, an underline under the tails */
  const marginsOf = (s, i, V, ringed) => {
    if (i === win && ringed) {
      const r = ringFor(textW(valueOf(s), V, vOpts), 0.69 * V, {seed: ctx.seed + i, t: ringT});
      return {above: Math.max(0, r.out[1] - 0.15 * V), below: Math.max(0, r.out[1] - 0.16 * V)};
    }
    if (i === win) return {above: 0, below: (wordy(s) ? 0.06 * V : 0) + 30};
    return {above: 0, below: wordy(s) ? 0.06 * V : 0};
  };
  const drawValue = (s, i, V, x, y, ringed) => {
    const vw = textW(valueOf(s), V, vOpts);
    const rp = i === win && ringed ? ringPad(vw, V, ringT) : 0;
    const color = i === win ? T.win : T.lose;
    const vb = textEl(els, draw, {role: 'value', tier: 'VERSUS', text: valueOf(s), px: V, x: x + rp, y, weight: 700, color});
    if (s.unit) textEl(els, draw, {role: 'unit', tier: 'LABEL', text: String(s.unit), px: unitPx(V), x: x + rp + vw + 0.05 * V, y: y + 0.835 * (V - unitPx(V)), weight: 600, mtav: true, color});
    const v = valueOf(s);
    if (i === win) draw.push(ringed ? ringMark(markBox(v, vb, V, 'circle'), ctx.seed + i, {stroke: 16, color: T.mark, t: ringT}) : markOf('underline', markBox(v, vb, V, 'underline'), ctx.seed + i, {stroke: 16, color: T.mark}));
    else draw.push(markOf('strike', markBox(v, vb, V, 'strike'), ctx.seed + i, {stroke: 12, color: T.mark}));
    return vb;
  };
  const sideOk = isIcon || sides.every((s, i) => s && s.icon === undefined && fitV(s, i, 383, 240) >= TIER.VERSUS);
  if (sideOk) {
    L.variant = dark ? 'side-dark' : 'side';
    const V = isIcon ? 0 : Math.min(...sides.map((s, i) => fitV(s, i, 383, 240)));
    // the labels: the words that matter on an icon pair (READ, the winner in ink, the loser struck through its middle), a
    // small grey label over a value
    const lps = sides.map((s) => (isIcon ? Math.min(TIER.READ + 8, sizeFor(String(s.label), 383, TIER.READ + 8, SEMI_M)) : Math.min(72, sizeFor(String(s.label), 383, 72, SEMI_M))));
    const lp = Math.min(...lps);
    const m = isIcon ? {above: 0, below: 0} : marginsOf(sides[win], win, V, true);
    const valTop = ST + 5 + 44 + lp + 22 + m.above;
    // the cards as tall as what they hold (the label, the value or the icon disc, a margin), never an empty foot
    const cardH = isIcon ? 44 + lp + 40 + 240 + 60 : valTop - (ST + 5) + V + Math.max(m.below, 0) + 56;
    const cards = [box(70, ST + 5, 455, cardH), box(555, ST + 5, 455, cardH)];
    sides.forEach((s, i) => {
      const c = cards[i];
      draw.push({t: 'card', x: c.x, y: c.y, w: c.w, h: c.h, r: 40, fill: T.card, shadow: SHADOW});
      tooSmall(problems, `the versus label „${s.label}"`, lp, TIER.LABEL, 'a shorter word');
      const lb = textEl(els, draw, {role: 'label', tier: isIcon && lp >= TIER.READ ? 'READ' : 'LABEL', text: String(s.label), px: lp, x: c.x + c.w / 2, y: c.y + 44, weight: 600, mtav: true, color: isIcon ? (i === win ? T.win : T.lose) : T.label, align: 'center'});
      if (isIcon) {
        const dy = c.y + 44 + lp + 40;
        const cx = c.x + c.w / 2;
        draw.push({t: 'disc', cx, cy: dy + 120, d: 240, fill: i === win ? T.disc : T.discLose});
        draw.push({t: 'sym', name: s.icon, cx, cy: dy + 120, size: 150, color: T.sym});
        els.push({role: 'icon', tier: 'PIC', px: 240, box: box(cx - 120, dy, 240, 240), text: s.icon});
        // the tick inside the winner's card, at the disc's lower right
        if (i === win) draw.push(markOf('tick', box(cx + 96, dy + 168, 72, 72), ctx.seed + i, {stroke: 16, color: T.mark}));
        else draw.push(markOf('strike', markBox(s.label, lb, lp, 'strike', {mtav: true}), ctx.seed + i, {stroke: 12, color: T.mark}));
      } else {
        const vw = textW(valueOf(s), V, vOpts);
        const uw = s.unit ? 0.05 * V + textW(String(s.unit), unitPx(V), SEMI_M) : 0;
        const rp = i === win ? ringPad(vw, V) : 0;
        drawValue(s, i, V, c.x + c.w / 2 - (vw + uw) / 2 - rp, valTop, true);
      }
    });
    if (!isIcon) tooSmall(problems, 'the versus values', V, TIER.VERSUS, 'shorter values');
    L.hero = cards[win];
    L.picture = union(cards);
    return;
  }
  // stacked: the approved mileage card, enlarged; the winner circled, or underlined when its ring would not fit at 150 px
  L.variant = dark ? 'stack-dark' : 'stack';
  ringT = 1.32;
  const top = ST + 5;
  const lps = sides.map((s) => Math.min(72, sizeFor(String(s.label), 860, 72, SEMI_M)));
  const stack = (V, ringed) => {
    let y = top + 40;
    const rows = [];
    sides.forEach((s, i) => {
      const labelY = y;
      y += lps[i];
      const mg = marginsOf(s, i, V, ringed);
      const valueY = y + 10 + mg.above;
      y = valueY + V + mg.below;
      rows.push({labelY, valueY});
      if (i === 0) {
        rows[0].rule = y + 30;
        y += 30 + 3 + 36;
      }
    });
    return {rows, h: y + 40 - top};
  };
  // the card ends inside the picture area, and the lower value (at the left) stays above Instagram's view count (y 1478)
  const fitsH = (V, ringed) => {
    const S = stack(V, ringed);
    return S.h <= FRAME.paBottom - 10 - top && S.rows[1].valueY + V <= 1478;
  };
  let ringed = true;
  let V = Math.min(...sides.map((s, i) => fitV(s, i, 860, 200)));
  while (V > 60 && !fitsH(V, true)) V -= 2;
  if (V < TIER.VERSUS) {
    ringed = false;
    V = Math.min(...sides.map((s, i) => fitV(s, i, 860, 200, false)));
    while (V > 60 && !fitsH(V, false)) V -= 2;
  }
  tooSmall(problems, 'the versus values', V, TIER.VERSUS, 'shorter values');
  const S = stack(V, ringed);
  const c = box(70, top, 940, S.h);
  draw.push({t: 'card', x: c.x, y: c.y, w: c.w, h: c.h, r: 40, fill: T.card, shadow: SHADOW});
  sides.forEach((s, i) => {
    tooSmall(problems, `the versus label „${s.label}"`, lps[i], TIER.LABEL, 'a shorter word');
    textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(s.label), px: lps[i], x: 110, y: S.rows[i].labelY, weight: 600, mtav: true, color: T.label});
    drawValue(s, i, V, 110, S.rows[i].valueY, ringed);
  });
  draw.push({t: 'rect', x: 110, y: S.rows[0].rule, w: 860, h: 3, fill: T.rule});
  L.picture = c;
  L.hero = c;
};

const bars = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 3);
  const n = rows.length;
  const pitch = n >= 3 ? 230 : 280;
  const cx = 70;
  const cy = ST + 5;
  const shownPx = 96;
  const anyShown = rows.some((r) => r.shown);
  const shownW = anyShown ? Math.max(...rows.map((r) => (r.shown ? textW(String(r.shown), shownPx, BOLD) : 0))) : 0;
  // icon discs when the rows name icons (the approved card); a FilmTitleCard's bars (the net) have none: the bars start at 64
  const icons = rows.every((r) => r.icon);
  const tx0 = cx + (icons ? 204 : 64);
  const tx1 = cx + 884 - (anyShown ? shownW + 28 : 0);
  const trackW = tx1 - tx0;
  const lastBottom = 64 + (n - 1) * pitch + 140;
  const noteTop = lastBottom + 70;
  const h = d.note ? noteTop + 64 + 56 : lastBottom + 64;
  const card = box(cx, cy, 940, h);
  draw.push({t: 'card', x: card.x, y: card.y, w: card.w, h: card.h, r: 40, fill: '#FFFFFF', shadow: SHADOW});
  const textBoxes = [];
  const marks = [];
  rows.forEach((r, i) => {
    const dy = cy + 64 + i * pitch;
    if (icons) {
      // one disc tone on every row (the 27 Oct judges: a dark grey disc under a black one read as two kinds of thing)
      draw.push({t: 'disc', cx: cx + 56 + 60, cy: dy + 60, d: 120, fill: DISC[0]});
      draw.push({t: 'sym', name: r.icon, cx: cx + 116, cy: dy + 60, size: 72, color: '#FFFFFF'});
    }
    const lp = Math.min(72, sizeFor(String(r.label), cx + 884 - tx0, 72, SEMI_M));
    tooSmall(problems, `the bar label „${r.label}"`, lp, TIER.LABEL, 'a shorter label');
    textBoxes.push(textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(r.label), px: lp, x: tx0, y: dy - 6, weight: 600, mtav: true}));
    const ty = dy + 96;
    draw.push({t: 'rect', x: tx0, y: ty, w: trackW, h: 44, r: 22, fill: TRACK});
    const fill = Math.max(0.04, Math.min(1, Number(r.value) || 0)) * trackW;
    draw.push({t: 'rect', x: tx0, y: ty, w: fill, h: 44, r: 22, fill: INK});
    els.push({role: 'bar', tier: 'PIC', px: 44, box: box(tx0, ty, fill, 44)});
    if (r.shown) textBoxes.push(textEl(els, draw, {role: 'shown', tier: 'READ', text: String(r.shown), px: shownPx, x: cx + 884, y: ty + 22 - 0.49 * shownPx, weight: 700, align: 'right'}));
    const ms = Array.isArray(r.mark) ? r.mark : r.mark ? [r.mark] : [];
    // the approved card's ellipse round the fill, a little past it; its top just under the label's letters
    const ring = box(tx0, ty, Math.max(fill, 110) + 90, 44);
    const pad = [40, 30];
    ms.forEach((kind, k) => {
      const s = ctx.seed + i * 31 + k * 7;
      if (kind === 'circle') marks.push(markOf('circle', ring, s, {pad, stroke: 14}));
      else if (kind === 'arrow') marks.push({...markOf('arrow', box(ring.x - pad[0], ring.y - pad[1] + 26, ring.w + 2 * pad[0], ring.h + 2 * pad[1]), s, {stroke: 14}), room: card, avoid: true});
      else if (kind === 'tick') marks.push(markOf('tick', box(tx0 + trackW - 64, ty - 10, 64, 64), s, {stroke: 14}));
    });
  });
  // an arrow that would cross a label or an amount is left out (a long label runs where the approved card's short one did not)
  for (const m of marks) {
    if (m.kind === 'arrow') {
      const tipX = Math.min(m.box.x + m.box.w + 26, card.x + card.w - 40);
      const path = box(tipX - 10, Math.max(card.y + 20, m.box.y - 110), Math.min(card.x + card.w - 24, tipX + 150) - tipX + 20, 130);
      if (textBoxes.some((b) => overlap(path, b, 6))) continue;
    }
    draw.push(m);
  }
  if (d.note) {
    const np = Math.min(64, sizeFor(String(d.note), 812, 64, SEMI_M));
    tooSmall(problems, 'the bars note', np, TIER.LABEL, 'cut words');
    textEl(els, draw, {role: 'note', tier: 'LABEL', text: String(d.note), px: np, x: cx + 64, y: cy + noteTop, weight: 600, mtav: true, color: INK2});
  }
  L.hero = card;
  L.picture = card;
};

/** the most a capture is enlarged: past it the 1080 px capture's text is soft at full size (the 27 Oct judges on the parking
 *  tag, 48 px app text enlarged 2.2x). A region whose key needs more is set as type instead ("phone", the row). */
export const SHARP = 1.6;
/** The size a screen's key must reach in a "detail": 96 for words; 80 for a key that leads with digits or Latin capitals
 *  (their cap height, 0.69 em, stands as tall as Mkhedruli's body at 96: „1,4 კმ" at 80 reads like „ჭავჭავაძის" at 96). */
export const keyFloor = (text) => (/^[\dA-Z]/.test(String(text ?? '').trim()) ? 80 : TIER.READ);
/** the widest a detail's strip is drawn (the picture area) and the tallest */
export const STRIP = Object.freeze({w: 940, h: 620});
/** how a region of a capture is drawn whole: the strip of its own screen (or the element alone), its zoom, and whether the
 *  key reads (src/cover/layout.mjs detail; tools/ci/coverlog.mjs capturesFor asks the same before the brief offers it) */
export const detailFit = (reg) => {
  if (!reg || typeof reg !== 'object') return null;
  const E = Array.isArray(reg.element) ? reg.element : reg.box;
  const S = Array.isArray(reg.strip) ? reg.strip : E;
  if (!Array.isArray(E) || !Array.isArray(S)) return null;
  const holds = S[0] <= E[0] && S[1] <= E[1] && S[0] + S[2] >= E[0] + E[2] && S[1] + S[3] >= E[1] + E[3];
  const z = Math.min(STRIP.w / S[2], STRIP.h / S[3], SHARP);
  const keyPx = (reg.keyPx ?? 0) * z;
  const floor = keyFloor(reg.text);
  return {E, S, holds, z, keyPx, floor, reads: holds && keyPx >= floor};
};

/** the drawn region of a capture: z, the drawn box, the key's drawn box */
const regionAt = (reg, x0, y0, z, crop = reg.box) => {
  const [rx, ry, rw, rh] = crop;
  const [kx, ky, kw, kh] = reg.key ?? reg.box;
  return {z, box: box(x0, y0, rw * z, rh * z), key: box(x0 + (kx - rx) * z, y0 + (ky - ry) * z, kw * z, kh * z), r: (reg.radius ?? 24 / z) * z};
};

// detail (27 Oct, round 3; the judges and the owner's never-crop rule): the screen's element WHOLE, never cut through its
// words (the old loupe cut the live activity's ETA and faded the last letter of „დაიჭირე"), drawn on a strip of its own
// screen (the lock screen's wallpaper, the map; regions.json "strip") so the tile reads it as a real screen and not as a
// white card of words; no white card round it, no small source phone under it. Its key must still read: 96 px, or 80 for
// digits (keyFloor), at 1.6x at most (COVER_ZOOM); smaller app text goes on a "phone" row, set as type.
const detail = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const reg = ctx.regions?.[d.src]?.[d.region];
  if (!reg) {
    problems.push(`COVER_REGION "${d.region}" is not a named region of "${d.src}" (public/screens/regions.json)`);
    return;
  }
  const fit = detailFit(reg);
  if (!fit.holds) problems.push(`COVER_REGION the "strip" of "${d.region}" cuts its element: a detail shows the element whole (regions.json)`);
  const {S, z, keyPx, floor} = fit;
  if (keyPx < floor) problems.push(`COVER_ZOOM the key „${reg.text ?? d.region}" comes out at ${Math.round(keyPx)} px with the element whole (key ${reg.keyPx} px x ${z.toFixed(2)}): it needs ${floor}; this region goes on a "phone" row (its words set as type)`);
  const own = Array.isArray(reg.strip);
  const w = S[2] * z;
  const h = S[3] * z;
  const x0 = 70 + (STRIP.w - w) / 2;
  const y0 = ST + 10;
  const R = regionAt(reg, x0, y0, z, S);
  const r = own ? 40 : (reg.radius ?? 24) * z;
  draw.push({t: 'region', src: d.src, crop: S, x: R.box.x, y: R.box.y, z, r, corners: null, fade: null, hairline: false, shadow: SHADOW});
  els.push({role: 'region', tier: 'PIC', px: Math.round(keyPx), box: R.box, text: reg.text});
  els.push({role: 'key', tier: 'READ', px: Math.round(keyPx), box: R.key, text: reg.text});
  // the key's hand mark, only where it clears the screen's own words round it (regions.json "keyRoom", capture px)
  const mark = d.mark ?? 'circle';
  const keyRoom = Array.isArray(reg.keyRoom) ? reg.keyRoom.map((v) => v * z) : null; // [top, right, bottom, left]
  if (mark === 'circle') {
    const rr = ringFor(R.key.w, R.key.h, {stroke: 12, seed: ctx.seed});
    const fits = !keyRoom || (rr.out[1] <= Math.min(keyRoom[0], keyRoom[2]) && rr.out[0] <= Math.min(keyRoom[1], keyRoom[3]));
    if (fits) draw.push(ringMark(R.key, ctx.seed, {stroke: 12}));
  } else if (mark === 'underline' && (!keyRoom || keyRoom[2] >= 30)) draw.push(markOf('underline', R.key, ctx.seed, {stroke: 12}));
  const pics = [R.box];
  if (d.note) {
    // the note says what the detail proves, big (READ and up, one or two lines: "|" breaks it), under the strip
    const lines = String(d.note).split('|').map((x) => x.trim()).filter(Boolean).slice(0, 2);
    const top = R.box.y + R.box.h + 56;
    const roomH = 1478 - top;
    const np = Math.min(132, roomH / (lines.length * 1.12 - 0.12), ...lines.map((l) => sizeFor(l, 936, 132, SEMI_M)));
    tooSmall(problems, 'the detail note', np, TIER.READ, 'cut words, or one line');
    let ny = top;
    for (const l of lines) {
      if (ny + np > 1478) break;
      pics.push(textEl(els, draw, {role: 'note', tier: 'READ', text: l, px: np, x: 72, y: ny, weight: 600, mtav: true}));
      ny += np * 1.12;
    }
  }
  L.hero = R.box;
  L.picture = union(pics);
  L.look = 'screen';
};

// phone (27 Oct, round 3): ONE row of a real current screen, enlarged as the app draws it, and no phone (the judges: the
// 70 px tilted phone in the 300 px tile showed nothing, and 04 and 12 were the same home screen, mirrored). A white card
// like the app's own row: the row's icon from the capture's pixels (1.6x at most), its title beside it as the app sets it
// (bold, black), then the key, the words that prove the headline, as big as the card allows (one line up to 200 px, two up
// to 150, never under 96), its grey line under it; a hand ring round a short key, else a line under it. Every word is the
// region's own, measured on the capture (regions.json "label", "text", "sub").
const ROW = Object.freeze({x: 70, w: 940, pad: 52, icon: 136, gap: 30, r: 44});
const phone = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const reg = ctx.regions?.[d.src]?.[d.region];
  if (!reg) {
    problems.push(`COVER_REGION "${d.region}" is not a named region of "${d.src}" (public/screens/regions.json)`);
    return;
  }
  if (!reg.text) {
    problems.push(`COVER_REGION "${d.region}" of "${d.src}" names no "text": the row sets the capture's own words as type`);
    return;
  }
  const keyText = String(reg.text);
  const inner = ROW.w - 2 * ROW.pad;
  const cx = ROW.x;
  const cy = ST + 10;
  // the head: the row's own icon and its title
  let icon = null;
  if (Array.isArray(reg.icon)) {
    const [, , iw, ih] = reg.icon;
    const iz = Math.min(SHARP, ROW.icon / ih);
    icon = {z: iz, box: box(cx + ROW.pad, cy + ROW.pad, iw * iz, ih * iz)};
  }
  const lx = icon ? icon.box.x + icon.box.w + ROW.gap : cx + ROW.pad;
  const lw = cx + ROW.w - ROW.pad - lx;
  const LABEL_OPTS = {weight: 700};
  const lp = reg.label ? Math.min(84, sizeFor(String(reg.label), lw, 84, LABEL_OPTS)) : 0;
  if (reg.label) tooSmall(problems, `the row's title „${reg.label}"`, lp, TIER.LABEL, 'a shorter title');
  const headH = Math.max(icon ? icon.box.h : 0, lp);
  // the key: one line up to 200 px when it fits at 150 or more, else two lines up to 150 (never under 96)
  const mark0 = d.mark ?? (keyText.length <= 8 ? 'circle' : 'underline');
  let kp = 0;
  let lines = [keyText];
  const one = sizeFor(keyText, inner, 200, BOLD);
  if (one >= 150) kp = one;
  else {
    const kf = fitLines(keyText, inner, 2, 150, {weight: 700, min: TIER.READ});
    kp = kf.fits ? kf.size : Math.min(TIER.READ - 1, sizeFor(keyText, inner * 2, 150, BOLD));
    lines = kf.lines?.length ? kf.lines : [keyText];
  }
  // a ring round a short one-line key keeps its outer edge inside the card: the key shrinks for it (never under 150, else a line)
  let mark = mark0;
  if (mark === 'circle') {
    if (lines.length > 1) mark = 'underline';
    else {
      while (kp > 150 && textW(keyText, kp, BOLD) + 2 * ringFor(textW(keyText, kp, BOLD), 0.69 * kp, {stroke: 14}).out[0] > ROW.w - 2 * ROW.pad) kp -= 4;
      if (textW(keyText, kp, BOLD) + 2 * ringFor(textW(keyText, kp, BOLD), 0.69 * kp, {stroke: 14}).out[0] > ROW.w - 2 * ROW.pad) mark = 'underline';
    }
  }
  tooSmall(problems, `the row's key „${keyText}"`, kp, TIER.READ, 'a region with a shorter key');
  const ring = mark === 'circle' ? ringFor(textW(keyText, kp, BOLD), 0.69 * kp, {stroke: 14}) : null;
  const keyTop = cy + ROW.pad + headH + (ring ? Math.max(30, ring.out[1] - 0.15 * kp + 8) : 30);
  const kw = Math.max(...lines.map((l) => textW(l, kp, BOLD)));
  const kx = ring ? cx + (ROW.w - kw) / 2 : cx + ROW.pad;
  const kBottom = keyTop + lines.length * kp * 1.06;
  const sp = reg.sub ? Math.min(64, sizeFor(String(reg.sub), inner, 64, {weight: 500})) : 0;
  const subTop = kBottom + (ring ? Math.max(24, ring.out[1] - 0.16 * kp + 4) : mark === 'underline' ? 40 : 24);
  const cardH = (sp ? subTop + sp : kBottom) + ROW.pad - cy;
  draw.push({t: 'card', x: cx, y: cy, w: ROW.w, h: cardH, r: ROW.r, fill: '#FFFFFF', shadow: SHADOW});
  if (icon) {
    draw.push({t: 'region', src: d.src, crop: reg.icon, x: icon.box.x, y: icon.box.y, z: icon.z, r: 0, corners: null, fade: null, hairline: false});
    els.push({role: 'icon', tier: 'PIC', px: 0, box: icon.box});
  }
  if (lp) textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(reg.label), px: lp, x: lx, y: cy + ROW.pad + (headH - lp) / 2, weight: 700});
  const kbs = lines.map((l, i) => textEl(els, draw, {role: 'value', tier: 'READ', text: l, px: kp, x: kx, y: keyTop + i * kp * 1.06, weight: 700}));
  if (mark === 'circle') draw.push(ringMark(ink(kbs[0], kp), ctx.seed, {stroke: 14}));
  else if (mark === 'underline') {
    const last = kbs[kbs.length - 1];
    draw.push(markOf('underline', markBox(lines[lines.length - 1], last, kp, 'underline'), ctx.seed, {stroke: 14}));
  }
  if (sp) textEl(els, draw, {role: 'sub', tier: 'LABEL', text: String(reg.sub), px: sp, x: cx + ROW.pad, y: subTop, weight: 500, color: INK2});
  const card = box(cx, cy, ROW.w, cardH);
  L.hero = card;
  L.picture = card;
  L.look = 'card';
};

const carplay = (d, L) => {
  const {ST, els} = L;
  const IW = 800;
  const IH = 480;
  const BZ = 22;
  const room = {x0: 70, x1: 1010, y0: ST + 40, y1: Math.min(FRAME.paBottom, ST + 820)};
  const f = fitDevice(IW + 2 * BZ, IH + 2 * BZ, CARPLAY_ANGLES, CARPLAY_PERSPECTIVE, room);
  L.draw.push({t: 'carplay', src: d.src});
  els.push({role: 'display', tier: 'PIC', px: 0, box: f.box});
  L.hero = f.box;
  L.picture = f.box;
};

const polaroid = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const photos = (Array.isArray(d.photo) ? d.photo : [d.photo]).filter((p) => typeof p === 'string').slice(0, 2);
  if (!photos.length) {
    problems.push('COVER_PHOTO a polaroid without a photo');
    return;
  }
  const sign = ctx.polSign === -1 ? -1 : 1;
  const cards = [];
  if (photos.length === 1) {
    const info = ctx.photoInfo?.(photos[0]) ?? {w: 1600, h: 1067};
    const land = info.w >= info.h;
    cards.push(land ? {photo: photos[0], x: 160, y: ST - 15, w: 760, side: 36, winW: 688, winH: 516, foot: 170, tilt: 3 * sign, tag: d.tag} : {photo: photos[0], x: 184, y: ST - 10, w: 712, side: 36, winW: 640, winH: 640, foot: 170, tilt: 3 * sign, tag: d.tag});
  } else {
    cards.push({photo: photos[0], x: 70, y: ST, w: 480, side: 24, winW: 432, winH: 432, foot: 130, tilt: -4});
    cards.push({photo: photos[1], x: 530, y: ST + 120, w: 480, side: 24, winW: 432, winH: 432, foot: 130, tilt: 3, tag: d.tag});
  }
  const winBoxes = [];
  for (const c of cards) {
    c.h = c.side + c.winH + c.foot;
    const info = ctx.photoInfo?.(c.photo) ?? {w: 1600, h: 1067};
    const subj = Array.isArray(info.subject) && info.subject.length ? info.subject : null;
    const sb = subj ? {x0: Math.min(...subj.map((q) => q[0])), x1: Math.max(...subj.map((q) => q[0])), y0: Math.min(...subj.map((q) => q[1])), y1: Math.max(...subj.map((q) => q[1]))} : null;
    let u = d.focus?.x ?? (sb ? (sb.x0 + sb.x1) / 2 : 0.5);
    let v = d.focus?.y ?? (sb ? (sb.y0 + sb.y1) / 2 : 0.45);
    const s0 = Math.max(c.winW / info.w, c.winH / info.h);
    const zMax = Math.max(1, c.winW / (600 * s0));
    let zoom = d.zoom ?? 1;
    if (sb && d.zoom === undefined) zoom = Math.min(zMax, Math.max(1, (0.35 * c.winW) / Math.max(1e-6, (sb.x1 - sb.x0) * info.w * s0)));
    if (zoom > zMax + 1e-6) problems.push(`COVER_PHOTO_SUBJECT the zoom ${zoom} spreads ${Math.round(c.winW / (s0 * zoom))} source px across the window: at least 600, or it is blurry`);
    if (sb) {
      // the subject WHOLE, with 4 % of the window round it (the owner: a car or a person is never cut; the 27 Oct judges: the
      // 1.3 zoom cut the Toyota's tail and rear wing): the asked zoom and focus when they hold it, else the subject's centre,
      // else less zoom, down to 1 (the photo filling the window); a subject too big for that is COVER_PHOTO_CROP
      const holds = (z, uu, vv) => {
        const pw = info.w * s0 * z;
        const ph = info.h * s0 * z;
        const X = Math.min(0, Math.max(c.winW - pw, c.winW / 2 - uu * pw));
        const Y = Math.min(0, Math.max(c.winH - ph, c.winH / 2 - vv * ph));
        const m = 0.04 * c.winW;
        return X + sb.x0 * pw >= m && X + sb.x1 * pw <= c.winW - m && Y + sb.y0 * ph >= m && Y + sb.y1 * ph <= c.winH - m;
      };
      const cu = (sb.x0 + sb.x1) / 2;
      const cv = (sb.y0 + sb.y1) / 2;
      if (!holds(zoom, u, v)) {
        u = cu;
        v = cv;
        while (zoom > 1 && !holds(zoom, u, v)) zoom = Math.max(1, zoom - 0.02);
        if (!holds(zoom, u, v)) problems.push(`COVER_PHOTO_CROP the subject of „${c.photo}" does not fit whole in the polaroid's window (the owner: a car or a person is never cut): another photo`);
      }
      const share = ((sb.x1 - sb.x0) * info.w * s0 * zoom) / c.winW;
      if (share < 0.35) problems.push(`COVER_PHOTO_SUBJECT the subject of „${c.photo}" fills ${Math.round(share * 100)} % of the window's width: at least 35 % (a bigger zoom or another photo)`);
    }
    c.zoom = zoom;
    c.u = u;
    c.v = v;
    c.info = {w: info.w, h: info.h, lum: info.lum};
    const win = box(c.x + c.side, c.y + c.side, c.winW, c.winH);
    winBoxes.push(win);
    els.push({role: 'photo', tier: 'PIC', px: 0, box: win, text: c.photo});
    let tag = null;
    if (c.tag) {
      let tp = Math.min(120, sizeFor(String(c.tag), c.w - 80, 120, BOLD));
      tooSmall(problems, `the polaroid tag „${c.tag}"`, tp, TIER.READ, 'a shorter tag');
      tp = Math.max(tp, 40);
      const tw = textW(String(c.tag), tp, BOLD);
      const tr = ringFor(tw, 0.69 * tp, {stroke: 10, seed: ctx.seed});
      tag = {text: String(c.tag), px: tp, x: 40 + ((d.mark ?? 'underline') === 'circle' ? tr.out[0] : 0), y: c.side + c.winH + (c.foot - tp) / 2, w: tw, mark: d.mark ?? 'underline', pad: tr.pad, rot: tr.rot};
      // in the card's plane; for the checks, its page box without the small tilt
      els.push({role: 'tag', tier: 'READ', px: Math.round(tp), box: box(c.x + 40, c.y + tag.y, tw, tp), text: tag.text});
    }
    draw.push({t: 'polaroid', photo: c.photo, x: c.x, y: c.y, w: c.w, h: c.h, side: c.side, winW: c.winW, winH: c.winH, tilt: c.tilt, zoom: c.zoom, u: c.u, v: c.v, info: c.info, tag, seed: ctx.seed});
  }
  // the credits a licence asks for (CC BY): FINE, one line, right-aligned under the cards
  const credits = [...new Set(cards.map((c) => ctx.credit?.(c.photo) ?? '').filter(Boolean))];
  const bottom = Math.max(...cards.map((c) => c.y + c.h)) + 24;
  // a credit too long for one line at 28 px breaks at its „ · " into two (a CC BY-SA credit ran off the left edge, 27 Oct)
  const creditLines = credits.flatMap((t) => {
    if (sizeFor(t, 936, 36, {weight: 500}) >= TIER.FINE_MIN) return [t];
    const parts = t.split(' · ');
    const half = Math.ceil(parts.length / 2);
    return [parts.slice(0, half).join(' · '), parts.slice(half).join(' · ')].filter(Boolean);
  });
  const cp = Math.max(TIER.FINE_MIN, Math.min(36, ...creditLines.map((t) => sizeFor(t, 936, 36, {weight: 500}))));
  creditLines.forEach((t, i) => {
    textEl(els, draw, {role: 'credit', tier: 'FINE', text: t, px: cp, x: 1008, y: bottom + i * (cp + 8), weight: 500, color: GREY, align: 'right'});
  });
  L.hero = winBoxes[winBoxes.length - 1];
  L.picture = union(cards.map((c) => box(c.x, c.y, c.w, c.h)));
};

const QUOTES = /^[„"“]|[“"”]$/g;
const quote = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const raw = String(d.text ?? '').trim();
  const forced = raw.includes('|');
  const bare = raw.replace(/[„“”"]/g, '').trim();
  // the line is the picture: as big as three lines across the bubble allow, up to 170 px (the 27 Oct judges: a two-word
  // quote set no bigger than the headline, the bubble ending at 64 % of the tile), and never so big that the bubble and its
  // speaker run past the picture area
  const sp0 = d.speaker ?? {kind: 'none'};
  const speakerH = sp0.kind !== 'none' || sp0.name ? 50 + 130 : 0;
  const MAXQ = 170;
  let lines;
  let px;
  const layoutAt = (max) => {
    if (forced) {
      const ls = bare.split('|').map((x) => x.trim()).filter(Boolean);
      ls[0] = `„${ls[0]}`;
      ls[ls.length - 1] = `${ls[ls.length - 1]}“`;
      return {lines: ls, px: Math.min(max, ...ls.map((l) => sizeFor(l, 860, max, BOLD)))};
    }
    const f = fitLines(`„${bare}“`, 860, 3, max, {...BOLD, min: TIER.READ});
    return {lines: f.lines, px: f.fits ? f.size : Math.min(TIER.READ - 1, sizeFor(`„${bare}“`, 860 * 3, max, BOLD))};
  };
  let max = MAXQ;
  for (;;) {
    ({lines, px} = layoutAt(max));
    const bottom = ST + 5 + 128 + lines.length * px * 1.12 + 50 + speakerH;
    if (bottom <= FRAME.paBottom - 10 || max <= TIER.READ) break;
    max -= 4;
  }
  tooSmall(problems, 'the quote', px, TIER.READ, 'fewer words');
  if (lines.length > 3) problems.push('COVER_DATA the quote needs more than 3 lines: fewer words');
  const lh = px * 1.12;
  const bubble = box(70, ST + 5, 940, 128 + lines.length * lh);
  draw.push({t: 'bubble', x: bubble.x, y: bubble.y, w: bubble.w, h: bubble.h, r: 40, tail: [140, 210, 150, 50], fill: '#FFFFFF', shadow: SHADOW});
  const lineBoxes = lines.map((l, i) => textEl(els, draw, {role: 'quote', tier: 'READ', text: l, px, x: 110, y: bubble.y + 64 + i * lh + (lh - px) / 2, weight: 700}));
  if (d.mark?.word) {
    const word = String(d.mark.word);
    for (let i = 0; i < lines.length; i++) {
      const ws = lines[i].split(' ');
      const j = ws.findIndex((w) => w.replace(/[„“”"'.,:;!?…]/g, '') === word);
      if (j < 0) continue;
      const pre = ws.slice(0, j).join(' ');
      const lead = ws[j].indexOf(word);
      const off = (pre ? textW(`${pre} `, px, BOLD) : 0) + (lead > 0 ? textW(ws[j].slice(0, lead), px, BOLD) : 0);
      const kind = d.mark.kind === 'circle' ? 'circle' : 'underline';
      const b = markBox(word, box(110 + off, lineBoxes[i].y, textW(word, px, BOLD), px), px, kind, {tight: i < lines.length - 1});
      draw.push(kind === 'circle' ? ringMark(b, ctx.seed, {stroke: 12}) : markOf(kind, b, ctx.seed, {stroke: 12}));
      break;
    }
  }
  const sp = d.speaker ?? {kind: 'none'};
  const rowY = bubble.y + bubble.h + 50;
  let nameX = 110;
  if (sp.kind === 'app') {
    draw.push({t: 'disc', cx: 175, cy: rowY + 65, d: 130, fill: '#0E0E0E'});
    draw.push({t: 'brandmark', cx: 175, cy: rowY + 65, h: 74});
    nameX = 268;
  } else if (sp.kind === 'photo' && sp.src) {
    draw.push({t: 'avatar', photo: sp.src, cx: 175, cy: rowY + 65, d: 130, info: ctx.photoInfo?.(sp.src) ?? null});
    nameX = 268;
  }
  if (sp.name) {
    const np = Math.min(72, sizeFor(String(sp.name), 1008 - nameX, 72, SEMI_M));
    tooSmall(problems, 'the speaker\'s name', np, TIER.LABEL, 'a shorter name');
    textEl(els, draw, {role: 'name', tier: 'LABEL', text: String(sp.name), px: np, x: nameX, y: rowY + 65 - np / 2, weight: 600, mtav: true, color: INK2});
  }
  L.hero = bubble;
  L.picture = union([bubble, sp.kind !== 'none' || sp.name ? box(110, rowY, 600, 130) : null]);
  void QUOTES;
};

const steps = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 3);
  // each row a card 940 wide: the numeral in a disc (120), the text from x 190 (room 710, 590 with icons), an icon or the tick
  // at the right end. The ticked row is the result and the focal point (the 27 Oct round 2 judges: „three equal white pills
  // with no single focal element"): on the black card, taller, its disc white; the moves before it stay white.
  const TX = 190;
  const needs = rows.map((r) => textW(String(r.text), 100, BOLD));
  const icons = rows.some((r) => r.icon) && needs.every((w) => w <= 590);
  const room = icons ? 590 : 940 - TX - 40;
  const px = Math.min(100, ...rows.map((r) => sizeFor(String(r.text), room, 100, BOLD)));
  tooSmall(problems, 'the step texts', px, TIER.READ, 'shorter steps (10 letters or so)');
  const m = d.mark;
  const hero = m?.kind === 'tick' ? m.row - 1 : -1;
  const cards = [];
  let y = ST + 5;
  rows.forEach((r, i) => {
    const big = i === hero;
    const h = big ? 236 : 200;
    const c = box(70, y, 940, h);
    y += h + 24;
    cards.push(c);
    const ink2 = big ? '#FFFFFF' : INK;
    draw.push({t: 'card', x: c.x, y: c.y, w: c.w, h: c.h, r: 40, fill: big ? '#111111' : '#FFFFFF', shadow: SHADOW});
    draw.push({t: 'disc', cx: c.x + 36 + 60, cy: c.y + h / 2, d: 120, fill: big ? '#FFFFFF' : '#111111'});
    const nw = textW(String(i + 1), 72, BOLD);
    draw.push({t: 'text', text: String(i + 1), x: c.x + 96 - nw / 2, y: c.y + h / 2 - 36, w: nw, px: 72, weight: 700, mtav: false, tracking: 0, color: big ? '#111111' : '#FFFFFF'});
    const struck = m?.kind === 'strike' && m.row === i + 1;
    const tb = textEl(els, draw, {role: 'step', tier: 'READ', text: String(r.text), px, x: c.x + TX, y: c.y + (h - px) / 2, weight: 700, color: struck ? STRUCK : ink2});
    if (icons && r.icon && !big) draw.push({t: 'sym', name: r.icon, cx: c.x + 868, cy: c.y + h / 2, size: 96, color: INK});
    if (big) draw.push(markOf('tick', box(Math.min(c.x + 830, tb.x + tb.w + 44), c.y + h / 2 - 36, 72, 72), ctx.seed + i, {stroke: 18, color: '#FFFFFF'}));
    if (struck) draw.push(markOf('strike', markBox(r.text, tb, px, 'strike'), ctx.seed + i, {stroke: 12}));
  });
  L.hero = hero >= 0 ? cards[hero] : union(cards);
  L.picture = union(cards);
};

const timeline = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const stops = (Array.isArray(d.stops) ? d.stops : []).slice(0, 3);
  const n = stops.length;
  let heroI = stops.findIndex((s) => s.hero);
  if (heroI < 0) heroI = n - 1;
  const railX = 150;
  const OV = 120; // the other stops' value size (grey)
  // the other stops, top down: the value, its label beside it or under it; the hero after them, circled, its label under it
  let y = ST + 45;
  const boxes = [];
  const dots = [];
  stops.forEach((s, i) => {
    if (i === heroI) return;
    const vb = textEl(els, draw, {role: 'value', tier: 'READ', text: String(s.value), px: OV, x: 220, y, weight: 700, color: INK2});
    dots.push(y + 0.49 * OV);
    const lp = Math.min(72, sizeFor(String(s.label), 1008 - 220, 72, SEMI_M));
    tooSmall(problems, `the timeline label „${s.label}"`, lp, TIER.LABEL, 'a shorter label');
    const lw = textW(String(s.label), lp, SEMI_M);
    const beside = vb.x + vb.w + 40 + lw <= 1008;
    const lb = textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(s.label), px: lp, x: beside ? vb.x + vb.w + 40 : 220, y: beside ? y + 0.835 * (OV - lp) : y + OV + 8, weight: 600, mtav: true});
    boxes.push(vb, lb);
    y = (beside ? y + OV : lb.y + lb.h) + 56;
  });
  const hs = stops[heroI];
  const hv = String(hs?.value ?? '');
  const labelGap = 30;
  const lpH = Math.min(72, sizeFor(String(hs?.label ?? ''), 1008 - 220, 72, SEMI_M));
  // the hero's ring clears its digits and the stop above (ringFor); its label goes under the ring
  const geom = (v, t) => {
    const vw = textW(hv, v, BOLD);
    const r = ringFor(vw, 0.69 * v, {seed: ctx.seed, t});
    const top = y + Math.max(24, r.out[1] - 0.15 * v);
    return {vw, r, t, top, labelY: top + v + Math.max(0, r.out[1] - 0.16 * v) + labelGap};
  };
  // the ring's shape that lets the hero be biggest: a flatter ring where height is short, a taller one where width is
  // (the ring starts just right of the rail's ring, x 196: room 812)
  const best = (t) => {
    let v = 240;
    for (; v > 120 && 2 * geom(v, t).r.out[0] + geom(v, t).vw > 812; v -= 2);
    while (v > 120 && geom(v, t).labelY + lpH > 1478) v -= 2;
    return v;
  };
  const shapes = [1.3, 1.4, 1.5, 1.65, 1.8].map((t) => ({t, v: best(t)}));
  const pickT = shapes.reduce((a, b) => (b.v > a.v ? b : a));
  const V = pickT.v;
  tooSmall(problems, `the timeline's hero „${hv}"`, V, 180, 'a shorter value or fewer stops');
  const G = geom(V, pickT.t);
  const heroTop = G.top;
  const heroCy = heroTop + 0.49 * V;
  draw.unshift({t: 'rect', x: railX - 3, y: ST + 45 + 0.49 * OV, w: 6, h: Math.max(0, heroCy - (ST + 45 + 0.49 * OV)), fill: INK});
  for (const cy of dots) draw.push({t: 'disc', cx: railX, cy, d: 28, fill: INK});
  draw.push({t: 'ring', cx: railX, cy: heroCy, d: 48, stroke: 8, color: INK, fill: '#FFFFFF'});
  // the hero of a timeline is its biggest thing, 180 px or more (its own floor above; a ringed time is wide)
  const hb = textEl(els, draw, {role: 'value', tier: 'VERSUS', text: hv, px: V, x: 196 + G.r.out[0], y: heroTop, weight: 700});
  draw.push(ringMark(ink(hb, V), ctx.seed, {stroke: 16, t: pickT.t}));
  const hi = ink(hb, V);
  const heroRing = box(hi.x - G.r.out[0], hi.y - G.r.out[1], hi.w + 2 * G.r.out[0], hi.h + 2 * G.r.out[1]);
  tooSmall(problems, `the timeline label „${hs?.label}"`, lpH, TIER.LABEL, 'a shorter label');
  const hl = textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(hs?.label ?? ''), px: lpH, x: 220, y: G.labelY, weight: 600, mtav: true});
  boxes.push(hb, hl);
  if (d.source) {
    // where and when the times are from („შვედეთი, 1967") is the story's key: readable (LABEL, grey) under the hero's label
    // when it fits above Instagram's view count, else the fine line at the foot
    const sp = Math.min(64, sizeFor(String(d.source), 788, 64, SEMI_M));
    if (sp >= TIER.LABEL && hl.y + hl.h + 24 + sp <= 1478) boxes.push(textEl(els, draw, {role: 'source', tier: 'LABEL', text: String(d.source), px: sp, x: 220, y: hl.y + hl.h + 24, weight: 600, mtav: true, color: INK2}));
    else {
      const fp = Math.max(TIER.FINE_MIN, Math.min(40, sizeFor(String(d.source), 700, 40, {weight: 500})));
      textEl(els, draw, {role: 'source', tier: 'FINE', text: String(d.source), px: fp, x: 1008, y: 1600 - 0.835 * fp, weight: 500, color: GREY, align: 'right', foot: true});
    }
  }
  L.hero = heroRing;
  L.picture = union([box(railX - 24, ST + 45, 1, 1), ...boxes]);
};

const BUILD = {stat, versus, bars, detail, phone, carplay, polaroid, quote, steps, timeline};

// ---- the checks on what will be drawn ----------------------------------------------------------------------------------
const area = (b) => (b ? Math.max(0, b.w) * Math.max(0, b.h) : 0);
const inCrop = (b) => {
  const x0 = Math.max(CROP.x, b.x);
  const y0 = Math.max(CROP.y, b.y);
  const x1 = Math.min(CROP.x + CROP.w, b.x + b.w);
  const y1 = Math.min(CROP.y + CROP.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? box(x0, y0, x1 - x0, y1 - y0) : null;
};
export const FOCAL = Object.freeze({picArea: 0.2, picWidth: 0.45, heroArea: 0.07});

const checks = (L) => {
  const {els, problems, ST, comp} = L;
  const need = {HERO: TIER.HERO, VERSUS: TIER.VERSUS, READ: TIER.READ, LABEL: TIER.LABEL};
  for (const e of els) {
    if (!(e.tier in need)) continue;
    if (e.role === 'key') continue; // COVER_ZOOM says it
    if (e.px < need[e.tier] && !problems.some((p) => p.startsWith('COVER_TEXT_SIZE') && p.includes(String(e.text ?? '').slice(0, 6))))
      problems.push(`COVER_TEXT_SIZE ${e.role} „${e.text}" is ${e.px} px: ${e.tier} needs ${need[e.tier]}`);
  }
  for (const e of els) {
    if (e.tier === 'FINE' && !['source', 'credit'].includes(e.role)) problems.push(`COVER_TEXT_SIZE ${e.role} „${e.text}" is FINE (${e.px} px): only a source or a credit may be that small`);
    if (e.tier === 'FINE' && (e.px < TIER.FINE_MIN || e.px > TIER.FINE_MAX)) problems.push(`COVER_TEXT_SIZE the ${e.role} line is ${e.px} px: ${TIER.FINE_MIN} to ${TIER.FINE_MAX}`);
  }
  for (const e of els) {
    if (!(e.tier in need)) continue;
    for (const c of CORNERS) if (c.hit(e.box)) problems.push(`COVER_CORNER ${e.role} „${e.text}" (${Math.round(e.box.x)}, ${Math.round(e.box.y)}, ${Math.round(e.box.w)} x ${Math.round(e.box.h)}) enters the ${c.name} zone`);
  }
  // the first readable thing of the picture is up by ST + 120 (the sticky bar hides a tile's lower half)
  const firsts = els.filter((e) => e.tier in need || ['region', 'photo', 'phone', 'display'].includes(e.role)).map((e) => e.box.y);
  if (comp !== 'carplay' && firsts.length && Math.min(...firsts) > ST + 120) problems.push(`COVER_TOPZONE the picture's first readable element starts at y ${Math.round(Math.min(...firsts))}: by ${ST + 120} (the gallery's bar hides a tile's lower half)`);
  // focal: the picture and its hero are big in the 3:4 crop
  const pic = L.picture ? inCrop(L.picture) : null;
  const cropA = CROP.w * CROP.h;
  if (!pic || area(pic) < FOCAL.picArea * cropA || pic.w < FOCAL.picWidth * CROP.w)
    problems.push(`COVER_FOCAL the picture fills ${pic ? Math.round((area(pic) / cropA) * 100) : 0} % of the 3:4 tile and ${pic ? Math.round((pic.w / CROP.w) * 100) : 0} % of its width: at least ${FOCAL.picArea * 100} % and ${FOCAL.picWidth * 100} %`);
  const hero = L.hero ? inCrop(L.hero) : null;
  if (!hero || area(hero) < FOCAL.heroArea * cropA) problems.push(`COVER_FOCAL the hero fills ${hero ? Math.round((area(hero) / cropA) * 1000) / 10 : 0} % of the 3:4 tile: at least ${FOCAL.heroArea * 100} %`);
  // nothing below the picture area (the cards' shadows stay above the grid line)
  for (const e of els) if (e.tier !== 'FINE' && e.box.y + e.box.h > FRAME.paBottom + 2) problems.push(`COVER_GRID ${e.role} ends at y ${Math.round(e.box.y + e.box.h)}: the picture area ends at ${FRAME.paBottom}`);
};

export const layoutChecks = (L) => checks(L);

/** Every primitive moved down by dy (the foot's fine lines, a source or a credit, stay where they are). */
const shiftDraw = (L, dy) => {
  const mv = (b) => (b ? {...b, y: b.y + dy} : b);
  L.draw = L.draw.map((p) => {
    if (p.foot) return p;
    const q = {...p};
    if ('y' in q && typeof q.y === 'number') q.y += dy;
    if ('cy' in q && typeof q.cy === 'number') q.cy += dy;
    if ('y1' in q) {
      q.y1 += dy;
      q.y2 += dy;
    }
    if (q.box) q.box = mv(q.box);
    if (q.outline && p.t === 'flatphone') q.outline = mv(q.outline);
    return q;
  });
  L.els = L.els.map((e) => (e.foot ? e : {...e, box: mv(e.box)}));
  L.hero = mv(L.hero);
  L.picture = mv(L.picture);
};
/** The picture sits a little lower when it is short (the 27 Oct judges: a third of a tile left empty under a short card):
 *  down by half the room left under it, at most 110 px, so its first readable thing stays by ST + 120 (the gallery's bar
 *  hides a tile's lower half), nothing passes the picture area, and no text enters Instagram's bottom-left mark. The CarPlay
 *  display places itself (TiltDevice.tsx) and stays. */
const balance = (L) => {
  if (L.comp === 'carplay' || !L.picture || !L.els.length) return;
  const need = {HERO: 1, VERSUS: 1, READ: 1, LABEL: 1};
  const bottom = Math.max(L.picture.y + L.picture.h, ...L.els.filter((e) => !e.foot).map((e) => e.box.y + e.box.h));
  const firsts = L.els.filter((e) => e.tier in need || ['region', 'photo', 'phone', 'display'].includes(e.role)).map((e) => e.box.y);
  const first = firsts.length ? Math.min(...firsts) : L.ST;
  // ... and the picture's first 150 px of real ink stay in the band the gallery always shows (ST..960: COVER_TOP_INK): its
  // first text, photo or phone (a capture's region can be white on the white card)
  const inks = L.els.filter((e) => (e.tier in need && e.role !== 'region') || ['photo', 'phone', 'display'].includes(e.role)).map((e) => e.box.y);
  const firstInk = inks.length ? Math.min(...inks) : first;
  let dy = Math.min(110, Math.max(0, (FRAME.paBottom - 40 - bottom) / 2), L.ST + 120 - first, 960 - 150 - firstInk);
  for (const e of L.els) if (e.tier in need && e.box.x < 460 && !e.foot) dy = Math.min(dy, 1478 - (e.box.y + e.box.h));
  // the polaroid's credit stays under its card
  const credit = L.els.filter((e) => e.role === 'credit');
  if (credit.length) dy = Math.min(dy, FRAME.gridBottom - 50 - Math.max(...credit.map((e) => e.box.y + e.box.h)));
  dy = Math.floor(dy);
  if (dy >= 12) shiftDraw(L, dy);
};

/** The whole layout of a resolved cover. */
export const coverLayout = (cover, ctx = {}) => {
  const head = headOf(cover?.title ?? '', {floor: ctx.headFloor !== false, comp: cover?.kind});
  const comp = cover?.kind;
  const L = {comp, head, ST: head.ST, oneLine: head.lines.length <= 1, els: [], draw: [], problems: [...head.problems], hero: null, picture: null, variant: null, pose: null, look: null};
  const build = BUILD[comp];
  if (!build) {
    L.problems.push(`COVER_KIND "${comp}" has no layout`);
    return L;
  }
  const data = comp === 'carplay' ? {src: cover.carplay?.src ?? cover.screen?.src} : cover[comp];
  if (!data || typeof data !== 'object') {
    L.problems.push(`COVER_DATA a "${comp}" cover needs "${comp}": {...}`);
    return L;
  }
  build(data, L, {seed: 1, ...ctx});
  // what the tile shows (the ledger's "look", tools/ci/coverlog.mjs R4, R6, R7, R8): the composition's own, else its name's
  L.look = L.look ?? lookOf(comp, L.variant);
  balance(L);
  checks(L);
  L.problems = [...new Set(L.problems)];
  return L;
};

// ---- self-test (node src/cover/layout.mjs --test) ----------------------------------------------------------------------
// the fixtures: two named regions as public/screens/regions.json has them, and one photo's size (no files read here: this
// module is in the render bundle too)
const FIX_REGIONS = {
  '18-nav-lock-screen': {'live-activity': {box: [35, 1684, 1010, 326], element: [35, 1684, 1010, 326], strip: [0, 1560, 1080, 560], radius: 60, key: [215, 1730, 190, 80], keyRoom: [40, 300, 20, 60], keyPx: 93, text: '1,4 კმ'}},
  '07-parking': {'spot-row': {box: [395, 1078, 290, 110], key: [421, 1090, 240, 38], keyPx: 48, text: 'P2, მე-3 რიგი'}},
  '23-home-104': {
    'inspection-row': {box: [55, 1323, 970, 159], element: [55, 1323, 970, 159], icon: [86, 1352, 100, 100], radius: 40, key: [730, 1392, 120, 40], keyPx: 36, text: '12 დღე', label: 'ტექინსპექტირება', sub: 'Toyota Prius'},
    'parking-row': {box: [55, 1483, 970, 159], element: [55, 1483, 970, 159], icon: [86, 1514, 104, 104], radius: 40, key: [216, 1575, 330, 40], keyPx: 44, text: 'ჭავჭავაძის გამზ. 37', label: 'სად დგას მანქანა', sub: 'დღეს, 14:30'},
  },
};
const FIX_PHOTOS = {'story-toyota-2016-1': {w: 1600, h: 1064, lum: 0.44, subject: [[0.268, 0.62], [0.6, 0.366], [0.907, 0.4], [0.907, 0.66], [0.62, 0.787], [0.268, 0.74]]}};
const selfTest = () => {
  const ctx = {regions: FIX_REGIONS, photoInfo: (s) => FIX_PHOTOS[s] ?? null, credit: () => 'ფოტო: David Merrett · CC BY 2.0'};
  let bad = 0;
  const ok = (cond, what) => {
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
    if (!cond) bad++;
  };
  const has = (L, code) => L.problems.some((p) => p.startsWith(code));
  const clean = (cover, what, c = ctx) => {
    const L = coverLayout(cover, c);
    ok(!L.problems.length, `${what}${L.problems.length ? `: ${L.problems.join(' | ')}` : ''}`);
    return L;
  };
  // the headline: 112 shrink-only, 96 the floor
  ok(headOf('5W თუ 10W, | რა სხვაობაა?').size === 112, 'a short title is set at 112');
  ok(headOf('3 წუთი დარჩა, | ტოიოტა ჩერდება').size === 108, '„ტოიოტა ჩერდება" fits at 108');
  ok(headOf('მთაში ზოლი არ იჭერს? | ქართული ხმა მაინც გიყვანს').problems.some((p) => p.startsWith('COVER_TITLE_FIT')), 'a 67 px headline fails COVER_TITLE_FIT');
  ok(headOf('5W თუ 10W, | რა სხვაობაა?').ST === 755, 'two lines at 112: the picture starts at 755');
  ok(headOf('ერთი ხაზი').ST === 630, 'one line: the picture starts at 630');
  // the design's test set lays out clean
  clean({title: '5W თუ 10W, | რა სხვაობაა?', kind: 'versus', versus: {a: {label: 'მწარმოებელი', value: '5W-30'}, b: {label: 'ბიძა', value: '10W-30'}, win: 'a'}}, 'versus (stack) lays out clean');
  ok(coverLayout({title: 'ა | ბ', kind: 'versus', versus: {a: {label: 'მწარმოებელი', value: '5W-30'}, b: {label: 'ბიძა', value: '10W-30'}, win: 'a'}}, ctx).variant === 'stack', '„10W-30" does not fit a side card: stack');
  ok(coverLayout({title: 'ა | ბ', kind: 'versus', versus: {a: {label: 'ქაღალდზე', icon: 'description'}, b: {label: 'ეკრანზე', icon: 'calendar_month'}, win: 'b'}}, ctx).variant === 'side', 'two icons: side');
  clean({title: 'ვადები | ფურცელზე?', kind: 'versus', versus: {a: {label: 'ქაღალდზე', icon: 'description'}, b: {label: 'ეკრანზე', icon: 'calendar_month'}, win: 'b'}}, 'versus (side, icons) lays out clean');
  clean({title: 'აკუმულატორი | ყინვას გაუძლებს?', kind: 'bars', bars: {rows: [{icon: 'car_battery', label: 'აკუმულატორი', value: 0.454, shown: '45,4 %', mark: ['circle', 'arrow']}, {icon: 'car_repair', label: 'ძრავი', value: 0.218, shown: '21,8 %'}], note: 'გზაზე გაჩერების მიზეზი'}}, 'bars lays out clean');
  clean({title: 'ზოლი არ იჭერს? | ხმა მაინც გიყვანს', kind: 'detail', detail: {src: '18-nav-lock-screen', region: 'live-activity', mark: 'circle', note: 'უინტერნეტოდ'}}, 'detail lays out clean');
  clean({title: 'მატჩის მერე | მანქანა სადაა?', kind: 'phone', phone: {src: '23-home-104', region: 'parking-row'}}, 'phone (the parking row, enlarged) lays out clean');
  clean({title: 'ვადები | ფურცელზე?', kind: 'phone', phone: {src: '23-home-104', region: 'inspection-row'}}, 'phone (the inspection row, enlarged) lays out clean');
  clean({title: 'საცობში | ყველა ჩქარობს', kind: 'quote', quote: {text: 'გადავაფრინდე, | ხომ?', speaker: {kind: 'none'}}}, 'quote lays out clean');
  clean({title: 'ყველა მეკითხება: | მანქანას ყიდი?', kind: 'steps', steps: {rows: [{text: 'აპში ბარათი'}, {text: 'მინაზე დებ'}, {text: 'მოგწერენ'}], mark: {row: 3, kind: 'tick'}}}, 'steps lays out clean');
  clean({title: 'ათ წუთში | გზის მეორე მხარეს', kind: 'timeline', timeline: {stops: [{value: '04:50', label: 'ყველა ჩერდება'}, {value: '05:00', label: 'ყველა იძვრება', hero: true}], source: 'შვედეთი, 1967'}}, 'timeline lays out clean');
  clean({title: 'ყველა ვადას | თავში ინახავ?', kind: 'stat', stat: {value: '7', unit: 'დღე', label: 'ადრე შეგახსენებს', sub: 'მერე 3 და 1 დღით ადრეც', mark: 'circle'}}, 'stat lays out clean');
  clean({title: 'ცარიელი გვერდი, | სუფთა მანქანა?', kind: 'quote', quote: {text: '„ეს იმას | არ ნიშნავს, | რომ სუფთაა.“', speaker: {kind: 'app', name: 'ვინარი'}, mark: {word: 'არ', kind: 'underline'}}}, 'quote (app) lays out clean');
  clean({title: '3 წუთი დარჩა, | ტოიოტა ჩერდება', kind: 'polaroid', polaroid: {photo: 'story-toyota-2016-1', tag: '3 წთ', mark: 'underline', focus: {x: 0.5, y: 0.55}, zoom: 1.3}}, 'polaroid lays out clean');
  // round 2 (the 27 Oct judges): the ring clears every corner of what it rings, at its turn
  {
    let worst = 0;
    for (const [w, h] of [[590, 138], [120, 300], [700, 120], [245, 103], [400, 160]])
      for (const seed of [1, 2, 3, 7]) {
        const r = ringFor(w, h, {seed});
        const c = Math.cos((r.rot * Math.PI) / 180);
        const sn = Math.sin((r.rot * Math.PI) / 180);
        for (const [x, y] of [[w / 2, h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]]) worst = Math.max(worst, ((x * c + y * sn) / r.rx) ** 2 + ((-x * sn + y * c) / r.ry) ** 2);
      }
    ok(worst < 0.8, `the hand ring keeps every glyph corner inside it with a gap (worst ${worst.toFixed(2)} of the ellipse)`);
  }
  {
    // the polaroid keeps its car whole: the asked 1.3 zoom cut the Toyota's tail, the layout zooms out until it fits
    const L = coverLayout({title: '3 წუთი დარჩა, | ტოიოტა ჩერდება', kind: 'polaroid', polaroid: {photo: 'story-toyota-2016-1', tag: '3 წთ', focus: {x: 0.5, y: 0.55}, zoom: 1.3}}, ctx);
    const p = L.draw.find((d) => d.t === 'polaroid');
    ok(p && p.zoom < 1.3 && !L.problems.length, `the polaroid zooms out to keep the car whole (zoom ${p?.zoom?.toFixed(2)})`);
  }
  {
    // round 3: the phone is the row itself, enlarged; no tilted phone, the row's own icon from the capture, the key as type
    const L = coverLayout({title: 'მატჩის მერე | მანქანა სადაა?', kind: 'phone', phone: {src: '23-home-104', region: 'parking-row'}}, ctx);
    const key = L.els.filter((e) => e.role === 'value');
    ok(!L.draw.some((d) => d.t === 'phone3d' || d.t === 'flatphone') && L.draw.some((d) => d.t === 'region' && d.crop === FIX_REGIONS['23-home-104']['parking-row'].icon) && key.length && key.every((e) => e.px >= 120) && L.look === 'card', `the phone row: no phone, the row's own icon, the key as type at 120 px or more (${key.map((e) => e.px).join(', ')}), a card look`);
    const I = coverLayout({title: 'ვადები | ფურცელზე?', kind: 'phone', phone: {src: '23-home-104', region: 'inspection-row'}}, ctx);
    const k1 = I.els.filter((e) => e.role === 'value');
    ok(k1.length === 1 && k1[0].px >= 150 && I.draw.some((d) => d.t === 'mark' && d.kind === 'circle'), `a short key („12 დღე") is one ringed line at 150 px or more (${k1.map((e) => e.px).join(', ')})`);
  }
  {
    // round 3: a detail draws the element WHOLE on a strip of its own screen; a strip that cuts the element is refused
    const L = coverLayout({title: 'ზოლი არ იჭერს? | ხმა მაინც გიყვანს', kind: 'detail', detail: {src: '18-nav-lock-screen', region: 'live-activity', note: 'უინტერნეტოდ'}}, ctx);
    const r = L.draw.find((d) => d.t === 'region');
    ok(r && r.crop === FIX_REGIONS['18-nav-lock-screen']['live-activity'].strip && !r.fade && !L.draw.some((d) => d.t === 'flatphone') && L.look === 'screen', 'the detail shows the live activity whole on its lock screen, no fade, no small phone, a screen look');
    const cut = {...FIX_REGIONS['18-nav-lock-screen']['live-activity'], strip: [35, 1684, 665, 326]};
    ok(has(coverLayout({title: 'ა | ბ', kind: 'detail', detail: {src: 'x', region: 'y'}}, {...ctx, regions: {x: {y: cut}}}), 'COVER_REGION'), 'a strip that cuts its element fails COVER_REGION (never a broken word)');
    ok(keyFloor('1,4 კმ') === 80 && keyFloor('ჭავჭავაძის') === 96, 'a key of digits needs 80 px, of words 96');
  }
  ok(coverLayout({title: 'ა | ბ', kind: 'versus', versus: {a: {label: 'ა', value: '5W-30'}, b: {label: 'ბ', value: '10W-30'}, win: 'a'}}, {...ctx, dark: true}).variant === 'stack-dark', 'the ledger\'s dark turn draws the black versus card');
  ok(!headOf('ქართული ნავიგატორი | ახლა CarPlay-ზეც', {comp: 'carplay'}).problems.length, 'the approved CarPlay headline passes on a CarPlay cover');
  ok(has(coverLayout({title: 'ა | ბ', kind: 'detail', detail: {src: '07-parking', region: 'spot-row'}}, ctx), 'COVER_ZOOM'), 'a loupe past 1.6x (48 px app text) fails COVER_ZOOM: it would be soft');
  // the guards
  ok(has(coverLayout({title: 'ა | ბ', kind: 'stat', stat: {value: '1234567', unit: 'კილომ', label: 'ა'}}, ctx), 'COVER_TEXT_SIZE'), 'a stat too wide for 240 px fails COVER_TEXT_SIZE');
  ok(has(coverLayout({title: 'ა | ბ', kind: 'quote', quote: {text: 'ეს ძალიან გრძელი ხაზია და სამ სტრიქონში ვერ ჩაეტევა ასოთი', speaker: {kind: 'none'}}}, ctx), 'COVER_TEXT_SIZE'), 'a long quote fails COVER_TEXT_SIZE');
  ok(has(coverLayout({title: 'ა | ბ', kind: 'detail', detail: {src: '18-nav-lock-screen', region: 'nope'}}, ctx), 'COVER_REGION'), 'an unknown region fails COVER_REGION');
  ok(has(coverLayout({title: 'ა | ბ', kind: 'detail', detail: {src: 'x', region: 'wide'}}, {...ctx, regions: {x: {wide: {box: [0, 0, 1080, 300], key: [0, 0, 300, 60], keyPx: 40}}}}), 'COVER_ZOOM'), 'a whole-width region with 40 px text fails COVER_ZOOM');
  ok(has(coverLayout({title: 'ა | ბ', kind: 'steps', steps: {rows: [{text: 'ძალიან გრძელი ნაბიჯის ტექსტი'}, {text: 'ა'}]}}, ctx), 'COVER_TEXT_SIZE'), 'a long step fails COVER_TEXT_SIZE');
  ok(has(coverLayout({title: 'ა | ბ', kind: 'timeline', timeline: {stops: [{value: '1', label: 'ა'}, {value: '2', label: 'ძალიან ძალიან გრძელი ლეიბლი აქ'}]}}, ctx), 'COVER_TEXT_SIZE'), 'a timeline label too long fails');
  // COVER_CORNER: a LABEL text in Instagram's bottom-left zone
  {
    const L = {comp: 'stat', ST: 755, els: [{role: 'label', tier: 'LABEL', px: 72, box: box(100, 1470, 300, 72), text: 'x'}], problems: [], picture: box(70, 760, 940, 700), hero: box(70, 760, 500, 400)};
    checks(L);
    ok(L.problems.some((p) => p.startsWith('COVER_CORNER')), 'a label at the bottom left fails COVER_CORNER');
  }
  // the old tilted phone (2026-10-26, PHONE [30, -10, -16] in the whole stage with a caption) is under 0.9 of the picture area
  {
    const SW = 1000;
    const SH = (SW * CAPTURE.h) / CAPTURE.w;
    const f = fitDevice(SW + 76, SH + 76, [30, -10, -16], PHONE_PERSPECTIVE, {x0: 100, x1: 980, y0: 765, y1: 1550});
    ok(f.box.h < 0.9 * (FRAME.paBottom - 755), `the old tilted phone (${Math.round(f.box.h)} px tall) would fail COVER_FOCAL's 0.9 rule (${Math.round(0.9 * 875)})`);
  }
  console.log(bad ? `layout: ${bad} failed` : 'layout: all ok');
  return bad ? 1 : 0;
};

if (typeof process !== 'undefined' && /layout\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
