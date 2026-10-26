// The annotation layer's geometry and rules (phase 2, src/lib/p2.mjs; the owner: "sketch marks every second"). The film's
// Ink component (src/scenes/kit/ink.tsx) draws these strokes; the lints (tools/ci/p2lint.mjs CLUTTER, MARK_*) read the same
// rules, so a mark the render would refuse is refused before the voice is spent.
//
//   inkStrokes(kind, box, seed, room)   the strokes of one hand mark, as point lists (stage px)
//   inkFrames(len)                      frames a stroke of `len` px takes: clamp(round(len / 110), 6, 16)
//   inkTone(kind)                       'red' a strike, 'green' a tick, else 'ink'
//   inkSound(kind)                      the quiet existing cue on the mark's first frame (never a pencil: the owner's rule 28)
//   inkPlan(marks, {bottom, dur})       {shown, problems}: at most INK_MAX at once, none under the caption band
//   node src/lib/ink.mjs --test         the self-test

export const INK_KINDS = Object.freeze(['circle', 'underline', 'strike', 'tick', 'arrow', 'bracket', 'badge']);
export const INK_MAX = 3;
export const INK_FADE = 6;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// a seeded jitter, the same in Node and the render (never Math.random)
const rnd = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const polyLen = (pts) => {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
};

/** A hand line from a to b: a slight bow and a tremor, `n` points. */
const line = (a, b, bow, seed, n = 28) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  return Array.from({length: n}, (_, i) => {
    const u = i / (n - 1);
    const j = (rnd(seed * 31 + i) - 0.5) * 0.006;
    const off = Math.sin(u * Math.PI) * bow * L + j * L;
    return [a[0] + dx * u + nx * off, a[1] + dy * u + ny * off];
  });
};

/** A hand ellipse round (cx, cy): it starts a little past where it ends (the overshoot of a real marker loop). */
const ellipse = (cx, cy, rx, ry, seed, n = 64) => {
  const a0 = -2.2 + rnd(seed) * 0.5;
  const sweep = Math.PI * 2 * 1.08;
  return Array.from({length: n}, (_, i) => {
    const u = i / (n - 1);
    const a = a0 + sweep * u;
    const wob = 1 + (rnd(seed * 7 + i) - 0.5) * 0.02 + 0.03 * u;
    return [cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob];
  });
};

const head = (tip, from, size) => {
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  return [2.6, -2.6].map((da) => [[tip[0] + size * Math.cos(ang + da), tip[1] + size * Math.sin(ang + da)], tip]);
};

/** The strokes of one mark at box b = {x, y, w, h} (stage px); `room` keeps an arrow's tail in free space inside it. */
export const inkStrokes = (kind, b, seed = 1, room = {x: 110, y: 370, w: 860, h: 1000}) => {
  const pad = clamp(b.w * 0.08, 18, 54);
  switch (kind) {
    case 'circle':
      return [ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + pad, b.h / 2 + pad * 0.75, seed)];
    case 'underline':
      return [line([b.x - 6, b.y + b.h + 14], [b.x + b.w + 10, b.y + b.h + 8], 0.035, seed)];
    case 'strike':
      return [line([b.x - 12, b.y + b.h * 0.6], [b.x + b.w + 14, b.y + b.h * 0.42], 0.03, seed)];
    case 'tick': {
      const s = clamp(b.h * 1.1, 40, 72);
      const cx = Math.min(b.x + b.w + 28 + s / 2, room.x + room.w - s * 0.7);
      const cy = b.y + b.h / 2;
      const a = line([cx - s * 0.5, cy], [cx - s * 0.1, cy + s * 0.42], 0.04, seed, 14);
      const c = line([cx - s * 0.1, cy + s * 0.42], [cx + s * 0.62, cy - s * 0.5], -0.05, seed + 1, 22);
      return [[...a, ...c.slice(1)]];
    }
    case 'arrow': {
      // the tail starts in the free space beside the box (the side with more room) and the tip lands just outside its edge
      const leftRoom = b.x - room.x;
      const rightRoom = room.x + room.w - (b.x + b.w);
      const right = rightRoom >= leftRoom;
      const tip = [right ? b.x + b.w + 14 : b.x - 14, b.y + Math.min(26, b.h * 0.3)];
      const reach = clamp(Math.max(leftRoom, rightRoom) - 40, 90, 200);
      const from = [clamp(tip[0] + (right ? reach : -reach), room.x + 20, room.x + room.w - 20), Math.max(room.y + 24, tip[1] - reach * 0.7)];
      const shaft = line(from, tip, 0.1, seed);
      return [shaft, ...head(shaft[shaft.length - 1], shaft[shaft.length - 6], 30)];
    }
    case 'bracket': {
      // a hand brace down the box's left side: it gathers a group of rows
      const x = Math.max(room.x + 8, b.x - 30);
      const top = line([x + 22, b.y], [x, b.y + 14], 0, seed, 6);
      const mid = line([x, b.y + 14], [x, b.y + b.h - 14], 0.01, seed + 2, 20);
      const bot = line([x, b.y + b.h - 14], [x + 22, b.y + b.h], 0, seed + 3, 6);
      return [[...top, ...mid.slice(1), ...bot.slice(1)]];
    }
    case 'badge': {
      // a small hand ring at the box's upper right corner (the label sits inside it: kit/ink.tsx)
      const r = clamp(Math.min(b.w, b.h) * 0.22, 34, 56);
      const cx = Math.min(b.x + b.w, room.x + room.w - r - 8);
      const cy = Math.max(b.y, room.y + r + 8);
      return [ellipse(cx, cy, r, r, seed, 40)];
    }
  }
  return [];
};

export const inkFrames = (len) => clamp(Math.round(len / 110), 6, 16);
export const inkTone = (kind) => (kind === 'strike' ? 'red' : kind === 'tick' ? 'green' : 'ink');
export const inkSound = (kind) => (kind === 'strike' ? 'asmr-strike' : kind === 'tick' ? 'asmr-check' : 'asmr-tick-fine');

/** The frames a whole mark takes to draw (its strokes one after another, a 2-frame lift between them). */
export const inkDur = (strokes) => strokes.reduce((s, pts, i) => s + inkFrames(polyLen(pts)) + (i ? 2 : 0), 0);

/**
 * The marks of one shot: {shown, problems}. A mark is {kind, box, at}. Rules (the plan's step 3):
 *  - at most INK_MAX marks on screen at once (a mark stays until the shot ends): the 4th and later are dropped;
 *  - no mark under the caption band: a box whose foot is below `bottom` (stage y) is dropped;
 *  - an unknown kind is dropped.
 */
export const inkPlan = (marks, {bottom = 1370, room} = {}) => {
  const problems = [];
  const shown = [];
  for (const m of marks ?? []) {
    if (!INK_KINDS.includes(m?.kind)) {
      problems.push(`MARK_KIND: "${m?.kind}" is not a mark (${INK_KINDS.join(', ')})`);
      continue;
    }
    const b = m.box ?? {};
    if (![b.x, b.y, b.w, b.h].every(Number.isFinite)) {
      problems.push(`MARK_BOX: a ${m.kind} needs box {x, y, w, h}`);
      continue;
    }
    const foot = Math.max(...inkStrokes(m.kind, b, m.seed ?? 1, room).flat().map((p) => p[1]));
    if (foot > bottom) {
      problems.push(`MARK_LOW: the ${m.kind} reaches stage y ${Math.round(foot)}, under the caption band's top (${bottom})`);
      continue;
    }
    if (shown.length >= INK_MAX) {
      problems.push(`CLUTTER: a ${INK_MAX + 1}th mark in one shot (at most ${INK_MAX} at once; marks stay until the shot ends)`);
      continue;
    }
    shown.push(m);
  }
  return {shown, problems};
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const box = {x: 300, y: 600, w: 400, h: 120};
  for (const k of INK_KINDS) {
    const s = inkStrokes(k, box, 3);
    ok(s.length >= 1 && s.every((p) => p.length >= 2 && p.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))), `${k}: strokes`);
  }
  ok(JSON.stringify(inkStrokes('circle', box, 5)) === JSON.stringify(inkStrokes('circle', box, 5)), 'the same seed draws the same mark (no Math.random)');
  ok(inkFrames(10) === 6 && inkFrames(5000) === 16 && inkFrames(1100) === 10, 'a stroke takes 6..16 frames, length / 110');
  ok(inkTone('strike') === 'red' && inkTone('tick') === 'green' && inkTone('circle') === 'ink' && inkTone('arrow') === 'ink', 'strikes red, ticks green, the rest ink');
  ok(INK_KINDS.every((k) => !/pencil/.test(inkSound(k))), 'no pencil sound (the owner, rule 28)');
  const four = inkPlan([1, 2, 3, 4].map((i) => ({kind: 'underline', box: {x: 200, y: 400 + i * 150, w: 300, h: 60}, at: i * 10})));
  ok(four.shown.length === 3 && four.problems.some((p) => p.startsWith('CLUTTER')), 'a 4th mark is dropped (CLUTTER)');
  const low = inkPlan([{kind: 'circle', box: {x: 300, y: 1300, w: 300, h: 100}, at: 0}]);
  ok(low.shown.length === 0 && /MARK_LOW/.test(low.problems[0] ?? ''), 'a mark under the caption band is dropped');
  const arrow = inkStrokes('arrow', {x: 150, y: 700, w: 300, h: 100}, 2);
  const tail = arrow[0][0];
  ok(tail[0] > 450 && !(tail[0] >= 150 && tail[0] <= 450 && tail[1] >= 700 && tail[1] <= 800), 'an arrow starts in free space beside the box and points in');
  const tip = arrow[0][arrow[0].length - 1];
  ok(Math.abs(tip[0] - 464) < 2, 'the arrow tip lands just outside the box edge');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /ink\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
