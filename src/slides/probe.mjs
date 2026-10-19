// The capture probe: what the Story slides' teaching graphics need to know about the REAL screen under them, read from the
// capture's own pixels (public/screens/<name>.jpg, 1080 x 2346). Pure JS on an RGB(A) buffer: the render feeds it a canvas
// (src/slides/Slides.tsx), the lint and the check the same pixels through PIL (tools/ci/slides.mjs probesFor), so all three
// lay a slide out alike.
//
// The owner, 2026-10-19, on the rounded box drawn round the black pill „ჩამოტვირთვა · ~97 MB": "its corners do not follow
// the button: a box with small round corners round a fully round pill is ugly, it does not sit well". So every outline, band
// and loupe frame is CONCENTRIC with its element: the element's own box and corner radius are measured here (`shape`), the
// outline runs an even gap outside it with radius = the element's radius + the gap (a pill gets a pill, a card with 36 px
// corners 36 + the gap). And a callout's dot never sits on a word or a digit (`clean`), a leader or a loupe's line is laid
// where it crosses the fewest words (`busy`).
//
//   makeProbe({data, width, height, channels})   -> {w, h, shape(region), clean(x, y, rad), busy(a, b), spot(...)}
//     shape({x0, y0, x1, y1})  (capture fractions, the spec's row) -> {x0, y0, x1, y1 (capture px, the element's edges, a
//       side the element does not close kept at the row's edge), r (its corner radius, capture px, null when no corner could
//       be measured), pill (a capsule: r = half its short side), found (a shape was seen), closed (on all four sides),
//       fill (its colour), ground (the colour round it)}
//     clean(x, y, rad)   (capture px) -> true when nothing but one flat colour lies within rad of (x, y): no word, no digit,
//       no icon, no edge
//     busy(a, b)   (capture px points) -> the share (0..1) of the segment a..b that runs over words, digits or icons
//     spot(x, y, rad, dirs)   -> the nearest clean point to (x, y) along the directions dirs ([[dx, dy], ...]), or null
export const CAPTURE = Object.freeze({w: 1080, h: 2346});
/** a colour step this big (max over r, g, b) is a word, a digit, an icon's line or an edge; JPEG noise and a soft gradient
 *  stay well under it */
const INK_STEP = 44;
/** two flat fills this far apart (max over r, g, b) are two shapes: the iOS grey (242, 242, 247) under a white card is 13 */
const FILL_STEP = 9;
const CORNER = 1 - Math.SQRT1_2; // a corner of radius r meets its 45 deg diagonal r * CORNER in from both sides

const median = (arr) => {
  if (!arr.length) return 0;
  const a = Float64Array.from(arr).sort();
  return a[a.length >> 1];
};
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

export const makeProbe = (img) => {
  const {data, width: W, height: H} = img;
  const ch = img.channels ?? 4;
  const at = (x, y) => {
    const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(H - 1, Math.round(y)));
    const i = (yi * W + xi) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const medianOf = (pts) => {
    const r = [];
    const g = [];
    const b = [];
    for (const [x, y] of pts) {
      const p = at(x, y);
      r.push(p[0]);
      g.push(p[1]);
      b.push(p[2]);
    }
    return [median(r), median(g), median(b)];
  };

  /** the pixels within rad of (x, y), every `step` px */
  const disc = (x, y, rad, step = 2) => {
    const out = [];
    for (let dy = -rad; dy <= rad; dy += step) for (let dx = -rad; dx <= rad; dx += step) if (dx * dx + dy * dy <= rad * rad) out.push([x + dx, y + dy]);
    return out;
  };
  const clean = (x, y, rad) => {
    if (x - rad < 0 || y - rad < 0 || x + rad >= W || y + rad >= H) return false;
    const pts = disc(x, y, rad, 2);
    const m = medianOf(pts);
    return pts.every(([px, py]) => dist(at(px, py), m) < INK_STEP);
  };
  /** a point on a word: within 3 px something steps away from its neighbourhood's colour */
  const inked = (x, y) => {
    const c = at(x, y);
    for (const [dx, dy] of [
      [4, 0],
      [-4, 0],
      [0, 4],
      [0, -4],
    ])
      if (dist(c, at(x + dx, y + dy)) >= INK_STEP) return true;
    return false;
  };
  const busy = (a, b) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.floor(len / 3));
    let hit = 0;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (inked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) hit++;
    }
    return hit / (n + 1);
  };
  const spot = (x, y, rad, dirs = [[-1, 0]], reach = 160) => {
    if (clean(x, y, rad)) return {x, y};
    for (let d = 4; d <= reach; d += 4) for (const [dx, dy] of dirs) if (clean(x + dx * d, y + dy * d, rad)) return {x: x + dx * d, y: y + dy * d};
    return null;
  };

  /** An element drawn as a line round the ground's own colour (a dashed box, a framed card): its border, found from outside
   *  on several scan lines (a dash's gap misses one, a word inside never reaches the edge) */
  const outlined = (R, m) => {
    const rw = R.x1 - R.x0;
    const rh = R.y1 - R.y0;
    const STEP = 30;
    const hit1 = (x0, y0, dx, dy, n) => {
      const g = at(x0, y0);
      for (let k = 1; k <= n; k++) if (dist(at(x0 + dx * k, y0 + dy * k), g) >= STEP) return k;
      return null;
    };
    /** every line a scan line enters (its first px), on it and on its neighbours 4 px aside (a dash's gap) */
    const hits = (x0, y0, dx, dy, n) => {
      const out = [];
      for (const o of [-4, 0, 4]) {
        const sx = x0 + (dx ? 0 : o);
        const sy = y0 + (dy ? 0 : o);
        const g = at(sx, sy);
        let inLine = false;
        for (let k = 1; k <= n; k++) {
          const on = dist(at(sx + dx * k, sy + dy * k), g) >= STEP;
          if (on && !inLine) out.push(k);
          inLine = on;
        }
      }
      return out;
    };
    /** a side's edge: of the lines several scan lines agree on (within 4 px: a border, not a word), the one nearest the
     *  row's edge (m px in from where the scans start: another box's border may lie in the margin too) */
    const side = (lists) => {
      const got = lists.flatMap((l, i) => [...new Set(l)].map((k) => [k, i])).sort((a, b) => a[0] - b[0]);
      let best = null;
      for (let i = 0; i < got.length; i++) {
        let j = i;
        while (j + 1 < got.length && got[j + 1][0] - got[i][0] <= 4) j++;
        const lines = new Set(got.slice(i, j + 1).map((g) => g[1])).size;
        if (lines >= Math.max(2, Math.ceil(lists.length * 0.3)) && (best === null || Math.abs(got[i][0] - m) < Math.abs(best - m))) best = got[i][0];
      }
      return best;
    };
    const reachX = Math.round(m + 0.3 * rw);
    const reachY = Math.round(m + 0.3 * rh);
    const ys = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((f) => R.y0 + f * rh);
    const xs = Array.from({length: 13}, (_, k) => R.x0 + (0.1 + (0.8 * k) / 12) * rw);
    const l = side(ys.map((y) => hits(R.x0 - m, y, 1, 0, reachX)));
    const r = side(ys.map((y) => hits(R.x1 + m, y, -1, 0, reachX)));
    const t = side(xs.map((x) => hits(x, R.y0 - m, 0, 1, reachY)));
    const b = side(xs.map((x) => hits(x, R.y1 + m, 0, -1, reachY)));
    if ([l, r, t, b].some((v) => v === null)) return null;
    const E = {x0: R.x0 - m + l, x1: R.x1 + m - r + 1, y0: R.y0 - m + t, y1: R.y1 + m - b + 1};
    const tolX = 0.25 * rw + 12;
    const tolY = 0.25 * rh + 12;
    if (Math.abs(E.x0 - R.x0) > tolX || Math.abs(E.x1 - R.x1) > tolX || Math.abs(E.y0 - R.y0) > tolY || Math.abs(E.y1 - R.y1) > tolY) return null;
    const short = Math.min(E.x1 - E.x0, E.y1 - E.y0);
    const rs = [];
    for (const [cx, cy, sx, sy] of [
      [E.x0, E.y0, 1, 1],
      [E.x1 - 1, E.y0, -1, 1],
      [E.x0, E.y1 - 1, 1, -1],
      [E.x1 - 1, E.y1 - 1, -1, -1],
    ]) {
      const k = hit1(cx - sx, cy - sy, sx, sy, Math.round(short / 2));
      if (k !== null) rs.push((k - 0.5) / CORNER);
    }
    if (rs.length < 2) return null;
    let rr = Math.min(median(rs), short / 2);
    const pill = rr >= 0.4 * short;
    if (pill) rr = short / 2;
    return {...E, r: Math.round(rr * 10) / 10, pill, found: true, closed: true, outlined: true, ground: at(R.x0 - m, R.y0 + rh / 2)};
  };

  /** The element under a spec row: its fill, its box, its corner radius. */
  const shape = (reg) => {
    const R = {x0: reg.x0 * W, y0: reg.y0 * H, x1: reg.x1 * W, y1: reg.y1 * H};
    const rw = R.x1 - R.x0;
    const rh = R.y1 - R.y0;
    const none = (why) => ({x0: R.x0, y0: R.y0, x1: R.x1, y1: R.y1, r: null, pill: false, found: false, why});
    if (!(rw > 4 && rh > 4)) return none('the row is empty');
    const m = Math.round(Math.max(18, Math.min(64, 0.35 * Math.min(rw, rh))));
    const wx0 = Math.max(0, Math.floor(R.x0 - m));
    const wy0 = Math.max(0, Math.floor(R.y0 - m));
    const wx1 = Math.min(W - 1, Math.ceil(R.x1 + m));
    const wy1 = Math.min(H - 1, Math.ceil(R.y1 + m));
    // the fill: the row's inside, inset from its edges (its words are a minority of it)
    const inset = 0.18 * Math.min(rw, rh);
    const inner = [];
    for (let y = R.y0 + inset; y <= R.y1 - inset; y += 3) for (let x = R.x0 + inset; x <= R.x1 - inset; x += 3) inner.push([x, y]);
    if (inner.length < 8) return none('the row is too small');
    const fill = medianOf(inner);
    // the ground round it: each side of the window's ring on its own (a row inside a card meets the card's white above and
    // below and the screen's grey left and right); the side most unlike the fill
    const ring = {
      top: Array.from({length: Math.max(2, (wx1 - wx0) >> 1)}, (_, k) => [wx0 + 2 * k, wy0 + 1]),
      bottom: Array.from({length: Math.max(2, (wx1 - wx0) >> 1)}, (_, k) => [wx0 + 2 * k, wy1 - 1]),
      left: Array.from({length: Math.max(2, (wy1 - wy0) >> 1)}, (_, k) => [wx0 + 1, wy0 + 2 * k]),
      right: Array.from({length: Math.max(2, (wy1 - wy0) >> 1)}, (_, k) => [wx1 - 1, wy0 + 2 * k]),
    };
    // the ground: the colour next to the element, the ring's side nearest the fill that is still another colour (three
    // colours meet often: a grey tile on a white card over a grey bar)
    const grounds = Object.values(ring)
      .map(medianOf)
      .filter((g) => dist(g, fill) >= FILL_STEP);
    if (!grounds.length) return outlined(R, m) ?? none('no shape of its own (the same colour round it)');
    const ground = grounds.reduce((a, b) => (dist(b, fill) < dist(a, fill) ? b : a));
    const near = dist(ground, fill) / 2;
    // a pixel of the fill: within half the step to the ground (its words and icons are holes)
    const isFill = (x, y) => dist(at(x, y), fill) < near;
    // the corner's edge: how far a pixel is from the ground towards the fill (0 the ground, 1 the fill)
    const dv = [fill[0] - ground[0], fill[1] - ground[1], fill[2] - ground[2]];
    const dd = dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2];
    const tOf = (x, y) => {
      const p = at(x, y);
      return ((p[0] - ground[0]) * dv[0] + (p[1] - ground[1]) * dv[1] + (p[2] - ground[2]) * dv[2]) / dd;
    };
    const ww = wx1 - wx0 + 1;
    const wh = wy1 - wy0 + 1;
    const mask = new Uint8Array(ww * wh);
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) mask[y * ww + x] = isFill(wx0 + x, wy0 + y) ? 1 : 0;
    // the element: the fill connected to the row's inside (its words and icons are holes in it, never its edge)
    const seen = new Uint8Array(ww * wh);
    const stack = [];
    for (const [x, y] of inner) {
      const i = (Math.round(y) - wy0) * ww + (Math.round(x) - wx0);
      if (i >= 0 && i < mask.length && mask[i] && !seen[i]) {
        seen[i] = 1;
        stack.push(i);
      }
    }
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    let count = 0;
    while (stack.length) {
      const i = stack.pop();
      const x = i % ww;
      const y = (i - x) / ww;
      count++;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) (seen[i - 1] = 1), stack.push(i - 1);
      if (x < ww - 1 && mask[i + 1] && !seen[i + 1]) (seen[i + 1] = 1), stack.push(i + 1);
      if (y > 0 && mask[i - ww] && !seen[i - ww]) (seen[i - ww] = 1), stack.push(i - ww);
      if (y < wh - 1 && mask[i + ww] && !seen[i + ww]) (seen[i + ww] = 1), stack.push(i + ww);
    }
    if (!count) return none('no fill inside the row');
    // the element's edges (px, the fill's outer border); a side that runs to the window's border is not the element's (the
    // fill goes on: a row inside a bigger card), and a side far from the row's edge is the author's choice (a tile and its
    // label under it): both keep the row's edge
    const E = {x0: wx0 + bx0, y0: wy0 + by0, x1: wx0 + bx1 + 1, y1: wy0 + by1 + 1};
    const tolX = 0.15 * rw + 10;
    const tolY = 0.15 * rh + 10;
    const shut = {
      x0: bx0 > 0 && Math.abs(E.x0 - R.x0) <= tolX,
      x1: bx1 < ww - 1 && Math.abs(E.x1 - R.x1) <= tolX,
      y0: by0 > 0 && Math.abs(E.y0 - R.y0) <= tolY,
      y1: by1 < wh - 1 && Math.abs(E.y1 - R.y1) <= tolY,
    };
    const box = {x0: shut.x0 ? E.x0 : R.x0, y0: shut.y0 ? E.y0 : R.y0, x1: shut.x1 ? E.x1 : R.x1, y1: shut.y1 ? E.y1 : R.y1};
    if (!Object.values(shut).some(Boolean)) return outlined(R, m) ?? {...none('the fill runs past the row on every side'), fill};
    // the corner radius: along each closed corner's 45 deg diagonal, where the fill begins (sub-pixel), r = that / CORNER
    const corners = [
      [shut.x0 && shut.y0, E.x0, E.y0, 1, 1],
      [shut.x1 && shut.y0, E.x1 - 1, E.y0, -1, 1],
      [shut.x0 && shut.y1, E.x0, E.y1 - 1, 1, -1],
      [shut.x1 && shut.y1, E.x1 - 1, E.y1 - 1, -1, -1],
    ];
    const short = Math.min(E.x1 - E.x0, E.y1 - E.y0);
    const rs = [];
    for (const [ok, cx, cy, sx, sy] of corners) {
      if (!ok) continue;
      let prev = tOf(cx, cy);
      let found = null;
      if (prev > 0.5) found = 0;
      for (let t = 1; found === null && t <= short / 2; t++) {
        const v = tOf(cx + sx * t, cy + sy * t);
        if (v > 0.5) found = t - 1 + (0.5 - prev) / Math.max(1e-6, v - prev);
        prev = v;
      }
      if (found !== null) rs.push(Math.max(0, found + 0.5) / CORNER);
    }
    let r = rs.length ? median(rs) : null;
    const closed = shut.x0 && shut.x1 && shut.y0 && shut.y1;
    const pill = r !== null && closed && r >= 0.4 * short;
    if (r !== null) r = Math.min(r, short / 2);
    if (pill) r = short / 2;
    return {...box, r: r === null ? null : Math.round(r * 10) / 10, pill, found: true, fill, ground, closed};
  };

  return {w: W, h: H, shape, clean, busy, spot, outlined};
};
