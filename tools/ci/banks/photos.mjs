// Licensed photos for the stories and the real-object library (phase 2, plan steps 5 and 13), by banks.yml. Wikimedia
// Commons search (its API, no model), the licence and the author read from extmetadata (CC0, public domain, CC BY, CC BY-SA
// only), then Claude Opus 5.5 LOOKS at the thumbnails (one batch request a story or an object) and picks: for a story 5-7
// photos (+ 1-2 detail crops), for an object the one that shows it whole, sharp, modern and with no brand wordmark as the
// subject. Files: public/photos/<id>.jpg + public/photos/photos.json (the stories), public/hero/<id>.png +
// public/hero/hero.json (the objects, background removed by rembg when it is installed; otherwise a white-ground jpg and
// "cutout": false). Every file carries its credit line; nothing without a licence is ever saved.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {budget, recordBank, runBatch} from './common.mjs';
import {NEW_FILE} from './stories.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const UA = 'VinariStudio/1.0 (https://vinari.ge; banks job) node';
export const OK_LICENCE = /^(?:CC0|Public domain|PD\b|PD-|CC BY(?:-SA)? \d)/i;
/** the hero objects (plan step 5): real car parts and papers, black-and-white cut-outs */
export const HERO_OBJECTS = [
  ['instrument-cluster', 'car instrument cluster dashboard'], ['warning-lamps', 'car dashboard warning lights'], ['obd-port', 'OBD-II port car'],
  ['obd-plug', 'OBD-II scanner connector'], ['tyre-sidewall', 'tire sidewall markings'], ['dot-code', 'tire DOT code date'],
  ['car-battery', '12V car battery'], ['wiper-blade', 'windscreen wiper blade'], ['key-fob', 'car key fob'],
  ['windshield-corner', 'windshield sticker corner'], ['odometer', 'car odometer digital'], ['brake-disc', 'car brake disc caliper'],
  ['spark-plug', 'spark plug'], ['oil-dipstick', 'engine oil dipstick'], ['air-filter', 'car air filter'], ['coolant-cap', 'coolant reservoir cap'],
  ['fuel-nozzle', 'fuel pump nozzle'], ['parking-meter', 'parking meter'], ['ev-charger', 'electric vehicle charging connector'], ['jump-leads', 'jumper cables battery'],
];

const commons = async (q, n = 12) => {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${n}&gsrsearch=${encodeURIComponent(q)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600`;
  const r = await fetch(u, {headers: {'User-Agent': UA}});
  if (!r.ok) return [];
  const j = await r.json();
  return Object.values(j?.query?.pages ?? {}).flatMap((p) => {
    const ii = p.imageinfo?.[0];
    const m = ii?.extmetadata ?? {};
    const lic = String(m.LicenseShortName?.value ?? '');
    const author = String(m.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 80);
    if (!ii || !OK_LICENCE.test(lic) || !/\.(jpe?g|png)$/i.test(p.title) || (ii.width ?? 0) < 900) return [];
    return [{title: p.title, page: ii.descriptionurl, thumb: ii.thumburl, url: ii.url, w: ii.thumbwidth, h: ii.thumbheight, license: lic, author: author || 'unknown', desc: String(m.ImageDescription?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 200), date: String(m.DateTimeOriginal?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 20)}];
  });
};
export const creditOf = (c) => `ფოტო: ${c.author} · ${c.license.toUpperCase().replace('PUBLIC DOMAIN', 'PD')} · Wikimedia Commons${/BY/i.test(c.license) ? ' · დამუშავებული' : ''}`;

const pickJob = (id, what, cands, n) => ({
  id,
  system: 'You pick photos for black-and-white films. Return ONLY JSON.',
  user: [
    ...cands.map((c) => ({type: 'image', source: {type: 'url', url: c.thumb}})),
    {type: 'text', text: `The ${cands.length} images above (0-based, in order) are candidates for: ${what}. Pick the best ${n}: sharp, the subject whole and clear, true to the subject (no look-alike), no watermark, no brand wordmark as the subject, no private person's face up close. JSON: {"picks": [{"i": 0, "shows": "<what it shows, one English line>", "subject": [[0.1, 0.1], [0.9, 0.9]]}]}`},
  ],
  max: 4000,
  web: false,
  effort: 'medium',
});

const save = async (c, file) => {
  const r = await fetch(c.thumb, {headers: {'User-Agent': UA}});
  if (!r.ok) return false;
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return true;
};
const lumOf = (file) => {
  try {
    return Number(execFileSync('python3', ['-I', '-c', 'import sys\nfrom PIL import Image, ImageStat\nprint(round(ImageStat.Stat(Image.open(sys.argv[1]).convert("L")).mean[0]/255,2))', file], {encoding: 'utf8'}).trim());
  } catch {
    return 0.5;
  }
};

/** the stories waiting in ci/banks/stories-new.json get 5-7 licensed photos each */
export const runStories = async (client, {maxUsd = 6, log = console.log} = {}) => {
  let neu = {stories: {}};
  try {
    neu = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  } catch {}
  const todo = Object.values(neu.stories ?? {}).filter((s) => (s.photos ?? []).length < 5).slice(0, 60);
  const b = budget(Math.min(maxUsd, todo.length * 0.08 + 0.2), 'photos');
  log(b.why);
  if (!b.ok || !todo.length) return 0;
  const cands = {};
  for (const s of todo) cands[s.id] = (await Promise.all((s.photoQueries ?? [s.title]).slice(0, 3).map((q) => commons(q, 8)))).flat().filter((c, i, a) => a.findIndex((x) => x.url === c.url) === i).slice(0, 16);
  const jobs = todo.filter((s) => cands[s.id].length >= 5).map((s) => pickJob(s.id, `the true story "${s.plot ?? s.title}"`, cands[s.id], 7));
  const {results, usd} = await runBatch(client, jobs, {bank: 'photos pick', log});
  const catFile = path.join(root, 'public', 'photos', 'photos.json');
  const cat = JSON.parse(fs.readFileSync(catFile, 'utf8'));
  let saved = 0;
  for (const s of todo) {
    const picks = (results.get(s.id)?.json?.picks ?? []).filter((p) => cands[s.id][p.i]);
    for (const [k, p] of picks.entries()) {
      const c = cands[s.id][p.i];
      const id = `story-${s.id}-${k + 1}`;
      const file = path.join(root, 'public', 'photos', `${id}.jpg`);
      if (!(await save(c, file))) continue;
      cat[id] = {w: c.w, h: c.h, lum: lumOf(file), shows: String(p.shows ?? c.desc).slice(0, 160), license: c.license, author: c.author, source: c.page, credit: creditOf(c), modified: true, ...(Array.isArray(p.subject) ? {subject: p.subject} : {})};
      s.photos = [...(s.photos ?? []), id];
      saved++;
    }
  }
  fs.writeFileSync(catFile, `${JSON.stringify(cat, null, 1)}\n`);
  fs.writeFileSync(NEW_FILE, `${JSON.stringify(neu, null, 1)}\n`);
  recordBank('photos', 0, saved); // the items only: runBatch recorded every batch and call as it went
  log(`photos: ${saved} saved for ${todo.length} stories`);
  return saved;
};

/** the real-object library: public/hero/<id>.png (cut out) and hero.json */
export const runHero = async (client, {maxUsd = 4, log = console.log} = {}) => {
  const dir = path.join(root, 'public', 'hero');
  fs.mkdirSync(dir, {recursive: true});
  const manFile = path.join(dir, 'hero.json');
  let man = {};
  try {
    man = JSON.parse(fs.readFileSync(manFile, 'utf8'));
  } catch {}
  const todo = HERO_OBJECTS.filter(([id]) => !man[id]);
  const b = budget(Math.min(maxUsd, todo.length * 0.06 + 0.2), 'hero');
  log(b.why);
  if (!b.ok || !todo.length) return 0;
  const cands = {};
  for (const [id, q] of todo) cands[id] = (await commons(q, 12)).slice(0, 10);
  const {results, usd} = await runBatch(client, todo.filter(([id]) => cands[id].length >= 2).map(([id, q]) => pickJob(id, `a modern (2015 or later) ${q}, the object alone and whole`, cands[id], 1)), {bank: 'hero pick', log});
  let saved = 0;
  let rembg = true;
  for (const [id] of todo) {
    const p = results.get(id)?.json?.picks?.[0];
    const c = p && cands[id][p.i];
    if (!c) continue;
    const jpg = path.join(dir, `${id}.jpg`);
    if (!(await save(c, jpg))) continue;
    let file = `${id}.jpg`;
    let cutout = false;
    if (rembg) {
      try {
        execFileSync('python3', ['-I', '-c', 'import sys\nfrom rembg import remove\nfrom PIL import Image\nImage.open(sys.argv[1]) and remove(Image.open(sys.argv[1]).convert("RGB")).convert("LA").save(sys.argv[2])', jpg, path.join(dir, `${id}.png`)], {stdio: 'ignore', timeout: 120_000});
        fs.rmSync(jpg);
        file = `${id}.png`;
        cutout = true;
      } catch {
        rembg = false; // not installed: the rest stay white-ground jpgs, greyscaled at render
      }
    }
    man[id] = {src: `hero/${file}`, license: c.license, author: c.author, source: c.page, credit: creditOf(c), shows: String(p.shows ?? '').slice(0, 160), subject: p.subject ?? [[0.05, 0.05], [0.95, 0.95]], era: 2015, cutout};
    saved++;
  }
  fs.writeFileSync(manFile, `${JSON.stringify(man, null, 1)}\n`);
  recordBank('hero', 0, saved); // the items only: runBatch recorded every batch and call as it went
  log(`hero: ${saved} objects saved (${Object.keys(man).length} in the library)`);
  return saved;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  ok(OK_LICENCE.test('CC BY-SA 4.0') && OK_LICENCE.test('CC0') && OK_LICENCE.test('Public domain') && !OK_LICENCE.test('CC BY-NC 2.0') && !OK_LICENCE.test('Fair use'), 'only CC0, PD, CC BY and CC BY-SA');
  ok(creditOf({author: 'A', license: 'CC BY-SA 4.0'}) === 'ფოტო: A · CC BY-SA 4.0 · Wikimedia Commons · დამუშავებული' && !/დამუშავებული/.test(creditOf({author: 'B', license: 'CC0'})), 'the credit line, marking the change where the licence asks');
  ok(HERO_OBJECTS.length >= 20 && new Set(HERO_OBJECTS.map(([id]) => id)).size === HERO_OBJECTS.length, 'the hero list: 20 distinct objects to start');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
