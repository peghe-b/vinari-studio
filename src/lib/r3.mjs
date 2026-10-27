// The r3 kit scenes (2026-10-27, the owner: "make the studio AMAZINGLY stronger": the craft audit's kit spec, the parts p2
// did not build): CodeAnatomy (a code taken apart), StakeCounter (the open loop: a running cost with its reasons),
// ScreenTour (a cursor tour of a real screen with a loupe), RangeScale (a reading on its true scale) and TimeRace (two ways
// timed on one clock). Their shared maths and their spec rules live here, read by the scenes (src/scenes/<Name>.tsx), the
// spec lint (tools/ci/p2lint.mjs: CODE_PART, STAKE_STEPS, TOUR_POINTS, RANGE_ZONES, RANGE_SOURCE, RACE_TIME) and the
// build (tools/build-index.mjs R3_SCENE: phase-2 films only, P2_FROM; every earlier film renders and checks as made).
//
//   node src/lib/r3.mjs --test     the self-test
import {p2On, P2_STAGE, P2_TEXT_INSET, P2_TT} from './p2.mjs';
import {fitLines, textW} from './textfit.mjs';

/** the kit's text box in stage px (src/scenes/kit/p2.tsx S: the stage less the drift's inset) */
const SL = P2_STAGE.left + P2_TEXT_INSET;
const SR = P2_STAGE.right - P2_TEXT_INSET;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

export const R3_SCENES = Object.freeze(['CodeAnatomy', 'StakeCounter', 'ScreenTour', 'RangeScale', 'TimeRace']);

/** a scene of this kit in a film made before phase 2: refused (they never existed for those films) */
export const r3SceneProblems = (sc, film) =>
  R3_SCENES.includes(sc?.type) && !p2On(film) ? [`"${sc.type}" is a phase-2 kit scene (src/lib/r3.mjs; from film P2_FROM on): an older film keeps the scenes it was made with`] : [];

// ---- CodeAnatomy ------------------------------------------------------------------------------------------------------
/** the parts found in the code in reading order: [{...part, start, end}] (a part not found after the last one is left out) */
export const codeParts = (code, parts) => {
  const s = String(code ?? '');
  const out = [];
  let from = 0;
  for (const q of parts ?? []) {
    const part = String(q?.part ?? '');
    if (!part) continue;
    let i = s.indexOf(part, from);
    if (i < 0) i = s.toLowerCase().indexOf(part.toLowerCase(), from);
    if (i < 0) continue;
    out.push({...q, start: i, end: i + part.length});
    from = i + part.length;
  }
  return out;
};
export const CODE_MAX_CHARS = 16;

// ---- StakeCounter -----------------------------------------------------------------------------------------------------
/** 1200 -> „1 200" (a plain space between thousands, the Georgian way) */
export const groupNum = (v) => {
  const n = Math.round(Number(v) || 0);
  return `${n < 0 ? '-' : ''}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
};
/** StakeCounter's layout (stage px), read by the scene and the lint: the count before its rise stands in the middle of the
 *  stage, across TikTok's action column band (src/lib/p2.mjs P2_TT: nothing at x 894 or beyond from y 871 to 1080), so it is
 *  sized to end left of x 894 with room for its 6 % kick and the drift (the review of 08a2624: „1 200 ₾" ended at x 911);
 *  a step's note starts at x 386 and its rows cross the band, so it ends at x 894 too (508 px, one line, 36 px at least). */
export const STAKE_DELTA_W = 250;
export const STAKE_NOTE_X = SL + STAKE_DELTA_W;
export const STAKE_NOTE_W = P2_TT.right - STAKE_NOTE_X;
export const STAKE_COUNT_W = Math.floor((P2_TT.right - SL - 8) / 1.06);
/** the steps that are real totals */
export const stakeSteps = (steps) => (steps ?? []).filter((s) => s && Number.isFinite(Number(s.value))).map((s) => ({...s, value: Number(s.value)}));

// ---- ScreenTour -------------------------------------------------------------------------------------------------------
/** the phone's scale (stage px per capture px): the hero phone 930 stage px tall (src/scenes/kit/p2.tsx phoneGeom: the
 *  screen is the height less two bezels of 1.4 %, at the capture's 1080 x 2346) */
export const TOUR_PHONE_H = 930;
export const TOUR_K = (TOUR_PHONE_H - 2 * Math.round(TOUR_PHONE_H * 0.014)) / 2346;
/** the column right of the phone: the loupe and its label, 275 px wide so both end left of TikTok's action column (x 894) */
export const TOUR_COL_W = 275;
export const TOUR_LENS = Object.freeze({pad: 14, hMin: 120, hMax: 230, zoomMax: 2.6, zoomMin: 1.1});
/** the loupe for one point: a lens shaped to the element's box (w x h capture px), at the biggest zoom (over the phone's own
 *  scale, 2.6 at most) that shows the WHOLE box; its stage height follows the box. zoom < zoomMin: the box is too big for it.
 *  A point with no box keeps the old round-figure zoom (default 2.3) in a 200 px lens. */
export const tourLens = (q, k = TOUR_K, zoom = 2.3, colW = TOUR_COL_W) => {
  const L = TOUR_LENS;
  const inner = colW - 2 * L.pad;
  const hasBox = num(q?.w) && num(q?.h) && q.w > 0 && q.h > 0;
  if (!hasBox) return {lz: Math.min(L.zoomMax, Math.max(2, zoom)) * k, h: 200, zoom: Math.min(L.zoomMax, Math.max(2, zoom)), box: false};
  const lz = Math.min(L.zoomMax * k, inner / q.w, (L.hMax - 2 * L.pad) / q.h);
  return {lz, h: Math.min(L.hMax, Math.max(L.hMin, Math.ceil(q.h * lz + 2 * L.pad))), zoom: lz / k, box: true};
};

// ---- RangeScale -------------------------------------------------------------------------------------------------------
/** the decimals a reading is printed with („12,2" or 12.2 -> 1) */
export const decimalsOf = (v) => {
  const m = /[.,](\d+)/.exec(String(v ?? ''));
  return m ? Math.min(2, m[1].length) : 0;
};
/** a reading with a decimal comma */
export const fmtReading = (v, dec = 0) => Number(v).toFixed(dec).replace('.', ',');
/** the numbered ticks: `step` apart (default a round step giving 4 to 7 numbers), from min to max */
export const rangeTicks = (min, max, step) => {
  const span = max - min;
  if (!(span > 0)) return [min];
  let st = Number(step);
  if (!(st > 0)) {
    const raw = span / 5;
    const mag = 10 ** Math.floor(Math.log10(raw));
    st = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => span / k <= 6.5) ?? 10 * mag;
  }
  const out = [];
  const first = Math.ceil(min / st - 1e-9) * st;
  for (let v = first; v <= max + 1e-9 && out.length < 12; v += st) out.push(Math.round(v * 1000) / 1000);
  return out;
};
/** the scale's ruler (stage x): its numbers end left of TikTok's action column (stage x 894) */
export const RANGE_X = Object.freeze([170, 840]);
/** a zone's room for its label (stage px) and whether the label fits it in 2 lines at the kit's smallest text */
export const zoneRoom = (min, max, from, to) => ((to - from) / (max - min)) * (RANGE_X[1] - RANGE_X[0]) - 12;
export const zoneLabelFits = (label, room) => fitLines(label, room, 2, 44, {weight: 700, mtav: true, min: 34}).fits;
/** ONE size for every zone label (the review of 08a2624: three sizes and two baselines in one row): the smallest size at
 *  which each fits its own zone in 2 lines (44 px at most, 34 at least) */
export const zoneLabelSize = (zones, min, max) => {
  let px = 44;
  let lo = min;
  for (const z of zones ?? []) {
    const to = num(z?.to) ? z.to : max;
    if (String(z?.label ?? '').trim()) px = Math.min(px, fitLines(z.label, Math.max(120, zoneRoom(min, max, lo, to)), 2, 44, {weight: 700, mtav: true, min: 34}).size);
    lo = to;
  }
  return px;
};
/** the zone a value is in (-1 none) */
export const zoneOf = (zones, v, min) => {
  let lo = min;
  for (let i = 0; i < (zones ?? []).length; i++) {
    const hi = i === zones.length - 1 ? Infinity : Number(zones[i]?.to);
    if (v >= lo && v < hi) return i;
    lo = Number(zones[i]?.to);
  }
  return -1;
};

// ---- TimeRace ---------------------------------------------------------------------------------------------------------
const UNITS = [60, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400, 604800];
export const RACE_LAPS_MAX = 4;
/** one lap of the clocks: the smallest round unit the slow way fills in RACE_LAPS_MAX laps or fewer */
export const raceLap = (slowSecs) => UNITS.find((u) => slowSecs / u <= RACE_LAPS_MAX) ?? Math.ceil(slowSecs / RACE_LAPS_MAX);
/** the shared clock at frame f after the start: the fast way's time over fastF frames, then the rest over slowF (BEZ.data
 *  shape, monotonic: both readouts are always the same real time) */
export const raceTime = (f, fastSecs, slowSecs, fastF = 20, slowF = 46, gap = 6) => {
  const e = (u) => {
    const t = Math.min(1, Math.max(0, u));
    return t * t * (3 - 2 * t);
  };
  if (f <= 0) return 0;
  if (f < fastF) return fastSecs * e(f / fastF);
  if (f < fastF + gap) return fastSecs;
  return fastSecs + (slowSecs - fastSecs) * e((f - fastF - gap) / slowF);
};
/** the clock's face: H:MM:SS when a lap is an hour or more, else M:SS */
export const clockText = (secs, lap) => {
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return lap >= 3600 || h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${Math.floor(s / 60)}:${ss}`;
};

/** TimeRace's clocks (stage px): the right ring's outer ticks (14 px past the ring's stroke) end at x 891, left of TikTok's action column (the review of
 *  08a2624: the slow ring reached x 899) */
export const RACE_R = 150;
export const RACE_CX = Object.freeze([336, 716]);
export const RACE_LABEL_W = 340;

// ---- the words each scene sets, where and how small (TEXT_WIDE) --------------------------------------------------------
/** the texts an r3 scene sets: [{path, text, w, lines, min, weight}], each at the width its scene gives it (TikTok's band
 *  narrowing included) and the smallest size it may shrink to. A text that does not fit there would be cut or overflow
 *  (the review of 08a2624: StakeCounter dropped „ხელოსანთან", a ScreenTour label ran to 3 lines). */
export const r3Texts = (sc) => {
  const t = [];
  const add = (path, text, w, lines, min, weight = 700) => typeof text === 'string' && text.trim() && t.push({path, text, w, lines, min, weight});
  const each = (arr, f) => (Array.isArray(arr) ? arr : []).forEach((x, i) => x && typeof x === 'object' && f(x, i));
  const band = (x) => Math.min(SR - x, P2_TT.right - x);
  switch (sc?.type) {
    case 'CodeAnatomy':
      add('kind', sc.kind, SR - SL, 1, 34, 600);
      each(sc.parts, (q, i) => add(`parts[${i}].means`, q.means, band(SL + 48), 2, 40));
      add('sum.text', sc.sum?.text, Math.min(SR - SL - 96, 2 * (P2_TT.right - (SL + SR) / 2)), 2, 56);
      break;
    case 'StakeCounter':
      add('label', sc.label, SR - SL, 1, 36, 600);
      each(sc.steps, (q, i) => add(`steps[${i}].note`, q.note, STAKE_NOTE_W, 1, 36, 600));
      add('resolve.text', sc.resolve?.text, band(SL), 2, 64);
      add('source', sc.source, band(SL), 1, 30, 500);
      break;
    case 'ScreenTour':
      each(sc.points, (q, i) => add(`points[${i}].label`, q.label, TOUR_COL_W, 2, 36));
      break;
    case 'RangeScale':
      add('title', sc.title, SR - SL, 1, 40);
      add('fromLabel', sc.fromLabel, 220, 1, 34, 500);
      break;
    case 'TimeRace':
      add('title', sc.title, SR - SL, 1, 40);
      for (const k of ['fast', 'slow']) {
        add(`${k}.label`, sc[k]?.label, RACE_LABEL_W, 2, 36);
        add(`${k}.shown`, sc[k]?.shown, RACE_LABEL_W, 1, 40);
      }
      break;
    default:
  }
  return t;
};
/** TEXT_WIDE lines for the r3 texts that do not fit their box at their smallest size */
export const r3TextWide = (sc, where = '') =>
  r3Texts(sc)
    .filter((x) => !fitLines(x.text, x.w, x.lines, Math.max(x.min, 56), {weight: x.weight, mtav: true, min: x.min}).fits)
    .map((x) => `TEXT_WIDE ${where ? `${where} ` : ''}${sc.type} ${x.path} "${x.text}" does not fit its ${Math.round(x.w)} px in ${x.lines} line${x.lines > 1 ? 's' : ''} even at ${x.min} px: fewer or shorter words`);

// ---- the spec rules (tools/ci/p2lint.mjs) -----------------------------------------------------------------------------
const CAP = {w: 1080, h: 2346};
/** the problems of one r3 scene's props, as lint lines (CODE PART ... ) */
export const r3Problems = (sc, where = '') => {
  const out = [];
  const w = where ? `${where} ` : '';
  switch (sc?.type) {
    case 'CodeAnatomy': {
      const code = String(sc.code ?? '');
      const parts = sc.parts ?? [];
      if (!code.trim() || [...code].length > CODE_MAX_CHARS) out.push(`CODE_PART ${w}CodeAnatomy "code" is the code as printed, 1 to ${CODE_MAX_CHARS} characters`);
      if (!Array.isArray(parts) || parts.length < 1 || parts.length > 4) out.push(`CODE_PART ${w}CodeAnatomy takes 1 to 4 parts`);
      else {
        const found = codeParts(code, parts);
        if (found.length !== parts.length) out.push(`CODE_PART ${w}CodeAnatomy part "${parts.find((q) => !found.some((f) => f.part === q?.part))?.part ?? ''}" is not in "${code}" after the part before it: each part is a run of the code's own characters, in reading order`);
        if (parts.some((q) => !String(q?.means ?? '').trim())) out.push(`CODE_PART ${w}CodeAnatomy: every part says what it means ("means")`);
      }
      break;
    }
    case 'StakeCounter': {
      const steps = sc.steps ?? [];
      if (!Array.isArray(steps) || steps.length < 2 || steps.length > 5) out.push(`STAKE_STEPS ${w}StakeCounter takes 2 to 5 steps (worse three times is the shape)`);
      else {
        if (stakeSteps(steps).length !== steps.length) out.push(`STAKE_STEPS ${w}StakeCounter: every step's "value" is a number (the running total)`);
        if (steps.some((s) => !String(s?.note ?? '').trim())) out.push(`STAKE_STEPS ${w}StakeCounter: every step says why ("note")`);
        const vals = [num(sc.from) ? sc.from : 0, ...stakeSteps(steps).map((s) => s.value)];
        if (vals.some((v, i) => i && v < vals[i - 1])) out.push(`STAKE_STEPS ${w}StakeCounter: the running total only grows (each "value" is the new total, not the step's own amount)`);
      }
      if (!String(sc.label ?? '').trim()) out.push(`STAKE_STEPS ${w}StakeCounter says what it counts ("label")`);
      break;
    }
    case 'ScreenTour': {
      const pts = sc.points ?? [];
      if (!String(sc.screen ?? '').trim()) out.push(`TOUR_POINTS ${w}ScreenTour needs "screen" (a current capture)`);
      if (!Array.isArray(pts) || pts.length < 2 || pts.length > 3) out.push(`TOUR_POINTS ${w}ScreenTour takes 2 or 3 points`);
      else {
        for (const q of pts) {
          if (!num(q?.x) || !num(q?.y) || q.x < 40 || q.x > CAP.w - 40 || q.y < 140 || q.y > CAP.h - 60) out.push(`TOUR_POINTS ${w}ScreenTour point (${q?.x}, ${q?.y}) is not on the capture (capture px: x 40..1040, y 140..2286, under the status bar)`);
          if (!String(q?.label ?? '').trim()) out.push(`TOUR_POINTS ${w}ScreenTour: every point has its "label"`);
          if (!num(q?.w) || !num(q?.h) || !(q.w > 0) || !(q.h > 0)) out.push(`TOUR_POINTS ${w}ScreenTour point (${q?.x}, ${q?.y}) needs its element's box "w", "h" (capture px; x, y its centre): the loupe shows that box whole`);
          else {
            if (num(q?.x) && num(q?.y) && (q.x - q.w / 2 < 0 || q.x + q.w / 2 > CAP.w || q.y - q.h / 2 < 120 || q.y + q.h / 2 > CAP.h)) out.push(`TOUR_POINTS ${w}ScreenTour point (${q.x}, ${q.y}) box ${q.w} x ${q.h} runs off the capture`);
            const lens = tourLens(q);
            if (lens.zoom < TOUR_LENS.zoomMin) out.push(`TOUR_POINTS ${w}ScreenTour point (${q.x}, ${q.y}) box ${q.w} x ${q.h} is too big for the loupe (it would show it at ${lens.zoom.toFixed(2)}x, ${TOUR_LENS.zoomMin}x at least: w ${Math.floor((TOUR_COL_W - 2 * TOUR_LENS.pad) / (TOUR_LENS.zoomMin * TOUR_K))}, h ${Math.floor((TOUR_LENS.hMax - 2 * TOUR_LENS.pad) / (TOUR_LENS.zoomMin * TOUR_K))} capture px at most): aim at the element itself, a button, a code, a price`);
          }
        }
        for (let i = 1; i < pts.length; i++) if (num(pts[i]?.x) && Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) < 120) out.push(`TOUR_POINTS ${w}ScreenTour points ${i} and ${i + 1} are under 120 capture px apart: one spot, or two that differ`);
      }
      break;
    }
    case 'RangeScale': {
      const zones = sc.zones ?? [];
      if (!num(sc.min) || !num(sc.max) || !(sc.max > sc.min)) out.push(`RANGE_ZONES ${w}RangeScale needs "min" < "max"`);
      else {
        if (!num(sc.value) || sc.value < sc.min || sc.value > sc.max) out.push(`RANGE_ZONES ${w}RangeScale "value" ${sc.value} is off its scale (${sc.min}..${sc.max})`);
        if (!Array.isArray(zones) || zones.length < 2 || zones.length > 4) out.push(`RANGE_ZONES ${w}RangeScale takes 2 to 4 zones`);
        else {
          if (zones.some((z) => !z || typeof z !== 'object')) out.push(`RANGE_ZONES ${w}RangeScale: every zone is {to, label}`);
          const tos = zones.map((z) => z?.to);
          if (tos.some((t) => !num(t)) || tos.some((t, i) => t <= (i ? tos[i - 1] : sc.min)) || tos[tos.length - 1] !== sc.max) out.push(`RANGE_ZONES ${w}RangeScale zones run up from "min": each "to" above the last, the last "to" is "max"`);
          if (zones.some((z) => !String(z?.label ?? '').trim())) out.push(`RANGE_ZONES ${w}RangeScale: every zone says what a reading there means ("label")`);
          zones.forEach((z, i) => {
            const room = zoneRoom(sc.min, sc.max, i ? Number(zones[i - 1]?.to) : sc.min, Number(z?.to));
            if (String(z?.label ?? '').trim() && num(z?.to) && !zoneLabelFits(z.label, room)) out.push(`RANGE_ZONES ${w}RangeScale zone "${z.label}" does not fit its ${Math.round(room)} px of the scale at 34 px: a shorter word, or a wider zone`);
          });
        }
        if (sc.from !== undefined && (!num(sc.from) || sc.from < sc.min || sc.from > sc.max)) out.push(`RANGE_ZONES ${w}RangeScale "from" is off its scale`);
      }
      if (!String(sc.source ?? '').trim()) out.push(`RANGE_SOURCE ${w}RangeScale needs "source": whose figure the zones are`);
      break;
    }
    case 'TimeRace': {
      const f = sc.fast;
      const s = sc.slow;
      if (!f || !s || !num(f.secs) || !num(s.secs) || !(f.secs > 0) || !(s.secs > f.secs)) out.push(`RACE_TIME ${w}TimeRace needs "fast" and "slow" with real "secs", the slow one longer`);
      if (![f, s].every((l) => String(l?.label ?? '').trim() && String(l?.shown ?? '').trim())) out.push(`RACE_TIME ${w}TimeRace: each way has its "label" and its time as said ("shown")`);
      break;
    }
    default:
  }
  out.push(...r3TextWide(sc, where));
  return out;
};

const sizeForW = (text, w) => Math.min(230, Math.floor(w / textW(text, 1, {weight: 700})));
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(r3SceneProblems({type: 'CodeAnatomy'}, 'v134-winter-battery').length === 1 && r3SceneProblems({type: 'CodeAnatomy'}, 'v906-x').length === 0, 'an r3 scene only in a phase-2 film');
  ok(r3SceneProblems({type: 'Receipt'}, 'v100-x').length === 0, 'other scenes are not gated here');
  const cp = codeParts('5W-30', [{part: '5W'}, {part: '30'}]);
  ok(cp.length === 2 && cp[0].start === 0 && cp[0].end === 2 && cp[1].start === 3 && cp[1].end === 5, 'codeParts finds the parts in order');
  ok(codeParts('P0300', [{part: '03'}, {part: 'P'}]).length === 1, 'a part before the last one is not found');
  ok(groupNum(1200) === '1 200' && groupNum(40) === '40' && groupNum(1234567) === '1 234 567' && groupNum(-300) === '-300', 'thousands grouped with a space');
  ok(decimalsOf('12,2') === 1 && decimalsOf(12.25) === 2 && decimalsOf(12) === 0 && fmtReading(12.2, 1) === '12,2', 'a reading keeps its decimals, a decimal comma');
  ok(JSON.stringify(rangeTicks(11, 13)) === '[11,11.5,12,12.5,13]' && JSON.stringify(rangeTicks(0, 8, 2)) === '[0,2,4,6,8]', 'round ticks');
  const z = [{to: 12.2}, {to: 12.5}, {to: 13}];
  ok(zoneOf(z, 12.0, 11) === 0 && zoneOf(z, 12.3, 11) === 1 && zoneOf(z, 13, 11) === 2, 'the zone of a reading (the top value in the last zone)');
  ok(raceLap(10800) === 3600 && raceLap(120) === 60 && raceLap(1500) === 600, 'a lap is a round unit, 4 laps at most');
  ok(raceTime(0, 120, 10800) === 0 && raceTime(20, 120, 10800) === 120 && raceTime(200, 120, 10800) === 10800, 'the shared clock: the fast time, then the slow one');
  let mono = true;
  for (let f = 1, last = 0; f < 80; f++) {
    const t = raceTime(f, 120, 10800);
    if (t < last) mono = false;
    last = t;
  }
  ok(mono, 'the shared clock never runs back');
  ok(clockText(120, 3600) === '0:02:00' && clockText(10800, 3600) === '3:00:00' && clockText(95, 60) === '1:35', 'the clock face');
  const codes = (sc) => r3Problems(sc).map((l) => l.split(' ')[0]);
  ok(codes({type: 'CodeAnatomy', code: '5W-30', parts: [{part: '5W', means: 'ცივი ძრავი'}, {part: '30', means: 'ცხელი ძრავი'}]}).length === 0, 'a good CodeAnatomy');
  ok(codes({type: 'CodeAnatomy', code: '5W-30', parts: [{part: '10W', means: 'ა'}]}).includes('CODE_PART'), 'a part not in the code: CODE_PART');
  ok(codes({type: 'StakeCounter', label: 'ფული', steps: [{value: 40, note: 'ა'}, {value: 220, note: 'ბ'}]}).length === 0, 'a good StakeCounter');
  ok(codes({type: 'StakeCounter', label: 'ფული', steps: [{value: 40, note: 'ა'}, {value: 20, note: 'ბ'}]}).includes('STAKE_STEPS'), 'a total that shrinks: STAKE_STEPS');
  ok(codes({type: 'StakeCounter', label: 'ფული', steps: [{value: 40, note: 'ა'}]}).includes('STAKE_STEPS'), 'one step: STAKE_STEPS');
  ok(codes({type: 'StakeCounter', label: 'ფული', steps: [{value: 40, note: 'მეორედ მისვლა ხელოსანთან'}, {value: 220, note: 'ბ'}]}).includes('TEXT_WIDE'), 'a note wider than its 508 px at 36 px (the review: „ხელოსანთან" vanished): TEXT_WIDE');
  ok(STAKE_NOTE_X + STAKE_NOTE_W === 894 && STAKE_COUNT_W * 1.06 + 136 <= 894 - 8, 'the count and the notes end left of TikTok\'s action column');
  ok(textW(`${groupNum(2400)} ₾`, sizeForW(`${groupNum(2400)} ₾`, STAKE_COUNT_W), {weight: 700}) <= STAKE_COUNT_W, 'a 2 400 ₾ count fits its band width');
  const st = {type: 'ScreenTour', screen: '22-obd-result', points: [{x: 466, y: 870, w: 260, h: 70, label: 'მთავარი კოდი'}, {x: 316, y: 1241, w: 423, h: 118, label: 'ბ'}]};
  ok(codes(st).length === 0, 'a good ScreenTour');
  ok(codes({...st, points: [st.points[0], {...st.points[1], x: 1300}]}).includes('TOUR_POINTS'), 'a point off the capture: TOUR_POINTS');
  ok(codes({...st, points: [st.points[0], {x: 316, y: 1241, label: 'ბ'}]}).includes('TOUR_POINTS'), 'a point with no element box: TOUR_POINTS');
  ok(codes({...st, points: [st.points[0], {...st.points[1], w: 760, h: 150}]}).includes('TOUR_POINTS'), 'a box too big for the loupe (the heading of 22-obd-result): TOUR_POINTS');
  ok(codes({...st, points: [st.points[0], {...st.points[1], label: 'ბოლო სერვისის თარიღი'}]}).includes('TEXT_WIDE'), 'a tour label that runs to 3 lines in its 275 px (the review of 08a2624): TEXT_WIDE');
  {
    const a = tourLens(st.points[1]);
    const b = tourLens(st.points[0]);
    ok(a.box && 423 * a.lz <= TOUR_COL_W - 2 * TOUR_LENS.pad + 1e-6 && a.h >= 118 * a.lz && b.zoom <= TOUR_LENS.zoomMax + 1e-9 && b.h <= TOUR_LENS.hMax, 'the loupe shows its whole box, 2.6x at most');
  }
  const rs = {type: 'RangeScale', unit: 'V', min: 11, max: 13, value: 12.2, zones: [{to: 12.2, label: 'ა', bad: true}, {to: 12.5, label: 'ბ'}, {to: 13, label: 'გ'}], source: 'წყარო'};
  ok(codes(rs).length === 0, 'a good RangeScale');
  ok(codes({...rs, source: ''}).includes('RANGE_SOURCE'), 'no source: RANGE_SOURCE');
  ok(codes({...rs, zones: [{to: 12.5, label: 'ა'}, {to: 12.2, label: 'ბ'}]}).includes('RANGE_ZONES'), 'zones out of order: RANGE_ZONES');
  ok(codes({...rs, value: 14}).includes('RANGE_ZONES'), 'a value off the scale: RANGE_ZONES');
  {
    let crash = '';
    try {
      r3Problems({...rs, zones: [null, {to: 12.5, label: 'ბ'}, {to: 13, label: 'გ'}]});
    } catch (e) {
      crash = String(e);
    }
    ok(!crash && codes({...rs, zones: [null, {to: 12.5, label: 'ბ'}, {to: 13, label: 'გ'}]}).includes('RANGE_ZONES'), `a null zone is reported, not a crash ${crash}`);
  }
  {
    const zs = [{to: 12.2, label: 'დაცლილი'}, {to: 12.6, label: 'სუსტი'}, {to: 13, label: 'სავსე'}];
    const px = zoneLabelSize(zs, 11.8, 13);
    ok(px === 38 && zs.every((z, i) => fitLines(z.label, Math.max(120, zoneRoom(11.8, 13, i ? zs[i - 1].to : 11.8, z.to)), 2, px, {weight: 700, mtav: true, min: px}).fits), `one zone label size that fits every zone (${px} px)`);
  }
  ok(codes({...rs, min: 11.6, zones: [{to: 12.2, label: 'ა', bad: true}, {to: 12.5, label: 'ნახევრადნახევრად'}, {to: 13, label: 'გ'}]}).includes('RANGE_ZONES'), 'a zone label wider than its zone: RANGE_ZONES (the first r3 still: „ნახევრად" lost its last letter)');
  const tr = {type: 'TimeRace', fast: {label: 'ა', secs: 120, shown: '2 წუთი'}, slow: {label: 'ბ', secs: 10800, shown: '3 საათი'}};
  ok(codes(tr).length === 0, 'a good TimeRace');
  ok(codes({...tr, slow: {...tr.slow, secs: 60}}).includes('RACE_TIME'), 'the slow way shorter than the fast: RACE_TIME');
  ok(RACE_CX[1] + RACE_R + 9 + 14 + 2 <= 894 && RACE_CX[0] - RACE_R - 9 - 14 - 2 >= 136, 'the clocks and their outer ticks stay out of TikTok\'s column');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /r3\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
