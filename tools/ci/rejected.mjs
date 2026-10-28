// A film the studio stopped (the r1 car film, 2026-10-27: the final art director failed v135-belt-fine "crafted 0" after the
// voice and the render, and nothing was kept: no video, no sheet, no fixes, no spec; a judge could not see one frame). When the
// film gate or the final art director stops a film, studio.yml stages what there is into one folder and uploads it as the
// 2-day artifact "rejected-<id>": never video.mp4, cover.png or post.json, the names the site reads, so the site never shows
// it and nothing is published or committed.
//   video.mp4            out/<id>.mp4 (the final art director's stop only: the gate's stop has no render)
//   ad-sheet.png         the final art director's 1-frame-a-second sheet ($RUNNER_TEMP/ad-sheet.png)
//   gate-sheet.png       the check's sheet, one settled frame a shot (out/<id>.sheet.png)
//   judge-keys.png, judge.json   the judge's key frames of the last look and its rounds: codes, seconds, shots, notes, the
//                        outcome (tools/ci/judge.mjs, r3-judge; ad-sheet.png is then the judge's last sheet)
//   artdirector.json     out/ci/artdirector-<id>.json: every look, its scores and its fixes by shot
//   filmgate.json, check.json   the gate's rounds and the last check's stamp (codes only)
//   spec.json, film/<Name>*.tsx  the writer's spec and its own Film files
//
//   node tools/ci/rejected.mjs <id> <dir> [ad-sheet.png] [judge-keys.png]   stage (prints the count, never a file's content)
//   node tools/ci/rejected.mjs --test
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isOwnFilm} from './visual.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '../..');
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

export const stage = (id, dir, {base = root, adSheet = null, keys = null} = {}) => {
  if (!ID.test(String(id ?? ''))) return [];
  fs.mkdirSync(path.join(dir, 'film'), {recursive: true});
  const got = [];
  const copy = (from, to) => {
    try {
      if (from && fs.statSync(from).isFile()) {
        fs.copyFileSync(from, path.join(dir, to));
        got.push(to);
      }
    } catch {}
  };
  copy(path.join(base, 'out', `${id}.mp4`), 'video.mp4');
  copy(adSheet, 'ad-sheet.png');
  copy(keys, 'judge-keys.png');
  copy(path.join(base, 'out', 'ci', `judge-${id}.json`), 'judge.json');
  copy(path.join(base, 'out', `${id}.sheet.png`), 'gate-sheet.png');
  copy(path.join(base, 'out', 'ci', `artdirector-${id}.json`), 'artdirector.json');
  copy(path.join(base, 'out', 'ci', 'filmgate.json'), 'filmgate.json');
  copy(path.join(base, 'out', 'ci', `check-${id}.json`), 'check.json');
  copy(path.join(base, 'specs', `${id}.json`), 'spec.json');
  const fam = String(id).replace(/-r\d+$/, '');
  let films = [];
  try {
    films = fs.readdirSync(path.join(base, 'src/scenes/film')).filter((f) => f.endsWith('.tsx') && isOwnFilm(f.slice(0, -4), fam));
  } catch {}
  for (const f of films) copy(path.join(base, 'src/scenes/film', f), path.join('film', f));
  return got;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rejected-'));
  const base = path.join(tmp, 'repo');
  for (const d of ['out/ci', 'specs', 'src/scenes/film']) fs.mkdirSync(path.join(base, d), {recursive: true});
  const id = 'v135-belt-fine';
  fs.writeFileSync(path.join(base, 'out', `${id}.mp4`), 'mp4');
  fs.writeFileSync(path.join(base, 'out', `${id}.sheet.png`), 'png');
  fs.writeFileSync(path.join(base, 'out/ci', `artdirector-${id}.json`), '{}');
  fs.writeFileSync(path.join(base, 'specs', `${id}.json`), '{}');
  fs.writeFileSync(path.join(base, 'specs', 'v134-other.json'), '{}');
  fs.writeFileSync(path.join(base, 'src/scenes/film', 'V135BeltFine.tsx'), 'x');
  fs.writeFileSync(path.join(base, 'src/scenes/film', 'V135BeltFineMap.tsx'), 'x');
  fs.writeFileSync(path.join(base, 'src/scenes/film', 'V134Other.tsx'), 'x');
  fs.writeFileSync(path.join(tmp, 'ad.png'), 'png');
  const dir = path.join(tmp, 'stage');
  fs.writeFileSync(path.join(base, 'out/ci', `judge-${id}.json`), '{}');
  fs.writeFileSync(path.join(tmp, 'keys.png'), 'png');
  const got = stage(id, dir, {base, adSheet: path.join(tmp, 'ad.png'), keys: path.join(tmp, 'keys.png')}).sort();
  ok(got.join() === ['ad-sheet.png', 'artdirector.json', 'film/V135BeltFine.tsx', 'film/V135BeltFineMap.tsx', 'gate-sheet.png', 'judge-keys.png', 'judge.json', 'spec.json', 'video.mp4'].sort().join(), `the film's own files only: ${got.join(', ')}`);
  ok(!fs.readdirSync(dir).some((f) => /^(cover\.png|post\.json)$/.test(f)), 'never a name the site reads but video.mp4 inside the zip');
  ok(stage('../etc', path.join(tmp, 'x'), {base}).length === 0, 'a bad id stages nothing');
  fs.rmSync(tmp, {recursive: true, force: true});
  console.log(bad ? `rejected: ${bad} failed` : 'rejected: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const [a, b, c, d] = process.argv.slice(2);
  if (a === '--test') process.exit(selfTest());
  if (!a || !b) {
    console.log('usage: node tools/ci/rejected.mjs <id> <dir> [ad-sheet.png] [judge-keys.png] | --test');
    process.exit(2);
  }
  const got = stage(a, b, {adSheet: c ?? null, keys: d ?? null});
  console.log(`rejected film ${ID.test(a) ? a : '?'}: ${got.length} file${got.length === 1 ? '' : 's'} staged (${got.filter((f) => !f.startsWith('film/')).join(', ') || 'none'})`);
}
