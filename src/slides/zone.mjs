// The Instagram Story slides' layout (the owner, 2026-10-19: "Stories for the Highlights: 1080 x 1920, everything inside the
// Story's safe zone"; and the same day, hard: "the slides are ALWAYS the white theme, the iPhone mockup BIG and WHOLE, never cut
// at the top or the bottom, refined every time"), shared by the render (src/slides/Slides.tsx places every element from these
// boxes) and the tools (tools/ci/slides.mjs lints a set with it and its --test proves every layout stays inside the zone;
// tools/slides.mjs checks the rendered pixels too). Pure JS: no React, no DOM.
//
// The zone (Instagram's Story safe zone, 1080 x 1920): Instagram draws the profile row and the progress bars over the top
// ~250 px and the reply bar over the bottom ~340 px, and its side margin is ~65 px, so nothing that matters goes above y 250,
// below y 1580, left of x 65 or right of x 1015 (STORY.edge; the layout keeps its text 72 px in, STORY.side); the white
// field runs to the edges.
// The phone is the hero: on the cover, on every step and on the end it stands WHOLE between the text and FOOT, at least
// PHONE.min px of display wide (more than half the frame's height); the text above it is short, and text that would shrink it
// is refused. Its box is the 3D iPhone's own (phoneBox: src/scenes/kit/phone3d.tsx bodyBox, the same lens and body), so it
// takes every pixel the text leaves. The steps of one set share one phone size and place (layoutSet), so the phone stays put
// while he swipes.
// The type: headlines, a step's title and the kicker in the condensed Mtavruli (mtav() at render, like the promo covers); a
// body and a note in FiraGO's own lower-case letters (plain: the render sets them as written), quieter and easy to read.
//
//   layoutSlide(slide, {measure, phoneW})   -> {boxes: {name: {x, y, w, h}}, sizes: {...}, phone: {x, w, foot, natural, yaw,
//     pitch, roll} | null, problems: []}. measure(text, size, weight, caps) is the text's width in px (the browser's
//     textWidth in the render, an estimate in Node; caps false: the plain letters of a body or a note); phoneW forces the
//     phone's width (layoutSet's shared one); every box is in frame px; `problems` says what does not fit (the lint refuses
//     such a slide before any render)
//   layoutSet(slides, {measure})   -> every slide's layout, the steps' phones one size
//   phoneBox(w, pose)   -> the phone's body box round its centre {x0, x1, y0, y1} (frame px)
//   SLIDE_LAYOUTS, PHONE_LAYOUTS, STORY, PHONE, BODY, POSE_MAX, TYPE, splitLines(s), poseOf(slide), estimate
export const STORY = Object.freeze({w: 1080, h: 1920, top: 250, bottom: 1580, edge: 65, side: 72});
/** the composition "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT); its still is taken at i * SLOT + SETTLED */
export const SLOT = 300;
export const SETTLED = 240;
/** the phone's display width (px) on a cover, a step or the end: never under min (the owner: BIG), never over max */
export const PHONE = Object.freeze({min: 440, max: 560});
/** the slides' poses: a calm, readable turn (degrees) */
export const POSE_MAX = Object.freeze({yaw: 8, pitch: 4, roll: 1.5});
/** the 3D iPhone's body and lens (src/scenes/kit/phone3d.tsx: BW, BH, DEPTH / 2, FPX; tools/ci/slides.mjs --test reads that
 *  file and holds these in step): the display is 1 wide, the bezel 0.034, the capture 1080 x 2346 */
export const BODY = Object.freeze({bw: 1 + 2 * 0.034, bh: 2346 / 1080 + 2 * 0.034, front: 0.123 / 2, fpx: 2580});
export const SLIDE_LAYOUTS = Object.freeze(['cover', 'step', 'end', 'picture', 'fact']);
/** the layouts that show the phone (a "screen" each). A picture and a fact have none: only a car-knowledge set (no app screen
 *  to show) takes them (tools/ci/slides.mjs PHONELESS) */
export const PHONE_LAYOUTS = Object.freeze(['cover', 'step', 'end']);
/** the type: sizes in px, the line height, the widest a line may run, the most lines; caps false: plain letters (FiraGO) */
export const TYPE = Object.freeze({
  kicker: {size: 36, weight: 500, lh: 1.2, caps: true},
  head: {max: 124, min: 76, weight: 700, lh: 1.04, w: 880, lines: 2, caps: true},
  title: {max: 80, min: 56, weight: 700, lh: 1.08, lines: 2, caps: true},
  end: {max: 88, min: 60, weight: 700, lh: 1.06, w: 880, lines: 2, caps: true},
  ptitle: {max: 112, min: 66, weight: 700, lh: 1.06, w: 936, lines: 2, caps: true},
  body: {size: 40, weight: 400, lh: 1.3, w: 936, lines: 2, caps: false},
  big: {max: 300, min: 140, weight: 700, lh: 1, w: 936, caps: true},
  note: {size: 34, weight: 500, lh: 1.25, w: 936, lines: 1, caps: false},
});
const TOP = STORY.top + 16; // the first line's top, just under Instagram's bars
const FOOT = 1552; // the phone's lowest point and a picture's bottom: 28 px over the zone's edge (the phone's soft shadow)
const GAP = 30; // the text to the phone
const CHIP = 80; // a step's number
const CHIP_GAP = 24;

/** "line one | line two" -> ['line one', 'line two'] */
export const splitLines = (s) =>
  String(s ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

/** a rough width in Node (the render measures for real): FiraGO and the condensed Mtavruli run about 0.62 em a letter at
 *  bold weights; deliberately on the wide side, so a line the lint passes always fits in the render */
export const estimate = (text, size, weight = 700) => [...String(text)].length * size * (weight >= 600 ? 0.64 : 0.58);

/** the slide's phone pose (degrees): the cover turns a touch left, the end a touch right, the steps take turns, every one
 *  inside POSE_MAX */
export const poseOf = (s) => {
  const c = (v, m) => Math.max(-m, Math.min(m, v));
  const layout = s?.layout;
  const yaw = Number.isFinite(s?.yaw) ? c(s.yaw, POSE_MAX.yaw) : layout === 'cover' ? -7 : layout === 'end' ? 7 : Number(s?.n ?? 1) % 2 ? -6 : 6;
  return {yaw, pitch: 3, roll: layout === 'cover' ? 0.8 : layout === 'end' ? -0.8 : yaw < 0 ? -0.6 : 0.6};
};

/** The phone's body box round its centre at display width w and a pose (degrees): {x0, x1, y0, y1} in frame px, exactly as
 *  src/scenes/kit/phone3d.tsx bodyBox projects it (three.js Euler "YXZ" of (-pitch, yaw, roll), the studio's lens). */
export const phoneBox = (w, {yaw = 0, pitch = 0, roll = 0} = {}) => {
  const D = Math.PI / 180;
  const a = Math.cos(-pitch * D);
  const b = Math.sin(-pitch * D);
  const c = Math.cos(yaw * D);
  const d = Math.sin(yaw * D);
  const e = Math.cos(roll * D);
  const f = Math.sin(roll * D);
  const ce = c * e;
  const cf = c * f;
  const de = d * e;
  const df = d * f;
  // three.js Matrix4.makeRotationFromEuler, order YXZ (rows of the rotation)
  const R = [
    [ce + df * b, de * b - cf, a * d],
    [a * f, a * e, -b],
    [cf * b - de, df + ce * b, a * c],
  ];
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const v = [(sx * BODY.bw) / 2, (sy * BODY.bh) / 2, sz * BODY.front];
        const [X, Y, Z] = R.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
        const k = BODY.fpx / (BODY.fpx / w - Z);
        x0 = Math.min(x0, X * k);
        x1 = Math.max(x1, X * k);
        y0 = Math.min(y0, -Y * k);
        y1 = Math.max(y1, -Y * k);
      }
  return {x0, x1, y0, y1};
};
const phoneH = (w, pose) => {
  const b = phoneBox(w, pose);
  return b.y1 - b.y0;
};
/** the widest display width (px, whole) whose phone at `pose` is at most `h` high */
const widthFor = (h, pose) => {
  let lo = 1;
  let hi = 2000;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (phoneH(m, pose) <= h) lo = m;
    else hi = m;
  }
  return Math.floor(lo);
};

/** words wrapped into lines of `w` px at `size` */
const wrap = (text, size, weight, w, measure, caps) => {
  const out = [];
  for (const para of splitLines(text)) {
    let cur = '';
    for (const word of para.split(/\s+/)) {
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

/** the largest size from max down to min at which every line of `lines` fits `w` (and, with `hMax`, the lines fit hMax
 *  high); fits: false when even min is too wide or too high */
const fit = (lines, t, measure, w = t.w, hMax = Infinity) => {
  const widest = Math.max(1, ...lines.map((l) => measure(l, t.max, t.weight, t.caps)));
  const byW = Math.floor((t.max * w) / widest);
  const byH = Math.floor(hMax / (Math.max(1, lines.length) * t.lh));
  const size = Math.min(t.max, byW, byH);
  return {size: Math.max(t.min, size), fits: size >= t.min, byW: byW >= t.min};
};

/** Every element's box on one slide. */
export const layoutSlide = (slide, {measure = estimate, phoneW = null} = {}) => {
  const s = slide && typeof slide === 'object' ? slide : {};
  const layout = SLIDE_LAYOUTS.includes(s.layout) ? s.layout : 'step';
  const boxes = {};
  const sizes = {};
  const problems = [];
  const L = STORY.side;
  const W = STORY.w - 2 * STORY.side;
  const pose = poseOf(s);
  let phone = null;
  const block = (key, y, text, t, maxLines, x = L, w = W) => {
    if (!text) return y;
    const ls = wrap(text, t.size, t.weight, w, measure, t.caps);
    if (ls.length > maxLines) problems.push(`${key === 'note' ? 'the note' : `"${String(text).slice(0, 40)}"`} runs to ${ls.length} lines (${maxLines} at most${PHONE_LAYOUTS.includes(layout) ? ': the phone needs the room' : ''}): say less`);
    const h = Math.min(ls.length, maxLines) * t.size * t.lh;
    sizes[`${key}Lines`] = ls.slice(0, maxLines);
    boxes[key] = {x, y, w, h};
    return y + h;
  };
  /** the room the phone needs at its smallest, from the text's bottom */
  const phoneRoom = phoneH(PHONE.min, pose) + GAP;
  const phoneUnder = (top) => {
    const natural = widthFor(FOOT - GAP - top, pose);
    if (natural < PHONE.min) problems.push(`the text leaves the phone only ${Math.max(0, natural)} px of width (${PHONE.min} at least: the phone is BIG): a shorter title, one body line, no note`);
    const w = Math.max(PHONE.min, Math.min(PHONE.max, phoneW ?? natural));
    const b = phoneBox(w, pose);
    phone = {x: 540, w, foot: FOOT, natural, ...pose};
    boxes.phone = {x: 540 + b.x0, y: FOOT - (b.y1 - b.y0), w: b.x1 - b.x0, h: b.y1 - b.y0};
  };
  const headBlock = (y, text, t, x = L, w = t.w, hMax = Infinity) => {
    const ls = splitLines(text);
    if (!ls.length) return y;
    if (ls.length > t.lines) problems.push(`the headline has ${ls.length} lines (${t.lines} at most)`);
    const f = fit(ls.slice(0, t.lines), t, measure, w, hMax);
    if (!f.byW) problems.push(`"${ls.reduce((a, b) => (measure(b, t.min, t.weight, t.caps) > measure(a, t.min, t.weight, t.caps) ? b : a))}" is too long for one line even at ${t.min} px: break it with "|" or say less`);
    else if (!f.fits) problems.push(`the headline leaves the phone too little room: ${ls.length > 1 ? 'one line, ' : ''}shorter words${boxes.kicker ? ', or no kicker' : ''}`);
    sizes.head = f.size;
    const h = Math.min(ls.length, t.lines) * f.size * t.lh;
    boxes.head = {x, y, w, h};
    return y + h;
  };
  const lineH = (t) => t.size * t.lh;

  if (layout === 'cover') {
    let y = TOP;
    if (s.kicker) {
      boxes.kicker = {x: L, y, w: W, h: lineH(TYPE.kicker)};
      y += boxes.kicker.h + 12;
    }
    // the headline takes what the note and the big phone leave (it shrinks toward its min before the phone does)
    const noteH = s.note ? 14 + lineH(TYPE.note) : 0;
    // a centred headline keeps more air at the sides than the text's margin (it never runs edge to edge)
    y = headBlock(y, s.title, TYPE.head, (STORY.w - TYPE.head.w) / 2, TYPE.head.w, FOOT - phoneRoom - noteH - y);
    if (s.note) y = block('note', y + 14, s.note, TYPE.note, TYPE.note.lines);
    phoneUnder(y);
  } else if (layout === 'step') {
    // the number chip at the left, the title beside it, the body and the note under the title (one left edge: a hanging
    // indent), then the phone
    const top = TOP;
    const tx = L + CHIP + CHIP_GAP;
    const tw = W - CHIP - CHIP_GAP;
    const tl = splitLines(s.title);
    const t = TYPE.title;
    if (tl.length > t.lines) problems.push(`the step's title has ${tl.length} lines (${t.lines} at most)`);
    // the title takes what the body, the note and the big phone leave (it shrinks toward its min before the phone does)
    const bodyN = s.body ? Math.min(TYPE.body.lines, wrap(s.body, TYPE.body.size, TYPE.body.weight, tw, measure, false).length) : 0;
    const under = (bodyN ? 12 + bodyN * lineH(TYPE.body) : 0) + (s.note ? 8 + lineH(TYPE.note) : 0);
    const f = fit(tl.length ? tl.slice(0, t.lines) : [''], t, measure, tw, FOOT - phoneRoom - under - top);
    if (tl.length && !f.byW) problems.push(`the step's title "${tl.join(' ')}" is too long even at ${t.min} px: one verb and its object`);
    else if (tl.length && !f.fits) problems.push(`the step's title, body and note leave the phone too little room: one title line, one body line`);
    sizes.title = f.size;
    const line1 = f.size * t.lh;
    const th = Math.max(1, Math.min(tl.length, t.lines)) * line1;
    // the chip sits on the title's first line
    const chipY = top + Math.max(0, (line1 - CHIP) / 2);
    boxes.chip = {x: L, y: chipY, w: CHIP, h: CHIP};
    boxes.title = {x: tx, y: top + Math.max(0, (CHIP - line1) / 2), w: tw, h: th};
    let y = Math.max(chipY + CHIP, boxes.title.y + th);
    if (s.body) y = block('body', y + 12, s.body, TYPE.body, TYPE.body.lines, tx, tw);
    if (s.note) y = block('note', y + 8, s.note, TYPE.note, TYPE.note.lines, tx, tw);
    phoneUnder(y);
  } else if (layout === 'end') {
    // the closing line (and the free-week line or a quiet note) over the phone on one more real screen
    let y = TOP;
    const bodyN = s.body ? Math.min(TYPE.body.lines, wrap(s.body, TYPE.body.size, TYPE.body.weight, W, measure, false).length) : 0;
    const under = (bodyN ? 14 + bodyN * lineH(TYPE.body) : 0) + (s.note ? 10 + lineH(TYPE.note) : 0);
    y = headBlock(y, s.title, TYPE.end, (STORY.w - TYPE.end.w) / 2, TYPE.end.w, FOOT - phoneRoom - under - y);
    if (s.body) y = block('body', y + 14, s.body, TYPE.body, TYPE.body.lines);
    if (s.note) y = block('note', y + 10, s.note, TYPE.note, TYPE.note.lines);
    phoneUnder(y);
  } else if (layout === 'picture') {
    let y = TOP + 12;
    y = headBlock(y, s.title, TYPE.ptitle);
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, 2);
    const top = y + GAP;
    if (FOOT - top < 600) problems.push(`the picture gets only ${Math.max(0, FOOT - top)} px of height (600 at least): shorten the title or the body`);
    boxes.picture = {x: 0, y: top, w: STORY.w, h: Math.max(1, FOOT - top)};
  } else {
    // fact: an icon, a big number with its unit, a title, a body
    let y = TOP + 72;
    if (s.icon) {
      boxes.icon = {x: 540 - 80, y, w: 160, h: 160};
      y += 160 + 36;
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
    y = headBlock(y, s.title, TYPE.ptitle);
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
    if (s.note) y = block('note', y + 16, s.note, TYPE.note, 2);
    if (y > FOOT) problems.push('the fact runs past the safe zone: a shorter title or body');
    // a fact stands in the middle of the zone (its block centred on its middle, never above the first line)
    const bs = Object.values(boxes);
    const y0 = Math.min(...bs.map((b) => b.y));
    const y1 = Math.max(...bs.map((b) => b.y + b.h));
    const dy = Math.max(TOP - y0, Math.min(FOOT - y1, (STORY.top + STORY.bottom) / 2 - (y0 + y1) / 2));
    for (const b of bs) b.y += dy;
  }
  // the zone itself: everything that matters between top and bottom, inside the frame's width
  for (const [k, b] of Object.entries(boxes)) {
    if (b.y < STORY.top - 0.5 || b.y + b.h > STORY.bottom + 0.5) problems.push(`${k} leaves the Story's safe zone (y ${Math.round(b.y)}..${Math.round(b.y + b.h)}; ${STORY.top}..${STORY.bottom})`);
    if (b.x < -0.5 || b.x + b.w > STORY.w + 0.5) problems.push(`${k} runs off the frame's side`);
  }
  return {layout, boxes, sizes, phone, problems: [...new Set(problems)]};
};

/** Every slide of a set, the steps' phones one size: the smallest natural width of the set's steps (never under PHONE.min),
 *  so the phone stands at the same size and place from step to step. */
export const layoutSet = (slides, {measure = estimate} = {}) => {
  const list = Array.isArray(slides) ? slides : [];
  const first = list.map((s) => layoutSlide(s, {measure}));
  const steps = first.filter((l) => l.layout === 'step' && l.phone).map((l) => l.phone.natural);
  const stepW = steps.length ? Math.max(PHONE.min, Math.min(PHONE.max, ...steps)) : null;
  return list.map((s, i) => (first[i].layout === 'step' && stepW !== null ? layoutSlide(s, {measure, phoneW: stepW}) : first[i]));
};
