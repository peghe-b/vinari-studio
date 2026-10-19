// The frame guards (the owner, 2026-10-19, after frame-by-frame checks of v100..v110: "the subtitle is hidden again and again
// behind a standing man, a driver's hand, the wheel, a road; cars and phones cut by the frame; a phone held still for four
// seconds; a blurred tilted phone; a cartoon thought bubble"). One module, read by the render (src/lib/guardrt.ts, the scenes,
// layers/Subtitles.tsx) and by the tools (tools/ci/guards.mjs, tools/check.mjs, tools/subtone.mjs, filmlint, build-index), so
// the numbers are the same everywhere. From film GUARD_FROM on (the promo-grade upgrade's first film, src/lib/kit.mjs):
//   (a) the SUBTITLE is the top layer, always readable: its colour follows the picture measured under the words
//       (tools/subtone.mjs) and, where that colour still does not read on PLATE_KEEP of its box, it sits on a soft plate
//       (layers/Subtitles.tsx); the SUBTITLE BAND (SUB_BAND, frame px) is reserved for it: no person, hand, wheel, phone, car,
//       card or diagram may stand in it (the kit's stagings keep out of it: SUB_BAND_STAGE; check.mjs's probe: SUB_BAND);
//   (b) the EDGE GUARD: a phone, a car, a card or a diagram stays WHOLE inside the frame (fitSpan / fitWhole in the kit's
//       placements); only a fast entry or exit (under FAST_S) may touch the frame's edge (check.mjs's probe: EDGE_CUT);
//   (c) no shot holds still longer than STATIC_MAX_S: a long shot breathes (Promo's SceneHost) and check.mjs measures it
//       (STATIC_HOLD);
//   (d) no blurred tilted phone (the 3D phone's side-on "hero" reveal, a whip's blur on a phone shot, a blur filter on a
//       phone in a Film) and no thought bubble (Person "think", a cloud in a Film): the brief, build-index and filmlint.
// Every earlier film, a redo of one and its translations render exactly as they were made.
//
//   node src/lib/guard.mjs --test     the self-test (the helpers; tools/ci/guards.mjs --test checks the numbers against tokens.ts)
import {filmKey} from '../scenes/illo/wardrobe.mjs';
import {KIT_FROM} from './kit.mjs';

export const GUARD_FROM = KIT_FROM;
/** true when the film `film` (its id or its number) renders and checks with the guards */
export const guardOn = (film) => {
  const n = typeof film === 'number' ? film : filmKey(film);
  return Number.isFinite(n) && n >= GUARD_FROM && n < 100000;
};

// ---- (a) the subtitle band ----------------------------------------------------------------------------------------------
/** The subtitle's band in FRAME px: from the picture band's foot (L.graphicsBottom, frame 1440) to under the line's plate
 *  (the Mtavruli letters 1477..1520 at 58 px, the plate's padding), across the line's widest box (L.subtitleX 510 +-
 *  L.subtitleMaxW / 2). Nothing but the picture's ground, sky, wall or road may be there. */
export const SUB_BAND = Object.freeze({top: 1440, bottom: 1560, left: 133, right: 887});
/** The same band in STAGE units (tokens.ts STAGE: frame = -78 + 1.1 * stage): a scene keeps its people and things above
 *  `top` (stage 1380, the old picture band's foot L.graphicsBottom). */
export const SUB_BAND_STAGE = Object.freeze({top: 1380, bottom: 1489});
/** Where the subtitle's plate goes on (tools/subtone.mjs): the line's colour reaches 3:1 (READ_KEEP) on less than this share
 *  of its box. A clean field reads on all of it; a sleeve, a wheel or a road under some words drops it below. */
export const PLATE_KEEP = 0.96;

// ---- (b) the edge guard --------------------------------------------------------------------------------------------------
/** Frame px: an object closer than this to the frame's side is cut by it (the probe reads quarter-size frames: 2 px). */
export const EDGE_PX = 8;
/** Seconds: an object may touch the frame's edge (or cross the band) for less than this: a fast entry, an exit, a whip. */
export const FAST_S = 0.4;
/** The stage box a whole object stays in (stage units): the frame's width less a margin a camera push (1.06 about x 540)
 *  never crosses, from the picture band's top (L.graphicsTop) to just over the subtitle band. */
export const WHOLE_STAGE = Object.freeze({left: 100, right: 980, top: 370, bottom: SUB_BAND_STAGE.top - 10});
/** The lowest a thing may stand (stage y: feet, a phone's foot, a wheel's rim, a card's foot): WHOLE_STAGE.bottom. */
export const FOOT_MAX = WHOLE_STAGE.bottom;
/** The lowest a library scene stands a thing (stage y): its own camera (a push of up to 5 % about the content box, an fx
 *  settle or pull) and the breath carry a foot at 1340 to about 1370, still over the band. The kit's Film shots (no
 *  camera of their own, only the breath) use FOOT_MAX. Measured on 2026-10-19's probe runs: Call "missed" at 1370 and
 *  Person "pair" at 1370 reached the band under their pushes. */
export const FOOT_CAM = FOOT_MAX - 30;
/** The highest a label, a card or a phone's top may sit in a guarded film (stage y): under the meta bar (its capitals end
 *  at frame 296, stage 340) by the breath's lift and a margin. v110's step label at stage 300 covered the meta bar's words. */
export const LABEL_TOP = WHOLE_STAGE.top + 14;

const span = (a, w, lo, hi) => (w >= hi - lo ? lo + (hi - lo - w) / 2 : Math.min(hi - w, Math.max(lo, a)));
/** A span [cx - w/2, cx + w/2] kept inside [lo, hi]: never wider than the box (scaled down, `s` < 1), then slid inside. */
export const fitSpan = (cx, w, lo, hi) => {
  const W = Math.max(1, Math.min(w, hi - lo));
  const c = Math.min(hi - W / 2, Math.max(lo + W / 2, cx));
  return {cx: c, w: W, s: W / w};
};
/** A box {cx, cy, w, h} (stage) kept whole inside `box`: one scale for both sides (its shape kept), then slid inside. */
export const fitWhole = ({cx, cy, w, h}, box = WHOLE_STAGE) => {
  const s = Math.min(1, (box.right - box.left) / w, (box.bottom - box.top) / h);
  const x = fitSpan(cx, w * s, box.left, box.right);
  const y = fitSpan(cy, h * s, box.top, box.bottom);
  return {cx: x.cx, cy: y.cx, w: w * s, h: h * s, s};
};
/** A box {x, y, w, h} (stage: its left and top) slid whole inside `box`, never scaled (a card's words keep their size); one
 *  larger than the box is centred on it. The kit's cards, sheets, toasts and charts place themselves through this. */
export const slideInside = ({x, y, w, h}, box = WHOLE_STAGE) => ({x: span(x, w, box.left, box.right), y: span(y, h, box.top, box.bottom), w, h});
/** A lowest point (stage y: feet, a phone's foot, a wheel's rim) kept over the subtitle band. */
export const footAbove = (y, margin = 10) => Math.min(y, SUB_BAND_STAGE.top - margin);

// ---- (c) no static hold --------------------------------------------------------------------------------------------------
/** Seconds a shot may hold still at most (a gentle push or a cut before that). */
export const STATIC_MAX_S = 2.5;
/** Promo's breath on a long shot: the push it reaches over the shot (1 + BREATH) about (540, BREATH_Y) in FRAME px (Promo
 *  scales the frame there, outside the stage), low in the picture: a whole thing's foot over the band (stage FOOT_MAX, frame
 *  1429) moves about 7 px and stays over the band (frame 1440), the content box's top (stage LABEL_TOP, frame 344) about 31
 *  px up and stays under the meta bar's capitals (frame 296). (Before 2026-10-19 evening the number was meant in stage
 *  units but read as frame px: the feet reached the band's edge and the step label rose into the meta bar.) */
export const BREATH = 0.035;
export const BREATH_Y = 1230;

// ---- (d) the scenes the guards refuse (tools/build-index.mjs: an ERROR) --------------------------------------------------
/** A scene of the spec a guarded film may not use: the thought cloud (Person "think": the owner, "a cartoonish '?' thought
 *  bubble") and the side-on phone (Phone "hero": on its cut it read as a blurred, tilted phone). The render draws them
 *  safely anyway (no cloud; an upright phone); the lint says it so the spec says what the film shows. */
export const guardSceneProblems = (sc, film) => {
  if (!guardOn(film) || !sc || typeof sc !== 'object') return [];
  const out = [];
  if (sc.type === 'Person' && sc.staging === 'think')
    out.push('THOUGHT_BUBBLE Person "staging": "think" draws a cartoon thought cloud: never from v110 (the owner, 2026-10-19: refined, never cartoonish): "solo" with the worry in the face and the pose (acts: face worried, pose handsHead), or the thing he thinks of as its own picture');
  if (sc.type === 'Phone' && sc.staging === 'hero')
    out.push('PHONE_TILT Phone "staging": "hero" (the side-on reveal) reads as a blurred, tilted phone on its cut: never from v110: "device" or "tilt"');
  return out;
};

// ---- the probe (check.mjs): only the marked things, on a key colour ------------------------------------------------------
/** The probe's field: a pure green no kit object is painted in; a pixel farther than PROBE_TOL (RGB distance) is a thing. */
export const PROBE_KEY = Object.freeze([0, 255, 0]);
export const PROBE_TOL = 110;
/** The probe's subtitle mark: a `px` square of `rgb` in the frame's top left corner while a subtitle line is on screen (SUB_BAND
 *  counts only then); tools/ci/guardreview.py reads it and leaves that corner out of the measurements. */
export const PROBE_MARK = Object.freeze({px: 24, rgb: Object.freeze([255, 0, 255])});

/** Runs of hits: samples [{f, hit}] in frame order every `step` frames -> [{from, to}] (the first and the last hit's frame)
 *  for each run seen across at least `minFrames` (at step 6 and 12 frames: three samples in a row). A run is broken by a
 *  sample without a hit or a gap in the samples. */
export const runsOf = (samples, step, minFrames) => {
  const out = [];
  let cur = null;
  let last = null;
  for (const s of samples) {
    const gap = last !== null && s.f - last > step;
    if (cur && (!s.hit || gap)) {
      if (cur.to - cur.from >= minFrames) out.push(cur);
      cur = null;
    }
    if (s.hit) cur = cur ? {...cur, to: s.f} : {from: s.f, to: s.f};
    last = s.f;
  }
  if (cur && cur.to - cur.from >= minFrames) out.push(cur);
  return out;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(!guardOn('v109-wake-up') && guardOn('v110-gudauri-pass') && guardOn(131) && guardOn('v140-x-en'), 'v110 on, v109 as made');
  ok(!guardOn('v89-rocket-doctor-r1') && !guardOn('demo-gallery'), 'a redo keeps its number; a demo is not a new film');
  // (the numbers against src/tokens.ts: tools/ci/guards.mjs --test, which may read files; this module is in the render bundle)
  // the helpers
  const a = fitSpan(760, 980, WHOLE_STAGE.left, WHOLE_STAGE.right);
  ok(a.w === 880 && a.cx === 540 && a.s < 1, `a 980 car at 760 is fitted (${a.w} at ${a.cx})`);
  const b = fitSpan(300, 400, 100, 980);
  ok(b.w === 400 && b.cx === 300 && b.s === 1, 'a span already inside stays');
  const c = fitSpan(950, 300, 100, 980);
  ok(c.cx === 830 && c.w === 300, 'a span past the right edge slides back in');
  const d = fitWhole({cx: 540, cy: 1200, w: 400, h: 860});
  ok(d.cy + d.h / 2 <= WHOLE_STAGE.bottom && d.cy - d.h / 2 >= WHOLE_STAGE.top, 'a tall phone stays over the band');
  ok(footAbove(1420) === 1370 && footAbove(1290) === 1290 && FOOT_MAX === 1370 && FOOT_CAM === 1340, 'feet over the band');
  // a library scene's camera: a 5 % push about the content box's centre (830) carries FOOT_CAM to under the band's top
  ok(830 + (FOOT_CAM - 830) * 1.05 < SUB_BAND_STAGE.top - 4, 'a 5 % push keeps FOOT_CAM over the band');
  const e = slideInside({x: 700, y: 1300, w: 400, h: 200});
  ok(e.x === 580 && e.y === 1170 && e.w === 400, `a card past the right and the band slides back in, its size kept (${e.x}, ${e.y})`);
  const g = slideInside({x: 0, y: 500, w: 1000, h: 100});
  ok(g.x === 40 && g.y === 500, 'a card wider than the box is centred on it');
  const sam = (str, step = 6) => [...str].map((ch, i) => ({f: i * step, hit: ch === 'x'}));
  ok(runsOf(sam('..xxx.'), 6, 12).length === 1, 'three samples (12 frames apart) are a run');
  ok(runsOf(sam('..xx..'), 6, 12).length === 0 && runsOf(sam('..x...'), 6, 12).length === 0, 'two samples or one (a fast entry or exit) are not');
  ok(JSON.stringify(runsOf(sam('xxx.xxxx'), 6, 12)) === '[{"from":0,"to":12},{"from":24,"to":42}]', 'runs and their frames');
  ok(runsOf([{f: 0, hit: true}, {f: 60, hit: true}], 6, 12).length === 0, 'a gap in the samples breaks a run');
  ok(FAST_S * 30 === 12 && STATIC_MAX_S > FAST_S, 'the timings');
  // the breath, in frame px (frame = -78 + 1.1 * stage): the foot stays over the band, the label's top under the meta bar
  const fy = (y) => -78 + 1.1 * y;
  const foot = BREATH_Y + (fy(FOOT_MAX) - BREATH_Y) * (1 + BREATH);
  const top = BREATH_Y + (fy(LABEL_TOP) - BREATH_Y) * (1 + BREATH);
  ok(foot < SUB_BAND.top && top > 296 + 1, `the breath: a foot over the band ends at frame ${foot.toFixed(1)} (< ${SUB_BAND.top}), the label's top at ${top.toFixed(1)} (> 296)`);
  ok(guardSceneProblems({type: 'Person', staging: 'think', think: 'question'}, 'v110-x').some((l) => /^THOUGHT_BUBBLE/.test(l)), 'the thought cloud is refused from v110');
  ok(guardSceneProblems({type: 'Phone', src: 'x', staging: 'hero'}, 'v111-x').some((l) => /^PHONE_TILT/.test(l)), 'the side-on phone is refused from v110');
  ok(guardSceneProblems({type: 'Person', staging: 'think'}, 'v104-check-panic').length === 0 && guardSceneProblems({type: 'Person', staging: 'solo'}, 'v120-x').length === 0, 'v104 keeps its scenes; a solo person passes');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && process.argv?.[2] === '--test' && /guard\.mjs$/.test(process.argv[1] ?? '')) process.exit(selfTest());
