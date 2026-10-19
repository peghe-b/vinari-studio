// The studio's promo-grade upgrade (the owner, 2026-10-19: "every studio film must be as powerful as the promos"), shared by
// the render (src/scenes/common.tsx) and the tools (tools/ci/screentext.mjs, tools/check.mjs, tools/ci/filmlint.mjs,
// tools/build-index.mjs). From film KIT_FROM on:
//   - a Film scene may compose the promo kit (src/scenes/kit/: the 3D phone and car, the garage, the street, the rooms, the
//     silhouette people, the reveal, the step-by-step explainer, the text motion, the charts, the app's icons);
//   - the pace is the promos': a new picture every 1.5 to 2.5 s (MIN_SCENES_KIT);
//   - the pencil sounds and the room tone are silent (the owner: no pencil sounds, no pen strokes, no room tone);
//   - check.mjs reviews the stills themselves (STILL_REPEAT against the page's earlier films, EDGE_CUT); filmlint refuses text
//     under 34 px and strokes under 3 px;
//   - a film may say the free-week line now and then (ci/endings.json "freeWeek").
// Every earlier film, a redo of one and its translations render and check exactly as they were made.
//
//   kitOn(film)   true when the film `film` (its id, or its number from filmKey) is made with all that
//   node src/lib/kit.mjs --test   the self-test
import {filmKey} from '../scenes/illo/wardrobe.mjs';

export const KIT_FROM = 110; // v109-wake-up was the last film made before the upgrade
/** scenes a film at least, by length: the promos' pace (a new picture every 1.5 to 2.5 s; "cuts" count) */
export const MIN_SCENES_KIT = Object.freeze({15: 7, 20: 9, 30: 13, 45: 19, 60: 25});

export const kitOn = (film) => {
  const n = typeof film === 'number' ? film : filmKey(film);
  return Number.isFinite(n) && n >= KIT_FROM && n < 100000;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(!kitOn('v109-wake-up'), 'v109 renders as made');
  ok(kitOn('v110-anything') && kitOn(110) && kitOn('v131-x-en'), 'v110 on, a number, a translation');
  ok(!kitOn('v89-rocket-doctor-r1'), 'a redo keeps its original number');
  ok(!kitOn('demo-gallery'), 'a demo without a number is not a new film');
  ok(MIN_SCENES_KIT[20] === 9 && MIN_SCENES_KIT[60] === 25, 'the pace table');
  ok(Object.entries(MIN_SCENES_KIT).every(([s, n]) => Number(s) / n >= 1.5 && Number(s) / n <= 2.5), 'a picture every 1.5 to 2.5 s at every length');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && process.argv?.[2] === '--test' && /kit\.mjs$/.test(process.argv[1] ?? '')) process.exit(selfTest());
