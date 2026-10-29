// The soft gate (repo variable STUDIO_GATE_MODE=soft; the owner 2026-10-28: "the new studio usable this week"). Rounds 3 and 4
// published 1 of 7 test films: the craft lints (p2lint, the look repeats, the pixel guards' polish lines, LENGTH) and the art
// director's score stopped the writer and the film gate again and again, and the writer looped on its own check. Soft:
//   - tools/check.mjs: a craft family is a WARNING (a "SOFT" note), unless one of its lines is real breakage (HARD below);
//   - tools/ci/filmgate.mjs: the art director's "fix"/"fail" buys ONE fix round, then the film goes on with a warning;
//   - studio.yml judge: STUDIO_AD_STOP=0 (the final art director never stops the film).
// What still stops a film: a crop or a word over the frame's edge or the subtitles (HARD), every content rule (locked or
// retired screens, the street words, the ending, the stores card, the free week, facts), a broken spec or build, no video,
// the loudness. Unset or anything else: the strict gate, as before.
//
//   node tools/ci/softgate.mjs --test
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const softOn = (env = process.env) => String(env.STUDIO_GATE_MODE ?? '').trim().toLowerCase() === 'soft';

// real breakage: a thing cut by the frame, a word past the frame's text box, over the subtitles or covered by the picture
export const HARD = ['EDGE_CUT', 'PICTURE_EDGE', 'ROW_CUT', 'TEXT_EDGE', 'TEXT_WIDE', 'TEXT_COVER', 'TEXT_SUB', 'SUB_BAND'];
// and the owner's rules that sit in a craft family: a retired scene, an empty value, a pre-2015 car (modern cars only), one
// narrator, Georgian said right, bars from zero, a real brand or name in a humour character's mouth; a GL transition or a
// physics scene its rules refuse (it may not render)
export const RULES = ['RETIRED', 'PLACEHOLDER', 'OLD_CAR', 'VOICE_HERO', 'YEAR_AGE', 'BARE_ELEKTRO', 'SPEED_UNIT', 'BARS_ZERO', 'HUMOR_REAL', 'NO_TOYOTA'];
const RULE_PREFIX = ['GL_', 'PHYS_'];

/** a problem line's code ("EDGE_CUT 3.2-3.6 s ..." -> EDGE_CUT), or '' */
export const lineCode = (l) => (/^\s*(?:PROBLEM\s+)?([A-Z][A-Z0-9_]*[A-Z0-9])\b/.exec(String(l ?? '')) ?? [])[1] ?? '';
export const isHard = (l) => {
  const c = lineCode(l);
  return HARD.includes(c) || RULES.includes(c) || RULE_PREFIX.some((p) => c.startsWith(p));
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(softOn({STUDIO_GATE_MODE: 'soft'}) && softOn({STUDIO_GATE_MODE: ' Soft '}) && !softOn({}) && !softOn({STUDIO_GATE_MODE: ''}) && !softOn({STUDIO_GATE_MODE: 'strict'}), 'only "soft" turns it on');
  ok(isHard('EDGE_CUT 3.2-3.6 s (shot 4, Photo): the car touches the left edge') && isHard('  PROBLEM TEXT_EDGE 1.0 s') && isHard('SUB_BAND 2-3 s'), 'a crop or a word over the edge is hard');
  ok(!isHard('SHOT_LONG beats[3] 4.2 s') && !isHard('EMPTY_P2 21.6-23.8 s') && !isHard('HUE_TWO shot 3') && !isHard('LENGTH the voiced film is 41.0 s') && !isHard('PICTURE_AGAIN „5W-30"') && !isHard(''), 'the craft lines are soft');
  ok(isHard('OLD_CAR beats[2] a 2009 car') && isHard('GL_TEXT beats[1]') && isHard('HUMOR_REAL beats[3]') && !isHard('HUMOR_OPEN beats[0]'), "the owner's rules stay stops");
  ok(lineCode('EDGE_CUTTER x') === 'EDGE_CUTTER' && !isHard('EDGE_CUTTER x'), 'a longer code is not the hard one');
  console.log(bad ? `softgate: ${bad} failed` : 'softgate: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(selfTest());
  console.log('usage: node tools/ci/softgate.mjs --test');
  process.exit(2);
}
