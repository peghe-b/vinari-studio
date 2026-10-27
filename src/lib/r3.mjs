// The r3 kit scenes (2026-10-27, the owner: "make the studio AMAZINGLY stronger": the craft audit's kit spec, the parts p2
// did not build): CodeAnatomy (a code taken apart), StakeCounter (the open loop: a running cost with its reasons),
// ScreenTour (a cursor tour of a real screen with a loupe), RangeScale (a reading on its true scale) and TimeRace (two ways
// timed on one clock). Their shared maths and their spec rules live here, read by the scenes (src/scenes/<Name>.tsx), the
// spec lint (tools/ci/p2lint.mjs: CODE_PART, STAKE_STEPS, TOUR_POINTS, RANGE_ZONES, RANGE_SOURCE, RACE_TIME) and the
// build (tools/build-index.mjs R3_SCENE: phase-2 films only, P2_FROM; every earlier film renders and checks as made).
//
//   node src/lib/r3.mjs --test     the self-test
import {p2On} from './p2.mjs';

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
/** the steps that are real totals */
export const stakeSteps = (steps) => (steps ?? []).filter((s) => s && Number.isFinite(Number(s.value))).map((s) => ({...s, value: Number(s.value)}));

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
/** the zone a value is in (-1 none) */
export const zoneOf = (zones, v, min) => {
  let lo = min;
  for (let i = 0; i < (zones ?? []).length; i++) {
    const hi = i === zones.length - 1 ? Infinity : zones[i].to;
    if (v >= lo && v < hi) return i;
    lo = zones[i].to;
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

// ---- the spec rules (tools/ci/p2lint.mjs) -----------------------------------------------------------------------------
const CAP = {w: 1080, h: 2346};
const num = (v) => typeof v === 'number' && Number.isFinite(v);
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
          const tos = zones.map((z) => z?.to);
          if (tos.some((t) => !num(t)) || tos.some((t, i) => t <= (i ? tos[i - 1] : sc.min)) || tos[tos.length - 1] !== sc.max) out.push(`RANGE_ZONES ${w}RangeScale zones run up from "min": each "to" above the last, the last "to" is "max"`);
          if (zones.some((z) => !String(z?.label ?? '').trim())) out.push(`RANGE_ZONES ${w}RangeScale: every zone says what a reading there means ("label")`);
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
  return out;
};

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
  ok(codes({type: 'ScreenTour', screen: '22-obd-result', points: [{x: 300, y: 600, label: 'ა'}, {x: 600, y: 1400, label: 'ბ'}]}).length === 0, 'a good ScreenTour');
  ok(codes({type: 'ScreenTour', screen: '22-obd-result', points: [{x: 300, y: 600, label: 'ა'}, {x: 1300, y: 1400, label: 'ბ'}]}).includes('TOUR_POINTS'), 'a point off the capture: TOUR_POINTS');
  const rs = {type: 'RangeScale', unit: 'V', min: 11, max: 13, value: 12.2, zones: [{to: 12.2, label: 'ა', bad: true}, {to: 12.5, label: 'ბ'}, {to: 13, label: 'გ'}], source: 'წყარო'};
  ok(codes(rs).length === 0, 'a good RangeScale');
  ok(codes({...rs, source: ''}).includes('RANGE_SOURCE'), 'no source: RANGE_SOURCE');
  ok(codes({...rs, zones: [{to: 12.5, label: 'ა'}, {to: 12.2, label: 'ბ'}]}).includes('RANGE_ZONES'), 'zones out of order: RANGE_ZONES');
  ok(codes({...rs, value: 14}).includes('RANGE_ZONES'), 'a value off the scale: RANGE_ZONES');
  const tr = {type: 'TimeRace', fast: {label: 'ა', secs: 120, shown: '2 წუთი'}, slow: {label: 'ბ', secs: 10800, shown: '3 საათი'}};
  ok(codes(tr).length === 0, 'a good TimeRace');
  ok(codes({...tr, slow: {...tr.slow, secs: 60}}).includes('RACE_TIME'), 'the slow way shorter than the fast: RACE_TIME');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /r3\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
