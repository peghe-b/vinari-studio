// The Instagram Story slides' layout (the owner, 2026-10-19: "Stories for the Highlights: 1080 x 1920, everything inside the
// Story's safe zone"; and the same day, hard: "the slides are ALWAYS the white theme, the iPhone mockup BIG and WHOLE, never cut
// at the top or the bottom, refined every time"), shared by the render (src/slides/Slides.tsx places every element from these
// boxes) and the tools (tools/ci/slides.mjs lints a set with it and its --test proves every layout stays inside the zone;
// tools/slides.mjs checks the rendered pixels too). Pure JS: no React, no DOM.
//
// The zone: Instagram draws the profile row and the progress bars over the top ~250 px and the reply bar over the bottom
// ~340 px, so nothing that matters goes above y 250 or below y 1580; the white field runs to the edges.
// The phone is the hero: on the cover and on every step it stands WHOLE between the text and FOOT, at least PHONE.min px of
// display wide (about half the frame's height); the text above it is short, and text that would shrink it is refused. The
// steps of one set share one phone size and place (layoutSet), so the phone stays put while he swipes.
//
//   layoutSlide(slide, {measure, phoneW})   -> {boxes: {name: {x, y, w, h}}, sizes: {...}, phone: {x, w, foot, yaw, pitch,
//     roll} | null, problems: []}. measure(text, size, weight) is the text's width in px (the browser's textWidth in the
//     render, an estimate in Node); phoneW forces the phone's width (layoutSet's shared one); every box is in frame px;
//     `problems` says what does not fit (the lint refuses such a slide before any render)
//   layoutSet(slides, {measure})   -> every slide's layout, the steps' phones one size
//   SLIDE_LAYOUTS, STORY, PHONE, PHONE_K, POSE_MAX, splitLines(s), poseOf(slide)
export const STORY = Object.freeze({w: 1080, h: 1920, top: 250, bottom: 1580, side: 72});
/** the composition "<id>-slides" holds slide i in frames [i * SLOT, (i + 1) * SLOT); its still is taken at i * SLOT + SETTLED */
export const SLOT = 300;
export const SETTLED = 240;
/** the phone's display width (px) on a cover or a step: never under min (the owner: BIG), never over max (it stays a phone) */
export const PHONE = Object.freeze({min: 430, max: 520});
/** the slides' poses: a calm, readable turn (degrees) */
export const POSE_MAX = Object.freeze({yaw: 8, pitch: 4, roll: 1.5});
/** the 3D iPhone's body box per display px of its width at those poses (measured with kit/phone3d's bodyBox: at most 2.308
 *  high, 1.154 wide), with a margin */
export const PHONE_K = Object.freeze({h: 2.32, w: 1.17});
export const SLIDE_LAYOUTS = Object.freeze(['cover', 'step', 'picture', 'fact', 'end']);
/** the layouts that show the phone (a "screen" each) */
export const PHONE_LAYOUTS = Object.freeze(['cover', 'step']);
/** the type: sizes in px, the line height, the widest a line may run, the most lines */
export const TYPE = Object.freeze({
  kicker: {size: 38, weight: 500, lh: 1.2},
  head: {max: 124, min: 76, weight: 700, lh: 1.04, w: 936, lines: 2},
  title: {max: 84, min: 60, weight: 700, lh: 1.08, w: 812, lines: 2},
  ptitle: {max: 112, min: 66, weight: 700, lh: 1.06, w: 936, lines: 2},
  body: {size: 42, weight: 400, lh: 1.3, w: 936, lines: 3},
  big: {max: 300, min: 140, weight: 700, lh: 1, w: 936},
  note: {size: 34, weight: 500, lh: 1.25, w: 936, lines: 2},
});
const TOP = STORY.top + 30; // the first line's top, just under Instagram's bars
const FOOT = 1552; // the phone's lowest point and a picture's bottom: 28 px over the zone's edge (the phone's soft shadow)
const GAP = 36; // the text to the phone
const CHIP = 88;

/** "line one | line two" -> ['line one', 'line two'] */
export const splitLines = (s) =>
  String(s ?? '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

/** a rough width in Node (the render measures for real): FiraGO and the condensed Mtavruli run about 0.62 em a letter at
 *  bold weights; deliberately on the wide side, so a line the lint passes always fits in the render */
export const estimate = (text, size, weight = 700) => [...String(text)].length * size * (weight >= 600 ? 0.64 : 0.58);

/** the slide's phone pose (degrees): the cover turns a touch left, the steps take turns, every one inside POSE_MAX */
export const poseOf = (s) => {
  const c = (v, m) => Math.max(-m, Math.min(m, v));
  const layout = s?.layout;
  const yaw = Number.isFinite(s?.yaw) ? c(s.yaw, POSE_MAX.yaw) : layout === 'cover' ? -7 : Number(s?.n ?? 1) % 2 ? -6 : 6;
  return {yaw, pitch: 3, roll: layout === 'cover' ? 0.8 : yaw < 0 ? -0.6 : 0.6};
};

/** words wrapped into lines of `w` px at `size` */
const wrap = (text, size, weight, w, measure) => {
  const out = [];
  for (const para of splitLines(text)) {
    let cur = '';
    for (const word of para.split(/\s+/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && measure(next, size, weight) > w) {
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
  const widest = Math.max(1, ...lines.map((l) => measure(l, t.max, t.weight)));
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
  let phone = null;
  const block = (key, y, text, t, maxLines, x = L, w = W) => {
    if (!text) return y;
    const ls = wrap(text, t.size, t.weight, w, measure);
    if (ls.length > maxLines) problems.push(`${key === 'note' ? 'the note' : `"${String(text).slice(0, 40)}"`} runs to ${ls.length} lines (${maxLines} at most${PHONE_LAYOUTS.includes(layout) ? ': the phone needs the room' : ''}): say less`);
    const h = Math.min(ls.length, maxLines) * t.size * t.lh;
    sizes[`${key}Lines`] = ls.slice(0, maxLines);
    boxes[key] = {x, y, w, h};
    return y + h;
  };
  /** the room the phone needs at its smallest, from the text's bottom */
  const phoneRoom = PHONE.min * PHONE_K.h + GAP;
  const phoneUnder = (top) => {
    const natural = Math.floor((FOOT - GAP - top) / PHONE_K.h);
    if (natural < PHONE.min) problems.push(`the text leaves the phone only ${Math.max(0, natural)} px of width (${PHONE.min} at least: the phone is BIG): a shorter title, one body line, no note`);
    const w = Math.max(PHONE.min, Math.min(PHONE.max, phoneW ?? natural));
    phone = {x: 540, w, foot: FOOT, natural, ...poseOf(s)};
    boxes.phone = {x: 540 - (w * PHONE_K.w) / 2, y: FOOT - w * PHONE_K.h, w: w * PHONE_K.w, h: w * PHONE_K.h};
  };
  const headBlock = (y, text, t, x = L, w = t.w, hMax = Infinity) => {
    const ls = splitLines(text);
    if (!ls.length) return y;
    if (ls.length > t.lines) problems.push(`the headline has ${ls.length} lines (${t.lines} at most)`);
    const f = fit(ls.slice(0, t.lines), t, measure, w, hMax);
    if (!f.byW) problems.push(`"${ls.reduce((a, b) => (measure(b, t.min, t.weight) > measure(a, t.min, t.weight) ? b : a))}" is too long for one line even at ${t.min} px: break it with "|" or say less`);
    else if (!f.fits) problems.push(`the headline leaves the phone too little room: ${ls.length > 1 ? 'one line, ' : ''}shorter words${boxes.kicker ? ', or no kicker' : ''}`);
    sizes.head = f.size;
    const h = Math.min(ls.length, t.lines) * f.size * t.lh;
    boxes.head = {x, y, w, h};
    return y + h;
  };

  if (layout === 'cover') {
    let y = TOP;
    if (s.kicker) {
      boxes.kicker = {x: L, y, w: W, h: TYPE.kicker.size * TYPE.kicker.lh};
      y += boxes.kicker.h + 14;
    }
    // the headline takes what the note and the big phone leave (it shrinks toward its min before the phone does)
    const noteH = s.note ? 16 + TYPE.note.size * TYPE.note.lh : 0;
    y = headBlock(y, s.title, TYPE.head, L, TYPE.head.w, FOOT - phoneRoom - noteH - y);
    if (s.note) y = block('note', y + 16, s.note, TYPE.note, 1);
    phoneUnder(y);
  } else if (layout === 'step') {
    const top = TOP;
    boxes.chip = {x: L, y: top, w: CHIP, h: CHIP};
    const tl = splitLines(s.title);
    const t = TYPE.title;
    const tw = W - CHIP - 28;
    if (tl.length > t.lines) problems.push(`the step's title has ${tl.length} lines (${t.lines} at most)`);
    // the title takes what the body, the note and the big phone leave (it shrinks toward its min before the phone does)
    const under = (s.body ? 22 + Math.min(2, wrap(s.body, TYPE.body.size, TYPE.body.weight, W, measure).length) * TYPE.body.size * TYPE.body.lh : 22) + (s.note ? 10 + TYPE.note.size * TYPE.note.lh : 0);
    const f = fit(tl.length ? tl.slice(0, t.lines) : [''], t, measure, tw, FOOT - phoneRoom - under - top);
    if (tl.length && !f.byW) problems.push(`the step's title "${tl.join(' ')}" is too long even at ${t.min} px: one verb and its object`);
    else if (tl.length && !f.fits) problems.push(`the step's title, body and note leave the phone too little room: one title line, one body line`);
    sizes.title = f.size;
    const th = Math.max(1, Math.min(tl.length, t.lines)) * f.size * t.lh;
    boxes.title = {x: L + CHIP + 28, y: top + Math.max(0, (CHIP - th) / 2), w: tw, h: th};
    let y = Math.max(top + CHIP, boxes.title.y + th) + 22;
    y = block('body', y, s.body, TYPE.body, 2);
    if (s.note) y = block('note', y + (s.body ? 10 : 0), s.note, TYPE.note, 1);
    phoneUnder(y);
  } else if (layout === 'picture') {
    let y = TOP + 12;
    y = headBlock(y, s.title, TYPE.ptitle);
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
    if (s.note) y = block('note', y + 12, s.note, TYPE.note, 2);
    const top = y + GAP;
    if (FOOT - top < 600) problems.push(`the picture gets only ${Math.max(0, FOOT - top)} px of height (600 at least): shorten the title or the body`);
    boxes.picture = {x: 0, y: top, w: STORY.w, h: Math.max(1, FOOT - top)};
  } else if (layout === 'fact') {
    let y = TOP + 72;
    if (s.icon) {
      boxes.icon = {x: 540 - 80, y, w: 160, h: 160};
      y += 160 + 36;
    }
    const big = String(s.big ?? '');
    const unit = String(s.unit ?? '');
    const t = TYPE.big;
    const wBig = measure(`${big}${unit ? ` ${unit}` : ''}`, t.max, t.weight);
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
  } else {
    // end: the mark, the wordmark, one line, a quiet body
    let y = 560;
    boxes.mark = {x: 540 - 130, y, w: 260, h: 227};
    y += 227 + 46;
    boxes.word = {x: 540 - 200, y, w: 400, h: 102};
    y += 102 + 70;
    y = headBlock(y, s.title, TYPE.title, L, W);
    if (s.body) y = block('body', y + 20, s.body, TYPE.body, 3);
    if (s.note) y = block('note', y + 16, s.note, TYPE.note, 2);
    if (y > FOOT) problems.push('the end slide runs past the safe zone: a shorter line');
  }
  // a fact and the end stand in the middle of the zone (their block centred on its middle, never above the first line)
  if (layout === 'fact' || layout === 'end') {
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
