// What a phase-2 film may no longer use (src/lib/p2.mjs; the films audit: the template told the writer to compose from
// clip-art parts, so every film inherited faces, triangle roads, a driver's-view wheel and flat icons). Nothing is deleted:
// an older film, its redos and its translations import and render them exactly as made. Read by tools/ci/filmlint.mjs
// (a Film file's imports: RETIRED, and RAW_SVG), tools/ci/p2lint.mjs (a spec's scene types: RETIRED) and the brief
// (tools/ci/prompt.mjs: the P2 kit list never names these).
//
//   retiredModule(spec)        why a Film file of a P2 film may not import this module specifier ('' = allowed)
//   retiredScene(scene)        why a P2 spec may not use this scene ('' = allowed)
//   RAW_SVG_MAX                raw <path|rect|circle|polygon|ellipse|line|polyline> a P2 Film file may draw without a kit part
//   RAW_SVG_KIT_MAX            the same beside a kit part (a loop's shape counts 6)
//   P2_FILM_BYTES              a P2 film's Film files together (40 KB: the effort goes into composing kit parts and real assets)
//   node src/lib/retired.mjs --test

const WHY_PEOPLE = 'drawn people and faces are retired from phase 2 (the audit: they read as clip art); a person who must be seen is a sil.tsx silhouette in profile, never a face';
const WHY_ROAD = 'the triangle road, the car ahead and the cabin are retired from phase 2: show the real object (public/hero), a photo full-bleed, or a purpose-built graphic';
const WHY_ICON = 'flat clip-art icons and props are retired from phase 2: a real cut-out object (public/hero) or the app\'s own screen with Ink marks';

/** module specifier (as a Film file writes it) -> why it is retired for a P2 film */
export const RETIRED_MODULES = Object.freeze({
  '../illo/figure': WHY_PEOPLE,
  '../illo/silhead': WHY_PEOPLE,
  '../illo/rig': WHY_PEOPLE,
  '../illo/poses': WHY_PEOPLE,
  '../illo/faces': WHY_PEOPLE,
  '../illo/acting': WHY_PEOPLE,
  '../illo/hand': WHY_PEOPLE,
  '../illo/handset': WHY_PEOPLE,
  '../illo/road': WHY_ROAD,
  '../illo/backdrop': WHY_ROAD,
  '../illo/car': 'the flat drawn car is retired from phase 2: a modern car is a real photo (era 2015+) or the kit\'s refined car',
  '../illo/icons': WHY_ICON,
  '../illo/props': WHY_ICON,
  '../kit/man': WHY_PEOPLE,
  '../kit/woman': WHY_PEOPLE,
  '../kit/her': WHY_PEOPLE,
  '../kit/people': WHY_PEOPLE,
  '../kit/passer': WHY_PEOPLE,
  '../kit/garage': WHY_ROAD,
  '../kit/room': WHY_ROAD,
  '../kit/street': WHY_ROAD,
  '../kit/cockpit': 'the driver\'s-view wheel is retired from phase 2 (the audit)',
  '../kit/cluster': 'the drawn instrument cluster is retired from phase 2: the real cluster photo (public/hero) with Ink marks',
});

/** scene types a P2 spec may not use, and why */
export const RETIRED_SCENES = Object.freeze({
  Drive: WHY_ROAD,
  Windshield: 'the driver\'s view through a drawn windshield is retired from phase 2',
  Person: WHY_PEOPLE,
  Pump: WHY_ICON,
  CarNight: WHY_ROAD,
  Phone: 'the small phone is retired from phase 2: an app beat is ScreenFocus (a whole hero phone, the row lifted), TapTrail (the taps in order) or ScreenDeck',
  // the p2 prove run (2026-10-26, v136-lamp-two): a drawn hand holding a small phone (Call), a Split "wipe" that broke into a
  // small photo on a pole beside an almost black panel, „∞" alone on a blank frame (Title), a red „ცხელა" slam (Impact)
  Call: 'the call screen is a drawn hand holding a small phone, retired from phase 2 (the prove run): a call is a KeywordLift of what was said, or the app\'s own screen',
  Split: 'Split is retired from phase 2 (its wipe broke into a small photo beside an almost black panel in the prove run): before and after is WipeCompare',
  Title: 'a bare Title (a lone word or glyph on blank paper: the prove run\'s „∞") is retired from phase 2: a word is KeywordLift, a claim FreezeTag or KineticHeadline, a number FilmTitleCard or BigNumber',
  Impact: 'the Impact word slam is retired from phase 2 (its tones paint the word red or green over the frame): a slammed word is KeywordLift or ShoutType',
});

export const RAW_SVG_MAX = 40;
/** raw shapes a P2 Film file may draw even beside a kit part (hairlines, a frame, a dot), a shape drawn in a loop counting
 *  6 (the p2 prove run, 2026-10-26: v136's fuel cap, cylinders and catalyst grid were hand-drawn diagrams beside Ink) */
export const RAW_SVG_KIT_MAX = 16;
export const P2_FILM_BYTES = 40 * 1024;

export const retiredModule = (spec) => RETIRED_MODULES[String(spec ?? '')] ?? '';
/** a scene: the 16:9 photo band on blank paper is retired too (Photo "mode": "frame" whose picture does not fill the frame
 *  is the clean-field band; a P2 photo bleeds) */
export const retiredScene = (scene) => {
  const t = String(scene?.type ?? '');
  if (RETIRED_SCENES[t]) return RETIRED_SCENES[t];
  if (t === 'Photo' && scene?.mode === 'frame') return 'the 16:9 photo band on blank paper is retired from phase 2: a photo bleeds ("mode": "bleed") with marks on it, or sits in a composed card (WipeCompare, a story card)';
  return '';
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(retiredModule('../illo/figure') && retiredModule('../kit/cockpit') && retiredModule('../illo/road'), 'figure, cockpit and road are retired');
  ok(!retiredModule('../illo/sil') && !retiredModule('../kit/sil/sil'), 'sil.tsx silhouettes stay (profile, never a face)');
  ok(!retiredModule('../kit/ink') && !retiredModule('../kit/p2') && !retiredModule('../kit/callout') && !retiredModule('../Receipt'), 'the P2 kit is allowed');
  ok(retiredScene({type: 'Drive'}) && retiredScene({type: 'Person'}) && retiredScene({type: 'Phone'}), 'Drive, Person and the small Phone are retired scenes');
  ok(retiredScene({type: 'Photo', mode: 'frame'}) && !retiredScene({type: 'Photo', mode: 'bleed'}), 'the photo band is retired, the full bleed stays');
  ok(!retiredScene({type: 'ScreenFocus'}) && !retiredScene({type: 'FilmTitleCard'}), 'the P2 scenes are allowed');
  ok(['Call', 'Split', 'Title', 'Impact'].every((t) => retiredScene({type: t})), 'the prove run\'s Call, Split, Title and Impact are retired scenes');
  ok(!retiredScene({type: 'WipeCompare'}) && !retiredScene({type: 'KeywordLift'}) && !retiredScene({type: 'KineticHeadline'}), 'their P2 replacements stay');
  ok(P2_FILM_BYTES === 40960 && RAW_SVG_MAX === 40, 'the limits');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /retired\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
