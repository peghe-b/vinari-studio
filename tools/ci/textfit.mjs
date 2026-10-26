// The text-fit lint's command line (src/lib/textfit.mjs does the measuring; the render, filmlint, p2lint and the cover share it).
//   node tools/ci/textfit.mjs "<text>" [px] [weight]    the width of one line, Mtavruli as set
//   node tools/ci/textfit.mjs --test                    the self-test
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fitLines, maxWFor, sizeFor, textW, toMtav} from '../../src/lib/textfit.mjs';
import {P2_TEXT_W} from '../../src/lib/p2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const selfTest = async () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  // the table is the fonts' own: a font file changed without a rebuild fails here
  const {default: t} = await import('../../src/data/textw.mjs');
  const stale = Object.entries(t.fonts).filter(([f, h]) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'public/fonts', f))).digest('hex').slice(0, 16) !== h);
  ok(!stale.length, `textw.mjs matches the font files${stale.length ? ` (rebuild: python3 tools/textfit-build.py; ${stale.map(([f]) => f).join(', ')})` : ''}`);
  const long = 'გამარჯვებული';
  const w360 = textW(long, 360, {mtav: true, weight: 700});
  ok(w360 > P2_TEXT_W, `„${toMtav(long)}" at 360 px is ${Math.round(w360)} px: too wide`);
  const f = fitLines(long, P2_TEXT_W, 1, 360, {mtav: true, weight: 700});
  ok(f.fits && textW(f.lines[0], f.size, {mtav: true, weight: 700}) <= P2_TEXT_W && f.size >= 100, `fitLines sets it at ${f.size} px, one line inside 860`);
  const arsad = sizeFor('არსად', P2_TEXT_W, 360, {mtav: true, weight: 700});
  ok(arsad === 360 || textW('არსად', arsad, {mtav: true}) <= P2_TEXT_W, `the v131 „ᲐᲠᲡᲐᲓ" fits (${arsad} px)`);
  const two = fitLines('ჩამოყვანა რას დაგიჯდება სინამდვილეში', P2_TEXT_W, 2, 200, {mtav: true, weight: 700});
  ok(two.fits && two.lines.length <= 2, `a headline breaks into ${two.lines.length} lines at ${two.size} px`);
  ok(maxWFor(0.1) < P2_TEXT_W && maxWFor(0) === P2_TEXT_W, 'the camera zoom shrinks the limit');
  ok(textW('ა', 100, {weight: 700}) > textW('ა', 100, {weight: 400}) || textW('Ა', 100, {weight: 700, mtav: false}) > textW('Ა', 100, {weight: 400}), 'bold is wider than regular');
  ok(Math.abs(textW('ab', 100, {weight: 400}) - textW('ab', 50, {weight: 400}) * 2) < 1e-6, 'the width scales with the size');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(await selfTest());
  const [text, px = '100', weight = '700'] = process.argv.slice(2);
  if (text) console.log(`${toMtav(text)}: ${Math.round(textW(text, Number(px), {mtav: true, weight: Number(weight)}))} px at ${px} px`);
}
