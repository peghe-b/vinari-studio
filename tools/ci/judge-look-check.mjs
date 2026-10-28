// p2-check's [judge-look] proof (r3-judge): what the judge's looks must have seen on the story fixture, rendered broken (its
// components before the r3 fix: the WhoCard credit cut at "· Wikin", the DocCard stamp past its box) and fixed. Reads the
// verdict files `node tools/ci/judge.mjs look ...` wrote and prints one line each; exit 1 when an expectation is missed.
//   broken (API)     a COUNTED TECH_TEXT_CUT in shot 1 (WhoCard) and in shot 7 (DocCard)
//   fixed (API)      no counted TECH_TEXT_CUT in shot 1 or shot 7
//   both             nothing counted (a cut, an empty frame, a crop) in the first 1.2 s of shots 3 (Versus) and 4 (Standings):
//                    the entrances where a sheet tile catches a blank card or a half-typed name
//   broken (token)   a review at all (the Agent SDK route with images)
//
//   node tools/ci/judge-look-check.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'out/judge-look';
const read = (f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  } catch {
    return null;
  }
};
let bad = 0;
const line = (good, what) => {
  if (!good) bad++;
  console.log(`- ${good ? 'ok' : 'MISSED'}: ${what}`);
};
const MOTION = new Set(['TECH_TEXT_CUT', 'ART_EMPTY', 'ART_CROPPED']);
const inShot = (r, i, k) => {
  const s = r.shots.find((x) => x.k === k);
  return i.shot === k || (s && i.at !== null && i.at >= s.from - 0.3 && i.at <= s.to + 0.3);
};
const cutIn = (r, k) => r.issues.some((i) => i.counts && i.code === 'TECH_TEXT_CUT' && inShot(r, i, k));
const entrance = (r) =>
  r.issues.filter((i) => i.counts && MOTION.has(i.code) && i.at !== null && [3, 4].some((k) => {
    const s = r.shots.find((x) => x.k === k);
    return s && i.at >= s.from && i.at <= s.from + 1.2;
  }));
const summary = (r) => (r.skip ? `no review (${r.skip})` : `${r.engine}, ${r.looks} look(s), $${Number(r.usd ?? 0).toFixed(2)}, ${r.min} min: ${r.j.verdict} art ${r.j.art}/12; counted ${r.issues.filter((i) => i.counts).map((i) => `${i.code}@${i.at ?? '-'}(${i.seen ?? '?'})`).join(' ') || 'none'}; doubts ${r.doubt.map((i) => `${i.code}@${i.at ?? '-'}`).join(' ') || 'none'}`);

console.log('### the judge\'s eye on the story fixture');
const broken = read('broken.api.json');
const fixed = read('fixed.api.json');
const token = read('broken.token.json');
for (const [name, r] of [['broken, API', broken], ['fixed, API', fixed], ['broken, token', token]]) console.log(`- ${name}: ${r ? summary(r) : 'no verdict file'}`);
line(broken && !broken.skip && cutIn(broken, 1), 'broken: the WhoCard credit cut (shot 1) is seen');
line(broken && !broken.skip && cutIn(broken, 7), 'broken: the DocCard stamp past its box (shot 7) is seen');
line(fixed && !fixed.skip && !cutIn(fixed, 1) && !cutIn(fixed, 7), 'fixed: no cut in the WhoCard or the DocCard');
for (const [name, r] of [['broken', broken], ['fixed', fixed]]) {
  const e = r && !r.skip ? entrance(r) : null;
  line(e !== null && e.length === 0, `${name}: nothing counted on the Versus and Standings entrances (motion)${e?.length ? `: ${e.map((i) => `${i.code}@${i.at}`).join(' ')}` : ''}`);
}
line(token && !token.skip, 'the Claude token route (the Agent SDK, images, no tools) answers');
console.log(bad ? `judge-look: ${bad} missed` : 'judge-look: all seen as expected');
process.exit(bad ? 1 : 0);
