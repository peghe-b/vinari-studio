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

// THE PEOPLE ARE BACK (the owner, 2026-10-29: „სტუდიაში ჩასვი ისევ ანიმაციები... მაგ ანიმაციებმა წამოიღო მრავალი ნახვა“): the drawn
// people with faces and acting, their hands and phones, the street, garage, room, road and cockpit, and the scenes Person, Drive,
// Windshield, CarNight, Call and Chat are allowed in phase 2 again. Still retired: the flat drawn car, clip-art icons and props, the
// drawn cluster, Pump, the small Phone, Split, a bare Title, Impact.
/** module specifier (as a Film file writes it) -> why it is retired for a P2 film */
export const RETIRED_MODULES = Object.freeze({
  '../illo/car': 'the flat drawn car is retired from phase 2: a modern car is a real photo (era 2015+) or the kit\'s refined car',
  '../illo/icons': WHY_ICON,
  '../illo/props': WHY_ICON,
  '../kit/cluster': 'the drawn instrument cluster is retired from phase 2: the real cluster photo (public/hero) with Ink marks',
});

/** scene types a P2 spec may not use, and why */
export const RETIRED_SCENES = Object.freeze({
  Pump: WHY_ICON,
  Phone: 'the small phone is retired from phase 2: an app beat is ScreenFocus (a whole hero phone, the row lifted), TapTrail (the taps in order) or ScreenDeck',
  // the p2 prove run (2026-10-26, v136-lamp-two): a drawn hand holding a small phone (Call), a Split "wipe" that broke into a
  // small photo on a pole beside an almost black panel, „∞" alone on a blank frame (Title), a red „ცხელა" slam (Impact)
  Split: 'Split is retired from phase 2 (its wipe broke into a small photo beside an almost black panel in the prove run): before and after is WipeCompare',
  Title: 'a bare Title (a lone word or glyph on blank paper: the prove run\'s „∞") is retired from phase 2: a word is KeywordLift, a claim FreezeTag or KineticHeadline, a number FilmTitleCard or BigNumber',
  Impact: 'the Impact word slam is retired from phase 2 (its tones paint the word red or green over the frame): a slammed word is KeywordLift or ShoutType',
  // the r3 verify (2026-10-27): Chat draws AvatarHead faces in its header and bubbles, and a drawn hand holding the phone
});

/** names a P2 Film file may not import from a module that stays (the r3 verify, 2026-10-27): RollNumber is a continuous
 *  strip, so mid-roll two half digits share one cell; P2's RollDigits (../kit/p2, "from") rolls cell by cell */
export const RETIRED_NAMES = Object.freeze({
  '../kit/motion': Object.freeze({RollNumber: 'RollNumber rolls a continuous strip: mid-roll two half digits share one cell, retired from phase 2: a number rolls with RollDigits from ../kit/p2 (text, from, at, size): each cell a blank or a glyph of the old or the new value'}),
});
export const retiredName = (spec, name) => RETIRED_NAMES[String(spec ?? '')]?.[String(name ?? '')] ?? '';

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
  ok(!retiredModule('../illo/figure') && !retiredModule('../kit/cockpit') && !retiredModule('../illo/road') && !retiredModule('../kit/people') && retiredModule('../illo/car') && retiredModule('../illo/icons'), 'the people and their streets are back (the owner, 2026-10-29); the flat car and clip-art icons stay retired');
  ok(!retiredModule('../illo/sil') && !retiredModule('../kit/sil/sil'), 'sil.tsx people stay (with faces again)');
  ok(!retiredModule('../kit/ink') && !retiredModule('../kit/p2') && !retiredModule('../kit/callout') && !retiredModule('../Receipt'), 'the P2 kit is allowed');
  ok(!retiredScene({type: 'Drive'}) && !retiredScene({type: 'Person'}) && !retiredScene({type: 'CarNight'}) && retiredScene({type: 'Phone'}), 'Drive, Person and CarNight are back; the small Phone stays retired');
  ok(retiredScene({type: 'Photo', mode: 'frame'}) && !retiredScene({type: 'Photo', mode: 'bleed'}), 'the photo band is retired, the full bleed stays');
  ok(!retiredScene({type: 'ScreenFocus'}) && !retiredScene({type: 'FilmTitleCard'}), 'the P2 scenes are allowed');
  ok(['Split', 'Title', 'Impact'].every((t) => retiredScene({type: t})) && !retiredScene({type: 'Call'}), 'Split, Title and Impact stay retired; Call is back');
  ok(!retiredScene({type: 'WipeCompare'}) && !retiredScene({type: 'KeywordLift'}) && !retiredScene({type: 'KineticHeadline'}), 'their P2 replacements stay');
  ok(P2_FILM_BYTES === 40960 && RAW_SVG_MAX === 40, 'the limits');
  ok(!retiredScene({type: 'Chat'}), 'Chat (faces, a hand) is back');
  ok(retiredName('../kit/motion', 'RollNumber') && !retiredName('../kit/motion', 'MaskUp') && !retiredName('../kit/p2', 'RollDigits'), 'RollNumber is retired from P2 Films; MaskUp and RollDigits stay');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /retired\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
