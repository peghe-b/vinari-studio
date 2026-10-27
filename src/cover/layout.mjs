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
import {PHONE_POSES} from './comps.mjs';

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
const markBox = (text, b, px, kind, {tight = false} = {}) => {
  if (!MKHEDRULI.test(String(text ?? ''))) return ink(b, px);
  if (kind === 'strike') return box(b.x, b.y + 0.35 * px, b.w, 0.45 * px);
  // a line of a quote has the next line's tall letters 1.12 em under it: there the underline runs just under the baseline
  if (kind === 'underline') return box(b.x, b.y + 0.38 * px, b.w, (tight ? 0.5 : 0.66) * px);
  return box(b.x, b.y + 0.3 * px, b.w, 0.72 * px);
};
/** the ring's room round a value the hand circle goes round (Marker.tsx: pad x up to 70, and its 10 % drift) */
const ringPad = (vw, V = 0) => ringX(vw, V) + 14;
/** the hand circle's room left and right of a value: 9 % of its width, at least 16 % of its height (a lone „7" gets a round
 *  ring, not a zero round it), at most 90 */
const ringX = (vw, V = 0) => Math.min(90, Math.max(0.09 * vw, 0.16 * V));

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
export const headOf = (title, {floor = true} = {}) => {
  const lines = String(title ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  const size = Math.min(FRAME.headMax, ...lines.map((l) => sizeFor(l, FRAME.maxW, FRAME.headMax, HEAD_OPTS)));
  const problems = [];
  if (size < FRAME.headMin) {
    lines.forEach((l, i) => {
      const w = textW(l, FRAME.headMin, HEAD_OPTS);
      if (w > FRAME.maxW) problems.push(`COVER_TITLE_FIT cut words: line ${i + 1} „${l}" measures ${Math.round(w)} px at ${FRAME.headMin}, the limit is ${FRAME.maxW} (about 14 Mtavruli letters a line)`);
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
  els.push({role: o.role, tier: o.tier, px: Math.round(o.px), box: b, text: o.text});
  draw.push({t: 'text', text: o.text, x: b.x, y: b.y, w: b.w, px: o.px, weight: opts.weight, mtav: opts.mtav, tracking: opts.tracking, color: o.color ?? INK});
  return b;
};
const tooSmall = (problems, what, px, need, fix) => {
  if (px < need) problems.push(`COVER_TEXT_SIZE ${what} comes out at ${Math.round(px)} px: it needs ${need} (${Math.round(need * 0.278)} px in the 300 px tile)${fix ? `; ${fix}` : ''}`);
};
const markOf = (kind, b, seed, extra = {}) => ({t: 'mark', kind, box: b, seed, stroke: extra.stroke ?? 14, pad: extra.pad, color: extra.color ?? INK});

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
  const widthAt = (V) => {
    const vw = textW(value, V, vOpts);
    const up = unit ? Math.max(TIER.READ, 0.3 * V) : 0;
    const uw = unit ? textW(unit, up, SEMI_M) : 0;
    const rp = mark === 'circle' ? ringPad(vw, V) : 0;
    return {vw, up, uw, rp, total: 2 * rp + vw + (unit ? 0.05 * V + uw : 0)};
  };
  // the label and the sub under the value stay above y 1478 (Instagram's view count): the value gives way first
  const lab0 = fitLines(String(d.label ?? ''), 936, 2, 100, {...SEMI_M, min: TIER.READ});
  const below = (slab ? 0 : 40) + lab0.lines.length * lab0.size * 1.1 + (d.sub ? 28 + 64 : 0);
  const top0 = slab ? ST + 60 : ST + 10;
  let V = maxV;
  for (; V > 120 && (widthAt(V).total > room || (!slab && top0 + V + below > 1478)); V -= 2);
  const m = widthAt(V);
  tooSmall(problems, `the stat value „${value}${unit ? ` ${unit}` : ''}"`, V, TIER.HERO, 'a shorter value or unit');
  const top = slab ? ST + 60 : ST + 10;
  if (slab) draw.push({t: 'card', x: 70, y: ST, w: 940, h: 620, r: 40, fill: '#0E0E0E'});
  const vx = left0 + m.rp;
  const color = slab ? '#FFFFFF' : INK;
  const vb = textEl(els, draw, {role: 'value', tier: 'HERO', text: value, px: V, x: vx, y: top, weight: 700, tracking: -0.02, color});
  let ub = null;
  if (unit) {
    // on the value's baseline (0.835 em down a line-height-1 box), just outside the ring
    const ux = vx + m.vw + m.rp * (mark === 'circle' ? 1 : 0) + 0.05 * V;
    ub = textEl(els, draw, {role: 'unit', tier: 'READ', text: unit, px: m.up, x: ux, y: top + 0.835 * V - 0.835 * m.up, weight: 600, mtav: true, color});
  }
  const digits = ink(vb, V);
  if (mark === 'circle') draw.push(markOf('circle', digits, ctx.seed, {pad: [ringX(m.vw, V), 0.16 * V], stroke: 16, color: slab ? '#F3F3F3' : INK}));
  else draw.push(markOf('underline', box(digits.x, digits.y, digits.w, digits.h - 6), ctx.seed, {stroke: 16, color: slab ? '#F3F3F3' : INK}));
  // the label: Mtavruli, one or two lines at 96 to 100
  const lab = lab0;
  if (!lab.fits) tooSmall(problems, `the stat label „${d.label}"`, Math.min(TIER.READ - 1, sizeFor(String(d.label ?? ''), 936 * 2, 100, SEMI_M)), TIER.READ, 'cut words');
  let y = slab ? ST + 660 : top + V + 40;
  const labBoxes = lab.lines.map((line, i) => textEl(els, draw, {role: 'label', tier: 'READ', text: line, px: lab.size, x: 72, y: y + i * lab.size * 1.1, weight: 600, mtav: true}));
  y += lab.lines.length * lab.size * 1.1;
  if (d.sub) {
    const sp = Math.min(64, sizeFor(String(d.sub), 936, 64, {weight: 600}));
    tooSmall(problems, `the stat's sub-line`, sp, TIER.LABEL, 'cut words');
    textEl(els, draw, {role: 'sub', tier: 'LABEL', text: String(d.sub), px: sp, x: 72, y: y + 28, weight: 600, color: INK2});
  }
  if (d.source) {
    const sp = Math.max(TIER.FINE_MIN, Math.min(40, sizeFor(String(d.source), 700, 40, {weight: 500})));
    textEl(els, draw, {role: 'source', tier: 'FINE', text: String(d.source), px: sp, x: 1008, y: 1600 - 0.835 * sp, weight: 500, color: GREY, align: 'right'});
  }
  L.hero = union([vb, ub]);
  L.picture = union([slab ? box(70, ST, 940, 620) : null, vb, ub, ...labBoxes]);
};

const versus = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const sides = [d.a, d.b];
  const win = d.win === 'b' ? 1 : 0;
  const isIcon = sides.every((s) => s && s.icon !== undefined);
  const valueOf = (s) => `${s.value ?? ''}`;
  const vOpts = {weight: 700};
  const unitPx = (V) => Math.round(V * 0.37);
  const wAt = (s, V, i) => {
    const vw = textW(valueOf(s), V, vOpts);
    const uw = s.unit ? 0.05 * V + textW(String(s.unit), unitPx(V), SEMI_M) : 0;
    return vw + uw + (i === win ? 2 * ringPad(vw, V) : 0);
  };
  const fitV = (s, i, room, max) => {
    let V = max;
    for (; V > 60 && wAt(s, V, i) > room; V -= 2);
    return V;
  };
  const sideOk = isIcon || sides.every((s, i) => s && s.icon === undefined && fitV(s, i, 383, 240) >= TIER.VERSUS);
  const seed = ctx.seed;
  if (sideOk) {
    L.variant = 'side';
    const V = isIcon ? 0 : Math.min(...sides.map((s, i) => fitV(s, i, 383, 240)));
    // the cards as tall as what they hold (the label, the value or the icon disc, a margin), never an empty foot
    const cardH = isIcon ? 150 + 240 + 70 : 170 + V + 80;
    const cards = [box(70, ST + 5, 455, cardH), box(555, ST + 5, 455, cardH)];
    const boxes = [];
    sides.forEach((s, i) => {
      const c = cards[i];
      draw.push({t: 'card', x: c.x, y: c.y, w: c.w, h: c.h, r: 40, fill: '#FFFFFF', shadow: SHADOW});
      boxes.push(c);
      const lp = Math.min(72, sizeFor(String(s.label), 383, 72, SEMI_M));
      tooSmall(problems, `the versus label „${s.label}"`, lp, TIER.LABEL, 'a shorter word');
      const lb = textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(s.label), px: lp, x: c.x + c.w / 2, y: c.y + 44, weight: 600, mtav: true, color: INK2, align: 'center'});
      if (isIcon) {
        const dy = c.y + 150;
        const cx = c.x + c.w / 2;
        draw.push({t: 'disc', cx, cy: dy + 120, d: 240, fill: i === win ? '#111111' : STRUCK});
        draw.push({t: 'sym', name: s.icon, cx, cy: dy + 120, size: 150, color: '#FFFFFF'});
        els.push({role: 'icon', tier: 'PIC', px: 240, box: box(cx - 120, dy, 240, 240), text: s.icon});
        if (i === win) draw.push(markOf('tick', box(cx + 70, dy + 170, 70, 60), seed + i, {stroke: 16}));
        else draw.push(markOf('strike', markBox(s.label, lb, lp, 'strike'), seed + i, {stroke: 10}));
      } else {
        const vw = textW(valueOf(s), V, vOpts);
        const uw = s.unit ? 0.05 * V + textW(String(s.unit), unitPx(V), SEMI_M) : 0;
        const rp = i === win ? ringPad(vw) : 0;
        const x0 = c.x + c.w / 2 - (vw + uw) / 2;
        const color = i === win ? INK : STRUCK;
        const vb = textEl(els, draw, {role: 'value', tier: 'VERSUS', text: valueOf(s), px: V, x: x0, y: c.y + 170, weight: 700, color});
        if (s.unit) textEl(els, draw, {role: 'unit', tier: 'LABEL', text: String(s.unit), px: unitPx(V), x: x0 + vw + 0.05 * V, y: c.y + 170 + 0.835 * (V - unitPx(V)), weight: 600, mtav: true, color});
        if (i === win) draw.push(markOf('circle', markBox(valueOf(s), vb, V, 'circle'), seed + i, {pad: [ringX(vw, V), 0.16 * V], stroke: 16}));
        else draw.push(markOf('strike', markBox(valueOf(s), vb, V, 'strike'), seed + i, {stroke: 12, color: INK}));
        void rp;
      }
    });
    if (!isIcon) tooSmall(problems, 'the versus values', V, TIER.VERSUS, 'shorter values');
    L.hero = cards[win];
    L.picture = union(boxes);
    return;
  }
  // stacked: the approved mileage card, enlarged
  L.variant = 'stack';
  const c = box(70, ST + 5, 940, 728);
  draw.push({t: 'card', x: c.x, y: c.y, w: c.w, h: c.h, r: 40, fill: '#FFFFFF', shadow: SHADOW});
  // the winner is circled; a word too wide for its ring at 150 px is underlined instead (Georgian words run wide)
  let ringed = true;
  let V = Math.min(...sides.map((s, i) => fitV(s, i, 860, 200)));
  if (V < TIER.VERSUS) {
    ringed = false;
    V = Math.min(...sides.map((s) => fitV(s, -1, 860, 200)));
  }
  tooSmall(problems, 'the versus values', V, TIER.VERSUS, 'shorter values');
  const rows = [ST + 45, ST + 391];
  sides.forEach((s, i) => {
    const lp = Math.min(72, sizeFor(String(s.label), 860, 72, SEMI_M));
    tooSmall(problems, `the versus label „${s.label}"`, lp, TIER.LABEL, 'a shorter word');
    textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(s.label), px: lp, x: 110, y: rows[i], weight: 600, mtav: true, color: INK2});
    const vw = textW(valueOf(s), V, vOpts);
    const rp = i === win && ringed ? ringPad(vw, V) : 0;
    const color = i === win ? INK : STRUCK;
    const vy = rows[i] + 92;
    const vb = textEl(els, draw, {role: 'value', tier: 'VERSUS', text: valueOf(s), px: V, x: 110 + rp, y: vy, weight: 700, color});
    if (s.unit) textEl(els, draw, {role: 'unit', tier: 'LABEL', text: String(s.unit), px: unitPx(V), x: 110 + rp + vw + rp + 0.05 * V, y: vy + 0.835 * (V - unitPx(V)), weight: 600, mtav: true, color});
    const v = valueOf(s);
    if (i === win) draw.push(ringed ? markOf('circle', markBox(v, vb, V, 'circle'), seed + i, {pad: [ringX(vw, V), 0.16 * V], stroke: 16}) : markOf('underline', markBox(v, vb, V, 'underline'), seed + i, {stroke: 16}));
    else draw.push(markOf('strike', markBox(v, vb, V, 'strike'), seed + i, {stroke: 12}));
  });
  draw.push({t: 'rect', x: 110, y: ST + 365, w: 860, h: 3, fill: TRACK});
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
      draw.push({t: 'disc', cx: cx + 56 + 60, cy: dy + 60, d: 120, fill: DISC[Math.min(i, DISC.length - 1)]});
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
      else if (kind === 'tick') marks.push(markOf('tick', box(tx0, ty - 6, trackW - 70, 56), s, {stroke: 14}));
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
    textEl(els, draw, {role: 'note', tier: 'LABEL', text: String(d.note), px: np, x: cx + 64, y: cy + noteTop, weight: 600, mtav: true, color: GREY});
  }
  L.hero = card;
  L.picture = card;
};

/** the drawn region of a capture: z, the drawn box, the key's drawn box */
const regionAt = (reg, x0, y0, z) => {
  const [rx, ry, rw, rh] = reg.box;
  const [kx, ky, kw, kh] = reg.key ?? reg.box;
  return {z, box: box(x0, y0, rw * z, rh * z), key: box(x0 + (kx - rx) * z, y0 + (ky - ry) * z, kw * z, kh * z), r: (reg.radius ?? 24 / z) * z};
};

const detail = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const reg = ctx.regions?.[d.src]?.[d.region];
  if (!reg) {
    problems.push(`COVER_REGION "${d.region}" is not a named region of "${d.src}" (public/screens/regions.json)`);
    return;
  }
  const [, , rw, rh] = reg.box;
  let z = Math.min(860 / rw, 460 / rh, 2.4);
  // the source phone under the card: flat and whole, 172 x 360, its right edge at x 1002
  let ph = 360;
  let cardH = 80 + rh * z;
  const room = () => FRAME.paBottom - (ST + 5 + cardH + 60);
  if (room() < ph) ph = Math.max(300, room());
  if (room() < ph) {
    z = (FRAME.paBottom - 60 - ph - (ST + 5) - 80) / rh;
    cardH = 80 + rh * z;
  }
  const keyPx = reg.keyPx * z;
  if (keyPx < TIER.READ || z > 2.4) problems.push(`COVER_ZOOM the key „${reg.text ?? d.region}" comes out at ${Math.round(keyPx)} px (key ${reg.keyPx} px x ${z.toFixed(2)}): it needs ${TIER.READ}; name a narrower region`);
  const card = box(70, ST + 5, 940, cardH);
  draw.push({t: 'card', x: card.x, y: card.y, w: card.w, h: card.h, r: 40, fill: '#FFFFFF', shadow: SHADOW});
  const x0 = 110 + (860 - rw * z) / 2;
  const R = regionAt(reg, x0, card.y + 40, z);
  draw.push({t: 'region', src: d.src, crop: reg.box, x: R.box.x, y: R.box.y, z, r: R.r});
  els.push({role: 'region', tier: 'PIC', px: Math.round(keyPx), box: R.box, text: reg.text});
  els.push({role: 'key', tier: 'READ', px: Math.round(keyPx), box: R.key, text: reg.text});
  const mark = d.mark ?? 'circle';
  if (mark === 'circle') draw.push(markOf('circle', R.key, ctx.seed, {pad: [24, 20], stroke: 12}));
  else if (mark === 'underline') draw.push(markOf('underline', R.key, ctx.seed, {stroke: 12}));
  // the flat whole phone it comes from, and the outline of the region on it, concentric with the region
  const pw = ph * (172 / 360);
  const px = 1002 - pw;
  const py = card.y + card.h + 60;
  const bz = 8 * (ph / 360);
  const s = (pw - 2 * bz) / CAPTURE.w;
  const gap = 6;
  const [bx, by, bw, bh] = reg.box;
  const ol = box(px + bz + bx * s - gap, py + bz + by * s - gap, bw * s + 2 * gap, bh * s + 2 * gap);
  // the hairlines first (under the phone): from the outline's top corners straight up to the card
  draw.push({t: 'line', x1: ol.x + 1, y1: ol.y, x2: ol.x + 1, y2: card.y + card.h, w: 2, color: GREY});
  draw.push({t: 'line', x1: ol.x + ol.w - 1, y1: ol.y, x2: ol.x + ol.w - 1, y2: card.y + card.h, w: 2, color: GREY});
  draw.push({t: 'flatphone', src: d.src, x: px, y: py, w: pw, h: ph, bezel: bz, r: 30 * (ph / 360), outline: {...ol, r: (reg.radius ?? 0) * s + gap, stroke: 4}});
  els.push({role: 'phone', tier: 'PIC', px: 0, box: box(px, py, pw, ph)});
  if (d.note) {
    const np = Math.min(72, sizeFor(String(d.note), 680, 72, SEMI_M));
    tooSmall(problems, 'the detail note', np, TIER.LABEL, 'cut words');
    const ny = Math.min(py + ph / 2 - np / 2, 1478 - np);
    textEl(els, draw, {role: 'note', tier: 'LABEL', text: String(d.note), px: np, x: 72, y: ny, weight: 600, mtav: true});
  }
  L.hero = R.box;
  L.picture = union([card, box(px, py, pw, ph)]);
};

const phone = (d, L, ctx) => {
  const {ST, els, draw, problems} = L;
  const reg = ctx.regions?.[d.src]?.[d.region];
  if (!reg) {
    problems.push(`COVER_REGION "${d.region}" is not a named region of "${d.src}" (public/screens/regions.json)`);
    return;
  }
  // the body at a base size (the screen 1000 wide): a thin black bezel and the screen's own corners (TiltDevice.tsx)
  const SW = 1000;
  const SH = (SW * CAPTURE.h) / CAPTURE.w;
  const BZ = 38;
  const PW = SW + 2 * BZ;
  const PH = SH + 2 * BZ;
  const sc = SW / CAPTURE.w;
  const [bx, by, bw, bh] = reg.box;
  const gap = 14;
  // the outline in the screen's own plane, concentric with the region (base px, from the body's centre)
  const olBase = {x: BZ + bx * sc - gap - PW / 2, y: BZ + by * sc - gap - PH / 2, w: bw * sc + 2 * gap, h: bh * sc + 2 * gap};
  const [, , rw, rh] = reg.box;
  const z = Math.min(640 / rw, 300 / rh, 2.4);
  const keyPx = reg.keyPx * z;
  if (keyPx < TIER.READ) problems.push(`COVER_ZOOM the tag's key „${reg.text ?? d.region}" comes out at ${Math.round(keyPx)} px (key ${reg.keyPx} px x ${z.toFixed(2)}): it needs ${TIER.READ}; use a narrower region or "detail"`);
  const tagH = 60 + rh * z;
  const order = [d.pose ?? ctx.pose ?? PHONE_POSES[0]];
  const mirror = {'left-lean': 'right-lean', 'right-lean': 'left-lean', 'left-back': 'right-back', 'right-back': 'left-back'};
  order.push(mirror[order[0]] ?? 'right-lean');
  let chosen = null;
  for (const pose of order) {
    const ang = POSES[pose] ?? POSES['left-lean'];
    const left = pose.startsWith('left');
    const room = {x0: left ? 70 : 480, x1: left ? 600 : 1010, y0: ST, y1: FRAME.paBottom};
    const f = fitDevice(PW, PH, ang, PHONE_PERSPECTIVE, room, 0.5);
    const proj = (x, y) => {
      const [qx, qy] = projectPoint(x * f.k, y * f.k, ang, PHONE_PERSPECTIVE);
      return [f.cx + qx, f.cy + qy];
    };
    const corners = [
      proj(olBase.x, olBase.y),
      proj(olBase.x + olBase.w, olBase.y),
      proj(olBase.x + olBase.w, olBase.y + olBase.h),
      proj(olBase.x, olBase.y + olBase.h),
    ];
    const olBox = union(corners.map(([x, y]) => box(x, y, 0, 0)));
    const tx = left ? 310 : 70;
    for (let ty = ST + 20; ty <= ST + 360; ty += 40) {
      const tag = box(tx, ty, 700, tagH);
      if (!overlap(tag, olBox, 16) && ty + tagH <= FRAME.paBottom) {
        chosen = {pose, ang, f, corners, olBox, tag, left};
        break;
      }
    }
    if (chosen) break;
  }
  if (!chosen) {
    problems.push(`COVER_PHONE_TAG no tag position or pose leaves the outline of „${reg.text ?? d.region}" visible: use "detail"`);
    return;
  }
  const {ang, f, corners, tag, left} = chosen;
  L.pose = chosen.pose;
  const need = 0.9 * (FRAME.paBottom - ST);
  if (f.box.h < need) problems.push(`COVER_FOCAL the tilted phone is ${Math.round(f.box.h)} px tall: it needs ${Math.round(need)} (0.9 of the picture area)`);
  draw.push({t: 'phone3d', src: d.src, angles: ang, k: f.k, cx: f.cx, cy: f.cy, W: PW, H: PH, BZ, SW, SH, outline: {x: olBase.x + PW / 2, y: olBase.y + PH / 2, w: olBase.w, h: olBase.h, r: (reg.radius ?? 0) * sc + gap, stroke: 14}});
  els.push({role: 'phone', tier: 'PIC', px: 0, box: f.box});
  // the leader: from the outline's corner nearest the tag to the tag's nearest edge, a dot at the outline end
  const tc = [tag.x + tag.w / 2, tag.y + tag.h / 2];
  const near = corners.reduce((a, c) => (Math.hypot(c[0] - tc[0], c[1] - tc[1]) < Math.hypot(a[0] - tc[0], a[1] - tc[1]) ? c : a), corners[0]);
  const ex = Math.min(tag.x + tag.w, Math.max(tag.x, near[0]));
  const ey = near[1] > tag.y + tag.h ? tag.y + tag.h : near[1] < tag.y ? tag.y : near[1];
  const ex2 = near[1] >= tag.y && near[1] <= tag.y + tag.h ? (left ? tag.x : tag.x + tag.w) : ex;
  draw.push({t: 'line', x1: near[0], y1: near[1], x2: ex2, y2: ey, w: 3, color: INK});
  draw.push({t: 'disc', cx: near[0], cy: near[1], d: 10, fill: INK});
  // the tag: a white card with the region enlarged
  draw.push({t: 'card', x: tag.x, y: tag.y, w: tag.w, h: tag.h, r: 36, fill: '#FFFFFF', shadow: TAG_SHADOW});
  const R = regionAt(reg, tag.x + 30 + (640 - rw * z) / 2, tag.y + 30, z);
  draw.push({t: 'region', src: d.src, crop: reg.box, x: R.box.x, y: R.box.y, z, r: R.r});
  els.push({role: 'region', tier: 'PIC', px: Math.round(keyPx), box: R.box, text: reg.text});
  els.push({role: 'key', tier: 'READ', px: Math.round(keyPx), box: R.key, text: reg.text});
  L.hero = union([f.box, tag]);
  L.picture = union([f.box, tag]);
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
    const sx = subj ? subj.reduce((s, q) => s + q[0], 0) / subj.length : 0.5;
    const sy = subj ? subj.reduce((s, q) => s + q[1], 0) / subj.length : 0.45;
    const u = d.focus?.x ?? sx;
    const v = d.focus?.y ?? sy;
    const s0 = Math.max(c.winW / info.w, c.winH / info.h);
    const zMax = Math.max(1, c.winW / (600 * s0));
    let zoom = d.zoom ?? 1;
    if (subj && d.zoom === undefined) {
      const sw = Math.max(...subj.map((q) => q[0])) - Math.min(...subj.map((q) => q[0]));
      zoom = Math.min(zMax, Math.max(1, (0.35 * c.winW) / Math.max(1e-6, sw * info.w * s0)));
    }
    if (zoom > zMax + 1e-6) problems.push(`COVER_PHOTO_SUBJECT the zoom ${zoom} spreads ${Math.round(c.winW / (s0 * zoom))} source px across the window: at least 600, or it is blurry`);
    if (subj) {
      const sw = Math.max(...subj.map((q) => q[0])) - Math.min(...subj.map((q) => q[0]));
      const share = (sw * info.w * s0 * zoom) / c.winW;
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
      tag = {text: String(c.tag), px: tp, x: 40, y: c.side + c.winH + (c.foot - tp) / 2, w: tw, mark: d.mark ?? 'underline'};
      // in the card's plane; for the checks, its page box without the small tilt
      els.push({role: 'tag', tier: 'READ', px: Math.round(tp), box: box(c.x + 40, c.y + tag.y, tw, tp), text: tag.text});
    }
    draw.push({t: 'polaroid', photo: c.photo, x: c.x, y: c.y, w: c.w, h: c.h, side: c.side, winW: c.winW, winH: c.winH, tilt: c.tilt, zoom: c.zoom, u: c.u, v: c.v, info: c.info, tag, seed: ctx.seed});
  }
  // the credits a licence asks for (CC BY): FINE, one line, right-aligned under the cards
  const credits = [...new Set(cards.map((c) => ctx.credit?.(c.photo) ?? '').filter(Boolean))];
  const bottom = Math.max(...cards.map((c) => c.y + c.h)) + 24;
  credits.forEach((t, i) => {
    const cp = Math.max(TIER.FINE_MIN, Math.min(36, sizeFor(t, 936, 36, {weight: 500})));
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
  let lines;
  let px;
  if (forced) {
    lines = bare.split('|').map((s) => s.trim()).filter(Boolean);
    lines[0] = `„${lines[0]}`;
    lines[lines.length - 1] = `${lines[lines.length - 1]}“`;
    px = Math.min(140, ...lines.map((l) => sizeFor(l, 860, 140, BOLD)));
  } else {
    const f = fitLines(`„${bare}“`, 860, 3, 140, {...BOLD, min: TIER.READ});
    lines = f.lines;
    px = f.fits ? f.size : Math.min(TIER.READ - 1, sizeFor(`„${bare}“`, 860 * 3, 140, BOLD));
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
      draw.push(markOf(kind, b, ctx.seed, {stroke: 12, pad: kind === 'circle' ? [26, 22] : undefined}));
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
  // each row a card 940 x 210: the numeral in a black disc (120), the text from x 190 (room 710, 590 with icons), an icon or
  // the tick at the right end
  const TX = 190;
  const needs = rows.map((r) => textW(String(r.text), 100, BOLD));
  const icons = rows.some((r) => r.icon) && needs.every((w) => w <= 590);
  const room = icons ? 590 : 940 - TX - 40;
  const px = Math.min(100, ...rows.map((r) => sizeFor(String(r.text), room, 100, BOLD)));
  tooSmall(problems, 'the step texts', px, TIER.READ, 'shorter steps (10 letters or so)');
  const m = d.mark;
  const cards = [];
  rows.forEach((r, i) => {
    const c = box(70, ST + 5 + i * 234, 940, 210);
    cards.push(c);
    draw.push({t: 'card', x: c.x, y: c.y, w: c.w, h: c.h, r: 40, fill: '#FFFFFF', shadow: SHADOW});
    draw.push({t: 'disc', cx: c.x + 36 + 60, cy: c.y + 105, d: 120, fill: '#111111'});
    const nw = textW(String(i + 1), 72, BOLD);
    draw.push({t: 'text', text: String(i + 1), x: c.x + 96 - nw / 2, y: c.y + 105 - 36, w: nw, px: 72, weight: 700, mtav: false, tracking: 0, color: '#FFFFFF'});
    const struck = m?.kind === 'strike' && m.row === i + 1;
    const tb = textEl(els, draw, {role: 'step', tier: 'READ', text: String(r.text), px, x: c.x + TX, y: c.y + (210 - px) / 2, weight: 700, color: struck ? STRUCK : INK});
    const ticked = m?.kind === 'tick' && m.row === i + 1;
    if (icons && r.icon && !ticked) draw.push({t: 'sym', name: r.icon, cx: c.x + 868, cy: c.y + 105, size: 96, color: INK});
    if (ticked) draw.push(markOf('tick', box(Math.min(c.x + 800, tb.x + tb.w + 40), c.y + 70, 20, 70), ctx.seed + i, {stroke: 18}));
    if (struck) draw.push(markOf('strike', markBox(r.text, tb, px, 'strike'), ctx.seed + i, {stroke: 12}));
  });
  L.hero = union(cards);
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
  const labelGap = 34;
  const heroTop = y + 24; // room for the hand circle's top
  const lpH = Math.min(72, sizeFor(String(hs?.label ?? ''), 1008 - 220, 72, SEMI_M));
  let V = 240;
  const fits = (v) => 2 * ringPad(textW(hv, v, BOLD), v) + textW(hv, v, BOLD) <= 788;
  for (; V > 120 && !fits(V); V -= 2);
  while (V > 120 && heroTop + V + labelGap + lpH > 1478) V -= 2;
  tooSmall(problems, `the timeline's hero „${hv}"`, V, 200, 'a shorter value or fewer stops');
  const heroCy = heroTop + 0.49 * V;
  draw.unshift({t: 'rect', x: railX - 3, y: ST + 45 + 0.49 * OV, w: 6, h: Math.max(0, heroCy - (ST + 45 + 0.49 * OV)), fill: INK});
  for (const cy of dots) draw.push({t: 'disc', cx: railX, cy, d: 28, fill: INK});
  const vw = textW(hv, V, BOLD);
  draw.push({t: 'ring', cx: railX, cy: heroCy, d: 48, stroke: 8, color: INK, fill: '#FFFFFF'});
  const hb = textEl(els, draw, {role: 'value', tier: 'HERO', text: hv, px: V, x: 220 + ringPad(vw, V), y: heroTop, weight: 700});
  draw.push(markOf('circle', ink(hb, V), ctx.seed, {pad: [ringX(vw, V), 0.16 * V], stroke: 16}));
  tooSmall(problems, `the timeline label „${hs?.label}"`, lpH, TIER.LABEL, 'a shorter label');
  boxes.push(hb, textEl(els, draw, {role: 'label', tier: 'LABEL', text: String(hs?.label ?? ''), px: lpH, x: 220, y: heroTop + V + labelGap, weight: 600, mtav: true}));
  if (d.source) {
    const sp = Math.max(TIER.FINE_MIN, Math.min(40, sizeFor(String(d.source), 700, 40, {weight: 500})));
    textEl(els, draw, {role: 'source', tier: 'FINE', text: String(d.source), px: sp, x: 1008, y: 1600 - 0.835 * sp, weight: 500, color: GREY, align: 'right'});
  }
  L.hero = hb;
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

/** The whole layout of a resolved cover. */
export const coverLayout = (cover, ctx = {}) => {
  const head = headOf(cover?.title ?? '', {floor: ctx.headFloor !== false});
  const comp = cover?.kind;
  const L = {comp, head, ST: head.ST, oneLine: head.lines.length <= 1, els: [], draw: [], problems: [...head.problems], hero: null, picture: null, variant: null, pose: null};
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
  checks(L);
  L.problems = [...new Set(L.problems)];
  return L;
};

// ---- self-test (node src/cover/layout.mjs --test) ----------------------------------------------------------------------
// the fixtures: two named regions as public/screens/regions.json has them, and one photo's size (no files read here: this
// module is in the render bundle too)
const FIX_REGIONS = {
  '18-nav-lock-screen': {'live-activity': {box: [35, 1685, 665, 245], key: [215, 1730, 190, 80], keyPx: 93, radius: 48, text: '1,4 კმ'}},
  '07-parking': {'spot-row': {box: [395, 1078, 290, 110], key: [421, 1090, 240, 38], keyPx: 48, text: 'P2, მე-3 რიგი'}},
};
const FIX_PHOTOS = {'story-toyota-2016-1': {w: 1600, h: 1064, lum: 0.44}};
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
  clean({title: 'მატჩის მერე | მანქანა სადაა?', kind: 'phone', phone: {src: '07-parking', region: 'spot-row'}}, 'phone (left-lean, tag) lays out clean');
  clean({title: 'საცობში | ყველა ჩქარობს', kind: 'quote', quote: {text: 'გადავაფრინდე, | ხომ?', speaker: {kind: 'none'}}}, 'quote lays out clean');
  clean({title: 'ყველა მეკითხება: | მანქანას ყიდი?', kind: 'steps', steps: {rows: [{text: 'აპში ბარათი'}, {text: 'მინაზე დებ'}, {text: 'მოგწერენ'}], mark: {row: 3, kind: 'tick'}}}, 'steps lays out clean');
  clean({title: 'ათ წუთში | გზის მეორე მხარეს', kind: 'timeline', timeline: {stops: [{value: '04:50', label: 'ყველა ჩერდება'}, {value: '05:00', label: 'ყველა იძვრება', hero: true}], source: 'შვედეთი, 1967'}}, 'timeline lays out clean');
  clean({title: 'ყველა ვადას | თავში ინახავ?', kind: 'stat', stat: {value: '7', unit: 'დღე', label: 'ადრე შეგახსენებს', sub: 'მერე 3 და 1 დღით ადრეც', mark: 'circle'}}, 'stat lays out clean');
  clean({title: 'ცარიელი გვერდი, | სუფთა მანქანა?', kind: 'quote', quote: {text: '„ეს იმას | არ ნიშნავს, | რომ სუფთაა.“', speaker: {kind: 'app', name: 'ვინარი'}, mark: {word: 'არ', kind: 'underline'}}}, 'quote (app) lays out clean');
  clean({title: '3 წუთი დარჩა, | ტოიოტა ჩერდება', kind: 'polaroid', polaroid: {photo: 'story-toyota-2016-1', tag: '3 წთ', mark: 'underline', focus: {x: 0.5, y: 0.55}, zoom: 1.3}}, 'polaroid lays out clean');
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
