// The one check of a spec before its film is rendered (the cloud recipe ci/prompt.md runs it, and so can you):
//   node tools/check.mjs <id> [frames...] [--len 15|20|30] [--verbose]
// 1. voice: python3 tools/vo.py <id>. It reads the whole film in ONE Gemini request (a cached film costs none) and
//    says how many requests it made. Out of today's Gemini quota, vo.py reads it with Microsoft's edge-tts and the
//    check says so in one line and goes on (expected: the studio site warned the owner). Only with VO_NO_EDGE=1
//    (the cloud's repo variable STUDIO_NO_EDGE, off by default): one line, "VOICE_QUOTA ხმის დღევანდელი ლიმიტი
//    ამოიწურა", and exit 75. Stop there: no retries, no spec changes.
// 2. lint:  node tools/build-index.mjs <id>. An ERROR stops here.
// 3. one bundle: a still of every scene at 70 % of its length (plus any frames asked for) and the designed
//    cover (composition "<id>-cover", frame 0), half size, in out/stills/.
// 4. ONE contact sheet, out/<id>.sheet.png: labelled tiles in a grid, about 1500 px wide (Pillow). Read that
//    one image instead of every still; the single stills stay in out/stills/ for a closer look.
// Prints the film's length against the target (--len, else env STUDIO_LENGTH), the lint warnings and the sheet.
// Never renders the film (./make.sh <id> does that).
// Env VS_CI=1 (the studio workflow) also fails when "post" or "cover" is missing, when the voice is not the one
// the request asked for, or when the request is not recorded in specs/.studio.json (tools/ci/prompt.mjs --record).
// Before the voice it also compares the film's looks with its category's last films (tools/ci/visual.mjs): a
// VISUAL_REPEAT fails the cloud check (a note on the Mac). And the film's own scene (src/scenes/film/<Name>.tsx,
// tools/ci/filmlint.mjs): every Film scene must pass the lint (FILM lines, everywhere); under VS_CI=1 a new film has
// exactly one Film scene, named after its id (a redo keeps its original's or writes its own), and no other file in
// src/scenes/film/ may change. And the ending (tools/ci/ending.mjs, ci/endings.json): every third film ends on the
// follow reminder, one of the offered lines, and every other film on a closing quote; no reminder anywhere else. ENDING
// lines fail the cloud check (notes on the Mac), before the voice too.
// Runs under tools/lock.sh: one Chrome job at a time on the 8 GB M1.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {endingProblems, loadEndings, taglineOf, vNumber, wantedEnding} from './ci/ending.mjs';
import {lintFilm} from './ci/filmlint.mjs';
import {categoryFilms, FILM_NAME, filmName, filmScenes, repeats, signature, signatureTypes, sigLine} from './ci/visual.mjs';
import {renderOpts} from './platform.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(self));
const CI = process.env.VS_CI === '1';
const rel = (p) => path.relative(root, p);

const args = process.argv.slice(2);
const usage = () => {
  console.error('usage: node tools/check.mjs <id> [frames...] [--len 15|20|30] [--verbose]');
  process.exit(2);
};
let len = process.env.STUDIO_LENGTH || undefined;
let verbose = false;
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--len') len = args[++i];
  else if (a.startsWith('--len=')) len = a.slice(6);
  else if (a === '--verbose' || a === '-v') verbose = true;
  else if (a.startsWith('-')) usage();
  else rest.push(a);
}
const [id, ...frameArgs] = rest;
if (!id || !/^[a-z0-9-]+$/.test(id)) usage();
const extraFrames = frameArgs.map(Number);
if (extraFrames.some((f) => !Number.isInteger(f) || f < 0)) usage();
if (len !== undefined && !/^\d+(\.\d+)?$/.test(String(len))) usage();

if (!process.env.VS_LOCKED) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, ...args], {stdio: 'inherit', env: {...process.env, VS_LOCKED: '1'}});
  if (!r.error) process.exit(r.status ?? 1);
  console.log(`check: tools/lock.sh did not start (${r.error.code}); checking without the lock`);
}

const problems = []; // fatal at the end: the spec is not ready
const notes = [];
const line = (k, v) => console.log(`  ${k.padEnd(7)} ${v}`);
const fail = (msg) => {
  console.log(`\nNOT READY: ${msg}`);
  process.exit(1);
};

// ---- the spec ----------------------------------------------------------------------------------------------
const specsDir = path.join(root, 'specs');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
let specFile = path.join(specsDir, `${id}.json`);
let spec;
if (fs.existsSync(specFile)) {
  try {
    spec = readJson(specFile);
  } catch (e) {
    fail(`specs/${id}.json is not valid JSON: ${e.message}`);
  }
} else {
  // a hook variant or a translation: its file name differs from its id
  for (const f of fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'))) {
    try {
      const s = readJson(path.join(specsDir, f));
      if (s.id === id) [spec, specFile] = [s, path.join(specsDir, f)];
    } catch {}
  }
  if (!spec) fail(`no spec with the id "${id}" in specs/`);
}
console.log(`check ${id}  (${rel(specFile)})`);

// the studio request (written by tools/ci/prompt.mjs in the workflow)
let request = null;
if (CI) {
  try {
    request = readJson(path.join(root, 'out/ci/request.json'));
  } catch {
    problems.push('out/ci/request.json is missing: the workflow runs tools/ci/prompt.mjs before this step');
  }
}
if (len === undefined && request?.length) len = request.length;
const target = len === undefined ? null : Number(len);

// A pinned "geminiModel" (v11 carries one) switches off vo.py's model chain: once that model's free quota is
// gone, the voice step fails although other models still have some. Stopped before any line is voiced.
if (CI && [spec, ...(Array.isArray(spec.beats) ? spec.beats : [])].some((x) => x && typeof x === 'object' && 'geminiModel' in x)) {
  fail('remove "geminiModel" (top level and every beat): in the cloud vo.py picks the model itself, model by model');
}

// The looks (tools/ci/visual.mjs): a film may not stage its category's signature scene as either of the category's
// last 2 films did, nor repeat the whole line of scenes of one of its last 5. Checked before the voice, so a refused
// spec costs no request. In the cloud it stops the check; on the Mac it is a note. A redo keeps its original's looks.
{
  let studioLedger = {};
  try {
    studioLedger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  let cats = [];
  try {
    cats = readJson(path.join(root, 'ci/categories.json')).categories ?? [];
  } catch {}
  const cat = cats.find((c) => c.id === spec.category);
  if (cat && !(CI && request?.base)) {
    const films = categoryFilms(cat.id, specsDir, studioLedger, spec.id.replace(/-r\d+$/, ''));
    const found = repeats(spec, films, signatureTypes(cat));
    if (found.length) {
      found.forEach((l) => console.log(`          ${l}`));
      if (CI) fail('the film repeats a recent look of its category: change the staging (or the scenes) named above, then check again');
      notes.push(`looks: ${found.length} repeat${found.length === 1 ? '' : 's'} of the category's recent films (a failure in the cloud)`);
    } else line('looks', sigLine(signature(spec)));
  }
}

// The film's own scene: the new visual this film designed (CLAUDE.md, Scenes: Film scenes). Before the voice, so a
// refused film costs no request. FILM lines say what to change.
{
  const films = filmScenes(spec);
  const own = filmName(spec.id);
  const out = [];
  const rules = []; // the studio's count rules: fatal in the cloud, notes on the Mac
  let allowed = [own];
  if (request?.base && request.baseId) {
    try {
      allowed = [...filmScenes(readJson(path.join(specsDir, `${request.baseId}.json`))).map((f) => f.name), own];
    } catch {}
  }
  if (CI && request && !request.base) {
    if (films.length !== 1) rules.push(`FILM a new film has exactly ONE Film scene, its new visual for the key moment ({"type": "Film", "name": "${own}"}, src/scenes/film/${own}.tsx): found ${films.length}`);
  }
  for (const f of films) {
    if (!FILM_NAME.test(f.name)) out.push(`FILM beats[${f.i}]: "name" must be a PascalCase name, "${own}" for this film`);
    else {
      if (CI && request && !allowed.includes(f.name)) rules.push(`FILM beats[${f.i}]: "${f.name}" is not this film's: name it "${own}" (src/scenes/film/${own}.tsx)${allowed.length > 1 ? ` or keep the original's "${allowed.slice(0, -1).join('", "')}"` : ''}`);
      (await lintFilm(f.name)).errors.forEach((e) => out.push(e));
    }
  }
  if (CI) {
    // only this film's own file may be written in the run (the original's, the template and every other film stay)
    const st = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'src/scenes/film'], {cwd: root, encoding: 'utf8'});
    for (const l of (st.stdout ?? '').split('\n').filter(Boolean)) {
      const p = l.slice(3).replace(/^"|"$/g, '');
      if (p !== `src/scenes/film/${own}.tsx`) rules.push(`FILM ${p} was changed: only src/scenes/film/${own}.tsx may be written in this run; put it back as it was`);
    }
  }
  if (films.length && !out.length && !rules.length) line('film', films.map((f) => `${f.name} (beat ${f.i}): lint ok`).join(', '));
  [...out, ...rules].forEach((l) => console.log(`          ${l}`));
  if (out.length || (CI && rules.length)) fail('fix the FILM lines above (node tools/ci/filmlint.mjs <Name> checks the file alone), then check again');
  rules.forEach((l) => notes.push(l.replace(/^FILM /, 'film: ')));
}

// The ending (tools/ci/ending.mjs): film number n ends on the follow reminder when ci/endings.json's rule says so (1 in
// 3), on exactly one of the lines the brief offered, and every other film on a creative quote; nothing else in the
// film, the cover or the post asks to follow. A redo keeps its original's ending. Base Georgian specs only (a hook
// variant or a translation copies its base). Before the voice, so a refused spec costs no request.
if (path.basename(specFile) === `${spec.id}.json` && !spec.id.startsWith('demo-') && (spec.lang ?? 'ka') === 'ka' && vNumber(spec.id)) {
  const cfg = loadEndings(root);
  // a redo's original: the request's, or on the Mac the family's first spec
  let baseSpec = null;
  const baseId = request?.base ? request.baseId : /-r\d+$/.test(spec.id) ? spec.id.replace(/-r\d+$/, '') : null;
  if (baseId) {
    try {
      baseSpec = readJson(path.join(specsDir, `${baseId}.json`));
    } catch {}
  }
  const want = ['follow', 'quote'].includes(request?.ending) ? request.ending : wantedEnding(spec.id, {specsDir, cfg, baseSpec});
  const found = endingProblems(spec, {want, cfg, specsDir, baseSpec});
  if (found.length) {
    found.forEach((l) => console.log(`          ${l}`));
    if (CI) fail('fix the ENDING lines above (ci/endings.json has the rule and the lines), then check again');
    notes.push(`ending: ${found.length} problem${found.length === 1 ? '' : 's'} (a failure in the cloud)`);
  } else line('ending', want === 'follow' ? `the follow reminder: "${taglineOf(spec).replace(/\s*\|\s*/g, ' ')}"` : 'a closing quote');
}

// ---- 1. voice ------------------------------------------------------------------------------------------------
const cacheDir = process.env.VO_CACHE || path.join(root, 'tools/.vo_cache');
const cached = () => {
  try {
    return new Set(fs.readdirSync(cacheDir));
  } catch {
    return new Set();
  }
};
const before = cached();
const vo = spawnSync('python3', [path.join(root, 'tools/vo.py'), id], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']});
const fresh = [...cached()].filter((f) => !before.has(f) && !f.endsWith('.tmp'));
const newGemini = fresh.filter((f) => f.endsWith('.gemini.wav')).length;
const newEdge = fresh.filter((f) => f.endsWith('.mp3')).length;
const synthesised = newGemini + newEdge ? `${newGemini} new Gemini clip${newGemini === 1 ? '' : 's'} (free daily quota)${newEdge ? `, ${newEdge} new edge-tts` : ''}` : 'nothing new, all cached';
// vo.py's exit 75 (VOICE_QUOTA_EXIT): every Gemini model is out of today's quota and edge-tts is off (VO_NO_EDGE=1)
if (vo.status === 75) {
  console.log('\nVOICE_QUOTA ხმის დღევანდელი ლიმიტი ამოიწურა (Gemini, every model). Stop now: no retries, no spec changes.');
  process.exit(75);
}
if (vo.status !== 0) {
  if (vo.stdout) console.log(vo.stdout.trim());
  line('voice', synthesised);
  fail(`tools/vo.py failed (exit ${vo.status ?? vo.error?.code}); read its message above`);
}
const voOut = (vo.stdout ?? '').trim().split('\n');
line('voice', `${voOut[0].replace(new RegExp(`^${id}: (voice )?`), '')}; ${synthesised}`);
// every Gemini model out of today's quota: edge-tts read it. Nothing to fix and nothing to retry.
{
  let tl = null;
  try {
    tl = JSON.parse(fs.readFileSync(path.join(process.env.VO_OUT || path.join(root, 'public/vo'), id, 'timeline.json'), 'utf8'));
  } catch {}
  if (String(spec.voice ?? '').startsWith('gemini:') && typeof tl?.voice === 'string' && !tl.voice.startsWith('gemini:')) {
    console.log(`          - Gemini is out of today's free quota: Microsoft's edge-tts (${tl.voice}) reads this film. Expected: carry on as usual, no retries, no line changes to get Gemini back.`);
  }
}
if (verbose) voOut.slice(1).forEach((l) => console.log(`         ${l.trim()}`));

// ---- 2. lint -------------------------------------------------------------------------------------------------
const lint = spawnSync(process.execPath, [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, encoding: 'utf8'});
const mine = `${lint.stderr ?? ''}`
  .split('\n')
  .filter((l) => l.startsWith(`  ${id}: `) || l.startsWith(`skip ${id}:`))
  .map((l) => l.replace(`  ${id}: `, ''));
const errors = mine.filter((l) => l.startsWith('ERROR ') || l.startsWith('skip '));
const warnings = mine.filter((l) => !errors.includes(l));
if (lint.status !== 0 || errors.length) {
  line('lint', `${errors.length || 'an'} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
  [...errors, ...warnings].forEach((l) => console.log(`          - ${l}`));
  if (!errors.length && lint.stderr) console.log(lint.stderr.trim());
  fail('fix the lint errors, then check again');
}
line('lint', warnings.length ? `ok, ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (fix them too)` : 'ok, no warnings');
warnings.forEach((l) => console.log(`          - ${l}`));

// ---- the studio's own rules ----------------------------------------------------------------------------------
const cover = spec.cover && typeof spec.cover === 'object' ? spec.cover : null;
const post = spec.post && typeof spec.post === 'object' ? spec.post : null;
const needs = CI ? problems : notes;
if (!cover?.title) needs.push('no "cover" {title, tag, frame}: every video gets its designed Reels cover (SKILL.md, Cover)');
if (!post) needs.push('no "post" {description, tags}: the text that goes out with the video (SKILL.md, Post text)');
if (CI && request) {
  const want = request.voiceId;
  if (want && spec.voice !== want) problems.push(`"voice" is "${spec.voice}"; the request asked for "${want}"`);
  if (request.baseTheme && spec.theme !== request.baseTheme) problems.push(`"theme" is "${spec.theme}"; a redo keeps its original's look, "${request.baseTheme}"`);
  let ledger = {};
  try {
    ledger = readJson(path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json'));
  } catch {}
  const ownFilm = filmScenes(spec).some((f) => f.name === filmName(id));
  if (ledger[request.req]?.id === id && ownFilm && !ledger[request.req].idea)
    problems.push(`FILM the new visual is not recorded: node tools/ci/prompt.mjs --record ${id} ... --idea "<the new visual in one English line>"`);
  if (ledger[request.req]?.id !== id) problems.push(`the request is not recorded: node tools/ci/prompt.mjs --record ${id} --hook <Hnn> --angle "<the angle, one line>"${ownFilm ? ' --idea "<the new visual, one line>"' : ''}${request.topic || request.base ? '' : ' "<the idea in a few Georgian words>"'}`);
}

// ---- 3. stills -----------------------------------------------------------------------------------------------
const opts = {...renderOpts(), logLevel: 'error'};
// Remotion prints a page's console lines at their own level whatever logLevel says: drop the three.js
// deprecation notes (every Wire3D tab prints one), keep everything else
for (const k of ['log', 'warn', 'info']) {
  const print = console[k].bind(console);
  console[k] = (...a) => (a.some((x) => /THREE\.\w+: This module has been deprecated/.test(String(x))) ? undefined : print(...a));
}
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', opts);
const stillsDir = path.join(root, 'out/stills');
fs.mkdirSync(stillsDir, {recursive: true});
const tiles = [];
let film;
try {
  const composition = await selectComposition({serveUrl, id, ...opts, puppeteerInstance: browser});
  const {fps, durationInFrames} = composition;
  film = durationInFrames / fps;
  const {spec: s, timeline} = composition.props;
  const at = (i) => Math.round(timeline.beats[i].start * fps);
  const scenes = s.beats.map((b, i) => (b.scene || i === 0 ? {i, type: (b.scene ?? {}).type ?? '?', start: at(i)} : null)).filter(Boolean);
  scenes.forEach((sc, k) => {
    sc.end = k + 1 < scenes.length ? scenes[k + 1].start : durationInFrames;
    sc.frame = Math.round(sc.start + (sc.end - sc.start) * 0.7);
  });
  const shots = [
    ...scenes.map((sc, k) => ({frame: sc.frame, label: `${k + 1} ${sc.type}  ${(sc.frame / fps).toFixed(1)}s  (${((sc.end - sc.start) / fps).toFixed(1)}s long)`})),
    ...extraFrames.filter((f) => f < durationInFrames).map((f) => ({frame: f, label: `frame ${f}  ${(f / fps).toFixed(1)}s`})),
  ];
  for (const shot of shots) {
    const output = path.join(stillsDir, `${id}-${shot.frame}.png`);
    await renderStill({serveUrl, composition, frame: shot.frame, output, scale: 0.5, ...opts, puppeteerInstance: browser});
    tiles.push({path: output, label: shot.label});
  }
  try {
    const coverComp = await selectComposition({serveUrl, id: `${id}-cover`, ...opts, puppeteerInstance: browser});
    const output = path.join(stillsDir, `${id}-cover.png`);
    await renderStill({serveUrl, composition: coverComp, frame: 0, output, scale: 0.5, ...opts, puppeteerInstance: browser});
    tiles.push({path: output, label: `cover  frame ${cover?.frame ?? 'auto'}  (dashes: 3:4 grid)`, grid: true});
  } catch (e) {
    problems.push(`the cover did not render: ${String(e.message ?? e).split('\n')[0]}`);
  }
} catch (e) {
  fail(`the stills did not render: ${String(e.message ?? e).split('\n')[0]}`);
} finally {
  await browser.close({silent: true}).catch(() => {});
}

// ---- length --------------------------------------------------------------------------------------------------
let lengthLine = `film ${film.toFixed(1)} s`;
if (target) {
  if (film > target + 1) lengthLine += `; target ${target} s: TOO LONG by ${(film - target).toFixed(1)} s, cut words (never the speed)`;
  else if (film < target * 0.8) lengthLine += `; target ${target} s: short by ${(target - film).toFixed(1)} s, add a few words or a beat`;
  else lengthLine += `; target ${target} s: ok`;
} else lengthLine += ` (no target: --len 15|20|30)`;
line('length', lengthLine);
if (cover) line('cover', `"${cover.title ?? '(the first spoken line)'}" · tag "${cover.tag ?? '(the first meta label)'}" · frame ${cover.frame ?? 'auto'}`);
if (post) line('post', `${post.description ?? ''}  ${(post.tags ?? []).join(' ')}`);

// ---- 4. the contact sheet ------------------------------------------------------------------------------------
const sheet = path.join(root, `out/${id}.sheet.png`);
const n = tiles.length;
const cols = n <= 4 ? n : n <= 8 ? 4 : 5;
const tw = cols <= 4 ? 360 : 288;
const header = `${id}  ·  ${spec.theme ?? 'dark'}  ·  ${spec.voice ?? 'no voice'}  ·  film ${film.toFixed(1)} s${target ? ` / target ${target} s` : ''}  ·  dashes: Reels UI below`;
const postLine = post ? `${(post.tags ?? []).join(' ')}   ${post.description ?? ''}` : 'no post text';
const PIL = String.raw`
import json, sys
from PIL import Image, ImageDraw, ImageFont
a = json.load(sys.stdin)
tw, cols = a["tw"], a["cols"]
th = tw * 16 // 9
gap, lbl, pad, head = 12, 28, 16, 64
rows = (len(a["tiles"]) + cols - 1) // cols
W = pad * 2 + cols * tw + (cols - 1) * gap
H = head + rows * (lbl + th) + (rows - 1) * gap + pad
def font(p, size):
    try:
        return ImageFont.truetype(p, size)
    except Exception:
        return ImageFont.load_default()
mono, geo, small = font(a["mono"], 17), font(a["geo"], 17), font(a["mono"], 15)
img = Image.new("RGB", (W, H), (92, 92, 96))
d = ImageDraw.Draw(img)
d.text((pad, 10), a["header"], font=mono, fill=(250, 250, 250))
txt = a["post"]
while len(txt) > 8 and d.textlength(txt, font=geo) > W - 2 * pad:
    txt = txt[:-2]
if txt != a["post"]:
    txt = txt.rstrip() + "…"
d.text((pad, 34), txt, font=geo, fill=(225, 225, 230))
for k, t in enumerate(a["tiles"]):
    r, c = divmod(k, cols)
    x, y = pad + c * (tw + gap), head + r * (lbl + th + gap)
    d.text((x, y + 6), t["label"], font=small, fill=(250, 250, 250))
    tile = Image.open(t["path"]).convert("RGB").resize((tw, th), Image.LANCZOS)
    img.paste(tile, (x, y + lbl))
    d.rectangle([x - 1, y + lbl - 1, x + tw, y + lbl + th], outline=(30, 30, 32))
    # dashes: the cover's 3:4 profile-grid crop, or a scene's Reels safe bottom (the app's UI covers what is below)
    for fy in (240, 1680) if t.get("grid") else (1500,):
        yy = y + lbl + round(th * fy / 1920)
        for xx in range(x, x + tw, 12):
            d.line([(xx, yy), (min(xx + 6, x + tw - 1), yy)], fill=(128, 128, 128), width=1)
img.save(a["out"], optimize=True)
print("%dx%d" % (W, H))
`;
const job = {
  out: sheet,
  tw,
  cols,
  tiles,
  header,
  post: postLine,
  mono: path.join(root, 'public/fonts/DejaVuSansMono.ttf'),
  geo: path.join(root, 'public/fonts/FiraGO-Regular.otf'),
};
const py = spawnSync('python3', ['-c', PIL], {input: JSON.stringify(job), encoding: 'utf8'});
const stills = tiles.filter((t) => !t.grid).length;
if (py.status === 0) line('sheet', `${rel(sheet)}  (${py.stdout.trim()}, ${stills} stills${stills < n ? ' + cover' : ''}; single stills in out/stills/${id}-*.png)`);
else {
  const why = /No module named ['"]?PIL/.test(py.stderr ?? '') ? 'Pillow is missing (python3 -m pip install pillow)' : (py.stderr ?? '').trim().split('\n').pop();
  line('sheet', `none: ${why}. Read the stills instead:`);
  tiles.forEach((t) => console.log(`          ${rel(t.path)}  ${t.label}`));
}

for (const x of notes) line('note', x);
if (problems.length) {
  problems.forEach((x) => console.log(`  PROBLEM ${x}`));
  fail(`${problems.length} problem${problems.length === 1 ? '' : 's'} above`);
}
console.log('\nready to render (the workflow, or ./make.sh on the Mac, renders the film)');
