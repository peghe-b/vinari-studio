// The Instagram Story slides' layout, shared by the render (src/slides/Slides.tsx places every element from these boxes) and
// the tools (tools/ci/slides.mjs lints a set with it and its --test proves every layout stays inside the zone; tools/slides.mjs
// checks the rendered pixels too). Pure JS: no React, no DOM.
//
// The owner, 2026-10-19 (evening, on the tilted 3D phones): "I don't want this tilted, bent mockup. It must be BIG; some phones
// coming up from the bottom, big. The headline BIG, LEFT-aligned, like on the covers. More graphics: lines, teaching graphics."
// So a slide is a page of a premium product manual:
//   - the headline: the covers' type (src/Cover.tsx: the condensed Mtavruli at weight 600), huge, LEFT-aligned at x 72, one or
//     two short lines, right under Instagram's top bar; a small label over it (the kicker, or "ნაბიჯი 2 / 3" on a step);
//   - the iPhone FLAT and straight (no turn, no perspective, no shadow): a black body, a thin titanium rim, the real screen.
//     Two placements (PHONE_MODES):
//       "whole"  the whole phone, big, its foot on y 1572, right of centre when the slide has callouts (they take the left
//                column), else centred; the default of a step
//       "rise"   the phone RISING from the bottom edge, RISE.w of the frame wide (85 %), its top and the part of the screen that
//                matters inside the zone, its lower body running off the frame's bottom (only that goes below y 1580); the
//                default of the cover and the end
//   - the teaching graphics, black on white: the element that matters (`row`) in a thin black outline box, the tap on it
//     (`tap`), numbered callouts (`callouts`: 1 to 3 labels in the left column, each with a thin leader line and a dot on its
//     element; one label over a rising phone), and a loupe (`loupe`: the element enlarged beside the phone, or inside the
//     rising phone's screen, joined to its outline by two thin lines).
// The zone (Instagram's Story safe zone, 1080 x 1920): the profile row and the progress bars cover the top ~250 px, the reply
// bar the bottom ~340 px, the side margin is ~65 px: nothing that matters goes above y 250, below y 1580, left of x 65 or right
// of x 1015 (STORY.edge; the text keeps 72 px, STORY.side). Only a rising phone's lower body runs below 1580.
//
//   layoutSlide(slide, {measure, phoneD, steps})   -> {layout, mode, boxes, sizes, phone, screen, outline, tap, callouts,
//     loupe, vis, problems}. measure(text, size, weight, caps) is the text's width in px (the browser's in the render, an
//     estimate in Node; caps false: plain letters); phoneD caps a whole phone's display width; steps
//     is the set's number of steps (the "ნაბიჯი n / N" label). Every box is in frame px; `problems` says what does not fit
//     (the lint refuses such a slide before any render)
//   layoutSet(slides, {measure})   -> every slide's layout, the whole phones of the steps one size and place
//   FLAT, bodyOf(d), STORY, TYPE, SLIDE_LAYOUTS, PHONE_LAYOUTS, PHONE_MODES, WHOLE, RISE, CALLOUTS_MAX, splitLines, estimate,
//   modeOf(slide), toFrame(screen, u, v)
export const STORY = Object.freeze({w: 1080, h: 1920, top: 250, bottom: 1580, edge: 65, side: 72});
/** the composition "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT); its still is taken at i * SLOT + SETTLED */
export const SLOT = 300;
export const SETTLED = 240;
/** the flat iPhone, front-facing: the display d px wide, the bezel bez * d a side, the screen's corner r * d, the capture
 *  1080 x 2346 (sh = its height / width). The proportions are the 3D iPhone's (src/scenes/kit/phone3d.tsx BEZ, SCR_R, SRC_W,
 *  SRC_H; tools/ci/slides.mjs --test holds them in step) */
export const FLAT = Object.freeze({bez: 0.034, r: 0.1409, sh: 2346 / 1080});
/** the body's size at display width d */
export const bodyOf = (d) => ({w: d * (1 + 2 * FLAT.bez), h: d * (FLAT.sh + 2 * FLAT.bez)});
export const SLIDE_LAYOUTS = Object.freeze(['cover', 'step', 'end', 'picture', 'fact']);
/** the layouts that show the phone (a "screen" each). A picture and a fact have none: only a car-knowledge set (no app screen
 *  to show) takes them (tools/ci/slides.mjs PHONELESS) */
export const PHONE_LAYOUTS = Object.freeze(['cover', 'step', 'end']);
export const PHONE_MODES = Object.freeze(['whole', 'rise']);
/** the whole phone: its foot (the body's lowest point), its right edge with callouts, its height (the owner: BIG) */
export const WHOLE = Object.freeze({foot: 1572, right: 996, minH: 940, maxD: 490});
/** the rising phone: its body RISE.w of the frame wide, centred; the screen must show at least minVis of its height inside the
 *  zone (the part that matters: the row, the callouts' points and the loupe inside `vis`) */
export const RISE = Object.freeze({w: 0.85, minVis: 0.34, foot: 1572});
export const CALLOUTS_MAX = Object.freeze({whole: 3, rise: 1});
/** the type: sizes in px, the line height, the widest a line may run, the most lines; caps false: plain letters (FiraGO). The
 *  headlines are the covers' (src/Cover.tsx: weight 600, the condensed Mtavruli), the labels FiraGO */
export const TYPE = Object.freeze({
  kicker: {size: 34, weight: 600, lh: 1.2, caps: true},
  head: {max: 168, min: 100, weight: 600, lh: 1.02, w: 936, lines: 2, caps: true},
  title: {max: 120, min: 84, weight: 600, lh: 1.02, w: 936, lines: 2, caps: true},
  end: {max: 150, min: 90, weight: 600, lh: 1.03, w: 936, lines: 2, caps: true},
  ptitle: {max: 120, min: 70, weight: 600, lh: 1.04, w: 936, lines: 2, caps: true},
  body: {size: 38, weight: 500, lh: 1.28, w: 936, lines: 2, caps: false},
  big: {max: 300, min: 140, weight: 700, lh: 1, w: 936, caps: true},
  note: {size: 34, weight: 500, lh: 1.25, w: 936, lines: 1, caps: false},
  call: {size: 36, weight: 600, lh: 1.2, lines: 3, caps: false},
});
/** a callout's number disc and the gap to its words */
export const BADGE = Object.freeze({size: 50, gap: 16});
const TOP = STORY.top + 12; // the first line's top, just under Instagram's bars
const L = STORY.side;
const W = STORY.w - 2 * STORY.side;
const GAP = 34; // the text to the phone
const COL_GAP = 56; // the callouts' column to the phone
const LABEL_GAP = 30; // between two callouts in the column
const LOUPE = Object.freeze({max: 1.5, minGrow: 1.6, border: 4, pad: 0.02, gap: 56}); // capture px shown at most 1.5 times; at least 1.6 times its size on the phone

/** "line one | line two" -> ['line one', 'line two'] */
export const splitLines = (s) =>
  String(s ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

/** a rough width in Node (the render measures for real): FiraGO and the condensed Mtavruli run about 0.62 em a letter at
 *  bold weights; deliberately on the wide side, so a line the lint passes always fits in the render */
export const estimate = (text, size, weight = 700) => [...String(text)].length * size * (weight >= 600 ? 0.64 : 0.58);

/** the slide's phone placement: its own "phone", else the cover and the end rise, a step stands whole */
export const modeOf = (s) => (PHONE_MODES.includes(s?.phone) ? s.phone : s?.layout === 'step' ? 'whole' : 'rise');

/** a capture point (fractions) on the frame, for a screen box {x, y, w, h} */
export const toFrame = (scr, u, v) => ({x: scr.x + u * scr.w, y: scr.y + v * scr.h});

/** a paragraph's words, a number kept with its short unit („~97 MB", „5 წთ", „12 დღე": never broken over two lines) */
const wordsOf = (para) =>
  para.split(/\s+/).reduce((acc, w) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && /\d$/.test(last) && [...w].length <= 3) acc[acc.length - 1] = `${last} ${w}`;
    else acc.push(w);
    return acc;
  }, []);

/** words wrapped into lines of `w` px at `size` */
const wrap = (text, size, weight, w, measure, caps) => {
  const out = [];
  for (const para of splitLines(text)) {
    let cur = '';
    for (const word of wordsOf(para)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && measure(next, size, weight, caps) > w) {
        out.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) out.push(cur);
  }
  return out;
};

/** the largest size from max down to min at which every line fits `w` (and, with `hMax`, the lines fit hMax high) */
const fit = (lines, t, measure, w = t.w, hMax = Infinity) => {
  const widest = Math.max(1, ...lines.map((l) => measure(l, t.max, t.weight, t.caps)));
  const byW = Math.floor((t.max * w) / widest);
  const byH = Math.floor(hMax / (Math.max(1, lines.length) * t.lh));
  const size = Math.min(t.max, byW, byH);
  return {size: Math.max(t.min, size), fits: size >= t.min, byW: byW >= t.min};
};

/** a capture region {x, y, w, h} (fractions; x and w default to a full-width row) -> {x0, y0, x1, y1} */
const regionOf = (r) => {
  const x = Number.isFinite(r?.x) ? r.x : 0.03;
  const w = Number.isFinite(r?.w) ? r.w : 0.94;
  return {x0: x, y0: Number(r?.y ?? 0), x1: x + w, y1: Number(r?.y ?? 0) + Number(r?.h ?? 0)};
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlapY = (a, b) => a.y < b.y + b.h && b.y < a.y + a.h;

/** Every element's box on one slide. */
export const layoutSlide = (slide, {measure = estimate, phoneD = null, steps = null} = {}) => {
  const s = slide && typeof slide === 'object' ? slide : {};
  const layout = SLIDE_LAYOUTS.includes(s.layout) ? s.layout : 'step';
  const hasPhone = PHONE_LAYOUTS.includes(layout);
  const mode = hasPhone ? modeOf(s) : null;
  const boxes = {};
  const sizes = {};
  const problems = [];
  const out = {layout, mode, boxes, sizes, phone: null, screen: null, outline: null, tap: null, callouts: [], loupe: null, vis: null, problems};
  const lineH = (t) => t.size * t.lh;
  const block = (key, y, text, t, maxLines, x = L, w = W) => {
    if (!text) return y;
    const ls = wrap(text, t.size, t.weight, w, measure, t.caps);
    if (ls.length > maxLines) problems.push(`${key === 'note' ? 'the note' : `"${String(text).slice(0, 40)}"`} runs to ${ls.length} lines (${maxLines} at most${hasPhone ? ': the phone needs the room' : ''}): say less`);
    const h = Math.min(ls.length, maxLines) * lineH(t);
    sizes[`${key}Lines`] = ls.slice(0, maxLines);
    boxes[key] = {x, y, w, h};
    return y + h;
  };
  // the headline: fitted to the width; its room is reserved at its biggest size, so the phone's place never depends on the
  // fonts' real widths (the lint's estimate and the render's measure agree on it)
  const headBlock = (key, y, text, t) => {
    const ls = splitLines(text);
    if (!ls.length) return y;
    if (ls.length > t.lines) problems.push(`the ${key === 'title' ? "step's title" : 'headline'} has ${ls.length} lines (${t.lines} at most)`);
    const use = ls.slice(0, t.lines);
    const f = fit(use, t, measure, t.w);
    if (!f.byW) problems.push(`"${use.reduce((a, b) => (measure(b, t.min, t.weight, t.caps) > measure(a, t.min, t.weight, t.caps) ? b : a))}" is too long for one line even at ${t.min} px: break it with "|" or say less`);
    sizes[key] = f.size;
    const h = use.length * t.max * t.lh;
    boxes[key] = {x: L - 2, y, w: t.w + 4, h};
    return y + h;
  };

  // ---- the text: the label, the headline, a sub-line, a note ----------------------------------------------------------------
  let y = TOP;
  const kicker = layout === 'step' ? `ნაბიჯი ${Number(s.n ?? 1)}${steps ? ` / ${steps}` : ''}` : typeof s.kicker === 'string' && s.kicker.trim() ? s.kicker.trim() : '';
  if (kicker && layout !== 'fact') {
    sizes.kicker = kicker;
    boxes.kicker = {x: L, y, w: W, h: lineH(TYPE.kicker)};
    y += boxes.kicker.h + 14;
  }
  const tHead = layout === 'cover' ? TYPE.head : layout === 'end' ? TYPE.end : layout === 'step' ? TYPE.title : TYPE.ptitle;
  const headKey = layout === 'step' ? 'title' : 'head';

  // the callouts: a step's own, or (a step with a row and a body but none) its body pointing at its row
  let calls = Array.isArray(s.callouts) ? s.callouts.filter((c) => c && typeof c === 'object') : [];
  let bodyAsCall = false;
  if (layout === 'step' && !calls.length && s.row && typeof s.body === 'string' && s.body.trim()) {
    const r = regionOf(s.row);
    calls = [{text: s.body, x: r.x0 + Math.min(0.06, (r.x1 - r.x0) / 2), y: (r.y0 + r.y1) / 2}];
    bodyAsCall = true;
  }
  if (layout === 'end' && calls.length) problems.push('the end shows the phone calm: no callouts');

  if (layout === 'picture' || layout === 'fact') {
    // ---- a car-knowledge set's picture and fact (no phone) ----------------------------------------------------------------
    if (layout === 'picture') {
      y = headBlock(headKey, y, s.title, tHead);
      if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
      if (s.note) y = block('note', y + 12, s.note, TYPE.note, 2);
      const top = y + GAP;
      if (WHOLE.foot - top < 600) problems.push(`the picture gets only ${Math.max(0, WHOLE.foot - top)} px of height (600 at least): shorten the title or the body`);
      boxes.picture = {x: 0, y: top, w: STORY.w, h: Math.max(1, WHOLE.foot - top)};
    } else {
      y = TOP + 40;
      if (s.icon) {
        boxes.icon = {x: L, y, w: 160, h: 160};
        y += 160 + 40;
      }
      const big = String(s.big ?? '');
      const unit = String(s.unit ?? '');
      const t = TYPE.big;
      const wBig = measure(`${big}${unit ? ` ${unit}` : ''}`, t.max, t.weight, t.caps);
      let size = wBig > t.w ? Math.floor((t.max * t.w) / wBig) : t.max;
      if (size < t.min) problems.push(`the big number "${big} ${unit}" is too long (it needs ${size} px; ${t.min} at least): a number and a short unit`);
      size = Math.max(t.min, size);
      sizes.big = size;
      boxes.big = {x: L, y, w: W, h: size * t.lh};
      y += size * t.lh + 30;
      y = headBlock(headKey, y, s.title, tHead);
      if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
      if (s.note) y = block('note', y + 16, s.note, TYPE.note, 2);
      if (y > STORY.bottom - 8) problems.push('the fact runs past the safe zone: a shorter title or body');
    }
  } else {
    y = headBlock(headKey, y, s.title, tHead);
    // a sub-line: a cover's or an end's body, a step's body when its callouts say the rest
    if (s.body && !bodyAsCall) y = block('body', y + 18, s.body, TYPE.body, layout === 'step' ? 1 : TYPE.body.lines);
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, TYPE.note.lines);
  }
  const textBottom = y;

  if (hasPhone) {
    const maxCalls = CALLOUTS_MAX[mode];
    if (calls.length > maxCalls) problems.push(`${calls.length} callouts on a ${mode === 'rise' ? 'rising' : 'whole'} phone (${maxCalls} at most${mode === 'rise' ? ': its label sits over the phone' : ''})`);
    calls = calls.slice(0, maxCalls);
    const callsOk = calls.every((c) => typeof c.text === 'string' && c.text.trim() && Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1);
    if (!callsOk) problems.push('a callout is {"text", "x", "y"} (its point on the capture, fractions 0..1)');
    calls = calls.filter((c) => typeof c.text === 'string' && c.text.trim() && Number.isFinite(c.x) && Number.isFinite(c.y));
    const row = s.row && Number.isFinite(s.row.y) && Number.isFinite(s.row.h) ? regionOf(s.row) : null;
    const wantLoupe = Boolean((s.loupe || s.lift) && row);
    if ((s.loupe || s.lift) && !row) problems.push('"loupe" needs a "row" (the element it enlarges)');
    const t = TYPE.call;

    // ---- the phone ---------------------------------------------------------------------------------------------------------
    let ph;
    if (mode === 'whole') {
      const top = textBottom + GAP;
      const natural = (WHOLE.foot - top) / (FLAT.sh + 2 * FLAT.bez);
      const d = Math.min(WHOLE.maxD, phoneD ?? natural, natural);
      const b = bodyOf(d);
      if (b.h < WHOLE.minH - 0.5) problems.push(`the text leaves the phone only ${Math.round(b.h)} px of height (${WHOLE.minH} at least: the phone is BIG): a one-line title, no sub-line`);
      const side = calls.length || wantLoupe;
      const x = side ? WHOLE.right - b.w : (STORY.w - b.w) / 2;
      ph = {mode, d, x, y: WHOLE.foot - b.h, w: b.w, h: b.h, natural};
    } else {
      const bw = STORY.w * RISE.w;
      const d = bw / (1 + 2 * FLAT.bez);
      const b = bodyOf(d);
      // a label over a rising phone: one line band between the text and the phone
      let top = textBottom + GAP;
      if (calls.length) {
        const ls = wrap(calls[0].text, t.size, t.weight, W - BADGE.size - BADGE.gap, measure, false);
        top = textBottom + 34 + Math.min(2, ls.length) * lineH(t) + 46;
      }
      ph = {mode, d, x: (STORY.w - b.w) / 2, y: top, w: b.w, h: b.h, natural: d};
    }
    out.phone = ph;
    boxes.phone = mode === 'whole' ? {x: ph.x, y: ph.y, w: ph.w, h: ph.h} : {x: ph.x, y: ph.y, w: ph.w, h: Math.max(1, STORY.bottom - ph.y)};
    const bez = FLAT.bez * ph.d;
    const scr = {x: ph.x + bez, y: ph.y + bez, w: ph.d, h: ph.d * FLAT.sh};
    out.screen = scr;
    // the part of the screen inside the zone
    const vis = mode === 'whole' ? 1 : clamp((RISE.foot - scr.y) / scr.h, 0, 1);
    out.vis = vis;
    if (mode === 'rise' && vis < RISE.minVis) problems.push(`the rising phone shows only ${Math.round(vis * 100)} % of its screen inside the zone (${RISE.minVis * 100} % at least): a shorter headline, no sub-line`);
    const inVis = (v) => v <= vis + 1e-6;

    // ---- the outline on the row, the tap ----------------------------------------------------------------------------------
    if (row) {
      const p0 = toFrame(scr, row.x0, row.y0);
      const p1 = toFrame(scr, row.x1, row.y1);
      const pad = 8;
      const o = {x: p0.x - pad, y: p0.y - pad, w: p1.x - p0.x + 2 * pad, h: p1.y - p0.y + 2 * pad};
      // inside the screen, never across the phone's edges
      o.x = Math.max(scr.x + 4, o.x);
      o.w = Math.min(scr.x + scr.w - 4, p1.x + pad) - o.x;
      out.outline = o;
      if (!inVis(row.y1)) problems.push(`the row (y ${row.y0.toFixed(2)}..${row.y1.toFixed(2)}) is below what the rising phone shows (${vis.toFixed(2)} of the screen): "phone": "whole", or a row higher up`);
      // the tap: on a small element its middle; on a wide row (half the screen or more) its right part, so the row's words
      // stay readable under it
      if (s.tap) out.tap = toFrame(scr, row.x1 - row.x0 >= 0.5 ? row.x0 + 0.86 * (row.x1 - row.x0) : (row.x0 + row.x1) / 2, (row.y0 + row.y1) / 2);
    }

    // ---- the loupe: the row enlarged, beside the whole phone (the left column) or inside the rising phone's screen ---------
    let loupe = null;
    if (wantLoupe) {
      const cx0 = clamp(row.x0 - LOUPE.pad, 0, 1);
      const cx1 = clamp(row.x1 + LOUPE.pad, 0, 1);
      const cy0 = clamp(row.y0 - LOUPE.pad * 0.6, 0, 1);
      const cy1 = clamp(row.y1 + LOUPE.pad * 0.6, 0, 1);
      const capW = (cx1 - cx0) * 1080;
      const capH = (cy1 - cy0) * 2346;
      const onPhone = (cx1 - cx0) * scr.w;
      const room = mode === 'whole' ? ph.x - COL_GAP - L : scr.w - 80;
      const k = Math.min(LOUPE.max, room / capW, (mode === 'whole' ? 420 : 520) / capH);
      const lw = capW * k;
      const lh = capH * k;
      if (lw < onPhone * LOUPE.minGrow - 0.5) problems.push(`the loupe would show the row only ${(lw / onPhone).toFixed(1)} times its size (${LOUPE.minGrow} at least): a loupe is for a small element (a tile, a toggle, a button); a wide row takes the outline and a callout`);
      const o = out.outline;
      let lx;
      let ly;
      if (mode === 'whole') {
        lx = L + Math.max(0, (room - lw) / 2);
        // level with its row, unless a callout wants that height of the column: then just over or under the callout
        const lo = textBottom + 30;
        const hi = WHOLE.foot - lh;
        const centred = clamp(o.y + o.h / 2 - lh / 2, lo, hi);
        const wants = calls.map((c) => {
          const n = Math.min(TYPE.call.lines, wrap(String(c.text ?? ''), t.size, t.weight, Math.max(120, room - BADGE.size - BADGE.gap), measure, false).length);
          const h = Math.max(BADGE.size, n * lineH(t));
          const ty = toFrame(scr, 0, clamp(Number(c.y) || 0, 0, 1)).y;
          return {y: ty - Math.max(BADGE.size, lineH(t)) / 2 - 30, h: h + 60};
        });
        const free = (yy) => wants.every((w) => !overlapY({y: yy, h: lh}, w));
        const cands = [centred, ...wants.flatMap((w) => [w.y - lh, w.y + w.h])].filter((yy) => yy >= lo - 0.5 && yy <= hi + 0.5 && free(yy));
        ly = cands.length ? cands.reduce((a, b) => (Math.abs(b - centred) < Math.abs(a - centred) ? b : a)) : centred;
      } else {
        lx = clamp(o.x + o.w / 2 - lw / 2, scr.x + 40, scr.x + scr.w - 40 - lw);
        const below = o.y + o.h + LOUPE.gap;
        const above = o.y - LOUPE.gap - lh;
        ly = below + lh <= Math.min(STORY.bottom - 12, scr.y + vis * scr.h) ? below : above >= scr.y + 30 ? above : below;
        if (ly + lh > STORY.bottom - 12) problems.push('the loupe does not fit under or over its row inside the rising phone: "phone": "whole", or no loupe');
      }
      loupe = {box: {x: lx, y: ly, w: lw, h: lh}, crop: {x0: cx0, y0: cy0, x1: cx1, y1: cy1}, k, grow: lw / onPhone};
      out.loupe = loupe;
    }

    // ---- the callouts ------------------------------------------------------------------------------------------------------
    if (calls.length && mode === 'whole') {
      const colW = ph.x - COL_GAP - L;
      const textW = colW - BADGE.size - BADGE.gap;
      if (textW < 220) problems.push(`the callouts' column is only ${Math.round(colW)} px wide: a shorter title gives the phone less height and the column more room`);
      const items = calls.map((c, i) => {
        const ls = wrap(String(c.text), t.size, t.weight, Math.max(120, textW), measure, false);
        if (ls.length > t.lines) problems.push(`callout ${i + 1} "${String(c.text).slice(0, 30)}" runs to ${ls.length} lines (${t.lines} at most): two or three words`);
        const lines = ls.slice(0, t.lines);
        const h = Math.max(BADGE.size, lines.length * lineH(t));
        const target = toFrame(scr, clamp(c.x, 0, 1), clamp(c.y, 0, 1));
        return {n: Number.isFinite(c.n) ? c.n : i + 1, lines, h, target, want: target.y - Math.max(BADGE.size, lineH(t)) / 2, w: Math.max(...lines.map((l) => measure(l, t.size, t.weight, false)))};
      });
      // the column from the text's foot to the zone's foot; the loupe's rows are taken
      const lo = textBottom + 30;
      const hi = STORY.bottom - 16;
      const blocked = loupe && loupe.box.x < L + colW ? [{y: loupe.box.y - 24, h: loupe.box.h + 48}] : [];
      const order = items.map((_, i) => i).sort((a, b) => items[a].target.y - items[b].target.y);
      let cur = lo;
      for (const i of order) {
        const it = items[i];
        let yy = Math.max(cur, it.want);
        for (const b of blocked) if (overlapY({y: yy, h: it.h}, b)) yy = it.want + it.h / 2 < b.y + b.h / 2 && b.y - it.h >= cur ? b.y - it.h : b.y + b.h;
        it.y = yy;
        cur = yy + it.h + LABEL_GAP;
      }
      // pushed past the foot: shift up from the bottom
      let floor = hi;
      for (const i of [...order].reverse()) {
        const it = items[i];
        if (it.y + it.h > floor) it.y = floor - it.h;
        floor = it.y - LABEL_GAP;
      }
      if (items.some((it) => it.y < lo - 0.5) || order.some((i, k) => k && items[i].y < items[order[k - 1]].y + items[order[k - 1]].h + LABEL_GAP - 0.5)) problems.push('the callouts do not fit beside the phone: fewer callouts, shorter words');
      for (const b of blocked) if (items.some((it) => overlapY({y: it.y, h: it.h}, {y: b.y + 24, h: b.h - 48}))) problems.push('the callouts and the loupe do not fit in the column together: fewer callouts, or no loupe');
      out.callouts = items.map((it) => {
        const firstMid = it.y + Math.max(BADGE.size, lineH(t)) / 2;
        const tx = L + BADGE.size + BADGE.gap;
        return {
          n: it.n,
          lines: it.lines,
          badge: {x: L, y: firstMid - BADGE.size / 2, w: BADGE.size, h: BADGE.size},
          box: {x: tx, y: firstMid - lineH(t) / 2, w: textW, h: it.lines.length * lineH(t)},
          // the leader: from the words' end along the first line to the gutter, then to the point
          from: {x: tx + Math.min(textW, it.w) + 18, y: firstMid},
          knee: {x: ph.x - 22, y: firstMid},
          target: it.target,
        };
      });
    } else if (calls.length && mode === 'rise') {
      const c = calls[0];
      const target = toFrame(scr, clamp(c.x, 0, 1), clamp(c.y, 0, 1));
      if (!inVis(c.y)) problems.push(`the callout's point (y ${c.y}) is below what the rising phone shows (${vis.toFixed(2)} of the screen)`);
      const textW = W - BADGE.size - BADGE.gap;
      const lines = wrap(String(c.text), t.size, t.weight, textW, measure, false);
      if (lines.length > 2) problems.push(`the callout "${String(c.text).slice(0, 30)}" over a rising phone runs to ${lines.length} lines (one short line)`);
      const use = lines.slice(0, 2);
      const y0 = textBottom + 34;
      const firstMid = y0 + Math.max(BADGE.size, lineH(t)) / 2;
      const tx = L + BADGE.size + BADGE.gap;
      const w = Math.max(...use.map((l) => measure(l, t.size, t.weight, false)));
      // the leader: along the line to the point's x, then straight down into the screen (or straight down from under the words)
      const end = tx + w + 18;
      const under = target.x < end + 10;
      out.callouts = [
        {
          n: Number.isFinite(c.n) ? c.n : 1,
          lines: use,
          badge: {x: L, y: firstMid - BADGE.size / 2, w: BADGE.size, h: BADGE.size},
          box: {x: tx, y: firstMid - lineH(t) / 2, w: textW, h: use.length * lineH(t)},
          from: under ? {x: target.x, y: y0 + Math.max(BADGE.size, use.length * lineH(t)) + 10} : {x: end, y: firstMid},
          knee: under ? {x: target.x, y: y0 + Math.max(BADGE.size, use.length * lineH(t)) + 10} : {x: target.x, y: firstMid},
          target,
        },
      ];
    }
    // the loupe never covers a callout's point, and its words stay clear of the phone's screen
    if (loupe) {
      const lb = loupe.box;
      for (const c of out.callouts) if (c.target.x > lb.x - 6 && c.target.x < lb.x + lb.w + 6 && c.target.y > lb.y - 6 && c.target.y < lb.y + lb.h + 6) problems.push(`the loupe covers callout ${c.n}'s point: another row for the loupe, or no loupe`);
      if (out.outline && overlapY(lb, out.outline) && lb.x + lb.w > out.outline.x && lb.x < out.outline.x + out.outline.w) problems.push('the loupe covers its own row');
      boxes.loupe = lb;
    }
    out.callouts.forEach((c, i) => {
      boxes[`call${i + 1}`] = {x: c.badge.x, y: Math.min(c.badge.y, c.box.y), w: c.box.x + c.box.w - c.badge.x, h: Math.max(c.badge.y + c.badge.h, c.box.y + c.box.h) - Math.min(c.badge.y, c.box.y)};
    });
  }

  // the zone itself: every box between top and bottom (a rising phone's body aside), inside the frame's width
  for (const [k, b] of Object.entries(boxes)) {
    const bottom = k === 'phone' && mode === 'rise' ? STORY.bottom : b.y + b.h;
    if (b.y < STORY.top - 0.5 || bottom > STORY.bottom + 0.5) problems.push(`${k} leaves the Story's safe zone (y ${Math.round(b.y)}..${Math.round(b.y + b.h)}; ${STORY.top}..${STORY.bottom})`);
    const x0 = k === 'picture' ? 0 : STORY.edge;
    if (b.x < x0 - 0.5 || b.x + b.w > STORY.w - x0 + 0.5) problems.push(`${k} runs past the side margin (x ${Math.round(b.x)}..${Math.round(b.x + b.w)})`);
  }
  return {...out, problems: [...new Set(problems)]};
};

/** Every slide of a set. A whole phone is as big as its own title leaves (one size for all left a hole under a one-line
 *  title); its foot and its right edge stay put from step to step. The steps' label counts them ("ნაბიჯი 2 / 3"). */
export const layoutSet = (slides, {measure = estimate} = {}) => {
  const list = Array.isArray(slides) ? slides : [];
  const steps = list.filter((s) => s?.layout === 'step').length || null;
  return list.map((s) => layoutSlide(s, {measure, steps}));
};
