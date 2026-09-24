// The studio workflow's brief for the cloud Claude (the "script" step), and its ledger writer.
//
//   node tools/ci/prompt.mjs > prompt.txt
//     Reads the request from env, checks it and prints ci/prompt.md filled in. Also writes the checked request
//     to out/ci/request.json, which tools/check.mjs (VS_CI=1) and --record read.
//     env STUDIO_REQ       required, the site's request id: r-<6..12 [0-9a-z]>-<4..8 [0-9a-z]>
//         STUDIO_TOPIC     optional, at most 300 characters; empty = Claude picks the idea
//         STUDIO_CATEGORY  optional, an id from ci/categories.json. Empty with a topic: the topic's words pick
//                          it (or Claude does). Empty with no topic: the dice, the category with the fewest
//                          videos, ties to the one used longest ago
//         STUDIO_LENGTH    15 | 20 | 30 (default 20)
//         STUDIO_VOICE     m | f (default m): m = gemini:Algieba, f = gemini:Achernar
//         STUDIO_MOOD      calm | normal | wild (default normal)
//         STUDIO_FEEDBACK  optional, at most 300 characters: what to change in a redo (needs STUDIO_BASE)
//         STUDIO_BASE      optional, the request id of the video being redone (specs/.studio.json knows its spec)
//     Ideas that never repeat: the brief lists, for the request's category only, every earlier video's angle,
//     hook formula, opening line, cover title and closing quote (from the specs' "category" and the ledger),
//     and asks for 8 fresh angles before one is picked.
//
//   node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<the angle, one line>" [--features a,b,c] ["<the idea picked>"]
//     The cloud Claude runs this after writing specs/<id>.json:
//     specs/.studio.json[req] = {id, topic, base, at, category, angle, hook[, features]}.
//     The topic is the co-founder's own words; for a redo, its original's; for an empty topic, the idea Claude
//     picked (then required). A redo may leave out --hook and --angle (its original's are kept). --features:
//     a "general" video's shown features (the next general video leads with the least shown ones).
//     It refuses a spec without a valid "category" (or with another one than the request fixed), a formula
//     one of the last two videos of that category opened with, and an opening line, cover title, closing quote
//     or angle another video already has. A redo also takes its original's place in specs/.themes.json, so the
//     looks keep alternating in the order the videos are posted (tools/next-theme.mjs would append it at the end).
//
// Exit 2: a bad request or record (the message names the field). Exit 3: the video to redo is not in the ledger.
// Env STUDIO_LEDGER points the ledger at another file (as tools/ci/resolve.mjs reads it: a rehearsal).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const specsDir = path.join(root, 'specs');
const studioFile = path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json');
const themesFile = path.join(specsDir, '.themes.json');
const requestFile = path.join(root, 'out/ci/request.json');
const categoriesFile = path.join(root, 'ci/categories.json');

const REQ = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;
const ID = /^[a-z0-9-]+$/;
const MAX_TEXT = 300;
const ANGLE = [12, 160]; // the angle: one line of idea, in characters
const SEEN_MAX = 30; // lines of earlier videos in the brief
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
const redoNumber = (id) => Number(/-r(\d+)$/.exec(id)?.[1] ?? 0);
const familyOf = (id) => String(id).replace(/-r\d+$/, ''); // v13-x, v13-x-r1, v13-x-r2: one video
const flat = (s) => clean(String(s ?? '').replace(/\|/g, ' '));
// the same words, whatever the punctuation, case or "|" breaks: how repeats are found
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const cut = (s, n) => ([...s].length > n ? `${[...s].slice(0, n - 1).join('')}…` : s);

// ---- the categories (ci/categories.json) ------------------------------------------------------------------------
const CATS = (() => {
  const j = readJson(categoriesFile, null);
  const list = Array.isArray(j?.categories) ? j.categories.filter((c) => c && /^[a-z]+$/.test(c.id ?? '')) : [];
  if (!list.length) die(1, `${path.relative(root, categoriesFile)} is missing or lists no categories`);
  return list;
})();
const CAT = new Map(CATS.map((c) => [c.id, c]));
const CAT_IDS = CATS.map((c) => c.id);
const FEATURES = CATS.filter((c) => c.feature !== false).map((c) => c.id); // what a general video can show
const validCat = (c) => (typeof c === 'string' && CAT.has(c) ? c : null);

// ---- HOOKS.md: the formulas, and the line ranges to read so nobody reads the whole file ---------------------------
const hooks = fs.readFileSync(path.join(root, 'HOOKS.md'), 'utf8').split('\n');
const heads = hooks.map((l, i) => [i + 1, /^(#{2,3}) /.exec(l)?.[1].length, l]).filter((h) => h[1]);
const range = (re) => {
  const k = heads.findIndex((h) => re.test(h[2]));
  if (k < 0) return 'its section (grep -n "^##" HOOKS.md)';
  const end = heads.slice(k + 1).find((h) => h[1] <= heads[k][1])?.[0] ?? hooks.length + 1;
  return `lines ${heads[k][0]}-${end - 1}`;
};
const FORMULAS = heads.map((h) => /^### (H\d\d) /.exec(h[2])?.[1]).filter(Boolean);

// ---- every video made so far: the specs (with their "category") and the ledger (angle, formula) -----------------
const coverOf = (s) => (s.cover && typeof s.cover === 'object' ? s.cover : {});
const openOf = (s) => flat(s.beats?.[0]?.show ?? s.beats?.[0]?.say ?? '');
const coverTitleOf = (s) => flat(coverOf(s).title ?? '');
const quoteOf = (s) => {
  const end = [...(Array.isArray(s.beats) ? s.beats : [])].reverse().find((b) => b?.scene)?.scene;
  return end?.type === 'EndCard' ? flat(end.tagline ?? '') : '';
};
const specFiles = () => fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'));
// One entry per main video (not the demos or translations; a hook variant adds its opening to its original's),
// oldest first: {id, category, title, topic, angle, hook, features, open, alsoOpen, cover, quote}
const library = (studio) => {
  const byId = new Map();
  const variants = [];
  for (const f of specFiles()) {
    if (f.startsWith('demo-') || !/^[^.]+\.json$/.test(f)) continue;
    const spec = readJson(path.join(specsDir, f), null);
    if (!spec || typeof spec.id !== 'string' || !Array.isArray(spec.beats)) continue;
    const variant = /^(.+)--h\d+\.json$/.exec(f);
    if (variant) variants.push([variant[1], openOf(spec)]);
    else byId.set(spec.id, {id: spec.id, category: validCat(spec.category), title: flat(spec.title), open: openOf(spec), alsoOpen: [], cover: coverTitleOf(spec), quote: quoteOf(spec)});
  }
  for (const [parent, open] of variants) {
    const v = byId.get(parent);
    if (v && norm(open) && ![v.open, ...v.alsoOpen].some((o) => norm(o) === norm(open))) v.alsoOpen.push(open);
  }
  for (const e of Object.values(studio)) {
    if (!e || typeof e.id !== 'string' || !ID.test(e.id)) continue;
    const v = byId.get(e.id) ?? {id: e.id, category: null, title: '', open: '', alsoOpen: [], cover: '', quote: ''};
    v.category ??= validCat(e.category);
    v.topic = flat(e.topic);
    v.angle = flat(e.angle);
    v.hook = FORMULAS.includes(e.hook) ? e.hook : null;
    v.features = Array.isArray(e.features) ? e.features.filter((x) => FEATURES.includes(x)) : [];
    byId.set(e.id, v);
  }
  return [...byId.values()].sort((a, b) => vNumber(a.id) - vNumber(b.id) || redoNumber(a.id) - redoNumber(b.id) || a.id.localeCompare(b.id));
};
// the videos, each with its redos, oldest first
const families = (lib) => {
  const m = new Map();
  for (const v of lib) m.set(familyOf(v.id), [...(m.get(familyOf(v.id)) ?? []), v]);
  return [...m.values()];
};
const inCategory = (lib, cat, except) => lib.filter((v) => v.category === cat && familyOf(v.id) !== except);
// the formulas the last two videos of a category opened with; a video from before the ledger has none recorded
const lastTwo = (lib, cat, except) => {
  const two = families(inCategory(lib, cat, except)).slice(-2);
  return {
    formulas: [...new Set(two.flatMap((f) => f.map((v) => v.hook).filter(Boolean)))],
    unknown: two.filter((f) => !f.some((v) => v.hook)).map((f) => f.at(-1).id),
  };
};

// ---- --record ------------------------------------------------------------------------------------------------
if (process.argv[2] === '--record') {
  const USAGE = 'usage: node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<the angle, one line>" [--features a,b,c] ["<the idea picked>"]';
  const opts = {};
  const rest = [];
  const args = process.argv.slice(3);
  for (let i = 0; i < args.length; i++) {
    const m = /^--(hook|angle|features)(?:=([\s\S]*))?$/.exec(args[i]);
    if (m) opts[m[1]] = m[2] ?? args[++i] ?? '';
    else if (args[i].startsWith('--')) die(2, `unknown option ${args[i].slice(0, 40)}; ${USAGE}`);
    else rest.push(args[i]);
  }
  const [id, ...ideaWords] = rest;
  const request = readJson(requestFile, null);
  if (!request?.req) die(2, `no request in ${path.relative(root, requestFile)}: the workflow runs "node tools/ci/prompt.mjs" first`);
  if (!id || !ID.test(id)) die(2, USAGE);
  const spec = readJson(path.join(specsDir, `${id}.json`), null);
  if (!spec) die(2, `specs/${id}.json is missing or not valid JSON; write the spec first`);
  if (spec.id !== id) die(2, `specs/${id}.json says "id": "${spec.id}"; it must be "${id}"`);
  if (request.id && id !== request.id) die(2, `this redo's id is "${request.id}", not "${id}"`);
  if (!request.id && request.next && !id.startsWith(request.next)) die(2, `a new video's id starts with "${request.next}" (the next free number), not "${id}"`);
  const idea = text('the idea', ideaWords.join(' '));
  const topic = request.topic || request.baseTopic || idea;
  if (!topic) die(2, `the topic was empty: say which idea you picked: node tools/ci/prompt.mjs --record ${id} ... "<the idea in a few Georgian words>"`);

  const studio = readJson(studioFile, {});
  const owner = Object.entries(studio).find(([k, v]) => v?.id === id && k !== request.req);
  if (owner) die(2, `${id} already belongs to the request ${owner[0]}; pick another slug`);
  const lib = library(studio);
  const own = familyOf(id); // a redo shares its original's words: only the other videos count

  // the category: the spec says it; a category the request fixed (asked, the dice, a redo's original) must match
  const cat = validCat(spec.category);
  const fixed = request.category && request.categoryFrom !== 'topic' ? request.category : null;
  if (!cat) die(2, `specs/${id}.json needs a top-level "category"${fixed ? `: "${fixed}"` : `, one of ${CAT_IDS.join(', ')} (ci/categories.json)`}${spec.category ? `; "${String(spec.category).slice(0, 40)}" is not one` : ''}`);
  if (fixed && cat !== fixed) die(2, `this request is a "${fixed}" video, but specs/${id}.json says "category": "${cat}"`);

  // the formula of the opening: never one the last two videos of the category opened with
  const hook = String(opts.hook ?? '').trim().toUpperCase() || (request.base ? request.baseHook ?? '' : '');
  if (!FORMULAS.includes(hook)) die(2, `--hook: the formula the opening uses, one of ${FORMULAS.join(', ')} (HOOKS.md §1)${request.base && !request.baseHook ? '; the original recorded none' : ''}`);
  const recent = lastTwo(lib, cat, own);
  if (recent.formulas.includes(hook) && !(request.base && hook === request.baseHook)) {
    const who = families(inCategory(lib, cat, own)).slice(-2).flat().filter((v) => v.hook === hook).map((v) => v.id);
    die(2, `${hook} opened ${who.join(' and ')}, one of the last two "${cat}" videos: open with another formula (${FORMULAS.filter((h) => !recent.formulas.includes(h)).join(', ')}), then record again`);
  }

  // the angle: one line; a redo keeps its original's unless the feedback changed the idea
  const angle = clean(opts.angle ?? '') || (request.base ? flat(request.baseAngle) : '');
  const n = [...angle].length;
  if (n < ANGLE[0] || n > ANGLE[1]) die(2, `--angle: the idea in one English line, ${ANGLE[0]} to ${ANGLE[1]} characters (e.g. "a taxi driver blocked in at night: the card reaches the owner, no number on the glass")${n ? `; it is ${n}` : ''}`);

  // what a general video shows, so the next one leads with other features
  let features = [];
  if (cat === 'general') {
    features = opts.features !== undefined ? String(opts.features).split(/[\s,]+/).filter(Boolean) : request.base ? request.baseFeatures ?? [] : [];
    const bad = features.filter((f) => !FEATURES.includes(f));
    if (features.length < 2 || features.length > 6 || bad.length || new Set(features).size !== features.length)
      die(2, `--features: the 2 to 6 features this general video shows, comma-separated, from ${FEATURES.join(', ')}${bad.length ? ` ("${bad.join('", "').slice(0, 80)}" is not one)` : ''}`);
  } else if (opts.features !== undefined) die(2, '--features is only for a "general" video');

  // never the words of another video: its opening line, cover title, closing quote or angle
  const used = new Map();
  const note = (s, what) => {
    const k = norm(s);
    if (k && !used.has(k)) used.set(k, what);
  };
  for (const v of lib) {
    if (familyOf(v.id) === own) continue;
    note(v.open, `${v.id}'s opening line`);
    v.alsoOpen.forEach((o) => note(o, `an opening line of ${v.id}`));
    note(v.cover, `${v.id}'s cover title`);
    note(v.quote, `${v.id}'s closing quote`);
    note(v.angle, `${v.id}'s angle`);
  }
  const mine = [['opening line', openOf(spec)], ['cover title', coverTitleOf(spec)], ['closing quote', quoteOf(spec)], ['angle', angle]];
  const clash = mine.filter(([, s]) => used.has(norm(s))).map(([what, s]) => `the ${what} "${s}" is ${used.get(norm(s))}`);
  if (clash.length) die(2, `${clash.join('; ')}. Every video gets its own: change it in specs/${id}.json (or --angle), then record again`);

  const at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  studio[request.req] = {id, topic, base: request.base || null, at, category: cat, angle, hook, ...(features.length ? {features} : {})};
  const rows = Object.entries(studio).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  writeAtomic(studioFile, rows.length ? `{\n${rows.join(',\n')}\n}\n` : '{}\n');
  let where = '';
  if (request.base) where = placeRedo(id, spec.theme, request.baseId);
  process.stdout.write(`recorded ${request.req}: ${id} (${cat} · ${hook} · ${angle})${where}\n`);
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
const asked = String(env.STUDIO_CATEGORY ?? '').trim();
if (asked && !CAT.has(asked)) die(2, `STUDIO_CATEGORY "${asked.slice(0, 40)}" is not a category; one of ${CAT_IDS.join(', ')} (ci/categories.json), or empty`);
const length = choice('STUDIO_LENGTH', env.STUDIO_LENGTH, ['15', '20', '30'], '20');
const voice = choice('STUDIO_VOICE', env.STUDIO_VOICE, ['m', 'f'], 'm');
const mood = choice('STUDIO_MOOD', env.STUDIO_MOOD, ['calm', 'normal', 'wild'], 'normal');
const feedback = text('STUDIO_FEEDBACK', env.STUDIO_FEEDBACK);
const base = String(env.STUDIO_BASE ?? '').trim();
if (base && !REQ.test(base)) die(2, `STUDIO_BASE "${base.slice(0, 40)}" is not a request id`);
if (base && base === req) die(2, 'STUDIO_BASE is this request itself');
if (feedback && !base) die(2, 'STUDIO_FEEDBACK needs STUDIO_BASE (the video it is about)');

const studio = readJson(studioFile, {});
const files = specFiles();
const lib = library(studio);

let baseId = null;
let baseTheme = null;
let baseTopic = null;
let baseCategory = null;
let id = null;
let baseEntry = {};
if (base) {
  const entry = studio[base];
  if (!entry?.id) die(3, `STUDIO_BASE ${base} is not in specs/.studio.json`);
  const baseSpec = readJson(path.join(specsDir, `${entry.id}.json`), null);
  if (!baseSpec) die(3, `specs/${entry.id}.json (the video ${base} made) is missing`);
  baseEntry = entry;
  baseId = entry.id;
  baseTheme = baseSpec.theme === 'light' ? 'light' : 'dark';
  baseTopic = clean(entry.topic) || null;
  baseCategory = validCat(baseSpec.category) ?? validCat(entry.category);
  // v13-x, v13-x-r1, v13-x-r2 ...: a redo of a redo is the next -r<n> of the same video
  const rootId = baseId.replace(/-r\d+$/, '');
  const taken = [...files.map((f) => f.slice(0, -5)), ...Object.values(studio).map((v) => v?.id)].filter(Boolean);
  const ns = taken.map((x) => new RegExp(`^${rootId}-r(\\d+)$`).exec(x)?.[1]).filter(Boolean).map(Number);
  id = `${rootId}-r${Math.max(0, ...ns) + 1}`;
}
const ledger = readJson(themesFile, {videos: []});
const allIds = [...files.map((f) => f.slice(0, -5)), ...(ledger.videos ?? []).map((v) => v.id), ...Object.values(studio).map((v) => v?.id)].filter(Boolean);
const next = `v${Math.max(0, ...allIds.map(vNumber)) + 1}-`;

// ---- the category: asked, the original's, read from the topic, or the dice ------------------------------------
// The dice: the category with the fewest videos (a video and its redos count once), ties to the one whose
// newest video is the oldest (never used counts as oldest), then the order of ci/categories.json.
const dice = () => {
  const stat = new Map(CAT_IDS.map((c, i) => [c, {n: 0, last: -1, i}]));
  for (const f of families(lib)) {
    const s = stat.get(f.at(-1).category);
    if (!s) continue;
    s.n += 1;
    s.last = Math.max(s.last, vNumber(f[0].id));
  }
  return [...stat.entries()].sort(([, a], [, b]) => a.n - b.n || a.last - b.last || a.i - b.i)[0][0];
};
// A topic typed without a category: the category whose words match the most letters of it, when one clearly
// does; "general" only when no feature matches.
const fromTopic = (t) => {
  const score = (c) =>
    (c.words ?? []).reduce((sum, w) => {
      try {
        return sum + [...(new RegExp(w, 'iu').exec(t)?.[0] ?? '')].length;
      } catch {
        return sum;
      }
    }, 0);
  const scored = CATS.map((c) => [c.id, score(c)]).filter(([, s]) => s > 0);
  const specific = scored.filter(([c]) => c !== 'general').sort((a, b) => b[1] - a[1]);
  if (specific.length) return specific.length === 1 || specific[0][1] > specific[1][1] ? specific[0][0] : null;
  return scored.length ? 'general' : null;
};
let category = null;
let categoryFrom = null;
if (base) [category, categoryFrom] = baseCategory ? [baseCategory, 'base'] : asked ? [asked, 'asked'] : [null, null];
else if (asked) [category, categoryFrom] = [asked, 'asked'];
else if (!topic) [category, categoryFrom] = [dice(), 'dice'];
else {
  const guess = fromTopic(topic);
  if (guess) [category, categoryFrom] = [guess, 'topic'];
}
const C = category ? CAT.get(category) : null;

// ---- the earlier videos, as data: the chosen category's only (or, with none chosen yet, the newest of all) ----
const entryLine = (v, withCategory) =>
  [
    v.id,
    withCategory ? v.category ?? '?' : null,
    v.hook ?? 'H?',
    cut(v.angle || v.title || v.topic || '?', 110),
    v.open && `open "${v.open}"`,
    ...v.alsoOpen.slice(0, 2).map((o) => `or "${o}"`),
    v.cover && norm(v.cover) !== norm(v.open) && `cover "${v.cover}"`,
    v.quote && `end "${v.quote}"`,
  ]
    .filter(Boolean)
    .join(' · ');
const seenList = () => {
  // one line per video, its newest version (a redo shares its original's idea; --record still checks both)
  const rows = families(C ? inCategory(lib, category, null) : lib).map((f) => f.at(-1)).reverse(); // newest first
  const max = C ? SEEN_MAX : 20;
  if (!rows.length) return '(none yet: the first one)';
  if (rows.length <= max) return rows.map((v) => entryLine(v, !C)).join('\n');
  // the newest in full, the older ones by their angle only, so none of them is lost from sight
  const full = rows.slice(0, max - 4).map((v) => entryLine(v, !C));
  const older = [...new Set(rows.slice(max - 4).map((v) => cut(v.angle || v.title || v.topic || v.id, 60)))];
  const lines = [];
  for (let i = 0; i < older.length && lines.length < 4; i += 6) lines.push(`older: ${older.slice(i, i + 6).join('; ')}`);
  const left = older.length - Math.min(older.length, 24);
  if (left) lines.push(`(and ${left} older ones)`);
  return [...full, ...lines].join('\n');
};
const counts = () => {
  const n = new Map(CAT_IDS.map((c) => [c, 0]));
  for (const f of families(lib)) if (n.has(f.at(-1).category)) n.set(f.at(-1).category, n.get(f.at(-1).category) + 1);
  return [...n.entries()].map(([c, k]) => `${c} ${k}`).join(' · ');
};
// a general video leads with the features the earlier general videos showed least (ties: the features with
// the fewest videos of their own first)
const rotation = () => {
  const n = new Map(FEATURES.map((c) => [c, 0]));
  for (const v of lib) if (v.category === 'general') for (const f of v.features ?? []) n.set(f, n.get(f) + 1);
  const own = new Map(FEATURES.map((c) => [c, families(inCategory(lib, c, null)).length]));
  return [...n.entries()].sort((a, b) => a[1] - b[1] || own.get(a[0]) - own.get(b[0])).map(([c, k]) => `${c} ${k}`).join(', ');
};
// ", never <the formulas the category's last two videos opened with>", or nothing
const avoid = () => {
  if (!C) return ', never one the last two videos of your category opened with';
  const {formulas, unknown} = lastTwo(lib, category, null);
  const two = unknown.length > 1;
  const parts = [...formulas, ...(unknown.length ? [`the one${two ? 's' : ''} ${unknown.join(' and ')} opened with (not recorded: judge ${two ? 'them' : 'it'} from the opening line${two ? 's' : ''})`] : [])];
  return parts.length ? `, never ${parts.join(', ')}` : '';
};
const copyFrom = () => {
  const mains = lib.filter((v) => files.includes(`${v.id}.json`));
  const same = C ? mains.filter((v) => v.category === category) : [];
  return (same.at(-1) ?? mains.at(-1))?.id ?? 'v1-customs-cliff';
};
const categoryLine = (() => {
  const name = C ? `\`${category}\` · ${C.label}` : '';
  if (categoryFrom === 'asked') return name;
  if (categoryFrom === 'base') return `${name}, the original's`;
  if (categoryFrom === 'dice') return `${name}, rolled by the dice: no category and no topic, so the one with the fewest videos (on a tie, the one used longest ago)`;
  if (categoryFrom === 'topic') return `${name}, read from the topic's words (if the topic plainly belongs to another id in ci/categories.json, take that one)`;
  return 'none: take the id in ci/categories.json that fits the topic best';
})();
const baseHook = FORMULAS.includes(baseEntry.hook) ? baseEntry.hook : null;
const baseAngle = flat(baseEntry.angle) || null;
const recordCmd = base
  ? `node tools/ci/prompt.mjs --record ${id}` +
    (baseHook ? '' : ' --hook <Hnn>') +
    (baseAngle ? '' : ' --angle "<the idea in one English line>"') +
    (category === 'general' && !baseEntry.features?.length ? ' --features <the feature ids it shows, comma-separated>' : '')
  : `node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<your angle in one English line>"` +
    (category === 'general' ? ' --features <the 3 to 5 feature ids you show, comma-separated>' : '') +
    (!topic ? ' "<the idea, a few Georgian words>"' : '');
// a redo keeps its original's formula and angle unless told otherwise
const redoNote = !base
  ? ''
  : baseHook && baseAngle
    ? `It keeps the original's formula (${baseHook}) and angle. Add \`--hook <Hnn>\` when your opening now uses another formula (HOOKS.md §1), \`--angle "<one line>"\` when the feedback changed the idea.`
    : `Hnn is the formula your opening uses (HOOKS.md §1); the original recorded ${baseHook || baseAngle ? `no ${baseHook ? 'angle' : 'formula'}` : 'neither'}.`;

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
  categoryLine,
  category: category ?? '<your id>',
  categoryLabel: C?.label ?? '',
  tier: C?.tier ?? '',
  facts: (C?.facts ?? []).map((f) => `- ${f}`).join('\n'),
  never: (C?.never ?? []).join('; ') || 'nothing beyond SKILL.md',
  screens: (C?.screens ?? []).join(', ') || 'any',
  seen: seenList(),
  counts: counts(),
  avoid: base ? '' : avoid(),
  rotation: category === 'general' ? rotation() : '',
  copyFrom: copyFrom(),
  record: recordCmd,
  redoNote,
  'hooks.rubric': range(/^## 2\. /),
  'hooks.templates': range(/^## 3\. /),
  'hooks.angles': range(/^## 5\. /),
  'hooks.h14': range(/^### H14 /),
  'hooks.formulas': FORMULAS.map((h) => `${h} ${range(new RegExp(`^### ${h} `)).replace('lines ', '')}`).join(', '),
};
const flags = {
  redo: Boolean(base),
  random: !topic && !base,
  dice: categoryFrom === 'dice',
  wild: mood === 'wild',
  known: Boolean(C) && !base,
  nocat: !C && !base,
  general: category === 'general' && !base,
  allfacts: (!C || category === 'general') && !base, // the brief does not carry the facts it needs: read the file
};
let out = fs.readFileSync(path.join(root, 'ci/prompt.md'), 'utf8').replace(/^<!--[\s\S]*?-->\n*/, '');
// blocks nest (a {{#random}} inside a {{^redo}}): resolve until none is left
for (let before = ''; before !== out; ) {
  before = out;
  out = out.replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (m, kind, flag, body) => {
    if (!(flag in flags)) die(1, `ci/prompt.md uses the flag {{${kind}${flag}}}, which prompt.mjs does not set`);
    return (kind === '#') === Boolean(flags[flag]) ? body : '';
  });
}
if (/\{\{[#^/]/.test(out)) die(1, 'ci/prompt.md has a block that is not closed');
// one pass: a value that itself contains "{{x}}" (the topic) is never filled in again
out = out.replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
  if (!(k in values)) die(1, `ci/prompt.md uses {{${k}}}, which prompt.mjs does not fill`);
  return values[k];
});
out = out.replace(/\n{3,}/g, '\n\n');

writeAtomic(
  requestFile,
  `${JSON.stringify(
    {
      req, topic, category, categoryFrom, length: Number(length), voice, voiceId: VOICES[voice], mood, feedback, base: base || null, baseId, baseTheme, baseTopic,
      baseHook, baseAngle,
      baseFeatures: Array.isArray(baseEntry.features) ? baseEntry.features : null, id, next,
    },
    null,
    1,
  )}\n`,
);
process.stdout.write(out);
