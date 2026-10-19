// The highlight follows the element's own shape (the owner, 2026-10-19, on the box drawn round the black pill
// „ჩამოტვირთვა · ~97 MB": "the corners don't follow it, it is ugly, it doesn't sit well"; for the slides, the covers and the
// films alike). Every outline, band, window or lifted card drawn round an element of a REAL capture is CONCENTRIC with it:
// its inner edge an even gap off the element all round, its corner radius the element's own radius plus that gap (a pill
// gets a pill, a card with 24 px corners gets 24 + gap), one stroke width, never touching or clipping the element.
//
// Where the element is and how round it is come from the capture's own pixels (shapeOf: the spec's box is only the hint, and
// a spec may be loose), or from the spec: a highlight's optional `r` (the element's corner radius in capture px, or "pill")
// and `snap: false` (draw round the spec's box as given). When the pixels show no shape (a row of a grouped list, a dashed
// card), the spec's box is the outline's inner edge and its corners are R_DEFAULT (or the spec's `r`).
//
// Films up to v109 render exactly as made: the flat Phone, the 3D Phone and the loupe draw the new outline from film
// KIT_FROM on (outlineOn); the promo kit (src/scenes/kit/) is new with that film and always draws it.
//
//   outlineOn(film)                 true when the film `film` (its id or number) draws the concentric outline
//   shapeOf(img, box)               the element under `box` (capture px) in `img` ({data, width, height}, RGBA):
//                                   {x0, y0, x1, y1, r, pill, free, how} in capture px, or null (no clear shape)
//   ringOf(hl, img, W, H, o)        the outline's INNER edge for a spec highlight {x?, y, w?, h, r?, snap?, gap?} (capture
//                                   fractions): {x0, y0, x1, y1, r, gap, shape} in capture px; the stroke goes OUTSIDE it,
//                                   so every offset of it (the stroke's middle, its outer edge, a soft veil) stays concentric
//   laneOf(img, box)                the card a shapeless row sits in ({x0, x1} capture px, or null)
//   growRing(ring, d)               the ring moved out by d px (radius + d): a stroke's outer edge, a lifted card's margin
//   mixRing(a, b, k)                a band sliding from one highlight's ring to the next
//   node src/lib/outline.mjs --test   the self-test (synthetic captures: a pill, a card, a bordered card, a grouped row)
import {kitOn} from './kit.mjs';

/** capture px between the element and the outline's inner edge, at most / at least (a tight neighbour lowers it) */
export const OUTLINE_GAP = 16;
export const OUTLINE_GAP_MIN = 6;
/** capture px: the stroke the outline leaves room for (3 stage px on a phone at rest is about 5 capture px) */
export const OUTLINE_STROKE = 5;
/** the corner radius (capture px) of an element the pixels cannot show: iOS's grouped cards are about this */
export const R_DEFAULT = 28;
/** flat colour noise of a JPEG capture (the largest channel difference still "the same colour"): iOS's grouped cards differ
 *  from their sheet by 7 levels (236 on 243), the noise of a flat area is 1 or 2 */
const TOL = 3;

export const outlineOn = (film) => kitOn(film);

/** a highlight in capture fractions (x 0.03, w 0.94 by default: Phone's) as a box in capture px */
export const boxOf = (hl, W = 1080, H = 2346) => {
  const x = hl.x ?? 0.03;
  return {x0: x * W, y0: hl.y * H, x1: (x + (hl.w ?? 0.94)) * W, y1: (hl.y + hl.h) * H};
};

const clampI = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/** The element under `box` (capture px): its exact box, its corner radius (the median of its four corners; a capsule is
 *  `pill` with r = half its height), the free space round it (px to the nearest other thing, at most the search margin) and
 *  how it was found ("fill": a solid shape; "frame": with a frame drawn round it, whose outer edge it takes; "dashed": a
 *  dashed frame). The element is the zone's commonest colour grown out from the zone (text in it is a hole: the outer edge
 *  stays whole; a slow gradient is followed, a step of a few levels is not), so a card 7 levels off its sheet is found as
 *  surely as a black pill. null: no shape (that colour runs past the search window, as a row of a grouped list does, or the
 *  shape is far from the spec's box). Pure: the render (useOutline) and the self-test call it. */
export const shapeOf = (img, box) => {
  const {data, width: W, height: H} = img;
  const rw = box.x1 - box.x0;
  const rh = box.y1 - box.y0;
  if (!(rw >= 8 && rh >= 8)) return null;
  const m = clampI(0.5 * rh, 32, 90);
  const X0 = clampI(box.x0 - m, 0, W);
  const X1 = clampI(box.x1 + m, 0, W);
  const Y0 = clampI(box.y0 - m, 0, H);
  const Y1 = clampI(box.y1 + m, 0, H);
  const ww = X1 - X0;
  const wh = Y1 - Y0;
  if (ww < 4 || wh < 4) return null;
  const at = (x, y) => (y * W + x) * 4;
  const dist = (i, c) => Math.max(Math.abs(data[i] - c[0]), Math.abs(data[i + 1] - c[1]), Math.abs(data[i + 2] - c[2]));
  const dpx = (i, j) => Math.max(Math.abs(data[i] - data[j]), Math.abs(data[i + 1] - data[j + 1]), Math.abs(data[i + 2] - data[j + 2]));
  // the inner zone of the box (clear of a loose box's edges): what the element is made of
  const zone = [];
  const zx0 = Math.round(box.x0 + 0.1 * rw);
  const zx1 = Math.round(box.x1 - 0.1 * rw);
  const zy0 = Math.round(box.y0 + 0.25 * rh);
  const zy1 = Math.round(box.y1 - 0.25 * rh);
  for (let y = Math.max(0, zy0); y < Math.min(H, zy1); y += 2) for (let x = Math.max(0, zx0); x < Math.min(W, zx1); x += 2) zone.push((y - Y0) * ww + (x - X0));
  if (!zone.length) return null;
  const gi = (k) => at((k % ww) + X0, ((k / ww) | 0) + Y0); // window index -> data index
  // the commonest colours of a set of window pixels (8-level bins, the members' mean), most first, with their shares
  const modesOf = (ks) => {
    const bins = new Map();
    for (const k of ks) {
      const i = gi(k);
      const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      const b = bins.get(key) ?? {n: 0, r: 0, g: 0, b: 0};
      b.n++;
      b.r += data[i];
      b.g += data[i + 1];
      b.b += data[i + 2];
      bins.set(key, b);
    }
    return [...bins.values()].sort((a, b) => b.n - a.n).map((b) => ({c: [b.r / b.n, b.g / b.n, b.b / b.n], share: b.n / Math.max(1, ks.length)}));
  };
  // the element's own colour, tried in turn: the zone's commonest (a pill's fill, a card's, the page's inside a drawn frame),
  // its next ones (a switch: its knob and its track), then the commonest just inside the box's edges (a card whose middle is
  // a big white button: the OBD hub's)
  const ring = [];
  for (let d = 6; d <= 14; d += 4) {
    for (let x = Math.round(box.x0 + d); x < box.x1 - d; x += 2) for (const y of [Math.round(box.y0 + d), Math.round(box.y1 - d)]) if (x >= X0 && x < X1 && y >= Y0 && y < Y1) ring.push((y - Y0) * ww + (x - X0));
    for (let y = Math.round(box.y0 + d); y < box.y1 - d; y += 2) for (const x of [Math.round(box.x0 + d), Math.round(box.x1 - d)]) if (x >= X0 && x < X1 && y >= Y0 && y < Y1) ring.push((y - Y0) * ww + (x - X0));
  }
  const cands = [];
  const zm = modesOf(zone);
  for (const f of [zm[0].c, ...zm.slice(1, 3).filter((m) => m.share >= 0.12).map((m) => m.c), ...(ring.length ? [modesOf(ring)[0].c] : [])])
    if (cands.every((g) => Math.max(...g.map((v, i) => Math.abs(v - f[i]))) > TOL)) cands.push(f);
  let F = cands[0];
  // grow the element from the zone's pixels: a pixel joins when it is F (or, `slope`, a step of at most 2 levels from its
  // neighbour in the element while still within 40 of F: a gradient card); `pass` (a mask) narrows where it may go
  const lab = new Int32Array(ww * wh);
  const q = new Int32Array(ww * wh);
  // a dark colour takes a looser match (a black switch's 4 px rim round its knob is all edge; JPEG noise grows with contrast)
  let tolF = TOL;
  const near = (k) => dist(gi(k), F) <= tolF;
  const grow = (pass, slope) => {
    lab.fill(0);
    const comps = [];
    const joins = (k, from) => pass(k) && (near(k) || (slope && dpx(gi(k), gi(from)) <= 2 && dist(gi(k), F) <= 40));
    for (const s of zone) {
      if (lab[s] || !pass(s) || !near(s)) continue;
      const id = comps.length + 1;
      const c = {id, seeds: 0, x0: ww, y0: wh, x1: -1, y1: -1, rim: false};
      comps.push(c);
      let h = 0;
      let t = 0;
      q[t++] = s;
      lab[s] = id;
      while (h < t) {
        const k = q[h++];
        const kx = k % ww;
        const ky = (k / ww) | 0;
        if (kx < c.x0) c.x0 = kx;
        if (kx > c.x1) c.x1 = kx;
        if (ky < c.y0) c.y0 = ky;
        if (ky > c.y1) c.y1 = ky;
        if (kx === 0 || kx === ww - 1 || ky === 0 || ky === wh - 1) c.rim = true;
        if (kx > 0 && !lab[k - 1] && joins(k - 1, k)) (lab[k - 1] = id), (q[t++] = k - 1);
        if (kx < ww - 1 && !lab[k + 1] && joins(k + 1, k)) (lab[k + 1] = id), (q[t++] = k + 1);
        if (ky > 0 && !lab[k - ww] && joins(k - ww, k)) (lab[k - ww] = id), (q[t++] = k - ww);
        if (ky < wh - 1 && !lab[k + ww] && joins(k + ww, k)) (lab[k + ww] = id), (q[t++] = k + ww);
      }
    }
    if (!comps.length) return null;
    for (const s of zone) if (lab[s]) comps[lab[s] - 1].seeds++;
    return comps.reduce((a, b) => (b.seeds > a.seeds ? b : a));
  };
  // a colour that runs past the window is the page or a bigger card, not this element (a row of a grouped list); one far
  // smaller or bigger than the spec's box is not the element it meant (a glyph, the card a row sits in)
  const fits = (c, d) => {
    if (!c || c.rim) return false;
    const w = c.x1 - c.x0 + 1 + 2 * d;
    const h = c.y1 - c.y0 + 1 + 2 * d;
    return w * h >= 0.3 * rw * rh && h <= 1.8 * rh + 24 && w <= 1.5 * rw + 24;
  };
  // and it must cover the zone it was grown from (a fragment of a gradient card does not)
  const covers = (c, d) =>
    fits(c, d) && c.x0 - d <= zx0 - X0 + 2 && c.x1 + d >= Math.min(ww, zx1 - X0) - 3 && c.y0 - d <= zy0 - Y0 + 2 && c.y1 + d >= Math.min(wh, zy1 - Y0) - 3;
  const dt = new Float32Array(ww * wh);
  const find = () => {
    // 1. the element's colour itself (a flat fill: the pills, the cards, a bordered card's inside)
    let c = grow(() => true, false);
    if (covers(c, 0)) return {c, rho: 0, how: 'fill'};
    // 2. a dashed frame round the page's colour leaks through its gaps: grow again only where every pixel within RHO is the
    // element's colour (the gaps, about 10 px, close), then put the RHO back
    const RHO = 7;
    for (let k = 0; k < ww * wh; k++) dt[k] = near(k) ? 1e6 : 0;
    for (let y = 0; y < wh; y++)
      for (let x = 0; x < ww; x++) {
        const k = y * ww + x;
        if (x > 0) dt[k] = Math.min(dt[k], dt[k - 1] + 1);
        if (y > 0) dt[k] = Math.min(dt[k], dt[k - ww] + 1);
      }
    for (let y = wh - 1; y >= 0; y--)
      for (let x = ww - 1; x >= 0; x--) {
        const k = y * ww + x;
        if (x < ww - 1) dt[k] = Math.min(dt[k], dt[k + 1] + 1);
        if (y < wh - 1) dt[k] = Math.min(dt[k], dt[k + ww] + 1);
      }
    c = grow((k) => dt[k] > RHO, false);
    if (covers(c, RHO)) return {c, rho: RHO, how: 'dashed'};
    // 3. a gradient card (the OBD hub's dark card): steps of at most 2 levels from pixel to pixel, within 40 of F
    c = grow(() => true, true);
    return covers(c, 0) ? {c, rho: 0, how: 'gradient'} : null;
  };
  let found = null;
  for (const f of cands) {
    F = f;
    tolF = TOL + 0.06 * (255 - Math.max(...f));
    found = find();
    if (found) break;
  }
  if (!found) return null;
  const {c, rho} = found;
  let how = found.how;
  const mine = (x, y) => x >= 0 && x < ww && y >= 0 && y < wh && lab[y * ww + x] === c.id;
  // window coordinates from here on
  let x0 = c.x0;
  let y0 = c.y0;
  let x1 = c.x1 + 1;
  let y1 = c.y1 + 1;
  // the corner radius: each corner's inset row by row against a circle's, the best fit; the median of the four
  const D = Math.floor(Math.min(x1 - x0, y1 - y0) / 2);
  const fit = (inset) => {
    let best = 0;
    let bestE = Infinity;
    for (let r = 0; r <= D; r += 0.5) {
      let e = 0;
      for (let d = 0; d < D; d++) {
        const yc = d + 0.5;
        const want = yc < r ? r - Math.sqrt(r * r - (r - yc) * (r - yc)) : 0;
        e += (inset[d] - want) ** 2;
      }
      if (e < bestE - 1e-9) (bestE = e), (best = r);
    }
    return best;
  };
  const corner = (sx, sy) => {
    const inset = [];
    for (let d = 0; d < D; d++) {
      const y = sy > 0 ? y0 + d : y1 - 1 - d;
      let k = 0;
      while (k <= D && !mine(sx > 0 ? x0 + k : x1 - 1 - k, y)) k++;
      inset.push(k);
    }
    return fit(inset);
  };
  const rs = [corner(1, 1), corner(-1, 1), corner(1, -1), corner(-1, -1)].sort((a, b) => a - b);
  let r = (rs[1] + rs[2]) / 2;
  if (rho) {
    // the core sat RHO inside the frame's gaps: put it back
    x0 -= rho;
    y0 -= rho;
    x1 += rho;
    y1 += rho;
    r += rho;
  }
  // a frame drawn round it (a bordered card, an outlined button, the dashes): the element's outer edge is the frame's. At
  // points along each side, the run of pixels outward that are not yet the colour 15 px out; a frame is a thin run on all four
  // sides (a segment inside a control's track is not: one side runs on in it). A solid frame shows at every point (the
  // median of three), a dashed one only where a dash is (the longest of nine).
  const sideT = [];
  for (const [dx, dy] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
    const ts = [];
    const fs = rho ? [0.2, 0.27, 0.34, 0.41, 0.48, 0.55, 0.62, 0.69, 0.76] : [0.3, 0.5, 0.7];
    for (const f of fs) {
      const x = dx < 0 ? x0 - 1 : dx > 0 ? x1 : Math.round(x0 + f * (x1 - x0));
      const y = dy < 0 ? y0 - 1 : dy > 0 ? y1 : Math.round(y0 + f * (y1 - y0));
      const p = (k) => {
        const px = x + dx * k + X0;
        const py = y + dy * k + Y0;
        return px < 0 || py < 0 || px >= W || py >= H ? -1 : at(px, py);
      };
      const o = p(15);
      if (o < 0) continue;
      const O = [data[o], data[o + 1], data[o + 2]];
      let k = 0;
      while (k < 15 && p(k) >= 0 && dist(p(k), O) > TOL) k++;
      ts.push(k);
    }
    ts.sort((a, b) => a - b);
    sideT.push(!ts.length ? 0 : rho ? ts[ts.length - 1] : ts[Math.floor(ts.length / 2)]);
  }
  const tMin = Math.min(...sideT);
  const tMax = Math.max(...sideT);
  const t = tMin >= 1 && tMax - tMin <= 2 && tMax <= 10 ? Math.round(sideT.reduce((a, b) => a + b, 0) / 4) : 0;
  if (t >= 2 && !rho) how = 'frame';
  x0 -= t;
  y0 -= t;
  x1 += t;
  y1 += t;
  r += t;
  const half = Math.min(x1 - x0, y1 - y0) / 2;
  const pill = r >= 0.86 * half;
  if (pill) r = half;
  // the free space round it: from each side's edge out to the next change of colour (the nearest neighbour or text), from
  // 6 px out (a JPEG rings 2 or 3 px round a hard edge)
  let free = m;
  for (const f of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const mx = Math.round(x0 + f * (x1 - x0)) + X0;
    const my = Math.round(y0 + f * (y1 - y0)) + Y0;
    for (const [x, y, dx, dy] of [
      [mx, y0 - 1 + Y0, 0, -1],
      [mx, y1 + Y0, 0, 1],
      [x0 - 1 + X0, my, -1, 0],
      [x1 + X0, my, 1, 0],
    ]) {
      const bx = x + 6 * dx;
      const by = y + 6 * dy;
      if (bx < 0 || by < 0 || bx >= W || by >= H) {
        free = Math.min(free, Math.max(0, dx ? (dx > 0 ? W - x : x + 1) : dy > 0 ? H - y : y + 1));
        continue;
      }
      const c0 = [data[at(bx, by)], data[at(bx, by) + 1], data[at(bx, by) + 2]];
      let k = 6;
      while (k < m) {
        const px = x + dx * k;
        const py = y + dy * k;
        if (px < 0 || py < 0 || px >= W || py >= H || dist(at(px, py), c0) > TOL) break;
        k++;
      }
      free = Math.min(free, k);
    }
  }
  return {x0: x0 + X0, y0: y0 + Y0, x1: x1 + X0, y1: y1 + Y0, r, pill, free, how};
};

/** The card a shapeless row sits in (a row of a grouped list, a line of text in a card): the columns, left and right of the
 *  box's middle, where the row's own colour holds on at least a quarter of its rows; null when that colour runs on past the
 *  search window (the row is the page's) or the span is far narrower than the box. Capture px {x0, x1}. */
export const laneOf = (img, box) => {
  const {data, width: W, height: H} = img;
  const y0 = Math.max(0, Math.round(box.y0));
  const y1 = Math.min(H, Math.round(box.y1));
  if (y1 - y0 < 6) return null;
  const at = (x, y) => (y * W + x) * 4;
  // the row's colour: the commonest of its middle third
  const bins = new Map();
  const mx0 = Math.round(box.x0 + (box.x1 - box.x0) / 3);
  const mx1 = Math.round(box.x1 - (box.x1 - box.x0) / 3);
  for (let y = y0; y < y1; y += 2)
    for (let x = Math.max(0, mx0); x < Math.min(W, mx1); x += 3) {
      const i = at(x, y);
      const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      const b = bins.get(k) ?? {n: 0, r: 0, g: 0, b: 0};
      b.n++;
      b.r += data[i];
      b.g += data[i + 1];
      b.b += data[i + 2];
      bins.set(k, b);
    }
  if (!bins.size) return null;
  const t = [...bins.values()].reduce((a, b) => (b.n > a.n ? b : a));
  const F = [t.r / t.n, t.g / t.n, t.b / t.n];
  const frac = (x) => {
    let n = 0;
    let k = 0;
    for (let y = y0; y < y1; y += 2, n++) {
      const i = at(x, y);
      if (Math.max(Math.abs(data[i] - F[0]), Math.abs(data[i + 1] - F[1]), Math.abs(data[i + 2] - F[2])) <= TOL) k++;
    }
    return k / Math.max(1, n);
  };
  const c = Math.round((box.x0 + box.x1) / 2);
  let l = c;
  while (l > 0 && frac(l - 1) >= 0.25) l--;
  let r = c;
  while (r < W - 1 && frac(r + 1) >= 0.25) r++;
  if (l <= 0 || r >= W - 1 || r - l < 0.5 * (box.x1 - box.x0)) return null;
  return {x0: l, x1: r + 1};
};

/** The outline's inner edge (capture px) for a spec highlight: the element's box out by an even gap, its radius plus that
 *  gap. `img` null (the pixels not in yet, or a scene that does not measure) or no shape: the spec's box as the inner edge.
 *  o.gap: the most gap (OUTLINE_GAP); o.stroke: the room an outer stroke needs inside the screen (OUTLINE_STROKE). */
export const ringOf = (hl, img, W = 1080, H = 2346, o = {}) => {
  const box = boxOf(hl, W, H);
  const most = typeof hl.gap === 'number' ? hl.gap : o.gap ?? OUTLINE_GAP;
  const stroke = o.stroke ?? OUTLINE_STROKE;
  const shape = img && hl.snap !== false ? shapeOf(img, box) : null;
  const specR = (b) => (hl.r === 'pill' ? Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2 : typeof hl.r === 'number' ? hl.r : null);
  // the element: the measured one, or the spec's box when the spec vouches for it (an `r` or snap: false)
  const el = shape ?? (specR(box) !== null || hl.snap === false ? box : null);
  if (!el) {
    // no shape of its own: the spec's box is the outline's inner edge, its corners R_DEFAULT (a nested card's radius); a box
    // wider than the card it sits in comes in to an even inset inside that card, so the outline never crosses the card's edge
    const lane = img && hl.snap !== false ? laneOf(img, box) : null;
    const inset = OUTLINE_GAP + stroke;
    const b = lane ? {...box, x0: Math.max(box.x0, lane.x0 + inset), x1: Math.min(box.x1, lane.x1 - inset)} : box;
    const r = Math.min(R_DEFAULT, (b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2);
    return {...b, r, gap: 0, shape: null};
  }
  const r = Math.min(specR(el) ?? (shape ? shape.r : R_DEFAULT), (el.x1 - el.x0) / 2, (el.y1 - el.y0) / 2);
  let gap = shape ? Math.max(OUTLINE_GAP_MIN, Math.min(most, shape.free - stroke - 3)) : most;
  // the stroke stays on the screen: a gap that would run it past an edge shrinks (evenly, all round)
  const room = Math.min(el.x0, W - el.x1, el.y0, H - el.y1) - stroke - 1;
  gap = Math.max(1, Math.min(gap, room));
  return {x0: el.x0 - gap, y0: el.y0 - gap, x1: el.x1 + gap, y1: el.y1 + gap, r: r + gap, gap, shape};
};

/** the ring moved out by d px, its radius with it (concentric) */
export const growRing = (g, d) => ({...g, x0: g.x0 - d, y0: g.y0 - d, x1: g.x1 + d, y1: g.y1 + d, r: Math.max(0, g.r + d)});

/** two rings, k of the way from a to b (a band sliding from one highlight to the next) */
export const mixRing = (a, b, k) => {
  const l = (u, v) => u + (v - u) * k;
  return {...b, x0: l(a.x0, b.x0), y0: l(a.y0, b.y0), x1: l(a.x1, b.x1), y1: l(a.y1, b.y1), r: l(a.r, b.r), gap: l(a.gap, b.gap)};
};

// ---- the self-test ----------------------------------------------------------------------------------------------------------
/** a synthetic capture: a page colour and rounded rects {x0, y0, x1, y1, r, fill, border?, borderW?}, antialiased by 4x4 */
const paint = (W, H, page, shapes) => {
  const data = new Uint8ClampedArray(W * H * 4);
  const inside = (s, x, y, inset = 0) => {
    const r = Math.max(0, s.r - inset);
    const ax = Math.max(s.x0 + inset + r - x, 0, x - (s.x1 - inset - r));
    const ay = Math.max(s.y0 + inset + r - y, 0, y - (s.y1 - inset - r));
    if (x < s.x0 + inset || x > s.x1 - inset || y < s.y0 + inset || y > s.y1 - inset) return false;
    return ax * ax + ay * ay <= r * r;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const px = x + (sx + 0.5) / 4;
          const py = y + (sy + 0.5) / 4;
          let c = page;
          for (const s of shapes) {
            if (!inside(s, px, py)) continue;
            c = s.border && !inside(s, px, py, s.borderW ?? 3) ? s.border : s.fill;
          }
          acc = acc.map((v, i) => v + c[i] / 16);
        }
      const i = (y * W + x) * 4;
      data[i] = acc[0];
      data[i + 1] = acc[1];
      data[i + 2] = acc[2];
      data[i + 3] = 255;
    }
  return {data, width: W, height: H};
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const W = 400;
  const H = 520;
  const WHITE = [255, 255, 255];
  const GREY = [242, 242, 247];
  const INK = [11, 11, 11];
  // a black pill on white with white "text" in it; a white card (r 24) on grey; a bordered card (r 30, 3 px) on white
  const pill = {x0: 40, y0: 60, x1: 360, y1: 124, r: 32, fill: INK};
  const text = {x0: 150, y0: 84, x1: 250, y1: 100, r: 0, fill: WHITE};
  const img1 = paint(W, H, WHITE, [pill, text, {x0: 40, y0: 260, x1: 360, y1: 360, r: 24, fill: GREY}, {x0: 90, y0: 300, x1: 300, y1: 316, r: 0, fill: INK}]);
  const sp = shapeOf(img1, {x0: 12, y0: 60, x1: 388, y1: 124});
  ok(sp && sp.pill && Math.abs(sp.x0 - 40) <= 1 && Math.abs(sp.x1 - 360) <= 1 && Math.abs(sp.r - 32) <= 1, `a pill from a loose box: snapped and round (${JSON.stringify(sp)})`);
  const sc = shapeOf(img1, {x0: 40, y0: 262, x1: 360, y1: 358});
  ok(sc && !sc.pill && Math.abs(sc.r - 24) <= 2.5 && Math.abs(sc.y0 - 260) <= 1, `a grey card: its 24 px corners (${JSON.stringify(sc)})`);
  const img2 = paint(W, H, WHITE, [{x0: 30, y0: 100, x1: 370, y1: 220, r: 30, fill: WHITE, border: INK, borderW: 3}, {x0: 70, y0: 150, x1: 260, y1: 168, r: 0, fill: INK}]);
  const sb = shapeOf(img2, {x0: 30, y0: 100, x1: 370, y1: 220});
  ok(sb && sb.how === 'frame' && Math.abs(sb.x0 - 30) <= 1 && Math.abs(sb.r - 30) <= 2.5, `a bordered card: its outer edge and radius (${JSON.stringify(sb)})`);
  // a row of a grouped list: a white card of rows on grey, the row itself has no shape
  const img3 = paint(W, H, GREY, [{x0: 20, y0: 40, x1: 380, y1: 500, r: 26, fill: WHITE}, {x0: 60, y0: 200, x1: 220, y1: 216, r: 0, fill: INK}, {x0: 60, y0: 250, x1: 380, y1: 251, r: 0, fill: [220, 220, 224]}]);
  ok(shapeOf(img3, {x0: 20, y0: 180, x1: 380, y1: 240}) === null, 'a row inside a card: no shape of its own');
  const g = ringOf({x: 12 / W, y: 60 / H, w: 376 / W, h: 64 / H}, img1, W, H);
  ok(g.shape && Math.abs(g.r - (g.shape.r + g.gap)) < 1e-9 && Math.abs(g.x0 - (g.shape.x0 - g.gap)) < 1e-9 && Math.abs(g.y1 - (g.shape.y1 + g.gap)) < 1e-9, `the ring is concentric: radius = the element's + the gap (${g.r} = ${g.shape?.r} + ${g.gap})`);
  ok(g.gap >= OUTLINE_GAP_MIN && g.gap <= OUTLINE_GAP, 'the gap stays between its least and most');
  const nr = ringOf({x: 20 / W, y: 180 / H, w: 360 / W, h: 60 / H}, img3, W, H);
  ok(nr.shape === null && nr.gap === 0 && nr.r === R_DEFAULT && Math.abs(nr.y0 - 180) < 1e-6, 'no shape: the spec box with the default corners');
  const wide = ringOf({x: 6 / W, y: 180 / H, w: 388 / W, h: 60 / H}, img3, W, H);
  ok(wide.shape === null && Math.abs(wide.x0 - (20 + OUTLINE_GAP + OUTLINE_STROKE)) <= 1 && Math.abs(wide.x1 - (380 - OUTLINE_GAP - OUTLINE_STROKE)) <= 1, `a row box wider than its card comes inside the card (${wide.x0}..${wide.x1})`);
  const pr = ringOf({x: 60 / W, y: 180 / H, w: 280 / W, h: 60 / H, r: 'pill'}, img3, W, H);
  ok(pr.r === 30 + pr.gap && pr.gap === OUTLINE_GAP, 'the spec says "pill": half the height, plus the gap');
  const sr = ringOf({x: 40 / W, y: 60 / H, w: 320 / W, h: 64 / H, snap: false, r: 10}, img1, W, H);
  ok(sr.shape === null && sr.r === 10 + OUTLINE_GAP && Math.abs(sr.x0 - (40 - OUTLINE_GAP)) < 1e-6, 'snap false: the spec box and radius, the gap round it');
  ok(Math.abs(growRing(g, 5).r - g.r - 5) < 1e-9 && Math.abs(growRing(g, 5).x0 - g.x0 + 5) < 1e-9, 'growRing keeps it concentric');
  ok(!outlineOn('v109-wake-up') && outlineOn('v110-a') && outlineOn('demo-outline-v110') && !outlineOn('demo-gallery'), 'films up to v109 render as made');
  console.log(bad ? `outline: ${bad} failed` : 'outline: all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && process.argv?.[2] === '--test' && /outline\.mjs$/.test(process.argv[1] ?? '')) process.exit(selfTest());
