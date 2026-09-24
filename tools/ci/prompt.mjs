// The studio workflow's brief for the cloud Claude (the "script" step), and its ledger writer.
//
//   node tools/ci/prompt.mjs > prompt.txt
//     Reads the request from env, checks it and prints ci/prompt.md filled in. Also writes the checked request
//     to out/ci/request.json, which tools/check.mjs (VS_CI=1) and --record read.
//     env STUDIO_REQ       required, the site's request id: r-<6..12 [0-9a-z]>-<4..8 [0-9a-z]>
//         STUDIO_TOPIC     optional, at most 300 characters; empty = Claude picks an idea no video covers yet
//         STUDIO_LENGTH    15 | 20 | 30 (default 20)
//         STUDIO_VOICE     m | f (default m): m = gemini:Algieba, f = gemini:Achernar
//         STUDIO_MOOD      calm | normal | wild (default normal)
//         STUDIO_FEEDBACK  optional, at most 300 characters: what to change in a redo (needs STUDIO_BASE)
//         STUDIO_BASE      optional, the request id of the video being redone (specs/.studio.json knows its spec)
//
//   node tools/ci/prompt.mjs --record <id> ["<the idea picked, a few words>"]
//     The cloud Claude runs this after writing specs/<id>.json: specs/.studio.json[req] = {id, topic, base, at}.
//     The topic is the co-founder's own words; for a redo, its original's; for an empty topic, the idea Claude
//     picked (then required). A redo also takes its original's place in specs/.themes.json, so the looks keep
//     alternating in the order the videos are posted (tools/next-theme.mjs would append it at the end).
//
// Exit 2: a bad request (the message names the field). Exit 3: the video to redo is not in specs/.studio.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const specsDir = path.join(root, 'specs');
const studioFile = path.join(specsDir, '.studio.json');
const themesFile = path.join(specsDir, '.themes.json');
const requestFile = path.join(root, 'out/ci/request.json');

const REQ = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;
const ID = /^[a-z0-9-]+$/;
const MAX_TEXT = 300;
const VOICES = {m: 'gemini:Algieba', f: 'gemini:Achernar'};
const LETTERS = {15: 150, 20: 210, 30: 310};
const MOODS = {
  calm: 'A clear, warm hook: a plain question or an everyday moment (H03, H10, H11), unhurried and kind, no joke.',
  normal: 'The house default: the best-scoring hook, from any formula.',
  wild: 'Playful, even silly, but true (HOOKS.md H14): a funny everyday moment or the car talking, proved by the next beat with a real screen or a fact from SKILL.md §1. Still calm: no "!", no slang spelling, never laughing at a person.',
};

const die = (code, msg) => {
  process.stderr.write(`prompt: ${msg}\n`);
  process.exit(code);
};
const readJson = (f, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeAtomic = (f, body) => {
  fs.mkdirSync(path.dirname(f), {recursive: true});
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, f);
};
// What the co-founder typed, made into one plain line of data: no control or bidi characters, no line
// breaks, and nothing that looks like the prompt's own DATA markers.
const clean = (s) =>
  String(s ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g, ' ')
    .replace(/<<<|>>>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const text = (name, value) => {
  const v = clean(value);
  if ([...v].length > MAX_TEXT) die(2, `${name} is ${[...v].length} characters; ${MAX_TEXT} at most`);
  return v;
};
const choice = (name, value, allowed, fallback) => {
  const v = String(value ?? '').trim() || fallback;
  if (!allowed.includes(v)) die(2, `${name} is "${String(value).slice(0, 40)}"; one of ${allowed.join(', ')}`);
  return v;
};
const vNumber = (id) => Number(/^v(\d+)-/.exec(id)?.[1] ?? 0);

// ---- --record ------------------------------------------------------------------------------------------------
if (process.argv[2] === '--record') {
  const [, , , id, ...ideaWords] = process.argv;
  const request = readJson(requestFile, null);
  if (!request?.req) die(2, `no request in ${path.relative(root, requestFile)}: the workflow runs "node tools/ci/prompt.mjs" first`);
  if (!id || !ID.test(id)) die(2, 'usage: node tools/ci/prompt.mjs --record <id> ["<the idea picked>"]');
  const spec = readJson(path.join(specsDir, `${id}.json`), null);
  if (!spec) die(2, `specs/${id}.json is missing or not valid JSON; write the spec first`);
  if (spec.id !== id) die(2, `specs/${id}.json says "id": "${spec.id}"; it must be "${id}"`);
  if (request.id && id !== request.id) die(2, `this redo's id is "${request.id}", not "${id}"`);
  if (!request.id && request.next && !id.startsWith(request.next)) die(2, `a new video's id starts with "${request.next}" (the next free number), not "${id}"`);
  const idea = text('the idea', ideaWords.join(' '));
  const topic = request.topic || request.baseTopic || idea;
  if (!topic) die(2, `the topic was empty: say which idea you picked: node tools/ci/prompt.mjs --record ${id} "<the idea in a few Georgian words>"`);

  const studio = readJson(studioFile, {});
  const owner = Object.entries(studio).find(([k, v]) => v?.id === id && k !== request.req);
  if (owner) die(2, `${id} already belongs to the request ${owner[0]}; pick another slug`);
  studio[request.req] = {id, topic, base: request.base || null, at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')};
  const rows = Object.entries(studio).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  writeAtomic(studioFile, rows.length ? `{\n${rows.join(',\n')}\n}\n` : '{}\n');
  let where = '';
  if (request.base) where = placeRedo(id, spec.theme, request.baseId);
  process.stdout.write(`recorded ${request.req}: ${id} (${topic})${where}\n`);
  process.exit(0);
}

// A redo goes right after its original (and the original's earlier redos) in the looks ledger, with the
// original's look. Written the way tools/next-theme.mjs writes it, under its lock.
function placeRedo(id, theme, baseId) {
  const lockDir = path.join(specsDir, '.themes.lock');
  for (let i = 0; ; i++) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch {
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > 30000) fs.rmSync(lockDir, {recursive: true, force: true});
      } catch {}
      if (i > 200) return '; the looks ledger is locked, left as it is';
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try {
    const ledger = readJson(themesFile, null);
    if (!ledger || !Array.isArray(ledger.videos)) return '; no looks ledger to place it in';
    if (ledger.videos.some((v) => v.id === id)) return '';
    const rootId = String(baseId).replace(/-r\d+$/, '');
    const family = new RegExp(`^${rootId}(?:-r\\d+)?$`);
    let at = -1;
    ledger.videos.forEach((v, i) => family.test(v.id) && (at = i));
    if (at < 0) return `; ${rootId} is not in the looks ledger, left as it is`;
    ledger.videos.splice(at + 1, 0, {id, theme: theme === 'light' ? 'light' : 'dark'});
    const body = [
      '{',
      `  "about": ${JSON.stringify(ledger.about ?? '')},`,
      '  "videos": [',
      ledger.videos.map((v) => `    ${JSON.stringify({id: v.id, theme: v.theme})}`).join(',\n'),
      '  ]',
      '}',
      '',
    ].join('\n');
    writeAtomic(themesFile, body);
    return `; placed after ${ledger.videos[at].id} in the looks ledger`;
  } finally {
    fs.rmSync(lockDir, {recursive: true, force: true});
  }
}

// ---- the request -----------------------------------------------------------------------------------------------
const env = process.env;
const req = String(env.STUDIO_REQ ?? '').trim();
if (!REQ.test(req)) die(2, `STUDIO_REQ "${req.slice(0, 40)}" is not a request id (r-<6..12>-<4..8>, digits and a-z)`);
const topic = text('STUDIO_TOPIC', env.STUDIO_TOPIC);
const length = choice('STUDIO_LENGTH', env.STUDIO_LENGTH, ['15', '20', '30'], '20');
const voice = choice('STUDIO_VOICE', env.STUDIO_VOICE, ['m', 'f'], 'm');
const mood = choice('STUDIO_MOOD', env.STUDIO_MOOD, ['calm', 'normal', 'wild'], 'normal');
const feedback = text('STUDIO_FEEDBACK', env.STUDIO_FEEDBACK);
const base = String(env.STUDIO_BASE ?? '').trim();
if (base && !REQ.test(base)) die(2, `STUDIO_BASE "${base.slice(0, 40)}" is not a request id`);
if (base && base === req) die(2, 'STUDIO_BASE is this request itself');
if (feedback && !base) die(2, 'STUDIO_FEEDBACK needs STUDIO_BASE (the video it is about)');

const studio = readJson(studioFile, {});
const files = fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));

let baseId = null;
let baseTheme = null;
let baseTopic = null;
let id = null;
if (base) {
  const entry = studio[base];
  if (!entry?.id) die(3, `STUDIO_BASE ${base} is not in specs/.studio.json`);
  const baseSpec = readJson(path.join(specsDir, `${entry.id}.json`), null);
  if (!baseSpec) die(3, `specs/${entry.id}.json (the video ${base} made) is missing`);
  baseId = entry.id;
  baseTheme = baseSpec.theme === 'light' ? 'light' : 'dark';
  baseTopic = clean(entry.topic) || null;
  // v13-x, v13-x-r1, v13-x-r2 ...: a redo of a redo is the next -r<n> of the same video
  const rootId = baseId.replace(/-r\d+$/, '');
  const taken = [...files.map((f) => f.slice(0, -5)), ...Object.values(studio).map((v) => v?.id)].filter(Boolean);
  const ns = taken.map((x) => new RegExp(`^${rootId}-r(\\d+)$`).exec(x)?.[1]).filter(Boolean).map(Number);
  id = `${rootId}-r${Math.max(0, ...ns) + 1}`;
}
const ledger = readJson(themesFile, {videos: []});
const allIds = [...files.map((f) => f.slice(0, -5)), ...(ledger.videos ?? []).map((v) => v.id), ...Object.values(studio).map((v) => v?.id)].filter(Boolean);
const next = `v${Math.max(0, ...allIds.map(vNumber)) + 1}-`;

// ---- what exists: one line per main video (not the demos, hook variants or translations) ------------------------
const videos = files
  .filter((f) => /^[^.]+\.json$/.test(f) && !f.startsWith('demo-') && !/--h\d+\.json$/.test(f))
  .map((f) => readJson(path.join(specsDir, f), null))
  .filter((s) => s && typeof s.id === 'string')
  .sort((a, b) => vNumber(a.id) - vNumber(b.id) || a.id.localeCompare(b.id));
const flat = (s) => clean(String(s ?? '').replace(/\|/g, ' '));
const coverOf = (s) => (s.cover && typeof s.cover === 'object' ? s.cover : {});
const tagOf = (s) => flat(coverOf(s).tag ?? s.beats?.[0]?.meta?.[0] ?? '');
const SHOWN = 60; // the newest ones in full; the older ones only as counts per tag
const older = videos.slice(0, Math.max(0, videos.length - SHOWN));
const counts = {};
for (const s of older) counts[tagOf(s) || '?'] = (counts[tagOf(s) || '?'] ?? 0) + 1;
const inventory = [
  ...(older.length ? [`(${older.length} older videos, by tag: ${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(', ')})`] : []),
  ...videos.slice(-SHOWN).map((s) => `${s.id} · ${tagOf(s) || '?'} · ${flat(coverOf(s).title ?? s.title ?? '') || '?'}`),
].join('\n');

// ---- HOOKS.md: the line ranges to read, so nobody reads the whole file -----------------------------------------
const hooks = fs.readFileSync(path.join(root, 'HOOKS.md'), 'utf8').split('\n');
const heads = hooks.map((l, i) => [i + 1, /^(#{2,3}) /.exec(l)?.[1].length, l]).filter((h) => h[1]);
const range = (re) => {
  const k = heads.findIndex((h) => re.test(h[2]));
  if (k < 0) return 'its section (grep -n "^##" HOOKS.md)';
  const end = heads.slice(k + 1).find((h) => h[1] <= heads[k][1])?.[0] ?? hooks.length + 1;
  return `lines ${heads[k][0]}-${end - 1}`;
};
const formulas = heads
  .filter((h) => /^### H\d\d /.test(h[2]))
  .map((h) => `${/H\d\d/.exec(h[2])[0]} ${range(new RegExp(`^### ${/H\d\d/.exec(h[2])[0]} `)).replace('lines ', '')}`)
  .join(', ');

// ---- fill the template -----------------------------------------------------------------------------------------
const values = {
  req,
  length,
  letters: String(LETTERS[length]),
  voiceId: VOICES[voice],
  mood,
  moodLine: MOODS[mood],
  topicText: topic || (baseTopic ? `(empty: the original's topic was: ${baseTopic})` : '(empty: pick the idea yourself)'),
  feedbackText: feedback || '(none: make a fresh take of the same idea, a different hook)',
  baseId: baseId ?? '',
  baseTheme: baseTheme ?? '',
  id: id ?? '',
  next,
  inventory: inventory || '(none yet)',
  'hooks.rubric': range(/^## 2\. /),
  'hooks.templates': range(/^## 3\. /),
  'hooks.angles': range(/^## 5\. /),
  'hooks.h14': range(/^### H14 /),
  'hooks.formulas': formulas,
};
const flags = {redo: Boolean(base), random: !topic && !base, wild: mood === 'wild'};
let out = fs.readFileSync(path.join(root, 'ci/prompt.md'), 'utf8').replace(/^<!--[\s\S]*?-->\n*/, '');
// blocks nest (a {{#random}} inside a {{^redo}}): resolve until none is left
for (let before = ''; before !== out; ) {
  before = out;
  out = out.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (m, kind, flag, body) => ((kind === '#') === Boolean(flags[flag]) ? body : ''));
}
if (/\{\{[#^/]/.test(out)) die(1, 'ci/prompt.md has a block that is not closed');
// one pass: a value that itself contains "{{x}}" (the topic) is never filled in again
out = out.replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
  if (!(k in values)) die(1, `ci/prompt.md uses {{${k}}}, which prompt.mjs does not fill`);
  return values[k];
});
out = out.replace(/\n{3,}/g, '\n\n');

writeAtomic(requestFile, `${JSON.stringify({req, topic, length: Number(length), voice, voiceId: VOICES[voice], mood, feedback, base: base || null, baseId, baseTheme, baseTopic, id, next}, null, 1)}\n`);
process.stdout.write(out);
